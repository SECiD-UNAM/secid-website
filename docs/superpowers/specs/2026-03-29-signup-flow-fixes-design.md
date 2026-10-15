# Signup Flow Fixes & Improvements — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Scope:** 11 fixes across signup, auth, and post-signup flows

---

## 1. Email Verification (Soft Gate)

**Problem:** No email verification anywhere in signup. Users can register with fake emails.

**Design:**

- Call `sendEmailVerification(user)` immediately after `createUserWithEmailAndPassword()` in `SignUpForm.tsx`
- Also call it after OAuth signup for providers that don't guarantee verified emails (GitHub)
- Google OAuth emails are pre-verified by Firebase — skip for those

**Soft gate behavior:**

- New `EmailVerificationBanner` component rendered in `DashboardShell` when `user.emailVerified === false`
- Banner shows: warning icon, message, "Resend verification email" button, "Refresh" button
- Gated actions (show inline "verify email first" message when attempted):
  - Forum: creating topics and replies
  - Jobs: posting jobs
  - Mentorship: requesting/offering mentorship
- Ungated actions (work without verification):
  - Viewing dashboard, profile editing, browsing content, events

**Files to modify:**

- `src/components/auth/SignUpForm.tsx` — add `sendEmailVerification()` call
- `src/components/auth/SocialLoginButtons.tsx` — add verification for GitHub signups
- `src/components/dashboard/DashboardShell.tsx` — render `EmailVerificationBanner`
- New: `src/components/auth/EmailVerificationBanner.tsx`

---

## 2. Replace 2s setTimeout with onSnapshot

**Problem:** `SignUpForm.tsx:~269` uses `setTimeout(2000)` to wait for the `beforeUserCreated` Cloud Function to create the Firestore user doc. Non-deterministic; CF cold starts can exceed 2s.

**Design:**

- After `createUserWithEmailAndPassword()`, subscribe to `onSnapshot()` on `users/{uid}`
- Resolve when document exists (snapshot has data)
- 10-second timeout — if doc never appears, show error: "Account created but profile setup is taking longer than expected. Please refresh or contact support."
- Clean up listener on unmount or resolution

**Files to modify:**

- `src/components/auth/SignUpForm.tsx` — replace setTimeout with onSnapshot wait

---

## 3. Block "Done" Screen on CF Failure

**Problem:** `completeRegistration` CF errors are caught and logged, but user sees "Done" screen regardless. User can end up with half-completed registration.

**Design:**

- In the `handleCompleteRegistration` flow, only advance to the "done" step on success
- On failure: stay on current step, show error alert with retry button
- Add a `registrationError` state that displays inline
- Retry button re-calls `completeRegistration`

**Files to modify:**

- `src/components/auth/SignUpForm.tsx` — error handling in completion flow

---

## 4. Consolidate UserProfile Types

**Problem:** Two different `UserProfile` interfaces — one in `AuthContext.tsx`, one in `src/types/user.ts`. No shared source of truth.

**Design:**

- `src/types/user.ts` is the canonical definition (it's more complete)
- Remove the duplicate interface from `AuthContext.tsx`
- Import `UserProfile` from `src/types/user.ts` in AuthContext
- Verify all fields used by AuthContext exist in the canonical type
- Add any missing fields to `src/types/user.ts` if needed (e.g., `potentialMergeMatch`)

**Files to modify:**

- `src/contexts/AuthContext.tsx` — remove duplicate, import from types
- `src/types/user.ts` — add any missing fields

---

## 5. numeroCuenta Validation

**Problem:** Client-side validation only requires 5+ chars. UNAM account numbers are 9 digits.

**Design:**

- Client-side (Zod schema in SignUpForm): regex `/^\d{9}$/` with message "UNAM account number must be exactly 9 digits"
- Server-side (`completeRegistration` CF): same 9-digit validation, throw `invalid-argument` if invalid
- Both Spanish and English error messages

**Files to modify:**

- `src/components/auth/SignUpForm.tsx` — update Zod schema
- `functions/src/complete-registration.ts` — add server-side validation

---

## 6. returnUrl Support

**Problem:** When unauthenticated users hit protected routes, they lose their intended destination after login.

**Design:**

- `AuthGuard` and `ProtectedRoute`: before redirecting to login, store `window.location.pathname` in `sessionStorage` as `returnUrl`
- `LoginForm` and `SignUpForm`: after successful auth, check `sessionStorage.getItem('returnUrl')`, redirect there if present, clear it, otherwise default to `/dashboard`
- Also support `?returnUrl=` query parameter (validate it's a relative path to prevent open redirect)

**Files to modify:**

- `src/components/auth/AuthGuard.tsx` — store returnUrl
- `src/components/auth/ProtectedRoute.tsx` — store returnUrl
- `src/components/auth/SignUpForm.tsx` — read returnUrl on success
- `src/components/auth/LoginForm.tsx` — read returnUrl on success

---

## 7. Disable LinkedIn Button When Not Deployed

**Problem:** LinkedIn OAuth Cloud Function exports are commented out, but button may still render.

**Design:**

- Add `LINKEDIN_AUTH_AVAILABLE` constant (check via environment variable `PUBLIC_LINKEDIN_AUTH_ENABLED`)
- In `SocialLoginButtons.tsx`: conditionally render LinkedIn button only when enabled
- When disabled: either hide completely or show disabled with "Coming soon" tooltip
- Decision: hide completely (cleaner UX, no confusion)

**Files to modify:**

- `src/components/auth/SocialLoginButtons.tsx` — conditional render

---

## 8. profileCompleteness Recalculation

**Problem:** Set to `20` on creation, never updated afterward.

**Design:**

- New utility: `calculateProfileCompleteness(profile: UserProfile): number`
- Weighted fields:
  - Name (firstName + lastName): 10%
  - Photo: 10%
  - Email verified: 10%
  - Registration type completed: 20%
  - Education (at least one entry): 15%
  - Career (current position + company): 15%
  - Skills (at least 3): 10%
  - Bio/headline: 10%
- Called in:
  - `completeRegistration` CF — after registration data saved
  - Profile update flows (existing `updateUserProfile`)
- Returns integer 0-100

**Files to create:**

- `src/lib/profile-completeness.ts` — shared utility
- `functions/src/profile-completeness.ts` — server-side copy (or shared via functions bundling)

**Files to modify:**

- `functions/src/complete-registration.ts` — call after registration
- `src/lib/auth.ts` or profile update service — call on profile save

---

## 9. Trigger Onboarding After First Signup

**Problem:** OnboardingWizard exists but is never triggered. Users land on empty dashboard.

**Design:**

- After successful `completeRegistration` in SignUpForm, redirect to `/{lang}/dashboard?onboarding=true`
- `DashboardShell` checks for `onboarding=true` query param AND `profileCompleteness < 50`
- If both true: render `OnboardingWizard` as a modal overlay
- OnboardingWizard already has completion logic — on finish, remove query param, refresh profile

**Files to modify:**

- `src/components/auth/SignUpForm.tsx` — add `?onboarding=true` to redirect
- `src/components/dashboard/DashboardShell.tsx` — detect param, show wizard

---

## 10. Recruiter Registration Alert

**Problem:** Recruiters get `isVerified: true` and `lifecycle.status: 'active'` immediately with no oversight.

**Design:**

- In `completeRegistration` CF, after recruiter registration completes, write to `admin_alerts` collection:
  ```
  {
    type: 'new_recruiter_registration',
    userId: uid,
    companyName: data.companyName,
    companyPosition: data.companyPosition,
    createdAt: serverTimestamp(),
    read: false
  }
  ```
- Admin dashboard notification system can pick this up (existing pattern)

**Files to modify:**

- `functions/src/complete-registration.ts` — add alert write after recruiter path

---

---

## Implementation Order

Items have dependencies that dictate order:

1. **#4 Consolidate types** — prerequisite for all other changes touching UserProfile
2. **#2 Replace setTimeout** and **#3 Block Done on CF failure** — core signup reliability
3. **#5 numeroCuenta validation** — independent, small
4. **#8 profileCompleteness** — needed before onboarding trigger
5. **#1 Email verification** — depends on type consolidation
6. **#6 returnUrl** — independent
7. **#7 LinkedIn button** — independent
8. **#9 Onboarding trigger** — depends on profileCompleteness
9. **#10 Recruiter alert** — independent CF change
10. **#11 Forum auth** — independent

---

## 11. Fix Forum Auth Check

**Problem:** `forum/new-topic.astro` has `currentUser = undefined` always — redirect always fires regardless of auth state.

**Design:**

- Use Astro's `Astro.locals` (populated by middleware session validation) to check auth
- Middleware already validates sessions and sets user info in locals
- Replace stubbed check with: `const user = Astro.locals.user; if (!user) return Astro.redirect(...)`

**Files to modify:**

- `src/pages/en/forum/new-topic.astro` (and `es/` equivalent) — use middleware auth
