// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auth, firestore } from '@/lib/firebase';
import { signIn, signUp, signOut, resetPassword } from '@/lib/auth';
import { mockUsers, mockApiResponses } from '../../fixtures';

// Mock Firebase services
vi.mock('@/lib/firebase', () => ({
  auth: {
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    currentUser: null,
  },
  firestore: {
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    getDoc: vi.fn(),
  },
}));

// Skipped: Tests assume incorrect Firebase SDK API shape (method-based vs module-level functions).
// The real auth.ts uses signInWithEmailAndPassword(auth, email, password) from firebase/auth,
// but these tests mock auth.signInWithEmailAndPassword as a method. Needs rewrite to match
// the actual Firebase v9+ modular SDK pattern. See TD-013.
describe.skip('Authentication API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sign In', () => {
    it('successfully signs in with valid credentials', async () => {
      const mockUserCredential = {
        user: mockUsers.regularUser,
      };
      
      vi.mocked(auth.signInWithEmailAndPassword).mockResolvedValue(mockUserCredential);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockUsers.regularUser.profile,
      });
      
      const result = await signIn('user@example.com', 'password123');
      
      expect(auth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'user@example.com',
        'password123'
      );
      expect(result.user).toEqual(mockUsers.regularUser);
    });

    it('throws error for invalid credentials', async () => {
      vi.mocked(auth.signInWithEmailAndPassword).mockRejectedValue(
        new Error('auth/invalid-credential')
      );
      
      await expect(signIn('user@example.com', 'wrongpassword')).rejects.toThrow(
        'auth/invalid-credential'
      );
    });

    it('throws error for unverified email', async () => {
      const mockUnverifiedUser = {
        user: { ...mockUsers.unverifiedUser, emailVerified: false },
      };
      
      vi.mocked(auth.signInWithEmailAndPassword).mockResolvedValue(mockUnverifiedUser);
      
      await expect(signIn('unverified@example.com', 'password123')).rejects.toThrow(
        'Email not verified'
      );
    });

    it('handles network errors during sign in', async () => {
      vi.mocked(auth.signInWithEmailAndPassword).mockRejectedValue(
        new Error('auth/network-request-failed')
      );
      
      await expect(signIn('user@example.com', 'password123')).rejects.toThrow(
        'auth/network-request-failed'
      );
    });
  });

  describe('Sign Up', () => {
    const signUpData = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      university: 'UNAM',
      graduationYear: 2023,
      major: 'Data Science',
    };

    it('successfully creates new user account', async () => {
      const mockUserCredential = {
        user: { uid: 'new-user-uid', email: signUpData.email },
      };
      
      vi.mocked(auth.createUserWithEmailAndPassword).mockResolvedValue(mockUserCredential);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      
      const result = await signUp(signUpData);
      
      expect(auth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        signUpData.email,
        signUpData.password
      );
      
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          firstName: signUpData.firstName,
          lastName: signUpData.lastName,
          email: signUpData.email,
          university: signUpData.university,
          graduationYear: signUpData.graduationYear,
          major: signUpData.major,
        })
      );
      
      expect(result.user.uid).toBe('new-user-uid');
    });

    it('throws error for existing email', async () => {
      vi.mocked(auth.createUserWithEmailAndPassword).mockRejectedValue(
        new Error('auth/email-already-in-use')
      );
      
      await expect(signUp(signUpData)).rejects.toThrow('auth/email-already-in-use');
    });

    it('throws error for weak password', async () => {
      vi.mocked(auth.createUserWithEmailAndPassword).mockRejectedValue(
        new Error('auth/weak-password')
      );
      
      await expect(signUp({ ...signUpData, password: '123' })).rejects.toThrow(
        'auth/weak-password'
      );
    });

    it('rolls back on profile creation failure', async () => {
      const mockUserCredential = {
        user: { uid: 'new-user-uid', email: signUpData.email, delete: vi.fn() },
      };
      
      vi.mocked(auth.createUserWithEmailAndPassword).mockResolvedValue(mockUserCredential);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Profile creation failed'));
      
      await expect(signUp(signUpData)).rejects.toThrow('Profile creation failed');
      expect(mockUserCredential.user.delete).toHaveBeenCalled();
    });
  });

  describe('Sign Out', () => {
    it('successfully signs out user', async () => {
      vi.mocked(auth.signOut).mockResolvedValue(undefined);
      
      await signOut();
      
      expect(auth.signOut).toHaveBeenCalledWith(auth);
    });

    it('handles sign out errors', async () => {
      vi.mocked(auth.signOut).mockRejectedValue(new Error('Sign out failed'));
      
      await expect(signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('Password Reset', () => {
    it('successfully sends password reset email', async () => {
      vi.mocked(auth.sendPasswordResetEmail).mockResolvedValue(undefined);
      
      await resetPassword('user@example.com');
      
      expect(auth.sendPasswordResetEmail).toHaveBeenCalledWith(
        auth,
        'user@example.com'
      );
    });

    it('throws error for invalid email', async () => {
      vi.mocked(auth.sendPasswordResetEmail).mockRejectedValue(
        new Error('auth/invalid-email')
      );
      
      await expect(resetPassword('invalid-email')).rejects.toThrow('auth/invalid-email');
    });

    it('throws error for user not found', async () => {
      vi.mocked(auth.sendPasswordResetEmail).mockRejectedValue(
        new Error('auth/user-not-found')
      );
      
      await expect(resetPassword('nonexistent@example.com')).rejects.toThrow(
        'auth/user-not-found'
      );
    });
  });

  describe('Session Management', () => {
    it('maintains user session across page refreshes', async () => {
      const mockUser = mockUsers.regularUser;
      
      // Simulate page refresh
      Object.defineProperty(auth, 'currentUser', {
        value: mockUser,
        writable: true,
      });
      
      expect(auth.currentUser).toEqual(mockUser);
    });

    it('expires session after inactivity', async () => {
      // Mock token expiration
      vi.mocked(auth.signOut).mockResolvedValue(undefined);
      
      // Simulate token expiration
      Object.defineProperty(auth, 'currentUser', {
        value: null,
        writable: true,
      });
      
      expect(auth.currentUser).toBeNull();
    });
  });

  describe('Security Features', () => {
    it('rate limits sign in attempts', async () => {
      // Simulate multiple failed attempts
      vi.mocked(auth.signInWithEmailAndPassword).mockRejectedValue(
        new Error('auth/too-many-requests')
      );
      
      await expect(signIn('user@example.com', 'wrongpassword')).rejects.toThrow(
        'auth/too-many-requests'
      );
    });

    it('validates email domain restrictions', async () => {
      const invalidDomainEmail = 'user@blacklisted-domain.com';
      
      await expect(signUp({ 
        ...mockUsers.regularUser, 
        email: invalidDomainEmail 
      })).rejects.toThrow('Domain not allowed');
    });

    it('enforces password complexity requirements', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];
      
      for (const password of weakPasswords) {
        await expect(signUp({ 
          ...mockUsers.regularUser, 
          password 
        })).rejects.toThrow(/password/i);
      }
    });
  });
});