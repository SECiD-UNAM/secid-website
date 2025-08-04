import React, { useState } from 'react';
import JobFilters from './JobFilters';
import JobBoard from './JobBoard';

import type { FilterState } from '@/types/job';

interface JobSearchDemoProps {
  lang?: 'es' | 'en';
}

/**
 * JobSearchDemo Component
 *
 * This component demonstrates the integration between JobFilters and JobBoard,
 * showing how the enhanced filters work together to provide real-time filtering
 * of job listings.
 *
 * Features:
 * - Real-time filter updates
 * - Persistent filter preferences via localStorage
 * - Responsive design (desktop sidebar, mobile drawer)
 * - Comprehensive filtering options:
 *   - Location and work mode (remote, hybrid, on-site)
 *   - Employment type (full-time, part-time, contract, internship)
 *   - Experience level (entry through executive)
 *   - Salary range with dual sliders and number inputs
 *   - Skills matching
 *   - Industry/sector selection
 *   - Company size filtering
 *   - Benefits filtering
 *   - Posted date filtering
 * - Active filter count display
 * - Clear all filters functionality
 * - Bilingual support (Spanish/English)
 */
export const JobSearchDemo: React.FC<JobSearchDemoProps> = ({
  lang = 'es',
}) => {
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    locationType: [],
    employmentType: [],
    experienceLevel: [],
    salaryMin: 0,
    salaryMax: 200000,
    skills: [],
    postedWithin: 'all',
    industry: [],
    companySize: [],
    benefits: [],
  });

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Bolsa de Trabajo' : 'Job Board'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'es'
              ? 'Encuentra oportunidades que coincidan con tu perfil profesional'
              : 'Find opportunities that match your professional profile'}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <JobFilters lang={lang} onFiltersChange={handleFiltersChange} />
          </div>

          {/* Job Listings */}
          <div className="lg:col-span-3">
            <JobBoard lang={lang} filters={filters} />
          </div>
        </div>

        {/* Integration Notes (for demo purposes) */}
        <div className="mt-12 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            {lang === 'es'
              ? 'Funcionalidades Implementadas'
              : 'Implemented Features'}
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Filtros Avanzados' : 'Advanced Filters'}
              </h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Rango salarial con controles duales'
                    : 'Salary range with dual controls'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Ubicación y modalidad de trabajo'
                    : 'Location and work mode'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Nivel de experiencia (5 categorías)'
                    : 'Experience level (5 categories)'}
                </li>
                <li>
                  • {lang === 'es' ? 'Tipo de empleo' : 'Employment type'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Filtrado por industria/sector'
                    : 'Industry/sector filtering'}
                </li>
                <li>
                  • {lang === 'es' ? 'Tamaño de empresa' : 'Company size'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Beneficios específicos'
                    : 'Specific benefits'}
                </li>
                <li>
                  • {lang === 'es' ? 'Fecha de publicación' : 'Posted date'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es' ? 'Habilidades técnicas' : 'Technical skills'}
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                {lang === 'es'
                  ? 'Características Técnicas'
                  : 'Technical Features'}
              </h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Persistencia en localStorage'
                    : 'localStorage persistence'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Filtrado en tiempo real'
                    : 'Real-time filtering'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Diseño responsive (móvil/escritorio)'
                    : 'Responsive design (mobile/desktop)'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Contador de filtros activos'
                    : 'Active filter count'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Soporte bilingüe completo'
                    : 'Full bilingual support'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Integración con Firebase'
                    : 'Firebase integration'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Paginación y carga incremental'
                    : 'Pagination and infinite scroll'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Puntuación de compatibilidad'
                    : 'Match scoring'}
                </li>
                <li>
                  •{' '}
                  {lang === 'es'
                    ? 'Estados de carga optimizados'
                    : 'Optimized loading states'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobSearchDemo;
