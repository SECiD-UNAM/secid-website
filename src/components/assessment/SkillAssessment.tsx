import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import {
  /**
   * Skill Assessment - Individual skill assessment interface
   */

  getAssessments,
  getUserProgress,
  getUserCertificates,
} from '../../lib/assessment';
import type {
  Assessment,
  AssessmentProgress,
  Certificate,
  SkillCategory,
  DifficultyLevel,
} from '../../types/assessment';

interface SkillAssessmentProps {
  skillCategory: SkillCategory;
  userId: string;
  onStartAssessment: (assessmentId: string) => void;
  onViewCertificate: (certificateId: string) => void;
}

export default function SkillAssessment({
  skillCategory,
  userId,
  onStartAssessment,
  onViewCertificate,
}: SkillAssessmentProps) {
  const { t } = useTranslations();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    DifficultyLevel | 'all'
  >('all');

  useEffect(() => {
    loadSkillData();
  }, [skillCategory, userId]);

  const loadSkillData = async () => {
    try {
      setLoading(true);

      const [assessmentsData, progressData, certificatesData] =
        await Promise.all([
          getAssessments({
            categories: [skillCategory],
            difficulties: [],
            modes: [],
            duration: [0, 180],
            minRating: 0,
            hasPrerequisites: false,
            showCompleted: true,
          }),
          getUserProgress(userId),
          getUserCertificates(userId),
        ]);

      setAssessments(assessmentsData);
      setProgress(progressData);
      setCertificates(
        certificatesData.filter((cert) => cert.skills.includes(skillCategory))
      );
    } catch (error) {
      console.error('Error loading skill assessment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssessments = assessments.filter(
    (assessment) =>
      selectedDifficulty === 'all' ||
      assessment.difficulty === selectedDifficulty
  );

  const skillLevel = progress?.skillLevels[skillCategory] || 0;
  const isVerified = progress?.verifiedSkills.includes(skillCategory) || false;
  const skillCertificates = certificates.filter((cert) =>
    cert.skills.includes(skillCategory)
  );

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

  const getDifficultyRecommendation = (skillLevel: number): DifficultyLevel => {
    if (skillLevel >= 80) return 'expert';
    if (skillLevel >= 60) return 'advanced';
    if (skillLevel >= 40) return 'intermediate';
    return 'beginner';
  };

  const getSkillIcon = (skill: SkillCategory) => {
    const icons: Record<SkillCategory, string> = {
      python: '🐍',
      sql: '🗃️',
      machine_learning: '🤖',
      statistics: '📊',
      data_visualization: '📈',
      big_data: '💾',
      deep_learning: '🧠',
      data_engineering: '⚙️',
      business_intelligence: '💼',
      excel: '📋',
      r: '📊',
      tableau: '📊',
      power_bi: '📊',
      spark: '⚡',
      aws: '☁️',
      azure: '☁️',
      gcp: '☁️',
      docker: '🐳',
      git: '🔄',
      linux: '🐧',
      apis: '🔌',
      etl: '🔄',
      databases: '🗄️',
      mongodb: '🍃',
      hadoop: '🐘',
    };
    return icons[skill] || '🔧';
  };

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
        <div className="mb-4 flex items-center space-x-3">
          <span className="text-4xl">{getSkillIcon(skillCategory)}</span>
          <div>
            <h1 className="text-3xl font-bold capitalize text-gray-900">
              {skillCategory.replace('_', ' ')}{' '}
              {t('assessment.skill.assessments', 'Evaluaciones')}
            </h1>
            <p className="text-lg text-gray-600">
              {t(
                'assessment.skill.subtitle',
                'Evalúa y certifica tu nivel en esta habilidad'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Skill Overview */}
        <div className="space-y-6 lg:col-span-1">
          {/* Current Level */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              {t('assessment.skill.currentLevel', 'Nivel Actual')}
            </h2>

            <div className="text-center">
              <div className="mb-4">
                <div
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getSkillLevelColor(skillLevel)}`}
                >
                  {getSkillLevelLabel(skillLevel)}
                </div>
              </div>

              <div className="relative mx-auto mb-4 h-32 w-32">
                <svg
                  className="h-32 w-32 -rotate-90 transform"
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
                    strokeDasharray={`${skillLevel * 2.51} 251`}
                    className="text-blue-600"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(skillLevel)}%
                  </span>
                </div>
              </div>

              {isVerified && (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    {t('assessment.skill.verified', 'Verificado')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Next Steps */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              {t('assessment.skill.recommendations', 'Recomendaciones')}
            </h2>

            <div className="space-y-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="mb-1 text-sm font-medium text-blue-900">
                  {t('assessment.skill.suggestedLevel', 'Nivel Sugerido')}
                </p>
                <p className="text-sm capitalize text-blue-800">
                  {getDifficultyRecommendation(skillLevel)}
                </p>
              </div>

              {skillLevel < 80 && (
                <div className="rounded-lg bg-yellow-50 p-3">
                  <p className="mb-1 text-sm font-medium text-yellow-900">
                    {t('assessment.skill.improvement', 'Para Mejorar')}
                  </p>
                  <p className="text-sm text-yellow-800">
                    {skillLevel < 40
                      ? t(
                          'assessment.skill.focusBasics',
                          'Enfócate en conceptos básicos'
                        )
                      : skillLevel < 60
                        ? t(
                            'assessment.skill.practiceIntermediate',
                            'Practica ejercicios intermedios'
                          )
                        : t(
                            'assessment.skill.advancedChallenges',
                            'Intenta desafíos avanzados'
                          )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Certificates */}
          {skillCertificates.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                {t('assessment.skill.certificates', 'Certificados')}
              </h2>

              <div className="space-y-3">
                {skillCertificates.map((certificate) => (
                  <div
                    key={certificate.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                    onClick={() => onViewCertificate(certificate.id)}
                  >
                    <div className="flex items-center space-x-3">
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
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {certificate.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {certificate.issuedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-blue-600">
                      {certificate.score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assessments List */}
        <div className="space-y-6 lg:col-span-2">
          {/* Filters */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                {t(
                  'assessment.skill.availableAssessments',
                  'Evaluaciones Disponibles'
                )}
              </h2>

              <select
                value={selectedDifficulty}
                onChange={(e) =>
                  setSelectedDifficulty(
                    e.target.value as DifficultyLevel | 'all'
                  )
                }
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="all">
                  {t('assessment.skill.allLevels', 'Todos los niveles')}
                </option>
                <option value="beginner">
                  {t('difficulty.beginner', 'Principiante')}
                </option>
                <option value="intermediate">
                  {t('difficulty.intermediate', 'Intermedio')}
                </option>
                <option value="advanced">
                  {t('difficulty.advanced', 'Avanzado')}
                </option>
                <option value="expert">
                  {t('difficulty.expert', 'Experto')}
                </option>
              </select>
            </div>

            {filteredAssessments.length === 0 && (
              <div className="py-8 text-center">
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
                    'assessment.skill.noAssessments',
                    'No hay evaluaciones disponibles'
                  )}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t(
                    'assessment.skill.noAssessmentsMessage',
                    'Intenta cambiar el filtro de dificultad.'
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Assessment Cards */}
          <div className="space-y-4">
            {filteredAssessments.map((assessment) => (
              <SkillAssessmentCard
                key={assessment.id}
                assessment={assessment}
                currentSkillLevel={skillLevel}
                onStart={() => onStartAssessment(assessment.id)}
                isRecommended={
                  assessment.difficulty ===
                  getDifficultyRecommendation(skillLevel)
                }
              />
            ))}
          </div>

          {/* Learning Path */}
          {filteredAssessments.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                {t(
                  'assessment.skill.learningPath',
                  'Ruta de Aprendizaje Sugerida'
                )}
              </h2>

              <LearningPath
                assessments={assessments}
                currentSkillLevel={skillLevel}
                onStartAssessment={onStartAssessment}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Skill Assessment Card Component
interface SkillAssessmentCardProps {
  assessment: Assessment;
  currentSkillLevel: number;
  onStart: () => void;
  isRecommended: boolean;
}

function SkillAssessmentCard({
  assessment,
  currentSkillLevel,
  onStart,
  isRecommended,
}: SkillAssessmentCardProps) {
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

  const getModeColor = (mode: string) => {
    return mode === 'certification'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800';
  };

  const getAccessibilityStatus = () => {
    const difficultyLevels: Record<DifficultyLevel, number> = {
      beginner: 0,
      intermediate: 40,
      advanced: 60,
      expert: 80,
    };

    const requiredLevel = difficultyLevels[assessment.difficulty];

    if (currentSkillLevel >= requiredLevel) {
      return { accessible: true, message: '' };
    } else {
      return {
        accessible: false,
        message: t(
          'assessment.skill.levelRequired',
          `Nivel ${requiredLevel}% requerido`
        ),
      };
    }
  };

  const { accessible, message } = getAccessibilityStatus();

  return (
    <div
      className={`rounded-lg bg-white shadow transition-shadow duration-200 hover:shadow-md ${
        isRecommended ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="p-6">
        {isRecommended && (
          <div className="mb-4 flex items-center space-x-2 text-blue-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">
              {t('assessment.skill.recommended', 'Recomendado para ti')}
            </span>
          </div>
        )}

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

        <div className="mb-4 grid grid-cols-2 gap-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 2a1 1 0 100 2h2a1 1 0 100-2h-2z"
                clipRule="evenodd"
              />
            </svg>
            <span>{assessment.totalQuestions} preguntas</span>
          </div>

          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                clipRule="evenodd"
              />
            </svg>
            <span>Puntaje mín: {assessment.passingScore}%</span>
          </div>

          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{Math.round(assessment.averageScore)}% promedio</span>
          </div>

          <div className="flex items-center space-x-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
            <span>{assessment.totalAttempts} intentos</span>
          </div>
        </div>

        {!accessible && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-center space-x-2">
              <svg
                className="h-4 w-4 text-yellow-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-yellow-800">{message}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {assessment.isAdaptive && (
              <span className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800">
                {t('assessment.adaptive', 'Adaptativo')}
              </span>
            )}
            {assessment.mode === 'certification' && (
              <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                {t('assessment.certification', 'Certificación')}
              </span>
            )}
          </div>

          <button
            onClick={onStart}
            disabled={!accessible}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              accessible
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            }`}
          >
            {t('assessment.start', 'Comenzar')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Learning Path Component
interface LearningPathProps {
  assessments: Assessment[];
  currentSkillLevel: number;
  onStartAssessment: (assessmentId: string) => void;
}

function LearningPath({
  assessments,
  currentSkillLevel,
  onStartAssessment,
}: LearningPathProps) {
  const { t } = useTranslations();

  const pathAssessments = assessments.sort((a, b) => {
    const difficultyOrder: Record<DifficultyLevel, number> = {
      beginner: 0,
      intermediate: 1,
      advanced: 2,
      expert: 3,
    };
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });

  const getCurrentStep = () => {
    if (currentSkillLevel >= 80) return 3;
    if (currentSkillLevel >= 60) return 2;
    if (currentSkillLevel >= 40) return 1;
    return 0;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="space-y-4">
      {pathAssessments.map((assessment, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLocked = index > currentStep;

        return (
          <div key={assessment.id} className="flex items-center space-x-4">
            {/* Step Indicator */}
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}
            >
              {isCompleted ? '✓' : index + 1}
            </div>

            {/* Assessment Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isLocked ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {assessment.title}
                  </p>
                  <p
                    className={`text-xs ${
                      isLocked ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {t(
                      `difficulty.${assessment.difficulty}`,
                      assessment.difficulty
                    )}{' '}
                    • {assessment.timeLimit}min
                  </p>
                </div>

                {isCurrent && (
                  <button
                    onClick={() => onStartAssessment(assessment.id)}
                    className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                  >
                    {t('assessment.start', 'Comenzar')}
                  </button>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < pathAssessments.length - 1 && (
              <div
                className={`absolute left-4 mt-8 h-4 w-0.5 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`}
                style={{ marginLeft: '15px', marginTop: '32px' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
