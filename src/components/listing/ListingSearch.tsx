import React from 'react';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  lang?: ListingLang;
  totalCount?: number;
  className?: string;
}

export function ListingSearch({
  query,
  onQueryChange,
  lang = 'es',
  totalCount,
  className = '',
}: ListingSearchProps) {
  const t = getListingTranslations(lang);

  return (
    <div role="search" className={`relative w-full ${className}`}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          role="searchbox"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t.search.placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          aria-label={t.search.placeholder}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={t.search.clearLabel}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      {totalCount !== undefined && (
        <div className="mt-1 text-sm text-gray-500" aria-live="polite">
          {t.search.resultsCount(totalCount)}
        </div>
      )}
    </div>
  );
}
