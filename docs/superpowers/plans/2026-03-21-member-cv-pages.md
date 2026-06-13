# Member CV Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate professional CV pages from member profiles at `/members/{slug}/cv` with PDF export in 3 formats and member-controlled privacy.

**Architecture:** Pure transformer function converts MemberProfile → CVData. Astro section components render the CV. jsPDF React island handles PDF export. Privacy controlled via `cvVisibility` field on MemberProfile.

**Tech Stack:** Astro 4.x, React 18, jsPDF, TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-21-member-cv-pages-design.md`

**Reference:** artemiop.com CV at `/Users/artemiopadilla/Documents/repos/GitHub/personal/ArtemioPadilla.github.io/src/`

---

### Task 1: Add cvVisibility to MemberProfile + privacy UI

**Files:**

- Modify: `src/types/member.ts`
- Modify: `src/lib/members/mapper.ts`
- Modify: `src/components/profile/tabs/PrivacyTab.tsx`
- Modify: `src/components/profile/profile-edit-types.ts`

- [ ] **Step 1: Add cvVisibility to MemberProfile**

In `src/types/member.ts`, add to MemberProfile (after `languages`):

```typescript
cvVisibility: 'public' | 'members' | 'private';
```

- [ ] **Step 2: Update mapper**

In `mapUserDocToMemberProfile()`, add:

```typescript
    cvVisibility: data.cvVisibility || 'members',
```

In `createMockMemberProfile()`, add:

```typescript
  cvVisibility: 'members',
```

- [ ] **Step 3: Add to FormData**

In `profile-edit-types.ts`, add to FormData:

```typescript
cvVisibility: 'public' | 'members' | 'private';
```

Add to INITIAL_FORM_DATA:

```typescript
  cvVisibility: 'members',
```

- [ ] **Step 4: Add dropdown to PrivacyTab**

In PrivacyTab.tsx, add a "CV Visibility" dropdown with options:

- Público / Public
- Solo Miembros / Members Only
- Privado / Private

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npx prettier --write src/types/member.ts src/lib/members/mapper.ts src/components/profile/tabs/PrivacyTab.tsx src/components/profile/profile-edit-types.ts
git add src/types/member.ts src/lib/members/mapper.ts src/components/profile/tabs/PrivacyTab.tsx src/components/profile/profile-edit-types.ts
git commit -m "feat: add cvVisibility field to MemberProfile and privacy settings"
```

---

### Task 2: Create CVData type and transformer

**Files:**

- Create: `src/types/cv.ts`
- Create: `src/lib/cv/transform.ts`
- Create: `tests/unit/lib/cv/transform.test.ts`

- [ ] **Step 1: Create CVData type**

`src/types/cv.ts` — adapted from artemiop.com's schema:

```typescript
export interface CVData {
  personal: {
    name: { first: string; last: string; full: string };
    title: string;
    location: string;
    contact: {
      email?: string;
      linkedin?: string;
      github?: string;
      twitter?: string;
      portfolio?: string;
    };
    profileImage?: string;
    summary: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string; // YYYY-MM format
    endDate?: string;
    current: boolean;
    description?: string;
    technologies?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    gpa?: number;
    description?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    category: string;
    technologies: string[];
    githubUrl?: string;
    liveUrl?: string;
    featured: boolean;
  }>;
  skills: string[];
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
  metadata: {
    generatedAt: string;
    memberSlug: string;
    lang: string;
  };
}
```

- [ ] **Step 2: Create transformer with tests**

`src/lib/cv/transform.ts`:

```typescript
import type { MemberProfile } from '@/types/member';
import type { CVData } from '@/types/cv';

function formatDate(date: Date | undefined): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function transformProfileToCV(
  member: MemberProfile,
  lang: string = 'es'
): CVData {
  // ... pure mapping function
}
```

Write tests in `tests/unit/lib/cv/transform.test.ts` covering:

- Basic mapping (name, title, location, summary)
- Work experience mapping with date formatting
- Education mapping
- Empty arrays produce empty CV arrays
- Skills passthrough
- Language proficiency mapping

- [ ] **Step 3: Run tests and commit**

```bash
npx vitest run tests/unit/lib/cv/transform.test.ts
npx tsc --noEmit
git add src/types/cv.ts src/lib/cv/ tests/unit/lib/cv/
git commit -m "feat: create CVData type and MemberProfile→CVData transformer"
```

---

### Task 3: Create CV section components

**Files:**

- Create: `src/components/cv/CvLayout.astro`
- Create: `src/components/cv/CvAbout.astro`
- Create: `src/components/cv/CvExperience.astro`
- Create: `src/components/cv/CvEducation.astro`
- Create: `src/components/cv/CvCertifications.astro`
- Create: `src/components/cv/CvSkills.astro`
- Create: `src/components/cv/CvProjects.astro`
- Create: `src/components/cv/CvLanguages.astro`

- [ ] **Step 1: Create CvLayout.astro**

Page shell with:

- SECiD logo + branding in header
- Back link to `/members` directory
- Dark/light mode support (use site's existing theme toggle)
- Slot for content sections
- Footer with "Generated from SECiD profile"

Reference artemiop.com's `CvLayout.astro` for structure.

- [ ] **Step 2: Create CvAbout.astro**

Header section with:

- Profile photo (or initials avatar fallback)
- Full name, title
- Location
- Contact links (email, LinkedIn, GitHub, Twitter, portfolio) as icon links
- Bio/summary text

Props: `{ personal: CVData['personal'] }`

- [ ] **Step 3: Create CvExperience.astro**

Timeline-style work history:

- Company name, position, date range
- Description text
- Technology tags

Props: `{ experience: CVData['experience'] }`
Only renders if array is non-empty.

- [ ] **Step 4: Create CvEducation.astro**

Education entries:

- Institution, degree, field of study, dates
- GPA if present
- Description

Props: `{ education: CVData['education'] }`

- [ ] **Step 5: Create remaining sections**

`CvCertifications.astro`: list with issuer, date, credential link
`CvSkills.astro`: grid of skill tags
`CvProjects.astro`: project cards with links
`CvLanguages.astro`: language name + proficiency badge

Each receives its corresponding CVData array as props. Each only renders if data is non-empty.

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit
git add src/components/cv/
git commit -m "feat: create CV section components adapted from artemiop.com template"
```

---

### Task 4: Create CV Astro pages with privacy enforcement

**Files:**

- Create: `src/pages/es/members/[slug]/cv.astro`
- Create: `src/pages/en/members/[slug]/cv.astro`

- [ ] **Step 1: Create the Spanish CV page**

```astro
---
export const prerender = false;

import CvLayout from '@/components/cv/CvLayout.astro';
import CvAbout from '@/components/cv/CvAbout.astro';
import CvExperience from '@/components/cv/CvExperience.astro';
import CvEducation from '@/components/cv/CvEducation.astro';
import CvCertifications from '@/components/cv/CvCertifications.astro';
import CvSkills from '@/components/cv/CvSkills.astro';
import CvProjects from '@/components/cv/CvProjects.astro';
import CvLanguages from '@/components/cv/CvLanguages.astro';
import CvPdfDownloader from '@/components/cv/CvPdfDownloader';
import { getMemberProfile } from '@/lib/members';
import { transformProfileToCV } from '@/lib/cv/transform';

const { slug } = Astro.params;
const member = await getMemberProfile(slug!);

if (!member) {
  return Astro.redirect('/es/members');
}

// Privacy check
const cvVisibility = member.cvVisibility || 'members';
const sessionCookie = Astro.cookies.get('session')?.value;
const isAuthenticated = !!sessionCookie;
const isOwner = false; // Would need to decode session to check

if (cvVisibility === 'private' && !isOwner) {
  // Show not available
}
if (cvVisibility === 'members' && !isAuthenticated) {
  // Show sign-in prompt
}

const cvData = transformProfileToCV(member, 'es');
---

<CvLayout title={`CV - ${member.displayName}`} lang="es">
  <CvAbout personal={cvData.personal} />
  {
    cvData.experience.length > 0 && (
      <CvExperience experience={cvData.experience} lang="es" />
    )
  }
  {
    cvData.education.length > 0 && (
      <CvEducation education={cvData.education} lang="es" />
    )
  }
  {
    cvData.certifications.length > 0 && (
      <CvCertifications certifications={cvData.certifications} lang="es" />
    )
  }
  {cvData.skills.length > 0 && <CvSkills skills={cvData.skills} lang="es" />}
  {
    cvData.projects.length > 0 && (
      <CvProjects projects={cvData.projects} lang="es" />
    )
  }
  {
    cvData.languages.length > 0 && (
      <CvLanguages languages={cvData.languages} lang="es" />
    )
  }
  <CvPdfDownloader client:only="react" cvData={cvData} lang="es" />
</CvLayout>
```

- [ ] **Step 2: Create English version**

Same structure with `lang="en"`.

- [ ] **Step 3: Commit**

```bash
mkdir -p src/pages/es/members/\[slug\] src/pages/en/members/\[slug\]
npx tsc --noEmit
git add src/pages/es/members/ src/pages/en/members/
git commit -m "feat: create CV Astro pages with privacy enforcement"
```

---

### Task 5: Create PDF export component

**Files:**

- Modify: `package.json` (add jspdf)
- Create: `src/components/cv/CvPdfDownloader.tsx`

- [ ] **Step 1: Install jsPDF**

```bash
npm install jspdf
```

- [ ] **Step 2: Create CvPdfDownloader.tsx**

React component adapted from artemiop.com's `PdfDownloader.tsx`.

Props: `{ cvData: CVData; lang: 'es' | 'en' }`

3 download buttons:

- "CV Completo" / "Full CV" — all sections
- "Resumen (2 pág)" / "Resume (2pg)" — top 3 jobs, 2 education, 5 certs
- "Resumen (1 pág)" / "Summary (1pg)" — current role + skills + education

Each button:

1. Dynamically imports jsPDF: `const { jsPDF } = await import('jspdf')`
2. Creates A4 document
3. Renders sections with custom styling (blue headers, formatted text)
4. SECiD branding in header
5. Triggers download: `{FirstName}_{LastName}_CV_{Format}.pdf`

Reference artemiop.com's `PdfDownloader.tsx` for the jsPDF rendering logic (text positioning, page breaks, section formatting).

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add package.json package-lock.json src/components/cv/CvPdfDownloader.tsx
git commit -m "feat: create PDF export component with 3 formats (full, resume, summary)"
```

---

### Task 6: Final verification

- [ ] **Step 1: Full checks**

```bash
npx tsc --noEmit
npm run format:check
npx vitest run tests/unit/lib/cv/
```

- [ ] **Step 2: Format if needed**

```bash
npx prettier --write "src/components/cv/**" "src/lib/cv/**" "src/types/cv.ts" "src/pages/es/members/**" "src/pages/en/members/**"
```

- [ ] **Step 3: Commit and push**

```bash
git add -A
git commit -m "style: format CV page files"
git push
```

- [ ] **Step 4: Manual testing**

1. Navigate to `/es/members/artemio-padilla/cv` — CV page renders
2. Verify all sections show (experience, education, skills, etc.)
3. Empty sections are hidden
4. Dark mode works
5. Download Full CV PDF — multi-page
6. Download Resume PDF — 2 pages
7. Download Summary PDF — 1 page
8. Set cvVisibility to private → other users see "not available"
9. English version works
