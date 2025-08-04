/**
 * GlobalSearch Component Unit Tests
 * 
 * Tests for the GlobalSearch modal component including:
 * - Modal functionality and accessibility
 * - Search operations and result handling
 * - Keyboard navigation
 * - Filter interactions
 * - Recent and popular searches
 * - Error handling and edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import GlobalSearch from '@/components/search/GlobalSearch';
import type { SearchResultItem, SearchFilters, SearchSuggestion } from '@/types/search';

// Mock dependencies
vi.mock('@/lib/search/search-engine', () => ({
  searchEngine: {
    search: vi.fn(),
  },
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

vi.mock('@headlessui/react', () => ({
  Dialog: ({ children, onClose }: any) => (
    <div data-testid="dialog" onClick={onClose}>
      {children}
    </div>
  ),
  'Dialog.Panel': ({ children, className }: any) => (
    <div data-testid="dialog-panel" className={className}>
      {children}
    </div>
  ),
  'Dialog.Title': ({ children }: any) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  Transition: ({ children, show }: any) => show ? <div>{children}</div> : null,
  'Transition.Child': ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/search/SearchBar', () => ({
  default: ({ onSearch, onSuggestionSelect, defaultQuery, autoFocus }: any) => (
    <div data-testid="search-bar">
      <input
        data-testid="search-input"
        defaultValue={defaultQuery}
        onChange={(e) => onSearch(e.target.value)}
        autoFocus={autoFocus}
      />
      <button
        data-testid="suggestion-button"
        onClick={() => onSuggestionSelect({ text: 'test suggestion', type: 'query', score: 1 })}
      >
        Select Suggestion
      </button>
    </div>
  ),
}));

// Mock search engine
const mockSearchEngine = vi.mocked(await import('@/lib/search/search-engine')).searchEngine;

// Test data
const mockSearchResults: SearchResultItem[] = [
  {
    id: '1',
    type: 'jobs',
    title: 'Senior Data Scientist',
    description: 'Join our team as a Senior Data Scientist',
    content: 'Full job description here',
    url: '/jobs/1',
    tags: ['python', 'machine-learning'],
    score: 0.95,
    highlights: [
      {
        field: 'title',
        snippet: 'Senior <mark>Data</mark> Scientist',
        matches: [{ start: 7, end: 11, text: 'Data' }],
      },
    ],
    metadata: {
      createdAt: new Date('2023-01-01'),
      category: 'Technology',
      location: 'Mexico City',
      company: 'TechCorp',
    },
  },
  {
    id: '2',
    type: 'events',
    title: 'ML Workshop',
    description: 'Machine Learning workshop for beginners',
    content: 'Workshop content here',
    url: '/events/2',
    tags: ['machine-learning', 'workshop'],
    score: 0.87,
    highlights: [],
    metadata: {
      createdAt: new Date('2023-01-02'),
      category: 'Education',
    },
  },
];

const mockSuggestion: SearchSuggestion = {
  text: 'data science',
  type: 'query',
  score: 0.9,
  category: 'jobs',
};

describe('GlobalSearch', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    defaultQuery: '',
    onResultClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful search response
    mockSearchEngine.search.mockResolvedValue({
      results: mockSearchResults,
      total: 2,
      page: 0,
      totalPages: 1,
      suggestions: [mockSuggestion],
      facets: {
        contentTypes: [],
        categories: [],
        authors: [],
        tags: [],
        dateRanges: [],
      },
      query: 'test',
      searchTime: 50,
      hasMore: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modal Functionality', () => {
    it('renders modal when open', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-panel')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Search SECiD');
    });

    it('does not render modal when closed', () => {
      render(<GlobalSearch {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('applies custom className', () => {
      const customClass = 'custom-search-modal';
      render(<GlobalSearch {...defaultProps} className={customClass} />);
      
      const panel = screen.getByTestId('dialog-panel');
      expect(panel).toHaveClass(customClass);
    });
  });

  describe('Search Operations', () => {
    it('performs search when query is entered', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'data scientist');
      
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledWith({
          query: 'data scientist',
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
            maxResults: 10,
          },
        });
      });
    });

    it('displays search results', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('ML Workshop')).toBeInTheDocument();
        expect(screen.getByText('Search Results (2)')).toBeInTheDocument();
      });
    });

    it('shows loading state during search', async () => {
      // Mock slow search response
      mockSearchEngine.search.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          results: [],
          total: 0,
          page: 0,
          totalPages: 0,
          suggestions: [],
          facets: {
            contentTypes: [],
            categories: [],
            authors: [],
            tags: [],
            dateRanges: [],
          },
          query: '',
          searchTime: 100,
          hasMore: false,
        }), 100))
      );

      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('handles search errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchEngine.search.mockRejectedValue(new Error('Search failed'));

      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('shows no results message when search returns empty', async () => {
      mockSearchEngine.search.mockResolvedValue({
        results: [],
        total: 0,
        page: 0,
        totalPages: 0,
        suggestions: [],
        facets: {
          contentTypes: [],
          categories: [],
          authors: [],
          tags: [],
          dateRanges: [],
        },
        query: 'nonexistent',
        searchTime: 25,
        hasMore: false,
      });

      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'nonexistent');
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument();
      });
    });
  });

  describe('Result Interactions', () => {
    it('calls onResultClick when result is clicked', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      });

      const resultButton = screen.getByRole('button', { name: /senior data scientist/i });
      await user.click(resultButton);
      
      expect(defaultProps.onResultClick).toHaveBeenCalledWith(mockSearchResults[0]);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('displays result metadata correctly', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('📂 Technology')).toBeInTheDocument();
        expect(screen.getByText('📍 Mexico City')).toBeInTheDocument();
        expect(screen.getByText('🔍 0.95')).toBeInTheDocument();
      });
    });

    it('displays search highlights', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText(/Senior.*Data.*Scientist/)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates through results with arrow keys', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      });

      // Navigate down
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      
      // First result should be selected
      const firstResult = screen.getByRole('button', { name: /senior data scientist/i });
      expect(firstResult).toHaveClass('bg-blue-50', 'border-blue-200');
      
      // Navigate down again
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      
      // Second result should be selected
      const secondResult = screen.getByRole('button', { name: /ml workshop/i });
      expect(secondResult).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('navigates up with arrow up key', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      });

      // Navigate down twice to select second item
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      
      // Navigate up
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      
      // First result should be selected again
      const firstResult = screen.getByRole('button', { name: /senior data scientist/i });
      expect(firstResult).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('selects result with Enter key', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      });

      // Navigate to first result
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      
      // Select with Enter
      fireEvent.keyDown(document, { key: 'Enter' });
      
      expect(defaultProps.onResultClick).toHaveBeenCalledWith(mockSearchResults[0]);
    });
  });

  describe('Content Type Filters', () => {
    it('shows filter toggle button', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /toggle filters/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('toggles filter visibility', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /toggle filters/i });
      
      // Filters should be hidden initially
      expect(screen.queryByText('Content Type')).not.toBeInTheDocument();
      
      // Click to show filters
      await user.click(filterButton);
      
      expect(screen.getByText('Content Type')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /jobs/i })).toBeInTheDocument();
    });

    it('applies content type filter', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      // Show filters
      const filterButton = screen.getByRole('button', { name: /toggle filters/i });
      await user.click(filterButton);
      
      // Select jobs filter
      const jobsFilter = screen.getByRole('button', { name: /jobs/i });
      await user.click(jobsFilter);
      
      // Perform search
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              contentTypes: ['jobs'],
            }),
          })
        );
      });
    });
  });

  describe('Suggestion Handling', () => {
    it('handles suggestion selection', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const suggestionButton = screen.getByTestId('suggestion-button');
      await user.click(suggestionButton);
      
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test suggestion',
          })
        );
      });
    });
  });

  describe('Recent and Popular Searches', () => {
    it('displays recent searches when no query', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      expect(screen.getByText('data scientist jobs')).toBeInTheDocument();
      expect(screen.getByText('machine learning workshop')).toBeInTheDocument();
    });

    it('displays popular searches', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      expect(screen.getByText('Popular Searches')).toBeInTheDocument();
      expect(screen.getByText('remote data science jobs')).toBeInTheDocument();
      expect(screen.getByText('🔥 Trending')).toBeInTheDocument();
    });

    it('handles recent search click', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const recentSearch = screen.getByRole('button', { name: /data scientist jobs/i });
      await user.click(recentSearch);
      
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'data scientist jobs',
          })
        );
      });
    });

    it('handles popular search click', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const popularSearch = screen.getByRole('button', { name: /remote data science jobs/i });
      await user.click(popularSearch);
      
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'remote data science jobs',
          })
        );
      });
    });
  });

  describe('Default Props Handling', () => {
    it('uses default query when provided', async () => {
      const defaultQuery = 'initial search';
      render(<GlobalSearch {...defaultProps} defaultQuery={defaultQuery} />);
      
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: defaultQuery,
          })
        );
      });
    });

    it('uses default filters when provided', async () => {
      const defaultFilters = { contentTypes: ['jobs'] as const, language: 'en' as const };
      render(<GlobalSearch {...defaultProps} defaultFilters={defaultFilters} />);
      
      const searchInput = screen.getByTestId('search-input');
      await userEvent.setup().type(searchInput, 'test');
      
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining(defaultFilters),
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle filters/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('provides keyboard shortcuts information', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      expect(screen.getByText('↑↓ Navigate')).toBeInTheDocument();
      expect(screen.getByText('↵ Select')).toBeInTheDocument();
      expect(screen.getByText('Esc Close')).toBeInTheDocument();
    });

    it('has screen reader accessible shortcuts', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      expect(screen.getByText('Use arrow keys to navigate suggestions')).toBeInTheDocument();
      expect(screen.getByText('Press Enter to select')).toBeInTheDocument();
      expect(screen.getByText('Press Escape to close')).toBeInTheDocument();
    });

    it('sets focus on search bar when opened with autoFocus', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveAttribute('autoFocus');
    });
  });

  describe('Time Formatting', () => {
    it('formats time correctly', () => {
      render(<GlobalSearch {...defaultProps} />);
      
      // Check recent searches time formatting
      expect(screen.getByText('2h ago')).toBeInTheDocument();
      expect(screen.getByText('1d ago')).toBeInTheDocument();
    });
  });

  describe('Footer Information', () => {
    it('shows result count in footer', async () => {
      const user = userEvent.setup();
      render(<GlobalSearch {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Showing 2 results')).toBeInTheDocument();
      });
    });
  });
});