import React, { useState, useRef } from 'react';
import type { Company } from '@/types/company';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { translateIndustry } from '@/lib/companies/industry-i18n';

interface EcosystemMapProps {
  companies: Company[];
  onCompanyClick?: (company: Company) => void;
  lang?: 'es' | 'en';
}

const INDUSTRY_COLORS: Record<string, string> = {
  'Tecnología': '#3B82F6',
  'Technology': '#3B82F6',
  'Finanzas': '#10B981',
  'Finance': '#10B981',
  'Fintech': '#F43F5E',
  'Retail': '#F59E0B',
  'Entretenimiento': '#A855F7',
  'Entertainment': '#A855F7',
  'Consumo': '#EC4899',
  'Consumer Goods': '#EC4899',
  'Consultoría': '#EF4444',
  'Consulting': '#EF4444',
  'Gobierno': '#F97316',
  'Government': '#F97316',
  'Salud': '#14B8A6',
  'Healthcare': '#14B8A6',
  'Educación': '#6366F1',
  'Education': '#6366F1',
  'Datos': '#06B6D4',
  'Data': '#06B6D4',
  'Fitness': '#84CC16',
  'Conglomerado': '#78716C',
  'Conglomerate': '#78716C',
};

function getIndustryColor(industry: string): string {
  return INDUSTRY_COLORS[industry] || '#8B5CF6';
}

export const EcosystemMap: React.FC<EcosystemMapProps> = ({
  companies,
  onCompanyClick,
  lang = 'es',
}) => {
  const [filter, setFilter] = useState<'current' | 'all'>('current');
  const [hoveredCompany, setHoveredCompany] = useState<Company | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const displayed = filter === 'current'
    ? companies.filter((c) => c.memberCount > 0)
    : companies;

  const groups = new Map<string, Company[]>();
  for (const c of displayed) {
    const key = translateIndustry(c.industry || 'Otros', lang);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const totalMembers = displayed.reduce((s, c) => s + c.memberCount, 0);

  return (
    <div ref={containerRef} className="relative">
      {/* Header card */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-slate-800">
        <h2 className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
          {lang === 'es'
            ? '¿Dónde trabajan los miembros de SECiD?'
            : 'Where do SECiD members work?'}
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'Empresas donde nuestros egresados generan impacto'
            : 'Companies where our graduates make an impact'}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { value: String(displayed.length), label: lang === 'es' ? 'Empresas' : 'Companies' },
            { value: String(sortedGroups.length), label: lang === 'es' ? 'Industrias' : 'Industries' },
            { value: String(totalMembers), label: lang === 'es' ? 'Conexiones' : 'Connections' },
            { value: 'UNAM', label: lang === 'es' ? 'Ciencia de Datos' : 'Data Science' },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-xl bg-gray-50 px-2 py-2.5 dark:bg-slate-900">
              <div className="text-xl font-bold text-primary-600 dark:text-primary-400">{value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Current / All toggle */}
        <div className="mt-4 flex justify-center">
          <div className="inline-flex overflow-hidden rounded-full border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setFilter('current')}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === 'current'
                  ? 'bg-primary-600 text-white'
                  : 'bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {lang === 'es' ? 'Actuales' : 'Current'}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {lang === 'es' ? 'Historial completo' : 'Full history'}
            </button>
          </div>
        </div>
      </div>

      {/* Industry grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {sortedGroups.map(([industry, group]) => {
          const color = getIndustryColor(industry);
          return (
            <div
              key={industry}
              className="overflow-hidden rounded-xl border-2 bg-white dark:bg-slate-800"
              style={{ borderColor: `${color}40` }}
            >
              {/* Industry header */}
              <div
                className="flex items-center justify-between border-b px-3.5 py-2"
                style={{ background: `${color}15`, borderBottomColor: `${color}30` }}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
                  {industry}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  {group.length}
                </span>
              </div>

              {/* Company pills */}
              <div className="flex flex-wrap gap-1.5 p-2.5">
                {group.map((company) => {
                  const PillTag = onCompanyClick ? 'button' : 'a';
                  const pillProps = onCompanyClick
                    ? { onClick: () => onCompanyClick(company) }
                    : { href: `/${lang}/companies/${company.slug}` };

                  return (
                    <PillTag
                      key={company.id}
                      {...pillProps}
                      className={`flex items-center gap-1.5 rounded-lg border bg-gray-50 px-2.5 py-1.5 text-left transition-all dark:bg-slate-900 ${
                        company.memberCount === 0 ? 'opacity-50' : ''
                      }`}
                      style={{
                        borderColor: hoveredId === company.id ? color : undefined,
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
                        setHoveredId(company.id);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const containerRect = containerRef.current?.getBoundingClientRect();
                        setHoveredCompany(company);
                        setTooltipPos({
                          x: rect.left - (containerRect?.left || 0) + rect.width / 2,
                          y: rect.top - (containerRect?.top || 0) - 8,
                        });
                      }}
                      onMouseLeave={() => { setHoveredCompany(null); setHoveredId(null); }}
                    >
                      <CompanyLogo company={company} size="sm" />
                      <span className="max-w-[150px] truncate text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                        {company.name}
                      </span>
                    </PillTag>
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
        {filter === 'all' && (
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-3.5 rounded-sm bg-gray-800 dark:bg-gray-200" />
              {lang === 'es' ? 'Actuales' : 'Current'}
            </span>
            <span className="flex items-center gap-1 opacity-50">
              <span className="inline-block h-2.5 w-3.5 rounded-sm bg-gray-800 dark:bg-gray-200" />
              {lang === 'es' ? 'Anteriores' : 'Former'}
            </span>
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hoveredCompany && (
        <div
          className="pointer-events-none absolute z-50 min-w-[180px] max-w-[260px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-slate-800"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="mb-1.5 flex items-center gap-2.5">
            <CompanyLogo company={hoveredCompany} size="md" />
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-50">{hoveredCompany.name}</div>
              {hoveredCompany.industry && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {translateIndustry(hoveredCompany.industry, lang)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            {hoveredCompany.location && <span>📍 {hoveredCompany.location}</span>}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {hoveredCompany.memberCount} {lang === 'es' ? 'miembros' : 'members'}
            </span>
          </div>
          {hoveredCompany.website && (
            <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
              🌐 {hoveredCompany.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EcosystemMap;
