/**
 * Tests for the sendNewsletterIssue callable (F21).
 *
 * Source: functions/src/newsletter-send.ts
 *
 *   - RBAC: `newsletter:publish` (`nl:p.a`, newsletter-editor / content-
 *     editor / admin wildcard) is required.
 *   - Recipients are `newsletter/` docs that are confirmed or legacy (no
 *     status); pending, QA plus-tag and duplicate emails are excluded, and
 *     an email with ANY unsubscribed doc (legacy duplicates) is excluded
 *     entirely.
 *   - The issue's HTML content is sanitized and every email carries that
 *     recipient's own unsubscribe link (legacy docs get a token minted).
 *   - The send is claimed in a transaction (`sendingAt`): a concurrent
 *     call is refused, a finished issue (`sentAt`) is refused unless
 *     `force: true`, and mail docs have deterministic ids so a retry after
 *     a partial failure never mails anyone twice.
 *   - dryRun only counts.
 *
 * email-service.ts is NOT mocked: it writes to the same in-memory
 * Firestore, so the tests see the real `mail/` docs and their ids.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const PATHS = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const functionsModules = fs.realpathSync(
    path.resolve('functions/node_modules')
  );
  return {
    init: path.resolve('functions/src/init.ts'),
    env: path.resolve('functions/src/env.ts'),
    firebaseAdminFirestore: path.join(
      functionsModules,
      'firebase-admin/lib/esm/firestore/index.js'
    ),
    firebaseFunctionsHttps: path.join(
      functionsModules,
      'firebase-functions/lib/esm/v2/providers/https.mjs'
    ),
  };
});

const H = vi.hoisted(() => {
  type Data = Record<string, any>;
  class FakeHttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  const state = {
    docs: new Map<string, Data>(),
    autoId: 0,
    /** Commits that touch `mail/` so far; set failMailCommit to break one. */
    mailCommits: 0,
    failMailCommit: 0,
  };
  const SERVER_TIMESTAMP = { __sentinel: 'serverTimestamp' };
  const DELETE = { __sentinel: 'delete' };
  const FieldValue = {
    serverTimestamp: () => SERVER_TIMESTAMP,
    delete: () => DELETE,
  };
  type Op = { kind: 'set' | 'update' | 'create'; path: string; payload: Data };

  function applyUpdate(path: string, payload: Data) {
    const next = { ...(state.docs.get(path) ?? {}) };
    for (const [k, v] of Object.entries(payload)) {
      if (v === DELETE) delete next[k];
      else next[k] = v;
    }
    state.docs.set(path, next);
  }
  function snapshot(path: string) {
    const data = state.docs.get(path);
    return {
      id: path.split('/').pop() as string,
      exists: !!data,
      data: () => data,
      ref: docRef(path),
    };
  }
  function docRef(path: string): any {
    return {
      id: path.split('/').pop() as string,
      path,
      get: async () => snapshot(path),
      set: async (payload: Data) => {
        state.docs.set(path, payload);
      },
      update: async (payload: Data) => applyUpdate(path, payload),
    };
  }
  function collectionRef(path: string): any {
    return {
      doc: (id?: string) => docRef(`${path}/${id ?? `auto-${++state.autoId}`}`),
      add: async (payload: Data) => {
        const ref = docRef(`${path}/auto-${++state.autoId}`);
        state.docs.set(ref.path, payload);
        return ref;
      },
      get: async () => {
        const docs = [...state.docs.keys()]
          .filter(
            (p) =>
              p.startsWith(`${path}/`) &&
              !p.slice(path.length + 1).includes('/')
          )
          .map(snapshot);
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
  }
  function commit(ops: Op[]) {
    if (ops.some((op) => op.path.startsWith('mail/'))) {
      state.mailCommits += 1;
      if (state.mailCommits === state.failMailCommit) {
        throw new Error('simulated batch failure');
      }
    }
    for (const op of ops) {
      if (op.kind === 'create' && state.docs.has(op.path)) {
        throw new Error(`ALREADY_EXISTS: ${op.path}`);
      }
    }
    for (const op of ops) {
      if (op.kind === 'update') applyUpdate(op.path, op.payload);
      else state.docs.set(op.path, op.payload);
    }
  }
  const db = {
    collection: (name: string) => collectionRef(name),
    getAll: async (...refs: Array<{ path: string }>) =>
      refs.map((r) => snapshot(r.path)),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) =>
      fn({
        get: async (ref: { path: string }) => snapshot(ref.path),
        update: (ref: { path: string }, payload: Data) =>
          applyUpdate(ref.path, payload),
      }),
    batch: () => {
      const ops: Op[] = [];
      const push =
        (kind: Op['kind']) => (ref: { path: string }, payload: Data) => {
          ops.push({ kind, path: ref.path, payload });
        };
      return {
        set: push('set'),
        update: push('update'),
        create: push('create'),
        commit: async () => commit(ops),
      };
    },
  };
  return { state, db, FieldValue, SERVER_TIMESTAMP, FakeHttpsError };
});

vi.mock(PATHS.init, () => ({}));
vi.mock(PATHS.env, () => ({
  getAppUrl: () => 'https://secid.test',
  ALLOWED_CALLABLE_ORIGINS: [],
}));
vi.mock(PATHS.firebaseAdminFirestore, () => ({
  getFirestore: () => H.db,
  FieldValue: H.FieldValue,
}));
vi.mock(PATHS.firebaseFunctionsHttps, () => ({
  onCall: (optsOrHandler: unknown, handler?: unknown) =>
    handler ?? optsOrHandler,
  // newsletter-subscriptions.ts (imported for the token helpers) also
  // defines the confirm/unsubscribe HTTP functions.
  onRequest: (_opts: unknown, handler: unknown) => handler,
  HttpsError: H.FakeHttpsError,
}));

import { sendNewsletterIssue } from '../../../functions/src/newsletter-send';

const send = sendNewsletterIssue as unknown as (request: {
  auth?: { uid: string; token: Record<string, unknown> };
  data: unknown;
}) => Promise<{ recipientCount: number }>;

const ADMIN = { uid: 'admin-uid', token: { rbac: { p: '*:*.a' } } };
const NL_EDITOR = {
  uid: 'nl-uid',
  token: { rbac: { g: ['newsletter-editor'], p: 'nl:*.a,ev:v.a' } },
};
const MEMBER = { uid: 'member-uid', token: { rbac: { p: 'nl:v.a,ev:v.a' } } };
const ISSUE = 'issue-1';

type Mail = { id: string; to: string; subject: string; html: string };
function sentMails(): Mail[] {
  return [...H.state.docs.entries()]
    .filter(([p]) => p.startsWith('mail/'))
    .map(([p, d]) => ({
      id: p.slice('mail/'.length),
      to: d.to,
      subject: d.message.subject,
      html: d.message.html,
    }));
}

function issueDoc() {
  return H.state.docs.get(`newsletter_archive/${ISSUE}`)!;
}

function seedIssue(overrides: Record<string, unknown> = {}) {
  H.state.docs.set(`newsletter_archive/${ISSUE}`, {
    title: 'Boletín #7',
    issueNumber: 7,
    status: 'published',
    content:
      '<h2>Hola</h2><p>Texto <b>fuerte</b></p><script>alert(1)</script><a href="javascript:x">j</a><a href="https://secid.mx">ok</a>',
    excerpt: 'Resumen',
    ...overrides,
  });
}

function seedSub(id: string, overrides: Record<string, unknown> = {}) {
  H.state.docs.set(`newsletter/${id}`, {
    email: `${id}@example.com`,
    name: id,
    lang: 'es',
    status: 'confirmed',
    unsubscribeToken: `tok-${id}`,
    ...overrides,
  });
}

// { concurrent: false }: vitest.config.ts sets sequence.concurrent=true, but
// every test here shares the in-memory Firestore.
beforeEach(() => {
  H.state.docs.clear();
  H.state.autoId = 0;
  H.state.mailCommits = 0;
  H.state.failMailCommit = 0;
  seedIssue();
  seedSub('ana');
  seedSub('luis');
});

describe(
  'sendNewsletterIssue — authorization and input',
  { concurrent: false },
  () => {
    it('rejects unauthenticated calls and tokens without newsletter:publish', async () => {
      await expect(send({ data: { issueId: ISSUE } })).rejects.toMatchObject({
        code: 'unauthenticated',
      });
      await expect(
        send({ auth: MEMBER, data: { issueId: ISSUE } })
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });

    it('rejects a missing issueId and an unknown issue', async () => {
      await expect(send({ auth: ADMIN, data: {} })).rejects.toMatchObject({
        code: 'invalid-argument',
      });
      await expect(
        send({ auth: ADMIN, data: { issueId: 'ghost' } })
      ).rejects.toMatchObject({ code: 'not-found' });
    });
  }
);

describe('sendNewsletterIssue — recipients', { concurrent: false }, () => {
  it('mails confirmed and legacy subscribers only, once per email', async () => {
    seedSub('legacy', { status: undefined, unsubscribeToken: undefined });
    seedSub('pending', { status: 'pending' });
    seedSub('gone', { status: 'unsubscribed' });
    seedSub('qa', { email: 'ana+qa@example.com' });
    seedSub('dup', { email: 'ana@example.com' });

    const result = await send({
      auth: NL_EDITOR,
      data: { issueId: ISSUE, dryRun: true },
    });

    expect(result).toEqual({ recipientCount: 3 });
    expect(sentMails()).toHaveLength(0);
    expect(issueDoc().sentAt).toBeUndefined();
  });

  it('skips an email entirely when any of its (legacy duplicate) docs is unsubscribed', async () => {
    // Pre-F21 the public form added a doc per submission, so one address
    // can own several docs; an unsubscribe on one must win over the rest,
    // whatever the casing or spacing the legacy docs stored.
    seedSub('legacy-ana', { email: 'Ana@Example.com ', status: undefined });
    seedSub('gone-ana', { email: 'ana@example.com', status: 'unsubscribed' });
    seedSub('legacy-eva', { email: 'eva@example.com', status: undefined });
    seedSub('gone-eva', { email: ' EVA@example.com', status: 'unsubscribed' });

    const result = await send({ auth: NL_EDITOR, data: { issueId: ISSUE } });

    expect(result).toEqual({ recipientCount: 1 });
    expect(sentMails().map((m) => m.to)).toEqual(['luis@example.com']);
  });
});

describe('sendNewsletterIssue — sending', { concurrent: false }, () => {
  it('sanitizes the issue HTML and adds a per-recipient unsubscribe link', async () => {
    await send({ auth: NL_EDITOR, data: { issueId: ISSUE } });

    const mails = sentMails();
    expect(mails.map((m) => m.to).sort()).toEqual([
      'ana@example.com',
      'luis@example.com',
    ]);
    const ana = mails.find((m) => m.to === 'ana@example.com')!;
    expect(ana.subject).toBe('Boletín #7');
    expect(ana.html).toContain('<h2>Hola</h2>');
    expect(ana.html).toContain('<b>fuerte</b>');
    expect(ana.html).toContain('<a href="https://secid.mx">ok</a>');
    expect(ana.html).not.toContain('<script');
    expect(ana.html).not.toContain('javascript:');
    expect(ana.html).toContain(
      'https://secid.test/api/newsletter/unsubscribe?token=tok-ana'
    );
    expect(ana.html).not.toContain('tok-luis');
  });

  it('mints an unsubscribe token for legacy docs that have none', async () => {
    seedSub('legacy', { status: undefined, unsubscribeToken: undefined });
    await send({ auth: ADMIN, data: { issueId: ISSUE } });

    const doc = H.state.docs.get('newsletter/legacy')!;
    expect(doc.unsubscribeToken).toMatch(/^[a-f0-9]{64}$/);
    const mail = sentMails().find((m) => m.to === 'legacy@example.com')!;
    const token = /unsubscribe\?token=([a-f0-9]+)/.exec(mail.html)![1]!;
    expect(token).toBe(doc.unsubscribeToken);
  });

  it('records the send on the issue and refuses to send twice without force', async () => {
    const first = await send({ auth: NL_EDITOR, data: { issueId: ISSUE } });
    expect(first).toEqual({ recipientCount: 2 });
    expect(issueDoc()).toMatchObject({
      sentAt: H.SERVER_TIMESTAMP,
      recipientCount: 2,
      sentBy: 'nl-uid',
    });
    expect(issueDoc().sendingAt).toBeUndefined();
    expect(issueDoc().sendingBy).toBeUndefined();

    await expect(
      send({ auth: NL_EDITOR, data: { issueId: ISSUE } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(sentMails()).toHaveLength(2);

    // force is a new delivery: new mail docs, not a no-op on the old ids.
    const again = await send({
      auth: NL_EDITOR,
      data: { issueId: ISSUE, force: true },
    });
    expect(again).toEqual({ recipientCount: 2 });
    expect(sentMails()).toHaveLength(4);
    expect(new Set(sentMails().map((m) => m.id)).size).toBe(4);
  });

  it('dry run is allowed on an already-sent issue', async () => {
    seedIssue({ sentAt: new Date(), recipientCount: 2 });
    const result = await send({
      auth: ADMIN,
      data: { issueId: ISSUE, dryRun: true },
    });
    expect(result).toEqual({ recipientCount: 2 });
  });
});

describe('sendNewsletterIssue — claim and retry', { concurrent: false }, () => {
  it('refuses a second call while the issue is being sent', async () => {
    seedIssue({ sendingAt: new Date(), sendingBy: 'other-editor' });

    await expect(
      send({ auth: ADMIN, data: { issueId: ISSUE } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(
      send({ auth: ADMIN, data: { issueId: ISSUE, force: true } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(sentMails()).toHaveLength(0);
    expect(issueDoc().sendingBy).toBe('other-editor');
  });

  it('treats a claim older than the function timeout as abandoned', async () => {
    seedIssue({
      sendingAt: new Date(Date.now() - 20 * 60 * 1000),
      sendingBy: 'crashed-run',
    });

    const result = await send({ auth: ADMIN, data: { issueId: ISSUE } });

    expect(result).toEqual({ recipientCount: 2 });
    expect(issueDoc().sentAt).toBe(H.SERVER_TIMESTAMP);
    expect(issueDoc().sendingAt).toBeUndefined();
  });

  it('releases the claim on failure and a retry does not mail anyone twice', async () => {
    // 401 subscribers → two mail batches (400 + 1); the second one fails.
    for (let i = 0; i < 399; i += 1) seedSub(`sub-${i}`);
    H.state.failMailCommit = 2;

    await expect(
      send({ auth: NL_EDITOR, data: { issueId: ISSUE } })
    ).rejects.toThrow('simulated batch failure');
    expect(sentMails()).toHaveLength(400);
    expect(issueDoc().sentAt).toBeUndefined();
    expect(issueDoc().sendingAt).toBeUndefined();

    const retry = await send({ auth: NL_EDITOR, data: { issueId: ISSUE } });

    expect(retry).toEqual({ recipientCount: 401 });
    const mails = sentMails();
    expect(mails).toHaveLength(401);
    expect(new Set(mails.map((m) => m.to)).size).toBe(401);
    expect(issueDoc()).toMatchObject({
      sentAt: H.SERVER_TIMESTAMP,
      recipientCount: 401,
    });
  });

  it('uses deterministic mail doc ids (issue, delivery, hashed email)', async () => {
    await send({ auth: NL_EDITOR, data: { issueId: ISSUE } });
    const ids = sentMails()
      .map((m) => m.id)
      .sort();
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(id).toMatch(/^issue-1_1_[a-f0-9]{16}$/);
    }
  });
});
