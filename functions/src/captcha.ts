/**
 * reCAPTCHA verification for the public forms (contact, newsletter).
 *
 * Two backends, picked by env at deploy time (functions/.env is written by
 * the deploy workflows):
 *
 *   - RECAPTCHA_SITE_KEY set → reCAPTCHA **Enterprise** assessment API,
 *     authenticated with the function's own service account (needs
 *     roles/recaptchaenterprise.agent). No secret involved. This is the
 *     path Google supports for Enterprise keys; the legacy `siteverify`
 *     endpoint rejected valid Enterprise tokens with
 *     `incorrect-captcha-sol` on 2026-10-18 even with the key's legacy
 *     secret.
 *   - only RECAPTCHA_SECRET_KEY set → legacy siteverify (classic keys).
 *   - neither → verification skipped with a warning (rate limit only).
 *
 * The decision logic is in pure functions so it can be unit-tested
 * without network or credentials.
 */
import { GoogleAuth } from 'google-auth-library';

export const CAPTCHA_MIN_SCORE = 0.5;

export interface AssessmentResponse {
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
    hostname?: string;
    action?: string;
  };
  riskAnalysis?: {
    score?: number;
    reasons?: string[];
  };
}

export interface SiteverifyResponse {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export interface CaptchaVerdict {
  ok: boolean;
  /** Short machine-readable reason when `ok` is false; safe to log. */
  reason?: string;
  score?: number;
}

/** Decide on an Enterprise `assessments.create` response. */
export function evaluateAssessment(
  res: AssessmentResponse,
  expectedAction: string,
  minScore = CAPTCHA_MIN_SCORE
): CaptchaVerdict {
  const props = res.tokenProperties ?? {};
  const score = res.riskAnalysis?.score;
  if (props.valid !== true) {
    return {
      ok: false,
      reason: `invalid:${props.invalidReason ?? 'unknown'}`,
      score,
    };
  }
  if (props.action && props.action !== expectedAction) {
    return { ok: false, reason: `action:${props.action}`, score };
  }
  if (typeof score === 'number' && score < minScore) {
    return { ok: false, reason: 'low_score', score };
  }
  return { ok: true, score };
}

/** Decide on a legacy `siteverify` response (v2 or v3 classic keys). */
export function evaluateSiteverify(
  data: SiteverifyResponse,
  minScore = CAPTCHA_MIN_SCORE
): CaptchaVerdict {
  if (data.success === false) {
    return {
      ok: false,
      reason: `siteverify:${(data['error-codes'] ?? []).join(',') || 'unknown'}`,
      score: data.score,
    };
  }
  if (typeof data.score === 'number' && data.score < minScore) {
    return { ok: false, reason: 'low_score', score: data.score };
  }
  return { ok: true, score: data.score };
}

let auth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!auth) {
    auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  return auth;
}

function projectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    ''
  );
}

async function assessEnterprise(
  token: string,
  siteKey: string,
  expectedAction: string
): Promise<CaptchaVerdict> {
  const client = await getAuth().getClient();
  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId()}/assessments`;
  const res = await client.request<AssessmentResponse>({
    url,
    method: 'POST',
    data: { event: { token, siteKey, expectedAction } },
  });
  return evaluateAssessment(res.data, expectedAction);
}

async function verifyLegacy(
  token: string,
  secret: string
): Promise<CaptchaVerdict> {
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });
  return evaluateSiteverify((await res.json()) as SiteverifyResponse);
}

let skipWarned = false;

/**
 * Verify a reCAPTCHA token for the given action. Logs the verdict (never
 * the token or any secret) when it fails so prod is diagnosable.
 */
export async function verifyCaptcha(
  token: string | undefined,
  expectedAction: string
): Promise<boolean> {
  const siteKey = process.env.RECAPTCHA_SITE_KEY;
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!siteKey && !secret) {
    if (!skipWarned) {
      skipWarned = true;
      console.warn(
        '[captcha] neither RECAPTCHA_SITE_KEY nor RECAPTCHA_SECRET_KEY set — CAPTCHA verification is skipped.'
      );
    }
    return true;
  }
  if (!token) {
    console.warn('[captcha] rejected', {
      action: expectedAction,
      reason: 'no_token',
    });
    return false;
  }
  try {
    const verdict = siteKey
      ? await assessEnterprise(token, siteKey, expectedAction)
      : await verifyLegacy(token, secret as string);
    if (!verdict.ok) {
      console.warn('[captcha] rejected', {
        action: expectedAction,
        backend: siteKey ? 'enterprise' : 'siteverify',
        reason: verdict.reason,
        score: verdict.score,
      });
    }
    return verdict.ok;
  } catch (err) {
    console.error('[captcha] verify error:', err);
    return false;
  }
}
