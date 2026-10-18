# Security Audit: Salary / Compensation Data Flow

**Date**: 2026-03-23
**Reviewer**: Centinela (QA Agent)
**Scope**: Firestore rules (`/users/{userId}/compensation/{entryId}`), Cloud Function `getSalaryStats`, client components `SalaryInsights`, `SalaryAdminTable`, `CompensationFields`, `ProfileEdit`, `src/lib/members/queries.ts`, `src/lib/members/mapper.ts`, `src/types/member.ts`, `scripts/migrate-compensation-to-subcollection.mjs`

---

## Executive Summary

The salary/compensation refactor is architecturally sound. Raw data is never exposed to non-admin tiers, compensation is stripped from user docs on save, and the sub-collection is owner-restricted in Firestore rules. However, three issues require attention before this feature ships to production: a moderator role is incorrectly granted admin-tier raw data access, the `SalaryDataPoint` struct always populates PII fields (name/email) even for non-admin tiers leaking them through memory, and `SalaryInsights.tsx` has a redundant client-side `isAdmin` check that creates a divergence risk from the server-enforced tier.

---

## Findings by Area

---

### 1. Firestore Rules — `match /users/{userId}/compensation/{entryId}`

**Location**: `firestore.rules:136-139`

```
match /compensation/{entryId} {
  allow read, write: if isAuthenticated() && isOwner(userId);
  allow read: if isAuthenticated() && canModerate();
}
```

| Check                                 | Result | Notes                                                       |
| ------------------------------------- | ------ | ----------------------------------------------------------- |
| Only owner can write                  | PASS   | `isOwner(userId)` on `allow write`                          |
| Only owner + admin/moderator can read | PASS   | Second rule covers `canModerate()` (admin + moderator)      |
| No public access                      | PASS   | Both rules require `isAuthenticated()`                      |
| No cross-member read                  | PASS   | `isOwner(userId)` uses the path param, not a document field |

**PASS — rules are correct.** There is no wildcard read, no public access, and write is restricted to the owner only.

**Minor observation**: The `allow read, write` line and the separate `allow read` line are both valid Firestore syntax. However, the split form adds slight visual ambiguity. A merged form would be cleaner:

```
allow read: if isAuthenticated() && (isOwner(userId) || canModerate());
allow write: if isAuthenticated() && isOwner(userId);
```

This is a style observation only; the current rules are functionally correct.

---

### 2. Cloud Function: `getSalaryStats`

**Location**: `functions/src/get-salary-stats.ts`

#### 2a. Authentication — PASS

Line 63: `if (!request.auth)` throws `HttpsError("unauthenticated")`. Firebase callable functions also validate `request.auth` at the SDK level before user code runs.

#### 2b. Tiered Access — PASS WITH CONCERN

The tier logic at lines 70-98:

- `isAdmin` = `role === "admin" || role === "moderator"` — **This is a CRITICAL concern** (see Finding C-1 below).
- `isVerified` = `callerData?.isVerified === true || isAdmin`
- `tier` = `"admin"` if isAdmin, `"contributor"` if has at least one compensation entry, `"member"` otherwise

#### 2c. Raw Data Only for Admin Tier — PASS

Lines 304-322: `rawData` is only populated inside `if (tier === "admin")`. The block is not reachable from contributor or member code paths.

#### 2d. Privacy Minimum (MIN_GROUP_SIZE = 3) Enforcement — PASS WITH CONCERN

`safeAggregate()` (line 29) returns `null` if `values.length < 3`. This is correctly applied to:

- `overview` (line 202)
- `distribution` via `buildHistogram()` (line 44)
- `byExperience` per-level (line 234)
- `byIndustry` per-industry (line 249)
- `breakdown` — **see Finding W-1 below**
- `benefits` — **see Finding W-2 below**

#### 2e. No Injection Vectors — PASS

The function receives no user-controlled input parameters (no `request.data` is used). All data is read via Admin SDK with typed Firestore references.

---

### CRITICAL Findings

#### C-1: Moderators receive admin-tier raw individual salary data

**File**: `functions/src/get-salary-stats.ts:73`
**Severity**: CRITICAL (data privacy violation)

```typescript
const isAdmin = callerRole === 'admin' || callerRole === 'moderator';
```

Moderators are granted the `"admin"` tier, which means they receive `rawData` — an array of individual entries containing `memberName`, `memberEmail`, `company`, `position`, `monthlyGross`, `annualBonus`, and stock values. This is PII belonging to individual members who consented to share data with the platform, not with all moderators.

The Firestore rules also allow moderators to read raw compensation sub-collection documents directly (via `canModerate()`), which compounds the issue.

**Impact**: Any moderator can call `getSalaryStats` and receive names, emails, and exact salary figures for all members who have shared compensation data.

**Fix**:

```typescript
const isAdmin = callerRole === 'admin';
const canModerate = callerRole === 'moderator';
// Moderators stay at "contributor" tier at most
const tier = isAdmin ? 'admin' : isContributor ? 'contributor' : 'member';
```

If moderators need compensation visibility for trust-and-safety purposes, that decision should be explicit and separate from the analytics tier. Consider a dedicated `compensation_reviewer` role or a separate admin tool.

**Firestore rules**: The companion `allow read: if isAuthenticated() && canModerate()` on the sub-collection should be narrowed to `canAdminister()` unless there is a documented business need for moderators to read raw individual entries.

---

### Warning Findings

#### W-1: `breakdown` bypasses MIN_GROUP_SIZE — aggregate of all data points

**File**: `functions/src/get-salary-stats.ts:277-301`

The `breakdown` object (percentage split of base/bonus/stock/sign-on) is computed across all data points without a group-size gate. It will be returned even if there is only 1 data point. While percentages alone do not directly reveal exact salaries, combined with `overview.medianMonthlyGross` and `overview.dataPointCount === 1`, a contributor can precisely deduce the single data point's compensation structure.

**Fix**: Add a guard before populating `breakdown`:

```typescript
if (dataPoints.length >= MIN_GROUP_SIZE) {
  // ... existing breakdown computation
}
```

#### W-2: `benefits` frequency is not gated by MIN_GROUP_SIZE

**File**: `functions/src/get-salary-stats.ts:258-274`

A contributor can determine that a single member has a specific benefit combination. For example: if only one person contributed data, `benefits` will show `{ name: "SGMM", count: 1, percentage: 100 }`. This reveals the exact benefit set of that individual.

**Fix**: Either (a) apply `safeAggregate` logic before returning benefits, or (b) only return benefits where `count >= MIN_GROUP_SIZE`.

#### W-3: PII fields (`memberName`, `memberEmail`) built unconditionally for all data points

**File**: `functions/src/get-salary-stats.ts:175-184`

Every `SalaryDataPoint` object has `memberName` and `memberEmail` populated, regardless of tier. These fields are only serialized for the admin tier in `rawData`, but they remain in the `dataPoints` array in memory for the entire function execution. If a future refactoring adds a new response field from `dataPoints` (e.g., returning a single contributor's own data), the PII fields could accidentally be included.

**Fix**: Populate `memberName` and `memberEmail` only inside the `if (tier === "admin")` block, or add a separate admin-only projection step. The `SalaryDataPoint` interface should not carry optional PII fields by default.

#### W-4: `SalaryInsights.tsx` uses client-side `isAdmin` as a secondary condition for rendering `SalaryAdminTable`

**File**: `src/components/salary/SalaryInsights.tsx:351`

```tsx
{
  (isAdmin || tier === 'admin') && stats?.rawData ? (
    <SalaryAdminTable rawData={stats.rawData} lang={lang} />
  ) : null;
}
```

The `isAdmin` client-side state from `AuthContext` is redundant — `stats?.rawData` is only non-null when the CF returns `tier === "admin"`. The `isAdmin` condition adds a divergence risk: if `AuthContext.isAdmin` and the CF's tier ever disagree (e.g., role update races), a non-admin could briefly see the table if `rawData` leaked. The condition should be:

```tsx
{
  tier === 'admin' && stats?.rawData ? (
    <SalaryAdminTable rawData={stats.rawData} lang={lang} />
  ) : null;
}
```

**Fix**: Remove the `isAdmin` half of the condition. The CF is the authoritative source of truth for the tier.

---

### Observations

#### O-1: `collectionGroup("compensation")` requires a Firestore index

The Cloud Function reads all compensation entries via `db.collectionGroup("compensation").get()` (line 101). This requires a Firestore collection group index (`compensation`) to be deployed. If the index is not present, the query will fail silently or throw. Verify this index exists in `firestore.indexes.json`.

#### O-2: Compensation sub-collection is not migrated if role has no ID

**File**: `scripts/migrate-compensation-to-subcollection.mjs:46-50`

Roles without an `id` field are skipped with a warning. This means legacy compensation data on those roles remains in the user document's work history and will not appear in the analytics CF. This is a data completeness issue, not a security issue, but the gap should be documented.

#### O-3: `WorkExperience.compensation` is still present in the type definition

**File**: `src/types/member.ts:197`

```typescript
export interface WorkExperience {
  ...
  compensation?: Compensation;
}
```

The field is correctly marked optional, and `ProfileEdit.tsx` strips it on save (line 447). `mapper.ts` does not map it (PASS). However, since compensation now lives exclusively in the sub-collection, the field on `WorkExperience` exists only as a transient in-memory carrier in `CareerTab` (line 577: `compensation={entry.compensation}`). The code comment or JSDoc on `WorkExperience.compensation` should note it is never persisted to the user document — it is populated client-side from `CompensationFields`'s `useEffect` and must be stripped before any Firestore write.

#### O-4: `functions/` has 6 high-severity dependency vulnerabilities

Running `npm audit` in `functions/` shows 6 high vulnerabilities in `@typescript-eslint/*` packages. These are dev dependencies (linting tools) and not deployed to production Cloud Functions. However, they should be tracked. `npm audit fix` will resolve them.

#### O-5: `DashboardLayout` auth gate is client-side only

The salary insights page passes `requireVerified={true}` to `DashboardLayout`, but this prop is forwarded to `DashboardShell` — a React client-only component. There is no server-side redirect at the Astro layer for unauthenticated users. This is a known architectural pattern in this project (TD-018). Since `getSalaryStats` requires Firebase Auth and returns a `public` tier for unauthenticated users, this does not constitute a data leak — but the page HTML renders before auth resolves.

---

## Checklist Summary

| Area                                                     | Status             | Notes                                                         |
| -------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| Firestore rules: owner-only write                        | PASS               |                                                               |
| Firestore rules: owner + admin/mod read                  | PASS               |                                                               |
| Firestore rules: no public access                        | PASS               |                                                               |
| Firestore rules: no cross-member read                    | PASS               |                                                               |
| CF: authentication required                              | PASS               |                                                               |
| CF: tiered access                                        | FAIL               | Moderators incorrectly receive admin tier (C-1)               |
| CF: raw data admin-only                                  | PASS               | Gated by `tier === "admin"`                                   |
| CF: privacy minimum (3 pts) — overview                   | PASS               |                                                               |
| CF: privacy minimum (3 pts) — distribution               | PASS               |                                                               |
| CF: privacy minimum (3 pts) — byExperience               | PASS               |                                                               |
| CF: privacy minimum (3 pts) — byIndustry                 | PASS               |                                                               |
| CF: privacy minimum (3 pts) — breakdown                  | FAIL               | No MIN_GROUP_SIZE guard (W-1)                                 |
| CF: privacy minimum (3 pts) — benefits                   | FAIL               | No count gate (W-2)                                           |
| CF: no injection vectors                                 | PASS               |                                                               |
| SalaryInsights: CF-only data, no direct Firestore        | PASS               |                                                               |
| SalaryAdminTable: admin tier only                        | PASS (with caveat) | Tier gate is correct; secondary isAdmin condition risky (W-4) |
| CompensationFields: reads own sub-collection only        | PASS               | Uses `userId` prop from authenticated session                 |
| ProfileEdit: strips compensation before save             | PASS               | Line 447 strips all compensation fields                       |
| queries.ts: no compensation in getMemberProfiles         | PASS               | Mapper does not include compensation                          |
| mapper.ts: no compensation mapping                       | PASS               |                                                               |
| types/member.ts: compensation optional on WorkExperience | PASS               |                                                               |
| Migration script: removes compensation from user doc     | PASS               | Cleans all roles after copying to sub-collection              |

---

## Verdict

**CHANGES REQUIRED** before production deployment of the salary feature.

**Must fix (blocks release)**:

1. **C-1** — Narrow `isAdmin` tier in `getSalaryStats` to `role === "admin"` only. Moderators must not receive raw PII salary data. Align Firestore rules to match (`canAdminister()` instead of `canModerate()` on the compensation sub-collection read rule).

**Should fix (before next release)**: 2. **W-1** — Gate `breakdown` computation behind `dataPoints.length >= MIN_GROUP_SIZE`. 3. **W-2** — Gate `benefits` behind individual `count >= MIN_GROUP_SIZE` or a total data-point minimum. 4. **W-3** — Move PII field population (`memberName`, `memberEmail`) inside the admin-only block. 5. **W-4** — Remove `isAdmin` from the `SalaryAdminTable` render condition; use `tier === 'admin'` exclusively.

---

## Re-verification Criteria (for Forja)

After fixes, Centinela requires:

1. `getSalaryStats` called with a moderator account must return `tier === "contributor"` (not `"admin"`) and `rawData === null`.
2. A dataset of exactly 2 data points must return `breakdown === null` and all `benefits.count < 3` entries filtered or suppressed.
3. `SalaryInsights` render test: moderator user sees no `SalaryAdminTable` even if `isAdmin` is somehow `true` client-side.
4. Firestore emulator rule test: a moderator UID must be able to read their own compensation sub-collection docs but not another user's.
