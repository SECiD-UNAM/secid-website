# Admin Member Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin member management: a dedicated admin table with inline role/status editing, bulk actions, and the ability to edit any member's profile using the existing profile editor.

**Architecture:** New `AdminMembersTable` component for the admin panel + extend `ProfileEdit` with `targetUid` prop for editing any member. Reuses existing mutation functions (`updateMemberProfile`, `updateMemberStatus`, `bulkUpdateMemberStatus`).

**Tech Stack:** React 18, TypeScript, Firebase Firestore, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-21-admin-member-management-design.md`

---

### Task 1: Extend ProfileEdit with targetUid and isAdmin props

**Files:**

- Modify: `src/components/profile/ProfileEdit.tsx`
- Modify: `src/components/profile/profile-edit-types.ts`

- [ ] **Step 1: Update types**

In `profile-edit-types.ts`, add to the component props:

```typescript
export interface ProfileEditProps {
  lang?: 'es' | 'en';
  targetUid?: string; // admin editing another member
  isAdmin?: boolean;
}
```

- [ ] **Step 2: Update ProfileEdit to load target member's data**

In ProfileEdit.tsx:

- Accept `targetUid` and `isAdmin` props
- When `targetUid` is set, use `getMemberProfile(targetUid)` to load data instead of `userProfile` from `useAuth()`
- Update the save handler to use `targetUid` instead of `user.uid` when saving
- When `isAdmin`, show admin-only fields after the tab content: role dropdown (member/collaborator/admin/moderator), verification status dropdown, lifecycle status dropdown

- [ ] **Step 3: Run type check and commit**

```bash
npx tsc --noEmit
git add src/components/profile/ProfileEdit.tsx src/components/profile/profile-edit-types.ts
git commit -m "feat: extend ProfileEdit with targetUid and isAdmin props for admin editing"
```

---

### Task 2: Create AdminMembersTable component

**Files:**

- Create: `src/components/dashboard/admin/AdminMembersTable.tsx`

- [ ] **Step 1: Create the component**

A full-featured admin table with:

**Columns:** checkbox, name+avatar, email, company, role (inline dropdown), status (inline dropdown), verification badge, joined date, last active, actions (Edit Profile link)

**Filters:** role multi-select, status multi-select, verification multi-select, search by name/email

**Bulk actions toolbar** (appears when rows selected): Change Role dropdown, Change Status dropdown, Approve button, Clear Selection. Confirmation dialog before executing.

**Inline editing:** Role and status dropdowns save immediately on change via `updateMemberProfile()` / `updateMemberStatus()`. Brief success highlight on the row.

**Data:** Loads via `getMemberProfiles({ limit: 200 })`. All filtering/sorting client-side.

Props: `{ lang: 'es' | 'en' }`

Uses `useAuth()` for admin verification.

**i18n:** All labels bilingual.

- [ ] **Step 2: Run type check and commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/admin/AdminMembersTable.tsx
git commit -m "feat: create AdminMembersTable with inline editing and bulk actions"
```

---

### Task 3: Create Astro pages and wrappers

**Files:**

- Create: `src/components/wrappers/AdminMembersPage.tsx`
- Create: `src/components/wrappers/AdminMemberEditPage.tsx`
- Create: `src/pages/es/dashboard/admin/members/index.astro`
- Create: `src/pages/en/dashboard/admin/members/index.astro`
- Create: `src/pages/es/dashboard/admin/members/[uid]/edit.astro`
- Create: `src/pages/en/dashboard/admin/members/[uid]/edit.astro`

- [ ] **Step 1: Create AdminMembersPage wrapper**

```tsx
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminMembersTable } from '@/components/dashboard/admin/AdminMembersTable';

interface Props {
  lang?: 'es' | 'en';
}

export default function AdminMembersPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <AdminMembersTable lang={lang} />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Create AdminMemberEditPage wrapper**

```tsx
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ProfileEdit from '@/components/profile/ProfileEdit';

interface Props {
  lang?: 'es' | 'en';
  uid: string;
}

export default function AdminMemberEditPage({ lang = 'es', uid }: Props) {
  return (
    <AuthProvider>
      <ProfileEdit lang={lang} targetUid={uid} isAdmin={true} />
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Create list Astro pages (es + en)**

`src/pages/es/dashboard/admin/members/index.astro`:

```astro
---
import DashboardLayout from '@/layouts/DashboardLayout.astro';
import AdminMembersPage from '@/components/wrappers/AdminMembersPage';
---

<DashboardLayout
  title="Gestión de Miembros - SECiD"
  lang="es"
  requireVerified={true}
  requireRole={['admin', 'moderator']}
>
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Gestión de Miembros
    </h1>
  </div>
  <AdminMembersPage client:only="react" lang="es" />
</DashboardLayout>
```

Same for English.

- [ ] **Step 4: Create edit Astro pages (es + en) with dynamic [uid]**

`src/pages/es/dashboard/admin/members/[uid]/edit.astro`:

```astro
---
import DashboardLayout from '@/layouts/DashboardLayout.astro';
import AdminMemberEditPage from '@/components/wrappers/AdminMemberEditPage';
const { uid } = Astro.params;
---

<DashboardLayout
  title="Editar Miembro - SECiD"
  lang="es"
  requireVerified={true}
  requireRole={['admin', 'moderator']}
>
  <AdminMemberEditPage client:only="react" lang="es" uid={uid!} />
</DashboardLayout>
```

Same for English.

- [ ] **Step 5: Run type check and commit**

```bash
npx tsc --noEmit
git add src/components/wrappers/AdminMembersPage.tsx src/components/wrappers/AdminMemberEditPage.tsx src/pages/es/dashboard/admin/members/ src/pages/en/dashboard/admin/members/
git commit -m "feat: add admin member management pages with edit routing"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full checks**

```bash
npx tsc --noEmit
npm run format:check
```

- [ ] **Step 2: Format if needed**

```bash
npx prettier --write "src/components/dashboard/admin/AdminMembersTable.tsx" "src/components/wrappers/AdminMembers*.tsx" "src/pages/es/dashboard/admin/members/**" "src/pages/en/dashboard/admin/members/**" "src/components/profile/ProfileEdit.tsx"
```

- [ ] **Step 3: Commit and push**

```bash
git add -A
git commit -m "style: format admin member management files"
git push
```
