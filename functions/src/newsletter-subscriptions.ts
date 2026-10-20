/**
 * F21 — newsletter double opt-in.
 *
 * `newsletter/{id}` subscription docs carry:
 *   status               'pending' | 'confirmed' | 'unsubscribed'
 *                        (absent = legacy doc written before F21, treated
 *                        as confirmed — those addresses opted in through
 *                        the public form and were never mailed anyway)
 *   confirmTokenHash     sha256 of the confirmation token (the raw token
 *                        only lives in the confirmation email). It can
 *                        only ever act on a `pending` doc; it stays on the
 *                        confirmed doc so a second click can say "already
 *                        confirmed", is rotated on every re-subscribe and
 *                        removed on unsubscribe.
 *   unsubscribeToken     per-subscriber random token, stored raw: it is
 *                        embedded in every issue sent, so it must be
 *                        reproducible, and it can only ever stop mail.
 *                        The doc itself is readable by newsletter editors
 *                        only (firestore.rules). Minted at subscribe time,
 *                        or by sendNewsletterIssue for legacy docs.
 *
 * One email may own several docs: before F21 the public form did a plain
 * `add()` per submission. Every status change therefore applies to ALL
 * docs of the email (compared after trim + lowercase), and an email with
 * any `unsubscribed` doc is never mailed (newsletter-send.ts).
 *
 * The public endpoints that consume the tokens are confirmNewsletter /
 * unsubscribeNewsletter (hosting rewrites /api/newsletter/confirm and
 * /api/newsletter/unsubscribe). Mail-security scanners prefetch every
 * link with a GET, so GET only renders a page with a button and the
 * change happens on POST (which is also what RFC 8058 one-click sends).
 *
 * The functions take the Firestore handle so unit tests can pass a stub.
 */
import { onRequest } from 'firebase-functions/v2/https';
import type { Request } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type {
  DocumentData,
  DocumentReference,
  Firestore,
} from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import './init';
import { sendEmail } from './email-service';
import { generateNewsletterConfirmEmail } from './email-templates';
import { getAppUrl } from './env';

type Lang = 'es' | 'en';

export type SubscriptionStatus = 'pending' | 'confirmed' | 'unsubscribed';

export interface SubscribeInput {
  email: string;
  name: string;
  interests: string[];
  lang: Lang;
  ipHash: string;
}

/** `already`: the link's change had been made before (nothing to do). */
export type TokenResult =
  | { ok: true; lang: Lang; already: boolean }
  | { ok: false };

interface SubscriptionDoc {
  ref: DocumentReference;
  data: DocumentData;
}

const TOKEN_RE = /^[a-f0-9]{64}$/;

export function newToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** The one form every email takes before it is compared or stored. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function confirmUrl(token: string): string {
  return `${getAppUrl()}/api/newsletter/confirm?token=${token}`;
}

export function unsubscribeUrl(token: string): string {
  return `${getAppUrl()}/api/newsletter/unsubscribe?token=${token}`;
}

/** Confirmed or legacy (no status) docs with an email are mailable. */
export function isMailableSubscription(data: DocumentData): boolean {
  if (typeof data.email !== 'string' || !data.email.trim()) return false;
  return data.status === undefined || data.status === 'confirmed';
}

function langOf(data: DocumentData): Lang {
  return data.lang === 'en' ? 'en' : 'es';
}

async function queryByField(
  db: Firestore,
  field: string,
  value: string
): Promise<SubscriptionDoc[]> {
  const snap = await db
    .collection('newsletter')
    .where(field, '==', value)
    .get();
  return snap.docs.map((doc) => ({ ref: doc.ref, data: doc.data() }));
}

async function findByToken(
  db: Firestore,
  field: string,
  value: string
): Promise<SubscriptionDoc | null> {
  const snap = await db
    .collection('newsletter')
    .where(field, '==', value)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  return doc ? { ref: doc.ref, data: doc.data() } : null;
}

/**
 * Every doc of an email, legacy duplicates included. Firestore cannot
 * match case-insensitively, so the lookup runs on the normalized form and
 * on the exact string a known doc stored (when they differ).
 */
async function listByEmail(
  db: Firestore,
  ...emails: string[]
): Promise<SubscriptionDoc[]> {
  const byPath = new Map<string, SubscriptionDoc>();
  for (const email of new Set(emails.filter(Boolean))) {
    for (const doc of await queryByField(db, 'email', email)) {
      byPath.set(doc.ref.path, doc);
    }
  }
  return [...byPath.values()];
}

/** The docs a token doc's email owns (itself at least). */
async function siblingsOf(
  db: Firestore,
  found: SubscriptionDoc
): Promise<SubscriptionDoc[]> {
  const stored = typeof found.data.email === 'string' ? found.data.email : '';
  const docs = await listByEmail(db, stored, normalizeEmail(stored));
  return docs.length ? docs : [found];
}

async function updateAll(
  docs: SubscriptionDoc[],
  payload: DocumentData
): Promise<void> {
  await Promise.all(docs.map((doc) => doc.ref.update(payload)));
}

/** Confirmed (or legacy) first, then pending, then unsubscribed. */
function pickSubscriptionDoc(docs: SubscriptionDoc[]): SubscriptionDoc | null {
  const rank = (doc: SubscriptionDoc): number => {
    if (isMailableSubscription(doc.data)) return 0;
    return doc.data.status === 'pending' ? 1 : 2;
  };
  return [...docs].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

async function sendConfirmation(
  email: string,
  name: string,
  lang: Lang,
  token: string
): Promise<void> {
  const { subject, html } = generateNewsletterConfirmEmail({
    recipientName: name,
    confirmUrl: confirmUrl(token),
    lang,
  });
  await sendEmail({ to: email, subject, html });
}

/**
 * Public-form subscribe. New address → pending doc + confirmation mail.
 * Already confirmed (or legacy) → no-op, so the form cannot be used to
 * spam an existing subscriber. Pending, or unsubscribed on any of the
 * email's docs → fresh token and a new confirmation mail.
 */
export async function upsertPendingSubscription(
  db: Firestore,
  input: SubscribeInput
): Promise<void> {
  const email = normalizeEmail(input.email);
  const docs = await listByEmail(db, email);
  const blocked = docs.some((doc) => doc.data.status === 'unsubscribed');
  const target = pickSubscriptionDoc(docs);
  if (target && !blocked && isMailableSubscription(target.data)) return;

  const token = newToken();
  const pending = {
    status: 'pending' as SubscriptionStatus,
    confirmTokenHash: hashToken(token),
    confirmSentAt: FieldValue.serverTimestamp(),
    lang: input.lang,
  };
  if (target) {
    await target.ref.update(pending);
  } else {
    await db.collection('newsletter').add({
      email,
      name: input.name,
      interests: input.interests,
      subscribedAt: FieldValue.serverTimestamp(),
      source: 'website',
      ipHash: input.ipHash,
      unsubscribeToken: newToken(),
      ...pending,
    });
  }
  await sendConfirmation(email, input.name, input.lang, token);
}

async function findConfirmDoc(
  db: Firestore,
  token: string
): Promise<SubscriptionDoc | null> {
  if (!TOKEN_RE.test(token)) return null;
  return findByToken(db, 'confirmTokenHash', hashToken(token));
}

function confirmState(found: SubscriptionDoc | null): TokenResult {
  if (!found) return { ok: false };
  const { status } = found.data;
  if (status !== 'pending' && status !== 'confirmed') return { ok: false };
  return {
    ok: true,
    lang: langOf(found.data),
    already: status === 'confirmed',
  };
}

/** What a confirmation link would do, without doing it (GET). */
export async function inspectConfirmToken(
  db: Firestore,
  token: string
): Promise<TokenResult> {
  return confirmState(await findConfirmDoc(db, token));
}

/**
 * Confirmation link: pending → confirmed. Every doc of the email is
 * confirmed, so a legacy duplicate that was unsubscribed earlier does not
 * keep the re-subscribed address blocked.
 */
export async function confirmSubscription(
  db: Firestore,
  token: string
): Promise<TokenResult> {
  const found = await findConfirmDoc(db, token);
  const state = confirmState(found);
  if (!found || !state.ok || state.already) return state;
  await updateAll(await siblingsOf(db, found), {
    status: 'confirmed',
    confirmedAt: FieldValue.serverTimestamp(),
  });
  return state;
}

async function findUnsubscribeDoc(
  db: Firestore,
  token: string
): Promise<SubscriptionDoc | null> {
  if (!TOKEN_RE.test(token)) return null;
  return findByToken(db, 'unsubscribeToken', token);
}

function unsubscribeState(found: SubscriptionDoc | null): TokenResult {
  if (!found) return { ok: false };
  return {
    ok: true,
    lang: langOf(found.data),
    already: found.data.status === 'unsubscribed',
  };
}

/** What an unsubscribe link would do, without doing it (GET). */
export async function inspectUnsubscribeToken(
  db: Firestore,
  token: string
): Promise<TokenResult> {
  return unsubscribeState(await findUnsubscribeDoc(db, token));
}

/** Per-subscriber unsubscribe link; idempotent; covers every doc of the email. */
export async function unsubscribeByToken(
  db: Firestore,
  token: string
): Promise<TokenResult> {
  const found = await findUnsubscribeDoc(db, token);
  if (!found) return { ok: false };
  const open = (await siblingsOf(db, found)).filter(
    (doc) => doc.data.status !== 'unsubscribed'
  );
  await updateAll(open, {
    status: 'unsubscribed',
    unsubscribedAt: FieldValue.serverTimestamp(),
    confirmTokenHash: FieldValue.delete(),
  });
  return unsubscribeState(found);
}

// ---------------------------------------------------------------------------
// Public HTTP endpoints (links in the emails)
// ---------------------------------------------------------------------------

interface PageCopy {
  title: string;
  body: string;
  /** Present on the prompt pages: the POST button that makes the change. */
  button?: string;
}

const COPY = {
  confirmPrompt: {
    es: {
      title: 'Confirma tu suscripción',
      body: 'Pulsa el botón para empezar a recibir el newsletter de SECiD en este correo.',
      button: 'Confirmar suscripción',
    },
    en: {
      title: 'Confirm your subscription',
      body: 'Press the button to start receiving the SECiD newsletter at this address.',
      button: 'Confirm subscription',
    },
  },
  confirmed: {
    es: {
      title: 'Suscripción confirmada',
      body: 'Gracias. Recibirás el newsletter de SECiD en este correo.',
    },
    en: {
      title: 'Subscription confirmed',
      body: 'Thank you. You will receive the SECiD newsletter at this address.',
    },
  },
  alreadyConfirmed: {
    es: {
      title: 'Tu suscripción ya estaba confirmada',
      body: 'No hay nada más que hacer: seguirás recibiendo el newsletter de SECiD en este correo.',
    },
    en: {
      title: 'Already confirmed',
      body: 'Nothing else to do: you will keep receiving the SECiD newsletter at this address.',
    },
  },
  unsubscribePrompt: {
    es: {
      title: 'Cancelar suscripción',
      body: 'Pulsa el botón para dejar de recibir el newsletter de SECiD.',
      button: 'Cancelar suscripción',
    },
    en: {
      title: 'Unsubscribe',
      body: 'Press the button to stop receiving the SECiD newsletter.',
      button: 'Unsubscribe',
    },
  },
  unsubscribed: {
    es: {
      title: 'Suscripción cancelada',
      body: 'Ya no recibirás el newsletter de SECiD. Puedes volver a suscribirte cuando quieras.',
    },
    en: {
      title: 'Unsubscribed',
      body: 'You will no longer receive the SECiD newsletter. You can subscribe again any time.',
    },
  },
  invalid: {
    es: {
      title: 'Enlace no válido',
      body: 'Este enlace no es válido o ha caducado. Vuelve a suscribirte desde el sitio para recibir uno nuevo.',
    },
    en: {
      title: 'Invalid link',
      body: 'This link is not valid or has expired. Subscribe again from the site to get a new one.',
    },
  },
} as const satisfies Record<string, Record<Lang, PageCopy>>;

type PageKind = keyof typeof COPY;

const BUTTON_STYLE =
  'display:inline-block; padding:12px 24px; background:#003B5C; color:#fff; border:0; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer;';

/** The form posts back to the same URL (token is validated hex). */
function actionForm(button: string, token: string): string {
  return `<form method="post" action="?token=${token}" style="margin-top:24px;"><button type="submit" style="${BUTTON_STYLE}">${button}</button></form>`;
}

/** Small static page, same visual language as the email shell. */
export function statusPage(kind: PageKind, lang: Lang, token = ''): string {
  const copy: PageCopy = COPY[kind][lang];
  const home = `${getAppUrl()}/${lang}/`;
  const form = copy.button ? actionForm(copy.button, token) : '';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${copy.title} — SECiD</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#f5f5f5; margin:0; padding:40px 20px;">
  <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#003B5C,#C4A24C); padding:30px; text-align:center; color:#fff;"><h1 style="margin:0; font-size:24px;">SECiD</h1></div>
    <div style="padding:30px;">
      <h2 style="margin:0 0 16px; font-size:20px; color:#003B5C;">${copy.title}</h2>
      <p>${copy.body}</p>${form}
      <p style="margin-top:24px;"><a href="${home}" style="color:#003B5C;">secid.mx</a></p>
    </div>
  </div>
</body>
</html>`;
}

function langFromQuery(value: unknown): Lang {
  return value === 'en' ? 'en' : 'es';
}

function tokenFrom(req: Request): string {
  const body = (req.body || {}) as { token?: unknown };
  return String(req.query.token || body.token || '');
}

interface LinkFlow {
  inspect: (db: Firestore, token: string) => Promise<TokenResult>;
  act: (db: Firestore, token: string) => Promise<TokenResult>;
  page: (result: TokenResult & { ok: true }, acted: boolean) => PageKind;
}

/** GET renders the prompt (or the final state), POST makes the change. */
function linkEndpoint(flow: LinkFlow) {
  return onRequest({ cors: false, maxInstances: 10 }, async (req, res) => {
    const token = tokenFrom(req);
    const acted = req.method === 'POST';
    const result = await (acted ? flow.act : flow.inspect)(
      getFirestore(),
      token
    );
    const lang = result.ok ? result.lang : langFromQuery(req.query.lang);
    const kind = result.ok ? flow.page(result, acted) : 'invalid';
    res
      .status(result.ok ? 200 : 400)
      .type('html')
      .send(statusPage(kind, lang, token));
  });
}

export const confirmNewsletter = linkEndpoint({
  inspect: inspectConfirmToken,
  act: confirmSubscription,
  page: (result, acted) => {
    if (result.already) return 'alreadyConfirmed';
    return acted ? 'confirmed' : 'confirmPrompt';
  },
});

export const unsubscribeNewsletter = linkEndpoint({
  inspect: inspectUnsubscribeToken,
  act: unsubscribeByToken,
  page: (result, acted) =>
    result.already || acted ? 'unsubscribed' : 'unsubscribePrompt',
});
