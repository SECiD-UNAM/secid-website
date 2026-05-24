/**
 * Tests for requestAlternateEmail and confirmAlternateEmail callables.
 *
 * Source: functions/src/alternate-email.ts
 *
 * Verifies:
 *   - request path: auth guard, format validation, members-only,
 *     rate-limit, primary-email rejection, already-claimed dedupe
 *     (with audit write), and the happy-path token+email send.
 *   - confirm path (B4 atomic flow): invalid token, expired token,
 *     uid mismatch, conflicting Auth user (admin-merge route),
 *     canonical not verified, and the transactional happy path —
 *     ALL state writes must happen INSIDE a single db.runTransaction
 *     so two concurrent confirmations can't both consume the same
 *     token (the loser's commit must fail).
 *
 * Mocking strategy:
 *   - `firebase-functions/v2/https` is mocked so onCall(opts, handler)
 *     returns the handler directly.
 *   - `firebase-admin` is mocked at module scope; per-test the in-memory
 *     firestore/auth stubs are reconfigured. All mutable state shared with
 *     the mock factories lives inside a vi.hoisted() block so that the
 *     hoisting of vi.mock() does not strand the references.
 *   - `./email-service` and `./env` are mocked because the real modules
 *     would otherwise touch real config / network at import.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted: every reference used inside a vi.mock factory must be created
// before the hoisted vi.mock call runs. The mock factory closes over the
// returned object.
// ---------------------------------------------------------------------------

// Absolute paths for vi.mock — vite resolves the mock spec against the
// importer (test file), where bare names like `firebase-admin` and
// relative paths like `./email-service` from the SUT do NOT resolve. We
// resolve them once here via vi.hoisted (runs before vi.mock).
const PATHS = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  return {
    firebaseAdmin: path.resolve(
      'functions/node_modules/firebase-admin/lib/index.js'
    ),
    firebaseFunctionsHttps: path.resolve(
      'functions/node_modules/firebase-functions/lib/esm/v2/providers/https.mjs'
    ),
    emailService: path.resolve('functions/src/email-service.ts'),
    env: path.resolve('functions/src/env.ts'),
  };
});

const H = vi.hoisted(() => {
  class FakeHttpsError extends Error {
    code: string;
    details: unknown;
    constructor(code: string, message: string, details?: unknown) {
      super(message);
      this.code = code;
      this.details = details;
    }
  }

  const SERVER_TIMESTAMP_SENTINEL = { __sentinel: 'serverTimestamp' };

  interface DocStub {
    id: string;
    data: any;
  }

  const state = {
    docs: new Map<string, DocStub>(),
    queryResults: new Map<string, string[]>(),
    authUsers: new Map<string, { uid: string; email: string }>(),
    writes: [] as Array<{
      op: string;
      collection: string;
      id: string;
      payload?: any;
      options?: any;
    }>,
    txOps: [] as Array<{
      op: 'get' | 'update' | 'set';
      collection: string;
      id: string;
      payload?: any;
      options?: any;
    }>,
    txnCount: 0,
  };

  function makeSnapshot(collection: string, id: string): any {
    const stored = state.docs.get(`${collection}/${id}`);
    if (!stored) return { exists: false, id, data: () => undefined };
    return { exists: true, id: stored.id, data: () => stored.data };
  }

  function makeDocRef(collection: string, id: string): any {
    return {
      id,
      __collection: collection,
      get: async () => makeSnapshot(collection, id),
      set: async (payload: any, options?: any) => {
        state.writes.push({ op: 'set', collection, id, payload, options });
        state.docs.set(`${collection}/${id}`, { id, data: payload });
      },
      update: async (payload: any) => {
        state.writes.push({ op: 'update', collection, id, payload });
        const prior = state.docs.get(`${collection}/${id}`)?.data ?? {};
        state.docs.set(`${collection}/${id}`, {
          id,
          data: { ...prior, ...payload },
        });
      },
    };
  }

  function makeCollectionRef(collection: string): any {
    return {
      __collection: collection,
      doc: (id: string) => makeDocRef(collection, id),
      add: async (payload: any) => {
        const id = `auto-${state.writes.length}`;
        state.writes.push({ op: 'add', collection, id, payload });
        state.docs.set(`${collection}/${id}`, { id, data: payload });
        return { id };
      },
      where: (field: string, op: string, value: any) => {
        const key = `${collection}|${field}|${op}|${JSON.stringify(value)}`;
        const ids = state.queryResults.get(key) ?? [];
        const matching = ids.map((docId) => ({
          ...makeSnapshot(collection, docId),
          id: docId,
          ref: makeDocRef(collection, docId),
        }));
        const result = {
          empty: matching.length === 0,
          docs: matching,
        };
        return {
          limit: () => ({
            get: async () => result,
          }),
          get: async () => result,
        };
      },
    };
  }

  const adminFirestoreFn: any = () => ({
    collection: (c: string) => makeCollectionRef(c),
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      state.txnCount += 1;
      const tx = {
        get: async (ref: any) => {
          state.txOps.push({
            op: 'get',
            collection: ref.__collection,
            id: ref.id,
          });
          return makeSnapshot(ref.__collection, ref.id);
        },
        update: (ref: any, payload: any) => {
          state.txOps.push({
            op: 'update',
            collection: ref.__collection,
            id: ref.id,
            payload,
          });
        },
        set: (ref: any, payload: any, options?: any) => {
          state.txOps.push({
            op: 'set',
            collection: ref.__collection,
            id: ref.id,
            payload,
            options,
          });
        },
      };
      return fn(tx);
    },
  });

  adminFirestoreFn.Timestamp = {
    fromMillis: (ms: number) => ({
      __timestamp: true,
      toMillis: () => ms,
    }),
    now: () => ({ __timestamp: true, toMillis: () => Date.now() }),
  };
  adminFirestoreFn.FieldValue = {
    serverTimestamp: () => SERVER_TIMESTAMP_SENTINEL,
    delete: () => ({ __sentinel: 'delete' }),
    arrayUnion: (...items: unknown[]) => ({
      __sentinel: 'arrayUnion',
      items,
    }),
    arrayRemove: (...items: unknown[]) => ({
      __sentinel: 'arrayRemove',
      items,
    }),
  };

  const authMock = {
    getUserByEmail: async (email: string) => {
      const found = Array.from(state.authUsers.values()).find(
        (u) => u.email === email
      );
      if (!found) {
        const err: any = new Error('user not found');
        err.code = 'auth/user-not-found';
        throw err;
      }
      return found;
    },
  };

  const sendEmailMock = (() => {
    const fn: any = async (..._args: unknown[]) => {
      fn.calls.push(_args);
      return undefined;
    };
    fn.calls = [] as unknown[][];
    fn.reset = () => {
      fn.calls.length = 0;
    };
    return fn;
  })();

  return {
    FakeHttpsError,
    state,
    adminFirestoreFn,
    authMock,
    sendEmailMock,
  };
});

// ---------------------------------------------------------------------------
// Mocks (hoisted by vitest; factories must only close over H above).
// ---------------------------------------------------------------------------

vi.mock(PATHS.firebaseFunctionsHttps, () => ({
  onCall: (_opts: unknown, handler: unknown) => handler,
  HttpsError: H.FakeHttpsError,
}));

vi.mock(PATHS.firebaseAdmin, () => ({
  firestore: H.adminFirestoreFn,
  auth: () => H.authMock,
  default: {
    firestore: H.adminFirestoreFn,
    auth: () => H.authMock,
  },
}));

vi.mock(PATHS.emailService, () => ({
  sendEmail: (...args: unknown[]) => H.sendEmailMock(...args),
}));

vi.mock(PATHS.env, () => ({
  getAppUrl: () => 'https://test.example',
  ALLOWED_CALLABLE_ORIGINS: [],
}));

// ---------------------------------------------------------------------------
// Import the SUT after mocks are wired.
// ---------------------------------------------------------------------------

import * as alternateEmail from '../../../functions/src/alternate-email';

// `any` is unavoidable here: the mocked onCall returns the raw handler, so
// the actual call signature does not match the exported CallableFunction
// type that firebase-functions advertises. Tests still assert via the
// concrete result shape and HttpsError fields, which is what matters.
const requestAlternateEmail = alternateEmail.requestAlternateEmail as any;
const confirmAlternateEmail = alternateEmail.confirmAlternateEmail as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CALLER_UID = 'caller-uid';
const CALLER_EMAIL = 'caller@example.com';
const NEW_EMAIL = 'newalt@example.com';

function setDoc(collection: string, id: string, data: any): void {
  H.state.docs.set(`${collection}/${id}`, { id, data });
}

function setQuery(
  collection: string,
  field: string,
  op: string,
  value: any,
  ids: string[]
): void {
  H.state.queryResults.set(
    `${collection}|${field}|${op}|${JSON.stringify(value)}`,
    ids
  );
}

beforeEach(() => {
  H.state.docs.clear();
  H.state.queryResults.clear();
  H.state.authUsers.clear();
  H.state.writes.length = 0;
  H.state.txOps.length = 0;
  H.state.txnCount = 0;
  H.sendEmailMock.reset();
});

// ===========================================================================
// requestAlternateEmail
// ===========================================================================

// describe.sequential: vitest.config.ts sets sequence.concurrent=true, but
// these tests share module-scope mock state (H.state) and must run serially.
describe.sequential('requestAlternateEmail', () => {
  it('throws unauthenticated when no auth context', async () => {
    await expect(
      requestAlternateEmail({ auth: null, data: { email: NEW_EMAIL } })
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('throws invalid-argument with reason invalid_format on bad email', async () => {
    setDoc('users', CALLER_UID, { isVerified: true });
    await expect(
      requestAlternateEmail({
        auth: { uid: CALLER_UID },
        data: { email: 'not-an-email' },
      })
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      details: { reason: 'invalid_format' },
    });
  });

  it('throws failed-precondition with reason members_only when caller not verified', async () => {
    setDoc('users', CALLER_UID, { isVerified: false });
    await expect(
      requestAlternateEmail({
        auth: { uid: CALLER_UID },
        data: { email: NEW_EMAIL },
      })
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { reason: 'members_only' },
    });
  });

  it('throws resource-exhausted with reason rate_limited when over the cap', async () => {
    setDoc('users', CALLER_UID, { isVerified: true });
    setDoc('alternate_email_ratelimit', CALLER_UID, {
      windowStart: Date.now(),
      count: 5,
    });
    await expect(
      requestAlternateEmail({
        auth: { uid: CALLER_UID },
        data: { email: NEW_EMAIL },
      })
    ).rejects.toMatchObject({
      code: 'resource-exhausted',
      details: { reason: 'rate_limited' },
    });
  });

  it('throws invalid-argument with reason primary_email when equals own primary', async () => {
    setDoc('users', CALLER_UID, {
      isVerified: true,
      primaryEmail: CALLER_EMAIL,
    });
    await expect(
      requestAlternateEmail({
        auth: { uid: CALLER_UID },
        data: { email: CALLER_EMAIL },
      })
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      details: { reason: 'primary_email' },
    });
  });

  it('returns { ok: true, alreadyLinked: true } and writes audit when alias index already exists', async () => {
    setDoc('users', CALLER_UID, { isVerified: true });
    setDoc('email_alias', NEW_EMAIL, { canonicalUid: 'someone-else' });

    const result = await requestAlternateEmail({
      auth: { uid: CALLER_UID },
      data: { email: NEW_EMAIL },
    });

    expect(result).toEqual({ ok: true, alreadyLinked: true });
    const audit = H.state.writes.find(
      (w) => w.op === 'add' && w.collection === 'alternate_email_audit'
    );
    expect(audit).toBeTruthy();
    expect(audit?.payload).toMatchObject({
      uid: CALLER_UID,
      email: NEW_EMAIL,
      result: 'already_in_use',
    });
    // No verification token was created.
    expect(
      H.state.writes.find((w) => w.collection === 'alternate_email_tokens')
    ).toBeUndefined();
    // No email was sent.
    expect(H.sendEmailMock.calls.length).toBe(0);
  });

  it('happy path: creates token, sends email, returns { ok: true }', async () => {
    setDoc('users', CALLER_UID, {
      isVerified: true,
      primaryEmail: CALLER_EMAIL,
    });
    setQuery('users', 'email', '==', NEW_EMAIL, []);
    setQuery('users', 'alternateEmails', 'array-contains', NEW_EMAIL, []);

    const result = await requestAlternateEmail({
      auth: { uid: CALLER_UID },
      data: { email: NEW_EMAIL },
    });

    expect(result).toEqual({ ok: true });
    const tokenWrite = H.state.writes.find(
      (w) => w.collection === 'alternate_email_tokens'
    );
    expect(tokenWrite).toBeTruthy();
    expect(tokenWrite?.payload).toMatchObject({
      canonicalUid: CALLER_UID,
      email: NEW_EMAIL,
      used: false,
    });
    expect(H.sendEmailMock.calls.length).toBe(1);
    const sendArgs = H.sendEmailMock.calls[0][0] as any;
    expect(sendArgs.to).toBe(NEW_EMAIL);
  });
});

// ===========================================================================
// confirmAlternateEmail
// ===========================================================================

describe.sequential('confirmAlternateEmail', () => {
  const TOKEN = 'tok-123';

  function setValidToken(
    overrides: Partial<{
      canonicalUid: string;
      email: string;
      used: boolean;
      expiresAtMs: number;
    }> = {}
  ) {
    setDoc('alternate_email_tokens', TOKEN, {
      canonicalUid: overrides.canonicalUid ?? CALLER_UID,
      email: overrides.email ?? NEW_EMAIL,
      used: overrides.used ?? false,
      expiresAt: H.adminFirestoreFn.Timestamp.fromMillis(
        overrides.expiresAtMs ?? Date.now() + 60_000
      ),
    });
  }

  it('throws not-found on missing token', async () => {
    await expect(
      confirmAlternateEmail({
        auth: { uid: CALLER_UID },
        data: { token: 'does-not-exist' },
      })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('throws deadline-exceeded on expired token', async () => {
    setValidToken({ expiresAtMs: Date.now() - 1000 });
    setDoc('users', CALLER_UID, { isVerified: true });
    setQuery('users', 'email', '==', NEW_EMAIL, []);

    await expect(
      confirmAlternateEmail({
        auth: { uid: CALLER_UID },
        data: { token: TOKEN },
      })
    ).rejects.toMatchObject({ code: 'deadline-exceeded' });
  });

  it('throws permission-denied when caller uid != token canonicalUid', async () => {
    setValidToken({ canonicalUid: 'other-uid' });

    await expect(
      confirmAlternateEmail({
        auth: { uid: CALLER_UID },
        data: { token: TOKEN },
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('returns { requiresAdminMerge: true } when a separate Auth user owns the email', async () => {
    setValidToken();
    setDoc('users', CALLER_UID, { isVerified: true });
    H.state.authUsers.set('other-uid', {
      uid: 'other-uid',
      email: NEW_EMAIL,
    });

    const result = await confirmAlternateEmail({
      auth: { uid: CALLER_UID },
      data: { token: TOKEN },
    });

    expect(result).toMatchObject({
      ok: true,
      email: NEW_EMAIL,
      requiresAdminMerge: true,
    });
    // Token must still be consumed (so retries cannot succeed).
    const tokenUpdate = H.state.txOps.find(
      (o) => o.op === 'update' && o.collection === 'alternate_email_tokens'
    );
    expect(tokenUpdate?.payload?.used).toBe(true);
    // No alias-index / alternateEmails writes happened.
    expect(
      H.state.txOps.find((o) => o.collection === 'email_alias')
    ).toBeUndefined();
    expect(
      H.state.txOps.find(
        (o) => o.op === 'update' && o.collection === 'users'
      )
    ).toBeUndefined();
  });

  it('throws failed-precondition with reason members_only when canonical not verified', async () => {
    setValidToken();
    setDoc('users', CALLER_UID, { isVerified: false });
    setQuery('users', 'email', '==', NEW_EMAIL, []);

    await expect(
      confirmAlternateEmail({
        auth: { uid: CALLER_UID },
        data: { token: TOKEN },
      })
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { reason: 'members_only' },
    });
  });

  it('happy path: all writes happen INSIDE a single runTransaction (B4)', async () => {
    setValidToken();
    setDoc('users', CALLER_UID, {
      isVerified: true,
      alternateEmails: [],
    });
    setQuery('users', 'email', '==', NEW_EMAIL, []);

    const result = await confirmAlternateEmail({
      auth: { uid: CALLER_UID },
      data: { token: TOKEN },
    });

    expect(result).toMatchObject({ ok: true, email: NEW_EMAIL });
    expect(result.requiresAdminMerge).toBeUndefined();

    // B4 invariant: exactly ONE runTransaction call wraps the state writes.
    expect(H.state.txnCount).toBe(1);

    // The transaction must perform: get token, get user, update user with
    // alternateEmails, set email_alias, update token -> used:true.
    const tokenGet = H.state.txOps.find(
      (o) => o.op === 'get' && o.collection === 'alternate_email_tokens'
    );
    const userGet = H.state.txOps.find(
      (o) =>
        o.op === 'get' && o.collection === 'users' && o.id === CALLER_UID
    );
    const userUpdate = H.state.txOps.find(
      (o) =>
        o.op === 'update' && o.collection === 'users' && o.id === CALLER_UID
    );
    const aliasSet = H.state.txOps.find(
      (o) =>
        o.op === 'set' && o.collection === 'email_alias' && o.id === NEW_EMAIL
    );
    const tokenUpdate = H.state.txOps.find(
      (o) =>
        o.op === 'update' && o.collection === 'alternate_email_tokens'
    );

    expect(tokenGet).toBeTruthy();
    expect(userGet).toBeTruthy();
    expect(userUpdate).toBeTruthy();
    expect(aliasSet).toBeTruthy();
    expect(tokenUpdate).toBeTruthy();

    // The alternateEmails array carries the new entry.
    const alts = userUpdate?.payload?.alternateEmails as Array<{
      email: string;
    }>;
    expect(alts).toEqual([expect.objectContaining({ email: NEW_EMAIL })]);

    // The token was marked used in the same transaction.
    expect(tokenUpdate?.payload?.used).toBe(true);

    // Critically: NO writes to users/email_alias/tokens happened OUTSIDE
    // the transaction (only pre-read .get is allowed).
    const nonTxnStateWrites = H.state.writes.filter(
      (w) =>
        w.collection === 'users' ||
        w.collection === 'email_alias' ||
        w.collection === 'alternate_email_tokens'
    );
    expect(nonTxnStateWrites).toEqual([]);
  });
});
