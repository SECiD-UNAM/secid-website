/**
 * SalaryByIndustry — Horizontal bar chart showing median monthly gross
 * salary per industry. Groups with fewer than 3 data points are hidden
 * (enforced server-side by the CF).
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
import { translateIndustry } from '@/lib/companies/industry-i18n';

export interface IndustryRow {
  industry: string;
  median: number;
  count: number;
}

interface Props {
  byIndustry: IndustryRow[];
  lang?: 'es' | 'en';
}

const INDUSTRY_COLORS: Record<string, string> = {
  'Tecnología': '#3B82F6',
  'Technology': '#3B82F6',
  'Finanzas': '#10B981',
  'Finance': '#10B981',
  'Fintech': '#06B6D4',
  'Retail': '#F59E0B',
  'Consultoría': '#EF4444',
  'Consulting': '#EF4444',
  'Gobierno': '#F97316',
  'Government': '#F97316',
  'Entretenimiento': '#A855F7',
  'Entertainment': '#A855F7',
  'Consumo': '#EC4899',
  'Consumer Goods': '#EC4899',
  'Educación': '#6366F1',
  'Education': '#6366F1',
  'Datos': '#14B8A6',
  'Data': '#14B8A6',
  'Salud': '#84CC16',
  'Healthcare': '#84CC16',
};

function getIndustryColor(industry: string): string {
  return INDUSTRY_COLORS[industry] ?? '#8B5CF6';
}

interface ChartEntry {
  industryKey: string;
  label: string;
  median: number;
  count: number;
  color: string;
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

export function SalaryByIndustry({ byIndustry, lang = 'es' }: Props) {
  const chartData: ChartEntry[] = byIndustry.map((row) => {
    const label = translateIndustry(row.industry, lang);
    return {
      industryKey: row.industry,
      label,
      median: row.median,
      count: row.count,
      color: getIndustryColor(label),
    };
  }).sort((a, b) => b.median - a.median);

  const noDataLabel =
    lang === 'es'
      ? 'No hay suficientes datos por industria.'
      : 'Not enough data by industry.';

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
        margin={{ top: 0, right: 16, bottom: 0, left: 80 }}
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
          width={76}
          tick={{ fontSize: 11, fill: 'var(--color-text-primary, #374151)' }}
        />
        <Tooltip
          content={<CustomTooltip lang={lang} />}
          cursor={{ fill: 'rgba(99,102,241,0.08)' }}
        />
        <Bar dataKey="median" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.industryKey} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
