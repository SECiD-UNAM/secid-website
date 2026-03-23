import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import SearchBar from './SearchBar';
import { searchEngine } from '@/lib/search/search-engine';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * GlobalSearch Component - Main search interface with instant results
 * Features: Modal overlay, live search, filters, quick actions
 */
import type {
  GlobalSearchProps,
  SearchResultItem,
  SearchSuggestion,
  SearchFilters,
  SearchContentType,
  PopularSearch,
  SearchHistoryItem,
} from '@/types/search';

// Recent searches mock data (would come from localStorage/Firebase)
const MOCK_RECENT_SEARCHES: SearchHistoryItem[] = [
  {
    id: '1',
    query: 'data scientist jobs',
    filters: { contentTypes: ['jobs'], language: 'es' } as SearchFilters,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    resultCount: 15,
    clickedResults: [],
    sessionId: 'session1',
  },
  {
    id: '2',
    query: 'machine learning workshop',
    filters: { contentTypes: ['events'], language: 'es' } as SearchFilters,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    resultCount: 8,
    clickedResults: [],
    sessionId: 'session2',
  },
];

// Popular searches mock data
const MOCK_POPULAR_SEARCHES: PopularSearch[] = [
  {
    query: 'remote data science jobs',
    count: 145,
    period: 'week',
    trending: true,
  },
  { query: 'python developer', count: 98, period: 'week', trending: false },
  { query: 'AI workshop', count: 76, period: 'week', trending: true },
  { query: 'data analyst Mexico', count: 67, period: 'week', trending: false },
  {
    query: 'machine learning course',
    count: 54,
    period: 'week',
    trending: true,
  },
];

// Content type configurations
const CONTENT_TYPE_CONFIG: Record<
  SearchContentType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    description: string;
  }
> = {
  all: {
    label: 'All',
    icon: DocumentTextIcon,
    color: 'gray',
    description: 'Search across all content types',
  },
  jobs: {
    label: 'Jobs',
    icon: BriefcaseIcon,
    color: 'blue',
    description: 'Job opportunities and openings',
  },
  events: {
    label: 'Events',
    icon: CalendarIcon,
    color: 'green',
    description: 'Workshops, meetups, and conferences',
  },
  forums: {
    label: 'Forums',
    icon: ChatBubbleLeftRightIcon,
    color: 'purple',
    description: 'Community discussions and Q&A',
  },
  members: {
    label: 'Members',
    icon: UserGroupIcon,
    color: 'orange',
    description: 'Alumni directory and profiles',
  },
  mentors: {
    label: 'Mentors',
    icon: AcademicCapIcon,
    color: 'indigo',
    description: 'Mentorship opportunities',
  },
  resources: {
    label: 'Resources',
    icon: DocumentTextIcon,
    color: 'teal',
    description: 'Learning materials and resources',
  },
  news: {
    label: 'News',
    icon: NewspaperIcon,
    color: 'red',
    description: 'Latest news and announcements',
  },
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  defaultQuery = '',
  defaultFilters,
  onResultClick,
  className,
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedContentType, setSelectedContentType] =
    useState<SearchContentType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] =
    useState<SearchHistoryItem[]>(MOCK_RECENT_SEARCHES);
  const [popularSearches] = useState<PopularSearch[]>(MOCK_POPULAR_SEARCHES);
  const [selectedResult, setSelectedResult] = useState(-1);

  const { t } = useTranslations();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search function
  const performSearch = useCallback(
    async (searchQuery: string, contentType: SearchContentType = 'all') => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchFilters: SearchFilters = {
          contentTypes: contentType === 'all' ? ['all'] : [contentType],
          language: 'es',
          ...defaultFilters,
        };

        const response = await searchEngine.search({
          query: searchQuery,
          filters: searchFilters,
          sort: { field: 'relevance', direction: 'desc' },
          pagination: { page: 0, limit: 10, offset: 0 },
          options: {
            fuzzyMatching: true,
            typoTolerance: true,
            highlightResults: true,
            includeContent: false,
            minScore: 0.1,
            maxResults: 10,
          },
        });

        setResults(response.results);

        // Add to recent searches
        const searchItem: SearchHistoryItem = {
          id: Date.now().toString(),
          query: searchQuery,
          filters: searchFilters,
          timestamp: new Date(),
          resultCount: response.total,
          clickedResults: [],
          sessionId: crypto.randomUUID(),
        };

        setRecentSearches((prev) => [searchItem, ...prev.slice(0, 4)]);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [defaultFilters]
  );

  // Handle search
  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      performSearch(searchQuery, selectedContentType);
    },
    [performSearch, selectedContentType]
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      setQuery(suggestion.text);
      performSearch(suggestion.text, selectedContentType);
    },
    [performSearch, selectedContentType]
  );

  // Handle content type change
  const handleContentTypeChange = (type: SearchContentType) => {
    setSelectedContentType(type);
    if (query) {
      performSearch(query, type);
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResultItem) => {
    onResultClick?.(result);
    onClose();
  };

  // Handle recent search click
  const handleRecentSearchClick = (recentSearch: SearchHistoryItem) => {
    setQuery(recentSearch.query);
    setSelectedContentType(recentSearch.filters.contentTypes?.[0] || 'all');
    performSearch(
      recentSearch.query,
      recentSearch.filters.contentTypes?.[0] || 'all'
    );
  };

  // Handle popular search click
  const handlePopularSearchClick = (popularSearch: PopularSearch) => {
    setQuery(popularSearch.query);
    performSearch(popularSearch.query, selectedContentType);
  };

  // Keyboard navigation for results
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedResult((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedResult((prev) => (prev > 0 ? prev - 1 : -1));
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedResult >= 0 && results[selectedResult]) {
            handleResultClick(results[selectedResult]);
          }
          break;

        case 'Escape':
          onClose();
          break;
      }
    },
    [isOpen, results, selectedResult, onClose]
  );

  useEffect(() => {
    document['addEventListener']('keydown', handleKeyDown);
    return () => document['removeEventListener']('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery(defaultQuery);
      setSelectedResult(-1);
      if (defaultQuery) {
        performSearch(defaultQuery, selectedContentType);
      }
    } else {
      setResults([]);
      setSelectedResult(-1);
    }
  }, [isOpen, defaultQuery, performSearch, selectedContentType]);

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  // Get result icon
  const getResultIcon = (type: SearchContentType) => {
    const config = CONTENT_TYPE_CONFIG[type];
    const IconComponent = config.icon;
    return <IconComponent className="h-4 w-4" />;
  };

  // Get result type color
  const getResultTypeColor = (type: SearchContentType) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      teal: 'bg-teal-100 text-teal-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return colors[CONTENT_TYPE_CONFIG[type].color] || colors.gray;
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        {/* Modal */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-16">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={clsx(
                  'w-full max-w-4xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all',
                  className
                )}
              >
                {/* Header */}
                <div className="border-b border-gray-200 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      {t('search.title', 'Search SECiD')}
                    </Dialog.Title>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx(
                          'rounded-lg border p-2 transition-colors',
                          showFilters
                            ? 'border-blue-200 bg-blue-50 text-blue-600'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        )}
                        title={t('search.filters.toggle', 'Toggle filters')}
                      >
                        <AdjustmentsHorizontalIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={onClose}
                        className="p-2 text-gray-400 transition-colors hover:text-gray-600"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <SearchBar
                    placeholder={t(
                      'search.placeholder',
                      'Search jobs, events, forums, members...'
                    )}
                    defaultQuery={query}
                    onSearch={handleSearch}
                    onSuggestionSelect={handleSuggestionSelect}
                    showVoiceSearch={true}
                    autoFocus={true}
                    size="lg"
                  />

                  {/* Content Type Filter */}
                  {showFilters && (
                    <div className="mt-4">
                      <h3 className="mb-3 text-sm font-medium text-gray-700">
                        {t('search.filters.contentType', 'Content Type')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(CONTENT_TYPE_CONFIG).map(
                          ([type, config]) => {
                            const isSelected = selectedContentType === type;
                            const IconComponent = config.icon;

                            return (
                              <button
                                key={type}
                                onClick={() =>
                                  handleContentTypeChange(
                                    type as SearchContentType
                                  )
                                }
                                className={clsx(
                                  'flex items-center space-x-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                                  isSelected
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                )}
                              >
                                <IconComponent className="h-4 w-4" />
                                <span>{config.label}</span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div
                  ref={searchContainerRef}
                  className="max-h-96 overflow-y-auto"
                >
                  {/* Loading State */}
                  {isLoading && (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center space-x-3 text-gray-500">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                        <span>{t('search.loading', 'Searching...')}</span>
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {!isLoading && results.length > 0 && (
                    <div className="p-6">
                      <h3 className="mb-4 text-sm font-medium text-gray-700">
                        {t('search.results.title', 'Search Results')} (
                        {results.length})
                      </h3>
                      <div className="space-y-3">
                        {results.map((result, index) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={clsx(
                              'w-full rounded-lg border p-4 text-left transition-all',
                              'hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
                              selectedResult === index &&
                                'border-blue-200 bg-blue-50'
                            )}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={clsx(
                                  'flex h-8 w-8 items-center justify-center rounded-lg',
                                  getResultTypeColor(result['type'])
                                )}
                              >
                                {getResultIcon(result['type'])}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center space-x-2">
                                  <h4 className="truncate text-sm font-medium text-gray-900">
                                    {result.title}
                                  </h4>
                                  <span
                                    className={clsx(
                                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                                      getResultTypeColor(result['type'])
                                    )}
                                  >
                                    {CONTENT_TYPE_CONFIG[result['type']].label}
                                  </span>
                                </div>
                                <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                                  {result['description']}
                                </p>
                                {result?.highlights?.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    <span className="font-medium">
                                      Matches:{' '}
                                    </span>
                                    {result.highlights?.[0].snippet}
                                  </div>
                                )}
                                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                  {result['metadata'].category && (
                                    <span>📂 {result?.metadata?.category}</span>
                                  )}
                                  {result['metadata'].location && (
                                    <span>
                                      📍 {result['metadata'].location}
                                    </span>
                                  )}
                                  <span>🔍 {result?.score?.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {!isLoading && query && results.length === 0 && (
                    <div className="p-6 text-center">
                      <div className="mb-4 text-gray-400">
                        <MagnifyingGlassIcon className="mx-auto h-12 w-12" />
                      </div>
                      <h3 className="mb-2 text-lg font-medium text-gray-900">
                        {t('search.noResults.title', 'No results found')}
                      </h3>
                      <p className="mb-4 text-gray-600">
                        {t(
                          'search.noResultsdescription',
                          'Try adjusting your search terms or filters'
                        )}
                      </p>
                    </div>
                  )}

                  {/* Default State - Recent and Popular Searches */}
                  {!isLoading && !query && (
                    <div className="space-y-6 p-6">
                      {/* Recent Searches */}
                      {recentSearches.length > 0 && (
                        <div>
                          <h3 className="mb-3 flex items-center space-x-2 text-sm font-medium text-gray-700">
                            <ClockIcon className="h-4 w-4" />
                            <span>
                              {t('search.recent.title', 'Recent Searches')}
                            </span>
                          </h3>
                          <div className="space-y-2">
                            {recentSearches.map((search) => (
                              <button
                                key={search.id}
                                onClick={() => handleRecentSearchClick(search)}
                                className="w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-50"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-900">
                                    {search.query}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatTimeAgo(search['timestamp'])}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {search.resultCount} results
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Popular Searches */}
                      <div>
                        <h3 className="mb-3 flex items-center space-x-2 text-sm font-medium text-gray-700">
                          <ArrowTrendingUpIcon className="h-4 w-4" />
                          <span>
                            {t('search.popular.title', 'Popular Searches')}
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {popularSearches.map((search, index) => (
                            <button
                              key={index}
                              onClick={() => handlePopularSearchClick(search)}
                              className="w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-900">
                                    {search.query}
                                  </span>
                                  {search.trending && (
                                    <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                      🔥 Trending
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {search.count} searches
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>↑↓ Navigate</span>
                      <span>↵ Select</span>
                      <span>Esc Close</span>
                    </div>
                    <div>
                      {results.length > 0 && (
                        <span>Showing {results.length} results</span>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default GlobalSearch;
