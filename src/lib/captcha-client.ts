/**
 * Browser-side reCAPTCHA v3 client.
 *
 * Lazy-loads google's recaptcha script on first call and returns a token
 * the server can verify. No-op (returns undefined) if
 * PUBLIC_RECAPTCHA_SITE_KEY isn't set — the server-side endpoint also
 * skips verification in that case (#48 until end-to-end enrolled).
 *
 * v3 is invisible: no widget, no user interaction. The score check
 * happens server-side in functions/src/public-forms.ts:verifyCaptcha.
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

let scriptLoaded: Promise<void> | null = null;

function loadScript(siteKey: string): Promise<void> {
  if (scriptLoaded) return scriptLoaded;
  scriptLoaded = new Promise((resolve, reject) => {
    if (window.grecaptcha) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load recaptcha script'));
    document.head.appendChild(s);
  });
  return scriptLoaded;
}

/**
 * Get a reCAPTCHA v3 token for the given action label.
 * Returns `undefined` if the site key isn't configured (deploy hasn't
 * been enrolled yet) so callers can fall through.
 */
export async function getCaptchaToken(
  action: string
): Promise<string | undefined> {
  const siteKey = import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY as
    | string
    | undefined;
  if (!siteKey) return undefined;
  try {
    await loadScript(siteKey);
    await new Promise<void>((resolve) => window.grecaptcha!.ready(resolve));
    return await window.grecaptcha!.execute(siteKey, { action });
  } catch {
    // Don't block the user on CAPTCHA failure — server-side rate limit
    // and origin allowlist remain in effect. Server treats missing
    // token as "skip" when secret is unset, "fail" when secret IS set.
    return undefined;
  }
}
