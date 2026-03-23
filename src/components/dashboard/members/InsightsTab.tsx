import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MemberStatisticsData } from '@/types/member';
import type { Company } from '@/types/company';
import { CompanyLogo } from '@/components/shared/CompanyLogo';

interface InsightsTabProps {
  statistics: MemberStatisticsData;
  companies: Company[];
  lang: 'es' | 'en';
}

const CHART_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#1F2937',
  border: 'none',
  borderRadius: '8px',
  color: '#F9FAFB',
};

const translations = {
  es: {
    companyTitle: 'Donde trabajan los miembros?',
    skillsTitle: 'Distribucion de habilidades',
    experienceTitle: 'Nivel de experiencia',
    statusTitle: 'Estado profesional',
    noData: 'Sin datos disponibles',
  },
  en: {
    companyTitle: 'Where do members work?',
    skillsTitle: 'Skills distribution',
    experienceTitle: 'Experience level breakdown',
    statusTitle: 'Professional status breakdown',
    noData: 'No data available',
  },
};

export const InsightsTab: React.FC<InsightsTabProps> = ({
  statistics,
  companies,
  lang,
}) => {
  const t = translations[lang];

  const topSkills = statistics.skillsDistribution.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Company link — full visualization at /companies */}
      <SectionCard title={t.companyTitle}>
        <div className="flex flex-col items-center py-4 text-center">
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {companies.length} {lang === 'es' ? 'empresas registradas' : 'registered companies'}
          </p>
          <a
            href={`/${lang}/dashboard/companies`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            {lang === 'es' ? 'Ver Red de Empresas' : 'View Company Network'}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </SectionCard>

      {/* Skills Distribution */}
      <HorizontalBarSection
        title={t.skillsTitle}
        data={topSkills.map((s) => ({ name: s.skill, value: s.count }))}
        lang={lang}
      />

      {/* Experience Level Breakdown */}
      <HorizontalBarSection
        title={t.experienceTitle}
        data={statistics.experienceDistribution.map((e) => ({
          name: e.level,
          value: e.count,
        }))}
        lang={lang}
      />

      {/* Professional Status Breakdown */}
      <HorizontalBarSection
        title={t.statusTitle}
        data={statistics.professionalStatusDistribution.map((s) => ({
          name: s.status,
          value: s.count,
        }))}
        lang={lang}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Company Grid                                                       */
/* ------------------------------------------------------------------ */

function CompanyGrid({
  companies,
  title,
  lang,
}: {
  companies: Company[];
  title: string;
  lang: 'es' | 'en';
}) {
  const t = translations[lang];

  if (companies.length === 0) {
    return (
      <SectionCard title={title}>
        <EmptyState message={t.noData} />
      </SectionCard>
    );
  }

  return (
    <SectionCard title={title}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {companies.map((c) => {
          const href = c.website || (c.domain ? `https://${c.domain}` : null);
          const inner = (
            <>
              <CompanyLogo company={c} size="md" />
              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {c.name}
              </span>
            </>
          );
          return href ? (
            <a
              key={c.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
            >
              {inner}
            </a>
          ) : (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Horizontal Bar Section                                             */
/* ------------------------------------------------------------------ */

interface BarDatum {
  name: string;
  value: number;
}

function HorizontalBarSection({
  title,
  data,
  lang,
}: {
  title: string;
  data: BarDatum[];
  lang: 'es' | 'en';
}) {
  const t = translations[lang];

  if (data.length === 0) {
    return (
      <SectionCard title={title}>
        <EmptyState message={t.noData} />
      </SectionCard>
    );
  }

  const chartHeight = Math.max(200, data.length * 40);

  return (
    <SectionCard title={title}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 40, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#6B7280' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#6B7280', fontSize: 13 }}
            width={140}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared layout helpers                                              */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
      {message}
    </p>
  );
}
