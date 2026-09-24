import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getCompanies } from '@/lib/companies';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import type { Company } from '@/types/company';

export interface CompanyAutocompleteProps {
  value: string;
  companyId?: string;
  onChange: (name: string, companyId?: string) => void;
  lang?: 'es' | 'en';
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 ' +
  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const DEBOUNCE_MS = 300;

export const CompanyAutocomplete: React.FC<CompanyAutocompleteProps> = ({
  value,
  onChange,
  lang = 'es',
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filtered, setFiltered] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getCompanies()
      .then((result) => {
        if (!cancelled) setCompanies(result);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filterCompanies = useCallback(
    (query: string) => {
      if (query.length === 0) {
        setFiltered([]);
        return;
      }
      const lower = query.toLowerCase();
      setFiltered(
        companies
          .filter((c) => c.name.toLowerCase().includes(lower))
          .slice(0, 8)
      );
    },
    [companies]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text, undefined);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      filterCompanies(text);
      setIsOpen(text.length > 0);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (company: Company) => {
    onChange(company.name, company.id);
    setIsOpen(false);
    setIsCreating(false);
  };

  const handleCreateNew = async () => {
    if (!newDomain.trim()) {
      setCreateError(
        lang === 'es' ? 'El dominio es requerido' : 'Domain is required'
      );
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: value.trim(), domain: newDomain.trim() }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(
          data.error ??
            (lang === 'es'
              ? 'Error al crear la empresa'
              : 'Failed to create company')
        );
      }

      const data = (await response.json()) as { companyId: string };
      onChange(value.trim(), data.companyId);
      setIsCreating(false);
      setIsOpen(false);
      setNewDomain('');

      const updatedCompanies = await getCompanies();
      setCompanies(updatedCompanies);
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : lang === 'es'
            ? 'Error inesperado'
            : 'Unexpected error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (value.length > 0) {
            filterCompanies(value);
            setIsOpen(true);
          }
        }}
        placeholder={lang === 'es' ? 'Buscar empresa...' : 'Search company...'}
        className={INPUT_CLASS}
        aria-label={lang === 'es' ? 'Empresa' : 'Company'}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        </div>
      )}

      {isOpen && (filtered.length > 0 || value.length > 0) && (
        <div
          className={
            'absolute z-20 mt-1 w-full rounded-lg border shadow-lg ' +
            'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
          }
        >
          {filtered.length > 0 && (
            <ul className="max-h-48 overflow-auto py-1" role="listbox">
              {filtered.map((company) => (
                <li
                  key={company.id}
                  role="option"
                  aria-selected={false}
                  className={
                    'flex cursor-pointer items-center gap-3 px-4 py-2 ' +
                    'text-sm text-gray-700 hover:bg-gray-100 ' +
                    'dark:text-gray-200 dark:hover:bg-gray-600'
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(company);
                  }}
                >
                  <CompanyLogo company={company} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{company.name}</p>
                    {company.industry && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {company.industry}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isCreating && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsCreating(true);
              }}
              className={
                'flex w-full items-center gap-2 border-t px-4 py-2 text-sm ' +
                'border-gray-200 text-primary-600 hover:bg-gray-50 ' +
                'dark:border-gray-600 dark:text-primary-400 dark:hover:bg-gray-600'
              }
            >
              <PlusIcon className="h-4 w-4" />
              {lang === 'es' ? 'Crear nueva empresa' : 'Create new company'}
            </button>
          )}

          {isCreating && (
            <div className="border-t border-gray-200 p-3 dark:border-gray-600">
              <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es'
                  ? `Crear "${value.trim()}" como nueva empresa`
                  : `Create "${value.trim()}" as new company`}
              </p>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => {
                  setNewDomain(e.target.value);
                  setCreateError(null);
                }}
                placeholder={
                  lang === 'es'
                    ? 'Dominio (ej: empresa.com)'
                    : 'Domain (e.g. company.com)'
                }
                className={
                  'mb-2 w-full rounded-lg border px-3 py-1.5 text-sm ' +
                  'border-gray-300 bg-white text-gray-900 ' +
                  'dark:border-gray-500 dark:bg-gray-600 dark:text-white'
                }
              />
              {createError && (
                <p className="mb-2 text-xs text-red-600 dark:text-red-400">
                  {createError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewDomain('');
                    setCreateError(null);
                  }}
                  className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-600"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={isSubmitting}
                  className={
                    'rounded bg-primary-600 px-3 py-1 text-xs font-medium text-white ' +
                    'hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50'
                  }
                >
                  {isSubmitting
                    ? lang === 'es'
                      ? 'Creando...'
                      : 'Creating...'
                    : lang === 'es'
                      ? 'Crear'
                      : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyAutocomplete;
