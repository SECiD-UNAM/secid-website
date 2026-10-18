import { onRequest, Request } from 'firebase-functions/v2/https';
import type { Response } from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { isAllowedOrigin } from './env';
import { verifyCaptcha } from './captcha';

const db = admin.firestore();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// IP-based rate limit. Per-IP bucket; 5 submissions / 10 min / endpoint.
const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 5;

// CORS: same allowlist as the callables (env.ts). onRequest exposes the
// raw Express-like req/res so we set headers manually.
function setCors(req: Request, res: Response): void {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '3600');
}

function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd;
  if (fwdStr) return fwdStr.split(',')[0].trim();
  return (req.ip as string) || 'unknown';
}

function hashKey(parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Per-IP+endpoint rate limit. Single-doc bucket; no composite index.
 * Atomic read-check-write via transaction (same pattern as
 * public-job-submit.ts) so concurrent requests can't all pass the check.
 * Returns true if the caller should be admitted, false if blocked.
 */
async function checkRateLimit(ip: string, endpoint: string): Promise<boolean> {
  const key = hashKey([endpoint, ip]);
  const ref = db.collection('public_form_ratelimit').doc(key);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const nowMs = Date.now();
    const rl = snap.exists ? snap.data() : null;
    if (!rl || nowMs - (rl.windowStart || 0) >= RL_WINDOW_MS) {
      tx.set(ref, { windowStart: nowMs, count: 1, endpoint });
      return true;
    }
    if ((rl.count || 0) >= RL_MAX) {
      return false;
    }
    tx.update(ref, { count: (rl.count || 0) + 1 });
    return true;
  });
}

interface NewsletterBody {
  email?: unknown;
  name?: unknown;
  interests?: unknown;
  lang?: unknown;
  captchaToken?: unknown;
}

/**
 * Newsletter subscription endpoint.
 *
 * Closes S4: firestore.rules previously allowed unauthenticated direct
 * writes to /newsletter with only schema checks — no rate limit, no
 * CAPTCHA, no operator visibility into abuse. Moving to a server-side
 * endpoint gives us per-IP throttling, optional CAPTCHA, and a single
 * place to add future abuse heuristics.
 */
export const subscribeNewsletter = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    setCors(req, res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = (req.body || {}) as NewsletterBody;
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const name = String(body.name || '').trim();
    const lang = body.lang === 'en' ? 'en' : 'es';

    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'invalid_email' });
      return;
    }
    if (!name || name.length < 2 || name.length > 120) {
      res.status(400).json({ error: 'invalid_name' });
      return;
    }
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((v) => typeof v === 'string').slice(0, 20)
      : [];

    const ip = clientIp(req);
    if (!(await checkRateLimit(ip, 'newsletter'))) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }

    if (
      !(await verifyCaptcha(
        body.captchaToken as string | undefined,
        'newsletter_subscribe'
      ))
    ) {
      res.status(400).json({ error: 'captcha_failed' });
      return;
    }

    await db.collection('newsletter').add({
      email,
      name,
      interests,
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'website',
      lang,
      ipHash: hashKey(['newsletter', ip]),
    });

    res.status(200).json({ ok: true });
  }
);

interface ContactBody {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  lang?: unknown;
  captchaToken?: unknown;
}

/**
 * Contact form endpoint. Same closure as subscribeNewsletter (S4).
 */
export const sendContactMessage = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    setCors(req, res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = (req.body || {}) as ContactBody;
    const name = String(body.name || '').trim();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    const lang = body.lang === 'en' ? 'en' : 'es';

    if (!name || name.length < 2 || name.length > 120) {
      res.status(400).json({ error: 'invalid_name' });
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'invalid_email' });
      return;
    }
    if (!subject || subject.length < 2 || subject.length > 200) {
      res.status(400).json({ error: 'invalid_subject' });
      return;
    }
    if (!message || message.length < 10 || message.length > 4000) {
      res.status(400).json({ error: 'invalid_message' });
      return;
    }

    const ip = clientIp(req);
    if (!(await checkRateLimit(ip, 'contact'))) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }

    if (
      !(await verifyCaptcha(
        body.captchaToken as string | undefined,
        'contact_send'
      ))
    ) {
      res.status(400).json({ error: 'captcha_failed' });
      return;
    }

    await db.collection('contactMessages').add({
      name,
      email,
      subject,
      message,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'website',
      lang,
      status: 'new',
      ipHash: hashKey(['contact', ip]),
    });

    res.status(200).json({ ok: true });
  }
);
