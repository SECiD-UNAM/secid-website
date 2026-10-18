# Member Statistics Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the members section into a public showcase (company grid + count) and a tabbed dashboard (Overview charts, Members table with filters, Insights breakdowns).

**Architecture:** Two independent components replace `MemberDirectoryPage`: `MemberShowcase` for the public page (simple, no auth) and `MemberDashboard` for the dashboard (3 tabs with interactive filters, charts, expandable table). Data aggregation in `getMemberStatistics()` is reworked to filter members-only and add skills/experience/status distributions.

**Tech Stack:** Astro 4.x, React 18, Recharts 2.12, Firebase Firestore, Tailwind CSS, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-20-member-statistics-views-design.md`

---

### Task 1: Update types — rework MemberStatisticsData and add professionalStatus to MemberProfile

**Files:**

- Modify: `src/types/member.ts:235-245` (MemberStatisticsData interface)
- Modify: `src/types/member.ts:28-116` (MemberProfile interface — add professionalStatus)

- [ ] **Step 1: Rework `MemberStatisticsData` interface**

Replace the interface at lines 235-245 with:

```typescript
export interface MemberStatisticsData {
  totalMembers: number;
  companies: Array<{ name: string; count: number }>;
  campusComposition: Array<{ label: string; count: number }>;
  degreeComposition: Array<{ label: string; count: number }>;
  genderComposition: Array<{ label: string; count: number }>;
  generationDistribution: Array<{ year: string; count: number }>;
  initiativeImportance: Array<{ initiative: string; avgScore: number }>;
  skillsDistribution: Array<{ skill: string; count: number }>;
  experienceDistribution: Array<{ level: string; count: number }>;
  professionalStatusDistribution: Array<{ status: string; count: number }>;
}
```

Removed: `totalCollaborators`, `roleComposition`.
Added: `skillsDistribution`, `experienceDistribution`, `professionalStatusDistribution`.

- [ ] **Step 2: Add `professionalStatus` to `MemberProfile`**

After the `experience` field block (around line 53), add:

```typescript
  // Professional status from registration data
  professionalStatus?: string;
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors in queries.ts and MemberStatistics.tsx (they reference removed fields). This is expected — we'll fix them in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/types/member.ts
git commit -m "refactor: rework MemberStatisticsData type and add professionalStatus to MemberProfile"
```

---

### Task 2: Update mapper — surface experienceLevel and professionalStatus from registrationData

**Files:**

- Modify: `src/lib/members/mapper.ts:57-63` (experience fallback)
- Modify: `src/lib/members/mapper.ts:20-110` (mapUserDocToMemberProfile)

- [ ] **Step 1: Add experience level mapping function**

At the top of `mapper.ts` (after the `slugify` function, around line 14), add:

```typescript
const EXPERIENCE_LEVEL_MAP: Record<
  string,
  'junior' | 'mid' | 'senior' | 'lead' | 'executive'
> = {
  Principiante: 'junior',
  Intermedio: 'mid',
  Avanzado: 'senior',
  Experto: 'lead',
};

function mapExperienceLevel(
  raw: string | undefined
): 'junior' | 'mid' | 'senior' | 'lead' | 'executive' {
  if (!raw) return 'mid';
  return EXPERIENCE_LEVEL_MAP[raw] ?? 'mid';
}
```

- [ ] **Step 2: Update experience fallback to use registrationData**

Replace the experience fallback block (lines 57-63) with:

```typescript
    experience: data.experience || {
      years: 0,
      level: mapExperienceLevel(data.registrationData?.experienceLevel),
      currentRole: data.currentPosition || '',
      previousRoles: [],
      industries: [],
    },
```

- [ ] **Step 3: Add professionalStatus to the return object**

In the return object of `mapUserDocToMemberProfile`, add after the `isPremium` field (around line 103):

```typescript
    professionalStatus: data.registrationData?.professionalStatus || undefined,
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: Errors only in queries.ts and MemberStatistics.tsx (not in mapper.ts).

- [ ] **Step 5: Commit**

```bash
git add src/lib/members/mapper.ts
git commit -m "feat: surface experienceLevel and professionalStatus from registrationData in mapper"
```

---

### Task 3: Rework getMemberStatistics() — members-only filter, add new aggregations

**Files:**

- Modify: `src/lib/members/queries.ts:363-551` (getMemberStatistics function)

- [ ] **Step 1: Update the mock data branch (lines 364-420)**

Replace the mock return with the new shape (no `totalCollaborators`, no `roleComposition`, add new distributions):

```typescript
if (isUsingMockAPI()) {
  return {
    totalMembers: 21,
    companies: [
      { name: 'Datateam Analytics Force', count: 1 },
      { name: 'Xaldigital', count: 1 },
      { name: 'Cognodata', count: 1 },
      { name: 'Universal', count: 1 },
      { name: 'J.D. Power', count: 1 },
      { name: 'Grupo Financiero Banorte', count: 1 },
      { name: 'NielsenIQ', count: 1 },
      { name: 'BBVA', count: 1 },
      { name: 'Circulo de Credito', count: 1 },
      { name: 'Kuona', count: 1 },
      { name: 'Arkham', count: 1 },
      { name: 'Algorithmia', count: 1 },
      { name: 'Uber', count: 1 },
      { name: 'The Coca-Cola Company', count: 1 },
      { name: 'El Puerto de Liverpool', count: 1 },
      { name: 'Microsoft', count: 1 },
    ],
    campusComposition: [
      { label: 'IIMAS', count: 18 },
      { label: 'FES Acatlan', count: 3 },
    ],
    degreeComposition: [
      { label: 'Licenciatura', count: 18 },
      { label: 'Maestria', count: 3 },
    ],
    genderComposition: [
      { label: 'Masculino', count: 18 },
      { label: 'Femenino', count: 3 },
    ],
    generationDistribution: [
      { year: '2019', count: 4 },
      { year: '2020', count: 6 },
      { year: '2021', count: 4 },
      { year: '2022', count: 4 },
      { year: '2023', count: 1 },
      { year: '2024', count: 2 },
    ],
    initiativeImportance: [
      { initiative: 'Bolsa de Trabajo', avgScore: 4 },
      { initiative: 'Cursos', avgScore: 4 },
      { initiative: 'Seminarios', avgScore: 3.5 },
      { initiative: 'Hackatones', avgScore: 3.1 },
      { initiative: 'Mentoria', avgScore: 3.1 },
      { initiative: 'Newsletter', avgScore: 3 },
      { initiative: 'Asesorias', avgScore: 2.7 },
    ],
    skillsDistribution: [
      { skill: 'Python', count: 15 },
      { skill: 'SQL', count: 12 },
      { skill: 'Machine Learning', count: 10 },
      { skill: 'R', count: 8 },
      { skill: 'Tableau', count: 5 },
    ],
    experienceDistribution: [
      { level: 'Intermedio', count: 10 },
      { level: 'Avanzado', count: 6 },
      { level: 'Principiante', count: 3 },
      { level: 'Experto', count: 2 },
    ],
    professionalStatusDistribution: [
      { status: 'Empleado', count: 16 },
      { status: 'Freelance', count: 3 },
      { status: 'Buscando empleo', count: 2 },
    ],
  };
}
```

- [ ] **Step 2: Rework the real implementation**

Replace the real implementation block (from `try {` after the mock branch to the end of the function) with:

```typescript
try {
  const membersRef = collection(db, COLLECTIONS.MEMBERS);
  const snapshot = await getDocs(membersRef);

  let totalMembers = 0;
  const companyMap = new Map<string, number>();
  const campusMap = new Map<string, number>();
  const degreeMap = new Map<string, number>();
  const genderMap = new Map<string, number>();
  const generationMap = new Map<string, number>();
  const skillsMap = new Map<string, number>();
  const experienceMap = new Map<string, number>();
  const professionalStatusMap = new Map<string, number>();

  const priorityKeys = [
    'bolsaTrabajo',
    'cursosEspecializados',
    'seminarios',
    'hackatones',
    'mentoria',
    'newsletter',
    'asesorias',
  ];
  const prioritySums = new Map<string, number>();
  const priorityCounts = new Map<string, number>();
  for (const key of priorityKeys) {
    prioritySums.set(key, 0);
    priorityCounts.set(key, 0);
  }

  snapshot.forEach((d) => {
    const data = d.data();

    // Skip collaborators — aggregate members only
    if (data.role === 'collaborator') return;

    totalMembers++;

    // Company
    const company = data.profile?.company || data.currentCompany;
    if (company) {
      companyMap.set(company, (companyMap.get(company) || 0) + 1);
    }

    // Campus
    const campus = data.campus;
    if (campus) {
      campusMap.set(campus, (campusMap.get(campus) || 0) + 1);
    }

    // Generation
    const generation = data.generation;
    if (generation) {
      generationMap.set(
        String(generation),
        (generationMap.get(String(generation)) || 0) + 1
      );
    }

    // Gender
    const gender = data.registrationData?.gender || data.gender;
    if (gender) {
      genderMap.set(gender, (genderMap.get(gender) || 0) + 1);
    }

    // Max degree
    const maxDegree = data.registrationData?.maxDegree || data.academicLevel;
    if (maxDegree) {
      degreeMap.set(maxDegree, (degreeMap.get(maxDegree) || 0) + 1);
    }

    // Skills
    const skills: string[] = data.skills || data.profile?.skills || [];
    for (const skill of skills) {
      if (skill) {
        skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
      }
    }

    // Experience level
    const expLevel = data.registrationData?.experienceLevel;
    if (expLevel) {
      experienceMap.set(expLevel, (experienceMap.get(expLevel) || 0) + 1);
    }

    // Professional status
    const profStatus = data.registrationData?.professionalStatus;
    if (profStatus) {
      professionalStatusMap.set(
        profStatus,
        (professionalStatusMap.get(profStatus) || 0) + 1
      );
    }

    // Initiative priorities
    const priorities = data.registrationData?.priorities || data.priorities;
    if (priorities) {
      for (const key of priorityKeys) {
        const val = parseFloat(priorities[key]);
        if (!isNaN(val)) {
          prioritySums.set(key, (prioritySums.get(key) || 0) + val);
          priorityCounts.set(key, (priorityCounts.get(key) || 0) + 1);
        }
      }
    }
  });

  const priorityLabels: Record<string, string> = {
    bolsaTrabajo: 'Bolsa de Trabajo',
    cursosEspecializados: 'Cursos',
    seminarios: 'Seminarios',
    hackatones: 'Hackatones',
    mentoria: 'Mentoria',
    newsletter: 'Newsletter',
    asesorias: 'Asesorias',
  };

  const mapToArray = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

  return {
    totalMembers,
    companies: Array.from(companyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    campusComposition: mapToArray(campusMap),
    degreeComposition: mapToArray(degreeMap),
    genderComposition: mapToArray(genderMap),
    generationDistribution: Array.from(generationMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year)),
    initiativeImportance: priorityKeys
      .map((key) => {
        const count = priorityCounts.get(key) || 0;
        const sum = prioritySums.get(key) || 0;
        return {
          initiative: priorityLabels[key] || key,
          avgScore: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
        };
      })
      .filter((item) => item.avgScore > 0)
      .sort((a, b) => b.avgScore - a.avgScore),
    skillsDistribution: Array.from(skillsMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    experienceDistribution: Array.from(experienceMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count),
    professionalStatusDistribution: Array.from(professionalStatusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
  };
} catch (error) {
  console.error('Error fetching member statistics:', error);
  throw error;
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Errors only in MemberStatistics.tsx (references removed fields). queries.ts should be clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/members/queries.ts
git commit -m "refactor: rework getMemberStatistics to filter members-only and add new aggregations"
```

---

### Task 4: Create MemberShowcase — public page component

**Files:**

- Create: `src/components/directory/MemberShowcase.tsx`
- Create: `src/components/wrappers/MemberShowcasePage.tsx`

- [ ] **Step 1: Create `MemberShowcase.tsx`**

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { getMemberStatistics } from '@/lib/members';
import type { MemberStatisticsData } from '@/types/member';

interface MemberShowcaseProps {
  lang?: 'es' | 'en';
}

function getCompanyColor(name: string): string {
  const colors = [
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
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? '#3B82F6';
}

export const MemberShowcase: React.FC<MemberShowcaseProps> = ({
  lang = 'es',
}) => {
  const [data, setData] = useState<MemberStatisticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await getMemberStatistics();
      setData(stats);
    } catch (err) {
      console.error('Error loading showcase data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data || data.companies.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          {lang === 'es' ? 'No hay datos disponibles' : 'No data available'}
        </p>
        <button
          onClick={loadData}
          className="mt-2 text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
        >
          {lang === 'es' ? 'Intentar de nuevo' : 'Try again'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
        {lang === 'es'
          ? '¿Dónde trabajan los miembros de SECiD?'
          : 'Where do SECiD members work?'}
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {data.companies.map((company) => {
          const color = getCompanyColor(company.name);
          return (
            <div
              key={company.name}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {company.name.charAt(0).toUpperCase()}
              </div>
              <span className="line-clamp-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                {company.name}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        {lang === 'es'
          ? `¡Contamos con ${data.totalMembers} miembros y vamos por más!`
          : `We have ${data.totalMembers} members and counting!`}
      </p>
    </div>
  );
};

export default MemberShowcase;
```

- [ ] **Step 2: Create `MemberShowcasePage.tsx`**

```tsx
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { MemberShowcase } from '@/components/directory/MemberShowcase';

interface Props {
  lang?: 'es' | 'en';
}

export default function MemberShowcasePage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MemberShowcase lang={lang} />
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep -c 'MemberShowcase'`
Expected: 0 (no errors in new files)

- [ ] **Step 4: Commit**

```bash
git add src/components/directory/MemberShowcase.tsx src/components/wrappers/MemberShowcasePage.tsx
git commit -m "feat: create MemberShowcase component for public members page"
```

---

### Task 5: Create MemberDashboard — dashboard shell with tab navigation

**Files:**

- Create: `src/components/dashboard/members/MemberDashboard.tsx`
- Create: `src/components/wrappers/MemberDashboardPage.tsx`

- [ ] **Step 1: Create directory**

Run: `mkdir -p src/components/dashboard/members`

- [ ] **Step 2: Create `MemberDashboard.tsx`**

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMemberStatistics,
  getMemberStats,
  getMemberProfiles,
} from '@/lib/members';
import type {
  MemberStatisticsData,
  MemberStats,
  MemberProfile,
} from '@/types/member';
import { OverviewTab } from './OverviewTab';
import { MembersTab } from './MembersTab';
import { InsightsTab } from './InsightsTab';
import type { FilterState } from './MemberFilters';

type DashboardTab = 'overview' | 'members' | 'insights';

interface MemberDashboardProps {
  lang?: 'es' | 'en';
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  lang = 'es',
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [statistics, setStatistics] = useState<MemberStatisticsData | null>(
    null
  );
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    includeCollaborators: false,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statisticsData, statsData, membersData] = await Promise.all([
        getMemberStatistics(),
        getMemberStats(),
        getMemberProfiles({ limit: 200 }),
      ]);
      setStatistics(statisticsData);
      setStats(statsData);
      setMembers(membersData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(
        lang === 'es'
          ? 'Error al cargar los datos. Intenta de nuevo.'
          : 'Error loading data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Cargando dashboard...' : 'Loading dashboard...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
        >
          {lang === 'es' ? 'Intentar de nuevo' : 'Try again'}
        </button>
      </div>
    );
  }

  const tabs: Array<{ value: DashboardTab; label: string }> = [
    { value: 'overview', label: lang === 'es' ? 'Resumen' : 'Overview' },
    { value: 'members', label: lang === 'es' ? 'Miembros' : 'Members' },
    { value: 'insights', label: lang === 'es' ? 'Análisis' : 'Insights' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-primary-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && statistics && stats && (
        <OverviewTab statistics={statistics} stats={stats} lang={lang} />
      )}
      {activeTab === 'members' && (
        <MembersTab
          members={members}
          filters={filters}
          onFiltersChange={setFilters}
          lang={lang}
        />
      )}
      {activeTab === 'insights' && statistics && (
        <InsightsTab statistics={statistics} lang={lang} />
      )}
    </div>
  );
};

export default MemberDashboard;
```

- [ ] **Step 3: Create `MemberDashboardPage.tsx`**

```tsx
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { MemberDashboard } from '@/components/dashboard/members/MemberDashboard';

interface Props {
  lang?: 'es' | 'en';
}

export default function MemberDashboardPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MemberDashboard lang={lang} />
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/members/MemberDashboard.tsx src/components/wrappers/MemberDashboardPage.tsx
git commit -m "feat: create MemberDashboard shell with tab navigation"
```

---

### Task 6: Create OverviewTab — stat cards and charts

**Files:**

- Create: `src/components/dashboard/members/OverviewTab.tsx`

- [ ] **Step 1: Create `OverviewTab.tsx`**

This component renders:

- 4 stat cards (total members, online, new this month, top skill)
- 4 horizontal stacked bar charts (campus, degree, gender, generation composition)
- 1 vertical bar chart (initiative importance)

Uses Recharts: `BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList`.

Props: `{ statistics: MemberStatisticsData; stats: MemberStats; lang: 'es' | 'en' }`

Follow the same Recharts patterns and color constants from the existing `MemberStatistics.tsx` but adapted for the new data shape. Include empty-state checks for each chart section.

The stat cards use: `statistics.totalMembers`, `stats.onlineMembers`, `stats.newMembersThisMonth`, and `statistics.skillsDistribution[0]?.skill || 'N/A'`.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep OverviewTab`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/members/OverviewTab.tsx
git commit -m "feat: create OverviewTab with stat cards and composition charts"
```

---

### Task 7: Create MemberFilters — shared filter bar

**Files:**

- Create: `src/components/dashboard/members/MemberFilters.tsx`

- [ ] **Step 1: Create `MemberFilters.tsx`**

Filter bar component with the full filter set:

- Generation (multi-select dropdown)
- Campus (multi-select dropdown)
- Gender (multi-select dropdown)
- Degree level (multi-select dropdown)
- Company (text search / multi-select)
- Skills (text search / multi-select)
- Experience level (multi-select dropdown)
- Professional status (multi-select dropdown)
- "Include collaborators" checkbox (unchecked by default)
- Date range: joined after (date input)
- Online status (checkbox)
- Mentorship availability (checkbox)

Props: `{ members: MemberProfile[]; filters: FilterState; onFiltersChange: (filters: FilterState) => void; lang: 'es' | 'en' }`

Export a `FilterState` interface and a `filterMembers(members: MemberProfile[], filters: FilterState): MemberProfile[]` utility function.

Derive dropdown options from the members array (unique values for each field).

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep MemberFilters`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/members/MemberFilters.tsx
git commit -m "feat: create MemberFilters component with full filter set"
```

---

### Task 8: Create MembersTab — sortable table with expandable rows

**Files:**

- Create: `src/components/dashboard/members/MembersTab.tsx`

- [ ] **Step 1: Create `MembersTab.tsx`**

Table component with:

- `MemberFilters` at top
- Sortable columns: name, company, campus, generation, skills, status
- Click header to sort ascending/descending
- Expandable rows: click row to expand, showing full details (bio, email if `privacy.showEmail`, company/position, campus, generation, degree, skills, social links, mentorship status, joined date)
- Only one row expanded at a time
- Chevron icon indicates expandability

Props: `{ members: MemberProfile[]; filters: FilterState; onFiltersChange: (filters: FilterState) => void; lang: 'es' | 'en' }`

Uses `MemberFilters` component and `filterMembers()` utility for client-side filtering. Receives `FilterState` from parent `MemberDashboard` (so filters persist across tab switches). Calls `onFiltersChange` when user changes any filter.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep MembersTab`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/members/MembersTab.tsx
git commit -m "feat: create MembersTab with sortable table and expandable rows"
```

---

### Task 9: Create InsightsTab — company grid and additional breakdowns

**Files:**

- Create: `src/components/dashboard/members/InsightsTab.tsx`

- [ ] **Step 1: Create `InsightsTab.tsx`**

Content:

- Company grid (same style as MemberShowcase)
- Skills distribution — horizontal bar chart (top 10 from `statistics.skillsDistribution`)
- Experience level breakdown — bar chart from `statistics.experienceDistribution`
- Professional status breakdown — bar chart from `statistics.professionalStatusDistribution`

Each section guarded by empty-state check.

Props: `{ statistics: MemberStatisticsData; lang: 'es' | 'en' }`

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep InsightsTab`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/members/InsightsTab.tsx
git commit -m "feat: create InsightsTab with company grid and distribution charts"
```

---

### Task 10: Wire up Astro pages and remove old components

**Files:**

- Modify: `src/pages/es/members.astro`
- Modify: `src/pages/en/members.astro`
- Modify: `src/pages/es/dashboard/members/index.astro`
- Modify: `src/pages/en/dashboard/members/index.astro`
- Delete: `src/components/directory/MemberStatistics.tsx`
- Delete: `src/components/wrappers/MemberDirectoryPage.tsx`

- [ ] **Step 1: Update public pages**

In `src/pages/es/members.astro`, replace:

- Import: change `MemberDirectoryPage` to `MemberShowcasePage` from `../../components/wrappers/MemberShowcasePage`
- Usage: replace `<MemberDirectoryPage client:load lang="es" />` with `<MemberShowcasePage client:load lang="es" />`

Do the same for `src/pages/en/members.astro` with `lang="en"`.

- [ ] **Step 2: Update dashboard pages**

In `src/pages/es/dashboard/members/index.astro`, replace:

- Import: change `MemberDirectoryPage` to `MemberDashboardPage` from `@/components/wrappers/MemberDashboardPage`
- Usage: replace `<MemberDirectoryPage client:only="react" lang="es" />` with `<MemberDashboardPage client:only="react" lang="es" />`
- Keep `DashboardLayout` with `requireVerified={true}` — only change the inner component

Do the same for `src/pages/en/dashboard/members/index.astro` with `lang="en"`.

- [ ] **Step 3: Remove old components**

```bash
rm src/components/directory/MemberStatistics.tsx
rm src/components/wrappers/MemberDirectoryPage.tsx
```

- [ ] **Step 4: Update barrel exports**

Remove `getMemberStatistics` references to removed fields from `src/lib/members/index.ts` and `src/lib/members.ts` if needed (check for any broken imports).

- [ ] **Step 5: Full type check and lint**

Run: `npx tsc --noEmit && npx eslint src/ --no-error-on-unmatched-pattern 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire up new member pages and remove old components

- Public /members page now uses MemberShowcase (company grid + count)
- Dashboard /dashboard/members uses MemberDashboard (3-tab analytics)
- Remove MemberStatistics.tsx and MemberDirectoryPage.tsx"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run full build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 2: Manual testing checklist**

With the dev server running against production Firebase:

1. Navigate to `/es/members` — company grid and member count visible (no auth)
2. Log in, go to `/es/dashboard/members/` — 3 tabs visible
3. Overview tab: stat cards + charts with real data
4. Members tab: filters, table, expand a row
5. Insights tab: company grid + charts
6. Check "Include collaborators" — table updates
7. Switch tabs — verify stability
8. Dark mode — all tabs
9. `/en/members` and `/en/dashboard/members/` — English versions
