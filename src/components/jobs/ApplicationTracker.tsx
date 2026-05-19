import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  BriefcaseIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  EyeIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  location: string;
  appliedAt: Date;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  viewed: boolean;
  lastUpdated?: Date;
  notes?: string;
  nextStep?: string;
  interviewDate?: Date;
}

interface ApplicationTrackerProps {
  lang?: 'es' | 'en';
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({
  lang = 'es',
}) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired'
  >('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'company'>('date');
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  useEffect(() => {
    if (!user) return;

    const applicationsQuery = query(
      collection(db, 'users', user.uid, 'applications'),
      orderBy('appliedAt', 'desc')
    );

    const unsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
      const apps = snapshot['docs'].map((doc) => {
        const data = doc['data']();
        return {
          id: doc['id'],
          ...data,
          appliedAt: data['appliedAt']?.toDate() || new Date(),
          lastUpdated: data?.lastUpdated?.toDate(),
          interviewDate: data['interviewDate']?.toDate(),
        } as Application;
      });

      setApplications(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending:
        'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      reviewed:
        'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      shortlisted:
        'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
      rejected: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      hired:
        'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      pending: { es: 'Pendiente', en: 'Pending' },
      reviewed: { es: 'Revisada', en: 'Reviewed' },
      shortlisted: { es: 'Preseleccionado', en: 'Shortlisted' },
      rejected: { es: 'Rechazada', en: 'Rejected' },
      hired: { es: 'Contratado', en: 'Hired' },
    };
    return labels[status]?.[lang] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'reviewed':
        return <EyeIcon className="h-4 w-4" />;
      case 'shortlisted':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'rejected':
        return <XCircleIcon className="h-4 w-4" />;
      case 'hired':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return lang === 'es' ? 'Hoy' : 'Today';
    } else if (days === 1) {
      return lang === 'es' ? 'Ayer' : 'Yesterday';
    } else if (days < 7) {
      return lang === 'es' ? `Hace ${days} días` : `${days} days ago`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return lang === 'es'
        ? `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`
        : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US');
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    if (!user) return;

    const confirmMessage =
      lang === 'es'
        ? '¿Estás seguro de que quieres retirar esta aplicación?'
        : 'Are you sure you want to withdraw this application?';

    if (confirm(confirmMessage)) {
      try {
        await updateDoc(
          doc(db, 'users', user.uid, 'applications', applicationId),
          {
            status: 'withdrawn',
            withdrawnAt: new Date(),
            lastUpdated: new Date(),
          }
        );
      } catch (error) {
        console.error('Error withdrawing application:', error);
      }
    }
  };

  // Filter and sort applications
  const filteredApplications = applications
    .filter((app) => filter === 'all' || app['status'] === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'status':
          return a['status'].localeCompare(b['status']);
        case 'company':
          return a.company.localeCompare(b.company);
        case 'date':
        default:
          return b.appliedAt.getTime() - a.appliedAt.getTime();
      }
    });

  // Statistics
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a['status'] === 'pending').length,
    reviewed: applications.filter((a) => a['status'] === 'reviewed').length,
    shortlisted: applications.filter((a) => a['status'] === 'shortlisted')
      .length,
    rejected: applications.filter((a) => a['status'] === 'rejected').length,
    hired: applications.filter((a) => a['status'] === 'hired').length,
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6 h-32 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-gray-200 dark:bg-gray-700"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Mis Aplicaciones' : 'My Applications'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Gestiona y da seguimiento a tus aplicaciones de trabajo'
            : 'Manage and track your job applications'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats['total']}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {lang === 'es' ? 'Total' : 'Total'}
          </div>
        </div>

        <div className="rounded-lg bg-yellow-50 p-4 shadow dark:bg-yellow-900/20">
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
            {stats.pending}
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-500">
            {lang === 'es' ? 'Pendientes' : 'Pending'}
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-4 shadow dark:bg-blue-900/20">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {stats.reviewed}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-500">
            {lang === 'es' ? 'Revisadas' : 'Reviewed'}
          </div>
        </div>

        <div className="rounded-lg bg-purple-50 p-4 shadow dark:bg-purple-900/20">
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
            {stats.shortlisted}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-500">
            {lang === 'es' ? 'Preseleccionadas' : 'Shortlisted'}
          </div>
        </div>

        <div className="rounded-lg bg-red-50 p-4 shadow dark:bg-red-900/20">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">
            {stats.rejected}
          </div>
          <div className="text-sm text-red-600 dark:text-red-500">
            {lang === 'es' ? 'Rechazadas' : 'Rejected'}
          </div>
        </div>

        <div className="rounded-lg bg-green-50 p-4 shadow dark:bg-green-900/20">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {stats.hired}
          </div>
          <div className="text-sm text-green-600 dark:text-green-500">
            {lang === 'es' ? 'Contratado' : 'Hired'}
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <FunnelIcon className="mr-1 inline h-4 w-4" />
            {lang === 'es' ? 'Filtrar por estado' : 'Filter by status'}
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">{lang === 'es' ? 'Todas' : 'All'}</option>
            <option value="pending">
              {lang === 'es' ? 'Pendientes' : 'Pending'}
            </option>
            <option value="reviewed">
              {lang === 'es' ? 'Revisadas' : 'Reviewed'}
            </option>
            <option value="shortlisted">
              {lang === 'es' ? 'Preseleccionadas' : 'Shortlisted'}
            </option>
            <option value="rejected">
              {lang === 'es' ? 'Rechazadas' : 'Rejected'}
            </option>
            <option value="hired">
              {lang === 'es' ? 'Contratado' : 'Hired'}
            </option>
          </select>
        </div>

        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <ArrowPathIcon className="mr-1 inline h-4 w-4" />
            {lang === 'es' ? 'Ordenar por' : 'Sort by'}
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="date">
              {lang === 'es' ? 'Fecha de aplicación' : 'Application date'}
            </option>
            <option value="status">
              {lang === 'es' ? 'Estado' : 'Status'}
            </option>
            <option value="company">
              {lang === 'es' ? 'Empresa' : 'Company'}
            </option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-800">
          <BriefcaseIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            {filter === 'all'
              ? lang === 'es'
                ? 'No has aplicado a ningún empleo'
                : "You haven't applied to any jobs"
              : lang === 'es'
                ? 'No hay aplicaciones en este estado'
                : 'No applications in this status'}
          </h3>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            {lang === 'es'
              ? 'Comienza explorando las oportunidades disponibles'
              : 'Start by exploring available opportunities'}
          </p>
          <a
            href={`/${lang}/dashboard/jobs`}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
          >
            {lang === 'es' ? 'Explorar empleos' : 'Explore jobs'}
            <ChevronRightIcon className="ml-2 h-4 w-4" />
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <div
              key={application['id']}
              className="rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    {application.companyLogo ? (
                      <img
                        src={application.companyLogo}
                        alt={application.company}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
                        <BuildingOfficeIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        <a
                          href={`/${lang}/dashboard/jobs/${application.jobId}`}
                          className="hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          {application.jobTitle}
                        </a>
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {application.company}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <MapPinIcon className="mr-1 h-4 w-4" />
                          {application.location}
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="mr-1 h-4 w-4" />
                          {formatDate(application.appliedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(application['status'])}`}
                  >
                    {getStatusIcon(application['status'])}
                    <span className="ml-2">
                      {getStatusLabel(application['status'])}
                    </span>
                  </span>

                  {!application.viewed && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {lang === 'es' ? 'Sin revisar' : 'Not viewed'}
                    </span>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {(application.notes ||
                application.interviewDate ||
                application.nextStep) && (
                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  {application.interviewDate && (
                    <div className="mb-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {lang === 'es' ? 'Entrevista:' : 'Interview:'}{' '}
                      {application.interviewDate.toLocaleDateString(
                        lang === 'es' ? 'es-MX' : 'en-US'
                      )}
                    </div>
                  )}

                  {application.nextStep && (
                    <div className="mb-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <ChevronRightIcon className="mr-2 h-4 w-4" />
                      {lang === 'es' ? 'Siguiente paso:' : 'Next step:'}{' '}
                      {application.nextStep}
                    </div>
                  )}

                  {application.notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <DocumentTextIcon className="mr-2 inline h-4 w-4" />
                      {application.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between">
                <a
                  href={`/${lang}/dashboard/jobs/${application.jobId}`}
                  className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  {lang === 'es' ? 'Ver empleo' : 'View job'}
                </a>

                {application['status'] === 'pending' && (
                  <button
                    onClick={() => handleWithdraw(application['id'])}
                    className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    {lang === 'es'
                      ? 'Retirar aplicación'
                      : 'Withdraw application'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips Section */}
      <div className="mt-12 rounded-lg bg-primary-50 p-6 dark:bg-primary-900/20">
        <h3 className="mb-4 text-lg font-semibold text-primary-900 dark:text-primary-100">
          {lang === 'es'
            ? '💡 Consejos para tu búsqueda'
            : '💡 Job search tips'}
        </h3>
        <ul className="space-y-2 text-sm text-primary-700 dark:text-primary-300">
          <li>
            {lang === 'es'
              ? '• Personaliza tu carta de presentación para cada empleo'
              : '• Customize your cover letter for each job'}
          </li>
          <li>
            {lang === 'es'
              ? '• Da seguimiento después de 1-2 semanas si no has recibido respuesta'
              : "• Follow up after 1-2 weeks if you haven't heard back"}
          </li>
          <li>
            {lang === 'es'
              ? '• Mantén tu perfil actualizado para mejorar tus coincidencias'
              : '• Keep your profile updated to improve your matches'}
          </li>
          <li>
            {lang === 'es'
              ? '• Prepárate para las entrevistas investigando sobre la empresa'
              : '• Prepare for interviews by researching the company'}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ApplicationTracker;
