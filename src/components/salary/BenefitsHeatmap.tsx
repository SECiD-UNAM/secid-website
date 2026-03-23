/**
 * BenefitsHeatmap — Horizontal percentage bars showing how common
 * each benefit is across all data points. Sorted by frequency descending.
 */
import React from 'react';
import type { SalaryDataPoint } from './SalaryInsights';

interface Props {
  dataPoints: SalaryDataPoint[];
  lang?: 'es' | 'en';
}

interface BenefitEntry {
  name: string;
  count: number;
  percentage: number;
}

function buildBenefitEntries(dataPoints: SalaryDataPoint[]): BenefitEntry[] {
  const total = dataPoints.length;
  if (total === 0) return [];

  const counts = new Map<string, number>();
  for (const dp of dataPoints) {
    for (const benefit of dp.benefits) {
      const key = benefit.trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

function getBarColor(percentage: number): string {
  if (percentage >= 75) return '#3B82F6'; // blue-500
  if (percentage >= 50) return '#6366F1'; // indigo-500
  if (percentage >= 25) return '#8B5CF6'; // violet-500
  return '#A78BFA';                        // violet-400
}

export function BenefitsHeatmap({ dataPoints, lang = 'es' }: Props) {
  const entries = buildBenefitEntries(dataPoints);

  const t = {
    noData:
      lang === 'es'
        ? 'No hay datos de beneficios registrados.'
        : 'No benefits data recorded.',
    ofMembers: lang === 'es' ? 'de miembros' : 'of members',
    count: lang === 'es' ? 'respuestas' : 'responses',
  };

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">{t.noData}</p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.name}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {entry.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {entry.percentage}%{' '}
              <span className="text-gray-400 dark:text-gray-500">
                ({entry.count} {t.count})
              </span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${entry.percentage}%`,
                backgroundColor: getBarColor(entry.percentage),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
