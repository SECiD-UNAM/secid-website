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
  companies: CompanyWithMembers[];
}

interface IndustryColorSet {
  border: string;
  text: string;
  bg: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const INDUSTRY_COLORS: Record<string, IndustryColorSet> = {
  'Tecnología': { border: 'border-blue-500', text: 'text-blue-500', bg: 'bg-blue-500/10' },
  'Finanzas': { border: 'border-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  'Gobierno': { border: 'border-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10' },
  'Educación': { border: 'border-violet-500', text: 'text-violet-500', bg: 'bg-violet-500/10' },
  'Consultoría': { border: 'border-pink-500', text: 'text-pink-500', bg: 'bg-pink-500/10' },
  'Retail': { border: 'border-orange-500', text: 'text-orange-500', bg: 'bg-orange-500/10' },
  'Consumo': { border: 'border-cyan-500', text: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  'Entretenimiento': { border: 'border-purple-500', text: 'text-purple-500', bg: 'bg-purple-500/10' },
  'Datos': { border: 'border-indigo-500', text: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  'Fitness': { border: 'border-teal-500', text: 'text-teal-500', bg: 'bg-teal-500/10' },
  'Fintech': { border: 'border-rose-500', text: 'text-rose-500', bg: 'bg-rose-500/10' },
  'Conglomerado': { border: 'border-stone-500', text: 'text-stone-500', bg: 'bg-stone-500/10' },
};

const DEFAULT_INDUSTRY_COLOR: IndustryColorSet = {
  border: 'border-gray-500',
  text: 'text-gray-500',
  bg: 'bg-gray-500/10',
};

const WIDE_THRESHOLD = 5;
const PROMINENT_MEMBER_THRESHOLD = 3;
const SMALL_INDUSTRY_THRESHOLD = 2;

/* ------------------------------------------------------------------ */
/* Translations                                                        */
/* ------------------------------------------------------------------ */

const translations = {
  es: {
    title: 'Ecosistema SECiD',
    subtitle: 'Empresas donde nuestros egresados generan impacto',
    current: 'Actuales',
    historical: 'Historial completo',
    companies: 'empresas',
    industries: 'industrias',
    members: 'miembros',
    viewCompany: 'Ver empresa',
    memberCount: (n: number) => `${n} ${n === 1 ? 'miembro' : 'miembros'}`,
    footer: (count: number) => `¡Contamos con ${count} miembros y vamos por más!`,
    noData: 'No hay datos disponibles',
    loading: 'Cargando ecosistema...',
    retry: 'Reintentar',
    uncategorized: 'Otros',
    website: 'Sitio web',
  },
  en: {
    title: 'SECiD Ecosystem',
    subtitle: 'Companies where our alumni make an impact',
    current: 'Current',
    historical: 'Full history',
    companies: 'companies',
    industries: 'industries',
    members: 'members',
    viewCompany: 'View company',
    memberCount: (n: number) => `${n} ${n === 1 ? 'member' : 'members'}`,
    footer: (count: number) => `We have ${count} members and counting!`,
    noData: 'No data available',
    loading: 'Loading ecosystem...',
    retry: 'Retry',
    uncategorized: 'Other',
    website: 'Website',
  },
};

type TranslationSet = (typeof translations)['es'];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getIndustryColorSet(industry: string | undefined): IndustryColorSet {
  if (!industry) return DEFAULT_INDUSTRY_COLOR;
  return INDUSTRY_COLORS[industry] ?? DEFAULT_INDUSTRY_COLOR;
}

function buildMemberMap(members: MemberProfile[]): {
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

function getRelevantMemberCount(company: CompanyWithMembers, tab: ViewTab): number {
  if (tab === 'current') return company.memberCount;
  return company.memberCount + company.historicalMembers.length;
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

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
        className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
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
        className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
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

function MemberAvatar({ member }: { member: MemberInfo }) {
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
  t: TranslationSet;
}) {
  const websiteHref = company.website || (company.domain ? `https://${company.domain}` : null);
  const companyProfileHref = `/${lang}/companies/${company.slug}`;
  const colorSet = getIndustryColorSet(company.industry);

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
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${colorSet.text} ${colorSet.bg}`}
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

function CompanyPill({
  company,
  tab,
  mode,
  lang,
  t,
}: {
  company: CompanyWithMembers;
  tab: ViewTab;
  mode: 'public' | 'private';
  lang: 'es' | 'en';
  t: TranslationSet;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const memberCount = getRelevantMemberCount(company, tab);
  const isProminent = memberCount >= PROMINENT_MEMBER_THRESHOLD;
  const isHistoricalOnly = tab === 'historical' && company.memberCount === 0;

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
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-all cursor-pointer hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${
          isHistoricalOnly ? 'opacity-60' : ''
        } ${showPopover ? 'shadow-md ring-1 ring-gray-300 dark:ring-gray-500' : ''}`}
      >
        <CompanyLogo company={company} size="sm" />
        <span
          className={`truncate text-sm font-medium ${
            isHistoricalOnly
              ? 'text-gray-400 dark:text-gray-500'
              : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          {company.name}
        </span>
        {isProminent && (
          <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {memberCount}
          </span>
        )}
      </div>

      {showPopover && (
        <HoverPopover company={company} mode={mode} lang={lang} t={t} />
      )}
    </div>
  );
}

function IndustryBox({
  group,
  tab,
  mode,
  lang,
  t,
}: {
  group: IndustryGroup;
  tab: ViewTab;
  mode: 'public' | 'private';
  lang: 'es' | 'en';
  t: TranslationSet;
}) {
  const colorSet = getIndustryColorSet(
    group.industry === t.uncategorized ? undefined : group.industry,
  );
  const isWide = group.companies.length >= WIDE_THRESHOLD;

  return (
    <div
      className={`border-2 ${colorSet.border} rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50 ${
        isWide ? 'col-span-2' : 'col-span-1'
      }`}
    >
      {/* Industry label */}
      <div className="mb-3">
        <span
          className={`text-xs font-bold uppercase tracking-[0.15em] ${colorSet.text}`}
        >
          {group.industry}
        </span>
        <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">
          ({group.companies.length})
        </span>
      </div>

      {/* Company pills */}
      <div className="flex flex-wrap gap-2">
        {group.companies.map((company) => (
          <CompanyPill
            key={company.id}
            company={company}
            tab={tab}
            mode={mode}
            lang={lang}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function StatsFooter({
  companyCount,
  industryCount,
  memberCount,
  t,
}: {
  companyCount: number;
  industryCount: number;
  memberCount: number;
  t: TranslationSet;
}) {
  return (
    <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-700">
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {companyCount}
        </span>{' '}
        {t.companies}
        <span className="mx-2 text-gray-300 dark:text-gray-600">&bull;</span>
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {industryCount}
        </span>{' '}
        {t.industries}
        <span className="mx-2 text-gray-300 dark:text-gray-600">&bull;</span>
        <span className="font-bold text-violet-600 dark:text-violet-400">
          {memberCount}
        </span>{' '}
        {t.members}
      </p>
      <p className="mt-1 text-center text-xs text-gray-400 dark:text-gray-500">
        {t.footer(memberCount)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function LandscapeSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      {/* Title skeleton */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-48 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-8 w-56 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="col-span-2 h-40 rounded-xl border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        <div className="col-span-2 h-40 rounded-xl border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        <div className="h-28 rounded-xl border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        <div className="h-28 rounded-xl border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        <div className="h-28 rounded-xl border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        <div className="h-28 rounded-xl border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
      </div>
      {/* Footer skeleton */}
      <div className="flex justify-center">
        <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile layout helper                                                */
/* ------------------------------------------------------------------ */

function MobileLandscape({
  industryGroups,
  tab,
  mode,
  lang,
  t,
}: {
  industryGroups: IndustryGroup[];
  tab: ViewTab;
  mode: 'public' | 'private';
  lang: 'es' | 'en';
  t: TranslationSet;
}) {
  const largeGroups = industryGroups.filter(
    (g) => g.companies.length > SMALL_INDUSTRY_THRESHOLD,
  );
  const smallGroups = industryGroups.filter(
    (g) => g.companies.length <= SMALL_INDUSTRY_THRESHOLD,
  );

  return (
    <div className="space-y-3 lg:hidden">
      {/* Large industries: full width */}
      {largeGroups.map((group) => (
        <IndustryBoxMobile key={group.industry} group={group} tab={tab} mode={mode} lang={lang} t={t} />
      ))}

      {/* Small industries: pair side-by-side */}
      {smallGroups.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {smallGroups.map((group) => (
            <IndustryBoxMobile key={group.industry} group={group} tab={tab} mode={mode} lang={lang} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function IndustryBoxMobile({
  group,
  tab,
  mode,
  lang,
  t,
}: {
  group: IndustryGroup;
  tab: ViewTab;
  mode: 'public' | 'private';
  lang: 'es' | 'en';
  t: TranslationSet;
}) {
  const colorSet = getIndustryColorSet(
    group.industry === t.uncategorized ? undefined : group.industry,
  );

  return (
    <div className={`border-2 ${colorSet.border} rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50`}>
      <div className="mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${colorSet.text}`}>
          {group.industry}
        </span>
        <span className="ml-1.5 text-[9px] text-gray-400 dark:text-gray-500">
          ({group.companies.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.companies.map((company) => (
          <CompanyPillMobile
            key={company.id}
            company={company}
            tab={tab}
            mode={mode}
            lang={lang}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function CompanyPillMobile({
  company,
  tab,
  mode,
  lang,
  t,
}: {
  company: CompanyWithMembers;
  tab: ViewTab;
  mode: 'public' | 'private';
  lang: 'es' | 'en';
  t: TranslationSet;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memberCount = getRelevantMemberCount(company, tab);
  const isProminent = memberCount >= PROMINENT_MEMBER_THRESHOLD;
  const isHistoricalOnly = tab === 'historical' && company.memberCount === 0;

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
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5 transition-all cursor-pointer hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${
          isHistoricalOnly ? 'opacity-60' : ''
        } ${showPopover ? 'shadow-md ring-1 ring-gray-300 dark:ring-gray-500' : ''}`}
      >
        <CompanyLogo company={company} size="sm" className="!h-5 !w-5" />
        <span
          className={`truncate text-xs font-medium ${
            isHistoricalOnly
              ? 'text-gray-400 dark:text-gray-500'
              : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          {company.name}
        </span>
        {isProminent && (
          <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-1 py-0.5 text-[9px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {memberCount}
          </span>
        )}
      </div>

      {showPopover && (
        <HoverPopover company={company} mode={mode} lang={lang} t={t} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop layout                                                      */
/* ------------------------------------------------------------------ */

function DesktopLandscape({
  industryGroups,
  tab,
  mode,
  lang,
  t,
}: {
  industryGroups: IndustryGroup[];
  tab: ViewTab;
  mode: 'public' | 'private';
  lang: 'es' | 'en';
  t: TranslationSet;
}) {
  return (
    <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
      {industryGroups.map((group) => (
        <IndustryBox
          key={group.industry}
          group={group}
          tab={tab}
          mode={mode}
          lang={lang}
          t={t}
        />
      ))}
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
    const source = activeTab === 'current' ? currentCompanies : allCompanies;
    for (const c of source) {
      if (c.industry) set.add(c.industry);
    }
    return set.size;
  }, [currentCompanies, allCompanies, activeTab]);

  /* Loading state */
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <LandscapeSkeleton />
      </div>
    );
  }

  /* Empty state */
  if (currentCompanies.length === 0 && allCompanies.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
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
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6">
      {/* Header: title + subtitle + toggle */}
      <div className="mb-6 flex flex-col items-center text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.subtitle}
        </p>
        <div className="mt-4">
          <TabSwitcher
            activeTab={activeTab}
            onTabChange={setActiveTab}
            labels={{ current: t.current, historical: t.historical }}
          />
        </div>
      </div>

      {/* Landscape grid */}
      <DesktopLandscape
        industryGroups={industryGroups}
        tab={activeTab}
        mode={mode}
        lang={lang}
        t={t}
      />
      <MobileLandscape
        industryGroups={industryGroups}
        tab={activeTab}
        mode={mode}
        lang={lang}
        t={t}
      />

      {/* Stats footer */}
      <div className="mt-6">
        <StatsFooter
          companyCount={displayCompanies.length}
          industryCount={uniqueIndustries}
          memberCount={totalMembers}
          t={t}
        />
      </div>
    </div>
  );
};

export default MemberShowcase;
