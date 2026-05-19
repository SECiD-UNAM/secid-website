# RBAC System & Content CRUD — Design Spec

**Date:** 2026-03-23
**Status:** Draft
**Author:** Claude (Brainstorming session with Artemio)

---

## 1. Problem Statement

Four public-facing features lack admin content management:

| Feature                                | Current State                              | Gap                                                  |
| -------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| **Journal Club** (`/es/journal-club/`) | Hardcoded in `.astro` files                | No CRUD, no Firestore, requires deploy to update     |
| **Newsletter** (`/es/newsletter/`)     | Firestore `newsletter_archive` (read-only) | No create/edit/delete dashboard                      |
| **Spotlights** (`/es/spotlights/`)     | Firestore `spotlights`                     | Create only — no list, edit, delete                  |
| **Events** (`/es/events/`)             | Firestore `events`                         | Most complete — missing delete and permission gating |

The current permission model (`canModerate()` / `canAdminister()` role checks) is too coarse to support flexible content management. The existing `AdminPermission` type in `src/types/admin.ts` defines granular permissions but they are unused.

## 2. Goals

1. **Full RBAC system** with dynamic groups, resource-scoped permissions, and deny support
2. **Full CRUD** for journal-club, newsletter, spotlights, and events via dashboard UI
3. **RBAC coverage for all platform resources** (~18 resources, ~8 operations)
4. **Backward-compatible migration** from current role-based checks
5. **Three-layer enforcement**: client-side UI gating, Cloud Function middleware, Firestore rules

## 3. Non-Goals

- Arbitrary condition expressions (SpEL-like DSL) — out of scope, can be layered on later
- Resource-level scoping beyond `own`/`all` (e.g., "only events tagged workshop")
- Search-level RBAC filtering (OpenMetadata-style Elasticsearch query rewriting)
- Real-time permission updates (claims refresh on next token refresh, not instant)

## 4. Reference

Design informed by [OpenMetadata's RBAC system](https://github.com/open-metadata/OpenMetadata):

- Policy-based with deny-first evaluation
- Operations enum per resource
- Caching resolved permissions for performance

Adapted for Firebase constraints (1KB custom claims limit, limited Firestore rules expressiveness).

---

## 5. Architecture

### 5.1 Approach: Structured RBAC with Cached Resolution

- **Groups** and **permissions** stored in Firestore
- Each group has a list of permission grants: `{ resource, operation, scope, effect }`
- Scope limited to `own` | `all` — covers 95% of cases
- Cloud Function resolves a user's effective permissions from group memberships
- Resolved permissions cached in Firebase Auth custom claims (compressed to fit 1KB)
- Client reads claims for UI gating
- Firestore rules check claims for enforcement

### 5.2 System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Admin UI                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Group CRUD  │  │ User ↔ Group │  │ Permission    │  │
│  │             │  │ Assignment   │  │ Matrix Picker │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────────┘  │
└─────────┼────────────────┼──────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                  Firestore                               │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │ rbac_groups   │  │ rbac_user_groups │  │ rbac_audit │ │
│  │ {groupId}     │  │ {userId}         │  │ _log       │ │
│  └──────┬────────┘  └────────┬─────────┘  └────────────┘ │
└─────────┼────────────────────┼──────────────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│          Cloud Function: resolveUserPermissions          │
│                                                          │
│  1. Read user's groups from rbac_user_groups             │
│  2. Read group docs from rbac_groups                     │
│  3. Merge: deny wins, broader scope wins                 │
│  4. Compress to claims string                            │
│  5. Set Firebase Auth custom claims                      │
│  6. Write audit log entry                                │
│                                                          │
│  Triggers: rbac_user_groups write, rbac_groups write     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Auth Custom Claims                  │
│                                                          │
│  { "rbac": {                                             │
│      "g": ["event-manager", "member"],                   │
│      "p": "ev:c.a,ev:e.a,ev:d.o,ev:p.a,nl:v.a"         │
│  }}                                                      │
└──────────┬──────────────────┬───────────────────────────┘
           │                  │
     ┌─────▼─────┐    ┌──────▼──────┐    ┌──────────────┐
     │ Layer 1:   │    │ Layer 2:     │    │ Layer 3:     │
     │ Client UI  │    │ Cloud Fns    │    │ Firestore    │
     │ usePerms() │    │ middleware   │    │ Rules        │
     │ (UX only)  │    │ (API guard)  │    │ (last line)  │
     └────────────┘    └─────────────┘    └──────────────┘
```

---

## 6. Data Model

### 6.1 Resource Enum

```typescript
type Resource =
  // Content
  | 'events'
  | 'spotlights'
  | 'newsletter'
  | 'journal-club'
  | 'jobs'
  | 'blog'
  | 'forums'
  | 'resources'
  // People & Orgs
  | 'users'
  | 'companies'
  | 'commissions'
  // Mentorship
  | 'mentorship'
  // Platform
  | 'settings'
  | 'analytics'
  | 'reports'
  | 'notifications'
  | 'assessments'
  | 'salary-insights'
  // RBAC self-management
  | 'groups';
```

### 6.2 Operation Enum

```typescript
type Operation =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'publish'
  | 'moderate'
  | 'export'
  | 'assign';
```

### 6.3 Core Types

```typescript
interface PermissionGrant {
  resource: Resource;
  operation: Operation;
  scope: 'own' | 'all';
  effect: 'allow' | 'deny'; // default: "allow"
}

interface RBACGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionGrant[];
  isSystem: boolean; // shipped with platform, can't be deleted
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface UserGroupAssignment {
  userId: string;
  groups: string[]; // group IDs
  assignedBy: string;
  updatedAt: Timestamp;
}

interface RBACAuditEntry {
  action:
    | 'group_created'
    | 'group_updated'
    | 'group_deleted'
    | 'user_assigned'
    | 'user_unassigned'
    | 'permissions_resolved';
  actorId: string;
  targetId: string; // group or user ID
  changes: Record<string, any>;
  timestamp: Timestamp;
}
```

### 6.4 Custom Claims Compression

Firebase custom claims have a 1KB limit. Permissions are compressed using abbreviations:

```typescript
// Resource abbreviations (2 chars)
const RESOURCE_ABBREV: Record<Resource, string> = {
  events: 'ev',
  spotlights: 'sp',
  newsletter: 'nl',
  'journal-club': 'jc',
  jobs: 'jo',
  blog: 'bl',
  forums: 'fo',
  resources: 'rs',
  users: 'us',
  companies: 'co',
  commissions: 'cm',
  mentorship: 'mn',
  settings: 'st',
  analytics: 'an',
  reports: 'rp',
  notifications: 'nt',
  assessments: 'as',
  'salary-insights': 'si',
  groups: 'gr',
};

// Operation abbreviations (1 char)
const OP_ABBREV: Record<Operation, string> = {
  view: 'v',
  create: 'c',
  edit: 'e',
  delete: 'd',
  publish: 'p',
  moderate: 'm',
  export: 'x',
  assign: 'a',
};

// Scope: "o" = own, "a" = all
// Deny prefix: "!"
// Format: "{resource}:{op}.{scope}" — comma separated
// Example: "ev:c.a,ev:e.a,ev:d.o,!fo:d.a"
//
// WILDCARDS (to fit within 1KB for broad roles):
// "*:*.a"    → all resources, all operations, scope all (super-admin)
// "ev:*.a"   → all operations on events, scope all (event-manager)
// "*:v.a"    → view all resources, scope all (base read access)
```

**Claims size budget:**

| Role           | Example claims string                  | Approx. bytes |
| -------------- | -------------------------------------- | ------------- |
| Super Admin    | `*:*.a`                                | ~80           |
| Moderator      | `*:v.a,*:m.a,ev:e.a,ev:p.a,sp:e.a,...` | ~350          |
| Content Editor | `ev:c.a,ev:e.a,...,bl:p.a`             | ~300          |
| Member         | `*:v.a,fo:c.o,fo:e.o,...`              | ~200          |

All roles fit well within the 1KB limit. The `checkPermission` and Firestore rule helpers must handle wildcards as special cases.

**Claims structure:**

```json
{
  "rbac": {
    "g": ["event-manager", "member"],
    "p": "ev:*.a,*:v.a"
  },
  "role": "moderator"
}
```

The `role` field is kept during migration for backward compatibility.

### 6.5 New Collection: `journal_club_sessions`

Replacing the hardcoded array in `.astro` files:

```typescript
interface JournalClubSession {
  id: string;
  date: Timestamp;
  topic: string;
  presenter: string;
  presenterUid?: string;
  description?: string;
  paperUrl?: string;
  slidesUrl?: string;
  recordingUrl?: string;
  status: 'draft' | 'published' | 'cancelled';
  tags?: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6.6 Updated Collection: `newsletter_archive`

The existing `NewsletterIssue` type (in `src/lib/newsletter-archive.ts`) lacks `createdBy`, `updatedAt`, and `status` fields needed for RBAC ownership checks. Updated schema:

```typescript
interface NewsletterIssue {
  id: string;
  title: string;
  issueNumber: number;
  publishedAt: Date;
  content: string; // HTML
  excerpt: string;
  coverImage?: string;
  status: 'draft' | 'published'; // NEW — enables draft/publish workflow
  createdBy: string; // NEW — required for own-scope checks
  updatedBy?: string; // NEW
  createdAt: Timestamp; // NEW
  updatedAt: Timestamp; // NEW
}
```

**Data migration:** Existing `newsletter_archive` documents get backfilled with `createdBy` set to the platform's admin UID, `status: "published"`, and `createdAt`/`updatedAt` set to `publishedAt`.

### 6.7 Updated Collection: `spotlights`

The existing `AlumniSpotlight` type (in `src/types/spotlight.ts`) lacks `createdBy` and `updatedAt`. Updated schema additions:

```typescript
// Fields added to existing AlumniSpotlight interface:
interface SpotlightUpdates {
  createdBy: string; // NEW — required for own-scope checks
  updatedBy?: string; // NEW
  updatedAt: Timestamp; // NEW
}
```

**Data migration:** Existing `spotlights` documents get backfilled with `createdBy` set to the platform's admin UID, `updatedAt` set to `publishedAt` or current timestamp.

---

## 7. Permission Resolution

### 7.1 Resolution Algorithm

```
Input: userId
Output: compressed permission string

1. Fetch rbac_user_groups/{userId} → groupIds[]
2. Fetch rbac_groups/{groupId} for each groupId → allGrants[]
3. Build map: key = "{resource}:{operation}" → { allows: Set<scope>, denies: Set<scope> }
4. For each key:
   a. If denies is non-empty → pick broadest deny scope ("all" > "own")
      → emit "!{resource}:{op}.{scope}"
   b. If allows is non-empty AND no deny for this key → pick broadest allow scope
      → emit "{resource}:{op}.{scope}"
   c. Deny on same (resource, operation) beats allow regardless of scope
5. Compress using wildcards:
   a. If ALL resources have the same operation+scope → collapse to "*:{op}.{scope}"
   b. If a resource has ALL operations with same scope → collapse to "{resource}:*.{scope}"
   c. If ALL resources have ALL operations with same scope → collapse to "*:*.{scope}"
6. Join all emissions with ","
7. Set as custom claims: { rbac: { g: groupIds, p: permissionString } }
```

### 7.2 Triggers

| Trigger                           | Action                                             |
| --------------------------------- | -------------------------------------------------- |
| `rbac_user_groups/{userId}` write | Resolve permissions for that user                  |
| `rbac_groups/{groupId}` write     | Batch resolve for all users assigned to that group |

### 7.3 Batch Resolution

When a group's permissions change, all users in that group need re-resolution:

```
1. Query rbac_user_groups where groups array-contains groupId
2. For each user, run resolution algorithm
3. Set custom claims per user (Firebase Admin SDK — no batch API)
4. Log to rbac_audit_log
```

**Operational safeguards:**

- **Concurrency control:** Use `Promise.allSettled` with a concurrency limit of 10 simultaneous `setCustomUserClaims()` calls to avoid hitting Firebase Admin SDK rate limits.
- **Debounce/coalesce:** Rapid edits to the same group within a 5-second window are coalesced into a single resolution pass. The Cloud Function writes a `pending_resolution` marker on first trigger; subsequent triggers within the window are no-ops. A delayed execution (via Cloud Tasks or `setTimeout`) performs the actual resolution.
- **Partial failure handling:** If claims update fails for specific users, log the failure and enqueue those users for retry (max 3 retries with exponential backoff).
- **Size guard:** When editing a group with >500 assigned users, the admin UI shows a warning that permission propagation may take several minutes. Groups with >5000 users trigger an async background job instead of a synchronous Cloud Function.
- **Monitoring:** Each batch resolution writes a summary to `rbac_audit_log` with `{ usersProcessed, usersFailed, durationMs }`.

---

## 8. Enforcement Layers

### 8.1 Layer 1: Client-Side UI Gating (UX only)

```typescript
// src/lib/rbac/hooks.ts
function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ResolvedPermissions | null>(
    null
  );

  useEffect(() => {
    if (!user) return;
    user.getIdTokenResult().then((result) => {
      const rbac = result.claims.rbac;
      if (rbac?.p) {
        setPermissions(decodePermissions(rbac.p));
      }
    });
  }, [user]);

  // checkPermission scope logic:
  // - requiredScope "all" → only scope:all grants pass
  // - requiredScope "own" or omitted → both own and all grants pass
  // - wildcards: "*:*.a" matches any resource+operation, "ev:*.a" matches any op on events
  const can = (
    resource: Resource,
    operation: Operation,
    requiredScope?: 'own' | 'all'
  ) => {
    if (!permissions) return false;
    return checkPermission(permissions, resource, operation, requiredScope);
  };

  return { can, loading: permissions === null, permissions };
}
```

```typescript
// src/components/rbac/RequirePermission.tsx
function RequirePermission({
  resource,
  operation,
  scope,
  children,
  fallback,
}: {
  resource: Resource;
  operation: Operation;
  scope?: "own" | "all";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can, loading } = usePermissions();

  if (loading) return <LoadingSpinner />;
  if (!can(resource, operation, scope)) return fallback ?? <AccessDenied />;
  return <>{children}</>;
}
```

### 8.2 Layer 2: Cloud Function Middleware

```typescript
// functions/src/rbac/middleware.ts
function requirePermission(
  resource: Resource,
  operation: Operation,
  scope?: 'own' | 'all'
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const claims = req.auth?.token?.rbac;
    if (!claims?.p) {
      return res.status(403).json({ error: 'No permissions assigned' });
    }

    const permissions = decodePermissions(claims.p);

    // Deny check first (OpenMetadata pattern)
    if (hasDeny(permissions, resource, operation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!hasAllow(permissions, resource, operation, scope)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Attach effective scope for downstream ownership checks
    req.rbacScope = getEffectiveScope(permissions, resource, operation);
    next();
  };
}
```

### 8.3 Layer 3: Firestore Rules

```
// RBAC check in Firestore rules
// Claims string is checked via comma-anchored regex (RE2 compatible)
// Comma-anchoring prevents "!ev:v.a" from matching as an allow entry
// Wildcard support: checks for exact match, resource wildcard, op wildcard, or full wildcard

function hasRBACAllow(resource, op) {
  let p = request.auth.token.rbac.p;
  return request.auth.token.rbac != null && (
    // Exact match: entry at start or after comma
    p.matches('(^|.*,)' + resource + ':' + op + '\\.(o|a)(,.*|$)') ||
    // Resource wildcard: *:{op}.{scope}
    p.matches('(^|.*,)\\*:' + op + '\\.(o|a)(,.*|$)') ||
    // Operation wildcard: {resource}:*.{scope}
    p.matches('(^|.*,)' + resource + ':\\*\\.(o|a)(,.*|$)') ||
    // Full wildcard: *:*.{scope}
    p.matches('(^|.*,)\\*:\\*\\.(o|a)(,.*|$)')
  );
}

function hasRBACAllowAll(resource, op) {
  let p = request.auth.token.rbac.p;
  return request.auth.token.rbac != null && (
    p.matches('(^|.*,)' + resource + ':' + op + '\\.a(,.*|$)') ||
    p.matches('(^|.*,)\\*:' + op + '\\.a(,.*|$)') ||
    p.matches('(^|.*,)' + resource + ':\\*\\.a(,.*|$)') ||
    p.matches('(^|.*,)\\*:\\*\\.a(,.*|$)')
  );
}

function hasRBACDeny(resource, op) {
  let p = request.auth.token.rbac.p;
  return request.auth.token.rbac != null && (
    p.matches('(^|.*,)!' + resource + ':' + op + '\\.(o|a)(,.*|$)') ||
    p.matches('(^|.*,)!\\*:' + op + '\\.(o|a)(,.*|$)') ||
    p.matches('(^|.*,)!' + resource + ':\\*\\.(o|a)(,.*|$)') ||
    p.matches('(^|.*,)!\\*:\\*\\.(o|a)(,.*|$)')
  );
}

// Usage example
match /events/{eventId} {
  allow read: if hasRBACAllow('ev', 'v') && !hasRBACDeny('ev', 'v');

  allow create: if hasRBACAllow('ev', 'c') && !hasRBACDeny('ev', 'c')
    && request.resource.data.createdBy == request.auth.uid;

  allow update: if !hasRBACDeny('ev', 'e') && (
    hasRBACAllowAll('ev', 'e') ||
    (hasRBACAllow('ev', 'e') && resource.data.createdBy == request.auth.uid)
  );

  allow delete: if !hasRBACDeny('ev', 'd') && (
    hasRBACAllowAll('ev', 'd') ||
    (hasRBACAllow('ev', 'd') && resource.data.createdBy == request.auth.uid)
  );
}
```

---

## 9. Default System Groups

| Group ID            | Name                     | isSystem | Key Permissions                                                                                                                                                                                                               |
| ------------------- | ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `super-admin`       | Super Admin              | true     | All resources, all operations, scope `all`                                                                                                                                                                                    |
| `moderator`         | Moderator                | true     | All resources `view.all` + `moderate.all`; content resources `edit.all` + `publish.all`                                                                                                                                       |
| `content-editor`    | Content Editor           | true     | Content resources (`events`, `spotlights`, `newsletter`, `journal-club`, `blog`, `resources`, `forums`): `create.all`, `edit.all`, `delete.own`, `publish.all`                                                                |
| `event-manager`     | Event Manager            | true     | `events`: all ops scope `all`. Other content: `view.all`                                                                                                                                                                      |
| `newsletter-editor` | Newsletter Editor        | true     | `newsletter`: all ops scope `all`. Other content: `view.all`                                                                                                                                                                  |
| `jc-coordinator`    | Journal Club Coordinator | true     | `journal-club`: all ops scope `all`. Other content: `view.all`                                                                                                                                                                |
| `mentor`            | Mentor                   | true     | `mentorship`: `view.all`, `create.own`, `edit.own`, `delete.own`, `publish.own`                                                                                                                                               |
| `member`            | Member                   | true     | Content: `view.all`. `forums`, `jobs`: `create.own`, `edit.own`, `delete.own`, `publish.own`. `mentorship`: `create.own`, `edit.own`. `salary-insights`: `view.all` (aggregate/anonymized data only — not individual records) |
| `company`           | Company                  | true     | `jobs`: `create.own`, `edit.own`, `delete.own`, `view.all`. `companies`: `edit.own`. Other content: `view.all`                                                                                                                |

---

## 10. CRUD Dashboard Pages

### 10.1 URL Pattern

All features follow the same route structure:

```
/{lang}/dashboard/{feature}/           → List (manage)
/{lang}/dashboard/{feature}/new        → Create
/{lang}/dashboard/{feature}/edit/[id]  → Edit
/{lang}/dashboard/{feature}/[id]       → Detail/Preview
```

### 10.2 Journal Club (fully new)

**Pages:**

- `src/pages/{lang}/dashboard/journal-club/index.astro`
- `src/pages/{lang}/dashboard/journal-club/new.astro`
- `src/pages/{lang}/dashboard/journal-club/edit/[id].astro`
- `src/pages/{lang}/dashboard/journal-club/[id].astro`

**Components:**

- `src/components/journal-club/JournalClubForm.tsx` — React Hook Form + Zod. Fields: date, topic, presenter, presenterUid (user search), description, paperUrl, slidesUrl, recordingUrl, status, tags.
- `src/components/journal-club/JournalClubManageList.tsx` — Table with search, status filter, date sort. Actions: edit, delete, toggle publish.
- `src/components/wrappers/JournalClubFormPage.tsx` — Astro-React wrapper.
- `src/components/wrappers/JournalClubManageListPage.tsx` — Astro-React wrapper.

**Service:**

- `src/lib/journal-club.ts` — `getJournalClubSessions()`, `getJournalClubSession(id)`, `createJournalClubSession()`, `updateJournalClubSession()`, `deleteJournalClubSession()`.

**Public page update:**

- `src/pages/{lang}/journal-club.astro` — Replace hardcoded sessions array with a React island component that fetches from Firestore where `status == "published"`, ordered by date descending.

### 10.3 Newsletter (add missing CRUD)

**New pages:**

- `src/pages/{lang}/dashboard/newsletter/index.astro`
- `src/pages/{lang}/dashboard/newsletter/new.astro`
- `src/pages/{lang}/dashboard/newsletter/edit/[id].astro`

**New components:**

- `src/components/newsletter/NewsletterForm.tsx` — Fields: title, issueNumber, content (rich HTML editor), excerpt, coverImage, status (draft/published).
- `src/components/newsletter/NewsletterManageList.tsx` — Table with search, status filter.
- `src/components/wrappers/NewsletterFormPage.tsx`
- `src/components/wrappers/NewsletterManageListPage.tsx`

**Modified files:**

- `src/lib/newsletter-archive.ts` — Add `createNewsletter()`, `updateNewsletter()`, `deleteNewsletter()`. Rename file to `src/lib/newsletter.ts`.

### 10.4 Spotlights (add list, edit, delete)

**New pages:**

- `src/pages/{lang}/dashboard/spotlights/index.astro`
- `src/pages/{lang}/dashboard/spotlights/edit/[id].astro`

**New components:**

- `src/components/spotlight/SpotlightManageList.tsx` — Table with search, status filter.
- `src/components/wrappers/SpotlightManageListPage.tsx`

**Modified files:**

- `src/components/spotlight/SpotlightEditor.tsx` — Accept optional `spotlightId` prop. When provided, fetch existing data and populate form for editing. Add delete button.
- `src/lib/spotlights.ts` — Add `deleteSpotlight()`.

### 10.5 Events (wire in RBAC + add delete)

**Modified files:**

- `src/components/events/EventList.tsx` — Add delete action (gated by permission).
- `src/components/events/EventForm.tsx` — Wrap with `RequirePermission`.
- `src/pages/{lang}/dashboard/events/index.astro` — Add `RequirePermission` wrapper.
- `src/pages/{lang}/dashboard/events/new.astro` — Add `RequirePermission` wrapper.
- `src/pages/{lang}/dashboard/events/edit/[id].astro` — Add `RequirePermission` wrapper.

---

## 11. RBAC Admin UI

### 11.1 Pages

| Route                                      | Purpose                     |
| ------------------------------------------ | --------------------------- |
| `/{lang}/dashboard/admin/groups/`          | List all groups             |
| `/{lang}/dashboard/admin/groups/new`       | Create group                |
| `/{lang}/dashboard/admin/groups/edit/[id]` | Edit group permissions      |
| `/{lang}/dashboard/admin/groups/[id]`      | View group + assigned users |

### 11.2 Permission Matrix Picker

The group create/edit form includes a permission matrix:

- **Rows:** Resources (events, spotlights, newsletter, ...)
- **Columns:** Operations (view, create, edit, delete, publish, moderate, export, assign)
- **Cell:** Dropdown with options: `—` (no grant), `own`, `all`, `deny:own`, `deny:all`

This renders as a table/grid component: `PermissionMatrixPicker.tsx`.

### 11.3 User-Group Assignment

On the group detail page (`/admin/groups/[id]`):

- List of users currently in the group
- Search + add users
- Remove users from group
- Changes trigger the `resolveUserPermissions` Cloud Function

---

## 12. Migration Strategy

### Phase 1: Deploy RBAC Infrastructure (no behavioral change)

- Create Firestore collections: `rbac_groups`, `rbac_user_groups`, `rbac_audit_log`, `journal_club_sessions`
- Deploy Cloud Functions: `resolveUserPermissions`, `onGroupUpdate`
- Seed default system groups via Cloud Function or migration script
- No Firestore rules changes — existing `canModerate()`/`canAdminister()` still enforces

### Phase 2: Backfill Existing Users

Cloud Function maps current roles to RBAC groups:

| Current `role` | Assigned Groups          |
| -------------- | ------------------------ |
| `admin`        | `super-admin` + `member` |
| `moderator`    | `moderator` + `member`   |
| `member`       | `member`                 |
| `collaborator` | `member`                 |
| `company`      | `company`                |

Resolve and set custom claims for all existing users. Verify via audit log.

### Phase 3: Deploy Client-Side Permission Layer

- Ship `usePermissions()` hook, `RequirePermission` component, `decodePermissions()` utility
- New CRUD pages (journal-club, newsletter, spotlights management) use `RequirePermission`
- Existing pages (events, jobs, forums) add `RequirePermission` alongside current role checks
- Both systems active simultaneously

### Phase 4: Update Firestore Rules

- Add RBAC claim checks alongside existing checks
- Pattern: `allow write: if hasRBACAllow('ev', 'e') || canModerate()`
- Both paths work — tokens without RBAC claims still pass legacy checks
- Add rules for new collections

### Phase 5: Remove Legacy Checks

- Verify all users have RBAC claims (monitoring/query)
- Remove `canModerate()`/`canAdminister()` from Firestore rules
- Remove role-based checks from frontend components
- Keep `role` field on user doc for display purposes only

---

## 13. Firestore Rules for New Collections

```
// RBAC collections
match /rbac_groups/{groupId} {
  allow read: if isAuthenticated() && hasRBACAllow('gr', 'v');
  allow create: if isAuthenticated() && hasRBACAllow('gr', 'c');
  allow update: if isAuthenticated() && hasRBACAllow('gr', 'e');
  allow delete: if isAuthenticated() && hasRBACAllow('gr', 'd')
    && !resource.data.isSystem;  // can't delete system groups
}

match /rbac_user_groups/{userId} {
  allow read: if isAuthenticated() && (
    request.auth.uid == userId || hasRBACAllow('gr', 'a')
  );
  allow write: if isAuthenticated() && hasRBACAllow('gr', 'a');
}

match /rbac_audit_log/{logId} {
  allow read: if isAuthenticated() && hasRBACAllow('gr', 'v');
  allow write: if false;  // only Cloud Functions write audit logs
}

// Journal Club — public read for published sessions, RBAC for management
match /journal_club_sessions/{sessionId} {
  allow read: if resource.data.status == 'published' ||
    (isAuthenticated() && hasRBACAllow('jc', 'v') && !hasRBACDeny('jc', 'v'));
  allow create: if isAuthenticated() && hasRBACAllow('jc', 'c') && !hasRBACDeny('jc', 'c')
    && request.resource.data.createdBy == request.auth.uid;
  allow update: if isAuthenticated() && !hasRBACDeny('jc', 'e') && (
    hasRBACAllowAll('jc', 'e') ||
    (hasRBACAllow('jc', 'e') && resource.data.createdBy == request.auth.uid)
  );
  allow delete: if isAuthenticated() && !hasRBACDeny('jc', 'd') && (
    hasRBACAllowAll('jc', 'd') ||
    (hasRBACAllow('jc', 'd') && resource.data.createdBy == request.auth.uid)
  );
}

// Newsletter archive (upgrade from read-only) — public read for published
match /newsletter_archive/{issueId} {
  allow read: if resource.data.status == 'published' ||
    (isAuthenticated() && hasRBACAllow('nl', 'v') && !hasRBACDeny('nl', 'v'));
  allow create: if isAuthenticated() && hasRBACAllow('nl', 'c') && !hasRBACDeny('nl', 'c')
    && request.resource.data.createdBy == request.auth.uid;
  allow update: if isAuthenticated() && !hasRBACDeny('nl', 'e') && (
    hasRBACAllowAll('nl', 'e') ||
    (hasRBACAllow('nl', 'e') && resource.data.createdBy == request.auth.uid)
  );
  allow delete: if isAuthenticated() && !hasRBACDeny('nl', 'd') && (
    hasRBACAllowAll('nl', 'd') ||
    (hasRBACAllow('nl', 'd') && resource.data.createdBy == request.auth.uid)
  );
}

// Spotlights — public read for published, RBAC for management
match /spotlights/{spotlightId} {
  allow read: if resource.data.status == 'published' ||
    (isAuthenticated() && hasRBACAllow('sp', 'v') && !hasRBACDeny('sp', 'v'));
  allow create: if isAuthenticated() && hasRBACAllow('sp', 'c') && !hasRBACDeny('sp', 'c')
    && request.resource.data.createdBy == request.auth.uid;
  allow update: if isAuthenticated() && !hasRBACDeny('sp', 'e') && (
    hasRBACAllowAll('sp', 'e') ||
    (hasRBACAllow('sp', 'e') && resource.data.createdBy == request.auth.uid)
  );
  allow delete: if isAuthenticated() && !hasRBACDeny('sp', 'd') && (
    hasRBACAllowAll('sp', 'd') ||
    (hasRBACAllow('sp', 'd') && resource.data.createdBy == request.auth.uid)
  );
}

// Events — authenticated read (existing behavior), RBAC for management
// During migration Phase 4, rules use: hasRBACAllow(...) || canModerate()
match /events/{eventId} {
  // Phase 4: all authenticated users can read events (existing behavior).
  // Phase 5 TODO: replace with hasRBACAllow('ev', 'v') && !hasRBACDeny('ev', 'v')
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && (
    (hasRBACAllow('ev', 'c') && !hasRBACDeny('ev', 'c')) || canModerate()
  ) && request.resource.data.createdBy == request.auth.uid;
  allow update: if isAuthenticated() && (
    (!hasRBACDeny('ev', 'e') && (
      hasRBACAllowAll('ev', 'e') ||
      (hasRBACAllow('ev', 'e') && resource.data.createdBy == request.auth.uid)
    )) ||
    (isOwner(resource.data.createdBy) || canModerate())
  );
  allow delete: if isAuthenticated() && (
    (!hasRBACDeny('ev', 'd') && (
      hasRBACAllowAll('ev', 'd') ||
      (hasRBACAllow('ev', 'd') && resource.data.createdBy == request.auth.uid)
    )) ||
    canAdminister()
  );
}
```

---

## 14. File Impact Summary

### New Files (~30)

**RBAC core (`src/lib/rbac/`):**

- `types.ts` — Resource, Operation, PermissionGrant, RBACGroup, etc.
- `codec.ts` — encode/decode permission strings, abbreviation maps
- `resolver.ts` — permission merge logic (shared with Cloud Function)
- `checker.ts` — `checkPermission()`, `hasDeny()`, `hasAllow()`, `getEffectiveScope()`
- `hooks.ts` — `usePermissions()` React hook
- `index.ts` — re-exports

**RBAC components (`src/components/rbac/`):**

- `RequirePermission.tsx`
- `AccessDenied.tsx`
- `PermissionMatrixPicker.tsx`

**Journal Club:**

- `src/components/journal-club/JournalClubForm.tsx`
- `src/components/journal-club/JournalClubManageList.tsx`
- `src/components/wrappers/JournalClubFormPage.tsx`
- `src/components/wrappers/JournalClubManageListPage.tsx`
- `src/lib/journal-club.ts`

**Newsletter:**

- `src/components/newsletter/NewsletterForm.tsx`
- `src/components/newsletter/NewsletterManageList.tsx`
- `src/components/wrappers/NewsletterFormPage.tsx`
- `src/components/wrappers/NewsletterManageListPage.tsx`

**Spotlights:**

- `src/components/spotlight/SpotlightManageList.tsx`
- `src/components/wrappers/SpotlightManageListPage.tsx`

**Dashboard pages (×2 langs):**

- `src/pages/{lang}/dashboard/journal-club/index.astro`
- `src/pages/{lang}/dashboard/journal-club/new.astro`
- `src/pages/{lang}/dashboard/journal-club/edit/[id].astro`
- `src/pages/{lang}/dashboard/journal-club/[id].astro`
- `src/pages/{lang}/dashboard/newsletter/index.astro`
- `src/pages/{lang}/dashboard/newsletter/new.astro`
- `src/pages/{lang}/dashboard/newsletter/edit/[id].astro`
- `src/pages/{lang}/dashboard/spotlights/index.astro`
- `src/pages/{lang}/dashboard/spotlights/edit/[id].astro`
- `src/pages/{lang}/dashboard/admin/groups/index.astro`
- `src/pages/{lang}/dashboard/admin/groups/new.astro`
- `src/pages/{lang}/dashboard/admin/groups/edit/[id].astro`
- `src/pages/{lang}/dashboard/admin/groups/[id].astro`

**Cloud Functions (`functions/src/rbac/`):**

- `resolvePermissions.ts` — Cloud Function triggered on group/assignment changes
- `backfillUsers.ts` — One-time migration script
- `seedGroups.ts` — Seeds default system groups

### Modified Files (~15)

- `src/lib/newsletter-archive.ts` → rename to `src/lib/newsletter.ts`, add CUD operations
- `src/lib/spotlights.ts` — add `deleteSpotlight()`
- `src/components/spotlight/SpotlightEditor.tsx` — support edit mode
- `src/components/events/EventForm.tsx` — add RBAC checks
- `src/components/events/EventList.tsx` — add delete, RBAC checks
- `src/contexts/AuthContext.tsx` — expose RBAC claims
- `src/types/admin.ts` — update `AdminPermission` type to align with new system
- `firestore.rules` — add RBAC helper functions + new collection rules
- `src/pages/{lang}/journal-club.astro` — replace hardcoded data with React island
- `src/components/Navigation.astro` / dashboard navigation — permission-gated menu items

### Unchanged

- Public newsletter page (`/es/newsletter/`) — subscription form unchanged
- Public spotlights page (`/es/spotlights/`) — already reads from Firestore
- Public events page (`/es/events/`) — already reads from Firestore

---

## 15. Firestore Indexes

New composite indexes required in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "journal_club_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "newsletter_archive",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "spotlights",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rbac_user_groups",
      "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "groups", "arrayConfig": "CONTAINS" }]
    }
  ]
}
```

---

## 16. AdminAuthGuard Migration Note

The existing `AdminAuthGuard` component (`src/components/admin/AdminAuthGuard.tsx`) uses role-based checks (`isAdmin`, `isModerator`). During the migration:

- **Phases 1-3:** Continue using `AdminAuthGuard` for existing admin pages. New pages use `RequirePermission`.
- **Phase 4:** Add `RequirePermission` alongside `AdminAuthGuard` on existing admin pages.
- **Phase 5:** Replace all `AdminAuthGuard` usage with `RequirePermission`. Deprecate and remove `AdminAuthGuard`.

---

## 17. Testing Strategy

- **Unit tests:** Permission codec (encode/decode, including wildcards), resolver (merge logic, deny-wins, scope-broadening, wildcard compression), checker functions
- **Integration tests:** Cloud Function resolution (mock Firestore), claims setting, backfill script, batch resolution with concurrency
- **Component tests:** `RequirePermission` renders/hides based on permissions, `usePermissions` hook behavior, `PermissionMatrixPicker` interaction
- **E2E tests:** Full flow — admin creates group, assigns user, user sees/doesn't see CRUD buttons, Firestore rules block unauthorized writes

---

## 18. Open Questions

1. **Token refresh delay:** After group assignment changes, the user's ID token won't reflect new claims until it refreshes (~1 hour by default). Should we force a token refresh via client-side listener, or is the delay acceptable?
2. **Rich text editor:** Newsletter and journal club description fields need HTML content editing. Should we use an existing editor library (e.g., TipTap, Lexical) or keep it as a textarea with markdown?
