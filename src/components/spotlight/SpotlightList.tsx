import React, { useState, useEffect } from 'react';
import { getSpotlights } from '@/lib/spotlights';
import SpotlightCard from './SpotlightCard';
import type { AlumniSpotlight } from '@/types/spotlight';

interface SpotlightListProps {
  lang?: 'es' | 'en';
}

export default function SpotlightList({ lang = 'es' }: SpotlightListProps) {
  const [spotlights, setSpotlights] = useState<AlumniSpotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getSpotlights()
      .then((data) => {
        setSpotlights(data);
      })
      .catch((err) => {
        setError(err.message || 'Error loading spotlights');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? spotlights.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.company.toLowerCase().includes(search.toLowerCase())
      )
    : spotlights;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800/40 dark:bg-red-900/10">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'es' ? 'Buscar...' : 'Search...'}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((spotlight) => (
            <SpotlightCard key={spotlight.id} spotlight={spotlight} lang={lang} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {search
              ? lang === 'es'
                ? 'No se encontraron resultados.'
                : 'No results found.'
              : lang === 'es'
                ? 'No hay historias disponibles.'
                : 'No stories available.'}
          </p>
        </div>
      )}
    </div>
  );
}
