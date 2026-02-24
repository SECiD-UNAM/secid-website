import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: 'remote' | 'hybrid' | 'onsite';
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  matchScore: number;
  postedAt: Date;
  tags: string[];
}

interface JobMatchesProps {
  lang?: 'es' | 'en';
}

export const JobMatches: React.FC<JobMatchesProps> = ({ lang = 'es' }) => {
  const { user, userProfile } = useAuth();
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobMatches = async () => {
      if (!user) return;

      try {
        // In production, this would use the job matching algorithm
        // For now, fetch recent active jobs
        const jobsQuery = query(
          collection(db, 'jobs'),
          where('status', '==', 'active'),
          where('isApproved', '==', true),
          orderBy('postedAt', 'desc'),
          limit(3)
        );

        const snapshot = await getDocs(jobsQuery);
        const fetchedJobs = snapshot['docs'].map((doc) => {
          const data = doc['data']();
          // Calculate a mock match score based on user skills
          const userSkills = userProfile?.skills || [];
          const jobRequirements = data.requirements || [];
          const matchingSkills = userSkills.filter((skill: string) =>
            jobRequirements.some((req: string) =>
              req.toLowerCase().includes(skill.toLowerCase())
            )
          );
          const matchScore = Math.min(
            95,
            Math.round(
              (matchingSkills.length / Math.max(jobRequirements.length, 1)) *
                100
            ) + Math.floor(Math.random() * 20)
          );

          return {
            id: doc['id'],
            title: data['title'],
            company: data['company'],
            location: data['location'],
            locationType: data['locationType'],
            salaryRange: data['salaryRange'],
            matchScore,
            postedAt: data['postedAt']?.toDate() || new Date(),
            tags: data.tags || [],
          } as JobMatch;
        });

        setJobs(fetchedJobs);
      } catch (error) {
        console.error('Error fetching job matches:', error);
        // Set mock data on error
        setJobs([
          {
            id: '1',
            title: 'Senior Data Scientist',
            company: 'TechCorp México',
            location: 'Ciudad de México, CDMX',
            locationType: 'hybrid',
            salaryRange: {
              min: 60000,
              max: 90000,
              currency: 'MXN',
              period: 'monthly',
            },
            matchScore: 92,
            postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            tags: ['python', 'machine-learning', 'sql'],
          },
          {
            id: '2',
            title: 'Machine Learning Engineer',
            company: 'AI Solutions México',
            location: 'Remote',
            locationType: 'remote',
            salaryRange: {
              min: 50000,
              max: 70000,
              currency: 'MXN',
              period: 'monthly',
            },
            matchScore: 85,
            postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            tags: ['mlops', 'python', 'docker'],
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobMatches();
  }, [user, userProfile]);

  const formatSalary = (salaryRange?: JobMatch['salaryRange']): string => {
    if (!salaryRange) return '';
    const { min, max, currency, period } = salaryRange;
    const formatter = new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US');
    const periodText =
      lang === 'es' ? (period === 'monthly' ? 'mes' : 'año') : period;
    return `${currency} ${formatter.format(min)}-${formatter.format(max)}/${periodText}`;
  };

  const formatPostedAt = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return lang === 'es' ? 'Hoy' : 'Today';
    } else if (days === 1) {
      return lang === 'es' ? 'Ayer' : 'Yesterday';
    } else if (days < 7) {
      return lang === 'es' ? `Hace ${days} días` : `${days} days ago`;
    } else {
      return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US');
    }
  };

  const getLocationTypeLabel = (type: string): string => {
    const labels: Record<string, Record<string, string>> = {
      remote: { es: 'Remoto', en: 'Remote' },
      hybrid: { es: 'Híbrido', en: 'Hybrid' },
      onsite: { es: 'Presencial', en: 'On-site' },
    };
    return labels[type]?.[lang] || type;
  };

  const getMatchScoreColor = (score: number): string => {
    if (score >= 80)
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
    if (score >= 60)
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20';
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-b border-gray-200 pb-4 last:border-0 dark:border-gray-700"
            >
              <div className="mb-2 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="mb-2 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'No hay trabajos recomendados'
            : 'No job recommendations'}
        </p>
        <a
          href={`/${lang}/dashboard/jobs`}
          className="mt-4 block text-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {lang === 'es' ? 'Explorar todos los trabajos' : 'Browse all jobs'}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow dark:bg-gray-800">
      <div className="p-6">
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job['id']}
              className="border-b border-gray-200 pb-4 last:border-0 dark:border-gray-700"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {job.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {job.company}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${getMatchScoreColor(job.matchScore)}`}
                >
                  {job.matchScore}% {lang === 'es' ? 'compatible' : 'match'}
                </span>
              </div>

              <div className="mb-2 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <MapPinIcon className="mr-1 h-3.5 w-3.5" />
                  {job.location} • {getLocationTypeLabel(job.locationType)}
                </div>
                {job.salaryRange && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="mr-1 h-3.5 w-3.5" />
                    {formatSalary(job.salaryRange)}
                  </div>
                )}
                <div className="flex items-center">
                  <ClockIcon className="mr-1 h-3.5 w-3.5" />
                  {formatPostedAt(job.postedAt)}
                </div>
              </div>

              {job.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {job.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <a
                href={`/${lang}/dashboard/jobs/${job['id']}`}
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {lang === 'es' ? 'Ver detalles' : 'View details'}
                <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 px-6 py-3 dark:bg-gray-900/50">
        <a
          href={`/${lang}/dashboard/jobs`}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {lang === 'es' ? 'Ver todos los trabajos →' : 'View all jobs →'}
        </a>
      </div>
    </div>
  );
};

export default JobMatches;
