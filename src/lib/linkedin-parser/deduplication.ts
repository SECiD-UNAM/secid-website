/**
 * Deduplication utilities for LinkedIn profile imports.
 *
 * Compares imported entries against existing profile data and splits them into
 * duplicates (already present) and new entries (safe to add). Matching is
 * case-insensitive so "BBVA" and "bbva" are treated as the same company.
 */

import type { ParsedLinkedInEntry } from './experience-parser';

interface ExistingExperience {
  company: string;
  position: string;
  [key: string]: unknown;
}

/**
 * Separate imported experience entries into duplicates and new entries by
 * comparing against existing work experience records.
 *
 * Duplicate detection key: `{company.toLowerCase()}|{position.toLowerCase()}`
 */
export function deduplicateExperience(
  existing: ExistingExperience[],
  imported: ParsedLinkedInEntry[]
): { duplicates: ParsedLinkedInEntry[]; newEntries: ParsedLinkedInEntry[] } {
  const existingSet = new Set(
    existing.map(
      (e) => `${e.company.trim().toLowerCase()}|${e.position.trim().toLowerCase()}`
    )
  );

  const duplicates: ParsedLinkedInEntry[] = [];
  const newEntries: ParsedLinkedInEntry[] = [];

  for (const entry of imported) {
    const key = `${entry.company.trim().toLowerCase()}|${entry.position.trim().toLowerCase()}`;
    if (existingSet.has(key)) {
      duplicates.push(entry);
    } else {
      newEntries.push(entry);
    }
  }

  return { duplicates, newEntries };
}

/**
 * Merge imported skills into an existing skill list, deduplicating
 * case-insensitively while preserving the original casing of the
 * first occurrence (existing entries take precedence over imports).
 */
export function deduplicateSkills(existing: string[], imported: string[]): string[] {
  const seen = new Map<string, string>();

  for (const skill of existing) {
    seen.set(skill.toLowerCase(), skill);
  }

  for (const skill of imported) {
    const lower = skill.toLowerCase();
    if (!seen.has(lower)) {
      seen.set(lower, skill);
    }
  }

  return Array.from(seen.values());
}
