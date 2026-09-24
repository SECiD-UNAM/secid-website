# Registration & Onboarding Flow Design

## Problem

New users arriving at SECiD have no clear page explaining their options. The homepage "Únete" button goes straight to signup with only two role choices (Member or Collaborator). There's no recruiter path, no public job posting option, and no account migration check before registration completes.

**Goals:**

- A clear `/join` page that explains all paths before users commit
- Three registration paths: Member, Collaborator, Recruiter
- Public job posting without an account (admin-moderated via API route + CAPTCHA)
- Inline migration check during Member registration (numeroCuenta)
- Auto-create company records for recruiters (server-side)
- Verified recruiters auto-publish jobs; anonymous posts require review

## Design Decisions

| Decision                 | Choice                                                                 | Rationale                                                                                       |
| ------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Actions page             | `/join` page + improved signup                                         | Explains options before committing; signup still allows role switching                          |
| Layout                   | Stacked list with hierarchy                                            | Registration paths first, anonymous action last; clear visual priority                          |
| Visitor role             | New "Recruiter" registration type using existing `company` role        | Dedicated path for hiring; auto-publish jobs without moderation                                 |
| Recruiter registration   | Minimal: company name + position + website                             | Low friction; admin verifies later; auto-creates company doc                                    |
| Public job posting       | Same full form + contact email + CAPTCHA, via API route, admin reviews | Maintains job quality; no account barrier for one-off posts; spam-resistant                     |
| Migration check          | Inline at Step 3 of Member path                                        | User is authenticated; integrates with existing merge system; no info leak                      |
| Job moderation           | Recruiters auto-publish; anonymous requires review                     | Trusted verified accounts vs unknown posters                                                    |
| Server-side registration | Callable Cloud Function `completeRegistration`                         | Bypasses Firestore rule conflicts for role assignment, company creation, and verification flags |

## Architecture Overview

```
Homepage "Únete" → /join page
                      ├── 🎓 Member → /signup?role=member → Step 1 (account) → Step 2 (pre-selected) → Step 3 (UNAM + migration check) → completeRegistration CF → Dashboard
                      ├── 🤝 Collaborator → /signup?role=collaborator → Step 1 (account) → Step 2 (pre-selected) → completeRegistration CF → Dashboard
                      ├── 🏢 Recruiter → /signup?role=recruiter → Step 1 (account) → Step 2 (pre-selected) → Step 3 (company info) → completeRegistration CF → Dashboard
                      └── 📋 Post a Job → /post-job (public, no account) → API route + CAPTCHA → Admin reviews → Published
```

### Key Architecture Decision: `completeRegistration` Callable Cloud Function

A single callable Cloud Function handles all post-account-creation setup. This solves multiple Firestore rule conflicts:

- **Role assignment**: The user self-update allowlist in `firestore.rules` does not include `role`. The Cloud Function (using Admin SDK) bypasses this restriction.
- **Company creation**: Existing Firestore rules require `isVerified()` for company doc creation. The Cloud Function creates company docs directly.
- **Verification flags**: The Cloud Function sets `isVerified: true` for recruiters so they can post jobs immediately.
- **Job auto-publish**: The Cloud Function or a Firestore trigger promotes jobs from `draft` to `active` for company-role users.

**Flow:**

1. Client creates account (Step 1) — `beforeUserCreated` creates default collaborator doc
2. Client collects registration data (Steps 2-3)
3. Client calls `completeRegistration({ registrationType, ...data })`
4. Cloud Function validates, sets role, creates company (if recruiter), sets lifecycle status, sets verification flags
5. Client receives success → redirects to dashboard

## Component 1: `/join` Page

### Route

- Spanish: `/es/join` (`src/pages/es/join.astro`)
- English: `/en/join` (`src/pages/en/join.astro`)
- Legacy redirect: `/registro` changes from → `/es/signup` to → `/es/join`

### Layout

Stacked list with descriptions. Three registration paths as prominent cards, "Post a Job" as a de-emphasized text link below.

```
┌─────────────────────────────────────────────────────┐
│  ¿Qué te trae a SECiD? / What brings you to SECiD? │
├─────────────────────────────────────────────────────┤
│ 🎓 I'm a UNAM Data Science graduate                │
│    Full membership — networking, mentorship, jobs    │
│                                            → Signup  │
├─────────────────────────────────────────────────────┤
│ 🤝 I want to collaborate with SECiD                 │
│    Public events & job board access                  │
│                                            → Signup  │
├─────────────────────────────────────────────────────┤
│ 🏢 I want to recruit Data Science talent            │
│    Post jobs directly, no review needed              │
│                                            → Signup  │
├─────────────────────────────────────────────────────┤
│     Just want to post a job? Post without account →  │
└─────────────────────────────────────────────────────┘
```

Each registration card links to `/signup?role={member|collaborator|recruiter}`.

"Post a Job" links to `/{lang}/post-job`.

### Additional Elements

- "Already have an account?" link to `/{lang}/login` at the bottom
- SECiD logo and brief tagline at top
- Responsive: stacks vertically on mobile (same layout, just narrower)

## Component 2: Expanded SignUpForm

### Changes to Step 2 (Role Selection)

Add "Recruiter" as a third registration type alongside Member and Collaborator.

New options:

1. Member — "I'm a UNAM Data Science graduate/student" → Step 3: UNAM verification
2. Collaborator — "I want to collaborate with SECiD" → calls `completeRegistration` → Done
3. **Recruiter** — "I want to recruit Data Science talent" → Step 3: Company info

### Step Indicator Update

The step indicator array (currently conditionally adds "unam" for member) must also add a "company" step for recruiter:

```
member:      [account, type, unam, done]
collaborator: [account, type, done]
recruiter:    [account, type, company, done]
```

### Query Parameter Pre-Selection

If the URL contains `?role=member|collaborator|recruiter`, pre-select that option at Step 2. The user can still change their selection.

Read `role` from `URLSearchParams` on component mount.

### New Step 3 Variant: Recruiter Company Info

When the user selects "Recruiter", Step 3 shows a company info form instead of UNAM verification:

**Fields:**

- Company Name (required, 2+ chars)
- Position/Title at Company (required)
- Company Website (optional, URL format)

**Schema:**

```typescript
const recruiterSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  companyPosition: z.string().min(2, 'Position is required'),
  companyWebsite: z.string().url().optional().or(z.literal('')),
});
```

**On Submit:** calls `completeRegistration` Cloud Function (see Component 6).

### Updated Done Step for Recruiters

Different completion message:

> "Welcome, recruiter! Your account has been created. You can now post jobs that will be published immediately."
> [Go to Dashboard] [Post a Job]

Two CTAs: dashboard and direct link to job posting.

## Component 3: Inline Migration Check (Step 3 — Member Path)

### Current Behavior

The `numeroCuenta` check happens after the entire UNAM form is submitted. The user sees the merge notification on their dashboard later.

### New Behavior

Check happens **inline** when the user enters their `numeroCuenta`:

1. User types `numeroCuenta` in the field
2. On blur (or after 500ms debounce), call `checkNumeroCuentaMatch(numeroCuenta, currentUid)`
3. **While checking:** show a small spinner next to the field
4. **If check fails (network error):** show nothing, proceed normally — the post-submit check is still a fallback
5. If match found, show an inline banner directly below the field:

```
┌─────────────────────────────────────────────────┐
│ 🔗 Existing profile detected!                   │
│ We found a profile matching this account number. │
│ You can claim it after completing registration   │
│ — an admin will review.                          │
│                                                  │
│ [Continue & claim profile]                       │
└─────────────────────────────────────────────────┘
```

6. "Continue & claim profile" just continues the normal form submission — the existing `setPotentialMergeMatch` logic at the end of `onUnamSubmit` already handles setting the flag.

7. If no match: show nothing, proceed normally.

8. **Form submission is NOT blocked** while the check is pending — the post-submit check in `onUnamSubmit` is the authoritative one.

### No behavioral change needed

The existing merge detection code in `onUnamSubmit` already calls `checkNumeroCuentaMatch` and `setPotentialMergeMatch`. The only change is adding an **earlier visual check** so the user knows before they fill out the rest of the form. The actual merge flow (ClaimFlow, admin approval) is unchanged.

## Component 4: Public Job Posting

### Route

The existing `/es/post-job` page currently loads `JobPostingForm`. It will be modified to work without authentication.

### Submission via API Route (not direct Firestore write)

Public job submissions go through an **API route** at `/api/public-job-submit` instead of direct Firestore writes. This provides:

- Server-side CAPTCHA verification (existing `captcha.ts` system)
- Input validation and sanitization
- Rate limiting (existing middleware)
- No need for `allow create: if true` in Firestore rules

### Changes to JobPostingForm

**When user is NOT authenticated:**

- Add a "Contact Email" field (required, validated) at the start of the form
- Add a "Your Name" field (required)
- Add CAPTCHA widget (existing `captcha.ts` with `'job-post'` action already configured)
- On submit: POST to `/api/public-job-submit` with form data + CAPTCHA token
- Show confirmation: "Your job posting has been submitted for review. We'll notify you at {email} when it's published."

**When user IS authenticated with `role: 'company'`:**

- No contact email needed (use profile email)
- Write to `jobs` collection with `status: 'draft'`
- A Firestore trigger (`onJobCreated`) auto-promotes to `status: 'active'` if poster has `role: 'company'`
- Show confirmation: "Your job has been published!"

**When user IS authenticated with any other role:**

- Current behavior unchanged

### API Route: `/api/public-job-submit`

Uses a **callable Cloud Function** instead of an Astro API route to avoid needing Firebase Admin SDK in the SSR context. The existing Cloud Functions already have Admin SDK initialized.

```typescript
// functions/src/public-job-submit.ts
export const submitPublicJob = onCall(async (request) => {
  // 1. Verify CAPTCHA token (request.data.captchaToken)
  // 2. Validate request body (title, company, description, contactEmail, contactName required)
  // 3. Sanitize inputs (strip HTML, enforce max lengths)
  // 4. Write to public_job_submissions collection
  // 5. Return { success: true }
});
```

The client calls this via `httpsCallable(functions, 'submitPublicJob')`. No auth required — the function validates via CAPTCHA instead.

### `public_job_submissions` Collection

```typescript
interface PublicJobSubmission {
  // Job fields
  title: string;
  company: string;
  location: string;
  locationType: string;
  employmentType: string;
  description: string;
  requirements: string[];
  // ... all existing job fields

  // Anonymous submission fields
  contactEmail: string;
  contactName: string;
  status: 'pending_review' | 'approved' | 'rejected';

  // Metadata
  createdAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewNotes?: string;
}
```

### Firestore Rules

```
// public_job_submissions: server-side only writes (API route uses Admin SDK)
match /public_job_submissions/{submissionId} {
  allow create: if false;  // Only API route (Admin SDK) can write
  allow read, update, delete: if isAuthenticated() && canAdminister();
}
```

### Admin Review

Admin can see public job submissions in the existing moderation queue. On approval, the submission is copied to the `jobs` collection with `status: 'active'` and the `public_job_submissions` doc is updated to `status: 'approved'`.

> **Note:** The admin review UI for `public_job_submissions` is out of scope for this spec. It will be added to the existing `ContentModeration` component in a follow-up. For initial launch, admins can review submissions directly in the Firebase console.

## Component 5: Homepage CTA Update

### Change

In `src/pages/es/index.astro` and `src/pages/en/index.astro`:

- "Únete" / "Join" button href: change from `/registro` to `/{lang}/join`
- Any other "Register" CTAs on the page: update to `/{lang}/join`

### Legacy Redirect

Update `/registro` redirect: change from → `/es/signup` to → `/es/join`

## Component 6: `completeRegistration` Callable Cloud Function

### Purpose

Handles all post-account-creation setup that requires elevated privileges (role assignment, company creation, verification flags). Called by the SignUpForm after collecting all registration data.

### Input

```typescript
interface CompleteRegistrationData {
  registrationType: 'member' | 'collaborator' | 'recruiter';

  // Member-specific
  numeroCuenta?: string;
  academicLevel?: 'licenciatura' | 'posgrado' | 'curso';
  campus?: string;
  generation?: string;
  graduationYear?: number;
  verificationDocumentUrl?: string;

  // Recruiter-specific
  companyName?: string;
  companyPosition?: string;
  companyWebsite?: string;
}
```

### Idempotency Guard

The CF must handle double-calls (network retry, user double-click). At the start:

1. Read current user doc
2. If `registrationType` is already set to the requested value AND `lifecycle.status` is not `collaborator` (the default), return early with `{ success: true, alreadyCompleted: true }`

This prevents duplicate company creation and duplicate `memberCount` increments.

### Logic

```
0. Idempotency check: if user.registrationType === requested type AND lifecycle.status !== 'collaborator', return early

1. Validate caller is authenticated
2. Validate input matches registrationType requirements

3. If registrationType === 'member':
   - Update user doc: registrationType, verificationStatus: 'pending', UNAM fields
   - Set lifecycle.status: 'pending'
   - (numeroCuenta index maintenance is handled by existing onUserNumeroCuentaChange trigger)

4. If registrationType === 'collaborator':
   - Update user doc: registrationType: 'collaborator'
   - (lifecycle.status stays 'collaborator', role stays 'collaborator' — defaults from onUserCreate)

5. If registrationType === 'recruiter':
   - Query companies collection for matching name (case-insensitive via nameLower field)
   - If no match: create company doc with { name, nameLower, website, createdBy, createdAt, memberCount: 1, status: 'active', updatedAt }
   - If match: increment memberCount on existing company
   - Update user doc:
     - role: 'company'
     - registrationType: 'recruiter'
     - isVerified: true  (so they can post jobs immediately)
     - profile.company: companyName
     - profile.companyId: companyDocId
     - profile.position: companyPosition
     - lifecycle.status: 'active'
     - updatedAt: serverTimestamp()

6. Return { success: true, registrationType }
```

### Company Name Matching

To support case-insensitive matching in Firestore, the `companies` collection needs a `nameLower` field (lowercase normalized name). The Cloud Function queries `where('nameLower', '==', companyName.toLowerCase().trim())`.

**Existing companies migration:** A one-time script to backfill `nameLower` on existing company docs. Or the Cloud Function handles the fallback: if no `nameLower` match, also try exact `name` match.

### Race Condition Prevention

Use a Firestore transaction for company creation: read the existing doc (or lack thereof) and create/update atomically. This prevents duplicate companies from concurrent recruiter registrations.

### Google Groups Interaction

The `onMemberStatusChange` trigger will fire when lifecycle.status changes. For recruiters going to `active`:

- This triggers the "active" case which adds to miembros@ group
- **This is NOT desired for recruiters** — they should stay in the collaboradores@ group or no group

**Solution:** The `completeRegistration` Cloud Function does NOT set lifecycle.status to 'active' via a user doc update that would trigger `onMemberStatusChange`. Instead, it uses a `_skipGroupSync: true` flag on the update, and `onMemberStatusChange` checks for this flag (similar to the existing `_mergeInProgress` pattern).

Alternatively, set `lifecycle.status` to a new value `'recruiter'` and add a case in `onMemberStatusChange` that ignores it (no group changes).

**Recommended:** Use `lifecycle.status: 'active'` + `_skipGroupSync: true` flag. Simpler, no new status value needed.

### `_skipGroupSync` Cleanup

The `onMemberStatusChange` trigger must delete `_skipGroupSync` after skipping, so future admin-triggered status changes for the recruiter are not silently ignored:

```typescript
if (afterData._skipGroupSync) {
  // Delete the flag so future status changes are processed normally
  await event.data.after.ref.update({
    _skipGroupSync: admin.firestore.FieldValue.delete(),
  });
  return;
}
```

### Trigger Fan-Out

The `completeRegistration` CF writes to the user doc, which triggers multiple existing Cloud Functions:

- `onMemberStatusChange` → skipped via `_skipGroupSync` for recruiters; runs normally for members (no group change on `pending`)
- `onUserNumeroCuentaChange` → runs normally for members (indexes `numeroCuenta`); no-op for recruiters (no `numeroCuenta`)
- `onMemberCompanyChange` → runs normally for recruiters (updates company `memberCount`); no-op for others
- `matchJobsForUser` → runs normally for all (may generate job matches)

This is expected behavior. No additional guards needed beyond `_skipGroupSync`.

## Component 7: Type & Role Updates

### Updated RegistrationType

In `src/types/user.ts`:

```typescript
export type RegistrationType = 'member' | 'collaborator' | 'recruiter';
```

### Add 'company' to role union

In `src/types/user.ts`, the `UserProfile.role` field:

```typescript
role: 'member' | 'admin' | 'moderator' | 'collaborator' | 'company';
```

This fixes a pre-existing inconsistency — `AuthContext.tsx` already includes `'company'` but `user.ts` does not.

### Role Mapping

| Registration Type | Firestore `role`                                 | `isVerified`                      | Lifecycle Status     | Google Groups              |
| ----------------- | ------------------------------------------------ | --------------------------------- | -------------------- | -------------------------- |
| member            | `collaborator` → `member` (after admin approval) | `false` → `true` (after approval) | `pending` → `active` | colaboradores@ → miembros@ |
| collaborator      | `collaborator`                                   | `false`                           | `collaborator`       | colaboradores@             |
| recruiter         | `company`                                        | `true` (immediate)                | `active` (immediate) | colaboradores@ (no change) |

## Component 8: Job Auto-Publish (Merge into Existing Trigger)

### Merge into existing `onNewJobPosted`

The codebase already has `onNewJobPosted` registered on `onDocumentCreated("jobs/{jobId}")` at `functions/src/index.ts` line 241. Firebase Cloud Functions v2 does not allow two functions on the same document path and event type. Instead of creating a new function, **merge the auto-publish logic into `onNewJobPosted`**.

**Updated `onNewJobPosted` logic:**

```
1. Read job data
2. If status === 'draft' AND poster has role === 'company':
   → Auto-promote to status: 'active', set approvedAt
   → Then continue to notification logic below
3. If status === 'active' or 'published':
   → Run existing job notification email logic (unchanged)
4. Otherwise: return (no action)
```

Order matters: auto-publish first, then (if now active) send notifications.

### Pre-existing fix: `status: 'draft'` for all job creation

The existing Firestore rules require `request.resource.data.status == 'draft'` for job creation, but the current `JobPostingForm.tsx` writes `status: 'pending'`. This is a pre-existing inconsistency. As part of this work, update `JobPostingForm.tsx` to write `status: 'draft'` for all authenticated paths. The `onNewJobPosted` trigger handles promotion.

Similarly, the existing form uses `postedAt: serverTimestamp()` but rules expect `createdAt`. Update to use `createdAt: serverTimestamp()` (or add `createdAt` alongside `postedAt`).

## Firestore Security Rules Changes

```
// public_job_submissions: server writes only (API route uses Admin SDK)
match /public_job_submissions/{submissionId} {
  allow create: if false;
  allow read, update, delete: if isAuthenticated() && canAdminister();
}
```

No changes needed to `users` or `jobs` rules — the `completeRegistration` Cloud Function and `onJobCreated` trigger use Admin SDK.

## Files to Create/Modify

### New files

| File                                     | Description                                           |
| ---------------------------------------- | ----------------------------------------------------- |
| `src/pages/es/join.astro`                | Spanish join page                                     |
| `src/pages/en/join.astro`                | English join page                                     |
| `src/components/auth/JoinPage.tsx`       | React component for the join page                     |
| `functions/src/complete-registration.ts` | Callable Cloud Function for registration completion   |
| `functions/src/public-job-submit.ts`     | Callable Cloud Function for anonymous job submissions |

### Modified files

| File                                     | Change                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/auth/SignUpForm.tsx`     | Add recruiter option, query param pre-selection, company info step, inline migration check, call `completeRegistration` CF instead of direct Firestore writes |
| `src/components/jobs/JobPostingForm.tsx` | Support unauthenticated mode, contact email/name fields, CAPTCHA, POST to API route                                                                           |
| `src/pages/es/index.astro`               | Update "Únete" CTA href to `/{lang}/join`                                                                                                                     |
| `src/pages/en/index.astro`               | Update "Join" CTA href to `/{lang}/join`                                                                                                                      |
| `src/pages/es/post-job.astro`            | Allow unauthenticated access (remove auth requirement)                                                                                                        |
| `src/pages/en/post-job.astro`            | Allow unauthenticated access                                                                                                                                  |
| `src/types/user.ts`                      | Add `'recruiter'` to RegistrationType, add `'company'` to role union                                                                                          |
| `firestore.rules`                        | Add `public_job_submissions` rules                                                                                                                            |
| `functions/src/index.ts`                 | Register `completeRegistration` and `submitPublicJob` CFs, merge auto-publish into `onNewJobPosted`, add `_skipGroupSync` guard to `onMemberStatusChange`     |
| `src/components/jobs/JobPostingForm.tsx` | Fix `status: 'draft'` (was `pending`), support unauthenticated mode, contact email/name fields, CAPTCHA, call `submitPublicJob` CF                            |
