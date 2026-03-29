/**
 * Parser for LinkedIn certifications section text copied from a LinkedIn profile page.
 *
 * LinkedIn certifications copy-paste typically yields groups of 2-3 lines:
 *   1. Certification name
 *   2. Issuing organization (optional)
 *   3. "Issued <Month Year>" line (optional)
 *
 * Blocks are separated by blank lines.
 */

export interface ParsedCertificationEntry {
  name: string;
  issuer?: string;
  issuedDate?: string;
}

const ISSUED_RE = /^issued\s+(.+)$/i;

/**
 * Parse a block of LinkedIn certifications text into structured entries.
 *
 * Each entry block contains:
 *   - name: the certification title (required)
 *   - issuer: the issuing organization (optional, absent when next line is an "Issued" line)
 *   - issuedDate: the date string after "Issued " (optional)
 *
 * Blocks separated by blank lines are treated as independent certifications.
 */
export function parseLinkedInCertifications(text: string): ParsedCertificationEntry[] {
  const entries: ParsedCertificationEntry[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const name = lines[i];
    if (!name) break;

    const entry: ParsedCertificationEntry = { name };
    const nextLine = lines[i + 1];

    if (nextLine && !ISSUED_RE.test(nextLine)) {
      entry.issuer = nextLine;
      const dateLine = lines[i + 2];
      if (dateLine) {
        const match = dateLine.match(ISSUED_RE);
        if (match?.[1]) {
          entry.issuedDate = match[1].trim();
          i += 3;
        } else {
          i += 2;
        }
      } else {
        i += 2;
      }
    } else if (nextLine && ISSUED_RE.test(nextLine)) {
      const match = nextLine.match(ISSUED_RE);
      if (match?.[1]) {
        entry.issuedDate = match[1].trim();
      }
      i += 2;
    } else {
      i += 1;
    }

    entries.push(entry);
  }

  return entries;
}
