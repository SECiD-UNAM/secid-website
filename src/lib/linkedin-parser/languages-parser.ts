/**
 * Parser for the LinkedIn Languages section text copied from a LinkedIn profile.
 *
 * LinkedIn languages are typically listed as pairs of lines:
 *   Language Name
 *   Proficiency Level   (optional — not always present)
 *
 * Entries may be separated by blank lines or appear consecutively when
 * proficiency is absent.
 */

export interface ParsedLanguageEntry {
  language: string;
  proficiency?: string;
}

const PROFICIENCY_KEYWORDS = [
  'native',
  'bilingual',
  'professional',
  'working',
  'limited',
  'elementary',
  'nativo',
  'bilingüe',
  'profesional',
  'elemental',
  'competencia',
];

function isProficiencyLine(line: string): boolean {
  const lower = line.toLowerCase();
  return PROFICIENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Parse a block of LinkedIn languages text into structured entries.
 *
 * Each entry consists of a language name and an optional proficiency line.
 * The proficiency line is detected by matching against known proficiency
 * keywords in both English and Spanish.
 */
export function parseLinkedInLanguages(text: string): ParsedLanguageEntry[] {
  const entries: ParsedLanguageEntry[] = [];
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const language = lines[i];
    if (!language) break;

    const nextLine = lines[i + 1];
    if (nextLine && isProficiencyLine(nextLine)) {
      entries.push({ language, proficiency: nextLine });
      i += 2;
    } else {
      entries.push({ language, proficiency: undefined });
      i += 1;
    }
  }

  return entries;
}
