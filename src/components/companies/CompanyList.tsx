import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Company } from '@/types/company';
import { getCompanies } from '@/lib/companies';
import { translateIndustry } from '@/lib/companies/industry-i18n';
import { getCompanyTranslations } from '@/i18n/company-translations';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { CompanyDrawer } from './CompanyDrawer';
import { EcosystemMap } from '@/components/shared/EcosystemMap';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import type { FilterDefinition } from '@lib/listing/types';
import {
  ListingSearch,
  ListingFilters,
  ListingActiveFilters,
  ListingViewToggle,
  ListingGrid,
  ListingList,
  ListingPagination,
  ListingEmpty,
  ListingLoading,
  ListingStats,
} from '@components/listing';

/** Industry values stored in Firestore (Spanish). */
const KNOWN_INDUSTRIES = [
  'Tecnología',
  'Finanzas',
  'Fintech',
  'Retail',
  'Consultoría',
  'Gobierno',
  'Entretenimiento',
  'Consumo',
  'Educación',
  'Fitness',
  'Datos',
  'Salud',
  'Conglomerado',
  'Otros',
];

async function fetchApprovedCompanies(): Promise<Company[]> {
  const all = await getCompanies();
  return all
    .filter((c) => !c.pendingReview)
    .sort((a, b) => b.memberCount - a.memberCount);
}

interface Props {
  lang?: 'es' | 'en';
}

export const CompanyList: React.FC<Props> = ({ lang = 'es' }) => {
  const t = getCompanyTranslations(lang);
  const { isVerified } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLandscape, setShowLandscape] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);

  const adapter = useMemo(
    () =>
      new ClientSideAdapter<Company>({
        fetchAll: async () => {
          const data = await fetchApprovedCompanies();
          setAllCompanies(data);
          return data;
        },
        searchFields: ['name', 'industry', 'location', 'description'],
        getId: (item) => item.id,
      }),
    []
  );

  const filterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: 'industry',
        label: t.statsIndustries,
        type: 'select',
        options: KNOWN_INDUSTRIES.map((ind) => ({
          value: ind,
          label: translateIndustry(ind, lang),
        })),
      },
    ],
    [lang]
  );

  const listing = useUniversalListing<Company>({
    adapter,
    defaultViewMode: 'list',
    defaultSort: { field: 'memberCount', direction: 'desc' },
    paginationMode: 'offset',
    defaultPageSize: 20,
    filterDefinitions,
    lang,
  });

  const openDrawer = (company: Company) => {
    setSelectedCompany(company);
    setDrawerOpen(true);
  };

  const renderCompanyCard = (company: Company) => (
    <button
      onClick={() => openDrawer(company)}
      className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
    >
      <CompanyLogo company={company} size="md" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{company.name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {[
            company.industry ? translateIndustry(company.industry, lang) : null,
            company.location,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span title={t.tabCurrent}>
          {company.memberCount} {t.members}
        </span>
        <svg
          className="h-5 w-5 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </div>
    </button>
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t.networkTitle}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t.networkDescription}
        </p>
      </div>

      {/* Toolbar: search + view toggles */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <ListingSearch
          query={listing.query}
          onQueryChange={listing.setQuery}
          lang={lang}
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <ListingViewToggle
            viewMode={listing.viewMode}
            availableModes={['list', 'grid']}
            onViewModeChange={listing.setViewMode}
            lang={lang}
          />
          {/* Landscape/EcosystemMap toggle — domain-specific, outside universal ViewMode */}
          <button
            type="button"
            onClick={() => setShowLandscape((v) => !v)}
            title={t.industryMap}
            className={`rounded-lg border p-2 transition-colors ${
              showLandscape
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Industry filter row */}
      <ListingFilters
        definitions={filterDefinitions}
        activeFilters={listing.activeFilters}
        onFilterChange={listing.setFilter}
        onClearAll={listing.clearFilters}
        lang={lang}
        className="mb-4"
      />

      {/* Active filter chips */}
      <ListingActiveFilters
        definitions={filterDefinitions}
        activeFilters={listing.activeFilters}
        onFilterChange={listing.setFilter}
        onClearAll={listing.clearFilters}
        className="mb-4"
      />

      {/* Landscape view (domain-specific EcosystemMap) */}
      {showLandscape ? (
        <EcosystemMap
          companies={allCompanies}
          onCompanyClick={openDrawer}
          lang={lang}
        />
      ) : (
        <>
          {/* Results count */}
          <ListingStats
            page={listing.page}
            pageSize={listing.pageSize}
            totalCount={listing.totalCount}
            lang={lang}
            className="mb-4"
          />

          {/* Loading skeletons */}
          {listing.loading && listing.items.length === 0 && (
            <ListingLoading viewMode={listing.viewMode} />
          )}

          {/* Empty state */}
          {!listing.loading && listing.items.length === 0 && (
            <ListingEmpty
              onClearFilters={listing.clearFilters}
              hasActiveFilters={
                Object.keys(listing.activeFilters).length > 0 ||
                listing.query.length > 0
              }
              lang={lang}
            />
          )}

          {/* Company cards — list view */}
          {listing.items.length > 0 && listing.viewMode === 'list' && (
            <ListingList
              items={listing.items}
              renderItem={(company) => renderCompanyCard(company)}
              keyExtractor={(c) => c.id}
            />
          )}

          {/* Company cards — grid view */}
          {listing.items.length > 0 && listing.viewMode === 'grid' && (
            <ListingGrid
              items={listing.items}
              renderItem={(company) => renderCompanyCard(company)}
              keyExtractor={(c) => c.id}
            />
          )}

          {/* Pagination */}
          <ListingPagination
            page={listing.page}
            totalPages={listing.totalPages}
            hasMore={listing.hasMore}
            paginationMode="offset"
            onPageChange={listing.goToPage}
            onLoadMore={listing.loadMore}
            lang={lang}
            className="mt-4"
          />
        </>
      )}

      {/* Company detail drawer */}
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
