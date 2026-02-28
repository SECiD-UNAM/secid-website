import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all Firebase SDK modules and the logger before the module-under-test
// is imported (firebase.ts runs side-effects at the top level).

vi.mock('@/lib/logger', () => ({
  firebaseLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    app: 'mock-auth',
    currentUser: null,
  })),
  connectAuthEmulator: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserLocalPersistence: { type: 'LOCAL' },
}));

vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({ app: 'mock-firestore' })),
  getFirestore: vi.fn(() => ({ app: 'mock-firestore' })),
  connectFirestoreEmulator: vi.fn(),
  persistentLocalCache: vi.fn(() => ({})),
  persistentMultipleTabManager: vi.fn(() => ({})),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({ app: 'mock-storage' })),
  connectStorageEmulator: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ app: 'mock-functions' })),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({ app: 'mock-analytics' })),
  isSupported: vi.fn(() => Promise.resolve(false)),
}));

describe('Firebase Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Module exports', () => {
    it('exports service instances', async () => {
      const mod = await import('@/lib/firebase');
      expect(mod.app).toBeDefined();
      expect(mod.auth).toBeDefined();
      expect(mod.db).toBeDefined();
      expect(mod.storage).toBeDefined();
      expect(mod.functions).toBeDefined();
    });

    it('exports utility functions', async () => {
      const mod = await import('@/lib/firebase');
      expect(typeof mod.handleFirebaseError).toBe('function');
      expect(typeof mod.isFirebaseInitialized).toBe('function');
      expect(typeof mod.isEmulatorMode).toBe('function');
      expect(typeof mod.getEmulatorStatus).toBe('function');
      expect(typeof mod.isUsingMockAPI).toBe('function');
    });
  });

  describe('handleFirebaseError', () => {
    it('returns Spanish message for known auth error codes', async () => {
      const { handleFirebaseError } = await import('@/lib/firebase');

      expect(handleFirebaseError({ code: 'auth/user-not-found' })).toBe(
        'Usuario no encontrado'
      );
      expect(handleFirebaseError({ code: 'auth/wrong-password' })).toBe(
        'Contrasena incorrecta'
      );
      expect(handleFirebaseError({ code: 'auth/email-already-in-use' })).toBe(
        'El correo electronico ya esta en uso'
      );
      expect(handleFirebaseError({ code: 'auth/weak-password' })).toBe(
        'La contrasena es muy debil'
      );
      expect(handleFirebaseError({ code: 'auth/invalid-email' })).toBe(
        'Correo electronico invalido'
      );
    });

    it('returns Spanish message for known Firestore error codes', async () => {
      const { handleFirebaseError } = await import('@/lib/firebase');

      expect(handleFirebaseError({ code: 'permission-denied' })).toBe(
        'No tienes permisos para realizar esta accion'
      );
      expect(handleFirebaseError({ code: 'not-found' })).toBe(
        'Recurso no encontrado'
      );
    });

    it('returns fallback for unknown error codes', async () => {
      const { handleFirebaseError } = await import('@/lib/firebase');

      const error = { code: 'some/unknown-code', message: 'Something went wrong' };
      expect(handleFirebaseError(error)).toBe('Error: Something went wrong');
    });

    it('handles null/undefined errors gracefully', async () => {
      const { handleFirebaseError } = await import('@/lib/firebase');

      expect(handleFirebaseError(null)).toBe('Error desconocido');
      expect(handleFirebaseError(undefined)).toBe('Error desconocido');
    });

    it('handles errors without code property', async () => {
      const { handleFirebaseError } = await import('@/lib/firebase');

      const error = { message: 'Some error' };
      // Falls back to 'unknown' key
      expect(handleFirebaseError(error)).toBe('Error desconocido');
    });
  });

  describe('isEmulatorMode', () => {
    it('returns a boolean', async () => {
      const { isEmulatorMode } = await import('@/lib/firebase');
      expect(typeof isEmulatorMode()).toBe('boolean');
    });
  });

  describe('getEmulatorStatus', () => {
    it('returns status object with expected keys', async () => {
      const { getEmulatorStatus } = await import('@/lib/firebase');
      const status = getEmulatorStatus();
      expect(status).toHaveProperty('auth');
      expect(status).toHaveProperty('firestore');
      expect(status).toHaveProperty('storage');
      expect(status).toHaveProperty('functions');
      expect(status).toHaveProperty('ui');
    });
  });

  describe('isFirebaseInitialized', () => {
    it('returns a boolean', async () => {
      const { isFirebaseInitialized } = await import('@/lib/firebase');
      expect(typeof isFirebaseInitialized()).toBe('boolean');
    });
  });
});
