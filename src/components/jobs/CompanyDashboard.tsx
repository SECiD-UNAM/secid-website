import React, { useState, useEffect } from 'react';
import { useAuth} from '@/contexts/AuthContext';
import { 
import { db} from '@/lib/firebase-config';
import {

  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc,
  getDoc 
} from 'firebase/firestore';
  BriefcaseIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface JobPost {
  id: string;
  title: string;
  location: string;
  status: 'draft' | 'pending' | 'active' | 'expired' | 'filled';
  isApproved: boolean;
  postedAt: Date;
  expiresAt?: Date;
  applicationCount: number;
  viewCount: number;
  featured: boolean;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
}

interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  appliedAt: Date;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  resumeUrl?: string;
  coverLetter: string;
  matchScore?: number;
}

interface CompanyDashboardProps {
  lang?: 'es' | 'en';
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ lang = 'es' }) => {
  const { user, userProfile } = useAuth();
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'applications' | 'analytics'>('overview');
  
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    totalViews: 0,
    conversionRate: 0,
    avgTimeToHire: 0,
    topPerformingJob: null as JobPost | null
  });

  useEffect(() => {
    if (!user) return;

    // Subscribe to company's job posts
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('postedBy', '==', user.uid),
      orderBy('postedAt', 'desc')
    );

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const posts = snapshot['docs'].map(doc => {
        const data = doc['data']();
        return {
          id: doc['id'],
          ...data,
          postedAt: data['postedAt']?.toDate() || new Date(),
          expiresAt: data?.expiresAt?.toDate(),
        } as JobPost;
      });

      setJobPosts(posts);
      calculateStats(posts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedJob) return;

    // Subscribe to applications for selected job
    const applicationsQuery = query(
      collection(db, 'jobs', selectedJob['id'], 'applications'),
      orderBy('appliedAt', 'desc')
    );

    const unsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
      const apps = snapshot['docs'].map(doc => {
        const data = doc['data']();
        return {
          id: doc['id'],
          ...data,
          appliedAt: data['appliedAt']?.toDate() || new Date(),
        } as Application;
      });

      setApplications(apps);
    });

    return () => unsubscribe();
  }, [selectedJob]);

  const calculateStats = (posts: JobPost[]) => {
    const totalJobs = posts.length;
    const activeJobs = posts.filter(j => j['status'] === 'active' && j.isApproved).length;
    const totalApplications = posts.reduce((sum, job) => sum + job.applicationCount, 0);
    const totalViews = posts.reduce((sum, job) => sum + job.viewCount, 0);
    const conversionRate = totalViews > 0 ? (totalApplications / totalViews) * 100 : 0;
    
    // Find top performing job
    const topJob = posts.reduce((top, job) => {
      if (!top || job.applicationCount > top.applicationCount) {
        return job;
      }
      return top;
    }, null as JobPost | null);

    setStats({
      totalJobs,
      activeJobs,
      totalApplications,
      pendingApplications: 0, // Will be calculated from applications
      totalViews,
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgTimeToHire: 15, // Mock value
      topPerformingJob: topJob
    });
    setStatsLoading(false);
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const confirmMessage = lang === 'es' 
      ? '¿Estás seguro de que quieres eliminar este empleo?' 
      : 'Are you sure you want to delete this job?';
    
    if (confirm(confirmMessage)) {
      try {
        await deleteDoc(doc(db, 'jobs', jobId));
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  const handleApplicationStatusChange = async (jobId: string, applicationId: string, newStatus: string) => {
    try {
      await updateDoc(
        doc(db, 'jobs', jobId, 'applications', applicationId),
        {
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: user?.uid
        }
      );
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400',
      pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      active: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      expired: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      filled: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    };
    return colors[status] || colors.draft;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      draft: { es: 'Borrador', en: 'Draft' },
      pending: { es: 'Pendiente', en: 'Pending' },
      active: { es: 'Activo', en: 'Active' },
      expired: { es: 'Expirado', en: 'Expired' },
      filled: { es: 'Cubierto', en: 'Filled' },
    };
    return labels[status]?.[lang] || status;
  };

  if(loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {lang === 'es' ? 'Panel de Empresa' : 'Company Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'es' 
              ? 'Gestiona tus publicaciones de empleo y aplicaciones'
              : 'Manage your job postings and applications'}
          </p>
        </div>
        
        <a
          href={`/${lang}/dashboard/jobs/new`}
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {lang === 'es' ? 'Publicar empleo' : 'Post job'}
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Empleos activos' : 'Active jobs'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.activeJobs}
              </p>
            </div>
            <BriefcaseIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Total aplicaciones' : 'Total applications'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalApplications}
              </p>
            </div>
            <UsersIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Vistas totales' : 'Total views'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalViews}
              </p>
            </div>
            <EyeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Tasa conversión' : 'Conversion rate'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.conversionRate}%
              </p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: lang === 'es' ? 'Resumen' : 'Overview', icon: ChartBarIcon },
            { id: 'jobs', label: lang === 'es' ? 'Empleos' : 'Jobs', icon: BriefcaseIcon },
            { id: 'applications', label: lang === 'es' ? 'Aplicaciones' : 'Applications', icon: DocumentTextIcon },
            { id: 'analytics', label: lang === 'es' ? 'Analíticas' : 'Analytics', icon: ChartBarIcon },
          ].map(tab => (
            <button
              key={tab['id']}
              onClick={() => setActiveTab(tab['id'] as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab['id']
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Performing Job */}
          {stats.topPerformingJob && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <SparklesIcon className="inline h-5 w-5 text-yellow-500 mr-2" />
                {lang === 'es' ? 'Empleo más popular' : 'Top performing job'}
              </h3>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {stats.topPerformingJob.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <MapPinIcon className="inline h-4 w-4 mr-1" />
                    {stats.topPerformingJob.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {stats.topPerformingJob.applicationCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'aplicaciones' : 'applications'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Applications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? 'Aplicaciones recientes' : 'Recent applications'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {lang === 'es' 
                ? 'Selecciona un empleo en la pestaña "Empleos" para ver sus aplicaciones'
                : 'Select a job from the "Jobs" tab to view its applications'}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {jobPosts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {lang === 'es' ? 'No tienes empleos publicados' : 'No job postings yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {lang === 'es' 
                  ? 'Comienza publicando tu primer empleo'
                  : 'Start by posting your first job'}
              </p>
              <a
                href={`/${lang}/dashboard/jobs/new`}
                className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {lang === 'es' ? 'Publicar empleo' : 'Post job'}
              </a>
            </div>
          ) : (
            jobPosts.map(job => (
              <div
                key={job['id']}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {job.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <MapPinIcon className="inline h-4 w-4 mr-1" />
                          {job.location}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(job['status'])}`}>
                        {getStatusLabel(job['status'])}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {lang === 'es' ? 'Aplicaciones' : 'Applications'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {job.applicationCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {lang === 'es' ? 'Vistas' : 'Views'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {job.viewCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {lang === 'es' ? 'Publicado' : 'Posted'}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {job.postedAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {job.expiresAt && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {lang === 'es' ? 'Expira' : 'Expires'}
                          </p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {job.expiresAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>

                    {!job.isApproved && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          <ExclamationTriangleIcon className="inline h-4 w-4 mr-1" />
                          {lang === 'es' 
                            ? 'Este empleo está pendiente de aprobación'
                            : 'This job is pending approval'}
                        </p>
                      </div>
                    )}

                    <div className="flex space-x-4 mt-4">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                      >
                        {lang === 'es' ? 'Ver aplicaciones' : 'View applications'}
                      </button>
                      <a
                        href={`/${lang}/dashboard/jobs/${job['id']}`}
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                      >
                        {lang === 'es' ? 'Ver empleo' : 'View job'}
                      </a>
                      <a
                        href={`/${lang}/dashboard/jobs/${job['id']}/edit`}
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                      >
                        <PencilIcon className="inline h-4 w-4 mr-1" />
                        {lang === 'es' ? 'Editar' : 'Edit'}
                      </a>
                      {job['status'] === 'active' && (
                        <button
                          onClick={() => handleStatusChange(job['id'], 'filled')}
                          className="text-green-600 dark:text-green-400 hover:underline text-sm font-medium"
                        >
                          <CheckCircleIcon className="inline h-4 w-4 mr-1" />
                          {lang === 'es' ? 'Marcar como cubierto' : 'Mark as filled'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteJob(job['id'])}
                        className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium"
                      >
                        <TrashIcon className="inline h-4 w-4 mr-1" />
                        {lang === 'es' ? 'Eliminar' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'applications' && (
        <div>
          {selectedJob ? (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {lang === 'es' ? 'Aplicaciones para:' : 'Applications for:'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedJob.title} - {selectedJob.location}
                </p>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="mt-2 text-primary-600 dark:text-primary-400 hover:underline text-sm"
                >
                  {lang === 'es' ? '← Seleccionar otro empleo' : '← Select another job'}
                </button>
              </div>

              {applications.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {lang === 'es' ? 'No hay aplicaciones aún' : 'No applications yet'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {lang === 'es' 
                      ? 'Las aplicaciones aparecerán aquí cuando los candidatos apliquen'
                      : 'Applications will appear here when candidates apply'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map(application => (
                    <div
                      key={application['id']}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {application.applicantName}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {application.applicantEmail}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            {lang === 'es' ? 'Aplicó' : 'Applied'} {application.appliedAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                          </p>
                        </div>
                        {application.matchScore && (
                          <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
                            {application.matchScore}% {lang === 'es' ? 'compatible' : 'match'}
                          </span>
                        )}
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {lang === 'es' ? 'Carta de presentación:' : 'Cover letter:'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {application.coverLetter}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4">
                        {application.resumeUrl && (
                          <a
                            href={application.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                          >
                            <DocumentTextIcon className="inline h-4 w-4 mr-1" />
                            {lang === 'es' ? 'Ver CV' : 'View resume'}
                          </a>
                        )}
                        
                        <select
                          value={application['status']}
                          onChange={(e) => handleApplicationStatusChange(selectedJob['id'], application['id'], e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="pending">{lang === 'es' ? 'Pendiente' : 'Pending'}</option>
                          <option value="reviewed">{lang === 'es' ? 'Revisada' : 'Reviewed'}</option>
                          <option value="shortlisted">{lang === 'es' ? 'Preseleccionada' : 'Shortlisted'}</option>
                          <option value="rejected">{lang === 'es' ? 'Rechazada' : 'Rejected'}</option>
                          <option value="hired">{lang === 'es' ? 'Contratado' : 'Hired'}</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {lang === 'es' ? 'Selecciona un empleo' : 'Select a job'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {lang === 'es' 
                  ? 'Selecciona un empleo de la pestaña "Empleos" para ver sus aplicaciones'
                  : 'Select a job from the "Jobs" tab to view its applications'}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {lang === 'es' ? 'Análisis de rendimiento' : 'Performance analytics'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Tiempo promedio de contratación' : 'Average time to hire'}
              </h4>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.avgTimeToHire} {lang === 'es' ? 'días' : 'days'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Tasa de conversión promedio' : 'Average conversion rate'}
              </h4>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.conversionRate}%
              </p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              <ChartBarIcon className="inline h-4 w-4 mr-1" />
              {lang === 'es' 
                ? 'Las analíticas detalladas estarán disponibles próximamente'
                : 'Detailed analytics coming soon'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;