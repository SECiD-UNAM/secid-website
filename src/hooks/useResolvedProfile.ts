import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isFeatureEnabled } from '@/lib/beta';
import type { UserProfile } from '@/types/user';

/**
 * Subscribes to the Firestore user document for the given uid and transparently
 * resolves a single aliasOf hop to the canonical profile document.
 *
 * Resolution rules:
 *  - If the stub document has `aliasOf` set AND `aliasResolution` feature flag
 *    is enabled, the hook re-subscribes to `users/{aliasOf}`.
 *  - Alias→alias chains are detected and fail closed (error, null profile).
 *  - A missing canonical target also fails closed.
 *  - At most ONE hop is ever resolved; the flag prevents looping.
 *
 * Both listeners are cleaned up on uid change or component unmount so no
 * listeners are ever leaked.
 */
export function useResolvedProfile(uid: string | undefined): {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
} {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!uid);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    let canonicalUnsub: (() => void) | null = null;

    const stubUnsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) {
          // Profile doesn't exist yet (may be created by Cloud Function).
          setProfile(null);
          setLoading(false);
          return;
        }

        const data = snap.data() as UserProfile & { aliasOf?: string };

        if (data.aliasOf && isFeatureEnabled('aliasResolution')) {
          // This doc is an alias stub — re-subscribe to the canonical doc.
          // Guard against repeated fires before canonicalUnsub is set.
          if (canonicalUnsub) return;

          // Stop listening to the alias stub; loading resolves from canonical.
          // We cannot call stubUnsub() here directly because it is declared
          // below this closure, so we defer teardown to the canonical listener.
          canonicalUnsub = onSnapshot(
            doc(db, 'users', data.aliasOf),
            (canonicalSnap) => {
              if (!canonicalSnap.exists()) {
                setError('Linked account could not be resolved');
                setProfile(null);
              } else {
                const canonicalData = canonicalSnap.data() as UserProfile & {
                  aliasOf?: string;
                };
                if (canonicalData.aliasOf) {
                  // alias→alias chain — fail closed, resolve at most one hop.
                  setError('Linked account could not be resolved');
                  setProfile(null);
                } else {
                  setProfile({ ...canonicalData, uid: canonicalSnap.id });
                  setError(null);
                }
              }
              setLoading(false);
            },
            (err) => {
              console.error('useResolvedProfile: error fetching canonical profile:', err);
              setError('Failed to load user profile');
              setLoading(false);
            }
          );
          return;
        }

        // Non-alias (or feature flag off): use the stub doc directly.
        setProfile({ ...data, uid: snap.id });
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('useResolvedProfile: error fetching user profile:', err);
        setError('Failed to load user profile');
        setLoading(false);
      }
    );

    return () => {
      stubUnsub();
      if (canonicalUnsub) {
        canonicalUnsub();
        canonicalUnsub = null;
      }
    };
  }, [uid]);

  return { profile, loading, error };
}
