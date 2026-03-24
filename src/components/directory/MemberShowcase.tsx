import React, { useState, useEffect, useCallback } from 'react';
import { getCompanies } from '@/lib/companies';
import { EcosystemMap } from '@/components/shared/EcosystemMap';
import type { Company } from '@/types/company';

interface MemberShowcaseProps {
  lang?: 'es' | 'en';
}

export const MemberShowcase: React.FC<MemberShowcaseProps> = ({ lang = 'es' }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getCompanies();
      const approved = data
        .filter((c) => !c.pendingReview)
        .sort((a, b) => b.memberCount - a.memberCount);
      setCompanies(approved);
    } catch (err) {
      console.error('Error loading ecosystem data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Error al cargar datos' : 'Error loading data'}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {lang === 'es' ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'No hay datos disponibles' : 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  return <EcosystemMap companies={companies} lang={lang} />;
};

export default MemberShowcase;
