/**
 * Tests for LinkedIn languages section parser.
 *
 * TC-lang-parser-001 through TC-lang-parser-003
 * Verifies: AC-1 (language with proficiency), AC-2 (language without proficiency),
 *           AC-3 (empty input handling)
 */
import { describe, it, expect } from 'vitest';
import { parseLinkedInLanguages } from '@/lib/linkedin-parser/languages-parser';

describe('parseLinkedInLanguages', () => {
  it('TC-lang-parser-001: parses languages with proficiency', () => {
    /**
     * Verifies: AC-1 — language name followed by proficiency line parsed into entry
     */
    const text = `Spanish\nNative or bilingual proficiency\n\nEnglish\nProfessional working proficiency`;
    const result = parseLinkedInLanguages(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      language: 'Spanish',
      proficiency: 'Native or bilingual proficiency',
    });
    expect(result[1]).toEqual({
      language: 'English',
      proficiency: 'Professional working proficiency',
    });
  });

  it('TC-lang-parser-002: handles languages without proficiency', () => {
    /**
     * Verifies: AC-2 — language name with no subsequent proficiency line yields undefined proficiency
     */
    const result = parseLinkedInLanguages('Spanish\nEnglish');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ language: 'Spanish', proficiency: undefined });
  });

  it('TC-lang-parser-003: returns empty array for empty input', () => {
    /**
     * Verifies: AC-3 — empty string returns empty array
     */
    expect(parseLinkedInLanguages('')).toEqual([]);
  });
});
