import React, { useState, useEffect } from 'react';
import {
  FunnelIcon,
  MapPinIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  ClockIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface JobFiltersProps {
  lang?: 'es' | 'en';
  onFiltersChange?: (filters: FilterState) => void;
}

interface FilterState {
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

export const JobFilters: React.FC<JobFiltersProps> = ({
  lang = 'es',
  onFiltersChange,
}) => {
  const [filters, setFilters] = useState<FilterState>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('jobFilters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved filters:', e);
      }
    }
    return {
      location: '',
      locationType: [],
      employmentType: [],
      experienceLevel: [],
      salaryMin: 0,
      salaryMax: 200000,
      skills: [],
      postedWithin: 'all',
      industry: [],
      companySize: [],
      benefits: [],
    };
  });

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const locations = [
    {
      value: '',
      label: lang === 'es' ? 'Todas las ubicaciones' : 'All locations',
    },
    { value: 'cdmx', label: 'Ciudad de México' },
    { value: 'guadalajara', label: 'Guadalajara' },
    { value: 'monterrey', label: 'Monterrey' },
    { value: 'queretaro', label: 'Querétaro' },
    { value: 'remote', label: lang === 'es' ? 'Remoto' : 'Remote' },
  ];

  const locationTypes = [
    { value: 'remote', label: lang === 'es' ? 'Remoto' : 'Remote' },
    { value: 'hybrid', label: lang === 'es' ? 'Híbrido' : 'Hybrid' },
    { value: 'onsite', label: lang === 'es' ? 'Presencial' : 'On-site' },
  ];

  const employmentTypes = [
    {
      value: 'full-time',
      label: lang === 'es' ? 'Tiempo completo' : 'Full-time',
    },
    { value: 'part-time', label: lang === 'es' ? 'Medio tiempo' : 'Part-time' },
    { value: 'contract', label: lang === 'es' ? 'Por proyecto' : 'Contract' },
    {
      value: 'internship',
      label: lang === 'es' ? 'Práctica/Pasantía' : 'Internship',
    },
  ];

  const experienceLevels = [
    { value: 'entry', label: lang === 'es' ? 'Principiante' : 'Entry Level' },
    { value: 'junior', label: 'Junior' },
    { value: 'mid', label: lang === 'es' ? 'Intermedio' : 'Mid Level' },
    { value: 'senior', label: 'Senior' },
    { value: 'lead', label: lang === 'es' ? 'Líder/Manager' : 'Lead/Manager' },
    {
      value: 'executive',
      label: lang === 'es' ? 'Ejecutivo/Director' : 'Executive/Director',
    },
  ];

  const industries = [
    { value: 'technology', label: lang === 'es' ? 'Tecnología' : 'Technology' },
    { value: 'finance', label: lang === 'es' ? 'Finanzas' : 'Finance' },
    { value: 'healthcare', label: lang === 'es' ? 'Salud' : 'Healthcare' },
    { value: 'education', label: lang === 'es' ? 'Educación' : 'Education' },
    { value: 'retail', label: lang === 'es' ? 'Retail/Comercio' : 'Retail' },
    {
      value: 'manufacturing',
      label: lang === 'es' ? 'Manufactura' : 'Manufacturing',
    },
    {
      value: 'consulting',
      label: lang === 'es' ? 'Consultoría' : 'Consulting',
    },
    {
      value: 'media',
      label: lang === 'es' ? 'Medios/Marketing' : 'Media/Marketing',
    },
    {
      value: 'government',
      label: lang === 'es' ? 'Gobierno/ONG' : 'Government/NGO',
    },
    { value: 'startup', label: 'Startup' },
  ];

  const companySizes = [
    {
      value: 'startup',
      label: lang === 'es' ? 'Startup (1-10)' : 'Startup (1-10)',
    },
    {
      value: 'small',
      label: lang === 'es' ? 'Pequeña (11-50)' : 'Small (11-50)',
    },
    {
      value: 'medium',
      label: lang === 'es' ? 'Mediana (51-200)' : 'Medium (51-200)',
    },
    {
      value: 'large',
      label: lang === 'es' ? 'Grande (201-1000)' : 'Large (201-1000)',
    },
    {
      value: 'enterprise',
      label: lang === 'es' ? 'Corporativo (1000+)' : 'Enterprise (1000+)',
    },
  ];

  const benefitsOptions = [
    {
      value: 'health-insurance',
      label: lang === 'es' ? 'Seguro médico' : 'Health insurance',
    },
    {
      value: 'remote-work',
      label: lang === 'es' ? 'Trabajo remoto' : 'Remote work',
    },
    {
      value: 'flexible-hours',
      label: lang === 'es' ? 'Horarios flexibles' : 'Flexible hours',
    },
    {
      value: 'vacation',
      label: lang === 'es' ? 'Vacaciones adicionales' : 'Extra vacation',
    },
    {
      value: 'training',
      label: lang === 'es' ? 'Capacitación/Cursos' : 'Training/Courses',
    },
    {
      value: 'bonus',
      label: lang === 'es' ? 'Bonos/Comisiones' : 'Bonus/Commission',
    },
    {
      value: 'stock-options',
      label: lang === 'es' ? 'Opciones de acciones' : 'Stock options',
    },
    {
      value: 'gym',
      label: lang === 'es' ? 'Gimnasio/Wellness' : 'Gym/Wellness',
    },
    {
      value: 'food',
      label: lang === 'es' ? 'Vales de comida' : 'Food allowance',
    },
    {
      value: 'transport',
      label: lang === 'es' ? 'Transporte' : 'Transportation',
    },
  ];

  const postedWithinOptions = [
    { value: 'all', label: lang === 'es' ? 'Todo el tiempo' : 'Any time' },
    {
      value: '24h',
      label: lang === 'es' ? 'Últimas 24 horas' : 'Last 24 hours',
    },
    { value: '3d', label: lang === 'es' ? 'Últimos 3 días' : 'Last 3 days' },
    { value: '7d', label: lang === 'es' ? 'Última semana' : 'Last week' },
    { value: '30d', label: lang === 'es' ? 'Último mes' : 'Last month' },
  ];

  const popularSkills = [
    'Python',
    'R',
    'SQL',
    'Machine Learning',
    'Deep Learning',
    'TensorFlow',
    'PyTorch',
    'Spark',
    'AWS',
    'Azure',
    'GCP',
    'Docker',
    'Kubernetes',
    'MLOps',
    'Data Visualization',
    'Tableau',
    'Power BI',
    'Statistics',
    'NLP',
    'Computer Vision',
  ];

  // Save to localStorage whenever filters change
  useEffect(() => {
    localStorage.setItem('jobFilters', JSON.stringify(filters));
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  const handleCheckboxChange = (category: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const categoryValues = prev[category] as string[];
      const updated = categoryValues.includes(value)
        ? categoryValues.filter((v) => v !== value)
        : [...categoryValues, value];

      return { ...prev, [category]: updated };
    });
  };

  const handleSalaryChange = (type: 'min' | 'max', value: number) => {
    setFilters((prev) => ({
      ...prev,
      [`salary${type.charAt(0).toUpperCase() + type.slice(1)}`]: value,
    }));
  };

  const handleSingleFilterChange = (
    category: keyof FilterState,
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [category]: value }));
  };

  const handleSkillToggle = (skill: string) => {
    handleCheckboxChange('skills', skill);
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      location: '',
      locationType: [],
      employmentType: [],
      experienceLevel: [],
      salaryMin: 0,
      salaryMax: 200000,
      skills: [],
      postedWithin: 'all',
      industry: [],
      companySize: [],
      benefits: [],
    };
    setFilters(clearedFilters);
    localStorage.removeItem('jobFilters');
  };

  const formatSalary = (value: number): string => {
    return new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasActiveFilters =
    filters.location !== '' ||
    filters.locationType.length > 0 ||
    filters.employmentType.length > 0 ||
    filters.experienceLevel.length > 0 ||
    filters.skills.length > 0 ||
    filters.postedWithin !== 'all' ||
    filters.salaryMin > 0 ||
    filters.salaryMax < 200000 ||
    filters.industry.length > 0 ||
    filters.companySize.length > 0 ||
    filters.benefits.length > 0;

  const activeFilterCount = [
    filters.location !== '' ? 1 : 0,
    filters.locationType.length,
    filters.employmentType.length,
    filters.experienceLevel.length,
    filters.skills.length,
    filters.postedWithin !== 'all' ? 1 : 0,
    filters.salaryMin > 0 || filters.salaryMax < 200000 ? 1 : 0,
    filters.industry.length,
    filters.companySize.length,
    filters.benefits.length,
  ].reduce((sum, count) => sum + count, 0);

  const FilterContent = (): JSX.Element => {
    return (
      <div className="space-y-6">
        {/* Location */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <MapPinIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Ubicación' : 'Location'}
          </h3>
          <select
            value={filters.location}
            onChange={(e) =>
              handleSingleFilterChange('location', e.target.value)
            }
            className="w-full rounded-lg border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {locations.map((loc) => (
              <option key={loc.value} value={loc.value}>
                {loc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Location Type */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <BriefcaseIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Modalidad' : 'Work Mode'}
          </h3>
          <div className="space-y-2">
            {locationTypes.map((type) => (
              <label key={type.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.locationType.includes(type.value)}
                  onChange={() =>
                    handleCheckboxChange('locationType', type.value)
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {type.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Employment Type */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <ClockIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Tipo de empleo' : 'Employment Type'}
          </h3>
          <div className="space-y-2">
            {employmentTypes.map((type) => (
              <label key={type.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.employmentType.includes(type.value)}
                  onChange={() =>
                    handleCheckboxChange('employmentType', type.value)
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {type.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <AcademicCapIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Nivel de experiencia' : 'Experience Level'}
          </h3>
          <div className="space-y-2">
            {experienceLevels.map((level) => (
              <label key={level.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.experienceLevel.includes(level.value)}
                  onChange={() =>
                    handleCheckboxChange('experienceLevel', level.value)
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {level.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Salary Range */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <CurrencyDollarIcon className="mr-2 h-4 w-4" />
            {lang === 'es'
              ? 'Rango salarial (MXN/mes)'
              : 'Salary Range (MXN/month)'}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? 'Mínimo' : 'Minimum'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="200000"
                  step="1000"
                  value={filters.salaryMin}
                  onChange={(e) =>
                    handleSalaryChange('min', parseInt(e.target.value) || 0)
                  }
                  className="w-full rounded border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? 'Máximo' : 'Maximum'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="200000"
                  step="1000"
                  value={filters.salaryMax}
                  onChange={(e) =>
                    handleSalaryChange(
                      'max',
                      parseInt(e.target.value) || 200000
                    )
                  }
                  className="w-full rounded border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="200000"
                />
              </div>
            </div>
            <div className="relative">
              <div className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                {formatSalary(filters.salaryMin)} -{' '}
                {formatSalary(filters.salaryMax)}
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="200000"
                  step="5000"
                  value={filters.salaryMin}
                  onChange={(e) =>
                    handleSalaryChange('min', parseInt(e.target.value))
                  }
                  className="absolute h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                  style={{ zIndex: 1 }}
                />
                <input
                  type="range"
                  min="0"
                  max="200000"
                  step="5000"
                  value={filters.salaryMax}
                  onChange={(e) =>
                    handleSalaryChange('max', parseInt(e.target.value))
                  }
                  className="absolute h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                  style={{ zIndex: 2 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Posted Within */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <ClockIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Publicado' : 'Posted'}
          </h3>
          <select
            value={filters.postedWithin}
            onChange={(e) =>
              handleSingleFilterChange('postedWithin', e.target.value)
            }
            className="w-full rounded-lg border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {postedWithinOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Skills */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Habilidades' : 'Skills'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {popularSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => handleSkillToggle(skill)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  filters.skills.includes(skill)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Industry/Sector */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <BuildingOfficeIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Industria/Sector' : 'Industry/Sector'}
          </h3>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {industries.map((industry) => (
              <label key={industry.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.industry.includes(industry.value)}
                  onChange={() =>
                    handleCheckboxChange('industry', industry.value)
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {industry.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Company Size */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <BuildingOfficeIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Tamaño de empresa' : 'Company Size'}
          </h3>
          <div className="space-y-2">
            {companySizes.map((size) => (
              <label key={size.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.companySize.includes(size.value)}
                  onChange={() =>
                    handleCheckboxChange('companySize', size.value)
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {size.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div>
          <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
            <SparklesIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Beneficios' : 'Benefits'}
          </h3>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {benefitsOptions.map((benefit) => (
              <label key={benefit.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.benefits.includes(benefit.value)}
                  onChange={() =>
                    handleCheckboxChange('benefits', benefit.value)
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {benefit.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {lang === 'es' ? 'Limpiar filtros' : 'Clear filters'}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Filter Button */}
      <button
        onClick={() => setShowMobileFilters(!showMobileFilters)}
        className="mb-4 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden"
      >
        <FunnelIcon className="mr-2 h-5 w-5" />
        {lang === 'es' ? 'Filtros' : 'Filters'}
        {hasActiveFilters && (
          <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Filtros' : 'Filters'}
                </h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <FilterContent />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Filters */}
      <div className="hidden rounded-lg bg-white p-6 shadow dark:bg-gray-800 lg:block">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Filtros' : 'Filters'}
        </h2>
        <FilterContent />
      </div>
    </>
  );
};

export default JobFilters;
