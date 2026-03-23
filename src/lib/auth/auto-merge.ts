import { signInWithPopup, linkWithCredential, OAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { SupportedProvider } from '@/types/user';
import { getProvider } from './oauth-providers';

export interface PendingMerge {
  email: string;
  pendingCredential: any;
  existingProvider: SupportedProvider;
}

/**
 * Check if a Firebase auth error is account-exists-with-different-credential
 * and extract the info needed for the merge flow.
 *
 * Returns null for any non-merge error, or if required data cannot be extracted.
 */
export async function handleAccountExistsError(error: any): Promise<PendingMerge | null> {
  if (error.code !== 'auth/account-exists-with-different-credential') return null;

  const email = error.customData?.email;
  if (!email) return null;

  const pendingCredential = OAuthProvider.credentialFromError(error);
  if (!pendingCredential) return null;

  // Find existing provider by querying Firestore (fetchSignInMethodsForEmail is deprecated)
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const existingProvider = (snapshot.docs[0]!.data().lastLoginProvider || 'google') as SupportedProvider;
  return { email, pendingCredential, existingProvider };
}

/**
 * Complete the merge: sign in with the existing provider, then link the pending credential.
 *
 * Only supports Google and GitHub providers. LinkedIn linking is handled server-side.
 */
export async function completeMerge(
  existingProvider: Exclude<SupportedProvider, 'linkedin'>,
  pendingCredential: any
): Promise<void> {
  const provider = getProvider(existingProvider);
  const result = await signInWithPopup(auth, provider);
  await linkWithCredential(result.user, pendingCredential);
}
