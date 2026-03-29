// src/components/listing/UniversalListing.tsx
import React from 'react';
import {
  useUniversalListing,
  type UseUniversalListingConfig,
} from '@/hooks/useUniversalListing';
import type { ViewMode, FilterDefinition, ColumnDefinition } from '@lib/listing/types';
import { getListingTranslations } from '@lib/listing/i18n';
import type { ListingLang } from '@lib/listing/i18n';
import { ListingSearch } from './ListingSearch';
import { ListingFilters } from './ListingFilters';
import { ListingActiveFilters } from './ListingActiveFilters';
import { ListingViewToggle } from './ListingViewToggle';
import { ListingSort, type SortOption } from './ListingSort';
import { ListingGrid } from './ListingGrid';
import { ListingList } from './ListingList';
import { ListingCompact } from './ListingCompact';
import { ListingTable } from './ListingTable';
import { ListingPagination } from './ListingPagination';
import { ListingEmpty } from './ListingEmpty';
import { ListingLoading } from './ListingLoading';
import { ListingStats } from './ListingStats';

interface UniversalListingProps<T> extends UseUniversalListingConfig<T> {
  renderItem: (item: T, viewMode: ViewMode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  columns?: ColumnDefinition<T>[];
  sortOptions?: SortOption[];
  availableViewModes?: ViewMode[];
  filterMode?: 'collapsible' | 'visible' | 'drawer';
  showSearch?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  showViewToggle?: boolean;
  showStats?: boolean;
  showPagination?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function UniversalListing<T>({
  renderItem,
  keyExtractor,
  columns,
  sortOptions = [],
  availableViewModes = ['grid', 'list'],
  filterMode = 'collapsible',
  showSearch = true,
  showFilters = true,
  showSort = true,
  showViewToggle = true,
  showStats = true,
  showPagination = true,
  emptyTitle,
  emptyDescription,
  className = '',
  ...hookConfig
}: UniversalListingProps<T>) {
  const listing = useUniversalListing<T>(hookConfig);
  const lang: ListingLang = hookConfig.lang ?? 'es';
  const t = getListingTranslations(lang);

  const hasActiveFilters = Object.values(listing.activeFilters).some(
    (v) =>
      v !== undefined &&
      v !== null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0)
  );

  // Error state
  if (listing.error && !listing.loading && listing.items.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
      >
        <h3 className="mb-2 text-lg font-medium text-red-600 dark:text-red-400">
          {t.error.title}
        </h3>
        <p className="mb-4 text-sm text-gray-500">{listing.error}</p>
        <button
          type="button"
          onClick={listing.retry}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          {t.error.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        {showSearch && (
          <ListingSearch
            query={listing.query}
            onQueryChange={listing.setQuery}
            lang={lang}
            className="flex-1"
          />
        )}
        <div className="flex flex-shrink-0 items-center gap-2">
          {showSort && sortOptions.length > 0 && (
            <ListingSort
              sort={listing.sort}
              options={sortOptions}
              onSortChange={listing.setSort}
              lang={lang}
            />
          )}
          {showViewToggle && (
            <ListingViewToggle
              viewMode={listing.viewMode}
              availableModes={availableViewModes}
              onViewModeChange={listing.setViewMode}
              lang={lang}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && hookConfig.filterDefinitions && (
        <ListingFilters
          definitions={hookConfig.filterDefinitions}
          activeFilters={listing.activeFilters}
          onFilterChange={listing.setFilter}
          onClearAll={listing.clearFilters}
          filterMode={filterMode}
          lang={lang}
          className="mb-4"
        />
      )}

      {/* Active filter badges */}
      {hookConfig.filterDefinitions && (
        <ListingActiveFilters
          definitions={hookConfig.filterDefinitions}
          activeFilters={listing.activeFilters}
          onFilterChange={listing.setFilter}
          onClearAll={listing.clearFilters}
          className="mb-4"
        />
      )}

      {/* Stats */}
      {showStats && !listing.loading && listing.totalCount > 0 && (
        <ListingStats
          page={listing.page}
          pageSize={listing.pageSize}
          totalCount={listing.totalCount}
          lang={lang}
          className="mb-3"
        />
      )}

      {/* Loading */}
      {listing.loading && listing.items.length === 0 && (
        <ListingLoading viewMode={listing.viewMode} />
      )}

      {/* Empty */}
      {!listing.loading && listing.items.length === 0 && !listing.error && (
        <ListingEmpty
          onClearFilters={listing.clearFilters}
          hasActiveFilters={hasActiveFilters}
          title={emptyTitle}
          description={emptyDescription}
          lang={lang}
        />
      )}

      {/* Content */}
      {listing.items.length > 0 && (
        <>
          {listing.viewMode === 'grid' && (
            <ListingGrid
              items={listing.items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          )}
          {listing.viewMode === 'list' && (
            <ListingList
              items={listing.items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          )}
          {listing.viewMode === 'compact' && (
            <ListingCompact
              items={listing.items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          )}
          {listing.viewMode === 'table' && columns && (
            <ListingTable
              items={listing.items}
              columns={columns}
              keyExtractor={keyExtractor}
              sort={listing.sort}
              onSortChange={listing.setSort}
            />
          )}
        </>
      )}

      {/* Pagination */}
      {showPagination && listing.items.length > 0 && (
        <ListingPagination
          page={listing.page}
          totalPages={listing.totalPages}
          hasMore={listing.hasMore}
          paginationMode={hookConfig.paginationMode ?? 'offset'}
          onPageChange={listing.goToPage}
          onLoadMore={listing.loadMore}
          loading={listing.loading}
          lang={lang}
        />
      )}
    </div>
  );
}
