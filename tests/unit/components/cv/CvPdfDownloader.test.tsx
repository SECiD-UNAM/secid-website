/**
 * Tests for CvPdfDownloader component.
 *
 * TC-cv-pdf-ui-001 through TC-cv-pdf-ui-006
 * Verifies: PDF download buttons render correctly and trigger generation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import React from 'react';
import type { CVData } from '@/types/cv';

// Mock the pdf-generator module
const mockGenerateCvPdf = vi.fn();
vi.mock('@/lib/cv/pdf-generator', () => ({
  generateCvPdf: (...args: unknown[]) => mockGenerateCvPdf(...args),
}));

import CvPdfDownloader from '@/components/cv/CvPdfDownloader';

function createTestCvData(): CVData {
  return {
    personal: {
      name: { first: 'Ana', last: 'Lopez', full: 'Ana Lopez' },
      title: 'ML Engineer',
      location: 'Guadalajara, Mexico',
      contact: { email: 'ana@example.com' },
      summary: 'ML engineer focused on NLP.',
    },
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    skills: ['Python'],
    languages: [{ name: 'Spanish', proficiency: 'Native' }],
    metadata: {
      generatedAt: '2026-03-21',
      memberSlug: 'ana-lopez',
      lang: 'es',
    },
  };
}

describe('CvPdfDownloader - Spanish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateCvPdf.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  describe('TC-cv-pdf-ui-001: Renders 3 download buttons in Spanish', () => {
    it('displays all three format buttons', () => {
      /** Verifies: AC-pdf-ui-buttons */
      render(<CvPdfDownloader cvData={createTestCvData()} lang="es" />);

      expect(screen.getByText('CV Completo')).toBeDefined();
      expect(screen.getByText('Resumen (2 pag)')).toBeDefined();
      expect(screen.getByText('Resumen (1 pag)')).toBeDefined();
    });
  });

  describe('TC-cv-pdf-ui-002: Renders section title in Spanish', () => {
    it('shows "Descargar PDF" heading', () => {
      /** Verifies: AC-pdf-ui-title */
      render(<CvPdfDownloader cvData={createTestCvData()} lang="es" />);

      expect(screen.getByText('Descargar PDF')).toBeDefined();
    });
  });

  describe('TC-cv-pdf-ui-003: Clicking a button triggers PDF generation', () => {
    it('calls generateCvPdf with correct arguments', async () => {
      /** Verifies: AC-pdf-ui-generate */
      const cvData = createTestCvData();
      render(<CvPdfDownloader cvData={cvData} lang="es" />);

      const fullButton = screen.getByLabelText('Descargar CV Completo');
      fireEvent.click(fullButton);

      await waitFor(() => {
        expect(mockGenerateCvPdf).toHaveBeenCalledWith(cvData, 'full', 'es');
      });
    });
  });

  describe('TC-cv-pdf-ui-004: Shows error on generation failure', () => {
    it('displays error message when PDF generation throws', async () => {
      /** Verifies: AC-pdf-ui-error */
      mockGenerateCvPdf.mockRejectedValueOnce(new Error('jsPDF failed'));
      const cvData = createTestCvData();
      render(<CvPdfDownloader cvData={cvData} lang="es" />);

      const fullButton = screen.getByLabelText('Descargar CV Completo');
      fireEvent.click(fullButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText(/Error al generar el PDF/)).toBeDefined();
      });
    });
  });
});

describe('CvPdfDownloader - English', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateCvPdf.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  describe('TC-cv-pdf-ui-005: Renders 3 download buttons in English', () => {
    it('displays all three format buttons in English', () => {
      /** Verifies: AC-pdf-ui-buttons-en */
      render(<CvPdfDownloader cvData={createTestCvData()} lang="en" />);

      expect(screen.getByText('Full CV')).toBeDefined();
      expect(screen.getByText('Resume (2pg)')).toBeDefined();
      expect(screen.getByText('Summary (1pg)')).toBeDefined();
    });
  });

  describe('TC-cv-pdf-ui-006: English labels and error messages', () => {
    it('shows English error message on failure', async () => {
      /** Verifies: AC-pdf-ui-error-en */
      mockGenerateCvPdf.mockRejectedValueOnce(new Error('broken'));
      const cvData = createTestCvData();
      render(<CvPdfDownloader cvData={cvData} lang="en" />);

      const fullButton = screen.getByLabelText('Download Full CV');
      fireEvent.click(fullButton);

      await waitFor(() => {
        expect(screen.getByText(/PDF generation failed/)).toBeDefined();
      });
    });
  });
});
