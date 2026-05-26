import { onRequest, Request } from "firebase-functions/v2/https";
import type { Response } from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const db = admin.firestore();

// CORS: same allowlist contract as the callables. onRequest exposes the
// raw Express-like req/res so we set headers manually.
const ALLOWED_ORIGINS = [
  "https://secid.mx",
  "https://www.secid.mx",
  "https://beta.secid.mx",
  "https://secid.org",
  "https://www.secid.org",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// IP-based rate limit. Per-IP bucket; 5 submissions / 10 min / endpoint.
const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 5;

function setCors(req: Request, res: Response): void {
  const origin = req.headers.origin;
  if (typeof origin === "string" && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "3600");
}

function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd;
  if (fwdStr) return fwdStr.split(",")[0].trim();
  return (req.ip as string) || "unknown";
}

function hashKey(parts: string[]): string {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

/**
 * Per-IP+endpoint rate limit. Single-doc bucket; no composite index.
 * Returns true if the caller should be admitted, false if blocked.
 */
async function checkRateLimit(ip: string, endpoint: string): Promise<boolean> {
  const key = hashKey([endpoint, ip]);
  const ref = db.collection("public_form_ratelimit").doc(key);
  const snap = await ref.get();
  const nowMs = Date.now();
  const rl = snap.exists ? snap.data() : null;
  if (
    rl &&
    nowMs - (rl.windowStart || 0) < RL_WINDOW_MS &&
    (rl.count || 0) >= RL_MAX
  ) {
    return false;
  }
  if (!rl || nowMs - (rl.windowStart || 0) >= RL_WINDOW_MS) {
    await ref.set({ windowStart: nowMs, count: 1, endpoint });
  } else {
    await ref.set({ count: (rl.count || 0) + 1 }, { merge: true });
  }
  return true;
}

/**
 * Optional CAPTCHA verification. If RECAPTCHA_SECRET_KEY isn't set, we
 * accept the request but log a warning — rate limiting is the only
 * defense until CAPTCHA is wired up. The client can pass any value (or
 * none) in `captchaToken` for now.
 */
let captchaWarned = false;
async function verifyCaptcha(token?: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    if (!captchaWarned) {
      captchaWarned = true;
      console.warn(
        "[public-forms] RECAPTCHA_SECRET_KEY not set — CAPTCHA verification is skipped. Set it to enable."
      );
    }
    return true;
  }
  if (!token) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });
    const data = (await res.json()) as { success?: boolean; score?: number };
    // For v3, accept score >= 0.5. For v2, just check success.
    if (data.success === false) return false;
    if (typeof data.score === "number" && data.score < 0.5) return false;
    return true;
  } catch (err) {
    console.error("[public-forms] CAPTCHA verify error:", err);
    return false;
  }
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
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = (req.body || {}) as NewsletterBody;
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const name = String(body.name || "").trim();
    const lang = body.lang === "en" ? "en" : "es";

    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: "invalid_email" });
      return;
    }
    if (!name || name.length < 2 || name.length > 120) {
      res.status(400).json({ error: "invalid_name" });
      return;
    }
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((v) => typeof v === "string").slice(0, 20)
      : [];

    const ip = clientIp(req);
    if (!(await checkRateLimit(ip, "newsletter"))) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    if (!(await verifyCaptcha(body.captchaToken as string | undefined))) {
      res.status(400).json({ error: "captcha_failed" });
      return;
    }

    await db.collection("newsletter").add({
      email,
      name,
      interests,
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "website",
      lang,
      ipHash: hashKey(["newsletter", ip]),
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
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = (req.body || {}) as ContactBody;
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const lang = body.lang === "en" ? "en" : "es";

    if (!name || name.length < 2 || name.length > 120) {
      res.status(400).json({ error: "invalid_name" });
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: "invalid_email" });
      return;
    }
    if (!subject || subject.length < 2 || subject.length > 200) {
      res.status(400).json({ error: "invalid_subject" });
      return;
    }
    if (!message || message.length < 10 || message.length > 4000) {
      res.status(400).json({ error: "invalid_message" });
      return;
    }

    const ip = clientIp(req);
    if (!(await checkRateLimit(ip, "contact"))) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    if (!(await verifyCaptcha(body.captchaToken as string | undefined))) {
      res.status(400).json({ error: "captcha_failed" });
      return;
    }

    await db.collection("contactMessages").add({
      name,
      email,
      subject,
      message,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "website",
      lang,
      status: "new",
      ipHash: hashKey(["contact", ip]),
    });

    res.status(200).json({ ok: true });
  }
);
