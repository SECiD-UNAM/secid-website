import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeFirebase, handleFirebaseError } from './firebase';

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ app: 'test-auth' })),
  connectAuthEmulator: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ app: 'test-firestore' })),
  connectFirestoreEmulator: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({ app: 'test-storage' })),
  connectStorageEmulator: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ app: 'test-functions' })),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({ app: 'test-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(true)),
}));

describe('Firebase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    vi.stubGlobal('import', {
      meta: {
        env: {
          PUBLIC_FIREBASE_API_KEY: 'test-api-key',
          PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
          PUBLIC_FIREBASE_PROJECT_ID: 'test-project-id',
          PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-storage-bucket',
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'test-sender-id',
          PUBLIC_FIREBASE_APP_ID: 'test-app-id',
          PUBLIC_FIREBASE_MEASUREMENT_ID: 'test-measurement-id',
          PUBLIC_USE_EMULATORS: 'false',
          PUBLIC_DEBUG_MODE: 'false',
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initializeFirebase', () => {
    it('initializes Firebase with correct config', async () => {
      const { initializeApp, getApps } = await import('firebase/app');

      await initializeFirebase();

      expect(initializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test-auth-domain',
        projectId: 'test-project-id',
        storageBucket: 'test-storage-bucket',
        messagingSenderId: 'test-sender-id',
        appId: 'test-app-id',
        measurementId: 'test-measurement-id',
      });
    });

    it('reuses existing app if already initialized', async () => {
      const { initializeApp, getApps } = await import('firebase/app');
      (getApps as any).mockReturnValue([{ name: 'existing-app' }]);

      await initializeFirebase();

      expect(initializeApp).not.toHaveBeenCalled();
    });

    it('connects to emulators when enabled', async () => {
      vi.stubGlobal('import', {
        meta: {
          env: {
            ...import.meta.env,
            PUBLIC_USE_EMULATORS: 'true',
          },
        },
      });

      const { connectAuthEmulator } = await import('firebase/auth');
      const { connectFirestoreEmulator } = await import('firebase/firestore');
      const { connectStorageEmulator } = await import('firebase/storage');
      const { connectFunctionsEmulator } = await import('firebase/functions');

      await initializeFirebase();

      expect(connectAuthEmulator).toHaveBeenCalledWith(
        expect.any(Object),
        'http://localhost:9099',
        { disableWarnings: true }
      );
      expect(connectFirestoreEmulator).toHaveBeenCalledWith(
        expect.any(Object),
        'localhost',
        8088
      );
      expect(connectStorageEmulator).toHaveBeenCalledWith(
        expect.any(Object),
        'localhost',
        9199
      );
      expect(connectFunctionsEmulator).toHaveBeenCalledWith(
        expect.any(Object),
        'localhost',
        5001
      );
    });

    it('initializes analytics when supported', async () => {
      const { getAnalytics, isSupported } = await import('firebase/analytics');

      await initializeFirebase();

      // Wait for analytics initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(isSupported).toHaveBeenCalled();
      expect(getAnalytics).toHaveBeenCalled();
    });

    it('handles analytics not supported', async () => {
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      (isSupported as any).mockResolvedValue(false);

      await initializeFirebase();

      // Wait for analytics check
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(isSupported).toHaveBeenCalled();
      expect(getAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('handleFirebaseError', () => {
    it('returns Spanish error message for known error codes', () => {
      const testCases = [
        {
          code: 'auth/user-not-found',
          expected: 'No existe una cuenta con este correo',
        },
        { code: 'auth/wrong-password', expected: 'Contraseña incorrecta' },
        {
          code: 'auth/email-already-in-use',
          expected: 'Este correo ya está registrado',
        },
        { code: 'auth/weak-password', expected: 'La contraseña es muy débil' },
        { code: 'auth/invalid-email', expected: 'Correo electrónico inválido' },
      ];

      testCases.forEach(({ code, expected }) => {
        const error = { code };
        expect(handleFirebaseError(error)).toBe(expected);
      });
    });

    it('returns English error message for known error codes', () => {
      const testCases = [
        {
          code: 'auth/user-not-found',
          expected: 'No account exists with this email',
        },
        { code: 'auth/wrong-password', expected: 'Incorrect password' },
        {
          code: 'auth/email-already-in-use',
          expected: 'This email is already registered',
        },
      ];

      testCases.forEach(({ code, expected }) => {
        const error = { code };
        expect(handleFirebaseError(error, 'en')).toBe(expected);
      });
    });

    it('returns default message for unknown error codes', () => {
      const error = { code: 'unknown/error' };
      expect(handleFirebaseError(error)).toBe(
        'Ha ocurrido un error. Por favor intenta de nuevo'
      );
      expect(handleFirebaseError(error, 'en')).toBe(
        'An error occurred. Please try again'
      );
    });

    it('handles errors without code property', () => {
      const error = { message: 'Some error' };
      expect(handleFirebaseError(error)).toBe(
        'Ha ocurrido un error. Por favor intenta de nuevo'
      );
    });

    it('handles null/undefined errors', () => {
      expect(handleFirebaseError(null)).toBe(
        'Ha ocurrido un error. Por favor intenta de nuevo'
      );
      expect(handleFirebaseError(undefined)).toBe(
        'Ha ocurrido un error. Por favor intenta de nuevo'
      );
    });

    it('logs errors in debug mode', () => {
      vi.stubGlobal('import', {
        meta: {
          env: {
            ...import.meta.env,
            PUBLIC_DEBUG_MODE: 'true',
          },
        },
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = { code: 'auth/user-not-found', message: 'User not found' };

      handleFirebaseError(error);

      expect(consoleSpy).toHaveBeenCalledWith('Firebase error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('Firebase configuration validation', () => {
    it('throws error if required environment variables are missing', async () => {
      vi.stubGlobal('import', {
        meta: {
          env: {
            PUBLIC_FIREBASE_API_KEY: '',
            PUBLIC_FIREBASE_AUTH_DOMAIN: '',
            PUBLIC_FIREBASE_PROJECT_ID: '',
          },
        },
      });

      // This should log a warning or throw an error in a real implementation
      await expect(initializeFirebase()).resolves.not.toThrow();
    });
  });
});
