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
  LabelList,
} from 'recharts';
import { UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import type { MemberStatisticsData, MemberStats } from '@/types/member';

interface OverviewTabProps {
  statistics: MemberStatisticsData;
  stats: MemberStats;
  lang: 'es' | 'en';
}

const COMPOSITION_COLORS = ['#7C9EB2', '#2C4A5A', '#A3C4D9', '#1E3A5F'];

const GENERATION_COLORS = [
  '#1E3A5F', '#7C9EB2', '#334155', '#64748B', '#86EFAC', '#F97316', '#5EAAA8',
];

const INITIATIVE_COLORS = [
  '#1E3A5F', '#7C9EB2', '#F97316', '#334155', '#86EFAC', '#A78BFA', '#D4A5C4',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#1F2937',
  border: 'none',
  borderRadius: '8px',
  color: '#F9FAFB',
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ statistics, stats, lang }) => {
  const topSkill = statistics.skillsDistribution[0]?.skill || 'N/A';

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
          label={lang === 'es' ? 'Total de miembros' : 'Total members'}
          value={statistics.totalMembers}
          bgClass="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<span className="inline-block h-3 w-3 rounded-full bg-green-500" />}
          label={lang === 'es' ? 'En linea' : 'Online'}
          value={stats.onlineMembers}
          bgClass="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon={<UserGroupIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
          label={lang === 'es' ? 'Nuevos este mes' : 'New this month'}
          value={stats.newMembersThisMonth}
          bgClass="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard
          icon={<ChartBarIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
          label={lang === 'es' ? 'Habilidad principal' : 'Top skill'}
          value={topSkill}
          bgClass="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Composition Charts — 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HorizontalBarCard
          title={lang === 'es' ? 'Composicion por campus' : 'Campus composition'}
          data={statistics.campusComposition}
          lang={lang}
        />
        <HorizontalBarCard
          title={lang === 'es' ? 'Composicion por grado' : 'Degree composition'}
          data={statistics.degreeComposition}
          lang={lang}
        />
        <HorizontalBarCard
          title={lang === 'es' ? 'Composicion por genero' : 'Gender composition'}
          data={statistics.genderComposition}
          lang={lang}
        />
        <GenerationBarCard
          title={lang === 'es' ? 'Composicion por generacion' : 'Generation composition'}
          data={statistics.generationDistribution}
          lang={lang}
        />
      </div>

      {/* Initiative Importance — Vertical Bar Chart */}
      <InitiativeChart
        title={lang === 'es' ? 'Importancia media por iniciativa' : 'Average initiative importance'}
        data={statistics.initiativeImportance}
        lang={lang}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bgClass: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bgClass}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Horizontal Stacked Bar Card (campus, degree, gender)               */
/* ------------------------------------------------------------------ */

function HorizontalBarCard({
  title,
  data,
  lang,
}: {
  title: string;
  data: Array<{ label: string; count: number }>;
  lang: 'es' | 'en';
}) {
  if (data.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyState lang={lang} />
      </ChartCard>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const rowLabel = lang === 'es' ? 'Integrantes' : 'Members';
  const stackedRow: Record<string, string | number> = { name: rowLabel };
  for (const d of data) {
    stackedRow[d.label] = d.count;
  }

  return (
    <ChartCard title={title}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300"
          >
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: COMPOSITION_COLORS[i % COMPOSITION_COLORS.length] }}
            />
            {d.label}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={80}>
        <BarChart
          layout="vertical"
          data={[stackedRow]}
          margin={{ top: 5, right: 30, bottom: 5, left: 70 }}
          stackOffset="none"
        >
          <XAxis type="number" domain={[0, total]} tick={{ fill: '#6B7280' }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#6B7280' }} width={70} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {data.map((d, i) => (
            <Bar
              key={d.label}
              dataKey={d.label}
              stackId="a"
              fill={COMPOSITION_COLORS[i % COMPOSITION_COLORS.length]}
            >
              <LabelList
                dataKey={d.label}
                position="center"
                fill="#FFFFFF"
                fontWeight={600}
                fontSize={13}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Generation Horizontal Bars                                         */
/* ------------------------------------------------------------------ */

function GenerationBarCard({
  title,
  data,
  lang,
}: {
  title: string;
  data: Array<{ year: string; count: number }>;
  lang: 'es' | 'en';
}) {
  if (data.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyState lang={lang} />
      </ChartCard>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const rowLabel = lang === 'es' ? 'Integrantes' : 'Members';
  const stackedRow: Record<string, string | number> = { name: rowLabel };
  for (const d of data) {
    stackedRow[d.year] = d.count;
  }

  return (
    <ChartCard title={title}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3">
        {data.map((d, i) => (
          <div
            key={d.year}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300"
          >
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: GENERATION_COLORS[i % GENERATION_COLORS.length] }}
            />
            {d.year}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={80}>
        <BarChart
          layout="vertical"
          data={[stackedRow]}
          margin={{ top: 5, right: 30, bottom: 5, left: 70 }}
          stackOffset="none"
        >
          <XAxis type="number" domain={[0, total]} tick={{ fill: '#6B7280' }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#6B7280' }} width={70} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {data.map((d, i) => (
            <Bar
              key={d.year}
              dataKey={d.year}
              stackId="a"
              fill={GENERATION_COLORS[i % GENERATION_COLORS.length]}
            >
              <LabelList
                dataKey={d.year}
                position="center"
                fill="#FFFFFF"
                fontWeight={600}
                fontSize={13}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Initiative Importance — Vertical Bar Chart                         */
/* ------------------------------------------------------------------ */

function InitiativeChart({
  title,
  data,
  lang,
}: {
  title: string;
  data: Array<{ initiative: string; avgScore: number }>;
  lang: 'es' | 'en';
}) {
  if (data.length === 0) {
    return (
      <ChartCard title={title}>
        <EmptyState lang={lang} />
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 40, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="initiative"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis domain={[0, 5]} tick={{ fill: '#6B7280' }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="avgScore" position="top" fill="#6B7280" fontWeight={600} />
            {data.map((_, index) => (
              <Cell
                key={`initiative-${index}`}
                fill={INITIATIVE_COLORS[index % INITIATIVE_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared layout helpers                                              */
/* ------------------------------------------------------------------ */

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyState({ lang }: { lang: 'es' | 'en' }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
      {lang === 'es' ? 'Sin datos disponibles' : 'No data available'}
    </p>
  );
}
