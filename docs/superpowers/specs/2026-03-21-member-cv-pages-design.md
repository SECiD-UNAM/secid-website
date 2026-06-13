# Member CV Pages — Design Spec

## Context

Members fill out detailed profiles (work history, education, certifications, projects, skills, languages). This spec adds auto-generated CV pages at `/members/{slug}/cv` that render profile data in a professional CV layout, with PDF export in 3 formats. Members control CV visibility via privacy settings.

This is Subsystem 4 of the roadmap:

1. Companies collection + logos — DONE
2. Work history + companyId linking — DONE (in profile editor)
3. CV upload + auto-extract — Future
4. **Member CV pages** (this spec)

## CV Page Route

**URL:** `/es/members/{slug}/cv` and `/en/members/{slug}/cv`

**Data flow:**

1. Astro dynamic route `[slug]/cv.astro` extracts slug
2. `getMemberBySlug(slug)` fetches member profile (function already exists in `src/lib/members/queries.ts`)
3. Privacy check against `cvVisibility` field
4. `transformProfileToCV(member)` converts MemberProfile → CVData
5. Render with Astro CV section components
6. Client-side React island for PDF download

**Not behind DashboardLayout** — standalone page with minimal navigation (back link + SECiD branding).

## Privacy Control

New field on MemberProfile: `cvVisibility: 'public' | 'members' | 'private'`

- **public**: anyone can view
- **members**: authenticated SECiD members only
- **private**: only the member themselves and admins

Default: `'members'`

Added to the Privacy tab in the profile editor as a "CV Visibility" dropdown.

Enforcement in the Astro page: check visibility, check auth via cookies/session. If not authorized, render "This CV is not publicly available" with sign-in link.

## Data Transformer

**File:** `src/lib/cv/transform.ts`

Pure function `transformProfileToCV(member: MemberProfile): CVData`

Mapping:

| MemberProfile                | CVData                  |
| ---------------------------- | ----------------------- |
| `profile.firstName/lastName` | `personal.name`         |
| `experience.currentRole`     | `personal.title`        |
| `profile.location`           | `personal.location`     |
| `profile.bio`                | `personal.summary`      |
| `email, social.*`            | `personal.contact`      |
| `profile.photoURL`           | `personal.profileImage` |
| `experience.previousRoles`   | `experience[]`          |
| `educationHistory`           | `education[]`           |
| `portfolio.certifications`   | `certifications[]`      |
| `portfolio.projects`         | `projects[]`            |
| `profile.skills`             | `skills`                |
| `languages`                  | `languages[]`           |

**Type file:** `src/types/cv.ts` — `CVData` interface matching the structure, adapted from artemiop.com's schema (without leadership, awards, publications, interests).

## CV Section Components

Astro components in `src/components/cv/`, adapted from artemiop.com:

| Component                | Content                                                  |
| ------------------------ | -------------------------------------------------------- |
| `CvLayout.astro`         | Page shell, SECiD branding, minimal nav, dark/light mode |
| `CvAbout.astro`          | Name, title, photo, bio, contact, social links           |
| `CvExperience.astro`     | Work history entries with highlights                     |
| `CvEducation.astro`      | Education entries with details                           |
| `CvCertifications.astro` | Certifications list                                      |
| `CvSkills.astro`         | Skills in categorized grid                               |
| `CvProjects.astro`       | Portfolio project cards                                  |
| `CvLanguages.astro`      | Languages with proficiency levels                        |

**Styling:** SECiD theme on web (Tailwind, dark/light mode, SECiD brand colors). PDF uses clean print-friendly layout (handled by jsPDF, not CSS print).

Sections only render if data exists (empty array → section hidden).

## PDF Export

**File:** `src/components/cv/CvPdfDownloader.tsx` — React island loaded with `client:only="react"`

**3 formats:**

- **Full CV** — all sections, multi-page
- **Resume (2-page)** — top 3 jobs, top 2 education, top 5 certs, skills, languages
- **Summary (1-page)** — brief bio, current role, education, skills

**Implementation:**

- jsPDF (add to dependencies: `npm install jspdf`)
- Dynamically imported to avoid SSR issues
- Receives `CVData` as prop
- Filename: `{FirstName}_{LastName}_CV_{Format}.pdf`
- A4 format (210x297mm)
- SECiD branding in header (logo + name)

## Files to Create

| File                                       | Purpose                             |
| ------------------------------------------ | ----------------------------------- |
| `src/types/cv.ts`                          | CVData interface                    |
| `src/lib/cv/transform.ts`                  | MemberProfile → CVData transformer  |
| `src/components/cv/CvLayout.astro`         | Page layout shell                   |
| `src/components/cv/CvAbout.astro`          | About/header section                |
| `src/components/cv/CvExperience.astro`     | Work experience section             |
| `src/components/cv/CvEducation.astro`      | Education section                   |
| `src/components/cv/CvCertifications.astro` | Certifications section              |
| `src/components/cv/CvSkills.astro`         | Skills grid section                 |
| `src/components/cv/CvProjects.astro`       | Projects section                    |
| `src/components/cv/CvLanguages.astro`      | Languages section                   |
| `src/components/cv/CvPdfDownloader.tsx`    | PDF export React island (3 formats) |
| `src/pages/es/members/[slug]/cv.astro`     | Spanish CV page                     |
| `src/pages/en/members/[slug]/cv.astro`     | English CV page                     |

## Files to Modify

| File                                           | Change                                               |
| ---------------------------------------------- | ---------------------------------------------------- | --------- | --------------------------- |
| `src/types/member.ts`                          | Add `cvVisibility: 'public'                          | 'members' | 'private'` to MemberProfile |
| `src/lib/members/mapper.ts`                    | Map `cvVisibility` with default `'members'`          |
| `src/components/profile/tabs/PrivacyTab.tsx`   | Add CV Visibility dropdown                           |
| `src/components/profile/ProfileEdit.tsx`       | Include `cvVisibility` in form data and save handler |
| `src/components/profile/profile-edit-types.ts` | Add `cvVisibility` to FormData                       |
| `package.json`                                 | Add `jspdf` dependency                               |

## Verification

1. `npm run check` — TypeScript passes
2. Navigate to `/es/members/artemio-padilla/cv` — CV page renders with profile data
3. Toggle CV visibility to private → page shows "not available" for other users
4. Toggle to public → page visible without auth
5. Download Full CV PDF — opens multi-page PDF
6. Download Resume PDF — 2 pages
7. Download Summary PDF — 1 page
8. Empty sections (no certifications, no projects) → those sections hidden
9. Dark mode works on CV page
10. English version at `/en/members/artemio-padilla/cv`
