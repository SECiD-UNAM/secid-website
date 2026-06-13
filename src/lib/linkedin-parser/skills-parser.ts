/**
 * Parser for the LinkedIn Skills section text copied from a LinkedIn profile.
 *
 * LinkedIn skills are typically listed one per line and may include endorsement
 * counts in the format "Skill · N endorsements". This module strips that noise
 * and returns a clean list of skill names.
 */

/**
 * Parse a block of LinkedIn skills text into a clean list of skill names.
 *
 * Handles:
 * - Newline-separated skill entries
 * - Endorsement count suffixes (e.g. "Python · 15 endorsements")
 * - Extra whitespace and blank lines
 */
export function parseLinkedInSkills(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/·.*$/, '').trim())
    .filter(Boolean);
}
