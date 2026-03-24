# Companies Collection + Logo Management — Design Spec

## Context

The member statistics views currently show a company grid with colored initial avatars and text names. The goal is to replace this with actual company logos, backed by a dedicated `companies` Firestore collection with logos stored in Firebase Storage. Members can contribute company data (post-moderation), admins manage and review, and a backfill script populates existing companies.

This is Subsystem #1 of a 4-part roadmap:

1. **Companies collection + logos** (this spec)
2. Work history + companyId linking
3. CV upload + auto-extract
4. Member CV pages

## Firestore `companies` Collection

Each document:

```typescript
interface Company {
  id: string;
  name: string; // "BBVA"
  domain: string; // "bbva.com"
  logoUrl?: string; // Firebase Storage URL (optional — may be absent if --skip-logos or not yet uploaded)
  industry?: string; // "Finanzas"
  location?: string; // "Ciudad de México"
  website?: string; // "https://www.bbva.mx"
  description?: string;
  memberCount: number; // auto-computed by Cloud Function only
  createdBy: string; // UID of creator
  createdAt: Date;
  updatedAt: Date;
  pendingReview: boolean; // true when member edits need admin review
  lastReviewedBy?: string; // admin UID — Cloud Function only
  lastReviewedAt?: Date; // Cloud Function only
}
```

### Firestore Security Rules

```
match /companies/{companyId} {
  // Any authenticated user can read
  allow read: if isAuthenticated();

  // Verified members can create — must set pendingReview: true
  allow create: if isAuthenticated() &&
    isVerifiedMember() &&
    request.resource.data.pendingReview == true &&
    request.resource.data.keys().hasOnly([
      'name', 'domain', 'logoUrl', 'industry', 'location',
      'website', 'description', 'createdBy', 'createdAt',
      'updatedAt', 'pendingReview'
    ]);

  // Members can update their own companies (must keep pendingReview: true)
  // Admins can update any company (can set pendingReview: false)
  allow update: if isAuthenticated() && (
    (isVerifiedMember() &&
      resource.data.createdBy == request.auth.uid &&
      request.resource.data.pendingReview == true &&
      request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['name', 'domain', 'logoUrl', 'industry', 'location',
                  'website', 'description', 'updatedAt', 'pendingReview']))
    || canModerate()
  );

  // Only admins can delete
  allow delete: if canModerate();
}
```

Fields `memberCount`, `lastReviewedBy`, `lastReviewedAt` are writable only by Cloud Functions (Admin SDK bypasses rules).

### Firebase Storage Security Rules

Logo path: `companies/{companyId}/logo.{ext}`

```
match /companies/{companyId}/{fileName} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && request.resource.size < 2 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

## Member Profile Changes

### WorkExperience — add `companyId`

The existing `WorkExperience` interface in `src/types/member.ts` already has an `id` field. Add `companyId`:

```typescript
interface WorkExperience {
  // ... existing fields unchanged
  companyId?: string; // NEW — reference to companies doc
}
```

### MemberProfile — add `companyId` under `profile`

Add alongside `profile.company` to maintain consistent nesting:

```typescript
profile: {
  // ... existing fields
  company: string;      // display name (kept for backward compat)
  companyId?: string;   // NEW — reference to companies doc
}
```

### Migration

- Existing `profile.company` string stays for backward compatibility
- Backfill script creates company docs and sets `profile.companyId` on matching members
- Members without a `companyId` fall back to the string + colored initial avatar in the UI

## Member Company Contributions (Post-Moderation)

### How members contribute

- On profile edit (work experience section): select existing company (autocomplete) OR create new
- New company creation goes through API route `POST /api/companies` (not direct Firestore write) for server-side validation and rate limiting
- Logo uploads go to Firebase Storage (validated by Storage rules: max 2MB, image types)

### What goes live immediately

- Company name, domain, and logo appear on the member's own profile
- Company appears in the company grid
- `pendingReview: true` flag is set
- This is a deliberate product decision: immediate visibility encourages contributions while admin review catches issues

### Admin review

- Admin dashboard shows queue of `pendingReview === true` companies
- Admin can: approve (clear flag via Cloud Function), edit (fix data), or reject (remove company, unlink members)
- Member edits to existing companies re-flag for review

### Safety guardrails

- Logo uploads: max 2MB, image types only (png/jpg/svg/webp), enforced by Storage rules
- Company name: max 100 chars, sanitized server-side in API route
- Rate limit: max 5 company creations per member per day — enforced server-side in `POST /api/companies` via timestamp window check (not Firestore rules, which cannot enforce this)
- Only verified members can create/edit companies

## Admin Company Management

New section at both `/es/dashboard/admin/companies` and `/en/dashboard/admin/companies`.

- **Company list table**: name, logo thumbnail, domain, member count, review status, actions
- **Review queue**: filtered view of `pendingReview === true`
- **Edit company**: name, domain, industry, location, website, description, upload/replace logo
- **Auto-fetch logo**: paste domain → Astro API route calls Logo.dev → saves to Storage. Admin-only.
- **Delete company**: soft delete, unlinks members, confirmation required
- **Merge companies**: deferred to a future iteration — complex operation requiring paginated batch writes and audit logging. Out of scope for this spec.

### Logo fetch integration (admin-only)

Implemented as an **Astro API route** at `src/pages/api/companies/fetch-logo.ts` (consistent with other `src/pages/api/` routes using `verifyRequest()` middleware):

- `POST /api/companies/fetch-logo` — receives `{ domain, companyId }`, admin-only
- Fetches logo from Logo.dev API (token in `process.env.LOGO_DEV_API_TOKEN`)
- Fallback: Google favicon API (`https://www.google.com/s2/favicons?domain={domain}&sz=128`)
- Saves to Firebase Storage at `companies/{companyId}/logo.png`
- Returns Storage URL

## Cloud Function: memberCount updates

`onMemberCompanyChange` in `functions/src/companies.ts`:

- Trigger: `onDocumentUpdated('users/{userId}', ...)`
- Compares `before.data().profile?.companyId` vs `after.data().profile?.companyId`
- If changed: decrements old company's `memberCount`, increments new company's `memberCount`
- Writes **exclusively to `companies/{companyId}.memberCount`** — must NOT write back to user doc (avoids infinite trigger loop)
- Uses `FieldValue.increment()` for atomic updates

## Backfill Script

`scripts/backfill-companies.cjs` — runs once to populate from existing data.

### Steps

1. Scan all member docs, collect unique `profile.company` values
2. Match against hardcoded `COMPANY_MAP` (reviewed by admin before running)
3. For each company: check if doc with matching `domain` already exists (idempotent — skip if found)
4. Create Firestore doc, fetch logo (if not `--skip-logos`), upload to Storage
5. Update each member's `profile.companyId` to reference the matching company doc
6. Recompute `memberCount` on each company doc via direct count (not trigger)

### Idempotency

- Before creating a company doc, check if one with the same `domain` already exists — skip if found
- Before setting `profile.companyId` on a member, check if already set — skip if found
- Uses Admin SDK (bypasses Firestore rules and does NOT trigger `onDocumentUpdated` for Cloud Functions v2 `onDocumentUpdated` — note: Admin SDK writes DO trigger v2 event triggers. The backfill should temporarily set a `_backfill: true` flag so the Cloud Function can skip these writes)

### Modes

- `--dry-run` — preview only, no writes
- `--skip-logos` — create docs without fetching logos (logoUrl left undefined)
- Default — full run

### Company mapping

Generated from actual Firestore data, reviewed and corrected by admin before execution:

```javascript
const COMPANY_MAP = {
  BBVA: {
    domain: 'bbva.com',
    industry: 'Finanzas',
    location: 'Ciudad de México',
  },
  Microsoft: {
    domain: 'microsoft.com',
    industry: 'Tecnología',
    location: 'Global',
  },
  // ... all unique companies from current member data
};
```

## Component Changes

### CompanyLogo — new shared component

`src/components/shared/CompanyLogo.tsx` — renders `<img>` with `company.logoUrl` if truthy, falls back to colored initial avatar if `logoUrl` is undefined/empty.

### Company grid updates

`MemberShowcase` and `InsightsTab` change data source:

- Before: aggregate `profile.company` strings via `getMemberStatistics().companies`
- After: query `companies` collection directly via `getCompaniesWithMembers()`
- `MemberStatisticsData.companies` field is **removed** from the type (no longer aggregated)

`InsightsTab` currently receives `statistics` as a prop from `MemberDashboard`. To support the new company data:

- `MemberDashboard` fetches companies via `getCompaniesWithMembers()` alongside existing data
- Passes `companies: Company[]` as a new prop to `InsightsTab`
- `InsightsTab` company grid section uses the new `Company` type (with `logoUrl`) instead of `{ name, count }`

## Files to Create

| File                                                   | Purpose                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/types/company.ts`                                 | Company interface                                                           |
| `src/lib/companies/queries.ts`                         | getCompanies, getCompaniesWithMembers                                       |
| `src/lib/companies/mutations.ts`                       | createCompany, updateCompany, deleteCompany (client-side helpers for admin) |
| `src/pages/api/companies/index.ts`                     | POST — member company creation with rate limiting                           |
| `src/pages/api/companies/fetch-logo.ts`                | POST — admin logo fetch from Logo.dev                                       |
| `src/components/shared/CompanyLogo.tsx`                | Reusable logo component (img + fallback)                                    |
| `src/components/dashboard/admin/CompanyManagement.tsx` | Admin company management UI                                                 |
| `src/pages/es/dashboard/admin/companies/index.astro`   | Admin companies page (Spanish)                                              |
| `src/pages/en/dashboard/admin/companies/index.astro`   | Admin companies page (English)                                              |
| `functions/src/companies.ts`                           | Cloud Function: onMemberCompanyChange (memberCount trigger)                 |
| `scripts/backfill-companies.cjs`                       | One-time backfill script                                                    |

## Files to Modify

| File                                                   | Change                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `src/types/member.ts`                                  | Add `companyId` to `profile` block, add `companyId` to `WorkExperience`. Remove `companies` from `MemberStatisticsData`. |
| `src/lib/members/queries.ts`                           | Remove company aggregation from `getMemberStatistics()`                                                                  |
| `src/lib/members/mapper.ts`                            | Map `profile.companyId` from Firestore data                                                                              |
| `src/components/directory/MemberShowcase.tsx`          | Use CompanyLogo, fetch from companies collection                                                                         |
| `src/components/dashboard/members/InsightsTab.tsx`     | Accept `companies: Company[]` prop, use CompanyLogo                                                                      |
| `src/components/dashboard/members/MemberDashboard.tsx` | Fetch companies data, pass to InsightsTab                                                                                |
| `firestore.rules`                                      | Add companies collection rules                                                                                           |

## Verification

1. `npm run check` — TypeScript passes
2. Run backfill script with `--dry-run` — verify company mapping output
3. Run backfill script — companies created with logos in Storage
4. Navigate to `/es/members` — company grid shows real logos
5. Navigate to `/es/dashboard/members/` → Insights tab — logos render
6. Admin: `/es/dashboard/admin/companies` — manage companies, review queue works
7. Admin: auto-fetch logo with domain — logo appears in Storage
8. Member: edit profile → create new company → appears with `pendingReview: true`
9. Admin: approve company → `pendingReview` clears
10. Verify `memberCount` updates when members change `profile.companyId`
11. Verify fallback: company without logo shows colored initial avatar
12. Verify English locale pages: `/en/members`, `/en/dashboard/admin/companies`
13. Verify rate limit: 6th company creation in a day is rejected
