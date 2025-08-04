import { 
import { doc, setDoc, getDoc, updateDoc} from 'firebase/firestore';
import { auth, db, isUsingMockAPI} from './firebase';
import { 

/**
 * Authentication Service
 * High-level auth functions that work with both Firebase and Mock API
 */

  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User
} from 'firebase/auth';
import type { UserProfile } from '@/types/user';
  signInWithOAuth, 
  linkOAuthProvider, 
  unlinkOAuthProvider,
  getLinkedProviders,
  type SupportedProvider,
  type LinkedAccount 
} from './auth/oauth-providers';

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  if (isUsingMockAPI()) {
    return auth.signIn(email, password);
  }
  
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Create a new user account
 */
export async function signUp(
  email: string, 
  password: string, 
  profile: Partial<UserProfile.profile>
): Promise<User> {
  if (isUsingMockAPI()) {
    return auth.signUp(email, password, profile);
  }
  
  // Create auth user
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  
  // Update display name
  if (profile.firstName || profile.lastName) {
    await updateProfile(user, {
      displayName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
    });
  }
  
  // Create user profile in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    email,
    role: 'member',
    createdAt: new Date(),
    profile: {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      bio: profile.bio || '',
      company: profile.company || '',
      position: profile.position || '',
      location: profile.location || '',
      linkedin: profile.linkedin || '',
      skills: profile.skills || [],
    }
  });
  
  return user;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  if (isUsingMockAPI()) {
    return auth.signOut();
  }
  
  return firebaseSignOut(auth);
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  if (isUsingMockAPI()) {
    return auth.currentUser();
  }
  
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  if (isUsingMockAPI()) {
    return auth.onAuthStateChanged(callback);
  }
  
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  if (isUsingMockAPI()) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock: Password reset email sent to', email);
    return;
  }
  
  return sendPasswordResetEmail(auth, email);
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (isUsingMockAPI()) {
    const result = await db.getDoc('users', uid);
    return result.exists ? result.data() : null;
  }
  
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  
  return null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  if (isUsingMockAPI()) {
    return db.updateDoc('users', uid, { profile: updates });
  }
  
  const docRef = doc(db, 'users', uid);
  return setDoc(docRef, { profile: updates }, { merge: true });
}

// ===== OAuth Authentication Methods =====

/**
 * Sign in with OAuth provider (Google, GitHub, LinkedIn)
 */
export async function signInWithProvider(providerId: SupportedProvider): Promise<{
  user: User;
  isNewUser: boolean;
}> {
  if (isUsingMockAPI()) {
    // Mock OAuth implementation
    const mockUser = {
      uid: `mock-${providerId}-${Date.now()}`,
      email: `user@${providerId}.com`,
      displayName: `Mock ${providerId} User`,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${providerId}`,
    } as User;
    
    return { user: mockUser, isNewUser: true };
  }
  
  const result = await signInWithOAuth(providerId);
  return { user: result.user, isNewUser: result.isNewUser };
}

/**
 * Link OAuth provider to existing account
 */
export async function linkProvider(providerId: SupportedProvider): Promise<void> {
  if (isUsingMockAPI()) {
    console.log(`Mock: Linking ${providerId} provider`);
    return;
  }
  
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  await linkOAuthProvider(user, providerId);
}

/**
 * Unlink OAuth provider from account
 */
export async function unlinkProvider(providerId: SupportedProvider): Promise<void> {
  if (isUsingMockAPI()) {
    console.log(`Mock: Unlinking ${providerId} provider`);
    return;
  }
  
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  await unlinkOAuthProvider(user, providerId);
}

/**
 * Get linked OAuth providers for user
 */
export async function getLinkedOAuthProviders(uid: string): Promise<LinkedAccount[]> {
  if (isUsingMockAPI()) {
    // Mock linked providers
    return [
      {
        providerId: 'google',
        email: 'user@google.com',
        displayName: 'Google User',
        linkedAt: new Date(),
      }
    ];
  }
  
  return getLinkedProviders(uid);
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(uid: string, provider?: string): Promise<void> {
  if (isUsingMockAPI()) {
    console.log(`Mock: Updated last login for ${uid} with ${provider || 'email'}`);
    return;
  }
  
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    lastLogin: new Date(),
    ...(provider && { lastLoginProvider: provider }),
  });
}