/**
 * SalaryAdminTable — Raw salary data table visible only to admins.
 * Shows individual compensation entries with member details for data
 * quality verification and anomaly detection.
 * Data is provided pre-computed by the getSalaryStats Cloud Function.
 */
import React, { useState } from 'react';
import { translateIndustry } from '@/lib/companies/industry-i18n';

export interface AdminRawRow {
  memberName: string;
  memberEmail: string;
  company: string;
  position: string;
  current: boolean;
  industry: string;
  country: string;
  currency: string;
  fiscalRegime: string;
  monthlyGross: number;
  annualBonus: number;
  stockValue: number;
  benefits: string[];
}

interface AdminRow extends AdminRawRow {
  label: string;
}

interface Props {
  rawData: AdminRawRow[];
  lang?: 'es' | 'en';
}

function formatMoney(v: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(v);
}

export function SalaryAdminTable({ rawData, lang = 'es' }: Props) {
  const [sortField, setSortField] = useState<keyof AdminRow>('monthlyGross');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const rows: AdminRow[] = rawData.map((r) => ({
    ...r,
    label: translateIndustry(r.industry, lang),
  }));

  // Filter
  const filtered = search
    ? rows.filter((r) =>
        [r.memberName, r.company, r.position, r.memberEmail]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : rows;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const toggleSort = (field: keyof AdminRow) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ field, label }: { field: keyof AdminRow; label: string }) => (
    <th
      className="cursor-pointer whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      onClick={() => toggleSort(field)}
    >
      {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="rounded-xl border border-red-200 bg-white dark:border-red-800 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-red-200 px-4 py-3 dark:border-red-800">
        <div className="flex items-center gap-2">
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            ADMIN
          </span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Datos Individuales' : 'Individual Data'}
          </h3>
          <span className="text-xs text-gray-400">
            {sorted.length} {lang === 'es' ? 'registros' : 'records'}
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'es' ? 'Buscar...' : 'Search...'}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <SortHeader field="memberName" label={lang === 'es' ? 'Miembro' : 'Member'} />
              <SortHeader field="company" label={lang === 'es' ? 'Empresa' : 'Company'} />
              <SortHeader field="position" label={lang === 'es' ? 'Puesto' : 'Position'} />
              <SortHeader field="label" label={lang === 'es' ? 'Industria' : 'Industry'} />
              <SortHeader field="country" label={lang === 'es' ? 'Pais' : 'Country'} />
              <SortHeader field="fiscalRegime" label={lang === 'es' ? 'Regimen' : 'Regime'} />
              <SortHeader field="monthlyGross" label={lang === 'es' ? 'Bruto Mensual' : 'Monthly Gross'} />
              <SortHeader field="annualBonus" label="Bonus" />
              <SortHeader field="stockValue" label="Stock" />
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {lang === 'es' ? 'Beneficios' : 'Benefits'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map((row, i) => (
              <tr
                key={`${row.memberEmail}-${row.company}-${i}`}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="font-medium text-gray-900 dark:text-white">{row.memberName}</div>
                  <div className="text-[10px] text-gray-400">{row.memberEmail}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-300">
                  {row.company}
                  {row.current && (
                    <span className="ml-1 text-[10px] text-green-600 dark:text-green-400">●</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">{row.position}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">{row.label}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">{row.country}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">{row.fiscalRegime}</td>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900 dark:text-white">
                  {formatMoney(row.monthlyGross, row.currency)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">
                  {row.annualBonus > 0 ? formatMoney(row.annualBonus, row.currency) : '-'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">
                  {row.stockValue > 0 ? formatMoney(row.stockValue, row.currency) : '-'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {row.benefits.slice(0, 3).map((b) => (
                      <span
                        key={b}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      >
                        {b}
                      </span>
                    ))}
                    {row.benefits.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{row.benefits.length - 3}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          {lang === 'es' ? 'Sin datos salariales registrados.' : 'No salary data recorded.'}
        </div>
      )}
    </div>
  );
}
