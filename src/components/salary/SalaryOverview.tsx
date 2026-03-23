/**
 * SalaryOverview — Four stat cards: median gross, median total comp,
 * data point count, and contributor count.
 */
import React from 'react';
import type { SalaryDataPoint } from './SalaryInsights';
import { safeAggregate } from './salary-utils';

interface Props {
  dataPoints: SalaryDataPoint[];
  lang?: 'es' | 'en';
}

interface StatCard {
  label: string;
  value: string;
  subLabel?: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function formatCompact(amount: number, currency: string, lang: 'es' | 'en'): string {
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact',
  } as Intl.NumberFormatOptions).format(amount);
}

function dominantCurrency(dataPoints: SalaryDataPoint[]): string {
  const counts = new Map<string, number>();
  for (const dp of dataPoints) {
    counts.set(dp.currency, (counts.get(dp.currency) ?? 0) + 1);
  }
  let top = 'MXN';
  let max = 0;
  for (const [currency, count] of counts) {
    if (count > max) {
      max = count;
      top = currency;
    }
  }
  return top;
}

export function SalaryOverview({ dataPoints, lang = 'es' }: Props) {
  const currency = dominantCurrency(dataPoints);
  const sameCurrency = dataPoints.filter((dp) => dp.currency === currency);

  const grossValues = sameCurrency.map((dp) => dp.monthlyGross);
  const totalCompValues = sameCurrency.map((dp) => dp.totalComp);
  const uniqueMembers = new Set(
    dataPoints.map((dp) => `${dp.experienceLevel}-${dp.industry}`)
  ).size;

  const grossStats = safeAggregate(grossValues);
  const totalCompStats = safeAggregate(totalCompValues);

  const medianGross = grossStats ? grossStats.median : median(grossValues);
  const medianTotal = totalCompStats ? totalCompStats.median : median(totalCompValues);

  const t = {
    medianGross: lang === 'es' ? 'Salario Bruto Mensual (Mediana)' : 'Median Monthly Gross',
    medianTotal: lang === 'es' ? 'Comp. Total Anual (Mediana)' : 'Median Annual Total Comp',
    dataPoints: lang === 'es' ? 'Puntos de Datos' : 'Data Points',
    contributors: lang === 'es' ? 'Perfiles con Datos' : 'Contributors',
    perMonth: lang === 'es' ? '/mes' : '/mo',
    perYear: lang === 'es' ? '/año' : '/yr',
  };

  const cards: StatCard[] = [
    {
      label: t.medianGross,
      value: formatCompact(medianGross, currency, lang),
      subLabel: t.perMonth,
    },
    {
      label: t.medianTotal,
      value: formatCompact(medianTotal, currency, lang),
      subLabel: t.perYear,
    },
    {
      label: t.dataPoints,
      value: dataPoints.length.toLocaleString(),
    },
    {
      label: t.contributors,
      value: uniqueMembers.toLocaleString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {card.value}
            {card.subLabel && (
              <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                {card.subLabel}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
