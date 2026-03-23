import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, BuildingOffice2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import type { Company } from '@/types/company';
import { getCompanies } from '@/lib/companies';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { CompanyDrawer } from './CompanyDrawer';
import { CompanyLandscape } from './CompanyLandscape';

type ViewMode = 'list' | 'landscape';

interface Props {
  lang?: 'es' | 'en';
}

export const CompanyList: React.FC<Props> = ({ lang = 'es' }) => {
  const { isVerified } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCompanies();
      const approved = data
        .filter((c) => !c.pendingReview)
        .sort((a, b) => b.memberCount - a.memberCount);
      setCompanies(approved);
    } catch (err) {
      console.error('Error loading companies:', err);
      setError(lang === 'es' ? 'Error al cargar empresas' : 'Error loading companies');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.industry) set.add(c.industry);
    });
    return Array.from(set).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    let result = companies;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q)
      );
    }
    if (industryFilter) {
      result = result.filter((c) => c.industry === industryFilter);
    }
    return result;
  }, [companies, search, industryFilter]);

  const totalMembers = useMemo(
    () => companies.reduce((sum, c) => sum + c.memberCount, 0),
    [companies]
  );

  const openDrawer = (company: Company) => {
    setSelectedCompany(company);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'es' ? 'Cargando empresas...' : 'Loading companies...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadCompanies}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            {lang === 'es' ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Red de Empresas SECiD' : 'SECiD Company Network'}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Descubre donde trabajan los miembros de SECiD y conecta con tu red profesional.'
            : 'Discover where SECiD members work and connect with your professional network.'}
        </p>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{companies.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Empresas' : 'Companies'}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{totalMembers}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Miembros activos' : 'Active members'}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{industries.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Industrias' : 'Industries'}</p>
        </div>
      </div>

      {/* Search + Filter + View Toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'es' ? 'Buscar empresa...' : 'Search company...'}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-primary-800"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-8 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-primary-800"
          >
            <option value="">{lang === 'es' ? 'Todas las industrias' : 'All industries'}</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            title={lang === 'es' ? 'Vista de lista' : 'List view'}
          >
            <ListBulletIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{lang === 'es' ? 'Lista' : 'List'}</span>
          </button>
          <button
            onClick={() => setViewMode('landscape')}
            className={`flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'landscape'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            title={lang === 'es' ? 'Mapa de industrias' : 'Industry map'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span className="hidden sm:inline">{lang === 'es' ? 'Mapa' : 'Map'}</span>
          </button>
        </div>
      </div>

      {/* Content: List or Landscape */}
      {viewMode === 'landscape' ? (
        <CompanyLandscape
          companies={filtered}
          onCompanyClick={openDrawer}
          lang={lang}
        />
      ) : (
        <>
          {/* Results count */}
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} {lang === 'es' ? 'empresas encontradas' : 'companies found'}
          </p>

          {/* Company list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
              <BuildingOffice2Icon className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">
                {lang === 'es' ? 'No se encontraron empresas' : 'No companies found'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((company) => (
                <button
                  key={company.id}
                  onClick={() => openDrawer(company)}
                  className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
                >
                  <CompanyLogo company={company} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {company.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {[company.industry, company.location].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span title={lang === 'es' ? 'Miembros' : 'Members'}>
                      {company.memberCount} {lang === 'es' ? 'miembros' : 'members'}
                    </span>
                    <svg className="h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      <CompanyDrawer
        company={selectedCompany}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isVerified={isVerified}
        lang={lang}
      />
    </div>
  );
};

export default CompanyList;
