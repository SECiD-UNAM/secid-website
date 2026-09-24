# Company Showcase Redesign

**Date:** 2026-03-22
**Status:** Approved

## Problem

The current `MemberShowcase` component is a flat grid of company logo + name cards. No industry grouping, no historical companies, no stats, no hover details. It only shows current employers.

## Solution

Redesign `MemberShowcase` into a rich, interactive component with stats, industry grouping, current/historical toggle, sized cards, and hover popover cards. Two modes: public (no member details) and private (full member details).

## Design

### Stats Banner

Top of component. Four metrics in a horizontal bar:

- Total companies (current view)
- Number of industries
- Historical total (all-time companies)
- Total members

### Current / Historical Toggle

- **Actuales**: Companies where members currently work (from `profile.companyId`)
- **Historial completo**: All companies including past employers (from `experience.previousRoles[].companyId` + companies collection)
- Tab-style toggle, default to "Actuales"

### Industry Grouping

Companies grouped by `industry` field. Each group has:

- Colored dot + uppercase industry label
- Gradient fade line extending to the right
- Grid of company cards within the group

### Sized Cards

Cards proportional to member count:

- 3+ members: wider card (spans 2 columns) with logo, name, and member count
- 1-2 members: standard card with logo and name

### Hover Popover Card

On hover/click, show a floating card with:

**Public mode** (homepage, `/es/companies`):

- Company logo (large), name, industry, location
- Member count (number only, no names)
- Link to company website (external)
- Link to company profile page (internal)

**Private mode** (dashboard, `/es/dashboard/members`):

- Everything from public, plus:
- List of SECiD member names with avatars
- Link to each member's profile

### Data Flow

**Current companies**: Query `companies` collection (existing `getCompaniesWithMembers`)

**Historical companies**: Need a new query that:

1. Fetches all members' `experience.previousRoles`
2. Collects unique `companyId` values
3. Fetches those company docs
4. Merges with current companies, deduplicating
5. For each company: count how many members worked there (current + past)

### Component Props

```typescript
interface MemberShowcaseProps {
  lang?: 'es' | 'en';
  mode?: 'public' | 'private'; // default: 'public'
}
```

## Files to Modify

| File                                          | Change                               |
| --------------------------------------------- | ------------------------------------ |
| `src/components/directory/MemberShowcase.tsx` | Full rewrite with new design         |
| `src/lib/companies.ts`                        | Add `getHistoricalCompanies()` query |

## Out of Scope

- Company logo upload/management (already exists)
- Company profile page redesign
- Search/filter within the showcase
