import React, { useState, useCallback } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { FormData } from '../profile-edit-types';
import type { EducationEntry, Certification, Language } from '@/types/member';
import { EntryCard } from '../shared/EntryCard';
import { MonthYearPicker } from '../shared/MonthYearPicker';

interface EducationTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  lang: 'es' | 'en';
}

const MAX_EDUCATION_ENTRIES = 10;
const MAX_CERTIFICATIONS = 20;
const MAX_LANGUAGES = 10;

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 ' +
  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const UNAM_CAMPUSES = [
  'IIMAS',
  'FES Acatlan',
  'Facultad de Ciencias',
  'FI',
  'FC',
  'FES Aragon',
  'Other',
] as const;

const COMMON_LANGUAGES = [
  'Espanol',
  'English',
  'Francais',
  'Deutsch',
  'Portugues',
  '\u4E2D\u6587',
  '\u65E5\u672C\u8A9E',
] as const;

const PROFICIENCY_OPTIONS = {
  es: [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
    { value: 'native', label: 'Nativo' },
  ],
  en: [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'native', label: 'Native' },
  ],
} as const;

function createEmptyEducation(): EducationEntry {
  return {
    id: crypto.randomUUID(),
    institution: '',
    degree: '',
    startDate: new Date(),
    current: false,
  };
}

function createEmptyCertification(): Certification {
  return {
    id: crypto.randomUUID(),
    name: '',
    issuer: '',
    issueDate: new Date(),
    verified: false,
  };
}

function createEmptyLanguage(): Language {
  return {
    id: crypto.randomUUID(),
    name: '',
    proficiency: 'beginner',
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

function isUnamInstitution(name: string): boolean {
  return name.toLowerCase().includes('unam');
}

function buildGenerationOptions(): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 2015 + 3 }, (_, i) =>
    String(2015 + i)
  );
}

function sortByDateDescending<T extends { startDate: Date; current: boolean }>(
  entries: T[]
): T[] {
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

function sortCertsByDateDescending(entries: Certification[]): Certification[] {
  return [...entries].sort((a, b) => {
    const dateA =
      a.issueDate instanceof Date ? a.issueDate : new Date(a.issueDate);
    const dateB =
      b.issueDate instanceof Date ? b.issueDate : new Date(b.issueDate);
    return dateB.getTime() - dateA.getTime();
  });
}

export const EducationTab: React.FC<EducationTabProps> = ({
  formData,
  setFormData,
  lang,
}) => {
  const [editingEducationId, setEditingEducationId] = useState<string | null>(
    null
  );
  const [draftEducation, setDraftEducation] = useState<EducationEntry | null>(
    null
  );
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [draftCert, setDraftCert] = useState<Certification | null>(null);

  const sortedEducation = sortByDateDescending(formData.educationHistory);
  const sortedCerts = sortCertsByDateDescending(formData.certifications);

  // --- Education History handlers ---

  const updateEducationHistory = useCallback(
    (updater: (entries: EducationEntry[]) => EducationEntry[]) => {
      setFormData((prev) => ({
        ...prev,
        educationHistory: updater(prev.educationHistory),
      }));
    },
    [setFormData]
  );

  const handleAddEducation = () => {
    if (formData.educationHistory.length >= MAX_EDUCATION_ENTRIES) return;
    const entry = createEmptyEducation();
    setDraftEducation(entry);
    setEditingEducationId(entry.id);
    updateEducationHistory((entries) => [entry, ...entries]);
  };

  const handleSaveEducation = () => {
    if (!draftEducation) return;
    updateEducationHistory((entries) =>
      entries.map((e) => (e.id === draftEducation.id ? draftEducation : e))
    );
    setEditingEducationId(null);
    setDraftEducation(null);
  };

  const handleCancelEducation = () => {
    if (!draftEducation) return;
    const isNew = formData.educationHistory.some(
      (e) =>
        e.id === draftEducation.id && e.institution === '' && e.degree === ''
    );
    if (isNew) {
      updateEducationHistory((entries) =>
        entries.filter((e) => e.id !== draftEducation.id)
      );
    }
    setEditingEducationId(null);
    setDraftEducation(null);
  };

  const handleEditEducation = (entry: EducationEntry) => {
    setDraftEducation({ ...entry });
    setEditingEducationId(entry.id);
  };

  const handleDeleteEducation = (id: string) => {
    updateEducationHistory((entries) => entries.filter((e) => e.id !== id));
    if (editingEducationId === id) {
      setEditingEducationId(null);
      setDraftEducation(null);
    }
  };

  const updateEducationDraft = (updates: Partial<EducationEntry>) => {
    if (!draftEducation) return;
    setDraftEducation({ ...draftEducation, ...updates });
  };

  // --- Certifications handlers ---

  const updateCertifications = useCallback(
    (updater: (entries: Certification[]) => Certification[]) => {
      setFormData((prev) => ({
        ...prev,
        certifications: updater(prev.certifications),
      }));
    },
    [setFormData]
  );

  const handleAddCert = () => {
    if (formData.certifications.length >= MAX_CERTIFICATIONS) return;
    const entry = createEmptyCertification();
    setDraftCert(entry);
    setEditingCertId(entry.id);
    updateCertifications((entries) => [entry, ...entries]);
  };

  const handleSaveCert = () => {
    if (!draftCert) return;
    updateCertifications((entries) =>
      entries.map((e) => (e.id === draftCert.id ? draftCert : e))
    );
    setEditingCertId(null);
    setDraftCert(null);
  };

  const handleCancelCert = () => {
    if (!draftCert) return;
    const isNew = formData.certifications.some(
      (e) => e.id === draftCert.id && e.name === '' && e.issuer === ''
    );
    if (isNew) {
      updateCertifications((entries) =>
        entries.filter((e) => e.id !== draftCert.id)
      );
    }
    setEditingCertId(null);
    setDraftCert(null);
  };

  const handleEditCert = (entry: Certification) => {
    setDraftCert({ ...entry });
    setEditingCertId(entry.id);
  };

  const handleDeleteCert = (id: string) => {
    updateCertifications((entries) => entries.filter((e) => e.id !== id));
    if (editingCertId === id) {
      setEditingCertId(null);
      setDraftCert(null);
    }
  };

  const updateCertDraft = (updates: Partial<Certification>) => {
    if (!draftCert) return;
    setDraftCert({ ...draftCert, ...updates });
  };

  // --- Languages handlers ---

  const handleAddLanguage = () => {
    if (formData.languages.length >= MAX_LANGUAGES) return;
    setFormData((prev) => ({
      ...prev,
      languages: [...prev.languages, createEmptyLanguage()],
    }));
  };

  const handleUpdateLanguage = (id: string, updates: Partial<Language>) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    }));
  };

  const handleDeleteLanguage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((l) => l.id !== id),
    }));
  };

  const isAnyEditing = editingEducationId !== null || editingCertId !== null;

  return (
    <div className="space-y-8">
      {/* Section 1: Education History */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Historial Educativo' : 'Education History'}
        </h3>

        <div className="space-y-4">
          {sortedEducation.map((entry) => {
            const isEditing = editingEducationId === entry.id;
            const editData =
              isEditing && draftEducation ? draftEducation : entry;

            return (
              <EntryCard
                key={entry.id}
                title={
                  entry.degree ||
                  (lang === 'es' ? 'Sin programa' : 'No program')
                }
                subtitle={entry.institution || undefined}
                dateRange={formatDateRange(
                  entry.startDate,
                  entry.endDate,
                  entry.current,
                  lang
                )}
                isEditing={isEditing}
                onEdit={() => handleEditEducation(entry)}
                onDelete={() => handleDeleteEducation(entry.id)}
                onSave={handleSaveEducation}
                onCancel={handleCancelEducation}
                lang={lang}
              >
                {isEditing && (
                  <EducationEntryForm
                    entry={editData}
                    onUpdate={updateEducationDraft}
                    lang={lang}
                  />
                )}
              </EntryCard>
            );
          })}
        </div>

        {formData.educationHistory.length < MAX_EDUCATION_ENTRIES &&
          !isAnyEditing && (
            <button
              type="button"
              onClick={handleAddEducation}
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
              {lang === 'es' ? 'Agregar Educacion' : 'Add Education'}
            </button>
          )}
      </div>

      {/* Section 2: Certifications */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Certificaciones' : 'Certifications'}
        </h3>

        <div className="space-y-4">
          {sortedCerts.map((entry) => {
            const isEditing = editingCertId === entry.id;
            const editData = isEditing && draftCert ? draftCert : entry;

            return (
              <EntryCard
                key={entry.id}
                title={entry.name || (lang === 'es' ? 'Sin nombre' : 'No name')}
                subtitle={entry.issuer || undefined}
                dateRange={
                  entry.issueDate
                    ? formatDateRange(
                        entry.issueDate,
                        entry.expiryDate,
                        false,
                        lang
                      )
                    : undefined
                }
                isEditing={isEditing}
                onEdit={() => handleEditCert(entry)}
                onDelete={() => handleDeleteCert(entry.id)}
                onSave={handleSaveCert}
                onCancel={handleCancelCert}
                lang={lang}
              >
                {isEditing && (
                  <CertificationForm
                    entry={editData}
                    onUpdate={updateCertDraft}
                    lang={lang}
                  />
                )}
              </EntryCard>
            );
          })}
        </div>

        {formData.certifications.length < MAX_CERTIFICATIONS &&
          !isAnyEditing && (
            <button
              type="button"
              onClick={handleAddCert}
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
              {lang === 'es' ? 'Agregar Certificacion' : 'Add Certification'}
            </button>
          )}
      </div>

      {/* Section 3: Languages */}
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Idiomas' : 'Languages'}
        </h3>

        <div className="space-y-3">
          {formData.languages.map((language) => (
            <LanguageRow
              key={language.id}
              language={language}
              onUpdate={(updates) => handleUpdateLanguage(language.id, updates)}
              onDelete={() => handleDeleteLanguage(language.id)}
              lang={lang}
            />
          ))}
        </div>

        {formData.languages.length < MAX_LANGUAGES && (
          <button
            type="button"
            onClick={handleAddLanguage}
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
            {lang === 'es' ? 'Agregar Idioma' : 'Add Language'}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Internal sub-component for editing an education entry.
 * Rendered inside EntryCard when editing.
 */
const EducationEntryForm: React.FC<{
  entry: EducationEntry;
  onUpdate: (updates: Partial<EducationEntry>) => void;
  lang: 'es' | 'en';
}> = ({ entry, onUpdate, lang }) => {
  const generations = buildGenerationOptions();
  const showUnamFields = isUnamInstitution(entry.institution);

  return (
    <>
      {/* Institution */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Institucion' : 'Institution'}
        </label>
        <input
          type="text"
          value={entry.institution}
          onChange={(e) => onUpdate({ institution: e.target.value })}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Ej: Universidad Nacional Autonoma de Mexico (UNAM)'
              : 'Ex: National Autonomous University of Mexico (UNAM)'
          }
        />
      </div>

      {/* Degree/Program */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Programa / Grado' : 'Program / Degree'}
        </label>
        <input
          type="text"
          value={entry.degree}
          onChange={(e) => onUpdate({ degree: e.target.value })}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Ej: Licenciatura en Ciencia de Datos'
              : 'Ex: B.Sc. in Data Science'
          }
        />
      </div>

      {/* Field of Study */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Area de estudio' : 'Field of Study'}
        </label>
        <input
          type="text"
          value={entry.fieldOfStudy ?? ''}
          onChange={(e) =>
            onUpdate({ fieldOfStudy: e.target.value || undefined })
          }
          className={INPUT_CLASS}
          placeholder={
            lang === 'es' ? 'Ej: Ciencia de Datos' : 'Ex: Data Science'
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

      {/* Currently studying */}
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
          {lang === 'es'
            ? 'Actualmente estudio aqui'
            : 'I currently study here'}
        </span>
      </label>

      {/* GPA */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          GPA ({lang === 'es' ? 'opcional' : 'optional'})
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="10"
          value={entry.gpa ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onUpdate({ gpa: val === '' ? undefined : parseFloat(val) });
          }}
          className={INPUT_CLASS}
          placeholder="Ej: 9.5"
        />
      </div>

      {/* Description/Achievements */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es'
            ? 'Descripcion / Logros'
            : 'Description / Achievements'}
        </label>
        <textarea
          value={entry.description ?? ''}
          onChange={(e) =>
            onUpdate({ description: e.target.value || undefined })
          }
          rows={3}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Describe tus logros y actividades destacadas...'
              : 'Describe your achievements and notable activities...'
          }
        />
      </div>

      {/* UNAM-specific fields */}
      {showUnamFields && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="mb-3 text-sm font-medium text-blue-800 dark:text-blue-300">
            {lang === 'es' ? 'Informacion UNAM' : 'UNAM Information'}
          </p>

          {/* Campus */}
          <div className="mb-3">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Campus
            </label>
            <select
              value={entry.campus ?? ''}
              onChange={(e) =>
                onUpdate({ campus: e.target.value || undefined })
              }
              className={INPUT_CLASS}
            >
              <option value="">
                {lang === 'es' ? 'Seleccionar campus' : 'Select campus'}
              </option>
              {UNAM_CAMPUSES.map((campus) => (
                <option key={campus} value={campus}>
                  {campus}
                </option>
              ))}
            </select>
          </div>

          {/* Numero de cuenta */}
          <div className="mb-3">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {lang === 'es' ? 'Numero de cuenta' : 'Student Account Number'}
            </label>
            <input
              type="text"
              value={entry.numeroCuenta ?? ''}
              onChange={(e) =>
                onUpdate({ numeroCuenta: e.target.value || undefined })
              }
              className={INPUT_CLASS}
              placeholder="Ej: 123456789"
            />
          </div>

          {/* Generation */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {lang === 'es' ? 'Generacion' : 'Generation'}
            </label>
            <select
              value={entry.generation ?? ''}
              onChange={(e) =>
                onUpdate({ generation: e.target.value || undefined })
              }
              className={INPUT_CLASS}
            >
              <option value="">
                {lang === 'es' ? 'Seleccionar generacion' : 'Select generation'}
              </option>
              {generations.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Internal sub-component for editing a certification entry.
 * Rendered inside EntryCard when editing.
 */
const CertificationForm: React.FC<{
  entry: Certification;
  onUpdate: (updates: Partial<Certification>) => void;
  lang: 'es' | 'en';
}> = ({ entry, onUpdate, lang }) => {
  return (
    <>
      {/* Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Nombre' : 'Name'}
        </label>
        <input
          type="text"
          value={entry.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Ej: AWS Certified Solutions Architect'
              : 'Ex: AWS Certified Solutions Architect'
          }
        />
      </div>

      {/* Issuing Organization */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Organizacion emisora' : 'Issuing Organization'}
        </label>
        <input
          type="text"
          value={entry.issuer}
          onChange={(e) => onUpdate({ issuer: e.target.value })}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Ej: Amazon Web Services'
              : 'Ex: Amazon Web Services'
          }
        />
      </div>

      {/* Issue & Expiry Dates */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Fecha de emision' : 'Issue Date'}
          </label>
          <MonthYearPicker
            value={dateToMonthYear(entry.issueDate)}
            onChange={(val) => {
              const date = monthYearToDate(val);
              if (date) onUpdate({ issueDate: date });
            }}
            lang={lang}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es'
              ? 'Fecha de expiracion (opcional)'
              : 'Expiry Date (optional)'}
          </label>
          <MonthYearPicker
            value={dateToMonthYear(entry.expiryDate)}
            onChange={(val) => onUpdate({ expiryDate: monthYearToDate(val) })}
            lang={lang}
          />
        </div>
      </div>

      {/* Credential ID */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es'
            ? 'ID de credencial (opcional)'
            : 'Credential ID (optional)'}
        </label>
        <input
          type="text"
          value={entry.credentialId ?? ''}
          onChange={(e) =>
            onUpdate({ credentialId: e.target.value || undefined })
          }
          className={INPUT_CLASS}
          placeholder="Ej: ABC123XYZ"
        />
      </div>

      {/* Credential URL */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es'
            ? 'URL de credencial (opcional)'
            : 'Credential URL (optional)'}
        </label>
        <input
          type="url"
          value={entry.credentialUrl ?? ''}
          onChange={(e) =>
            onUpdate({ credentialUrl: e.target.value || undefined })
          }
          className={INPUT_CLASS}
          placeholder="https://credential.example.com/verify/..."
        />
      </div>
    </>
  );
};

/**
 * Internal sub-component for a single language row.
 * Simpler than EntryCard -- just a row with dropdown, proficiency, and delete.
 */
const LanguageRow: React.FC<{
  language: Language;
  onUpdate: (updates: Partial<Language>) => void;
  onDelete: () => void;
  lang: 'es' | 'en';
}> = ({ language, onUpdate, onDelete, lang }) => {
  const proficiencyOptions = PROFICIENCY_OPTIONS[lang];
  const isOtherLanguage = !COMMON_LANGUAGES.includes(
    language.name as (typeof COMMON_LANGUAGES)[number]
  );

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      {/* Language selection */}
      <div className="min-w-0 flex-1">
        <select
          value={
            isOtherLanguage && language.name !== '' ? 'Other' : language.name
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'Other') {
              onUpdate({ name: '' });
            } else {
              onUpdate({ name: val });
            }
          }}
          className={INPUT_CLASS}
          aria-label={lang === 'es' ? 'Idioma' : 'Language'}
        >
          <option value="">
            {lang === 'es' ? 'Seleccionar idioma' : 'Select language'}
          </option>
          {COMMON_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
          <option value="Other">{lang === 'es' ? 'Otro' : 'Other'}</option>
        </select>
      </div>

      {/* Custom language name input when "Other" selected */}
      {isOtherLanguage && (
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={language.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className={INPUT_CLASS}
            placeholder={lang === 'es' ? 'Nombre del idioma' : 'Language name'}
            aria-label={lang === 'es' ? 'Nombre del idioma' : 'Language name'}
          />
        </div>
      )}

      {/* Proficiency level */}
      <div className="min-w-0 flex-1">
        <select
          value={language.proficiency}
          onChange={(e) =>
            onUpdate({
              proficiency: e.target.value as Language['proficiency'],
            })
          }
          className={INPUT_CLASS}
          aria-label={lang === 'es' ? 'Nivel' : 'Proficiency'}
        >
          {proficiencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className={
          'shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 ' +
          'dark:hover:bg-red-900/20 dark:hover:text-red-400'
        }
        aria-label={lang === 'es' ? 'Eliminar idioma' : 'Delete language'}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default EducationTab;
