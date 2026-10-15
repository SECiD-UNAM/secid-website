import { describe, it, expect } from 'vitest';
import {
  ORG_TIME_ZONE,
  formatDate,
  formatTime,
  formatDateTime,
} from '@/lib/format-date';

// These tests are the regression guard for issues #418 / #423 / #425.
// The whole point of the helper is that output is INDEPENDENT of the host
// timezone (server is UTC, browser is the visitor's zone). We assert that by
// using instants that fall on a different calendar day in UTC vs Mexico City,
// and by checking Spanish particles stay lowercase.

describe('format-date', () => {
  it('pins to the org timezone', () => {
    expect(ORG_TIME_ZONE).toBe('America/Mexico_City');
  });

  it('formats the same calendar day regardless of host TZ (day-boundary case)', () => {
    // 2026-08-22T03:00:00Z is still Aug 21 in Mexico City (UTC-6/-5).
    // A naive formatter on a UTC server would say "22 de agosto"; in the
    // Mexico timezone it is "21 de agosto". The helper must always say 21.
    const instant = '2026-08-22T03:00:00.000Z';
    expect(formatDate(instant, 'es')).toBe('21 de agosto de 2026');
    expect(formatDate(instant, 'en')).toBe('August 21, 2026');
  });

  it('lowercases Spanish particles (only first letter capitalized)', () => {
    // Noon UTC is firmly the same day everywhere — focus on capitalization.
    const out = formatDate('2026-08-21T12:00:00.000Z', 'es', {
      weekday: 'long',
    });
    // "viernes, 21 de agosto de 2026" -> first letter only.
    expect(out).toBe('Viernes, 21 de agosto de 2026');
    expect(out).not.toContain(' De ');
    expect(out).not.toContain('Agosto');
  });

  it('defaults to Spanish', () => {
    expect(formatDate('2026-08-21T12:00:00.000Z')).toBe('21 de agosto de 2026');
  });

  it('formatTime is timezone-pinned', () => {
    // 2026-08-22T03:00:00Z == 21:00 (9pm) in Mexico City (CST, UTC-6).
    expect(formatTime('2026-08-22T03:00:00.000Z', 'en')).toBe('09:00 PM');
  });

  it('formatDateTime renders the org-timezone day and time', () => {
    const out = formatDateTime('2026-08-22T03:00:00.000Z', 'es');
    expect(out).toContain('21 de agosto de 2026');
    expect(out.charAt(0)).toBe(out.charAt(0).toUpperCase());
  });

  it('guards invalid dates with an empty string', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatTime(NaN)).toBe('');
    expect(formatDateTime(new Date('nope'))).toBe('');
  });

  it('accepts Date, string and number inputs', () => {
    const ms = Date.parse('2026-08-21T12:00:00.000Z');
    expect(formatDate(new Date(ms), 'en')).toBe('August 21, 2026');
    expect(formatDate(ms, 'en')).toBe('August 21, 2026');
    expect(formatDate('2026-08-21T12:00:00.000Z', 'en')).toBe(
      'August 21, 2026'
    );
  });
});
