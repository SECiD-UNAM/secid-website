// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import RequirePermission from '@/components/rbac/RequirePermission';

const mockCan = vi.fn();
const mockPermissionsHook = {
  can: mockCan,
  loading: false,
  permissions: null,
};

vi.mock('@/lib/rbac/hooks', () => ({
  usePermissions: vi.fn(() => mockPermissionsHook),
}));

function resetMock() {
  mockCan.mockReset();
  mockPermissionsHook.loading = false;
  mockPermissionsHook.permissions = null;
}

function setup() {
  vi.clearAllMocks();
  resetMock();
}

function teardown() {
  cleanup();
  vi.restoreAllMocks();
}

describe('RequirePermission: renders children when permission granted', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-gate-001: shows children when can() returns true', () => {
    /** Verifies: AC-gate-renders-children */
    mockCan.mockReturnValue(true);

    render(
      <RequirePermission resource="events" operation="create">
        <div data-testid="protected-content">Secret Content</div>
      </RequirePermission>
    );

    expect(screen.getByTestId('protected-content')).toBeDefined();
    expect(screen.getByText('Secret Content')).toBeDefined();
    expect(mockCan).toHaveBeenCalledWith('events', 'create', undefined);
  });

  it('TC-rbac-gate-002: passes scope to can()', () => {
    /** Verifies: AC-gate-passes-scope */
    mockCan.mockReturnValue(true);

    render(
      <RequirePermission resource="users" operation="edit" scope="all">
        <div>Content</div>
      </RequirePermission>
    );

    expect(mockCan).toHaveBeenCalledWith('users', 'edit', 'all');
  });
});

describe('RequirePermission: renders AccessDenied when permission denied', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-gate-003: shows AccessDenied when can() returns false', () => {
    /** Verifies: AC-gate-renders-access-denied */
    mockCan.mockReturnValue(false);

    render(
      <RequirePermission resource="events" operation="delete">
        <div data-testid="protected-content">Secret Content</div>
      </RequirePermission>
    );

    expect(screen.queryByTestId('protected-content')).toBeNull();
    // AccessDenied component should render with access denied text
    expect(screen.getByText(/Access Denied|Acceso Denegado/i)).toBeDefined();
  });
});

describe('RequirePermission: renders loading spinner while loading', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-gate-004: shows spinner when loading is true', () => {
    /** Verifies: AC-gate-loading */
    mockPermissionsHook.loading = true;

    const { container } = render(
      <RequirePermission resource="events" operation="create">
        <div data-testid="protected-content">Secret Content</div>
      </RequirePermission>
    );

    expect(screen.queryByTestId('protected-content')).toBeNull();
    // Spinner is an animated div with specific classes
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });
});

describe('RequirePermission: renders custom fallback when provided', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-gate-005: shows custom fallback instead of AccessDenied', () => {
    /** Verifies: AC-gate-custom-fallback */
    mockCan.mockReturnValue(false);

    render(
      <RequirePermission
        resource="events"
        operation="delete"
        fallback={<div data-testid="custom-fallback">Custom Denied</div>}
      >
        <div data-testid="protected-content">Secret Content</div>
      </RequirePermission>
    );

    expect(screen.queryByTestId('protected-content')).toBeNull();
    expect(screen.getByTestId('custom-fallback')).toBeDefined();
    expect(screen.getByText('Custom Denied')).toBeDefined();
    // Should NOT show the default AccessDenied
    expect(screen.queryByText(/Access Denied|Acceso Denegado/i)).toBeNull();
  });
});
