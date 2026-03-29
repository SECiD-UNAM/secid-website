// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, within, cleanup, waitFor, fireEvent } from '@testing-library/react';
import GroupMemberManager from '@/components/admin/GroupMemberManager';

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
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockSetDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _col, id) => ({ path: `${_col}/${id}` })),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  collection: vi.fn(),
  query: vi.fn((...args) => args),
  where: vi.fn(),
  limit: vi.fn(),
  arrayUnion: vi.fn((val) => ({ __arrayUnion: val })),
  arrayRemove: vi.fn((val) => ({ __arrayRemove: val })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

const userProfiles = {
  'user-1': {
    email: 'alice@example.com',
    displayName: 'Alice Smith',
    firstName: 'Alice',
    lastName: 'Smith',
  },
  'user-2': {
    email: 'bob@example.com',
    displayName: null,
    firstName: 'Bob',
    lastName: 'Jones',
  },
};

function setupWithMembers() {
  mockGetDocs.mockResolvedValue({
    docs: [
      { id: 'user-1', data: () => ({ groups: ['test-group-id'], userId: 'user-1' }) },
      { id: 'user-2', data: () => ({ groups: ['test-group-id'], userId: 'user-2' }) },
    ],
  });
  mockGetDoc.mockImplementation((ref) => {
    const uid = ref.path.split('/').pop();
    const profile = userProfiles[uid];
    if (profile) {
      return Promise.resolve({ exists: () => true, data: () => profile });
    }
    return Promise.resolve({ exists: () => false });
  });
}

function setup() {
  mockCan.mockReset().mockReturnValue(true);
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockUpdateDoc.mockReset().mockResolvedValue(undefined);
  mockSetDoc.mockReset().mockResolvedValue(undefined);
  mockPermissionsHook.loading = false;
}

function teardown() {
  cleanup();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GroupMemberManager: list members', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-member-001: lists all assigned users', async () => {
    /** Verifies: AC-group-member-list */
    setupWithMembers();
    const { container, findByText } = render(
      <GroupMemberManager lang="en" groupId="test-group-id" />
    );
    const view = within(container);

    await findByText('Alice Smith');
    expect(view.getByText('alice@example.com')).toBeDefined();
    expect(view.getByText('Bob Jones')).toBeDefined();
    expect(view.getByText('bob@example.com')).toBeDefined();
    expect(view.getByText('2 members')).toBeDefined();
  });
});

describe('GroupMemberManager: empty state', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-member-002: shows empty state when no members', async () => {
    /** Verifies: AC-group-member-empty */
    mockGetDocs.mockResolvedValue({ docs: [] });

    const { findByText } = render(
      <GroupMemberManager lang="en" groupId="empty-group" />
    );

    await findByText('No members assigned to this group yet.');
  });
});

describe('GroupMemberManager: remove', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-member-003: removes user after confirmation', async () => {
    /** Verifies: AC-group-member-remove */
    setupWithMembers();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { container, findByText } = render(
      <GroupMemberManager lang="en" groupId="test-group-id" />
    );
    const view = within(container);

    await findByText('Alice Smith');

    const removeButtons = view.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    expect(view.queryByText('Alice Smith')).toBeNull();
    expect(view.getByText('Bob Jones')).toBeDefined();
  });
});

describe('GroupMemberManager: permission gate', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-member-004: shows no-permission message when lacking assign', () => {
    /** Verifies: AC-group-member-assign-gate */
    mockCan.mockImplementation((resource, operation) => {
      if (resource === 'groups' && operation === 'assign') return false;
      return true;
    });

    const { container } = render(
      <GroupMemberManager lang="en" groupId="test-group-id" />
    );
    const view = within(container);

    expect(view.getByText(/do not have permission/i)).toBeDefined();
  });
});

describe('GroupMemberManager: search UI', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-member-005: has search input and button', async () => {
    /** Verifies: AC-group-member-search-ui */
    setupWithMembers();
    const { container, findByText } = render(
      <GroupMemberManager lang="en" groupId="test-group-id" />
    );
    const view = within(container);

    await findByText('Alice Smith');
    expect(view.getByPlaceholderText('Search users to add...')).toBeDefined();
    expect(view.getByText('Search')).toBeDefined();
  });
});
