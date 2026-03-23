/**
 * CV PDF generator using jsPDF.
 *
 * Generates PDF documents from CVData in 3 formats:
 * - full: Complete CV with all sections, multi-page
 * - resume: Top 3 jobs, top 2 education, top 5 certs, skills, languages (2-page target)
 * - summary: Brief bio, current role, education summary, skills (1-page target)
 *
 * Uses dynamic import of jsPDF to avoid SSR issues in Astro.
 */
import type { CVData } from '@/types/cv';

export type PdfFormat = 'full' | 'resume' | 'summary';

const SECID_PRIMARY = '#1E3A5F';
const TEXT_DARK = '#333333';
const TEXT_GRAY = '#666666';
const TEXT_LIGHT = '#555555';
const FOOTER_COLOR = '#999999';

const PAGE_WIDTH = 210;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const PAGE_BOTTOM = 280;

interface Labels {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  certifications: string;
  languages: string;
  projects: string;
  present: string;
}

const LABELS_ES: Labels = {
  summary: 'Resumen',
  experience: 'Experiencia Profesional',
  education: 'Educacion',
  skills: 'Habilidades',
  certifications: 'Certificaciones',
  languages: 'Idiomas',
  projects: 'Proyectos',
  present: 'Actual',
};

const LABELS_EN: Labels = {
  summary: 'Summary',
  experience: 'Professional Experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  languages: 'Languages',
  projects: 'Projects',
  present: 'Present',
};

function getLabels(lang: 'es' | 'en'): Labels {
  return lang === 'es' ? LABELS_ES : LABELS_EN;
}

function getExperienceSlice(format: PdfFormat, total: number): number {
  if (format === 'summary') return Math.min(1, total);
  if (format === 'resume') return Math.min(3, total);
  return total;
}

function getEducationSlice(format: PdfFormat, total: number): number {
  if (format === 'summary') return Math.min(1, total);
  if (format === 'resume') return Math.min(2, total);
  return total;
}

function getCertificationSlice(format: PdfFormat, total: number): number {
  if (format === 'resume') return Math.min(5, total);
  return total;
}

function buildFilename(
  firstName: string,
  lastName: string,
  format: PdfFormat
): string {
  const formatLabel =
    format === 'full'
      ? 'CV_Full'
      : format === 'resume'
        ? 'Resume_2pg'
        : 'Resume_1pg';
  return `${firstName}_${lastName}_${formatLabel}.pdf`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsPDFInstance = any;

function addWrappedText(
  doc: JsPDFInstance,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: string = TEXT_DARK
): number {
  doc.setFontSize(fontSize);
  doc.setTextColor(color);
  const lines: string[] = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  const lineHeight = fontSize * 0.4;
  return lines.length * lineHeight + 2;
}

function addSectionHeader(
  doc: JsPDFInstance,
  title: string,
  y: number,
  color: string = SECID_PRIMARY
): number {
  doc.setFontSize(14);
  doc.setTextColor(color);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  const lineY = y + 3;
  doc.setDrawColor(color);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, lineY, MARGIN + CONTENT_WIDTH, lineY);
  doc.setFont('helvetica', 'normal');
  return lineY + 7;
}

function checkPageBreak(
  doc: JsPDFInstance,
  y: number,
  neededSpace: number
): number {
  if (y + neededSpace > PAGE_BOTTOM) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function renderHeader(doc: JsPDFInstance, cvData: CVData, y: number, color: string = SECID_PRIMARY): number {
  doc.setFontSize(22);
  doc.setTextColor(color);
  doc.setFont('helvetica', 'bold');
  doc.text(cvData.personal.name.full, MARGIN, y);
  y += 8;

  doc.setFontSize(12);
  doc.setTextColor(TEXT_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text(cvData.personal.title, MARGIN, y);
  y += 5;
  doc.text(cvData.personal.location, MARGIN, y);
  y += 8;

  const contacts = [
    cvData.personal.contact.email,
    cvData.personal.contact.linkedin,
  ].filter(Boolean);
  if (contacts.length) {
    doc.setFontSize(9);
    doc.text(contacts.join(' | '), MARGIN, y);
    y += 8;
  }

  return y;
}

function renderSummary(
  doc: JsPDFInstance,
  cvData: CVData,
  labels: Labels,
  y: number,
  color: string = SECID_PRIMARY
): number {
  if (!cvData.personal.summary) return y;

  y = addSectionHeader(doc, labels.summary, y, color);
  const height = addWrappedText(
    doc,
    cvData.personal.summary,
    MARGIN,
    y,
    CONTENT_WIDTH,
    10
  );
  return y + height + 5;
}

function renderExperience(
  doc: JsPDFInstance,
  cvData: CVData,
  format: PdfFormat,
  labels: Labels,
  y: number,
  color: string = SECID_PRIMARY
): number {
  const sliceCount = getExperienceSlice(format, cvData.experience.length);
  const experience = cvData.experience.slice(0, sliceCount);
  if (experience.length === 0) return y;

  y = addSectionHeader(doc, labels.experience, y, color);

  for (const job of experience) {
    y = checkPageBreak(doc, y, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT_DARK);
    doc.text(job.title, MARGIN, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_GRAY);
    const dateStr = `${job.startDate} — ${job.current ? labels.present : job.endDate}`;
    const dateWidth = doc.getTextWidth(dateStr);
    doc.text(dateStr, MARGIN + CONTENT_WIDTH - dateWidth, y);
    y += 5;

    doc.setFontSize(10);
    doc.text(job.company, MARGIN, y);
    y += 5;

    if (job.description && format !== 'summary') {
      const descHeight = addWrappedText(
        doc,
        job.description,
        MARGIN + 3,
        y,
        CONTENT_WIDTH - 3,
        9,
        TEXT_LIGHT
      );
      y += descHeight;
    }

    y += 3;
  }

  return y;
}

function renderEducation(
  doc: JsPDFInstance,
  cvData: CVData,
  format: PdfFormat,
  labels: Labels,
  y: number,
  color: string = SECID_PRIMARY
): number {
  const sliceCount = getEducationSlice(format, cvData.education.length);
  const education = cvData.education.slice(0, sliceCount);
  if (education.length === 0) return y;

  y = addSectionHeader(doc, labels.education, y, color);

  for (const edu of education) {
    y = checkPageBreak(doc, y, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT_DARK);
    doc.text(edu.degree, MARGIN, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const endLabel = edu.current ? labels.present : edu.endDate || '';
    doc.text(`${edu.institution} | ${edu.startDate} — ${endLabel}`, MARGIN, y);
    y += 7;
  }

  return y;
}

function renderSkills(
  doc: JsPDFInstance,
  cvData: CVData,
  labels: Labels,
  y: number,
  color: string = SECID_PRIMARY
): number {
  if (cvData.skills.length === 0) return y;

  y = addSectionHeader(doc, labels.skills, y, color);
  const height = addWrappedText(
    doc,
    cvData.skills.join(' \u2022 '),
    MARGIN,
    y,
    CONTENT_WIDTH,
    10
  );
  return y + height + 5;
}

function renderCertifications(
  doc: JsPDFInstance,
  cvData: CVData,
  format: PdfFormat,
  labels: Labels,
  y: number,
  color: string = SECID_PRIMARY
): number {
  if (format === 'summary') return y;

  const sliceCount = getCertificationSlice(
    format,
    cvData.certifications.length
  );
  const certs = cvData.certifications.slice(0, sliceCount);
  if (certs.length === 0) return y;

  y = addSectionHeader(doc, labels.certifications, y, color);

  for (const cert of certs) {
    y = checkPageBreak(doc, y, 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(cert.name, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(
      ` — ${cert.issuer} (${cert.date})`,
      MARGIN + doc.getTextWidth(cert.name),
      y
    );
    y += 5;
  }

  return y + 3;
}

function renderLanguages(
  doc: JsPDFInstance,
  cvData: CVData,
  labels: Labels,
  y: number,
  color: string = SECID_PRIMARY
): number {
  if (cvData.languages.length === 0) return y;

  y = addSectionHeader(doc, labels.languages, y, color);
  const langText = cvData.languages
    .map((l) => `${l.name} (${l.proficiency})`)
    .join(' \u2022 ');
  const height = addWrappedText(doc, langText, MARGIN, y, CONTENT_WIDTH, 10);
  return y + height;
}

function renderProjects(
  doc: JsPDFInstance,
  cvData: CVData,
  format: PdfFormat,
  labels: Labels,
  y: number,
  color: string = SECID_PRIMARY
): number {
  if (format !== 'full') return y;
  if (cvData.projects.length === 0) return y;

  y = addSectionHeader(doc, labels.projects, y, color);

  for (const proj of cvData.projects) {
    y = checkPageBreak(doc, y, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(proj.title, MARGIN, y);
    y += 5;

    if (proj.description) {
      const descHeight = addWrappedText(
        doc,
        proj.description,
        MARGIN,
        y,
        CONTENT_WIDTH,
        9,
        TEXT_LIGHT
      );
      y += descHeight;
    }

    y += 3;
  }

  return y;
}

function renderFooter(doc: JsPDFInstance, fullName: string): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(FOOTER_COLOR);
    doc.text(`SECiD — ${fullName}`, MARGIN, 290);
    doc.text(`${i}/${pageCount}`, PAGE_WIDTH - MARGIN - 10, 290);
  }
}

/**
 * Generate and download a PDF from CV data.
 *
 * Dynamically imports jsPDF to avoid SSR issues.
 * The generated PDF is automatically downloaded via `doc.save()`.
 */
export async function generateCvPdf(
  cvData: CVData,
  format: PdfFormat,
  lang: 'es' | 'en',
  accentColor: string = SECID_PRIMARY
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });

  const labels = getLabels(lang);
  let y = MARGIN;

  const c = accentColor;
  y = renderHeader(doc, cvData, y, c);
  y = renderSummary(doc, cvData, labels, y, c);
  y = renderExperience(doc, cvData, format, labels, y, c);
  y = renderEducation(doc, cvData, format, labels, y, c);
  y = renderSkills(doc, cvData, labels, y, c);
  y = renderCertifications(doc, cvData, format, labels, y, c);
  y = renderLanguages(doc, cvData, labels, y, c);
  y = renderProjects(doc, cvData, format, labels, y, c);

  // Suppress unused variable warning -- y tracks cursor position for extensibility
  void y;

  renderFooter(doc, cvData.personal.name.full);

  doc.setProperties({
    title: `${cvData.personal.name.full} - CV`,
    subject: 'Curriculum Vitae',
    author: cvData.personal.name.full,
    creator: 'SECiD CV Generator',
  });

  const filename = buildFilename(
    cvData.personal.name.first,
    cvData.personal.name.last,
    format
  );
  doc.save(filename);
}
