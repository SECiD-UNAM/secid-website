import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { searchEngine} from '@/lib/search/search-engine';
import { searchIndexer} from '@/lib/search/search-indexer';
/**
 * Search Context Provider - Global search state management
 * Integrates search engine, analytics, history, and preferences
 */

import type {
  SearchContextState,
  SearchContextActions,
  SearchFilters,
  SearchResultItem,
  SearchSuggestion,
  SearchHistoryItem,
  PopularSearch,
  SearchFacets,
  SearchExportConfig,
  SearchAnalyticsEvent
 } from '@/types/search';
import {
  searchAnalytics, 
  searchHistory, 
  popularSearches, 
  searchPreferences 
} from '@/lib/search/search-analytics';

// Action types
type SearchAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_FILTERS'; payload: SearchFilters }
  | { type: 'SET_RESULTS'; payload: SearchResultItem[] }
  | { type: 'SET_SUGGESTIONS'; payload: SearchSuggestion[] }
  | { type: 'SET_HISTORY'; payload: SearchHistoryItem[] }
  | { type: 'SET_POPULAR'; payload: PopularSearch[] }
  | { type: 'SET_FACETS'; payload: SearchFacets | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TOTAL'; payload: number }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'ADD_TO_HISTORY'; payload: SearchHistoryItem }
  | { type: 'CLEAR_HISTORY' };

// Initial state
const initialState: SearchContextState = {
  query: '',
  filters: {
    contentTypes: ['all'],
    language: 'es'
  } as SearchFilters,
  results: [],
  suggestions: [],
  history: [],
  popular: [],
  isLoading: false,
  error: null,
  facets: null,
  total: 0,
  hasMore: false
};

// Reducer function
function searchReducer(state: SearchContextState, action: SearchAction): SearchContextState {
  switch (action['type']) {
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    
    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };
    
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    
    case 'SET_POPULAR':
      return { ...state, popular: action.payload };
    
    case 'SET_FACETS':
      return { ...state, facets: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_TOTAL':
      return { ...state, total: action.payload };
    
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };
    
    case 'CLEAR_SEARCH':
      return {
        ...state,
        query: '',
        results: [],
        suggestions: [],
        error: null,
        facets: null,
        total: 0,
        hasMore: false
      };
    
    case 'ADD_TO_HISTORY':
      return {
        ...state,
        history: [action.payload, ...state.history.slice(0, 19)] // Keep last 20
      };
    
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };
    
    default:
      return state;
  }
}

// Context creation
const SearchContext = createContext<{
  state: SearchContextState;
  actions: SearchContextActions;
} | null>(null);

// Search provider component
interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  // Initialize search data on mount
  useEffect(() => {
    const initializeSearch = async () => {
      try {
        // Load search history
        const history = await searchHistory.getHistory(20);
        dispatch({ type: 'SET_HISTORY', payload: history });

        // Load popular searches
        const popular = await popularSearches.getPopularSearches('week', 10);
        dispatch({ type: 'SET_POPULAR', payload: popular });

        // Load user preferences
        const preferences = searchPreferences.getPreferences();
        if (preferences.defaultFilters) {
          dispatch({ type: 'SET_FILTERS', payload: preferences.defaultFilters });
        }

        // Ensure search index is ready
        const indexStatus = searchIndexer.getIndexingStatus();
        if (!indexStatus.engineStatus.isReady) {
          console.log('Search index not ready, initializing...');
          await searchIndexer.indexAllContent();
        }

      } catch (error) {
        console.error('Error initializing search:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize search' });
      }
    };

    initializeSearch();
  }, []);

  // Search actions
  const actions: SearchContextActions = {
    // Perform search
    search: async (query: string, filters?: Partial<SearchFilters>) => {
      if (!query.trim()) {
        dispatch({ type: 'CLEAR_SEARCH' });
        return;
      }

      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const searchFilters = { ...state.filters, ...filters };
        dispatch({ type: 'SET_QUERY', payload: query });
        dispatch({ type: 'SET_FILTERS', payload: searchFilters });

        const startTime = Date.now();
        const response = await searchEngine.search({
          query,
          filters: searchFilters,
          sort: { field: 'relevance', direction: 'desc' },
          pagination: { page: 0, limit: 20, offset: 0 },
          options: {
            fuzzyMatching: true,
            typoTolerance: true,
            highlightResults: true,
            includeContent: false,
            minScore: 0.1,
            maxResults: 1000
          }
        });

        const searchTime = Date.now() - startTime;

        dispatch({ type: 'SET_RESULTS', payload: response.results });
        dispatch({ type: 'SET_FACETS', payload: response.facets });
        dispatch({ type: 'SET_TOTAL', payload: response['total'] });
        dispatch({ type: 'SET_HAS_MORE', payload: response.hasMore });

        // Track analytics
        await searchAnalytics.trackSearch(query, searchFilters, response.total, searchTime);

        // Add to history
        const historyItem: SearchHistoryItem = {
          id: crypto.randomUUID(),
          query,
          filters: searchFilters,
          timestamp: new Date(),
          resultCount: response['total'],
          clickedResults: [],
          sessionId: searchAnalytics.getSessionAnalytics().sessionId
        };

        await searchHistory.addToHistory(
          query,
          searchFilters,
          response.total,
          []
        );

        dispatch({ type: 'ADD_TO_HISTORY', payload: historyItem });

      } catch (error) {
        console.error('Search error:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Search failed. Please try again.' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Clear search
    clearSearch: () => {
      dispatch({ type: 'CLEAR_SEARCH' });
    },

    // Add to history
    addToHistory: async (item: SearchHistoryItem) => {
      await searchHistory.addToHistory(
        item.query,
        item.filters,
        item.resultCount,
        item.clickedResults
      );
      dispatch({ type: 'ADD_TO_HISTORY', payload: item });
    },

    // Clear history
    clearHistory: async () => {
      await searchHistory.clearHistory();
      dispatch({ type: 'CLEAR_HISTORY' });
    },

    // Get suggestions
    getSuggestions: async (query: string): Promise<SearchSuggestion[]> => {
      if (query.trim().length < 2) return [];

      try {
        const response = await searchEngine.search({
          query,
          filters: state.filters,
          sort: { field: 'relevance', direction: 'desc' },
          pagination: { page: 0, limit: 5, offset: 0 },
          options: {
            fuzzyMatching: true,
            typoTolerance: true,
            highlightResults: false,
            includeContent: false,
            minScore: 0.2,
            maxResults: 5
          }
        });

        const suggestions: SearchSuggestion[] = [
          ...response.suggestions,
          ...response?.results?.slice(0, 3).map(result => ({
            text: result.title,
            type: 'query' as const,
            score: result.score,
            category: result.type
          }))
        ];

        dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
        return suggestions;

      } catch (error) {
        console.error('Error getting suggestions:', error);
        return [];
      }
    },

    // Track analytics
    trackAnalytics: async (event: SearchAnalyticsEvent) => {
      try {
        switch (event['type']) {
          case 'result_click':
            await searchAnalytics.trackResultClick(
              event.query || state.query,
              event.resultId || '',
              '', // Would need result title
              event.position || 0,
              '' // Would need result type
            );
            break;
          
          case 'filter_apply':
            await searchAnalytics.trackFilterApply(
              state.query,
              event.filters || {},
              state.total,
              0 // Would need new result count
            );
            break;
          
          case 'suggestion_click':
            await searchAnalytics.trackSuggestionClick(
              event.query || state.query,
              '', // Would need suggestion text
              '' // Would need suggestion type
            );
            break;
          
          case 'voice_search':
            await searchAnalytics.trackVoiceSearch(
              event.query || '',
              event.query || '',
              1.0 // Would need actual confidence
            );
            break;
        }
      } catch (error) {
        console.error('Error tracking analytics:', error);
      }
    },

    // Export results
    exportResults: async (config: SearchExportConfig): Promise<Blob> => {
      try {
        const dataToExport = state.results.map(result => ({
          title: result.title,
          description: result.description,
          type: result['type'],
          url: result.url,
          tags: result?.tags?.join(', '),
          createdAt: result['metadata'].createdAt.toISOString(),
          score: result.score
        }));

        let content: string;
        let mimeType: string;

        switch (config.format) {
          case 'csv':
            const headers = Object.keys(dataToExport?.[0] || {});
            const csvRows = [
              headers['join'](','),
              ...dataToExport.map(row => 
                headers['map'](header => 
                  JSON.stringify(row[header as keyof typeof row] || '')
                ).join(',')
              )
            ];
            content = csvRows.join('\n');
            mimeType = 'text/csv';
            break;

          case 'json':
            content = JSON.stringify(dataToExport, null, 2);
            mimeType = 'application/json';
            break;

          default:
            throw new Error(`Export format ${config.format} not implemented`);
        }

        return new Blob([content], { type: mimeType });

      } catch (error) {
        console.error('Error exporting results:', error);
        throw error;
      }
    },

    // Update filters
    updateFilters: (filters: Partial<SearchFilters>) => {
      const newFilters = { ...state.filters, ...filters };
      dispatch({ type: 'SET_FILTERS', payload: newFilters });
      
      // Save preferences
      searchPreferences.savePreferences({
        defaultFilters: newFilters
      });
    }
  };

  return (
    <SearchContext.Provider value={{ state, actions }}>
      {children}
    </SearchContext.Provider>
  );
};

// Custom hook to use search context
export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

// Custom hook for search translations
export const useSearchTranslations = () => {
  // This would integrate with the existing useTranslations hook
  // For now, returning a simple function
  return (key: string, fallback: string = '') => {
    // In a real implementation, this would use the translation system
    // and return the appropriate translation based on current language
    return fallback || key;
  };
};

export default SearchContext;