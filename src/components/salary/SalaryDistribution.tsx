/**
 * SalaryDistribution — Histogram showing salary frequency distribution
 * with median reference line and summary statistics.
 */
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { formatCurrency as _fmt } from './salary-utils';

export interface DistributionBin {
  rangeMin: number;
  rangeMax: number;
  count: number;
}

interface Props {
  distribution: DistributionBin[];
  lang?: 'es' | 'en';
}

interface Bin {
  range: string;
  rangeMin: number;
  rangeMax: number;
  count: number;
  isMedianBin: boolean;
}

function shortFmt(v: number): string {
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}

function buildDisplayBins(distribution: DistributionBin[]): Bin[] {
  if (distribution.length === 0) return [];

  const totalCount = distribution.reduce((s, d) => s + d.count, 0);
  let cumulative = 0;
  const halfTotal = totalCount / 2;
  let medianBinIndex = 0;

  for (let i = 0; i < distribution.length; i++) {
    cumulative += distribution[i]!.count;
    if (cumulative >= halfTotal) {
      medianBinIndex = i;
      break;
    }
  }

  return distribution.map((d, i) => ({
    range: shortFmt(d.rangeMin),
    rangeMin: d.rangeMin,
    rangeMax: d.rangeMax,
    count: d.count,
    isMedianBin: i === medianBinIndex,
  }));
}

function computeSummaryStats(distribution: DistributionBin[]): {
  mean: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  n: number;
} | null {
  const total = distribution.reduce((s, d) => s + d.count, 0);
  if (total < 3) return null;

  const allValues: number[] = [];
  for (const bin of distribution) {
    const midpoint = (bin.rangeMin + bin.rangeMax) / 2;
    for (let i = 0; i < bin.count; i++) {
      allValues.push(midpoint);
    }
  }

  allValues.sort((a, b) => a - b);
  const n = allValues.length;
  const mean = allValues.reduce((s, v) => s + v, 0) / n;
  const median = allValues[Math.floor(n / 2)]!;
  const p25 = allValues[Math.floor(n * 0.25)]!;
  const p75 = allValues[Math.floor(n * 0.75)]!;
  const min = allValues[0]!;
  const max = allValues[n - 1]!;

  return { mean, median, p25, p75, min, max, n: total };
}

export function SalaryDistribution({ distribution, lang = 'es' }: Props) {
  const formatCurrency = (v: number) => _fmt(v, 'MXN', lang);

  const histogram = useMemo(() => buildDisplayBins(distribution), [distribution]);
  const s = useMemo(() => computeSummaryStats(distribution), [distribution]);

  if (!s || s.n < 3) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {lang === 'es' ? 'Se necesitan al menos 3 datos.' : 'At least 3 data points needed.'}
      </p>
    );
  }

  const tooltipLabel = lang === 'es' ? 'personas' : 'people';

  return (
    <div>
      {/* Stats summary */}
      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {formatCurrency(s.mean)}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {lang === 'es' ? 'Media' : 'Mean'}
          </div>
        </div>
        <div>
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {formatCurrency(s.median)}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {lang === 'es' ? 'Mediana' : 'Median'}
          </div>
        </div>
        <div>
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {formatCurrency(s.max - s.min)}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {lang === 'es' ? 'Rango' : 'Range'}
          </div>
        </div>
        <div>
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {s.n}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            n
          </div>
        </div>
      </div>

      {/* Histogram */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={histogram} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="range"
            tick={{ fontSize: 9, fill: 'var(--color-text-secondary, #9CA3AF)' }}
            interval={1}
            angle={-35}
            textAnchor="end"
            height={40}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-text-secondary, #9CA3AF)' }}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload as Bin;
              return (
                <div className="rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg">
                  <p className="text-xs">
                    {formatCurrency(d.rangeMin)} – {formatCurrency(d.rangeMax)}
                  </p>
                  <p className="text-sm font-semibold">
                    {d.count} {tooltipLabel}
                  </p>
                </div>
              );
            }}
            cursor={{ fill: 'rgba(99,102,241,0.08)' }}
          />
          <ReferenceLine
            x={histogram.find((b) => b.isMedianBin)?.range}
            stroke="var(--secid-primary, #f65425)"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{
              value: lang === 'es' ? 'Mediana' : 'Median',
              position: 'top',
              fill: 'var(--secid-primary, #f65425)',
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {histogram.map((bin, i) => (
              <Cell
                key={i}
                fill={bin.isMedianBin ? 'var(--secid-primary, #f65425)' : '#6366F1'}
                opacity={bin.isMedianBin ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* IQR annotation */}
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-gray-400 dark:text-gray-500">
        <span>IQR: {formatCurrency(s.p25)} – {formatCurrency(s.p75)}</span>
        <span>{lang === 'es' ? 'Rango' : 'Range'}: {formatCurrency(s.min)} – {formatCurrency(s.max)}</span>
      </div>
    </div>
  );
}
