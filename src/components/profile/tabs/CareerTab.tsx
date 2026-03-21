import React, { useState, useCallback } from 'react';
import { PlusIcon, LinkIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { FormData } from '../profile-edit-types';
import { SUGGESTED_SKILLS } from '../profile-edit-types';
import type { WorkExperience } from '@/types/member';
import { EntryCard } from '../shared/EntryCard';
import { CompanyAutocomplete } from '../shared/CompanyAutocomplete';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { TagInput } from '../shared/TagInput';
import { parseLinkedInText } from '@/lib/linkedin-parser';

interface CareerTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  lang: 'es' | 'en';
}

const MAX_WORK_ENTRIES = 20;

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 ' +
  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';

function createEmptyEntry(): WorkExperience {
  return {
    id: crypto.randomUUID(),
    company: '',
    position: '',
    startDate: new Date(),
    current: false,
  };
}

function dateToMonthYear(
  date: Date | undefined
): { month: number; year: number } | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function monthYearToDate(
  value: { month: number; year: number } | null
): Date | undefined {
  if (!value) return undefined;
  return new Date(value.year, value.month - 1, 1);
}

function formatDateRange(
  startDate: Date,
  endDate: Date | undefined,
  current: boolean,
  lang: 'es' | 'en'
): string {
  const formatDate = (d: Date): string => {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    const month = date.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US', {
      month: 'short',
    });
    return `${month} ${date.getFullYear()}`;
  };

  const start = formatDate(startDate);
  if (current) {
    return `${start} - ${lang === 'es' ? 'Presente' : 'Present'}`;
  }
  if (endDate) {
    return `${start} - ${formatDate(endDate)}`;
  }
  return start;
}

function sortByDateDescending(entries: WorkExperience[]): WorkExperience[] {
  return [...entries].sort((a, b) => {
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;
    const dateA =
      a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
    const dateB =
      b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
    return dateB.getTime() - dateA.getTime();
  });
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function convertParsedToWorkExperience(
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

export const CareerTab: React.FC<CareerTabProps> = ({
  formData,
  setFormData,
  lang,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftEntry, setDraftEntry] = useState<WorkExperience | null>(null);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedInText, setLinkedInText] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const sortedEntries = sortByDateDescending(formData.workHistory);

  const updateWorkHistory = useCallback(
    (updater: (entries: WorkExperience[]) => WorkExperience[]) => {
      setFormData((prev) => ({
        ...prev,
        workHistory: updater(prev.workHistory),
      }));
    },
    [setFormData]
  );

  const handleAddEntry = () => {
    if (formData.workHistory.length >= MAX_WORK_ENTRIES) return;
    const entry = createEmptyEntry();
    setDraftEntry(entry);
    setEditingId(entry.id);
    updateWorkHistory((entries) => [entry, ...entries]);
  };

  const handleSaveEntry = () => {
    if (!draftEntry) return;

    updateWorkHistory((entries) => {
      let updated = entries.map((e) =>
        e.id === draftEntry.id ? draftEntry : e
      );
      if (draftEntry.current) {
        updated = updated.map((e) =>
          e.id !== draftEntry.id && e.current ? { ...e, current: false } : e
        );
      }
      return updated;
    });

    setEditingId(null);
    setDraftEntry(null);
  };

  const handleCancelEntry = () => {
    if (!draftEntry) return;

    const existsInForm = formData.workHistory.some(
      (e) => e.id === draftEntry.id && e.company === '' && e.position === ''
    );
    if (existsInForm) {
      updateWorkHistory((entries) =>
        entries.filter((e) => e.id !== draftEntry.id)
      );
    }

    setEditingId(null);
    setDraftEntry(null);
  };

  const handleEditEntry = (entry: WorkExperience) => {
    setDraftEntry({ ...entry });
    setEditingId(entry.id);
  };

  const handleDeleteEntry = (id: string) => {
    updateWorkHistory((entries) => entries.filter((e) => e.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraftEntry(null);
    }
  };

  const updateDraft = (updates: Partial<WorkExperience>) => {
    if (!draftEntry) return;
    setDraftEntry({ ...draftEntry, ...updates });
  };

  const handleLinkedInImport = () => {
    const parsed = parseLinkedInText(linkedInText);
    if (parsed.length === 0) {
      setImportMessage(
        lang === 'es'
          ? 'No se encontraron entradas. Verifica el texto e intenta de nuevo.'
          : 'No entries found. Check the text and try again.'
      );
      return;
    }

    const newEntries = convertParsedToWorkExperience(parsed);
    const available = MAX_WORK_ENTRIES - formData.workHistory.length;
    const toAdd = newEntries.slice(0, available);

    updateWorkHistory((entries) => [...entries, ...toAdd]);

    const count = toAdd.length;
    setImportMessage(
      lang === 'es'
        ? `Se importaron ${count} entrada${count !== 1 ? 's' : ''}. Revisa y edita antes de guardar.`
        : `Imported ${count} entr${count !== 1 ? 'ies' : 'y'}. Review and edit before saving.`
    );
    setShowLinkedInModal(false);
    setLinkedInText('');
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Work History */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {lang === 'es' ? 'Experiencia Laboral' : 'Work Experience'}
          </h3>
          {!editingId && (
            <button
              type="button"
              onClick={() => {
                setImportMessage(null);
                setShowLinkedInModal(true);
              }}
              className={
                'inline-flex items-center gap-2 rounded-lg border ' +
                'border-gray-300 bg-white px-4 py-2 text-sm font-medium ' +
                'text-gray-700 hover:bg-gray-50 ' +
                'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 ' +
                'transition-colors dark:hover:bg-gray-700'
              }
            >
              <LinkedInIcon className="h-4 w-4" />
              {lang === 'es' ? 'Importar de LinkedIn' : 'Import from LinkedIn'}
            </button>
          )}
        </div>

        {importMessage && (
          <div
            className={
              'mb-4 flex items-center justify-between rounded-lg border ' +
              'border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 ' +
              'dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
            }
          >
            <span>{importMessage}</span>
            <button
              type="button"
              onClick={() => setImportMessage(null)}
              className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-4">
          {sortedEntries.map((entry) => {
            const isEditing = editingId === entry.id;
            const editData = isEditing && draftEntry ? draftEntry : entry;

            return (
              <EntryCard
                key={entry.id}
                title={
                  entry.position ||
                  (lang === 'es' ? 'Sin puesto' : 'No position')
                }
                subtitle={entry.company || undefined}
                dateRange={formatDateRange(
                  entry.startDate,
                  entry.endDate,
                  entry.current,
                  lang
                )}
                isEditing={isEditing}
                onEdit={() => handleEditEntry(entry)}
                onDelete={() => handleDeleteEntry(entry.id)}
                onSave={handleSaveEntry}
                onCancel={handleCancelEntry}
                lang={lang}
              >
                {isEditing && (
                  <WorkEntryForm
                    entry={editData}
                    onUpdate={updateDraft}
                    lang={lang}
                  />
                )}
              </EntryCard>
            );
          })}
        </div>

        {formData.workHistory.length < MAX_WORK_ENTRIES && !editingId && (
          <button
            type="button"
            onClick={handleAddEntry}
            className={
              'mt-4 flex items-center gap-2 rounded-lg border-2 border-dashed ' +
              'border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 ' +
              'hover:border-primary-400 hover:text-primary-600 ' +
              'dark:border-gray-600 dark:text-gray-400 ' +
              'dark:hover:border-primary-500 dark:hover:text-primary-400 ' +
              'w-full justify-center transition-colors'
            }
          >
            <PlusIcon className="h-5 w-5" />
            {lang === 'es' ? 'Agregar Experiencia' : 'Add Experience'}
          </button>
        )}
      </div>

      {/* Section 2: Skills */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Habilidades' : 'Skills'}
        </h3>
        <TagInput
          tags={formData.skills}
          onChange={(tags) =>
            setFormData((prev) => ({ ...prev, skills: tags }))
          }
          suggestions={SUGGESTED_SKILLS}
          placeholder={lang === 'es' ? 'Agregar habilidad...' : 'Add skill...'}
        />
      </div>

      {/* Section 3: Social Links */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Enlaces sociales' : 'Social Links'}
        </h3>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <LinkIcon className="mr-1 inline h-4 w-4" />
            LinkedIn
          </label>
          <input
            type="url"
            value={formData.linkedinUrl}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))
            }
            className={INPUT_CLASS}
            placeholder="https://linkedin.com/in/username"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <LinkIcon className="mr-1 inline h-4 w-4" />
            GitHub
          </label>
          <input
            type="url"
            value={formData.githubUrl}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, githubUrl: e.target.value }))
            }
            className={INPUT_CLASS}
            placeholder="https://github.com/username"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <LinkIcon className="mr-1 inline h-4 w-4" />
            {lang === 'es' ? 'Portafolio' : 'Portfolio'}
          </label>
          <input
            type="url"
            value={formData.portfolioUrl}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, portfolioUrl: e.target.value }))
            }
            className={INPUT_CLASS}
            placeholder="https://portfolio.com"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <LinkIcon className="mr-1 inline h-4 w-4" />
            Twitter
          </label>
          <input
            type="url"
            value={formData.twitterUrl}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, twitterUrl: e.target.value }))
            }
            className={INPUT_CLASS}
            placeholder="https://twitter.com/username"
          />
        </div>
      </div>

      {/* LinkedIn Import Modal */}
      {showLinkedInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <LinkedInIcon className="mr-2 inline h-5 w-5 text-[#0A66C2]" />
                {lang === 'es'
                  ? 'Importar de LinkedIn'
                  : 'Import from LinkedIn'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowLinkedInModal(false);
                  setLinkedInText('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {lang === 'es'
                ? 'Copia la seccion de Experiencia de tu perfil de LinkedIn y pegala aqui. El formato esperado es: Puesto, Empresa, Fechas, Ubicacion (una entrada por bloque).'
                : 'Copy the Experience section from your LinkedIn profile and paste it here. Expected format: Position, Company, Dates, Location (one entry per block).'}
            </p>

            <textarea
              value={linkedInText}
              onChange={(e) => setLinkedInText(e.target.value)}
              rows={10}
              className={
                INPUT_CLASS +
                ' resize-y font-mono text-sm placeholder:font-sans'
              }
              placeholder={
                lang === 'es'
                  ? 'Data Scientist\nBBVA\nEne 2022 - Actual · 3 anos\nCiudad de Mexico'
                  : 'Data Scientist\nBBVA\nJan 2022 - Present · 3 yrs\nMexico City, Mexico'
              }
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLinkedInModal(false);
                  setLinkedInText('');
                }}
                className={
                  'rounded-lg border border-gray-300 px-4 py-2 text-sm ' +
                  'font-medium text-gray-700 hover:bg-gray-50 ' +
                  'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleLinkedInImport}
                disabled={!linkedInText.trim()}
                className={
                  'rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium ' +
                  'text-white hover:bg-primary-700 disabled:cursor-not-allowed ' +
                  'transition-colors disabled:opacity-50'
                }
              >
                {lang === 'es' ? 'Importar' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Internal sub-component for the work experience entry editing form.
 * Rendered inside EntryCard when editing.
 */
const WorkEntryForm: React.FC<{
  entry: WorkExperience;
  onUpdate: (updates: Partial<WorkExperience>) => void;
  lang: 'es' | 'en';
}> = ({ entry, onUpdate, lang }) => {
  return (
    <>
      {/* Company */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Empresa' : 'Company'}
        </label>
        <CompanyAutocomplete
          value={entry.company}
          companyId={entry.companyId}
          onChange={(name, companyId) => onUpdate({ company: name, companyId })}
          lang={lang}
        />
      </div>

      {/* Position */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Puesto' : 'Position'}
        </label>
        <input
          type="text"
          value={entry.position}
          onChange={(e) => onUpdate({ position: e.target.value })}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Ej: Data Scientist Senior'
              : 'Ex: Senior Data Scientist'
          }
        />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Fecha de inicio' : 'Start Date'}
          </label>
          <MonthYearPicker
            value={dateToMonthYear(entry.startDate)}
            onChange={(val) => {
              const date = monthYearToDate(val);
              if (date) onUpdate({ startDate: date });
            }}
            lang={lang}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Fecha de fin' : 'End Date'}
          </label>
          <MonthYearPicker
            value={dateToMonthYear(entry.endDate)}
            onChange={(val) => onUpdate({ endDate: monthYearToDate(val) })}
            disabled={entry.current}
            lang={lang}
          />
        </div>
      </div>

      {/* Current checkbox */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={entry.current}
          onChange={(e) => {
            const isCurrent = e.target.checked;
            onUpdate({
              current: isCurrent,
              endDate: isCurrent ? undefined : entry.endDate,
            });
          }}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Trabajo aquí actualmente' : 'I currently work here'}
        </span>
      </label>

      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Descripción' : 'Description'}
        </label>
        <textarea
          value={entry.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Describe tus responsabilidades y logros...'
              : 'Describe your responsibilities and achievements...'
          }
        />
      </div>

      {/* Technologies */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Tecnologías' : 'Technologies'}
        </label>
        <TagInput
          tags={entry.technologies ?? []}
          onChange={(tags) => onUpdate({ technologies: tags })}
          suggestions={SUGGESTED_SKILLS}
          placeholder={
            lang === 'es' ? 'Agregar tecnología...' : 'Add technology...'
          }
        />
      </div>
    </>
  );
};

export default CareerTab;
