import React, { useState, useEffect } from 'react';
import { useAuth} from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs} from 'firebase/firestore';
import { db} from '@/lib/firebase-config';
import {
import { BookmarkIcon as BookmarkSolidIcon} from '@heroicons/react/24/solid';

  ArrowLeftIcon,
  MapPinIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  BookmarkIcon,
  ShareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface JobDetails {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companyDescription?: string;
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
  responsibilities?: string[];
  tags: string[];
  postedAt: Date;
  postedBy: string;
  applicationMethod: 'platform' | 'external' | 'email';
  applicationUrl?: string;
  applicationEmail?: string;
  applicationDeadline?: Date;
  applicationCount: number;
  viewCount: number;
  featured: boolean;
  status: string;
  matchScore?: number;
}

interface JobDetailProps {
  jobId: string;
  lang?: 'es' | 'en';
}

export const JobDetail: React.FC<JobDetailProps> = ({ jobId, lang = 'es' }) => {
  const { user, userProfile } = useAuth();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<any[]>([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    trackView();
    checkApplicationStatus();
    fetchSimilarJobs();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      
      if (jobDoc.exists()) {
        const data = jobDoc.data();
        
        // Calculate match score
        let matchScore = 0;
        if (userProfile?.skills && data['requirements']) {
          const userSkills = userProfile.skills;
          const jobRequirements = data.requirements;
          const matchingSkills = userSkills.filter((skill: string) =>
            jobRequirements.some((req: string) => 
              req.toLowerCase().includes(skill.toLowerCase())
            )
          );
          matchScore = Math.round((matchingSkills.length / Math.max(jobRequirements.length, 1)) * 100);
        }

        setJob({
          id: jobDoc['id'],
          ...data,
          postedAt: data['postedAt']?.toDate() || new Date(),
          applicationDeadline: data?.applicationDeadline?.toDate(),
          matchScore,
        } as JobDetails);
      } else {
        // Use mock data if job not found
        setJob(getMockJobDetails());
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      setJob(getMockJobDetails());
    } finally {
      setLoading(false);
    }
  };

  const getMockJobDetails = (): JobDetails => ({
    id: jobId,
    title: 'Senior Data Scientist',
    company: 'TechCorp México',
    companyDescription: 'Leading technology company specializing in AI and machine learning solutions for enterprise clients.',
    location: 'Ciudad de México, CDMX',
    locationType: 'hybrid',
    employmentType: 'full-time',
    salaryRange: {
      min: 60000,
      max: 90000,
      currency: 'MXN',
      period: 'monthly',
    },
    description: `We are looking for an experienced Data Scientist to join our growing team. You will be responsible for developing and implementing machine learning models, analyzing complex datasets, and driving data-driven decision making across the organization.

This is an exciting opportunity to work with cutting-edge technologies and make a significant impact on our products and services. You'll collaborate with cross-functional teams including engineering, product, and business stakeholders.`,
    requirements: [
      '3+ years of experience in data science or related field',
      'Strong programming skills in Python and SQL',
      'Experience with machine learning frameworks (TensorFlow, PyTorch, Scikit-learn)',
      'Solid understanding of statistical analysis and modeling',
      'Experience with cloud platforms (AWS, GCP, or Azure)',
      'Excellent communication and presentation skills',
      'Bachelor\'s or Master\'s degree in Computer Science, Statistics, or related field',
    ],
    responsibilities: [
      'Develop and deploy machine learning models to production',
      'Analyze large datasets to extract insights and patterns',
      'Collaborate with engineering teams to integrate ML solutions',
      'Present findings and recommendations to stakeholders',
      'Mentor junior data scientists and analysts',
      'Stay updated with latest ML/AI trends and technologies',
    ],
    benefits: [
      'Seguro de gastos médicos mayores',
      'Vales de despensa',
      'Home office flexible (3 días en oficina, 2 desde casa)',
      'Capacitación y certificaciones pagadas',
      'Bono anual por desempeño',
      'Vacaciones superiores a la ley',
      'Gimnasio en las instalaciones',
      'Estacionamiento gratuito',
    ],
    tags: ['python', 'machine-learning', 'sql', 'tensorflow', 'aws', 'senior'],
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    postedBy: 'company123',
    applicationMethod: 'platform',
    applicationDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    applicationCount: 23,
    viewCount: 156,
    featured: true,
    status: 'active',
    matchScore: 85,
  });

  const trackView = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        viewCount: increment(1),
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const checkApplicationStatus = async () => {
    if (!user) return;
    try {
      const applicationsQuery = query(
        collection(db, 'jobs', jobId, 'applications'),
        where('applicantId', '==', user.uid)
      );
      const snapshot = await getDocs(applicationsQuery);
      setHasApplied(!snapshot.empty);
    } catch (error) {
      console.error('Error checking application status:', error);
    }
  };

  const fetchSimilarJobs = async () => {
    try {
      // Fetch jobs from the same company or with similar tags
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'active'),
        where('company', '==', job?.company || '')
      );
      const snapshot = await getDocs(jobsQuery);
      const jobs = snapshot['docs']
        .filter(doc => doc['id'] !== jobId)
        .slice(0, 3)
        .map(doc => ({
          id: doc['id'],
          ...doc['data'](),
        }));
      setSimilarJobs(jobs);
    } catch (error) {
      console.error('Error fetching similar jobs:', error);
    }
  };

  const handleSaveJob = () => {
    setIsSaved(!isSaved);
    // In production, save to user's saved jobs collection
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job?.title,
        text: `${job?.title} at ${job?.company}`,
        url: window.location.href,
      });
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert(lang === 'es' ? 'Enlace copiado al portapapeles' : 'Link copied to clipboard');
    }
  };

  const formatSalary = (salaryRange?: JobDetails['salaryRange']): string => {
    if (!salaryRange) return lang === 'es' ? 'Salario no especificado' : 'Salary not specified';
    const { min, max, currency, period } = salaryRange;
    const formatter = new Intl.NumberFormat(lang === 'es' ? 'es-MX' : 'en-US');
    const periodText = lang === 'es' 
      ? (period === 'monthly' ? 'mes' : 'año')
      : period;
    return `${currency} ${formatter.format(min)}-${formatter.format(max)}/${periodText}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  if(loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {lang === 'es' ? 'Empleo no encontrado' : 'Job not found'}
        </h2>
        <a
          href={`/${lang}/dashboard/jobs`}
          className="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {lang === 'es' ? '← Volver a la bolsa de trabajo' : '← Back to job board'}
        </a>
      </div>
    );
  }

  return (
    <>
      <div>
        {/* Back Button */}
        <a
          href={`/${lang}/dashboard/jobs`}
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {lang === 'es' ? 'Volver a empleos' : 'Back to jobs'}
        </a>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Job Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            {job.featured && (
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
                  <SparklesIcon className="h-3 w-3 mr-1" />
                  {lang === 'es' ? 'Destacado' : 'Featured'}
                </span>
              </div>
            )}

            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {job.title}
                </h1>
                <div className="flex items-center space-x-4">
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    {job.company}
                  </p>
                  {job.matchScore !== undefined && (
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      job.matchScore >= 80 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : job.matchScore >= 60
                        ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                    }`}>
                      {job.matchScore}% {lang === 'es' ? 'compatible' : 'match'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveJob}
                  className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                  title={isSaved ? (lang === 'es' ? 'Guardado' : 'Saved') : (lang === 'es' ? 'Guardar' : 'Save')}
                >
                  {isSaved ? (
                    <BookmarkSolidIcon className="h-6 w-6" />
                  ) : (
                    <BookmarkIcon className="h-6 w-6" />
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                  title={lang === 'es' ? 'Compartir' : 'Share'}
                >
                  <ShareIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Job Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <MapPinIcon className="h-5 w-5 mr-2" />
                <div>
                  <p className="font-semibold">{job.location}</p>
                  <p className="text-xs">{getLocationTypeLabel(job.locationType)}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <BriefcaseIcon className="h-5 w-5 mr-2" />
                <div>
                  <p className="font-semibold">{getEmploymentTypeLabel(job.employmentType)}</p>
                  <p className="text-xs">{lang === 'es' ? 'Tipo de empleo' : 'Employment type'}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                <div>
                  <p className="font-semibold">{formatSalary(job.salaryRange)}</p>
                  <p className="text-xs">{lang === 'es' ? 'Salario' : 'Salary'}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <CalendarIcon className="h-5 w-5 mr-2" />
                <div>
                  <p className="font-semibold">{formatDate(job.postedAt)}</p>
                  <p className="text-xs">{lang === 'es' ? 'Publicado' : 'Posted'}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                <div>
                  <p className="font-semibold">{job.applicationCount}</p>
                  <p className="text-xs">{lang === 'es' ? 'Aplicaciones' : 'Applications'}</p>
                </div>
              </div>
              {job.applicationDeadline && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  <div>
                    <p className="font-semibold">{formatDate(job.applicationDeadline)}</p>
                    <p className="text-xs">{lang === 'es' ? 'Fecha límite' : 'Deadline'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Apply Button */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              {hasApplied ? (
                <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    {lang === 'es' ? 'Ya aplicaste a este empleo' : 'You have already applied to this job'}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => setShowApplicationModal(true)}
                  className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                >
                  {lang === 'es' ? 'Aplicar ahora' : 'Apply now'}
                </button>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? 'Descripción del puesto' : 'Job Description'}
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {job['description']}
              </p>
            </div>

            {job.responsibilities && job.responsibilities.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                  {lang === 'es' ? 'Responsabilidades' : 'Responsibilities'}
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                  {job.responsibilities.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              {lang === 'es' ? 'Requisitos' : 'Requirements'}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {job.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>

            {job.benefits && job.benefits.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                  {lang === 'es' ? 'Beneficios' : 'Benefits'}
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                  {job.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </>
            )}

            {/* Tags */}
            {job.tags.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {lang === 'es' ? 'Habilidades' : 'Skills'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Company Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? 'Acerca de la empresa' : 'About the company'}
            </h3>
            <div className="flex items-center mb-4">
              {job.companyLogo ? (
                <img
                  src={job.companyLogo}
                  alt={job.company}
                  className="h-16 w-16 rounded-lg object-cover mr-4"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-4">
                  <BuildingOfficeIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{job.company}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{job.location}</p>
              </div>
            </div>
            {job.companyDescription && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {job.companyDescription}
              </p>
            )}
            <a
              href={`/${lang}/dashboard/companies/${job.company}`}
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
            >
              {lang === 'es' ? 'Ver todos los empleos →' : 'View all jobs →'}
            </a>
          </div>

          {/* Similar Jobs */}
          {similarJobs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {lang === 'es' ? 'Empleos similares' : 'Similar jobs'}
              </h3>
              <div className="space-y-4">
                {similarJobs.map(similarJob => (
                  <a
                    key={similarJob['id']}
                    href={`/${lang}/dashboard/jobs/${similarJob['id']}`}
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {similarJob.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {similarJob.company}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <MapPinIcon className="h-3 w-3 mr-1" />
                      {similarJob.location}
                      <ChevronRightIcon className="h-3 w-3 ml-auto" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default JobDetail;