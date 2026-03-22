import React, { useState, useEffect, useCallback } from 'react';
import { getCompaniesWithMembers } from '@/lib/companies';
import { getMemberStatistics } from '@/lib/members';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import type { Company } from '@/types/company';

interface MemberShowcaseProps {
  lang?: 'es' | 'en';
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const t = translations[lang];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [companiesData, statsData] = await Promise.all([
        getCompaniesWithMembers(),
        getMemberStatistics(),
      ]);
      setCompanies(companiesData);
      setTotalMembers(statsData.totalMembers);
    } catch (err) {
      console.error('Error loading member showcase data:', err);
      setCompanies([]);
      setTotalMembers(0);
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

  if (companies.length === 0) {
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
        {companies.map((c) => {
          const href = c.website || (c.domain ? `https://${c.domain}` : null);
          const inner = (
            <>
              <CompanyLogo company={c} size="md" />
              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {c.name}
              </span>
            </>
          );
          return href ? (
            <a
              key={c.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
            >
              {inner}
            </a>
          ) : (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
            >
              {inner}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {t.footer(totalMembers)}
      </p>
    </div>
  );
};

export default MemberShowcase;
