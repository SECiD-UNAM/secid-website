import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/auth before any imports that depend on it
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  GithubAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  linkWithPopup: vi.fn(),
  unlink: vi.fn(),
}));

// Mock @/lib/firebase
vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signInWithOAuth } from '@/lib/auth/oauth-providers';

describe('signInWithOAuth — Google photo sync', () => {
  beforeEach(() => {
    // resetAllMocks resets both call data AND implementations for a clean slate
    vi.resetAllMocks();
    // Re-establish constructor mock cleared by resetAllMocks
    vi.mocked(GoogleAuthProvider).mockReturnValue({
      addScope: vi.fn(),
      setCustomParameters: vi.fn(),
    } as any);
    vi.mocked(doc).mockReturnValue({ id: 'users/uid123' } as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
  });

  const mockUser = {
    uid: 'uid123',
    email: 'user@example.com',
    displayName: 'Test User',
    photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
  };

  const mockCredential = { user: mockUser };

  describe('TC-OA-001: new user — photo is synced from provider', () => {
    /**
     * When the Firestore document does not yet exist (new user), the Google
     * profile photo must be written to Firestore via updateDoc.
     */
    it('writes photoURL for a brand-new user', async () => {
      vi.mocked(signInWithPopup).mockResolvedValue(mockCredential as any);
      // Firestore doc does NOT exist yet
      vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any);

      await signInWithOAuth('google');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ photoURL: mockUser.photoURL })
      );
    });
  });

  describe('TC-OA-002: existing user without a photo — photo is synced', () => {
    /**
     * When the user already has a Firestore document but photoURL is empty,
     * the Google profile photo must be written to Firestore.
     */
    it('writes photoURL when the existing profile has no photo', async () => {
      vi.mocked(signInWithPopup).mockResolvedValue(mockCredential as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ photoURL: '' }),
      } as any);

      await signInWithOAuth('google');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ photoURL: mockUser.photoURL })
      );
    });

    it('writes photoURL when the existing profile has a null photo', async () => {
      vi.mocked(signInWithPopup).mockResolvedValue(mockCredential as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ photoURL: null }),
      } as any);

      await signInWithOAuth('google');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ photoURL: mockUser.photoURL })
      );
    });
  });

  describe('TC-OA-003: existing user with a custom photo — photo is preserved', () => {
    /**
     * When the user already has a non-empty photoURL in Firestore (e.g. a
     * manually uploaded photo), the OAuth provider photo must NOT overwrite it.
     */
    it('does NOT write photoURL when the existing profile already has a photo', async () => {
      vi.mocked(signInWithPopup).mockResolvedValue(mockCredential as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          photoURL: 'https://storage.googleapis.com/custom-photo.jpg',
        }),
      } as any);

      await signInWithOAuth('google');

      expect(updateDoc).toHaveBeenCalled();
      // The most recent call is from this test — it must NOT include photoURL
      const lastCallArg = vi.mocked(updateDoc).mock.calls.at(-1)![1] as Record<
        string,
        unknown
      >;
      expect(lastCallArg).not.toHaveProperty('photoURL');
    });
  });

  describe('TC-OA-004: provider has no photo — photoURL not written', () => {
    /**
     * If the OAuth provider itself returns no photo (photoURL is null/empty),
     * updateDoc must not include a photoURL field regardless of the user's state.
     */
    it('does NOT write photoURL when the provider returns no photo', async () => {
      const userWithoutPhoto = { ...mockUser, photoURL: null };
      vi.mocked(signInWithPopup).mockResolvedValue({
        user: userWithoutPhoto,
      } as any);
      vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any);

      await signInWithOAuth('google');

      expect(updateDoc).toHaveBeenCalled();
      const lastCallArg = vi.mocked(updateDoc).mock.calls.at(-1)![1] as Record<
        string,
        unknown
      >;
      expect(lastCallArg).not.toHaveProperty('photoURL');
    });
  });

  describe('TC-OA-005: login metadata is always written', () => {
    /**
     * Regardless of photo logic, lastLogin, lastLoginProvider, and updatedAt
     * must always be written on every OAuth login.
     */
    it('always writes login metadata when user has existing photo', async () => {
      vi.mocked(signInWithPopup).mockResolvedValue(mockCredential as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          photoURL: 'https://storage.googleapis.com/custom-photo.jpg',
        }),
      } as any);

      await signInWithOAuth('google');

      expect(updateDoc).toHaveBeenCalled();
      const lastCallArg = vi.mocked(updateDoc).mock.calls.at(-1)![1] as Record<
        string,
        unknown
      >;
      expect(lastCallArg).toHaveProperty('lastLogin');
      expect(lastCallArg).toHaveProperty('lastLoginProvider', 'google');
      expect(lastCallArg).toHaveProperty('updatedAt');
    });
  });
});
