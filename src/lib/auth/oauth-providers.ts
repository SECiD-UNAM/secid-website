import {
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithPopup,
  unlink,
  type User,
  type UserCredential,
  type AuthProvider
} from 'firebase/auth';
import { auth} from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc} from 'firebase/firestore';
import { db} from '@/lib/firebase';

/**
 * OAuth Providers Configuration and Management
 * Supports Google, GitHub, and LinkedIn OAuth providers
 */
import type { UserProfile } from '@/types/user';

export type SupportedProvider = 'google' | 'github' | 'linkedin';

export interface OAuthUserInfo {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface LinkedAccount {
  providerId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  linkedAt: Date;
}

/**
 * Configure Google OAuth provider
 */
export function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  
  // Request additional scopes
  provider.addScope('profile');
  provider.addScope('email');
  
  // Custom parameters
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  
  return provider;
}

/**
 * Configure GitHub OAuth provider
 */
export function createGitHubProvider(): GithubAuthProvider {
  const provider = new GithubAuthProvider();
  
  // Request additional scopes
  provider.addScope('user:email');
  provider.addScope('read:user');
  
  return provider;
}

/**
 * Configure LinkedIn OAuth provider
 */
export function createLinkedInProvider(): OAuthProvider {
  const provider = new OAuthProvider('linkedin.com');
  
  // Request additional scopes
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  
  return provider;
}

/**
 * Get provider instance by name
 */
export function getProvider(providerId: SupportedProvider): AuthProvider {
  switch(providerId) {
    case 'google':
      return createGoogleProvider();
    case 'github':
      return createGitHubProvider();
    case 'linkedin':
      return createLinkedInProvider();
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(providerId: SupportedProvider): Promise<{
  user: User;
  credential: UserCredential;
  isNewUser: boolean;
}> {
  try {
    const provider = getProvider(providerId);
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;
    
    // Check if this is a new user
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isNewUser = !userDoc.exists();
    
    if(isNewUser) {
      // Create user profile for new OAuth users
      const profile: Partial<UserProfile> = {
        email: user['email'] || '',
        role: 'member',
        createdAt: new Date(),
        profile: {
          firstName: user?.displayName?.split(' ')[0] || '',
          lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
          bio: '',
          company: '',
          position: '',
          location: '',
          linkedin: '',
          skills: [],
          photoURL: user.photoURL || undefined,
        },
        settings: {
          emailNotifications: true,
          profileVisibility: 'members',
          language: 'es',
        }
      };
      
      await setDoc(doc(db, 'users', user.uid), profile);
    }
    
    // Update last login and provider info
    await updateUserOAuthInfo(user.uid, {
      uid: user.uid,
      email: user['email'] || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || undefined,
      providerId,
    });
    
    return { user, credential, isNewUser };
  } catch (error: any) {
    console.error(`OAuth sign-in error with ${providerId}:`, error);
    throw new Error(getOAuthErrorMessage(error.code, providerId));
  }
}

/**
 * Link additional OAuth provider to existing account
 */
export async function linkOAuthProvider(
  user: User,
  providerId: SupportedProvider
): Promise<UserCredential> {
  try {
    const provider = getProvider(providerId);
    const credential = await linkWithPopup(user, provider);
    
    // Update user profile with linked account info
    await addLinkedAccount(user.uid, {
      providerId,
      email: credential.user['email'] || '',
      displayName: credential.user.displayName || '',
      photoURL: credential.user.photoURL || undefined,
      linkedAt: new Date(),
    });
    
    return credential;
  } catch (error: any) {
    console.error(`OAuth linking error with ${providerId}:`, error);
    throw new Error(getOAuthErrorMessage(error.code, providerId));
  }
}

/**
 * Unlink OAuth provider from account
 */
export async function unlinkOAuthProvider(
  user: User,
  providerId: SupportedProvider
): Promise<User> {
  try {
    const updatedUser = await unlink(user, providerId);
    
    // Remove linked account info from user profile
    await removeLinkedAccount(user.uid, providerId);
    
    return updatedUser;
  } catch (error: any) {
    console.error(`OAuth unlinking error with ${providerId}:`, error);
    throw new Error(getOAuthErrorMessage(error['code'], providerId));
  }
}

/**
 * Get user's linked OAuth providers
 */
export async function getLinkedProviders(uid: string): Promise<LinkedAccount[]> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data();
    return userData.linkedAccounts || [];
  } catch (error) {
    console.error('Error fetching linked providers:', error);
    return [];
  }
}

/**
 * Update user's OAuth information
 */
async function updateUserOAuthInfo(uid: string, oauthInfo: OAuthUserInfo): Promise<void> {
  const userRef = doc(db, 'users', uid);
  
  await updateDoc(userRef, {
    lastLogin: new Date(),
    lastLoginProvider: oauthInfo.providerId,
    'profile.photoURL': oauthInfo.photoURL || null,
  });
}

/**
 * Add linked account to user profile
 */
async function addLinkedAccount(uid: string, linkedAccount: LinkedAccount): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const userData = userDoc.data();
    const linkedAccounts = userData.linkedAccounts || [];
    
    // Remove existing account with same provider if exists
    const filteredAccounts = linkedAccounts.filter(
      (account: LinkedAccount) => account.providerId !== linkedAccount.providerId
    );
    
    // Add new linked account
    filteredAccounts.push(linkedAccount);
    
    await updateDoc(userRef, {
      linkedAccounts: filteredAccounts,
    });
  }
}

/**
 * Remove linked account from user profile
 */
async function removeLinkedAccount(uid: string, providerId: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const userData = userDoc.data();
    const linkedAccounts = userData.linkedAccounts || [];
    
    // Remove account with specified provider
    const filteredAccounts = linkedAccounts.filter(
      (account: LinkedAccount) => account.providerId !== providerId
    );
    
    await updateDoc(userRef, {
      linkedAccounts: filteredAccounts,
    });
  }
}

/**
 * Get user-friendly error messages for OAuth errors
 */
function getOAuthErrorMessage(errorCode: string, providerId: SupportedProvider): string {
  const providerName = providerId.charAt(0).toUpperCase() + providerId.slice(1);
  
  switch(errorCode) {
    case 'auth/popup-closed-by-user':
      return `The ${providerName} sign-in window was closed. Please try again.`;
    case 'auth/popup-blocked':
      return `The sign-in popup was blocked. Please allow popups and try again.`;
    case 'auth/cancelled-popup-request':
      return `Sign-in was cancelled. Please try again.`;
    case 'auth/account-exists-with-different-credential':
      return `An account already exists with the same email but different sign-in method.`;
    case 'auth/credential-already-in-use':
      return `This ${providerName} account is already linked to another user.`;
    case 'auth/provider-already-linked':
      return `This ${providerName} account is already linked to your account.`;
    case 'auth/no-such-provider':
      return `No ${providerName} account is linked to your account.`;
    case 'auth/requires-recent-login':
      return `This operation requires recent authentication. Please sign in again.`;
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return `An error occurred with ${providerName} sign-in. Please try again.`;
  }
}

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(): {
  isValid: boolean;
  missingProviders: SupportedProvider[];
  errors: string[];
} {
  const errors: string[] = [];
  const missingProviders: SupportedProvider[] = [];
  
  try {
    // Test provider creation
    createGoogleProvider();
  } catch (error) {
    missingProviders.push('google');
    errors.push('Google OAuth configuration is missing or invalid');
  }
  
  try {
    createGitHubProvider();
  } catch (error) {
    missingProviders.push('github');
    errors.push('GitHub OAuth configuration is missing or invalid');
  }
  
  try {
    createLinkedInProvider();
  } catch (error) {
    missingProviders.push('linkedin');
    errors.push('LinkedIn OAuth configuration is missing or invalid');
  }
  
  return {
    isValid: errors.length === 0,
    missingProviders,
    errors,
  };
}