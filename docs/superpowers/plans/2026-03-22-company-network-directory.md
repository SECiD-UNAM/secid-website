# Company Network Directory (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public company directory at `/es/companies` with search, filters, quick-view drawer, and per-company profile pages at `/es/companies/{slug}` showing current/alumni members.

**Architecture:** Public Astro pages with React islands. Company list fetches from `companies` Firestore collection. Member-company linking uses existing `profile.companyId`, `experience.previousRoles[].companyId`, and fallback string matching on `profile.company`. Auth-gated member details via `useAuth()`.

**Tech Stack:** Astro 4.x, React 18, Tailwind CSS, Firebase Firestore, Heroicons

---

## File Structure

### New files

| File                                             | Responsibility                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `src/lib/companies/members.ts`                   | `getCompanyMembers()` — query current + alumni members for a company |
| `src/components/companies/CompanyList.tsx`       | List view with search bar, industry filter, stats bar, company rows  |
| `src/components/companies/CompanyDrawer.tsx`     | Slide-out drawer showing company details + member lists              |
| `src/components/companies/CompanyMemberCard.tsx` | Reusable member card for drawer and profile page                     |
| `src/components/companies/CompanyProfile.tsx`    | Full company profile page with tabs (Current, Alumni, Roles)         |
| `src/components/wrappers/CompanyListPage.tsx`    | AuthProvider wrapper for company list                                |
| `src/components/wrappers/CompanyProfilePage.tsx` | AuthProvider wrapper for company profile                             |
| `src/pages/es/companies/index.astro`             | Spanish company list page                                            |
| `src/pages/en/companies/index.astro`             | English company list page                                            |
| `src/pages/es/companies/[slug].astro`            | Spanish company profile page                                         |
| `src/pages/en/companies/[slug].astro`            | English company profile page                                         |

### Modified files

| File                                            | Change                                                    |
| ----------------------------------------------- | --------------------------------------------------------- |
| `src/types/company.ts`                          | Add `slug` field to `Company` interface                   |
| `src/lib/companies/queries.ts`                  | Add `getCompanyBySlug()`, add `slug` to `mapCompanyDoc()` |
| `src/lib/companies/mutations.ts`                | Generate slug on `createCompany()` and `updateCompany()`  |
| `src/lib/companies/index.ts`                    | Re-export `getCompanyBySlug` and `getCompanyMembers`      |
| `src/components/dashboard/DashboardSidebar.tsx` | Add "Red de Empresas" link to main menu                   |

---

## Task 1: Add `slug` to Company type and queries

**Files:**

- Modify: `src/types/company.ts`
- Modify: `src/lib/companies/queries.ts`
- Modify: `src/lib/companies/mutations.ts`
- Modify: `src/lib/companies/index.ts`

- [ ] **Step 1: Add `slug` to Company interface**

In `src/types/company.ts`, add `slug` to the `Company` interface:

```typescript
export interface Company {
  id: string;
  name: string;
  domain: string;
  slug: string; // <-- add this
  logoUrl?: string;
  // ... rest unchanged
}
```

- [ ] **Step 2: Import slugify and update `mapCompanyDoc` in queries.ts**

In `src/lib/companies/queries.ts`, add a local `slugify` function (same as in `src/lib/members/mapper.ts`) and map the slug field:

```typescript
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapCompanyDoc(id: string, data: Record<string, unknown>): Company {
  const name = (data.name as string) || '';
  return {
    id,
    name,
    domain: (data.domain as string) || '',
    slug: (data.slug as string) || slugify(name),
    // ... rest unchanged
  };
}
```

- [ ] **Step 3: Add `getCompanyBySlug()` to queries.ts**

```typescript
export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('slug', '==', slug))
  );
  if (!snapshot.empty) {
    const d = snapshot.docs[0]!;
    return mapCompanyDoc(d.id, d.data());
  }
  // Fallback: compute slug from name for companies without stored slug
  const allSnapshot = await getDocs(collection(db, COLLECTION));
  for (const d of allSnapshot.docs) {
    const company = mapCompanyDoc(d.id, d.data());
    if (company.slug === slug) return company;
  }
  return null;
}
```

- [ ] **Step 4: Generate slug on create/update in mutations.ts**

In `src/lib/companies/mutations.ts`, add the same `slugify` function and use it:

```typescript
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// In createCompany, add slug:
await setDoc(docRef, {
  ...input,
  slug: slugify(input.name),
  memberCount: 0,
  // ... rest unchanged
});

// In updateCompany, add slug if name changed:
if (input.name) {
  cleaned['slug'] = slugify(input.name);
}
```

- [ ] **Step 5: Update barrel file**

In `src/lib/companies/index.ts`, add `getCompanyBySlug` to exports:

```typescript
export {
  getCompanies,
  getCompaniesWithMembers,
  getCompany,
  getCompanyByDomain,
  getCompanyBySlug, // <-- add
  getPendingReviewCompanies,
} from './queries';
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npm run check`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/types/company.ts src/lib/companies/queries.ts src/lib/companies/mutations.ts src/lib/companies/index.ts
git commit -m "feat(companies): add slug field and getCompanyBySlug query"
```

---

## Task 2: Create `getCompanyMembers()` query

**Files:**

- Create: `src/lib/companies/members.ts`
- Modify: `src/lib/companies/index.ts`

- [ ] **Step 1: Create the members query module**

Create `src/lib/companies/members.ts`:

```typescript
/**
 * Company-member relationship queries.
 * Finds current and alumni members for a given company.
 */

import { getMemberProfiles } from '@/lib/members';
import type { MemberProfile } from '@/types/member';

export interface CompanyMembers {
  current: MemberProfile[];
  alumni: MemberProfile[];
}

export async function getCompanyMembers(
  companyId: string,
  companyName: string
): Promise<CompanyMembers> {
  const allMembers = await getMemberProfiles({ limit: 500 });

  const current: MemberProfile[] = [];
  const alumni: MemberProfile[] = [];
  const seen = new Set<string>();

  for (const member of allMembers) {
    // 1. Check companyId on profile (current employer)
    if (member.profile.companyId === companyId) {
      current.push(member);
      seen.add(member.uid);
      continue;
    }

    // 2. Check work history entries
    const roles = member.experience?.previousRoles || [];
    const currentRole = roles.find(
      (r) => r.companyId === companyId && r.current
    );
    const pastRoles = roles.filter(
      (r) => r.companyId === companyId && !r.current
    );

    if (currentRole) {
      current.push(member);
      seen.add(member.uid);
    } else if (pastRoles.length > 0) {
      alumni.push(member);
      seen.add(member.uid);
    }

    // 3. Fallback: string match on company name
    if (!seen.has(member.uid)) {
      if (member.profile.company?.toLowerCase() === companyName.toLowerCase()) {
        current.push(member);
        seen.add(member.uid);
      }
    }
  }

  return { current, alumni };
}
```

- [ ] **Step 2: Export from barrel file**

In `src/lib/companies/index.ts`, add:

```typescript
export { getCompanyMembers } from './members';
export type { CompanyMembers } from './members';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/companies/members.ts src/lib/companies/index.ts
git commit -m "feat(companies): add getCompanyMembers query for current/alumni members"
```

---

## Task 3: Create `CompanyMemberCard` component

**Files:**

- Create: `src/components/companies/CompanyMemberCard.tsx`

- [ ] **Step 1: Create the member card component**

This card is used in both the drawer and the profile page. It shows avatar, name, position, tenure, and optional contact links (LinkedIn, message). Member details are only visible to verified members.

Create `src/components/companies/CompanyMemberCard.tsx`:

```tsx
import React from 'react';
import type { MemberProfile } from '@/types/member';

interface Props {
  member: MemberProfile;
  companyId: string;
  isAlumni?: boolean;
  isVerified: boolean;
  lang?: 'es' | 'en';
}

function formatDate(date: Date | undefined, lang: string): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric',
    month: 'short',
  });
}

function getRoleAtCompany(
  member: MemberProfile,
  companyId: string,
  isAlumni: boolean
): { position: string; startDate?: Date; endDate?: Date; current: boolean } {
  const roles = member.experience?.previousRoles || [];
  const match = isAlumni
    ? roles.find((r) => r.companyId === companyId && !r.current)
    : roles.find((r) => r.companyId === companyId && r.current);

  if (match) {
    return {
      position: match.position,
      startDate: match.startDate,
      endDate: match.endDate,
      current: match.current,
    };
  }

  return {
    position: member.experience?.currentRole || '',
    current: !isAlumni,
  };
}

function getCurrentCompanyName(member: MemberProfile): string | undefined {
  const roles = member.experience?.previousRoles || [];
  const currentRole = roles.find((r) => r.current);
  return currentRole?.company;
}

export const CompanyMemberCard: React.FC<Props> = ({
  member,
  companyId,
  isAlumni = false,
  isVerified,
  lang = 'es',
}) => {
  if (!isVerified) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-gray-300 dark:bg-gray-600" />
          <div className="mt-1 h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {lang === 'es' ? 'Inicia sesion para ver' : 'Sign in to view'}
        </span>
      </div>
    );
  }

  const role = getRoleAtCompany(member, companyId, isAlumni);
  const nowAt = isAlumni ? getCurrentCompanyName(member) : undefined;
  const avatar = member.profile.photoURL;
  const linkedin = member.social?.linkedin;
  const profileUrl = `/${lang}/members/${member.slug || member.uid}`;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
      {/* Avatar */}
      <a href={profileUrl} className="shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={member.displayName}
            className="h-10 w-10 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {member.initials || member.displayName?.charAt(0) || '?'}
          </div>
        )}
      </a>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <a
          href={profileUrl}
          className="truncate font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
        >
          {member.displayName}
        </a>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
          {role.position}
        </p>
        {role.startDate && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(role.startDate, lang)}
            {role.endDate
              ? ` – ${formatDate(role.endDate, lang)}`
              : isAlumni
                ? ''
                : ` – ${lang === 'es' ? 'Presente' : 'Present'}`}
          </p>
        )}
        {isAlumni && nowAt && (
          <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {lang === 'es' ? 'Ahora en' : 'Now at'}: {nowAt}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400"
            title="LinkedIn"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        )}
        <a
          href={profileUrl}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-700 dark:hover:text-primary-400"
          title={lang === 'es' ? 'Ver perfil' : 'View profile'}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default CompanyMemberCard;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/companies/CompanyMemberCard.tsx
git commit -m "feat(companies): add CompanyMemberCard component"
```

---

## Task 4: Create `CompanyDrawer` component

**Files:**

- Create: `src/components/companies/CompanyDrawer.tsx`

- [ ] **Step 1: Create the slide-out drawer component**

The drawer slides in from the right when a company row is clicked. It shows company info, current members, alumni, and a "View Full Profile" button.

Create `src/components/companies/CompanyDrawer.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { XMarkIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import type { Company } from '@/types/company';
import type { MemberProfile } from '@/types/member';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { CompanyMemberCard } from './CompanyMemberCard';
import { getCompanyMembers } from '@/lib/companies/members';

interface Props {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  isVerified: boolean;
  lang?: 'es' | 'en';
}

export const CompanyDrawer: React.FC<Props> = ({
  company,
  isOpen,
  onClose,
  isVerified,
  lang = 'es',
}) => {
  const [current, setCurrent] = useState<MemberProfile[]>([]);
  const [alumni, setAlumni] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!company || !isOpen) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await getCompanyMembers(company!.id, company!.name);
        if (!cancelled) {
          setCurrent(result.current);
          setAlumni(result.alumni);
        }
      } catch (err) {
        console.error('Error loading company members:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [company, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!company) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 right-0 top-0 z-50 w-full max-w-md transform overflow-y-auto bg-white shadow-2xl transition-transform dark:bg-gray-900 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <CompanyLogo company={company} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {company.name}
              </h2>
              {company.industry && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {company.industry}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Company info */}
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
            {company.location && (
              <span className="flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"
                  />
                </svg>
                {company.location}
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
              >
                <GlobeAltIcon className="h-4 w-4" />
                {lang === 'es' ? 'Sitio web' : 'Website'}
              </a>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : (
            <>
              {/* Current Members */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {lang === 'es'
                    ? `Miembros actuales (${current.length})`
                    : `Current members (${current.length})`}
                </h3>
                {current.length > 0 ? (
                  <div className="space-y-2">
                    {current.map((m) => (
                      <CompanyMemberCard
                        key={m.uid}
                        member={m}
                        companyId={company.id}
                        isVerified={isVerified}
                        lang={lang}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {lang === 'es'
                      ? 'Sin miembros actuales registrados'
                      : 'No current members registered'}
                  </p>
                )}
              </div>

              {/* Alumni */}
              {alumni.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Alumni ({alumni.length})
                  </h3>
                  <div className="space-y-2">
                    {alumni.map((m) => (
                      <CompanyMemberCard
                        key={m.uid}
                        member={m}
                        companyId={company.id}
                        isAlumni
                        isVerified={isVerified}
                        lang={lang}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <a
            href={`/${lang}/companies/${company.slug}`}
            className="block w-full rounded-lg bg-primary-600 py-2.5 text-center font-medium text-white transition-colors hover:bg-primary-700"
          >
            {lang === 'es' ? 'Ver perfil completo' : 'View full profile'}
          </a>
        </div>
      </div>
    </>
  );
};

export default CompanyDrawer;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/companies/CompanyDrawer.tsx
git commit -m "feat(companies): add CompanyDrawer slide-out component"
```

---

## Task 5: Create `CompanyList` component

**Files:**

- Create: `src/components/companies/CompanyList.tsx`

- [ ] **Step 1: Create the company list with search, filters, stats bar, and row layout**

Create `src/components/companies/CompanyList.tsx`:

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import type { Company } from '@/types/company';
import { getCompanies } from '@/lib/companies';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { CompanyDrawer } from './CompanyDrawer';

interface Props {
  lang?: 'es' | 'en';
}

export const CompanyList: React.FC<Props> = ({ lang = 'es' }) => {
  const { isVerified } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCompanies();
      // Only show approved companies with members, sorted by member count
      const approved = data
        .filter((c) => !c.pendingReview)
        .sort((a, b) => b.memberCount - a.memberCount);
      setCompanies(approved);
    } catch (err) {
      console.error('Error loading companies:', err);
      setError(
        lang === 'es' ? 'Error al cargar empresas' : 'Error loading companies'
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.industry) set.add(c.industry);
    });
    return Array.from(set).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    let result = companies;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q)
      );
    }
    if (industryFilter) {
      result = result.filter((c) => c.industry === industryFilter);
    }
    return result;
  }, [companies, search, industryFilter]);

  const totalMembers = useMemo(
    () => companies.reduce((sum, c) => sum + c.memberCount, 0),
    [companies]
  );

  const openDrawer = (company: Company) => {
    setSelectedCompany(company);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'es' ? 'Cargando empresas...' : 'Loading companies...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadCompanies}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            {lang === 'es' ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Red de Empresas SECiD' : 'SECiD Company Network'}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Descubre donde trabajan los miembros de SECiD y conecta con tu red profesional.'
            : 'Discover where SECiD members work and connect with your professional network.'}
        </p>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {companies.length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Empresas' : 'Companies'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {totalMembers}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Miembros activos' : 'Active members'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {industries.length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Industrias' : 'Industries'}
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'es' ? 'Buscar empresa...' : 'Search company...'
            }
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-primary-800"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-8 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-primary-800"
          >
            <option value="">
              {lang === 'es' ? 'Todas las industrias' : 'All industries'}
            </option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {filtered.length}{' '}
        {lang === 'es' ? 'empresas encontradas' : 'companies found'}
      </p>

      {/* Company list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
          <BuildingOffice2Icon className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            {lang === 'es'
              ? 'No se encontraron empresas'
              : 'No companies found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((company) => (
            <button
              key={company.id}
              onClick={() => openDrawer(company)}
              className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
            >
              <CompanyLogo company={company} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {company.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {[company.industry, company.location]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span title={lang === 'es' ? 'Miembros' : 'Members'}>
                  {company.memberCount} {lang === 'es' ? 'miembros' : 'members'}
                </span>
                <svg
                  className="h-5 w-5 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Drawer */}
      <CompanyDrawer
        company={selectedCompany}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isVerified={isVerified}
        lang={lang}
      />
    </div>
  );
};

export default CompanyList;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/companies/CompanyList.tsx
git commit -m "feat(companies): add CompanyList with search, filters, stats, and drawer"
```

---

## Task 6: Create `CompanyProfile` component

**Files:**

- Create: `src/components/companies/CompanyProfile.tsx`

- [ ] **Step 1: Create the full company profile with tabs**

Create `src/components/companies/CompanyProfile.tsx`:

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { GlobeAltIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import type { Company } from '@/types/company';
import type { MemberProfile } from '@/types/member';
import { getCompanyBySlug } from '@/lib/companies';
import { getCompanyMembers } from '@/lib/companies/members';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { CompanyMemberCard } from './CompanyMemberCard';

interface Props {
  slug: string;
  lang?: 'es' | 'en';
}

type Tab = 'current' | 'alumni' | 'roles';

function extractSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const companiesIdx = segments.indexOf('companies');
  if (companiesIdx >= 0 && companiesIdx + 1 < segments.length) {
    return segments[companiesIdx + 1] || null;
  }
  return null;
}

export const CompanyProfile: React.FC<Props> = ({
  slug: propSlug,
  lang = 'es',
}) => {
  const { isVerified } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [current, setCurrent] = useState<MemberProfile[]>([]);
  const [alumni, setAlumni] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('current');

  const slug = propSlug || extractSlugFromUrl();

  useEffect(() => {
    if (!slug) {
      setError(lang === 'es' ? 'Empresa no encontrada' : 'Company not found');
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const comp = await getCompanyBySlug(slug!);
        if (cancelled) return;
        if (!comp) {
          setError(
            lang === 'es' ? 'Empresa no encontrada' : 'Company not found'
          );
          return;
        }
        setCompany(comp);

        const members = await getCompanyMembers(comp.id, comp.name);
        if (cancelled) return;
        setCurrent(members.current);
        setAlumni(members.alumni);
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading company:', err);
        setError(
          lang === 'es' ? 'Error al cargar la empresa' : 'Error loading company'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, lang]);

  // Build roles breakdown from current + alumni
  const rolesBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of [...current, ...alumni]) {
      const roles = member.experience?.previousRoles || [];
      for (const role of roles) {
        if (role.companyId === company?.id && role.position) {
          counts.set(role.position, (counts.get(role.position) || 0) + 1);
        }
      }
      // Also count current role from profile
      if (current.includes(member) && member.experience?.currentRole) {
        const pos = member.experience.currentRole;
        counts.set(pos, (counts.get(pos) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [current, alumni, company]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'es' ? 'Cargando...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mb-4 text-6xl">:(</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {error ||
              (lang === 'es' ? 'Empresa no encontrada' : 'Company not found')}
          </h2>
          <a
            href={`/${lang}/companies`}
            className="mt-4 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            {lang === 'es' ? 'Volver al directorio' : 'Back to directory'}
          </a>
        </div>
      </div>
    );
  }

  const totalConnections = current.length + alumni.length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    {
      key: 'current',
      label: lang === 'es' ? 'Miembros actuales' : 'Current members',
      count: current.length,
    },
    {
      key: 'alumni',
      label: 'Alumni',
      count: alumni.length,
    },
    {
      key: 'roles',
      label: lang === 'es' ? 'Roles' : 'Roles',
      count: rolesBreakdown.length,
    },
  ];

  return (
    <div>
      {/* Back link */}
      <a
        href={`/${lang}/companies`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {lang === 'es' ? 'Volver al directorio' : 'Back to directory'}
      </a>

      {/* Company header */}
      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <CompanyLogo company={company} size="lg" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {company.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {company.industry && (
              <span className="rounded-full bg-primary-100 px-3 py-0.5 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                {company.industry}
              </span>
            )}
            {company.location && <span>{company.location}</span>}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
              >
                <GlobeAltIcon className="h-4 w-4" />
                {lang === 'es' ? 'Sitio web' : 'Website'}
              </a>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {totalConnections}{' '}
            {lang === 'es' ? 'conexiones SECiD' : 'SECiD connections'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'current' && (
        <div className="space-y-2">
          {current.length > 0 ? (
            current.map((m) => (
              <CompanyMemberCard
                key={m.uid}
                member={m}
                companyId={company.id}
                isVerified={isVerified}
                lang={lang}
              />
            ))
          ) : (
            <p className="py-8 text-center text-gray-400 dark:text-gray-500">
              {lang === 'es'
                ? 'Sin miembros actuales registrados'
                : 'No current members registered'}
            </p>
          )}
        </div>
      )}

      {activeTab === 'alumni' && (
        <div className="space-y-2">
          {alumni.length > 0 ? (
            alumni.map((m) => (
              <CompanyMemberCard
                key={m.uid}
                member={m}
                companyId={company.id}
                isAlumni
                isVerified={isVerified}
                lang={lang}
              />
            ))
          ) : (
            <p className="py-8 text-center text-gray-400 dark:text-gray-500">
              {lang === 'es'
                ? 'Sin alumni registrados'
                : 'No alumni registered'}
            </p>
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-3">
          {rolesBreakdown.length > 0 ? (
            rolesBreakdown.map(([position, count]) => (
              <div
                key={position}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {position}
                </span>
                <span className="rounded-full bg-primary-100 px-3 py-0.5 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {count}
                </span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-gray-400 dark:text-gray-500">
              {lang === 'es' ? 'Sin roles registrados' : 'No roles registered'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyProfile;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/companies/CompanyProfile.tsx
git commit -m "feat(companies): add CompanyProfile page with tabs for current, alumni, roles"
```

---

## Task 7: Create wrapper components and Astro pages

**Files:**

- Create: `src/components/wrappers/CompanyListPage.tsx`
- Create: `src/components/wrappers/CompanyProfilePage.tsx`
- Create: `src/pages/es/companies/index.astro`
- Create: `src/pages/en/companies/index.astro`
- Create: `src/pages/es/companies/[slug].astro`
- Create: `src/pages/en/companies/[slug].astro`

- [ ] **Step 1: Create CompanyListPage wrapper**

Create `src/components/wrappers/CompanyListPage.tsx`:

```tsx
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyList } from '@/components/companies/CompanyList';

interface Props {
  lang?: 'es' | 'en';
}

export default function CompanyListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CompanyList lang={lang} />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Create CompanyProfilePage wrapper**

Create `src/components/wrappers/CompanyProfilePage.tsx`:

```tsx
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProfile } from '@/components/companies/CompanyProfile';

interface Props {
  slug?: string;
  lang?: 'es' | 'en';
}

export default function CompanyProfilePage({ slug, lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CompanyProfile slug={slug || ''} lang={lang} />
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Create Spanish company list page**

Create `src/pages/es/companies/index.astro`:

```astro
---
export const prerender = false;
import ModernLayout from '../../../layouts/ModernLayout.astro';
import Navigation from '../../../components/Navigation.astro';
import Footer from '../../../components/Footer.astro';
import CompanyListPage from '../../../components/wrappers/CompanyListPage';
---

<ModernLayout
  title="Red de Empresas - SECiD"
  description="Directorio de empresas donde trabajan miembros de SECiD - Sociedad de Egresados en Ciencia de Datos UNAM"
  lang="es"
>
  <Navigation lang="es" />

  <section class="secid-section">
    <div class="secid-container">
      <CompanyListPage client:load lang="es" />
    </div>
  </section>

  <Footer lang="es" />
</ModernLayout>
```

- [ ] **Step 4: Create English company list page**

Create `src/pages/en/companies/index.astro`:

```astro
---
export const prerender = false;
import ModernLayout from '../../../layouts/ModernLayout.astro';
import Navigation from '../../../components/Navigation.astro';
import Footer from '../../../components/Footer.astro';
import CompanyListPage from '../../../components/wrappers/CompanyListPage';
---

<ModernLayout
  title="Company Network - SECiD"
  description="Directory of companies where SECiD members work - Data Science Alumni Society UNAM"
  lang="en"
>
  <Navigation lang="en" />

  <section class="secid-section">
    <div class="secid-container">
      <CompanyListPage client:load lang="en" />
    </div>
  </section>

  <Footer lang="en" />
</ModernLayout>
```

- [ ] **Step 5: Create Spanish company profile page**

Create `src/pages/es/companies/[slug].astro`:

```astro
---
export const prerender = false;
import ModernLayout from '../../../layouts/ModernLayout.astro';
import Navigation from '../../../components/Navigation.astro';
import Footer from '../../../components/Footer.astro';
import CompanyProfilePage from '../../../components/wrappers/CompanyProfilePage';

const { slug } = Astro.params;
if (!slug) return Astro.redirect('/es/companies');
---

<ModernLayout
  title="Empresa - SECiD"
  description="Perfil de empresa en la red SECiD - Sociedad de Egresados en Ciencia de Datos UNAM"
  lang="es"
>
  <Navigation lang="es" />

  <section class="secid-section">
    <div class="secid-container">
      <CompanyProfilePage client:load slug={slug} lang="es" />
    </div>
  </section>

  <Footer lang="es" />
</ModernLayout>
```

- [ ] **Step 6: Create English company profile page**

Create `src/pages/en/companies/[slug].astro`:

```astro
---
export const prerender = false;
import ModernLayout from '../../../layouts/ModernLayout.astro';
import Navigation from '../../../components/Navigation.astro';
import Footer from '../../../components/Footer.astro';
import CompanyProfilePage from '../../../components/wrappers/CompanyProfilePage';

const { slug } = Astro.params;
if (!slug) return Astro.redirect('/en/companies');
---

<ModernLayout
  title="Company - SECiD"
  description="Company profile in the SECiD network - Data Science Alumni Society UNAM"
  lang="en"
>
  <Navigation lang="en" />

  <section class="secid-section">
    <div class="secid-container">
      <CompanyProfilePage client:load slug={slug} lang="en" />
    </div>
  </section>

  <Footer lang="en" />
</ModernLayout>
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npm run check`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/components/wrappers/CompanyListPage.tsx src/components/wrappers/CompanyProfilePage.tsx src/pages/es/companies/ src/pages/en/companies/
git commit -m "feat(companies): add company list and profile pages (es/en)"
```

---

## Task 8: Add sidebar navigation link

**Files:**

- Modify: `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1: Add "Red de Empresas" to the main menu items**

In `src/components/dashboard/DashboardSidebar.tsx`, add a new `BuildingOffice2Icon` import and a new menu item after "Members":

Import at top (add `BuildingOffice2Icon`):

```typescript
import {
  HomeIcon,
  UserCircleIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  BuildingOffice2Icon, // <-- add
} from '@heroicons/react/24/outline';
```

Add the menu item after the "Members" entry in the `menuItems` array:

```typescript
{
  name: lang === 'es' ? 'Red de Empresas' : 'Company Network',
  href: `/${lang}/companies`,
  icon: BuildingOffice2Icon,
  requireVerified: true,
},
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat(companies): add Company Network link to dashboard sidebar"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full type check**

Run: `npm run check`
Expected: No TypeScript errors

- [ ] **Step 2: Run linting**

Run: `npm run lint`
Expected: No critical lint errors

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All existing tests pass

- [ ] **Step 4: Manual verification checklist**

Start the dev server (`npm run dev`) and verify:

1. `/es/companies` loads and shows company list (public, no auth needed)
2. Search bar filters companies by name, industry, location
3. Industry dropdown filters work
4. Stats bar shows correct totals
5. Click company row — drawer slides in from right
6. Drawer shows company info, current members, alumni
7. "View Full Profile" button navigates to `/es/companies/{slug}`
8. Company profile shows tabs: Current Members, Alumni, Roles
9. Member cards show avatar, name, position, dates, LinkedIn link
10. Non-verified user sees company list but blurred/placeholder member cards
11. Verified member sees full member details
12. `/en/companies` works with English translations
13. Dark mode renders correctly on all views
14. Dashboard sidebar shows "Red de Empresas" for verified members
15. Back button on company profile navigates to `/es/companies`

- [ ] **Step 5: Commit any fixes from verification**

```bash
git add -A
git commit -m "fix(companies): address verification feedback"
```
