import React, { useState, useRef, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
}

const TAG_SEPARATORS = ['Enter', ','];

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  suggestions = [],
  placeholder = '',
  max,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      inputValue.length > 0 &&
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(s)
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed === '') return;
      if (tags.includes(trimmed)) return;
      if (max !== undefined && tags.length >= max) return;

      onChange([...tags, trimmed]);
      setInputValue('');
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [tags, onChange, max]
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (TAG_SEPARATORS.includes(e.key)) {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filteredSuggestions.length
      ) {
        addTag(filteredSuggestions[highlightedIndex]!);
      } else {
        addTag(inputValue);
      }
      return;
    }

    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1);
      return;
    }

    if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
      return;
    }

    if (e.key === 'ArrowUp' && filteredSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
      return;
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.forEach((part) => addTag(part));
      return;
    }
    setInputValue(val);
    setShowSuggestions(val.length > 0);
    setHighlightedIndex(-1);
  };

  const isAtMax = max !== undefined && tags.length >= max;

  return (
    <div className="relative">
      <div
        className={
          'flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ' +
          'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700 ' +
          'focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500'
        }
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ' +
              'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
            }
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="rounded-full p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800"
              aria-label={`Remove ${tag}`}
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}

        {!isAtMax && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="min-w-[120px] flex-1 border-none bg-transparent text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
          />
        )}
      </div>

      {max !== undefined && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {tags.length}/{max}
        </p>
      )}

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          className={
            'absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border ' +
            'border-gray-200 bg-white shadow-lg ' +
            'dark:border-gray-600 dark:bg-gray-700'
          }
          role="listbox"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={index === highlightedIndex}
              className={
                'cursor-pointer px-4 py-2 text-sm ' +
                (index === highlightedIndex
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600')
              }
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TagInput;
