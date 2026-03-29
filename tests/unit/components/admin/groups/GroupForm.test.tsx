// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, within, cleanup, fireEvent, waitFor } from '@testing-library/react';
import GroupForm from '@/components/admin/GroupForm';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCan = vi.fn().mockReturnValue(true);
const mockPermissionsHook = { can: mockCan, loading: false, permissions: null };

vi.mock('@/lib/rbac/hooks', () => ({
  usePermissions: () => mockPermissionsHook,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-admin-uid' } }),
}));

const mockAddDoc = vi.fn().mockResolvedValue({ id: 'new-group-id' });
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _col, id) => ({ path: `rbac_groups/${id}` })),
  getDoc: (...args) => mockGetDoc(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  collection: vi.fn((_db, name) => ({ name })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

function setup() {
  mockCan.mockReset().mockReturnValue(true);
  mockAddDoc.mockReset().mockResolvedValue({ id: 'new-group-id' });
  mockUpdateDoc.mockReset().mockResolvedValue(undefined);
  mockGetDoc.mockReset();
  mockPermissionsHook.loading = false;
}

function teardown() {
  cleanup();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GroupForm: create renders', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-001: renders create form with empty fields', () => {
    /** Verifies: AC-group-create-form-renders */
    const { container } = render(<GroupForm lang="es" />);
    const view = within(container);

    expect(view.getByText('Informacion del Grupo')).toBeDefined();
    expect(view.getByPlaceholderText(/Editores de Contenido/)).toBeDefined();
    expect(view.getByPlaceholderText(/proposito/)).toBeDefined();
    expect(view.getByText('Permisos')).toBeDefined();
    expect(view.getByText('Crear Grupo')).toBeDefined();
  });
});

describe('GroupForm: create validation', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-002: shows validation error when name is empty', async () => {
    /** Verifies: AC-group-name-required */
    const { container } = render(<GroupForm lang="es" />);
    const view = within(container);

    fireEvent.click(view.getByText('Crear Grupo'));

    await waitFor(() => {
      expect(view.getByText('El nombre es requerido')).toBeDefined();
    });

    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});

describe('GroupForm: create submit', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-003: calls addDoc on submit with correct data', async () => {
    /** Verifies: AC-group-create-submits */
    const { container } = render(<GroupForm lang="en" />);
    const view = within(container);

    fireEvent.change(view.getByPlaceholderText(/Content Editors/), {
      target: { value: 'Test Group' },
    });
    fireEvent.change(view.getByPlaceholderText(/purpose/), {
      target: { value: 'A test group' },
    });
    fireEvent.click(view.getByText('Create Group'));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.name).toBe('Test Group');
    expect(payload.description).toBe('A test group');
    expect(payload.isSystem).toBe(false);
    expect(payload.createdBy).toBe('test-admin-uid');
    expect(payload.permissions).toEqual([]);
  });
});

describe('GroupForm: create success', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-004: shows success screen after creation', async () => {
    /** Verifies: AC-group-create-success */
    const { container } = render(<GroupForm lang="en" />);
    const view = within(container);

    fireEvent.change(view.getByPlaceholderText(/Content Editors/), {
      target: { value: 'New Group' },
    });
    fireEvent.click(view.getByText('Create Group'));

    await waitFor(() => {
      expect(view.getByText('Group created successfully')).toBeDefined();
    });

    expect(view.getByText('View Groups')).toBeDefined();
    expect(view.getByText('Create Another')).toBeDefined();
  });
});

describe('GroupForm: edit loads', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-005: loads existing group data in edit mode', async () => {
    /** Verifies: AC-group-edit-loads-data */
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Editors',
        description: 'Content editors',
        permissions: [{ resource: 'blog', operation: 'edit', scope: 'all', effect: 'allow' }],
        isSystem: false,
        createdBy: 'creator-uid',
        createdAt: null,
        updatedAt: null,
      }),
    });

    const { container } = render(<GroupForm lang="en" groupId="group-123" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByDisplayValue('Editors')).toBeDefined();
    });

    expect(view.getByDisplayValue('Content editors')).toBeDefined();
    expect(view.getByText('Update Group')).toBeDefined();
  });
});

describe('GroupForm: edit submit', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-006: calls updateDoc on edit submit', async () => {
    /** Verifies: AC-group-edit-submits */
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Editors',
        description: 'Content editors',
        permissions: [{ resource: 'blog', operation: 'edit', scope: 'all', effect: 'allow' }],
        isSystem: false,
        createdBy: 'creator-uid',
        createdAt: null,
        updatedAt: null,
      }),
    });

    const { container } = render(<GroupForm lang="en" groupId="group-123" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByDisplayValue('Editors')).toBeDefined();
    });

    fireEvent.change(view.getByDisplayValue('Editors'), {
      target: { value: 'Senior Editors' },
    });
    fireEvent.click(view.getByText('Update Group'));

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    const [, payload] = mockUpdateDoc.mock.calls[0];
    expect(payload.name).toBe('Senior Editors');
    expect(payload.updatedAt).toBe('SERVER_TIMESTAMP');
  });
});

describe('GroupForm: system immutable', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-007: disables name and description for system groups', async () => {
    /** Verifies: AC-group-system-immutable */
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Admin',
        description: 'System administrators',
        permissions: [],
        isSystem: true,
        createdBy: 'system',
        createdAt: null,
        updatedAt: null,
      }),
    });

    const { container } = render(<GroupForm lang="en" groupId="system-group" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByDisplayValue('Admin')).toBeDefined();
    });

    expect(view.getByDisplayValue('Admin').disabled).toBe(true);
    expect(view.getByDisplayValue('System administrators').disabled).toBe(true);
    expect(view.getByText(/system group/i)).toBeDefined();
  });
});

describe('GroupForm: system permissions only', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-008: system group edit does not send name/description', async () => {
    /** Verifies: AC-group-system-permissions-only */
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Admin',
        description: 'System administrators',
        permissions: [],
        isSystem: true,
        createdBy: 'system',
        createdAt: null,
        updatedAt: null,
      }),
    });

    const { container } = render(<GroupForm lang="en" groupId="system-group" />);
    const view = within(container);

    await waitFor(() => {
      expect(view.getByDisplayValue('Admin')).toBeDefined();
    });

    fireEvent.click(view.getByText('Update Group'));

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    const [, payload] = mockUpdateDoc.mock.calls[0];
    expect(payload.name).toBeUndefined();
    expect(payload.description).toBeUndefined();
    expect(payload.permissions).toBeDefined();
  });
});

describe('GroupForm: permission gate', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-group-form-009: shows AccessDenied when user lacks create permission', () => {
    /** Verifies: AC-group-permission-gate */
    mockCan.mockReturnValue(false);

    const { container } = render(<GroupForm lang="en" />);
    const view = within(container);

    expect(view.queryByPlaceholderText(/Content Editors/)).toBeNull();
    expect(view.getByText(/Access Denied|Acceso Denegado/i)).toBeDefined();
  });
});
