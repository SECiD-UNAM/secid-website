import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { useTranslations } from '@/hooks/useTranslations';
import ResourceCard from './ResourceCard';
import ResourceDetail from './ResourceDetail';
import ResourceUpload from './ResourceUpload';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import {
  ListingSearch,
  ListingFilters,
  ListingViewToggle,
  ListingPagination,
  ListingEmpty,
  ListingLoading,
} from '@components/listing';

/**
 * ResourceLibrary Component
 * Main library interface with categories, search, and resource management.
 * Migrated to useUniversalListing for search, filtering, and pagination.
 */

import {
  searchResources,
  getResourceStats,
  getUserBookmarks,
} from '@/lib/resources';
import type {
  Resource,
  ResourceCategory,
  ResourceStats,
} from '@/types/resource';
import type { FilterDefinition, ViewMode } from '@lib/listing/types';

interface ResourceLibraryProps {
  initialCategory?: ResourceCategory;
  compactView?: boolean;
  lang?: 'es' | 'en';
}

const PAGE_SIZE = 12;
const COMPACT_PAGE_SIZE = 6;

const CATEGORY_OPTIONS: ResourceCategory[] = [
  'tutorials',
  'templates',
  'tools',
  'books',
  'courses',
  'datasets',
  'research',
  'documentation',
];

const TYPE_OPTIONS = [
  'pdf', 'excel', 'jupyter', 'python', 'r', 'sql',
  'csv', 'json', 'video', 'audio', 'image', 'zip', 'link',
] as const;

const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;

function buildFilterDefinitions(t: ReturnType<typeof useTranslations>): FilterDefinition[] {
  return [
    {
      key: 'category',
      label: t?.resources?.category || 'Category',
      type: 'select',
      placeholder: t?.common?.all || 'All',
      options: CATEGORY_OPTIONS.map((c) => ({
        value: c,
        label: t?.resources?.categories?.[c] || c,
      })),
    },
    {
      key: 'type',
      label: t?.resources?.type || 'Type',
      type: 'select',
      placeholder: t?.common?.all || 'All',
      options: TYPE_OPTIONS.map((ty) => ({
        value: ty,
        label: ty.toUpperCase(),
      })),
    },
    {
      key: 'difficulty',
      label: t?.resources?.difficulty?.title || 'Difficulty',
      type: 'select',
      placeholder: t?.common?.all || 'All',
      options: DIFFICULTY_OPTIONS.map((d) => ({
        value: d,
        label: t?.resources?.difficulty?.[d] || d,
      })),
    },
  ];
}

function buildAdapter(
  initialCategory: ResourceCategory | undefined,
  pageSize: number
): ClientSideAdapter<Resource> {
  return new ClientSideAdapter<Resource>({
    fetchAll: async () => {
      try {
        const result = await searchResources(
          initialCategory ? { categories: [initialCategory] } : {},
          { field: 'relevance', direction: 'desc' },
          1,
          100
        );
        return result.resources;
      } catch {
        return [];
      }
    },
    searchFields: ['title', 'description', 'summary', 'tags', 'searchKeywords'],
    getId: (resource) => resource.id,
    toSearchable: (resource) =>
      [
        resource.title,
        resource.description,
        resource.summary,
        resource.tags.join(' '),
        resource.searchKeywords.join(' '),
        resource.author.name,
      ]
        .filter(Boolean)
        .join(' '),
  });
}

const getCategoryIcon = (category: ResourceCategory): string => {
  const icons: Record<ResourceCategory, string> = {
    tutorials: '📚',
    templates: '📋',
    tools: '🔧',
    books: '📖',
    courses: '🎓',
    datasets: '📊',
    research: '🔬',
    documentation: '📄',
  };
  return icons[category] || '📄';
};

export default function ResourceLibrary({
  initialCategory,
  compactView = false,
  lang = 'es',
}: ResourceLibraryProps) {
  const t = useTranslations();
  const user = getCurrentUser();

  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'bookmarks' | 'popular' | 'recent'
  >('all');

  const pageSize = compactView ? COMPACT_PAGE_SIZE : PAGE_SIZE;

  const adapter = useMemo(
    () => buildAdapter(initialCategory, pageSize),
    // Rebuild only when the category changes — intentional stable identity for adapter
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialCategory]
  );

  const filterDefinitions = useMemo(
    () => buildFilterDefinitions(t),
    // Translations are effectively static per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    items,
    totalCount,
    loading,
    query,
    setQuery,
    activeFilters,
    setFilter,
    clearFilters,
    sort,
    setSort,
    page,
    totalPages,
    hasMore,
    goToPage,
    loadMore,
    viewMode,
    setViewMode,
  } = useUniversalListing<Resource>({
    adapter,
    defaultViewMode: 'grid',
    defaultPageSize: pageSize,
    defaultSort: { field: 'downloadCount', direction: 'desc' },
    paginationMode: 'offset',
    filterDefinitions,
    lang,
  });

  useEffect(() => {
    getResourceStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    getUserBookmarks(user.uid)
      .then((bookmarks) => setBookmarkedIds(new Set(bookmarks.map((r) => r.id))))
      .catch(() => {});
  }, [user]);

  const handleTabChange = useCallback(
    (tab: typeof activeTab) => {
      if (tab === 'bookmarks' && !user) {
        alert(t?.resources?.loginRequired || 'Please login to view bookmarks');
        return;
      }
      setActiveTab(tab);
      switch (tab) {
        case 'popular':
          setSort({ field: 'downloadCount', direction: 'desc' });
          break;
        case 'recent':
          setSort({ field: 'createdAt', direction: 'desc' });
          break;
        case 'bookmarks':
          // No sort change — bookmarks tab filters client-side from existing items
          break;
        default:
          setSort({ field: 'downloadCount', direction: 'desc' });
      }
    },
    [user, t, setSort]
  );

  const handleBookmarkChange = useCallback(
    (resourceId: string, isBookmarked: boolean) => {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isBookmarked) {
          next.add(resourceId);
        } else {
          next.delete(resourceId);
        }
        return next;
      });
    },
    []
  );

  const handleCategoryClick = useCallback(
    (category: ResourceCategory) => {
      setFilter('category', category);
    },
    [setFilter]
  );

  const handleUploadSuccess = useCallback(() => {
    setShowUpload(false);
    adapter.invalidate();
  }, [adapter]);

  const visibleItems =
    activeTab === 'bookmarks'
      ? items.filter((r) => bookmarkedIds.has(r.id))
      : items;

  const hasActiveFilters =
    Object.values(activeFilters).some(
      (v) => v !== undefined && v !== null && v !== ''
    ) || !!query;

  if (selectedResource) {
    return (
      <ResourceDetail
        resourceId={selectedResource}
        onClose={() => setSelectedResource(null)}
      />
    );
  }

  if (showUpload) {
    return (
      <ResourceUpload
        onSuccess={handleUploadSuccess}
        onCancel={() => setShowUpload(false)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Stats bar */}
      {!compactView && stats && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalResources}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t?.resources?.totalResources || 'Total Resources'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalDownloads}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t?.resources?.totalDownloads || 'Downloads'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalAuthors}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t?.resources?.contributors || 'Contributors'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t?.resources?.averageRating || 'Avg Rating'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category grid — shown only when no active filters */}
      {!compactView && !hasActiveFilters && stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {(
            Object.entries(stats.categoryCounts) as [ResourceCategory, number][]
          ).map(([category, count]) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
            >
              <div className="mb-2 text-2xl">{getCategoryIcon(category)}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {t?.resources?.categories?.[category] || category}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {count} {t?.resources?.resources || 'resources'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <ListingSearch
          query={query}
          onQueryChange={setQuery}
          totalCount={totalCount}
          lang={lang}
        />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ListingFilters
          definitions={filterDefinitions}
          activeFilters={activeFilters}
          onFilterChange={setFilter}
          onClearAll={clearFilters}
          filterMode="collapsible"
          lang={lang}
        />
      </div>

      {/* Tabs and view controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
          {(
            [
              { key: 'all', label: t?.common?.all || 'All' },
              { key: 'popular', label: t?.resources?.popular || 'Popular' },
              { key: 'recent', label: t?.resources?.recent || 'Recent' },
              {
                key: 'bookmarks',
                label: t?.resources?.bookmarks || 'Bookmarks',
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.key === 'bookmarks' && bookmarkedIds.size > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {bookmarkedIds.size}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ListingViewToggle
            viewMode={viewMode}
            availableModes={['grid', 'list'] as ViewMode[]}
            onViewModeChange={setViewMode}
            lang={lang}
          />

          {user && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t?.resources?.upload || 'Upload'}
            </button>
          )}
        </div>
      </div>

      {/* Resource list */}
      {loading ? (
        <ListingLoading viewMode={viewMode} count={pageSize} />
      ) : visibleItems.length === 0 ? (
        <ListingEmpty
          lang={lang}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          title={
            activeTab === 'bookmarks'
              ? t?.resources?.bookmarks || 'Bookmarks'
              : t?.resources?.noResults || 'No resources found'
          }
          description={
            activeTab === 'bookmarks'
              ? undefined
              : t?.resources?.noResultsDescription ||
                'Try adjusting your search filters or browse by category.'
          }
        />
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? `grid grid-cols-1 ${
                  compactView
                    ? 'md:grid-cols-2'
                    : 'md:grid-cols-2 lg:grid-cols-3'
                } gap-6`
              : 'space-y-4'
          }
        >
          {visibleItems.map((resource) => (
            <div
              key={resource.id}
              onClick={() => setSelectedResource(resource.id)}
            >
              <ResourceCard
                resource={resource}
                isBookmarked={bookmarkedIds.has(resource.id)}
                onBookmarkChange={handleBookmarkChange}
                compact={viewMode === 'list' || compactView}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination — only for non-bookmarks tab */}
      {activeTab !== 'bookmarks' && (
        <ListingPagination
          page={page}
          totalPages={totalPages}
          hasMore={hasMore}
          paginationMode="offset"
          onPageChange={goToPage}
          onLoadMore={loadMore}
          loading={loading}
          lang={lang}
        />
      )}
    </div>
  );
}
