import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { MemberProfile } from '@/types/member';
import { MemberFilters, filterMembers } from './MemberFilters';
import type { FilterState } from './MemberFilters';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortColumn =
  | 'name'
  | 'email'
  | 'company'
  | 'campus'
  | 'generation'
  | 'skills'
  | 'status';
export type SortDirection = 'asc' | 'desc';

interface MembersTabProps {
  members: MemberProfile[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  lang: 'es' | 'en';
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const labels = {
  es: {
    showing: 'Mostrando',
    of: 'de',
    membersLabel: 'miembros',
    name: 'Nombre',
    company: 'Empresa',
    campus: 'Campus',
    generation: 'Generación',
    skills: 'Habilidades',
    status: 'Estado',
    noResults: 'No hay miembros que coincidan con los filtros actuales',
    bio: 'Biografía',
    email: 'Correo',
    position: 'Puesto',
    degree: 'Nivel académico',
    mentorship: 'Mentoría',
    joined: 'Se unió',
    mentor: 'Mentor',
    mentee: 'Aprendiz',
    both: 'Mentor y aprendiz',
    none: 'No disponible',
    notAvailable: 'No disponible',
  },
  en: {
    showing: 'Showing',
    of: 'of',
    membersLabel: 'members',
    name: 'Name',
    company: 'Company',
    campus: 'Campus',
    generation: 'Generation',
    skills: 'Skills',
    status: 'Status',
    noResults: 'No members match the current filters',
    bio: 'Bio',
    email: 'Email',
    position: 'Position',
    degree: 'Academic level',
    mentorship: 'Mentorship',
    joined: 'Joined',
    mentor: 'Mentor',
    mentee: 'Mentee',
    both: 'Mentor & Mentee',
    none: 'Not available',
    notAvailable: 'Not available',
  },
} as const;

// ---------------------------------------------------------------------------
// Pure utility: sorting (exported for testing)
// ---------------------------------------------------------------------------

function getMemberStatus(m: MemberProfile): string {
  return m.lifecycle?.status ?? m.role;
}

function getStringValue(m: MemberProfile, column: SortColumn): string {
  switch (column) {
    case 'name':
      return m.displayName.toLowerCase();
    case 'email':
      return (m.email ?? '').toLowerCase();
    case 'company':
      return (m.profile.company ?? '').toLowerCase();
    case 'campus':
      return (m.campus ?? '').toLowerCase();
    case 'generation':
      return m.generation ?? '';
    case 'status':
      return getMemberStatus(m).toLowerCase();
    case 'skills':
      return '';
    default:
      return '';
  }
}

export function sortMembers(
  members: MemberProfile[],
  column: SortColumn,
  direction: SortDirection
): MemberProfile[] {
  const sorted = [...members];
  const dirMultiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    if (column === 'skills') {
      return (
        (a.profile.skills.length - b.profile.skills.length) * dirMultiplier
      );
    }
    const aVal = getStringValue(a, column);
    const bVal = getStringValue(b, column);
    return aVal.localeCompare(bVal) * dirMultiplier;
  });

  return sorted;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: SortableHeaderProps) {
  const isActive = column === activeColumn;

  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <span
            className={`inline-block transition-transform ${direction === 'desc' ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            &#x25B2;
          </span>
        )}
      </span>
    </th>
  );
}

interface SkillTagsProps {
  skills: string[];
  max?: number;
}

function SkillTags({ skills, max = 3 }: SkillTagsProps) {
  const visible = skills.slice(0, max);
  const remaining = skills.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((skill) => (
        <span
          key={skill}
          className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
        >
          {skill}
        </span>
      ))}
      {remaining > 0 && (
        <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
          +{remaining}
        </span>
      )}
    </div>
  );
}

interface ExpandedRowProps {
  member: MemberProfile;
  lang: 'es' | 'en';
  isAdmin?: boolean;
}

function ExpandedRow({ member, lang, isAdmin }: ExpandedRowProps) {
  const t = labels[lang];
  const mentorshipLabel = getMentorshipLabel(
    member.networking.mentorshipStatus,
    lang
  );
  const joinedDate =
    member.joinedAt instanceof Date
      ? member.joinedAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

  return (
    <tr>
      <td colSpan={7} className="px-0 py-0">
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
            {/* Full name */}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t.name}:
              </span>{' '}
              <span className="text-gray-900 dark:text-white">
                {member.displayName}
              </span>
            </div>

            {/* Email — visible if privacy allows or viewer is admin */}
            {(member.privacy.showEmail || isAdmin) && member.email && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t.email}:
                </span>{' '}
                <a
                  href={`mailto:${member.email}`}
                  className="text-primary-600 hover:underline dark:text-primary-400"
                >
                  {member.email}
                </a>
              </div>
            )}

            {/* Company + position */}
            {member.profile.company && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t.company}:
                </span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {member.profile.company}
                  {member.profile.position && ` — ${member.profile.position}`}
                </span>
              </div>
            )}

            {/* Position (if no company) */}
            {!member.profile.company && member.profile.position && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t.position}:
                </span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {member.profile.position}
                </span>
              </div>
            )}

            {/* Campus */}
            {member.campus && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t.campus}:
                </span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {member.campus}
                </span>
              </div>
            )}

            {/* Generation */}
            {member.generation && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t.generation}:
                </span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {member.generation}
                </span>
              </div>
            )}

            {/* Degree */}
            {member.academicLevel && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t.degree}:
                </span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {member.academicLevel}
                </span>
              </div>
            )}

            {/* Mentorship status */}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t.mentorship}:
              </span>{' '}
              <span className="text-gray-900 dark:text-white">
                {mentorshipLabel}
              </span>
            </div>

            {/* Joined date */}
            {joinedDate && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t.joined}:
                </span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {joinedDate}
                </span>
              </div>
            )}
          </div>

          {/* Bio */}
          {member.profile.bio && (
            <div className="mt-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.bio}:
              </span>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {member.profile.bio}
              </p>
            </div>
          )}

          {/* Skills as tags (all) */}
          {member.profile.skills.length > 0 && (
            <div className="mt-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.skills}:
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {member.profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="mt-3 flex flex-wrap gap-4">
            <a
              href={`/${lang}/members/${member.slug || member.uid}`}
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              {lang === 'es' ? 'Ver perfil' : 'View profile'}
            </a>
            {member.cvVisibility !== 'private' && (
              <a
                href={`/${lang}/members/${member.slug || member.uid}/cv`}
                className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                {lang === 'es' ? 'Ver CV' : 'View CV'}
              </a>
            )}
            {member.social.linkedin && (
              <a
                href={member.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline dark:text-primary-400"
              >
                LinkedIn
              </a>
            )}
            {member.social.github && (
              <a
                href={member.social.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline dark:text-primary-400"
              >
                GitHub
              </a>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function getMentorshipLabel(
  status: 'mentor' | 'mentee' | 'both' | 'none' | undefined,
  lang: 'es' | 'en'
): string {
  const t = labels[lang];
  switch (status) {
    case 'mentor':
      return t.mentor;
    case 'mentee':
      return t.mentee;
    case 'both':
      return t.both;
    case 'none':
      return t.none;
    default:
      return t.notAvailable;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const MembersTab: React.FC<MembersTabProps> = ({
  members,
  filters,
  onFiltersChange,
  lang,
}) => {
  const { isAdmin } = useAuth();
  const t = labels[lang];
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterMembers(members, filters),
    [members, filters]
  );
  const sorted = useMemo(
    () => sortMembers(filtered, sortColumn, sortDirection),
    [filtered, sortColumn, sortDirection]
  );

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  function handleRowClick(uid: string) {
    setExpandedUid((prev) => (prev === uid ? null : uid));
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <MemberFilters
        members={members}
        filters={filters}
        onFiltersChange={onFiltersChange}
        lang={lang}
      />

      {/* Results count */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t.showing} {sorted.length} {t.of} {members.length} {t.membersLabel}
      </p>

      {/* Table or empty state */}
      {sorted.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          {t.noResults}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {/* Chevron column */}
                <th className="w-10 px-2 py-3" />
                <SortableHeader
                  label={t.name}
                  column="name"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t.email}
                  column="email"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t.company}
                  column="company"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t.campus}
                  column="campus"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t.generation}
                  column="generation"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t.skills}
                  column="skills"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t.status}
                  column="status"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Links
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {sorted.map((member) => {
                const isExpanded = expandedUid === member.uid;
                const status = getMemberStatus(member);

                return (
                  <React.Fragment key={member.uid}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80"
                      onClick={() => handleRowClick(member.uid)}
                    >
                      {/* Chevron */}
                      <td className="w-10 px-2 py-3 text-center">
                        <ChevronDownIcon
                          className={`inline-block h-4 w-4 text-gray-400 transition-transform dark:text-gray-500 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </td>

                      {/* Name */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {member.displayName}
                      </td>

                      {/* Email */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {(member.privacy.showEmail || isAdmin) && member.email
                          ? member.email
                          : '—'}
                      </td>

                      {/* Company */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {member.profile.company || '—'}
                      </td>

                      {/* Campus */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {member.campus || '—'}
                      </td>

                      {/* Generation */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {member.generation || '—'}
                      </td>

                      {/* Skills */}
                      <td className="px-4 py-3">
                        <SkillTags skills={member.profile.skills} max={3} />
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600 dark:text-gray-300">
                        {status}
                      </td>

                      {/* Social Links */}
                      <td
                        className="whitespace-nowrap px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          {member.social?.linkedin && (
                            <a
                              href={member.social.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="LinkedIn"
                              className="text-gray-400 transition-colors hover:text-[#0A66C2] dark:text-gray-500 dark:hover:text-[#0A66C2]"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                              </svg>
                            </a>
                          )}
                          {member.social?.github && (
                            <a
                              href={member.social.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="GitHub"
                              className="text-gray-400 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                              </svg>
                            </a>
                          )}
                          {!member.social?.linkedin &&
                            !member.social?.github && (
                              <span className="text-gray-300 dark:text-gray-600">
                                —
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <ExpandedRow
                        member={member}
                        lang={lang}
                        isAdmin={isAdmin}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MembersTab;
