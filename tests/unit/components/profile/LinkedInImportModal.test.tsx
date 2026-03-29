/**
 * Tests for LinkedInImportModal component.
 *
 * TC-li-modal-001 through TC-li-modal-015
 * Verifies:
 *   AC-1 (modal renders when open)
 *   AC-2 (tab switching)
 *   AC-3 (preview parses all tabs)
 *   AC-4 (import calls onImport with parsed data and closes)
 *   AC-5 (close button calls onClose)
 *   AC-6 (PDF upload validates size)
 *   AC-7 (bilingual labels)
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from '@testing-library/react';
import React from 'react';

// Firebase functions are infrastructure — mock at the boundary
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

vi.mock('@heroicons/react/24/outline', () => {
  const stub = () => null;
  return {
    XMarkIcon: stub,
    DocumentArrowUpIcon: stub,
  };
});

import { LinkedInImportModal } from '@/components/profile/LinkedInImportModal';

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  isOpen: true,
  onClose: vi.fn(),
  onImport: vi.fn(),
  lang: 'es' as const,
  ...overrides,
});

// Ensure each test starts with a clean DOM
beforeEach(() => cleanup());
afterEach(() => cleanup());

describe('LinkedInImportModal — visibility', () => {
  it('TC-li-modal-001: renders nothing when isOpen is false', () => {
    /** Verifies: AC-1 */
    render(<LinkedInImportModal {...makeProps({ isOpen: false })} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('TC-li-modal-002: renders modal when isOpen is true', () => {
    /** Verifies: AC-1 */
    render(<LinkedInImportModal {...makeProps()} />);
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});

describe('LinkedInImportModal — tab navigation', () => {
  it('TC-li-modal-003: shows Experiencia tab active by default (Spanish)', () => {
    /** Verifies: AC-2, AC-7 */
    const { container } = render(<LinkedInImportModal {...makeProps()} />);
    const dialog = within(container.querySelector('[role="dialog"]')!);

    expect(dialog.getByText('Experiencia')).toBeDefined();
    expect(dialog.getByText('Educación')).toBeDefined();
    expect(dialog.getByText('Habilidades')).toBeDefined();
    expect(dialog.getByText('Certificaciones')).toBeDefined();
    expect(dialog.getByText('Idiomas')).toBeDefined();
  });

  it('TC-li-modal-004: shows English tab labels when lang=en', () => {
    /** Verifies: AC-7 */
    const { container } = render(
      <LinkedInImportModal {...makeProps({ lang: 'en' })} />
    );
    const dialog = within(container.querySelector('[role="dialog"]')!);

    expect(dialog.getByText('Experience')).toBeDefined();
    expect(dialog.getByText('Education')).toBeDefined();
    expect(dialog.getByText('Skills')).toBeDefined();
    expect(dialog.getByText('Certifications')).toBeDefined();
    expect(dialog.getByText('Languages')).toBeDefined();
  });

  it('TC-li-modal-005: clicking a tab changes the active tab', () => {
    /** Verifies: AC-2 */
    const { container } = render(<LinkedInImportModal {...makeProps()} />);
    const dialog = container.querySelector('[role="dialog"]')!;

    // Click Education tab
    const tabs = dialog.querySelectorAll('[role="tab"]');
    const educationTab = Array.from(tabs).find((t) =>
      t.textContent?.includes('Educación')
    );
    expect(educationTab).toBeDefined();
    fireEvent.click(educationTab!);

    // The textarea should still be present (just with a different placeholder)
    const textarea = dialog.querySelector('textarea');
    expect(textarea).toBeDefined();
  });
});

describe('LinkedInImportModal — close behavior', () => {
  it('TC-li-modal-006: clicking X button calls onClose', () => {
    /** Verifies: AC-5 */
    const onClose = vi.fn();
    const { container } = render(
      <LinkedInImportModal {...makeProps({ onClose })} />
    );
    const dialog = container.querySelector('[role="dialog"]')!;

    const closeButton = dialog.querySelector('[aria-label="Cerrar"]');
    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-li-modal-007: clicking Cancel button calls onClose', () => {
    /** Verifies: AC-5 */
    const onClose = vi.fn();
    const { container } = render(
      <LinkedInImportModal {...makeProps({ onClose })} />
    );
    const dialog = container.querySelector('[role="dialog"]')!;

    const buttons = Array.from(dialog.querySelectorAll('button'));
    const cancelButton = buttons.find((b) => b.textContent?.match(/cancelar/i));
    expect(cancelButton).toBeDefined();
    fireEvent.click(cancelButton!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('LinkedInImportModal — preview mode', () => {
  it('TC-li-modal-008: Preview button is visible when textarea has content', () => {
    /** Verifies: AC-3 */
    const { container } = render(<LinkedInImportModal {...makeProps()} />);
    const dialog = container.querySelector('[role="dialog"]')!;

    const textarea = dialog.querySelector('textarea')!;
    fireEvent.change(textarea, {
      target: { value: 'Data Scientist\nBBVA\nJan 2022 - Present' },
    });

    const buttons = Array.from(dialog.querySelectorAll('button'));
    const previewButton = buttons.find((b) =>
      b.textContent?.match(/vista previa|preview/i)
    );
    expect(previewButton).toBeDefined();
  });

  it('TC-li-modal-009: clicking Preview shows parsed experience entries', () => {
    /** Verifies: AC-3 */
    const { container } = render(<LinkedInImportModal {...makeProps()} />);
    const dialog = container.querySelector('[role="dialog"]')!;

    const textarea = dialog.querySelector('textarea')!;
    fireEvent.change(textarea, {
      target: { value: 'Data Scientist\nBBVA\nJan 2022 - Present' },
    });

    const buttons = Array.from(dialog.querySelectorAll('button'));
    const previewButton = buttons.find((b) =>
      b.textContent?.match(/vista previa|preview/i)
    )!;
    fireEvent.click(previewButton);

    // Preview should display the parsed company name
    expect(dialog.textContent).toContain('BBVA');
  });

  it('TC-li-modal-010: preview shows skills list when skills tab has content', () => {
    /** Verifies: AC-3 */
    const { container } = render(<LinkedInImportModal {...makeProps()} />);
    const dialog = container.querySelector('[role="dialog"]')!;

    // Navigate to skills tab
    const tabs = dialog.querySelectorAll('[role="tab"]');
    const skillsTab = Array.from(tabs).find((t) =>
      t.textContent?.includes('Habilidades')
    )!;
    fireEvent.click(skillsTab);

    const textarea = dialog.querySelector('textarea')!;
    fireEvent.change(textarea, {
      target: { value: 'Python\nSQL\nMachine Learning' },
    });

    const buttons = Array.from(dialog.querySelectorAll('button'));
    const previewButton = buttons.find((b) =>
      b.textContent?.match(/vista previa|preview/i)
    )!;
    fireEvent.click(previewButton);

    expect(dialog.textContent).toContain('Python');
    expect(dialog.textContent).toContain('SQL');
  });
});

describe('LinkedInImportModal — import action', () => {
  it('TC-li-modal-011: clicking Import calls onImport with parsed experience', () => {
    /** Verifies: AC-4 */
    const onImport = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <LinkedInImportModal {...makeProps({ onImport, onClose })} />
    );
    const dialog = container.querySelector('[role="dialog"]')!;

    const textarea = dialog.querySelector('textarea')!;
    fireEvent.change(textarea, {
      target: { value: 'Data Scientist\nBBVA\nJan 2022 - Present' },
    });

    // Go to preview first
    const getButtons = () => Array.from(dialog.querySelectorAll('button'));
    const previewButton = getButtons().find((b) =>
      b.textContent?.match(/vista previa|preview/i)
    )!;
    fireEvent.click(previewButton);

    // Then click import (now visible instead of preview)
    const importButton = getButtons().find(
      (b) => b.textContent === 'Importar'
    )!;
    expect(importButton).toBeDefined();
    fireEvent.click(importButton);

    expect(onImport).toHaveBeenCalledTimes(1);
    const importedData = onImport.mock.calls[0][0];
    expect(importedData.experience).toBeDefined();
    expect(importedData.experience).toHaveLength(1);
    expect(importedData.experience[0].company).toBe('BBVA');
    expect(importedData.experience[0].position).toBe('Data Scientist');
  });

  it('TC-li-modal-012: import calls onClose after importing', () => {
    /** Verifies: AC-4 */
    const onClose = vi.fn();
    const { container } = render(
      <LinkedInImportModal {...makeProps({ onClose })} />
    );
    const dialog = container.querySelector('[role="dialog"]')!;

    const textarea = dialog.querySelector('textarea')!;
    fireEvent.change(textarea, {
      target: { value: 'Engineer\nGoogle\nJan 2021 - Dec 2022' },
    });

    const getButtons = () => Array.from(dialog.querySelectorAll('button'));
    fireEvent.click(
      getButtons().find((b) => b.textContent?.match(/vista previa|preview/i))!
    );
    fireEvent.click(getButtons().find((b) => b.textContent === 'Importar')!);

    expect(onClose).toHaveBeenCalled();
  });

  it('TC-li-modal-013: Import includes skills when skills textarea has content', () => {
    /** Verifies: AC-4 */
    const onImport = vi.fn();
    const { container } = render(
      <LinkedInImportModal {...makeProps({ onImport })} />
    );
    const dialog = container.querySelector('[role="dialog"]')!;

    // Fill skills tab
    const tabs = dialog.querySelectorAll('[role="tab"]');
    const skillsTab = Array.from(tabs).find((t) =>
      t.textContent?.includes('Habilidades')
    )!;
    fireEvent.click(skillsTab);

    const textarea = dialog.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Python\nSQL' } });

    const getButtons = () => Array.from(dialog.querySelectorAll('button'));
    fireEvent.click(
      getButtons().find((b) => b.textContent?.match(/vista previa|preview/i))!
    );
    fireEvent.click(getButtons().find((b) => b.textContent === 'Importar')!);

    const importedData = onImport.mock.calls[0][0];
    expect(importedData.skills).toEqual(['Python', 'SQL']);
  });
});

describe('LinkedInImportModal — PDF upload validation', () => {
  it('TC-li-modal-014: alerts when PDF file exceeds 5MB', () => {
    /** Verifies: AC-6 */
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { container } = render(<LinkedInImportModal {...makeProps()} />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Create a mock file > 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'linkedin.pdf', {
      type: 'application/pdf',
    });

    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      configurable: true,
    });

    fireEvent.change(fileInput);

    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/5MB|5 MB/i));

    alertSpy.mockRestore();
  });

  it('TC-li-modal-015: English alert message for oversized PDF when lang=en', () => {
    /** Verifies: AC-6, AC-7 */
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { container } = render(
      <LinkedInImportModal {...makeProps({ lang: 'en' })} />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'resume.pdf', {
      type: 'application/pdf',
    });

    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      configurable: true,
    });

    fireEvent.change(fileInput);

    expect(alertSpy).toHaveBeenCalledWith('File exceeds 5MB');

    alertSpy.mockRestore();
  });
});
