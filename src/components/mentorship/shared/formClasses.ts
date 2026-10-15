/**
 * Shared Tailwind class constants used across the mentorship form/component surface
 * (MentorshipRequest, MentorshipSessions, MentorProfile).
 *
 * Only constants that are byte-identical across multiple call sites live here.
 * Component-local variants (e.g. small-button variants, the `numberInput` width,
 * the danger/ghost buttons that only one component uses) intentionally stay
 * inline at the call site to preserve behavior and keep this surface minimal.
 */

/** Full-width text input. */
export const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

/** Form field label. */
export const labelClass =
  'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300';

/** Section heading inside a card/form. */
export const sectionHeadingClass =
  'mb-4 text-lg font-semibold text-gray-900 dark:text-white';

/** Primary action button (md). */
export const primaryBtnClass =
  'inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50';
