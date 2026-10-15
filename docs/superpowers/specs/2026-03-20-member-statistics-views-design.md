# Member Statistics Views — Design Spec

## Context

SECiD's Members section needs two distinct views: a lightweight public showcase and a rich dashboard for authenticated members. The current implementation uses a single `MemberDirectory` component for both, which is too complex for the public page and too limited for the dashboard.

The goal is to separate these into two focused components: a simple public showcase (company grid + member count) and a tabbed dashboard with interactive filters, charts, and a member data table.

## Public Members Page (`/es/members`, `/en/members`)

A simplified showcase section with no directory, no search, no filters.

### Content

1. **Company grid** — styled cards showing company name + colored initial avatar. Title: "Where do SECiD members work?"
2. **Member count footer** — "We have X members and counting!" Displays **members only** count (excludes collaborators)
3. **CTA** — existing "Join SECiD" section stays

### Component

- `MemberShowcase.tsx` — renders company grid and member count. Sources data from `getMemberStatistics()`, uses `totalMembers` for the count and `companies` for the grid (members-only companies).
- `MemberShowcasePage.tsx` — wrapper with AuthProvider. Astro page uses `client:load` (preserving current hydration behavior).
- Replaces current `MemberDirectoryPage` on the public Astro pages

### Empty state

If `companies.length === 0`, show a centered message: "No data available" with a retry button.

## Dashboard Members Page (`/es/dashboard/members/`, `/en/dashboard/members/`)

A tabbed analytics dashboard with three tabs. Astro page uses `client:only="react"` (preserving current hydration behavior).

### Tab 1: Overview

- **Summary stat cards** at top:
  - Total members — from `getMemberStatistics().totalMembers`
  - Online — from `getMemberStats().onlineMembers` (separate query, snapshot not live subscription)
  - New this month — from `getMemberStats().newMembersThisMonth` (separate query)
  - Top skill — derived from `getMemberStatistics().skillsDistribution[0].skill`
- **4 horizontal stacked bar charts**: composition by campus, degree, gender, generation
- **1 vertical bar chart**: initiative importance ratings (0-5 scale)
- Charts show **members only** (collaborators excluded)
- Charts always show the full member dataset (not affected by MembersTab filters)
- `roleComposition` is **not shown** on Overview — it's meaningless when filtered to members only

### Tab 2: Members

- **Filter bar** at top with full filter set:
  - Generation, campus, gender, degree level
  - Company, skills, experience level, professional status
  - Role: "Include collaborators" checkbox (unchecked by default)
  - Date range (joined), online status, mentorship availability
- **Sortable table** with columns: name, company, campus, generation, skills, status
- **Expandable rows** — click to reveal full member details inline:
  - Full name, bio
  - Email — shown only if `privacy.showEmail === true` on that member's profile (visible to all authenticated users)
  - Company + position, campus, generation, degree
  - Skills tags, social links (LinkedIn, GitHub)
  - Mentorship status, joined date
- Only one row expanded at a time; clicking another collapses the previous
- Chevron icon indicates expandability
- Data source: `getMemberProfiles({ limit: 200 })` — override default limit of 20 to ensure all members are loaded for client-side filtering

### Tab 3: Insights

- **Company grid** (same style as public page, members-only companies)
- **Skills distribution** — horizontal bar chart (top 10 skills)
- **Experience level breakdown** — bar chart
- **Professional status breakdown** — bar chart
- Each section guarded by empty-state check: if data array is empty, show "No data available" message

### Dashboard Components

| File                                                   | Purpose                                            |
| ------------------------------------------------------ | -------------------------------------------------- |
| `src/components/dashboard/members/MemberDashboard.tsx` | Dashboard shell — tab navigation                   |
| `src/components/dashboard/members/OverviewTab.tsx`     | Stat cards + composition charts + initiative chart |
| `src/components/dashboard/members/MembersTab.tsx`      | Filter bar + sortable table with expandable rows   |
| `src/components/dashboard/members/InsightsTab.tsx`     | Company grid + skills/experience/status breakdowns |
| `src/components/dashboard/members/MemberFilters.tsx`   | Shared filter bar component                        |
| `src/components/wrappers/MemberDashboardPage.tsx`      | Wrapper with AuthProvider                          |

## Data Layer

### `getMemberStatistics()` (reworked)

- Fetches all user documents from Firestore `users` collection
- Filters to `role === 'member'` by default (collaborators excluded from all aggregations including companies)
- Aggregates from these Firestore field paths:
  - `data.campus` → campus composition
  - `data.generation` → generation distribution
  - `data.registrationData?.gender` (fallback: `data.gender`) → gender composition
  - `data.registrationData?.maxDegree` (fallback: `data.academicLevel`) → degree composition
  - `data.profile?.company` (fallback: `data.currentCompany`) → company list
  - `data.skills` (fallback: `data.profile?.skills`) → skills distribution
  - `data.registrationData?.experienceLevel` → experience distribution
  - `data.registrationData?.professionalStatus` → professional status distribution
  - `data.registrationData?.priorities` → initiative importance averages (values are numeric strings "1"-"5")
- In the document loop, skip collaborators before aggregation: `if (data.role === 'collaborator') continue;` — only members are counted and aggregated
- Returns `MemberStatisticsData`
- `roleComposition` field is **removed** from the type — no longer needed
- The `isUsingMockAPI()` branch must also be updated: remove `totalCollaborators` and `roleComposition`, add stub arrays for `skillsDistribution`, `experienceDistribution`, and `professionalStatusDistribution`

### `getMemberStats()` (kept separate)

Still called by OverviewTab for `onlineMembers` and `newMembersThisMonth` stat cards. These require separate Firestore queries (`where('isOnline', '==', true)` and `where('createdAt', '>=', startOfMonth)`).

### `MemberStatisticsData` type (reworked)

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

Removed fields: `totalCollaborators`, `roleComposition`.

### Mapper update

Update `mapUserDocToMemberProfile()` in `mapper.ts` to surface raw Firestore fields needed for client-side filtering in MembersTab:

- `registrationData.experienceLevel` → use as `experience.level` with a mapping from Spanish Firestore values to the existing union: `"Principiante"` → `"junior"`, `"Intermedio"` → `"mid"`, `"Avanzado"` → `"senior"`, `"Experto"` → `"lead"`. Unknown values default to `"mid"`.
- `registrationData.professionalStatus` → surface as `professionalStatus?: string` (new optional field on `MemberProfile`)

### Member table data

Reuses `getMemberProfiles({ limit: 200 })` for the table. Filters applied client-side.

### Data source

Always real Firestore — no mock data fallback. Connected to production Firebase.

## Interaction Details

### Filters

- All filters are client-side (small dataset)
- Filters persist across tab switches within a session (shared state in `MemberDashboard`)
- Default: members only — collaborators hidden unless "Include collaborators" is checked
- Filters in MembersTab affect the table only. OverviewTab charts are unfiltered (always show full member dataset)

### Charts

- Recharts (already installed v2.12.0)
- Horizontal stacked bars for composition breakdowns
- Vertical bars with distinct colors for generation and initiative importance
- Horizontal bars for skills distribution (top 10)
- Dark mode: transparent backgrounds, `#6B7280` tick colors
- Color palette: slate tones for composition (`#7C9EB2`, `#2C4A5A`), distinct colors for vertical charts
- Each chart section guarded by empty-state check

### i18n

- All UI text: `lang === 'es' ? 'Spanish' : 'English'`
- Chart labels from Firestore (campus names, gender values) rendered as-is (Spanish) on both `/es/` and `/en/` pages
- Filter dropdown options show raw Firestore values (Spanish) on both locales — this is acceptable since the data is inherently Spanish (UNAM campus names, etc.)

## Files Modified

| File                                         | Change                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/es/members.astro`                 | Replace `MemberDirectoryPage` with `MemberShowcasePage` (`client:load`)                                                                                              |
| `src/pages/en/members.astro`                 | Same                                                                                                                                                                 |
| `src/pages/es/dashboard/members/index.astro` | Keep `DashboardLayout` with `requireVerified={true}`; replace inner `MemberDirectoryPage` with `MemberDashboardPage` (`client:only="react"`)                         |
| `src/pages/en/dashboard/members/index.astro` | Same                                                                                                                                                                 |
| `src/lib/members/queries.ts`                 | Rework `getMemberStatistics()` — members-only, add skill/experience/status aggregations                                                                              |
| `src/lib/members/mapper.ts`                  | Surface `registrationData.experienceLevel` and `registrationData.professionalStatus` on `MemberProfile`                                                              |
| `src/types/member.ts`                        | Rework `MemberStatisticsData` (remove roleComposition/totalCollaborators, add skills/experience/status arrays). Add `professionalStatus?: string` to `MemberProfile` |

## Files Created

| File                                                   | Purpose                                   |
| ------------------------------------------------------ | ----------------------------------------- |
| `src/components/directory/MemberShowcase.tsx`          | Public page — company grid + member count |
| `src/components/wrappers/MemberShowcasePage.tsx`       | Wrapper for public page                   |
| `src/components/dashboard/members/MemberDashboard.tsx` | Dashboard shell with tab navigation       |
| `src/components/dashboard/members/OverviewTab.tsx`     | Charts and stat cards                     |
| `src/components/dashboard/members/MembersTab.tsx`      | Filter bar + expandable table             |
| `src/components/dashboard/members/InsightsTab.tsx`     | Company grid + additional breakdowns      |
| `src/components/dashboard/members/MemberFilters.tsx`   | Shared filter bar                         |
| `src/components/wrappers/MemberDashboardPage.tsx`      | Wrapper for dashboard page                |

## Files Removed

| File                                              | Reason                                                     |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `src/components/directory/MemberStatistics.tsx`   | Replaced by dashboard tab components                       |
| `src/components/wrappers/MemberDirectoryPage.tsx` | Replaced by `MemberShowcasePage` and `MemberDashboardPage` |

Note: `MemberDirectory.tsx` kept — may be useful elsewhere or can be removed in a follow-up cleanup.

## Verification

1. `npm run check` — TypeScript compilation passes
2. Navigate to `/es/members` — see company grid and member count (public, no auth needed)
3. Log in, navigate to `/es/dashboard/members/` — see 3 tabs
4. Overview tab: 4 stat cards + 5 charts with real Firestore data
5. Members tab: filter bar, sortable table, expand a row to see details
6. Insights tab: company grid + skills/experience/status charts
7. Check "Include collaborators" in Members tab — table updates to include collaborators
8. Switch tabs — filters persist
9. Verify Overview charts are NOT affected by MembersTab filters
10. Verify dark mode on all tabs
11. Verify English version at `/en/members` and `/en/dashboard/members/`
12. Verify empty states render when data arrays are empty
