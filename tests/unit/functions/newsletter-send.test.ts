/**
 * Tests for the sendNewsletterIssue callable (F21).
 *
 * Source: functions/src/newsletter-send.ts
 *
 *   - RBAC: `newsletter:publish` (`nl:p.a`, newsletter-editor / content-
 *     editor / admin wildcard) is required.
 *   - Recipients are `newsletter/` docs that are confirmed or legacy (no
 *     status); pending, unsubscribed, QA plus-tag and duplicate emails are
 *     excluded.
 *   - The issue's HTML content is sanitized and every email carries that
 *     recipient's own unsubscribe link (legacy docs get a token minted).
 *   - An issue that already has `sentAt` is refused unless `force: true`;
 *     a send records sentAt / recipientCount / sentBy on the issue.
 *   - dryRun only counts.
 *
 * Mocking strategy mirrors announcements.test.ts.
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
  const state = { docs: new Map<string, Data>(), autoId: 0 };
  const SERVER_TIMESTAMP = { __sentinel: 'serverTimestamp' };
  const FieldValue = { serverTimestamp: () => SERVER_TIMESTAMP };

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
      update: async (payload: Data) => {
        state.docs.set(path, { ...(state.docs.get(path) ?? {}), ...payload });
      },
    };
  }
  function collectionRef(path: string): any {
    return {
      doc: (id: string) => docRef(`${path}/${id}`),
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
  const batches: Array<Array<{ path: string; payload: Data }>> = [];
  const db = {
    collection: (name: string) => collectionRef(name),
    batch: () => {
      const ops: Array<{ path: string; payload: Data }> = [];
      return {
        update: (ref: { path: string }, payload: Data) => {
          ops.push({ path: ref.path, payload });
        },
        commit: async () => {
          for (const op of ops) {
            state.docs.set(op.path, {
              ...(state.docs.get(op.path) ?? {}),
              ...op.payload,
            });
          }
          batches.push(ops);
        },
      };
    },
  };
  const QA_PLUS_TAGS = /^[^@]+\+(qa|secidtest|test)[^@]*@/i;
  const sendBatchEmails = vi.fn(async () => undefined);
  return {
    state,
    db,
    batches,
    FieldValue,
    SERVER_TIMESTAMP,
    FakeHttpsError,
    sendBatchEmails,
    isQaRecipient: (email: string) => QA_PLUS_TAGS.test(email),
  };
});

vi.mock(PATHS.init, () => ({ admin: { firestore: () => H.db } }));
vi.mock(PATHS.env, () => ({
  getAppUrl: () => 'https://secid.test',
  ALLOWED_CALLABLE_ORIGINS: [],
}));
vi.mock(PATHS.emailService, () => ({
  sendBatchEmails: H.sendBatchEmails,
  isQaRecipient: H.isQaRecipient,
}));
vi.mock(PATHS.firebaseAdminFirestore, () => ({ FieldValue: H.FieldValue }));
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

type Mail = { to: string; subject: string; html: string };
function sentMails(): Mail[] {
  return (H.sendBatchEmails.mock.calls as unknown as Array<[Mail[]]>).flatMap(
    (c) => c[0]
  );
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
// every test here shares the in-memory Firestore and the sendBatchEmails spy.
beforeEach(() => {
  H.state.docs.clear();
  H.state.autoId = 0;
  H.batches.length = 0;
  H.sendBatchEmails.mockClear();
  seedIssue();
  seedSub('ana');
  seedSub('luis');
});

describe('sendNewsletterIssue — authorization and input', { concurrent: false }, () => {
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
});

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
    expect(H.sendBatchEmails).not.toHaveBeenCalled();
    expect(
      H.state.docs.get(`newsletter_archive/${ISSUE}`)!.sentAt
    ).toBeUndefined();
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
    expect(H.state.docs.get(`newsletter_archive/${ISSUE}`)).toMatchObject({
      sentAt: H.SERVER_TIMESTAMP,
      recipientCount: 2,
      sentBy: 'nl-uid',
    });

    await expect(
      send({ auth: NL_EDITOR, data: { issueId: ISSUE } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(H.sendBatchEmails).toHaveBeenCalledTimes(1);

    const again = await send({
      auth: NL_EDITOR,
      data: { issueId: ISSUE, force: true },
    });
    expect(again).toEqual({ recipientCount: 2 });
    expect(H.sendBatchEmails).toHaveBeenCalledTimes(2);
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
