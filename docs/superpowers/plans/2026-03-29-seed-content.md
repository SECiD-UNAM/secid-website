# Seed Newsletter & Spotlights Content

**Goal:** Populate the newsletter and spotlights Firestore collections with real SECiD content so public pages show data instead of empty states.

**Priority:** Low — cosmetic, no functional impact.

---

## Newsletter (`newsletter_archive` collection)

Seed 3-4 newsletter issues based on actual SECiD communications. Each needs:

```typescript
{
  title: string,           // e.g., "SECiD Monthly - Marzo 2026"
  issueNumber: number,     // sequential
  content: string,         // HTML body
  excerpt: string,         // 1-2 sentence summary
  coverImage?: string,     // optional URL
  status: 'published',
  publishedAt: Timestamp,
  createdBy: 'system',
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### Suggested issues:

1. **Issue #1 — Lanzamiento SECiD** — Introduction of the society, mission, founding members
2. **Issue #2 — Journal Club** — Announcement of the NLP reading group, schedule, how to join
3. **Issue #3 — Primer Hackathon** — Recap of the first data science hackathon
4. **Issue #4 — Convocatoria Comisiones** — Call for volunteers for the technical commissions

### Execution:

Run a Node script in `functions/` dir using firebase-admin to `addDoc` each issue to `newsletter_archive`.

---

## Spotlights (`spotlights` collection)

Seed 3-4 alumni spotlight stories. Each needs:

```typescript
{
  name: string,            // alumni name
  title: string,           // current job title
  company: string,
  graduationYear: number,
  story: string,           // HTML content
  excerpt: string,
  tags: string[],
  status: 'published',
  featured: boolean,
  publishedAt: Timestamp,
  createdBy: 'system',
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### Suggested spotlights:

Use anonymized or fictional profiles based on common SECiD member archetypes:

1. **Data Scientist at a bank** — UNAM grad working in financial ML
2. **ML Engineer at a startup** — Remote work, NLP focus
3. **Head of Data at e-commerce** — Leadership path from IC
4. **PhD researcher** — Academic path in computational biology

### Execution:

Same approach — Node script with firebase-admin.

---

## Verification:

- [ ] `/es/newsletter/archive` shows newsletter cards
- [ ] `/es/spotlights/` shows spotlight cards
- [ ] `/en/` variants also work
