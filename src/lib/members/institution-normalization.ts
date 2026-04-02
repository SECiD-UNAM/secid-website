/**
 * Normalize institution names and categorize them for the Education Map.
 */

const INSTITUTION_ALIASES: Record<string, string> = {
  // UNAM variants
  'unam': 'UNAM',
  'universidad nacional autonoma de mexico': 'UNAM',
  'universidad nacional autónoma de méxico': 'UNAM',
  'universidad nacional autonoma de mexico (unam)': 'UNAM',
  'facultad de ciencias, unam': 'UNAM',
  'facultad de ciencias unam': 'UNAM',
  'facultad de ingenieria de la unam': 'UNAM',
  'facultad de ingeniería de la unam': 'UNAM',
  'facultad de estudios superiores acatlan': 'UNAM',
  'facultad de estudios superiores acatlán': 'UNAM',
  'iimas': 'UNAM',
  'iimas - instituto de investigaciones en matematicas aplicadas y sistemas': 'UNAM',
  'instituto de investigaciones en matematicas aplicadas y sistemas': 'UNAM',
  'instituto de física, unam': 'UNAM',
  'instituto de fisica, unam': 'UNAM',
  'cuaiied, unam': 'UNAM',

  // Mexican institutions
  'itam': 'ITAM',
  'instituto tecnologico autonomo de mexico': 'ITAM',
  'instituto tecnológico autónomo de méxico': 'ITAM',
  'tec de monterrey': 'Tec de Monterrey',
  'itesm': 'Tec de Monterrey',
  'instituto tecnologico y de estudios superiores de monterrey': 'Tec de Monterrey',
  'ipn': 'IPN',
  'instituto politecnico nacional': 'IPN',
  'cimat': 'CIMAT',
  'centro de investigacion en matematicas': 'CIMAT',
  'centro de investigacion en matematicas (cimat) guanajuato, guanajuato': 'CIMAT',
  'colmex': 'El Colegio de México',
  'cide': 'CIDE',
  'universidad de navarra': 'Universidad de Navarra',

  // International institutions
  'mit': 'MIT',
  'massachusetts institute of technology': 'MIT',
  'mit xpro': 'MIT xPRO',
  'harvard': 'Harvard University',
  'harvard university': 'Harvard University',
  'harvard t.h. chan school of public health': 'Harvard University',
  'stanford': 'Stanford University',
  'stanford university': 'Stanford University',
  'university of toronto': 'University of Toronto',
  'universite libre de bruxelles': 'Université libre de Bruxelles',
  'université libre de bruxelles': 'Université libre de Bruxelles',
  'texas a&m university': 'Texas A&M University',
  'texas a&m': 'Texas A&M University',
  'northeastern university': 'Northeastern University',
  'cambridge judge business school': 'Cambridge Judge Business School',
  'universidad del rosario': 'Universidad del Rosario',
  'universae': 'UNIVERSAE',

  // Certification providers
  'emtech': 'Emtech',
  'emeritus': 'Emeritus',
  'udemy': 'Udemy',
  'coursera': 'Coursera',
  'platzi': 'Platzi',
};

const NATIONAL_INSTITUTIONS = new Set([
  'ITAM', 'Tec de Monterrey', 'IPN', 'CIMAT', 'El Colegio de México',
  'CIDE', 'Universidad de Navarra', 'UNIVERSAE',
]);

const INTERNATIONAL_INSTITUTIONS = new Set([
  'MIT', 'MIT xPRO', 'Harvard University', 'Stanford University',
  'University of Toronto', 'Université libre de Bruxelles',
  'Texas A&M University', 'Northeastern University',
  'Cambridge Judge Business School', 'Universidad del Rosario',
]);

const CERTIFICATION_PROVIDERS = new Set([
  'Emtech', 'Emeritus', 'Udemy', 'Coursera', 'Platzi',
]);

export function normalizeInstitution(raw: string): string {
  const key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return INSTITUTION_ALIASES[key] || raw;
}

export type InstitutionCategory =
  | 'UNAM'
  | 'Posgrado Nacional'
  | 'Posgrado Internacional'
  | 'Otras Universidades'
  | 'Certificaciones';

export function getInstitutionCategory(normalizedName: string): InstitutionCategory {
  if (normalizedName === 'UNAM') return 'UNAM';
  if (CERTIFICATION_PROVIDERS.has(normalizedName)) return 'Certificaciones';
  if (INTERNATIONAL_INSTITUTIONS.has(normalizedName)) return 'Posgrado Internacional';
  if (NATIONAL_INSTITUTIONS.has(normalizedName)) return 'Posgrado Nacional';
  return 'Otras Universidades';
}
