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

interface InsightsTabProps {
  statistics: MemberStatisticsData;
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

const COMPANY_COLORS = [
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
  '#84CC16',
  '#E11D48',
  '#0EA5E9',
  '#A855F7',
  '#22C55E',
  '#D946EF',
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

function getCompanyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length] ?? '#3B82F6';
}

function getCompanyInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export const InsightsTab: React.FC<InsightsTabProps> = ({
  statistics,
  lang,
}) => {
  const t = translations[lang];

  const topSkills = statistics.skillsDistribution.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Company Grid */}
      <CompanyGrid
        companies={statistics.companies}
        title={t.companyTitle}
        lang={lang}
      />

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
  companies: Array<{ name: string; count: number }>;
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
        {companies.map((company) => {
          const color = getCompanyColor(company.name);
          return (
            <div
              key={company.name}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {getCompanyInitial(company.name)}
              </div>
              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {company.name}
              </span>
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
