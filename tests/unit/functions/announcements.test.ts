/**
 * Tests for the sendAnnouncement callable (F20).
 *
 * Source: functions/src/announcements.ts
 *
 *   - RBAC: unauthenticated → 'unauthenticated'; a member token (no
 *     announcements:publish) → 'permission-denied'; `ac:p.a` (content-
 *     editor / newsletter-editor) and the admin wildcard `*:*.a` pass.
 *   - Input validation → 'invalid-argument'.
 *   - Recipient resolution per audience: all_active, campus, rbac_group,
 *     test (caller only). Inactive users, users without email, users with
 *     notificationSettings.email === false, company accounts and QA
 *     plus-tag addresses never count.
 *   - dryRun returns the count without queueing mail or writing a record.
 *   - Mail is queued in batches of 400 and the run is recorded in
 *     announcements/{id}; a queue failure is recorded as status 'failed'.
 *
 * Mocking strategy mirrors alternate-email.test.ts: `onCall` returns the
 * handler, `./init` yields an in-memory Firestore stub keyed by document
 * path, and `./email-service` is a spy.
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
    emailService: path.resolve('functions/src/email-service.ts'),
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
  };
  const SERVER_TIMESTAMP = { __sentinel: 'serverTimestamp' };
  const FieldValue = { serverTimestamp: () => SERVER_TIMESTAMP };

  const read = (data: Data, field: string) =>
    field
      .split('.')
      .reduce<any>((acc, k) => (acc == null ? acc : acc[k]), data);
  type Filter = { field: string; op: string; value: any };
  const matches = (data: Data, f: Filter) => {
    const actual = read(data, f.field);
    if (f.op === '==') return actual === f.value;
    if (f.op === 'array-contains') {
      return Array.isArray(actual) && actual.includes(f.value);
    }
    throw new Error(`unsupported op ${f.op}`);
  };

  function snapshot(path: string) {
    const data = state.docs.get(path);
    return {
      id: path.split('/').pop() as string,
      exists: !!data,
      data: () => data,
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
    };
  }
  function collectionRef(path: string, filters: Filter[] = []): any {
    return {
      doc: (id?: string) => docRef(`${path}/${id ?? `auto-${++state.autoId}`}`),
      where: (field: string, op: string, value: any) =>
        collectionRef(path, [...filters, { field, op, value }]),
      get: async () => {
        const docs = [...state.docs.keys()]
          .filter(
            (p) =>
              p.startsWith(`${path}/`) &&
              !p.slice(path.length + 1).includes('/')
          )
          .filter((p) =>
            filters.every((f) => matches(state.docs.get(p) as Data, f))
          )
          .map(snapshot);
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
  }
  const db = { collection: (name: string) => collectionRef(name) };

  const QA_PLUS_TAGS = /^[^@]+\+(qa|secidtest|test)[^@]*@/i;
  const sendBatchEmails = vi.fn(async () => undefined);

  return {
    state,
    db,
    FieldValue,
    SERVER_TIMESTAMP,
    FakeHttpsError,
    sendBatchEmails,
    isQaRecipient: (email: string) => QA_PLUS_TAGS.test(email),
  };
});

vi.mock(PATHS.init, () => ({}));
vi.mock(PATHS.env, () => ({
  getAppUrl: () => 'https://secid.test',
  ALLOWED_CALLABLE_ORIGINS: [],
}));
vi.mock(PATHS.emailService, () => ({
  sendBatchEmails: H.sendBatchEmails,
  isQaRecipient: H.isQaRecipient,
}));
vi.mock(PATHS.firebaseAdminFirestore, () => ({
  getFirestore: () => H.db,
  FieldValue: H.FieldValue,
}));
vi.mock(PATHS.firebaseFunctionsHttps, () => ({
  onCall: (optsOrHandler: unknown, handler?: unknown) =>
    handler ?? optsOrHandler,
  HttpsError: H.FakeHttpsError,
}));

import {
  sendAnnouncement,
  ANNOUNCEMENT_BATCH_SIZE,
} from '../../../functions/src/announcements';

const send = sendAnnouncement as unknown as (request: {
  auth?: { uid: string; token: Record<string, unknown> };
  data: unknown;
}) => Promise<{ id?: string; recipientCount: number }>;

const ADMIN = { uid: 'admin-uid', token: { rbac: { p: '*:*.a' } } };
const EDITOR = {
  uid: 'editor-uid',
  token: { rbac: { g: ['content-editor'], p: 'ev:c.a,ac:p.a,ac:v.a' } },
};
const MEMBER = {
  uid: 'member-uid',
  token: { rbac: { g: ['member'], p: 'ev:v.a,fo:c.o' } },
};

const INPUT = {
  subject: 'Asamblea anual',
  bodyMarkdown: 'Hola **a todos**\n\n<script>x</script>',
  audience: { kind: 'all_active' },
  lang: 'es',
};

function seedUser(uid: string, overrides: Record<string, unknown> = {}) {
  H.state.docs.set(`users/${uid}`, {
    email: `${uid}@example.com`,
    firstName: 'Ana',
    role: 'member',
    campus: 'IIMAS',
    lifecycle: { status: 'active' },
    notificationSettings: { email: true },
    ...overrides,
  });
}

function mailDocs() {
  return [...H.state.docs.entries()].filter(([p]) =>
    p.startsWith('announcements/')
  );
}

// { concurrent: false }: vitest.config.ts runs files sequentially now, but
// every test here shares the in-memory Firestore and the sendBatchEmails spy.
beforeEach(() => {
  H.state.docs.clear();
  H.state.autoId = 0;
  H.sendBatchEmails.mockClear();
  H.sendBatchEmails.mockResolvedValue(undefined);
  seedUser('admin-uid', { role: 'admin' });
  seedUser('editor-uid', { campus: 'FES Acatlan' });
  seedUser('member-uid');
});

describe('sendAnnouncement — authorization', { concurrent: false }, () => {
  it('rejects unauthenticated calls', async () => {
    await expect(send({ data: INPUT })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('rejects a member token without announcements:publish', async () => {
    await expect(send({ auth: MEMBER, data: INPUT })).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(H.sendBatchEmails).not.toHaveBeenCalled();
  });

  it('accepts ac:p.a (content-editor) and the admin wildcard', async () => {
    const asEditor = await send({
      auth: EDITOR,
      data: { ...INPUT, dryRun: true },
    });
    const asAdmin = await send({
      auth: ADMIN,
      data: { ...INPUT, dryRun: true },
    });
    expect(asEditor.recipientCount).toBe(3);
    expect(asAdmin.recipientCount).toBe(3);
  });
});

describe('sendAnnouncement — input validation', { concurrent: false }, () => {
  it.each([
    ['empty subject', { ...INPUT, subject: '  ' }],
    ['missing body', { ...INPUT, bodyMarkdown: '' }],
    ['unknown audience', { ...INPUT, audience: { kind: 'everyone' } }],
    ['campus without campus', { ...INPUT, audience: { kind: 'campus' } }],
    ['group without groupId', { ...INPUT, audience: { kind: 'rbac_group' } }],
    ['subject too long', { ...INPUT, subject: 'x'.repeat(201) }],
  ])('rejects %s with invalid-argument', async (_label, data) => {
    await expect(send({ auth: ADMIN, data })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });
});

describe(
  'sendAnnouncement — recipient resolution',
  { concurrent: false },
  () => {
    it('all_active: active users with an email who have not opted out', async () => {
      seedUser('inactive', { lifecycle: { status: 'inactive' } });
      seedUser('no-email', { email: '' });
      seedUser('opted-out', { notificationSettings: { email: false } });
      seedUser('company', { role: 'company' });
      seedUser('qa', { email: 'ana+qa@example.com' });
      seedUser('no-settings', { notificationSettings: undefined });

      const result = await send({
        auth: ADMIN,
        data: { ...INPUT, dryRun: true },
      });

      // admin, editor, member + no-settings (absent settings = opted in)
      expect(result.recipientCount).toBe(4);
    });

    it('campus: only users whose campus matches', async () => {
      seedUser('acatlan-2', { campus: 'FES Acatlan' });
      const result = await send({
        auth: ADMIN,
        data: {
          ...INPUT,
          dryRun: true,
          audience: { kind: 'campus', campus: 'FES Acatlan' },
        },
      });
      expect(result.recipientCount).toBe(2);
    });

    it('rbac_group: members of the group via rbac_user_groups', async () => {
      H.state.docs.set('rbac_user_groups/editor-uid', {
        groups: ['content-editor'],
      });
      H.state.docs.set('rbac_user_groups/member-uid', { groups: ['member'] });
      H.state.docs.set('rbac_user_groups/ghost', {
        groups: ['content-editor'],
      });
      const result = await send({
        auth: ADMIN,
        data: {
          ...INPUT,
          dryRun: true,
          audience: { kind: 'rbac_group', groupId: 'content-editor' },
        },
      });
      // editor-uid only: ghost has no users doc
      expect(result.recipientCount).toBe(1);
    });

    it('test: only the caller, even when the caller is opted out', async () => {
      seedUser('editor-uid', { notificationSettings: { email: false } });
      const result = await send({
        auth: EDITOR,
        data: { ...INPUT, audience: { kind: 'test' } },
      });
      expect(result.recipientCount).toBe(1);
      const [batch] = H.sendBatchEmails.mock.calls[0] as unknown as [
        Array<{ to: string; subject: string; html: string }>,
      ];
      expect(batch).toHaveLength(1);
      expect(batch[0]!.to).toBe('editor-uid@example.com');
    });
  }
);

describe('sendAnnouncement — dry run', { concurrent: false }, () => {
  it('returns the count without queueing mail or recording a run', async () => {
    const result = await send({
      auth: ADMIN,
      data: { ...INPUT, dryRun: true },
    });
    expect(result).toEqual({ recipientCount: 3 });
    expect(H.sendBatchEmails).not.toHaveBeenCalled();
    expect(mailDocs()).toHaveLength(0);
  });
});

describe('sendAnnouncement — sending', { concurrent: false }, () => {
  it('renders the markdown body inside the SECiD email shell', async () => {
    await send({ auth: ADMIN, data: INPUT });
    const [batch] = H.sendBatchEmails.mock.calls[0] as unknown as [
      Array<{ to: string; subject: string; html: string }>,
    ];
    const email = batch.find((e) => e.to === 'member-uid@example.com')!;
    expect(email.subject).toBe('Asamblea anual');
    expect(email.html).toContain('<strong>a todos</strong>');
    expect(email.html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('https://secid.test/es/dashboard/settings');
    expect(email.html).toContain('<!DOCTYPE html>');
  });

  it('queues in batches of 400 and records the run', async () => {
    for (let i = 0; i < 997; i++) seedUser(`u${i}`);
    const result = await send({ auth: EDITOR, data: INPUT });

    expect(ANNOUNCEMENT_BATCH_SIZE).toBe(400);
    expect(result.recipientCount).toBe(1000);
    const sizes = H.sendBatchEmails.mock.calls.map(
      (c) => (c as unknown as [unknown[]])[0].length
    );
    expect(sizes).toEqual([400, 400, 200]);

    const [[path, record]] = mailDocs();
    expect(path).toBe(`announcements/${result.id}`);
    expect(record).toMatchObject({
      subject: 'Asamblea anual',
      bodyMarkdown: INPUT.bodyMarkdown,
      audience: { kind: 'all_active' },
      lang: 'es',
      recipientCount: 1000,
      sentBy: 'editor-uid',
      sentAt: H.SERVER_TIMESTAMP,
      status: 'sent',
    });
  });

  it('records a failed run and surfaces an internal error', async () => {
    H.sendBatchEmails.mockRejectedValueOnce(new Error('smtp down'));
    await expect(send({ auth: ADMIN, data: INPUT })).rejects.toMatchObject({
      code: 'internal',
    });
    const [[, record]] = mailDocs();
    expect(record).toMatchObject({ status: 'failed', error: 'smtp down' });
  });
});
