import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import {
  /**
   * Assessment Results - Results display with certificates
   */

  generateCertificate,
  getAssessment,
  getLeaderboard,
} from '../../lib/assessment';
import type {
  AssessmentResult,
  Certificate,
  Assessment,
  Leaderboard,
  QuestionResult,
  Recommendation,
} from '../../types/assessment';

interface AssessmentResultsProps {
  result: AssessmentResult;
  onViewCertificate?: (certificate: Certificate) => void;
  onRetakeAssessment?: () => void;
  onBackToHub: () => void;
  onShareResult?: (result: AssessmentResult) => void;
}

export default function AssessmentResults({
  result,
  onViewCertificate,
  onRetakeAssessment,
  onBackToHub,
  onShareResult,
}: AssessmentResultsProps) {
  const { t } = useTranslations();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'breakdown' | 'recommendations'
  >('overview');

  useEffect(() => {
    loadResultData();
  }, [result]);

  const loadResultData = async () => {
    try {
      setLoading(true);

      const [assessmentData, leaderboardData] = await Promise.all([
        getAssessment(result.assessmentId),
        getLeaderboard('global'),
      ]);

      setAssessment(assessmentData);
      setLeaderboard(leaderboardData);

      // Generate certificate if passed and doesn't exist
      if (
        result.passed &&
        !result.certificate &&
        assessmentData?.mode === 'certification'
      ) {
        await handleGenerateCertificate();
      } else if (result.certificate) {
        setCertificate(result.certificate);
      }
    } catch (error) {
      console.error('Error loading result data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!result.passed || generatingCertificate) return;

    try {
      setGeneratingCertificate(true);
      const newCertificate = await generateCertificate(
        result.userId,
        result.assessmentId,
        result.attemptId
      );
      setCertificate(newCertificate);
    } catch (error) {
      console.error('Error generating certificate:', error);
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = (passed: boolean, score: number) => {
    if (passed) {
      if (score >= 95)
        return t('results.excellent', '¡Excelente! Dominio sobresaliente');
      if (score >= 85)
        return t('results.great', '¡Muy bien! Gran dominio del tema');
      if (score >= 75)
        return t('results.good', '¡Bien! Buen nivel de conocimiento');
      return t('results.passed', '¡Aprobado! Nivel satisfactorio');
    } else {
      return t('results.failed', 'No aprobado. Sigue practicando');
    }
  };

  const userRank =
    leaderboard?.entries.findIndex(
      (entry) => entry.userId === result['userId']
    ) ?? -1;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">
            {t('results.loading', 'Cargando resultados...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
              result.passed ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            {result.passed ? (
              <svg
                className="h-10 w-10 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-10 w-10 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            {assessment?.title} - {t('results.title', 'Resultados')}
          </h1>

          <p className={`text-xl font-medium ${getScoreColor(result.score)}`}>
            {getScoreMessage(result.passed, result.score)}
          </p>
        </div>

        {/* Score Circle */}
        <div className="mb-8 text-center">
          <div className="relative mx-auto h-48 w-48">
            <svg
              className="h-48 w-48 -rotate-90 transform"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${result.percentage * 2.51} 251`}
                className={result.passed ? 'text-green-500' : 'text-red-500'}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div
                  className={`text-4xl font-bold ${getScoreColor(result.score)}`}
                >
                  {result.score}%
                </div>
                <div className="text-sm text-gray-500">
                  {result.passed
                    ? t('results.passed', 'Aprobado')
                    : t('results.failed', 'No aprobado')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="mb-2 text-2xl font-bold text-gray-900">
              {result?.categoryScores?.reduce(
                (sum, cat) => sum + cat.correctAnswers,
                0
              )}
            </div>
            <div className="text-sm text-gray-500">
              {t('results.correctAnswers', 'Respuestas correctas')}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="mb-2 text-2xl font-bold text-gray-900">
              {result.percentileRank}%
            </div>
            <div className="text-sm text-gray-500">
              {t('results.percentile', 'Percentil')}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="mb-2 text-2xl font-bold text-gray-900">
              {userRank >= 0 ? `#${userRank + 1}` : '--'}
            </div>
            <div className="text-sm text-gray-500">
              {t('results.ranking', 'Posición global')}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="mb-2 text-2xl font-bold text-gray-900">
              {result?.badges?.length}
            </div>
            <div className="text-sm text-gray-500">
              {t('results.badgesEarned', 'Insignias obtenidas')}
            </div>
          </div>
        </div>

        {/* Certificate Section */}
        {result.passed && assessment?.mode === 'certification' && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
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
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {t(
                      'results.certificate.title',
                      'Certificado de Competencia'
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {certificate
                      ? t(
                          'results.certificate.ready',
                          'Tu certificado está listo para descargar'
                        )
                      : t(
                          'results.certificate.generating',
                          'Generando tu certificado...'
                        )}
                  </p>
                </div>
              </div>

              {certificate ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => onViewCertificate?.(certificate)}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t('results.certificate.view', 'Ver certificado')}
                  </button>
                  {certificate.shareableUrl && (
                    <button
                      onClick={() =>
                        window.open(certificate.shareableUrl, '_blank')
                      }
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      {t('results.certificate.share', 'Compartir')}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleGenerateCertificate}
                  disabled={generatingCertificate}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {generatingCertificate ? (
                    <>
                      <div className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      {t('results.certificate.generating', 'Generando...')}
                    </>
                  ) : (
                    t('results.certificate.generate', 'Generar certificado')
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: t('results.tabs.overview', 'Resumen') },
              {
                id: 'breakdown',
                name: t('results.tabs.breakdown', 'Desglose'),
              },
              {
                id: 'recommendations',
                name: t('results.tabs.recommendations', 'Recomendaciones'),
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

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab result={result} assessment={assessment} />
        )}

        {activeTab === 'breakdown' && <BreakdownTab result={result} />}

        {activeTab === 'recommendations' && (
          <RecommendationsTab result={result} />
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          {!result.passed && onRetakeAssessment && (
            <button
              onClick={onRetakeAssessment}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              {t('results.retake', 'Volver a intentar')}
            </button>
          )}

          {onShareResult && (
            <button
              onClick={() => onShareResult(result)}
              className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
            >
              {t('results.share', 'Compartir resultado')}
            </button>
          )}

          <button
            onClick={onBackToHub}
            className="rounded-lg bg-gray-600 px-6 py-3 font-medium text-white hover:bg-gray-700"
          >
            {t('results.backToHub', 'Volver al centro de evaluaciones')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
interface OverviewTabProps {
  result: AssessmentResult;
  assessment: Assessment | null;
}

function OverviewTab({ result, assessment }: OverviewTabProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('results.overview.performance', 'Resumen de Rendimiento')}
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-blue-600">
              {result.score}%
            </div>
            <div className="text-sm text-gray-500">
              {t('results.overview.finalScore', 'Puntaje Final')}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-green-600">
              {result?.categoryScores?.reduce(
                (sum, cat) => sum + cat.correctAnswers,
                0
              )}
            </div>
            <div className="text-sm text-gray-500">
              {t('results.overview.correct', 'Correctas')} /{' '}
              {result?.categoryScores?.reduce(
                (sum, cat) => sum + cat.totalQuestions,
                0
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2 text-3xl font-bold text-purple-600">
              {result.percentileRank}
            </div>
            <div className="text-sm text-gray-500">
              {t('results.overview.percentile', 'Percentil')}
            </div>
          </div>
        </div>
      </div>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 flex items-center text-lg font-medium text-gray-900">
            <svg
              className="mr-2 h-5 w-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {t('results.overview.strengths', 'Fortalezas')}
          </h3>

          {result?.strengths?.length > 0 ? (
            <ul className="space-y-2">
              {result?.strengths?.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              {t(
                'results.overview.noStrengths',
                'Continúa practicando para identificar tus fortalezas'
              )}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 flex items-center text-lg font-medium text-gray-900">
            <svg
              className="mr-2 h-5 w-5 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {t('results.overview.weaknesses', 'Áreas de Mejora')}
          </h3>

          {result?.weaknesses?.length > 0 ? (
            <ul className="space-y-2">
              {result?.weaknesses?.map((weakness, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-700">{weakness}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              {t(
                'results.overview.noWeaknesses',
                '¡Excelente! No se identificaron áreas específicas de mejora'
              )}
            </p>
          )}
        </div>
      </div>

      {/* Badges Earned */}
      {result?.badges?.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            {t('results.overview.badges', 'Insignias Obtenidas')}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {result?.badges?.map((badge, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                  <span className="text-lg">{badge.iconUrl || '🏆'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {badge['name']}
                  </p>
                  <p className="text-xs text-gray-500">
                    {badge['description']}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Breakdown Tab Component
interface BreakdownTabProps {
  result: AssessmentResult;
}

function BreakdownTab({ result }: BreakdownTabProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      {/* Category Performance */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('results.breakdown.categories', 'Rendimiento por Categoría')}
        </h3>

        <div className="space-y-4">
          {result?.categoryScores?.map((categoryScore, index) => {
            const percentage = Math.round(
              (categoryScore.correctAnswers / categoryScore.totalQuestions) *
                100
            );
            return (
              <div key={index}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-gray-900">
                    {categoryScore.category.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500">
                    {categoryScore.correctAnswers}/
                    {categoryScore.totalQuestions} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${
                      percentage >= 80
                        ? 'bg-green-500'
                        : percentage >= 60
                          ? 'bg-blue-500'
                          : percentage >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Difficulty Performance */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('results.breakdown.difficulty', 'Rendimiento por Dificultad')}
        </h3>

        <div className="space-y-4">
          {result?.difficultyScores?.map((difficultyScore, index) => {
            const percentage = Math.round(
              (difficultyScore.correctAnswers /
                difficultyScore.totalQuestions) *
                100
            );
            return (
              <div key={index}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-gray-900">
                    {t(
                      `difficulty.${difficultyScore.difficulty}`,
                      difficultyScore.difficulty
                    )}
                  </span>
                  <span className="text-sm text-gray-500">
                    {difficultyScore.correctAnswers}/
                    {difficultyScore.totalQuestions} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${
                      percentage >= 80
                        ? 'bg-green-500'
                        : percentage >= 60
                          ? 'bg-blue-500'
                          : percentage >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Question Results */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('results.breakdown.questions', 'Resultados por Pregunta')}
        </h3>

        <div className="space-y-4">
          {result?.questionResults?.map((questionResult, index) => (
            <QuestionResultCard
              key={index}
              questionResult={questionResult}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Question Result Card Component
interface QuestionResultCardProps {
  questionResult: QuestionResult;
  index: number;
}

function QuestionResultCard({
  questionResult,
  index,
}: QuestionResultCardProps) {
  const { t } = useTranslations();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200">
      <div
        className="cursor-pointer p-4 hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                questionResult.isCorrect
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {questionResult.isCorrect ? '✓' : '✗'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t('results.question', 'Pregunta')} {index + 1}
              </p>
              <p className="text-xs text-gray-500">
                {questionResult.pointsEarned} /{' '}
                {questionResult.pointsEarned +
                  (questionResult.isCorrect ? 0 : 10)}{' '}
                {t('results.points', 'puntos')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                questionResult.difficulty === 'beginner'
                  ? 'bg-green-100 text-green-800'
                  : questionResult.difficulty === 'intermediate'
                    ? 'bg-yellow-100 text-yellow-800'
                    : questionResult.difficulty === 'advanced'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-red-100 text-red-800'
              }`}
            >
              {t(
                `difficulty.${questionResult.difficulty}`,
                questionResult.difficulty
              )}
            </span>
            <svg
              className={`h-5 w-5 transform text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <div className="pt-4">
            <p className="mb-3 text-sm text-gray-700">
              {questionResult.explanation}
            </p>

            {questionResult.userAnswer && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-gray-500">
                  {t('results.yourAnswer', 'Tu respuesta')}:
                </p>
                <p className="text-sm text-gray-900">
                  {typeof questionResult.userAnswer === 'string'
                    ? questionResult.userAnswer
                    : JSON.stringify(questionResult.userAnswer)}
                </p>
              </div>
            )}

            {questionResult.resources &&
              questionResult.resources.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    {t('results.resources', 'Recursos adicionales')}:
                  </p>
                  <div className="space-y-1">
                    {questionResult.resources.map((resource, idx) => (
                      <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-600 hover:text-blue-800"
                      >
                        📄 {resource.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

// Recommendations Tab Component
interface RecommendationsTabProps {
  result: AssessmentResult;
}

function RecommendationsTab({ result }: RecommendationsTabProps) {
  const { t } = useTranslations();

  const getRecommendationIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'study_material':
        return '📚';
      case 'practice_assessment':
        return '📝';
      case 'course':
        return '🎓';
      case 'mentorship':
        return '👨‍🏫';
      default:
        return '💡';
    }
  };

  const getPriorityColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {t('results.recommendations.title', 'Recomendaciones Personalizadas')}
        </h3>

        {result?.recommendations?.length > 0 ? (
          <div className="space-y-4">
            {result?.recommendations?.map((recommendation, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {getRecommendationIcon(recommendation['type'])}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {recommendation.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {t(
                          `recommendation['type'].${recommendation.type}`,
                          recommendation['type']
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${getPriorityColor(recommendation.priority)}`}
                  >
                    {t(
                      `priority.${recommendation.priority}`,
                      recommendation.priority
                    )}
                  </span>
                </div>

                <p className="mb-3 text-sm text-gray-700">
                  {recommendation['description']}
                </p>

                {recommendation.url && (
                  <a
                    href={recommendation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    {t('results.recommendations.access', 'Acceder al recurso')}
                    <svg
                      className="ml-1 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
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
            <h3 className="mb-2 text-sm font-medium text-gray-900">
              {t(
                'results.recommendations.none',
                'No hay recomendaciones específicas'
              )}
            </h3>
            <p className="text-sm text-gray-500">
              {t(
                'results.recommendations.noneMessage',
                '¡Excelente trabajo! Continúa practicando para mantener tu nivel.'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Skill Level Updates */}
      {result?.skillLevelUpdates?.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            {t(
              'results.recommendations.skillUpdates',
              'Actualizaciones de Nivel'
            )}
          </h3>

          <div className="space-y-3">
            {result?.skillLevelUpdates?.map((update, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-blue-50 p-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <svg
                      className="h-4 w-4 text-blue-600"
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
                  <div>
                    <p className="text-sm font-medium capitalize text-blue-900">
                      {update.skill.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-blue-700">
                      {t(
                        'results.recommendations.levelIncrease',
                        'Nivel aumentado'
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-blue-900">
                    {update.previousLevel}% → {update.newLevel}%
                  </p>
                  <p className="text-xs text-blue-700">
                    +{update.experience} XP
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
