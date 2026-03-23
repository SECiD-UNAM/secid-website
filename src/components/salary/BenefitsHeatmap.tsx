/**
 * BenefitsHeatmap — Horizontal percentage bars showing how common
 * each benefit is across all data points. Sorted by frequency descending.
 */
import React from 'react';

export interface BenefitRow {
  name: string;
  count: number;
  percentage: number;
}

interface Props {
  benefits: BenefitRow[];
  lang?: 'es' | 'en';
}

function getBarColor(percentage: number): string {
  if (percentage >= 75) return '#3B82F6'; // blue-500
  if (percentage >= 50) return '#6366F1'; // indigo-500
  if (percentage >= 25) return '#8B5CF6'; // violet-500
  return '#A78BFA';                        // violet-400
}

export function BenefitsHeatmap({ benefits, lang = 'es' }: Props) {
  const t = {
    noData:
      lang === 'es'
        ? 'No hay datos de beneficios registrados.'
        : 'No benefits data recorded.',
    ofMembers: lang === 'es' ? 'de miembros' : 'of members',
    count: lang === 'es' ? 'respuestas' : 'responses',
  };

  if (benefits.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">{t.noData}</p>
    );
  }

  return (
    <div className="space-y-3">
      {benefits.map((entry) => (
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
