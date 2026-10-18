// @ts-nocheck
/**
 * usePermissions Hook Unit Tests
 *
 * Uses a stable module-level mock for useAuth. Each test uses waitFor
 * to properly wait for async state updates.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockGetIdTokenResult = vi.fn();

const mockUser = {
  uid: 'user-123',
  email: 'test@secid.mx',
  getIdTokenResult: mockGetIdTokenResult,
};

let currentUser: typeof mockUser | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: currentUser,
    userProfile: null,
    loading: false,
    isAuthenticated: !!currentUser,
    isVerified: false,
    isAdmin: false,
    isModerator: false,
    isCompany: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

const { usePermissions } = await import('@/lib/rbac/hooks');

beforeEach(() => {
  currentUser = null;
  mockGetIdTokenResult.mockReset();
});

describe('usePermissions: no user', () => {
  it('TC-rbac-hook-001: can() returns false when user is null', async () => {
    /** Verifies: AC-hook-no-user */
    currentUser = null;

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.can('events', 'create')).toBe(false);
    expect(result.current.can('users', 'view')).toBe(false);
    expect(result.current.permissions).toBeNull();
  });
});

describe('usePermissions: no RBAC claims', () => {
  it('TC-rbac-hook-002: can() returns false when claims have no rbac field', async () => {
    /** Verifies: AC-hook-no-claims */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({ claims: {} });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.can('events', 'create')).toBe(false);
    expect(result.current.permissions).toBeNull();
  });

  it('TC-rbac-hook-003: can() returns false when rbac.p is empty', async () => {
    /** Verifies: AC-hook-empty-permissions */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({ claims: { rbac: { p: '' } } });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.can('events', 'create')).toBe(false);
  });
});

describe('usePermissions: loading state transitions', () => {
  it('TC-rbac-hook-004: loading starts true and becomes false after resolution', async () => {
    /** Verifies: AC-hook-loading */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({
      claims: { rbac: { p: 'ev:c.a' } },
    });

    const { result } = renderHook(() => usePermissions());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('TC-rbac-hook-005: loading becomes false even on getIdTokenResult failure', async () => {
    /** Verifies: AC-hook-loading-error */
    currentUser = mockUser;
    mockGetIdTokenResult.mockRejectedValue(new Error('Token error'));

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toBeNull();
  });
});

describe('usePermissions: can() allowed and denied', () => {
  it('TC-rbac-hook-006: can() returns true for granted permission', async () => {
    /** Verifies: AC-hook-can-allowed */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({
      claims: { rbac: { p: 'ev:c.a,jo:v.o' } },
    });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.can('events', 'create')).toBe(true);
    expect(result.current.can('jobs', 'view')).toBe(true);
  });

  it('TC-rbac-hook-007: can() returns false for non-granted permission', async () => {
    /** Verifies: AC-hook-can-denied */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({
      claims: { rbac: { p: 'ev:c.a' } },
    });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.can('events', 'delete')).toBe(false);
    expect(result.current.can('users', 'create')).toBe(false);
  });

  it('TC-rbac-hook-008: can() respects scope parameter', async () => {
    /** Verifies: AC-hook-can-scope */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({
      claims: { rbac: { p: 'ev:c.o' } },
    });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.can('events', 'create', 'own')).toBe(true);
    expect(result.current.can('events', 'create', 'all')).toBe(false);
  });

  it('TC-rbac-hook-009: can() handles deny overrides', async () => {
    /** Verifies: AC-hook-can-deny */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({
      claims: { rbac: { p: 'ev:c.a,!ev:c.a' } },
    });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.can('events', 'create')).toBe(false);
  });

  it('TC-rbac-hook-010: can() handles wildcard permissions', async () => {
    /** Verifies: AC-hook-can-wildcard */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({
      claims: { rbac: { p: '*:*.a' } },
    });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.can('events', 'create')).toBe(true);
    expect(result.current.can('users', 'delete', 'all')).toBe(true);
    expect(result.current.can('forums', 'moderate')).toBe(true);
  });
});

describe('usePermissions: permissions object', () => {
  it('TC-rbac-hook-011: permissions contains decoded ResolvedPermissions', async () => {
    /** Verifies: AC-hook-permissions-exposed */
    currentUser = mockUser;
    mockGetIdTokenResult.mockResolvedValue({
      claims: { rbac: { p: 'ev:c.a,!jo:d.o' } },
    });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).not.toBeNull();
    expect(result.current.permissions!.allows).toEqual(
      expect.arrayContaining([
        { resource: 'events', operation: 'create', scope: 'all' },
      ])
    );
    expect(result.current.permissions!.denies).toEqual(
      expect.arrayContaining([
        { resource: 'jobs', operation: 'delete', scope: 'own' },
      ])
    );
  });
});
