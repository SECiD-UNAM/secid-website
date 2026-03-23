import React, { useState, useMemo } from 'react';
import type { Company } from '@/types/company';
import type { MemberProfile } from '@/types/member';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { getMemberProfiles } from '@/lib/members';

interface Props {
  companies: Company[];
  onCompanyClick: (company: Company) => void;
  lang?: 'es' | 'en';
}

interface TimelineEntry {
  company: Company;
  memberName: string;
  memberSlug: string;
  startYear: number;
  endYear: number | null; // null = current
  current: boolean;
}

function yearFromDate(d: unknown): number | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d as string);
  if (isNaN(date.getTime())) return null;
  return date.getFullYear();
}

export const CompanyTimeline: React.FC<Props> = ({
  companies,
  onCompanyClick,
  lang = 'es',
}) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'company' | 'member'>('company');

  // Load member data once
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const members = await getMemberProfiles({ limit: 500 });
        if (cancelled) return;

        const companyMap = new Map(companies.map((c) => [c.id, c]));
        const companyNameMap = new Map(companies.map((c) => [c.name.toLowerCase(), c]));
        const result: TimelineEntry[] = [];

        for (const member of members) {
          const roles = member.experience?.previousRoles || [];
          for (const role of roles) {
            const startYear = yearFromDate(role.startDate);
            if (!startYear) continue;

            const company =
              (role.companyId && companyMap.get(role.companyId)) ||
              companyNameMap.get(role.company?.toLowerCase() || '');

            if (!company) continue;

            result.push({
              company,
              memberName: member.displayName || 'Member',
              memberSlug: member.slug || member.uid,
              startYear,
              endYear: role.current ? null : yearFromDate(role.endDate),
              current: role.current,
            });
          }
        }

        setEntries(result);
      } catch (err) {
        console.error('Error loading timeline data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companies]);

  // Compute year range
  const currentYear = new Date().getFullYear();
  const minYear = useMemo(() => {
    if (entries.length === 0) return currentYear - 5;
    return Math.min(...entries.map((e) => e.startYear));
  }, [entries, currentYear]);
  const maxYear = currentYear;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Group entries
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; entries: TimelineEntry[] }>();

    if (groupBy === 'company') {
      for (const entry of entries) {
        const key = entry.company.id;
        if (!map.has(key)) map.set(key, { label: entry.company.name, entries: [] });
        map.get(key)!.entries.push(entry);
      }
    } else {
      for (const entry of entries) {
        const key = entry.memberSlug;
        if (!map.has(key)) map.set(key, { label: entry.memberName, entries: [] });
        map.get(key)!.entries.push(entry);
      }
    }

    // Sort by earliest start year
    return Array.from(map.entries())
      .sort((a, b) => {
        const aMin = Math.min(...a[1].entries.map((e) => e.startYear));
        const bMin = Math.min(...b[1].entries.map((e) => e.startYear));
        return aMin - bMin;
      });
  }, [entries, groupBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 dark:text-gray-500">
        {lang === 'es' ? 'No hay datos de historial laboral disponibles' : 'No work history data available'}
      </div>
    );
  }

  const totalYears = years.length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary, #f8fafc)' }}>
          {lang === 'es' ? 'Línea de tiempo' : 'Timeline'}
        </h3>
        <div style={{ display: 'inline-flex', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border, #334155)' }}>
          <button
            onClick={() => setGroupBy('company')}
            style={{
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: groupBy === 'company' ? 'var(--secid-primary, #f65425)' : 'transparent',
              color: groupBy === 'company' ? 'white' : 'var(--color-text-secondary, #94a3b8)',
            }}
          >
            {lang === 'es' ? 'Por empresa' : 'By company'}
          </button>
          <button
            onClick={() => setGroupBy('member')}
            style={{
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: groupBy === 'member' ? 'var(--secid-primary, #f65425)' : 'transparent',
              color: groupBy === 'member' ? 'white' : 'var(--color-text-secondary, #94a3b8)',
            }}
          >
            {lang === 'es' ? 'Por miembro' : 'By member'}
          </button>
        </div>
      </div>

      {/* Timeline chart */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: Math.max(600, totalYears * 60) }}>
          {/* Year headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `140px repeat(${totalYears}, 1fr)`,
              borderBottom: '1px solid var(--color-border, #334155)',
              paddingBottom: 6,
              marginBottom: 8,
            }}
          >
            <div />
            {years.map((y) => (
              <div
                key={y}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: y === currentYear ? 'var(--secid-primary, #f65425)' : 'var(--color-text-secondary, #64748b)',
                  textAlign: 'center',
                }}
              >
                {y}
              </div>
            ))}
          </div>

          {/* Rows */}
          {grouped.map(([key, { label, entries: rowEntries }]) => (
            <div
              key={key}
              style={{
                display: 'grid',
                gridTemplateColumns: `140px repeat(${totalYears}, 1fr)`,
                alignItems: 'center',
                minHeight: 36,
                borderBottom: '1px solid var(--color-border, #1e293b)',
              }}
            >
              {/* Label */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-text-primary, #e2e8f0)',
                  paddingRight: 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {groupBy === 'company' && rowEntries[0] && (
                  <button
                    onClick={() => onCompanyClick(rowEntries[0]!.company)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                  >
                    <CompanyLogo company={rowEntries[0]!.company} size="sm" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  </button>
                )}
                {groupBy === 'member' && (
                  <a
                    href={`/${lang}/members/${key}`}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {label}
                  </a>
                )}
              </div>

              {/* Bars */}
              {years.map((year) => {
                const active = rowEntries.filter((e) => {
                  const end = e.endYear ?? currentYear;
                  return e.startYear <= year && end >= year;
                });
                if (active.length === 0) return <div key={year} />;

                return (
                  <div
                    key={year}
                    style={{
                      display: 'flex',
                      gap: 1,
                      height: 24,
                      padding: '2px 1px',
                    }}
                  >
                    {active.map((entry, i) => {
                      const isStart = entry.startYear === year;
                      const isEnd = (entry.endYear ?? currentYear) === year && !entry.current;
                      const color = entry.current ? 'var(--secid-primary, #f65425)' : '#3B82F6';
                      return (
                        <div
                          key={i}
                          title={`${groupBy === 'company' ? entry.memberName : entry.company.name} (${entry.startYear}–${entry.current ? (lang === 'es' ? 'presente' : 'present') : entry.endYear})`}
                          style={{
                            flex: 1,
                            background: color,
                            opacity: entry.current ? 1 : 0.7,
                            borderRadius: `${isStart ? 4 : 0}px ${isEnd ? 4 : 0}px ${isEnd ? 4 : 0}px ${isStart ? 4 : 0}px`,
                            minWidth: 4,
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--color-text-secondary, #64748b)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--secid-primary, #f65425)' }} />
          {lang === 'es' ? 'Actual' : 'Current'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 8, borderRadius: 2, background: '#3B82F6', opacity: 0.7 }} />
          {lang === 'es' ? 'Anterior' : 'Former'}
        </span>
      </div>
    </div>
  );
};

export default CompanyTimeline;
