// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, within, cleanup, waitFor, fireEvent } from '@testing-library/react';
import GroupList from '@/components/admin/GroupList';

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

const mockGroups = [
  {
    id: 'group-admin',
    name: 'Administrators',
    description: 'Full system access',
    permissions: [
      { resource: 'events', operation: 'view', scope: 'all', effect: 'allow' },
      { resource: 'events', operation: 'edit', scope: 'all', effect: 'allow' },
    ],
    isSystem: true,
    createdBy: 'system',
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'group-editors',
    name: 'Editors',
    description: 'Content editing team',
    permissions: [
      { resource: 'blog', operation: 'edit', scope: 'all', effect: 'allow' },
    ],
    isSystem: false,
    createdBy: 'admin-uid',
    createdAt: null,
    updatedAt: null,
  },
];

const mockGetDocs = vi.fn();
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  doc: vi.fn((_db, _col, id) => ({ path: `rbac_groups/${id}` })),
  query: vi.fn((...args) => args),
  orderBy: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

function createMockDocsResponse() {
  return {
    docs: mockGroups.map((g) => ({
      id: g.id,
      data: () => {
        const { id: _, ...rest } = g;
        return rest;
      },
    })),
  };
}

function setup() {
  mockCan.mockReset().mockReturnValue(true);
  mockGetDocs.mockReset().mockResolvedValue(createMockDocsResponse());
  mockDeleteDoc.mockReset().mockResolvedValue(undefined);
  mockPermissionsHook.loading = false;
}

function teardown() {
  cleanup();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GroupList: displays groups', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-001: displays all groups from Firestore', async () => {
    /** Verifies: AC-group-list-displays */
    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('Administrators')).toBeDefined();
    });

    expect(view.getByText('Editors')).toBeDefined();
    expect(view.getByText('Full system access')).toBeDefined();
  });
});

describe('GroupList: system badge', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-002: shows system badge for system groups', async () => {
    /** Verifies: AC-group-list-system-badge */
    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('Administrators')).toBeDefined();
    });

    expect(view.getByText('System')).toBeDefined();
    expect(view.getByText('Custom')).toBeDefined();
  });
});

describe('GroupList: permission count', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-003: shows permission count badges', async () => {
    /** Verifies: AC-group-list-permission-count */
    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('Administrators')).toBeDefined();
    });

    expect(view.getByText('2 permissions')).toBeDefined();
    expect(view.getByText('1 permissions')).toBeDefined();
  });
});

describe('GroupList: group count', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-004: shows group count', async () => {
    /** Verifies: AC-group-list-count */
    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('Administrators')).toBeDefined();
    });

    expect(view.getByText('2 groups')).toBeDefined();
  });
});

describe('GroupList: search filter', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-005: filters groups by search query', async () => {
    /** Verifies: AC-group-list-search */
    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('Administrators')).toBeDefined();
    });

    const searchInput = view.getByPlaceholderText('Search groups...');
    fireEvent.change(searchInput, { target: { value: 'editor' } });

    expect(view.queryByText('Administrators')).toBeNull();
    expect(view.getByText('Editors')).toBeDefined();
  });
});

describe('GroupList: create gate', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-006: hides New Group button when lacking create permission', async () => {
    /** Verifies: AC-group-list-create-gate */
    mockCan.mockImplementation((resource, operation) => {
      if (resource === 'groups' && operation === 'create') return false;
      return true;
    });

    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('Administrators')).toBeDefined();
    });

    expect(view.queryByText('New Group')).toBeNull();
  });
});

describe('GroupList: system no delete', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-007: delete button absent for system groups', async () => {
    /** Verifies: AC-group-list-system-no-delete */
    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('Administrators')).toBeDefined();
    });

    // Find Administrators row and check it has no delete button
    const rows = view.getAllByRole('row');
    const adminRow = rows.find((r) => r.textContent?.includes('Administrators'));
    expect(adminRow).toBeDefined();
    const deleteBtn = adminRow.querySelector('button[title="Delete"]');
    expect(deleteBtn).toBeNull();
  });
});

describe('GroupList: delete', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-008: deletes group after confirmation', async () => {
    /** Verifies: AC-group-list-delete */
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('Administrators')).toBeDefined();
    });

    const deleteButtons = container.querySelectorAll('button[title="Delete"]');
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });
});

describe('GroupList: empty state', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-list-009: shows empty message when no groups', async () => {
    /** Verifies: AC-group-list-empty */
    mockGetDocs.mockResolvedValue({ docs: [] });

    const { container } = render(<GroupList lang="en" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByText('No groups found.')).toBeDefined();
    });
  });
});
