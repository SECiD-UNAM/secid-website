import React, { useState, useCallback } from 'react';
import { PlusIcon, LinkIcon } from '@heroicons/react/24/outline';
import type { FormData } from '../profile-edit-types';
import { SUGGESTED_SKILLS } from '../profile-edit-types';
import type { WorkExperience } from '@/types/member';
import { EntryCard } from '../shared/EntryCard';
import { CompanyAutocomplete } from '../shared/CompanyAutocomplete';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { TagInput } from '../shared/TagInput';

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

export const CareerTab: React.FC<CareerTabProps> = ({
  formData,
  setFormData,
  lang,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftEntry, setDraftEntry] = useState<WorkExperience | null>(null);

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

  return (
    <div className="space-y-8">
      {/* Section 1: Work History */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Experiencia Laboral' : 'Work Experience'}
        </h3>

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
