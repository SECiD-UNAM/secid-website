# Registration & Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clear `/join` page with 4 user paths (member, collaborator, recruiter, public job post), a `completeRegistration` Cloud Function for server-side role assignment, inline migration check, and public job submissions.

**Architecture:** New `/join` page routes to signup with role pre-selected via query param. A callable Cloud Function `completeRegistration` handles all privileged operations (role assignment, company creation, verification flags). Public job submissions go through a separate callable CF with CAPTCHA. Job auto-publish for recruiters is merged into the existing `onNewJobPosted` trigger.

**Tech Stack:** Astro 4.x, React 18, TypeScript, Firebase (Cloud Functions v2, Firestore, Auth), Tailwind CSS, Zod, Lucide icons, Vitest

**Spec:** `docs/superpowers/specs/2026-03-22-registration-onboarding-flow-design.md`

---

## File Structure

### New files

| File                                     | Responsibility                                               |
| ---------------------------------------- | ------------------------------------------------------------ |
| `src/pages/es/join.astro`                | Spanish join page (Astro wrapper)                            |
| `src/pages/en/join.astro`                | English join page (Astro wrapper)                            |
| `src/components/auth/JoinPage.tsx`       | React join page component with 4 path cards                  |
| `functions/src/complete-registration.ts` | Callable CF: role assignment, company creation, verification |
| `functions/src/public-job-submit.ts`     | Callable CF: anonymous job submissions with CAPTCHA          |

### Modified files

| File                                                                   | Change                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/types/user.ts:5,11`                                               | Add `'recruiter'` to RegistrationType, add `'company'` to role union                              |
| `firestore.rules:707`                                                  | Add `public_job_submissions` rules                                                                |
| `functions/src/index.ts:241-308,350-404`                               | Register new CFs, merge auto-publish into `onNewJobPosted`, add `_skipGroupSync` guard            |
| `src/components/auth/SignUpForm.tsx:52,87-89,296-362,655-745,961-1000` | Add recruiter path, query param pre-selection, company info step, inline migration check, call CF |
| `src/components/jobs/JobPostingForm.tsx:240-315`                       | Support unauth mode, contact fields, CAPTCHA, status fix (`draft` not `pending`)                  |
| `src/pages/es/index.astro:23,195`                                      | Update CTA hrefs to `/es/join`                                                                    |
| `src/pages/en/index.astro`                                             | Update CTA hrefs to `/en/join`                                                                    |
| `src/pages/registro.astro:10,12`                                       | Update redirect to `/es/join`                                                                     |

---

## Task 1: Type & Role Updates

**Files:**

- Modify: `src/types/user.ts:5,11`

- [ ] **Step 1: Update RegistrationType**

In `src/types/user.ts` line 5, change:

```typescript
export type RegistrationType = 'member' | 'collaborator';
```

To:

```typescript
export type RegistrationType = 'member' | 'collaborator' | 'recruiter';
```

- [ ] **Step 2: Add 'company' to role union**

In `src/types/user.ts` line 11, change:

```typescript
role: 'member' | 'admin' | 'moderator' | 'collaborator';
```

To:

```typescript
role: 'member' | 'admin' | 'moderator' | 'collaborator' | 'company';
```

- [ ] **Step 3: Run type check**

Run: `npm run type-check`
Expected: PASS (this fixes a pre-existing inconsistency with AuthContext.tsx)

- [ ] **Step 4: Commit**

```bash
git add src/types/user.ts
git commit -m "feat(registration): add recruiter registration type and company role to types"
```

---

## Task 2: Firestore Rules for public_job_submissions

**Files:**

- Modify: `firestore.rules`

- [ ] **Step 1: Add public_job_submissions rules**

In `firestore.rules`, before the final closing `  }` and `}` (after the existing `member_status_log` rules around line 707), add:

```
    // Public job submissions: server writes only (callable CF uses Admin SDK)
    match /public_job_submissions/{submissionId} {
      allow create: if false;
      allow read, update, delete: if isAuthenticated() && canAdminister();
    }
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat(registration): add Firestore rules for public_job_submissions"
```

---

## Task 3: `completeRegistration` Cloud Function

**Files:**

- Create: `functions/src/complete-registration.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create the callable Cloud Function**

```typescript
// functions/src/complete-registration.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface CompleteRegistrationData {
  registrationType: 'member' | 'collaborator' | 'recruiter';
  // Member-specific
  numeroCuenta?: string;
  academicLevel?: string;
  campus?: string;
  generation?: string;
  graduationYear?: number;
  verificationDocumentUrl?: string;
  // Recruiter-specific
  companyName?: string;
  companyPosition?: string;
  companyWebsite?: string;
  // Common
  firstName?: string;
  lastName?: string;
}

export const completeRegistration = onCall(async (request) => {
  // 1. Validate caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const uid = request.auth.uid;
  const data = request.data as CompleteRegistrationData;

  // 2. Validate registrationType
  if (
    !['member', 'collaborator', 'recruiter'].includes(data.registrationType)
  ) {
    throw new HttpsError('invalid-argument', 'Invalid registration type');
  }

  // 3. Idempotency check
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();
  if (
    userData &&
    userData.registrationType === data.registrationType &&
    userData.lifecycle?.status !== 'collaborator'
  ) {
    return { success: true, alreadyCompleted: true };
  }

  // 4. Process by registration type
  if (data.registrationType === 'member') {
    return handleMemberRegistration(uid, data);
  } else if (data.registrationType === 'recruiter') {
    return handleRecruiterRegistration(uid, data);
  } else {
    // Collaborator — minimal update
    await db.collection('users').doc(uid).update({
      registrationType: 'collaborator',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, registrationType: 'collaborator' };
  }
});

async function handleMemberRegistration(
  uid: string,
  data: CompleteRegistrationData
) {
  // Validate required fields
  if (!data.numeroCuenta) {
    throw new HttpsError(
      'invalid-argument',
      'numeroCuenta is required for members'
    );
  }

  const updateData: Record<string, any> = {
    registrationType: 'member',
    verificationStatus: 'pending',
    numeroCuenta: data.numeroCuenta,
    academicLevel: data.academicLevel || null,
    campus: data.campus || null,
    generation: data.generation || null,
    'lifecycle.status': 'pending',
    'lifecycle.statusChangedAt': admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (data.graduationYear) {
    updateData['profile.graduationYear'] = data.graduationYear;
  }
  if (data.verificationDocumentUrl) {
    updateData.verificationDocumentUrl = data.verificationDocumentUrl;
  }
  if (data.firstName) {
    updateData.firstName = data.firstName;
  }
  if (data.lastName) {
    updateData.lastName = data.lastName;
  }

  await db.collection('users').doc(uid).update(updateData);

  return { success: true, registrationType: 'member' };
}

async function handleRecruiterRegistration(
  uid: string,
  data: CompleteRegistrationData
) {
  // Validate required fields
  if (!data.companyName || !data.companyPosition) {
    throw new HttpsError(
      'invalid-argument',
      'companyName and companyPosition are required for recruiters'
    );
  }

  // Find or create company using a transaction
  const nameLower = data.companyName.toLowerCase().trim();
  let companyId: string;

  await db.runTransaction(async (transaction) => {
    // Query for existing company by nameLower
    const companyQuery = await db
      .collection('companies')
      .where('nameLower', '==', nameLower)
      .limit(1)
      .get();

    if (!companyQuery.empty) {
      // Link to existing company
      const existingDoc = companyQuery.docs[0];
      companyId = existingDoc.id;
      transaction.update(existingDoc.ref, {
        memberCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Also try exact name match (for companies without nameLower)
      const exactQuery = await db
        .collection('companies')
        .where('name', '==', data.companyName!.trim())
        .limit(1)
        .get();

      if (!exactQuery.empty) {
        const existingDoc = exactQuery.docs[0];
        companyId = existingDoc.id;
        transaction.update(existingDoc.ref, {
          nameLower,
          memberCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Create new company
        const companyRef = db.collection('companies').doc();
        companyId = companyRef.id;
        transaction.set(companyRef, {
          name: data.companyName!.trim(),
          nameLower,
          website: data.companyWebsite || '',
          createdBy: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          memberCount: 1,
          status: 'active',
        });
      }
    }

    // Update user doc
    transaction.update(db.collection('users').doc(uid), {
      role: 'company',
      registrationType: 'recruiter',
      isVerified: true,
      'profile.company': data.companyName!.trim(),
      'profile.companyId': companyId,
      'profile.position': data.companyPosition,
      'lifecycle.status': 'active',
      'lifecycle.statusChangedAt': admin.firestore.FieldValue.serverTimestamp(),
      _skipGroupSync: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true, registrationType: 'recruiter', companyId };
}
```

- [ ] **Step 2: Add `_skipGroupSync` guard to `onMemberStatusChange`**

In `functions/src/index.ts`, find the `onMemberStatusChange` function. After the existing `_mergeInProgress` guard (line ~359), add:

```typescript
// Skip during registration to prevent unintended group changes for recruiters
if (afterData._skipGroupSync) {
  await event.data?.after.ref.update({
    _skipGroupSync: admin.firestore.FieldValue.delete(),
  });
  return;
}
```

- [ ] **Step 3: Merge auto-publish into `onNewJobPosted`**

In `functions/src/index.ts`, find the `onNewJobPosted` function (line ~241). The current logic returns early if status is not "active" or "published" (line ~251). Change that section to:

Replace the early return:

```typescript
if (jobData.status !== 'active' && jobData.status !== 'published') return;
```

With:

```typescript
// Auto-publish for company-role users
if (jobData.status === 'draft') {
  const posterUid = jobData.postedBy;
  if (posterUid) {
    const posterDoc = await admin
      .firestore()
      .collection('users')
      .doc(posterUid)
      .get();
    if (posterDoc.data()?.role === 'company') {
      await event.data?.ref.update({
        status: 'active',
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Continue to send notifications since job is now active
    } else {
      return; // Non-company draft jobs wait for admin approval
    }
  } else {
    return;
  }
} else if (jobData.status !== 'active' && jobData.status !== 'published') {
  return;
}
```

- [ ] **Step 4: Register new Cloud Functions**

Add import at top of `functions/src/index.ts`:

```typescript
import { completeRegistration } from './complete-registration';
```

Add re-export at end:

```typescript
export { completeRegistration };
```

- [ ] **Step 5: Verify build**

Run: `cd functions && npm run build`
Expected: Clean compile

- [ ] **Step 6: Commit**

```bash
git add functions/src/complete-registration.ts functions/src/index.ts
git commit -m "feat(registration): add completeRegistration CF with recruiter company creation and job auto-publish"
```

---

## Task 4: Public Job Submit Cloud Function

**Files:**

- Create: `functions/src/public-job-submit.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create the callable Cloud Function**

```typescript
// functions/src/public-job-submit.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface PublicJobSubmitData {
  title: string;
  company: string;
  location: string;
  locationType: string;
  employmentType: string;
  description: string;
  requirements: string[];
  contactEmail: string;
  contactName: string;
  // Optional fields
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  responsibilities?: string[];
  benefits?: string[];
  tags?: string[];
  applicationMethod?: string;
  applicationUrl?: string;
  applicationEmail?: string;
  applicationDeadline?: string;
}

const MAX_FIELD_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 50;

function sanitize(str: string, maxLen = MAX_FIELD_LENGTH): string {
  return str
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLen);
}

export const submitPublicJob = onCall(async (request) => {
  const data = request.data as PublicJobSubmitData;

  // 1. Validate required fields
  if (
    !data.title ||
    !data.company ||
    !data.description ||
    !data.contactEmail ||
    !data.contactName
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: title, company, description, contactEmail, contactName'
    );
  }

  // 2. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.contactEmail)) {
    throw new HttpsError('invalid-argument', 'Invalid email format');
  }

  // 3. Sanitize inputs
  const submission: Record<string, any> = {
    title: sanitize(data.title, 200),
    company: sanitize(data.company, 200),
    location: sanitize(data.location || '', 200),
    locationType: sanitize(data.locationType || 'remote', 50),
    employmentType: sanitize(data.employmentType || 'full-time', 50),
    description: sanitize(data.description),
    requirements: (data.requirements || [])
      .slice(0, MAX_ARRAY_LENGTH)
      .map((r) => sanitize(r, 500)),
    contactEmail: sanitize(data.contactEmail, 320),
    contactName: sanitize(data.contactName, 200),
    status: 'pending_review',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Optional fields
  if (data.salaryMin) submission.salaryMin = Number(data.salaryMin) || 0;
  if (data.salaryMax) submission.salaryMax = Number(data.salaryMax) || 0;
  if (data.salaryCurrency)
    submission.salaryCurrency = sanitize(data.salaryCurrency, 10);
  if (data.salaryPeriod)
    submission.salaryPeriod = sanitize(data.salaryPeriod, 20);
  if (data.responsibilities)
    submission.responsibilities = data.responsibilities
      .slice(0, MAX_ARRAY_LENGTH)
      .map((r) => sanitize(r, 500));
  if (data.benefits)
    submission.benefits = data.benefits
      .slice(0, MAX_ARRAY_LENGTH)
      .map((b) => sanitize(b, 500));
  if (data.tags)
    submission.tags = data.tags.slice(0, 20).map((t) => sanitize(t, 50));
  if (data.applicationMethod)
    submission.applicationMethod = sanitize(data.applicationMethod, 50);
  if (data.applicationUrl)
    submission.applicationUrl = sanitize(data.applicationUrl, 500);
  if (data.applicationEmail)
    submission.applicationEmail = sanitize(data.applicationEmail, 320);
  if (data.applicationDeadline)
    submission.applicationDeadline = sanitize(data.applicationDeadline, 30);

  // 4. Write to public_job_submissions
  const docRef = await db.collection('public_job_submissions').add(submission);

  return { success: true, submissionId: docRef.id };
});
```

- [ ] **Step 2: Register in index.ts**

Add import:

```typescript
import { submitPublicJob } from './public-job-submit';
```

Add re-export:

```typescript
export { submitPublicJob };
```

- [ ] **Step 3: Verify build**

Run: `cd functions && npm run build`

- [ ] **Step 4: Commit**

```bash
git add functions/src/public-job-submit.ts functions/src/index.ts
git commit -m "feat(registration): add submitPublicJob callable CF for anonymous job submissions"
```

---

## Task 5: JoinPage Component

**Files:**

- Create: `src/components/auth/JoinPage.tsx`

- [ ] **Step 1: Create the join page component**

```tsx
// src/components/auth/JoinPage.tsx
import React from 'react';
import { GraduationCap, Handshake, Building2, ArrowRight } from 'lucide-react';

interface JoinPageProps {
  lang?: 'es' | 'en';
}

const PATHS = [
  {
    key: 'member',
    icon: GraduationCap,
    titleEs: 'Soy egresado/a de Ciencia de Datos de la UNAM',
    titleEn: "I'm a UNAM Data Science graduate",
    descEs:
      'Membresía completa — networking, mentoría, bolsa de trabajo, eventos',
    descEn: 'Full membership — networking, mentorship, job board, events',
    color:
      'border-blue-500 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    arrowColor: 'text-blue-500',
  },
  {
    key: 'collaborator',
    icon: Handshake,
    titleEs: 'Quiero colaborar con SECiD',
    titleEn: 'I want to collaborate with SECiD',
    descEs: 'Acceso a eventos públicos y bolsa de trabajo',
    descEn: 'Public events & job board access',
    color:
      'border-green-500 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    arrowColor: 'text-green-500',
  },
  {
    key: 'recruiter',
    icon: Building2,
    titleEs: 'Quiero reclutar talento en Ciencia de Datos',
    titleEn: 'I want to recruit Data Science talent',
    descEs: 'Publica empleos directamente, sin necesidad de revisión',
    descEn: 'Post jobs directly, no review needed',
    color:
      'border-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    arrowColor: 'text-amber-500',
  },
];

export const JoinPage: React.FC<JoinPageProps> = ({ lang = 'es' }) => {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {lang === 'es'
            ? '¿Qué te trae a SECiD?'
            : 'What brings you to SECiD?'}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Sociedad de Egresados en Ciencia de Datos — UNAM'
            : 'Data Science Alumni Society — UNAM'}
        </p>
      </div>

      <div className="space-y-3">
        {PATHS.map((path) => {
          const Icon = path.icon;
          return (
            <a
              key={path.key}
              href={`/${lang}/signup?role=${path.key}`}
              className={`flex items-center gap-4 rounded-lg border-l-4 p-4 transition-colors ${path.color}`}
            >
              <Icon className={`h-6 w-6 flex-shrink-0 ${path.iconColor}`} />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? path.titleEs : path.titleEn}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? path.descEs : path.descEn}
                </p>
              </div>
              <ArrowRight
                className={`h-5 w-5 flex-shrink-0 ${path.arrowColor}`}
              />
            </a>
          );
        })}
      </div>

      {/* Public job posting link */}
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-3 text-center dark:border-gray-600">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? '¿Solo quieres publicar un empleo? '
            : 'Just want to post a job? '}
          <a
            href={`/${lang}/post-job`}
            className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
          >
            {lang === 'es'
              ? 'Publica sin cuenta →'
              : 'Post without an account →'}
          </a>
        </span>
      </div>

      {/* Already have an account */}
      <div className="mt-6 text-center">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es' ? '¿Ya tienes cuenta? ' : 'Already have an account? '}
          <a
            href={`/${lang}/login`}
            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            {lang === 'es' ? 'Inicia sesión' : 'Sign in'}
          </a>
        </span>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/JoinPage.tsx
git commit -m "feat(registration): add JoinPage component with 4 user paths"
```

---

## Task 6: Join Page Astro Routes + Homepage CTA Updates

**Files:**

- Create: `src/pages/es/join.astro`
- Create: `src/pages/en/join.astro`
- Modify: `src/pages/es/index.astro:23,195`
- Modify: `src/pages/en/index.astro`
- Modify: `src/pages/registro.astro:10,12`

- [ ] **Step 1: Create Spanish join page**

Read `src/pages/es/signup.astro` to match the pattern. Create:

```astro
---
// src/pages/es/join.astro
import ModernLayout from '@/layouts/ModernLayout.astro';
import { JoinPage } from '@/components/auth/JoinPage';
---

<ModernLayout
  title="Únete a SECiD"
  description="Elige cómo quieres participar en la Sociedad de Egresados en Ciencia de Datos"
  lang="es"
>
  <div class="flex min-h-[70vh] items-center justify-center">
    <JoinPage client:load lang="es" />
  </div>
</ModernLayout>
```

- [ ] **Step 2: Create English join page**

```astro
---
// src/pages/en/join.astro
import ModernLayout from '@/layouts/ModernLayout.astro';
import { JoinPage } from '@/components/auth/JoinPage';
---

<ModernLayout
  title="Join SECiD"
  description="Choose how you want to participate in the Data Science Alumni Society"
  lang="en"
>
  <div class="flex min-h-[70vh] items-center justify-center">
    <JoinPage client:load lang="en" />
  </div>
</ModernLayout>
```

- [ ] **Step 3: Update homepage CTAs**

In `src/pages/es/index.astro`, find all `href="/registro"` and change to `href="/es/join"`.

In `src/pages/en/index.astro`, find all register/join links and change to `href="/en/join"`.

- [ ] **Step 4: Update legacy redirect**

In `src/pages/registro.astro`, change:

- Line 10: `url=/es/signup` → `url=/es/join`
- Line 12: `'/es/signup'` → `'/es/join'`

- [ ] **Step 5: Commit**

```bash
git add src/pages/es/join.astro src/pages/en/join.astro src/pages/es/index.astro src/pages/en/index.astro src/pages/registro.astro
git commit -m "feat(registration): add /join pages and update homepage CTAs"
```

---

## Task 7: Expand SignUpForm — Recruiter Path + Query Param + CF Integration

**Files:**

- Modify: `src/components/auth/SignUpForm.tsx`

This is the largest task. It modifies the existing multi-step signup form.

- [ ] **Step 1: Add recruiter to Step type and labels**

In `src/components/auth/SignUpForm.tsx`:

Change line 52 from:

```typescript
type Step = 'account' | 'type' | 'unam' | 'done';
```

To:

```typescript
type Step = 'account' | 'type' | 'unam' | 'company' | 'done';
```

Add recruiter labels to the labels object (around lines 101-116), after the collaborator labels:

```typescript
recruiterOption: lang === 'es' ? 'Quiero reclutar talento' : 'I want to recruit talent',
recruiterDesc: lang === 'es'
  ? 'Publica empleos directamente. Acceso a la bolsa de trabajo y perfiles de candidatos.'
  : 'Post jobs directly. Access to job board and candidate profiles.',
```

- [ ] **Step 2: Add recruiter schema and form**

Add after the existing `unamVerificationSchema` (around line 46):

```typescript
const recruiterSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  companyPosition: z.string().min(2, 'Position is required'),
  companyWebsite: z.string().url().optional().or(z.literal('')),
});
type RecruiterFormData = z.infer<typeof recruiterSchema>;
```

Add form hook after the existing `unamForm` hook (around line 102):

```typescript
const recruiterForm = useForm<RecruiterFormData>({
  resolver: zodResolver(recruiterSchema),
  defaultValues: { companyName: '', companyPosition: '', companyWebsite: '' },
});
```

- [ ] **Step 3: Add query parameter pre-selection**

After the state declarations (around line 89), add:

```typescript
// Pre-select role from URL query parameter
React.useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role');
  if (role === 'member' || role === 'collaborator' || role === 'recruiter') {
    setRegistrationType(role as RegistrationType);
  }
}, []);
```

- [ ] **Step 4: Update step indicator**

In the steps array definition (around line 398), update to include the recruiter path:

```typescript
const steps = [
  { key: 'account', label: labels.step1 },
  { key: 'type', label: labels.step2 },
  ...(registrationType === 'member'
    ? [{ key: 'unam', label: labels.step3 }]
    : []),
  ...(registrationType === 'recruiter'
    ? [{ key: 'company', label: lang === 'es' ? 'Empresa' : 'Company' }]
    : []),
  { key: 'done', label: labels.step4 },
];
```

- [ ] **Step 5: Update Step 2 type selection to handle recruiter**

In the type selection handler (when user clicks a type and the "Next" button), update the logic:

For the "Next" button click on Step 2, the current logic sets `setStep('unam')` for member and `setStep('done')` for collaborator. Add the recruiter case:

```typescript
if (registrationType === 'member') {
  setStep('unam');
} else if (registrationType === 'recruiter') {
  setStep('company');
} else {
  // Collaborator — call completeRegistration directly
  await callCompleteRegistration({ registrationType: 'collaborator' });
  setStep('done');
}
```

Add a recruiter option button in Step 2 (after the collaborator option, around line 742):

```tsx
{
  /* Recruiter option */
}
<button
  type="button"
  onClick={() => setRegistrationType('recruiter')}
  className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
    registrationType === 'recruiter'
      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
      : 'border-gray-200 hover:border-amber-300 dark:border-gray-600'
  }`}
>
  <div className="flex items-center gap-3">
    <Building2 className="h-6 w-6 text-amber-600" />
    <div>
      <p className="font-semibold text-gray-900 dark:text-white">
        {labels.recruiterOption}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {labels.recruiterDesc}
      </p>
    </div>
  </div>
</button>;
```

Add `Building2` to the lucide-react imports at the top of the file.

- [ ] **Step 6: Add Company Info step (Step 3 for recruiters)**

Add a new step rendering block for `step === 'company'` (after the UNAM step block). This renders the recruiter form:

```tsx
{
  step === 'company' && (
    <form
      onSubmit={recruiterForm.handleSubmit(onRecruiterSubmit)}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Nombre de la Empresa' : 'Company Name'} *
        </label>
        <input
          {...recruiterForm.register('companyName')}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
        />
        {recruiterForm.formState.errors.companyName && (
          <p className="mt-1 text-sm text-red-600">
            {recruiterForm.formState.errors.companyName.message}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Tu Cargo' : 'Your Position'} *
        </label>
        <input
          {...recruiterForm.register('companyPosition')}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
        />
        {recruiterForm.formState.errors.companyPosition && (
          <p className="mt-1 text-sm text-red-600">
            {recruiterForm.formState.errors.companyPosition.message}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Sitio Web de la Empresa' : 'Company Website'}
        </label>
        <input
          {...recruiterForm.register('companyWebsite')}
          placeholder="https://..."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading
          ? lang === 'es'
            ? 'Registrando...'
            : 'Registering...'
          : lang === 'es'
            ? 'Completar Registro'
            : 'Complete Registration'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 7: Add recruiter submit handler and CF caller**

Add the `httpsCallable` import and helper function. Near the top imports:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
```

Add the CF caller function inside the component:

```typescript
const callCompleteRegistration = async (data: Record<string, any>) => {
  const fn = httpsCallable(functions, 'completeRegistration');
  const result = await fn(data);
  return result.data as { success: boolean; registrationType: string };
};
```

Add the recruiter submit handler:

```typescript
const onRecruiterSubmit = async (data: RecruiterFormData) => {
  setIsLoading(true);
  setError(null);
  try {
    await callCompleteRegistration({
      registrationType: 'recruiter',
      companyName: data.companyName,
      companyPosition: data.companyPosition,
      companyWebsite: data.companyWebsite || '',
    });
    setStep('done');
  } catch (err: any) {
    setError(
      lang === 'es'
        ? 'Error al registrar. Inténtalo de nuevo.'
        : 'Registration error. Please try again.'
    );
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 8: Refactor UNAM submit to use CF**

Update `onUnamSubmit` to call `completeRegistration` instead of direct `updateDoc`. Keep the file upload logic but replace the Firestore update with the CF call:

After the file upload section and before `setStep('done')`, replace the `updateDoc` call with:

```typescript
await callCompleteRegistration({
  registrationType: 'member',
  numeroCuenta: data.numeroCuenta,
  academicLevel: data.academicLevel,
  campus: data.campus,
  generation: data.generation || '',
  graduationYear: data.graduationYear,
  verificationDocumentUrl: verificationDocumentUrl || '',
});
```

Keep the existing merge detection code that runs after (`checkNumeroCuentaMatch` + `setPotentialMergeMatch`).

- [ ] **Step 9: Update Done step for recruiters**

In the done step rendering (around line 961-1000), add a recruiter-specific message:

```tsx
{
  registrationType === 'recruiter' && (
    <>
      <h2 className="text-xl font-bold">
        {lang === 'es' ? '¡Bienvenido/a, reclutador/a!' : 'Welcome, recruiter!'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        {lang === 'es'
          ? 'Tu cuenta ha sido creada. Ahora puedes publicar empleos que se publicarán inmediatamente.'
          : 'Your account has been created. You can now post jobs that will be published immediately.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={goToDashboard}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {lang === 'es' ? 'Ir al panel' : 'Go to Dashboard'}
        </button>
        <a
          href={`/${lang}/post-job`}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
        >
          {lang === 'es' ? 'Publicar un empleo' : 'Post a Job'}
        </a>
      </div>
    </>
  );
}
```

- [ ] **Step 10: Add inline migration check**

In the UNAM verification form (Step 3 for members), add a debounced check on the `numeroCuenta` field. After the numeroCuenta input field, add state and effect:

```typescript
const [matchChecking, setMatchChecking] = useState(false);
const [matchFound, setMatchFound] = useState(false);
```

Add an `onBlur` handler to the numeroCuenta input:

```tsx
onBlur={async (e) => {
  const value = e.target.value;
  if (value.length >= 5 && auth.currentUser) {
    setMatchChecking(true);
    try {
      const match = await checkNumeroCuentaMatch(value, auth.currentUser.uid);
      setMatchFound(!!match);
    } catch {
      // Silent fail — post-submit check is the fallback
    } finally {
      setMatchChecking(false);
    }
  }
}}
```

Add inline banner below the input:

```tsx
{
  matchChecking && <p className="mt-1 text-xs text-gray-500">Checking...</p>;
}
{
  matchFound && (
    <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
      <p className="text-sm font-medium text-green-800 dark:text-green-300">
        {lang === 'es'
          ? '¡Perfil existente detectado! Puedes reclamarlo después de completar el registro.'
          : 'Existing profile detected! You can claim it after completing registration.'}
      </p>
    </div>
  );
}
```

`checkNumeroCuentaMatch` is already imported from `@/lib/merge/mutations` (added in Task 11 of the merge system plan).

- [ ] **Step 11: Commit**

```bash
git add src/components/auth/SignUpForm.tsx
git commit -m "feat(registration): expand SignUpForm with recruiter path, CF integration, and inline migration check"
```

---

## Task 8: Update JobPostingForm for Public Submissions + Status Fix

**Files:**

- Modify: `src/components/jobs/JobPostingForm.tsx`

- [ ] **Step 1: Fix status from 'pending' to 'draft'**

In `src/components/jobs/JobPostingForm.tsx`, find the `handleSubmit` function (line ~296). Change:

```typescript
status: 'pending',
```

To:

```typescript
status: 'draft',
```

Also add `createdAt` alongside the existing `postedAt`:

```typescript
createdAt: serverTimestamp(),
```

- [ ] **Step 2: Add unauthenticated submission support**

Add imports at the top:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
```

In the `handleSubmit` function, before the existing auth check (`if (!user)`), add the unauthenticated path:

```typescript
// Public submission (no auth required)
if (!user) {
  if (!contactEmail || !contactName) {
    setError(
      lang === 'es'
        ? 'Email y nombre son requeridos'
        : 'Email and name are required'
    );
    return;
  }
  setIsSubmitting(true);
  try {
    const submitFn = httpsCallable(functions, 'submitPublicJob');
    await submitFn({
      ...jobData,
      contactEmail,
      contactName,
    });
    setSubmitted(true);
    setPublicSubmission(true);
  } catch (err: any) {
    setError(
      err.message || (lang === 'es' ? 'Error al enviar' : 'Submission error')
    );
  } finally {
    setIsSubmitting(false);
  }
  return;
}
```

- [ ] **Step 3: Add contact fields for unauthenticated users**

Add state:

```typescript
const [contactEmail, setContactEmail] = useState('');
const [contactName, setContactName] = useState('');
const [publicSubmission, setPublicSubmission] = useState(false);
```

In the form UI, at the beginning (Step 1), conditionally render contact fields when not authenticated:

```tsx
{
  !user && (
    <div className="mb-6 space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
        {lang === 'es'
          ? 'Información de contacto (publicación sin cuenta)'
          : 'Contact info (posting without account)'}
      </p>
      <div>
        <label className="block text-sm font-medium">
          {lang === 'es' ? 'Tu Nombre' : 'Your Name'} *
        </label>
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          {lang === 'es' ? 'Tu Email' : 'Your Email'} *
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update success message for public submissions**

In the success/confirmation view, add a public submission variant:

```tsx
{publicSubmission ? (
  <p>{lang === 'es'
    ? `Tu publicación ha sido enviada para revisión. Te notificaremos en ${contactEmail} cuando sea publicada.`
    : `Your job posting has been submitted for review. We'll notify you at ${contactEmail} when it's published.`}
  </p>
) : (
  // existing success message
)}
```

- [ ] **Step 5: Auto-publish message for company role**

Add check for company role after the existing auth submit:

```typescript
const isCompany = userProfile?.role === 'company';
// ... in the success view:
{isCompany && <p>{lang === 'es' ? '¡Tu empleo ha sido publicado!' : 'Your job has been published!'}</p>}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/jobs/JobPostingForm.tsx
git commit -m "feat(registration): add public job submissions, fix status to draft, add recruiter auto-publish"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run type check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 2: Run Cloud Functions build**

Run: `cd functions && npm run build`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS (or fix any issues)

- [ ] **Step 4: Run unit tests**

Run: `npx vitest run tests/unit/`
Expected: All existing tests pass

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(registration): address lint and type-check issues"
```
