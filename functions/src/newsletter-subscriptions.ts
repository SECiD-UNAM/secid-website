/**
 * F21 — newsletter double opt-in.
 *
 * `newsletter/{id}` subscription docs (one per email) carry:
 *   status               'pending' | 'confirmed' | 'unsubscribed'
 *                        (absent = legacy doc written before F21, treated
 *                        as confirmed — those addresses opted in through
 *                        the public form and were never mailed anyway)
 *   confirmTokenHash     sha256 of the one-time confirmation token
 *                        (deleted once used; the raw token only lives in
 *                        the confirmation email)
 *   unsubscribeToken     per-subscriber random token, stored raw: it is
 *                        embedded in every issue sent, so it must be
 *                        reproducible, and it can only ever stop mail.
 *                        The doc itself is readable by newsletter editors
 *                        only (firestore.rules). Minted at subscribe time,
 *                        or by sendNewsletterIssue for legacy docs.
 *
 * The public endpoints that consume the tokens are confirmNewsletter /
 * unsubscribeNewsletter (hosting rewrites /api/newsletter/confirm and
 * /api/newsletter/unsubscribe).
 *
 * The functions take the Firestore handle so unit tests can pass a stub.
 */
import { onRequest } from 'firebase-functions/v2/https';
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

export type TokenResult = { ok: true; lang: Lang } | { ok: false };

const TOKEN_RE = /^[a-f0-9]{64}$/;

export function newToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
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

async function findByField(
  db: Firestore,
  field: string,
  value: string
): Promise<{ ref: DocumentReference; data: DocumentData } | null> {
  const snap = await db
    .collection('newsletter')
    .where(field, '==', value)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  return doc ? { ref: doc.ref, data: doc.data() } : null;
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
 * spam an existing subscriber. Pending or unsubscribed → fresh token and
 * a new confirmation mail.
 */
export async function upsertPendingSubscription(
  db: Firestore,
  input: SubscribeInput
): Promise<void> {
  const existing = await findByField(db, 'email', input.email);
  if (existing && isMailableSubscription(existing.data)) return;

  const token = newToken();
  const pending = {
    status: 'pending' as SubscriptionStatus,
    confirmTokenHash: hashToken(token),
    confirmSentAt: FieldValue.serverTimestamp(),
    lang: input.lang,
  };
  if (existing) {
    await existing.ref.update(pending);
  } else {
    await db.collection('newsletter').add({
      email: input.email,
      name: input.name,
      interests: input.interests,
      subscribedAt: FieldValue.serverTimestamp(),
      source: 'website',
      ipHash: input.ipHash,
      unsubscribeToken: newToken(),
      ...pending,
    });
  }
  await sendConfirmation(input.email, input.name, input.lang, token);
}

/** One-time confirmation link: pending → confirmed, token burned. */
export async function confirmSubscription(
  db: Firestore,
  token: string
): Promise<TokenResult> {
  if (!TOKEN_RE.test(token)) return { ok: false };
  const found = await findByField(db, 'confirmTokenHash', hashToken(token));
  if (!found || found.data.status !== 'pending') return { ok: false };
  await found.ref.update({
    status: 'confirmed',
    confirmedAt: FieldValue.serverTimestamp(),
    confirmTokenHash: FieldValue.delete(),
  });
  return { ok: true, lang: found.data.lang === 'en' ? 'en' : 'es' };
}

/** Per-subscriber unsubscribe link; idempotent. */
export async function unsubscribeByToken(
  db: Firestore,
  token: string
): Promise<TokenResult> {
  if (!TOKEN_RE.test(token)) return { ok: false };
  const found = await findByField(db, 'unsubscribeToken', token);
  if (!found) return { ok: false };
  if (found.data.status !== 'unsubscribed') {
    await found.ref.update({
      status: 'unsubscribed',
      unsubscribedAt: FieldValue.serverTimestamp(),
    });
  }
  return { ok: true, lang: found.data.lang === 'en' ? 'en' : 'es' };
}

// ---------------------------------------------------------------------------
// Public HTTP endpoints (links in the emails)
// ---------------------------------------------------------------------------

const COPY = {
  confirmed: {
    es: [
      'Suscripción confirmada',
      'Gracias. Recibirás el newsletter de SECiD en este correo.',
    ],
    en: [
      'Subscription confirmed',
      'Thank you. You will receive the SECiD newsletter at this address.',
    ],
  },
  unsubscribed: {
    es: [
      'Suscripción cancelada',
      'Ya no recibirás el newsletter de SECiD. Puedes volver a suscribirte cuando quieras.',
    ],
    en: [
      'Unsubscribed',
      'You will no longer receive the SECiD newsletter. You can subscribe again any time.',
    ],
  },
  invalid: {
    es: [
      'Enlace no válido',
      'Este enlace ya se usó o no es válido. Vuelve a suscribirte desde el sitio para recibir uno nuevo.',
    ],
    en: [
      'Invalid link',
      'This link was already used or is not valid. Subscribe again from the site to get a new one.',
    ],
  },
} as const;

/** Small static page, same visual language as the email shell. */
export function statusPage(kind: keyof typeof COPY, lang: Lang): string {
  const [title, body] = COPY[kind][lang];
  const home = `${getAppUrl()}/${lang}/`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — SECiD</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#f5f5f5; margin:0; padding:40px 20px;">
  <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#003B5C,#C4A24C); padding:30px; text-align:center; color:#fff;"><h1 style="margin:0; font-size:24px;">SECiD</h1></div>
    <div style="padding:30px;">
      <h2 style="margin:0 0 16px; font-size:20px; color:#003B5C;">${title}</h2>
      <p>${body}</p>
      <p style="margin-top:24px;"><a href="${home}" style="color:#003B5C;">secid.mx</a></p>
    </div>
  </div>
</body>
</html>`;
}

function langFromQuery(value: unknown): Lang {
  return value === 'en' ? 'en' : 'es';
}

export const confirmNewsletter = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    const token = String(req.query.token || '');
    const result = await confirmSubscription(getFirestore(), token);
    const lang = result.ok ? result.lang : langFromQuery(req.query.lang);
    res
      .status(result.ok ? 200 : 400)
      .type('html')
      .send(statusPage(result.ok ? 'confirmed' : 'invalid', lang));
  }
);

export const unsubscribeNewsletter = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    const token = String(req.query.token || '');
    const result = await unsubscribeByToken(getFirestore(), token);
    const lang = result.ok ? result.lang : langFromQuery(req.query.lang);
    res
      .status(result.ok ? 200 : 400)
      .type('html')
      .send(statusPage(result.ok ? 'unsubscribed' : 'invalid', lang));
  }
);
