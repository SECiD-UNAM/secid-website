/**
 * CV PDF download component.
 *
 * Renders 3 download buttons for different PDF formats (full, resume, summary).
 * Dynamically imports jsPDF to avoid SSR bundle issues.
 * Designed to be used as a React island via `client:only="react"`.
 */
import React, { useState } from 'react';
import type { CVData } from '@/types/cv';
import type { PdfFormat } from '@/lib/cv/pdf-generator';

interface CvPdfDownloaderProps {
  cvData: CVData;
  lang: 'es' | 'en';
}

interface FormatOption {
  key: PdfFormat;
  label: string;
  detail: string;
}

function getFormatOptions(lang: 'es' | 'en'): FormatOption[] {
  if (lang === 'es') {
    return [
      { key: 'full', label: 'CV Completo', detail: 'Todas las secciones' },
      {
        key: 'resume',
        label: 'Resumen (2 pag)',
        detail: 'Top empleos, educacion, certificaciones',
      },
      {
        key: 'summary',
        label: 'Resumen (1 pag)',
        detail: 'Perfil breve, rol actual, habilidades',
      },
    ];
  }
  return [
    { key: 'full', label: 'Full CV', detail: 'All sections, multi-page' },
    {
      key: 'resume',
      label: 'Resume (2pg)',
      detail: 'Top jobs, education, certifications',
    },
    {
      key: 'summary',
      label: 'Summary (1pg)',
      detail: 'Brief bio, current role, skills',
    },
  ];
}

const DownloadIcon: React.FC = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3"
    />
  </svg>
);

const Spinner: React.FC = () => (
  <svg
    className="h-4 w-4 animate-spin"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const PRESET_COLORS = [
  { value: '#1E3A5F', label: 'SECiD Blue' },
  { value: '#f65425', label: 'SECiD Orange' },
  { value: '#059669', label: 'Green' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#dc2626', label: 'Red' },
  { value: '#0284c7', label: 'Sky Blue' },
  { value: '#333333', label: 'Classic' },
];

export default function CvPdfDownloader({
  cvData,
  lang,
}: CvPdfDownloaderProps) {
  const [generating, setGenerating] = useState<PdfFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState('#1E3A5F');

  const formats = getFormatOptions(lang);
  const downloadingLabel = lang === 'es' ? 'Generando...' : 'Generating...';
  const errorDismissLabel = lang === 'es' ? 'Cerrar' : 'Dismiss';
  const sectionTitle = lang === 'es' ? 'Descargar PDF' : 'Download PDF';
  const colorLabel = lang === 'es' ? 'Color de acento' : 'Accent color';

  async function handleDownload(format: PdfFormat) {
    setGenerating(format);
    setError(null);
    try {
      const { generateCvPdf } = await import('@/lib/cv/pdf-generator');
      await generateCvPdf(cvData, format, lang, accentColor);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(
        lang === 'es'
          ? `Error al generar el PDF: ${message}`
          : `PDF generation failed: ${message}`
      );
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="print:hidden">
      {/* Section header */}
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {sectionTitle}
      </h3>

      {/* Error message */}
      {error && (
        <div
          className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          role="alert"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-xs font-medium underline hover:no-underline"
            type="button"
          >
            {errorDismissLabel}
          </button>
        </div>
      )}

      {/* Color picker */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
          {colorLabel}
        </label>
        <div className="flex items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setAccentColor(c.value)}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                accentColor === c.value
                  ? 'border-gray-900 dark:border-white scale-110'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
              aria-label={c.label}
            />
          ))}
          <label className="relative cursor-pointer" title={lang === 'es' ? 'Color personalizado' : 'Custom color'}>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0"
            />
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-600 dark:text-gray-500"
            >
              +
            </div>
          </label>
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        {formats.map((fmt) => {
          const isGenerating = generating === fmt.key;
          const isDisabled = generating !== null;

          return (
            <button
              key={fmt.key}
              onClick={() => handleDownload(fmt.key)}
              disabled={isDisabled}
              className={`
                group flex items-center gap-2 rounded-lg border px-4 py-2.5
                text-left text-sm font-medium transition-all
                ${
                  isDisabled
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600'
                    : 'dark:hover:bg-gray-750 border-primary-200 bg-white text-primary-700 shadow-sm hover:border-primary-400 hover:bg-primary-50 hover:shadow dark:border-primary-800 dark:bg-gray-800 dark:text-primary-400 dark:hover:border-primary-600'
                }
              `}
              type="button"
              aria-label={`${lang === 'es' ? 'Descargar' : 'Download'} ${fmt.label}`}
            >
              <span className="flex-shrink-0">
                {isGenerating ? <Spinner /> : <DownloadIcon />}
              </span>
              <span className="flex flex-col">
                <span className="leading-tight">
                  {isGenerating ? downloadingLabel : fmt.label}
                </span>
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  {fmt.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
