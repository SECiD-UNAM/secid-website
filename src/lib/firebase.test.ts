import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase modules before importing the module under test.
// firebase.ts runs initialization at import time, so all mocks must be in place first.

vi.mock('./logger', () => ({
  firebaseLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ app: 'test-auth' })),
  connectAuthEmulator: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserLocalPersistence: { type: 'LOCAL' },
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ app: 'test-firestore' })),
  connectFirestoreEmulator: vi.fn(),
  enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
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

describe('Firebase module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleFirebaseError', () => {
    it('returns Spanish error message for known auth error codes', async () => {
      const { handleFirebaseError } = await import('./firebase');

      const testCases = [
        { code: 'auth/user-not-found', expected: 'Usuario no encontrado' },
        { code: 'auth/wrong-password', expected: 'Contrasena incorrecta' },
        {
          code: 'auth/email-already-in-use',
          expected: 'El correo electronico ya esta en uso',
        },
        { code: 'auth/weak-password', expected: 'La contrasena es muy debil' },
        { code: 'auth/invalid-email', expected: 'Correo electronico invalido' },
      ];

      testCases.forEach(({ code, expected }) => {
        const error = { code };
        expect(handleFirebaseError(error)).toBe(expected);
      });
    });

    it('returns Spanish error message for known Firestore error codes', async () => {
      const { handleFirebaseError } = await import('./firebase');

      expect(handleFirebaseError({ code: 'permission-denied' })).toBe(
        'No tienes permisos para realizar esta accion'
      );
      expect(handleFirebaseError({ code: 'not-found' })).toBe(
        'Recurso no encontrado'
      );
      expect(handleFirebaseError({ code: 'already-exists' })).toBe(
        'El recurso ya existe'
      );
    });

    it('returns fallback message for unknown error codes', async () => {
      const { handleFirebaseError } = await import('./firebase');

      const error = { code: 'unknown/error', message: 'Something broke' };
      expect(handleFirebaseError(error)).toBe('Error: Something broke');
    });

    it('handles errors without code property', async () => {
      const { handleFirebaseError } = await import('./firebase');

      const error = { message: 'Some error' };
      // Falls through to 'unknown' key in the map
      expect(handleFirebaseError(error)).toBe('Error desconocido');
    });

    it('handles null/undefined errors', async () => {
      const { handleFirebaseError } = await import('./firebase');

      // null/undefined -> errorCode = 'unknown'
      expect(handleFirebaseError(null)).toBe('Error desconocido');
      expect(handleFirebaseError(undefined)).toBe('Error desconocido');
    });
  });

  describe('isFirebaseInitialized', () => {
    it('returns a boolean', async () => {
      const { isFirebaseInitialized } = await import('./firebase');
      const result = isFirebaseInitialized();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isEmulatorMode', () => {
    it('returns a boolean', async () => {
      const { isEmulatorMode } = await import('./firebase');
      const result = isEmulatorMode();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getEmulatorStatus', () => {
    it('returns an object with service URLs or nulls', async () => {
      const { getEmulatorStatus } = await import('./firebase');
      const status = getEmulatorStatus();
      expect(status).toHaveProperty('auth');
      expect(status).toHaveProperty('firestore');
      expect(status).toHaveProperty('storage');
      expect(status).toHaveProperty('functions');
      expect(status).toHaveProperty('ui');
    });
  });

  describe('service exports', () => {
    it('exports app, auth, db, storage, functions', async () => {
      const mod = await import('./firebase');
      expect(mod.app).toBeDefined();
      expect(mod.auth).toBeDefined();
      expect(mod.db).toBeDefined();
      expect(mod.storage).toBeDefined();
      expect(mod.functions).toBeDefined();
    });
  });
});
