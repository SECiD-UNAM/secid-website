/**
 * Tests for LinkedIn experience text parser.
 *
 * TC-linkedin-import-001 through TC-linkedin-import-012
 * Verifies: AC-1 (parsing), AC-2 (bilingual months), AC-3 (current detection)
 */
import { describe, it, expect } from 'vitest';
import {
  parseLinkedInText,
  parseMonthYear,
} from '../../../src/lib/linkedin-parser/experience-parser';

describe('parseMonthYear', () => {
  it('TC-linkedin-import-001: parses English abbreviated month', () => {
    const result = parseMonthYear('Jan 2022');
    expect(result).toEqual({ month: 1, year: 2022 });
  });

  it('TC-linkedin-import-002: parses Spanish abbreviated month', () => {
    const result = parseMonthYear('Ene 2020');
    expect(result).toEqual({ month: 1, year: 2020 });
  });

  it('TC-linkedin-import-003: parses full English month name', () => {
    const result = parseMonthYear('September 2019');
    expect(result).toEqual({ month: 9, year: 2019 });
  });

  it('TC-linkedin-import-004: parses full Spanish month name', () => {
    const result = parseMonthYear('Diciembre 2021');
    expect(result).toEqual({ month: 12, year: 2021 });
  });

  it('TC-linkedin-import-005: returns undefined for invalid input', () => {
    expect(parseMonthYear('invalid')).toBeUndefined();
    expect(parseMonthYear('')).toBeUndefined();
    expect(parseMonthYear('2022')).toBeUndefined();
    expect(parseMonthYear('Xyz 2022')).toBeUndefined();
  });
});

describe('parseLinkedInText', () => {
  it('TC-linkedin-import-006: parses a single entry with location', () => {
    const text = `Data Scientist
BBVA
Jan 2022 - Present · 3 yrs 2 mos
Mexico City, Mexico`;

    const result = parseLinkedInText(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      position: 'Data Scientist',
      company: 'BBVA',
      startDate: { month: 1, year: 2022 },
      endDate: undefined,
      current: true,
      location: 'Mexico City, Mexico',
    });
  });

  it('TC-linkedin-import-007: parses multiple entries', () => {
    const text = `Data Scientist
BBVA
Jan 2022 - Present · 3 yrs 2 mos
Mexico City, Mexico

ML Engineer
Uber
Jun 2020 - Dec 2021 · 1 yr 7 mos
San Francisco, California`;

    const result = parseLinkedInText(text);
    expect(result).toHaveLength(2);

    expect(result[0].position).toBe('Data Scientist');
    expect(result[0].company).toBe('BBVA');
    expect(result[0].current).toBe(true);
    expect(result[0].startDate).toEqual({ month: 1, year: 2022 });
    expect(result[0].location).toBe('Mexico City, Mexico');

    expect(result[1].position).toBe('ML Engineer');
    expect(result[1].company).toBe('Uber');
    expect(result[1].current).toBe(false);
    expect(result[1].startDate).toEqual({ month: 6, year: 2020 });
    expect(result[1].endDate).toEqual({ month: 12, year: 2021 });
    expect(result[1].location).toBe('San Francisco, California');
  });

  it('TC-linkedin-import-008: parses Spanish date format with "Actual"', () => {
    const text = `Científico de Datos
BBVA
Ene 2022 - Actual · 3 años 2 meses
Ciudad de México, México`;

    const result = parseLinkedInText(text);
    expect(result).toHaveLength(1);
    expect(result[0].current).toBe(true);
    expect(result[0].startDate).toEqual({ month: 1, year: 2022 });
    expect(result[0].location).toBe('Ciudad de México, México');
  });

  it('TC-linkedin-import-009: handles entry without location', () => {
    const text = `Software Engineer
Google
Mar 2019 - Jun 2021 · 2 yrs 3 mos`;

    const result = parseLinkedInText(text);
    expect(result).toHaveLength(1);
    expect(result[0].position).toBe('Software Engineer');
    expect(result[0].company).toBe('Google');
    expect(result[0].location).toBeUndefined();
  });

  it('TC-linkedin-import-010: returns empty array for empty input', () => {
    expect(parseLinkedInText('')).toEqual([]);
    expect(parseLinkedInText('   \n  \n  ')).toEqual([]);
  });

  it('TC-linkedin-import-011: handles en-dash separator', () => {
    const text = `Data Analyst
Amazon
Apr 2021 \u2013 Present \u00b7 2 yrs
Seattle, WA`;

    const result = parseLinkedInText(text);
    expect(result).toHaveLength(1);
    expect(result[0].current).toBe(true);
    expect(result[0].startDate).toEqual({ month: 4, year: 2021 });
  });

  it('TC-linkedin-import-012: handles three entries without locations', () => {
    const text = `Position A
Company A
Jan 2023 - Present
Position B
Company B
Jun 2021 - Dec 2022
Position C
Company C
Jan 2020 - May 2021`;

    const result = parseLinkedInText(text);
    expect(result).toHaveLength(3);
    expect(result[0].position).toBe('Position A');
    expect(result[1].position).toBe('Position B');
    expect(result[2].position).toBe('Position C');
  });
});
