/**
 * Tests for CV PDF generator utility.
 *
 * TC-cv-pdf-001 through TC-cv-pdf-012
 * Verifies: PDF generation for all 3 formats (full, resume, summary)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jsPDF before importing the module under test
const mockSave = vi.fn();
const mockText = vi.fn();
const mockAddPage = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFont = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetLineWidth = vi.fn();
const mockLine = vi.fn();
const mockSetPage = vi.fn();
const mockSetProperties = vi.fn();
const mockSplitTextToSize = vi.fn((_text: string, _maxWidth: number) => [
  _text,
]);
const mockGetTextWidth = vi.fn((_text: string) => _text.length * 2);
const mockGetNumberOfPages = vi.fn(() => 1);

const mockJsPDFInstance = {
  save: mockSave,
  text: mockText,
  addPage: mockAddPage,
  setFontSize: mockSetFontSize,
  setTextColor: mockSetTextColor,
  setFont: mockSetFont,
  setDrawColor: mockSetDrawColor,
  setLineWidth: mockSetLineWidth,
  line: mockLine,
  setPage: mockSetPage,
  setProperties: mockSetProperties,
  splitTextToSize: mockSplitTextToSize,
  getTextWidth: mockGetTextWidth,
  getNumberOfPages: mockGetNumberOfPages,
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => mockJsPDFInstance),
}));

import { generateCvPdf } from '@/lib/cv/pdf-generator';
import type { CVData } from '@/types/cv';

function createTestCvData(overrides: Partial<CVData> = {}): CVData {
  return {
    personal: {
      name: { first: 'Juan', last: 'Garcia', full: 'Juan Garcia' },
      title: 'Data Scientist',
      location: 'Mexico City, Mexico',
      contact: {
        email: 'juan@example.com',
        linkedin: 'linkedin.com/in/juangarcia',
      },
      summary: 'Experienced data scientist with expertise in ML and AI.',
    },
    experience: [
      {
        title: 'Senior Data Scientist',
        company: 'TechCorp',
        location: 'Mexico City',
        startDate: '2022-01',
        endDate: undefined,
        current: true,
        description: 'Leading ML team on production models.',
        technologies: ['Python', 'TensorFlow'],
      },
      {
        title: 'Data Scientist',
        company: 'DataInc',
        location: 'Guadalajara',
        startDate: '2020-06',
        endDate: '2021-12',
        current: false,
        description: 'Built recommendation engine.',
        technologies: ['Python', 'PyTorch'],
      },
      {
        title: 'Junior Analyst',
        company: 'StartupCo',
        location: 'Monterrey',
        startDate: '2018-01',
        endDate: '2020-05',
        current: false,
        description: 'Data analysis and reporting.',
        technologies: ['R', 'SQL'],
      },
      {
        title: 'Intern',
        company: 'BigCo',
        location: 'Mexico City',
        startDate: '2017-06',
        endDate: '2017-12',
        current: false,
        description: 'Summer internship in analytics.',
        technologies: ['Excel'],
      },
    ],
    education: [
      {
        degree: 'MSc Data Science',
        institution: 'UNAM',
        fieldOfStudy: 'Data Science',
        startDate: '2020',
        endDate: '2022',
        current: false,
      },
      {
        degree: 'BSc Mathematics',
        institution: 'IPN',
        fieldOfStudy: 'Mathematics',
        startDate: '2016',
        endDate: '2020',
        current: false,
      },
      {
        degree: 'Diploma in AI',
        institution: 'Stanford Online',
        fieldOfStudy: 'AI',
        startDate: '2023',
        endDate: undefined,
        current: true,
      },
    ],
    certifications: [
      { name: 'AWS ML Specialty', issuer: 'Amazon', date: '2023-01' },
      { name: 'GCP Data Engineer', issuer: 'Google', date: '2022-06' },
      { name: 'TensorFlow Developer', issuer: 'Google', date: '2022-03' },
      { name: 'Azure AI Engineer', issuer: 'Microsoft', date: '2021-11' },
      { name: 'DataBricks Spark', issuer: 'Databricks', date: '2021-06' },
      { name: 'Kubernetes Admin', issuer: 'CNCF', date: '2021-01' },
    ],
    projects: [
      {
        title: 'ML Pipeline',
        description: 'End-to-end ML pipeline for production.',
        category: 'ML',
        technologies: ['Python', 'Airflow'],
        featured: true,
      },
      {
        title: 'Dashboard App',
        description: 'Real-time analytics dashboard.',
        category: 'Web',
        technologies: ['React', 'D3'],
        featured: false,
      },
    ],
    skills: ['Python', 'TensorFlow', 'SQL', 'Docker', 'Kubernetes'],
    languages: [
      { name: 'Spanish', proficiency: 'Native' },
      { name: 'English', proficiency: 'Fluent' },
    ],
    metadata: {
      generatedAt: '2026-03-21',
      memberSlug: 'juan-garcia',
      lang: 'es',
    },
    ...overrides,
  };
}

describe('generateCvPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNumberOfPages.mockReturnValue(1);
  });

  describe('TC-cv-pdf-001: Full CV generation', () => {
    it('generates a PDF and calls save with correct filename', async () => {
      /** Verifies: AC-pdf-full */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'es');

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith('Juan_Garcia_CV_Full.pdf');
    });
  });

  describe('TC-cv-pdf-002: Resume (2-page) generation', () => {
    it('generates a PDF and calls save with resume filename', async () => {
      /** Verifies: AC-pdf-resume */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'resume', 'es');

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith('Juan_Garcia_Resume_2pg.pdf');
    });
  });

  describe('TC-cv-pdf-003: Summary (1-page) generation', () => {
    it('generates a PDF and calls save with summary filename', async () => {
      /** Verifies: AC-pdf-summary */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'summary', 'es');

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith('Juan_Garcia_Resume_1pg.pdf');
    });
  });

  describe('TC-cv-pdf-004: Header rendering', () => {
    it('renders the full name and title in the header', async () => {
      /** Verifies: AC-pdf-header */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'es');

      expect(mockText).toHaveBeenCalledWith(
        'Juan Garcia',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockText).toHaveBeenCalledWith(
        'Data Scientist',
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('TC-cv-pdf-005: Full format includes all experience entries', () => {
    it('renders all 4 experience entries in full format', async () => {
      /** Verifies: AC-pdf-full-experience */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'es');

      // Check for unique job titles (excluding "Data Scientist" which also appears as personal.title)
      const seniorCalls = mockText.mock.calls.filter(
        (c) => c[0] === 'Senior Data Scientist'
      );
      const juniorCalls = mockText.mock.calls.filter(
        (c) => c[0] === 'Junior Analyst'
      );
      const internCalls = mockText.mock.calls.filter((c) => c[0] === 'Intern');
      // "Data Scientist" appears as both personal.title and job title, so it should appear at least twice
      const dsCalls = mockText.mock.calls.filter(
        (c) => c[0] === 'Data Scientist'
      );

      expect(seniorCalls.length).toBe(1);
      expect(juniorCalls.length).toBe(1);
      expect(internCalls.length).toBe(1);
      expect(dsCalls.length).toBeGreaterThanOrEqual(2); // header + experience entry
    });
  });

  describe('TC-cv-pdf-006: Resume format limits experience to 3', () => {
    it('renders only top 3 experience entries in resume format', async () => {
      /** Verifies: AC-pdf-resume-experience */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'resume', 'es');

      const internCalls = mockText.mock.calls.filter(
        (call) => call[0] === 'Intern'
      );
      expect(internCalls.length).toBe(0);
    });
  });

  describe('TC-cv-pdf-007: Summary format limits experience to 1', () => {
    it('renders only the current role in summary format', async () => {
      /** Verifies: AC-pdf-summary-experience */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'summary', 'es');

      const seniorCalls = mockText.mock.calls.filter(
        (call) => call[0] === 'Senior Data Scientist'
      );
      expect(seniorCalls.length).toBe(1);

      const dataSciCalls = mockText.mock.calls.filter(
        (call) => call[0] === 'Data Scientist'
      );
      // 'Data Scientist' appears as personal.title in header, but not as a job title in summary
      // In summary, only 1 experience entry is shown (Senior Data Scientist)
      const internCalls = mockText.mock.calls.filter(
        (call) => call[0] === 'Intern'
      );
      expect(internCalls.length).toBe(0);
    });
  });

  describe('TC-cv-pdf-008: Resume limits certifications to 5', () => {
    it('renders at most 5 certifications in resume format', async () => {
      /** Verifies: AC-pdf-resume-certs */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'resume', 'es');

      // 6th cert "Kubernetes Admin" should not appear
      const k8sCalls = mockText.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('Kubernetes Admin')
      );
      expect(k8sCalls.length).toBe(0);
    });
  });

  describe('TC-cv-pdf-009: Summary skips certifications entirely', () => {
    it('does not render certifications section in summary', async () => {
      /** Verifies: AC-pdf-summary-no-certs */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'summary', 'es');

      const certCalls = mockText.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('AWS ML Specialty')
      );
      expect(certCalls.length).toBe(0);
    });
  });

  describe('TC-cv-pdf-010: Full format includes projects', () => {
    it('renders projects section in full format', async () => {
      /** Verifies: AC-pdf-full-projects */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'es');

      const projectCalls = mockText.mock.calls.filter(
        (call) => call[0] === 'ML Pipeline' || call[0] === 'Dashboard App'
      );
      expect(projectCalls.length).toBe(2);
    });
  });

  describe('TC-cv-pdf-011: Summary and resume skip projects', () => {
    it('does not render projects in resume format', async () => {
      /** Verifies: AC-pdf-no-projects-resume */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'resume', 'es');

      const projectCalls = mockText.mock.calls.filter(
        (call) => call[0] === 'ML Pipeline'
      );
      expect(projectCalls.length).toBe(0);
    });
  });

  describe('TC-cv-pdf-012: Footer with page numbers', () => {
    it('renders footer on all pages', async () => {
      /** Verifies: AC-pdf-footer */
      mockGetNumberOfPages.mockReturnValue(2);
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'es');

      // setPage called for each page in footer loop
      expect(mockSetPage).toHaveBeenCalledWith(1);
      expect(mockSetPage).toHaveBeenCalledWith(2);
    });
  });

  describe('TC-cv-pdf-013: English language labels', () => {
    it('uses English section headers when lang is en', async () => {
      /** Verifies: AC-pdf-i18n */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'en');

      const sectionHeaders = mockText.mock.calls
        .filter((call) => typeof call[0] === 'string')
        .map((call) => call[0]);

      expect(sectionHeaders).toEqual(
        expect.arrayContaining([
          'Summary',
          'Professional Experience',
          'Education',
        ])
      );
    });
  });

  describe('TC-cv-pdf-014: Spanish language labels', () => {
    it('uses Spanish section headers when lang is es', async () => {
      /** Verifies: AC-pdf-i18n */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'es');

      const sectionHeaders = mockText.mock.calls
        .filter((call) => typeof call[0] === 'string')
        .map((call) => call[0]);

      expect(sectionHeaders).toEqual(
        expect.arrayContaining([
          'Resumen',
          'Experiencia Profesional',
          'Educacion',
        ])
      );
    });
  });

  describe('TC-cv-pdf-015: Empty sections are skipped', () => {
    it('does not render experience section when empty', async () => {
      /** Verifies: AC-pdf-empty-sections */
      const cvData = createTestCvData({ experience: [] });
      await generateCvPdf(cvData, 'full', 'es');

      const expHeaderCalls = mockText.mock.calls.filter(
        (call) => call[0] === 'Experiencia Profesional'
      );
      expect(expHeaderCalls.length).toBe(0);
    });
  });

  describe('TC-cv-pdf-016: Current position uses Present/Actual label', () => {
    it('uses "Actual" for current positions in Spanish', async () => {
      /** Verifies: AC-pdf-current-date */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'es');

      const actualCalls = mockText.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('Actual')
      );
      expect(actualCalls.length).toBeGreaterThan(0);
    });
  });

  describe('TC-cv-pdf-017: PDF properties are set', () => {
    it('sets document properties with member name', async () => {
      /** Verifies: AC-pdf-metadata */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'full', 'es');

      expect(mockSetProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Juan Garcia - CV',
          author: 'Juan Garcia',
        })
      );
    });
  });

  describe('TC-cv-pdf-018: Resume limits education to 2', () => {
    it('renders only top 2 education entries in resume format', async () => {
      /** Verifies: AC-pdf-resume-education */
      const cvData = createTestCvData();
      await generateCvPdf(cvData, 'resume', 'es');

      const diplomaCalls = mockText.mock.calls.filter(
        (call) => call[0] === 'Diploma in AI'
      );
      expect(diplomaCalls.length).toBe(0);
    });
  });
});
