import React from 'react';

export interface MonthYearPickerProps {
  value: { month: number; year: number } | null;
  onChange: (value: { month: number; year: number } | null) => void;
  disabled?: boolean;
  lang?: 'es' | 'en';
}

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MIN_YEAR = 1990;
const MAX_YEAR = 2030;

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 ' +
  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  value,
  onChange,
  disabled = false,
  lang = 'es',
}) => {
  const months = lang === 'es' ? MONTHS_ES : MONTHS_EN;

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const monthValue = e.target.value;
    if (monthValue === '') {
      onChange(null);
      return;
    }
    const month = parseInt(monthValue, 10);
    const year = value?.year ?? new Date().getFullYear();
    onChange({ month, year });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const yearStr = e.target.value;
    if (yearStr === '') {
      onChange(null);
      return;
    }
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) return;
    const month = value?.month ?? 1;
    onChange({ month, year });
  };

  return (
    <div className="flex gap-3">
      <select
        value={value?.month ?? ''}
        onChange={handleMonthChange}
        disabled={disabled}
        className={INPUT_CLASS}
        aria-label={lang === 'es' ? 'Mes' : 'Month'}
      >
        <option value="">{lang === 'es' ? 'Mes' : 'Month'}</option>
        {months.map((name, index) => (
          <option key={index + 1} value={index + 1}>
            {name}
          </option>
        ))}
      </select>

      <input
        type="number"
        value={value?.year ?? ''}
        onChange={handleYearChange}
        disabled={disabled}
        min={MIN_YEAR}
        max={MAX_YEAR}
        placeholder={lang === 'es' ? 'Anio' : 'Year'}
        className={INPUT_CLASS}
        aria-label={lang === 'es' ? 'Anio' : 'Year'}
      />
    </div>
  );
};

export default MonthYearPicker;
