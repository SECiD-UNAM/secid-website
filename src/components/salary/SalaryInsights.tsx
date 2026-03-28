/**
 * SalaryInsights — Main analytics dashboard with tiered access.
 *
 * Access tiers are determined server-side by the getSalaryStats Cloud Function:
 * - public:      Total data points count only (overview.dataPointCount)
 * - member:      Overview cards + experience chart (industry/benefits/breakdown null)
 * - contributor: Full access to all charts
 * - admin:       Full access + raw data table
 *
 * Null fields from the CF mean "not authorized for this tier" — no client-side
 * blurring needed. Instead, a "share to unlock" card is shown in place of null sections.
 */
import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { SalaryOverview, type OverviewStats } from './SalaryOverview';
import { SalaryByExperience, type ExperienceRow } from './SalaryByExperience';
import { SalaryByIndustry, type IndustryRow } from './SalaryByIndustry';
import { BenefitsHeatmap, type BenefitRow } from './BenefitsHeatmap';
import { CompensationBreakdown, type BreakdownStats } from './CompensationBreakdown';
import { SalaryDistribution, type DistributionBin } from './SalaryDistribution';
import { SalaryAdminTable, type AdminRawRow } from './SalaryAdminTable';

interface SalaryStatsResponse {
  tier: 'public' | 'member' | 'contributor' | 'admin';
  overview: OverviewStats | null;
  distribution: DistributionBin[] | null;
  byExperience: ExperienceRow[] | null;
  byIndustry: IndustryRow[] | null;
  benefits: BenefitRow[] | null;
  breakdown: BreakdownStats | null;
  rawData: AdminRawRow[] | null;
}

interface Props {
  lang?: 'es' | 'en';
}

function ShareToUnlockCard({
  message,
  ctaLabel,
  ctaHref,
}: {
  message: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-900/20">
      <svg
        className="mx-auto mb-3 h-10 w-10 text-amber-400 dark:text-amber-500"
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
      <p className="mb-3 text-sm font-medium text-amber-800 dark:text-amber-300">
        {message}
      </p>
      <a
        href={ctaHref}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        {ctaLabel}
      </a>
    </div>
  );
}

export function SalaryInsights({ lang = 'es' }: Props) {
  const { user } = useAuth();
  const [stats, setStats] = useState<SalaryStatsResponse | null>(null);
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

    async function loadStats() {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(
          'https://us-central1-secid-org.cloudfunctions.net/getSalaryStats',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ data: {} }),
          }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!cancelled) {
          setStats(json.result);
        }
      } catch {
        if (!cancelled) setError(t.errorFetch);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const tier = stats?.tier ?? 'public';
  const overview = stats?.overview ?? null;
  const profileEditUrl = `/${lang}/dashboard/profile/edit`;

  // === PUBLIC TIER ===
  if (tier === 'public') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.title}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
        </div>

        {/* Public: only show count */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          {overview && overview.dataPointCount > 0 ? (
            <>
              <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                {overview.dataPointCount}
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
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

  if (!overview || overview.dataPointCount === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.title}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
        </div>
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">{t.empty}</p>
          <a
            href={profileEditUrl}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {t.memberCta}
          </a>
        </div>
      </div>
    );
  }

  const isContributor = tier === 'contributor' || tier === 'admin';

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
      <SalaryOverview overview={overview} lang={lang} />

      {/* Salary distribution — visible to all members */}
      {stats?.distribution && stats.distribution.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Distribucion Salarial (Mensual Bruto)' : 'Salary Distribution (Monthly Gross)'}
          </h3>
          <SalaryDistribution distribution={stats.distribution} lang={lang} />
        </div>
      ) : null}

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Experience chart — visible to all members */}
        {stats?.byExperience && stats.byExperience.length > 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.byExperience}
            </h3>
            <SalaryByExperience byExperience={stats.byExperience} lang={lang} />
          </div>
        ) : null}

        {/* Industry chart — contributor only (null from CF when member tier) */}
        {stats?.byIndustry ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.byIndustry}
            </h3>
            <SalaryByIndustry byIndustry={stats.byIndustry} lang={lang} />
          </div>
        ) : (
          <ShareToUnlockCard
            message={t.memberMsg}
            ctaLabel={t.memberCta}
            ctaHref={profileEditUrl}
          />
        )}

        {/* Benefits — contributor only */}
        {stats?.benefits ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.benefits}
            </h3>
            <BenefitsHeatmap benefits={stats.benefits} lang={lang} />
          </div>
        ) : (
          <ShareToUnlockCard
            message={t.memberMsg}
            ctaLabel={t.memberCta}
            ctaHref={profileEditUrl}
          />
        )}

        {/* Comp breakdown — contributor only */}
        {stats?.breakdown ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.breakdown}
            </h3>
            <CompensationBreakdown breakdown={stats.breakdown} lang={lang} />
          </div>
        ) : (
          <ShareToUnlockCard
            message={t.memberMsg}
            ctaLabel={t.memberCta}
            ctaHref={profileEditUrl}
          />
        )}
      </div>

      {/* Admin raw data table */}
      {tier === 'admin' && stats?.rawData ? (
        <SalaryAdminTable rawData={stats.rawData} lang={lang} />
      ) : null}
    </div>
  );
}
