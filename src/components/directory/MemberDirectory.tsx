import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MemberCard } from './MemberCard';
import { MemberSearch } from './MemberSearch';
import {
  getMemberProfiles,
  searchMembers,
  getMemberStats,
} from '@/lib/members';
import type {
  MemberProfile,
  MemberSearchFilters,
  MemberSearchResult,
  ViewMode,
  MemberStats,
} from '@/types/member';
import {
  Squares2X2Icon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon,
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
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Top-level view: directory vs statistics
  const [activeView, setActiveView] = useState<'directory' | 'statistics'>(
    'directory'
  );

  // View and pagination state
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [memberType, setMemberType] = useState<
    'all' | 'member' | 'collaborator'
  >('member');
  const [searchFilters, setSearchFilters] = useState<MemberSearchFilters>({
    sortBy: 'joinDate',
    sortOrder: 'desc',
  });

  // Loading timeout — don't hang forever if Firestore is unreachable
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      if (loading && members.length === 0) {
        setLoading(false);
        setError(
          lang === 'es'
            ? 'No se pudo conectar al servidor. Verifica tu conexión e intenta de nuevo.'
            : 'Could not connect to the server. Check your connection and try again.'
        );
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading, members.length, lang]);

  // Load members and stats on component mount or when memberType changes
  useEffect(() => {
    if (authLoading) return;
    loadMembers();
    if (showStats) {
      loadStats();
    }
  }, [showStats, memberType, authLoading]);

  // Search when filters change, or re-sort locally when only sort changes
  useEffect(() => {
    if (hasActiveFilters(searchFilters)) {
      handleSearch(searchFilters);
    } else {
      setSearchResults([]);
      // Re-sort existing members client-side when only sort changes
      if (members.length > 0 && searchFilters.sortBy) {
        const sorted = [...members].sort((a, b) => {
          const order = searchFilters.sortOrder === 'asc' ? 1 : -1;
          switch (searchFilters.sortBy) {
            case 'name':
              return order * a.displayName.localeCompare(b.displayName);
            case 'joinDate':
              return order * (a.joinedAt.getTime() - b.joinedAt.getTime());
            case 'activity':
              return (
                order *
                ((a.activity.lastActive?.getTime() || 0) -
                  (b.activity.lastActive?.getTime() || 0))
              );
            case 'reputation':
              return order * (a.activity.reputation - b.activity.reputation);
            default:
              return 0;
          }
        });
        setMembers(sorted);
      }
    }
  }, [searchFilters]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const memberProfiles = await getMemberProfiles({
        filters: { memberType },
        limit: maxMembers,
      });
      setMembers(memberProfiles);
    } catch (err) {
      console.error('Error loading members:', err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'permission-denied') {
        setError(
          lang === 'es'
            ? 'No tienes permisos para ver el directorio de miembros'
            : 'You do not have permission to view the member directory'
        );
      } else {
        setError(
          lang === 'es'
            ? 'Error al cargar miembros. Intenta de nuevo.'
            : 'Error loading members. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const memberStats = await getMemberStats();
      setStats(memberStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSearch = async (filters: MemberSearchFilters) => {
    try {
      setLoading(true);
      const results = await searchMembers(filters);
      setSearchResults(results);
      setCurrentPage(1);
    } catch (err) {
      setError(lang === 'es' ? 'Error en la búsqueda' : 'Search error');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = (filters: MemberSearchFilters): boolean => {
    return !!(
      filters.query ||
      filters?.skills?.length ||
      filters?.companies?.length ||
      filters?.locations?.length ||
      filters?.experienceLevel?.length ||
      filters?.industries?.length ||
      filters?.availability?.length ||
      filters.onlineStatus ||
      filters.hasPortfolio ||
      filters.isPremium ||
      filters.joinedAfter
    );
  };

  const displayMembers = useMemo(() => {
    const activeMembers =
      searchResults.length > 0 ? searchResults.map((r) => r.member) : members;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return activeMembers.slice(startIndex, endIndex);
  }, [members, searchResults, currentPage, itemsPerPage]);

  const totalMembers =
    searchResults.length > 0 ? searchResults.length : members.length;
  const totalPages = Math.ceil(totalMembers / itemsPerPage);

  const getViewModeLabel = (mode: ViewMode): string => {
    const labels: Record<ViewMode, Record<string, string>> = {
      grid: { es: 'Cuadrícula', en: 'Grid' },
      list: { es: 'Lista', en: 'List' },
      compact: { es: 'Compacto', en: 'Compact' },
    };
    return labels[mode][lang] ?? mode;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFiltersChange = (filters: MemberSearchFilters) => {
    setSearchFilters(filters);
  };

  const clearFilters = () => {
    setSearchFilters({
      sortBy: 'joinDate',
      sortOrder: 'desc',
    });
    setSearchResults([]);
    setCurrentPage(1);
  };

  const getGridClasses = (): string => {
    switch (viewMode) {
      case 'grid':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6';
      case 'list':
        return 'space-y-3 sm:space-y-4';
      case 'compact':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3';
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6';
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Cargando miembros...' : 'Loading members...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={loadMembers}
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
                  setCurrentPage(1);
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
                  initialFilters={searchFilters}
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

                {hasActiveFilters(searchFilters) && (
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
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Mostrando' : 'Showing'}{' '}
                <span className="font-semibold">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, totalMembers)}
                </span>
                -{' '}
                <span className="font-semibold">
                  {Math.min(currentPage * itemsPerPage, totalMembers)}
                </span>{' '}
                {lang === 'es' ? 'de' : 'of'}{' '}
                <span className="font-semibold">{totalMembers}</span>{' '}
                {lang === 'es' ? 'miembros' : 'members'}
              </p>

              {searchResults.length > 0 && (
                <span className="rounded-full bg-primary-100 px-2 py-1 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                  {lang === 'es' ? 'Filtrado' : 'Filtered'}
                </span>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
              {(['grid', 'list', 'compact'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded p-2 transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-primary-600 shadow-sm dark:bg-gray-800 dark:text-primary-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  title={getViewModeLabel(mode)}
                >
                  {mode === 'grid' && <Squares2X2Icon className="h-4 w-4" />}
                  {mode === 'list' && <ListBulletIcon className="h-4 w-4" />}
                  {mode === 'compact' && <Squares2X2Icon className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Members Grid/List */}
          {displayMembers.length === 0 ? (
            <div className="py-12 text-center">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {lang === 'es'
                  ? 'No se encontraron miembros'
                  : 'No members found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {hasActiveFilters(searchFilters)
                  ? lang === 'es'
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Try adjusting your search filters'
                  : lang === 'es'
                    ? 'No hay miembros disponibles en este momento'
                    : 'No members available at this time'}
              </p>
            </div>
          ) : (
            <div className={getGridClasses()}>
              {displayMembers.map((member) => (
                <MemberCard
                  key={member.uid}
                  member={member}
                  viewMode={viewMode}
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
                  showMatchScore={searchResults.length > 0}
                  matchScore={
                    searchResults.find((r) => r.member.uid === member.uid)
                      ?.matchScore
                  }
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center space-x-1 sm:mt-8 sm:space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 sm:px-3"
              >
                <span className="hidden sm:inline">
                  {lang === 'es' ? 'Anterior' : 'Previous'}
                </span>
                <span className="sm:hidden">&lsaquo;</span>
              </button>

              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                const pageNumber =
                  currentPage <= 3 ? index + 1 : currentPage + index - 2;

                if (pageNumber > totalPages) return null;

                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      currentPage === pageNumber
                        ? 'bg-primary-600 text-white'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 sm:px-3"
              >
                <span className="hidden sm:inline">
                  {lang === 'es' ? 'Siguiente' : 'Next'}
                </span>
                <span className="sm:hidden">&rsaquo;</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MemberDirectory;
