import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import {
  /**
   * Assessment History - User's assessment history and progress tracking
   */

  getUserProgress,
  getUserCertificates,
  getAssessments,
} from '../../lib/assessment';
import type {
  AssessmentProgress,
  AssessmentAttempt,
  Certificate,
  Assessment,
  SkillCategory,
  DifficultyLevel,
} from '../../types/assessment';

interface AssessmentHistoryProps {
  userId: string;
  onViewResult?: (attemptId: string) => void;
  onRetakeAssessment?: (assessmentId: string) => void;
  onViewCertificate?: (certificateId: string) => void;
}

export default function AssessmentHistory({
  userId,
  onViewResult,
  onRetakeAssessment,
  onViewCertificate,
}: AssessmentHistoryProps) {
  const { t } = useTranslations();
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'attempts' | 'certificates' | 'progress'
  >('attempts');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'completed' | 'passed' | 'failed'
  >('all');
  const [filterCategory, setFilterCategory] = useState<SkillCategory | 'all'>(
    'all'
  );
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadHistoryData();
  }, [userId]);

  const loadHistoryData = async () => {
    try {
      setLoading(true);

      const [progressData, certificatesData, assessmentsData] =
        await Promise.all([
          getUserProgress(userId),
          getUserCertificates(userId),
          getAssessments(),
        ]);

      setProgress(progressData);
      setCertificates(certificatesData);
      setAssessments(assessmentsData);
    } catch (error) {
      console.error('Error loading assessment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssessmentById = (assessmentId: string) => {
    return assessments.find((assessment) => assessment.id === assessmentId);
  };

  const filteredAttempts =
    progress?.recentAttempts
      .filter((attempt) => {
        if (filterStatus === 'completed' && attempt['status'] !== 'completed')
          return false;
        if (filterStatus === 'passed' && !attempt.passed) return false;
        if (filterStatus === 'failed' && attempt.passed) return false;

        if (filterCategory !== 'all') {
          const assessment = getAssessmentById(attempt.assessmentId);
          if (!assessment || assessment.category !== filterCategory)
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case 'date':
            aValue = a.completedAt || a.startedAt;
            bValue = b.completedAt || b.startedAt;
            break;
          case 'score':
            aValue = a.score;
            bValue = b.score;
            break;
          case 'category':
            const aAssessment = getAssessmentById(a.assessmentId);
            const bAssessment = getAssessmentById(b.assessmentId);
            aValue = aAssessment?.category || '';
            bValue = bAssessment?.category || '';
            break;
          default:
            return 0;
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      }) || [];

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {t('history.title', 'Historial de Evaluaciones')}
        </h1>
        <p className="text-lg text-gray-600">
          {t(
            'history.subtitle',
            'Revisa tu progreso y rendimiento en evaluaciones'
          )}
        </p>
      </div>

      {/* Quick Stats */}
      {progress && (
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 2a1 1 0 100 2h2a1 1 0 100-2h-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {t('history.statstotal', 'Total Evaluaciones')}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {progress.totalAssessments}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-5 w-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {t('history.stats.completed', 'Completadas')}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {progress.completedAssessments}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <svg
                    className="h-5 w-5 text-yellow-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {t('history.stats.certificates', 'Certificados')}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {progress.certificatesEarned}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                  <svg
                    className="h-5 w-5 text-purple-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {t('history.stats.average', 'Promedio')}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(progress.averageScore)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            {
              id: 'attempts',
              name: t('history.tabs.attempts', 'Intentos'),
              count: filteredAttempts.length,
            },
            {
              id: 'certificates',
              name: t('history.tabs.certificates', 'Certificados'),
              count: certificates.length,
            },
            {
              id: 'progress',
              name: t('history.tabs.progress', 'Progreso'),
              count: null,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab['name']}
              {tab.count !== null && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-900">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'attempts' && (
        <AttemptsTab
          attempts={filteredAttempts}
          assessments={assessments}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          onViewResult={onViewResult}
          onRetakeAssessment={onRetakeAssessment}
        />
      )}

      {activeTab === 'certificates' && (
        <CertificatesTab
          certificates={certificates}
          onViewCertificate={onViewCertificate}
        />
      )}

      {activeTab === 'progress' && progress && (
        <ProgressTab progress={progress} />
      )}
    </div>
  );
}

// Attempts Tab Component
interface AttemptsTabProps {
  attempts: AssessmentAttempt[];
  assessments: Assessment[];
  filterStatus: 'all' | 'completed' | 'passed' | 'failed';
  setFilterStatus: (status: 'all' | 'completed' | 'passed' | 'failed') => void;
  filterCategory: SkillCategory | 'all';
  setFilterCategory: (category: SkillCategory | 'all') => void;
  sortBy: 'date' | 'score' | 'category';
  setSortBy: (sort: 'date' | 'score' | 'category') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onViewResult?: (attemptId: string) => void;
  onRetakeAssessment?: (assessmentId: string) => void;
}

function AttemptsTab({
  attempts,
  assessments,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onViewResult,
  onRetakeAssessment,
}: AttemptsTabProps) {
  const { t } = useTranslations();

  const getAssessmentById = (assessmentId: string) => {
    return assessments.find((assessment) => assessment.id === assessmentId);
  };

  return (
    <div className="space-y-6">
      {/* Filters and Sorting */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('history.filtersstatus', 'Estado')}
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as typeof filterStatus)
              }
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="all">{t('history.filters.all', 'Todos')}</option>
              <option value="completed">
                {t('history.filters.completed', 'Completados')}
              </option>
              <option value="passed">
                {t('history.filters.passed', 'Aprobados')}
              </option>
              <option value="failed">
                {t('history.filters.failed', 'No aprobados')}
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('history.filters.category', 'Categoría')}
            </label>
            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value as typeof filterCategory)
              }
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="all">
                {t('history.filters.allCategories', 'Todas las categorías')}
              </option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="machine_learning">Machine Learning</option>
              <option value="statistics">Estadística</option>
              <option value="data_visualization">Visualización</option>
              <option value="big_data">Big Data</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('history.sort.sortBy', 'Ordenar por')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="date">{t('history.sort.date', 'Fecha')}</option>
              <option value="score">
                {t('history.sort.score', 'Puntaje')}
              </option>
              <option value="category">
                {t('history.sort.category', 'Categoría')}
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('history.sort.order', 'Orden')}
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="desc">
                {t('history.sort.desc', 'Descendente')}
              </option>
              <option value="asc">{t('history.sort.asc', 'Ascendente')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attempts List */}
      {attempts.length > 0 ? (
        <div className="space-y-4">
          {attempts.map((attempt) => {
            const assessment = getAssessmentById(attempt.assessmentId);
            return (
              <AttemptCard
                key={attempt.id}
                attempt={attempt}
                assessment={assessment}
                onViewResult={onViewResult}
                onRetakeAssessment={onRetakeAssessment}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            {t('history.noAttempts.title', 'No hay intentos que mostrar')}
          </h3>
          <p className="text-gray-500">
            {t(
              'history.noAttemptsmessage',
              'Intenta ajustar los filtros para ver más resultados.'
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// Attempt Card Component
interface AttemptCardProps {
  attempt: AssessmentAttempt;
  assessment?: Assessment;
  onViewResult?: (attemptId: string) => void;
  onRetakeAssessment?: (assessmentId: string) => void;
}

function AttemptCard({
  attempt,
  assessment,
  onViewResult,
  onRetakeAssessment,
}: AttemptCardProps) {
  const { t } = useTranslations();

  const getStatusColor = (status: string, passed: boolean) => {
    if (status === 'completed') {
      return passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="rounded-lg bg-white shadow transition-shadow duration-200 hover:shadow-md">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {assessment?.title || `Assessment ${attempt.assessmentId}`}
            </h3>
            <p className="text-sm text-gray-500">
              {attempt?.completedAt?.toLocaleDateString() ||
                attempt.startedAt.toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(attempt['status'], attempt.passed)}`}
            >
              {attempt.status === 'completed'
                ? attempt.passed
                  ? t('historystatus.passed', 'Aprobado')
                  : t('historystatus.failed', 'No aprobado')
                : t(
                    `history['status'].${attempt['status']}`,
                    attempt['status']
                  )}
            </span>

            {assessment && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-800">
                {assessment.category.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${getScoreColor(attempt.score)}`}
            >
              {attempt.score}%
            </div>
            <div className="text-sm text-gray-500">
              {t('history.score', 'Puntaje')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.floor(attempt.timeSpent / 60)}min
            </div>
            <div className="text-sm text-gray-500">
              {t('history.timeSpent', 'Tiempo')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {attempt.answers.filter((a) => a.isCorrect).length}/
              {attempt.answers.length}
            </div>
            <div className="text-sm text-gray-500">
              {t('history.correct', 'Correctas')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {attempt.badgesEarned.length}
            </div>
            <div className="text-sm text-gray-500">
              {t('history.badges', 'Insignias')}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {assessment && (
              <>
                <span className="capitalize">
                  {t(
                    `difficulty.${assessment.difficulty}`,
                    assessment.difficulty
                  )}
                </span>
                <span>•</span>
                <span>
                  {assessment.totalQuestions}{' '}
                  {t('history.questions', 'preguntas')}
                </span>
                <span>•</span>
                <span>
                  {assessment.timeLimit}min {t('history.timeLimit', 'límite')}
                </span>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            {attempt['status'] === 'completed' && onViewResult && (
              <button
                onClick={() => onViewResult(attempt.id)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {t('history.viewDetails', 'Ver detalles')}
              </button>
            )}

            {!attempt.passed && onRetakeAssessment && (
              <button
                onClick={() => onRetakeAssessment(attempt.assessmentId)}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('history.retake', 'Reintentar')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Certificates Tab Component
interface CertificatesTabProps {
  certificates: Certificate[];
  onViewCertificate?: (certificateId: string) => void;
}

function CertificatesTab({
  certificates,
  onViewCertificate,
}: CertificatesTabProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((certificate) => (
            <CertificateCard
              key={certificate.id}
              certificate={certificate}
              onViewCertificate={onViewCertificate}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            {t('history.noCertificates.title', 'No tienes certificados aún')}
          </h3>
          <p className="text-gray-500">
            {t(
              'history.noCertificatesmessage',
              'Completa evaluaciones de certificación para obtener certificados verificados.'
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// Certificate Card Component
interface CertificateCardProps {
  certificate: Certificate;
  onViewCertificate?: (certificateId: string) => void;
}

function CertificateCard({
  certificate,
  onViewCertificate,
}: CertificateCardProps) {
  const { t } = useTranslations();

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow transition-shadow duration-200 hover:shadow-md">
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-4">
        <div className="flex items-center justify-center">
          <svg
            className="h-12 w-12 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      <div className="p-6">
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          {certificate.title}
        </h3>

        <p className="mb-4 text-sm text-gray-600">
          {certificate['description']}
        </p>

        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>{certificate.issuedAt.toLocaleDateString()}</span>
          <span className="font-medium text-gray-900">
            {certificate.score}%
          </span>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {t('certificate.level', 'Nivel')}:{' '}
            <span className="capitalize">{certificate.level}</span>
          </span>
          <span className="text-gray-500">
            ID: {certificate.verificationCode}
          </span>
        </div>

        <div className="mb-4 flex items-center space-x-2">
          {certificate.skills.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium capitalize text-blue-800"
            >
              {skill.replace('_', ' ')}
            </span>
          ))}
        </div>

        <div className="flex space-x-2">
          {onViewCertificate && (
            <button
              onClick={() => onViewCertificate(certificate.id)}
              className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('certificate.view', 'Ver certificado')}
            </button>
          )}

          {certificate.shareableUrl && (
            <button
              onClick={() => window.open(certificate.shareableUrl, '_blank')}
              className="flex-1 rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {t('certificate.share', 'Compartir')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress Tab Component
interface ProgressTabProps {
  progress: AssessmentProgress;
}

function ProgressTab({ progress }: ProgressTabProps) {
  const { t } = useTranslations();

  const getSkillLevelColor = (level: number) => {
    if (level >= 80) return 'text-green-600 bg-green-100';
    if (level >= 60) return 'text-blue-600 bg-blue-100';
    if (level >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSkillLevelLabel = (level: number) => {
    if (level >= 80) return t('skill.expert', 'Experto');
    if (level >= 60) return t('skill.advanced', 'Avanzado');
    if (level >= 40) return t('skill.intermediate', 'Intermedio');
    return t('skill.beginner', 'Principiante');
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('history.progress.overall', 'Progreso General')}
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-blue-600">
              {Math.round(progress.averageScore)}%
            </div>
            <div className="text-sm text-gray-500">
              {t('history.progress.averageScore', 'Puntaje Promedio')}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-green-600">
              {progress.streakDays}
            </div>
            <div className="text-sm text-gray-500">
              {t('history.progress.streakDays', 'Días Consecutivos')}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-purple-600">
              {Math.floor(progress.totalTimeSpent / 3600)}h
            </div>
            <div className="text-sm text-gray-500">
              {t('history.progress.totalTime', 'Tiempo Total')}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-yellow-600">
              {progress.verifiedSkills.length}
            </div>
            <div className="text-sm text-gray-500">
              {t('history.progress.verifiedSkills', 'Habilidades Verificadas')}
            </div>
          </div>
        </div>
      </div>

      {/* Skill Levels */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('history.progress.skillLevels', 'Niveles de Habilidad')}
        </h3>

        <div className="space-y-4">
          {Object.entries(progress.skillLevels).map(([skill, level]) => (
            <div key={skill} className="flex items-center space-x-4">
              <div className="w-32 text-sm font-medium capitalize text-gray-900">
                {skill.replace('_', ' ')}
              </div>

              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${getSkillLevelColor(level)}`}
                  >
                    {getSkillLevelLabel(level)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(level)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${level}%` }}
                  ></div>
                </div>
              </div>

              {progress.verifiedSkills.includes(skill as SkillCategory) && (
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Summary */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('history.progress.achievements', 'Logros')}
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="mb-1 text-2xl font-bold text-gray-900">
              {progress.certificatesEarned}
            </div>
            <div className="text-sm text-gray-500">
              {t(
                'history.progress.certificatesEarned',
                'Certificados Obtenidos'
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="mb-1 text-2xl font-bold text-gray-900">
              {progress.badgesEarned}
            </div>
            <div className="text-sm text-gray-500">
              {t('history.progress.badgesEarned', 'Insignias Obtenidas')}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="mb-1 text-2xl font-bold text-gray-900">
              {Math.round(
                (progress.completedAssessments / progress.totalAssessments) *
                  100
              ) || 0}
              %
            </div>
            <div className="text-sm text-gray-500">
              {t('history.progress.completionRate', 'Tasa de Finalización')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
