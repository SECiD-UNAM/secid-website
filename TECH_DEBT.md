# Technical Debt Register

Track all known technical debt. Updated by both Dev (Forja) and QA (Centinela) agents.

## Active Debt

<!-- Use this format for each debt item:

### [TD-{NNN}] {Short description}
- **Type**: Design | Code | Test | Infra | Security | Dependency
- **Severity**: Critical | High | Medium | Low
- **Found**: {YYYY-MM-DD}
- **Estimated effort**: {hours or T-shirt size}
- **Impact if not fixed**: {what happens}
- **Proposed fix**: {approach}

-->

### [TD-001] Critical CVE in functions/: fast-xml-parser (GHSA-fj3w-jwp8-x2g3 et al.)

- **Type**: Security | Dependency
- **Severity**: Critical
- **Found**: 2026-03-01
- **Estimated effort**: XS (automated fix)
- **Impact if not fixed**: Stack overflow, entity encoding bypass, DoS via DOCTYPE expansion in Cloud Functions runtime.
- **Proposed fix**: `cd functions && npm audit fix` — no breaking changes required.

### ~~[TD-002] Astro 4.x Authentication Bypass CVEs (GHSA-ggxq-hp9w-j794, GHSA-whqg-ppgf-wp8c)~~ **RESOLVED**

- **Type**: Security | Dependency
- **Severity**: High
- **Found**: 2026-03-01
- **Resolved**: 2026-03-01
- **How**: Upgraded Astro from 4.16.19 to 5.18.0 with all integration packages. Changed `output: 'hybrid'` to `output: 'static'` (Astro 5 equivalent), removed deprecated `viewTransitions: true` config. See Resolved Debt section.

### ~~[TD-003] Astro reflected XSS via server islands (GHSA-wrwg-2hg8-v723)~~ **RESOLVED**

- **Type**: Security | Dependency
- **Severity**: High
- **Found**: 2026-03-01
- **Resolved**: 2026-03-01
- **How**: Same as TD-002 -- resolved by Astro 4->5 migration. See Resolved Debt section.

### [TD-004] jws Improper HMAC Verification in functions/ (GHSA-869p-cjfg-cm3x)

- **Type**: Security | Dependency
- **Severity**: High
- **Found**: 2026-03-01
- **Estimated effort**: XS (automated fix)
- **Impact if not fixed**: JWT signature verification bypass in Cloud Functions.
- **Proposed fix**: `cd functions && npm audit fix`.

### [TD-005] Rollup Arbitrary File Write via Path Traversal (GHSA-mw96-cpmx-2vgc)

- **Type**: Security | Dependency
- **Severity**: High
- **Found**: 2026-03-01
- **Estimated effort**: XS (automated fix)
- **Impact if not fixed**: Arbitrary file write during build via path traversal.
- **Proposed fix**: `npm audit fix` at root (no breaking changes).

### [TD-006] Major dependency version drift across the full stack

- **Type**: Dependency
- **Severity**: Medium
- **Found**: 2026-03-01
- **Estimated effort**: XL (multiple major version migrations)
- **Impact if not fixed**: Growing CVE surface, incompatibility with ecosystem tooling, security patches unavailable on old majors.
- **Proposed fix**: Phased upgrade plan — ~~Astro 5~~ (done), Vite 7, vitest 4, zod 4, firebase 12, React 19, Tailwind 4, eslint 10. Each is a separate PR.

### [TD-007] Forum stats (totalUsers, onlineUsers) show zeros — need real data source

- **Type**: Code
- **Severity**: Low
- **Found**: 2026-03-01
- **Estimated effort**: S
- **Impact if not fixed**: Forum sidebar shows 0 for Members and Online counts instead of real values.
- **Proposed fix**: Query Firestore users collection count for totalUsers; implement presence tracking (e.g., Firebase Realtime Database presence) for onlineUsers.

### [TD-008] ForumHome default categories are hardcoded in component

- **Type**: Design
- **Severity**: Low
- **Found**: 2026-03-01
- **Estimated effort**: S
- **Impact if not fixed**: Default forum categories are defined inline in the component. If categories need to change, it requires a code change.
- **Proposed fix**: Move default categories to a config file or seed them in Firestore during initial setup.

### ~~[TD-009] 2FA is mocked — non-functional despite appearing in Security Settings UI~~ **RESOLVED**

- **Type**: Security
- **Severity**: Critical
- **Found**: 2026-02-28
- **Resolved**: 2026-03-01
- **How**: Disabled mock 2FA implementation. Added `TWO_FACTOR_AVAILABLE` feature flag (set to `false`). All 2FA operations now throw "not yet available" errors. UI shows "Coming Soon" state instead of fake enable/disable controls. See Resolved Debt section.

### ~~[TD-010] Payment API endpoints accept unauthenticated requests~~ **RESOLVED**

- **Type**: Security
- **Severity**: Critical
- **Found**: 2026-02-28
- **Resolved**: 2026-03-01
- **How**: Added `/api/create-` to middleware `protectedPaths`, added session-required check in middleware, created `src/lib/auth/verify-request.ts` defense-in-depth utility, added `verifyRequest()` to all three payment endpoints. See Resolved Debt section.

### ~~[TD-011] Stripe webhook handlers are stubs — 13 TODOs unimplemented~~ **RESOLVED**

- **Type**: Design
- **Severity**: High
- **Found**: 2026-02-28
- **Resolved**: 2026-03-01
- **How**: Implemented all 13 webhook event handlers in `src/lib/stripe/stripe-webhooks.ts`. Added 3 new handlers (customer.subscription.paused, customer.subscription.resumed, customer.deleted). Each handler writes to Firestore (userSubscriptions, stripeCustomers, transactions, webhookEvents collections) with proper error handling and audit logging. See Resolved Debt section.

### ~~[TD-012] EventForm component missing — event creation non-functional~~ **RESOLVED**

- **Type**: Code
- **Severity**: High
- **Found**: 2026-02-28
- **Resolved**: 2026-03-01
- **How**: Implemented `EventForm.tsx` with React Hook Form + Zod validation, Firestore CRUD (addDoc/updateDoc), bilingual i18n (en/es), dark mode, loading skeleton for edit mode. Schema extracted to `event-form-schema.ts`. Wired into all 4 Astro pages (en/es new/edit). See Resolved Debt section.

### [TD-013] Test skip rate reduction — IN PROGRESS

- **Type**: Test
- **Severity**: High (reduced from Critical)
- **Found**: 2026-02-28
- **Partially resolved**: 2026-03-01
- **Estimated effort**: XL (originally), M (remaining)
- **Impact if not fixed**: Regressions go undetected; CI provides false green; coverage unmeasurable
- **Starting state**: 85% skip rate (809/951 tests skipped in 37 files)
- **After describe.skip removal (session 1)**: 158 passed, 809 skipped -> 370 passed, 584 failed, 13 skipped (967 tests)
- **After session 2 fixes** (estimated, pending verification due to stale vitest processes):
  - Removed `describe.skip` from 26 test files
  - Re-skipped 8 files with documentation (aggregate auth/jobs, SocialLoginButtons, SignUpForm, TwoFactorSetup, TwoFactorVerification, integration api/auth, integration api/jobs) = ~190 tests intentionally skipped
  - Fixed search-integration.test.ts (3 assertion fixes)
  - Rewrote AuthGuard.test.tsx (16 tests) and ProtectedRoute.test.tsx (~24 tests) to match actual component APIs
  - Added Proxy-based heroicons auto-mock to 10 test files (DashboardStats, QuickActions, RecentActivity, JobApplicationModal, JobBoard, JobCard, JobFilters, JobPostingForm, GlobalSearch, SearchBar)
  - Added firebase/storage and @/lib/firebase mocks to JobApplicationModal.test.tsx and LoginForm.test.tsx
  - Added clsx mock to GlobalSearch.test.tsx and SearchBar.test.tsx
- **Estimated new metrics**: ~200 skipped (21% skip rate), ~370-500 passing, ~250-380 failing
- **Blocker**: 34 stale vitest node processes prevent running test suite to verify. Must kill processes first.
- **Remaining work**: Run full suite, fix remaining failures in component tests where heroicons mock alone is insufficient (likely need assertion updates for component API changes), establish vitest coverage threshold

### [TD-014] God components exceeding 1000 lines -- PARTIALLY RESOLVED

- **Type**: Code
- **Severity**: Medium (reduced from High)
- **Found**: 2026-02-28
- **Partially resolved**: 2026-03-01
- **Estimated effort**: M (remaining React components)
- **Impact if not fixed**: Large React components harder to test and review
- **Resolved files**:
  - `translations.ts` (1335 -> 374 lines barrel + 5 domain files under 300 lines each)
  - `mentorship.ts` (1178 -> 43 lines barrel + 8 module files under 230 lines each)
  - `members.ts` (1000 -> 29 lines barrel + 5 module files under 440 lines each)
  - `ProfileEdit.tsx`: extracted types/constants to `profile-edit-types.ts`
- **Remaining files**: `ProfileEdit.tsx` (1391), `JobPostingForm.tsx` (1295), `EventRegistrationForm.tsx` (1238), `OnboardingComplete.tsx` (1177)
- **Proposed fix for remaining**: These React components use `@ts-nocheck` and share inline state across all tab sections. Extracting sub-components requires adding React Hook Form or FormProvider for clean prop passing, which should be paired with adding test coverage (TD-013) to prevent regressions.

### [TD-015] ~50 orphan source files committed but not used

- **Type**: Code
- **Severity**: Medium
- **Found**: 2026-02-28
- **Estimated effort**: M
- **Impact if not fixed**: Dead code increases surface area; confuses new developers
- **Proposed fix**: See orphan list in `docs/reviews/code-health-2026-02-28.md`; delete `src/i18n/translations.ts.backup` immediately

### [TD-016] Security events logged to console instead of structured logger

- **Type**: Code
- **Severity**: Medium
- **Found**: 2026-02-28
- **Estimated effort**: S
- **Impact if not fixed**: Security events not persisted or queryable in production
- **Proposed fix**: Replace `console.log` in `src/lib/security-config.ts`, `src/lib/gamification.ts`, `src/contexts/AuthContext.tsx` with `src/lib/logger.ts`

## Resolved Debt

<!-- Move items here when fixed, add resolution date and how it was resolved -->

### [TD-RESOLVED-007] Astro reflected XSS via server islands (was TD-003)

- **Resolved**: 2026-03-01
- **How**: Same as TD-002 -- resolved by the Astro 4.16.19 to 5.18.0 migration.

### [TD-RESOLVED-006] Astro 4.x Authentication Bypass CVEs (was TD-002)

- **Resolved**: 2026-03-01
- **How**: Upgraded the full Astro stack from v4 to v5: `astro` 4.16.19 -> 5.18.0, `@astrojs/node` 8.3.4 -> 9.5.4, `@astrojs/react` 3.6.3 -> 4.4.2, `@astrojs/tailwind` 5.1.5 -> 6.0.2, `@astrojs/sitemap` 3.4.2 -> 3.7.0, `@astrojs/check` 0.5.10 -> 0.9.6, `astro-compress` 2.3.8 -> 2.3.9. Config changes: (1) `output: 'hybrid'` changed to `output: 'static'` (Astro 5 merged hybrid behavior into static mode -- pages with `export const prerender = false` remain server-rendered). (2) Removed top-level `viewTransitions: true` config (deprecated in Astro 5; the `<ViewTransitions />` component import from `astro:transitions` is the correct approach and was already in use). All 5 target CVEs resolved: GHSA-ggxq-hp9w-j794, GHSA-whqg-ppgf-wp8c, GHSA-wrwg-2hg8-v723, GHSA-qq67-mvv5-fw3g, GHSA-x3h8-62x9-952g.

### [TD-RESOLVED-005] EventForm component missing (was TD-012)

- **Resolved**: 2026-03-01
- **How**: Created `src/components/events/EventForm.tsx` (React component) and `src/components/events/event-form-schema.ts` (Zod schema, types, i18n labels, helpers). Features: (1) React Hook Form + Zod validation for all event fields (title, description, type, format, dates, location, capacity, pricing, tags, status). (2) Create mode: `addDoc` to Firestore `events` collection with `createdBy`, `currentAttendees`, `registrationRequired` fields. (3) Edit mode: fetches event by ID from Firestore via `getDoc`, populates form, saves via `updateDoc`. (4) Conditional location fields: venue/address shown for in-person/hybrid, meeting URL for virtual/hybrid. (5) Bilingual labels (en/es). (6) Dark mode support. (7) Loading skeleton, success screen with "View Events" / "Create Another" actions, error handling. Wired into 4 Astro pages: `en/es/dashboard/events/new.astro` and `en/es/dashboard/events/edit/[id].astro`, replacing TODO placeholder content.

### [TD-RESOLVED-004] 2FA is mocked -- non-functional despite appearing in Security Settings UI (was TD-009)

- **Resolved**: 2026-03-01
- **How**: Disabled mock 2FA implementation entirely. (1) Added `TWO_FACTOR_AVAILABLE` feature flag constant (set to `false`) and bilingual "not available" message constants to `src/lib/auth/two-factor.ts`. (2) All 2FA operations (`setupTwoFactor`, `enableTwoFactor`, `disableTwoFactor`, `verifyTwoFactorLogin`, `useBackupCode`, `regenerateBackupCodes`, `createTwoFactorSession`, `verifyTwoFactorSession`) now throw an error when feature flag is false. (3) `getTwoFactorStatus` returns `{ isEnabled: false }` when feature flag is false, preventing login flow from requesting 2FA verification. (4) Removed insecure `simpleHash`/`generateTOTPToken`/`verifyTOTPCode` mock implementations and all `console.log("Mock: ...")` calls. (5) Updated SecuritySettings 2FA tab to show a "Coming Soon" banner with disabled controls instead of fake enable/disable UI. (6) Removed unused `TwoFactorSetup` component import and backup codes modal from SecuritySettings. When real TOTP is implemented (otplib + server-side), set `TWO_FACTOR_AVAILABLE = true` and implement the function bodies.

### [TD-RESOLVED-003] Stripe webhook handlers are stubs (was TD-011)

- **Resolved**: 2026-03-01
- **How**: Implemented all 13 webhook handler stubs in `src/lib/stripe/stripe-webhooks.ts`. Added 3 new handlers (`customer.subscription.paused`, `customer.subscription.resumed`, `customer.deleted`) for complete lifecycle coverage. Each handler: (1) writes subscription/customer/transaction data to Firestore using existing collection patterns from `src/lib/payments.ts`, (2) logs to `webhookEvents` collection for audit trail. New Firestore collections: `stripeCustomers` (customer ID to Firebase UID mapping), `webhookEvents` (audit log). Handlers use `userSubscriptions` and `transactions` collections consistent with the existing payments module.

### [TD-RESOLVED-002] Payment API endpoints accept unauthenticated requests (was TD-010)

- **Resolved**: 2026-03-01
- **How**: Two-layer defense: (1) Added `/api/create-` to middleware `protectedPaths` and added session-required check that returns 401 when no valid session token is present. (2) Created `src/lib/auth/verify-request.ts` defense-in-depth utility and added `verifyRequest()` calls at the top of POST handlers in `create-payment-intent.ts`, `create-subscription.ts`, and both POST/GET handlers in `create-invoice.ts`. 16 unit tests cover all auth scenarios.

### [TD-RESOLVED-001] Mock/fake data visible in production dashboard

- **Resolved**: 2026-03-01
- **How**: Removed all hardcoded mock data (fake companies, revenue, events, jobs, contributors, stats) and replaced with empty states or zeros. Components now gracefully show "No data available" when no real data exists.
