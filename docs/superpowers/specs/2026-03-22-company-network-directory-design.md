# Company Network Directory — Design Spec

## Context

Members need a way to discover where other SECiD members work and have worked, find references, and connect. This spec creates a company network directory with three layers: a searchable company list, dedicated company profile pages, and a network graph visualization.

## Phases

- **Phase 1** (this spec): Company list + profiles + drawer + contact/reference
- **Phase 2** (future): Network graph view (force-directed + bubble chart)
- **Phase 3** (future): Reference request messaging system

## Page Structure

### Company List Page (`/es/companies`, `/en/companies`)

Public company list, members-only details.

**Header:** "Red de Empresas SECiD" with search bar and industry filter.

**Stats bar:** Total companies, active members, industries count.

**Two view modes** (toggle button):

- **List view** (default): Company rows with logo, name, industry, location, current member count, alumni count, arrow to profile
- **Graph view** (Phase 2): Force-directed network graph + bubble chart

**Quick-view drawer** (Approach A): Click a company row to open a slide-out drawer showing:

- Company logo, name, industry, website link
- Current members list with avatar, name, position, tenure, LinkedIn link, message button
- Alumni list with avatar, name, position, date range, "Now at: {company}" tag
- "View Full Profile" button → navigates to company profile page

**Visibility:**

- Company list (names, logos, industries, counts): **public** (no auth)
- Member details (names, positions, contact): **members-only** (requires verified auth)

### Company Profile Page (`/es/companies/{slug}`, `/en/companies/{slug}`)

Dedicated page per company. Requires verified member auth for member details.

**Header:** Company logo (large), name, industry, location, website link, total SECiD connections count.

**Tabs:**

1. **Current Members** — cards with avatar, name, position, start date, generation, LinkedIn link, "Request Reference" button
2. **Alumni** — same cards but with date range, "Now at: {company}" tag
3. **Roles** — breakdown of positions held at this company (Data Scientist: 3, ML Engineer: 2, etc.)

**Reference contact section:**

- Show member contact info (LinkedIn link, email if privacy allows)
- Direct message button (opens existing messaging or pre-filled email)
- "View on LinkedIn" button linking to member's LinkedIn profile

**Company slug:** derived from company name (same slugify function used for member slugs).

## Data Sources

**All data already exists — no new collections needed.**

- **Companies:** `companies` Firestore collection (name, domain, logoUrl, industry, location, website, memberCount)
- **Current members at a company:** Members where `profile.companyId === company.id` OR `experience.previousRoles` has an entry with `current: true` and matching `companyId`
- **Alumni at a company:** Members where `experience.previousRoles` has an entry with `current: false` and matching `companyId`
- **Fallback for unlinked members:** Members where `profile.company` string matches company name (for members who haven't linked via companyId yet)

### Query: Get members for a company

```typescript
async function getCompanyMembers(
  companyId: string,
  companyName: string
): Promise<{
  current: MemberProfile[];
  alumni: MemberProfile[];
}> {
  const allMembers = await getMemberProfiles({ limit: 200 });

  const current: MemberProfile[] = [];
  const alumni: MemberProfile[] = [];

  for (const member of allMembers) {
    // Check companyId on profile (current company)
    if (member.profile.companyId === companyId) {
      current.push(member);
      continue;
    }

    // Check work history entries
    const roles = member.experience?.previousRoles || [];
    const currentRole = roles.find(
      (r) => r.companyId === companyId && r.current
    );
    const pastRoles = roles.filter(
      (r) => r.companyId === companyId && !r.current
    );

    if (currentRole) {
      current.push(member);
    } else if (pastRoles.length > 0) {
      alumni.push(member);
    }

    // Fallback: string match on company name
    if (!currentRole && pastRoles.length === 0) {
      if (member.profile.company?.toLowerCase() === companyName.toLowerCase()) {
        current.push(member);
      }
    }
  }

  return { current, alumni };
}
```

## Component Architecture

### New files

| File                                             | Purpose                                  |
| ------------------------------------------------ | ---------------------------------------- |
| `src/pages/es/companies/index.astro`             | Company list page (Spanish)              |
| `src/pages/en/companies/index.astro`             | Company list page (English)              |
| `src/pages/es/companies/[slug].astro`            | Company profile page (Spanish)           |
| `src/pages/en/companies/[slug].astro`            | Company profile page (English)           |
| `src/components/companies/CompanyList.tsx`       | List view with search, filters, drawer   |
| `src/components/companies/CompanyProfile.tsx`    | Full company profile with tabs           |
| `src/components/companies/CompanyDrawer.tsx`     | Slide-out quick-view drawer              |
| `src/components/companies/CompanyMemberCard.tsx` | Member card (used in drawer and profile) |
| `src/components/wrappers/CompanyListPage.tsx`    | Wrapper with AuthProvider                |
| `src/components/wrappers/CompanyProfilePage.tsx` | Wrapper with AuthProvider                |
| `src/lib/companies/members.ts`                   | getCompanyMembers query function         |

### Modified files

| File                                            | Change                                   |
| ----------------------------------------------- | ---------------------------------------- |
| `src/components/dashboard/DashboardSidebar.tsx` | Add "Empresas" link for verified members |
| `src/types/company.ts`                          | Add `slug` field to Company interface    |
| `src/lib/companies/queries.ts`                  | Add `getCompanyBySlug()` function        |
| `src/lib/companies/mutations.ts`                | Generate slug on company create/update   |

## Navigation

Add to dashboard sidebar (for verified members):

- "Red de Empresas" / "Company Network" → `/es/companies`

Also accessible from:

- Public navigation menu under "Comunidad" dropdown
- Company grid cards on the Insights tab (click → company profile)

## Privacy & Visibility

- Company list (names, logos, industries): **public read** (already set in Firestore rules)
- Member names, positions, contact info: **verified members only** (checked in component)
- Email: respects `privacy.showEmail` setting
- LinkedIn: always shown if available (social links are public by nature)
- "Request Reference" / direct message: verified members only

## Verification

1. `npm run check` — TypeScript passes
2. Navigate to `/es/companies` — see company list (public, no auth)
3. Log in as verified member — see member details, contact buttons
4. Click company row — drawer opens with current/alumni members
5. Click "View Full Profile" — navigate to `/es/companies/{slug}`
6. Company profile: tabs for current members, alumni, roles
7. Click LinkedIn link — opens member's LinkedIn
8. Click "Message" — opens messaging
9. Search works, industry filter works
10. Dark mode on all views
11. English version at `/en/companies`
12. Non-verified user sees company list but no member details
