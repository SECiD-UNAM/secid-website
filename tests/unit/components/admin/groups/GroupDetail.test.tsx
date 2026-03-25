// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import GroupDetail from '@/components/admin/GroupDetail';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCan = vi.fn().mockReturnValue(true);
const mockPermissionsHook = { can: mockCan, loading: false, permissions: null };

vi.mock('@/lib/rbac/hooks', () => ({
  usePermissions: () => mockPermissionsHook,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'admin-uid' } }),
}));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] });

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _col, id) => ({ path: `${_col}/${id}` })),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  collection: vi.fn(),
  query: vi.fn((...args) => args),
  where: vi.fn(),
  limit: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

const sampleGroup = {
  name: 'Content Editors',
  description: 'Can edit all content types',
  permissions: [
    { resource: 'blog', operation: 'edit', scope: 'all', effect: 'allow' },
    { resource: 'events', operation: 'create', scope: 'all', effect: 'allow' },
  ],
  isSystem: false,
  createdBy: 'admin-uid',
  createdAt: { toDate: () => new Date('2026-01-15') },
  updatedAt: null,
};

function setup() {
  mockCan.mockReset().mockReturnValue(true);
  mockGetDoc.mockReset().mockResolvedValue({
    exists: () => true,
    id: 'group-editors',
    data: () => sampleGroup,
  });
  mockGetDocs.mockReset().mockResolvedValue({ docs: [] });
  mockPermissionsHook.loading = false;
}

function teardown() {
  cleanup();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GroupDetail: info', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-detail-001: shows group name, description, and permission count', async () => {
    /** Verifies: AC-group-detail-info */
    const { container, findByText } = render(
      <GroupDetail lang="en" groupId="group-editors" />
    );
    const view = within(container);

    await findByText('Content Editors');

    expect(view.getByText('Can edit all content types')).toBeDefined();
    expect(view.getByText('2 permissions')).toBeDefined();
  });
});

describe('GroupDetail: system badge', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-detail-002: shows system badge for system groups', async () => {
    /** Verifies: AC-group-detail-system-badge */
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'group-admin',
      data: () => ({ ...sampleGroup, isSystem: true, name: 'Admins' }),
    });

    const { container, findByText } = render(
      <GroupDetail lang="en" groupId="group-admin" />
    );
    const view = within(container);

    await findByText('Admins');
    expect(view.getByText('System')).toBeDefined();
  });
});

describe('GroupDetail: read-only matrix', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-detail-003: renders read-only permission matrix', async () => {
    /** Verifies: AC-group-detail-permissions-readonly */
    const { container, findByText } = render(
      <GroupDetail lang="en" groupId="group-editors" />
    );
    const view = within(container);

    await findByText('Content Editors');
    expect(view.getByText('Permissions')).toBeDefined();

    // All select elements should be disabled
    const selects = view.getAllByRole('combobox');
    expect(selects.every((s) => s.disabled)).toBe(true);
  });
});

describe('GroupDetail: navigation', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-detail-004: shows edit and back links', async () => {
    /** Verifies: AC-group-detail-navigation */
    const { container, findByText } = render(
      <GroupDetail lang="en" groupId="group-editors" />
    );
    const view = within(container);

    await findByText('Content Editors');

    const editLink = view.getByText('Edit Group');
    expect(editLink.closest('a').getAttribute('href')).toBe(
      '/en/dashboard/admin/groups/edit/group-editors'
    );

    const backLink = view.getByText('Back to Groups');
    expect(backLink.closest('a').getAttribute('href')).toBe(
      '/en/dashboard/admin/groups'
    );
  });
});

describe('GroupDetail: edit gate', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-detail-005: hides edit button when user lacks edit permission', async () => {
    /** Verifies: AC-group-detail-edit-gate */
    mockCan.mockImplementation((resource, operation) => {
      if (resource === 'groups' && operation === 'edit') return false;
      return true;
    });

    const { container, findByText } = render(
      <GroupDetail lang="en" groupId="group-editors" />
    );
    const view = within(container);

    await findByText('Content Editors');
    expect(view.queryByText('Edit Group')).toBeNull();
  });
});

describe('GroupDetail: not found', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-detail-006: shows not found error for missing group', async () => {
    /** Verifies: AC-group-detail-not-found */
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const { container, findByText } = render(
      <GroupDetail lang="en" groupId="nonexistent" />
    );

    await findByText('Group not found.');
    expect(within(container).getByText('Group not found.')).toBeDefined();
  });
});

describe('GroupDetail: permission gate', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-detail-007: shows AccessDenied when user lacks view permission', () => {
    /** Verifies: AC-group-detail-permission-gate */
    mockCan.mockReturnValue(false);

    const { container } = render(
      <GroupDetail lang="en" groupId="group-editors" />
    );
    const view = within(container);

    expect(view.getByText(/Access Denied|Acceso Denegado/i)).toBeDefined();
  });
});
