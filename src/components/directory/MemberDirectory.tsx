import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MemberCard } from './MemberCard';
import { MemberSearch } from './MemberSearch';
import { getMemberStats } from '@/lib/members';
import type {
  MemberProfile,
  MemberSearchFilters,
  ViewMode,
  MemberStats,
} from '@/types/member';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { MemberDirectoryAdapter } from './MemberDirectoryAdapter';
import {
  ListingViewToggle,
  ListingGrid,
  ListingList,
  ListingCompact,
  ListingPagination,
  ListingEmpty,
  ListingLoading,
  ListingStats,
} from '@components/listing';
import {
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

interface MemberDirectoryProps {
  lang?: 'es' | 'en';
  initialView?: ViewMode;
  showStats?: boolean;
  maxMembers?: number;
}

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({
  lang = 'es',
  initialView = 'grid',
  showStats = true,
  maxMembers = 50,
}) => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [activeView, setActiveView] = useState<'directory' | 'statistics'>(
    'directory'
  );
  const [memberType, setMemberType] = useState<
    'all' | 'member' | 'collaborator'
  >('member');
  const [showFilters, setShowFilters] = useState(false);

  // Track search results with match scores for display in MemberCard
  const [searchResultMap, setSearchResultMap] = useState<
    Map<string, number>
  >(new Map());

  // Create adapter that refreshes when memberType changes
  const adapter = useMemo(
    () => new MemberDirectoryAdapter(memberType, maxMembers),
    [memberType, maxMembers]
  );

  const listing = useUniversalListing<MemberProfile>({
    adapter,
    defaultViewMode: initialView,
    defaultPageSize: 12,
    defaultSort: { field: 'joinDate', direction: 'desc' },
    paginationMode: 'offset',
    debounceMs: 300,
    lang,
  });

  // Load stats
  useEffect(() => {
    if (authLoading || !showStats) return;
    getMemberStats()
      .then(setStats)
      .catch((err) => console.error('Error loading stats:', err));
  }, [showStats, authLoading]);

  // Bridge MemberSearch filter changes into the hook
  const handleFiltersChange = useCallback(
    (filters: MemberSearchFilters) => {
      // Set query via the hook (debounced internally)
      if (filters.query !== undefined) {
        listing.setQuery(filters.query ?? '');
      }

      // Map each MemberSearchFilter field to the hook's filter state
      const filterKeys: (keyof MemberSearchFilters)[] = [
        'skills',
        'companies',
        'locations',
        'experienceLevel',
        'industries',
        'availability',
        'onlineStatus',
        'hasPortfolio',
        'isPremium',
        'joinedAfter',
      ];

      for (const key of filterKeys) {
        listing.setFilter(key, filters[key]);
      }

      // Map sort if present
      if (filters.sortBy) {
        listing.setSort({
          field: filters.sortBy,
          direction: filters.sortOrder ?? 'desc',
        });
      }
    },
    [listing.setQuery, listing.setFilter, listing.setSort]
  );

  const clearFilters = useCallback(() => {
    listing.clearFilters();
    listing.setQuery('');
    setSearchResultMap(new Map());
  }, [listing.clearFilters, listing.setQuery]);

  const hasActiveFilters =
    listing.query.length > 0 ||
    Object.values(listing.activeFilters).some(
      (v) =>
        v !== undefined &&
        v !== null &&
        v !== '' &&
        !(Array.isArray(v) && v.length === 0) &&
        v !== false
    );

  const handlePageChange = (page: number) => {
    listing.goToPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Map viewMode from listing types to member types (they share the same values)
  const memberViewMode = listing.viewMode as ViewMode;

  const renderMemberItem = useCallback(
    (member: MemberProfile) => (
      <MemberCard
        member={member}
        viewMode={memberViewMode}
        lang={lang}
        currentUser={
          user
            ? {
                uid: user.uid,
                email: user.email ?? '',
                displayName: user.displayName ?? '',
                photoURL: user.photoURL ?? undefined,
                role: 'member',
              }
            : null
        }
        showMatchScore={searchResultMap.size > 0}
        matchScore={searchResultMap.get(member.uid)}
      />
    ),
    [memberViewMode, lang, user, searchResultMap]
  );

  const keyExtractor = useCallback(
    (member: MemberProfile) => member.uid,
    []
  );

  // Loading timeout
  useEffect(() => {
    if (!listing.loading) return;
    const timeout = setTimeout(() => {
      if (listing.loading && listing.items.length === 0) {
        // The hook will handle this via error state
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [listing.loading, listing.items.length]);

  // Initial loading state
  if (listing.loading && listing.items.length === 0 && !listing.error) {
    return <ListingLoading viewMode={memberViewMode} count={12} />;
  }

  // Error state
  if (listing.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-400">
          {lang === 'es'
            ? 'Error al cargar miembros. Intenta de nuevo.'
            : 'Error loading members. Please try again.'}
        </p>
        <button
          onClick={listing.retry}
          className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
        >
          {lang === 'es' ? 'Intentar de nuevo' : 'Try again'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      {showStats && stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? 'Total Miembros' : 'Total Members'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalMembers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? 'En Línea' : 'Online'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.onlineMembers}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? 'Nuevos Este Mes' : 'New This Month'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.newMembersThisMonth}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center">
              <FunnelIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? 'Skill Principal' : 'Top Skill'}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stats.topSkills[0]?.skill || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle: Directory / Statistics */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 dark:border-gray-700">
        {[
          {
            value: 'directory' as const,
            label: lang === 'es' ? 'Directorio' : 'Directory',
          },
          {
            value: 'statistics' as const,
            label: lang === 'es' ? 'Estadísticas' : 'Statistics',
          },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveView(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeView === tab.value
                ? 'bg-primary-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {tab.value === 'statistics' && (
              <ChartBarIcon className="-mt-0.5 mr-1.5 inline-block h-4 w-4" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Statistics View */}
      {activeView === 'statistics' && (
        <div className="py-12 text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {lang === 'es'
              ? 'Las estadísticas están disponibles en el panel de miembros.'
              : 'Statistics are available in the members dashboard.'}
          </p>
        </div>
      )}

      {/* Directory View */}
      {activeView === 'directory' && (
        <>
          {/* Member Type Tabs */}
          <div className="flex gap-2">
            {[
              {
                value: 'member' as const,
                label: lang === 'es' ? 'Miembros' : 'Members',
              },
              {
                value: 'collaborator' as const,
                label: lang === 'es' ? 'Colaboradores' : 'Collaborators',
              },
              { value: 'all' as const, label: lang === 'es' ? 'Todos' : 'All' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setMemberType(tab.value);
                  listing.goToPage(1);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  memberType === tab.value
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1">
                <MemberSearch
                  onSearch={handleFiltersChange}
                  initialFilters={{
                    sortBy: 'joinDate',
                    sortOrder: 'desc',
                  }}
                  lang={lang}
                  showAdvanced={showFilters}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 sm:justify-end">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`rounded-lg border p-2 transition-colors ${
                    showFilters
                      ? 'border-primary-300 bg-primary-100 text-primary-700 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                  title={
                    lang === 'es' ? 'Filtros avanzados' : 'Advanced filters'
                  }
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {lang === 'es' ? 'Limpiar' : 'Clear'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Header and View Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <ListingStats
                page={listing.page}
                pageSize={listing.pageSize}
                totalCount={listing.totalCount}
                lang={lang}
              />

              {hasActiveFilters && (
                <span className="rounded-full bg-primary-100 px-2 py-1 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                  {lang === 'es' ? 'Filtrado' : 'Filtered'}
                </span>
              )}
            </div>

            {/* View Mode Toggle */}
            <ListingViewToggle
              viewMode={listing.viewMode}
              availableModes={['grid', 'list', 'compact']}
              onViewModeChange={listing.setViewMode}
              lang={lang}
            />
          </div>

          {/* Members display */}
          {listing.loading && listing.items.length === 0 ? (
            <ListingLoading viewMode={memberViewMode} count={12} />
          ) : listing.items.length === 0 ? (
            <ListingEmpty
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              title={
                lang === 'es'
                  ? 'No se encontraron miembros'
                  : 'No members found'
              }
              description={
                hasActiveFilters
                  ? lang === 'es'
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Try adjusting your search filters'
                  : lang === 'es'
                    ? 'No hay miembros disponibles en este momento'
                    : 'No members available at this time'
              }
              lang={lang}
            />
          ) : (
            <>
              {memberViewMode === 'grid' && (
                <ListingGrid
                  items={listing.items}
                  renderItem={renderMemberItem}
                  keyExtractor={keyExtractor}
                  className="xl:grid-cols-4"
                />
              )}
              {memberViewMode === 'list' && (
                <ListingList
                  items={listing.items}
                  renderItem={renderMemberItem}
                  keyExtractor={keyExtractor}
                />
              )}
              {memberViewMode === 'compact' && (
                <ListingCompact
                  items={listing.items}
                  renderItem={renderMemberItem}
                  keyExtractor={keyExtractor}
                />
              )}
            </>
          )}

          {/* Pagination */}
          <ListingPagination
            page={listing.page}
            totalPages={listing.totalPages}
            hasMore={listing.hasMore}
            paginationMode="offset"
            onPageChange={handlePageChange}
            onLoadMore={listing.loadMore}
            loading={listing.loading}
            lang={lang}
          />
        </>
      )}
    </div>
  );
};

export default MemberDirectory;
