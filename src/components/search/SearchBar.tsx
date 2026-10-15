import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { searchEngine } from '@/lib/search/search-engine';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * SearchBar Component - Reusable search input with instant suggestions
 * Features: Debounced search, keyboard navigation, voice search, autocomplete
 */

import type {
  SearchBarProps,
  SearchSuggestion,
  SearchFilters,
} from '@/types/search';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Voice search hook
function useVoiceSearch(
  onResult: (text: string) => void,
  language: string = 'es-ES'
) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const result = event.results[0]?.[0]?.transcript;
        if (result) {
          onResult(result);
        }
      };
    }
  }, [onResult, language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return { isListening, isSupported, startListening, stopListening };
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  defaultQuery = '',
  onSearch,
  onSuggestionSelect,
  showFilters = false,
  showVoiceSearch = true,
  autoFocus = false,
  className,
  size = 'md',
  debounceMs = 300,
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, debounceMs);
  const { t } = useTranslations();

  // Handle voice search result
  const handleVoiceResult = useCallback(
    (text: string) => {
      setQuery(text);
      onSearch(text);
    },
    [onSearch]
  );

  const { isListening, isSupported, startListening } =
    useVoiceSearch(handleVoiceResult);

  // Size variants
  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  // Fetch suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.trim().length >= 2) {
        setIsLoading(true);
        try {
          const suggestions = await searchEngine.search({
            query: debouncedQuery,
            filters: {
              contentTypes: ['all'],
              language: 'es',
            } as SearchFilters,
            sort: { field: 'relevance', direction: 'desc' },
            pagination: { page: 0, limit: 5, offset: 0 },
            options: {
              fuzzyMatching: true,
              typoTolerance: true,
              highlightResults: false,
              includeContent: false,
              minScore: 0.1,
              maxResults: 5,
            },
          });

          // Convert search results to suggestions
          const searchSuggestions: SearchSuggestion[] = suggestions.results.map(
            (result) => ({
              text: result.title,
              type: 'query',
              score: result.score,
              category: result.type,
            })
          );

          setSuggestions(
            [...suggestions.suggestions, ...searchSuggestions].slice(0, 8)
          );
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedSuggestion(-1);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
      inputRef?.current?.blur();
    }
  };

  // Handle clear button
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef?.current?.focus();
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    onSuggestionSelect(suggestion);
    setShowSuggestions(false);
    inputRef?.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
          handleSuggestionClick(suggestions[selectedSuggestion]);
        } else {
          handleSubmit(e);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        inputRef?.current?.blur();
        break;
    }
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document['removeEventListener']('mousedown', handleClickOutside);
  }, []);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Suggestion type icons and labels
  const getSuggestionIcon = (type: SearchSuggestion.type) => {
    switch (type) {
      case 'query':
        return '🔍';
      case 'filter':
        return '🏷️';
      case 'recent':
        return '🕒';
      case 'popular':
        return '🔥';
      default:
        return '📄';
    }
  };

  const getSuggestionLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'query':
        return t('search.suggestion.query', 'Search');
      case 'filter':
        return t('search.suggestion.filter', 'Filter');
      case 'recent':
        return t('search.suggestion.recent', 'Recent');
      case 'popular':
        return t('search.suggestion.popular', 'Popular');
      default:
        return '';
    }
  };

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={clsx(
            'relative flex w-full items-center rounded-lg border border-gray-300 bg-white shadow-sm transition-all duration-200',
            'focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20',
            'hover:border-gray-400',
            sizeClasses[size]
          )}
        >
          {/* Search Icon */}
          <div className="flex items-center justify-center pl-3">
            <MagnifyingGlassIcon
              className={clsx('text-gray-400', iconSizes[size])}
            />
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={
              placeholder ||
              t('search.placeholder', 'Search jobs, events, forums...')
            }
            className={clsx(
              'flex-1 border-0 bg-transparent px-3 py-0 placeholder-gray-500 focus:outline-none focus:ring-0',
              sizeClasses[size]
            )}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="flex items-center justify-center pr-2">
              <div
                className={clsx(
                  'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
                  size === 'sm'
                    ? 'h-3 w-3'
                    : size === 'lg'
                      ? 'h-5 w-5'
                      : 'h-4 w-4'
                )}
              />
            </div>
          )}

          {/* Voice Search Button */}
          {showVoiceSearch && isSupported && (
            <button
              type="button"
              onClick={startListening}
              disabled={isListening}
              className={clsx(
                'flex items-center justify-center p-2 text-gray-400 transition-colors hover:text-gray-600',
                isListening && 'animate-pulse text-red-500'
              )}
              title={t('search.voiceSearch', 'Voice search')}
            >
              <MicrophoneIcon className={iconSizes[size]} />
            </button>
          )}

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center p-2 text-gray-400 transition-colors hover:text-gray-600"
              title={t('search.clear', 'Clear search')}
            >
              <XMarkIcon className={iconSizes[size]} />
            </button>
          )}

          {/* Search Button */}
          <button
            type="submit"
            disabled={!query.trim()}
            className={clsx(
              'flex items-center justify-center rounded-r-lg bg-blue-600 px-4 py-0 text-white transition-all duration-200',
              'hover:bg-blue-700 focus:bg-blue-700 focus:outline-none',
              'disabled:cursor-not-allowed disabled:bg-gray-300',
              sizeClasses[size]
            )}
            title={t('search.button', 'Search')}
          >
            <MagnifyingGlassIcon className={iconSizes[size]} />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.text}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={clsx(
                    'flex w-full items-center space-x-3 px-4 py-3 text-left transition-colors',
                    'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                    selectedSuggestion === index &&
                      'border-r-2 border-blue-500 bg-blue-50'
                  )}
                >
                  <span
                    className="text-lg"
                    role="img"
                    aria-label={getSuggestionLabel(suggestion['type'])}
                  >
                    {getSuggestionIcon(suggestion['type'])}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {suggestion.text}
                    </div>
                    {suggestion.category && (
                      <div className="text-xs capitalize text-gray-500">
                        {suggestion.category}
                      </div>
                    )}
                  </div>
                  {suggestion.count && (
                    <div className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-400">
                      {suggestion.count}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Keyboard Shortcuts Help (hidden by default, shown on focus) */}
      <div className="sr-only">
        <p>
          {t(
            'search.shortcuts.navigate',
            'Use arrow keys to navigate suggestions'
          )}
        </p>
        <p>{t('search.shortcuts.select', 'Press Enter to select')}</p>
        <p>{t('search.shortcuts.close', 'Press Escape to close')}</p>
      </div>
    </div>
  );
};

export default SearchBar;
