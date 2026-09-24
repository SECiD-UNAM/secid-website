// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import React from 'react';

// Shared callback holders -- reset per test.
let capturedAuthCallback: ((user: any) => void) | null = null;
// One snapshot-next holder per onSnapshot call, indexed by call order.
let snapshotNexts: Array<(snapshot: any) => void> = [];
const snapshotUnsubs: Array<ReturnType<typeof vi.fn>> = [];
const mockGetIdToken = vi.fn(() => Promise.resolve('tok'));
const authState = { currentUser: null as any };

// isFeatureEnabled is mocked per-test so we control alias resolution.
const isFeatureEnabledMock = vi.fn(() => true);

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

vi.mock('@/lib/beta', () => ({
  isFeatureEnabled: (...args: any[]) => isFeatureEnabledMock(...args),
}));

vi.mock('firebase/firestore', () => ({
  // doc() returns a marker carrying the requested uid so the test can
  // assert which document each onSnapshot call targets.
  doc: vi.fn((_db, _col, uid) => ({ __uid: uid })),
  onSnapshot: vi.fn((ref, next) => {
    snapshotNexts.push(next);
    const unsub = vi.fn();
    unsub.__ref = ref;
    snapshotUnsubs.push(unsub);
    return unsub;
  }),
  getDoc: vi.fn(),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function TestConsumer() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="error">{ctx.error ?? 'none'}</span>
      <span data-testid="profile">
        {ctx.userProfile?.displayName ?? 'null'}
      </span>
      <span data-testid="uid">{ctx.userProfile?.uid ?? 'null'}</span>
    </div>
  );
}

const CANONICAL = {
  uid: 'canon1',
  email: 'canon@b.com',
  displayName: 'Canonical Member',
  role: 'member',
  isVerified: true,
};

async function mountAndAuth() {
  const utils = render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
  await act(async () => {
    /* flush authStateReady().then() */
  });
  const fakeUser = {
    uid: 'alias1',
    email: 'alias@b.com',
    getIdToken: mockGetIdToken,
  };
  authState.currentUser = fakeUser;
  await act(async () => {
    capturedAuthCallback?.(fakeUser);
  });
  return utils;
}

describe.sequential('AuthContext alias resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAuthCallback = null;
    snapshotNexts = [];
    snapshotUnsubs.length = 0;
    authState.currentUser = null;
    isFeatureEnabledMock.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('flag OFF: alias stub is surfaced as-is, no redirect', async () => {
    isFeatureEnabledMock.mockReturnValue(false);
    await mountAndAuth();

    await act(async () => {
      snapshotNexts[0]?.({
        exists: () => true,
        data: () => ({ aliasOf: 'canon1', displayName: 'Alias Stub' }),
        id: 'alias1',
      });
    });

    // Only the original (alias) listener — no canonical re-subscription.
    expect(snapshotNexts.length).toBe(1);
    expect(screen.getByTestId('profile')).toHaveTextContent('Alias Stub');
    expect(screen.getByTestId('uid')).toHaveTextContent('alias1');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('flag ON + aliasOf: canonical profile surfaced, loading clears from canonical', async () => {
    await mountAndAuth();

    // Alias stub snapshot -> should trigger re-subscribe, NOT clear loading.
    await act(async () => {
      snapshotNexts[0]?.({
        exists: () => true,
        data: () => ({ aliasOf: 'canon1', displayName: 'Alias Stub' }),
        id: 'alias1',
      });
    });

    // A second onSnapshot (canonical doc) must have been created.
    expect(snapshotNexts.length).toBe(2);
    expect(snapshotUnsubs[0]).toHaveBeenCalled(); // alias stub torn down
    // Loading must still be true — it clears from the canonical snapshot.
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('profile')).toHaveTextContent('null');

    // Deliver canonical snapshot.
    await act(async () => {
      snapshotNexts[1]?.({
        exists: () => true,
        data: () => CANONICAL,
        id: 'canon1',
      });
    });

    expect(screen.getByTestId('profile')).toHaveTextContent('Canonical Member');
    expect(screen.getByTestId('uid')).toHaveTextContent('canon1');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
    // Loading cleared from the canonical snapshot.
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('alias -> alias: error + null profile, loading still resolves', async () => {
    await mountAndAuth();

    await act(async () => {
      snapshotNexts[0]?.({
        exists: () => true,
        data: () => ({ aliasOf: 'canon1', displayName: 'Alias Stub' }),
        id: 'alias1',
      });
    });
    expect(snapshotNexts.length).toBe(2);

    // Canonical doc itself ALSO has aliasOf -> must fail closed, no loop.
    await act(async () => {
      snapshotNexts[1]?.({
        exists: () => true,
        data: () => ({ aliasOf: 'canon2', displayName: 'Another Alias' }),
        id: 'canon1',
      });
    });

    // No third subscription — resolution did not loop.
    expect(snapshotNexts.length).toBe(2);
    expect(screen.getByTestId('profile')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent(
      'Linked account could not be resolved'
    );
    // Loading still resolved even on the fail-closed path.
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('missing canonical target: error + null profile, loading resolves', async () => {
    await mountAndAuth();

    await act(async () => {
      snapshotNexts[0]?.({
        exists: () => true,
        data: () => ({ aliasOf: 'ghost', displayName: 'Alias Stub' }),
        id: 'alias1',
      });
    });
    expect(snapshotNexts.length).toBe(2);

    await act(async () => {
      snapshotNexts[1]?.({
        exists: () => false,
        data: () => ({}),
        id: 'ghost',
      });
    });

    expect(screen.getByTestId('profile')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent(
      'Linked account could not be resolved'
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
});
