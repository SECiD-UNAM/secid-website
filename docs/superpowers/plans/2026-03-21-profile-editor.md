# Enhanced Profile Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the profile editor with 6 tabs (Personal, Career, Education, Portfolio, Privacy, Security), adding work history with company autocomplete, education history, certifications, languages, and project showcases.

**Architecture:** Split the existing 1,391-line `ProfileEdit.tsx` into a shell + 6 tab components + 4 shared form components. Add `EducationEntry` and `Language` types. Reuse existing `WorkExperience`, `Certification`, and `ProjectShowcase` types. Integrate with the `companies` collection for work history autocomplete.

**Tech Stack:** React 18, TypeScript, Firebase Firestore, Tailwind CSS, Zod validation

**Spec:** `docs/superpowers/specs/2026-03-21-profile-editor-design.md`

---

### Task 1: Add EducationEntry and Language types + update MemberProfile

**Files:**

- Modify: `src/types/member.ts`
- Modify: `src/lib/members/mapper.ts`

- [ ] **Step 1: Add new interfaces to member.ts**

After the `WorkExperience` interface, add:

```typescript
export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  gpa?: number;
  description?: string;
  campus?: string;
  numeroCuenta?: string;
  generation?: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
}
```

- [ ] **Step 2: Add fields to MemberProfile**

In the `MemberProfile` interface, add after the `portfolio` block:

```typescript
  educationHistory: EducationEntry[];
  languages: Language[];
```

- [ ] **Step 3: Update mapper**

In `mapUserDocToMemberProfile()`, add defaults for the new fields (after the existing `portfolio` mapping):

```typescript
    educationHistory: (data.educationHistory || []).map((e: any) => ({
      ...e,
      startDate: e.startDate?.toDate?.() || new Date(e.startDate || 0),
      endDate: e.endDate?.toDate?.() || (e.endDate ? new Date(e.endDate) : undefined),
    })),
    languages: data.languages || [],
```

- [ ] **Step 4: Update mock data**

In `createMockMemberProfile()`, add:

```typescript
  educationHistory: [],
  languages: [],
```

- [ ] **Step 5: Run type check and commit**

```bash
npx tsc --noEmit
npx prettier --write src/types/member.ts src/lib/members/mapper.ts
git add src/types/member.ts src/lib/members/mapper.ts
git commit -m "feat: add EducationEntry and Language types to MemberProfile"
```

---

### Task 2: Create shared form components

**Files:**

- Create: `src/components/profile/shared/MonthYearPicker.tsx`
- Create: `src/components/profile/shared/TagInput.tsx`
- Create: `src/components/profile/shared/EntryCard.tsx`
- Create: `src/components/profile/shared/CompanyAutocomplete.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p src/components/profile/shared
```

- [ ] **Step 2: Create MonthYearPicker**

A controlled component with month dropdown (1-12) and year input. Props: `{ value: { month: number; year: number } | null; onChange: (value) => void; disabled?: boolean; lang: 'es' | 'en' }`. Renders two side-by-side selects.

- [ ] **Step 3: Create TagInput**

A controlled component for adding/removing tags (skills, technologies). Props: `{ tags: string[]; onChange: (tags: string[]) => void; suggestions?: string[]; placeholder?: string; max?: number }`. Enter/comma to add, X to remove, autocomplete from suggestions.

- [ ] **Step 4: Create EntryCard**

A reusable card wrapper for work history/education/certification entries. Props: `{ title: string; subtitle?: string; dateRange?: string; isEditing: boolean; onEdit: () => void; onDelete: () => void; onSave: () => void; onCancel: () => void; children: ReactNode; lang: 'es' | 'en' }`. Shows view mode (title + subtitle + dates + edit/delete icons) or edit mode (children form + save/cancel buttons).

- [ ] **Step 5: Create CompanyAutocomplete**

Props: `{ value: string; companyId?: string; onChange: (name: string, companyId?: string) => void; lang: 'es' | 'en' }`.

Behavior:

1. Loads companies via `getCompanies()` on mount
2. Filters as user types (debounced)
3. Dropdown shows matching companies with `CompanyLogo`
4. Select → calls `onChange(company.name, company.id)`
5. "Create new company" option → prompts for domain → calls `POST /api/companies` → sets companyId
6. Free typing without selecting → calls `onChange(text, undefined)`

Import `CompanyLogo` from `@/components/shared/CompanyLogo` and `getCompanies` from `@/lib/companies`.

- [ ] **Step 6: Run type check and commit**

```bash
npx tsc --noEmit
npx prettier --write src/components/profile/shared/
git add src/components/profile/shared/
git commit -m "feat: create shared form components (MonthYearPicker, TagInput, EntryCard, CompanyAutocomplete)"
```

---

### Task 3: Extract existing tabs from ProfileEdit.tsx

**Files:**

- Create: `src/components/profile/tabs/PersonalTab.tsx`
- Create: `src/components/profile/tabs/PrivacyTab.tsx`
- Create: `src/components/profile/tabs/SecurityTab.tsx`
- Modify: `src/components/profile/ProfileEdit.tsx`

- [ ] **Step 1: Create tabs directory**

```bash
mkdir -p src/components/profile/tabs
```

- [ ] **Step 2: Extract PersonalTab**

Move the Personal tab JSX (lines ~509-687 in ProfileEdit.tsx) into `PersonalTab.tsx`. Props: `{ formData: FormData; onChange: (field, value) => void; onPhotoUpload: (file: File) => void; photoUploading: boolean; lang: 'es' | 'en' }`.

- [ ] **Step 3: Extract PrivacyTab**

Move the Privacy tab JSX (lines ~1065-1261) into `PrivacyTab.tsx`. Props: `{ formData: FormData; onChange: (field, value) => void; lang: 'es' | 'en' }`.

- [ ] **Step 4: Extract SecurityTab**

Move the Security tab JSX (lines ~1263-1342) into `SecurityTab.tsx`. Props: `{ user: User; lang: 'es' | 'en' }`. Keep password change logic inside this component.

- [ ] **Step 5: Update ProfileEdit.tsx**

Replace the inline tab content with the extracted components. The file should shrink significantly. Keep: tab navigation, save handler, state management, form data initialization.

- [ ] **Step 6: Run type check and commit**

```bash
npx tsc --noEmit
npx prettier --write src/components/profile/tabs/ src/components/profile/ProfileEdit.tsx
git add src/components/profile/tabs/PersonalTab.tsx src/components/profile/tabs/PrivacyTab.tsx src/components/profile/tabs/SecurityTab.tsx src/components/profile/ProfileEdit.tsx
git commit -m "refactor: extract Personal, Privacy, Security tabs from ProfileEdit.tsx"
```

---

### Task 4: Create CareerTab (replaces Professional)

**Files:**

- Create: `src/components/profile/tabs/CareerTab.tsx`
- Modify: `src/components/profile/profile-edit-types.ts`

- [ ] **Step 1: Update form data types**

In `profile-edit-types.ts`, add to `FormData`:

```typescript
  workHistory: WorkExperience[];
```

Update `ProfileTab` type to replace `'professional'` with `'career'`.

- [ ] **Step 2: Create CareerTab**

Content sections:

1. **Work History** — list of `EntryCard` components for each `WorkExperience`. Each card's edit mode uses `CompanyAutocomplete` for company, text inputs for position, `MonthYearPicker` for dates, "Current" checkbox, textarea for description, `TagInput` for technologies. "Add Work Experience" button at bottom.
2. **Skills** — `TagInput` with suggested skills (moved from Professional tab)
3. **Social Links** — LinkedIn, GitHub, Portfolio, Twitter inputs (moved from Professional tab)

Props: `{ formData: FormData; onChange: (field, value) => void; lang: 'es' | 'en' }`

Key behavior: when a work entry has `current: true`, auto-update `formData.currentCompany`, `formData.currentPosition`, and the company-related fields.

- [ ] **Step 3: Run type check and commit**

```bash
npx tsc --noEmit
npx prettier --write src/components/profile/tabs/CareerTab.tsx src/components/profile/profile-edit-types.ts
git add src/components/profile/tabs/CareerTab.tsx src/components/profile/profile-edit-types.ts
git commit -m "feat: create CareerTab with work history, company autocomplete, skills, and social links"
```

---

### Task 5: Create EducationTab (enhanced)

**Files:**

- Create: `src/components/profile/tabs/EducationTab.tsx`

- [ ] **Step 1: Create EducationTab**

Three sections:

1. **Education History** — list of `EntryCard` for each `EducationEntry`. Fields: institution, degree, field of study, dates, GPA, description. If institution contains "UNAM", show extra fields: campus (dropdown), numero de cuenta, generation (dropdown).
2. **Certifications** — list of `EntryCard` for each `Certification`. Fields: name, issuer, issue date, expiry date, credential ID, credential URL.
3. **Languages** — simple list with add/remove. Each row: language name (text or dropdown), proficiency (dropdown: Beginner/Intermediate/Advanced/Native).

Props: `{ formData: FormData; onChange: (field, value) => void; lang: 'es' | 'en' }`

Add to `FormData` in `profile-edit-types.ts`:

```typescript
  educationHistory: EducationEntry[];
  certifications: Certification[];
  languages: Language[];
```

- [ ] **Step 2: Run type check and commit**

```bash
npx tsc --noEmit
npx prettier --write src/components/profile/tabs/EducationTab.tsx src/components/profile/profile-edit-types.ts
git add src/components/profile/tabs/EducationTab.tsx src/components/profile/profile-edit-types.ts
git commit -m "feat: create EducationTab with education history, certifications, and languages"
```

---

### Task 6: Create PortfolioTab

**Files:**

- Create: `src/components/profile/tabs/PortfolioTab.tsx`

- [ ] **Step 1: Create PortfolioTab**

Grid of project cards using `EntryCard`. Each card's edit mode: title (required), description (textarea), category (dropdown: Machine Learning, Data Analysis, Web Development, Research, Other), technologies (`TagInput`), GitHub URL, live demo URL, featured toggle.

View mode: card showing title, description snippet, tech tags, links, featured badge.

Props: `{ formData: FormData; onChange: (field, value) => void; lang: 'es' | 'en' }`

Add to `FormData`:

```typescript
  projects: ProjectShowcase[];
```

- [ ] **Step 2: Run type check and commit**

```bash
npx tsc --noEmit
npx prettier --write src/components/profile/tabs/PortfolioTab.tsx src/components/profile/profile-edit-types.ts
git add src/components/profile/tabs/PortfolioTab.tsx src/components/profile/profile-edit-types.ts
git commit -m "feat: create PortfolioTab with project showcases"
```

---

### Task 7: Wire up ProfileEdit.tsx with new tabs

**Files:**

- Modify: `src/components/profile/ProfileEdit.tsx`
- Modify: `src/components/profile/profile-edit-types.ts`

- [ ] **Step 1: Update tab navigation**

Replace the tab list: `['personal', 'career', 'education', 'portfolio', 'privacy', 'security']`

Remove the old Professional tab content (it's now in CareerTab).
Remove the old Education tab content (it's now in EducationTab).

- [ ] **Step 2: Import and render new tabs**

```typescript
import { CareerTab } from './tabs/CareerTab';
import { EducationTab } from './tabs/EducationTab';
import { PortfolioTab } from './tabs/PortfolioTab';
```

Render each based on `activeTab`.

- [ ] **Step 3: Initialize form data with new fields**

When loading user profile data, populate:

- `workHistory` from `experience.previousRoles` (include current role)
- `educationHistory` from profile's education data
- `certifications` from `portfolio.certifications`
- `languages` from `languages`
- `projects` from `portfolio.projects`

- [ ] **Step 4: Update save handler**

The save handler must persist the new array fields to Firestore via `updateMemberProfile()`:

- `experience.previousRoles` ← `workHistory` (excluding current)
- `experience.currentRole` ← current work entry's position
- `profile.company` ← current work entry's company
- `profile.companyId` ← current work entry's companyId
- `portfolio.certifications` ← `certifications`
- `portfolio.projects` ← `projects`
- `educationHistory` ← `educationHistory`
- `languages` ← `languages`

- [ ] **Step 5: Run type check, format, and commit**

```bash
npx tsc --noEmit
npx prettier --write src/components/profile/ProfileEdit.tsx src/components/profile/profile-edit-types.ts
git add src/components/profile/ProfileEdit.tsx src/components/profile/profile-edit-types.ts
git commit -m "feat: wire up ProfileEdit with Career, Education, Portfolio tabs"
```

---

### Task 8: Final verification

- [ ] **Step 1: Full type check and lint**

```bash
npx tsc --noEmit
npm run format:check
npx vitest run tests/unit/
```

- [ ] **Step 2: Format if needed**

```bash
npx prettier --write "src/components/profile/**"
```

- [ ] **Step 3: Commit and push**

```bash
git add -A
git commit -m "style: format profile editor files"
git push
```

- [ ] **Step 4: Manual testing checklist**

1. Navigate to `/es/dashboard/profile/edit` — 6 tabs visible
2. **Personal tab**: unchanged, photo upload works
3. **Career tab**: add work experience with company autocomplete, check "current", verify skills and social links
4. **Career tab**: create new company inline → verify it appears in companies collection
5. **Education tab**: add education entry, show UNAM fields when institution = "UNAM"
6. **Education tab**: add certification with credential URL
7. **Education tab**: add language with proficiency
8. **Portfolio tab**: add project with tech tags and URLs
9. Save all → reload → all data persists
10. Dark mode on all tabs
11. English version at `/en/dashboard/profile/edit`
