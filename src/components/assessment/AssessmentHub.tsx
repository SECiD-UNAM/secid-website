import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import {
  /**
   * Assessment Hub - Main assessment center component
   */

  getAssessments,
  getUserProgress,
  getLeaderboard,
  searchAssessments,
} from '../../lib/assessment';
import type {
  Assessment,
  AssessmentProgress,
  Leaderboard,
  AssessmentFilters,
  SkillCategory,
  DifficultyLevel,
  AssessmentMode,
} from '../../types/assessment';

interface AssessmentHubProps {
  userId: string;
  onStartAssessment: (assessmentId: string) => void;
  onViewHistory: () => void;
  onViewCertificates: () => void;
}

export default function AssessmentHub({
  userId,
  onStartAssessment,
  onViewHistory,
  onViewCertificates,
}: AssessmentHubProps) {
  const { t } = useTranslations();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AssessmentFilters>({
    categories: [],
    difficulties: [],
    modes: [],
    duration: [0, 180],
    minRating: 0,
    hasPrerequisites: false,
    showCompleted: true,
  });
  const [activeTab, setActiveTab] = useState<
    'explore' | 'progress' | 'leaderboard'
  >('explore');

  useEffect(() => {
    loadInitialData();
  }, [userId]);

  useEffect(() => {
    if (
      searchTerm ||
      Object.values(filters).some((v) =>
        Array.isArray(v) ? v.length > 0 : v !== 0 && v !== false && v !== true
      )
    ) {
      handleSearch();
    } else {
      loadAssessments();
    }
  }, [searchTerm, filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [assessmentsData, progressData, leaderboardData] =
        await Promise.all([
          getAssessments(),
          getUserProgress(userId),
          getLeaderboard('global'),
        ]);

      setAssessments(assessmentsData);
      setProgress(progressData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading assessment hub data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessments = async () => {
    try {
      const assessmentsData = await getAssessments(filters);
      setAssessments(assessmentsData);
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  };

  const handleSearch = async () => {
    try {
      if (searchTerm.trim()) {
        const searchResults = await searchAssessments(searchTerm, filters);
        setAssessments(searchResults.map((result) => result.assessment));
      } else {
        await loadAssessments();
      }
    } catch (error) {
      console.error('Error searching assessments:', error);
    }
  };

  const updateFilter = <K extends keyof AssessmentFilters>(
    key: K,
    value: AssessmentFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      difficulties: [],
      modes: [],
      duration: [0, 180],
      minRating: 0,
      hasPrerequisites: false,
      showCompleted: true,
    });
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {t('assessment.hub.title', 'Centro de Evaluaciones')}
        </h1>
        <p className="text-lg text-gray-600">
          {t(
            'assessment.hub.subtitle',
            'Evalúa y certifica tus habilidades en ciencia de datos'
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
                  {t('assessment.stats.completed', 'Completadas')}
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
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
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {t('assessment.stats.certificates', 'Certificados')}
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <svg
                    className="h-5 w-5 text-yellow-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {t('assessment.stats.badges', 'Insignias')}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {progress.badgesEarned}
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
                  {t('assessment.stats.average', 'Promedio')}
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
            { id: 'explore', name: t('assessment.tabs.explore', 'Explorar') },
            {
              id: 'progress',
              name: t('assessment.tabs.progress', 'Mi Progreso'),
            },
            {
              id: 'leaderboard',
              name: t('assessment.tabs.leaderboard', 'Clasificación'),
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
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'explore' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label
                  htmlFor="search"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  {t('assessment.search.placeholder', 'Buscar evaluaciones...')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t(
                      'assessment.search.placeholder',
                      'Buscar evaluaciones...'
                    )}
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('assessment.filters.category', 'Categoría')}
                </label>
                <select
                  multiple
                  value={filters.categories}
                  onChange={(e) =>
                    updateFilter(
                      'categories',
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value as SkillCategory
                      )
                    )
                  }
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="python">Python</option>
                  <option value="sql">SQL</option>
                  <option value="machine_learning">Machine Learning</option>
                  <option value="statistics">Estadística</option>
                  <option value="data_visualization">Visualización</option>
                  <option value="big_data">Big Data</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('assessment.filters.difficulty', 'Dificultad')}
                </label>
                <select
                  multiple
                  value={filters.difficulties}
                  onChange={(e) =>
                    updateFilter(
                      'difficulties',
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value as DifficultyLevel
                      )
                    )
                  }
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                  <option value="expert">Experto</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchTerm ||
              Object.values(filters).some((v) =>
                Array.isArray(v)
                  ? v.length > 0
                  : v !== 0 && v !== false && v !== true
              )) && (
              <div className="mt-4">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {t('assessment.filters.clear', 'Limpiar filtros')}
                </button>
              </div>
            )}
          </div>

          {/* Assessment Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                onStart={() => onStartAssessment(assessment.id)}
                userProgress={progress}
              />
            ))}
          </div>

          {assessments.length === 0 && (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t(
                  'assessment.noResults.title',
                  'No se encontraron evaluaciones'
                )}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t(
                  'assessment.noResultsmessage',
                  'Intenta ajustar los filtros de búsqueda.'
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && progress && (
        <ProgressTab
          progress={progress}
          onViewHistory={onViewHistory}
          onViewCertificates={onViewCertificates}
        />
      )}

      {activeTab === 'leaderboard' && leaderboard && (
        <LeaderboardTab leaderboard={leaderboard} currentUserId={userId} />
      )}
    </div>
  );
}

// Assessment Card Component
interface AssessmentCardProps {
  assessment: Assessment;
  onStart: () => void;
  userProgress: AssessmentProgress | null;
}

function AssessmentCard({
  assessment,
  onStart,
  userProgress,
}: AssessmentCardProps) {
  const { t } = useTranslations();

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getModeColor = (mode: AssessmentMode) => {
    return mode === 'certification'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  };

  return (
    <div className="rounded-lg bg-white shadow transition-shadow duration-200 hover:shadow-md">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex space-x-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDifficultyColor(assessment.difficulty)}`}
            >
              {t(`difficulty.${assessment.difficulty}`, assessment.difficulty)}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getModeColor(assessment.mode)}`}
            >
              {t(`mode.${assessment.mode}`, assessment.mode)}
            </span>
          </div>
          <div className="text-sm text-gray-500">{assessment.timeLimit}min</div>
        </div>

        <h3 className="mb-2 text-lg font-medium text-gray-900">
          {assessment.title}
        </h3>

        <p className="mb-4 line-clamp-3 text-sm text-gray-600">
          {assessment['description']}
        </p>

        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>{assessment.totalQuestions} preguntas</span>
          <span>Puntaje mínimo: {assessment.passingScore}%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{Math.round(assessment.averageScore)}% promedio</span>
          </div>

          <button
            onClick={onStart}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700"
          >
            {t('assessment.start', 'Comenzar')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Progress Tab Component
interface ProgressTabProps {
  progress: AssessmentProgress;
  onViewHistory: () => void;
  onViewCertificates: () => void;
}

function ProgressTab({
  progress,
  onViewHistory,
  onViewCertificates,
}: ProgressTabProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      {/* Skill Levels */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('assessment.progress.skills', 'Niveles de Habilidad')}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(progress.skillLevels).map(([skill, level]) => (
            <div key={skill} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm font-medium text-blue-600">
                    {Math.round(level)}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium capitalize text-gray-900">
                    {skill.replace('_', ' ')}
                  </p>
                  <span className="text-sm text-gray-500">
                    {Math.round(level)}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${level}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {t('assessment.progress.recent', 'Actividad Reciente')}
          </h3>
          <button
            onClick={onViewHistory}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {t('assessment.progress.viewAll', 'Ver todo')}
          </button>
        </div>

        {progress.recentAttempts.length > 0 ? (
          <div className="space-y-3">
            {progress.recentAttempts.slice(0, 5).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Assessment {attempt.assessmentId}
                  </p>
                  <p className="text-sm text-gray-500">
                    {attempt?.completedAt?.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {attempt.percentage}%
                  </p>
                  <p
                    className={`text-sm ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {attempt.passed ? 'Aprobado' : 'Reprobado'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-gray-500">
            {t('assessment.progress.noActivity', 'No hay actividad reciente')}
          </p>
        )}
      </div>

      {/* Certificates */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {t('assessment.progress.certificates', 'Certificados')}
          </h3>
          <button
            onClick={onViewCertificates}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {t('assessment.progress.viewCertificates', 'Ver certificados')}
          </button>
        </div>

        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-8 w-8 text-yellow-600"
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
            <p className="mb-2 text-lg font-medium text-gray-900">
              {progress.certificatesEarned}{' '}
              {t(
                'assessment.progress.certificatesEarned',
                'Certificados obtenidos'
              )}
            </p>
            <p className="text-gray-500">
              {t(
                'assessment.progress.certificatesMessage',
                'Completa evaluaciones para obtener certificados verificados'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Leaderboard Tab Component
interface LeaderboardTabProps {
  leaderboard: Leaderboard;
  currentUserId: string;
}

function LeaderboardTab({ leaderboard, currentUserId }: LeaderboardTabProps) {
  const { t } = useTranslations();

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-medium text-gray-900">
          {t('assessment.leaderboard.title', 'Clasificación Global')}
        </h3>
        <p className="text-sm text-gray-500">
          {leaderboard.totalParticipants} participantes • Actualizado{' '}
          {leaderboard.lastUpdated.toLocaleDateString()}
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {leaderboard.entries.map((entry) => (
          <div
            key={entry['userId']}
            className={`flex items-center justify-between px-6 py-4 ${
              entry['userId'] === currentUserId ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    entry.rank <= 3
                      ? entry.rank === 1
                        ? 'bg-yellow-100 text-yellow-800'
                        : entry.rank === 2
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {entry.rank <= 3
                    ? entry.rank === 1
                      ? '🥇'
                      : entry.rank === 2
                        ? '🥈'
                        : '🥉'
                    : entry.rank}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {entry.displayName}
                  {entry.userId === currentUserId && (
                    <span className="ml-2 text-blue-600">(Tú)</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {entry.assessmentsCompleted} evaluaciones •{' '}
                  {entry.certificates} certificados
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {entry.score.toLocaleString()} pts
              </p>
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <span>{entry.badges} 🏆</span>
                <span>•</span>
                <span>{entry.streak} días</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
