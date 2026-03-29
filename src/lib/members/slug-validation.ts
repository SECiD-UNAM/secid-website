import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const RESERVED_SLUGS = new Set([
  'admin', 'profile', 'dashboard', 'api', 'login', 'settings',
  'members', 'cv', 'new', 'edit', 'search', 'blog', 'forum',
  'events', 'mentorship', 'join', 'register', 'logout', 'en', 'es',
]);

export function validateSlugFormat(slug: string): string | null {
  if (!slug) return null; // empty is valid (will use fallback)
  if (RESERVED_SLUGS.has(slug)) return 'reserved';
  if (!SLUG_REGEX.test(slug)) return 'format';
  return null;
}

export async function isSlugAvailable(
  slug: string,
  currentUid: string
): Promise<boolean> {
  if (!slug) return true;

  const q = query(
    collection(db, 'users'),
    where('slug', '==', slug),
    limit(2)
  );
  const snapshot = await getDocs(q);

  // Available if no docs found, or only the current user's doc
  return snapshot.docs.every((d) => d.id === currentUid);
}
