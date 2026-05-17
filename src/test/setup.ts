import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Global Firebase client stub.
//
// src/lib/firebase.ts initialises Firestore/Auth and calls
// connect*Emulator() at module scope. Any test that *transitively* imports
// it (via a component or lib) therefore opens a real Firestore connection
// that is never closed — a leaked handle that keeps Vitest workers alive
// and hangs the run indefinitely (independent of whether an emulator is
// actually listening). Mocking the module here means the real
// connection-opening code never executes for the unit suite.
//
// This is a safety net only: test files that declare their own
// vi.mock('@/lib/firebase', ...) still override this per-file.
vi.mock('@/lib/firebase', () => ({
  app: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signOut: async () => {},
  },
  db: {},
  storage: {},
  functions: {},
  analytics: null,
  isEmulatorMode: () => false,
  getEmulatorStatus: () => ({ enabled: false }),
  isFirebaseInitialized: () => true,
  handleFirebaseError: (error: any) =>
    (error && error.message) || 'Firebase error',
  isUsingMockAPI: () => true,
  isDemoMode: () => true,
}));

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
  clear: () => localStorage.clear(),
  length: 0,
  key: () => null,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: (key: string) => sessionStorage.getItem(key),
  setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
  removeItem: (key: string) => sessionStorage.removeItem(key),
  clear: () => sessionStorage.clear(),
  length: 0,
  key: () => null,
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});
