/**
 * Tests for LinkedIn skills section parser.
 *
 * TC-skills-parser-001 through TC-skills-parser-004
 * Verifies: AC-1 (newline parsing), AC-2 (endorsement stripping),
 *           AC-3 (whitespace trimming), AC-4 (empty input handling)
 */
import { describe, it, expect } from 'vitest';
import { parseLinkedInSkills } from '@/lib/linkedin-parser/skills-parser';

describe('parseLinkedInSkills', () => {
  it('TC-skills-parser-001: parses newline-separated skills', () => {
    // Verifies: AC-1
    expect(parseLinkedInSkills('Python\nMachine Learning\nSQL')).toEqual([
      'Python',
      'Machine Learning',
      'SQL',
    ]);
  });

  it('TC-skills-parser-002: ignores endorsement counts', () => {
    // Verifies: AC-2
    expect(
      parseLinkedInSkills('Python · 15 endorsements\nSQL')
    ).toEqual(['Python', 'SQL']);
  });

  it('TC-skills-parser-003: trims whitespace and removes empty lines', () => {
    // Verifies: AC-3
    expect(parseLinkedInSkills('  Python  \n\n  ML  ')).toEqual([
      'Python',
      'ML',
    ]);
  });

  it('TC-skills-parser-004: returns empty array for empty input', () => {
    // Verifies: AC-4
    expect(parseLinkedInSkills('')).toEqual([]);
  });
});
