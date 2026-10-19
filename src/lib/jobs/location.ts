/**
 * Job board "Ubicación" filter.
 *
 * JobFilters offers fixed city slugs (cdmx, guadalajara, monterrey,
 * queretaro, remote) while jobs store `location` as free text typed by the
 * poster ("Guadalajara, Jalisco", "Ciudad de México, CDMX", "Remote"), so
 * the filter cannot be a Firestore equality query. JobFirestoreAdapter
 * applies it client-side with matchesLocation(), like the other facets.
 */

const CITY_KEYWORDS: Record<string, string[]> = {
  cdmx: ['cdmx', 'ciudad de mexico', 'mexico city', 'df'],
  guadalajara: ['guadalajara', 'gdl'],
  monterrey: ['monterrey', 'mty'],
  queretaro: ['queretaro', 'qro'],
  remote: ['remote', 'remoto', 'remota', 'home office'],
};

/** Lower-case, accent-free, punctuation collapsed to single spaces. */
export function normalizeLocation(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Whether a job satisfies the location filter `city` (a JobFilters slug).
 * An empty slug matches everything; the "remote" slug also matches jobs
 * whose locationType is remote; an unknown slug compares normalised text.
 */
export function matchesLocation(
  job: { location: string; locationType?: string },
  city: string
): boolean {
  if (!city) return true;
  if (city === 'remote' && job.locationType === 'remote') return true;

  const normalized = ` ${normalizeLocation(job.location ?? '')} `;
  const keywords = CITY_KEYWORDS[city];
  if (!keywords) return normalized.trim() === normalizeLocation(city);
  return keywords.some((keyword) => normalized.includes(` ${keyword} `));
}
