import React from 'react';
import type { MemberProfile } from '@/types/member';

interface Props {
  member: MemberProfile;
  companyId: string;
  isAlumni?: boolean;
  isVerified: boolean;
  lang?: 'es' | 'en';
}

function formatDate(date: Date | undefined, lang: string): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric',
    month: 'short',
  });
}

function getRoleAtCompany(
  member: MemberProfile,
  companyId: string,
  isAlumni: boolean
): { position: string; startDate?: Date; endDate?: Date; current: boolean } {
  const roles = member.experience?.previousRoles || [];
  const match = isAlumni
    ? roles.find((r) => r.companyId === companyId && !r.current)
    : roles.find((r) => r.companyId === companyId && r.current);

  if (match) {
    return {
      position: match.position,
      startDate: match.startDate,
      endDate: match.endDate,
      current: match.current,
    };
  }

  return {
    position: member.experience?.currentRole || '',
    current: !isAlumni,
  };
}

function getCurrentCompanyName(member: MemberProfile): string | undefined {
  const roles = member.experience?.previousRoles || [];
  const currentRole = roles.find((r) => r.current);
  return currentRole?.company;
}

export const CompanyMemberCard: React.FC<Props> = ({
  member,
  companyId,
  isAlumni = false,
  isVerified,
  lang = 'es',
}) => {
  if (!isVerified) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-gray-300 dark:bg-gray-600" />
          <div className="mt-1 h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {lang === 'es' ? 'Inicia sesion para ver' : 'Sign in to view'}
        </span>
      </div>
    );
  }

  const role = getRoleAtCompany(member, companyId, isAlumni);
  const nowAt = isAlumni ? getCurrentCompanyName(member) : undefined;
  const avatar = member.profile.photoURL;
  const linkedin = member.social?.linkedin;
  const profileUrl = `/${lang}/members/${member.slug || member.uid}`;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
      {/* Avatar */}
      <a href={profileUrl} className="shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={member.displayName}
            className="h-10 w-10 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {member.initials || member.displayName?.charAt(0) || '?'}
          </div>
        )}
      </a>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <a
          href={profileUrl}
          className="truncate font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
        >
          {member.displayName}
        </a>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
          {role.position}
        </p>
        {role.startDate && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(role.startDate, lang)}
            {role.endDate ? ` – ${formatDate(role.endDate, lang)}` : isAlumni ? '' : ` – ${lang === 'es' ? 'Presente' : 'Present'}`}
          </p>
        )}
        {isAlumni && nowAt && (
          <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {lang === 'es' ? 'Ahora en' : 'Now at'}: {nowAt}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400"
            title="LinkedIn"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        )}
        <a
          href={profileUrl}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-700 dark:hover:text-primary-400"
          title={lang === 'es' ? 'Ver perfil' : 'View profile'}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default CompanyMemberCard;
