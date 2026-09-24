import { useEffect, useState } from 'react';
import {
  doc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Alias-aware user profile subscription.
 *
 * Subscribes to /users/{uid}. If that doc carries `aliasOf`, it's an alias
 * stub — re-subscribes to /users/{aliasOf} and returns that doc instead.
 * Resolves at most ONE hop (alias chains fail closed to null).
 *
 * Closes #43: the same pattern previously lived in AuthContext and
 * AuthNavButtons. Shared here so future consumers don't re-derive it.
 *
 * Pass `null` or `undefined` for `uid` to skip subscription (e.g. signed-out).
 */
export function useResolvedProfile<T extends DocumentData = DocumentData>(
  uid: string | null | undefined
): {
  profile: (T & { uid?: string }) | null;
  loading: boolean;
  error: Error | null;
} {
  const [profile, setProfile] = useState<(T & { uid?: string }) | null>(null);
  const [loading, setLoading] = useState<boolean>(!!uid);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    let canonicalUnsub: Unsubscribe | null = null;
    let hoppedToCanonicalUid: string | null = null;

    const stubUnsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) {
          setProfile(null);
          setLoading(false);
          return;
        }
        const data = snap.data() as T & { aliasOf?: string };
        if (data.aliasOf) {
          // Only re-subscribe if the canonical target changed (prevents
          // resub churn on every stub re-fire and stops alias->alias loops:
          // a hopped canonical with its own aliasOf yields null below).
          if (hoppedToCanonicalUid === data.aliasOf) return;
          hoppedToCanonicalUid = data.aliasOf;
          if (canonicalUnsub) {
            canonicalUnsub();
            canonicalUnsub = null;
          }
          canonicalUnsub = onSnapshot(
            doc(db, 'users', data.aliasOf),
            (csnap) => {
              if (!csnap.exists()) {
                setProfile(null);
                setLoading(false);
                return;
              }
              const canonicalData = csnap.data() as T & { aliasOf?: string };
              if (canonicalData.aliasOf) {
                // Fail closed on alias->alias chains.
                setProfile(null);
              } else {
                setProfile({ ...(canonicalData as T), uid: csnap.id });
              }
              setLoading(false);
            },
            (err) => {
              setError(err as Error);
              setLoading(false);
            }
          );
        } else {
          setProfile({ ...(data as T), uid: snap.id });
          setLoading(false);
        }
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      stubUnsub();
      if (canonicalUnsub) canonicalUnsub();
    };
  }, [uid]);

  return { profile, loading, error };
}
