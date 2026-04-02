import React, { useRef, useState } from 'react';
import type {
  EducationEcosystemData,
  InstitutionAggregate,
} from '@/lib/members/queries';
import type { InstitutionCategory } from '@/lib/members/institution-normalization';
import { getCompanyTranslations } from '@/i18n/company-translations';

interface EducationMapProps {
  data: EducationEcosystemData;
  lang?: 'es' | 'en';
}

const CATEGORY_COLORS: Record<InstitutionCategory, string> = {
  UNAM: '#002855',
  'Posgrado Nacional': '#10B981',
  'Posgrado Internacional': '#3B82F6',
  'Otras Universidades': '#8B5CF6',
  Certificaciones: '#F59E0B',
};

const CATEGORY_LABELS_ES: Record<InstitutionCategory, string> = {
  UNAM: 'UNAM — Sedes',
  'Posgrado Nacional': 'Posgrado Nacional',
  'Posgrado Internacional': 'Posgrado Internacional',
  'Otras Universidades': 'Otras Universidades',
  Certificaciones: 'Certificaciones',
};

const CATEGORY_LABELS_EN: Record<InstitutionCategory, string> = {
  UNAM: 'UNAM — Campuses',
  'Posgrado Nacional': 'National Postgraduate',
  'Posgrado Internacional': 'International Postgraduate',
  'Otras Universidades': 'Other Universities',
  Certificaciones: 'Certifications',
};

function getInitials(name: string): string {
  return name
    .replace(/^UNAM — /, '')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function hashColor(name: string, base: string): string {
  // Use the category color with slight variation per institution
  return base;
}

export const EducationMap: React.FC<EducationMapProps> = ({
  data,
  lang = 'es',
}) => {
  const t = getCompanyTranslations(lang);
  const categoryLabels = lang === 'es' ? CATEGORY_LABELS_ES : CATEGORY_LABELS_EN;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredInst, setHoveredInst] = useState<InstitutionAggregate | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { institutions, totalEntries, categories } = data;

  // Group by category
  const groups = new Map<InstitutionCategory, InstitutionAggregate[]>();
  for (const inst of institutions) {
    if (!groups.has(inst.category)) groups.set(inst.category, []);
    groups.get(inst.category)!.push(inst);
  }

  // Sort: UNAM first, then by count
  const categoryOrder: InstitutionCategory[] = [
    'UNAM',
    'Posgrado Nacional',
    'Posgrado Internacional',
    'Otras Universidades',
    'Certificaciones',
  ];
  const sortedGroups = categoryOrder
    .filter((cat) => groups.has(cat))
    .map((cat) => [cat, groups.get(cat)!] as const);

  const uniqueInstitutions = new Set(institutions.map((i) => i.name)).size;
  const uniqueDegrees = new Set(institutions.flatMap((i) => i.degrees)).size;

  return (
    <div ref={containerRef} className="relative">
      {/* Header card */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-slate-800">
        <h2
          className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50"
          style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
        >
          {lang === 'es'
            ? '\u00bfD\u00f3nde han estudiado los miembros de SECiD?'
            : 'Where have SECiD members studied?'}
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'Formaci\u00f3n acad\u00e9mica de nuestra comunidad'
            : 'Academic background of our community'}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            {
              value: String(uniqueInstitutions),
              label: lang === 'es' ? 'Instituciones' : 'Institutions',
            },
            {
              value: String(uniqueDegrees),
              label: lang === 'es' ? 'Programas' : 'Programs',
            },
            {
              value: String(totalEntries),
              label: lang === 'es' ? 'Registros' : 'Entries',
            },
            {
              value: 'UNAM',
              label: lang === 'es' ? 'Ciencia de Datos' : 'Data Science',
            },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="rounded-xl bg-gray-50 px-2 py-2.5 dark:bg-slate-900"
            >
              <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {value}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {sortedGroups.map(([category, group]) => {
          const color = CATEGORY_COLORS[category];
          return (
            <div
              key={category}
              className="overflow-hidden rounded-xl border-2 bg-white dark:bg-slate-800"
              style={{ borderColor: `${color}40` }}
            >
              {/* Category header */}
              <div
                className="flex items-center justify-between border-b px-3.5 py-2"
                style={{
                  background: `${color}15`,
                  borderBottomColor: `${color}30`,
                }}
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color }}
                >
                  {categoryLabels[category]}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  {group.length}
                </span>
              </div>

              {/* Institution pills */}
              <div className="flex flex-wrap gap-1.5 p-2.5">
                {group.map((inst) => {
                  const displayName =
                    inst.category === 'UNAM' && inst.campus
                      ? inst.campus
                      : inst.name;
                  return (
                    <div
                      key={inst.name}
                      className="flex items-center gap-1.5 rounded-lg border bg-gray-50 px-2.5 py-1.5 text-left transition-all dark:bg-slate-900"
                      style={{
                        borderColor:
                          hoveredId === inst.name ? color : undefined,
                      }}
                      onMouseEnter={(e) => {
                        setHoveredId(inst.name);
                        setHoveredInst(inst);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const containerRect =
                          containerRef.current?.getBoundingClientRect();
                        setTooltipPos({
                          x:
                            rect.left -
                            (containerRect?.left || 0) +
                            rect.width / 2,
                          y: rect.top - (containerRect?.top || 0) - 8,
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredInst(null);
                        setHoveredId(null);
                      }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {getInitials(displayName)}
                      </div>
                      <div className="min-w-0">
                        <span className="block max-w-[150px] truncate text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                          {displayName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {inst.memberCount}{' '}
                          {inst.memberCount === 1
                            ? lang === 'es'
                              ? 'miembro'
                              : 'member'
                            : lang === 'es'
                              ? 'miembros'
                              : 'members'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-5 text-center text-xs text-gray-500 dark:text-gray-400">
        SECiD — Sociedad de Egresados en Ciencia de Datos · UNAM
      </div>

      {/* Hover tooltip */}
      {hoveredInst && (
        <div
          className="pointer-events-none absolute z-50 min-w-[180px] max-w-[260px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-slate-800"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="mb-1.5 text-sm font-bold text-gray-900 dark:text-gray-50">
            {hoveredInst.name}
          </div>
          {hoveredInst.degrees.length > 0 && (
            <div className="mb-1 text-[11px] text-gray-500 dark:text-gray-400">
              {hoveredInst.degrees.slice(0, 3).join(', ')}
            </div>
          )}
          <div className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
            {hoveredInst.memberCount}{' '}
            {hoveredInst.memberCount === 1
              ? lang === 'es'
                ? 'miembro'
                : 'member'
              : lang === 'es'
                ? 'miembros'
                : 'members'}
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationMap;
