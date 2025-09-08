import React, { useState, useEffect, useRef } from 'react';
import type { MemberSearchFilters  } from '@/types/member';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  ClockIcon,
  StarIcon,
  UserGroupIcon,
  CalendarIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface MemberSearchProps {
  onSearch: (filters: MemberSearchFilters) => void;
  initialFilters?: MemberSearchFilters;
  lang?: 'es' | 'en';
  showAdvanced?: boolean;
}

export const MemberSearch: React.FC<MemberSearchProps> = ({
  onSearch,
  initialFilters = {},
  lang = 'es',
  showAdvanced = false
}) => {
  const [filters, setFilters] = useState<MemberSearchFilters>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(showAdvanced);
  const [searchInput, setSearchInput] = useState(initialFilters.query || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Common options for dropdowns
  const experienceLevels = [
    { value: 'junior', label: lang === 'es' ? 'Junior (0-2 años)' : 'Junior (0-2 years)' },
    { value: 'mid', label: lang === 'es' ? 'Semi-Senior (3-5 años)' : 'Mid-level (3-5 years)' },
    { value: 'senior', label: lang === 'es' ? 'Senior (6-10 años)' : 'Senior (6-10 years)' },
    { value: 'lead', label: lang === 'es' ? 'Lead (10+ años)' : 'Lead (10+ years)' },
    { value: 'executive', label: lang === 'es' ? 'Ejecutivo' : 'Executive' }
  ];

  const sortOptions = [
    { value: 'relevance', label: lang === 'es' ? 'Relevancia' : 'Relevance' },
    { value: 'name', label: lang === 'es' ? 'Nombre' : 'Name' },
    { value: 'joinDate', label: lang === 'es' ? 'Fecha de ingreso' : 'Join date' },
    { value: 'activity', label: lang === 'es' ? 'Actividad' : 'Activity' },
    { value: 'reputation', label: lang === 'es' ? 'Reputación' : 'Reputation' }
  ];

  const availabilityOptions = [
    { value: 'mentoring', label: lang === 'es' ? 'Mentoría disponible' : 'Available for mentoring' },
    { value: 'opportunities', label: lang === 'es' ? 'Abierto a oportunidades' : 'Open to opportunities' },
    { value: 'networking', label: lang === 'es' ? 'Networking activo' : 'Active networking' }
  ];

  // Common skills for quick selection
  const popularSkills = [
    'Python', 'R', 'SQL', 'Machine Learning', 'Deep Learning',
    'Tableau', 'Power BI', 'AWS', 'Azure', 'GCP',
    'Spark', 'Hadoop', 'Docker', 'Kubernetes', 'TensorFlow',
    'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Statistics'
  ];

  // Common companies
  const popularCompanies = [
    'Google', 'Microsoft', 'Amazon', 'Facebook/Meta', 'Apple',
    'Netflix', 'Uber', 'Airbnb', 'Tesla', 'IBM',
    'Oracle', 'Salesforce', 'Adobe', 'Spotify', 'Twitter'
  ];

  // Common locations in Mexico and globally
  const popularLocations = [
    'Ciudad de México', 'Guadalajara', 'Monterrey', 'Tijuana', 'Puebla',
    'Remote', 'San Francisco', 'New York', 'Seattle', 'Austin',
    'Toronto', 'London', 'Berlin', 'Barcelona', 'São Paulo'
  ];

  useEffect(() => {
    // Debounce search input
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const newFilters = { ...filters, query: searchInput || undefined };
      setFilters(newFilters);
      onSearch(newFilters);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  useEffect(() => {
    onSearch(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof MemberSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleArrayFilterChange = (key: keyof MemberSearchFilters, value: string, checked: boolean) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const clearFilters = () => {
    const clearedFilters: MemberSearchFilters = {
      sortBy: 'activity',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    setSearchInput('');
    onSearch(clearedFilters);
  };

  const hasActiveFilters = (): boolean => {
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

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.query) count++;
    if (filters?.skills?.length) count++;
    if (filters?.companies?.length) count++;
    if (filters?.locations?.length) count++;
    if (filters?.experienceLevel?.length) count++;
    if (filters?.industries?.length) count++;
    if (filters?.availability?.length) count++;
    if (filters.onlineStatus) count++;
    if (filters.hasPortfolio) count++;
    if (filters.isPremium) count++;
    if (filters.joinedAfter) count++;
    return count;
  };

  return (
    <div className="space-y-4">
      {/* Main search bar */}
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={lang === 'es' ? 'Buscar por nombre, empresa, habilidad...' : 'Search by name, company, skill...'}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Advanced filters toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`absolute right-2 top-2 p-2 rounded-lg transition-colors ${
            isExpanded
              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={lang === 'es' ? 'Filtros avanzados' : 'Advanced filters'}
        >
          <FunnelIcon className="h-5 w-5" />
          {hasActiveFilters() && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
              {getActiveFilterCount()}
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters panel */}
      {isExpanded && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-700">
          {/* Filter header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {lang === 'es' ? 'Filtros Avanzados' : 'Advanced Filters'}
            </h3>
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
              >
                {lang === 'es' ? 'Limpiar todo' : 'Clear all'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <AcademicCapIcon className="h-4 w-4 inline mr-1" />
                {lang === 'es' ? 'Habilidades' : 'Skills'}
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {popularSkills.map(skill => (
                  <label key={skill} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters?.skills?.includes(skill) || false}
                      onChange={(e) => handleArrayFilterChange('skills', skill, e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{skill}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Companies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                {lang === 'es' ? 'Empresas' : 'Companies'}
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {popularCompanies.map(company => (
                  <label key={company} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters?.companies?.includes(company) || false}
                      onChange={(e) => handleArrayFilterChange('companies', company, e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{company}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                {lang === 'es' ? 'Ubicaciones' : 'Locations'}
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {popularLocations.map(location => (
                  <label key={location} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters?.locations?.includes(location) || false}
                      onChange={(e) => handleArrayFilterChange('locations', location, e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{location}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                {lang === 'es' ? 'Nivel de Experiencia' : 'Experience Level'}
              </label>
              <div className="space-y-1">
                {experienceLevels.map(level => (
                  <label key={level.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters?.experienceLevel?.includes(level.value) || false}
                      onChange={(e) => handleArrayFilterChange('experienceLevel', level.value, e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <UserGroupIcon className="h-4 w-4 inline mr-1" />
                {lang === 'es' ? 'Disponibilidad' : 'Availability'}
              </label>
              <div className="space-y-1">
                {availabilityOptions.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters?.availability?.includes(option.value as any) || false}
                      onChange={(e) => handleArrayFilterChange('availability', option.value, e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Special filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BoltIcon className="h-4 w-4 inline mr-1" />
                {lang === 'es' ? 'Filtros Especiales' : 'Special Filters'}
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.onlineStatus || false}
                    onChange={(e) => handleFilterChange('onlineStatus', e.target.checked ? true : undefined)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {lang === 'es' ? 'Solo en línea' : 'Online only'}
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.hasPortfolio || false}
                    onChange={(e) => handleFilterChange('hasPortfolio', e.target.checked ? true : undefined)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {lang === 'es' ? 'Con portafolio' : 'Has portfolio'}
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isPremium || false}
                    onChange={(e) => handleFilterChange('isPremium', e.target.checked ? true : undefined)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    <StarIcon className="h-3 w-3 inline mr-1 text-yellow-500" />
                    {lang === 'es' ? 'Miembros Premium' : 'Premium members'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Sort and date filters */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sort by */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {lang === 'es' ? 'Ordenar por' : 'Sort by'}
                </label>
                <div className="flex space-x-2">
                  <select
                    value={filters.sortBy || 'activity'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={filters.sortOrder || 'desc'}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="desc">{lang === 'es' ? 'Desc' : 'Desc'}</option>
                    <option value="asc">{lang === 'es' ? 'Asc' : 'Asc'}</option>
                  </select>
                </div>
              </div>

              {/* Joined after */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  {lang === 'es' ? 'Miembro desde' : 'Member since'}
                </label>
                <input
                  type="date"
                  value={filters.joinedAfter ? filters.joinedAfter.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('joinedAfter', e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Clear filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  {lang === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
                </button>
              </div>
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters() && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex flex-wrap gap-2">
                {filters.query && (
                  <span className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded">
                    "{filters.query}"
                    <button
                      onClick={() => {
                        setSearchInput('');
                        handleFilterChange('query', undefined);
                      }}
                      className="ml-1 text-primary-500 hover:text-primary-700"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filters?.skills?.map(skill => (
                  <span key={skill} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">
                    {skill}
                    <button
                      onClick={() => handleArrayFilterChange('skills', skill, false)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                
                {filters?.companies?.map(company => (
                  <span key={company} className="inline-flex items-center px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
                    {company}
                    <button
                      onClick={() => handleArrayFilterChange('companies', company, false)}
                      className="ml-1 text-green-500 hover:text-green-700"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                
                {filters?.locations?.map(location => (
                  <span key={location} className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded">
                    {location}
                    <button
                      onClick={() => handleArrayFilterChange('locations', location, false)}
                      className="ml-1 text-purple-500 hover:text-purple-700"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberSearch;