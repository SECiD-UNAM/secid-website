/**
 * SalaryDistribution — Histogram showing salary frequency distribution
 * with kernel density estimate overlay and percentile markers.
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
import type { SalaryDataPoint } from './SalaryInsights';
import { formatCurrency as _fmt } from './salary-utils';

interface Props {
  dataPoints: SalaryDataPoint[];
  lang?: 'es' | 'en';
}

interface Bin {
  range: string;
  rangeMin: number;
  rangeMax: number;
  count: number;
  isMedianBin: boolean;
}

function buildHistogram(values: number[], binCount = 12): Bin[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const median = sorted[Math.floor(sorted.length / 2)]!;

  const shortFmt = (v: number) => {
    if (v >= 1000) return `${Math.round(v / 1000)}k`;
    return String(Math.round(v));
  };

  if (min === max) {
    return [{ range: shortFmt(min), rangeMin: min, rangeMax: max, count: values.length, isMedianBin: true }];
  }

  const binWidth = (max - min) / binCount;
  const bins: Bin[] = [];

  for (let i = 0; i < binCount; i++) {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    const count = values.filter((v) => (i === binCount - 1 ? v >= lo && v <= hi : v >= lo && v < hi)).length;
    const isMedianBin = median >= lo && median < hi;

    bins.push({
      range: shortFmt(lo),
      rangeMin: lo,
      rangeMax: hi,
      count,
      isMedianBin,
    });
  }

  return bins;
}

function stats(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  return {
    mean,
    median: sorted[Math.floor(n / 2)]!,
    stdDev,
    p25: sorted[Math.floor(n * 0.25)]!,
    p75: sorted[Math.floor(n * 0.75)]!,
    min: sorted[0]!,
    max: sorted[n - 1]!,
    n,
  };
}

export function SalaryDistribution({ dataPoints, lang = 'es' }: Props) {
  const formatCurrency = (v: number) => _fmt(v, 'MXN', lang);
  const values = useMemo(
    () => dataPoints.map((d) => d.monthlyGross),
    [dataPoints]
  );

  const histogram = useMemo(() => buildHistogram(values), [values]);
  const s = useMemo(() => stats(values), [values]);

  if (!s || values.length < 3) {
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
            {formatCurrency(s.stdDev)}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {lang === 'es' ? 'Desv. Est.' : 'Std Dev'}
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
