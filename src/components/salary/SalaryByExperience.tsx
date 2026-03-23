/**
 * SalaryByExperience — Horizontal bar chart showing median monthly gross
 * salary by experience level (junior → executive).
 * Groups with fewer than 3 data points are hidden (privacy rule).
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SalaryDataPoint } from './SalaryInsights';
import { safeAggregate } from './salary-utils';

interface Props {
  dataPoints: SalaryDataPoint[];
  lang?: 'es' | 'en';
}

const EXPERIENCE_ORDER = ['junior', 'mid', 'senior', 'lead', 'executive'];

// Gradient from blue (junior) to orange (executive)
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

interface ChartEntry {
  level: string;
  label: string;
  median: number;
  count: number;
  color: string;
}

function buildChartData(
  dataPoints: SalaryDataPoint[],
  lang: 'es' | 'en'
): ChartEntry[] {
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
    return [
      {
        level,
        label: labels[level] ?? level,
        median: stats.median,
        count: stats.count,
        color: LEVEL_COLORS[level] ?? '#8B5CF6',
      },
    ];
  });
}

interface TooltipPayload {
  payload: ChartEntry;
}

function CustomTooltip({
  active,
  payload,
  lang,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  lang: 'es' | 'en';
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]!.payload;
  const countLabel = lang === 'es' ? 'muestras' : 'samples';
  return (
    <div className="rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg">
      <p className="text-sm font-semibold">{entry.label}</p>
      <p className="text-sm">
        {new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(entry.median)}
        {lang === 'es' ? '/mes' : '/mo'}
      </p>
      <p className="text-xs text-gray-400">
        {entry.count} {countLabel}
      </p>
    </div>
  );
}

export function SalaryByExperience({ dataPoints, lang = 'es' }: Props) {
  const chartData = buildChartData(dataPoints, lang);
  const noDataLabel =
    lang === 'es'
      ? 'No hay suficientes datos por nivel.'
      : 'Not enough data by level.';

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">{noDataLabel}</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={chartData.length * 52 + 20}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 0, right: 16, bottom: 0, left: 64 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="rgba(107,114,128,0.2)"
        />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary, #9CA3AF)' }}
          tickFormatter={(v: number) =>
            new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US', {
              notation: 'compact',
              maximumFractionDigits: 0,
            }).format(v)
          }
        />
        <YAxis
          type="category"
          dataKey="label"
          width={60}
          tick={{ fontSize: 12, fill: 'var(--color-text-primary, #374151)' }}
        />
        <Tooltip
          content={
            <CustomTooltip lang={lang} />
          }
          cursor={{ fill: 'rgba(99,102,241,0.08)' }}
        />
        <Bar dataKey="median" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.level} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
