import React from 'react';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingEmptyProps {
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  title?: string;
  description?: string;
  lang?: ListingLang;
  className?: string;
}

export function ListingEmpty({
  onClearFilters,
  hasActiveFilters = false,
  title,
  description,
  lang = 'es',
  className = '',
}: ListingEmptyProps) {
  const t = getListingTranslations(lang);

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
    >
      <svg
        className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-gray-100">
        {title ?? t.empty.title}
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {description ?? t.empty.description}
      </p>
      {hasActiveFilters && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          {t.empty.clearFilters}
        </button>
      )}
    </div>
  );
}
