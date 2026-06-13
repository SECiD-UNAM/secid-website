/**
 * Shared, timezone-pinned date formatting helpers.
 *
 * Every formatter here pins the output to {@link ORG_TIME_ZONE}
 * (America/Mexico_City). This is deliberate and load-bearing:
 *
 *  1. **Hydration safety.** Astro renders React islands on the server (UTC)
 *     and again in the browser (the visitor's local timezone). Calling
 *     `toLocaleDateString` / `toLocaleTimeString` / `Intl.DateTimeFormat`
 *     WITHOUT a `timeZone` option makes the two environments format the same
 *     instant into different strings (e.g. a date can shift by a day across
 *     the UTC/Mexico boundary), producing a React text-content hydration
 *     mismatch (issues #418 / #423 / #425). Pinning the timezone makes the
 *     server and client agree byte-for-byte.
 *
 *  2. **Semantic correctness.** SECiD is a Mexico-based org and its events
 *     happen on Mexico City time. A visitor in another timezone should see
 *     the event in the org's timezone, not shifted into their own.
 *
 * Spanish locale dates come back fully lowercase
 * ("viernes, 21 de agosto de 2026"). We capitalize ONLY the first letter in
 * JS — never via a CSS `capitalize` class, which would wrongly title-case
 * Spanish particles ("Viernes, 21 De Agosto De 2026").
 */

export const ORG_TIME_ZONE = 'America/Mexico_City';

export type DateLocale = 'es' | 'en';

/** Maps the app's short locale codes to BCP-47 tags. */
function intlLocale(locale: DateLocale): string {
  return locale === 'es' ? 'es-MX' : 'en-US';
}

/** Resolves a Date | string | number to a valid Date, or null if invalid. */
function toDate(input: Date | string | number): Date | null {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Uppercases only the first character, leaving the rest untouched. */
function capitalizeFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Formats a date (day/month/year by default) in the org timezone.
 *
 * Output is deterministic across server (UTC) and browser timezones, which
 * is what prevents the React hydration mismatch. Capitalizes only the first
 * letter so Spanish particles ("de") stay lowercase.
 *
 * @param date    Date, ISO string, or epoch ms.
 * @param locale  'es' (default) or 'en'.
 * @param options Extra Intl.DateTimeFormatOptions; merged after the defaults.
 *                `timeZone` is always forced to {@link ORG_TIME_ZONE}.
 * @returns Formatted string, or '' for an invalid date.
 */
export function formatDate(
  date: Date | string | number,
  locale: DateLocale = 'es',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = toDate(date);
  if (!d) return '';
  const out = d.toLocaleDateString(intlLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
    timeZone: ORG_TIME_ZONE,
  });
  return capitalizeFirst(out);
}

/**
 * Formats the time-of-day (hour:minute) in the org timezone.
 * Pinned to {@link ORG_TIME_ZONE} for hydration safety and to show event
 * times in the org's timezone regardless of the viewer's location.
 *
 * @returns Formatted time string, or '' for an invalid date.
 */
export function formatTime(
  date: Date | string | number,
  locale: DateLocale = 'es',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = toDate(date);
  if (!d) return '';
  return d.toLocaleTimeString(intlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
    timeZone: ORG_TIME_ZONE,
  });
}

/**
 * Formats a full date + time (weekday/day/month/year + hour/minute) in the
 * org timezone. Pinned to {@link ORG_TIME_ZONE} for hydration safety and to
 * show event times in the org's timezone. Capitalizes only the first letter.
 *
 * @returns Formatted string, or '' for an invalid date.
 */
export function formatDateTime(
  date: Date | string | number,
  locale: DateLocale = 'es',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = toDate(date);
  if (!d) return '';
  const out = d.toLocaleString(intlLocale(locale), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
    timeZone: ORG_TIME_ZONE,
  });
  return capitalizeFirst(out);
}
