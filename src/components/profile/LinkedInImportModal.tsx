/**
 * Multi-section LinkedIn import modal.
 *
 * Lets users paste LinkedIn profile sections (Experience, Education, Skills,
 * Certifications, Languages) into per-tab textareas OR upload a PDF.
 * After previewing the parsed results, they confirm the import which calls
 * the `onImport` callback with the structured domain objects.
 *
 * The PDF path delegates text extraction to the `parseLinkedInPdf` Cloud
 * Function and then populates the Experience textarea with the returned text
 * so the same local parsing pipeline is used.
 */

import React, { useState, useCallback, useRef } from 'react';
import { XMarkIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import {
  parseLinkedInText,
  parseLinkedInEducation,
  parseLinkedInSkills,
  parseLinkedInCertifications,
  parseLinkedInLanguages,
  toEducationEntry,
  toLanguage,
  toCertification,
} from '@/lib/linkedin-parser';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { WorkExperience, EducationEntry, Certification, Language } from '@/types/member';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'experience' | 'education' | 'skills' | 'certifications' | 'languages';

export interface ImportedData {
  experience?: WorkExperience[];
  education?: EducationEntry[];
  skills?: string[];
  certifications?: Certification[];
  languages?: Language[];
}

interface LinkedInImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportedData) => void;
  lang: 'es' | 'en';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

interface TabDefinition {
  id: TabId;
  labelEs: string;
  labelEn: string;
  placeholderEs: string;
  placeholderEn: string;
}

const TABS: TabDefinition[] = [
  {
    id: 'experience',
    labelEs: 'Experiencia',
    labelEn: 'Experience',
    placeholderEs:
      'Data Scientist\nBBVA\nEne 2022 - Actual · 3 años\nCiudad de México',
    placeholderEn:
      'Data Scientist\nBBVA\nJan 2022 - Present · 3 yrs\nMexico City, Mexico',
  },
  {
    id: 'education',
    labelEs: 'Educación',
    labelEn: 'Education',
    placeholderEs: 'Universidad Nacional Autónoma de México\nLicenciatura en Matemáticas\n2015 - 2020',
    placeholderEn: 'National Autonomous University of Mexico\nBachelor of Science in Mathematics\n2015 - 2020',
  },
  {
    id: 'skills',
    labelEs: 'Habilidades',
    labelEn: 'Skills',
    placeholderEs: 'Python\nMachine Learning · 10 apoyos\nSQL',
    placeholderEn: 'Python\nMachine Learning · 10 endorsements\nSQL',
  },
  {
    id: 'certifications',
    labelEs: 'Certificaciones',
    labelEn: 'Certifications',
    placeholderEs: 'AWS Certified Solutions Architect\nAmazon Web Services\nIssued Jan 2023',
    placeholderEn: 'AWS Certified Solutions Architect\nAmazon Web Services\nIssued Jan 2023',
  },
  {
    id: 'languages',
    labelEs: 'Idiomas',
    labelEn: 'Languages',
    placeholderEs: 'Español\nNativo o bilingüe\nInglés\nCompetencia profesional plena',
    placeholderEn: 'Spanish\nNative or bilingual proficiency\nEnglish\nFull professional proficiency',
  },
];

type TabTexts = Record<TabId, string>;

const EMPTY_TEXTS: TabTexts = {
  experience: '',
  education: '',
  skills: '',
  certifications: '',
  languages: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertParsedExperienceToWorkExperience(
  parsed: ReturnType<typeof parseLinkedInText>
): WorkExperience[] {
  return parsed.map((entry) => ({
    id: crypto.randomUUID(),
    company: entry.company,
    position: entry.position,
    startDate: entry.startDate
      ? new Date(entry.startDate.year, entry.startDate.month - 1, 1)
      : new Date(),
    endDate: entry.endDate
      ? new Date(entry.endDate.year, entry.endDate.month - 1, 1)
      : undefined,
    current: entry.current,
    description: entry.location ? `Location: ${entry.location}` : undefined,
  }));
}

function buildPreviewData(texts: TabTexts): ImportedData {
  const data: ImportedData = {};

  if (texts.experience.trim()) {
    const parsed = parseLinkedInText(texts.experience);
    if (parsed.length > 0) {
      data.experience = convertParsedExperienceToWorkExperience(parsed);
    }
  }

  if (texts.education.trim()) {
    const parsed = parseLinkedInEducation(texts.education);
    if (parsed.length > 0) {
      data.education = parsed.map(toEducationEntry);
    }
  }

  if (texts.skills.trim()) {
    const parsed = parseLinkedInSkills(texts.skills);
    if (parsed.length > 0) {
      data.skills = parsed;
    }
  }

  if (texts.certifications.trim()) {
    const parsed = parseLinkedInCertifications(texts.certifications);
    if (parsed.length > 0) {
      data.certifications = parsed.map(toCertification);
    }
  }

  if (texts.languages.trim()) {
    const parsed = parseLinkedInLanguages(texts.languages);
    if (parsed.length > 0) {
      data.languages = parsed.map(toLanguage);
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

interface PreviewSectionProps {
  data: ImportedData;
  lang: 'es' | 'en';
}

function PreviewSection({ data, lang }: PreviewSectionProps) {
  const hasAnyData =
    (data.experience?.length ?? 0) > 0 ||
    (data.education?.length ?? 0) > 0 ||
    (data.skills?.length ?? 0) > 0 ||
    (data.certifications?.length ?? 0) > 0 ||
    (data.languages?.length ?? 0) > 0;

  if (!hasAnyData) {
    return (
      <p className="text-sm text-amber-600 dark:text-amber-400">
        {lang === 'es'
          ? 'No se encontraron datos para importar. Verifica el texto e intenta de nuevo.'
          : 'No data found to import. Check the text and try again.'}
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {data.experience && data.experience.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? `Experiencia (${data.experience.length})` : `Experience (${data.experience.length})`}
          </h4>
          <ul className="space-y-1 pl-4">
            {data.experience.map((e) => (
              <li key={e.id} className="text-gray-600 dark:text-gray-400">
                {e.position} — {e.company}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.education && data.education.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? `Educación (${data.education.length})` : `Education (${data.education.length})`}
          </h4>
          <ul className="space-y-1 pl-4">
            {data.education.map((e) => (
              <li key={e.id} className="text-gray-600 dark:text-gray-400">
                {e.degree} — {e.institution}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.skills && data.skills.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? `Habilidades (${data.skills.length})` : `Skills (${data.skills.length})`}
          </h4>
          <p className="text-gray-600 dark:text-gray-400">{data.skills.join(', ')}</p>
        </div>
      )}

      {data.certifications && data.certifications.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es'
              ? `Certificaciones (${data.certifications.length})`
              : `Certifications (${data.certifications.length})`}
          </h4>
          <ul className="space-y-1 pl-4">
            {data.certifications.map((c) => (
              <li key={c.id} className="text-gray-600 dark:text-gray-400">
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.languages && data.languages.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? `Idiomas (${data.languages.length})` : `Languages (${data.languages.length})`}
          </h4>
          <ul className="space-y-1 pl-4">
            {data.languages.map((l) => (
              <li key={l.id} className="text-gray-600 dark:text-gray-400">
                {l.name} — {l.proficiency}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LinkedInImportModal({ isOpen, onClose, onImport, lang }: LinkedInImportModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('experience');
  const [texts, setTexts] = useState<TabTexts>(EMPTY_TEXTS);
  const [previewData, setPreviewData] = useState<ImportedData | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setTexts(EMPTY_TEXTS);
    setPreviewData(null);
    setActiveTab('experience');
    onClose();
  }, [onClose]);

  const handleTabTextChange = useCallback(
    (value: string) => {
      setTexts((prev) => ({ ...prev, [activeTab]: value }));
      setPreviewData(null);
    },
    [activeTab]
  );

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setPreviewData(null);
  }, []);

  const handlePreview = useCallback(() => {
    const data = buildPreviewData(texts);
    setPreviewData(data);
  }, [texts]);

  const handleImport = useCallback(() => {
    const data = previewData ?? buildPreviewData(texts);
    onImport(data);
    handleClose();
  }, [previewData, texts, onImport, handleClose]);

  const handlePdfUpload = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(lang === 'es' ? 'El archivo excede 5MB' : 'File exceeds 5MB');
        return;
      }
      setPdfUploading(true);
      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(buffer))
        );
        const functions = getFunctions();
        const parsePdf = httpsCallable(functions, 'parseLinkedInPdf');
        const result = await parsePdf({ pdfData: base64 });
        const { text } = result.data as { text: string };
        setTexts((prev) => ({ ...prev, experience: text }));
        setActiveTab('experience');
        setPreviewData(null);
      } catch {
        alert(
          lang === 'es' ? 'Error al procesar el PDF' : 'Failed to process PDF'
        );
      } finally {
        setPdfUploading(false);
      }
    },
    [lang]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handlePdfUpload(file);
      }
    },
    [handlePdfUpload]
  );

  if (!isOpen) return null;

  const activeTabDef = TABS.find((t) => t.id === activeTab)!;
  const hasAnyText = Object.values(texts).some((t) => t.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="linkedin-import-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2
            id="linkedin-import-title"
            className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
          >
            <LinkedInIcon className="h-5 w-5 text-[#0A66C2]" />
            {lang === 'es' ? 'Importar de LinkedIn' : 'Import from LinkedIn'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* PDF Upload Area */}
          <div
            className={
              'mb-4 flex cursor-pointer flex-col items-center justify-center ' +
              'rounded-lg border-2 border-dashed border-gray-300 px-4 py-5 ' +
              'text-center transition-colors hover:border-primary-400 ' +
              'dark:border-gray-600 dark:hover:border-primary-500 ' +
              (pdfUploading ? 'opacity-60' : '')
            }
            onClick={() => !pdfUploading && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !pdfUploading) {
                fileInputRef.current?.click();
              }
            }}
            aria-label={
              lang === 'es' ? 'Subir PDF de LinkedIn' : 'Upload LinkedIn PDF'
            }
          >
            <DocumentArrowUpIcon className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {pdfUploading
                ? lang === 'es'
                  ? 'Procesando...'
                  : 'Processing...'
                : lang === 'es'
                  ? 'Subir PDF de LinkedIn (máx. 5 MB)'
                  : 'Upload LinkedIn PDF (max. 5 MB)'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {lang === 'es'
                ? 'O pega el texto de tu perfil en las secciones de abajo'
                : 'Or paste your profile text in the sections below'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={pdfUploading}
            />
          </div>

          {/* Tab Bar */}
          <div className="mb-4 flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              const label = lang === 'es' ? tab.labelEs : tab.labelEn;
              const hasContent = texts[tab.id].trim().length > 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={
                    'flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ' +
                    (isActive
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300')
                  }
                  aria-selected={isActive}
                  role="tab"
                >
                  {label}
                  {hasContent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Textarea for active tab */}
          {previewData === null ? (
            <textarea
              value={texts[activeTab]}
              onChange={(e) => handleTabTextChange(e.target.value)}
              rows={10}
              className={
                'w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 ' +
                'font-mono text-sm text-gray-900 placeholder:font-sans ' +
                'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 ' +
                'dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              }
              placeholder={
                lang === 'es'
                  ? activeTabDef.placeholderEs
                  : activeTabDef.placeholderEn
              }
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Vista previa' : 'Preview'}
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {lang === 'es' ? 'Editar' : 'Edit'}
                </button>
              </div>
              <PreviewSection data={previewData} lang={lang} />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className={
              'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium ' +
              'text-gray-700 transition-colors hover:bg-gray-50 ' +
              'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }
          >
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </button>

          {previewData === null ? (
            <button
              type="button"
              onClick={handlePreview}
              disabled={!hasAnyText}
              className={
                'rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium ' +
                'text-primary-600 transition-colors hover:bg-primary-50 ' +
                'disabled:cursor-not-allowed disabled:opacity-50 ' +
                'dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20'
              }
            >
              {lang === 'es' ? 'Vista previa' : 'Preview'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              className={
                'rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium ' +
                'text-white transition-colors hover:bg-primary-700'
              }
            >
              {lang === 'es' ? 'Importar' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LinkedInImportModal;
