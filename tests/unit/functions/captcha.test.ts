/**
 * functions/src/captcha.ts — decision logic for the public-form CAPTCHA.
 * Pure functions only; the network paths are exercised in prod via the
 * `[captcha] rejected` log line.
 */
import { describe, it, expect } from 'vitest';
import {
  CAPTCHA_MIN_SCORE,
  evaluateAssessment,
  evaluateSiteverify,
} from '../../../functions/src/captcha';

describe('evaluateAssessment (reCAPTCHA Enterprise)', () => {
  const valid = (score: number, action = 'contact_send') => ({
    tokenProperties: { valid: true, action, hostname: 'secid.mx' },
    riskAnalysis: { score, reasons: [] },
  });

  it('accepts a valid token with the expected action and a good score', () => {
    expect(evaluateAssessment(valid(0.9), 'contact_send')).toEqual({
      ok: true,
      score: 0.9,
    });
  });

  it('accepts a score exactly at the threshold', () => {
    expect(
      evaluateAssessment(valid(CAPTCHA_MIN_SCORE), 'contact_send').ok
    ).toBe(true);
  });

  it('rejects an invalid token and names the reason', () => {
    const verdict = evaluateAssessment(
      {
        tokenProperties: { valid: false, invalidReason: 'EXPIRED' },
        riskAnalysis: {},
      },
      'contact_send'
    );
    expect(verdict).toEqual({
      ok: false,
      reason: 'invalid:EXPIRED',
      score: undefined,
    });
  });

  it('rejects a token minted for another action', () => {
    const verdict = evaluateAssessment(
      valid(0.9, 'newsletter_subscribe'),
      'contact_send'
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toBe('action:newsletter_subscribe');
  });

  it('rejects a low score (headless browsers score ~0.1)', () => {
    expect(evaluateAssessment(valid(0.1), 'contact_send')).toEqual({
      ok: false,
      reason: 'low_score',
      score: 0.1,
    });
  });

  it('treats a missing tokenProperties block as invalid', () => {
    expect(evaluateAssessment({}, 'contact_send').ok).toBe(false);
  });
});

describe('evaluateSiteverify (legacy endpoint)', () => {
  it('accepts success without a score (v2)', () => {
    expect(evaluateSiteverify({ success: true })).toEqual({
      ok: true,
      score: undefined,
    });
  });

  it('accepts success with a good score (v3)', () => {
    expect(evaluateSiteverify({ success: true, score: 0.7 }).ok).toBe(true);
  });

  it('rejects low scores', () => {
    expect(evaluateSiteverify({ success: true, score: 0.3 })).toEqual({
      ok: false,
      reason: 'low_score',
      score: 0.3,
    });
  });

  it('surfaces the error codes when Google rejects the token', () => {
    const verdict = evaluateSiteverify({
      success: false,
      'error-codes': ['incorrect-captcha-sol'],
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toBe('siteverify:incorrect-captcha-sol');
  });
});
