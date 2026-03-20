import React, { useState, useEffect, useCallback } from 'react';
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
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { getMemberStatistics } from '@/lib/members';
import type { MemberStatisticsData } from '@/types/member';

interface MemberStatisticsProps {
  lang?: 'es' | 'en';
}

const COMPOSITION_COLORS = ['#7C9EB2', '#2C4A5A'];

const GENERATION_COLORS = [
  '#1E3A5F', '#7C9EB2', '#334155', '#64748B', '#86EFAC', '#F97316', '#5EAAA8',
];

const INITIATIVE_COLORS = [
  '#1E3A5F', '#7C9EB2', '#F97316', '#334155', '#86EFAC', '#A78BFA', '#D4A5C4',
];

function getCompanyColor(name: string): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
    '#84CC16', '#E11D48', '#0EA5E9', '#A855F7', '#22C55E',
    '#D946EF',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? '#3B82F6';
}

export const MemberStatistics: React.FC<MemberStatisticsProps> = ({ lang = 'es' }) => {
  const [data, setData] = useState<MemberStatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getMemberStatistics();
      setData(stats);
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError('LOAD_ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Cargando estadísticas...' : 'Loading statistics...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">
          {lang === 'es'
            ? 'Error al cargar las estadísticas. Intenta de nuevo.'
            : 'Error loading statistics. Please try again.'}
        </p>
        <button
          onClick={loadStatistics}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
        >
          {lang === 'es' ? 'Intentar de nuevo' : 'Try again'}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const totalIntegrantes = data.totalMembers;
  const hasData = totalIntegrantes > 0;

  if (!hasData) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Sin datos de estadísticas' : 'No statistics data'}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'No hay datos suficientes para generar estadísticas.'
            : 'Not enough data to generate statistics.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Company Grid */}
      {data.companies.length > 0 && (
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          {lang === 'es'
            ? '¿Dónde trabajan los miembros de SECiD?'
            : 'Where do SECiD members work?'}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.companies.map((company) => {
            const color = getCompanyColor(company.name);
            return (
              <div
                key={company.name}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow"
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: color }}
                >
                  {company.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                  {company.name}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
          {lang === 'es'
            ? `¡Contamos con ${totalIntegrantes} integrantes y vamos por más!`
            : `We have ${totalIntegrantes} members and counting!`}
        </p>
      </section>
      )}

      {/* Section 2: Composition Charts */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {lang === 'es' ? 'Estadísticas de miembros' : 'Member Statistics'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campus Composition */}
          <HorizontalBarCard
            title={
              lang === 'es'
                ? 'Composición de miembros por entidad de origen'
                : 'Members by Academic Entity'
            }
            data={data.campusComposition}
            lang={lang}
          />

          {/* Degree Composition */}
          <HorizontalBarCard
            title={
              lang === 'es'
                ? 'Composición de miembros según máximo grado de estudio'
                : 'Members by Highest Degree'
            }
            data={data.degreeComposition}
            lang={lang}
          />

          {/* Gender Composition */}
          <HorizontalBarCard
            title={
              lang === 'es'
                ? 'Composición de miembros por género'
                : 'Members by Gender'
            }
            data={data.genderComposition}
            lang={lang}
          />
        </div>
      </section>

      {/* Section 3: Generation Distribution */}
      {data.generationDistribution.length > 0 && (
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">
          {lang === 'es'
            ? 'Composición de miembros por generación'
            : 'Members by Generation'}
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.generationDistribution} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#6B7280' }} />
            <YAxis allowDecimals={false} tick={{ fill: '#6B7280' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="count" position="top" fill="#6B7280" fontWeight={600} />
              {data.generationDistribution.map((_, index) => (
                <Cell key={index} fill={GENERATION_COLORS[index % GENERATION_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>
      )}

      {/* Section 4: Initiative Importance */}
      {data.initiativeImportance.length > 0 && (
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">
          {lang === 'es'
            ? 'Importancia media por iniciativa'
            : 'Average Initiative Importance'}
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data.initiativeImportance}
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
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
            />
            <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="avgScore" position="top" fill="#6B7280" fontWeight={600} />
              {data.initiativeImportance.map((_, index) => (
                <Cell key={index} fill={INITIATIVE_COLORS[index % INITIATIVE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>
      )}
    </div>
  );
};

/** Reusable horizontal stacked bar chart card */
function HorizontalBarCard({
  title,
  data,
  lang = 'es',
}: {
  title: string;
  data: Array<{ label: string; count: number }>;
  lang?: 'es' | 'en';
}) {
  if (data.length === 0) return null;

  // Build a single-row stacked bar
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const rowLabel = lang === 'es' ? 'Integrantes' : 'Members';
  const stackedRow: Record<string, string | number> = { name: rowLabel };
  for (const d of data) {
    stackedRow[d.label] = d.count;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
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
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F9FAFB',
            }}
          />
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
    </div>
  );
}

export default MemberStatistics;
