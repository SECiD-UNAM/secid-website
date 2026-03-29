import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/auth before any imports that depend on it
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  linkWithCredential: vi.fn(),
  OAuthProvider: {
    credentialFromError: vi.fn(),
  },
}));

// Mock @/lib/firebase
vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
  isDemoMode: false,
}));

// Mock firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

// Mock oauth-providers
vi.mock('@/lib/auth/oauth-providers', () => ({
  getProvider: vi.fn(),
}));

import { signInWithPopup, linkWithCredential, OAuthProvider } from 'firebase/auth';
import { getDocs } from 'firebase/firestore';
import { getProvider } from '@/lib/auth/oauth-providers';
import { handleAccountExistsError, completeMerge } from '@/lib/auth/auto-merge';

describe.sequential('handleAccountExistsError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-AM-001: returns null for non-conflict errors', () => {
    /**
     * Verifies: AC-merge-03 — non-conflict errors are passed through
     */
    it('returns null when error code is not account-exists-with-different-credential', async () => {
      const error = { code: 'auth/popup-closed-by-user' };

      const result = await handleAccountExistsError(error);

      expect(result).toBeNull();
    });

    it('returns null when error has no code', async () => {
      const error = new Error('Generic error');

      const result = await handleAccountExistsError(error);

      expect(result).toBeNull();
    });
  });

  describe('TC-AM-002: returns null when required data is missing', () => {
    /**
     * Verifies: AC-merge-01 — handles incomplete error data gracefully
     */
    it('returns null when email is missing from customData', async () => {
      const error = {
        code: 'auth/account-exists-with-different-credential',
        customData: {},
      };

      const result = await handleAccountExistsError(error);

      expect(result).toBeNull();
    });

    it('returns null when customData is absent', async () => {
      const error = {
        code: 'auth/account-exists-with-different-credential',
      };

      const result = await handleAccountExistsError(error);

      expect(result).toBeNull();
    });

    it('returns null when OAuthProvider.credentialFromError returns null', async () => {
      vi.mocked(OAuthProvider.credentialFromError).mockReturnValue(null);

      const error = {
        code: 'auth/account-exists-with-different-credential',
        customData: { email: 'user@example.com' },
      };

      const result = await handleAccountExistsError(error);

      expect(result).toBeNull();
    });

    it('returns null when no user found in Firestore', async () => {
      vi.mocked(OAuthProvider.credentialFromError).mockReturnValue({ providerId: 'github.com' } as any);
      vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as any);

      const error = {
        code: 'auth/account-exists-with-different-credential',
        customData: { email: 'user@example.com' },
      };

      const result = await handleAccountExistsError(error);

      expect(result).toBeNull();
    });
  });

  describe('TC-AM-003: returns PendingMerge when all data is available', () => {
    /**
     * Verifies: AC-merge-01 — extracts merge data from conflict error
     */
    it('returns PendingMerge with correct fields when user exists in Firestore', async () => {
      const mockCredential = { providerId: 'github.com' };
      vi.mocked(OAuthProvider.credentialFromError).mockReturnValue(mockCredential as any);
      vi.mocked(getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ lastLoginProvider: 'google' }) }],
      } as any);

      const error = {
        code: 'auth/account-exists-with-different-credential',
        customData: { email: 'user@example.com' },
      };

      const result = await handleAccountExistsError(error);

      expect(result).toEqual({
        email: 'user@example.com',
        pendingCredential: mockCredential,
        existingProvider: 'google',
      });
    });

    it('defaults existingProvider to google when lastLoginProvider is missing', async () => {
      const mockCredential = { providerId: 'github.com' };
      vi.mocked(OAuthProvider.credentialFromError).mockReturnValue(mockCredential as any);
      vi.mocked(getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({}) }],
      } as any);

      const error = {
        code: 'auth/account-exists-with-different-credential',
        customData: { email: 'user@example.com' },
      };

      const result = await handleAccountExistsError(error);

      expect(result?.existingProvider).toBe('google');
    });
  });
});

describe.sequential('completeMerge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-AM-004: signs in with existing provider and links credential', () => {
    /**
     * Verifies: AC-merge-05 — merge completes by signing in then linking
     */
    it('calls signInWithPopup with the existing provider', async () => {
      const mockProvider = { providerId: 'google.com' };
      const mockUser = { uid: 'user123' };
      vi.mocked(getProvider).mockReturnValue(mockProvider as any);
      vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any);
      vi.mocked(linkWithCredential).mockResolvedValue({} as any);

      const pendingCredential = { providerId: 'github.com' };
      await completeMerge('google', pendingCredential);

      expect(getProvider).toHaveBeenCalledWith('google');
      expect(signInWithPopup).toHaveBeenCalled();
    });

    it('links the pending credential to the signed-in user', async () => {
      const mockProvider = { providerId: 'google.com' };
      const mockUser = { uid: 'user123' };
      vi.mocked(getProvider).mockReturnValue(mockProvider as any);
      vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any);
      vi.mocked(linkWithCredential).mockResolvedValue({} as any);

      const pendingCredential = { providerId: 'github.com' };
      await completeMerge('google', pendingCredential);

      expect(linkWithCredential).toHaveBeenCalledWith(mockUser, pendingCredential);
    });

    it('propagates error if signInWithPopup fails', async () => {
      const mockProvider = { providerId: 'google.com' };
      vi.mocked(getProvider).mockReturnValue(mockProvider as any);
      vi.mocked(signInWithPopup).mockRejectedValue(new Error('Popup closed'));

      const pendingCredential = { providerId: 'github.com' };

      await expect(completeMerge('google', pendingCredential)).rejects.toThrow('Popup closed');
    });

    it('propagates error if linkWithCredential fails', async () => {
      const mockProvider = { providerId: 'google.com' };
      const mockUser = { uid: 'user123' };
      vi.mocked(getProvider).mockReturnValue(mockProvider as any);
      vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any);
      vi.mocked(linkWithCredential).mockRejectedValue(new Error('Credential already in use'));

      const pendingCredential = { providerId: 'github.com' };

      await expect(completeMerge('google', pendingCredential)).rejects.toThrow(
        'Credential already in use'
      );
    });

    it('supports github as existing provider', async () => {
      const mockProvider = { providerId: 'github.com' };
      const mockUser = { uid: 'user123' };
      vi.mocked(getProvider).mockReturnValue(mockProvider as any);
      vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any);
      vi.mocked(linkWithCredential).mockResolvedValue({} as any);

      const pendingCredential = { providerId: 'google.com' };
      await completeMerge('github', pendingCredential);

      expect(getProvider).toHaveBeenCalledWith('github');
    });
  });
});
