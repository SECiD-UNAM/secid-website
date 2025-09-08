import React, { useState } from 'react';
import { useAuth} from '@/contexts/AuthContext';
import {
  MapPinIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  BookmarkIcon,
  EyeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon} from '@heroicons/react/24/solid';

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
    if (!salaryRange) return lang === 'es' ? 'Salario no especificado' : 'Salary not specified';
    const { min, max, currency, period } = salaryRange;
    const formatter = new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US');
    const periodText = lang === 'es' 
      ? (period === 'monthly' ? 'mes' : 'año')
      : period;
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
      return lang === 'es' ? `Hace ${hours} hora${hours > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return lang === 'es' ? `Hace ${days} día${days > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return lang === 'es' ? `Hace ${weeks} semana${weeks > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
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
      'contract': { es: 'Por proyecto', en: 'Contract' },
      'internship': { es: 'Práctica', en: 'Internship' },
    };
    return labels[type]?.[lang] || type;
  };

  const getMatchScoreColor = (score?: number): string => {
    if (!score) return '';
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20';
  };

  const handleSaveJob = () => {
    // In production, this would save to Firestore
    setIsSaved(!isSaved);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all p-6 ${job.featured ? 'border-2 border-primary-500' : ''}`}>
      {/* Featured Badge */}
      {job.featured && (
        <div className="mb-3">
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
            <SparklesIcon className="h-3 w-3 mr-1" />
            {lang === 'es' ? 'Destacado' : 'Featured'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start space-x-4 flex-1">
          {/* Company Logo */}
          {job.companyLogo ? (
            <img
              src={job.companyLogo}
              alt={job.company}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <BriefcaseIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          
          {/* Job Title and Company */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">
              <a href={`/${lang}/dashboard/jobs/${job.id}`}>
                {job.title}
              </a>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {job.company}
            </p>
          </div>
        </div>

        {/* Match Score and Save Button */}
        <div className="flex items-center space-x-2">
          {job.matchScore !== undefined && (
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getMatchScoreColor(job.matchScore)}`}>
              {job.matchScore}% {lang === 'es' ? 'compatible' : 'match'}
            </span>
          )}
          <button
            onClick={handleSaveJob}
            className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
            title={isSaved ? (lang === 'es' ? 'Guardado' : 'Saved') : (lang === 'es' ? 'Guardar' : 'Save')}
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
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center">
          <MapPinIcon className="h-4 w-4 mr-1" />
          {job.location}
        </div>
        <div className="flex items-center">
          <BriefcaseIcon className="h-4 w-4 mr-1" />
          {getLocationTypeLabel(job.locationType)}
        </div>
        <div className="flex items-center">
          <ClockIcon className="h-4 w-4 mr-1" />
          {getEmploymentTypeLabel(job.employmentType)}
        </div>
        <div className="flex items-center">
          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
          {formatSalary(job.salaryRange)}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
        {job['description']}
      </p>

      {/* Requirements Preview */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {lang === 'es' ? 'Requisitos principales:' : 'Key requirements:'}
        </p>
        <div className="flex flex-wrap gap-2">
          {job.requirements.slice(0, 4).map((req, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
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
        <div className="flex flex-wrap gap-2 mb-4">
          {job.tags.slice(0, 5).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <ClockIcon className="h-3.5 w-3.5 mr-1" />
            {formatPostedAt(job.postedAt)}
          </div>
          <div className="flex items-center">
            <UserGroupIcon className="h-3.5 w-3.5 mr-1" />
            {job.applicationCount} {lang === 'es' ? 'aplicaciones' : 'applications'}
          </div>
          <div className="flex items-center">
            <EyeIcon className="h-3.5 w-3.5 mr-1" />
            {job.viewCount} {lang === 'es' ? 'vistas' : 'views'}
          </div>
        </div>
        
        <a
          href={`/${lang}/dashboard/jobs/${job.id}`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {lang === 'es' ? 'Ver detalles' : 'View details'}
          <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default JobCard;