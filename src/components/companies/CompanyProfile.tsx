import React, { useState, useEffect, useMemo } from 'react';
import { GlobeAltIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import type { Company } from '@/types/company';
import type { MemberProfile } from '@/types/member';
import { getCompanyBySlug } from '@/lib/companies';
import { getCompanyMembers } from '@/lib/companies/members';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { CompanyMemberCard } from './CompanyMemberCard';
import { translateIndustry } from '@/lib/companies/industry-i18n';

interface Props {
  slug: string;
  lang?: 'es' | 'en';
}

type Tab = 'current' | 'alumni' | 'roles';

function extractSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const companiesIdx = segments.indexOf('companies');
  if (companiesIdx >= 0 && companiesIdx + 1 < segments.length) {
    return segments[companiesIdx + 1] || null;
  }
  return null;
}

export const CompanyProfile: React.FC<Props> = ({
  slug: propSlug,
  lang = 'es',
}) => {
  const { isVerified } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [current, setCurrent] = useState<MemberProfile[]>([]);
  const [alumni, setAlumni] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('current');

  const slug = propSlug || extractSlugFromUrl();

  useEffect(() => {
    if (!slug) {
      setError(lang === 'es' ? 'Empresa no encontrada' : 'Company not found');
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const comp = await getCompanyBySlug(slug!);
        if (cancelled) return;
        if (!comp) {
          setError(lang === 'es' ? 'Empresa no encontrada' : 'Company not found');
          return;
        }
        setCompany(comp);

        const members = await getCompanyMembers(comp.id, comp.name);
        if (cancelled) return;
        setCurrent(members.current);
        setAlumni(members.alumni);
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading company:', err);
        setError(lang === 'es' ? 'Error al cargar la empresa' : 'Error loading company');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug, lang]);

  const rolesBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of [...current, ...alumni]) {
      const roles = member.experience?.previousRoles || [];
      for (const role of roles) {
        if (role.companyId === company?.id && role.position) {
          counts.set(role.position, (counts.get(role.position) || 0) + 1);
        }
      }
      if (current.includes(member) && member.experience?.currentRole) {
        const pos = member.experience.currentRole;
        counts.set(pos, (counts.get(pos) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [current, alumni, company]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'es' ? 'Cargando...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mb-4 text-6xl">:(</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {error || (lang === 'es' ? 'Empresa no encontrada' : 'Company not found')}
          </h2>
          <a
            href={`/${lang}/companies`}
            className="mt-4 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            {lang === 'es' ? 'Volver al directorio' : 'Back to directory'}
          </a>
        </div>
      </div>
    );
  }

  const totalConnections = current.length + alumni.length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    {
      key: 'current',
      label: lang === 'es' ? 'Miembros actuales' : 'Current members',
      count: current.length,
    },
    {
      key: 'alumni',
      label: 'Alumni',
      count: alumni.length,
    },
    {
      key: 'roles',
      label: lang === 'es' ? 'Roles' : 'Roles',
      count: rolesBreakdown.length,
    },
  ];

  return (
    <div>
      {/* Back link */}
      <a
        href={`/${lang}/companies`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {lang === 'es' ? 'Volver al directorio' : 'Back to directory'}
      </a>

      {/* Company header */}
      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <CompanyLogo company={company} size="lg" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {company.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {company.industry && (
              <span className="rounded-full bg-primary-100 px-3 py-0.5 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                {translateIndustry(company.industry, lang)}
              </span>
            )}
            {company.location && <span>{company.location}</span>}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
              >
                <GlobeAltIcon className="h-4 w-4" />
                {lang === 'es' ? 'Sitio web' : 'Website'}
              </a>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {totalConnections} {lang === 'es' ? 'conexiones SECiD' : 'SECiD connections'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'current' && (
        <div className="space-y-2">
          {current.length > 0 ? (
            current.map((m) => (
              <CompanyMemberCard
                key={m.uid}
                member={m}
                companyId={company.id}
                isVerified={isVerified}
                lang={lang}
              />
            ))
          ) : (
            <p className="py-8 text-center text-gray-400 dark:text-gray-500">
              {lang === 'es' ? 'Sin miembros actuales registrados' : 'No current members registered'}
            </p>
          )}
        </div>
      )}

      {activeTab === 'alumni' && (
        <div className="space-y-2">
          {alumni.length > 0 ? (
            alumni.map((m) => (
              <CompanyMemberCard
                key={m.uid}
                member={m}
                companyId={company.id}
                isAlumni
                isVerified={isVerified}
                lang={lang}
              />
            ))
          ) : (
            <p className="py-8 text-center text-gray-400 dark:text-gray-500">
              {lang === 'es' ? 'Sin alumni registrados' : 'No alumni registered'}
            </p>
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-3">
          {rolesBreakdown.length > 0 ? (
            rolesBreakdown.map(([position, count]) => (
              <div
                key={position}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <span className="font-medium text-gray-900 dark:text-white">{position}</span>
                <span className="rounded-full bg-primary-100 px-3 py-0.5 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {count}
                </span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-gray-400 dark:text-gray-500">
              {lang === 'es' ? 'Sin roles registrados' : 'No roles registered'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyProfile;
