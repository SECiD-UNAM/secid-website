import React, { useState, useMemo } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import type { MemberProfile } from '@/types/member';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterState {
  includeCollaborators: boolean;
  generations?: string[];
  campuses?: string[];
  genders?: string[];
  degrees?: string[];
  companies?: string[];
  skills?: string[];
  experienceLevels?: string[];
  professionalStatuses?: string[];
  joinedAfter?: string;
  onlineOnly?: boolean;
  mentorshipAvailable?: boolean;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  includeCollaborators: false,
};

interface MemberFiltersProps {
  members: MemberProfile[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  lang: 'es' | 'en';
}

interface FilterOptions {
  campuses: string[];
  generations: string[];
  genders: string[];
  degrees: string[];
  companies: string[];
  skills: string[];
  experienceLevels: string[];
  professionalStatuses: string[];
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const labels = {
  es: {
    filters: 'Filtros',
    clearAll: 'Limpiar filtros',
    activeFilters: 'filtros activos',
    campus: 'Campus',
    generation: 'Generación',
    gender: 'Género',
    degree: 'Nivel académico',
    company: 'Empresa',
    skills: 'Habilidades',
    experienceLevel: 'Nivel de experiencia',
    professionalStatus: 'Situación profesional',
    includeCollaborators: 'Incluir colaboradores',
    onlineOnly: 'Solo en línea',
    mentorshipAvailable: 'Disponible para mentoría',
    joinedAfter: 'Ingresó después de',
    noOptions: 'Sin opciones',
  },
  en: {
    filters: 'Filters',
    clearAll: 'Clear all',
    activeFilters: 'active filters',
    campus: 'Campus',
    generation: 'Generation',
    gender: 'Gender',
    degree: 'Academic level',
    company: 'Company',
    skills: 'Skills',
    experienceLevel: 'Experience level',
    professionalStatus: 'Professional status',
    includeCollaborators: 'Include collaborators',
    onlineOnly: 'Online only',
    mentorshipAvailable: 'Available for mentorship',
    joinedAfter: 'Joined after',
    noOptions: 'No options',
  },
} as const;

// ---------------------------------------------------------------------------
// Pure utility functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Extracts unique, non-empty option values for each filter field
 * from the members array.
 */
export function extractFilterOptions(members: MemberProfile[]): FilterOptions {
  const campusSet = new Set<string>();
  const generationSet = new Set<string>();
  const genderSet = new Set<string>();
  const degreeSet = new Set<string>();
  const companySet = new Set<string>();
  const skillSet = new Set<string>();
  const experienceLevelSet = new Set<string>();
  const professionalStatusSet = new Set<string>();

  for (const m of members) {
    if (m.campus) campusSet.add(m.campus);

    if (m.generation) generationSet.add(m.generation);

    // registrationData and gender are present on Firestore docs but not on the typed interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = m as any;
    const gender: string | undefined =
      raw.registrationData?.gender || raw.gender;
    if (gender) genderSet.add(gender);

    const degree: string | undefined =
      raw.registrationData?.maxDegree || m.academicLevel;
    if (degree) degreeSet.add(degree);

    if (m.profile.company) companySet.add(m.profile.company);

    for (const skill of m.profile.skills) {
      if (skill) skillSet.add(skill);
    }

    if (m.experience?.level) experienceLevelSet.add(m.experience.level);

    if (m.professionalStatus) professionalStatusSet.add(m.professionalStatus);
  }

  return {
    campuses: [...campusSet].sort(),
    generations: [...generationSet].sort(),
    genders: [...genderSet].sort(),
    degrees: [...degreeSet].sort(),
    companies: [...companySet].sort(),
    skills: [...skillSet].sort(),
    experienceLevels: [...experienceLevelSet].sort(),
    professionalStatuses: [...professionalStatusSet].sort(),
  };
}

/**
 * Counts how many filters are actively narrowing the results
 * (differs from DEFAULT_FILTER_STATE).
 */
export function countActiveFilters(filters: FilterState): number {
  let count = 0;

  if (filters.includeCollaborators) count++;
  if (filters.campuses?.length) count++;
  if (filters.generations?.length) count++;
  if (filters.genders?.length) count++;
  if (filters.degrees?.length) count++;
  if (filters.companies?.length) count++;
  if (filters.skills?.length) count++;
  if (filters.experienceLevels?.length) count++;
  if (filters.professionalStatuses?.length) count++;
  if (filters.onlineOnly) count++;
  if (filters.mentorshipAvailable) count++;
  if (filters.joinedAfter) count++;

  return count;
}

/**
 * Filters members based on the provided FilterState.
 * All multi-select filters use AND logic between categories
 * (a member must match ALL active filter groups).
 * Within skills, OR logic is used (member needs at least one matching skill).
 */
export function filterMembers(
  members: MemberProfile[],
  filters: FilterState
): MemberProfile[] {
  return members.filter((m) => {
    // Role filter
    if (!filters.includeCollaborators && m.role !== 'member') return false;

    // Multi-select filters (only apply if array is non-empty)
    if (filters.campuses?.length) {
      if (!m.campus || !filters.campuses.includes(m.campus)) return false;
    }

    if (filters.generations?.length) {
      if (!m.generation || !filters.generations.includes(m.generation))
        return false;
    }

    if (filters.genders?.length) {
      // registrationData and gender are on Firestore docs but not on the typed interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = m as any;
      const gender: string | undefined =
        raw.registrationData?.gender || raw.gender;
      if (!gender || !filters.genders.includes(gender)) return false;
    }

    if (filters.degrees?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = m as any;
      const degree: string | undefined =
        raw.registrationData?.maxDegree || m.academicLevel;
      if (!degree || !filters.degrees.includes(degree)) return false;
    }

    if (
      filters.companies?.length &&
      !filters.companies.includes(m.profile.company)
    ) {
      return false;
    }

    if (filters.skills?.length) {
      if (!filters.skills.some((s) => m.profile.skills.includes(s)))
        return false;
    }

    if (
      filters.experienceLevels?.length &&
      !filters.experienceLevels.includes(m.experience.level)
    ) {
      return false;
    }

    if (filters.professionalStatuses?.length) {
      if (
        !m.professionalStatus ||
        !filters.professionalStatuses.includes(m.professionalStatus)
      ) {
        return false;
      }
    }

    // Boolean filters
    if (filters.onlineOnly && !m.isOnline) return false;
    if (filters.mentorshipAvailable && !m.networking.availableForMentoring)
      return false;

    // Date filter
    if (filters.joinedAfter && m.joinedAt < new Date(filters.joinedAfter))
      return false;

    return true;
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  noOptionsLabel: string;
}

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  noOptionsLabel,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
          selected.length > 0
            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
            : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
        } hover:border-primary-400 dark:hover:border-primary-500`}
      >
        <span className="truncate">
          {label}
          {selected.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-medium text-white">
              {selected.length}
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronUpIcon className="ml-1 h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="ml-1 h-4 w-4 flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {noOptionsLabel}
            </p>
          ) : (
            options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
                />
                <span className="truncate">{option}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface CheckboxFilterProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxFilter({ label, checked, onChange }: CheckboxFilterProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
      />
      <span>{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const MemberFilters: React.FC<MemberFiltersProps> = ({
  members,
  filters,
  onFiltersChange,
  lang,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = labels[lang];

  const options = useMemo(() => extractFilterOptions(members), [members]);
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  function updateFilter<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onFiltersChange({ ...DEFAULT_FILTER_STATE });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
      >
        <span className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5" />
          <span>{t.filters}</span>
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-medium text-white">
              {activeCount}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5" />
        ) : (
          <ChevronDownIcon className="h-5 w-5" />
        )}
      </button>

      {/* Filter Panel */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-200 px-4 pb-4 pt-4 dark:border-gray-700">
          {/* Multi-select filters in responsive grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MultiSelectFilter
              label={t.campus}
              options={options.campuses}
              selected={filters.campuses || []}
              onChange={(v) => updateFilter('campuses', v)}
              noOptionsLabel={t.noOptions}
            />
            <MultiSelectFilter
              label={t.generation}
              options={options.generations}
              selected={filters.generations || []}
              onChange={(v) => updateFilter('generations', v)}
              noOptionsLabel={t.noOptions}
            />
            <MultiSelectFilter
              label={t.gender}
              options={options.genders}
              selected={filters.genders || []}
              onChange={(v) => updateFilter('genders', v)}
              noOptionsLabel={t.noOptions}
            />
            <MultiSelectFilter
              label={t.degree}
              options={options.degrees}
              selected={filters.degrees || []}
              onChange={(v) => updateFilter('degrees', v)}
              noOptionsLabel={t.noOptions}
            />
            <MultiSelectFilter
              label={t.company}
              options={options.companies}
              selected={filters.companies || []}
              onChange={(v) => updateFilter('companies', v)}
              noOptionsLabel={t.noOptions}
            />
            <MultiSelectFilter
              label={t.skills}
              options={options.skills}
              selected={filters.skills || []}
              onChange={(v) => updateFilter('skills', v)}
              noOptionsLabel={t.noOptions}
            />
            <MultiSelectFilter
              label={t.experienceLevel}
              options={options.experienceLevels}
              selected={filters.experienceLevels || []}
              onChange={(v) => updateFilter('experienceLevels', v)}
              noOptionsLabel={t.noOptions}
            />
            <MultiSelectFilter
              label={t.professionalStatus}
              options={options.professionalStatuses}
              selected={filters.professionalStatuses || []}
              onChange={(v) => updateFilter('professionalStatuses', v)}
              noOptionsLabel={t.noOptions}
            />
          </div>

          {/* Checkbox and date filters */}
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2 dark:border-gray-700">
            <CheckboxFilter
              label={t.includeCollaborators}
              checked={filters.includeCollaborators}
              onChange={(v) => updateFilter('includeCollaborators', v)}
            />
            <CheckboxFilter
              label={t.onlineOnly}
              checked={filters.onlineOnly || false}
              onChange={(v) => updateFilter('onlineOnly', v)}
            />
            <CheckboxFilter
              label={t.mentorshipAvailable}
              checked={filters.mentorshipAvailable || false}
              onChange={(v) => updateFilter('mentorshipAvailable', v)}
            />

            {/* Date filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="joinedAfter"
                className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300"
              >
                {t.joinedAfter}
              </label>
              <input
                id="joinedAfter"
                type="date"
                value={filters.joinedAfter || ''}
                onChange={(e) =>
                  updateFilter('joinedAfter', e.target.value || undefined)
                }
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
          </div>

          {/* Clear all */}
          {activeCount > 0 && (
            <div className="border-t border-gray-100 pt-2 dark:border-gray-700">
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 text-sm text-red-600 transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              >
                <XMarkIcon className="h-4 w-4" />
                {t.clearAll}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberFilters;
