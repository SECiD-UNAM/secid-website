# Salary Data Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move compensation data from user docs to a secure sub-collection with strict Firestore rules, and replace client-side aggregation with a server-side Cloud Function that returns tiered stats.

**Architecture:** Compensation stored in `users/{uid}/compensation/{entryId}` sub-collection (owner + admin read only). `getSalaryStats` callable CF aggregates data server-side and returns tiered response based on caller's role and contribution status. Client never sees raw salary data unless admin.

**Tech Stack:** Firebase Firestore, Cloud Functions v2 (onCall), Firebase Admin SDK, TypeScript

---

## File Structure

### New files

| File                                                | Responsibility                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `functions/src/get-salary-stats.ts`                 | Callable CF: reads all compensation docs, aggregates, returns tiered stats |
| `scripts/migrate-compensation-to-subcollection.mjs` | One-time migration: copies compensation from user docs to sub-collection   |

### Modified files

| File                                                   | Change                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `firestore.rules`                                      | Add `users/{userId}/compensation/{entryId}` rules                |
| `functions/src/index.ts`                               | Export `getSalaryStats`                                          |
| `src/components/profile/shared/CompensationFields.tsx` | Read/write from sub-collection instead of parent work entry      |
| `src/components/salary/SalaryInsights.tsx`             | Call `getSalaryStats` CF instead of client-side aggregation      |
| `src/components/salary/SalaryAdminTable.tsx`           | Accept `rawData` from CF response instead of raw member profiles |

---

## Task 1: Firestore rules + Cloud Function

**Files:**

- Modify: `firestore.rules`
- Create: `functions/src/get-salary-stats.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Add compensation sub-collection rules to firestore.rules**

Inside the `match /users/{userId}` block, add:

```
// Compensation sub-collection: owner + admin read/write
match /compensation/{entryId} {
  allow read, write: if isAuthenticated() && isOwner(userId);
  allow read: if isAuthenticated() && canModerate();
}
```

- [ ] **Step 2: Create getSalaryStats Cloud Function**

Create `functions/src/get-salary-stats.ts`. The CF:

1. Verifies caller is authenticated
2. Reads all `users/*/compensation/*` docs using collection group query (Admin SDK)
3. Joins with user docs for `experience.level` and company docs for `industry`
4. Computes aggregates with `safeAggregate` (min 3 per group)
5. Checks if caller has any docs in `users/{callerUid}/compensation`
6. Returns tiered response: overview/distribution/byExperience always, byIndustry/benefits/breakdown for contributors, rawData for admins

- [ ] **Step 3: Export from index.ts**

Add to `functions/src/index.ts`:

```typescript
export { getSalaryStats } from './get-salary-stats';
```

- [ ] **Step 4: Build Cloud Functions**

Run: `cd functions && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add firestore.rules functions/src/get-salary-stats.ts functions/src/index.ts
git commit -m "feat(salary): add getSalaryStats CF + compensation sub-collection rules"
```

---

## Task 2: Refactor CompensationFields to use sub-collection

**Files:**

- Modify: `src/components/profile/shared/CompensationFields.tsx`

- [ ] **Step 1: Change CompensationFields to read/write from sub-collection**

Instead of receiving `compensation` as a prop and calling `onUpdate`, the component:

1. Receives `userId` and `roleId` props (from the work entry's `id`)
2. On mount, reads from `users/{userId}/compensation/{roleId}` via Firestore client SDK
3. On save, writes to the same path
4. Falls back gracefully if no doc exists (new entry)

Keep the `onUpdate` prop for backward compatibility during transition — if `roleId` is not provided, falls back to the old prop-based behavior.

- [ ] **Step 2: Update CareerTab to pass userId and roleId**

The `WorkEntryForm` already has `entry.id`. Pass it along:

```tsx
<CompensationFields
  userId={effectiveUid}
  roleId={entry.id}
  compensation={entry.compensation}
  onUpdate={(comp) => onUpdate({ compensation: comp })}
  lang={lang}
/>
```

Note: `effectiveUid` needs to be threaded down from ProfileEdit → CareerTab → WorkEntryForm. Check if it's already available or add it as a prop.

- [ ] **Step 3: Verify and commit**

Run: `npm run check`

```bash
git add src/components/profile/shared/CompensationFields.tsx src/components/profile/tabs/CareerTab.tsx
git commit -m "feat(salary): CompensationFields reads/writes from compensation sub-collection"
```

---

## Task 3: Refactor SalaryInsights + AdminTable to use CF

**Files:**

- Modify: `src/components/salary/SalaryInsights.tsx`
- Modify: `src/components/salary/SalaryAdminTable.tsx`

- [ ] **Step 1: Update SalaryInsights to call getSalaryStats CF**

Replace `getMemberProfiles` + client-side `extractSalaryDataPoints` with:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const getSalaryStatsFn = httpsCallable(functions, 'getSalaryStats');
const result = await getSalaryStatsFn();
const stats = result.data as SalaryStatsResponse;
```

The component renders whatever fields are non-null in the response. The tiered access logic moves from client to CF — remove `hasRecentContribution`, `BlurredOverlay`, and the tier checks. Instead:

- If `stats.byIndustry` is null → show blurred placeholder with "share to unlock"
- If `stats.rawData` is non-null → show admin table
- The access badge comes from `stats.tier`

- [ ] **Step 2: Update SalaryAdminTable to accept CF data**

Change props from `{ members, companyMap, lang }` to `{ data: AdminRow[], lang }` where `AdminRow` comes directly from the CF response.

- [ ] **Step 3: Verify and commit**

Run: `npm run check`

```bash
git add src/components/salary/SalaryInsights.tsx src/components/salary/SalaryAdminTable.tsx
git commit -m "feat(salary): SalaryInsights calls getSalaryStats CF instead of client-side aggregation"
```

---

## Task 4: Migration script + cleanup

**Files:**

- Create: `scripts/migrate-compensation-to-subcollection.mjs`

- [ ] **Step 1: Create migration script**

Script reads all user docs, extracts `compensation` from `experience.previousRoles[]`, writes to `users/{uid}/compensation/{roleId}`, then removes `compensation` from the role entry.

Features:

- `--dry-run` mode by default (shows what would happen)
- `--execute` flag to actually run
- Logs each operation
- Uses Firebase Admin SDK from `functions/` directory

- [ ] **Step 2: Test with dry run**

Run: `cd functions && node -e "..." --dry-run`
Expected: Shows which entries would be migrated

- [ ] **Step 3: Execute migration**

Run with `--execute` flag

- [ ] **Step 4: Verify**

Check Firestore console: `users/{uid}/compensation/` docs exist, `experience.previousRoles[].compensation` is removed from user docs.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-compensation-to-subcollection.mjs
git commit -m "feat(salary): add migration script for compensation sub-collection"
```

---

## Task 5: Final verification + push

- [ ] **Step 1: npm run check** — 0 new errors
- [ ] **Step 2: npm run lint** — clean
- [ ] **Step 3: Test salary insights page** — loads via CF, no raw data in network tab
- [ ] **Step 4: Test as non-contributor** — restricted fields are null
- [ ] **Step 5: Test as admin** — raw data table shows
- [ ] **Step 6: Push**

```bash
git push origin feature/hub
```
