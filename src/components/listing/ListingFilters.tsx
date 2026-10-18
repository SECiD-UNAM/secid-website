import React, { useState } from 'react';
import type { FilterDefinition } from '@lib/listing/types';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingFiltersProps {
  definitions: FilterDefinition[];
  activeFilters: Record<string, unknown>;
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
  filterMode?: 'collapsible' | 'visible' | 'drawer';
  lang?: ListingLang;
  className?: string;
}

export function ListingFilters({
  definitions,
  activeFilters,
  onFilterChange,
  onClearAll,
  filterMode = 'collapsible',
  lang = 'es',
  className = '',
}: ListingFiltersProps) {
  const t = getListingTranslations(lang);
  const [isOpen, setIsOpen] = useState(filterMode === 'visible');

  const activeCount = Object.values(activeFilters).filter(
    (v) =>
      v !== undefined &&
      v !== null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0)
  ).length;

  if (definitions.length === 0) return null;

  const filterPanel = (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {definitions.map((def) => (
        <div key={def.key}>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {def.label}
          </label>
          {renderFilterInput(def, activeFilters[def.key], (val) =>
            onFilterChange(def.key, val)
          )}
        </div>
      ))}
      {activeCount > 0 && (
        <div className="flex items-end">
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            {t.filters.clearAll}
          </button>
        </div>
      )}
    </div>
  );

  if (filterMode === 'visible') {
    return <div className={className}>{filterPanel}</div>;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-expanded={isOpen}
        aria-controls="listing-filters-panel"
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
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {isOpen ? t.filters.hideFilters : t.filters.showFilters}
        {activeCount > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
            {activeCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          id="listing-filters-panel"
          className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          {filterPanel}
        </div>
      )}
    </div>
  );
}

function renderFilterInput(
  def: FilterDefinition,
  value: unknown,
  onChange: (val: unknown) => void
) {
  switch (def.type) {
    case 'select':
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">{def.placeholder ?? '—'}</option>
          {def.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'multiselect':
      return (
        <div className="flex flex-wrap gap-2">
          {def.options?.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const current = (
                    Array.isArray(value) ? value : []
                  ) as string[];
                  onChange(
                    selected
                      ? current.filter((v) => v !== opt.value)
                      : [...current, opt.value]
                  );
                }}
                className={`rounded-full border px-2 py-1 text-xs ${
                  selected
                    ? 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );

    case 'toggle':
      return (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked || undefined)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {def.label}
          </span>
        </label>
      );

    default:
      return null;
  }
}
