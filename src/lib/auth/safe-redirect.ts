/**
 * Returns `candidate` as a same-origin path, or `fallback` if it could send
 * the user off-site.
 *
 * A string check like `startsWith('/') && !startsWith('//')` is not enough:
 * browsers turn "\" into "/" and drop tabs/newlines in http(s) URLs, so
 * "/\evil.com" or "/\t/evil.com" navigate to //evil.com. Parsing with the
 * URL API applies the same normalization and lets us compare origins.
 */
export function toSafeInternalPath(
  candidate: string | null | undefined,
  fallback: string,
  origin: string = window.location.origin
): string {
  if (!candidate || !candidate.startsWith('/')) return fallback;
  try {
    const url = new URL(candidate, origin);
    if (url.origin !== origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
