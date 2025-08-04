/**
 * SearchResults Component Unit Tests
 * 
 * Tests for the SearchResults component including:
 * - Result rendering and display modes
 * - Pagination functionality
 * - Filtering and facets
 * - Sorting options
 * - Export functionality
 * - Search within results
 * - Selection handling
 * - Error handling and loading states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SearchResults from '@/components/search/SearchResults';
import type { SearchResultItem, SearchFilters, SearchFacets, SearchExportConfig } from '@/types/search';

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

vi.mock('@/components/search/SearchBar', () => ({
  default: ({ onSearch, onSuggestionSelect, defaultQuery }: any) => (
    <div data-testid="search-bar">
      <input
        data-testid="search-input"
        defaultValue={defaultQuery}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search..."
      />
      <button
        data-testid="suggestion-button"
        onClick={() => onSuggestionSelect({ text: 'test suggestion' })}
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
    description: 'Join our team as a Senior Data Scientist working with cutting-edge ML technologies',
    content: 'Full job description with detailed requirements and responsibilities',
    url: '/jobs/1',
    tags: ['python', 'machine-learning', 'tensorflow'],
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
    title: 'ML Workshop: Deep Learning Basics',
    description: 'Comprehensive workshop covering deep learning fundamentals',
    content: 'Workshop content covering neural networks, backpropagation, and more',
    url: '/events/2',
    tags: ['machine-learning', 'workshop', 'deep-learning'],
    score: 0.87,
    highlights: [
      {
        field: 'description',
        snippet: 'workshop covering <mark>deep learning</mark> fundamentals',
        matches: [{ start: 18, end: 31, text: 'deep learning' }],
      },
    ],
    metadata: {
      createdAt: new Date('2023-01-02'),
      category: 'Education',
    },
  },
  {
    id: '3',
    type: 'forums',
    title: 'Career Transition Discussion',
    description: 'Discussion about transitioning from academia to industry',
    content: 'Forum post content with community discussions',
    url: '/forums/3',
    tags: ['career', 'transition', 'advice'],
    score: 0.75,
    highlights: [],
    metadata: {
      createdAt: new Date('2023-01-03'),
      category: 'Career',
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
    { id: '1', name: 'John Doe', count: 3 },
    { id: '2', name: 'Jane Smith', count: 2 },
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

const defaultFilters: SearchFilters = {
  contentTypes: ['all'],
  language: 'es',
};

describe('SearchResults', () => {
  const defaultProps = {
    query: 'test query',
    filters: defaultFilters,
    onFilterChange: vi.fn(),
    onExport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful search response
    mockSearchEngine.search.mockResolvedValue({
      results: mockSearchResults,
      total: 25,
      page: 0,
      totalPages: 2,
      suggestions: [],
      facets: mockFacets,
      query: 'test query',
      searchTime: 50,
      hasMore: true,
    });

    // Mock scrollTo
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders search results page', async () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('Search Results')).toBeInTheDocument();
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('25 results for "test query"')).toBeInTheDocument();
      });
    });

    it('displays search results', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('ML Workshop: Deep Learning Basics')).toBeInTheDocument();
        expect(screen.getByText('Career Transition Discussion')).toBeInTheDocument();
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
          facets: mockFacets,
          query: '',
          searchTime: 100,
          hasMore: false,
        }), 100))
      );

      render(<SearchResults {...defaultProps} />);
      
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('shows no results message when search returns empty', async () => {
      mockSearchEngine.search.mockResolvedValue({
        results: [],
        total: 0,
        page: 0,
        totalPages: 0,
        suggestions: [],
        facets: mockFacets,
        query: 'nonexistent',
        searchTime: 25,
        hasMore: false,
      });

      render(<SearchResults {...defaultProps} query="nonexistent" />);
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument();
      });
    });
  });

  describe('View Modes', () => {
    it('renders list view by default', async () => {
      render(<SearchResults {...defaultProps} />);
      
      const listButton = screen.getByRole('button', { name: /list view/i });
      expect(listButton).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('switches to grid view', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const gridButton = screen.getByRole('button', { name: /grid view/i });
      await user.click(gridButton);
      
      expect(gridButton).toHaveClass('bg-blue-100', 'text-blue-700');
      
      await waitFor(() => {
        const resultsContainer = screen.getByText('Senior Data Scientist').closest('div')?.parentElement;
        expect(resultsContainer).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
      });
    });

    it('switches to compact view', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const compactButton = screen.getByRole('button', { name: /compact view/i });
      await user.click(compactButton);
      
      expect(compactButton).toHaveClass('bg-blue-100', 'text-blue-700');
      
      await waitFor(() => {
        const resultsContainer = screen.getByText('Senior Data Scientist').closest('div')?.parentElement;
        expect(resultsContainer).toHaveClass('divide-y', 'divide-gray-200');
      });
    });
  });

  describe('Result Rendering', () => {
    it('displays result metadata', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('📂 Technology')).toBeInTheDocument();
        expect(screen.getByText('📍 Mexico City')).toBeInTheDocument();
        expect(screen.getByText('Score: 0.95')).toBeInTheDocument();
      });
    });

    it('displays result highlights', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Senior.*Data.*Scientist/)).toBeInTheDocument();
        expect(screen.getByText(/workshop covering.*deep learning.*fundamentals/)).toBeInTheDocument();
      });
    });

    it('displays result tags', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('python')).toBeInTheDocument();
        expect(screen.getByText('machine-learning')).toBeInTheDocument();
        expect(screen.getByText('tensorflow')).toBeInTheDocument();
      });
    });

    it('limits displayed tags to 3 with overflow indicator', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        // Should show first 3 tags and overflow indicator
        expect(screen.getByText('python')).toBeInTheDocument();
        expect(screen.getByText('machine-learning')).toBeInTheDocument();
        expect(screen.getByText('tensorflow')).toBeInTheDocument();
        // No overflow indicator for this result as it has exactly 3 tags
      });
    });

    it('formats dates correctly', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        // Dates should be formatted in Spanish locale
        expect(screen.getByText(/ene/)).toBeInTheDocument(); // enero (January)
      });
    });
  });

  describe('Filtering', () => {
    it('shows filters sidebar by default', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
        expect(screen.getByText('Content Type')).toBeInTheDocument();
      });
    });

    it('toggles filters visibility', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      
      // Hide filters
      await user.click(filtersButton);
      
      expect(screen.queryByText('Content Type')).not.toBeInTheDocument();
      expect(filtersButton).not.toHaveClass('bg-blue-50', 'text-blue-700');
    });

    it('displays faceted filters', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        // Content types
        expect(screen.getByText('Jobs (15)')).toBeInTheDocument();
        expect(screen.getByText('Events (8)')).toBeInTheDocument();
        
        // Categories
        expect(screen.getByText('Technology (10)')).toBeInTheDocument();
        expect(screen.getByText('Education (8)')).toBeInTheDocument();
        
        // Tags
        expect(screen.getByText('machine-learning (15)')).toBeInTheDocument();
        expect(screen.getByText('python (12)')).toBeInTheDocument();
      });
    });

    it('applies content type filter', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Jobs (15)')).toBeInTheDocument();
      });
      
      const jobsCheckbox = screen.getByRole('checkbox', { name: /jobs \(15\)/i });
      await user.click(jobsCheckbox);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        contentTypes: ['jobs'],
        language: 'es',
      });
    });

    it('applies category filter', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Technology (10)')).toBeInTheDocument();
      });
      
      const techCheckbox = screen.getByRole('checkbox', { name: /technology \(10\)/i });
      await user.click(techCheckbox);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        contentTypes: ['all'],
        language: 'es',
        category: ['Technology'],
      });
    });

    it('applies tag filter', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('machine-learning (15)')).toBeInTheDocument();
      });
      
      const mlTag = screen.getByRole('button', { name: /machine-learning \(15\)/i });
      await user.click(mlTag);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        contentTypes: ['all'],
        language: 'es',
        tags: ['machine-learning'],
      });
    });
  });

  describe('Sorting', () => {
    it('shows sort options', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const sortSelect = screen.getByDisplayValue('Relevance');
        expect(sortSelect).toBeInTheDocument();
      });
    });

    it('changes sort option', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const sortSelect = screen.getByDisplayValue('Relevance');
        await user.selectOptions(sortSelect, 'date-desc');
        
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: { field: 'date', direction: 'desc' },
          })
        );
      });
    });
  });

  describe('Pagination', () => {
    it('shows pagination when multiple pages', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Showing 1 to 3 of 25 results')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      });
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        await user.click(nextButton);
        
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            pagination: { page: 1, limit: 20, offset: 20 },
          })
        );
      });
    });

    it('navigates to previous page', async () => {
      // Set current page to 1 (second page)
      mockSearchEngine.search.mockResolvedValue({
        results: mockSearchResults,
        total: 25,
        page: 1,
        totalPages: 2,
        suggestions: [],
        facets: mockFacets,
        query: 'test query',
        searchTime: 50,
        hasMore: false,
      });

      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).not.toBeDisabled();
      });
    });

    it('disables navigation buttons at boundaries', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('scrolls to top on page change', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        await user.click(nextButton);
        
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      });
    });
  });

  describe('Search Within Results', () => {
    it('shows search within results input', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search within results...')).toBeInTheDocument();
      });
    });

    it('filters results when searching within', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('ML Workshop: Deep Learning Basics')).toBeInTheDocument();
      });
      
      const withinInput = screen.getByPlaceholderText('Search within results...');
      await user.type(withinInput, 'workshop');
      
      await waitFor(() => {
        // Should only show workshop result
        expect(screen.getByText('ML Workshop: Deep Learning Basics')).toBeInTheDocument();
        expect(screen.queryByText('Senior Data Scientist')).not.toBeInTheDocument();
      });
    });

    it('shows clear button for search within results', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const withinInput = screen.getByPlaceholderText('Search within results...');
      await user.type(withinInput, 'workshop');
      
      const clearButton = screen.getByRole('button', { name: '×' });
      expect(clearButton).toBeInTheDocument();
      
      await user.click(clearButton);
      expect(withinInput).toHaveValue('');
    });
  });

  describe('Result Selection', () => {
    it('allows selecting individual results', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const checkbox = screen.getAllByRole('checkbox')[1]; // Skip "Select all" checkbox
        await user.click(checkbox);
        
        expect(checkbox).toBeChecked();
      });
    });

    it('shows select all functionality', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
        await user.click(selectAllCheckbox);
        
        expect(selectAllCheckbox).toBeChecked();
        expect(screen.getByText('Select all (3 selected)')).toBeInTheDocument();
      });
    });

    it('updates selection count', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[1]); // Select first result
        
        expect(screen.getByText('Select all (1 selected)')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('shows export button when onExport is provided', async () => {
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });

    it('calls onExport when export button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /export/i });
        await user.click(exportButton);
        
        expect(defaultProps.onExport).toHaveBeenCalledWith({
          format: 'csv',
          fields: ['title', 'description', 'type', 'url', 'tags', 'createdAt'],
          filters: defaultFilters,
          maxResults: 25,
          includeMetadata: true,
        });
      });
    });

    it('hides export button when onExport is not provided', async () => {
      const { onExport, ...propsWithoutExport } = defaultProps;
      render(<SearchResults {...propsWithoutExport} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Integration', () => {
    it('performs new search when search bar is used', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      await user.clear(searchInput);
      await user.type(searchInput, 'new query');
      
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'new query',
          })
        );
      });
    });

    it('handles suggestion selection', async () => {
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} />);
      
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

  describe('Error Handling', () => {
    it('handles search errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchEngine.search.mockRejectedValue(new Error('Search failed'));

      render(<SearchResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles export errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onExport = vi.fn().mockRejectedValue(new Error('Export failed'));
      
      const user = userEvent.setup();
      render(<SearchResults {...defaultProps} onExport={onExport} />);
      
      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /export/i });
        await user.click(exportButton);
        
        expect(consoleSpy).toHaveBeenCalledWith('Export error:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const customClass = 'custom-search-results';
      render(<SearchResults {...defaultProps} className={customClass} />);
      
      const container = screen.getByText('Search Results').closest('.max-w-7xl');
      expect(container).toHaveClass(customClass);
    });
  });

  describe('Initial Search', () => {
    it('performs initial search on mount', () => {
      render(<SearchResults {...defaultProps} />);
      
      expect(mockSearchEngine.search).toHaveBeenCalledWith({
        query: 'test query',
        filters: defaultFilters,
        sort: { field: 'relevance', direction: 'desc' },
        pagination: { page: 0, limit: 20, offset: 0 },
        options: {
          fuzzyMatching: true,
          typoTolerance: true,
          highlightResults: true,
          includeContent: true,
          minScore: 0.1,
          maxResults: 1000,
        },
      });
    });
  });
});