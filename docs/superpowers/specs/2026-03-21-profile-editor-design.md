# Enhanced Profile Editor + Work History — Design Spec

## Context

The profile editor at `/es/dashboard/profile/edit` exists with 5 tabs (Personal, Professional, Education, Privacy, Security) but lacks work history management, certifications, portfolio projects, and languages. The "Professional" tab only stores a single current position. The types and validation schemas for these features already exist (`WorkExperience`, `Certification`, `ProjectShowcase`, `LanguageSchema`) but have no UI.

This spec reworks the profile editor to support complete career profiles. The data model is designed to be compatible with the CV JSON schema from artemiop.com for future auto-generated member CV pages.

This is Feature A of 2:

- **Feature A: Enhanced Profile Editor** (this spec)
- **Feature B: Admin Member Management** (separate spec)

## Tab Restructure

**Current:** Personal, Professional, Education, Privacy, Security
**New:** Personal, Career, Education, Portfolio, Privacy, Security

| Tab       | Content                                                                             |
| --------- | ----------------------------------------------------------------------------------- |
| Personal  | Photo, name, email, phone, location, bio (unchanged)                                |
| Career    | Work history entries (company autocomplete + inline create) + skills + social links |
| Education | Multiple education entries + certifications + languages                             |
| Portfolio | Project showcases (title, description, technologies, URLs)                          |
| Privacy   | Visibility and notification toggles (unchanged)                                     |
| Security  | Password change (unchanged)                                                         |

## Career Tab (replaces Professional)

### Work History Entries

Each entry is a `WorkExperience` card with:

- **Company name**: autocomplete from `companies` collection
  - Match found → auto-set `companyId`, show CompanyLogo
  - No match + user clicks "Create new company" → creates company doc with `pendingReview: true` via `POST /api/companies`
  - Typed freely without selecting → saves as string only (no `companyId`)
- **Position/title**: text input
- **Start date**: month/year picker
- **End date**: month/year picker (disabled if "Current" checked)
- **"I currently work here"** checkbox → sets `current: true`, clears endDate
- **Description**: textarea, optional
- **Technologies used**: tag input, optional

### Behaviors

- "Add Work Experience" button → opens empty card in edit mode
- Edit: pencil icon on existing card
- Delete: trash icon with confirmation
- Sorted by date (most recent first)
- Entry with `current: true` auto-populates `profile.company`, `profile.companyId`, `profile.position`
- Max 20 entries

### Skills + Social Links

Moved from current Professional tab, unchanged:

- Skills management (add/remove with suggestions)
- Social links: LinkedIn, GitHub, Portfolio, Twitter

## Education Tab (enhanced)

### Education History Entries

Same card pattern as work history:

- **Institution name**: text
- **Degree/program**: text (e.g., "Licenciatura en Ciencia de Datos")
- **Field of study**: text, optional
- **Start date**: month/year
- **End date**: month/year (disabled if "Currently studying" checked)
- **GPA**: optional number
- **Description/achievements**: textarea, optional
- UNAM-specific fields shown if institution contains "UNAM": campus, numero de cuenta, generation
- Max 10 entries

### Certifications

Below education entries:

- **Name**: text
- **Issuing organization**: text
- **Issue date**: month/year
- **Expiry date**: optional month/year
- **Credential ID**: text, optional
- **Credential URL**: URL, optional
- Max 20 certifications

### Languages

Below certifications:

- **Language name**: text or dropdown of common languages
- **Proficiency level**: dropdown (Beginner, Intermediate, Advanced, Native)
- Max 10 languages

## Portfolio Tab (new)

### Project Showcases

- **Title**: text, required
- **Description**: textarea
- **Category**: dropdown (Machine Learning, Data Analysis, Web Development, Research, Other)
- **Technologies used**: tag input
- **GitHub URL**: optional
- **Live demo URL**: optional
- **Featured**: toggle to highlight project
- Max 20 projects

Layout: grid of project cards. Click to edit inline.

## Data Layer Changes

### New types to add (`src/types/member.ts`)

```typescript
interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  gpa?: number;
  description?: string;
  // UNAM-specific
  campus?: string;
  numeroCuenta?: string;
  generation?: string;
}

interface Language {
  id: string;
  name: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
}
```

### Fields to add to MemberProfile

```typescript
educationHistory: EducationEntry[];
languages: Language[];
```

Note: `WorkExperience[]`, `Certification[]`, and `ProjectShowcase[]` already exist on MemberProfile via `experience.previousRoles`, `portfolio.certifications`, and `portfolio.projects`.

### Mapper changes

`mapUserDocToMemberProfile()` needs to read `educationHistory` and `languages` from Firestore docs, with empty array defaults.

### Mutations

`updateMemberProfile()` already accepts `Partial<MemberProfile>` — no changes needed. The profile editor calls it with updated arrays.

### Validation

Existing Zod schemas in `src/lib/validation/profile-schemas.ts` cover most fields: `ProfessionalExperienceSchema`, `EducationSchema`, `CertificationSchema`, `ProjectSchema`, `LanguageSchema`. Use these in the form.

## Company Autocomplete Integration

The Career tab's company field integrates with the `companies` collection:

1. User types → debounced search against `companies` collection (client-side filter from `getCompanies()`)
2. Dropdown shows matching companies with CompanyLogo
3. Select → sets `companyId` on the WorkExperience entry
4. "Create new company" option at bottom of dropdown → calls `POST /api/companies` with name + domain
5. New company created with `pendingReview: true`, `companyId` set on the entry

## Component Architecture

### Modified files

| File                                           | Change                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/components/profile/ProfileEdit.tsx`       | Rework tab structure: remove Professional, add Career/Portfolio. Likely needs splitting — file is 1,391 lines |
| `src/components/profile/profile-edit-types.ts` | Add new form data fields for education history, languages, work history                                       |
| `src/types/member.ts`                          | Add `EducationEntry`, `Language` interfaces. Add `educationHistory`, `languages` to MemberProfile             |
| `src/lib/members/mapper.ts`                    | Read `educationHistory` and `languages` from Firestore                                                        |

### New files

| File                                                    | Purpose                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/components/profile/tabs/CareerTab.tsx`             | Work history entries + skills + social links                                             |
| `src/components/profile/tabs/EducationTab.tsx`          | Education entries + certifications + languages                                           |
| `src/components/profile/tabs/PortfolioTab.tsx`          | Project showcases                                                                        |
| `src/components/profile/tabs/PersonalTab.tsx`           | Extracted from ProfileEdit.tsx (unchanged logic)                                         |
| `src/components/profile/tabs/PrivacyTab.tsx`            | Extracted from ProfileEdit.tsx (unchanged logic)                                         |
| `src/components/profile/tabs/SecurityTab.tsx`           | Extracted from ProfileEdit.tsx (unchanged logic)                                         |
| `src/components/profile/shared/EntryCard.tsx`           | Reusable card for work history/education/certification entries (add/edit/delete pattern) |
| `src/components/profile/shared/CompanyAutocomplete.tsx` | Company search with autocomplete + inline create                                         |
| `src/components/profile/shared/TagInput.tsx`            | Reusable tag input for skills/technologies                                               |
| `src/components/profile/shared/MonthYearPicker.tsx`     | Month/year date picker                                                                   |

### Splitting ProfileEdit.tsx

The current 1,391-line file gets split:

- `ProfileEdit.tsx` becomes the shell (tab navigation + save logic + state management)
- Each tab extracted into its own file under `tabs/`
- Shared form components extracted under `shared/`

## CV Compatibility (future-proofing)

The data model maps to the artemiop.com CV JSON schema:

- `experience.previousRoles` → `experience[]` in CV JSON
- `educationHistory` → `education[]`
- `portfolio.certifications` → `certifications[]`
- `portfolio.projects` → `projects[]`
- `profile.skills` → `skills{}`
- `languages` → `languages[]`

A future Subsystem 4 can transform MemberProfile → CV JSON → render with Astro template + PDF export at `/members/{slug}/cv`.

## Verification

1. `npm run check` — TypeScript passes
2. Navigate to `/es/dashboard/profile/edit` — 6 tabs visible
3. Career tab: add work experience with company autocomplete, set "current", verify profile.company syncs
4. Career tab: create new company inline → company appears in companies collection with pendingReview
5. Education tab: add education entry with UNAM fields, add certification, add language
6. Portfolio tab: add project with tech tags and URLs
7. Save all changes → verify Firestore document updated
8. Reload page → all data persists
9. Verify dark mode on all tabs
10. Verify English version at `/en/dashboard/profile/edit`
