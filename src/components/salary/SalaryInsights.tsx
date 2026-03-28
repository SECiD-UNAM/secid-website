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
import type { AdminRawRow } from './SalaryAdminTable';

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
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600 dark:border-gray-700 dark:border-t-primary-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-10 dark:border-red-800/40 dark:bg-red-900/10">
        <svg className="mb-3 h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-12 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <svg className="h-10 w-10 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            {t.empty}
          </h3>
          <p className="mb-6 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
            {t.memberMsg}
          </p>
          <a
            href={profileEditUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t.memberCta}
          </a>
          <p className="mt-6 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {t.privacy}
          </p>
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

      {/* Admin: link to dedicated admin salary page */}
      {tier === 'admin' && stats?.rawData && stats.rawData.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {lang === 'es' ? `${stats.rawData.length} registros individuales disponibles` : `${stats.rawData.length} individual records available`}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {lang === 'es' ? 'Acceso admin — datos con información personal' : 'Admin access — data with personal information'}
                </p>
              </div>
            </div>
            <a
              href={`/${lang}/dashboard/admin/salary`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              {lang === 'es' ? 'Ver datos' : 'View data'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
