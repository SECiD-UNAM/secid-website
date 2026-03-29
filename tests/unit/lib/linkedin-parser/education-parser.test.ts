/**
 * Tests for LinkedIn education section parser.
 *
 * TC-edu-parser-001 through TC-edu-parser-004
 * Verifies: AC-1 (degree and field parsing), AC-2 (optional field),
 *           AC-3 (multiple entries), AC-4 (empty input)
 */
import { describe, it, expect } from 'vitest';
import { parseLinkedInEducation } from '@/lib/linkedin-parser/education-parser';

describe('parseLinkedInEducation', () => {
  it('TC-edu-parser-001: parses entry with degree and field', () => {
    /**
     * Verifies: AC-1 — degree+field format "Degree - Abbrev, Field" parsed correctly
     */
    const text = `Universidad Nacional Autónoma de México\nBachelor of Science - BS, Data Science\n2018 - 2022`;
    const result = parseLinkedInEducation(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      school: 'Universidad Nacional Autónoma de México',
      degree: 'Bachelor of Science - BS',
      field: 'Data Science',
      startYear: 2018,
      endYear: 2022,
    });
  });

  it('TC-edu-parser-002: parses entry without field', () => {
    /**
     * Verifies: AC-2 — degree-only line (no comma) leaves field undefined
     */
    const text = `MIT\nMaster of Science\n2020 - 2022`;
    const result = parseLinkedInEducation(text);
    expect(result[0].degree).toBe('Master of Science');
    expect(result[0].field).toBeUndefined();
  });

  it('TC-edu-parser-003: parses multiple entries', () => {
    /**
     * Verifies: AC-3 — blank-line separated entries are each parsed
     */
    const text = `UNAM\nLicenciatura, Ciencia de Datos\n2018 - 2022\n\nIPN\nMaestría, IA\n2022 - 2024`;
    const result = parseLinkedInEducation(text);
    expect(result).toHaveLength(2);
  });

  it('TC-edu-parser-004: returns empty for empty input', () => {
    /**
     * Verifies: AC-4 — empty string returns empty array
     */
    expect(parseLinkedInEducation('')).toEqual([]);
  });
});
