/**
 * SalaryInsights — Main analytics dashboard with tiered access.
 *
 * Access tiers:
 * - Public (no auth):       Total data points count + general salary range only
 * - Member (no contribution): Overview cards + experience chart (blurred details)
 * - Contributor (shared salary data in last 12 months): Full access to all charts
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMemberProfiles } from '@/lib/members';
import { getCompanies } from '@/lib/companies';
import { calculateNetSalary, calculateTotalCompensation } from '@/lib/tax';
import type { MemberProfile } from '@/types/member';
import type { Company } from '@/types/company';
import { SalaryOverview } from './SalaryOverview';
import { SalaryByExperience } from './SalaryByExperience';
import { SalaryByIndustry } from './SalaryByIndustry';
import { BenefitsHeatmap } from './BenefitsHeatmap';
import { CompensationBreakdown } from './CompensationBreakdown';
import { SalaryDistribution } from './SalaryDistribution';

export interface SalaryDataPoint {
  monthlyGross: number;
  monthlyNet: number;
  totalComp: number;
  currency: string;
  country: string;
  experienceLevel: string;
  industry: string;
  benefits: string[];
  annualBonus: number;
  stockValue: number;
  signOnBonus: number;
}

type AccessTier = 'public' | 'member' | 'contributor';

interface Props {
  lang?: 'es' | 'en';
}

function extractSalaryDataPoints(
  members: MemberProfile[],
  companyMap: Map<string, Company>
): SalaryDataPoint[] {
  const dataPoints: SalaryDataPoint[] = [];

  for (const member of members) {
    const level = member.experience?.level ?? 'mid';
    for (const role of member.experience?.previousRoles ?? []) {
      const comp = role.compensation;
      if (!comp?.monthlyGross) continue;

      const netResult = calculateNetSalary(
        comp.monthlyGross,
        comp.country,
        comp.fiscalRegime
      );
      const totalComp = calculateTotalCompensation(
        comp.monthlyGross,
        comp.annualBonus,
        comp.annualBonusType,
        comp.signOnBonus,
        comp.stockAnnualValue
      );

      const company = role.companyId ? companyMap.get(role.companyId) : null;
      const industry = company?.industry ?? 'Otros';

      dataPoints.push({
        monthlyGross: comp.monthlyGross,
        monthlyNet: netResult.monthlyNet,
        totalComp,
        currency: comp.currency,
        country: comp.country,
        experienceLevel: level,
        industry,
        benefits: comp.benefits ?? [],
        annualBonus: comp.annualBonus ?? 0,
        stockValue: comp.stockAnnualValue ?? 0,
        signOnBonus: comp.signOnBonus ?? 0,
      });
    }
  }

  return dataPoints;
}

/** Check if a member has contributed salary data in the last 12 months */
function hasRecentContribution(member: MemberProfile | null): boolean {
  if (!member) return false;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  for (const role of member.experience?.previousRoles ?? []) {
    if (role.compensation?.monthlyGross) {
      // If they have any salary data, count as contributor
      // In future, could check an updatedAt timestamp on compensation
      return true;
    }
  }
  return false;
}

function BlurredOverlay({
  children,
  message,
  ctaLabel,
  ctaHref,
  lang,
}: {
  children: React.ReactNode;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  lang: string;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-md">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/60 dark:bg-gray-900/70">
        <div className="text-center">
          <svg
            className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            {message}
          </p>
          <a
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

export function SalaryInsights({ lang = 'es' }: Props) {
  const { user, userProfile, isVerified } = useAuth();
  const [dataPoints, setDataPoints] = useState<SalaryDataPoint[]>([]);
  const [currentMember, setCurrentMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: lang === 'es' ? 'Insights de Salario' : 'Salary Insights',
    description:
      lang === 'es'
        ? 'Datos salariales anonimizados de la comunidad SECiD.'
        : 'Anonymized salary data from the SECiD community.',
    empty:
      lang === 'es'
        ? 'Aun no hay datos salariales. Se el primero en agregar los tuyos!'
        : 'No salary data yet. Be the first to add yours!',
    loading: lang === 'es' ? 'Cargando datos...' : 'Loading data...',
    errorFetch:
      lang === 'es'
        ? 'Error al cargar los datos. Intenta de nuevo mas tarde.'
        : 'Error loading data. Please try again later.',
    byExperience:
      lang === 'es' ? 'Salario por Nivel de Experiencia' : 'Salary by Experience Level',
    byIndustry:
      lang === 'es' ? 'Salario por Industria' : 'Salary by Industry',
    benefits:
      lang === 'es' ? 'Beneficios mas Comunes' : 'Most Common Benefits',
    breakdown:
      lang === 'es' ? 'Composicion del Paquete' : 'Compensation Breakdown',
    // Tier messages
    publicMsg:
      lang === 'es'
        ? 'Inicia sesion para ver estadisticas salariales de la comunidad.'
        : 'Sign in to view community salary statistics.',
    memberMsg:
      lang === 'es'
        ? 'Comparte tus datos salariales para desbloquear todos los insights. Tu informacion es anonima.'
        : 'Share your salary data to unlock all insights. Your information is anonymous.',
    memberCta:
      lang === 'es' ? 'Agregar mis datos' : 'Add my data',
    publicCta:
      lang === 'es' ? 'Iniciar sesion' : 'Sign in',
    contributorBadge:
      lang === 'es' ? 'Acceso completo — gracias por contribuir' : 'Full access — thanks for contributing',
    memberBadge:
      lang === 'es' ? 'Vista limitada — comparte tus datos para ver todo' : 'Limited view — share your data to see everything',
    privacy:
      lang === 'es'
        ? 'Minimo 3 datos por grupo. Ningun dato individual es visible.'
        : 'Minimum 3 data points per group. No individual data is visible.',
    dataPoints: lang === 'es' ? 'datos salariales' : 'salary data points',
    fromMembers: lang === 'es' ? 'de miembros de SECiD' : 'from SECiD members',
  };

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [members, companies] = await Promise.all([
          getMemberProfiles({ limit: 500 }),
          getCompanies(),
        ]);

        if (cancelled) return;

        const companyMap = new Map<string, Company>(
          companies.map((c) => [c.id, c])
        );
        const points = extractSalaryDataPoints(members, companyMap);
        setDataPoints(points);

        // Find current user's member profile
        if (user) {
          const me = members.find((m) => m.uid === user.uid);
          setCurrentMember(me || null);
        }
      } catch {
        if (!cancelled) setError(t.errorFetch);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [user]);

  // Determine access tier
  const accessTier: AccessTier = useMemo(() => {
    if (!user || !isVerified) return 'public';
    if (hasRecentContribution(currentMember)) return 'contributor';
    return 'member';
  }, [user, isVerified, currentMember]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        <p className="text-gray-500 dark:text-gray-400">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // === PUBLIC TIER ===
  if (accessTier === 'public') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.title}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
        </div>

        {/* Public: only show count */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          {dataPoints.length > 0 ? (
            <>
              <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                {dataPoints.length}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.dataPoints}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t.fromMembers}</p>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">{t.empty}</p>
          )}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-800 dark:bg-blue-900/20">
          <svg
            className="mx-auto mb-3 h-10 w-10 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="mb-3 text-sm font-medium text-blue-800 dark:text-blue-300">
            {t.publicMsg}
          </p>
          <a
            href={`/${lang}/login`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            {t.publicCta}
          </a>
        </div>
      </div>
    );
  }

  if (dataPoints.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.title}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
        </div>
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">{t.empty}</p>
          <a
            href={`/${lang}/dashboard/profile/edit`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {t.memberCta}
          </a>
        </div>
      </div>
    );
  }

  const isContributor = accessTier === 'contributor';
  const profileEditUrl = `/${lang}/dashboard/profile/edit`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t.privacy}</p>
      </div>

      {/* Access tier badge */}
      {isContributor ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t.contributorBadge}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-900/20">
          <span className="text-sm text-amber-800 dark:text-amber-300">{t.memberBadge}</span>
          <a
            href={profileEditUrl}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          >
            {t.memberCta}
          </a>
        </div>
      )}

      {/* Overview stats — visible to all members */}
      <SalaryOverview dataPoints={dataPoints} lang={lang} />

      {/* Salary distribution — visible to all members */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Distribucion Salarial (Mensual Bruto)' : 'Salary Distribution (Monthly Gross)'}
        </h3>
        <SalaryDistribution dataPoints={dataPoints} lang={lang} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Experience chart — visible to all members */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.byExperience}
          </h3>
          <SalaryByExperience dataPoints={dataPoints} lang={lang} />
        </div>

        {/* Industry chart — contributor only */}
        {isContributor ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.byIndustry}
            </h3>
            <SalaryByIndustry dataPoints={dataPoints} lang={lang} />
          </div>
        ) : (
          <BlurredOverlay
            message={t.memberMsg}
            ctaLabel={t.memberCta}
            ctaHref={profileEditUrl}
            lang={lang}
          >
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.byIndustry}
              </h3>
              <SalaryByIndustry dataPoints={dataPoints} lang={lang} />
            </div>
          </BlurredOverlay>
        )}

        {/* Benefits — contributor only */}
        {isContributor ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.benefits}
            </h3>
            <BenefitsHeatmap dataPoints={dataPoints} lang={lang} />
          </div>
        ) : (
          <BlurredOverlay
            message={t.memberMsg}
            ctaLabel={t.memberCta}
            ctaHref={profileEditUrl}
            lang={lang}
          >
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.benefits}
              </h3>
              <BenefitsHeatmap dataPoints={dataPoints} lang={lang} />
            </div>
          </BlurredOverlay>
        )}

        {/* Comp breakdown — contributor only */}
        {isContributor ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.breakdown}
            </h3>
            <CompensationBreakdown dataPoints={dataPoints} lang={lang} />
          </div>
        ) : (
          <BlurredOverlay
            message={t.memberMsg}
            ctaLabel={t.memberCta}
            ctaHref={profileEditUrl}
            lang={lang}
          >
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.breakdown}
              </h3>
              <CompensationBreakdown dataPoints={dataPoints} lang={lang} />
            </div>
          </BlurredOverlay>
        )}
      </div>
    </div>
  );
}
