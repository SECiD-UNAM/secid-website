// @ts-nocheck
/**
 * SearchBar Component Unit Tests
 *
 * Tests for the SearchBar component including:
 * - Input handling and search submission
 * - Debounced search functionality
 * - Suggestion dropdown and navigation
 * - Voice search integration
 * - Keyboard interactions
 * - Accessibility features
 * - Error handling and edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SearchBar from '@/components/search/SearchBar';
import type { SearchSuggestion, SearchFilters } from '@/types/search';

// Mock heroicons with Proxy-based auto-mock (component imports MagnifyingGlassIcon, XMarkIcon, MicrophoneIcon)
vi.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, {
    get: (_target, prop) => {
      if (typeof prop === 'string' && prop !== '__esModule') {
        const Icon = ({ className }: any) => <svg className={className} data-testid={`${prop}-icon`} />;
        Icon.displayName = String(prop);
        return Icon;
      }
      return undefined;
    },
  })
);

vi.mock('clsx', () => ({
  clsx: (...args: any[]) => args.filter(Boolean).join(' '),
}));

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

// Mock search engine
const mockSearchEngine = vi.mocked(await import('@/lib/search/search-engine')).searchEngine;

// Mock Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'es-ES',
  maxAlternatives: 1,
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null,
};

// Test data
const mockSuggestions: SearchSuggestion[] = [
  {
    text: 'data scientist',
    type: 'query',
    score: 0.95,
    category: 'jobs',
    count: 15,
  },
  {
    text: 'machine learning',
    type: 'query',
    score: 0.87,
    category: 'resources',
    count: 8,
  },
  {
    text: 'python developer',
    type: 'recent',
    score: 0.75,
  },
];

describe('SearchBar', () => {
  const defaultProps = {
    onSearch: vi.fn(),
    onSuggestionSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful search response for suggestions
    mockSearchEngine.search.mockResolvedValue({
      results: [],
      total: 0,
      page: 0,
      totalPages: 0,
      suggestions: mockSuggestions,
      facets: {
        contentTypes: [],
        categories: [],
        authors: [],
        tags: [],
        dateRanges: [],
      },
      query: '',
      searchTime: 25,
      hasMore: false,
    });

    // Mock Speech Recognition
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      writable: true,
      value: vi.fn().mockImplementation(() => mockSpeechRecognition),
    });

    Object.defineProperty(window, 'SpeechRecognition', {
      writable: true,
      value: vi.fn().mockImplementation(() => mockSpeechRecognition),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders search input with default placeholder', () => {
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search jobs, events, forums...');
    });

    it('renders with custom placeholder', () => {
      const customPlaceholder = 'Search for anything...';
      render(<SearchBar {...defaultProps} placeholder={customPlaceholder} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', customPlaceholder);
    });

    it('renders with default query', () => {
      const defaultQuery = 'initial search';
      render(<SearchBar {...defaultProps} defaultQuery={defaultQuery} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue(defaultQuery);
    });

    it('applies custom className', () => {
      const customClass = 'custom-search-bar';
      render(<SearchBar {...defaultProps} className={customClass} />);
      
      const container = screen.getByRole('textbox').closest('div');
      expect(container).toHaveClass(customClass);
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      render(<SearchBar {...defaultProps} size="sm" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-10', 'text-sm');
    });

    it('renders medium size correctly (default)', () => {
      render(<SearchBar {...defaultProps} size="md" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-12', 'text-base');
    });

    it('renders large size correctly', () => {
      render(<SearchBar {...defaultProps} size="lg" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-14', 'text-lg');
    });
  });

  describe('Input Handling', () => {
    it('calls onSearch when form is submitted', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      const form = input.closest('form')!;
      
      await user.type(input, 'test query');
      fireEvent.submit(form);
      
      expect(defaultProps.onSearch).toHaveBeenCalledWith('test query');
    });

    it('calls onSearch when search button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      await user.type(input, 'test query');
      await user.click(searchButton);
      
      expect(defaultProps.onSearch).toHaveBeenCalledWith('test query');
    });

    it('trims whitespace from search query', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      const form = input.closest('form')!;
      
      await user.type(input, '  test query  ');
      fireEvent.submit(form);
      
      expect(defaultProps.onSearch).toHaveBeenCalledWith('test query');
    });

    it('does not search with empty query', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const form = screen.getByRole('textbox').closest('form')!;
      fireEvent.submit(form);
      
      expect(defaultProps.onSearch).not.toHaveBeenCalled();
    });

    it('disables search button when query is empty', () => {
      render(<SearchBar {...defaultProps} />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeDisabled();
    });

    it('enables search button when query has content', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      const searchButton = screen.getByRole('button', { name: /search/i });
      
      await user.type(input, 'test');
      
      expect(searchButton).not.toBeDisabled();
    });
  });

  describe('Clear Functionality', () => {
    it('shows clear button when input has content', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);
      
      expect(input).toHaveValue('');
    });

    it('focuses input after clearing', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);
      
      expect(input).toHaveFocus();
    });
  });

  describe('Debounced Search', () => {
    it('debounces suggestion fetching by default', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      
      // Type quickly
      await user.type(input, 'test');
      
      // Should not call search immediately
      expect(mockSearchEngine.search).not.toHaveBeenCalled();
      
      // Wait for debounce
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });

    it('respects custom debounce time', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} debounceMs={100} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      // Should call search after custom debounce time
      await waitFor(() => {
        expect(mockSearchEngine.search).toHaveBeenCalledTimes(1);
      }, { timeout: 200 });
    });
  });

  describe('Suggestions', () => {
    it('shows suggestions when typing', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('data scientist')).toBeInTheDocument();
        expect(screen.getByText('machine learning')).toBeInTheDocument();
      });
    });

    it('shows loading spinner while fetching suggestions', async () => {
      const user = userEvent.setup();
      
      // Mock slow response
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
      
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      // Should show loading spinner
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
    });

    it('handles suggestion click', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('data scientist')).toBeInTheDocument();
      });
      
      const suggestion = screen.getByRole('button', { name: /data scientist/i });
      await user.click(suggestion);
      
      expect(defaultProps.onSuggestionSelect).toHaveBeenCalledWith(mockSuggestions[0]);
      expect(input).toHaveValue('data scientist');
    });

    it('shows suggestion categories and counts', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('jobs')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });

    it('shows appropriate icons for suggestion types', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        // Check for search icon (query type)
        expect(screen.getByText('🔍')).toBeInTheDocument();
        // Check for recent icon (recent type)
        expect(screen.getByText('🕒')).toBeInTheDocument();
      });
    });

    it('hides suggestions when input loses focus', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('data scientist')).toBeInTheDocument();
      });
      
      // Click outside
      await user.click(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText('data scientist')).not.toBeInTheDocument();
      });
    });

    it('shows suggestions when input gains focus and has content', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('data scientist')).toBeInTheDocument();
      });
      
      // Lose focus
      await user.click(document.body);
      
      // Regain focus
      await user.click(input);
      
      expect(screen.getByText('data scientist')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates suggestions with arrow keys', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('data scientist')).toBeInTheDocument();
      });
      
      // Navigate down
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      const firstSuggestion = screen.getByRole('button', { name: /data scientist/i });
      expect(firstSuggestion).toHaveClass('bg-blue-50');
      
      // Navigate down again
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      const secondSuggestion = screen.getByRole('button', { name: /machine learning/i });
      expect(secondSuggestion).toHaveClass('bg-blue-50');
    });

    it('navigates up with arrow up key', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('data scientist')).toBeInTheDocument();
      });
      
      // Navigate down twice
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      // Navigate up
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      
      const firstSuggestion = screen.getByRole('button', { name: /data scientist/i });
      expect(firstSuggestion).toHaveClass('bg-blue-50');
    });

    it('selects suggestion with Enter key', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('data scientist')).toBeInTheDocument();
      });
      
      // Navigate to first suggestion
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      // Select with Enter
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(defaultProps.onSuggestionSelect).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('submits form when Enter is pressed without selection', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test query');
      
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(defaultProps.onSearch).toHaveBeenCalledWith('test query');
    });

    it('closes suggestions with Escape key', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        expect(screen.getByText('data scientist')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(screen.queryByText('data scientist')).not.toBeInTheDocument();
    });
  });

  describe('Voice Search', () => {
    it('shows voice search button when supported', () => {
      render(<SearchBar {...defaultProps} showVoiceSearch={true} />);
      
      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      expect(voiceButton).toBeInTheDocument();
    });

    it('hides voice search button when disabled', () => {
      render(<SearchBar {...defaultProps} showVoiceSearch={false} />);
      
      const voiceButton = screen.queryByRole('button', { name: /voice search/i });
      expect(voiceButton).not.toBeInTheDocument();
    });

    it('starts voice recognition when button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} showVoiceSearch={true} />);
      
      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      await user.click(voiceButton);
      
      expect(mockSpeechRecognition.start).toHaveBeenCalledTimes(1);
    });

    it('handles voice search result', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} showVoiceSearch={true} />);
      
      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      await user.click(voiceButton);
      
      // Simulate voice recognition result
      act(() => {
        mockSpeechRecognition.onresult?.({
          results: [[{ transcript: 'voice search query' }]],
        } as any);
      });
      
      expect(defaultProps.onSearch).toHaveBeenCalledWith('voice search query');
    });

    it('shows listening state during voice recognition', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} showVoiceSearch={true} />);
      
      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      
      // Simulate listening start
      act(() => {
        mockSpeechRecognition.onstart?.();
      });
      
      await user.click(voiceButton);
      
      expect(voiceButton).toHaveClass('text-red-500', 'animate-pulse');
    });
  });

  describe('Auto Focus', () => {
    it('focuses input when autoFocus is true', () => {
      render(<SearchBar {...defaultProps} autoFocus={true} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });

    it('does not focus input when autoFocus is false', () => {
      render(<SearchBar {...defaultProps} autoFocus={false} />);
      
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('handles suggestion fetch errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchEngine.search.mockRejectedValue(new Error('Suggestion fetch failed'));

      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching suggestions:', expect.any(Error));
      });
      
      // Should not show suggestions
      expect(screen.queryByRole('button', { name: /suggestion/i })).not.toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('handles voice search errors', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} showVoiceSearch={true} />);
      
      const voiceButton = screen.getByRole('button', { name: /voice search/i });
      await user.click(voiceButton);
      
      // Simulate error
      act(() => {
        mockSpeechRecognition.onerror?.();
      });
      
      // Should stop listening
      expect(voiceButton).not.toHaveClass('text-red-500', 'animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'off');
      expect(input).toHaveAttribute('spellCheck', 'false');
    });

    it('provides screen reader instructions', () => {
      render(<SearchBar {...defaultProps} />);
      
      expect(screen.getByText('Use arrow keys to navigate suggestions')).toBeInTheDocument();
      expect(screen.getByText('Press Enter to select')).toBeInTheDocument();
      expect(screen.getByText('Press Escape to close')).toBeInTheDocument();
    });

    it('has proper button labels', () => {
      render(<SearchBar {...defaultProps} showVoiceSearch={true} />);
      
      expect(screen.getByRole('button', { name: /voice search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('has proper suggestion button accessibility', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'da');
      
      await waitFor(() => {
        const suggestions = screen.getAllByRole('button');
        const suggestionButton = suggestions.find(btn => btn.textContent?.includes('data scientist'));
        expect(suggestionButton).toBeInTheDocument();
      });
    });
  });

  describe('No Speech Recognition Support', () => {
    it('hides voice search when not supported', () => {
      // Remove speech recognition support
      delete (window as any).webkitSpeechRecognition;
      delete (window as any).SpeechRecognition;
      
      render(<SearchBar {...defaultProps} showVoiceSearch={true} />);
      
      const voiceButton = screen.queryByRole('button', { name: /voice search/i });
      expect(voiceButton).not.toBeInTheDocument();
    });
  });
});