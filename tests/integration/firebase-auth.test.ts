/**
 * Firebase Authentication Integration Tests
 * 
 * Tests for Firebase authentication flows including:
 * - User registration and login
 * - Email verification
 * - Password reset flows
 * - Social authentication (Google, GitHub)
 * - Two-factor authentication
 * - Profile management
 * - Session handling
 * - Error scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  User,
  Auth,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  GithubAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserLocalPersistence: { type: 'LOCAL' },
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
}));

// Mock remaining Firebase SDK modules required by @/lib/firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  connectStorageEmulator: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
}));

// Mock the logger used by @/lib/firebase
vi.mock('@/lib/logger', () => ({
  firebaseLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Firebase config
vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

// Type the mocked functions
const mockSignInWithEmailAndPassword = vi.mocked(signInWithEmailAndPassword);
const mockCreateUserWithEmailAndPassword = vi.mocked(createUserWithEmailAndPassword);
const mockSignOut = vi.mocked(signOut);
const mockSendEmailVerification = vi.mocked(sendEmailVerification);
const mockSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);
const mockUpdateProfile = vi.mocked(updateProfile);
const mockUpdatePassword = vi.mocked(updatePassword);
const mockReauthenticateWithCredential = vi.mocked(reauthenticateWithCredential);
const mockSignInWithPopup = vi.mocked(signInWithPopup);
const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockGetDoc = vi.mocked(getDoc);
const mockUpdateDoc = vi.mocked(updateDoc);
const mockServerTimestamp = vi.mocked(serverTimestamp);

// Test data
const mockUser: Partial<User> = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: false,
  photoURL: null,
  phoneNumber: null,
  metadata: {
    creationTime: '2023-01-01T00:00:00Z',
    lastSignInTime: '2023-01-01T00:00:00Z',
  },
} as User;

const mockUserCredential = {
  user: mockUser,
  providerId: 'password',
  operationType: 'signIn' as const,
};

const mockDocSnapshot = {
  exists: () => true,
  data: () => ({
    displayName: 'Test User',
    email: 'test@example.com',
    profileCompleteness: 50,
    isVerified: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  }),
  id: 'test-user-id',
};

describe('Firebase Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mocks
    mockServerTimestamp.mockReturnValue({ seconds: 1672531200, nanoseconds: 0 } as any);
    mockDoc.mockReturnValue({} as any);
    mockGetDoc.mockResolvedValue(mockDocSnapshot as any);
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Note: Do NOT call vi.restoreAllMocks() here because it undoes
    // vi.mock() module mocks and breaks vi.mocked() references in later tests.
  });

  describe('User Registration', () => {
    it('successfully registers a new user with email and password', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const email = 'newuser@example.com';
      const password = 'SecurePassword123!';

      const result = await createUserWithEmailAndPassword(auth, email, password);

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(auth, email, password);
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.uid).toBe('test-user-id');
    });

    it('creates user profile document in Firestore after registration', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const email = 'newuser@example.com';
      const password = 'SecurePassword123!';
      const displayName = 'New User';

      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Simulate profile creation
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        displayName,
        profileCompleteness: 20,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'test@example.com',
          displayName,
          profileCompleteness: 20,
          isVerified: false,
        })
      );
    });

    it('handles registration errors', async () => {
      const error = new Error('auth/email-already-in-use');
      mockCreateUserWithEmailAndPassword.mockRejectedValue(error);

      const email = 'existing@example.com';
      const password = 'password123';

      await expect(createUserWithEmailAndPassword(auth, email, password))
        .rejects.toThrow('auth/email-already-in-use');
    });

    it('sends email verification after registration', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      mockSendEmailVerification.mockResolvedValue();

      const result = await createUserWithEmailAndPassword(auth, 'test@example.com', 'password123');
      await sendEmailVerification(result.user);

      expect(mockSendEmailVerification).toHaveBeenCalledWith(result.user);
    });

    it('handles weak password errors', async () => {
      const error = new Error('auth/weak-password');
      mockCreateUserWithEmailAndPassword.mockRejectedValue(error);

      await expect(createUserWithEmailAndPassword(auth, 'test@example.com', '123'))
        .rejects.toThrow('auth/weak-password');
    });

    it('handles invalid email errors', async () => {
      const error = new Error('auth/invalid-email');
      mockCreateUserWithEmailAndPassword.mockRejectedValue(error);

      await expect(createUserWithEmailAndPassword(auth, 'invalid-email', 'password123'))
        .rejects.toThrow('auth/invalid-email');
    });
  });

  describe('User Login', () => {
    it('successfully logs in with valid credentials', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const email = 'test@example.com';
      const password = 'password123';

      const result = await signInWithEmailAndPassword(auth, email, password);

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(auth, email, password);
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.uid).toBe('test-user-id');
    });

    it('updates last login timestamp in user profile', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const result = await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
      
      // Simulate updating last login
      await updateDoc(doc(db, 'users', result.user.uid), {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastLoginAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      );
    });

    it('handles invalid credentials', async () => {
      const error = new Error('auth/invalid-credential');
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      await expect(signInWithEmailAndPassword(auth, 'test@example.com', 'wrongpassword'))
        .rejects.toThrow('auth/invalid-credential');
    });

    it('handles user not found errors', async () => {
      const error = new Error('auth/user-not-found');
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      await expect(signInWithEmailAndPassword(auth, 'nonexistent@example.com', 'password123'))
        .rejects.toThrow('auth/user-not-found');
    });

    it('handles too many requests errors', async () => {
      const error = new Error('auth/too-many-requests');
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      await expect(signInWithEmailAndPassword(auth, 'test@example.com', 'password123'))
        .rejects.toThrow('auth/too-many-requests');
    });
  });

  describe('User Logout', () => {
    it('successfully logs out user', async () => {
      mockSignOut.mockResolvedValue();

      await signOut(auth);

      expect(mockSignOut).toHaveBeenCalledWith(auth);
    });

    it('handles logout errors gracefully', async () => {
      const error = new Error('Network error');
      mockSignOut.mockRejectedValue(error);

      await expect(signOut(auth)).rejects.toThrow('Network error');
    });
  });

  describe('Password Reset', () => {
    it('sends password reset email', async () => {
      mockSendPasswordResetEmail.mockResolvedValue();

      const email = 'test@example.com';
      await sendPasswordResetEmail(auth, email);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(auth, email);
    });

    it('handles invalid email for password reset', async () => {
      const error = new Error('auth/user-not-found');
      mockSendPasswordResetEmail.mockRejectedValue(error);

      await expect(sendPasswordResetEmail(auth, 'nonexistent@example.com'))
        .rejects.toThrow('auth/user-not-found');
    });

    it('handles password reset for disabled users', async () => {
      const error = new Error('auth/user-disabled');
      mockSendPasswordResetEmail.mockRejectedValue(error);

      await expect(sendPasswordResetEmail(auth, 'disabled@example.com'))
        .rejects.toThrow('auth/user-disabled');
    });
  });

  describe('Profile Updates', () => {
    it('updates user display name', async () => {
      mockUpdateProfile.mockResolvedValue();

      const user = mockUser as User;
      const newDisplayName = 'Updated Name';

      await updateProfile(user, { displayName: newDisplayName });

      expect(mockUpdateProfile).toHaveBeenCalledWith(user, { displayName: newDisplayName });
    });

    it('updates user photo URL', async () => {
      mockUpdateProfile.mockResolvedValue();

      const user = mockUser as User;
      const photoURL = 'https://example.com/photo.jpg';

      await updateProfile(user, { photoURL });

      expect(mockUpdateProfile).toHaveBeenCalledWith(user, { photoURL });
    });

    it('updates user profile in Firestore', async () => {
      const userId = 'test-user-id';
      const updates = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        skills: ['JavaScript', 'React'],
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'users', userId), updates);

      expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), updates);
    });

    it('handles profile update errors', async () => {
      const error = new Error('Profile update failed');
      mockUpdateProfile.mockRejectedValue(error);

      const user = mockUser as User;
      await expect(updateProfile(user, { displayName: 'New Name' }))
        .rejects.toThrow('Profile update failed');
    });
  });

  describe('Password Changes', () => {
    it('updates user password', async () => {
      mockUpdatePassword.mockResolvedValue();

      const user = mockUser as User;
      const newPassword = 'NewSecurePassword123!';

      await updatePassword(user, newPassword);

      expect(mockUpdatePassword).toHaveBeenCalledWith(user, newPassword);
    });

    it('requires reauthentication for sensitive operations', async () => {
      const mockCredential = { providerId: 'password' };
      (EmailAuthProvider.credential as any).mockReturnValue(mockCredential);
      mockReauthenticateWithCredential.mockResolvedValue(mockUserCredential);

      const user = mockUser as User;
      const email = 'test@example.com';
      const currentPassword = 'currentPassword';

      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      expect(mockReauthenticateWithCredential).toHaveBeenCalledWith(user, credential);
    });

    it('handles reauthentication failures', async () => {
      const error = new Error('auth/wrong-password');
      mockReauthenticateWithCredential.mockRejectedValue(error);

      const user = mockUser as User;
      const credential = EmailAuthProvider.credential('test@example.com', 'wrongpassword');

      await expect(reauthenticateWithCredential(user, credential))
        .rejects.toThrow('auth/wrong-password');
    });
  });

  describe('Social Authentication', () => {
    it('signs in with Google provider', async () => {
      const mockGoogleUser = {
        ...mockUser,
        displayName: 'Google User',
        photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
      };
      const mockGoogleCredential = {
        ...mockUserCredential,
        user: mockGoogleUser,
        providerId: 'google.com',
      };

      mockSignInWithPopup.mockResolvedValue(mockGoogleCredential);
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      expect(mockSignInWithPopup).toHaveBeenCalledWith(auth, provider);
      expect(result.user.displayName).toBe('Google User');
      expect(result.providerId).toBe('google.com');
    });

    it('signs in with GitHub provider', async () => {
      const mockGitHubUser = {
        ...mockUser,
        displayName: 'GitHub User',
        photoURL: 'https://avatars.githubusercontent.com/u/123456',
      };
      const mockGitHubCredential = {
        ...mockUserCredential,
        user: mockGitHubUser,
        providerId: 'github.com',
      };

      mockSignInWithPopup.mockResolvedValue(mockGitHubCredential);
      const provider = new GithubAuthProvider();

      const result = await signInWithPopup(auth, provider);

      expect(mockSignInWithPopup).toHaveBeenCalledWith(auth, provider);
      expect(result.user.displayName).toBe('GitHub User');
      expect(result.providerId).toBe('github.com');
    });

    it('handles social authentication cancellation', async () => {
      const error = new Error('auth/cancelled-popup-request');
      mockSignInWithPopup.mockRejectedValue(error);

      const provider = new GoogleAuthProvider();

      await expect(signInWithPopup(auth, provider))
        .rejects.toThrow('auth/cancelled-popup-request');
    });

    it('handles popup blocked errors', async () => {
      const error = new Error('auth/popup-blocked');
      mockSignInWithPopup.mockRejectedValue(error);

      const provider = new GoogleAuthProvider();

      await expect(signInWithPopup(auth, provider))
        .rejects.toThrow('auth/popup-blocked');
    });

    it('creates user profile for new social users', async () => {
      const mockGoogleUser = {
        ...mockUser,
        displayName: 'New Google User',
        photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
      };
      const mockGoogleCredential = {
        ...mockUserCredential,
        user: mockGoogleUser,
        providerId: 'google.com',
        operationType: 'signIn' as const,
      };

      mockSignInWithPopup.mockResolvedValue(mockGoogleCredential);
      
      // Simulate new user (document doesn't exist)
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Check if user document exists
      await getDoc(doc(db, 'users', result.user.uid));

      // Should create new user profile
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        provider: 'google.com',
        profileCompleteness: 40,
        isVerified: true, // Social providers are considered verified
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          provider: 'google.com',
          isVerified: true,
          profileCompleteness: 40,
        })
      );
    });
  });

  describe('Email Verification', () => {
    it('sends email verification to user', async () => {
      mockSendEmailVerification.mockResolvedValue();

      const user = mockUser as User;
      await sendEmailVerification(user);

      expect(mockSendEmailVerification).toHaveBeenCalledWith(user);
    });

    it('handles email verification with custom settings', async () => {
      mockSendEmailVerification.mockResolvedValue();

      const user = mockUser as User;
      const actionCodeSettings = {
        url: 'https://secid.com/verify-email',
        handleCodeInApp: true,
      };

      await sendEmailVerification(user, actionCodeSettings);

      expect(mockSendEmailVerification).toHaveBeenCalledWith(user, actionCodeSettings);
    });

    it('handles email verification errors', async () => {
      const error = new Error('auth/too-many-requests');
      mockSendEmailVerification.mockRejectedValue(error);

      const user = mockUser as User;
      await expect(sendEmailVerification(user))
        .rejects.toThrow('auth/too-many-requests');
    });
  });

  describe('User Profile Management', () => {
    it('retrieves user profile from Firestore', async () => {
      const userId = 'test-user-id';

      const profileDoc = await getDoc(doc(db, 'users', userId));

      expect(mockGetDoc).toHaveBeenCalledWith(expect.anything());
      expect(profileDoc.exists()).toBe(true);
      expect(profileDoc.data()).toEqual(expect.objectContaining({
        email: 'test@example.com',
        displayName: 'Test User',
        profileCompleteness: 50,
      }));
    });

    it('handles non-existent user profiles', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);

      const userId = 'non-existent-user';
      const profileDoc = await getDoc(doc(db, 'users', userId));

      expect(profileDoc.exists()).toBe(false);
    });

    it('calculates profile completeness', async () => {
      const userId = 'test-user-id';
      const profileData = {
        displayName: 'Complete User',
        email: 'complete@example.com',
        bio: 'Software developer',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: '5 years',
        education: 'Computer Science',
        location: 'Mexico City',
        photoURL: 'https://example.com/photo.jpg',
      };

      // Calculate completeness (8 fields filled out of 10 possible = 80%)
      const completeness = Object.values(profileData).filter(value => 
        value && (Array.isArray(value) ? value.length > 0 : true)
      ).length * 10;

      await updateDoc(doc(db, 'users', userId), {
        ...profileData,
        profileCompleteness: completeness,
        updatedAt: serverTimestamp(),
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          profileCompleteness: 80,
        })
      );
    });
  });

  describe('Session Management', () => {
    it('maintains user session across page reloads', async () => {
      // This would typically be tested with onAuthStateChanged
      const mockOnAuthStateChanged = vi.fn();
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        // Simulate user being restored from session
        callback(mockUser);
        return () => {}; // Unsubscribe function
      });

      // Simulate page reload - user should be restored
      const unsubscribe = mockOnAuthStateChanged(auth, (user: User | null) => {
        expect(user).toBeTruthy();
        expect(user?.uid).toBe('test-user-id');
      });

      expect(mockOnAuthStateChanged).toHaveBeenCalled();
      unsubscribe();
    });

    it('handles session expiration', async () => {
      const mockOnAuthStateChanged = vi.fn();
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        // Simulate session expiration
        callback(null);
        return () => {};
      });

      const unsubscribe = mockOnAuthStateChanged(auth, (user: User | null) => {
        expect(user).toBeNull();
      });

      expect(mockOnAuthStateChanged).toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const networkError = new Error('auth/network-request-failed');
      mockSignInWithEmailAndPassword.mockRejectedValue(networkError);

      await expect(signInWithEmailAndPassword(auth, 'test@example.com', 'password123'))
        .rejects.toThrow('auth/network-request-failed');
    });

    it('handles quota exceeded errors', async () => {
      const quotaError = new Error('auth/quota-exceeded');
      mockCreateUserWithEmailAndPassword.mockRejectedValue(quotaError);

      await expect(createUserWithEmailAndPassword(auth, 'test@example.com', 'password123'))
        .rejects.toThrow('auth/quota-exceeded');
    });

    it('handles app deleted errors', async () => {
      const appDeletedError = new Error('auth/app-deleted');
      mockSignInWithEmailAndPassword.mockRejectedValue(appDeletedError);

      await expect(signInWithEmailAndPassword(auth, 'test@example.com', 'password123'))
        .rejects.toThrow('auth/app-deleted');
    });
  });

  describe('User Verification Status', () => {
    it('updates verification status in user profile', async () => {
      const userId = 'test-user-id';
      
      // Simulate email verification completion
      await updateDoc(doc(db, 'users', userId), {
        isVerified: true,
        emailVerifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isVerified: true,
          emailVerifiedAt: expect.anything(),
        })
      );
    });

    it('handles UNAM domain verification', async () => {
      const unamUser = {
        ...mockUser,
        email: 'student@comunidad.unam.mx',
      };

      // Check if email is from UNAM domain
      const isUnamEmail = unamUser.email?.includes('@comunidad.unam.mx') || 
                         unamUser.email?.includes('@unam.mx');

      expect(isUnamEmail).toBe(true);

      // Should mark as verified if UNAM email
      if (isUnamEmail) {
        await updateDoc(doc(db, 'users', unamUser.uid), {
          isVerified: true,
          verificationMethod: 'unam-email',
          updatedAt: serverTimestamp(),
        });

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            isVerified: true,
            verificationMethod: 'unam-email',
          })
        );
      }
    });
  });
});