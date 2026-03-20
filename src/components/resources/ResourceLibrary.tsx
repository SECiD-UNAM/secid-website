import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { useTranslations } from '@/hooks/useTranslations';
import ResourceCard from './ResourceCard';
import ResourceSearch from './ResourceSearch';
import ResourceDetail from './ResourceDetail';
import ResourceUpload from './ResourceUpload';

/**
 * ResourceLibrary Component
 * Main library interface with categories, search, and resource management
 */

import {
  searchResources,
  getResourceStats,
  getUserBookmarks,
} from '@/lib/resources';
import type {
  Resource,
  ResourceSearchFilters,
  ResourceSearchSort,
  ResourceSearchResult,
  ResourceCategory,
  ResourceStats,
} from '@/types/resource';

interface ResourceLibraryProps {
  initialCategory?: ResourceCategory;
  compactView?: boolean;
}

export default function ResourceLibrary({
  initialCategory,
  compactView = false,
}: ResourceLibraryProps) {
  const t = useTranslations();
  const user = getCurrentUser();

  const [searchResult, setSearchResult] = useState<ResourceSearchResult>({
    resources: [],
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0,
    facets: {
      categories: {} as any,
      types: {} as any,
      tags: {},
      authors: {},
      difficulties: {},
    },
  });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<
    'all' | 'bookmarks' | 'popular' | 'recent'
  >('all');

  const [filters, setFilters] = useState<ResourceSearchFilters>(
    initialCategory ? { categories: [initialCategory] } : {}
  );
  const [sort, setSort] = useState<ResourceSearchSort>({
    field: 'relevance',
    direction: 'desc',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserBookmarks();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [searchData, statsData] = await Promise.all([
        performSearch(filters, sort, 1),
        getResourceStats(),
      ]);

      setSearchResult(searchData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserBookmarks = async () => {
    if (!user) return;

    try {
      const bookmarks = await getUserBookmarks(user.uid);
      setBookmarkedIds(new Set(bookmarks.map((r) => r.id)));
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const performSearch = useCallback(
    async (
      searchFilters: ResourceSearchFilters,
      searchSort: ResourceSearchSort,
      page: number = 1
    ): Promise<ResourceSearchResult> => {
      const pageSize = compactView ? 6 : 12;
      return await searchResources(searchFilters, searchSort, page, pageSize);
    },
    [compactView]
  );

  const handleSearch = useCallback(
    async (newFilters: ResourceSearchFilters, newSort: ResourceSearchSort) => {
      try {
        setLoading(true);
        setFilters(newFilters);
        setSort(newSort);
        setCurrentPage(1);

        const result = await performSearch(newFilters, newSort, 1);
        setSearchResult(result);
      } catch (error) {
        console.error('Error searching resources:', error);
      } finally {
        setLoading(false);
      }
    },
    [performSearch]
  );

  const handlePageChange = async (page: number) => {
    try {
      setLoading(true);
      setCurrentPage(page);

      const result = await performSearch(filters, sort, page);
      setSearchResult(result);
    } catch (error) {
      console.error('Error changing page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (tab: typeof activeTab) => {
    setActiveTab(tab);
    setCurrentPage(1);

    let newFilters = { ...filters };
    let newSort = { ...sort };

    switch (tab) {
      case 'popular':
        newSort = { field: 'downloads', direction: 'desc' };
        break;
      case 'recent':
        newSort = { field: 'date', direction: 'desc' };
        break;
      case 'bookmarks':
        if (!user) {
          alert(
            t?.resources?.loginRequired || 'Please login to view bookmarks'
          );
          return;
        }
        // This would need a separate API to get bookmarked resources
        // For now, we'll just filter client-side
        break;
      default:
        newSort = { field: 'relevance', direction: 'desc' };
    }

    await handleSearch(newFilters, newSort);
  };

  const handleBookmarkChange = (resourceId: string, isBookmarked: boolean) => {
    const newBookmarkedIds = new Set(bookmarkedIds);
    if (isBookmarked) {
      newBookmarkedIds.add(resourceId);
    } else {
      newBookmarkedIds.delete(resourceId);
    }
    setBookmarkedIds(newBookmarkedIds);
  };

  const handleResourceSelect = (resourceId: string) => {
    setSelectedResource(resourceId);
  };

  const handleUploadSuccess = (resourceId: string) => {
    setShowUpload(false);
    // Optionally refresh the results or show the new resource
    loadInitialData();
  };

  const getCategoryIcon = (category: ResourceCategory): string => {
    const icons = {
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

  const renderCategoryGrid = () => {
    if (!stats) return null;

    const categories = Object.entries(stats.categoryCounts) as [
      ResourceCategory,
      number,
    ][];

    return (
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map(([category, count]) => (
          <button
            key={category}
            onClick={() => handleSearch({ categories: [category] }, sort)}
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
    );
  };

  const renderStatsBar = () => {
    if (!stats) return null;

    return (
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
    );
  };

  const renderTabs = () => (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
        {[
          { key: 'all', label: t?.common?.all || 'All' },
          { key: 'popular', label: t?.resources?.popular || 'Popular' },
          { key: 'recent', label: t?.resources?.recent || 'Recent' },
          { key: 'bookmarks', label: t?.resources?.bookmarks || 'Bookmarks' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as any)}
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
        {/* View Toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
          <button
            onClick={() => setActiveView('grid')}
            className={`rounded-md p-2 ${
              activeView === 'grid'
                ? 'bg-white shadow-sm dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`rounded-md p-2 ${
              activeView === 'list'
                ? 'bg-white shadow-sm dark:bg-gray-800'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Upload Button */}
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
  );

  const renderResourceGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
            ></div>
          ))}
        </div>
      );
    }

    if (searchResult.resources.length === 0) {
      return (
        <div className="py-12 text-center">
          <div className="mb-4 text-6xl">📂</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            {t?.resources?.noResults || 'No resources found'}
          </h3>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            {t?.resources?.noResultsDescription ||
              'Try adjusting your search filters or browse by category.'}
          </p>
          {user && (
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              {t?.resources?.contributeFirst || 'Be the first to contribute!'}
            </button>
          )}
        </div>
      );
    }

    const filteredResources =
      activeTab === 'bookmarks'
        ? searchResult.resources.filter((r) => bookmarkedIds.has(r.id))
        : searchResult.resources;

    return (
      <div
        className={
          activeView === 'grid'
            ? `grid grid-cols-1 ${compactView ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-6`
            : 'space-y-4'
        }
      >
        {filteredResources.map((resource) => (
          <div
            key={resource.id}
            onClick={() => handleResourceSelect(resource.id)}
          >
            <ResourceCard
              resource={resource}
              isBookmarked={bookmarkedIds.has(resource.id)}
              onBookmarkChange={handleBookmarkChange}
              compact={activeView === 'list' || compactView}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (searchResult.totalPages <= 1) return null;

    const pages = Array.from(
      { length: Math.min(5, searchResult.totalPages) },
      (_, i) => {
        const page = Math.max(1, currentPage - 2) + i;
        return page <= searchResult.totalPages ? page : null;
      }
    ).filter(Boolean) as number[];

    return (
      <div className="mt-8 flex items-center justify-center gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t?.common?.previous || 'Previous'}
        </button>

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              page === currentPage
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === searchResult.totalPages}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t?.common?.next || 'Next'}
        </button>
      </div>
    );
  };

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
      {/* Header removed - rendered by Astro page wrapper */}

      {/* Stats */}
      {!compactView && renderStatsBar()}

      {/* Categories */}
      {!compactView && !filters.query && renderCategoryGrid()}

      {/* Search */}
      <ResourceSearch
        onSearch={handleSearch}
        initialFilters={filters}
        initialSort={sort}
        loading={loading}
        resultCount={searchResult['total']}
      />

      {/* Tabs and View Controls */}
      {renderTabs()}

      {/* Resource Grid */}
      {renderResourceGrid()}

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}
