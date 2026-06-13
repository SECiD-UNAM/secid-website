# Blog Dual-Source Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Firestore-only blog backend with a dual-source system that merges Astro Content Collections (git-authored Markdown) with Firestore (community-authored), producing a unified blog feed that always has content.

**Architecture:** Server-side Astro pages resolve Content Collection posts (via `getCollection()` + `render()`) and pass them as `initialPosts` props to client-side React components, which merge them with Firestore posts fetched client-side. A new `blog-server.ts` module handles server-only operations; the existing `blog.ts` gains merge/filter logic.

**Tech Stack:** Astro Content Collections, Zod schema, Vitest, existing React components, Firebase Firestore

**Spec:** `docs/superpowers/specs/2026-03-23-blog-dual-source-design.md`

---

## File Structure

| File                                        | Responsibility                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/content/config.ts`                     | NEW — Zod schema for blog content collection                                   |
| `src/content/blog/es/bienvenida-secid.md`   | NEW — Seed post (Spanish)                                                      |
| `src/content/blog/es/guia-ciencia-datos.md` | NEW — Seed post (Spanish)                                                      |
| `src/content/blog/en/welcome-secid.md`      | NEW — Seed post (English, translation of bienvenida)                           |
| `src/content/blog/en/data-science-guide.md` | NEW — Seed post (English, translation of guia)                                 |
| `src/lib/blog-server.ts`                    | NEW — Server-only: `getContentCollectionPosts()`, `getContentCollectionPost()` |
| `src/lib/blog.ts`                           | MODIFY — Extended `BlogPost` type, `mergeBlogPosts()`, `filterByLocale()`      |
| `src/components/blog/BlogList.tsx`          | MODIFY — Accept `initialPosts` prop, merge in effect                           |
| `src/components/blog/BlogPost.tsx`          | MODIFY — Accept `initialPost` prop, translation toggle                         |
| `src/components/blog/BlogEditor.tsx`        | MODIFY — Add `lang` selector, wire moderation                                  |
| `src/components/wrappers/BlogListPage.tsx`  | MODIFY — Pass through `initialPosts`                                           |
| `src/components/wrappers/BlogPostPage.tsx`  | MODIFY — Pass through `initialPost`                                            |
| `src/pages/es/blog.astro`                   | MODIFY — Import `getContentCollectionPosts()`, pass as prop                    |
| `src/pages/en/blog.astro`                   | MODIFY — Same                                                                  |
| `src/pages/es/blog/[slug].astro`            | MODIFY — Import `getContentCollectionPost()`, pass as prop                     |
| `src/pages/en/blog/[slug].astro`            | MODIFY — Same                                                                  |
| `src/types/user.ts`                         | MODIFY — Add `trustedContributor` to `UserProfile`                             |
| `src/components/admin/PendingBlogPosts.tsx` | NEW — Admin UI for reviewing pending community posts                           |
| `tests/unit/lib/blog-merge.test.ts`         | NEW — Tests for merge, dedup, locale filter, moderation filter                 |

---

## Task 1: Extend BlogPost Type and Add Merge Logic

**Files:**

- Modify: `src/lib/blog.ts`
- Test: `tests/unit/lib/blog-merge.test.ts`

- [ ] **Step 1: Write failing tests for merge logic**

Create `tests/unit/lib/blog-merge.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mergeBlogPosts, filterByLocale } from '@/lib/blog';
import type { BlogPost } from '@/lib/blog';

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'test-1',
    title: 'Test Post',
    slug: 'test-post',
    excerpt: 'Test excerpt',
    content: '<p>Test</p>',
    authorId: 'author-1',
    authorName: 'Author',
    publishedAt: new Date('2026-03-01'),
    tags: ['test'],
    category: 'Tutorial',
    featured: false,
    status: 'published' as const,
    lang: 'es' as const,
    source: 'content-collection' as const,
    ...overrides,
  };
}

describe('mergeBlogPosts', () => {
  it('merges two arrays sorted by publishedAt desc', () => {
    const collectionPosts = [
      makePost({ slug: 'a', publishedAt: new Date('2026-03-10') }),
    ];
    const firestorePosts = [
      makePost({
        slug: 'b',
        publishedAt: new Date('2026-03-15'),
        source: 'firestore',
      }),
    ];
    const merged = mergeBlogPosts(collectionPosts, firestorePosts);
    expect(merged[0].slug).toBe('b');
    expect(merged[1].slug).toBe('a');
  });

  it('deduplicates by slug — content-collection wins', () => {
    const collectionPosts = [
      makePost({
        slug: 'same',
        source: 'content-collection',
        title: 'CC version',
      }),
    ];
    const firestorePosts = [
      makePost({ slug: 'same', source: 'firestore', title: 'FS version' }),
    ];
    const merged = mergeBlogPosts(collectionPosts, firestorePosts);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('CC version');
  });

  it('filters out pending/rejected firestore posts', () => {
    const collectionPosts: BlogPost[] = [];
    const firestorePosts = [
      makePost({
        slug: 'approved',
        source: 'firestore',
        moderationStatus: 'approved',
      }),
      makePost({
        slug: 'pending',
        source: 'firestore',
        moderationStatus: 'pending',
      }),
      makePost({
        slug: 'rejected',
        source: 'firestore',
        moderationStatus: 'rejected',
      }),
      makePost({
        slug: 'auto',
        source: 'firestore',
        moderationStatus: 'auto-approved',
      }),
    ];
    const merged = mergeBlogPosts(collectionPosts, firestorePosts);
    expect(merged).toHaveLength(2);
    expect(merged.map((p) => p.slug).sort()).toEqual(['approved', 'auto']);
  });

  it('applies limit to final merged result', () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      makePost({ slug: `post-${i}`, publishedAt: new Date(2026, 2, i + 1) })
    );
    const merged = mergeBlogPosts(posts, [], 3);
    expect(merged).toHaveLength(3);
  });
});

describe('filterByLocale', () => {
  it('returns posts matching the target locale', () => {
    const posts = [
      makePost({ slug: 'es-post', lang: 'es' }),
      makePost({ slug: 'en-post', lang: 'en' }),
    ];
    const filtered = filterByLocale(posts, 'es');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].slug).toBe('es-post');
  });

  it('includes untranslated foreign-language posts as fallback', () => {
    const posts = [
      makePost({ slug: 'es-post', lang: 'es' }),
      makePost({ slug: 'en-only', lang: 'en' }), // no translationOf pointing to it
    ];
    const filtered = filterByLocale(posts, 'es');
    expect(filtered).toHaveLength(2);
  });

  it('excludes foreign-language posts that have a translation in the target locale', () => {
    const posts = [
      makePost({ slug: 'bienvenida', lang: 'es' }),
      makePost({ slug: 'welcome', lang: 'en', translationOf: 'bienvenida' }),
    ];
    // When viewing Spanish: 'welcome' has translationOf='bienvenida' (an es post exists),
    // so 'welcome' should be excluded — only 'bienvenida' remains
    const filtered = filterByLocale(posts, 'es');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].slug).toBe('bienvenida');
  });

  it('excludes original-language posts when viewing the translation locale', () => {
    const posts = [
      makePost({ slug: 'bienvenida', lang: 'es' }),
      makePost({ slug: 'welcome', lang: 'en', translationOf: 'bienvenida' }),
    ];
    // When viewing English: 'welcome' is shown; 'bienvenida' is excluded because
    // a translation exists (welcome.translationOf === bienvenida.slug)
    const filtered = filterByLocale(posts, 'en');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].slug).toBe('welcome');
  });

  it('includes posts without moderationStatus (backward compatibility)', () => {
    const posts = [
      makePost({ slug: 'legacy', lang: 'es', moderationStatus: undefined }),
    ];
    const filtered = filterByLocale(posts, 'es');
    expect(filtered).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/lib/blog-merge.test.ts`
Expected: FAIL — `mergeBlogPosts` and `filterByLocale` not exported from `@/lib/blog`

- [ ] **Step 3: Extend BlogPost type and implement merge functions**

In `src/lib/blog.ts`, update the `BlogPost` interface to add the new fields, then add the `mergeBlogPosts` and `filterByLocale` exports:

```typescript
// Update BlogPost interface — add after 'status' field:
  lang: 'es' | 'en';
  translationOf?: string;      // slug of the original post (set on translations)
  translationSlug?: string;    // slug of the translation (set on originals, via reverse lookup)
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  source?: 'content-collection' | 'firestore';

// Update BlogFilters — add:
  lang?: 'es' | 'en';

// Add these two exported functions at the bottom of the file:

export function mergeBlogPosts(
  collectionPosts: BlogPost[],
  firestorePosts: BlogPost[],
  limit?: number
): BlogPost[] {
  // Filter firestore posts: only approved or auto-approved
  const visibleFirestore = firestorePosts.filter(
    (p) =>
      !p.moderationStatus ||
      p.moderationStatus === 'approved' ||
      p.moderationStatus === 'auto-approved'
  );

  // Deduplicate by slug — collection posts win
  const slugSet = new Set(collectionPosts.map((p) => p.slug));
  const uniqueFirestore = visibleFirestore.filter((p) => !slugSet.has(p.slug));

  // Merge and sort by publishedAt desc
  const merged = [...collectionPosts, ...uniqueFirestore].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );

  return limit ? merged.slice(0, limit) : merged;
}

export function filterByLocale(posts: BlogPost[], locale: 'es' | 'en'): BlogPost[] {
  const otherLocale = locale === 'es' ? 'en' : 'es';

  // Build a set of original slugs that have been translated.
  // A post with translationOf='X' means slug X has a translation.
  // We collect X (the original's slug) so we can exclude it from the other locale.
  const translatedOriginalSlugs = new Set(
    posts
      .filter((p) => p.lang === locale && p.translationOf)
      .map((p) => p.translationOf!)
  );

  // Also: a foreign post that declares translationOf pointing to a target-locale slug
  // should itself be excluded (the target-locale original is shown instead).
  const foreignTranslationSlugs = new Set(
    posts
      .filter((p) => p.lang === otherLocale && p.translationOf)
      .map((p) => p.slug)
  );

  return posts.filter((p) => {
    // Always include posts in the target locale
    if (p.lang === locale) return true;
    // Exclude foreign posts that are translations of a target-locale original
    if (p.lang === otherLocale && p.translationOf) return false;
    // Exclude foreign posts whose slug is the target of a target-locale translation
    if (p.lang === otherLocale && translatedOriginalSlugs.has(p.slug)) return false;
    // Include remaining foreign posts (no translation exists — fallback)
    return true;
  });
}
```

Also update mock data to include the new fields with defaults:

- Add `lang: 'es'` and `source: 'firestore'` to each mock post.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/lib/blog-merge.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog.ts tests/unit/lib/blog-merge.test.ts
git commit -m "feat(blog): add BlogPost type extensions and merge/locale filter logic"
```

---

## Task 2: Content Collection Schema and Seed Posts

**Files:**

- Create: `src/content/config.ts`
- Create: `src/content/blog/es/bienvenida-secid.md`
- Create: `src/content/blog/es/guia-ciencia-datos.md`
- Create: `src/content/blog/en/welcome-secid.md`
- Create: `src/content/blog/en/data-science-guide.md`

- [ ] **Step 1: Create content collection schema**

Create `src/content/config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    excerpt: z.string(),
    author: z.string(),
    category: z.enum([
      'Tendencias',
      'Tutorial',
      'Carrera',
      'Investigación',
      'Opinión',
    ]),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    featuredImage: z.string().optional(),
    lang: z.enum(['es', 'en']),
    translationOf: z.string().default(''),
    publishedAt: z.date(),
  }),
});

export const collections = { blog };
```

- [ ] **Step 2: Create Spanish seed post — bienvenida**

Create `src/content/blog/es/bienvenida-secid.md`:

```markdown
---
title: 'Bienvenida a SECiD'
slug: 'bienvenida-secid'
excerpt: 'Conoce la Sociedad de Egresados en Ciencia de Datos de la UNAM y descubre cómo ser parte de nuestra comunidad.'
author: 'Equipo SECiD'
category: 'Opinión'
tags: ['comunidad', 'UNAM', 'ciencia de datos']
featured: true
lang: 'es'
translationOf: ''
publishedAt: 2026-03-15
---

## ¿Qué es SECiD?

La Sociedad de Egresados en Ciencia de Datos (SECiD) es la primera organización de egresados dedicada exclusivamente a la ciencia de datos en la UNAM. Nuestra misión es conectar, empoderar y hacer crecer a la comunidad de profesionales en datos que se formaron en nuestra universidad.

## Nuestra Misión

Creemos que los egresados de ciencia de datos tienen un papel fundamental en la transformación digital de México. A través de SECiD, buscamos:

- **Conectar** egresados con oportunidades laborales y de desarrollo profesional
- **Compartir** conocimiento a través de eventos, talleres y mentorías
- **Construir** una red de apoyo profesional que trascienda generaciones

## Únete

Si eres egresado de la Licenciatura en Ciencia de Datos de la UNAM, te invitamos a registrarte en nuestra plataforma. Aquí encontrarás un espacio diseñado para ti.
```

- [ ] **Step 3: Create Spanish seed post — guía**

Create `src/content/blog/es/guia-ciencia-datos.md`:

```markdown
---
title: 'Guía para Nuevos Egresados en Ciencia de Datos'
slug: 'guia-nuevos-egresados'
excerpt: 'Consejos prácticos para iniciar tu carrera profesional en ciencia de datos después de egresar.'
author: 'Equipo SECiD'
category: 'Carrera'
tags: ['carrera', 'consejos', 'egresados']
featured: false
lang: 'es'
translationOf: ''
publishedAt: 2026-03-10
---

## El Primer Paso

Egresar es solo el comienzo. El mercado laboral en ciencia de datos en México está en pleno crecimiento, y tu formación en la UNAM te da una base sólida para destacar.

## Construye tu Portafolio

Un portafolio sólido vale más que cualquier certificación. Recomendamos:

- Publicar proyectos en GitHub con documentación clara
- Participar en competencias de datos (Kaggle, DrivenData)
- Contribuir a proyectos de código abierto

## Haz Networking

La comunidad SECiD es tu primera red profesional. Participa en nuestros eventos, únete a las mentorías y conecta con egresados que ya están en la industria.
```

- [ ] **Step 4: Create English seed post — welcome (translation of bienvenida)**

Create `src/content/blog/en/welcome-secid.md`:

```markdown
---
title: 'Welcome to SECiD'
slug: 'welcome-secid'
excerpt: 'Learn about UNAM Data Science Alumni Society and discover how to be part of our community.'
author: 'SECiD Team'
category: 'Opinión'
tags: ['community', 'UNAM', 'data science']
featured: true
lang: 'en'
translationOf: 'bienvenida-secid'
publishedAt: 2026-03-15
---

## What is SECiD?

The Data Science Alumni Society (SECiD) is the first alumni organization dedicated exclusively to data science at UNAM. Our mission is to connect, empower, and grow the community of data professionals who trained at our university.

## Our Mission

We believe that data science graduates play a fundamental role in Mexico's digital transformation. Through SECiD, we aim to:

- **Connect** alumni with career and professional development opportunities
- **Share** knowledge through events, workshops, and mentorships
- **Build** a professional support network that transcends generations

## Join Us

If you are a graduate of the Data Science program at UNAM, we invite you to register on our platform. Here you will find a space designed for you.
```

- [ ] **Step 5: Create English seed post — guide (translation of guía)**

Create `src/content/blog/en/data-science-guide.md`:

```markdown
---
title: 'Guide for New Data Science Graduates'
slug: 'new-graduates-guide'
excerpt: 'Practical tips for starting your data science career after graduation.'
author: 'SECiD Team'
category: 'Carrera'
tags: ['career', 'tips', 'graduates']
featured: false
lang: 'en'
translationOf: 'guia-nuevos-egresados'
publishedAt: 2026-03-10
---

## The First Step

Graduation is just the beginning. The data science job market in Mexico is growing rapidly, and your UNAM education gives you a solid foundation to stand out.

## Build Your Portfolio

A strong portfolio is worth more than any certification. We recommend:

- Publishing projects on GitHub with clear documentation
- Participating in data competitions (Kaggle, DrivenData)
- Contributing to open-source projects

## Network

The SECiD community is your first professional network. Attend our events, join mentorship programs, and connect with alumni already in the industry.
```

- [ ] **Step 6: Verify Astro recognizes the collection**

Run: `npx astro check 2>&1 | head -30`
Expected: No errors related to content collections. (There may be pre-existing TS errors from other files — ignore those.)

- [ ] **Step 7: Commit**

```bash
git add src/content/config.ts src/content/blog/
git commit -m "feat(blog): add content collection schema and seed posts (es/en)"
```

---

## Task 3: Server-Side Content Collection Loader

**Files:**

- Create: `src/lib/blog-server.ts`

- [ ] **Step 1: Create blog-server.ts**

First install `marked` (a lightweight Markdown-to-HTML compiler):

```bash
npm install marked
```

Then create `src/lib/blog-server.ts`:

```typescript
import { getCollection } from 'astro:content';
import { marked } from 'marked';
import type { BlogPost } from './blog';

/**
 * Server-only module. Import ONLY from .astro files.
 * Do NOT import from React components or client-side code.
 *
 * Uses `marked` to convert Markdown → HTML strings so that both
 * Content Collection and Firestore posts produce the same `content`
 * format (HTML string rendered via dangerouslySetInnerHTML).
 */

function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

function entryToPost(entry: {
  id: string;
  data: any;
  body?: string;
}): BlogPost {
  return {
    id: entry.id,
    title: entry.data.title,
    slug: entry.data.slug,
    excerpt: entry.data.excerpt,
    content: markdownToHtml(entry.body || ''),
    authorId: 'content-collection',
    authorName: entry.data.author,
    publishedAt: entry.data.publishedAt,
    tags: entry.data.tags,
    category: entry.data.category,
    featured: entry.data.featured,
    featuredImage: entry.data.featuredImage,
    status: 'published' as const,
    lang: entry.data.lang,
    translationOf: entry.data.translationOf || undefined,
    source: 'content-collection' as const,
  };
}

/**
 * Build a reverse-lookup map: originalSlug → translationSlug.
 * E.g., if 'welcome' has translationOf='bienvenida', then map has 'bienvenida' → 'welcome'.
 */
function buildTranslationMap(
  entries: { data: { slug: string; translationOf?: string } }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of entries) {
    if (e.data.translationOf) {
      map.set(e.data.translationOf, e.data.slug);
    }
  }
  return map;
}

export async function getContentCollectionPosts(
  lang?: 'es' | 'en'
): Promise<BlogPost[]> {
  // Fetch ALL entries first (for reverse lookup), then filter by lang
  const allEntries = await getCollection('blog');
  const translationMap = buildTranslationMap(allEntries);

  const entries = lang
    ? allEntries.filter((e) => e.data.lang === lang)
    : allEntries;

  const posts = entries.map((entry) => {
    const post = entryToPost(entry);
    // Populate reverse translation link for original posts
    if (!post.translationOf && translationMap.has(post.slug)) {
      post.translationSlug = translationMap.get(post.slug);
    }
    return post;
  });

  return posts.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );
}

export async function getContentCollectionPost(
  slug: string
): Promise<BlogPost | null> {
  const allEntries = await getCollection('blog');
  const entry = allEntries.find((e) => e.data.slug === slug);
  if (!entry) return null;

  const translationMap = buildTranslationMap(allEntries);
  const post = entryToPost(entry);

  // Populate reverse translation link
  if (!post.translationOf && translationMap.has(post.slug)) {
    post.translationSlug = translationMap.get(post.slug);
  }

  return post;
}
```

> **Why `marked` instead of Astro's `render()`?** Astro's `render()` returns a Component, not an HTML string. We need an HTML string to pass as a prop to React components that render via `dangerouslySetInnerHTML`. `marked` is a zero-dependency, fast Markdown compiler that produces HTML strings directly. This keeps both sources (Content Collection and Firestore) using the same rendering path in `BlogPost.tsx`.

- [ ] **Step 2: Install marked**

Run: `npm install marked`

- [ ] **Step 3: Commit**

```bash
git add src/lib/blog-server.ts package.json package-lock.json
git commit -m "feat(blog): add server-only content collection loader with markdown-to-html"
```

---

## Task 4: Wire Content Collection Posts into Blog Listing Pages

**Files:**

- Modify: `src/components/wrappers/BlogListPage.tsx`
- Modify: `src/components/blog/BlogList.tsx`
- Modify: `src/pages/es/blog.astro`
- Modify: `src/pages/en/blog.astro`

- [ ] **Step 1: Update BlogListPage wrapper to accept initialPosts**

In `src/components/wrappers/BlogListPage.tsx`, add `initialPosts` to the Props interface and pass through:

```typescript
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogList from '@/components/blog/BlogList';
import type { BlogPost } from '@/lib/blog';

interface Props {
  lang?: 'es' | 'en';
  initialPosts?: BlogPost[];
}

export default function BlogListPage({ lang = 'es', initialPosts = [] }: Props) {
  return (
    <AuthProvider>
      <BlogList lang={lang} initialPosts={initialPosts} />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Update BlogList to merge initialPosts with Firestore**

In `src/components/blog/BlogList.tsx`:

1. Update Props interface to accept `initialPosts`:

```typescript
interface Props {
  lang?: 'es' | 'en';
  initialPosts?: BlogPost[];
}
```

2. Update the component signature:

```typescript
export default function BlogList({ lang = 'es', initialPosts = [] }: Props) {
```

3. Update the `fetchPosts` callback to merge with `initialPosts`:

```typescript
const fetchPosts = useCallback(async () => {
  setLoading(true);
  try {
    const filters: BlogFilters = { status: 'published' };
    if (activeCategory !== 'all') {
      filters.category = activeCategory;
    }
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }
    const firestoreData = await getBlogPosts(filters);
    const merged = mergeBlogPosts(initialPosts, firestoreData);
    const localized = filterByLocale(merged, lang);
    setPosts(localized);
  } catch (error) {
    console.error('Error loading blog posts:', error);
    // Graceful degradation: show initialPosts even if Firestore fails
    const localized = filterByLocale(initialPosts, lang);
    setPosts(localized);
  } finally {
    setLoading(false);
  }
}, [activeCategory, searchQuery, initialPosts, lang]);
```

4. Add imports for `mergeBlogPosts` and `filterByLocale`:

```typescript
import {
  getBlogPosts,
  mergeBlogPosts,
  filterByLocale,
  type BlogPost,
  type BlogFilters,
} from '@/lib/blog';
```

- [ ] **Step 3: Update es/blog.astro to pass initialPosts**

In `src/pages/es/blog.astro`, update the frontmatter to import and call `getContentCollectionPosts()`, and pass the result:

```astro
---
import ModernLayout from '../../layouts/ModernLayout.astro';
import Navigation from '../../components/Navigation.astro';
import Footer from '../../components/Footer.astro';
import BlogListPage from '../../components/wrappers/BlogListPage';
import { getContentCollectionPosts } from '../../lib/blog-server';

const initialPosts = await getContentCollectionPosts('es');
---

<!-- ... existing markup unchanged ... -->
<BlogListPage client:load lang="es" initialPosts={initialPosts} />
<!-- ... -->
```

- [ ] **Step 4: Update en/blog.astro identically**

Same change for `src/pages/en/blog.astro`, with `getContentCollectionPosts('en')` and `lang="en"`.

- [ ] **Step 5: Verify the blog listing loads locally**

Run: `npm run dev`
Navigate to `http://localhost:4321/es/blog/` — should show seed posts immediately without "Cargando artículos..." stuck state.

- [ ] **Step 6: Commit**

```bash
git add src/components/wrappers/BlogListPage.tsx src/components/blog/BlogList.tsx src/pages/es/blog.astro src/pages/en/blog.astro
git commit -m "feat(blog): wire content collection posts into blog listing pages"
```

---

## Task 5: Wire Content Collection Posts into Blog Post Pages

**Files:**

- Modify: `src/components/wrappers/BlogPostPage.tsx`
- Modify: `src/components/blog/BlogPost.tsx`
- Modify: `src/pages/es/blog/[slug].astro`
- Modify: `src/pages/en/blog/[slug].astro`

- [ ] **Step 1: Update BlogPostPage wrapper to accept initialPost**

In `src/components/wrappers/BlogPostPage.tsx`:

```typescript
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogPost from '@/components/blog/BlogPost';
import type { BlogPost as BlogPostType } from '@/lib/blog';

interface Props {
  slug?: string;
  lang?: 'es' | 'en';
  initialPost?: BlogPostType | null;
}

export default function BlogPostPage({ slug, lang = 'es', initialPost = null }: Props) {
  return (
    <AuthProvider>
      <BlogPost slug={slug || ''} lang={lang} initialPost={initialPost} />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Update BlogPost component to use initialPost and add translation toggle**

In `src/components/blog/BlogPost.tsx`:

1. Update Props:

```typescript
interface Props {
  slug: string;
  lang?: 'es' | 'en';
  initialPost?: BlogPostType | null;
}
```

2. Update component signature:

```typescript
export default function BlogPost({ slug, lang = 'es', initialPost = null }: Props) {
```

3. Update the `useEffect` to skip Firestore fetch if `initialPost` is provided:

```typescript
useEffect(() => {
  async function fetchPost() {
    if (initialPost) {
      setPost(initialPost);
      setLoading(false);
      return;
    }
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getBlogPost(slug);
      if (data) {
        setPost(data);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error loading blog post:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }
  fetchPost();
}, [slug, initialPost]);
```

4. Add translation toggle after the header, before featured image. Add translations:

```typescript
// Add to translations.es:
readInEnglish: 'Read in English',
articleInEnglish: 'Este artículo está en inglés',
articleInSpanish: 'This article is in Spanish',

// Add to translations.en:
readInSpanish: 'Leer en Español',
articleInEnglish: 'This article is in English',
articleInSpanish: 'Este artículo está en español',
```

Add after `</header>` and before the featured image section:

```tsx
{
  /* Translation toggle — works in both directions */
}
{
  (post.translationOf || post.translationSlug) && (
    <a
      href={`/${lang === 'es' ? 'en' : 'es'}/blog/${post.translationOf || post.translationSlug}`}
      className="blog-post__translation-link"
    >
      <i className="fas fa-language" />{' '}
      {lang === 'es' ? t.readInEnglish : t.readInSpanish}
    </a>
  );
}

{
  /* Fallback language notice */
}
{
  post.lang && post.lang !== lang && (
    <div className="blog-post__lang-notice">
      <i className="fas fa-info-circle" />{' '}
      {post.lang === 'en' ? t.articleInEnglish : t.articleInSpanish}
    </div>
  );
}
```

Add CSS for the new elements inside the `<style>` block:

```css
.blog-post__translation-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--secid-primary);
  text-decoration: none;
  font-weight: 500;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--secid-primary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-xl);
  transition: all var(--transition-base);
}
.blog-post__translation-link:hover {
  background: var(--secid-primary);
  color: white;
}
.blog-post__lang-notice {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  margin-bottom: var(--space-xl);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

- [ ] **Step 3: Update es/blog/[slug].astro to resolve Content Collection post server-side**

In `src/pages/es/blog/[slug].astro`:

```astro
---
export const prerender = false;
import ModernLayout from '../../../layouts/ModernLayout.astro';
import Navigation from '../../../components/Navigation.astro';
import Footer from '../../../components/Footer.astro';
import BlogPostPage from '../../../components/wrappers/BlogPostPage';
import { getContentCollectionPost } from '../../../lib/blog-server';

const { slug } = Astro.params;
const initialPost = slug ? await getContentCollectionPost(slug) : null;
---

<ModernLayout
  title="Blog - SECiD"
  description="Artículo del blog SECiD"
  lang="es"
>
  <Navigation lang="es" />

  <main>
    <section class="secid-section">
      <div class="secid-container">
        <BlogPostPage
          client:load
          slug={slug}
          lang="es"
          initialPost={initialPost}
        />
      </div>
    </section>
  </main>

  <Footer lang="es" />
</ModernLayout>
```

- [ ] **Step 4: Update en/blog/[slug].astro identically**

Same pattern for `src/pages/en/blog/[slug].astro` with `lang="en"`.

- [ ] **Step 5: Verify individual post pages work locally**

Run: `npm run dev`
Navigate to `http://localhost:4321/es/blog/bienvenida-secid` — should show the seed post content.
Navigate to `http://localhost:4321/en/blog/welcome-secid` — should show with translation toggle.

- [ ] **Step 6: Commit**

```bash
git add src/components/wrappers/BlogPostPage.tsx src/components/blog/BlogPost.tsx src/pages/es/blog/\[slug\].astro src/pages/en/blog/\[slug\].astro
git commit -m "feat(blog): wire content collection posts into individual post pages with translation toggle"
```

---

## Task 6: Add trustedContributor Field and Moderation to BlogEditor

**Files:**

- Modify: `src/types/user.ts`
- Modify: `src/lib/blog.ts`
- Modify: `src/components/blog/BlogEditor.tsx`

- [ ] **Step 1: Add trustedContributor to UserProfile**

In `src/types/user.ts`, add after `linkedinVerifiedAt?: Date;` (line 49):

```typescript
  trustedContributor?: boolean;
```

- [ ] **Step 2: Update createBlogPost to accept new fields**

In `src/lib/blog.ts`, update the `createBlogPost` function to accept the extended type. The function signature already uses `Omit<BlogPost, 'id' | 'publishedAt'>`, so the new fields (`lang`, `moderationStatus`) will be included automatically once the `BlogPost` interface is extended (done in Task 1).

No code change needed here — the type extension from Task 1 handles it.

- [ ] **Step 3: Add lang selector and moderation logic to BlogEditor**

In `src/components/blog/BlogEditor.tsx`:

1. Add `lang` state:

```typescript
const [postLang, setPostLang] = useState<'es' | 'en'>(lang);
```

2. Add translations for new fields (add to both `es` and `en` objects):

```typescript
// es:
langLabel: 'Idioma del artículo',
langEs: 'Español',
langEn: 'Inglés',
pendingNotice: 'Tu artículo será revisado por un moderador antes de ser publicado.',

// en:
langLabel: 'Article language',
langEs: 'Spanish',
langEn: 'English',
pendingNotice: 'Your article will be reviewed by a moderator before being published.',
```

3. Add a language selector field in the form (after the category field):

```tsx
{
  /* Language */
}
<div className="blog-editor__field">
  <label className="blog-editor__label">{t.langLabel}</label>
  <select
    className="secid-form__input"
    value={postLang}
    onChange={(e) => setPostLang(e.target.value as 'es' | 'en')}
  >
    <option value="es">{t.langEs}</option>
    <option value="en">{t.langEn}</option>
  </select>
</div>;
```

4. Add moderation notice before the action buttons (if user is not trusted):

```tsx
{
  !userProfile?.trustedContributor && (
    <div className="blog-editor__moderation-notice">
      <i className="fas fa-info-circle" /> {t.pendingNotice}
    </div>
  );
}
```

5. Update `handleSubmit` to include `lang` and `moderationStatus`:

```typescript
const postData: Omit<BlogPost, 'id' | 'publishedAt'> = {
  // ... existing fields ...
  lang: postLang,
  moderationStatus: userProfile?.trustedContributor
    ? 'auto-approved'
    : 'pending',
  source: 'firestore',
};
```

6. Add CSS for moderation notice:

```css
.blog-editor__moderation-notice {
  background: #eff6ff;
  border: 1px solid #3b82f6;
  color: #1d4ed8;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/user.ts src/components/blog/BlogEditor.tsx
git commit -m "feat(blog): add lang selector and per-user moderation to blog editor"
```

---

## Task 7: Admin Moderation UI

**Files:**

- Explore: `src/components/admin/` — find existing admin dashboard structure
- Create: `src/components/admin/PendingBlogPosts.tsx`

> **Note:** The admin dashboard already exists with user management and other features. This task adds a "Pending Posts" section. The exact integration point depends on the existing admin layout — the implementer should explore `src/components/admin/` to find where to mount this component.

- [ ] **Step 1: Explore existing admin dashboard structure**

Run: `ls src/components/admin/`
Find the main admin dashboard component and understand how sections are organized.

- [ ] **Step 2: Create PendingBlogPosts component**

Create `src/components/admin/PendingBlogPosts.tsx`:

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { getBlogPosts, updateBlogPost, type BlogPost } from '@/lib/blog';

interface Props {
  lang?: 'es' | 'en';
}

const translations = {
  es: {
    title: 'Artículos Pendientes de Revisión',
    noArticles: 'No hay artículos pendientes.',
    approve: 'Aprobar',
    reject: 'Rechazar',
    by: 'por',
    loading: 'Cargando...',
  },
  en: {
    title: 'Pending Blog Posts',
    noArticles: 'No pending posts.',
    approve: 'Approve',
    reject: 'Reject',
    by: 'by',
    loading: 'Loading...',
  },
};

export default function PendingBlogPosts({ lang = 'es' }: Props) {
  const t = translations[lang];
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all published posts and filter for pending moderation
      const all = await getBlogPosts({ status: 'published' });
      setPosts(all.filter((p) => p.moderationStatus === 'pending'));
    } catch (err) {
      console.error('Error fetching pending posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  async function handleAction(postId: string, action: 'approved' | 'rejected') {
    await updateBlogPost(postId, { moderationStatus: action });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  if (loading) return <p>{t.loading}</p>;

  return (
    <div>
      <h3>{t.title}</h3>
      {posts.length === 0 ? (
        <p style={{ color: 'var(--color-text-tertiary)' }}>{t.noArticles}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                padding: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{post.title}</strong>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  {t.by} {post.authorName} — {post.lang.toUpperCase()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="secid-button secid-button--primary secid-button--sm"
                  onClick={() => handleAction(post.id, 'approved')}
                >
                  {t.approve}
                </button>
                <button
                  className="secid-button secid-button--outline secid-button--sm"
                  onClick={() => handleAction(post.id, 'rejected')}
                >
                  {t.reject}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount PendingBlogPosts in the admin dashboard**

Find the main admin dashboard component and add `<PendingBlogPosts lang={lang} />` as a new section. The exact location depends on the existing structure discovered in Step 1.

- [ ] **Step 4: Add trusted contributor toggle to user management**

In the existing admin user management component, add a checkbox/toggle for `trustedContributor` that calls `updateDoc` on the user's Firestore document. This follows the same pattern as other admin toggles already in the dashboard.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/PendingBlogPosts.tsx
git commit -m "feat(blog): add admin moderation UI for pending posts"
```

---

## Task 8: Run Full Test Suite and Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run unit tests**

Run: `npx vitest run tests/unit/lib/blog-merge.test.ts`
Expected: All tests PASS (including the new locale filter tests)

- [ ] **Step 2: Run the full test suite**

Run: `npm run test:unit`
Expected: No new failures introduced

- [ ] **Step 3: Run type checking**

Run: `npm run check 2>&1 | tail -20`
Expected: No new type errors from blog-related files (pre-existing errors in other files are acceptable)

- [ ] **Step 4: Run production build**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds. Content collection posts are compiled. Blog pages contain rendered HTML (not raw Markdown).

- [ ] **Step 5: Verify blog pages render correctly**

Run: `npm run preview`
Navigate to `http://localhost:4321/es/blog/` — seed posts should appear with proper formatting.
Navigate to `http://localhost:4321/es/blog/bienvenida-secid` — content should render as HTML (headings, paragraphs, lists), NOT raw Markdown.
Navigate to `http://localhost:4321/en/blog/welcome-secid` — translation toggle should link to `/es/blog/bienvenida-secid`.
Navigate back to `http://localhost:4321/es/blog/bienvenida-secid` — translation toggle should link to `/en/blog/welcome-secid` (bidirectional).

- [ ] **Step 6: Commit any lint/format fixes if needed**

```bash
git add -u
git commit -m "fix(blog): lint and format fixes"
```
