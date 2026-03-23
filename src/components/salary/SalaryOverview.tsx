/**
 * SalaryOverview — Four stat cards: median gross, median total comp,
 * data point count, and contributor count.
 */
import React from 'react';

export interface OverviewStats {
  medianMonthlyGross: number;
  medianTotalComp: number;
  dataPointCount: number;
  contributorCount: number;
}

interface Props {
  overview: OverviewStats;
  lang?: 'es' | 'en';
}

interface StatCard {
  label: string;
  value: string;
  subLabel?: string;
}

function formatCompact(amount: number, lang: 'es' | 'en'): string {
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact',
  } as Intl.NumberFormatOptions).format(amount);
}

export function SalaryOverview({ overview, lang = 'es' }: Props) {
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
      value: formatCompact(overview.medianMonthlyGross, lang),
      subLabel: t.perMonth,
    },
    {
      label: t.medianTotal,
      value: formatCompact(overview.medianTotalComp, lang),
      subLabel: t.perYear,
    },
    {
      label: t.dataPoints,
      value: overview.dataPointCount.toLocaleString(),
    },
    {
      label: t.contributors,
      value: overview.contributorCount.toLocaleString(),
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
