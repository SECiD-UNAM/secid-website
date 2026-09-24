import React from 'react';
import type { ViewMode } from '@lib/listing/types';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingViewToggleProps {
  viewMode: ViewMode;
  availableModes: ViewMode[];
  onViewModeChange: (mode: ViewMode) => void;
  lang?: ListingLang;
  className?: string;
}

const viewIcons: Record<ViewMode, React.ReactNode> = {
  grid: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" />
    </svg>
  ),
  list: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path
        fillRule="evenodd"
        d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"
      />
    </svg>
  ),
  compact: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path
        fillRule="evenodd"
        d="M2.5 11.5a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"
      />
    </svg>
  ),
  table: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 001-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 001 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z" />
    </svg>
  ),
};

export function ListingViewToggle({
  viewMode,
  availableModes,
  onViewModeChange,
  lang = 'es',
  className = '',
}: ListingViewToggleProps) {
  const t = getListingTranslations(lang);

  if (availableModes.length <= 1) return null;

  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className={`flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 ${className}`}
    >
      {availableModes.map((mode) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={viewMode === mode}
          aria-label={t.viewMode[mode]}
          onClick={() => onViewModeChange(mode)}
          className={`p-2 ${
            viewMode === mode
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {viewIcons[mode]}
        </button>
      ))}
    </div>
  );
}
