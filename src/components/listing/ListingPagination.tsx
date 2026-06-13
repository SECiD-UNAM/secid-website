import React from 'react';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingPaginationProps {
  page: number;
  totalPages: number;
  hasMore: boolean;
  paginationMode: 'offset' | 'cursor';
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  loading?: boolean;
  lang?: ListingLang;
  className?: string;
}

export function ListingPagination({
  page,
  totalPages,
  hasMore,
  paginationMode,
  onPageChange,
  onLoadMore,
  loading = false,
  lang = 'es',
  className = '',
}: ListingPaginationProps) {
  const t = getListingTranslations(lang);

  if (paginationMode === 'cursor') {
    if (!hasMore) return null;
    return (
      <div className={`mt-6 flex justify-center ${className}`}>
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="rounded-lg border border-blue-300 px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
        >
          {loading ? t.loading.text : t.pagination.loadMore}
        </button>
      </div>
    );
  }

  // Offset pagination
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav
      aria-label="pagination"
      className={`mt-6 flex items-center justify-center gap-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-30 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        {t.pagination.previous}
      </button>

      <div className="hidden gap-1 sm:flex">
        {pageNumbers.map((n, i) =>
          n === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 py-1.5 text-sm text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n as number)}
              aria-current={page === n ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm ${
                page === n
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
              }`}
            >
              {n}
            </button>
          )
        )}
      </div>

      <span className="text-sm text-gray-500 sm:hidden">
        {t.pagination.page(page, totalPages)}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-30 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        {t.pagination.next}
      </button>
    </nav>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
