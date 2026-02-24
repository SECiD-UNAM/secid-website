// @ts-nocheck
/**
 * Search-related types and interfaces for the SECiD global search system
 */

// Note: Types are imported lazily to avoid circular dependencies
// These are declared for type checking but actual types come from runtime

// Search content types
export type SearchContentType =
  | 'jobs'
  | 'events'
  | 'forums'
  | 'members'
  | 'resources'
  | 'mentors'
  | 'news'
  | 'all';

// Search result item interface
export interface SearchResultItem {
  id: string;
  type: SearchContentType;
  title: string;
  description: string;
  content: string;
  url: string;
  tags: string[];
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata: {
    createdAt: Date;
    updatedAt?: Date;
    category?: string;
    location?: string;
    company?: string;
    level?: string;
    status?: string;
  };
  score: number;
  highlights: SearchHighlight[];
}

// Search highlight for result snippets
export interface SearchHighlight {
  field: string;
  snippet: string;
  matches: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

// Search query configuration
export interface SearchQuery {
  query: string;
  filters: SearchFilters;
  sort: SearchSort;
  pagination: SearchPagination;
  options: SearchOptions;
}

// Search filters
export interface SearchFilters {
  contentTypes: SearchContentType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: string[];
  tags?: string[];
  author?: string;
  category?: string[];
  level?: string[];
  company?: string[];
  status?: string[];
  language?: 'es' | 'en' | 'all';
}

// Search sorting options
export interface SearchSort {
  field: 'relevance' | 'date' | 'title' | 'author' | 'popularity';
  direction: 'asc' | 'desc';
}

// Search pagination
export interface SearchPagination {
  page: number;
  limit: number;
  offset: number;
}

// Search options
export interface SearchOptions {
  fuzzyMatching: boolean;
  typoTolerance: boolean;
  highlightResults: boolean;
  includeContent: boolean;
  minScore: number;
  maxResults: number;
}

// Search response
export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  totalPages: number;
  facets: SearchFacets;
  suggestions: SearchSuggestion[];
  query: string;
  searchTime: number;
  hasMore: boolean;
}

// Search facets for filtering UI
export interface SearchFacets {
  contentTypes: Array<{
    type: SearchContentType;
    count: number;
    label: string;
  }>;
  categories: Array<{
    category: string;
    count: number;
  }>;
  authors: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  tags: Array<{
    tag: string;
    count: number;
  }>;
  dateRanges: Array<{
    range: string;
    label: string;
    count: number;
  }>;
}

// Search suggestions for autocomplete
export interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'recent' | 'popular';
  count?: number;
  category?: string;
  score: number;
}

// Search history item
export interface SearchHistoryItem {
  id: string;
  userId?: string;
  query: string;
  filters: SearchFilters;
  timestamp: Date;
  resultCount: number;
  clickedResults: string[];
  sessionId: string;
}

// Popular search item
export interface PopularSearch {
  query: string;
  count: number;
  period: 'day' | 'week' | 'month' | 'all';
  trending: boolean;
}

// Search analytics event
export interface SearchAnalyticsEvent {
  type:
    | 'search'
    | 'result_click'
    | 'filter_apply'
    | 'suggestion_click'
    | 'voice_search';
  query?: string;
  resultId?: string;
  position?: number;
  filters?: SearchFilters;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  userAgent: string;
  language: string;
}

// Indexed content for search engine
export interface IndexedContent {
  id: string;
  type: SearchContentType;
  title: string;
  content: string;
  description: string;
  url: string;
  tags: string[];
  metadata: Record<string, any>;
  searchableText: string;
  keywords: string[];
  language: 'es' | 'en';
  boost: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Search index configuration
export interface SearchIndexConfig {
  fields: {
    title: { weight: number; boost: number };
    content: { weight: number; boost: number };
    description: { weight: number; boost: number };
    tags: { weight: number; boost: number };
    keywords: { weight: number; boost: number };
  };
  fuzzy: {
    enabled: boolean;
    maxDistance: number;
    prefixLength: number;
  };
  stemming: {
    enabled: boolean;
    languages: string[];
  };
  stopWords: {
    es: string[];
    en: string[];
  };
}

// Search engine status
export interface SearchEngineStatus {
  isReady: boolean;
  indexSize: number;
  lastIndexUpdate: Date;
  indexedContentCounts: Record<SearchContentType, number>;
  searchCount: number;
  avgSearchTime: number;
  errors: string[];
}

// Advanced search syntax
export interface SearchSyntax {
  phrases: string[]; // "exact phrase"
  required: string[]; // +required
  excluded: string[]; // -excluded
  fields: Record<string, string>; // field:value
  operators: Array<{
    type: 'AND' | 'OR' | 'NOT';
    terms: string[];
  }>;
  wildcards: string[]; // term*
  proximity: Array<{
    terms: string[];
    distance: number;
  }>; // "term1 term2"~5
}

// Search export configuration
export interface SearchExportConfig {
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  fields: string[];
  filters: SearchFilters;
  maxResults: number;
  includeMetadata: boolean;
}

// Voice search configuration
export interface VoiceSearchConfig {
  enabled: boolean;
  language: 'es-ES' | 'en-US' | 'auto';
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

// Search component props
export interface SearchBarProps {
  placeholder?: string;
  defaultQuery?: string;
  onSearch: (query: string, filters?: SearchFilters) => void;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
  showFilters?: boolean;
  showVoiceSearch?: boolean;
  autoFocus?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  debounceMs?: number;
}

export interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQuery?: string;
  defaultFilters?: Partial<SearchFilters>;
  onResultClick?: (result: SearchResultItem) => void;
  className?: string;
}

export interface SearchResultsProps {
  query: string;
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  onExport?: (config: SearchExportConfig) => void;
  className?: string;
}

// Search context state
export interface SearchContextState {
  query: string;
  filters: SearchFilters;
  results: SearchResultItem[];
  suggestions: SearchSuggestion[];
  history: SearchHistoryItem[];
  popular: PopularSearch[];
  isLoading: boolean;
  error: string | null;
  facets: SearchFacets | null;
  total: number;
  hasMore: boolean;
}

// Search context actions
export interface SearchContextActions {
  search: (query: string, filters?: Partial<SearchFilters>) => Promise<void>;
  clearSearch: () => void;
  addToHistory: (item: SearchHistoryItem) => void;
  clearHistory: () => void;
  getSuggestions: (query: string) => Promise<SearchSuggestion[]>;
  trackAnalytics: (event: SearchAnalyticsEvent) => void;
  exportResults: (config: SearchExportConfig) => Promise<Blob>;
  updateFilters: (filters: Partial<SearchFilters>) => void;
}

// Utility types for search operations
export type SearchableField = keyof Pick<
  IndexedContent,
  'title' | 'content' | 'description' | 'tags' | 'keywords'
>;

export type SearchOperator =
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'PHRASE'
  | 'WILDCARD'
  | 'FUZZY'
  | 'PROXIMITY';

export type SearchBoostField = {
  field: SearchableField;
  boost: number;
};

// Content type mapping for search results
export interface ContentTypeMapping {
  jobs: Job;
  events: Event;
  members: User;
  mentors: MentorProfile;
  forums: ForumTopic | ForumPost;
  news: NewsArticle;
  resources: any; // Generic for various resource types
}
