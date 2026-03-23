/**
 * CV PDF floating download button.
 *
 * Fixed-position circular button (bottom-right) that opens a slide-up
 * dropdown with 3 PDF format options and an accent color picker.
 * Supports light/dark mode and es/en localization.
 * Designed to be used as a React island via `client:only="react"`.
 */
import React, { useState, useRef, useEffect } from 'react';
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
  icon: string;
}

function getFormatOptions(lang: 'es' | 'en'): FormatOption[] {
  if (lang === 'es') {
    return [
      { key: 'full', label: 'CV Completo', detail: 'Todas las secciones', icon: '\uD83D\uDCC4' },
      { key: 'resume', label: 'Resumen (2 pag)', detail: 'Top empleos y educacion', icon: '\uD83D\uDCCB' },
      { key: 'summary', label: 'Resumen (1 pag)', detail: 'Perfil breve y habilidades', icon: '\uD83D\uDCDD' },
    ];
  }
  return [
    { key: 'full', label: 'Full CV', detail: 'All sections, multi-page', icon: '\uD83D\uDCC4' },
    { key: 'resume', label: '2-Page Resume', detail: 'Top jobs & education', icon: '\uD83D\uDCCB' },
    { key: 'summary', label: '1-Page Resume', detail: 'Brief profile & skills', icon: '\uD83D\uDCDD' },
  ];
}

const PRESET_COLORS = [
  { value: '#1E3A5F', label: 'SECiD Blue' },
  { value: '#f65425', label: 'SECiD Orange' },
  { value: '#059669', label: 'Green' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#dc2626', label: 'Red' },
  { value: '#0284c7', label: 'Sky Blue' },
  { value: '#333333', label: 'Classic' },
];

export default function CvPdfDownloader({ cvData, lang }: CvPdfDownloaderProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState<PdfFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState('#1E3A5F');
  const containerRef = useRef<HTMLDivElement>(null);

  const formats = getFormatOptions(lang);
  const colorLabel = lang === 'es' ? 'Color de acento' : 'Accent color';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleGenerate(format: PdfFormat) {
    setGenerating(format);
    setOpen(false);
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
    <div
      ref={containerRef}
      className="print:hidden"
      style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}
    >
      {/* Error toast */}
      {error && (
        <div
          role="alert"
          className="absolute bottom-[76px] right-0 mb-2 w-72 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/90 dark:text-red-300"
          style={{ animation: 'slideUp 0.2s ease' }}
        >
          <div className="flex items-start justify-between gap-2">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
              type="button"
              aria-label={lang === 'es' ? 'Cerrar' : 'Dismiss'}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute bottom-[76px] right-0 w-64 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
          style={{ animation: 'slideUp 0.2s ease' }}
        >
          {/* Color picker section */}
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {colorLabel}
            </label>
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAccentColor(c.value)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    accentColor === c.value
                      ? 'scale-110 border-gray-900 dark:border-white'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                  aria-label={c.label}
                />
              ))}
              <label
                className="relative cursor-pointer"
                title={lang === 'es' ? 'Color personalizado' : 'Custom color'}
              >
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="absolute inset-0 h-6 w-6 cursor-pointer opacity-0"
                />
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-[10px] text-gray-400 dark:border-gray-600 dark:text-gray-500">
                  +
                </div>
              </label>
            </div>
          </div>

          {/* Format options */}
          {formats.map((f, idx) => (
            <button
              key={f.key}
              onClick={() => handleGenerate(f.key)}
              disabled={generating !== null}
              className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-50 dark:hover:bg-gray-700/50 ${
                idx < formats.length - 1
                  ? 'border-b border-gray-100 dark:border-gray-700'
                  : ''
              }`}
              type="button"
              aria-label={`${lang === 'es' ? 'Descargar' : 'Download'} ${f.label}`}
            >
              <span className="mt-0.5 text-lg leading-none">{f.icon}</span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {f.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{f.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main floating button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={generating !== null}
        aria-label={lang === 'es' ? 'Descargar PDF' : 'Download PDF'}
        className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-0 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-wait disabled:opacity-70"
        style={{
          backgroundColor: generating ? '#6b7280' : accentColor,
          boxShadow: generating
            ? '0 4px 12px rgba(107, 114, 128, 0.4)'
            : `0 4px 12px ${accentColor}66`,
        }}
        type="button"
      >
        {generating ? (
          <span
            className="inline-block h-6 w-6 rounded-full border-[3px] border-white/30 border-t-white"
            style={{ animation: 'spin 1s linear infinite' }}
          />
        ) : (
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
            <path d="M12 18l4-4h-3V9h-2v5H8l4 4z" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
