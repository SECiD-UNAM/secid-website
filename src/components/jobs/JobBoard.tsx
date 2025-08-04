import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import JobCard from './JobCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  locationType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel?:
    | 'entry'
    | 'junior'
    | 'mid'
    | 'senior'
    | 'lead'
    | 'executive';
  industry?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  description: string;
  requirements: string[];
  benefits?: string[];
  tags: string[];
  postedAt: Date;
  postedBy: string;
  applicationCount: number;
  viewCount: number;
  featured: boolean;
  matchScore?: number;
}

interface FilterState {
  location: string;
  locationType: string[];
  employmentType: string[];
  experienceLevel: string[];
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  postedWithin: string;
  industry: string[];
  companySize: string[];
  benefits: string[];
}

interface JobBoardProps {
  lang?: 'es' | 'en';
  filters?: FilterState;
}

export const JobBoard: React.FC<JobBoardProps> = ({ lang = 'es', filters }) => {
  const { user, userProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'match' | 'salary'>('date');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const JOBS_PER_PAGE = 10;

  useEffect(() => {
    fetchJobs();
  }, [filters, sortBy]);

  const fetchJobs = async (loadMore = false) => {
    if (loadMore && !hasMore) return;

    setLoading(!loadMore);
    setLoadingMore(loadMore);

    try {
      let jobQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'active'),
        where('isApproved', '==', true)
      );

      // Apply filters - Note: Firestore has limitations on array-contains queries
      // In production, you might want to use client-side filtering for complex conditions
      if (filters) {
        if (filters.location && filters.location !== '') {
          jobQuery = query(jobQuery, where('location', '==', filters.location));
        }
        if (filters.employmentType && filters.employmentType.length > 0) {
          // For arrays with multiple values, we'll handle this client-side
          if (filters.employmentType.length === 1) {
            jobQuery = query(
              jobQuery,
              where('employmentType', '==', filters.employmentType?.[0])
            );
          }
        }
        if (filters.experienceLevel && filters.experienceLevel.length === 1) {
          jobQuery = query(
            jobQuery,
            where('experienceLevel', '==', filters.experienceLevel?.[0])
          );
        }
        if (filters.industry && filters.industry.length === 1) {
          jobQuery = query(
            jobQuery,
            where('industry', '==', filters.industry?.[0])
          );
        }
        if (filters.companySize && filters.companySize.length === 1) {
          jobQuery = query(
            jobQuery,
            where('companySize', '==', filters.companySize?.[0])
          );
        }
      }

      // Apply sorting
      switch (sortBy) {
        case 'date':
          jobQuery = query(jobQuery, orderBy('postedAt', 'desc'));
          break;
        case 'salary':
          jobQuery = query(jobQuery, orderBy('salaryRange.max', 'desc'));
          break;
        default:
          jobQuery = query(jobQuery, orderBy('postedAt', 'desc'));
      }

      // Add pagination
      jobQuery = query(jobQuery, limit(JOBS_PER_PAGE));

      if (loadMore && lastDoc) {
        jobQuery = query(jobQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(jobQuery);

      if (snapshot['empty']) {
        setHasMore(false);
        if (!loadMore) setJobs([]);
        return;
      }

      let fetchedJobs = snapshot['docs'].map((doc) => {
        const data = doc.data();

        // Calculate match score if user has skills
        let matchScore = 0;
        if (userProfile?.skills && data['requirements']) {
          const userSkills = userProfile.skills;
          const jobRequirements = data.requirements;
          const matchingSkills = userSkills.filter((skill: string) =>
            jobRequirements.some((req: string) =>
              req.toLowerCase().includes(skill.toLowerCase())
            )
          );
          matchScore = Math.round(
            (matchingSkills.length / Math.max(jobRequirements.length, 1)) * 100
          );
        }

        return {
          id: doc['id'],
          ...data,
          postedAt: data?.postedAt?.toDate() || new Date(),
          matchScore,
        } as Job;
      });

      // Client-side filtering for complex conditions
      if (filters) {
        fetchedJobs = fetchedJobs.filter((job) => {
          // Location type filter
          if (
            filters.locationType.length > 0 &&
            !filters.locationType.includes(job.locationType)
          ) {
            return false;
          }

          // Employment type filter (when multiple selected)
          if (
            filters.employmentType.length > 1 &&
            !filters.employmentType.includes(job.employmentType)
          ) {
            return false;
          }

          // Experience level filter (when multiple selected)
          if (
            filters.experienceLevel.length > 1 &&
            job.experienceLevel &&
            !filters.experienceLevel.includes(job.experienceLevel)
          ) {
            return false;
          }

          // Salary range filter
          if (job.salaryRange) {
            const jobMin = job.salaryRange.min || 0;
            const jobMax = job.salaryRange.max || 0;
            if (filters.salaryMin > 0 && jobMax < filters.salaryMin) {
              return false;
            }
            if (filters.salaryMax < 200000 && jobMin > filters.salaryMax) {
              return false;
            }
          } else {
            // If no salary info and user has salary filter, exclude
            if (filters.salaryMin > 0 || filters.salaryMax < 200000) {
              return false;
            }
          }

          // Skills filter
          if (filters.skills.length > 0) {
            const jobSkills = [...job.requirements, ...job.tags].map((s) =>
              s.toLowerCase()
            );
            const hasMatchingSkill = filters.skills.some((skill) =>
              jobSkills.some((jobSkill) =>
                jobSkill.includes(skill.toLowerCase())
              )
            );
            if (!hasMatchingSkill) {
              return false;
            }
          }

          // Posted within filter
          if (filters.postedWithin !== 'all') {
            const now = new Date();
            const postedDate = job.postedAt;
            const daysDiff = Math.floor(
              (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            switch (filters.postedWithin) {
              case '24h':
                if (daysDiff > 1) return false;
                break;
              case '3d':
                if (daysDiff > 3) return false;
                break;
              case '7d':
                if (daysDiff > 7) return false;
                break;
              case '30d':
                if (daysDiff > 30) return false;
                break;
            }
          }

          // Industry filter (when multiple selected)
          if (
            filters.industry.length > 1 &&
            job.industry &&
            !filters.industry.includes(job.industry)
          ) {
            return false;
          }

          // Company size filter (when multiple selected)
          if (
            filters.companySize.length > 1 &&
            job.companySize &&
            !filters.companySize.includes(job.companySize)
          ) {
            return false;
          }

          // Benefits filter
          if (filters.benefits.length > 0 && job.benefits) {
            const jobBenefits = job.benefits.map((b) => b.toLowerCase());
            const hasMatchingBenefit = filters.benefits.some((benefit) =>
              jobBenefits.some((jobBenefit) =>
                jobBenefit.includes(benefit.replace('-', ' '))
              )
            );
            if (!hasMatchingBenefit) {
              return false;
            }
          } else if (filters.benefits.length > 0) {
            // No benefits info but filter applied
            return false;
          }

          return true;
        });
      }

      // Set pagination state
      setLastDoc(snapshot.docs[snapshot['docs'].length - 1]);
      setHasMore(snapshot.docs.length === JOBS_PER_PAGE);

      if (loadMore) {
        setJobs((prev) => [...prev, ...fetchedJobs]);
      } else {
        setJobs(fetchedJobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Use mock data on error
      if (!loadMore) {
        setJobs(getMockJobs());
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getMockJobs = (): Job[] => [
    {
      id: '1',
      title: 'Senior Data Scientist',
      company: 'TechCorp México',
      location: 'Ciudad de México, CDMX',
      locationType: 'hybrid',
      employmentType: 'full-time',
      salaryRange: {
        min: 60000,
        max: 90000,
        currency: 'MXN',
        period: 'monthly',
      },
      description:
        'We are looking for an experienced Data Scientist to join our team...',
      requirements: [
        '3+ years experience',
        'Python',
        'Machine Learning',
        'SQL',
      ],
      benefits: ['Seguro de gastos médicos', 'Home office', 'Capacitación'],
      tags: ['python', 'machine-learning', 'sql', 'senior'],
      experienceLevel: 'senior',
      industry: 'technology',
      companySize: 'large',
      postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      postedBy: 'company123',
      applicationCount: 23,
      viewCount: 156,
      featured: true,
      matchScore: 85,
    },
    {
      id: '2',
      title: 'Data Analyst Junior',
      company: 'Startup Fintech',
      location: 'Guadalajara, Jalisco',
      locationType: 'onsite',
      employmentType: 'full-time',
      salaryRange: {
        min: 20000,
        max: 30000,
        currency: 'MXN',
        period: 'monthly',
      },
      description:
        'Join our growing fintech startup as a Junior Data Analyst...',
      requirements: ['SQL', 'Excel', 'Basic Python', 'Statistics'],
      benefits: ['Seguro médico', 'Vacaciones flexibles'],
      tags: ['sql', 'junior', 'analyst'],
      experienceLevel: 'junior',
      industry: 'finance',
      companySize: 'startup',
      postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      postedBy: 'company456',
      applicationCount: 45,
      viewCount: 245,
      featured: false,
      matchScore: 65,
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search logic
    fetchJobs();
  };

  const handleLoadMore = () => {
    fetchJobs(true);
  };

  // Filter jobs based on search term
  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(searchLower) ||
      job.company.toLowerCase().includes(searchLower) ||
      job.location.toLowerCase().includes(searchLower) ||
      job.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  // Sort jobs if match score sorting is selected
  const sortedJobs =
    sortBy === 'match'
      ? [...filteredJobs].sort(
          (a, b) => (b.matchScore || 0) - (a.matchScore || 0)
        )
      : filteredJobs;

  if (loading && !loadingMore) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-white p-6 shadow dark:bg-gray-800"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                lang === 'es'
                  ? 'Buscar por título, empresa o habilidad...'
                  : 'Search by title, company or skill...'
              }
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'date' | 'match' | 'salary')
            }
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="date">
              {lang === 'es' ? 'Más recientes' : 'Most recent'}
            </option>
            <option value="match">
              {lang === 'es' ? 'Mejor compatibilidad' : 'Best match'}
            </option>
            <option value="salary">
              {lang === 'es' ? 'Mayor salario' : 'Highest salary'}
            </option>
          </select>
        </div>
      </form>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {sortedJobs.length > 0 ? (
          <>
            {lang === 'es' ? 'Mostrando' : 'Showing'} {sortedJobs.length}{' '}
            {lang === 'es' ? 'empleos' : 'jobs'}
            {searchTerm && (
              <>
                {' '}
                {lang === 'es' ? 'para' : 'for'} "{searchTerm}"
              </>
            )}
          </>
        ) : lang === 'es' ? (
          'No se encontraron empleos'
        ) : (
          'No jobs found'
        )}
      </div>

      {/* Job Listings */}
      <div className="space-y-4">
        {sortedJobs.map((job) => (
          <JobCard key={job['id']} job={job} lang={lang} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && sortedJobs.length > 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {loadingMore ? (
              <>
                <svg
                  className="-ml-1 mr-3 h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {lang === 'es' ? 'Cargando...' : 'Loading...'}
              </>
            ) : lang === 'es' ? (
              'Cargar más empleos'
            ) : (
              'Load more jobs'
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {sortedJobs.length === 0 && !loading && (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 21a9 9 0 110-18 9 9 0 010 18z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {lang === 'es' ? 'No se encontraron empleos' : 'No jobs found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {lang === 'es'
              ? 'Intenta ajustar tus filtros o términos de búsqueda'
              : 'Try adjusting your filters or search terms'}
          </p>
        </div>
      )}
    </div>
  );
};

export default JobBoard;
