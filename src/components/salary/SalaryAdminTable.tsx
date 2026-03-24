/**
 * SalaryAdminTable — Raw salary data table visible only to admins.
 * Shows individual compensation entries with member details for data
 * quality verification and anomaly detection.
 * Data is provided pre-computed by the getSalaryStats Cloud Function.
 */
import React, { useMemo } from 'react';
import { translateIndustry } from '@/lib/companies/industry-i18n';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import { ListingSearch, ListingTable } from '@components/listing';
import type { ColumnDefinition } from '@lib/listing/types';

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
  const rows: AdminRow[] = useMemo(
    () => rawData.map((r) => ({ ...r, label: translateIndustry(r.industry, lang) })),
    [rawData, lang]
  );

  // Recreate adapter when rows change so search/sort operate on current data
  const stableAdapter = useMemo(() => {
    const adapter = new ClientSideAdapter<AdminRow>({
      initialData: rows,
      searchFields: ['memberName', 'memberEmail', 'company', 'position'],
      getId: (r) => `${r.memberEmail}-${r.company}`,
      toSearchable: (r) => `${r.memberName} ${r.memberEmail} ${r.company} ${r.position}`,
    });
    return adapter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const {
    items: sorted,
    totalCount,
    query,
    setQuery,
    sort,
    setSort,
  } = useUniversalListing<AdminRow>({
    adapter: stableAdapter,
    defaultViewMode: 'table',
    defaultSort: { field: 'monthlyGross', direction: 'desc' },
    paginationMode: 'offset',
    defaultPageSize: 500,
    lang,
  });

  const columns: ColumnDefinition<AdminRow>[] = useMemo(
    () => [
      {
        key: 'memberName',
        label: lang === 'es' ? 'Miembro' : 'Member',
        sortable: true,
        accessor: (row) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{row.memberName}</div>
            <div className="text-[10px] text-gray-400">{row.memberEmail}</div>
          </div>
        ),
      },
      {
        key: 'company',
        label: lang === 'es' ? 'Empresa' : 'Company',
        sortable: true,
        accessor: (row) => (
          <span className="whitespace-nowrap text-gray-700 dark:text-gray-300">
            {row.company}
            {row.current && (
              <span className="ml-1 text-[10px] text-green-600 dark:text-green-400">●</span>
            )}
          </span>
        ),
      },
      {
        key: 'position',
        label: lang === 'es' ? 'Puesto' : 'Position',
        sortable: true,
        accessor: (row) => (
          <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">{row.position}</span>
        ),
      },
      {
        key: 'label',
        label: lang === 'es' ? 'Industria' : 'Industry',
        sortable: true,
        accessor: (row) => (
          <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">{row.label}</span>
        ),
      },
      {
        key: 'country',
        label: lang === 'es' ? 'Pais' : 'Country',
        sortable: true,
        accessor: (row) => (
          <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">{row.country}</span>
        ),
      },
      {
        key: 'fiscalRegime',
        label: lang === 'es' ? 'Regimen' : 'Regime',
        sortable: true,
        accessor: (row) => (
          <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">{row.fiscalRegime}</span>
        ),
      },
      {
        key: 'monthlyGross',
        label: lang === 'es' ? 'Bruto Mensual' : 'Monthly Gross',
        sortable: true,
        accessor: (row) => (
          <span className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
            {formatMoney(row.monthlyGross, row.currency)}
          </span>
        ),
      },
      {
        key: 'annualBonus',
        label: 'Bonus',
        sortable: true,
        accessor: (row) => (
          <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">
            {row.annualBonus > 0 ? formatMoney(row.annualBonus, row.currency) : '-'}
          </span>
        ),
      },
      {
        key: 'stockValue',
        label: 'Stock',
        sortable: true,
        accessor: (row) => (
          <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">
            {row.stockValue > 0 ? formatMoney(row.stockValue, row.currency) : '-'}
          </span>
        ),
      },
      {
        key: 'benefits',
        label: lang === 'es' ? 'Beneficios' : 'Benefits',
        accessor: (row) => (
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
        ),
      },
    ],
    [lang]
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
            {totalCount} {lang === 'es' ? 'registros' : 'records'}
          </span>
        </div>
        <div className="w-48">
          <ListingSearch
            query={query}
            onQueryChange={setQuery}
            lang={lang}
            className="text-xs"
          />
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          {lang === 'es' ? 'Sin datos salariales registrados.' : 'No salary data recorded.'}
        </div>
      ) : (
        <ListingTable<AdminRow>
          items={sorted}
          columns={columns}
          keyExtractor={(row) => `${row.memberEmail}-${row.company}-${row.position}`}
          sort={sort}
          onSortChange={setSort}
          className="text-xs"
        />
      )}
    </div>
  );
}
