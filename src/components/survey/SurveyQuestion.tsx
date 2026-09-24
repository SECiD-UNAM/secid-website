import React from 'react';
import type { SurveyQuestion as QDef } from '@/lib/survey/defaults';

interface Props {
  question: QDef;
  value: unknown;
  onChange: (v: unknown) => void;
  lang?: 'es' | 'en';
}

export default function SurveyQuestion({
  question,
  value,
  onChange,
  lang = 'es',
}: Props) {
  const { type, options, label, help, id } = question;
  const inputId = `survey-q-${String(id)}`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-900 dark:text-white"
      >
        {label[lang]}
      </label>
      {help && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{help[lang]}</p>
      )}

      {type === 'single' && options && (
        <select
          id={inputId}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">
            {lang === 'es' ? '— Selecciona —' : '— Select —'}
          </option>
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label[lang]}
            </option>
          ))}
        </select>
      )}

      {type === 'multi' && options && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt.value);
            return (
              <label
                key={String(opt.value)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? [...value] : [];
                    if (e.target.checked) {
                      if (!current.includes(opt.value)) current.push(opt.value);
                    } else {
                      const idx = current.indexOf(opt.value);
                      if (idx >= 0) current.splice(idx, 1);
                    }
                    onChange(current.length > 0 ? current : undefined);
                  }}
                />
                <span>{opt.label[lang]}</span>
              </label>
            );
          })}
        </div>
      )}

      {type === 'text' && (
        <input
          id={inputId}
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      )}

      {type === 'number' && (
        <input
          id={inputId}
          type="number"
          min={0}
          max={60}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : Number(e.target.value))
          }
          className="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      )}
    </div>
  );
}
