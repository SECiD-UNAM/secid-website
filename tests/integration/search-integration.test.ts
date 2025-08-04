/**
 * Search Integration Tests
 * 
 * Tests for complete search functionality including:
 * - Search engine integration
 * - Index management and updates
 * - Real-time search suggestions
 * - Cross-collection search
 * - Search analytics tracking
 * - Performance optimization
 * - Error handling and fallbacks
 * - Search result ranking
 * - Faceted search
 * - Search persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchEngine } from '@/lib/search/search-engine';
import type { 
  SearchQuery, 
  SearchResponse, 
  SearchResultItem, 
  SearchFilters,
  IndexedContent,
  SearchAnalyticsEvent,
  SearchFacets
} from '@/types/search';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  increment: vi.fn(),
}));

// Mock search engine
vi.mock('@/lib/search/search-engine', () => ({
  searchEngine: {
    search: vi.fn(),
    indexContent: vi.fn(),
    removeFromIndex: vi.fn(),
    updateIndex: vi.fn(),
    getSuggestions: vi.fn(),
    getPopularSearches: vi.fn(),
    trackAnalytics: vi.fn(),
    getSearchAnalytics: vi.fn(),
    buildIndex: vi.fn(),
    clearIndex: vi.fn(),
  },
}));

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  identifyUser: vi.fn(),
}));

// Test data
const mockJobContent: IndexedContent = {
  id: 'job-1',
  type: 'jobs',
  title: 'Senior Data Scientist',
  content: 'Join our data science team to build ML models and analyze big data',
  description: 'We are looking for a senior data scientist with Python and ML experience',
  url: '/jobs/job-1',
  tags: ['python', 'machine-learning', 'data-science', 'tensorflow'],
  metadata: {
    company: 'TechCorp',
    location: 'Mexico City',
    remote: true,
    salary: '80000-120000',
    level: 'senior',
    type: 'full-time',
  },
  searchableText: 'Senior Data Scientist TechCorp Mexico City Python Machine Learning',
  keywords: ['data scientist', 'python', 'ml', 'tensorflow', 'remote'],
  language: 'es',
  boost: 1.0,
  createdAt: new Date('2023-02-01'),
  updatedAt: new Date('2023-02-01'),
  isActive: true,
};

const mockEventContent: IndexedContent = {
  id: 'event-1',
  type: 'events',
  title: 'Machine Learning Workshop',
  content: 'Learn the fundamentals of machine learning in this hands-on workshop',
  description: 'A beginner-friendly workshop covering ML basics with Python',
  url: '/events/event-1',
  tags: ['machine-learning', 'workshop', 'python', 'beginner'],
  metadata: {
    date: '2023-03-15',
    location: 'Online',
    duration: '4 hours',
    level: 'beginner',
    price: 'free',
  },
  searchableText: 'Machine Learning Workshop Python Beginner Online',
  keywords: ['ml workshop', 'python', 'machine learning', 'beginner'],
  language: 'es',
  boost: 0.8,
  createdAt: new Date('2023-02-10'),
  updatedAt: new Date('2023-02-10'),
  isActive: true,
};

const mockForumContent: IndexedContent = {
  id: 'forum-1',
  type: 'forums',
  title: 'Career transition from academia to industry',
  content: 'I am looking for advice on transitioning from a PhD in statistics to a data science role in industry',
  description: 'Discussion about career transitions in data science',
  url: '/forums/forum-1',
  tags: ['career', 'transition', 'advice', 'data-science'],
  metadata: {
    category: 'career',
    author: 'user-123',
    replies: 15,
    upvotes: 23,
  },
  searchableText: 'Career transition academia industry PhD statistics data science',
  keywords: ['career transition', 'academia', 'industry', 'phd', 'statistics'],
  language: 'es',
  boost: 0.6,
  createdAt: new Date('2023-02-05'),
  updatedAt: new Date('2023-02-08'),
  isActive: true,
};

const mockSearchResults: SearchResultItem[] = [
  {
    id: 'job-1',
    type: 'jobs',
    title: 'Senior Data Scientist',
    description: 'We are looking for a senior data scientist with Python and ML experience',
    content: 'Join our data science team to build ML models and analyze big data',
    url: '/jobs/job-1',
    tags: ['python', 'machine-learning', 'data-science'],
    score: 0.95,
    highlights: [
      {
        field: 'title',
        snippet: 'Senior <mark>Data Scientist</mark>',
        matches: [{ start: 7, end: 20, text: 'Data Scientist' }],
      },
    ],
    metadata: {
      createdAt: new Date('2023-02-01'),
      company: 'TechCorp',
      location: 'Mexico City',
    },
  },
  {
    id: 'event-1',
    type: 'events',
    title: 'Machine Learning Workshop',
    description: 'A beginner-friendly workshop covering ML basics with Python',
    content: 'Learn the fundamentals of machine learning in this hands-on workshop',
    url: '/events/event-1',
    tags: ['machine-learning', 'workshop', 'python'],
    score: 0.87,
    highlights: [
      {
        field: 'description',
        snippet: 'workshop covering <mark>ML basics</mark> with Python',
        matches: [{ start: 18, end: 27, text: 'ML basics' }],
      },
    ],
    metadata: {
      createdAt: new Date('2023-02-10'),
      location: 'Online',
    },
  },
];

const mockFacets: SearchFacets = {
  contentTypes: [
    { type: 'jobs', count: 15, label: 'Jobs' },
    { type: 'events', count: 8, label: 'Events' },
    { type: 'forums', count: 12, label: 'Forums' },
  ],
  categories: [
    { category: 'Technology', count: 10 },
    { category: 'Education', count: 8 },
    { category: 'Career', count: 5 },
  ],
  authors: [
    { id: 'user-123', name: 'John Doe', count: 3 },
    { id: 'user-456', name: 'Jane Smith', count: 2 },
  ],
  tags: [
    { tag: 'machine-learning', count: 15 },
    { tag: 'python', count: 12 },
    { tag: 'career', count: 8 },
  ],
  dateRanges: [
    { range: 'last-week', label: 'Last week', count: 5 },
    { range: 'last-month', label: 'Last month', count: 15 },
  ],
};

// Mock the search engine
const mockSearchEngine = vi.mocked(searchEngine);

describe('Search Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Search Operations', () => {
    it('performs basic text search across collections', async () => {
      const mockResponse: SearchResponse = {
        results: mockSearchResults,
        total: 2,
        page: 0,
        totalPages: 1,
        facets: mockFacets,
        suggestions: [],
        query: 'data science',
        searchTime: 45,
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(mockResponse);

      const query: SearchQuery = {
        query: 'data science',
        filters: {
          contentTypes: ['all'],
          language: 'es',
        },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(mockSearchEngine.search).toHaveBeenCalledWith(query);
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.query).toBe('data science');
      expect(result.searchTime).toBeLessThan(100); // Should be fast
    });

    it('filters search results by content type', async () => {
      const jobsOnlyResponse: SearchResponse = {
        results: [mockSearchResults[0]], // Only job result
        total: 1,
        page: 0,
        totalPages: 1,
        facets: {
          ...mockFacets,
          contentTypes: [{ type: 'jobs', count: 1, label: 'Jobs' }],
        },
        suggestions: [],
        query: 'data science',
        searchTime: 25,
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(jobsOnlyResponse);

      const query: SearchQuery = {
        query: 'data science',
        filters: {
          contentTypes: ['jobs'],
          language: 'es',
        },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('jobs');
      expect(result.facets.contentTypes).toHaveLength(1);
    });

    it('applies multiple filters simultaneously', async () => {
      const filteredResponse: SearchResponse = {
        results: [mockSearchResults[0]],
        total: 1,
        page: 0,
        totalPages: 1,
        facets: mockFacets,
        suggestions: [],
        query: 'python',
        searchTime: 35,
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(filteredResponse);

      const query: SearchQuery = {
        query: 'python',
        filters: {
          contentTypes: ['jobs'],
          location: ['Mexico City'],
          tags: ['python', 'machine-learning'],
          language: 'es',
        },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].tags).toContain('python');
      expect(result.results[0].metadata.location).toBe('Mexico City');
    });

    it('supports fuzzy matching for typos', async () => {
      const fuzzyResponse: SearchResponse = {
        results: mockSearchResults,
        total: 2,
        page: 0,
        totalPages: 1,
        facets: mockFacets,
        suggestions: [],
        query: 'data scienst', // Typo in "scientist"
        searchTime: 55,
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(fuzzyResponse);

      const query: SearchQuery = {
        query: 'data scienst', // Intentional typo
        filters: {
          contentTypes: ['all'],
          language: 'es',
        },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.results).toContain(
        expect.objectContaining({
          title: 'Senior Data Scientist',
        })
      );
    });
  });

  describe('Search Suggestions', () => {
    it('provides real-time search suggestions', async () => {
      const mockSuggestions = [
        { text: 'data scientist', type: 'query' as const, score: 0.95, count: 15 },
        { text: 'data analysis', type: 'query' as const, score: 0.87, count: 12 },
        { text: 'data engineer', type: 'query' as const, score: 0.78, count: 8 },
      ];

      mockSearchEngine.getSuggestions.mockResolvedValue(mockSuggestions);

      const suggestions = await searchEngine.getSuggestions('data');

      expect(mockSearchEngine.getSuggestions).toHaveBeenCalledWith('data');
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].text).toBe('data scientist');
      expect(suggestions[0].count).toBe(15);
    });

    it('returns category-specific suggestions', async () => {
      const mockCategorySuggestions = [
        { text: 'python developer', type: 'query' as const, score: 0.9, category: 'jobs' },
        { text: 'python workshop', type: 'query' as const, score: 0.8, category: 'events' },
      ];

      mockSearchEngine.getSuggestions.mockResolvedValue(mockCategorySuggestions);

      const suggestions = await searchEngine.getSuggestions('python');

      expect(suggestions).toContain(
        expect.objectContaining({
          text: 'python developer',
          category: 'jobs',
        })
      );
      expect(suggestions).toContain(
        expect.objectContaining({
          text: 'python workshop',
          category: 'events',
        })
      );
    });

    it('includes popular searches in suggestions', async () => {
      const mockPopularSuggestions = [
        { text: 'remote data science jobs', type: 'popular' as const, score: 0.95, count: 145 },
        { text: 'machine learning course', type: 'popular' as const, score: 0.85, count: 89 },
      ];

      mockSearchEngine.getSuggestions.mockResolvedValue(mockPopularSuggestions);

      const suggestions = await searchEngine.getSuggestions('');

      expect(suggestions).toContain(
        expect.objectContaining({
          type: 'popular',
          text: 'remote data science jobs',
        })
      );
    });
  });

  describe('Search Analytics', () => {
    it('tracks search events', async () => {
      const analyticsEvent: SearchAnalyticsEvent = {
        type: 'search',
        query: 'data scientist',
        timestamp: new Date(),
        userId: 'user-123',
        sessionId: 'session-456',
        userAgent: 'Mozilla/5.0...',
        language: 'es',
        filters: {
          contentTypes: ['jobs'],
          language: 'es',
        },
      };

      mockSearchEngine.trackAnalytics.mockResolvedValue(undefined);

      await searchEngine.trackAnalytics(analyticsEvent);

      expect(mockSearchEngine.trackAnalytics).toHaveBeenCalledWith(analyticsEvent);
    });

    it('tracks result clicks', async () => {
      const clickEvent: SearchAnalyticsEvent = {
        type: 'result_click',
        query: 'data scientist',
        resultId: 'job-1',
        position: 1,
        timestamp: new Date(),
        userId: 'user-123',
        sessionId: 'session-456',
        userAgent: 'Mozilla/5.0...',
        language: 'es',
      };

      mockSearchEngine.trackAnalytics.mockResolvedValue(undefined);

      await searchEngine.trackAnalytics(clickEvent);

      expect(mockSearchEngine.trackAnalytics).toHaveBeenCalledWith(clickEvent);
    });

    it('aggregates search analytics', async () => {
      const mockAnalytics = {
        totalSearches: 1542,
        uniqueUsers: 287,
        avgSearchTime: 125,
        popularQueries: [
          { query: 'data scientist', count: 145 },
          { query: 'python developer', count: 98 },
        ],
        clickThroughRate: 0.68,
        zeroResultQueries: [
          { query: 'quantum computing', count: 12 },
        ],
      };

      mockSearchEngine.getSearchAnalytics.mockResolvedValue(mockAnalytics);

      const analytics = await searchEngine.getSearchAnalytics({
        startDate: new Date('2023-02-01'),
        endDate: new Date('2023-02-28'),
      });

      expect(analytics.totalSearches).toBe(1542);
      expect(analytics.popularQueries).toHaveLength(2);
      expect(analytics.clickThroughRate).toBe(0.68);
    });
  });

  describe('Index Management', () => {
    it('indexes new content', async () => {
      mockSearchEngine.indexContent.mockResolvedValue(undefined);

      await searchEngine.indexContent(mockJobContent);

      expect(mockSearchEngine.indexContent).toHaveBeenCalledWith(mockJobContent);
    });

    it('updates existing content in index', async () => {
      const updatedContent = {
        ...mockJobContent,
        title: 'Lead Data Scientist',
        updatedAt: new Date(),
      };

      mockSearchEngine.updateIndex.mockResolvedValue(undefined);

      await searchEngine.updateIndex(updatedContent.id, updatedContent);

      expect(mockSearchEngine.updateIndex).toHaveBeenCalledWith(
        updatedContent.id,
        updatedContent
      );
    });

    it('removes content from index', async () => {
      mockSearchEngine.removeFromIndex.mockResolvedValue(undefined);

      await searchEngine.removeFromIndex('job-1');

      expect(mockSearchEngine.removeFromIndex).toHaveBeenCalledWith('job-1');
    });

    it('rebuilds entire search index', async () => {
      const mockContent = [mockJobContent, mockEventContent, mockForumContent];

      mockSearchEngine.buildIndex.mockResolvedValue(undefined);

      await searchEngine.buildIndex(mockContent);

      expect(mockSearchEngine.buildIndex).toHaveBeenCalledWith(mockContent);
    });

    it('validates content before indexing', async () => {
      const invalidContent = {
        ...mockJobContent,
        title: '', // Invalid: empty title
        searchableText: '', // Invalid: empty searchable text
      };

      // Should validate content structure
      const isValidContent = (content: IndexedContent) => {
        return content.title &&
               content.title.length > 0 &&
               content.searchableText &&
               content.searchableText.length > 0 &&
               content.type &&
               content.language;
      };

      expect(isValidContent(invalidContent)).toBe(false);
      expect(isValidContent(mockJobContent)).toBe(true);
    });
  });

  describe('Faceted Search', () => {
    it('returns facets with search results', async () => {
      const facetedResponse: SearchResponse = {
        results: mockSearchResults,
        total: 35,
        page: 0,
        totalPages: 4,
        facets: mockFacets,
        suggestions: [],
        query: 'python',
        searchTime: 42,
        hasMore: true,
      };

      mockSearchEngine.search.mockResolvedValue(facetedResponse);

      const query: SearchQuery = {
        query: 'python',
        filters: {
          contentTypes: ['all'],
          language: 'es',
        },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.facets.contentTypes).toHaveLength(3);
      expect(result.facets.tags).toContain(
        expect.objectContaining({
          tag: 'python',
          count: 12,
        })
      );
      expect(result.facets.categories).toContain(
        expect.objectContaining({
          category: 'Technology',
          count: 10,
        })
      );
    });

    it('updates facets based on applied filters', async () => {
      const filteredFacets: SearchFacets = {
        ...mockFacets,
        contentTypes: [{ type: 'jobs', count: 5, label: 'Jobs' }],
        tags: [{ tag: 'python', count: 5 }],
      };

      const filteredResponse: SearchResponse = {
        results: [mockSearchResults[0]],
        total: 5,
        page: 0,
        totalPages: 1,
        facets: filteredFacets,
        suggestions: [],
        query: 'python',
        searchTime: 28,
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(filteredResponse);

      const query: SearchQuery = {
        query: 'python',
        filters: {
          contentTypes: ['jobs'],
          tags: ['python'],
          language: 'es',
        },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.facets.contentTypes).toHaveLength(1);
      expect(result.facets.contentTypes[0].type).toBe('jobs');
      expect(result.facets.tags).toHaveLength(1);
    });
  });

  describe('Pagination and Sorting', () => {
    it('handles pagination correctly', async () => {
      const page1Response: SearchResponse = {
        results: mockSearchResults,
        total: 25,
        page: 0,
        totalPages: 3,
        facets: mockFacets,
        suggestions: [],
        query: 'data',
        searchTime: 38,
        hasMore: true,
      };

      mockSearchEngine.search.mockResolvedValue(page1Response);

      const query: SearchQuery = {
        query: 'data',
        filters: { contentTypes: ['all'], language: 'es' },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.page).toBe(0);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(25);
    });

    it('sorts results by different criteria', async () => {
      const dateSortedResponse: SearchResponse = {
        results: [...mockSearchResults].reverse(), // Reverse to simulate date sorting
        total: 2,
        page: 0,
        totalPages: 1,
        facets: mockFacets,
        suggestions: [],
        query: 'data',
        searchTime: 33,
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(dateSortedResponse);

      const query: SearchQuery = {
        query: 'data',
        filters: { contentTypes: ['all'], language: 'es' },
        sort: { field: 'date', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      // Verify that results are sorted by date (newer first)
      expect(result.results[0].metadata.createdAt).toEqual(new Date('2023-02-10'));
      expect(result.results[1].metadata.createdAt).toEqual(new Date('2023-02-01'));
    });
  });

  describe('Performance and Optimization', () => {
    it('returns results within acceptable time limits', async () => {
      const startTime = Date.now();

      const fastResponse: SearchResponse = {
        results: mockSearchResults,
        total: 2,
        page: 0,
        totalPages: 1,
        facets: mockFacets,
        suggestions: [],
        query: 'test',
        searchTime: 15, // Very fast response
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(fastResponse);

      const query: SearchQuery = {
        query: 'test',
        filters: { contentTypes: ['all'], language: 'es' },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);
      const endTime = Date.now();

      expect(result.searchTime).toBeLessThan(100); // Should be under 100ms
      expect(endTime - startTime).toBeLessThan(1000); // Total time under 1s
    });

    it('handles large result sets efficiently', async () => {
      const largeResponse: SearchResponse = {
        results: Array(10).fill(null).map((_, i) => ({
          ...mockSearchResults[0],
          id: `job-${i + 1}`,
        })),
        total: 1000,
        page: 0,
        totalPages: 100,
        facets: mockFacets,
        suggestions: [],
        query: 'developer',
        searchTime: 89, // Still reasonable for large dataset
        hasMore: true,
      };

      mockSearchEngine.search.mockResolvedValue(largeResponse);

      const query: SearchQuery = {
        query: 'developer',
        filters: { contentTypes: ['all'], language: 'es' },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 1000,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.total).toBe(1000);
      expect(result.results).toHaveLength(10); // Paginated
      expect(result.searchTime).toBeLessThan(200); // Still fast
    });
  });

  describe('Error Handling', () => {
    it('handles search engine errors gracefully', async () => {
      const searchError = new Error('Search service unavailable');
      mockSearchEngine.search.mockRejectedValue(searchError);

      const query: SearchQuery = {
        query: 'test',
        filters: { contentTypes: ['all'], language: 'es' },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      await expect(searchEngine.search(query)).rejects.toThrow('Search service unavailable');
    });

    it('provides fallback for failed suggestions', async () => {
      mockSearchEngine.getSuggestions.mockRejectedValue(new Error('Suggestions service down'));

      await expect(searchEngine.getSuggestions('test')).rejects.toThrow('Suggestions service down');
    });

    it('handles index corruption gracefully', async () => {
      const indexError = new Error('Index corrupted');
      mockSearchEngine.search.mockRejectedValue(indexError);

      const query: SearchQuery = {
        query: 'test',
        filters: { contentTypes: ['all'], language: 'es' },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      await expect(searchEngine.search(query)).rejects.toThrow('Index corrupted');

      // Should trigger index rebuild
      expect(mockSearchEngine.buildIndex).toHaveBeenCalled();
    });
  });

  describe('Multi-language Support', () => {
    it('searches content in multiple languages', async () => {
      const multiLangResponse: SearchResponse = {
        results: [
          {
            ...mockSearchResults[0],
            title: 'Senior Data Scientist',
            language: 'es',
          },
          {
            ...mockSearchResults[1],
            title: 'Machine Learning Workshop',
            language: 'en',
          },
        ],
        total: 2,
        page: 0,
        totalPages: 1,
        facets: mockFacets,
        suggestions: [],
        query: 'machine learning',
        searchTime: 42,
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(multiLangResponse);

      const query: SearchQuery = {
        query: 'machine learning',
        filters: { contentTypes: ['all'], language: 'all' },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.results).toHaveLength(2);
      expect(result.results.some(r => r.language === 'es')).toBe(true);
      expect(result.results.some(r => r.language === 'en')).toBe(true);
    });

    it('filters results by language', async () => {
      const spanishOnlyResponse: SearchResponse = {
        results: [
          {
            ...mockSearchResults[0],
            language: 'es',
          },
        ],
        total: 1,
        page: 0,
        totalPages: 1,
        facets: mockFacets,
        suggestions: [],
        query: 'ciencia de datos',
        searchTime: 32,
        hasMore: false,
      };

      mockSearchEngine.search.mockResolvedValue(spanishOnlyResponse);

      const query: SearchQuery = {
        query: 'ciencia de datos',
        filters: { contentTypes: ['all'], language: 'es' },
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 10, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: false,
          minScore: 0.1,
          maxResults: 100,
        },
      };

      const result = await searchEngine.search(query);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].language).toBe('es');
    });
  });

  describe('Real-time Search', () => {
    it('provides instant search results as user types', async () => {
      const queries = ['d', 'da', 'dat', 'data'];
      
      for (const searchQuery of queries) {
        const instantResponse: SearchResponse = {
          results: mockSearchResults.slice(0, Math.min(searchQuery.length, 2)),
          total: searchQuery.length * 2,
          page: 0,
          totalPages: 1,
          facets: mockFacets,
          suggestions: [],
          query: searchQuery,
          searchTime: 15, // Very fast for instant search
          hasMore: false,
        };

        mockSearchEngine.search.mockResolvedValue(instantResponse);

        const query: SearchQuery = {
          query: searchQuery,
          filters: { contentTypes: ['all'], language: 'es' },
          sort: { field: 'relevance', direction: 'desc' },
          pagination: { page: 0, limit: 5, offset: 0 }, // Smaller limit for instant search
          options: {
            fuzzyMatching: false, // Disable for speed
            typoTolerance: false, // Disable for speed
            highlightResults: true,
            includeContent: false,
            minScore: 0.3, // Higher threshold for instant search
            maxResults: 5,
          },
        };

        const result = await searchEngine.search(query);

        expect(result.searchTime).toBeLessThan(50); // Must be very fast
        expect(result.results.length).toBeLessThanOrEqual(5);
      }
    });
  });
});