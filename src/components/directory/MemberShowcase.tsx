import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCompaniesWithMembers, getCompanies } from '@/lib/companies';
import { getMemberStatistics, getMemberProfiles } from '@/lib/members';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import type { Company } from '@/types/company';
import type { MemberProfile } from '@/types/member';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MemberShowcaseProps {
  lang?: 'es' | 'en';
  mode?: 'public' | 'private';
}

type ViewTab = 'current' | 'historical';

interface CompanyWithMembers extends Company {
  currentMembers: MemberInfo[];
  historicalMembers: MemberInfo[];
}

interface MemberInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
  slug: string;
}

interface IndustryGroup {
  industry: string;
  color: string;
  companies: CompanyWithMembers[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const INDUSTRY_COLORS: Record<string, string> = {
  'Tecnología': '#3b82f6',
  'Finanzas': '#10b981',
  'Gobierno': '#f59e0b',
  'Educación': '#8b5cf6',
  'Consultoría': '#ec4899',
  'Retail': '#f97316',
  'Consumo': '#06b6d4',
  'Entretenimiento': '#a855f7',
  'Datos': '#6366f1',
  'Fitness': '#14b8a6',
  'Fintech': '#f43f5e',
  'Conglomerado': '#78716c',
};

const DEFAULT_INDUSTRY_COLOR = '#64748b';

const SECID_PRIMARY = '#f65425';

/* ------------------------------------------------------------------ */
/* Translations                                                        */
/* ------------------------------------------------------------------ */

const translations = {
  es: {
    title: '¿Dónde trabajan los miembros de SECiD?',
    subtitle: 'Empresas donde nuestros egresados generan impacto',
    current: 'Actuales',
    historical: 'Historial completo',
    companies: 'Empresas',
    industries: 'Industrias',
    historicalTotal: 'Histórico total',
    members: 'Miembros',
    viewCompany: 'Ver empresa',
    memberCount: (n: number) => `${n} ${n === 1 ? 'miembro' : 'miembros'}`,
    footer: (count: number) =>
      `¡Contamos con ${count} miembros y vamos por más!`,
    noData: 'No hay datos disponibles',
    loading: 'Cargando...',
    retry: 'Reintentar',
    uncategorized: 'Otros',
    website: 'Sitio web',
  },
  en: {
    title: 'Where do SECiD members work?',
    subtitle: 'Companies where our alumni make an impact',
    current: 'Current',
    historical: 'Full history',
    companies: 'Companies',
    industries: 'Industries',
    historicalTotal: 'All-time total',
    members: 'Members',
    viewCompany: 'View company',
    memberCount: (n: number) => `${n} ${n === 1 ? 'member' : 'members'}`,
    footer: (count: number) => `We have ${count} members and counting!`,
    noData: 'No data available',
    loading: 'Loading...',
    retry: 'Retry',
    uncategorized: 'Other',
    website: 'Website',
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getIndustryColor(industry: string | undefined): string {
  if (!industry) return DEFAULT_INDUSTRY_COLOR;
  return INDUSTRY_COLORS[industry] ?? DEFAULT_INDUSTRY_COLOR;
}

function buildMemberMap(
  members: MemberProfile[],
): {
  byCompanyId: Map<string, MemberInfo[]>;
  byCompanyIdHistorical: Map<string, MemberInfo[]>;
} {
  const byCompanyId = new Map<string, MemberInfo[]>();
  const byCompanyIdHistorical = new Map<string, MemberInfo[]>();

  for (const member of members) {
    const info: MemberInfo = {
      uid: member.uid,
      displayName: member.displayName,
      photoURL: member.profile?.photoURL,
      slug: member.slug,
    };

    const currentCompanyId = member.profile?.companyId;
    if (currentCompanyId) {
      const existing = byCompanyId.get(currentCompanyId) ?? [];
      existing.push(info);
      byCompanyId.set(currentCompanyId, existing);
    }

    const previousRoles = member.experience?.previousRoles ?? [];
    for (const role of previousRoles) {
      if (role.companyId && role.companyId !== currentCompanyId) {
        const existing = byCompanyIdHistorical.get(role.companyId) ?? [];
        if (!existing.some((m) => m.uid === info.uid)) {
          existing.push(info);
          byCompanyIdHistorical.set(role.companyId, existing);
        }
      }
    }
  }

  return { byCompanyId, byCompanyIdHistorical };
}

function enrichCompanies(
  companies: Company[],
  memberMap: {
    byCompanyId: Map<string, MemberInfo[]>;
    byCompanyIdHistorical: Map<string, MemberInfo[]>;
  },
): CompanyWithMembers[] {
  return companies.map((c) => ({
    ...c,
    currentMembers: memberMap.byCompanyId.get(c.id) ?? [],
    historicalMembers: memberMap.byCompanyIdHistorical.get(c.id) ?? [],
  }));
}

function groupByIndustry(
  companies: CompanyWithMembers[],
  tab: ViewTab,
  uncategorizedLabel: string,
): IndustryGroup[] {
  const groups = new Map<string, CompanyWithMembers[]>();

  for (const company of companies) {
    const industry = company.industry || uncategorizedLabel;
    const existing = groups.get(industry) ?? [];
    existing.push(company);
    groups.set(industry, existing);
  }

  return Array.from(groups.entries())
    .map(([industry, companiesInGroup]) => ({
      industry,
      color: getIndustryColor(industry === uncategorizedLabel ? undefined : industry),
      companies: [...companiesInGroup].sort((a, b) => {
        const countA = tab === 'current' ? a.memberCount : a.memberCount + a.historicalMembers.length;
        const countB = tab === 'current' ? b.memberCount : b.memberCount + b.historicalMembers.length;
        return countB - countA;
      }),
    }))
    .sort((a, b) => {
      const totalA = a.companies.reduce((sum, c) => sum + c.memberCount, 0);
      const totalB = b.companies.reduce((sum, c) => sum + c.memberCount, 0);
      return totalB - totalA;
    });
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className="text-2xl font-bold" style={{ color }}>
        {value.toLocaleString()}
      </span>
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}

function TabSwitcher({
  activeTab,
  onTabChange,
  labels,
}: {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  labels: { current: string; historical: string };
}) {
  return (
    <div className="inline-flex rounded-full bg-gray-100 p-1 dark:bg-gray-700/50">
      <button
        type="button"
        onClick={() => onTabChange('current')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          activeTab === 'current'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        {labels.current}
      </button>
      <button
        type="button"
        onClick={() => onTabChange('historical')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          activeTab === 'historical'
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        {labels.historical}
      </button>
    </div>
  );
}

function IndustryHeader({
  industry,
  color,
}: {
  industry: string;
  color: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
        {industry}
      </span>
      <div
        className="h-px flex-1"
        style={{
          background: `linear-gradient(to right, ${color}33, transparent)`,
        }}
      />
    </div>
  );
}

function MemberAvatar({
  member,
}: {
  member: MemberInfo;
}) {
  const initials = member.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (member.photoURL) {
    return (
      <img
        src={member.photoURL}
        alt={member.displayName}
        className="h-6 w-6 rounded-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-gray-600 dark:bg-gray-600 dark:text-gray-300">
      {initials}
    </div>
  );
}

function HoverPopover({
  company,
  mode,
  lang,
  t,
}: {
  company: CompanyWithMembers;
  mode: 'public' | 'private';
  lang: 'es' | 'en';
  t: (typeof translations)['es'];
}) {
  const websiteHref = company.website || (company.domain ? `https://${company.domain}` : null);
  const companyProfileHref = `/${lang}/companies/${company.slug}`;

  return (
    <div className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl transition-opacity duration-200 dark:border-gray-600 dark:bg-gray-800">
      {/* Arrow */}
      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800" />

      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <CompanyLogo company={company} size="lg" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-semibold text-gray-900 dark:text-white">
            {company.name}
          </h4>
          {company.industry && (
            <span
              className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: getIndustryColor(company.industry) }}
            >
              {company.industry}
            </span>
          )}
          {company.location && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {company.location}
            </p>
          )}
        </div>
      </div>

      {/* Member count */}
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {t.memberCount(company.memberCount)}
      </p>

      {/* Private mode: member list */}
      {mode === 'private' && company.currentMembers.length > 0 && (
        <div className="mb-3 max-h-32 space-y-1.5 overflow-y-auto">
          {company.currentMembers.map((member) => (
            <a
              key={member.uid}
              href={`/${lang}/members/${member.slug}`}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <MemberAvatar member={member} />
              <span className="truncate text-xs text-gray-700 dark:text-gray-300">
                {member.displayName}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Links */}
      <div className="flex items-center gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
        <a
          href={companyProfileHref}
          className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t.viewCompany} &rarr;
        </a>
        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {t.website} &nearr;
          </a>
        )}
      </div>
    </div>
  );
}

function CompanyCard({
  company,
  isWide,
  mode,
  lang,
  t,
}: {
  company: CompanyWithMembers;
  isWide: boolean;
  mode: 'public' | 'private';
  lang: 'es' | 'en';
  t: (typeof translations)['es'];
}) {
  const [showPopover, setShowPopover] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPopover(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowPopover(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`relative ${isWide ? 'col-span-2' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 transition-all hover:border-orange-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-orange-500 ${
          showPopover ? 'border-orange-400 shadow-md dark:border-orange-500' : ''
        } cursor-pointer`}
      >
        <CompanyLogo company={company} size="md" />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-700 dark:text-gray-200">
            {company.name}
          </span>
          {isWide && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t.memberCount(company.memberCount)}
            </span>
          )}
        </div>
      </div>

      {showPopover && (
        <HoverPopover company={company} mode={mode} lang={lang} t={t} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export const MemberShowcase: React.FC<MemberShowcaseProps> = ({
  lang = 'es',
  mode = 'public',
}) => {
  const [currentCompanies, setCurrentCompanies] = useState<CompanyWithMembers[]>([]);
  const [allCompanies, setAllCompanies] = useState<CompanyWithMembers[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('current');
  const t = translations[lang];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const fetchPromises: [
        Promise<Company[]>,
        Promise<Company[]>,
        Promise<{ totalMembers: number }>,
        Promise<MemberProfile[]>,
      ] = [
        getCompaniesWithMembers(),
        getCompanies(),
        getMemberStatistics(),
        mode === 'private' ? getMemberProfiles({ limit: 500 }) : Promise.resolve([]),
      ];

      const [currentData, allData, statsData, membersData] = await Promise.all(fetchPromises);

      const memberMap = buildMemberMap(membersData);

      setCurrentCompanies(enrichCompanies(currentData, memberMap));
      setAllCompanies(enrichCompanies(allData, memberMap));
      setTotalMembers(statsData.totalMembers);
    } catch (err) {
      console.error('Error loading member showcase data:', err);
      setCurrentCompanies([]);
      setAllCompanies([]);
      setTotalMembers(0);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const displayCompanies = activeTab === 'current' ? currentCompanies : allCompanies;

  const industryGroups = useMemo(
    () => groupByIndustry(displayCompanies, activeTab, t.uncategorized),
    [displayCompanies, activeTab, t.uncategorized],
  );

  const uniqueIndustries = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCompanies) {
      if (c.industry) set.add(c.industry);
    }
    return set.size;
  }, [allCompanies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t.loading}
        </span>
      </div>
    );
  }

  if (currentCompanies.length === 0 && allCompanies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t.noData}</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {t.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Title */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.subtitle}
        </p>
      </div>

      {/* Stats Banner */}
      <div className="mx-6 mb-4 grid grid-cols-2 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-gray-50 sm:grid-cols-4 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900/50">
        <StatCard
          label={t.companies}
          value={currentCompanies.length}
          color={SECID_PRIMARY}
        />
        <StatCard
          label={t.industries}
          value={uniqueIndustries}
          color="#3b82f6"
        />
        <StatCard
          label={t.historicalTotal}
          value={allCompanies.length}
          color="#10b981"
        />
        <StatCard
          label={t.members}
          value={totalMembers}
          color="#8b5cf6"
        />
      </div>

      {/* Toggle Tabs */}
      <div className="flex justify-center px-6 pb-4">
        <TabSwitcher
          activeTab={activeTab}
          onTabChange={setActiveTab}
          labels={{ current: t.current, historical: t.historical }}
        />
      </div>

      {/* Industry Groups */}
      <div className="space-y-6 px-6 pb-4">
        {industryGroups.map((group) => (
          <div key={group.industry}>
            <IndustryHeader industry={group.industry} color={group.color} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {group.companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  isWide={company.memberCount >= 3}
                  mode={mode}
                  lang={lang}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-700">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t.footer(totalMembers)}
        </p>
      </div>
    </div>
  );
};

export default MemberShowcase;
