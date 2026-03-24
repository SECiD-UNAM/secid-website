/**
 * Transformers from parsed LinkedIn types to domain types defined in @/types/member.
 *
 * These adapters sit at the boundary between the LinkedIn parsing layer and
 * the member profile domain — keeping infrastructure details (LinkedIn data
 * shapes) out of business entities.
 */

import type { EducationEntry, Certification, Language } from '@/types/member';
import type { ParsedEducationEntry } from './education-parser';
import type { ParsedCertificationEntry } from './certifications-parser';
import type { ParsedLanguageEntry } from './languages-parser';

/**
 * Map a parsed LinkedIn education block to a domain EducationEntry.
 *
 * When no startYear is available we default to the current date so the
 * entry still has a valid Date object (as required by EducationEntry.startDate).
 */
export function toEducationEntry(parsed: ParsedEducationEntry): EducationEntry {
  return {
    id: crypto.randomUUID(),
    institution: parsed.school,
    degree: parsed.degree ?? '',
    fieldOfStudy: parsed.field,
    startDate: parsed.startYear ? new Date(parsed.startYear, 0, 1) : new Date(),
    endDate: parsed.endYear ? new Date(parsed.endYear, 0, 1) : undefined,
    current: !parsed.endYear,
  };
}

const PROFICIENCY_MAP: Record<string, Language['proficiency']> = {
  'native or bilingual': 'native',
  'nativo o bilingüe': 'native',
  'full professional': 'advanced',
  'professional working': 'advanced',
  profesional: 'advanced',
  'limited working': 'intermediate',
  elementary: 'beginner',
  elemental: 'beginner',
};

/**
 * Map a parsed LinkedIn language entry to a domain Language.
 *
 * Proficiency strings from LinkedIn (e.g. "Full professional proficiency")
 * are matched case-insensitively against the PROFICIENCY_MAP. Unrecognised
 * strings default to 'intermediate'.
 */
export function toLanguage(parsed: ParsedLanguageEntry): Language {
  let proficiency: Language['proficiency'] = 'intermediate';

  if (parsed.proficiency) {
    const lower = parsed.proficiency.toLowerCase();
    for (const [key, value] of Object.entries(PROFICIENCY_MAP)) {
      if (lower.includes(key)) {
        proficiency = value;
        break;
      }
    }
  }

  return { id: crypto.randomUUID(), name: parsed.language, proficiency };
}

/**
 * Map a parsed LinkedIn certification entry to a domain Certification.
 *
 * issueDate falls back to the current date when no date string is present
 * so the domain object always satisfies the non-optional Date constraint.
 */
export function toCertification(parsed: ParsedCertificationEntry): Certification {
  return {
    id: crypto.randomUUID(),
    name: parsed.name,
    issuer: parsed.issuer ?? '',
    issueDate: parsed.issuedDate ? new Date(parsed.issuedDate) : new Date(),
    verified: false,
  };
}
