import React, { useState, useEffect, useCallback } from 'react';
import { getMemberStatistics } from '@/lib/members';
import type { MemberStatisticsData } from '@/types/member';

interface MemberShowcaseProps {
  lang?: 'es' | 'en';
}

const COMPANY_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
  '#E11D48',
  '#0EA5E9',
  '#A855F7',
  '#22C55E',
  '#D946EF',
];

function getCompanyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length] ?? '#3B82F6';
}

function getCompanyInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

const translations = {
  es: {
    title: '¿Dónde trabajan los miembros de SECiD?',
    footer: (count: number) =>
      `¡Contamos con ${count} miembros y vamos por más!`,
    noData: 'No hay datos disponibles',
    retry: 'Reintentar',
    loading: 'Cargando...',
  },
  en: {
    title: 'Where do SECiD members work?',
    footer: (count: number) => `We have ${count} members and counting!`,
    noData: 'No data available',
    retry: 'Retry',
    loading: 'Loading...',
  },
};

export const MemberShowcase: React.FC<MemberShowcaseProps> = ({
  lang = 'es',
}) => {
  const [data, setData] = useState<MemberStatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = translations[lang];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await getMemberStatistics();
      setData(stats);
    } catch (err) {
      console.error('Error loading member showcase data:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t.loading}
        </span>
      </div>
    );
  }

  if (!data || data.companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t.noData}</p>
        <button
          onClick={loadData}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {t.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
        {t.title}
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.companies.map((company) => {
          const color = getCompanyColor(company.name);
          return (
            <div
              key={company.name}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {getCompanyInitial(company.name)}
              </div>
              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {company.name}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {t.footer(data.totalMembers)}
      </p>
    </div>
  );
};

export default MemberShowcase;
