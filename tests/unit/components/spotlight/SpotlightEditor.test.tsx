// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

const mockExistingSpotlight = {
  id: 'sp-edit-1',
  name: 'Ana Martinez',
  title: 'Research Scientist',
  company: 'Meta AI',
  graduationYear: 2020,
  story: '<p>NLP research</p>',
  excerpt: 'NLP researcher at Meta.',
  tags: ['NLP', 'Research'],
  publishedAt: new Date('2024-10-20'),
  featured: false,
  status: 'published',
};

const mockCreateSpotlight = vi.fn();
const mockUpdateSpotlight = vi.fn();
const mockGetSpotlight = vi.fn();

vi.mock('@/lib/spotlights', () => ({
  createSpotlight: (...args: unknown[]) => mockCreateSpotlight(...args),
  updateSpotlight: (...args: unknown[]) => mockUpdateSpotlight(...args),
  getSpotlight: (...args: unknown[]) => mockGetSpotlight(...args),
}));

import SpotlightEditor from '@/components/spotlight/SpotlightEditor';

beforeEach(() => {
  mockCreateSpotlight.mockClear();
  mockUpdateSpotlight.mockClear();
  mockGetSpotlight.mockClear();
  mockCreateSpotlight.mockResolvedValue('new-id');
  mockUpdateSpotlight.mockResolvedValue(undefined);
  mockGetSpotlight.mockResolvedValue({ ...mockExistingSpotlight });
});

afterEach(() => {
  cleanup();
});

describe.sequential('SpotlightEditor', () => {
  it('TC-spotlight-editor-001: renders create form by default', () => {
    /** Verifies: AC-spotlight-editor-create-mode */
    render(<SpotlightEditor lang="en" />);

    expect(screen.getAllByText('Publish Alumni Story').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Publish Story').length).toBeGreaterThan(0);
  });

  it('TC-spotlight-editor-002: does not fetch spotlight without spotlightId', () => {
    /** Verifies: AC-spotlight-editor-no-fetch-create */
    render(<SpotlightEditor lang="en" />);

    expect(mockGetSpotlight).not.toHaveBeenCalled();
  });

  it('TC-spotlight-editor-003: calls createSpotlight on create submit', async () => {
    /** Verifies: AC-spotlight-editor-create-submit */
    render(<SpotlightEditor lang="en" />);

    const textInputs = screen.getAllByRole('textbox');
    // Form order: name, title, company, excerpt, story(textarea), tags
    fireEvent.change(textInputs[0], { target: { value: 'Test User' } });
    fireEvent.change(textInputs[1], { target: { value: 'Engineer' } });
    fireEvent.change(textInputs[2], { target: { value: 'TestCo' } });
    fireEvent.change(textInputs[3], { target: { value: 'Short summary' } });
    fireEvent.change(textInputs[4], { target: { value: '<p>Story</p>' } });

    const submitBtns = screen.getAllByRole('button', { name: /Publish Story/i });
    fireEvent.click(submitBtns[0]);

    await waitFor(() => {
      expect(mockCreateSpotlight).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          title: 'Engineer',
          company: 'TestCo',
          story: '<p>Story</p>',
          excerpt: 'Short summary',
          status: 'published',
        })
      );
    });
  });

  it('TC-spotlight-editor-004: fetches spotlight data when spotlightId provided', async () => {
    /** Verifies: AC-spotlight-editor-fetch-existing */
    render(<SpotlightEditor lang="en" spotlightId="sp-edit-1" />);

    await waitFor(() => {
      expect(mockGetSpotlight).toHaveBeenCalledWith('sp-edit-1');
    });
  });

  it('TC-spotlight-editor-005: populates form with existing data', async () => {
    /** Verifies: AC-spotlight-editor-populate-form */
    render(<SpotlightEditor lang="en" spotlightId="sp-edit-1" />);

    await screen.findByDisplayValue('Ana Martinez');

    expect(screen.getAllByDisplayValue('Research Scientist').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Meta AI').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('NLP researcher at Meta.').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('NLP, Research').length).toBeGreaterThan(0);
  });

  it('TC-spotlight-editor-006: shows edit mode titles and labels', async () => {
    /** Verifies: AC-spotlight-editor-edit-labels */
    render(<SpotlightEditor lang="en" spotlightId="sp-edit-1" />);

    await screen.findByDisplayValue('Ana Martinez');

    expect(screen.getAllByText('Edit Alumni Story').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Update Story').length).toBeGreaterThan(0);
  });

  it('TC-spotlight-editor-007: calls updateSpotlight on edit submit', async () => {
    /** Verifies: AC-spotlight-editor-update-submit */
    render(<SpotlightEditor lang="en" spotlightId="sp-edit-1" />);

    await screen.findByDisplayValue('Ana Martinez');

    const nameInputs = screen.getAllByDisplayValue('Ana Martinez');
    fireEvent.change(nameInputs[0], {
      target: { value: 'Ana Martinez Ruiz' },
    });

    const submitBtns = screen.getAllByText('Update Story');
    // Filter to just the button element
    const btn = submitBtns.find(el => el.tagName === 'BUTTON') ?? submitBtns[0];
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockUpdateSpotlight).toHaveBeenCalledWith(
        'sp-edit-1',
        expect.objectContaining({
          name: 'Ana Martinez Ruiz',
          title: 'Research Scientist',
          company: 'Meta AI',
        })
      );
    });

    expect(mockCreateSpotlight).not.toHaveBeenCalled();
  });

  it('TC-spotlight-editor-008: shows error when spotlight not found', async () => {
    /** Verifies: AC-spotlight-editor-not-found */
    mockGetSpotlight.mockResolvedValue(null);

    render(<SpotlightEditor lang="en" spotlightId="nonexistent" />);

    await screen.findByText('Error loading the story.');
  });

  it('TC-spotlight-editor-009: does not clear form after successful edit', async () => {
    /** Verifies: AC-spotlight-editor-no-clear-on-edit */
    render(<SpotlightEditor lang="en" spotlightId="sp-edit-1" />);

    await screen.findByDisplayValue('Ana Martinez');

    const submitBtns = screen.getAllByText('Update Story');
    const btn = submitBtns.find(el => el.tagName === 'BUTTON') ?? submitBtns[0];
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockUpdateSpotlight).toHaveBeenCalled();
    });

    // Form should still show the data (not cleared)
    expect(screen.getAllByDisplayValue('Ana Martinez').length).toBeGreaterThan(0);
  });

  it('TC-spotlight-editor-010: shows Spanish labels in edit mode', async () => {
    /** Verifies: AC-spotlight-editor-i18n-es */
    render(<SpotlightEditor lang="es" spotlightId="sp-edit-1" />);

    await screen.findByDisplayValue('Ana Martinez');

    expect(screen.getAllByText('Editar Historia de Egresado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actualizar Historia').length).toBeGreaterThan(0);
  });
});
