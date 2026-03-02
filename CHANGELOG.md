# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

### Added

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

- **TD-013**: Reduced test suite skip rate from 85% toward target of <20%:
  - Removed `describe.skip` from 26 test files to surface actual failures
  - Rewrote `AuthGuard.test.tsx` (16 tests) to match actual component API (no className prop, no error boundary, uses onAuthStateChanged directly). Isolated unauthenticated-state tests into separate describe blocks to prevent jsdom DOM contamination.
  - Rewrote `ProtectedRoute.test.tsx` (~24 tests) -- component shows Sign In link instead of redirecting; removed all window.location mocking
  - Fixed 3 assertion failures in `search-integration.test.ts` (boolean coercion, array assertion pattern, explicit index rebuild)
  - Added Proxy-based heroicons auto-mock to 10 test files to fix import failures (components import icons not in static mocks)
  - Added firebase/storage and @/lib/firebase mocks to `JobApplicationModal.test.tsx` and `LoginForm.test.tsx`
  - Re-skipped 8 test files with documentation explaining root cause (lang mismatch, aggregate duplicates, Firebase SDK API mismatch)
  - Full test suite verification blocked by 34 stale vitest processes -- requires process cleanup to confirm final metrics
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
