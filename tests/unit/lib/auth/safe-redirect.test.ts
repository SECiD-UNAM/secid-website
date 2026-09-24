import { describe, it, expect } from 'vitest';
import { toSafeInternalPath } from '@/lib/auth/safe-redirect';

const ORIGIN = 'https://secid.mx';
const FALLBACK = '/es/dashboard';
const safe = (candidate: string | null | undefined) =>
  toSafeInternalPath(candidate, FALLBACK, ORIGIN);

describe('toSafeInternalPath', () => {
  it('keeps same-origin paths, including query and hash', () => {
    expect(safe('/es/jobs')).toBe('/es/jobs');
    expect(safe('/es/jobs?page=2#top')).toBe('/es/jobs?page=2#top');
  });

  it('falls back for missing or non-path values', () => {
    expect(safe(null)).toBe(FALLBACK);
    expect(safe(undefined)).toBe(FALLBACK);
    expect(safe('')).toBe(FALLBACK);
    expect(safe('es/dashboard')).toBe(FALLBACK);
  });

  it('rejects absolute and script URLs', () => {
    expect(safe('https://evil.com')).toBe(FALLBACK);
    expect(safe('javascript:alert(1)')).toBe(FALLBACK);
  });

  it('rejects protocol-relative URLs', () => {
    expect(safe('//evil.com')).toBe(FALLBACK);
  });

  // Browsers normalize "\" to "/" and strip tabs/newlines in special-scheme
  // URLs, so these become "//evil.com" at navigation time. A plain
  // startsWith('/') && !startsWith('//') check lets all of them through.
  it('rejects backslash and whitespace bypasses of the "//" check', () => {
    expect(safe('/\\evil.com')).toBe(FALLBACK);
    expect(safe('/\\/evil.com')).toBe(FALLBACK);
    expect(safe('/\t/evil.com')).toBe(FALLBACK);
    expect(safe('/\n/evil.com')).toBe(FALLBACK);
  });
});
