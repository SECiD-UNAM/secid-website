import React from 'react';
import { FIELD_GROUPS } from '@/lib/merge/field-groups';
import type { FieldGroupKey, FieldSelection, FieldSelections } from '@/types/merge';

interface ProfileComparisonProps {
  sourceProfile: Record<string, any>;
  targetProfile: Record<string, any>;
  selections: FieldSelections;
  onSelectionsChange: (selections: FieldSelections) => void;
  readOnly?: boolean;
  lang?: 'es' | 'en';
}

const GROUP_LABELS: Record<FieldGroupKey, { es: string; en: string }> = {
  basicInfo: { es: 'Información Básica', en: 'Basic Info' },
  professional: { es: 'Profesional', en: 'Professional' },
  experience: { es: 'Experiencia', en: 'Experience' },
  skills: { es: 'Habilidades', en: 'Skills' },
  socialLinks: { es: 'Redes Sociales', en: 'Social Links' },
  education: { es: 'Educación', en: 'Education' },
  privacySettings: { es: 'Privacidad', en: 'Privacy Settings' },
  notificationSettings: { es: 'Notificaciones', en: 'Notification Settings' },
  settings: { es: 'Configuración', en: 'Settings' },
};

const SELECTION_OPTIONS: Array<{
  value: FieldSelection;
  labelEs: string;
  labelEn: string;
}> = [
  { value: 'source', labelEs: 'Mantener anterior', labelEn: 'Keep old' },
  { value: 'target', labelEs: 'Mantener nuevo', labelEn: 'Keep new' },
  { value: 'discard', labelEs: 'Descartar', labelEn: 'Discard' },
];

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path
    .split('.')
    .reduce((curr, key) => (curr != null ? curr[key] : undefined), obj);
}

function formatValue(value: any): string {
  if (value == null) return '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export const ProfileComparison: React.FC<ProfileComparisonProps> = ({
  sourceProfile,
  targetProfile,
  selections,
  onSelectionsChange,
  readOnly = false,
  lang = 'es',
}) => {
  const handleChange = (groupKey: FieldGroupKey, value: FieldSelection) => {
    onSelectionsChange({ ...selections, [groupKey]: value });
  };

  return (
    <div className="space-y-6">
      {(Object.keys(FIELD_GROUPS) as FieldGroupKey[]).map((groupKey) => {
        const fields = FIELD_GROUPS[groupKey];
        const label = GROUP_LABELS[groupKey][lang];

        return (
          <div
            key={groupKey}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {label}
            </h3>
            <div className="mb-3 grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Perfil anterior' : 'Old profile'}
                </p>
                {fields.map((fieldPath) => (
                  <div
                    key={fieldPath}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="font-mono text-xs text-gray-400">
                      {fieldPath}:{' '}
                    </span>
                    {formatValue(getNestedValue(sourceProfile, fieldPath))}
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Perfil nuevo' : 'New profile'}
                </p>
                {fields.map((fieldPath) => (
                  <div
                    key={fieldPath}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="font-mono text-xs text-gray-400">
                      {fieldPath}:{' '}
                    </span>
                    {formatValue(getNestedValue(targetProfile, fieldPath))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              {SELECTION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    type="radio"
                    name={`merge-${groupKey}`}
                    value={option.value}
                    checked={selections[groupKey] === option.value}
                    onChange={() => handleChange(groupKey, option.value)}
                    disabled={readOnly}
                    className="text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {lang === 'es' ? option.labelEs : option.labelEn}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
