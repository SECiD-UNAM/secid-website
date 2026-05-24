/**
 * Tests for the S2 audit-log wiring in onMergeRequestApproved.
 *
 * Source: functions/src/merge-engine.ts
 *
 * Verifies: when a merge_request transitions to 'approved' and the merge
 * engine runs to completion, a single document is written to
 * `merge_audit_log/{requestId}` carrying the canonical shape (sourceUid,
 * targetUid, action, executorUid derived from afterData.reviewedBy,
 * completedAt).
 *
 * Mocking strategy mirrors alternate-email.test.ts:
 *   - `firebase-functions/v2/firestore` is intercepted so onDocumentUpdated
 *     returns the handler directly; tests invoke it with a synthetic event.
 *   - `firebase-admin` firestore is an in-memory stub recording all reads,
 *     writes, batch operations, and `db.collection('merge_audit_log').doc().set`
 *     calls so the test can assert exactly one audit row is written.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Resolve mock specs to absolute paths so vite-node matches the SUT's
// resolved imports (see alternate-email.test.ts for the same approach).
// ---------------------------------------------------------------------------

const PATHS = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  return {
    firebaseAdmin: path.resolve(
      'functions/node_modules/firebase-admin/lib/index.js'
    ),
    firebaseFunctionsFirestore: path.resolve(
      'functions/node_modules/firebase-functions/lib/esm/v2/providers/firestore.mjs'
    ),
  };
});

const H = vi.hoisted(() => {
  interface DocStub {
    id: string;
    data: any;
  }

  const state = {
    docs: new Map<string, DocStub>(),
    queryResults: new Map<string, string[]>(),
    writes: [] as Array<{
      op: string;
      collection: string;
      id: string;
      payload?: any;
    }>,
    authActions: [] as Array<{ action: string; uid: string; args?: any }>,
  };

  function makeSnapshot(collection: string, id: string): any {
    const stored = state.docs.get(`${collection}/${id}`);
    if (!stored) return { exists: false, id, data: () => undefined };
    return { exists: true, id: stored.id, data: () => stored.data };
  }

  function recordWrite(
    op: string,
    collection: string,
    id: string,
    payload?: any
  ) {
    state.writes.push({ op, collection, id, payload });
  }

  function makeDocRef(collection: string, id: string): any {
    const ref = {
      id,
      __collection: collection,
      get: async () => makeSnapshot(collection, id),
      set: async (payload: any) => {
        recordWrite('set', collection, id, payload);
        state.docs.set(`${collection}/${id}`, { id, data: payload });
      },
      update: async (payload: any) => {
        recordWrite('update', collection, id, payload);
        const prior = state.docs.get(`${collection}/${id}`)?.data ?? {};
        state.docs.set(`${collection}/${id}`, {
          id,
          data: { ...prior, ...payload },
        });
      },
      delete: async () => {
        recordWrite('delete', collection, id);
        state.docs.delete(`${collection}/${id}`);
      },
    };
    return ref;
  }

  function makeCollectionRef(collection: string): any {
    return {
      __collection: collection,
      doc: (id: string) => makeDocRef(collection, id),
      where: () => ({
        get: async () => ({ empty: true, docs: [] }),
      }),
    };
  }

  // collectionGroup queries are empty by default (the test exercises the
  // happy-path completion logic, not reference migration).
  const collectionGroupRef = {
    where: () => ({
      get: async () => ({ empty: true, docs: [] }),
    }),
  };

  // Batches: record but otherwise no-op.
  const batchOps: any[] = [];
  const makeBatch = () => ({
    update: (ref: any, payload: any) => {
      batchOps.push({ op: 'update', ref, payload });
    },
    set: (ref: any, payload: any) => {
      batchOps.push({ op: 'set', ref, payload });
    },
    delete: (ref: any) => {
      batchOps.push({ op: 'delete', ref });
    },
    commit: async () => undefined,
  });

  const adminFirestoreFn: any = () => ({
    collection: (c: string) => makeCollectionRef(c),
    collectionGroup: () => collectionGroupRef,
    batch: () => makeBatch(),
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        get: async (ref: any) => makeSnapshot(ref.__collection, ref.id),
        update: (ref: any, payload: any) =>
          recordWrite('tx-update', ref.__collection, ref.id, payload),
        set: (ref: any, payload: any) =>
          recordWrite('tx-set', ref.__collection, ref.id, payload),
      };
      return fn(tx);
    },
  });

  adminFirestoreFn.Timestamp = {
    now: () => ({ __timestamp: true }),
    fromMillis: (ms: number) => ({ __timestamp: true, toMillis: () => ms }),
  };
  adminFirestoreFn.FieldValue = {
    serverTimestamp: () => ({ __sentinel: 'serverTimestamp' }),
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
    getUser: async (uid: string) => {
      state.authActions.push({ action: 'getUser', uid });
      return { uid, email: '' };
    },
    updateUser: async (uid: string, args: any) => {
      state.authActions.push({ action: 'updateUser', uid, args });
      return { uid };
    },
    revokeRefreshTokens: async (uid: string) => {
      state.authActions.push({ action: 'revokeRefreshTokens', uid });
    },
  };

  return {
    state,
    adminFirestoreFn,
    authMock,
    batchOps,
  };
});

vi.mock(PATHS.firebaseAdmin, () => ({
  firestore: H.adminFirestoreFn,
  auth: () => H.authMock,
  default: {
    firestore: H.adminFirestoreFn,
    auth: () => H.authMock,
  },
}));

// onDocumentUpdated(opts, handler) returns the handler directly.
vi.mock(PATHS.firebaseFunctionsFirestore, () => ({
  onDocumentUpdated: (_opts: unknown, handler: unknown) => handler,
}));

// ---------------------------------------------------------------------------
// Import the SUT after mocks are wired.
// ---------------------------------------------------------------------------

import * as mergeEngine from '../../../functions/src/merge-engine';

// `any` here is intentional: the mocked onDocumentUpdated returns the raw
// handler whose call signature is the event payload, not the wrapped
// CloudFunction shape exported by firebase-functions.
const onMergeRequestApproved =
  mergeEngine.onMergeRequestApproved as unknown as (
    event: any
  ) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Fixtures + helpers
// ---------------------------------------------------------------------------

const REQUEST_ID = 'mr-abc';
const SOURCE_UID = 'src-uid';
const TARGET_UID = 'tgt-uid';
const ADMIN_UID = 'admin-uid';

function setDoc(collection: string, id: string, data: any): void {
  H.state.docs.set(`${collection}/${id}`, { id, data });
}

function makeApprovalEvent(): any {
  return {
    params: { requestId: REQUEST_ID },
    data: {
      before: { data: () => ({ status: 'pending' }) },
      after: {
        data: () => ({
          status: 'approved',
          sourceUid: SOURCE_UID,
          targetUid: TARGET_UID,
          fieldSelections: { basicInfo: 'source' },
          migrateReferences: false, // skip ref migration for this test
          oldDocAction: 'soft-delete',
          reviewedBy: ADMIN_UID,
          createdBy: 'someone-else',
          initiatedBy: 'auto-detected',
          matchedBy: 'numeroCuenta',
          numeroCuenta: '12345678',
        }),
      },
    },
  };
}

beforeEach(() => {
  H.state.docs.clear();
  H.state.queryResults.clear();
  H.state.writes.length = 0;
  H.state.authActions.length = 0;
  H.batchOps.length = 0;

  // Pre-seed source + target docs so the engine can read them.
  setDoc('users', SOURCE_UID, {
    email: 'old@example.com',
    firstName: 'Old',
    lastName: 'Name',
  });
  setDoc('users', TARGET_UID, {
    email: 'new@example.com',
    firstName: 'New',
    lastName: 'Name',
  });
});

// ===========================================================================

describe.sequential('onMergeRequestApproved — S2 audit log', () => {
  it('writes a merge_audit_log row keyed by requestId with the expected shape', async () => {
    await onMergeRequestApproved(makeApprovalEvent());

    const auditWrites = H.state.writes.filter(
      (w) => w.collection === 'merge_audit_log'
    );
    expect(auditWrites).toHaveLength(1);

    const audit = auditWrites[0];
    expect(audit.op).toBe('set');
    expect(audit.id).toBe(REQUEST_ID);
    expect(audit.payload).toMatchObject({
      requestId: REQUEST_ID,
      sourceUid: SOURCE_UID,
      targetUid: TARGET_UID,
      action: 'soft-delete',
      executorUid: ADMIN_UID,
      initiatedBy: 'auto-detected',
      matchedBy: 'numeroCuenta',
      numeroCuenta: '12345678',
    });
    // completedAt is the serverTimestamp sentinel from FieldValue.
    expect(audit.payload.completedAt).toEqual({
      __sentinel: 'serverTimestamp',
    });
  });

  it('skips the audit row when the status transition is NOT into approved', async () => {
    const noopEvent: any = {
      params: { requestId: REQUEST_ID },
      data: {
        before: { data: () => ({ status: 'approved' }) },
        after: { data: () => ({ status: 'approved' }) },
      },
    };
    await onMergeRequestApproved(noopEvent);
    const auditWrites = H.state.writes.filter(
      (w) => w.collection === 'merge_audit_log'
    );
    expect(auditWrites).toHaveLength(0);
  });
});
