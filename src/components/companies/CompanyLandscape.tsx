import React, { useState } from 'react';
import type { Company } from '@/types/company';
import { CompanyLogo } from '@/components/shared/CompanyLogo';

interface Props {
  companies: Company[];
  onCompanyClick: (company: Company) => void;
  lang?: 'es' | 'en';
}

const INDUSTRY_COLORS: Record<string, string> = {
  'Tecnología': '#3B82F6',
  'Technology': '#3B82F6',
  'Finanzas': '#10B981',
  'Finance': '#10B981',
  'Retail': '#F59E0B',
  'Entretenimiento': '#A855F7',
  'Entertainment': '#A855F7',
  'Consumo': '#EC4899',
  'Consumer': '#EC4899',
  'Consultoría': '#EF4444',
  'Consulting': '#EF4444',
  'Gobierno': '#F97316',
  'Government': '#F97316',
  'Salud': '#14B8A6',
  'Health': '#14B8A6',
  'Educación': '#6366F1',
  'Education': '#6366F1',
  'Datos': '#06B6D4',
  'Data': '#06B6D4',
  'Fitness': '#84CC16',
};

function getIndustryColor(industry: string): string {
  return INDUSTRY_COLORS[industry] || '#8B5CF6';
}

export const CompanyLandscape: React.FC<Props> = ({
  companies,
  onCompanyClick,
  lang = 'es',
}) => {
  const [filter, setFilter] = useState<'current' | 'all'>('current');

  // Filter: current = companies with active members, all = every company
  const displayed = filter === 'current'
    ? companies.filter((c) => c.memberCount > 0)
    : companies;

  // Group by industry
  const groups = new Map<string, Company[]>();
  for (const c of displayed) {
    const key = c.industry || (lang === 'es' ? 'Otros' : 'Other');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // Sort groups: largest first
  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const totalMembers = displayed.reduce((s, c) => s + c.memberCount, 0);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: 'var(--card-bg, #1e293b)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          border: '1px solid var(--color-border, #334155)',
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--color-text-primary, #f8fafc)',
            margin: '0 0 4px',
            fontFamily: 'Poppins, system-ui, sans-serif',
          }}
        >
          {lang === 'es'
            ? '¿Dónde trabajan los miembros de SECiD?'
            : 'Where do SECiD members work?'}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-secondary, #94a3b8)',
            margin: '0 0 16px',
          }}
        >
          {lang === 'es'
            ? 'Empresas donde nuestros egresados generan impacto'
            : 'Companies where our graduates make an impact'}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ background: 'var(--color-background, #0f172a)', borderRadius: 10, padding: '10px 8px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--secid-primary, #f65425)' }}>{displayed.length}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary, #94a3b8)' }}>
              {lang === 'es' ? 'Empresas' : 'Companies'}
            </div>
          </div>
          <div style={{ background: 'var(--color-background, #0f172a)', borderRadius: 10, padding: '10px 8px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--secid-primary, #f65425)' }}>{sortedGroups.length}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary, #94a3b8)' }}>
              {lang === 'es' ? 'Industrias' : 'Industries'}
            </div>
          </div>
          <div style={{ background: 'var(--color-background, #0f172a)', borderRadius: 10, padding: '10px 8px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--secid-primary, #f65425)' }}>{totalMembers}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary, #94a3b8)' }}>
              {lang === 'es' ? 'Conexiones' : 'Connections'}
            </div>
          </div>
          <div style={{ background: 'var(--color-background, #0f172a)', borderRadius: 10, padding: '10px 8px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--secid-primary, #f65425)' }}>UNAM</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary, #94a3b8)' }}>
              {lang === 'es' ? 'Ciencia de Datos' : 'Data Science'}
            </div>
          </div>
        </div>

        {/* Current / All toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <div style={{ display: 'inline-flex', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border, #334155)' }}>
            <button
              onClick={() => setFilter('current')}
              style={{
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filter === 'current' ? 'var(--secid-primary, #f65425)' : 'transparent',
                color: filter === 'current' ? 'white' : 'var(--color-text-secondary, #94a3b8)',
              }}
            >
              {lang === 'es' ? 'Actuales' : 'Current'}
            </button>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filter === 'all' ? 'var(--secid-primary, #f65425)' : 'transparent',
                color: filter === 'all' ? 'white' : 'var(--color-text-secondary, #94a3b8)',
              }}
            >
              {lang === 'es' ? 'Historial completo' : 'Full history'}
            </button>
          </div>
        </div>
      </div>

      {/* Landscape grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {sortedGroups.map(([industry, group]) => {
          const color = getIndustryColor(industry);
          return (
            <div
              key={industry}
              style={{
                background: 'var(--card-bg, #1e293b)',
                borderRadius: 12,
                border: `2px solid ${color}40`,
                overflow: 'hidden',
              }}
            >
              {/* Industry header */}
              <div
                style={{
                  padding: '8px 14px',
                  background: `${color}15`,
                  borderBottom: `1px solid ${color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color,
                  }}
                >
                  {industry}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--color-text-secondary, #64748b)',
                    fontWeight: 600,
                  }}
                >
                  {group.length}
                </span>
              </div>

              {/* Company logos */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  padding: 10,
                }}
              >
                {group.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => onCompanyClick(company)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px 5px 5px',
                      borderRadius: 8,
                      background: 'var(--color-background, #0f172a)',
                      border: '1px solid var(--color-border, #334155)',
                      cursor: 'pointer',
                      transition: 'border-color 150ms',
                      maxWidth: '100%',
                    }}
                    title={`${company.name} — ${company.memberCount} ${lang === 'es' ? 'miembros' : 'members'}`}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = color;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border, #334155)';
                    }}
                  >
                    <CompanyLogo company={company} size="sm" />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--color-text-primary, #e2e8f0)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 150,
                      }}
                    >
                      {company.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px 0 8px',
          fontSize: 12,
          color: 'var(--color-text-secondary, #64748b)',
        }}
      >
        SECiD — Sociedad de Egresados en Ciencia de Datos · UNAM
      </div>
    </div>
  );
};

export default CompanyLandscape;
