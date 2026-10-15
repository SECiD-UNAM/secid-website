# Companies Collection + Logo Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `companies` Firestore collection with logos in Firebase Storage, replacing the text-based company grid with real logos. Includes member contributions (post-moderation), admin management, and a backfill script.

**Architecture:** Dedicated `companies` collection in Firestore, logos in Firebase Storage. Members create/edit companies via an Astro API route (rate-limited, server-validated). Admins manage via a dashboard UI. A Cloud Function keeps `memberCount` in sync. A one-time backfill script populates existing companies from member data.

**Tech Stack:** Astro 4.x, React 18, Firebase (Firestore, Storage, Cloud Functions v2), Tailwind CSS, TypeScript, Logo.dev API (optional, admin-only)

**Spec:** `docs/superpowers/specs/2026-03-20-companies-collection-design.md`

---

### Task 1: Create Company type definition

**Files:**

- Create: `src/types/company.ts`

- [ ] **Step 1: Create the Company interface**

```typescript
export interface Company {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
  memberCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  pendingReview: boolean;
  lastReviewedBy?: string;
  lastReviewedAt?: Date;
}

export interface CompanyCreateInput {
  name: string;
  domain: string;
  logoUrl?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
}

export interface CompanyUpdateInput {
  name?: string;
  domain?: string;
  logoUrl?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/company.ts
git commit -m "feat: add Company type definition"
```

---

### Task 2: Update member types — add companyId to profile and WorkExperience

**Files:**

- Modify: `src/types/user.ts:21-34` (UserProfile.profile block — add `companyId`)
- Modify: `src/types/member.ts:167-177` (WorkExperience — add `companyId`)
- [ ] **Step 1: Add `companyId` to UserProfile.profile**

In `src/types/user.ts`, inside the `profile` block (line 21-34), add after `company: string`:

```typescript
    companyId?: string;  // reference to companies collection doc
```

- [ ] **Step 2: Add `companyId` to WorkExperience**

In `src/types/member.ts`, inside the `WorkExperience` interface (line 167-177), add:

```typescript
  companyId?: string;  // reference to companies collection doc
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors (no consumers of the new fields yet)

- [ ] **Step 4: Commit**

```bash
git add src/types/user.ts src/types/member.ts
git commit -m "refactor: add companyId to profile/WorkExperience, remove companies from MemberStatisticsData"
```

---

### Task 3: Update mapper — surface profile.companyId from Firestore

**Files:**

- Modify: `src/lib/members/mapper.ts:68` (profile block)

- [ ] **Step 1: Add companyId to the profile mapping**

In `mapper.ts`, inside the `profile` return block (around line 68), add:

```typescript
      companyId: data.profile?.companyId || data.companyId || undefined,
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: Same errors as before (queries.ts, components). mapper.ts should be clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/members/mapper.ts
git commit -m "feat: surface profile.companyId from Firestore in mapper"
```

---

### Task 4: Create company queries and mutations

**Files:**

- Create: `src/lib/companies/queries.ts`
- Create: `src/lib/companies/mutations.ts`
- Create: `src/lib/companies/index.ts`

- [ ] **Step 1: Create `src/lib/companies/queries.ts`**

```typescript
import { db } from '../firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import type { Company } from '@/types/company';

const COLLECTION = 'companies';

function mapCompanyDoc(id: string, data: Record<string, any>): Company {
  return {
    id,
    name: data.name || '',
    domain: data.domain || '',
    logoUrl: data.logoUrl || undefined,
    industry: data.industry || undefined,
    location: data.location || undefined,
    website: data.website || undefined,
    description: data.description || undefined,
    memberCount: data.memberCount || 0,
    createdBy: data.createdBy || '',
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    pendingReview: data.pendingReview ?? false,
    lastReviewedBy: data.lastReviewedBy || undefined,
    lastReviewedAt: data.lastReviewedAt?.toDate?.() || undefined,
  };
}

export async function getCompanies(): Promise<Company[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => mapCompanyDoc(d.id, d.data()));
}

export async function getCompaniesWithMembers(): Promise<Company[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('memberCount', '>', 0))
  );
  return snapshot.docs
    .map((d) => mapCompanyDoc(d.id, d.data()))
    .sort((a, b) => b.memberCount - a.memberCount);
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, companyId));
  if (!docSnap.exists()) return null;
  return mapCompanyDoc(docSnap.id, docSnap.data());
}

export async function getCompanyByDomain(
  domain: string
): Promise<Company | null> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('domain', '==', domain))
  );
  if (snapshot.empty) return null;
  const d = snapshot.docs[0]!;
  return mapCompanyDoc(d.id, d.data());
}

export async function getPendingReviewCompanies(): Promise<Company[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('pendingReview', '==', true))
  );
  return snapshot.docs.map((d) => mapCompanyDoc(d.id, d.data()));
}
```

- [ ] **Step 2: Create `src/lib/companies/mutations.ts`**

```typescript
import { db, storage } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { CompanyCreateInput, CompanyUpdateInput } from '@/types/company';

const COLLECTION = 'companies';

export async function createCompany(
  input: CompanyCreateInput,
  createdBy: string
): Promise<string> {
  const docRef = doc(collection(db, COLLECTION));
  await setDoc(docRef, {
    ...input,
    memberCount: 0,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    pendingReview: true,
  });
  return docRef.id;
}

export async function updateCompany(
  companyId: string,
  input: CompanyUpdateInput
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, companyId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCompany(companyId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, companyId));
}

export async function uploadCompanyLogo(
  companyId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const logoRef = ref(storage, `companies/${companyId}/logo.${ext}`);
  await uploadBytes(logoRef, file, { contentType: file.type });
  return getDownloadURL(logoRef);
}

export async function approveCompany(
  companyId: string,
  reviewerUid: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, companyId), {
    pendingReview: false,
    lastReviewedBy: reviewerUid,
    lastReviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectCompany(companyId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, companyId));
}
```

- [ ] **Step 3: Create barrel export `src/lib/companies/index.ts`**

```typescript
export {
  getCompanies,
  getCompaniesWithMembers,
  getCompany,
  getCompanyByDomain,
  getPendingReviewCompanies,
} from './queries';

export {
  createCompany,
  updateCompany,
  deleteCompany,
  uploadCompanyLogo,
  approveCompany,
  rejectCompany,
} from './mutations';
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep companies`
Expected: 0 errors in companies files

- [ ] **Step 5: Commit**

```bash
git add src/lib/companies/
git commit -m "feat: add company queries and mutations"
```

---

### Task 5: Create CompanyLogo shared component (was Task 6) Create CompanyLogo shared component

**Files:**

- Create: `src/components/shared/CompanyLogo.tsx`

- [ ] **Step 1: Create the component**

A reusable component that renders an `<img>` with the company logo, or falls back to a colored initial avatar.

Props: `{ company: { name: string; logoUrl?: string }; size?: 'sm' | 'md' | 'lg'; className?: string }`

Size mapping: sm = w-8 h-8, md = w-10 h-10, lg = w-16 h-16.

Uses the same `getCompanyColor` hash function from existing components. When `logoUrl` is truthy, renders `<img>` with `onError` fallback to the initial avatar. Dark mode support.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep CompanyLogo`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/CompanyLogo.tsx
git commit -m "feat: create CompanyLogo shared component with fallback avatar"
```

---

### Task 7: Update MemberShowcase to use companies collection

**Files:**

- Modify: `src/components/directory/MemberShowcase.tsx`

- [ ] **Step 1: Change data source**

Rework the component to use two data sources:

- Import `getCompaniesWithMembers` from `@/lib/companies`
- Import `getMemberStatistics` from `@/lib/members`
- Import `CompanyLogo` from `@/components/shared/CompanyLogo`
- Import `Company` type from `@/types/company`

Two separate state variables:

```typescript
const [companies, setCompanies] = useState<Company[]>([]);
const [totalMembers, setTotalMembers] = useState(0);
```

In `loadData`:

```typescript
const [companiesData, statsData] = await Promise.all([
  getCompaniesWithMembers(),
  getMemberStatistics(),
]);
setCompanies(companiesData);
setTotalMembers(statsData.totalMembers);
```

Empty state check: `companies.length === 0` (not `data.companies.length`)
Footer: uses `totalMembers` state variable
Grid: iterates `companies`, renders `<CompanyLogo company={c} />` for each
Remove the old `getCompanyColor` function (now in CompanyLogo)

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep MemberShowcase`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/directory/MemberShowcase.tsx
git commit -m "feat: update MemberShowcase to use companies collection with logos"
```

---

### Task 8: Update InsightsTab/MemberDashboard + remove companies from MemberStatisticsData

**Files:**

- Modify: `src/components/dashboard/members/MemberDashboard.tsx:40-48,131` (add companies fetch, pass to InsightsTab)
- Modify: `src/components/dashboard/members/InsightsTab.tsx:14-17,138-182` (accept companies prop, use CompanyLogo)
- Modify: `src/types/member.ts:247` (remove `companies` from `MemberStatisticsData`)
- Modify: `src/lib/members/queries.ts` (remove `companies` from return value and mock data)

- [ ] **Step 1: Update MemberDashboard**

- Import `getCompaniesWithMembers` from `@/lib/companies`
- Import `Company` type from `@/types/company`
- Add state: `const [companies, setCompanies] = useState<Company[]>([]);`
- Add `getCompaniesWithMembers()` to the `Promise.all` in `loadData`
- Pass to InsightsTab: `<InsightsTab statistics={statistics} companies={companies} lang={lang} />`

- [ ] **Step 2: Update InsightsTab**

- Add `companies: Company[]` to props interface (import from `@/types/company`)
- Import `CompanyLogo` from `@/components/shared/CompanyLogo`
- Replace the company grid section to iterate over `companies` prop instead of `statistics.companies`
- Use `CompanyLogo` component for each company
- Remove the old `getCompanyColor` function (now in CompanyLogo)

- [ ] **Step 3: Remove `companies` from MemberStatisticsData**

Now that all consumers are updated, remove the field:

In `src/types/member.ts`, remove from `MemberStatisticsData`:

```typescript
companies: Array<{ name: string; count: number }>;
```

In `src/lib/members/queries.ts`, remove:

- `const companyMap = new Map<string, number>();` initialization
- The company aggregation block (`data.profile?.company` logic)
- The `companies:` field from the return object
- The `companies:` field from the mock data return

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors (all consumers now use the companies collection, not `statistics.companies`)

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/members/MemberDashboard.tsx src/components/dashboard/members/InsightsTab.tsx src/types/member.ts src/lib/members/queries.ts
git commit -m "feat: update InsightsTab/MemberDashboard to use companies collection, remove companies from MemberStatisticsData"
```

---

### Task 9: Add Firestore and Storage security rules

**Files:**

- Modify: `firestore.rules` (add companies collection match block)
- Modify: `storage.rules` (update companies logo path rules)

- [ ] **Step 1: Add companies collection Firestore rules**

After the existing `match /users/{userId}` block in `firestore.rules`, add:

```
    // Companies collection
    match /companies/{companyId} {
      allow read: if isAuthenticated();

      // Verified active members can create — must set pendingReview: true
      // memberCount is NOT in allowlist — only Cloud Functions can set it
      allow create: if isAuthenticated() &&
        isVerified() &&
        request.resource.data.pendingReview == true &&
        request.resource.data.keys().hasOnly([
          'name', 'domain', 'logoUrl', 'industry', 'location',
          'website', 'description', 'createdBy', 'createdAt',
          'updatedAt', 'pendingReview'
        ]);

      // Owners can update their own companies (must keep pendingReview: true)
      // Admins/moderators can update any company (can set pendingReview: false)
      allow update: if isAuthenticated() && (
        (isVerified() &&
          resource.data.createdBy == request.auth.uid &&
          request.resource.data.pendingReview == true &&
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['name', 'domain', 'logoUrl', 'industry', 'location',
                      'website', 'description', 'updatedAt', 'pendingReview']))
        || canModerate()
      );

      allow delete: if canModerate();
    }
```

Note: `memberCount`, `lastReviewedBy`, `lastReviewedAt` are only writable by Cloud Functions (Admin SDK bypasses rules).

- [ ] **Step 2: Update Storage rules for company logos**

In `storage.rules`, find the existing `match /companies/{companyId}/{allPaths=**}` block and replace it with:

```
    match /companies/{companyId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
```

This enforces: authenticated users only, max 2MB, image content types only.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules storage.rules
git commit -m "feat: add Firestore and Storage security rules for companies collection"
```

---

### Task 10: Create API routes for member company creation and admin logo fetch

**Files:**

- Create: `src/pages/api/companies/index.ts` (member company creation with rate limiting)
- Create: `src/pages/api/companies/fetch-logo.ts` (admin logo fetch from Logo.dev)

- [ ] **Step 1: Create `src/pages/api/companies/index.ts`**

POST route for verified members to create companies. Enforces:

- Auth check via `verifyRequest()`
- Verified member check
- Rate limit: max 5 company creations per day (check `companies` collection for docs with `createdBy == uid` and `createdAt >= 24h ago`)
- Validates input (name required, max 100 chars, domain required)
- Creates company doc with `pendingReview: true`
- Returns `{ companyId }` on success

Follow the pattern from `src/pages/api/create-payment-intent.ts`.

- [ ] **Step 2: Create `src/pages/api/companies/fetch-logo.ts`**

POST route for admins to auto-fetch a company logo:

- Auth check + admin role verification
- Receives `{ domain, companyId }`
- Fetches from Logo.dev: `https://img.logo.dev/${domain}?token=${process.env.LOGO_DEV_API_TOKEN}&format=png`
- Fallback: Google favicon `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
- Uploads to Firebase Storage at `companies/${companyId}/logo.png`
- Updates company doc with `logoUrl`
- Returns `{ logoUrl }`

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep 'api/companies'`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/companies/
git commit -m "feat: add API routes for company creation and logo fetch"
```

---

### Task 11: Create Cloud Function for memberCount updates

**Files:**

- Create: `functions/src/companies.ts`
- Modify: `functions/src/index.ts` (import and re-export)

- [ ] **Step 1: Create `functions/src/companies.ts`**

Cloud Function `onMemberCompanyChange`:

- Trigger: `onDocumentUpdated('users/{userId}', ...)`
- First check: `if (afterData._backfill) return null;` — skip writes from the backfill script
- Compares `before.data().profile?.companyId` vs `after.data().profile?.companyId`
- If they differ:
  - If old companyId exists: decrement `memberCount` via `FieldValue.increment(-1)`
  - If new companyId exists: increment `memberCount` via `FieldValue.increment(1)`
- Writes **only** to `companies/{companyId}` — never writes back to user doc (avoids infinite trigger loop)

Follow the pattern from `functions/src/index.ts` `matchJobsForUser` (line 135).

- [ ] **Step 2: Add export in `functions/src/index.ts`**

Add: `export { onMemberCompanyChange } from './companies';`

- [ ] **Step 3: Commit**

```bash
git add functions/src/companies.ts functions/src/index.ts
git commit -m "feat: add Cloud Function for company memberCount updates"
```

---

### Task 12: Create admin CompanyManagement UI

**Files:**

- Create: `src/components/dashboard/admin/CompanyManagement.tsx`
- Create: `src/pages/es/dashboard/admin/companies/index.astro`
- Create: `src/pages/en/dashboard/admin/companies/index.astro`

- [ ] **Step 1: Create `CompanyManagement.tsx`**

Admin component with:

- Two views toggled by tabs: "All Companies" and "Review Queue" (`pendingReview === true`)
- Company table: logo thumbnail (via CompanyLogo), name, domain, industry, member count, review status, actions
- Actions: Edit (inline modal), Approve, Reject, Delete (with confirmation)
- "Add Company" button — opens modal with form (name, domain, industry, location, website, description, logo upload)
- "Fetch Logo" button in edit/add modal — calls `/api/companies/fetch-logo` with the domain
- Uses `getCompanies`, `getPendingReviewCompanies`, `approveCompany`, `rejectCompany`, `updateCompany`, `deleteCompany`, `uploadCompanyLogo` from `@/lib/companies`
- i18n: `lang === 'es' ? 'Spanish' : 'English'`
- Dark mode support

- [ ] **Step 2: Create Astro pages**

`src/pages/es/dashboard/admin/companies/index.astro`:

```astro
---
import DashboardLayout from '@/layouts/DashboardLayout.astro';
import CompanyManagementPage from '@/components/wrappers/CompanyManagementPage';
---

<DashboardLayout
  title="Gestión de Empresas - SECiD"
  description="Administración de empresas de miembros"
  lang="es"
  requireVerified={true}
  requireRole={['admin', 'moderator']}
>
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Gestión de Empresas
    </h1>
  </div>
  <CompanyManagementPage client:only="react" lang="es" />
</DashboardLayout>
```

Create equivalent for `/en/` with `lang="en"` and English text.

- [ ] **Step 3: Create wrapper `src/components/wrappers/CompanyManagementPage.tsx`**

```typescript
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyManagement } from '@/components/dashboard/admin/CompanyManagement';

interface Props {
  lang?: 'es' | 'en';
}

export default function CompanyManagementPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CompanyManagement lang={lang} />
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/admin/ src/components/wrappers/CompanyManagementPage.tsx src/pages/es/dashboard/admin/companies/ src/pages/en/dashboard/admin/companies/
git commit -m "feat: add admin company management UI with review queue"
```

---

### Task 13: Create backfill script

**Files:**

- Create: `scripts/backfill-companies.cjs`

- [ ] **Step 1: Query existing companies from Firestore**

First, run a query to extract unique company names from current member data, to build the COMPANY_MAP:

```bash
node -e "
const path = require('path');
const fs = require('fs');
const admin = require(path.resolve(__dirname, 'functions/node_modules/firebase-admin'));
// ... (same Firebase CLI auth pattern as import-members.cjs)
const db = admin.firestore();
db.collection('users').get().then(snap => {
  const companies = new Map();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.role === 'collaborator') return;
    const company = d.profile?.company || d.currentCompany;
    if (company) companies.set(company, (companies.get(company) || 0) + 1);
  });
  const sorted = [...companies.entries()].sort((a,b) => b[1] - a[1]);
  sorted.forEach(([name, count]) => console.log(count + 'x ' + name));
  process.exit(0);
});
"
```

Use the output to populate the COMPANY_MAP in the script.

- [ ] **Step 2: Create `scripts/backfill-companies.cjs`**

Script that:

1. Reads `COMPANY_MAP` (hardcoded company name → { domain, industry, location })
2. For each company: checks if doc with same `domain` exists (idempotent), creates if not
3. Optionally fetches logo from Logo.dev / Google favicon (unless `--skip-logos`)
4. Scans all member docs, matches `profile.company` to a company doc, sets `profile.companyId`
5. Recomputes `memberCount` on each company doc
6. Supports `--dry-run` and `--skip-logos` flags

Follow the same Firebase Admin SDK auth pattern as `scripts/import-members.cjs`.

- [ ] **Step 3: Run with `--dry-run`**

```bash
node scripts/backfill-companies.cjs --dry-run
```

Review output. Correct any wrong domain mappings.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-companies.cjs
git commit -m "feat: add backfill script for companies collection"
```

---

### Task 14: Format and final verification

- [ ] **Step 1: Format all files**

```bash
npx prettier --write "src/types/company.ts" "src/lib/companies/**" "src/components/shared/CompanyLogo.tsx" "src/components/dashboard/admin/**" "src/components/wrappers/CompanyManagementPage.tsx" "src/pages/api/companies/**" "src/pages/es/dashboard/admin/companies/**" "src/pages/en/dashboard/admin/companies/**" "functions/src/companies.ts" "scripts/backfill-companies.cjs"
npm run format:check
```

- [ ] **Step 2: Full type check and lint**

```bash
npx tsc --noEmit
npx eslint src/ --no-error-on-unmatched-pattern
```

Expected: 0 errors

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: All existing tests pass

- [ ] **Step 4: Commit formatting if needed**

```bash
git add -A
git commit -m "style: format companies collection files"
```

- [ ] **Step 5: Manual testing checklist**

1. Navigate to `/es/members` — company grid renders (with initial avatars, no logos yet until backfill)
2. Navigate to `/es/dashboard/members/` → Insights tab — company grid renders
3. Admin: `/es/dashboard/admin/companies` — empty table, "Add Company" works
4. Admin: add a company with logo upload — appears in table with logo
5. Admin: "Fetch Logo" with a domain — logo fetched and displayed
6. Navigate to `/en/members` and `/en/dashboard/admin/companies` — English versions work
7. Verify dark mode on all pages

- [ ] **Step 6: Run backfill (after manual review of COMPANY_MAP)**

```bash
node scripts/backfill-companies.cjs --dry-run  # review first
node scripts/backfill-companies.cjs             # execute
```

- [ ] **Step 7: Post-backfill verification**

1. `/es/members` — company grid shows real logos
2. `/es/dashboard/members/` → Insights — logos render
3. Admin companies page — all companies listed with correct memberCount
