// src/components/jobs/JobBoard.tsx
import React, { useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import {
  ListingSearch,
  ListingSort,
  ListingViewToggle,
  ListingList,
  ListingGrid,
  ListingPagination,
  ListingEmpty,
  ListingLoading,
  ListingStats,
} from '@components/listing';
import type { SortOption } from '@components/listing/ListingSort';
import {
  JobFirestoreAdapter,
  type JobFilters,
  type Job,
} from '@lib/listing/adapters/JobFirestoreAdapter';
import type { ViewMode } from '@lib/listing/types';
import JobCard from './JobCard';

interface LegacyFilterState {
  location: string;
  locationType: string[];
  employmentType: string[];
  experienceLevel: string[];
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  postedWithin: string;
  industry: string[];
  companySize: string[];
  benefits: string[];
}

interface JobBoardProps {
  lang?: 'es' | 'en';
  filters?: LegacyFilterState;
}

const SORT_OPTIONS_ES: SortOption[] = [
  { field: 'postedAt', label: 'Más recientes' },
  { field: 'matchScore', label: 'Mejor compatibilidad' },
  { field: 'salaryRange.max', label: 'Mayor salario' },
];

const SORT_OPTIONS_EN: SortOption[] = [
  { field: 'postedAt', label: 'Most recent' },
  { field: 'matchScore', label: 'Best match' },
  { field: 'salaryRange.max', label: 'Highest salary' },
];

const AVAILABLE_VIEW_MODES: ViewMode[] = ['list', 'grid'];

function buildExternalFilters(
  filters: LegacyFilterState | undefined
): Record<string, unknown> {
  if (!filters) return {};
  const result: Record<string, unknown> = {};
  if (filters.location) result['location'] = filters.location;
  if (filters.locationType?.length) result['locationType'] = filters.locationType;
  if (filters.employmentType?.length) result['employmentType'] = filters.employmentType;
  if (filters.experienceLevel?.length) result['experienceLevel'] = filters.experienceLevel;
  if (filters.salaryMin > 0) result['salaryMin'] = filters.salaryMin;
  if (filters.salaryMax < 200000) result['salaryMax'] = filters.salaryMax;
  if (filters.skills?.length) result['skills'] = filters.skills;
  if (filters.postedWithin && filters.postedWithin !== 'all') {
    result['postedWithin'] = filters.postedWithin;
  }
  if (filters.industry?.length) result['industry'] = filters.industry;
  if (filters.companySize?.length) result['companySize'] = filters.companySize;
  if (filters.benefits?.length) result['benefits'] = filters.benefits;
  return result;
}

export const JobBoard: React.FC<JobBoardProps> = ({ lang = 'es', filters }) => {
  const { userProfile } = useAuth();

  const adapter = useMemo(
    () =>
      new JobFirestoreAdapter({
        userSkills: userProfile?.skills ?? [],
        pageSize: 10,
      }),
    // Recreate adapter when user skills change so match scores stay current
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(userProfile?.skills)]
  );

  const sortOptions = lang === 'es' ? SORT_OPTIONS_ES : SORT_OPTIONS_EN;

  const listing = useUniversalListing<Job>({
    adapter,
    defaultViewMode: 'list',
    paginationMode: 'cursor',
    defaultPageSize: 10,
    defaultSort: { field: 'postedAt', direction: 'desc' },
    lang,
  });

  // Sync external filters prop into listing's activeFilters
  useEffect(() => {
    const externalFilters = buildExternalFilters(filters);
    for (const [key, value] of Object.entries(externalFilters)) {
      listing.setFilter(key, value);
    }
    // Clear filters that were previously set but are now absent
    for (const key of Object.keys(listing.activeFilters)) {
      if (!(key in externalFilters)) {
        listing.setFilter(key, undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const hasActiveFilters = Object.values(listing.activeFilters).some(
    (v) =>
      v !== undefined &&
      v !== null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0)
  );

  const emptyTitle =
    lang === 'es' ? 'No se encontraron empleos' : 'No jobs found';
  const emptyDescription =
    lang === 'es'
      ? 'Intenta ajustar tus filtros o términos de búsqueda'
      : 'Try adjusting your filters or search terms';

  const renderJob = useCallback(
    (job: Job, _viewMode: ViewMode) => <JobCard job={job} lang={lang} />,
    [lang]
  );

  const keyExtractor = useCallback((job: Job) => job.id, []);

  if (listing.error && !listing.loading && listing.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-2 text-lg font-medium text-red-600 dark:text-red-400">
          Error
        </h3>
        <p className="mb-4 text-sm text-gray-500">{listing.error}</p>
        <button
          type="button"
          onClick={listing.retry}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          {lang === 'es' ? 'Reintentar' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar: search + sort + view toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <ListingSearch
          query={listing.query}
          onQueryChange={listing.setQuery}
          lang={lang}
          className="flex-1"
        />
        <div className="flex flex-shrink-0 items-center gap-2">
          <ListingSort
            sort={listing.sort}
            options={sortOptions}
            onSortChange={listing.setSort}
            lang={lang}
          />
          <ListingViewToggle
            viewMode={listing.viewMode}
            availableModes={AVAILABLE_VIEW_MODES}
            onViewModeChange={listing.setViewMode}
            lang={lang}
          />
        </div>
      </div>

      {/* Stats */}
      {!listing.loading && listing.totalCount > 0 && (
        <ListingStats
          page={listing.page}
          pageSize={listing.pageSize}
          totalCount={listing.totalCount}
          lang={lang}
          className="mb-3"
        />
      )}

      {/* Loading skeleton */}
      {listing.loading && listing.items.length === 0 && (
        <ListingLoading viewMode={listing.viewMode} />
      )}

      {/* Empty state */}
      {!listing.loading && listing.items.length === 0 && !listing.error && (
        <ListingEmpty
          onClearFilters={listing.clearFilters}
          hasActiveFilters={hasActiveFilters}
          title={emptyTitle}
          description={emptyDescription}
          lang={lang}
        />
      )}

      {/* Job listings */}
      {listing.items.length > 0 && (
        <>
          {listing.viewMode === 'list' && (
            <ListingList
              items={listing.items}
              renderItem={renderJob}
              keyExtractor={keyExtractor}
            />
          )}
          {listing.viewMode === 'grid' && (
            <ListingGrid
              items={listing.items}
              renderItem={renderJob}
              keyExtractor={keyExtractor}
            />
          )}
        </>
      )}

      {/* Cursor pagination (load more) */}
      {listing.items.length > 0 && (
        <ListingPagination
          page={listing.page}
          totalPages={listing.totalPages}
          hasMore={listing.hasMore}
          paginationMode="cursor"
          onPageChange={listing.goToPage}
          onLoadMore={listing.loadMore}
          loading={listing.loading}
          lang={lang}
        />
      )}
    </div>
  );
};

export default JobBoard;
