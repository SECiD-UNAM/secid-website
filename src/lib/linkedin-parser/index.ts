/**
 * LinkedIn parser module — public API.
 *
 * Re-exports all parsers, transformers, and deduplication utilities so
 * consumers can import from '@/lib/linkedin-parser' without referencing
 * individual sub-module paths.
 */

export {
  parseLinkedInText,
  parseMonthYear,
  type ParsedLinkedInEntry,
} from './experience-parser';

export {
  parseLinkedInEducation,
  type ParsedEducationEntry,
} from './education-parser';

export { parseLinkedInSkills } from './skills-parser';

export {
  parseLinkedInCertifications,
  type ParsedCertificationEntry,
} from './certifications-parser';

export {
  parseLinkedInLanguages,
  type ParsedLanguageEntry,
} from './languages-parser';

export { deduplicateExperience, deduplicateSkills } from './deduplication';

export { toEducationEntry, toLanguage, toCertification } from './transformers';
