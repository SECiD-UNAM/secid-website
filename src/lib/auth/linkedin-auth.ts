import { signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/lib/firebase';

const LINKEDIN_AUTH_URL = import.meta.env.DEV
  ? 'http://localhost:5001/secid-org/us-central1/linkedinAuthRedirect'
  : '/linkedinAuthRedirect'; // Rewritten by Firebase Hosting

/**
 * Sign in with LinkedIn via custom OAuth flow.
 * Redirects the current page to the LinkedIn OAuth Cloud Function.
 * After authorization, the user is redirected back to the login page
 * with a ?linkedinCode= parameter.
 */
export async function signInWithLinkedIn(): Promise<void> {
  const returnUrl = window.location.pathname;
  window.location.href = `${LINKEDIN_AUTH_URL}?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/**
 * Complete LinkedIn sign-in by exchanging a short-lived code for a custom token.
 * Called from the login page when ?linkedinCode= is present.
 */
export async function completeLinkedInSignIn(code: string): Promise<void> {
  const functions = getFunctions();
  const exchangeCode = httpsCallable<{ code: string }, { token: string }>(
    functions,
    'exchangeLinkedInCode'
  );

  const result = await exchangeCode({ code });
  await signInWithCustomToken(auth, result.data.token);
}
