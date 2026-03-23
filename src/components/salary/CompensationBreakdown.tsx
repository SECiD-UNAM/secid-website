/**
 * CompensationBreakdown — Donut chart showing average compensation
 * composition: Base Salary vs Bonus vs Stock vs Sign-On.
 * Only renders if at least some entries have non-base compensation.
 */
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SalaryDataPoint } from './SalaryInsights';

interface Props {
  dataPoints: SalaryDataPoint[];
  lang?: 'es' | 'en';
}

interface BreakdownSlice {
  name: string;
  value: number;
  color: string;
}

const COLORS = {
  base: '#3B82F6',   // blue-500
  bonus: '#10B981',  // emerald-500
  stock: '#F59E0B',  // amber-500
  signOn: '#A855F7', // purple-500
};

function buildBreakdown(
  dataPoints: SalaryDataPoint[],
  lang: 'es' | 'en'
): BreakdownSlice[] | null {
  if (dataPoints.length === 0) return null;

  const totals = dataPoints.reduce(
    (acc, dp) => {
      acc.base += dp.monthlyGross * 12;
      acc.bonus += dp.annualBonus;
      acc.stock += dp.stockValue;
      acc.signOn += dp.signOnBonus;
      return acc;
    },
    { base: 0, bonus: 0, stock: 0, signOn: 0 }
  );

  const hasNonBase = totals.bonus > 0 || totals.stock > 0 || totals.signOn > 0;
  if (!hasNonBase) return null;

  const labels =
    lang === 'es'
      ? { base: 'Salario Base', bonus: 'Bono', stock: 'Stock', signOn: 'Sign-On' }
      : { base: 'Base Salary', bonus: 'Bonus', stock: 'Stock', signOn: 'Sign-On' };

  const slices: BreakdownSlice[] = [
    { name: labels.base, value: Math.round(totals.base), color: COLORS.base },
  ];
  if (totals.bonus > 0)
    slices.push({ name: labels.bonus, value: Math.round(totals.bonus), color: COLORS.bonus });
  if (totals.stock > 0)
    slices.push({ name: labels.stock, value: Math.round(totals.stock), color: COLORS.stock });
  if (totals.signOn > 0)
    slices.push({ name: labels.signOn, value: Math.round(totals.signOn), color: COLORS.signOn });

  return slices;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: BreakdownSlice;
}

function CustomTooltip({
  active,
  payload,
  total,
  lang,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  total: number;
  lang: 'es' | 'en';
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0]!;
  const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
  return (
    <div className="rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg">
      <p className="text-sm font-semibold">{slice.name}</p>
      <p className="text-sm">{pct}%</p>
    </div>
  );
}

export function CompensationBreakdown({ dataPoints, lang = 'es' }: Props) {
  const slices = buildBreakdown(dataPoints, lang);

  const noDataLabel =
    lang === 'es'
      ? 'Solo hay datos de salario base. Agrega bonos o stock para ver la composición.'
      : 'Only base salary data available. Add bonuses or stock to see the breakdown.';

  if (!slices) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">{noDataLabel}</p>
    );
  }

  const total = slices.reduce((s, sl) => s + sl.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            dataKey="value"
            strokeWidth={0}
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            content={
              <CustomTooltip
                total={total}
                lang={lang}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {slices.map((slice) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <div key={slice.name} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {slice.name}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
