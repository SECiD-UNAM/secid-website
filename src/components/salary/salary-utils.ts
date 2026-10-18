/**
 * Salary insights utility functions.
 * Privacy and statistical helpers for the analytics dashboard.
 */

export interface AggregateStats {
  median: number;
  p10: number;
  p90: number;
  count: number;
}

/**
 * Computes aggregate stats for a set of salary values.
 * Returns null if fewer than minCount values are provided — enforces the
 * privacy rule that requires at least 3 data points per group.
 *
 * Does not mutate the input array.
 */
export function safeAggregate(
  values: number[],
  minCount = 3
): AggregateStats | null {
  if (values.length < minCount) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    median: sorted[Math.floor(sorted.length / 2)]!,
    p10: sorted[Math.floor(sorted.length * 0.1)]!,
    p90: sorted[Math.floor(sorted.length * 0.9)]!,
    count: sorted.length,
  };
}

/**
 * Formats a currency value with compact notation for chart labels.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  lang: 'es' | 'en'
): string {
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  if (amount >= 1_000_000) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: 'compact',
    }).format(amount);
  }
  if (amount >= 1_000) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
