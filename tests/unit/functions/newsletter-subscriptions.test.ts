/**
 * Tests for the newsletter double opt-in (F21).
 *
 * Source: functions/src/newsletter-subscriptions.ts — the pieces the
 * subscribeNewsletter endpoint (public-forms.ts) and the confirm /
 * unsubscribe HTTP functions share:
 *
 *   - tokens are random; the confirm token is stored as its sha256, the
 *     unsubscribe token raw (it has to be reproduced in every issue);
 *   - a subscribe upserts one doc per email: new → pending + confirmation
 *     mail; already confirmed → nothing resent; pending or unsubscribed →
 *     fresh token + mail;
 *   - confirm flips pending → confirmed and burns the token;
 *   - unsubscribe flips any status → unsubscribed on EVERY doc of that
 *     email (pre-F21 the form added a doc per submission, so one address
 *     can own several);
 *   - docs without `status` (written before F21) count as confirmed;
 *   - emails are normalized (trim + lowercase) before any lookup.
 *
 * The module takes the Firestore handle as a parameter, so only FieldValue
 * and the email helpers are mocked.
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
  const state = { docs: new Map<string, Data>(), autoId: 0 };
  const SERVER_TIMESTAMP = { __sentinel: 'serverTimestamp' };
  const DELETE = { __sentinel: 'delete' };
  const FieldValue = {
    serverTimestamp: () => SERVER_TIMESTAMP,
    delete: () => DELETE,
  };
  type Filter = { field: string; op: string; value: any };

  function snapshot(path: string) {
    const data = state.docs.get(path);
    return {
      id: path.split('/').pop() as string,
      exists: !!data,
      data: () => data,
      ref: docRef(path),
    };
  }
  function applyUpdate(path: string, payload: Data) {
    const next = { ...(state.docs.get(path) ?? {}) };
    for (const [k, v] of Object.entries(payload)) {
      if (v === DELETE) delete next[k];
      else next[k] = v;
    }
    state.docs.set(path, next);
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
  function collectionRef(path: string, filters: Filter[] = [], max = 0): any {
    return {
      doc: (id?: string) => docRef(`${path}/${id ?? `auto-${++state.autoId}`}`),
      add: async (payload: Data) => {
        const ref = docRef(`${path}/auto-${++state.autoId}`);
        state.docs.set(ref.path, payload);
        return ref;
      },
      where: (field: string, op: string, value: any) =>
        collectionRef(path, [...filters, { field, op, value }], max),
      limit: (n: number) => collectionRef(path, filters, n),
      get: async () => {
        let docs = [...state.docs.keys()]
          .filter(
            (p) =>
              p.startsWith(`${path}/`) &&
              !p.slice(path.length + 1).includes('/')
          )
          .filter((p) =>
            filters.every((f) => {
              if (f.op !== '==') throw new Error(`unsupported op ${f.op}`);
              return (state.docs.get(p) as Data)[f.field] === f.value;
            })
          )
          .map(snapshot);
        if (max) docs = docs.slice(0, max);
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
  }
  const db = { collection: (name: string) => collectionRef(name) };
  const sendEmail = vi.fn(async () => 'mail-id');
  return { state, db, FieldValue, SERVER_TIMESTAMP, sendEmail };
});

vi.mock(PATHS.init, () => ({}));
vi.mock(PATHS.env, () => ({ getAppUrl: () => 'https://secid.test' }));
vi.mock(PATHS.emailService, () => ({ sendEmail: H.sendEmail }));
vi.mock(PATHS.firebaseAdminFirestore, () => ({
  getFirestore: () => H.db,
  FieldValue: H.FieldValue,
}));
vi.mock(PATHS.firebaseFunctionsHttps, () => ({
  onRequest: (_opts: unknown, handler: unknown) => handler,
}));

import {
  hashToken,
  newToken,
  isMailableSubscription,
  upsertPendingSubscription,
  confirmSubscription,
  unsubscribeByToken,
  confirmNewsletter,
  unsubscribeNewsletter,
} from '../../../functions/src/newsletter-subscriptions';

const db = H.db as any;

function subs() {
  return [...H.state.docs.entries()]
    .filter(([p]) => p.startsWith('newsletter/'))
    .map(([, d]) => d);
}

function lastMail(): { to: string; subject: string; html: string } {
  const calls = H.sendEmail.mock.calls as unknown as Array<[any]>;
  return calls[calls.length - 1]![0];
}

function linkFrom(html: string, path: string): string {
  const match = new RegExp(
    `https://secid.test${path}\\?token=([a-f0-9]+)`
  ).exec(html);
  if (!match) throw new Error(`no ${path} link in ${html}`);
  return match[1]!;
}

// { concurrent: false }: vitest.config.ts sets sequence.concurrent=true, but
// every test here shares the in-memory Firestore and the sendEmail spy.
beforeEach(() => {
  H.state.docs.clear();
  H.state.autoId = 0;
  H.sendEmail.mockClear();
});

describe('tokens', { concurrent: false }, () => {
  it('newToken is random hex and hashToken is a stable sha256', () => {
    const a = newToken();
    const b = newToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
    expect(hashToken(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(a);
  });
});

describe('isMailableSubscription', { concurrent: false }, () => {
  it('confirmed and legacy (no status) docs are mailable; pending and unsubscribed are not', () => {
    expect(
      isMailableSubscription({ email: 'a@b.mx', status: 'confirmed' })
    ).toBe(true);
    expect(isMailableSubscription({ email: 'a@b.mx' })).toBe(true);
    expect(isMailableSubscription({ email: 'a@b.mx', status: 'pending' })).toBe(
      false
    );
    expect(
      isMailableSubscription({ email: 'a@b.mx', status: 'unsubscribed' })
    ).toBe(false);
    expect(isMailableSubscription({ status: 'confirmed' })).toBe(false);
  });
});

describe('upsertPendingSubscription', { concurrent: false }, () => {
  const input = {
    email: 'ana@example.com',
    name: 'Ana',
    interests: ['jobs'],
    lang: 'es' as const,
    ipHash: 'iphash',
  };

  it('creates a pending doc with hashed tokens and mails a confirmation link', async () => {
    await upsertPendingSubscription(db, input);

    const [doc] = subs();
    expect(doc).toMatchObject({
      email: 'ana@example.com',
      name: 'Ana',
      interests: ['jobs'],
      lang: 'es',
      source: 'website',
      ipHash: 'iphash',
      status: 'pending',
      subscribedAt: H.SERVER_TIMESTAMP,
    });
    expect(doc!.confirmTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(doc!.unsubscribeToken).toMatch(/^[a-f0-9]{64}$/);
    expect(doc!.confirmToken).toBeUndefined();

    const mail = lastMail();
    expect(mail.to).toBe('ana@example.com');
    expect(mail.subject).toMatch(/confirma/i);
    const token = linkFrom(mail.html, '/api/newsletter/confirm');
    expect(hashToken(token)).toBe(doc!.confirmTokenHash);
    expect(mail.html).not.toContain(doc!.confirmTokenHash);
  });

  it('does nothing for an already confirmed email', async () => {
    H.state.docs.set('newsletter/s1', {
      email: 'ana@example.com',
      status: 'confirmed',
    });
    await upsertPendingSubscription(db, input);
    expect(subs()).toHaveLength(1);
    expect(subs()[0]!.status).toBe('confirmed');
    expect(H.sendEmail).not.toHaveBeenCalled();
  });

  it('treats a legacy doc (no status) as confirmed', async () => {
    H.state.docs.set('newsletter/s1', { email: 'ana@example.com' });
    await upsertPendingSubscription(db, input);
    expect(subs()).toHaveLength(1);
    expect(H.sendEmail).not.toHaveBeenCalled();
  });

  it('re-issues the token and resends for a pending or unsubscribed email', async () => {
    H.state.docs.set('newsletter/s1', {
      email: 'ana@example.com',
      status: 'unsubscribed',
      confirmTokenHash: 'old',
    });
    await upsertPendingSubscription(db, input);
    expect(subs()).toHaveLength(1);
    const [doc] = subs();
    expect(doc!.status).toBe('pending');
    expect(doc!.confirmTokenHash).not.toBe('old');
    expect(H.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('normalizes the email before looking it up', async () => {
    H.state.docs.set('newsletter/s1', {
      email: 'ana@example.com',
      status: 'confirmed',
    });
    await upsertPendingSubscription(db, {
      ...input,
      email: ' Ana@Example.COM ',
    });
    expect(subs()).toHaveLength(1);
    expect(H.sendEmail).not.toHaveBeenCalled();
  });

  it('with duplicate docs, a confirmed one wins and nothing is resent', async () => {
    H.state.docs.set('newsletter/s1', {
      email: 'ana@example.com',
      status: 'pending',
      confirmTokenHash: 'old',
    });
    H.state.docs.set('newsletter/s2', { email: 'ana@example.com' });
    await upsertPendingSubscription(db, input);
    expect(subs()).toHaveLength(2);
    expect(H.sendEmail).not.toHaveBeenCalled();
    expect(H.state.docs.get('newsletter/s1')!.confirmTokenHash).toBe('old');
  });

  it('with duplicate docs, an unsubscribed one means a new confirmation is required', async () => {
    H.state.docs.set('newsletter/s1', { email: 'ana@example.com' });
    H.state.docs.set('newsletter/s2', {
      email: 'ana@example.com',
      status: 'unsubscribed',
    });
    await upsertPendingSubscription(db, input);
    expect(subs()).toHaveLength(2);
    expect(H.sendEmail).toHaveBeenCalledTimes(1);
    expect(subs().filter((d) => d.status === 'pending')).toHaveLength(1);
    const pending = subs().find((d) => d.status === 'pending')!;
    expect(
      hashToken(linkFrom(lastMail().html, '/api/newsletter/confirm'))
    ).toBe(pending.confirmTokenHash);
  });
});

describe('confirmSubscription', { concurrent: false }, () => {
  it('flips pending → confirmed and burns the token', async () => {
    await upsertPendingSubscription(db, {
      email: 'ana@example.com',
      name: 'Ana',
      interests: [],
      lang: 'en',
      ipHash: 'x',
    });
    const token = linkFrom(lastMail().html, '/api/newsletter/confirm');

    const result = await confirmSubscription(db, token);
    expect(result).toEqual({ ok: true, lang: 'en', already: false });
    const [doc] = subs();
    expect(doc!.status).toBe('confirmed');
    expect(doc!.confirmedAt).toBe(H.SERVER_TIMESTAMP);
    // The hash stays so a second click can say "already confirmed"; it
    // can only ever act on a pending doc.
    expect(doc!.confirmTokenHash).toBe(hashToken(token));

    expect(await confirmSubscription(db, token)).toEqual({
      ok: true,
      lang: 'en',
      already: true,
    });
    expect(subs()).toHaveLength(1);
  });

  it('a confirm link cannot act once the address unsubscribed', async () => {
    await upsertPendingSubscription(db, {
      email: 'ana@example.com',
      name: 'Ana',
      interests: [],
      lang: 'es',
      ipHash: 'x',
    });
    const token = linkFrom(lastMail().html, '/api/newsletter/confirm');
    await confirmSubscription(db, token);
    await unsubscribeByToken(db, subs()[0]!.unsubscribeToken);

    expect(await confirmSubscription(db, token)).toEqual({ ok: false });
    expect(subs()[0]!.status).toBe('unsubscribed');
  });

  it('confirms every doc of that email so a legacy duplicate cannot keep it blocked', async () => {
    H.state.docs.set('newsletter/s1', { email: 'ana@example.com' });
    H.state.docs.set('newsletter/s2', {
      email: 'ana@example.com',
      status: 'unsubscribed',
    });
    await upsertPendingSubscription(db, {
      email: 'ana@example.com',
      name: 'Ana',
      interests: [],
      lang: 'es',
      ipHash: 'x',
    });
    const token = linkFrom(lastMail().html, '/api/newsletter/confirm');

    expect(await confirmSubscription(db, token)).toEqual({
      ok: true,
      lang: 'es',
      already: false,
    });
    expect(subs().map((d) => d.status)).toEqual(['confirmed', 'confirmed']);
  });

  it('rejects unknown or malformed tokens', async () => {
    expect(await confirmSubscription(db, 'nope')).toEqual({ ok: false });
    expect(await confirmSubscription(db, '')).toEqual({ ok: false });
  });
});

describe('unsubscribeByToken', { concurrent: false }, () => {
  it('marks the subscription unsubscribed with its unsubscribe token', async () => {
    const token = newToken();
    H.state.docs.set('newsletter/s1', {
      email: 'ana@example.com',
      status: 'confirmed',
      lang: 'es',
      unsubscribeToken: token,
    });
    expect(await unsubscribeByToken(db, token)).toEqual({
      ok: true,
      lang: 'es',
      already: false,
    });
    expect(subs()[0]).toMatchObject({
      status: 'unsubscribed',
      unsubscribedAt: H.SERVER_TIMESTAMP,
    });
    // The link keeps working (idempotent) so a second click is not an error.
    expect(await unsubscribeByToken(db, token)).toEqual({
      ok: true,
      lang: 'es',
      already: true,
    });
  });

  it('marks every doc of that email unsubscribed, including legacy duplicates', async () => {
    const token = newToken();
    H.state.docs.set('newsletter/s1', {
      email: 'ana@example.com',
      status: 'confirmed',
      unsubscribeToken: token,
    });
    H.state.docs.set('newsletter/s2', { email: 'ana@example.com' });
    H.state.docs.set('newsletter/s3', {
      email: 'ana@example.com',
      status: 'pending',
      confirmTokenHash: 'h',
    });
    H.state.docs.set('newsletter/other', { email: 'luis@example.com' });

    expect(await unsubscribeByToken(db, token)).toEqual({
      ok: true,
      lang: 'es',
      already: false,
    });

    for (const id of ['s1', 's2', 's3']) {
      expect(H.state.docs.get(`newsletter/${id}`)).toMatchObject({
        status: 'unsubscribed',
        unsubscribedAt: H.SERVER_TIMESTAMP,
      });
    }
    expect(H.state.docs.get('newsletter/s3')!.confirmTokenHash).toBeUndefined();
    expect(H.state.docs.get('newsletter/other')!.status).toBeUndefined();
  });

  it('rejects an unknown token', async () => {
    expect(await unsubscribeByToken(db, newToken())).toEqual({ ok: false });
  });
});

// The links in the emails: mail-security scanners prefetch every URL with
// a GET, so GET only renders a page with a button and the change happens
// on the POST that button sends (also what RFC 8058 one-click uses).
type Handler = (req: unknown, res: unknown) => Promise<void>;
const confirmHttp = confirmNewsletter as unknown as Handler;
const unsubscribeHttp = unsubscribeNewsletter as unknown as Handler;

async function http(
  handler: Handler,
  method: 'GET' | 'POST',
  token: string,
  body: Record<string, unknown> = {}
): Promise<{ status: number; html: string }> {
  const out = { status: 0, html: '' };
  const res = {
    status(code: number) {
      out.status = code;
      return res;
    },
    type() {
      return res;
    },
    send(html: string) {
      out.html = html;
    },
  };
  await handler({ method, query: { token }, body }, res);
  return out;
}

describe('confirmNewsletter (HTTP)', { concurrent: false }, () => {
  async function pendingToken(): Promise<string> {
    await upsertPendingSubscription(db, {
      email: 'ana@example.com',
      name: 'Ana',
      interests: [],
      lang: 'es',
      ipHash: 'x',
    });
    return linkFrom(lastMail().html, '/api/newsletter/confirm');
  }

  it('GET only shows the button; POST confirms; a repeat says already confirmed', async () => {
    const token = await pendingToken();

    const page = await http(confirmHttp, 'GET', token);
    expect(page.status).toBe(200);
    expect(page.html).toContain('method="post"');
    expect(page.html).toContain('Confirmar suscripción');
    expect(subs()[0]!.status).toBe('pending');

    const done = await http(confirmHttp, 'POST', token);
    expect(done.status).toBe(200);
    expect(done.html).toContain('Suscripción confirmada');
    expect(subs()[0]!.status).toBe('confirmed');

    for (const method of ['GET', 'POST'] as const) {
      const again = await http(confirmHttp, method, token);
      expect(again.status).toBe(200);
      expect(again.html).toContain('ya estaba confirmada');
      expect(again.html).not.toContain('method="post"');
    }
  });

  it('renders in the subscriber language and rejects unknown tokens', async () => {
    await upsertPendingSubscription(db, {
      email: 'ana@example.com',
      name: 'Ana',
      interests: [],
      lang: 'en',
      ipHash: 'x',
    });
    const token = linkFrom(lastMail().html, '/api/newsletter/confirm');
    expect((await http(confirmHttp, 'GET', token)).html).toContain(
      'Confirm subscription'
    );

    const bad = await http(confirmHttp, 'GET', newToken());
    expect(bad.status).toBe(400);
    expect(bad.html).toContain('Enlace no válido');
    expect((await http(confirmHttp, 'POST', 'zzz')).status).toBe(400);
  });
});

describe('unsubscribeNewsletter (HTTP)', { concurrent: false }, () => {
  it('GET only shows the button; POST (form or one-click) unsubscribes', async () => {
    const token = newToken();
    H.state.docs.set('newsletter/s1', {
      email: 'ana@example.com',
      status: 'confirmed',
      lang: 'en',
      unsubscribeToken: token,
    });

    const page = await http(unsubscribeHttp, 'GET', token);
    expect(page.status).toBe(200);
    expect(page.html).toContain('method="post"');
    expect(page.html).toContain('Unsubscribe');
    expect(subs()[0]!.status).toBe('confirmed');

    const done = await http(unsubscribeHttp, 'POST', token, {
      'List-Unsubscribe': 'One-Click',
    });
    expect(done.status).toBe(200);
    expect(done.html).toContain('Unsubscribed');
    expect(subs()[0]!.status).toBe('unsubscribed');

    const again = await http(unsubscribeHttp, 'GET', token);
    expect(again.status).toBe(200);
    expect(again.html).toContain('Unsubscribed');
    expect(again.html).not.toContain('method="post"');
  });

  it('rejects unknown tokens on GET and POST', async () => {
    expect((await http(unsubscribeHttp, 'GET', newToken())).status).toBe(400);
    expect((await http(unsubscribeHttp, 'POST', newToken())).status).toBe(400);
  });
});
