import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import VerifiedBadge from './VerifiedBadge';
import {
  MapPinIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  BookmarkIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  locationType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
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
  applicationCount: number;
  viewCount: number;
  featured: boolean;
  matchScore?: number;
}

interface JobCardProps {
  job: Job;
  lang?: 'es' | 'en';
}

export const JobCard: React.FC<JobCardProps> = ({ job, lang = 'es' }) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  const formatSalary = (salaryRange?: Job['salaryRange']): string => {
    if (!salaryRange)
      return lang === 'es' ? 'Salario no especificado' : 'Salary not specified';
    const { min, max, currency, period } = salaryRange;
    const formatter = new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US');
    const periodText =
      lang === 'es' ? (period === 'monthly' ? 'mes' : 'año') : period;
    return `${currency} ${formatter.format(min)}-${formatter.format(max)}/${periodText}`;
  };

  const formatPostedAt = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      return lang === 'es' ? 'Hace menos de 1 hora' : 'Less than 1 hour ago';
    } else if (hours < 24) {
      return lang === 'es'
        ? `Hace ${hours} hora${hours > 1 ? 's' : ''}`
        : `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return lang === 'es'
        ? `Hace ${days} día${days > 1 ? 's' : ''}`
        : `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return lang === 'es'
        ? `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`
        : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
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

  const getEmploymentTypeLabel = (type: string): string => {
    const labels: Record<string, Record<string, string>> = {
      'full-time': { es: 'Tiempo completo', en: 'Full-time' },
      'part-time': { es: 'Medio tiempo', en: 'Part-time' },
      contract: { es: 'Por proyecto', en: 'Contract' },
      internship: { es: 'Práctica', en: 'Internship' },
    };
    return labels[type]?.[lang] || type;
  };

  const getMatchScoreColor = (score?: number): string => {
    if (!score) return '';
    if (score >= 80)
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
    if (score >= 60)
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20';
  };

  const handleSaveJob = () => {
    // In production, this would save to Firestore
    setIsSaved(!isSaved);
  };

  return (
    <div
      className={`rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800 ${job.featured ? 'border-2 border-primary-500' : ''}`}
    >
      {/* Featured Badge */}
      {job.featured && (
        <div className="mb-3">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
            <SparklesIcon className="mr-1 h-3 w-3" />
            {lang === 'es' ? 'Destacado' : 'Featured'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex flex-1 items-start space-x-4">
          {/* Company Logo */}
          {job.companyLogo ? (
            <img
              src={job.companyLogo}
              alt={job.company}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
              <BriefcaseIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
          )}

          {/* Job Title and Company */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
              <a href={`/${lang}/dashboard/jobs/${job.id}`}>{job.title}</a>
            </h3>
            <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {job.company}
              {(job as any).companyVerified && (
                <VerifiedBadge size="sm" lang={lang} />
              )}
            </p>
          </div>
        </div>

        {/* Match Score and Save Button */}
        <div className="flex items-center space-x-2">
          {job.matchScore !== undefined && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${getMatchScoreColor(job.matchScore)}`}
            >
              {job.matchScore}% {lang === 'es' ? 'compatible' : 'match'}
            </span>
          )}
          <button
            onClick={handleSaveJob}
            className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
            title={
              isSaved
                ? lang === 'es'
                  ? 'Guardado'
                  : 'Saved'
                : lang === 'es'
                  ? 'Guardar'
                  : 'Save'
            }
          >
            {isSaved ? (
              <BookmarkSolidIcon className="h-5 w-5" />
            ) : (
              <BookmarkIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Job Details */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center">
          <MapPinIcon className="mr-1 h-4 w-4" />
          {job.location}
        </div>
        <div className="flex items-center">
          <BriefcaseIcon className="mr-1 h-4 w-4" />
          {getLocationTypeLabel(job.locationType)}
        </div>
        <div className="flex items-center">
          <ClockIcon className="mr-1 h-4 w-4" />
          {getEmploymentTypeLabel(job.employmentType)}
        </div>
        <div className="flex items-center">
          <CurrencyDollarIcon className="mr-1 h-4 w-4" />
          {formatSalary(job.salaryRange)}
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">
        {job['description']}
      </p>

      {/* Requirements Preview */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Requisitos principales:' : 'Key requirements:'}
        </p>
        <div className="flex flex-wrap gap-2">
          {job.requirements.slice(0, 4).map((req, index) => (
            <span
              key={index}
              className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {req}
            </span>
          ))}
          {job.requirements.length > 4 && (
            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              +{job.requirements.length - 4} {lang === 'es' ? 'más' : 'more'}
            </span>
          )}
        </div>
      </div>

      {/* Tags */}
      {job.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {job.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded bg-primary-100 px-2 py-1 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <ClockIcon className="mr-1 h-3.5 w-3.5" />
            {formatPostedAt(job.postedAt)}
          </div>
          <div className="flex items-center">
            <UserGroupIcon className="mr-1 h-3.5 w-3.5" />
            {job.applicationCount}{' '}
            {lang === 'es' ? 'aplicaciones' : 'applications'}
          </div>
          <div className="flex items-center">
            <EyeIcon className="mr-1 h-3.5 w-3.5" />
            {job.viewCount} {lang === 'es' ? 'vistas' : 'views'}
          </div>
        </div>

        <a
          href={`/${lang}/dashboard/jobs/${job.id}`}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          {lang === 'es' ? 'Ver detalles' : 'View details'}
          <svg
            className="-mr-1 ml-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default JobCard;
