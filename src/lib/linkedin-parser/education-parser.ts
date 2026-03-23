/**
 * Parser for LinkedIn education section text copied from a LinkedIn profile page.
 *
 * Handles the common LinkedIn education block format:
 *   School Name
 *   Degree[, Field]   (comma-separated degree and field of study)
 *   YYYY - YYYY       (year range)
 */

export interface ParsedEducationEntry {
  school: string;
  degree?: string;
  field?: string;
  startYear?: number;
  endYear?: number;
}

const YEAR_RANGE_RE = /^(\d{4})\s*[-\u2013]\s*(\d{4}|present|actual)$/i;

function parseYearRange(
  line: string
): { startYear: number; endYear?: number } | undefined {
  const match = line.match(YEAR_RANGE_RE);
  if (!match || !match[1] || !match[2]) return undefined;

  const startYear = parseInt(match[1], 10);
  const endYear = /^(present|actual)$/i.test(match[2])
    ? undefined
    : parseInt(match[2], 10);

  return { startYear, endYear };
}

function parseDegreeField(line: string): { degree: string; field?: string } {
  const commaIdx = line.indexOf(',');
  if (commaIdx === -1) {
    return { degree: line };
  }
  return {
    degree: line.slice(0, commaIdx).trim(),
    field: line.slice(commaIdx + 1).trim(),
  };
}

/**
 * Parse a block of LinkedIn education text into structured entries.
 *
 * LinkedIn copy-paste typically yields groups of 2-3 lines per entry:
 *   1. School name
 *   2. Degree (and optional field, comma-separated)   — may be absent
 *   3. Year range (YYYY - YYYY or YYYY - present)     — may be absent
 *
 * Entries are separated by blank lines. The parser walks through
 * non-empty line groups, using the year-range pattern as an anchor.
 */
export function parseLinkedInEducation(text: string): ParsedEducationEntry[] {
  if (!text.trim()) return [];

  const entries: ParsedEducationEntry[] = [];

  // Split into blocks by blank lines; each block is one education entry
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
    )
    .filter((block) => block.length > 0);

  for (const block of blocks) {
    const school = block[0];
    if (!school) continue;

    const entry: ParsedEducationEntry = { school };

    const secondLine = block[1];
    const thirdLine = block[2];

    if (secondLine && !YEAR_RANGE_RE.test(secondLine)) {
      const { degree, field } = parseDegreeField(secondLine);
      entry.degree = degree;
      if (field) entry.field = field;

      if (thirdLine) {
        const years = parseYearRange(thirdLine);
        if (years) {
          entry.startYear = years.startYear;
          if (years.endYear !== undefined) entry.endYear = years.endYear;
        }
      }
    } else if (secondLine && YEAR_RANGE_RE.test(secondLine)) {
      const years = parseYearRange(secondLine);
      if (years) {
        entry.startYear = years.startYear;
        if (years.endYear !== undefined) entry.endYear = years.endYear;
      }
    }

    entries.push(entry);
  }

  return entries;
}
