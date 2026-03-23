import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const LINKEDIN_AUTH_URL = import.meta.env.DEV
  ? 'http://localhost:5001/secid-org/us-central1/linkedinAuthRedirect'
  : '/linkedinAuthRedirect'; // Rewritten by Firebase Hosting

/**
 * Sign in with LinkedIn via custom OAuth flow.
 * Redirects the current page to the LinkedIn OAuth Cloud Function.
 * After authorization, the user is redirected back to the login page
 * with a ?linkedinToken= parameter.
 */
export async function signInWithLinkedIn(): Promise<void> {
  const returnUrl = window.location.pathname;
  window.location.href = `${LINKEDIN_AUTH_URL}?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/**
 * Complete LinkedIn sign-in by exchanging the custom token from the URL.
 * Called from the login page when ?linkedinToken= is present.
 */
export async function completeLinkedInSignIn(customToken: string): Promise<void> {
  await signInWithCustomToken(auth, customToken);
}
