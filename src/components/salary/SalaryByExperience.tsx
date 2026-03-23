/**
 * SalaryByExperience — Box plot showing salary distribution by experience level.
 * Shows p10, p25, median, p75, p90 as box-and-whisker for each level.
 * Groups with fewer than 3 data points are hidden (privacy rule).
 */
import React from 'react';
import type { SalaryDataPoint } from './SalaryInsights';
import { safeAggregate, formatCurrency as _fmt } from './salary-utils';

interface Props {
  dataPoints: SalaryDataPoint[];
  lang?: 'es' | 'en';
}

const EXPERIENCE_ORDER = ['junior', 'mid', 'senior', 'lead', 'executive'];

const LEVEL_COLORS: Record<string, string> = {
  junior: '#3B82F6',
  mid: '#6366F1',
  senior: '#8B5CF6',
  lead: '#F59E0B',
  executive: '#F97316',
};

const LEVEL_LABELS_ES: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  executive: 'Ejecutivo',
};

const LEVEL_LABELS_EN: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  executive: 'Executive',
};

interface BoxPlotData {
  level: string;
  label: string;
  color: string;
  count: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)]!;
}

function buildBoxPlotData(
  dataPoints: SalaryDataPoint[],
  lang: 'es' | 'en'
): BoxPlotData[] {
  const labels = lang === 'es' ? LEVEL_LABELS_ES : LEVEL_LABELS_EN;
  const grouped = new Map<string, number[]>();

  for (const dp of dataPoints) {
    const level = dp.experienceLevel;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level)!.push(dp.monthlyGross);
  }

  return EXPERIENCE_ORDER.flatMap((level) => {
    const values = grouped.get(level) ?? [];
    const stats = safeAggregate(values);
    if (!stats) return [];

    const sorted = [...values].sort((a, b) => a - b);
    return [{
      level,
      label: labels[level] ?? level,
      color: LEVEL_COLORS[level] ?? '#8B5CF6',
      count: stats.count,
      p10: percentile(sorted, 0.1),
      p25: percentile(sorted, 0.25),
      median: stats.median,
      p75: percentile(sorted, 0.75),
      p90: percentile(sorted, 0.9),
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
    }];
  });
}

export function SalaryByExperience({ dataPoints, lang = 'es' }: Props) {
  const fmt = (v: number) => _fmt(v, 'MXN', lang);
  const boxData = buildBoxPlotData(dataPoints, lang);

  if (boxData.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {lang === 'es' ? 'No hay suficientes datos por nivel.' : 'Not enough data by level.'}
      </p>
    );
  }

  // Determine scale
  const allMax = Math.max(...boxData.map((d) => d.p90));
  const scale = (v: number) => (v / allMax) * 100;

  return (
    <div className="space-y-4">
      {boxData.map((d) => (
        <div key={d.level}>
          {/* Label row */}
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{d.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">n={d.count}</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: d.color }}>
              {fmt(d.median)}
            </span>
          </div>

          {/* Box plot */}
          <div className="relative h-8" style={{ marginLeft: `${scale(d.p10)}%`, width: `${scale(d.p90) - scale(d.p10)}%` }}>
            {/* Whisker line (p10 to p90) */}
            <div
              className="absolute top-1/2 h-px -translate-y-1/2"
              style={{
                left: 0,
                right: 0,
                background: d.color,
                opacity: 0.4,
              }}
            />

            {/* Whisker caps */}
            <div
              className="absolute top-1/2 w-px -translate-y-1/2"
              style={{ left: 0, height: 16, marginTop: -8, background: d.color, opacity: 0.6 }}
            />
            <div
              className="absolute top-1/2 w-px -translate-y-1/2"
              style={{ right: 0, height: 16, marginTop: -8, background: d.color, opacity: 0.6 }}
            />

            {/* Box (p25 to p75) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded"
              style={{
                left: `${((d.p25 - d.p10) / (d.p90 - d.p10)) * 100}%`,
                width: `${((d.p75 - d.p25) / (d.p90 - d.p10)) * 100}%`,
                height: 24,
                background: d.color,
                opacity: 0.25,
                border: `2px solid ${d.color}`,
              }}
            />

            {/* Median line */}
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{
                left: `${((d.median - d.p10) / (d.p90 - d.p10)) * 100}%`,
                width: 3,
                height: 24,
                background: d.color,
                borderRadius: 2,
              }}
            />
          </div>

          {/* Scale labels */}
          <div className="mt-0.5 flex justify-between text-[10px] text-gray-400 dark:text-gray-500" style={{ marginLeft: `${scale(d.p10)}%`, width: `${scale(d.p90) - scale(d.p10)}%` }}>
            <span>P10: {fmt(d.p10)}</span>
            <span>P90: {fmt(d.p90)}</span>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-3 text-[10px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded border-2 border-gray-400 bg-gray-400/25" />
          {lang === 'es' ? 'P25–P75 (rango intercuartil)' : 'P25–P75 (interquartile range)'}
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-1 rounded bg-gray-400" />
          {lang === 'es' ? 'Mediana' : 'Median'}
        </span>
        <span className="flex items-center gap-1">
          <div className="h-px w-4 bg-gray-400 opacity-40" />
          {lang === 'es' ? 'P10–P90' : 'P10–P90'}
        </span>
      </div>
    </div>
  );
}
