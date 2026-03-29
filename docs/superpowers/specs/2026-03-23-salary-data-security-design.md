# Salary Data Security — Design Spec

## Problem

Compensation data is stored inside `experience.previousRoles[].compensation` in user docs. Firestore rules can't filter sub-fields within a document — anyone who can read a member profile gets their salary data. The tiered access in the UI is cosmetic only; the raw data is in the client-side Firestore response.

## Solution

Move compensation to a separate Firestore sub-collection with strict rules. A Cloud Function aggregates stats server-side and returns only what the caller is authorized to see.

## Data Model

### New sub-collection

```
users/{uid}/compensation/{entryId}
```

Each document:

```typescript
interface CompensationDoc {
  roleId: string; // matches WorkExperience.id in parent user doc
  monthlyGross: number;
  currency: 'MXN' | 'USD';
  country: 'MX' | 'US' | 'OTHER';
  fiscalRegime?: 'asalariado' | 'honorarios' | 'resico' | 'w2' | '1099';
  annualBonus?: number;
  annualBonusType?: 'fixed' | 'percentage';
  signOnBonus?: number;
  stockAnnualValue?: number;
  benefits?: string[];
  updatedAt: Timestamp;
}
```

### Firestore rules

```
match /users/{userId}/compensation/{entryId} {
  // Owner can read and write their own compensation
  allow read, write: if isAuthenticated() && isOwner(userId);
  // Admins and moderators can read all compensation
  allow read: if isAuthenticated() && canModerate();
}
```

No other member can read another member's compensation data.

## Cloud Function: `getSalaryStats`

Callable Cloud Function that computes and returns aggregated salary statistics.

### Input

```typescript
interface GetSalaryStatsRequest {
  // No input needed — caller identity determines tier
}
```

### Logic

1. Verify caller is authenticated
2. Read ALL compensation docs across all users (Admin SDK, bypasses rules)
3. Join with user docs for `experience.level` (experience level)
4. Join with company docs for `industry` (via roleId → work history → companyId)
5. Compute aggregates using `safeAggregate` (min 3 per group):
   - Overview: median monthly gross, median total comp, data point count, contributor count
   - By experience level: median + p10/p25/p75/p90 per level
   - By industry: median per industry
   - Benefits frequency: count per benefit tag
   - Compensation breakdown: average base/bonus/stock/signOn proportions
   - Distribution histogram: 12-bin histogram of monthly gross
6. Check caller's contribution: does `users/{callerUid}/compensation` have any docs?
7. Return tiered response

### Response

```typescript
interface SalaryStatsResponse {
  tier: 'public' | 'member' | 'contributor' | 'admin';

  // Always included (member+)
  overview: {
    medianMonthlyGross: number;
    medianTotalComp: number;
    dataPointCount: number;
    contributorCount: number;
  } | null;
  distribution: HistogramBin[] | null;
  byExperience: ExperienceStats[] | null;

  // Contributor+ only
  byIndustry: IndustryStats[] | null;
  benefits: BenefitFrequency[] | null;
  breakdown: CompBreakdown | null;

  // Admin only
  rawData: AdminRow[] | null;
}
```

Non-authorized tiers get `null` for restricted fields. The client renders whatever is non-null.

## Migration

### One-time script: `scripts/migrate-compensation-to-subcollection.mjs`

1. Read all user docs
2. For each user, iterate `experience.previousRoles`
3. If a role has `compensation`, create a doc in `users/{uid}/compensation/{roleId}`
4. After successful write, remove `compensation` from the role entry in the user doc
5. Dry-run mode by default (`--dry-run`), `--execute` to apply

### Backward compatibility

After migration, the `compensation` field no longer exists on `WorkExperience` entries in user docs. The `Compensation` interface stays in `src/types/member.ts` for the sub-collection doc type.

## Component Changes

### CompensationFields

Currently writes `compensation` to the work entry via `onUpdate({ compensation: comp })`.

After: writes directly to `users/{uid}/compensation/{roleId}` using Firestore client SDK. Reads from the same sub-collection on mount.

### SalaryInsights

Currently calls `getMemberProfiles({ limit: 500 })` and aggregates client-side.

After: calls `getSalaryStats` Cloud Function via `httpsCallable(functions, 'getSalaryStats')`. Receives pre-computed, tiered stats. No raw salary data in the client.

### SalaryAdminTable

Currently receives raw member profiles and extracts compensation.

After: receives `rawData` from the CF response (admin tier only). Same table, different data source.

## Files

### New files

| File                                                | Purpose                                       |
| --------------------------------------------------- | --------------------------------------------- |
| `functions/src/get-salary-stats.ts`                 | Callable CF that computes tiered salary stats |
| `scripts/migrate-compensation-to-subcollection.mjs` | One-time migration script                     |

### Modified files

| File                                                   | Change                                               |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `firestore.rules`                                      | Add `users/{userId}/compensation/{entryId}` rules    |
| `functions/src/index.ts`                               | Export `getSalaryStats`                              |
| `src/components/profile/shared/CompensationFields.tsx` | Read/write from sub-collection instead of work entry |
| `src/components/salary/SalaryInsights.tsx`             | Call CF instead of client-side aggregation           |
| `src/components/salary/SalaryAdminTable.tsx`           | Accept data from CF response                         |

### Removed

| What                                  | From                                                    |
| ------------------------------------- | ------------------------------------------------------- |
| `compensation` field                  | `WorkExperience` entries in user docs (after migration) |
| Client-side `extractSalaryDataPoints` | `SalaryInsights.tsx` (replaced by CF)                   |

## Verification

1. Save compensation in profile editor → data written to sub-collection, NOT user doc
2. Another member reads your profile → no compensation data visible
3. Visit salary insights as contributor → see all charts (data from CF)
4. Visit salary insights as non-contributor → see only overview + experience
5. Visit as admin → see all charts + raw data table
6. Open browser dev tools → no raw salary data in network responses (only aggregated stats)
7. Firestore rules test → non-owner read of compensation sub-collection is denied
