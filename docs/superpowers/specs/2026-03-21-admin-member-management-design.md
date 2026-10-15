# Admin Member Management — Design Spec

## Context

Admins need to manage members: edit any member's profile, change roles, change status, approve/reject, and perform bulk operations. The profile editor (Feature A) is already built with 6 tabs. This spec adds admin access to it plus a dedicated admin members table.

This is Feature B of 2:

- Feature A: Enhanced Profile Editor — **DONE**
- **Feature B: Admin Member Management** (this spec)

## Admin Profile Editing

The existing `ProfileEdit` component gets a `targetUid` prop. When set, it loads and saves that member's profile instead of the current user's.

- Admin navigates to `/es/dashboard/admin/members/{uid}/edit`
- `ProfileEdit` receives `targetUid={uid}` and `isAdmin={true}`
- All 6 tabs work the same, but saving writes to the target member's doc
- Admin-only fields shown when `isAdmin`: role dropdown, verification status, lifecycle status
- Back button returns to admin members table

## Admin Members Table

New page at `/es/dashboard/admin/members` with a purpose-built table.

### Columns

- Checkbox (for bulk selection)
- Name (with avatar)
- Email (always visible)
- Company
- Role (inline dropdown: member, collaborator, admin, moderator)
- Status (inline dropdown: active, inactive, suspended, pending, alumni)
- Verification (badge: approved, pending, rejected, none)
- Joined date
- Last active
- Actions (Edit Profile button)

### Filters

- Role (multi-select)
- Status (multi-select)
- Verification status (multi-select)
- Search by name/email (text)

### Bulk Actions

Toolbar appears when rows are selected:

- **Change Role** — dropdown to set role for all selected
- **Change Status** — dropdown to set status for all selected
- **Approve** — set verification to approved for all selected
- Clear selection button

Confirmation dialog before executing bulk actions showing count of affected members.

### Inline Editing

- Role and status columns have inline dropdowns — click to change, saves immediately via `updateMemberStatus()` or `updateMemberProfile()`
- Visual feedback: brief highlight on save

## Data Layer

### Existing functions (no changes needed)

- `getMemberProfiles({ limit: 200 })` — loads all members
- `updateMemberProfile(uid, updates)` — saves profile changes
- `updateMemberStatus(uid, status)` — changes lifecycle status
- `bulkUpdateMemberStatus(uids, status)` — batch status change

### ProfileEdit changes

- Accept optional `targetUid?: string` and `isAdmin?: boolean` props
- When `targetUid` is set, load that member's doc instead of current user
- When `isAdmin`, show admin-only fields (role, verification, status)

## Component Architecture

### New files

| File                                                    | Purpose                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| `src/components/dashboard/admin/AdminMembersTable.tsx`  | Admin members table with filters, inline editing, bulk actions |
| `src/components/wrappers/AdminMembersPage.tsx`          | Wrapper with AuthProvider                                      |
| `src/components/wrappers/AdminMemberEditPage.tsx`       | Wrapper that passes targetUid to ProfileEdit                   |
| `src/pages/es/dashboard/admin/members/index.astro`      | Admin members list page (Spanish)                              |
| `src/pages/en/dashboard/admin/members/index.astro`      | Admin members list page (English)                              |
| `src/pages/es/dashboard/admin/members/[uid]/edit.astro` | Admin edit member page (Spanish)                               |
| `src/pages/en/dashboard/admin/members/[uid]/edit.astro` | Admin edit member page (English)                               |

### Modified files

| File                                           | Change                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/components/profile/ProfileEdit.tsx`       | Add `targetUid` and `isAdmin` props, load target member's data when set, show admin-only fields |
| `src/components/profile/profile-edit-types.ts` | Add `targetUid` and `isAdmin` to props                                                          |

## Verification

1. `npm run check` — TypeScript passes
2. Admin navigates to `/es/dashboard/admin/members` — sees all members in table
3. Inline role change — select new role, saves immediately
4. Inline status change — select new status, saves immediately
5. Click "Edit Profile" — navigates to `/es/dashboard/admin/members/{uid}/edit`
6. Admin edit page shows all 6 profile tabs with target member's data
7. Admin saves changes — target member's Firestore doc updated
8. Bulk select 3 members → change role → confirmation → all 3 updated
9. Filters work (role, status, verification, search)
10. English versions work
