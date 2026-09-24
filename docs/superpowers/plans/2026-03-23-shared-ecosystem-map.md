# Shared EcosystemMap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicate CompanyLandscape and MemberShowcase with a single shared EcosystemMap component used on both pages.

**Architecture:** Promote CompanyLandscape to `src/components/shared/EcosystemMap.tsx`, convert inline styles to Tailwind, make `onCompanyClick` optional (falls back to `<a>` links). Gut MemberShowcase to a thin wrapper that fetches companies and renders EcosystemMap. Update CompanyList import.

**Tech Stack:** React 18, Tailwind CSS, existing CompanyLogo + translateIndustry utilities

**Spec:** `docs/superpowers/specs/2026-03-23-shared-ecosystem-map-design.md`

---

## File Structure

| File                                                 | Action                   | Responsibility                                     |
| ---------------------------------------------------- | ------------------------ | -------------------------------------------------- |
| `src/components/shared/EcosystemMap.tsx`             | Create                   | Shared industry-grouped company visualization      |
| `tests/unit/components/shared/EcosystemMap.test.tsx` | Create                   | Unit tests for EcosystemMap                        |
| `src/components/companies/CompanyList.tsx`           | Modify (line 8, 200-204) | Swap CompanyLandscape import for EcosystemMap      |
| `src/components/directory/MemberShowcase.tsx`        | Rewrite                  | Thin wrapper: fetch companies, render EcosystemMap |
| `src/components/companies/CompanyLandscape.tsx`      | Delete                   | Replaced by EcosystemMap                           |

---

### Task 1: Create EcosystemMap component

**Files:**

- Create: `src/components/shared/EcosystemMap.tsx`
- Reference: `src/components/companies/CompanyLandscape.tsx` (source)

- [ ] **Step 1: Create EcosystemMap.tsx**

Convert CompanyLandscape from inline styles to Tailwind. Key changes:

- `style={{ background: 'var(--card-bg, ...)' }}` → Tailwind `bg-slate-800 dark:bg-slate-800` classes
- All `style={{}}` replaced with `className=""`
- `onCompanyClick` becomes optional — when absent, company pills render as `<a href="/{lang}/companies/{slug}">` instead of `<button onClick>`
- Reconcile `INDUSTRY_COLORS` to include all known industries: add `'Fintech'`, `'Conglomerado'`, and their English counterparts
- Bug fix: `'Consumer'` → `'Consumer Goods'` and `'Health'` → `'Healthcare'` to align with `industry-i18n.ts` translations
- Preserve per-industry hover border color via `hoveredId` state (original uses imperative `style.borderColor`)

```tsx
// src/components/shared/EcosystemMap.tsx
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
  Tecnología: '#3B82F6',
  Technology: '#3B82F6',
  Finanzas: '#10B981',
  Finance: '#10B981',
  Fintech: '#F43F5E',
  Retail: '#F59E0B',
  Entretenimiento: '#A855F7',
  Entertainment: '#A855F7',
  Consumo: '#EC4899',
  'Consumer Goods': '#EC4899',
  Consultoría: '#EF4444',
  Consulting: '#EF4444',
  Gobierno: '#F97316',
  Government: '#F97316',
  Salud: '#14B8A6',
  Healthcare: '#14B8A6',
  Educación: '#6366F1',
  Education: '#6366F1',
  Datos: '#06B6D4',
  Data: '#06B6D4',
  Fitness: '#84CC16',
  Conglomerado: '#78716C',
  Conglomerate: '#78716C',
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

  const displayed =
    filter === 'current'
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
        <h2
          className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50"
          style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
        >
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
            {
              value: String(displayed.length),
              label: lang === 'es' ? 'Empresas' : 'Companies',
            },
            {
              value: String(sortedGroups.length),
              label: lang === 'es' ? 'Industrias' : 'Industries',
            },
            {
              value: String(totalMembers),
              label: lang === 'es' ? 'Conexiones' : 'Connections',
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
                style={{
                  background: `${color}15`,
                  borderBottomColor: `${color}30`,
                }}
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color }}
                >
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
                        borderColor:
                          hoveredId === company.id ? color : undefined,
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
                        setHoveredId(company.id);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const containerRect =
                          containerRef.current?.getBoundingClientRect();
                        setHoveredCompany(company);
                        setTooltipPos({
                          x:
                            rect.left -
                            (containerRect?.left || 0) +
                            rect.width / 2,
                          y: rect.top - (containerRect?.top || 0) - 8,
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredCompany(null);
                        setHoveredId(null);
                      }}
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
              <div className="text-sm font-bold text-gray-900 dark:text-gray-50">
                {hoveredCompany.name}
              </div>
              {hoveredCompany.industry && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {translateIndustry(hoveredCompany.industry, lang)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            {hoveredCompany.location && (
              <span>📍 {hoveredCompany.location}</span>
            )}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {hoveredCompany.memberCount}{' '}
              {lang === 'es' ? 'miembros' : 'members'}
            </span>
          </div>
          {hoveredCompany.website && (
            <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
              🌐{' '}
              {hoveredCompany.website
                .replace(/^https?:\/\//, '')
                .replace(/\/$/, '')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EcosystemMap;
```

- [ ] **Step 2: Verify file was created**

Run: `ls src/components/shared/EcosystemMap.tsx`
Expected: file exists

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to EcosystemMap

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/EcosystemMap.tsx
git commit -m "feat: create shared EcosystemMap component from CompanyLandscape"
```

---

### Task 2: Write EcosystemMap unit tests

**Files:**

- Create: `tests/unit/components/shared/EcosystemMap.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// tests/unit/components/shared/EcosystemMap.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EcosystemMap } from '@/components/shared/EcosystemMap';
import type { Company } from '@/types/company';

const makeCompany = (overrides: Partial<Company> = {}): Company => ({
  id: 'c1',
  name: 'Acme Corp',
  domain: 'acme.com',
  slug: 'acme-corp',
  industry: 'Tecnología',
  location: 'CDMX',
  website: 'https://acme.com',
  memberCount: 5,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  pendingReview: false,
  ...overrides,
});

describe('EcosystemMap', () => {
  it('renders industry groups from company data', () => {
    const companies = [
      makeCompany({
        id: 'c1',
        name: 'TechCo',
        industry: 'Tecnología',
        memberCount: 3,
      }),
      makeCompany({
        id: 'c2',
        name: 'BankCo',
        industry: 'Finanzas',
        memberCount: 2,
      }),
    ];
    render(<EcosystemMap companies={companies} lang="es" />);
    expect(screen.getByText('Tecnología')).toBeTruthy();
    expect(screen.getByText('Finanzas')).toBeTruthy();
  });

  it('filters to current members by default (memberCount > 0)', () => {
    const companies = [
      makeCompany({ id: 'c1', name: 'ActiveCo', memberCount: 3 }),
      makeCompany({ id: 'c2', name: 'EmptyCo', memberCount: 0 }),
    ];
    render(<EcosystemMap companies={companies} lang="es" />);
    expect(screen.getByText('ActiveCo')).toBeTruthy();
    expect(screen.queryByText('EmptyCo')).toBeNull();
  });

  it('shows all companies when "all" toggle is clicked', () => {
    const companies = [
      makeCompany({ id: 'c1', name: 'ActiveCo', memberCount: 3 }),
      makeCompany({ id: 'c2', name: 'EmptyCo', memberCount: 0 }),
    ];
    render(<EcosystemMap companies={companies} lang="es" />);
    fireEvent.click(screen.getByText('Historial completo'));
    expect(screen.getByText('EmptyCo')).toBeTruthy();
  });

  it('calls onCompanyClick when provided', () => {
    const handler = vi.fn();
    const companies = [makeCompany()];
    render(
      <EcosystemMap companies={companies} onCompanyClick={handler} lang="es" />
    );
    fireEvent.click(screen.getByText('Acme Corp'));
    expect(handler).toHaveBeenCalledWith(companies[0]);
  });

  it('renders <a> links when onCompanyClick is omitted', () => {
    const companies = [makeCompany({ slug: 'acme-corp' })];
    const { container } = render(
      <EcosystemMap companies={companies} lang="es" />
    );
    const link = container.querySelector('a[href="/es/companies/acme-corp"]');
    expect(link).toBeTruthy();
  });

  it('handles empty company list', () => {
    render(<EcosystemMap companies={[]} lang="es" />);
    // Stats grid renders multiple '0' values (companies, industries, connections)
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:unit -- tests/unit/components/shared/EcosystemMap.test.tsx`
Expected: All 6 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/unit/components/shared/EcosystemMap.test.tsx
git commit -m "test: add EcosystemMap unit tests"
```

---

### Task 3: Update CompanyList to use EcosystemMap

**Files:**

- Modify: `src/components/companies/CompanyList.tsx` (lines 8, 200-204)

- [ ] **Step 1: Update the import**

Change line 8 from:

```tsx
import { CompanyLandscape } from './CompanyLandscape';
```

to:

```tsx
import { EcosystemMap } from '@/components/shared/EcosystemMap';
```

- [ ] **Step 2: Update the JSX render**

Change lines 200-204 from:

```tsx
<CompanyLandscape
  companies={filtered}
  onCompanyClick={openDrawer}
  lang={lang}
/>
```

to:

```tsx
<EcosystemMap companies={filtered} onCompanyClick={openDrawer} lang={lang} />
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/companies/CompanyList.tsx
git commit -m "refactor: swap CompanyLandscape for shared EcosystemMap in CompanyList"
```

---

### Task 4: Rewrite MemberShowcase as thin wrapper

**Files:**

- Rewrite: `src/components/directory/MemberShowcase.tsx`

- [ ] **Step 1: Replace MemberShowcase with thin wrapper**

Replace the entire file (~860 lines) with:

```tsx
// src/components/directory/MemberShowcase.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { getCompanies } from '@/lib/companies';
import { EcosystemMap } from '@/components/shared/EcosystemMap';
import type { Company } from '@/types/company';

interface MemberShowcaseProps {
  lang?: 'es' | 'en';
}

export const MemberShowcase: React.FC<MemberShowcaseProps> = ({
  lang = 'es',
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getCompanies();
      const approved = data
        .filter((c) => !c.pendingReview)
        .sort((a, b) => b.memberCount - a.memberCount);
      setCompanies(approved);
    } catch (err) {
      console.error('Error loading ecosystem data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Error al cargar datos' : 'Error loading data'}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {lang === 'es' ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'No hay datos disponibles' : 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  return <EcosystemMap companies={companies} lang={lang} />;
};

export default MemberShowcase;
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/directory/MemberShowcase.tsx
git commit -m "refactor: rewrite MemberShowcase as thin EcosystemMap wrapper"
```

---

### Task 5: Delete CompanyLandscape

**Files:**

- Delete: `src/components/companies/CompanyLandscape.tsx`

- [ ] **Step 1: Verify no remaining imports**

Run: `grep -r "CompanyLandscape" src/`
Expected: No matches (CompanyList was updated in Task 3)

- [ ] **Step 2: Delete the file**

Run: `rm src/components/companies/CompanyLandscape.tsx`

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Run all unit tests**

Run: `npm run test:unit`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -u src/components/companies/CompanyLandscape.tsx
git commit -m "refactor: delete CompanyLandscape, replaced by shared EcosystemMap"
```

---

### Task 6: Visual verification on both pages

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify companies page**

Navigate to `http://localhost:4321/es/companies/`

- Toggle to "Mapa" view
- Verify industry grid renders with colored headers
- Hover over company pills → tooltip appears with name, industry, location, member count
- Click a pill → drawer opens (existing behavior)
- Toggle "Actuales" / "Historial completo"
- Check dark mode

- [ ] **Step 3: Verify members page**

Navigate to `http://localhost:4321/es/members/`

- Verify ecosystem map renders (no more "No hay datos disponibles")
- Same industry grid, hover cards, current/all toggle
- Click a pill → navigates to `/es/companies/{slug}` (link, not drawer)
- Check dark mode

- [ ] **Step 4: Final commit if any adjustments needed**
