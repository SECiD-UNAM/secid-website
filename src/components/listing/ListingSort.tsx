import React from 'react';
import type { SortConfig } from '@lib/listing/types';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

export interface SortOption {
  field: string;
  label: string;
}

interface ListingSortProps {
  sort: SortConfig;
  options: SortOption[];
  onSortChange: (sort: SortConfig) => void;
  lang?: ListingLang;
  className?: string;
}

export function ListingSort({
  sort,
  options,
  onSortChange,
  lang = 'es',
  className = '',
}: ListingSortProps) {
  const t = getListingTranslations(lang);

  if (options.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label
        htmlFor="listing-sort"
        className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
      >
        {t.sort.label}
      </label>
      <select
        id="listing-sort"
        value={sort.field}
        onChange={(e) => onSortChange({ ...sort, field: e.target.value })}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
      >
        {options.map((opt) => (
          <option key={opt.field} value={opt.field}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() =>
          onSortChange({
            ...sort,
            direction: sort.direction === 'asc' ? 'desc' : 'asc',
          })
        }
        className="rounded-md border border-gray-300 p-1.5 text-gray-500 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400"
        aria-label={sort.direction === 'asc' ? t.sort.desc : t.sort.asc}
      >
        {sort.direction === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}
