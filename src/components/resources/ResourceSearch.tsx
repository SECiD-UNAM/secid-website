import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * ResourceSearch Component
 * Advanced search and filtering interface for resources
 */

import type {
  ResourceSearchFilters,
  ResourceSearchSort,
  ResourceCategory,
  ResourceType,
  AccessLevel,
} from '@/types/resource';

interface ResourceSearchProps {
  onSearch: (filters: ResourceSearchFilters, sort: ResourceSearchSort) => void;
  initialFilters?: ResourceSearchFilters;
  initialSort?: ResourceSearchSort;
  loading?: boolean;
  resultCount?: number;
}

export default function ResourceSearch({
  onSearch,
  initialFilters = {},
  initialSort = { field: 'relevance', direction: 'desc' },
  loading = false,
  resultCount = 0,
}: ResourceSearchProps) {
  const t = useTranslations();
  const [filters, setFilters] = useState<ResourceSearchFilters>(initialFilters);
  const [sort, setSort] = useState<ResourceSearchSort>(initialSort);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.query || '');

  // Debounce search query
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update filters when debounced query changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, query: debouncedQuery }));
  }, [debouncedQuery]);

  // Trigger search when filters or sort change
  useEffect(() => {
    onSearch(filters, sort);
  }, [filters, sort, onSearch]);

  const handleFilterChange = useCallback(
    (key: keyof ResourceSearchFilters, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSortChange = useCallback((newSort: ResourceSearchSort) => {
    setSort(newSort);
  }, []);

  const clearFilters = useCallback(() => {
    const clearedFilters: ResourceSearchFilters = { query: searchQuery };
    setFilters(clearedFilters);
    setSort({ field: 'relevance', direction: 'desc' });
  }, [searchQuery]);

  const toggleCategory = (category: ResourceCategory) => {
    const current = filters.categories || [];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    handleFilterChange('categories', updated.length > 0 ? updated : undefined);
  };

  const toggleType = (type: ResourceType) => {
    const current = filters.types || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    handleFilterChange('types', updated.length > 0 ? updated : undefined);
  };

  const toggleAccessLevel = (level: AccessLevel) => {
    const current = filters.accessLevels || [];
    const updated = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    handleFilterChange(
      'accessLevels',
      updated.length > 0 ? updated : undefined
    );
  };

  const toggleDifficulty = (
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ) => {
    const current = filters.difficulties || [];
    const updated = current.includes(difficulty)
      ? current.filter((d) => d !== difficulty)
      : [...current, difficulty];
    handleFilterChange(
      'difficulties',
      updated.length > 0 ? updated : undefined
    );
  };

  const categories: ResourceCategory[] = [
    'tutorials',
    'templates',
    'tools',
    'books',
    'courses',
    'datasets',
    'research',
    'documentation',
  ];

  const types: ResourceType[] = [
    'pdf',
    'excel',
    'jupyter',
    'python',
    'r',
    'sql',
    'csv',
    'json',
    'video',
    'audio',
    'image',
    'zip',
    'link',
  ];

  const accessLevels: AccessLevel[] = [
    'free',
    'premium',
    'member',
    'restricted',
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const hasActiveFilters = Object.keys(filters).some((key) => {
    const value = filters[key as keyof ResourceSearchFilters];
    return (
      key !== 'query' &&
      value !== undefined &&
      (Array.isArray(value) ? value.length > 0 : true)
    );
  });

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
      {/* Main Search Bar */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={
              t?.resources?.searchPlaceholder || 'Search resources...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-3 top-2.5">
            <svg
              className="h-5 w-5 text-gray-400"
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
          </div>
          {loading && (
            <div className="absolute right-3 top-2.5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`rounded-lg border px-4 py-2 transition-colors ${
            showAdvanced || hasActiveFilters
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {t?.resources?.advancedSearch || 'Advanced'}
        </button>
      </div>

      {/* Sort and Results Count */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t?.resources?.sortBy || 'Sort by'}:
          </span>
          <select
            value={`${sort.field}-${sort.direction}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              handleSortChange({
                field: field as ResourceSearchSort['field'],
                direction: direction as 'asc' | 'desc',
              });
            }}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
          >
            <option value="relevance-desc">
              {t?.resources?.sortOptions?.relevance || 'Relevance'}
            </option>
            <option value="date-desc">
              {t?.resources?.sortOptions?.newest || 'Newest'}
            </option>
            <option value="date-asc">
              {t?.resources?.sortOptions?.oldest || 'Oldest'}
            </option>
            <option value="downloads-desc">
              {t?.resources?.sortOptions?.mostDownloaded || 'Most Downloaded'}
            </option>
            <option value="rating-desc">
              {t?.resources?.sortOptions?.highestRated || 'Highest Rated'}
            </option>
            <option value="title-asc">
              {t?.resources?.sortOptions?.alphabetical || 'A-Z'}
            </option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          {resultCount > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {resultCount} {t?.resources?.results || 'results'}
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {t?.common?.clearFilters || 'Clear filters'}
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Categories */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t?.resources?.categories?.title || 'Categories'}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    filters?.categories?.includes(category)
                      ? 'border-blue-300 bg-blue-100 text-blue-700'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {t?.resources?.categories?.[category] || category}
                </button>
              ))}
            </div>
          </div>

          {/* File Types */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t?.resources?.fileTypes || 'File Types'}
            </label>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    filters?.types?.includes(type)
                      ? 'border-green-300 bg-green-100 text-green-700'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Access Levels */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t?.resources?.accessLevel || 'Access Level'}
            </label>
            <div className="flex flex-wrap gap-2">
              {accessLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleAccessLevel(level)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    filters?.accessLevels?.includes(level)
                      ? 'border-purple-300 bg-purple-100 text-purple-700'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {t?.resources?.accessLevels?.[level] || level}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t?.resources?.difficulty?.title || 'Difficulty'}
            </label>
            <div className="flex flex-wrap gap-2">
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => toggleDifficulty(difficulty as any)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    filters?.difficulties?.includes(difficulty as any)
                      ? 'border-yellow-300 bg-yellow-100 text-yellow-700'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {t?.resources?.difficulty?.[difficulty] || difficulty}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Filters Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Language */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t?.resources?.language || 'Language'}
              </label>
              <select
                value={filters.languages?.[0] || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'languages',
                    e.target.value ? [e.target.value] : undefined
                  )
                }
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="">{t?.common?.all || 'All'}</option>
                <option value="es">{t?.languages?.spanish || 'Spanish'}</option>
                <option value="en">{t?.languages?.english || 'English'}</option>
                <option value="both">
                  {t?.resources?.bilingual || 'Bilingual'}
                </option>
              </select>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t?.resources?.minimumRating || 'Minimum Rating'}
              </label>
              <select
                value={filters.ratingMin || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'ratingMin',
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="">{t?.common?.any || 'Any'}</option>
                <option value="4">4+ ⭐⭐⭐⭐</option>
                <option value="3">3+ ⭐⭐⭐</option>
                <option value="2">2+ ⭐⭐</option>
                <option value="1">1+ ⭐</option>
              </select>
            </div>

            {/* Has Preview */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t?.resources?.preview || 'Preview'}
              </label>
              <select
                value={filters?.hasPreview?.toString() || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'hasPreview',
                    e.target.value === ''
                      ? undefined
                      : e.target.value === 'true'
                  )
                }
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="">{t?.common?.all || 'All'}</option>
                <option value="true">
                  {t?.resources?.withPreview || 'With Preview'}
                </option>
                <option value="false">
                  {t?.resources?.withoutPreview || 'Without Preview'}
                </option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t?.resources?.dateRange || 'Date Range'}
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  {t?.common?.from || 'From'}
                </label>
                <input
                  type="date"
                  value={
                    filters?.dateRange?.start
                      ? filters.dateRange.start.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value)
                      : undefined;
                    handleFilterChange(
                      'dateRange',
                      date
                        ? {
                            ...filters.dateRange,
                            start: date,
                          }
                        : undefined
                    );
                  }}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  {t?.common?.to || 'To'}
                </label>
                <input
                  type="date"
                  value={
                    filters?.dateRange?.end
                      ? filters.dateRange.end.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value)
                      : undefined;
                    handleFilterChange(
                      'dateRange',
                      date
                        ? {
                            ...filters.dateRange,
                            end: date,
                          }
                        : undefined
                    );
                  }}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
