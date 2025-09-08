import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ArrowDownTrayIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { clsx} from 'clsx';
import SearchBar from './SearchBar';
import { searchEngine} from '@/lib/search/search-engine';
import { useTranslations} from '@/hooks/useTranslations';

/**
 * SearchResults Component - Full search results page with advanced filtering
 * Features: Pagination, sorting, filtering, export, search within results
 */
import type { 
  SearchResultsProps, 
  SearchResultItem, 
  SearchFilters,
  SearchContentType,
  SearchFacets,
  SearchExportConfig,
  SearchSort
} from '@/types/search';

// Content type configurations (reused from GlobalSearch)
const CONTENT_TYPE_CONFIG: Record<SearchContentType, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  all: { label: 'All', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  jobs: { label: 'Jobs', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  events: { label: 'Events', color: 'text-green-700', bgColor: 'bg-green-100' },
  forums: { label: 'Forums', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  members: { label: 'Members', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  mentors: { label: 'Mentors', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  resources: { label: 'Resources', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  news: { label: 'News', color: 'text-red-700', bgColor: 'bg-red-100' }
};

// View modes
type ViewMode = 'list' | 'grid' | 'compact';

// Sort options
const SORT_OPTIONS = [
  { field: 'relevance', label: 'Relevance', direction: 'desc' },
  { field: 'date', label: 'Date', direction: 'desc' },
  { field: 'title', label: 'Title', direction: 'asc' },
  { field: 'popularity', label: 'Popularity', direction: 'desc' }
] as const;

export const SearchResults: React.FC<SearchResultsProps> = ({
  query: initialQuery,
  filters: initialFilters,
  onFilterChange,
  onExport,
  className
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [sort, setSort] = useState<SearchSort>({ field: 'relevance', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [searchWithinResults, setSearchWithinResults] = useState('');
  
  const { t } = useTranslations();
  const resultsPerPage = 20;

  // Perform search
  const performSearch = useCallback(async (
    searchQuery: string,
    searchFilters: SearchFilters,
    searchSort: SearchSort,
    page: number = 0
  ) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      setTotalPages(0);
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchEngine.search({
        query: searchQuery,
        filters: searchFilters,
        sort: searchSort,
        pagination: { 
          page, 
          limit: resultsPerPage, 
          offset: page * resultsPerPage 
        },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: true,
          minScore: 0.1,
          maxResults: 1000
        }
      });

      setResults(response.results);
      setFacets(response.facets);
      setTotalResults(response.total);
      setTotalPages(response.totalPages);
      setCurrentPage(page);

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalResults(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter results when searching within results
  const filteredResults = useMemo(() => {
    if (!searchWithinResults.trim()) return results;
    
    const searchTerm = searchWithinResults.toLowerCase();
    return results.filter(result => 
      result?.title?.toLowerCase().includes(searchTerm) ||
      result?.description?.toLowerCase().includes(searchTerm) ||
      result?.content?.toLowerCase().includes(searchTerm) ||
      result?.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }, [results, searchWithinResults]);

  // Handle search
  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setCurrentPage(0);
    performSearch(newQuery, filters, sort, 0);
  }, [filters, sort, performSearch]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setCurrentPage(0);
    onFilterChange(updatedFilters);
    performSearch(query, updatedFilters, sort, 0);
  }, [filters, query, sort, performSearch, onFilterChange]);

  // Handle sort change
  const handleSortChange = (newSort: SearchSort) => {
    setSort(newSort);
    setCurrentPage(0);
    performSearch(query, filters, newSort, 0);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    performSearch(query, filters, sort, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle result selection
  const handleResultSelect = (resultId: string, selected: boolean) => {
    const newSelected = new Set(selectedResults);
    if(selected) {
      newSelected.add(resultId);
    } else {
      newSelected.delete(resultId);
    }
    setSelectedResults(newSelected);
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if(selected) {
      setSelectedResults(new Set(filteredResults.map(r => r.id)));
    } else {
      setSelectedResults(new Set());
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json' | 'xlsx' | 'pdf') => {
    if (!onExport) return;

    const exportConfig: SearchExportConfig = {
      format,
      fields: ['title', 'description', 'type', 'url', 'tags', 'createdAt'],
      filters,
      maxResults: selectedResults.size > 0 ? selectedResults.size : totalResults,
      includeMetadata: true
    };

    try {
      await onExport(exportConfig);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Initial search
  useEffect(() => {
    if(initialQuery) {
      performSearch(initialQuery, initialFilters, sort, 0);
    }
  }, [initialQuery, initialFilters, sort, performSearch]);

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Render result item
  const renderResultItem = (result: SearchResultItem, index: number) => {
    const isSelected = selectedResults.has(result.id);
    const config = CONTENT_TYPE_CONFIG[result.type];

    const baseCard = (
      <div
        key={result.id}
        className={clsx(
          'border rounded-lg transition-all duration-200',
          'hover:border-gray-300 hover:shadow-md',
          isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
        )}
      >
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleResultSelect(result.id, e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className={clsx(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  config.bgColor,
                  config.color
                )}>
                  {config.label}
                </span>
                {result['metadata'].category && (
                  <span className="text-sm text-gray-500">
                    • {result['metadata'].category}
                  </span>
                )}
                <span className="text-sm text-gray-400">
                  Score: {result?.score?.toFixed(2)}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                <a 
                  href={result.url}
                  className="hover:text-blue-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {result.title}
                </a>
              </h3>

              <p className="text-gray-600 mb-3 line-clamp-3">
                {result['description']}
              </p>

              {result?.highlights?.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-700 bg-yellow-50 p-2 rounded border-l-2 border-yellow-200">
                    <strong>Matches:</strong> {result.highlights?.[0].snippet}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {result['metadata'].location && (
                    <span>📍 {result?.metadata?.location}</span>
                  )}
                  {result['metadata'].company && (
                    <span>🏢 {result?.metadata?.company}</span>
                  )}
                  <span>📅 {formatDate(result['metadata'].createdAt)}</span>
                </div>

                {result?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result?.tags?.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {result?.tags?.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{result?.tags?.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    return viewMode === 'compact' ? (
      <div key={result.id} className="border-b border-gray-200 py-4">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleResultSelect(result.id, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={clsx(
                'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                config.bgColor,
                config.color
              )}>
                {config.label}
              </span>
              <h3 className="text-sm font-medium text-gray-900 truncate">
                <a href={result.url} className="hover:text-blue-600">
                  {result.title}
                </a>
              </h3>
            </div>
            <p className="text-sm text-gray-600 truncate">{result['description']}</p>
          </div>
          <div className="text-xs text-gray-400">
            {formatDate(result['metadata'].createdAt)}
          </div>
        </div>
      </div>
    ) : baseCard;
  };

  // Pagination component
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 7;
    const startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>
            Showing {currentPage * resultsPerPage + 1} to{' '}
            {Math.min((currentPage + 1) * resultsPerPage, totalResults)} of{' '}
            {totalResults.toLocaleString()} results
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className={clsx(
              'p-2 rounded-lg border transition-colors',
              currentPage === 0
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            )}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {startPage > 0 && (
            <>
              <button
                onClick={() => handlePageChange(0)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                1
              </button>
              {startPage > 1 && (
                <span className="px-2 text-gray-400">
                  <EllipsisHorizontalIcon className="h-4 w-4" />
                </span>
              )}
            </>
          )}

          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={clsx(
                'px-3 py-2 rounded-lg border text-sm transition-colors',
                page === currentPage
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              {page + 1}
            </button>
          ))}

          {endPage < totalPages - 1 && (
            <>
              {endPage < totalPages - 2 && (
                <span className="px-2 text-gray-400">
                  <EllipsisHorizontalIcon className="h-4 w-4" />
                </span>
              )}
              <button
                onClick={() => handlePageChange(totalPages - 1)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className={clsx(
              'p-2 rounded-lg border transition-colors',
              currentPage === totalPages - 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            )}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={clsx('max-w-7xl mx-auto', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('search.results.title', 'Search Results')}
          </h1>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Toggles */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-l-lg transition-colors',
                  viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                )}
                title="List view"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2 transition-colors',
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                )}
                title="Grid view"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={clsx(
                  'p-2 rounded-r-lg transition-colors',
                  viewMode === 'compact' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                )}
                title="Compact view"
              >
                <ViewColumnsIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Export Button */}
            {onExport && (
              <div className="relative">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span>{t('search.export', 'Export')}</span>
                </button>
              </div>
            )}

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center space-x-2 px-3 py-2 border rounded-lg text-sm transition-colors',
                showFilters 
                  ? 'border-blue-300 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              <FunnelIcon className="h-4 w-4" />
              <span>{t('search.filters.toggle', 'Filters')}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          placeholder={t('search.placeholder', 'Search...')}
          defaultQuery={query}
          onSearch={handleSearch}
          onSuggestionSelect={(suggestion) => handleSearch(suggestion.text)}
          showVoiceSearch={true}
          size="md"
        />
      </div>

      <div className="flex">
        {/* Sidebar Filters */}
        {showFilters && facets && (
          <aside className="w-80 bg-gray-50 border-r border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('search.filters.title', 'Filters')}
            </h2>

            {/* Content Types */}
            {facets.contentTypes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {t('search.filters.contentType', 'Content Type')}
                </h3>
                <div className="space-y-2">
                  {facets.contentTypes.map(({ type, count, label }) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.contentTypes.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...filters.contentTypes, type]
                            : filters.contentTypes.filter(t => t !== type);
                          handleFilterChange({ contentTypes: newTypes });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {label} ({count})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {facets.categories.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {t('search.filters.category', 'Category')}
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {facets.categories.map(({ category, count }) => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters?.category?.includes(category) || false}
                        onChange={(e) => {
                          const currentCategories = filters.category || [];
                          const newCategories = e.target.checked
                            ? [...currentCategories, category]
                            : currentCategories.filter(c => c !== category);
                          handleFilterChange({ category: newCategories });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {category} ({count})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Tags */}
            {facets.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {t('search.filters.tags', 'Tags')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {facets.tags.slice(0, 10).map(({ tag, count }) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = filters.tags || [];
                        const isSelected = currentTags.includes(tag);
                        const newTags = isSelected
                          ? currentTags.filter(t => t !== tag)
                          : [...currentTags, tag];
                        handleFilterChange({ tags: newTags });
                      }}
                      className={clsx(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs transition-colors',
                        filters?.tags?.includes(tag)
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      {tag} ({count})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1">
          {/* Results Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {totalResults.toLocaleString()} results for <strong>"{query}"</strong>
                  {searchWithinResults && (
                    <span> filtered by <strong>"{searchWithinResults}"</strong></span>
                  )}
                </div>

                {/* Search within results */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('search.withinResults', 'Search within results...')}
                    value={searchWithinResults}
                    onChange={(e) => setSearchWithinResults(e.target.value)}
                    className="pl-3 pr-8 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchWithinResults && (
                    <button
                      onClick={() => setSearchWithinResults('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Select All */}
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={selectedResults.size === filteredResults.length && filteredResults.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700">
                    Select all ({selectedResults.size} selected)
                  </span>
                </label>

                {/* Sort Options */}
                <div className="flex items-center space-x-2">
                  <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />
                  <select
                    value={`${sort.field}-${sort.direction}`}
                    onChange={(e) => {
                      const [field, direction] = e.target.value.split('-');
                      handleSortChange({ 
                        field: field as any, 
                        direction: direction as 'asc' | 'desc' 
                      });
                    }}
                    className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SORT_OPTIONS.map(option => (
                      <option 
                        key={`${option.field}-${option.direction}`}
                        value={`${option.field}-${option.direction}`}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600" />
                  <span>{t('search.loading', 'Searching...')}</span>
                </div>
              </div>
            ) : filteredResults.length > 0 ? (
              <div className={clsx(
                viewMode === 'grid' && 'grid grid-cols-1 lg:grid-cols-2 gap-6',
                viewMode === 'list' && 'space-y-6',
                viewMode === 'compact' && 'divide-y divide-gray-200'
              )}>
                {filteredResults.map((result, index) => renderResultItem(result, index))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FunnelIcon className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('search.noResults.title', 'No results found')}
                </h3>
                <p className="text-gray-600">
                  {t('search.noResultsdescription', 'Try adjusting your search terms or filters')}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {renderPagination()}
        </main>
      </div>
    </div>
  );
};

export default SearchResults;