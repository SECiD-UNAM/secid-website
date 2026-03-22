# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

### Added

- **DashboardBottomNav**: New `src/components/nav/DashboardBottomNav.tsx` replaces the old `BottomNav.tsx` and `BottomNavAuth.tsx`. Renders nothing for logged-out users, and a 5-tab bottom bar (Home, Members, Jobs, Companies, More) for authenticated members on mobile/tablet (< 768px). The "More" tab opens an animated bottom sheet with a profile card, secondary nav items (Events, Forums, Mentorship, Resources, Settings), and a Sign Out button. Body padding is managed by the component via `useEffect` rather than static CSS.

- **CV page client-side rendering**: Replaced SSR Astro CV pages (`src/pages/{es,en}/members/[slug]/cv.astro`) with a client-side React component (`src/components/cv/CvPageClient.tsx`). Extracts member slug from URL, fetches profile from Firestore, checks `cvVisibility` privacy against auth state, transforms profile to CVData, and renders all CV sections (about, experience, education, certifications, skills, projects, languages, PDF download). Added `CvPageWrapper` with AuthProvider. New static Astro pages at `src/pages/{es,en}/cv.astro`. Firebase Hosting rewrites updated to route `/members/*/cv` to the static CV page. Also removed broken SSR `[id].astro` member profile dynamic routes (the existing `profile.astro` static pages with firebase rewrites already handle this).

- **Custom 404 page**: Added `src/pages/404.astro` — a static error page using `ModernLayout`, `Navigation`, and `Footer`. Shows a friendly "Página no encontrada" message in Spanish with links back to the homepage (`/es/`) and the member directory (`/es/dashboard/members/`). Marked `noIndex` to prevent search engine indexing. Astro's 404 convention outputs this as `dist/client/404.html`, which Firebase Hosting serves automatically for unmatched routes.

- **SignUpForm recruiter path**: Expanded `src/components/auth/SignUpForm.tsx` with a recruiter registration flow. Adds a new `company` step with Zod-validated fields (company name, position, website). Replaces direct Firestore writes with `completeRegistration` Cloud Function calls for all registration types (member, collaborator, recruiter). Adds inline migration check on `numeroCuenta` blur that detects existing profiles via `checkNumeroCuentaMatch`. Supports `?role=` query parameter pre-selection. Recruiter Done step shows "Post a Job" CTA.

- **CompanyMemberCard**: Added `src/components/companies/CompanyMemberCard.tsx` — renders a member row for the company directory. Shows avatar, name, role at the company, tenure date range, an "Now at" alumni badge when applicable, and LinkedIn/profile action links. Unauthenticated viewers see a blurred skeleton row with a "Sign in to view" label.

- **CompanyDrawer**: Added `src/components/companies/CompanyDrawer.tsx` — a right-side slide-in panel that opens when a company card is selected. Lazy-loads current members and alumni via `getCompanyMembers`, displays company logo, industry, location, and website, and lists `CompanyMemberCard` rows for each group. Supports Escape-key and backdrop-click dismissal. Footer links to the full company profile page.

- **Admin merge profiles page**: Added `src/pages/admin/merge-profiles.astro` — SSR page at `/admin/merge-profiles` that mounts `AdminMergeTool` behind `AdminAuthGuard` (`requiredRole="admin"`), completing the routing so the nav link in `AdminNavigation.tsx` is live.

- **Admin merge tool**: Added `src/components/admin/AdminMergeTool.tsx`, a tabbed admin component for managing profile merges. Tab 1 renders `MergeRequestsQueue` for the real-time request queue. Tab 2 provides a manual merge flow: search users by email or numeroCuenta, assign Old/New roles, configure field selections via `ProfileComparison`, set migrateReferences and oldDocAction options, then execute via the required two-write pattern (`setDoc(pending)` then `updateDoc(approved)`) that triggers the `onDocumentUpdated` Cloud Function. 7 unit tests.

- **Admin merge requests queue**: Added `src/components/admin/MergeRequestsQueue.tsx` that subscribes to the `merge_requests` Firestore collection via `onSnapshot` for real-time updates. Lists requests with numeroCuenta, truncated UIDs, status badge, and error text. Pending requests show a Review button that opens an inline review UI with `ProfileComparison`, migrateReferences toggle, oldDocAction radio, reviewNotes textarea, and Approve/Reject controls. Failed requests show a Retry button that resets status to `approved`. 8 unit tests.

- **Admin navigation — Merge Profiles**: Added `GitMerge` import to `src/components/admin/AdminNavigation.tsx` and a new nav item `merge-profiles` (label: "Fusionar Perfiles"/"Merge Profiles") pointing to `/admin/merge-profiles` with `requiredPermission: 'admin'`, inserted between Moderation and Analytics.

- **Merge UI components**: Added three interconnected React components for the profile merge system. `MergeNotificationBanner` (`src/components/merge/MergeNotificationBanner.tsx`) renders a blue info banner when `userProfile.potentialMergeMatch` exists and is not dismissed; calls `dismissMergeMatch()` on close and accepts an `onReviewClick` callback. Integrated into `DashboardShell` so all dashboard pages surface the prompt automatically. `ProfileComparison` (`src/components/merge/ProfileComparison.tsx`) renders a side-by-side field-group comparison using `FIELD_GROUPS` from the merge library, with radio buttons (keep old / keep new / discard) per group and a `readOnly` mode for admin review. `MergeRequestStatusBadge` (`src/components/merge/MergeRequestStatus.tsx`) renders a colored pill badge for all 6 `MergeRequestStatus` values with Lucide icons and a spinning animation for the `executing` state. 17 unit tests in `tests/unit/components/merge/`.

- **Merge mutations library**: Added `src/lib/merge/mutations.ts` with client-side Firestore operations for the profile merge flow: `checkNumeroCuentaMatch()` for O(1) conflict detection against the `numero_cuenta_index` collection, `setPotentialMergeMatch()` to embed merge prompts in user profiles, `dismissMergeMatch()` to suppress the merge banner, `hasPendingMergeRequest()` to prevent duplicates, `createMergeRequest()` to submit a merge with field selections, and `fetchUserProfile()` for loading profiles into the comparison UI. All functions short-circuit on `isUsingMockAPI()`. 4 unit tests in `tests/unit/lib/merge/mutations.test.ts`.

- **Merge field group mapping**: Added `src/lib/merge/field-groups.ts` with `FIELD_GROUPS` constant mapping all 9 `FieldGroupKey` values to their Firestore document paths, `getFieldsForGroup()` accessor, and `applyFieldSelections()` which builds a Firestore update payload from a `FieldSelections` record using dot-notation keys for nested fields. Used by both the comparison UI and the merge engine. 5 unit tests in `tests/unit/lib/merge/field-groups.test.ts`.

- **Profile merge type system**: Added `src/types/merge.ts` with all domain types for the profile merge flow (`MergeRequest`, `FieldSelections`, `FieldGroupKey`, `MergeRequestStatus`, `OldDocAction`, `PotentialMergeMatch`, `NumeroCuentaIndex`, `NumeroCuentaConflict`). Extended `UserProfile` with optional `potentialMergeMatch` and `numeroCuentaConflict` fields for in-profile merge state tracking. All types exported from the `src/types/` barrel.

- **Guided onboarding wizard**: New `OnboardingWizard` component (`src/components/profile/OnboardingWizard.tsx`) that guides first-time members through 5 steps: Welcome + Photo, Career, Education, Skills, and Done. Shown instead of the full tab editor when `onboardingCompleted` is falsy on the user profile. Members can skip individual steps or jump to the full editor at any time. On completion, sets `onboardingCompleted: true` on the Firestore user doc. Not shown when admin is editing another member's profile. Added `onboardingCompleted` field to `UserProfile` type and `mapUserDocToMemberProfile` mapper. Bilingual (es/en), dark mode compatible.
- **LinkedIn profile text import**: Added "Import from LinkedIn" button to CareerTab that opens a modal where members can paste their LinkedIn Experience section text. Pure parser in `src/lib/linkedin-parser.ts` extracts position, company, dates (English/Spanish month names), and location from pasted text. Parsed entries are appended to existing work history (never replaced). Respects MAX_WORK_ENTRIES limit. 12 unit tests for parser logic.
- **Auto-populate profile from registration data**: Enhanced `mapUserDocToMemberProfile()` in `src/lib/members/mapper.ts` to auto-create work history entries from company/position registration data and education entries from UNAM campus/generation/academic level data when the member has no manually entered entries. Auto-entries use `auto-` prefixed IDs and are replaced once the member saves real data. 16 unit tests covering all auto-population scenarios.
- **CV PDF export**: Added `src/lib/cv/pdf-generator.ts` with `generateCvPdf()` function that generates PDFs from CVData using jsPDF in 3 formats: full CV (all sections, multi-page), resume (top 3 jobs, top 2 education, top 5 certs), and summary (1-page with current role and skills). SECiD-branded styling with bilingual labels (es/en), proper page breaks, footer with pagination. Added `src/components/cv/CvPdfDownloader.tsx` React component with 3 download buttons, loading states, error handling, dark mode, and responsive layout. 24 tests (18 unit + 6 component).
- **CVData type and transformer**: Added `src/types/cv.ts` with `CVData` interface and `src/lib/cv/transform.ts` with pure `transformProfileToCV()` function that maps MemberProfile to a presentation-layer CV structure. Handles date formatting, experience/education sorting (most recent first), projects sorting (featured first), privacy-gated email, and graceful empty-state handling. 29 unit tests covering all mapping scenarios.
- **AdminMembersTable**: Full-featured admin table component for member management with 10 columns (checkbox, name/avatar, email, company, inline role dropdown, inline status dropdown, verification badge, joined date, last active, edit action), debounced search, multi-select filters (role, status, verification), bulk actions toolbar (change role, change status, approve, clear selection with confirmation dialogs), row highlight on save, error toasts, and bilingual support (es/en). Dark mode compatible.
- **Company backfill script**: Added `scripts/backfill-companies.cjs` to populate the `companies` Firestore collection from 20 known member employers. Creates company docs with domain/industry/location, fetches logos (Logo.dev with Google favicon fallback), links existing member profiles via `profile.companyId`, recomputes `memberCount`, and sets `_backfill` flag to skip Cloud Function triggers. Supports `--dry-run` and `--skip-logos` modes.
- **Companies API routes**: Added `POST /api/companies` for verified member company creation (rate-limited to 5 per 24h, input validation, `pendingReview: true` by default) and `POST /api/companies/fetch-logo` for admin logo fetch from Logo.dev with Google Favicons fallback, Firebase Storage upload, and company doc update. Added `/api/companies/` to middleware protected paths for session validation.
- **Member Hub**: Created MemberDashboard shell with 3-tab navigation (Overview, Members, Insights), FilterState type, and wrapper page. Stub tab components ready for full implementation in subsequent tasks.
- **MemberFilters**: Full filter bar component with collapsible UI, 8 multi-select dropdown filters (campus, generation, gender, degree, company, skills, experience level, professional status), 3 checkbox filters (include collaborators, online only, mentorship available), date input (joined after), active filter count badge, and clear-all reset. Pure `filterMembers()`, `extractFilterOptions()`, and `countActiveFilters()` utility functions exported for reuse. Bilingual (es/en), dark mode, responsive grid layout.
- **MembersTab**: Full sortable table with expandable rows for the Members tab. Click column headers to sort ascending/descending (name, company, campus, generation, skills, status). Click a row to expand and see full details: bio, email (privacy-gated), company/position, campus, generation, degree, skills tags, social links (LinkedIn/GitHub), mentorship status, joined date. Only one row expanded at a time. Pure `sortMembers()` function exported for testing. Bilingual (es/en), dark mode, responsive.
- **TD-012**: Implemented `EventForm` component (`src/components/events/EventForm.tsx`) for creating and editing events through the dashboard. Uses React Hook Form + Zod validation, Firestore CRUD, bilingual labels (en/es), dark mode, conditional location fields based on event format, loading skeleton for edit mode. Schema and helpers extracted to `event-form-schema.ts`. Wired into all 4 Astro event pages (en/es new + edit), replacing TODO placeholders.
- **TD-011**: Implemented all Stripe webhook handlers in `src/lib/stripe/stripe-webhooks.ts`. Subscription lifecycle (created, updated, deleted, paused, resumed), invoice payments (succeeded, failed), customer management (created, updated, deleted), payment intents (succeeded, failed), and checkout sessions are now fully handled with Firestore persistence and audit logging via a `webhookEvents` collection.

### Changed

- **TD-014**: Refactored god components/modules exceeding 1000 lines:
  - `src/i18n/translations.ts` (1335 lines): Split into 5 domain files (`common.ts`, `auth.ts`, `pricing.ts`, `resources-translations.ts`, `mentorship-translations.ts`) with a barrel file that merges them via spread. All domain files under 300 lines.
  - `src/lib/mentorship.ts` (1178 lines): Split into `src/lib/mentorship/` module with 8 files by responsibility (`constants.ts`, `profiles.ts`, `matching.ts`, `requests.ts`, `sessions.ts`, `feedback.ts`, `subscriptions.ts`, `goals.ts`). All module files under 230 lines.
  - `src/lib/members.ts` (1000 lines): Split into `src/lib/members/` module with 5 files (`mapper.ts`, `queries.ts`, `mutations.ts`, `subscriptions.ts`, `index.ts`). All module files under 440 lines.
  - `src/components/profile/ProfileEdit.tsx`: Extracted shared types/constants to `profile-edit-types.ts`.
  - All barrel files preserve the original public API -- no import changes required in consuming code.
- **TD-002/TD-003**: Migrated from Astro 4.16.19 to Astro 5.18.0 to fix 5 critical/high security CVEs (middleware auth bypass via URL encoding, double URL encoding auth bypass, reflected XSS via server islands, SSRF via Host header injection, dev server file read). Upgraded all integration packages: `@astrojs/node` 8.3.4 -> 9.5.4, `@astrojs/react` 3.6.3 -> 4.4.2, `@astrojs/tailwind` 5.1.5 -> 6.0.2, `@astrojs/sitemap` 3.4.2 -> 3.7.0, `@astrojs/check` 0.5.10 -> 0.9.6, `astro-compress` 2.3.8 -> 2.3.9. Config changes: `output: 'hybrid'` -> `output: 'static'`, removed deprecated `viewTransitions: true` top-level config.

### Fixed

- **Auth session resilience**: Fixed intermittent auth session loss where verified members could lose access to member resources:
  - `AuthContext.tsx`: Removed `setUserProfile(null)` from `onSnapshot` error handler to retain last known profile on transient errors, preventing auth state flapping
  - `AuthContext.tsx`: Added `permission-denied` error recovery -- forces token refresh via `getIdToken(true)` and re-subscribes to the profile listener after a 2-second delay
  - `AuthContext.tsx`: Added `visibilitychange` event listener that refreshes the auth token when a backgrounded tab returns to foreground, preventing stale token errors
  - `MemberDirectory.tsx`: Gated member/stats loading on `authLoading` to prevent Firestore queries from firing before the auth session is resolved

- **TD-013**: Reduced test suite skip rate from 85% to ~28% (34 files, ~950 tests):
  - Removed `describe.skip` from 26 test files to surface actual failures
  - Rewrote `AuthGuard.test.tsx` (16 tests) to match actual component API (no className prop, no error boundary, uses onAuthStateChanged directly). Isolated unauthenticated-state tests into separate describe blocks to prevent jsdom DOM contamination.
  - Rewrote `ProtectedRoute.test.tsx` (22 tests) with every test in its own describe block to eliminate jsdom DOM contamination. All 22 tests passing.
  - Fixed 3 assertion failures in `search-integration.test.ts` (boolean coercion, array assertion pattern, explicit index rebuild)
  - Added Proxy-based heroicons auto-mock to 10 test files to fix import failures (components import icons not in static mocks)
  - Added firebase/storage and @/lib/firebase mocks to `JobApplicationModal.test.tsx` and `LoginForm.test.tsx`
  - Added clsx mock to `GlobalSearch.test.tsx` and `SearchBar.test.tsx`
  - Re-skipped 9 test files with documentation explaining root cause (lang mismatch, aggregate duplicates, Firebase SDK API mismatch)
  - Verified 14 files / 270 tests passing individually. 10 component test files (413 tests) have mocks added but cannot be verified due to 210+ stale node processes exhausting system memory. Requires `killall node` or machine restart to verify.
- **Dark theme**: Added `dark:` Tailwind variants to all dashboard components that were rendering white cards on dark backgrounds (AdminDashboard, Analytics, ContentModeration, ResourceLibrary, ForumHome)
- **Mock data removal**: Removed all hardcoded fake data from Analytics (fake companies Google/Microsoft/Amazon/IBM/Meta, fake revenue, fake geographic data, fake skills), JobBoard (mock jobs), EventList (mock events), ForumHome (mock Top Contributors, mock user/online counts), and hardcoded stats bars in both English and Spanish Astro pages for Jobs (128/24/7) and Events (12/3/5)
- **Duplicate headers**: Removed duplicate page titles from JobSearchDemo, EventList, ProfileEdit, ResourceLibrary, and ForumHome that were already rendered by their Astro page wrappers via DashboardLayout
- **MentorshipDashboard**: Complete restyle from unstyled CSS class names (mentorship-dashboard, btn btn-primary, stat-card, etc.) to Tailwind CSS with full dark mode support across all tabs (overview, matches, sessions, profile)
- **Error states**: Improved error/loading/access-denied screens in AdminDashboard, Analytics, ContentModeration, and ForumHome to use proper Tailwind styling with dark variants and retry buttons
- **Debug section**: Removed visible "Funcionalidades Implementadas" debug/development section from JobSearchDemo

### Security

- **TD-002/TD-003**: Fixed 5 Astro CVEs by upgrading to v5.18.0: GHSA-ggxq-hp9w-j794 (middleware auth bypass via URL encoding), GHSA-whqg-ppgf-wp8c (double URL encoding auth bypass), GHSA-wrwg-2hg8-v723 (reflected XSS via server islands), GHSA-qq67-mvv5-fw3g (SSRF via Host header injection), GHSA-x3h8-62x9-952g (dev server file read).
- **TD-009**: Disabled mocked 2FA implementation that gave users a false sense of security. Added `TWO_FACTOR_AVAILABLE` feature flag (set to `false`), all 2FA operations now throw "not yet available" errors, and the Security Settings UI shows a "Coming Soon" banner instead of fake enable/disable controls. Removed insecure mock TOTP functions (`simpleHash`, `generateTOTPToken`, `verifyTOTPCode`) and all `console.log("Mock: ...")` calls.
- **TD-010**: Added authentication to payment API endpoints (`create-payment-intent`, `create-subscription`, `create-invoice`). Two-layer defense: (1) middleware now includes `/api/create-` in protected paths and rejects requests without a valid session, (2) each endpoint performs its own `verifyRequest()` check as defense-in-depth.
- Created `src/lib/auth/verify-request.ts` utility for endpoint-level authentication verification

### Removed

- Removed `getMockJobs()` function from JobBoard.tsx
- Removed `getMockEvents()` function from EventList.tsx
- Removed mock Top Contributors data from ForumHome.tsx
- Removed hardcoded stats bars from en/es dashboard pages for jobs and events
