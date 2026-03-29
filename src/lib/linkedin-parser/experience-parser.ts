/**
 * Parser for LinkedIn experience text copied from a LinkedIn profile page.
 *
 * Handles both English and Spanish month names and common LinkedIn date
 * formats like "Jan 2022 - Present . 3 yrs 2 mos".
 */

export interface ParsedLinkedInEntry {
  position: string;
  company: string;
  startDate?: { month: number; year: number };
  endDate?: { month: number; year: number };
  current: boolean;
  location?: string;
}

const MONTH_MAP: Record<string, number> = {
  // English
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  // Spanish
  ene: 1,
  abr: 4,
  ago: 8,
  dic: 12,
  // Full English
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  // Full Spanish
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/**
 * Parse a "Month Year" string like "Jan 2022" or "Ene 2022" into
 * `{ month, year }`. Returns undefined if it cannot be parsed.
 */
export function parseMonthYear(
  str: string
): { month: number; year: number } | undefined {
  const match = str.trim().match(/^(\w+)\s+(\d{4})$/);
  if (!match || !match[1] || !match[2]) return undefined;
  const monthKey = match[1].toLowerCase();
  const month = MONTH_MAP[monthKey];
  if (!month) return undefined;
  const year = parseInt(match[2], 10);
  return { month, year };
}

/**
 * Returns true when a line looks like a LinkedIn date range, e.g.
 * "Jan 2022 - Present . 3 yrs 2 mos" or "Ene 2020 - Dic 2021 . 1 ano 7 meses".
 */
function isDateLine(line: string): boolean {
  return /\w+\s+\d{4}\s*[-\u2013]\s*(\w+\s+\d{4}|present|actual)/i.test(line);
}

/**
 * Parse a block of LinkedIn experience text into structured entries.
 *
 * LinkedIn copy-paste typically yields groups of 3-4 lines:
 *   1. Position title
 *   2. Company name
 *   3. Date range (with optional duration after a dot/middle-dot)
 *   4. Location (optional)
 *
 * The parser walks through non-empty lines in groups, using the date-line
 * pattern as an anchor to determine where each entry's metadata is.
 */
export function parseLinkedInText(text: string): ParsedLinkedInEntry[] {
  const entries: ParsedLinkedInEntry[] = [];
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const position = lines[i];
    const company = lines[i + 1];

    // Need at least position + company to form an entry
    if (!position || !company) break;

    // If the second line looks like a date, this isn't a valid entry group
    if (isDateLine(company)) break;

    const entry: ParsedLinkedInEntry = {
      position,
      company,
      current: false,
    };

    const dateLine = lines[i + 2];

    if (dateLine && isDateLine(dateLine)) {
      const dateMatch = dateLine.match(
        /(\w+\s+\d{4})\s*[-\u2013]\s*(\w+\s+\d{4}|present|actual)/i
      );
      if (dateMatch && dateMatch[1] && dateMatch[2]) {
        entry.startDate = parseMonthYear(dateMatch[1]);
        if (/^(present|actual)$/i.test(dateMatch[2])) {
          entry.current = true;
        } else {
          entry.endDate = parseMonthYear(dateMatch[2]);
        }
      }

      // Check if line i+3 is a location (not the start of a new entry group)
      const nextLine = lines[i + 3];
      const lineAfterNext = lines[i + 4];

      if (nextLine && !(lineAfterNext && isDateLine(lines[i + 5] ?? ''))) {
        // Heuristic: if the line after next also has a date pattern at i+5,
        // then nextLine is a position title, not a location.
        // But simpler: if nextLine doesn't look like a date and isn't followed
        // by a date at i+4 position, treat it as location.
        if (lineAfterNext && isDateLine(lineAfterNext)) {
          // nextLine is actually the next entry's position — no location here
          i += 3;
        } else {
          entry.location = nextLine;
          i += 4;
        }
      } else {
        i += 3;
      }
    } else {
      // No date line — just position + company
      i += 2;
    }

    entries.push(entry);
  }

  return entries;
}
