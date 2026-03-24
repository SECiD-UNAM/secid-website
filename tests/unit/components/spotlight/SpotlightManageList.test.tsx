// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, act } from '@testing-library/react';

const mockSpotlights = [
  {
    id: 'sp-1',
    name: 'Maria Garcia',
    title: 'Data Scientist',
    company: 'Google',
    graduationYear: 2019,
    story: '<p>My story</p>',
    excerpt: 'A short excerpt.',
    tags: ['ML'],
    publishedAt: new Date('2024-12-01'),
    featured: true,
    status: 'published',
  },
  {
    id: 'sp-2',
    name: 'Carlos Rodriguez',
    title: 'CTO',
    company: 'DataMX',
    graduationYear: 2018,
    story: '<p>Startup journey</p>',
    excerpt: 'Founded a startup.',
    tags: ['Startup'],
    publishedAt: new Date('2024-11-15'),
    featured: false,
    status: 'draft',
  },
];

const mockGetAllSpotlights = vi.fn();
const mockDeleteSpotlight = vi.fn();
const mockUpdateSpotlight = vi.fn();

vi.mock('@/lib/spotlights', () => ({
  getAllSpotlights: (...args: unknown[]) => mockGetAllSpotlights(...args),
  deleteSpotlight: (...args: unknown[]) => mockDeleteSpotlight(...args),
  updateSpotlight: (...args: unknown[]) => mockUpdateSpotlight(...args),
}));

const mockCan = vi.fn();
vi.mock('@/lib/rbac/hooks', () => ({
  usePermissions: () => ({ can: mockCan }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' } }),
}));

import SpotlightManageList from '@/components/spotlight/SpotlightManageList';

beforeEach(() => {
  mockGetAllSpotlights.mockClear();
  mockDeleteSpotlight.mockClear();
  mockUpdateSpotlight.mockClear();
  mockCan.mockClear();
  mockGetAllSpotlights.mockResolvedValue([...mockSpotlights]);
  mockDeleteSpotlight.mockResolvedValue(undefined);
  mockUpdateSpotlight.mockResolvedValue(undefined);
  mockCan.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
});

describe.sequential('SpotlightManageList', () => {
  it('TC-spotlight-list-001: displays all spotlights after loading', async () => {
    /** Verifies: AC-spotlight-manage-list-renders */
    render(<SpotlightManageList lang="es" />);

    await screen.findByText('Maria Garcia');
    expect(screen.getAllByText('Carlos Rodriguez').length).toBeGreaterThan(0);
  });

  it('TC-spotlight-list-002: shows columns for name, position, company, status', async () => {
    /** Verifies: AC-spotlight-manage-list-columns */
    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    expect(screen.getAllByText('Data Scientist').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Google').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CTO').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DataMX').length).toBeGreaterThan(0);
  });

  it('TC-spotlight-list-003: shows spotlight count', async () => {
    /** Verifies: AC-spotlight-manage-list-count */
    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    // Count text may be split across elements ("2" and "spotlights")
    const countEl = screen.getByText((content, element) => {
      return element?.tagName === 'P' && content.includes('2') && element.textContent?.includes('spotlights');
    });
    expect(countEl).toBeDefined();
  });

  it('TC-spotlight-list-004: filters spotlights by name search', async () => {
    /** Verifies: AC-spotlight-manage-list-search-name */
    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const searchInputs = screen.getAllByPlaceholderText(
      'Search by name, title or company...'
    );
    fireEvent.change(searchInputs[0], { target: { value: 'Maria' } });

    expect(screen.getAllByText('Maria Garcia').length).toBeGreaterThan(0);
    expect(screen.queryByText('Carlos Rodriguez')).toBeNull();
  });

  it('TC-spotlight-list-005: filters spotlights by company', async () => {
    /** Verifies: AC-spotlight-manage-list-search-company */
    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const searchInputs = screen.getAllByPlaceholderText(
      'Search by name, title or company...'
    );
    fireEvent.change(searchInputs[0], { target: { value: 'DataMX' } });

    expect(screen.queryByText('Maria Garcia')).toBeNull();
    expect(screen.getAllByText('Carlos Rodriguez').length).toBeGreaterThan(0);
  });

  it('TC-spotlight-list-006: filters by draft status', async () => {
    /** Verifies: AC-spotlight-manage-list-status-filter */
    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const selects = screen.getAllByDisplayValue('All statuses');
    fireEvent.change(selects[0], { target: { value: 'draft' } });

    expect(screen.queryByText('Maria Garcia')).toBeNull();
    expect(screen.getAllByText('Carlos Rodriguez').length).toBeGreaterThan(0);
  });

  it('TC-spotlight-list-007: filters by published status', async () => {
    /** Verifies: AC-spotlight-manage-list-status-filter */
    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const selects = screen.getAllByDisplayValue('All statuses');
    fireEvent.change(selects[0], { target: { value: 'published' } });

    expect(screen.getAllByText('Maria Garcia').length).toBeGreaterThan(0);
    expect(screen.queryByText('Carlos Rodriguez')).toBeNull();
  });

  it('TC-spotlight-list-008: hides New Spotlight button when create not allowed', async () => {
    /** Verifies: AC-spotlight-manage-rbac-create */
    mockCan.mockImplementation(
      (resource: string, op: string) =>
        !(resource === 'spotlights' && op === 'create')
    );

    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    expect(screen.queryByText('New Spotlight')).toBeNull();
  });

  it('TC-spotlight-list-009: hides edit links when edit not allowed', async () => {
    /** Verifies: AC-spotlight-manage-rbac-edit */
    mockCan.mockImplementation(
      (resource: string, op: string) =>
        !(resource === 'spotlights' && op === 'edit')
    );

    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const editLinks = screen.queryAllByTitle('Edit');
    expect(editLinks.length).toBe(0);
  });

  it('TC-spotlight-list-010: hides delete buttons when delete not allowed', async () => {
    /** Verifies: AC-spotlight-manage-rbac-delete */
    mockCan.mockImplementation(
      (resource: string, op: string) =>
        !(resource === 'spotlights' && op === 'delete')
    );

    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const deleteButtons = screen.queryAllByTitle('Delete');
    expect(deleteButtons.length).toBe(0);
  });

  it('TC-spotlight-list-011: shows all actions when all permissions granted', async () => {
    /** Verifies: AC-spotlight-manage-rbac-all */
    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    expect(screen.getAllByText('New Spotlight').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Edit').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTitle('Delete').length).toBeGreaterThanOrEqual(2);
  });

  it('TC-spotlight-list-012: shows empty state when no spotlights', async () => {
    /** Verifies: AC-spotlight-manage-list-empty */
    mockGetAllSpotlights.mockResolvedValue([]);

    render(<SpotlightManageList lang="en" />);

    await screen.findByText('No spotlights found.');
  });

  it('TC-spotlight-list-013: shows error state on fetch failure', async () => {
    /** Verifies: AC-spotlight-manage-list-error */
    mockGetAllSpotlights.mockRejectedValue(new Error('Network error'));

    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Error loading spotlights. Please try again.');
  });

  it('TC-spotlight-list-014: calls deleteSpotlight on confirm', async () => {
    /** Verifies: AC-spotlight-manage-delete */
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteSpotlight).toHaveBeenCalledWith('sp-1');
    });
  });

  it('TC-spotlight-list-015: does not delete when confirm is cancelled', async () => {
    /** Verifies: AC-spotlight-manage-delete-cancel */
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(mockDeleteSpotlight).not.toHaveBeenCalled();
  });

  it('TC-spotlight-list-016: toggle publish calls updateSpotlight', async () => {
    /** Verifies: AC-spotlight-manage-toggle-publish */
    render(<SpotlightManageList lang="en" />);

    await screen.findByText('Maria Garcia');

    const unpublishBtns = screen.getAllByTitle('Unpublish');
    fireEvent.click(unpublishBtns[0]);

    await waitFor(() => {
      expect(mockUpdateSpotlight).toHaveBeenCalledWith('sp-1', {
        status: 'draft',
      });
    });
  });
});
