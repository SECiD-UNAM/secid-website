import { describe, it, expect, vi } from 'vitest';

// Mock Firebase dependencies so the module can be imported without Firebase SDK
vi.mock('@/lib/firebase', () => ({
  db: {},
  isUsingMockAPI: vi.fn(() => false),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(),
}));

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
    const collectionPosts = [makePost({ slug: 'a', publishedAt: new Date('2026-03-10') })];
    const firestorePosts = [
      makePost({ slug: 'b', publishedAt: new Date('2026-03-15'), source: 'firestore' }),
    ];
    const merged = mergeBlogPosts(collectionPosts, firestorePosts);
    expect(merged[0].slug).toBe('b');
    expect(merged[1].slug).toBe('a');
  });

  it('deduplicates by slug — content-collection wins', () => {
    const collectionPosts = [
      makePost({ slug: 'same', source: 'content-collection', title: 'CC version' }),
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
      makePost({ slug: 'approved', source: 'firestore', moderationStatus: 'approved' }),
      makePost({ slug: 'pending', source: 'firestore', moderationStatus: 'pending' }),
      makePost({ slug: 'rejected', source: 'firestore', moderationStatus: 'rejected' }),
      makePost({ slug: 'auto', source: 'firestore', moderationStatus: 'auto-approved' }),
    ];
    const merged = mergeBlogPosts(collectionPosts, firestorePosts);
    expect(merged).toHaveLength(2);
    expect(
      merged
        .map((p) => p.slug)
        .sort()
    ).toEqual(['approved', 'auto']);
  });

  it('applies limit to final merged result', () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      makePost({ slug: `post-${i}`, publishedAt: new Date(2026, 2, i + 1) })
    );
    const merged = mergeBlogPosts(posts, [], 3);
    expect(merged).toHaveLength(3);
  });

  it('keeps content-collection posts without moderationStatus', () => {
    const collectionPosts = [
      makePost({ slug: 'cc-no-mod', source: 'content-collection', moderationStatus: undefined }),
    ];
    const merged = mergeBlogPosts(collectionPosts, []);
    expect(merged).toHaveLength(1);
  });

  it('keeps firestore posts without moderationStatus (backward compat)', () => {
    const firestorePosts = [
      makePost({ slug: 'fs-no-mod', source: 'firestore', moderationStatus: undefined }),
    ];
    const merged = mergeBlogPosts([], firestorePosts);
    expect(merged).toHaveLength(1);
  });
});

describe('filterByLocale', () => {
  it('returns posts matching the target locale', () => {
    const posts = [
      makePost({ slug: 'es-post', lang: 'es' }),
      makePost({ slug: 'en-post', lang: 'en' }),
    ];
    const filtered = filterByLocale(posts, 'es');
    // Both returned because en-post has no translation in es
    expect(filtered).toHaveLength(2);
  });

  it('includes untranslated foreign-language posts as fallback', () => {
    const posts = [
      makePost({ slug: 'es-post', lang: 'es' }),
      makePost({ slug: 'en-only', lang: 'en' }),
    ];
    const filtered = filterByLocale(posts, 'es');
    expect(filtered).toHaveLength(2);
  });

  it('excludes foreign-language posts that have a translation in the target locale', () => {
    const posts = [
      makePost({ slug: 'bienvenida', lang: 'es' }),
      makePost({ slug: 'welcome', lang: 'en', translationOf: 'bienvenida' }),
    ];
    const filtered = filterByLocale(posts, 'es');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].slug).toBe('bienvenida');
  });

  it('excludes original-language posts when viewing the translation locale', () => {
    const posts = [
      makePost({ slug: 'bienvenida', lang: 'es' }),
      makePost({ slug: 'welcome', lang: 'en', translationOf: 'bienvenida' }),
    ];
    const filtered = filterByLocale(posts, 'en');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].slug).toBe('welcome');
  });

  it('includes posts without moderationStatus (backward compatibility)', () => {
    const posts = [makePost({ slug: 'legacy', lang: 'es', moderationStatus: undefined })];
    const filtered = filterByLocale(posts, 'es');
    expect(filtered).toHaveLength(1);
  });

  it('excludes foreign original when a target-locale translation claims it via translationOf', () => {
    const posts = [
      makePost({ slug: 'en-original', lang: 'en' }), // no translationOf
      makePost({ slug: 'es-traduccion', lang: 'es', translationOf: 'en-original' }),
    ];
    const filtered = filterByLocale(posts, 'es');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].slug).toBe('es-traduccion');
  });

  it('returns only target-locale posts when all foreign posts have translations', () => {
    const posts = [
      makePost({ slug: 'hola', lang: 'es' }),
      makePost({ slug: 'hello', lang: 'en', translationOf: 'hola' }),
      makePost({ slug: 'adios', lang: 'es' }),
      makePost({ slug: 'goodbye', lang: 'en', translationOf: 'adios' }),
    ];
    const filtered = filterByLocale(posts, 'en');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((p) => p.slug).sort()).toEqual(['goodbye', 'hello']);
  });
});
