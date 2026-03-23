/**
 * Tests for CvPdfDownloader floating button component.
 *
 * TC-cv-pdf-ui-001 through TC-cv-pdf-ui-008
 * Verifies: PDF download FAB renders, opens dropdown, triggers generation, shows errors
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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

  describe('TC-cv-pdf-ui-001: Renders floating button with PDF label', () => {
    it('displays the FAB with correct aria-label', () => {
      /** Verifies: AC-pdf-ui-fab */
      render(<CvPdfDownloader cvData={createTestCvData()} lang="es" />);

      const fab = screen.getByLabelText('Descargar PDF');
      expect(fab).toBeDefined();
    });
  });

  describe('TC-cv-pdf-ui-002: Opens dropdown with 3 format options in Spanish', () => {
    it('shows format options after clicking FAB', () => {
      /** Verifies: AC-pdf-ui-buttons */
      render(<CvPdfDownloader cvData={createTestCvData()} lang="es" />);

      const fab = screen.getByLabelText('Descargar PDF');
      fireEvent.click(fab);

      expect(screen.getByText('CV Completo')).toBeDefined();
      expect(screen.getByText('Resumen (2 pag)')).toBeDefined();
      expect(screen.getByText('Resumen (1 pag)')).toBeDefined();
    });
  });

  describe('TC-cv-pdf-ui-003: Clicking a format triggers PDF generation', () => {
    it('calls generateCvPdf with correct arguments', async () => {
      /** Verifies: AC-pdf-ui-generate */
      const cvData = createTestCvData();
      render(<CvPdfDownloader cvData={cvData} lang="es" />);

      // Open dropdown
      const fab = screen.getByLabelText('Descargar PDF');
      fireEvent.click(fab);

      // Click the "Full CV" option
      const fullButton = screen.getByLabelText('Descargar CV Completo');
      fireEvent.click(fullButton);

      await waitFor(() => {
        expect(mockGenerateCvPdf).toHaveBeenCalledWith(
          cvData,
          'full',
          'es',
          '#1E3A5F'
        );
      });
    });
  });

  describe('TC-cv-pdf-ui-004: Shows error on generation failure', () => {
    it('displays error toast when PDF generation throws', async () => {
      /** Verifies: AC-pdf-ui-error */
      mockGenerateCvPdf.mockRejectedValueOnce(new Error('jsPDF failed'));
      const cvData = createTestCvData();
      render(<CvPdfDownloader cvData={cvData} lang="es" />);

      // Open dropdown and click
      const fab = screen.getByLabelText('Descargar PDF');
      fireEvent.click(fab);
      const fullButton = screen.getByLabelText('Descargar CV Completo');
      fireEvent.click(fullButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText(/Error al generar el PDF/)).toBeDefined();
      });
    });
  });

  describe('TC-cv-pdf-ui-007: Accent color is passed to generator', () => {
    it('uses the default accent color on first click', async () => {
      /** Verifies: AC-pdf-ui-accent-color */
      const cvData = createTestCvData();
      render(<CvPdfDownloader cvData={cvData} lang="es" />);

      const fab = screen.getByLabelText('Descargar PDF');
      fireEvent.click(fab);

      const fullButton = screen.getByLabelText('Descargar CV Completo');
      fireEvent.click(fullButton);

      await waitFor(() => {
        expect(mockGenerateCvPdf).toHaveBeenCalledWith(
          cvData,
          'full',
          'es',
          '#1E3A5F'
        );
      });
    });
  });

  describe('TC-cv-pdf-ui-008: Color picker is visible in dropdown', () => {
    it('shows accent color label and preset swatches', () => {
      /** Verifies: AC-pdf-ui-color-picker */
      render(<CvPdfDownloader cvData={createTestCvData()} lang="es" />);

      const fab = screen.getByLabelText('Descargar PDF');
      fireEvent.click(fab);

      expect(screen.getByText('Color de acento')).toBeDefined();
      expect(screen.getByLabelText('SECiD Blue')).toBeDefined();
      expect(screen.getByLabelText('SECiD Orange')).toBeDefined();
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

  describe('TC-cv-pdf-ui-005: Renders 3 format options in English', () => {
    it('displays all three format options in English after opening', () => {
      /** Verifies: AC-pdf-ui-buttons-en */
      render(<CvPdfDownloader cvData={createTestCvData()} lang="en" />);

      const fab = screen.getByLabelText('Download PDF');
      fireEvent.click(fab);

      expect(screen.getByText('Full CV')).toBeDefined();
      expect(screen.getByText('2-Page Resume')).toBeDefined();
      expect(screen.getByText('1-Page Resume')).toBeDefined();
    });
  });

  describe('TC-cv-pdf-ui-006: English error messages', () => {
    it('shows English error message on failure', async () => {
      /** Verifies: AC-pdf-ui-error-en */
      mockGenerateCvPdf.mockRejectedValueOnce(new Error('broken'));
      const cvData = createTestCvData();
      render(<CvPdfDownloader cvData={cvData} lang="en" />);

      const fab = screen.getByLabelText('Download PDF');
      fireEvent.click(fab);
      const fullButton = screen.getByLabelText('Download Full CV');
      fireEvent.click(fullButton);

      await waitFor(() => {
        expect(screen.getByText(/PDF generation failed/)).toBeDefined();
      });
    });
  });
});
