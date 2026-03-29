# Blog Dual-Source Backend — Design Spec

## Problem

The blog at `beta.secid.mx/es/blog/` is stuck on "Cargando artículos..." because the Firestore `blog` collection has no data and the mock fallback doesn't activate reliably in production. The blog frontend (listing, post pages, editor, i18n) is fully built but has no reliable content backend.

Beyond fixing the immediate issue, the blog needs to serve two authoring workflows: editorial content authored by the SECiD team via git (version-controlled, PR-reviewed), and community posts authored by members through the existing web editor.

## Design

A dual-source blog that merges Astro Content Collections (git-authored Markdown) with Firestore (community-authored via web editor) into a single unified feed. Readers see one blog — the content source is invisible to them. Posts are sorted by date regardless of source.

### Source 1: Content Collections (Git-Authored)

Markdown files in `src/content/blog/` organized by locale:

```
src/content/blog/
  es/
    bienvenida-secid.md
    guia-ciencia-datos.md
  en/
    welcome-secid.md
    data-science-guide.md
```

Frontmatter schema:

```yaml
---
title: 'Bienvenida a SECiD'
slug: 'bienvenida-secid'
excerpt: '...'
author: 'Equipo SECiD'
category: 'opinion'
tags: ['comunidad', 'secid']
featured: false
featuredImage: '/images/blog/bienvenida.jpg'
lang: 'es'
translationOf: ''
publishedAt: 2026-03-20
---
```

- Schema enforced via Zod in `src/content/config.ts`
- Built at compile time, zero runtime cost
- PR merge triggers rebuild/deploy via existing CD pipeline
- No moderation needed — PR review is the moderation

### Source 2: Firestore (Community-Authored)

Same `blog` collection, extended `BlogPost` interface:

```typescript
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML string
  authorId: string;
  authorName: string;
  publishedAt: Date;
  tags: string[];
  category: string;
  featured: boolean;
  featuredImage?: string;
  status: 'draft' | 'published';
  lang: 'es' | 'en'; // new
  translationOf?: string; // new — slug of the original post
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'auto-approved'; // new
  source: 'firestore'; // new — discriminator for merge logic
}
```

### Server/Client Architecture

**Key constraint:** Astro's `getCollection()` is a server-only API — it cannot run in browser-executed JavaScript. The current blog components (`BlogList.tsx`, `BlogPost.tsx`) run client-side via `client:load`. This means the merge of Content Collections + Firestore must happen at the Astro page layer (server-side), not in the shared `blog.ts` service.

**Architecture:**

```
┌─────────────────────────────────────────────────┐
│  Astro Pages (.astro) — SERVER SIDE             │
│                                                 │
│  1. getCollection('blog') → Collection posts    │
│  2. Render Markdown → HTML via renderEntry()    │
│  3. Normalize to BlogPost[] shape               │
│  4. Pass as `initialPosts` prop to React        │
└──────────────────┬──────────────────────────────┘
                   │ props
┌──────────────────▼──────────────────────────────┐
│  React Components (.tsx) — CLIENT SIDE          │
│                                                 │
│  1. Receive `initialPosts` (Content Collection) │
│  2. Fetch Firestore posts client-side           │
│  3. Merge, deduplicate, sort, filter            │
│  4. Render unified feed                         │
└─────────────────────────────────────────────────┘
```

**New server-side module: `src/lib/blog-server.ts`**

- Exports `getContentCollectionPosts()` — server-only, uses `getCollection('blog')` and `renderEntry()` to compile Markdown to HTML strings
- Normalizes Content Collection entries to the `BlogPost` shape with `source: 'content-collection'`
- Called only from `.astro` files, never imported by React components

**Updated client-side module: `src/lib/blog.ts`**

- `getBlogPosts()` accepts an optional `initialPosts: BlogPost[]` parameter (the pre-resolved Collection posts passed from the Astro page)
- Fetches Firestore posts client-side as before
- Merges `initialPosts` + Firestore results, deduplicates by slug (Collection wins), sorts by `publishedAt` desc
- Applies filters (category, tag, search) on the merged result
- `limit` filter applies to the **final merged result**, not to individual source queries

**Updated Astro pages:**

- `blog.astro` calls `getContentCollectionPosts()` at the top, passes result as `initialPosts` prop to `<BlogListPage>`
- `blog/[slug].astro` calls `getContentCollectionPost(slug)` at the top; if found, passes the full post as `initialPost` prop; if not found, passes `null` and the React component falls back to Firestore lookup

**Markdown to HTML conversion:** Content Collection Markdown is compiled to HTML at build/request time using `renderEntry()` in the `.astro` page layer. The resulting HTML string is passed to the React component in the same `content` field that Firestore posts use. Both sources produce HTML strings — the React component needs no dual rendering path.

## Moderation Flow

### Per-User Trust Toggle

- `trustedContributor: boolean` is a top-level field on the `UserProfile` interface in `src/types/user.ts`, stored in the Firestore `users/{uid}` document (default `false`)
- Admins toggle this per user in the admin dashboard
- `BlogEditor.tsx` reads this field from the existing `userProfile` object in `AuthContext` (which already fetches the Firestore user document)

### On Post Creation (Firestore)

1. Author submits post via BlogEditor
2. Check author's `trustedContributor` flag from `userProfile`
3. If trusted → `moderationStatus: 'auto-approved'`, post is immediately visible
4. If not trusted → `moderationStatus: 'pending'`, post is hidden from public feed

### Admin Moderation UI

- Admin dashboard gets a "Pending Posts" section listing posts with `moderationStatus: 'pending'`
- Admin can approve or reject each post
- Admin can toggle `trustedContributor` on any user's profile

## Translation Linking

- Posts declare `translationOf: "original-slug"` to link to their counterpart
- The locale filter in `getBlogPosts()` is not a simple `lang === locale` filter. It uses a two-pass approach:
  1. Collect all posts for the target locale (`lang === locale`)
  2. Collect all slugs that have a translation in the target locale (via `translationOf` cross-reference)
  3. Add posts from the other locale **only if** they have no translation in the target locale (fallback posts)
- When a translation exists, show a "Read in English" / "Leer en Español" toggle on the post page
- Fallback posts show a small notice: "Este artículo está en inglés" / "This article is in Spanish"

## Error Handling

- If Firestore is unreachable → serve Content Collection posts only (passed via `initialPosts`), no error visible to reader
- Content Collection posts are always available (compiled into the build) — this permanently solves the "Cargando artículos..." problem
- Slug collisions: Content Collection posts take priority; BlogEditor validates slug uniqueness against both sources before saving

## File Changes

| File                                       | Change                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/config.ts`                    | New — define blog collection schema with Zod                                                                                                                                    |
| `src/content/blog/es/*.md`                 | New — seed with 2-3 starter posts                                                                                                                                               |
| `src/content/blog/en/*.md`                 | New — English translations of seed posts                                                                                                                                        |
| `src/lib/blog-server.ts`                   | New — server-only module with `getContentCollectionPosts()` and `getContentCollectionPost(slug)`, uses `getCollection()` and `renderEntry()`                                    |
| `src/lib/blog.ts`                          | Add `initialPosts` param to `getBlogPosts()`, merge logic, new fields (`lang`, `translationOf`, `moderationStatus`, `source`), two-pass locale filter with translation fallback |
| `src/pages/es/blog.astro`                  | Import `getContentCollectionPosts()`, pass result as `initialPosts` prop                                                                                                        |
| `src/pages/en/blog.astro`                  | Same as above for English                                                                                                                                                       |
| `src/pages/es/blog/[slug].astro`           | Import `getContentCollectionPost()`, resolve Collection post server-side, pass as `initialPost` prop                                                                            |
| `src/pages/en/blog/[slug].astro`           | Same as above for English                                                                                                                                                       |
| `src/components/blog/BlogList.tsx`         | Accept `initialPosts` prop, merge with Firestore in effect hook, filter by `lang`                                                                                               |
| `src/components/blog/BlogPost.tsx`         | Accept optional `initialPost` prop, add translation toggle link, fallback language notice                                                                                       |
| `src/components/blog/BlogEditor.tsx`       | Add `lang` selector, read `trustedContributor` from `userProfile`, wire `moderationStatus`                                                                                      |
| `src/components/wrappers/BlogListPage.tsx` | Pass through `initialPosts` prop                                                                                                                                                |
| `src/components/wrappers/BlogPostPage.tsx` | Pass through `initialPost` prop                                                                                                                                                 |
| `src/types/user.ts`                        | Add `trustedContributor: boolean` to `UserProfile`                                                                                                                              |
| Admin dashboard                            | Add pending posts review section, trusted contributor toggle                                                                                                                    |

## Testing

- Unit: merge logic — Content Collection + Firestore → unified sorted feed, correct deduplication (Collection wins on slug collision)
- Unit: moderation status filtering — pending hidden, approved/auto-approved shown
- Unit: two-pass translation linking — locale filter with cross-reference fallback
- Unit: graceful degradation — when Firestore is unavailable, `initialPosts` alone produce a valid feed
- Unit: `limit` applied to final merged result, not per-source
- Integration: built blog listing page contains Content Collection posts on cold start with no Firestore (verifies the "always something to show" guarantee)
- Existing BlogList/BlogPost component tests updated for `initialPosts`/`initialPost` and `lang` props
