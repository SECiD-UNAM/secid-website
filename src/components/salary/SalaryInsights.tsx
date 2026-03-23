/**
 * SalaryInsights — Main analytics dashboard orchestrator.
 * Fetches member + company data, extracts salary data points,
 * and renders all salary chart sub-components.
 */
import React, { useEffect, useState } from 'react';
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

export function SalaryInsights({ lang = 'es' }: Props) {
  const [dataPoints, setDataPoints] = useState<SalaryDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: lang === 'es' ? 'Insights de Salario' : 'Salary Insights',
    description:
      lang === 'es'
        ? 'Datos salariales anonimizados de la comunidad. Se requieren mínimo 3 puntos de datos por grupo para preservar la privacidad.'
        : 'Anonymized salary data from the community. A minimum of 3 data points per group are required to protect privacy.',
    empty:
      lang === 'es'
        ? 'Aún no hay datos salariales. ¡Sé el primero en agregar los tuyos!'
        : 'No salary data yet. Be the first to add yours!',
    loading: lang === 'es' ? 'Cargando datos...' : 'Loading data...',
    errorFetch:
      lang === 'es'
        ? 'Error al cargar los datos. Intenta de nuevo más tarde.'
        : 'Error loading data. Please try again later.',
    byExperience:
      lang === 'es' ? 'Salario por Nivel de Experiencia' : 'Salary by Experience Level',
    byIndustry:
      lang === 'es' ? 'Salario por Industria' : 'Salary by Industry',
    benefits:
      lang === 'es' ? 'Beneficios más Comunes' : 'Most Common Benefits',
    breakdown:
      lang === 'es' ? 'Composición del Paquete' : 'Compensation Breakdown',
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
      } catch {
        if (!cancelled) {
          setError(t.errorFetch);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center">
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

  if (dataPoints.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.description}
        </p>
      </div>

      {/* Overview stats */}
      <SalaryOverview dataPoints={dataPoints} lang={lang} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.byExperience}
          </h3>
          <SalaryByExperience dataPoints={dataPoints} lang={lang} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.byIndustry}
          </h3>
          <SalaryByIndustry dataPoints={dataPoints} lang={lang} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.benefits}
          </h3>
          <BenefitsHeatmap dataPoints={dataPoints} lang={lang} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.breakdown}
          </h3>
          <CompensationBreakdown dataPoints={dataPoints} lang={lang} />
        </div>
      </div>
    </div>
  );
}
