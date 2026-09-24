# Handoff: Member Statistics Views + Companies Collection

**Created:** 2026-03-21
**Project:** /Users/artemiopadilla/Documents/repos/GitHub/secid/secid-website
**Branch:** `feature/hub`
**Status:** Two major features complete, next feature ready to start

---

## Current State Summary

Two major features were built and deployed to beta.secid.mx in this session:

### Feature 1: Member Statistics Views (Complete)

Separated the Members section into a public showcase and a dashboard with 3 tabs.

- **Public page** (`/es/members`): `MemberShowcase` — company grid + member count
- **Dashboard** (`/es/dashboard/members/`): `MemberDashboard` with 3 tabs:
  - **Overview** (OverviewTab): 4 stat cards + 5 composition/initiative charts (Recharts)
  - **Members** (MembersTab): filter bar (12 filters) + sortable table with expandable rows, email column, social links column
  - **Insights** (InsightsTab): company grid + skills/experience/status distribution charts
- Data comes from `getMemberStatistics()` (members-only, excludes collaborators) and `getMemberStats()`
- 69 tests passing (MemberFilters 32, MembersTab 13, CompanyLogo 16, backfill 8)

### Feature 2: Companies Collection (Complete, pending backfill)

Added a `companies` Firestore collection with logo support.

- **Type**: `src/types/company.ts` (Company, CompanyCreateInput, CompanyUpdateInput)
- **Queries/Mutations**: `src/lib/companies/` (getCompanies, getCompaniesWithMembers, createCompany, etc.)
- **CompanyLogo component**: `src/components/shared/CompanyLogo.tsx` (img + fallback avatar)
- **Admin UI**: `/es/dashboard/admin/companies` (table, review queue, add/edit/delete, fetch logo)
- **API routes**: `POST /api/companies` (member creation, rate-limited), `POST /api/companies/fetch-logo` (admin, Logo.dev + favicon fallback)
- **Cloud Function**: `onMemberCompanyChange` in `functions/src/companies.ts` (memberCount sync)
- **Backfill script**: `scripts/backfill-companies.cjs` (21 companies mapped, --dry-run supported)
- **Security**: Firestore rules (members create with pendingReview, admins moderate), Storage rules (2MB, image-only)
- **NOT YET RUN**: The backfill script needs to be executed against production to populate companies with logos

### Additional fixes applied:

- Privacy defaults changed: all info visible to members, hidden from public
- Admin override: admins/moderators see all contact info regardless of privacy
- CAPTCHA requirement removed from deploy (was blocking all deploys)
- Social links mapper fixed to read from `profile.linkedin` and `registrationData.socialMedia`
- Prettier formatted entire codebase (304 files)
- `prerender = false` added to API routes

---

## What Needs to Happen Next

### Immediate: Run backfill

```bash
firebase login --reauth  # if token expired
node scripts/backfill-companies.cjs --dry-run  # review mapping
node scripts/backfill-companies.cjs  # execute (needs LOGO_DEV_API_TOKEN env var, optional)
```

### Next Feature: Full Profile Editor + Work History + Admin Member Management

This was agreed upon as the next build. It combines 3 features into 2:

**Feature A: Member Profile Editor + Work History**
Members can edit their full profile including work history. Combines the original "member profile editing" and "career track / work history" (Subsystems #2 and #3 from the roadmap).

Includes:

- Edit basic info (bio, location, skills, social links, privacy settings)
- Manage work history (add/edit/remove positions linked to companies collection)
- Upload profile photo
- Set privacy preferences

**Feature B: Admin Member Management**
Admins can edit any member's profile + have bulk/management operations.

Includes:

- Admins use the same profile editor but can access any member's profile
- Separate admin panel for bulk actions, role changes, status management, approval workflows

**Order**: Build A first, then B (B reuses A's profile editor).

---

## Important Context

### Firestore Schema (per member document)

Top-level fields: `role`, `campus`, `generation`, `academicLevel`, `numeroCuenta`, `skills`, `email`, `displayName`

Nested:

- `profile`: `{ firstName, lastName, bio, company, companyId, position, location, linkedin, skills, photoURL, graduationYear, degree, specialization }`
- `registrationData`: `{ gender, professionalStatus, maxDegree, experienceLevel, priorities: { bolsaTrabajo, hackatones, ... }, socialMedia: { linkedin, github, twitter, facebook, instagram }, phone, cvUrl, cvHighlights, birthDate }`
- `privacySettings`: `{ profileVisible, contactVisible, jobSearching, mentorshipAvailable }`
- `lifecycle`: `{ status, statusChangedAt, statusHistory, lastActiveDate }`

### Companies Collection

- `companies/{id}`: `{ name, domain, logoUrl?, industry?, location?, website?, description?, memberCount, createdBy, pendingReview, ... }`
- Members link via `profile.companyId`
- `WorkExperience` has optional `companyId` field (added but not yet used in UI)

### Key Patterns

- i18n: `lang === 'es' ? 'Spanish' : 'English'` (no i18next in components)
- Auth: `useAuth()` hook returns `{ user, isAdmin, isModerator, isVerified, userProfile }`
- Privacy: `getVisibleFields(member, viewerUid, viewerRole)` in `src/lib/members/connections.ts`
- Mapper: `mapUserDocToMemberProfile()` in `src/lib/members/mapper.ts` converts flat Firestore → typed MemberProfile
- Dashboard pages: `DashboardLayout` with `requireVerified={true}`, component loaded via `client:only="react"`
- API routes: need `export const prerender = false;` at top

### Existing Profile Page

- `src/pages/es/dashboard/profile/index.astro` exists (check current state)
- `src/components/profile/` may have existing profile components

---

## Critical Files

### Types

- `src/types/member.ts` — MemberProfile, MemberStatisticsData, WorkExperience
- `src/types/user.ts` — UserProfile (base type with profile block)
- `src/types/company.ts` — Company, CompanyCreateInput

### Data Layer

- `src/lib/members/queries.ts` — getMemberStatistics, getMemberStats, getMemberProfiles
- `src/lib/members/mutations.ts` — updateMemberProfile
- `src/lib/members/mapper.ts` — mapUserDocToMemberProfile (Firestore → typed)
- `src/lib/members/connections.ts` — getVisibleFields (privacy logic)
- `src/lib/companies/` — company CRUD operations

### Components

- `src/components/dashboard/members/` — MemberDashboard, OverviewTab, MembersTab, InsightsTab, MemberFilters
- `src/components/directory/MemberShowcase.tsx` — public company grid
- `src/components/shared/CompanyLogo.tsx` — reusable logo component
- `src/components/dashboard/admin/CompanyManagement.tsx` — admin companies UI

### Specs and Plans

- `docs/superpowers/specs/2026-03-20-member-statistics-views-design.md`
- `docs/superpowers/specs/2026-03-20-companies-collection-design.md`
- `docs/superpowers/plans/2026-03-20-member-statistics-views.md`
- `docs/superpowers/plans/2026-03-20-companies-collection.md`

### Subsystem Roadmap (from companies spec)

1. Companies collection + logos — **DONE**
2. Work history + companyId linking — **NEXT** (combined with profile editor)
3. CV upload + auto-extract — Future
4. Member CV pages — Future (template exists)

---

## Potential Gotchas

- **Deploy requires no CAPTCHA secrets** — we removed the requirement. If someone re-adds it, deploys will break again.
- **API routes need `export const prerender = false`** — Astro's hybrid mode defaults to static. API routes must opt out.
- **Firestore emulator has no data** — local dev requires connecting to production Firebase or seeding. `isUsingMockAPI()` returns false when `PUBLIC_FIREBASE_API_KEY` is set in `.env.local`.
- **`registrationData` fields are not on typed interfaces** — gender, maxDegree, priorities, socialMedia are accessed via raw Firestore data in queries.ts but not typed on MemberProfile. The mapper reads them but doesn't surface all of them.
- **`campus` and `generation` are on UserProfile** but accessed as top-level fields in Firestore. The mapper doesn't explicitly map them — they come through on the base `UserProfile` type.
- **Companies backfill not yet run** — the companies collection is empty in production until `scripts/backfill-companies.cjs` is executed.
- **Fernando Raúl Garay** was changed from member to collaborator (no campus data).
- **"BBVA" vs "Bbva"** — backfill script handles case normalization for company matching.
