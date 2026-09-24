# Code Health Scan: SECiD Website

**Date**: 2026-02-28
**Reviewer**: Centinela (QA Agent)
**Scope**: `src/` directory — all .ts, .tsx, .astro files
**Branch**: feature/hub

---

## Summary

The codebase has a significant volume of functional code but carries substantial dead code (orphan components, unused imports, a committed backup file), widespread Clean Code violations (god-component files exceeding 1,000 lines), critical missing authentication on payment API endpoints, and a near-useless test suite (85% skipped). These issues together block a production release.

---

## 1. Dead Code Scan

### 1.1 Commented-Out Code Blocks (3+ consecutive lines)

Two confirmed blocks of commented-out code with code indicators:

| Location                                    | Lines   | Content                                                                     |
| ------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| `src/types/index.ts:243-245`                | 3 lines | Re-export comment block with code-like content                              |
| `src/components/admin/Settings.tsx:302-304` | 3 lines | `// TODO: Uncomment when cloud function is ready` — commented-out call site |

### 1.2 Unused Imports (confirmed by manual analysis)

| File                                                     | Line | Unused Identifier             | Confirmed                            |
| -------------------------------------------------------- | ---- | ----------------------------- | ------------------------------------ |
| `src/lib/newsletter-archive.ts`                          | 2    | `where` (firebase/firestore)  | YES — zero calls to `where(` in file |
| `src/lib/auth/oauth-providers.ts`                        | 13   | `setDoc` (firebase/firestore) | YES — only on import line            |
| `src/components/commissions/BaseCommissionDashboard.tsx` | 4    | `Bar` (recharts)              | YES — zero `<Bar` in JSX             |
| `src/components/commissions/MLDashboard.tsx`             | 5    | `Bar` (recharts)              | YES — zero `<Bar` in JSX             |

Note: `type CommissionMetrics`, `type User`, `type Unsubscribe`, `type UserProfile`, `type BlogPost`, `type BlogFilters`, `type NewsletterIssue`, `type FirebaseApp`, `type Analytics` are TypeScript type-only imports that may be erased at compile time — they are low-priority but should be reviewed.

### 1.3 TODO/FIXME/HACK/XXX Comments Without Issue References

All 25 TODOs found lack GitHub issue references. High-priority ones:

| File                                            | Line    | Comment                                                                    |
| ----------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `src/lib/stripe/stripe-webhooks.ts`             | 80–82   | TODO: Update user record, send welcome email, grant premium features       |
| `src/lib/stripe/stripe-webhooks.ts`             | 118–129 | TODO: 7 missing webhook handlers (cancellation, reactivation, plan change) |
| `src/lib/stripe/stripe-webhooks.ts`             | 147–149 | TODO: Free tier downgrade, email, reactivation                             |
| `src/lib/stripe/stripe-webhooks.ts`             | 175–176 | TODO: Extend subscription, send receipt                                    |
| `src/lib/stripe/stripe-webhooks.ts`             | 204–205 | TODO: Payment retry notification, feature limiting                         |
| `src/lib/stripe/stripe-webhooks.ts`             | 249–280 | TODO: 6 more missing handlers                                              |
| `src/components/admin/Settings.tsx`             | 303     | TODO: Uncomment when cloud function ready                                  |
| `src/components/admin/UserManagement.tsx`       | 244     | TODO: Add to activity log                                                  |
| `src/lib/mentorship.ts`                         | 613     | TODO: compound query for menteeId                                          |
| `src/pages/en/dashboard/events/new.astro`       | 87      | TODO: Implement EventForm component                                        |
| `src/pages/en/dashboard/events/edit/[id].astro` | 104     | TODO: Implement EventEditForm component                                    |
| `src/pages/es/dashboard/events/new.astro`       | 87      | Duplicate of above                                                         |
| `src/pages/es/dashboard/events/edit/[id].astro` | 104     | Duplicate of above                                                         |

### 1.4 Orphan Files (not imported by any other file)

The following 50 source files have no detected import chain from any page or layout. Many are components that exist but are never rendered:

**Orphan Components (never rendered):**

- `src/components/admin/AdminNavigation.tsx`
- `src/components/analytics/AnalyticsDashboard.tsx`
- `src/components/assessment/AssessmentResults.tsx`
- `src/components/assessment/QuizEngine.tsx`
- `src/components/auth/AuthGuard.tsx`
- `src/components/auth/DashboardAuthWrapper.tsx`
- `src/components/directory/NetworkingHub.tsx`
- `src/components/error/ErrorBoundary.tsx`
- `src/components/gamification/BadgeSystem.tsx`, `Leaderboard.tsx`, `PointsTracker.tsx`, `QuestSystem.tsx`
- `src/components/help/HelpCenter.tsx`
- `src/components/learning/CourseDetail.tsx`, `LearningPaths.tsx`
- `src/components/mentorship/MentorProfile.tsx`, `MentorshipRequest.tsx`, `MentorshipSessions.tsx`
- `src/components/messaging/DirectMessages.tsx`
- `src/components/notifications/NotificationCenter.tsx`, `NotificationSettings.tsx`
- `src/components/onboarding/OnboardingConnections.tsx`, `OnboardingFlow.tsx`, `OnboardingInterests.tsx`, `OnboardingSkills.tsx`
- `src/components/payments/BillingHistory.tsx`, `PaymentGateway.tsx`, `SubscriptionManager.tsx`
- `src/components/tour/OnboardingTour.tsx`

**Orphan Library Files:**

- `src/lib/accessibility.ts`
- `src/lib/admin-utils.ts`
- `src/lib/cache/cache-manager.ts`
- `src/lib/calendar-utils.ts`
- `src/lib/data-export.ts`
- `src/lib/email-templates.ts`
- `src/lib/firebase-types.ts`
- `src/lib/jobs.ts`
- `src/lib/keyboard/shortcuts.ts`
- `src/lib/mock-api.ts`
- `src/lib/performance-monitor.ts`
- `src/lib/pwa/pwa-manager.ts`
- `src/lib/seo-utils.ts`

**Backup File (must delete):**

- `src/i18n/translations.ts.backup` — 5,298-line backup file committed to the repo, should be in git history only

**Orphan Barrel Exports:**

- `src/components/resources/index.ts` and `src/components/search/index.ts` — barrel files not imported by any page (check if any page imports from the barrel path)
- `src/lib/validation/index.ts` — barrel for validation (orphan if no page imports it)

### 1.5 Unreachable Code

No `return`/`throw` followed by code was found in the targeted files.

---

## 2. Clean Code Violations

### Long Files (>300 lines) — God Components

| File                                               | Lines | Issue                                               |
| -------------------------------------------------- | ----- | --------------------------------------------------- |
| `src/components/profile/ProfileEdit.tsx`           | 1,401 | God component — should be split by profile section  |
| `src/i18n/translations.ts`                         | 1,335 | Monolithic translations — should be split by domain |
| `src/components/jobs/JobPostingForm.tsx`           | 1,295 | God form — extract sub-forms                        |
| `src/components/events/EventRegistrationForm.tsx`  | 1,238 | God form                                            |
| `src/lib/mentorship.ts`                            | 1,178 | God service — violates SRP                          |
| `src/components/onboarding/OnboardingComplete.tsx` | 1,177 | God component                                       |
| `src/components/admin/DirectoryManagement.tsx`     | 1,061 | God component                                       |
| `src/components/assessment/QuizEngine.tsx`         | 1,040 | God component                                       |
| `src/lib/members.ts`                               | 1,000 | God service                                         |

**37 additional files** exceed 300 lines.

### Long Functions (>30 lines)

| File                                                  | Line | Function               | Estimated Length |
| ----------------------------------------------------- | ---- | ---------------------- | ---------------- |
| `src/components/commissions/CommissionPublicPage.tsx` | 23   | `CommissionPublicPage` | 157 lines        |
| `src/components/spotlight/SpotlightEditor.tsx`        | 8    | `SpotlightEditor`      | 200+ lines       |
| `src/components/resources/ResourceLibrary.tsx`        | 33   | `ResourceLibrary`      | 200+ lines       |
| `src/components/assessment/AssessmentHub.tsx`         | 30   | `AssessmentHub`        | 200+ lines       |
| `src/components/assessment/SkillAssessment.tsx`       | 447  | `SkillAssessmentCard`  | 191 lines        |
| `src/components/assessment/AssessmentResults.tsx`     | 826  | `RecommendationsTab`   | 191 lines        |
| `src/components/admin/DirectoryManagement.tsx`        | 968  | `ActionMenu`           | 71 lines         |

### console.log in Production Code

25+ `console.log`/`console.debug` calls found in non-test code, including in lib files:

- `src/middleware/index.ts:34` — request logging (guarded by NODE_ENV, acceptable)
- `src/lib/gamification.ts:156,264,404,413,433,483,504` — 7 debug logs without logger
- `src/lib/auth/two-factor.ts:191,234,258,284,329` — 5 "Mock:" logs in production code
- `src/lib/security-config.ts:364,462` — security events logged to console (not structured logger)
- `src/contexts/AuthContext.tsx:174,175` — emoji console.logs in auth context

---

## 3. Architecture Compliance

**Dependency direction**: PASS — business logic does not depend on framework internals. Firebase/Stripe are in `src/lib/`. Components use contexts.

**Layer separation**: PARTIAL — auth guards are client-side only (see Security section). No server-side session validation for admin API routes.

**Screaming Architecture**: PASS — folder names reveal intent (`auth`, `jobs`, `mentorship`, `gamification`).

**Middleware coverage gap**: The rate limiter and session middleware only protect `/api/user/`, `/api/admin/`, `/dashboard`, `/api/auth/`, `/api/contact`, and `/api/jobs` paths. The payment API endpoints at `/api/create-payment-intent`, `/api/create-subscription`, and `/api/create-invoice` are NOT in these protected path lists.

---

## 4. Test Quality

| Metric          | Value         | Threshold | Status       |
| --------------- | ------------- | --------- | ------------ |
| Total tests     | 951           | -         | -            |
| Passing         | 142           | -         | -            |
| Skipped         | 809           | 0         | FAIL         |
| Skip rate       | 85%           | <10%      | CRITICAL     |
| Coverage report | Not generated | 80%       | NOT MEASURED |

**FIRST principles**: The test suite is not Fast (41 seconds) and not effectively covering real code paths (85% skipped). The skipped tests in `AuthGuard`, `JobFilters`, `SearchBar`, `SearchResults`, `GlobalSearch` mean entire features have no verified behavior.

**Pattern**: The few passing tests (`firebase.test.ts`, `firebase-auth.test.ts`, `Button.test.tsx`) follow AAA pattern correctly.

**Critical gap**: Payment flows, admin operations, and auth guard logic all have zero running tests.

---

## Verdict

**CHANGES REQUIRED**

The codebase cannot be released in this state due to critical security findings (payment APIs with no auth), near-total test suite failure (85% skipped), and significant dead code accumulation that increases maintenance burden and attack surface.

---

_Findings Handoff to Forja: See security-audit-2026-02-28.md and release-check-1.0.0-2026-02-28.md for the full ordered fix list._
