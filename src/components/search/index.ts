/**
 * Search Components Index - Export all search-related components and utilities
 * Provides a centralized access point for the global search functionality
 */

// Core search components
export { default as SearchBar } from './SearchBar';
export { default as GlobalSearch } from './GlobalSearch';
export { default as SearchResults } from './SearchResults';

// Search engine and utilities
export { searchEngine, SearchEngine } from '@/lib/search/search-engine';
export { searchIndexer, SearchIndexer } from '@/lib/search/search-indexer';

// Analytics and tracking
export {
  searchAnalytics,
  searchHistory,
  popularSearches,
  searchPreferences,
  SearchAnalytics,
  SearchHistoryManager,
  PopularSearchManager,
  SearchPreferencesManager,
} from '@/lib/search/search-analytics';

// Context and state management
export {
  SearchProvider,
  useSearch,
  useSearchTranslations,
} from '@/contexts/SearchContext';

// Translations
export {
  searchTranslationsEs,
  searchTranslationsEn,
  getSearchTranslations,
  type SearchTranslations,
} from '@/i18n/search-translations';

// Types
export type {
  SearchContentType,
  SearchResultItem,
  SearchSuggestion,
  SearchFilters,
  SearchFacets,
  SearchQuery,
  SearchResponse,
  SearchOptions,
  SearchSort,
  SearchPagination,
  SearchHighlight,
  SearchHistoryItem,
  PopularSearch,
  SearchAnalyticsEvent,
  IndexedContent,
  SearchIndexConfig,
  SearchEngineStatus,
  SearchSyntax,
  SearchExportConfig,
  VoiceSearchConfig,
  SearchBarProps,
  GlobalSearchProps,
  SearchResultsProps,
  SearchContextState,
  SearchContextActions,
} from '@/types/search';

// Utility functions
export {
  normalizeText,
  tokenize,
  levenshteinDistance,
  parseSearchSyntax,
  generateHighlights,
} from '@/lib/search/search-engine';

// Component prop types for easier imports
export type {
  SearchBarProps,
  GlobalSearchProps,
  SearchResultsProps,
} from '@/types/search';

/**
 * Usage Examples:
 *
 * Basic search bar:
 * ```tsx
 * import { SearchBar } from '@/components/search';
 *
 * <SearchBar
 *   placeholder="Search..."
 *   onSearch={(query) => console.log(query)}
 *   onSuggestionSelect={(suggestion) => console.log(suggestion)}
 * />
 * ```
 *
 * Global search modal:
 * ```tsx
 * import { GlobalSearch } from '@/components/search';
 *
 * <GlobalSearch
 *   isOpen={isSearchOpen}
 *   onClose={() => setIsSearchOpen(false)}
 *   onResultClick={(result) => navigate(result.url)}
 * />
 * ```
 *
 * Full search results page:
 * ```tsx
 * import { SearchResults } from '@/components/search';
 *
 * <SearchResults
 *   query="data science"
 *   filters={{ contentTypes: ['jobs'] }}
 *   onFilterChange={setFilters}
 *   onExport={handleExport}
 * />
 * ```
 *
 * Using search context:
 * ```tsx
 * import { useSearch, SearchProvider } from '@/components/search';
 *
 * function App() {
 *   return (
 *     <SearchProvider>
 *       <SearchComponent />
 *     </SearchProvider>
 *   );
 * }
 *
 * function SearchComponent() {
 *   const { state, actions } = useSearch();
 *
 *   return (
 *     <div>
 *       <input
 *         onChange={(e) => actions.search(e.target.value)}
 *         value={state.query}
 *       />
 *       {state.results.map(result => (
 *         <div key={result.id}>{result.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * Manual search engine usage:
 * ```tsx
 * import { searchEngine } from '@/components/search';
 *
 * const results = await searchEngine.search({
 *   query: 'machine learning',
 *   filters: { contentTypes: ['jobs', 'events'] },
 *   sort: { field: 'date', direction: 'desc' },
 *   pagination: { page: 0, limit: 20, offset: 0 },
 *   options: {
 *     fuzzyMatching: true,
 *     typoTolerance: true,
 *     highlightResults: true,
 *     includeContent: false,
 *     minScore: 0.1,
 *     maxResults: 100
 *   }
 * });
 * ```
 *
 * Analytics tracking:
 * ```tsx
 * import { searchAnalytics } from '@/components/search';
 *
 * // Track search
 * await searchAnalytics.trackSearch(
 *   'data scientist jobs',
 *   { contentTypes: ['jobs'] },
 *   15,
 *   250
 * );
 *
 * // Track result click
 * await searchAnalytics.trackResultClick(
 *   'data scientist jobs',
 *   'job-123',
 *   'Senior Data Scientist',
 *   2,
 *   'jobs'
 * );
 * ```
 *
 * Search indexing:
 * ```tsx
 * import { searchIndexer } from '@/components/search';
 *
 * // Index all content
 * await searchIndexer.indexAllContent();
 *
 * // Index specific content type
 * await searchIndexer.indexContentType('jobs');
 *
 * // Get indexing status
 * const status = searchIndexer.getIndexingStatus();
 * ```
 */
