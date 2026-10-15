/**
 * functions/src/env.ts — the single CORS allowlist and the APP_URL
 * fallback shared by every Cloud Function. One backend serves beta and
 * production, so both must be right for both sites.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  ALLOWED_CALLABLE_ORIGINS,
  getAppUrl,
  isAllowedOrigin,
} from '../../../functions/src/env';

describe('isAllowedOrigin', () => {
  it.each([
    'https://secid.mx',
    'https://www.secid.mx',
    'https://beta.secid.mx',
    'https://secid-mx.web.app',
    'http://localhost:4321',
    'http://127.0.0.1:3000',
  ])('allows %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(true);
  });

  it.each([
    'https://attacker.secid.mx',
    'https://evil.com/?leak=secid.mx',
    'http://secid.mx',
    'https://secid.mx.evil.com',
    'https://other-site.web.app',
    '',
    undefined,
  ])('rejects %s', (origin) => {
    expect(isAllowedOrigin(origin as string | undefined)).toBe(false);
  });

  it('is the same allowlist the callables use', () => {
    for (const allowed of ALLOWED_CALLABLE_ORIGINS) {
      if (typeof allowed === 'string') {
        expect(isAllowedOrigin(allowed)).toBe(true);
      }
    }
  });
});

describe('getAppUrl', () => {
  const original = process.env.APP_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original;
  });

  it('prefers APP_URL from the deploy env', () => {
    process.env.APP_URL = 'https://beta.secid.mx';
    expect(getAppUrl()).toBe('https://beta.secid.mx');
  });

  it('falls back to production, never to beta or a stale domain', () => {
    delete process.env.APP_URL;
    expect(getAppUrl()).toBe('https://secid.mx');
  });
});
