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

function entryToPost(entry: { id: string; data: any; body?: string }): BlogPost {
  // Prefer the explicit slug from frontmatter; fall back to the Astro-generated
  // file-based id (e.g. "en/welcome-secid") stripped to just the filename part.
  const slug = entry.data.slug ?? entry.id.split('/').pop() ?? entry.id;
  return {
    id: entry.id,
    title: entry.data.title,
    slug,
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
function buildTranslationMap(entries: { id: string; data: { slug?: string; translationOf?: string } }[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of entries) {
    if (e.data.translationOf) {
      const slug = e.data.slug ?? e.id.split('/').pop() ?? e.id;
      map.set(e.data.translationOf, slug);
    }
  }
  return map;
}

export async function getContentCollectionPosts(lang?: 'es' | 'en'): Promise<BlogPost[]> {
  // Fetch ALL entries first (for reverse lookup), then filter by lang
  const allEntries = await getCollection('blog');
  const translationMap = buildTranslationMap(allEntries);

  const entries = lang ? allEntries.filter((e: { data: { lang?: string } }) => e.data.lang === lang) : allEntries;

  const posts = entries.map((entry: { id: string; data: Record<string, unknown>; body?: string }) => {
    const post = entryToPost(entry);
    // Populate reverse translation link for original posts
    if (!post.translationOf && translationMap.has(post.slug)) {
      post.translationSlug = translationMap.get(post.slug);
    }
    return post;
  });

  return posts.sort((a: BlogPost, b: BlogPost) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function getContentCollectionPost(slug: string): Promise<BlogPost | null> {
  const allEntries = await getCollection('blog');
  const entry = allEntries.find((e: { id: string; data: { slug?: string } }) => {
    const entrySlug = e.data.slug ?? e.id.split('/').pop() ?? e.id;
    return entrySlug === slug;
  });
  if (!entry) return null;

  const translationMap = buildTranslationMap(allEntries);
  const post = entryToPost(entry);

  // Populate reverse translation link
  if (!post.translationOf && translationMap.has(post.slug)) {
    post.translationSlug = translationMap.get(post.slug);
  }

  return post;
}
