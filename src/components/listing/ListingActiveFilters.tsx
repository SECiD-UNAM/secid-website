import React from 'react';
import type { FilterDefinition } from '@lib/listing/types';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingActiveFiltersProps {
  definitions: FilterDefinition[];
  activeFilters: Record<string, unknown>;
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
  lang?: ListingLang;
  className?: string;
}

export function ListingActiveFilters({
  definitions,
  activeFilters,
  onFilterChange,
  onClearAll,
  lang = 'es',
  className = '',
}: ListingActiveFiltersProps) {
  const t = getListingTranslations(lang);
  const activePairs = Object.entries(activeFilters).filter(
    ([, v]) =>
      v !== undefined &&
      v !== null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0)
  );

  if (activePairs.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {activePairs.map(([key, value]) => {
        const def = definitions.find((d) => d.key === key);
        const label = def?.label ?? key;
        const displayValue = Array.isArray(value)
          ? value.join(', ')
          : String(value);

        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          >
            <span className="font-medium">{label}:</span> {displayValue}
            <button
              type="button"
              onClick={() => onFilterChange(key, undefined)}
              className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
              aria-label={`Remove ${label} filter`}
            >
              &times;
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400"
      >
        {t.filters.clearAll}
      </button>
    </div>
  );
}
