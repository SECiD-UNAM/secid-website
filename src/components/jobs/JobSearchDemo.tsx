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
    <div>
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
    </div>
  );
};

export default JobSearchDemo;
