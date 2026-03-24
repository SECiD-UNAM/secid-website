/**
 * Tests for LinkedIn import deduplication utilities.
 *
 * TC-linkedin-dedup-001 through TC-linkedin-dedup-008
 * Verifies: deduplication of work experience and skills by case-insensitive key matching
 */

import { describe, it, expect } from 'vitest';
import {
  deduplicateExperience,
  deduplicateSkills,
} from '@/lib/linkedin-parser/deduplication';

describe('deduplicateExperience', () => {
  it('TC-linkedin-dedup-001: identifies duplicate by company+title case-insensitively', () => {
    /**
     * Verifies: existing "BBVA / Data Scientist" matches imported "bbva / data scientist"
     */
    const existing = [
      {
        company: 'BBVA',
        position: 'Data Scientist',
        id: '1',
        startDate: new Date(),
        current: false,
      },
    ];
    const imported = [
      {
        company: 'bbva',
        position: 'data scientist',
        startDate: { month: 1, year: 2022 },
        current: true,
      },
    ];

    const result = deduplicateExperience(existing, imported);

    expect(result.duplicates).toHaveLength(1);
    expect(result.newEntries).toHaveLength(0);
  });

  it('TC-linkedin-dedup-002: identifies new entries when no match exists', () => {
    /**
     * Verifies: imported entry with different company is classified as new
     */
    const existing = [
      {
        company: 'BBVA',
        position: 'Data Scientist',
        id: '1',
        startDate: new Date(),
        current: false,
      },
    ];
    const imported = [
      {
        company: 'Google',
        position: 'ML Engineer',
        startDate: { month: 6, year: 2020 },
        current: false,
      },
    ];

    const result = deduplicateExperience(existing, imported);

    expect(result.duplicates).toHaveLength(0);
    expect(result.newEntries).toHaveLength(1);
    expect(result.newEntries[0].company).toBe('Google');
  });

  it('TC-linkedin-dedup-003: splits mixed batch into duplicates and new entries', () => {
    /**
     * Verifies: a batch with both duplicates and new entries is correctly partitioned
     */
    const existing = [
      { company: 'BBVA', position: 'Data Scientist', id: '1', startDate: new Date(), current: false },
    ];
    const imported = [
      { company: 'BBVA', position: 'Data Scientist', startDate: { month: 1, year: 2022 }, current: true },
      { company: 'Uber', position: 'ML Engineer', startDate: { month: 6, year: 2020 }, current: false },
    ];

    const result = deduplicateExperience(existing, imported);

    expect(result.duplicates).toHaveLength(1);
    expect(result.newEntries).toHaveLength(1);
    expect(result.duplicates[0].company).toBe('BBVA');
    expect(result.newEntries[0].company).toBe('Uber');
  });

  it('TC-linkedin-dedup-004: handles empty existing list — all imported are new', () => {
    /**
     * Verifies: when profile has no experience, all imports are new entries
     */
    const imported = [
      { company: 'Google', position: 'Engineer', startDate: { month: 1, year: 2022 }, current: true },
    ];

    const result = deduplicateExperience([], imported);

    expect(result.duplicates).toHaveLength(0);
    expect(result.newEntries).toHaveLength(1);
  });

  it('TC-linkedin-dedup-005: handles empty imported list — no entries classified', () => {
    /**
     * Verifies: when import is empty both result arrays are empty
     */
    const existing = [
      { company: 'BBVA', position: 'DS', id: '1', startDate: new Date(), current: false },
    ];

    const result = deduplicateExperience(existing, []);

    expect(result.duplicates).toHaveLength(0);
    expect(result.newEntries).toHaveLength(0);
  });

  it('TC-linkedin-dedup-006: matches with trimmed whitespace', () => {
    /**
     * Verifies: leading/trailing spaces in company or position are trimmed before matching
     */
    const existing = [
      { company: '  Google  ', position: '  Engineer  ', id: '1', startDate: new Date(), current: false },
    ];
    const imported = [
      { company: 'Google', position: 'Engineer', startDate: { month: 3, year: 2021 }, current: false },
    ];

    const result = deduplicateExperience(existing, imported);

    expect(result.duplicates).toHaveLength(1);
    expect(result.newEntries).toHaveLength(0);
  });
});

describe('deduplicateSkills', () => {
  it('TC-linkedin-dedup-007: merges case-insensitively, preserving existing casing', () => {
    /**
     * Verifies: "python" import does not add duplicate when "Python" exists;
     * new skills ("SQL", "React") are added
     */
    const result = deduplicateSkills(['Python', 'ML'], ['python', 'SQL', 'ml', 'React']);

    expect(result).toEqual(['Python', 'ML', 'SQL', 'React']);
  });

  it('TC-linkedin-dedup-008: preserves original casing from existing list', () => {
    /**
     * Verifies: existing "TensorFlow" wins over imported "tensorflow"
     */
    const result = deduplicateSkills(['TensorFlow'], ['tensorflow']);

    expect(result).toEqual(['TensorFlow']);
  });

  it('TC-linkedin-dedup-009: handles empty existing list — returns all imported', () => {
    /**
     * Verifies: when existing is empty, all unique imported skills are returned
     */
    const result = deduplicateSkills([], ['Python', 'SQL', 'python']);

    expect(result).toEqual(['Python', 'SQL']);
  });

  it('TC-linkedin-dedup-010: handles empty imported list — returns existing unchanged', () => {
    /**
     * Verifies: when import is empty, existing skills are returned as-is
     */
    const result = deduplicateSkills(['Python', 'R'], []);

    expect(result).toEqual(['Python', 'R']);
  });
});
