import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MemberCard } from './MemberCard';
import { MemberSearch } from './MemberSearch';
import { getMemberProfiles, searchMembers, getMemberStats } from '@/lib/members';
import type {
  MemberProfile,
  MemberSearchFilters,
  MemberSearchResult,
  ViewMode,
  MemberStats
} from '@/types/member';
import {
  Squares2X2Icon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon
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
  maxMembers = 50
}) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View and pagination state
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState<MemberSearchFilters>({
    sortBy: 'activity',
    sortOrder: 'desc'
  });

  // Load members and stats on component mount
  useEffect(() => {
    loadMembers();
    if(showStats) {
      loadStats();
    }
  }, [showStats]);

  // Search when filters change
  useEffect(() => {
    if (hasActiveFilters(searchFilters)) {
      handleSearch(searchFilters);
    } else {
      setSearchResults([]);
    }
  }, [searchFilters]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const memberProfiles = await getMemberProfiles({ limit: maxMembers });
      setMembers(memberProfiles);
    } catch (err) {
      setError(lang === 'es' ? 'Error al cargar miembros' : 'Error loading members');
      console.error('Error loading members:', err);
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
    const activeMembers = searchResults.length > 0 
      ? searchResults.map(r => r.member) 
      : members;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return activeMembers.slice(startIndex, endIndex);
  }, [members, searchResults, currentPage, itemsPerPage]);

  const totalMembers = searchResults.length > 0 ? searchResults.length : members.length;
  const totalPages = Math.ceil(totalMembers / itemsPerPage);

  const getViewModeLabel = (mode: ViewMode): string => {
    const labels: Record<ViewMode, Record<string, string>> = {
      grid: { es: 'Cuadrícula', en: 'Grid' },
      list: { es: 'Lista', en: 'List' },
      compact: { es: 'Compacto', en: 'Compact' }
    };
    return labels[mode][lang];
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
      sortBy: 'activity',
      sortOrder: 'desc'
    });
    setSearchResults([]);
    setCurrentPage(1);
  };

  const getGridClasses = (): string => {
    switch(viewMode) {
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
      case 'list':
        return 'space-y-4';
      case 'compact':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Cargando miembros...' : 'Loading members...'}
        </span>
      </div>
    );
  }

  if(error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={loadMembers}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
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
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <MemberSearch
              onSearch={handleFiltersChange}
              initialFilters={searchFilters}
              lang={lang}
              showAdvanced={showFilters}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-primary-100 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={lang === 'es' ? 'Filtros avanzados' : 'Advanced filters'}
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </button>
            
            {hasActiveFilters(searchFilters) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {lang === 'es' ? 'Limpiar' : 'Clear'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Header and View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            <span className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full">
              {lang === 'es' ? 'Filtrado' : 'Filtered'}
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['grid', 'list', 'compact'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-2 rounded transition-colors ${
                viewMode === mode
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {lang === 'es' ? 'No se encontraron miembros' : 'No members found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters(searchFilters)
              ? (lang === 'es' ? 'Intenta ajustar los filtros de búsqueda' : 'Try adjusting your search filters')
              : (lang === 'es' ? 'No hay miembros disponibles en este momento' : 'No members available at this time')
            }
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
              currentUser={user}
              showMatchScore={searchResults.length > 0}
              matchScore={searchResults.find(r => r.member.uid === member.uid)?.matchScore}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {lang === 'es' ? 'Anterior' : 'Previous'}
          </button>
          
          {[...Array(Math.min(5, totalPages))].map((_, index) => {
            const pageNumber = currentPage <= 3 
              ? index + 1 
              : currentPage + index - 2;
            
            if (pageNumber > totalPages) return null;
            
            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`px-3 py-2 text-sm font-medium rounded-lg ${
                  currentPage === pageNumber
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {pageNumber}
              </button>
            );
          })}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {lang === 'es' ? 'Siguiente' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MemberDirectory;