// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import React from 'react';

// Shared callback holders -- reset per test
let capturedAuthCallback: ((user: any) => void) | null = null;
let capturedSnapshotNext: ((snapshot: any) => void) | null = null;
let capturedSnapshotError: ((err: any) => void) | null = null;
const mockSnapshotUnsub = vi.fn();
const mockGetIdToken = vi.fn(() => Promise.resolve('tok'));

// Mutable holder for currentUser, referenced via getter in mock
const authState = { currentUser: null as any };

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_a, cb) => {
    capturedAuthCallback = cb;
    return vi.fn();
  }),
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    authStateReady: () => Promise.resolve(),
    get currentUser() {
      return authState.currentUser;
    },
  },
  db: {},
  isEmulatorMode: () => false,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn((_ref, next, err) => {
    capturedSnapshotNext = next;
    capturedSnapshotError = err;
    return mockSnapshotUnsub;
  }),
  getDoc: vi.fn(),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { onSnapshot } from 'firebase/firestore';

function TestConsumer() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="error">{ctx.error ?? 'none'}</span>
      <span data-testid="profile">{ctx.userProfile?.displayName ?? 'null'}</span>
      <span data-testid="verified">{String(ctx.isVerified)}</span>
    </div>
  );
}

const PROFILE = {
  uid: 'u1',
  email: 'a@b.com',
  firstName: 'A',
  lastName: 'B',
  displayName: 'A B',
  role: 'member',
  isVerified: true,
  isActive: true,
  membershipTier: 'free',
};

async function setup() {
  const utils = render(
    <AuthProvider><TestConsumer /></AuthProvider>
  );
  // Let authStateReady().then() run
  await act(async () => { /* microtask flush */ });

  // Simulate authenticated user
  const fakeUser = { uid: 'u1', email: 'a@b.com', displayName: 'A B', getIdToken: mockGetIdToken };
  authState.currentUser = fakeUser;
  await act(async () => { capturedAuthCallback?.(fakeUser); });

  // Deliver profile snapshot
  await act(async () => {
    capturedSnapshotNext?.({ exists: () => true, data: () => PROFILE, id: 'u1' });
  });

  return utils;
}

// Sequential wrapper — these tests share mutable mock callbacks and
// must not run concurrently (vitest config has sequence.concurrent: true)
describe.sequential('AuthContext session resilience', () => {
  describe('profile retained on transient error', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      authState.currentUser = null;
      capturedAuthCallback = null;
      capturedSnapshotNext = null;
      capturedSnapshotError = null;
    });

    afterEach(() => {
      cleanup();
    });

    it('keeps profile when onSnapshot fires a non-permission error', async () => {
      await setup();

      expect(screen.getByTestId('profile')).toHaveTextContent('A B');
      expect(screen.getByTestId('verified')).toHaveTextContent('true');

      await act(async () => {
        capturedSnapshotError?.({ code: 'unavailable', message: 'oops' });
      });

      // Profile must survive the error
      expect(screen.getByTestId('profile')).toHaveTextContent('A B');
      expect(screen.getByTestId('verified')).toHaveTextContent('true');
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to load user profile');
    });
  });

  describe('permission-denied recovery', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers({ shouldAdvanceTime: true });
      authState.currentUser = null;
      capturedAuthCallback = null;
      capturedSnapshotNext = null;
      capturedSnapshotError = null;
    });

    afterEach(() => {
      cleanup();
      vi.useRealTimers();
    });

    it('refreshes token and re-subscribes after permission-denied', async () => {
      await setup();

      const callsBefore = vi.mocked(onSnapshot).mock.calls.length;

      await act(async () => {
        capturedSnapshotError?.({ code: 'permission-denied', message: 'denied' });
      });

      // Profile should survive
      expect(screen.getByTestId('profile')).toHaveTextContent('A B');

      // Advance past the 2 s delay and flush microtasks
      await act(async () => {
        vi.advanceTimersByTime(2100);
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockGetIdToken).toHaveBeenCalledWith(true);
      expect(vi.mocked(onSnapshot).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe('visibility token refresh', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      authState.currentUser = null;
      capturedAuthCallback = null;
      capturedSnapshotNext = null;
      capturedSnapshotError = null;
    });

    afterEach(() => {
      cleanup();
    });

    it('refreshes token when tab becomes visible with an active user', async () => {
      await setup();
      mockGetIdToken.mockClear();

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', writable: true, configurable: true,
      });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(mockGetIdToken).toHaveBeenCalledWith(true);
    });

    it('skips refresh when no current user', async () => {
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await act(async () => { /* flush authStateReady */ });

      authState.currentUser = null;
      mockGetIdToken.mockClear();

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', writable: true, configurable: true,
      });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(mockGetIdToken).not.toHaveBeenCalled();
    });
  });
});
