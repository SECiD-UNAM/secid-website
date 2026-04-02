# Shared EcosystemMap Component

**Date:** 2026-03-23
**Status:** Approved
**Approach:** A — Promote CompanyLandscape to shared, convert to Tailwind

## Problem

The members page (`/es/members/`) should display the same industry-grouped company visualization ("map") that exists on the companies page (`/es/companies/`). Currently:

- **Companies page** has a working `CompanyLandscape` component (inline styles) that groups companies by industry with hover cards and current/all toggle.
- **Members page** has a `MemberShowcase` component with ~860 lines of dead visualization code — its success render only shows a title and a link to the companies page. Data loading also fails, showing "No hay datos disponibles."

Two components doing the same thing, one works, one doesn't.

## Solution

Create a single shared `EcosystemMap` component by promoting `CompanyLandscape`, converting inline styles to Tailwind, and using it on both pages.

## New Component

### `src/components/shared/EcosystemMap.tsx`

**Props:**

```ts
interface EcosystemMapProps {
  companies: Company[];
  onCompanyClick?: (company: Company) => void;
  lang?: 'es' | 'en';
}
```

**Click behavior:** When `onCompanyClick` is provided, company pills are `<button>` elements calling the handler. When omitted, pills render as `<a>` links navigating to `/{lang}/companies/{slug}`.

**Behavior (preserved from CompanyLandscape):**

- Groups companies by industry using `translateIndustry()` for i18n
- Stats header: company count, industry count, member connections, UNAM badge
- Current/All toggle to filter companies with `memberCount > 0` vs all
- Industry cards with color-coded headers (same `INDUSTRY_COLORS` mapping)
- Company pills with logo + name, opacity reduced for zero-member companies
- Hover card showing company name, industry, location, member count, website
- Responsive grid: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`
- Footer with legend when in "all" mode
- Dark mode via Tailwind `dark:` prefix

**Changes from CompanyLandscape:**

- All inline styles converted to Tailwind classes
- CSS custom properties (`var(--card-bg)`, etc.) replaced with Tailwind dark mode utilities
- Optional `onCompanyClick` (companies page passes it for drawer, members page omits it)

**No new dependencies.** Uses existing `CompanyLogo` and `translateIndustry`.

## Page Integration

### Members page

- `MemberShowcasePage.tsx` wrapper unchanged (provides AuthProvider)
- `MemberShowcase.tsx` gutted from ~860 lines to a simple component:
  - Fetches companies via `getCompanies()` on mount
  - Filters out `pendingReview` companies, sorts by `memberCount`
  - Renders `<EcosystemMap companies={companies} lang={lang} />`
  - Loading skeleton and error/retry state preserved
- No `onCompanyClick` — pills link to company profile pages instead

### Companies page

- `CompanyList.tsx` swaps `CompanyLandscape` import for `EcosystemMap`
- Passes `onCompanyClick` to open the existing drawer
- List view, search, industry filter, drawer — all unchanged

## Deleted Files

- `src/components/companies/CompanyLandscape.tsx` — replaced by `EcosystemMap`

## Files Changed

| File                                            | Action                         |
| ----------------------------------------------- | ------------------------------ |
| `src/components/shared/EcosystemMap.tsx`        | Create (from CompanyLandscape) |
| `src/components/companies/CompanyLandscape.tsx` | Delete                         |
| `src/components/companies/CompanyList.tsx`      | Update import                  |
| `src/components/directory/MemberShowcase.tsx`   | Rewrite (gut dead code)        |

## Deferred: Private Mode

`MemberShowcase` has a `mode: 'public' | 'private'` prop that, in private mode, fetches member profiles and shows avatars inside hover cards. Currently `MemberShowcasePage` defaults to `public` so no functionality is lost. Adding a `members?: MemberInfo[]` prop to `EcosystemMap` for private-mode hover cards is a future enhancement.

## INDUSTRY_COLORS Reconciliation

`CompanyLandscape` maps both Spanish and English keys (e.g. `'Tecnología'` and `'Technology'`). It also lacks `'Fintech'` and `'Conglomerado'` which exist in the Firestore data. The new component must include all industry keys present in both the old mapping and the live data.

## Testing

**Manual verification:**

- Verify companies page landscape view works identically (visual regression)
- Verify members page shows the ecosystem map with real data
- Verify hover cards, current/all toggle, industry grouping on both pages
- Verify dark mode and responsive behavior
- Verify CompanyDrawer still opens from companies page
- Verify pills link to company profiles on members page

**Unit tests (`tests/unit/components/shared/EcosystemMap.test.tsx`):**

- Renders industry groups from company data
- Current/All toggle filters companies with `memberCount > 0`
- Calls `onCompanyClick` when provided
- Renders `<a>` links when `onCompanyClick` is omitted
- Handles empty company list gracefully
