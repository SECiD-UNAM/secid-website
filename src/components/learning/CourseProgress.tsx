import React from 'react';
import { useTranslations } from '../../hooks/useTranslations';

import type { Course, CourseEnrollment, LessonProgress } from '../../types';

interface CourseProgressProps {
  enrollment: CourseEnrollment;
  course: Course;
  detailed?: boolean;
}

const CourseProgress: React.FC<CourseProgressProps> = ({
  enrollment,
  course,
  detailed = false,
}) => {
  const { t } = useTranslations();

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return t('learning.minutesSpent', { minutes: Math.round(minutes) });
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    if (remainingMinutes === 0) {
      return t('learning.hoursSpent', { hours });
    }
    return t('learning.hoursMinutesSpent', {
      hours,
      minutes: remainingMinutes,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-600 bg-purple-100';
    if (streak >= 14) return 'text-blue-600 bg-blue-100';
    if (streak >= 7) return 'text-green-600 bg-green-100';
    if (streak >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getCompletionBadge = (progress: number) => {
    if (progress === 100)
      return {
        color: 'text-green-600 bg-green-100',
        text: t('learning.completed'),
      };
    if (progress >= 75)
      return {
        color: 'text-blue-600 bg-blue-100',
        text: t('learning.almostDone'),
      };
    if (progress >= 50)
      return {
        color: 'text-yellow-600 bg-yellow-100',
        text: t('learning.halfWay'),
      };
    if (progress >= 25)
      return {
        color: 'text-orange-600 bg-orange-100',
        text: t('learning.quarterWay'),
      };
    return {
      color: 'text-gray-600 bg-gray-100',
      text: t('learning.justStarted'),
    };
  };

  const completionBadge = getCompletionBadge(enrollment.progress.totalProgress);

  return (
    <div className={`${detailed ? 'space-y-6' : 'space-y-4'}`}>
      {/* Overall Progress */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {t('learning.overallProgress')}
          </span>
          <span className="text-sm font-medium text-gray-900">
            {Math.round(enrollment.progress.totalProgress)}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${enrollment.progress.totalProgress}%` }}
          ></div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${completionBadge.color}`}
          >
            {completionBadge.text}
          </span>
          <span className="text-xs text-gray-500">
            {enrollment.progress.completedLessons.length} /{' '}
            {course.lessons.length} {t('learning.lessonsCompleted')}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {enrollment.progress.streak}
          </div>
          <div
            className={`rounded-full px-2 py-1 text-xs ${getStreakColor(enrollment.progress.streak)}`}
          >
            {t('learning.dayStreak')}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(enrollment.progress.timeSpent / 60)}h
          </div>
          <div className="text-xs text-gray-500">{t('learning.timeSpent')}</div>
        </div>
      </div>

      {/* Enrollment Info */}
      <div className="space-y-1 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>{t('learning.enrolledOn')}</span>
          <span>{formatDate(enrollment.enrolledAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('learning.lastAccessed')}</span>
          <span>{formatDate(enrollment.lastAccessedAt)}</span>
        </div>
        {enrollment.completedAt && (
          <div className="flex justify-between">
            <span>{t('learning.completedOn')}</span>
            <span>{formatDate(enrollment.completedAt)}</span>
          </div>
        )}
      </div>

      {/* Detailed Progress */}
      {detailed && (
        <>
          {/* Lesson Progress */}
          <div>
            <h4 className="mb-4 text-lg font-medium text-gray-900">
              {t('learning.lessonProgress')}
            </h4>
            <div className="space-y-3">
              {course.lessons.map((lesson) => {
                const lessonProgress =
                  enrollment.progress.lessonProgress[lesson.id];
                const isCompleted =
                  enrollment.progress.completedLessons.includes(lesson.id);

                return (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div className="flex flex-1 items-center">
                      <div className="mr-3">
                        {isCompleted ? (
                          <svg
                            className="h-5 w-5 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : lessonProgress ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-100">
                            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="truncate text-sm font-medium text-gray-900">
                          {lesson.title}
                        </h5>
                        <p className="text-xs text-gray-500">
                          {lesson.duration} min · {t(`learning.${lesson.type}`)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      {lessonProgress && (
                        <span className="text-xs text-gray-500">
                          {formatDuration(lessonProgress.timeSpent)}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          isCompleted
                            ? 'bg-green-100 text-green-800'
                            : lessonProgress
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {isCompleted
                          ? t('learning.completed')
                          : lessonProgress
                            ? t('learning.inProgress')
                            : t('learning.notStarted')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quiz Scores */}
          {Object.keys(enrollment.progress.quizScores).length > 0 && (
            <div>
              <h4 className="mb-4 text-lg font-medium text-gray-900">
                {t('learning.quizScores')}
              </h4>
              <div className="space-y-3">
                {Object.entries(enrollment.progress.quizScores).map(
                  ([lessonId, attempts]) => {
                    const lesson = course.lessons.find(
                      (l) => l.id === lessonId
                    );
                    const bestAttempt = attempts.reduce((best, attempt) =>
                      attempt.score > best.score ? attempt : best
                    );

                    return (
                      <div
                        key={lessonId}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">
                            {lesson?.title || t('learning.unknownLesson')}
                          </h5>
                          <p className="text-xs text-gray-500">
                            {attempts.length} {t('learning.attempts')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-medium ${
                              bestAttempt.score >= 80
                                ? 'text-green-600'
                                : bestAttempt.score >= 60
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {Math.round(bestAttempt.score)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {bestAttempt.correctAnswers}/
                            {bestAttempt.totalQuestions} {t('learning.correct')}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Learning Analytics */}
          <div>
            <h4 className="mb-4 text-lg font-medium text-gray-900">
              {t('learning.learningAnalytics')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {t('learning.averageSessionTime')}
                  </span>
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    enrollment.progress.timeSpent /
                      Math.max(1, enrollment.progress.completedLessons.length)
                  )}{' '}
                  min
                </div>
                <div className="text-xs text-gray-500">
                  {t('learning.perLesson')}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {t('learning.completionRate')}
                  </span>
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    (enrollment.progress.completedLessons.length /
                      course.lessons.length) *
                      100
                  )}
                  %
                </div>
                <div className="text-xs text-gray-500">
                  {enrollment.progress.completedLessons.length}/
                  {course.lessons.length} {t('learning.lessons')}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {t('learning.currentStreak')}
                  </span>
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                    />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {enrollment.progress.streak}
                </div>
                <div className="text-xs text-gray-500">
                  {t('learning.consecutiveDays')}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {t('learning.estimatedCompletion')}
                  </span>
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                {enrollment.progress.totalProgress > 0 ? (
                  <>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.ceil(
                        (course.duration * 60 - enrollment.progress.timeSpent) /
                          Math.max(
                            1,
                            enrollment.progress.timeSpent /
                              Math.max(
                                1,
                                enrollment.progress.totalProgress / 100
                              )
                          )
                      )}{' '}
                      min
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('learning.remaining')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-gray-900">
                      {course.duration}h
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('learning.estimated')}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Achievements */}
          {enrollment.progress.totalProgress > 0 && (
            <div>
              <h4 className="mb-4 text-lg font-medium text-gray-900">
                {t('learning.achievements')}
              </h4>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {/* First Lesson Achievement */}
                {enrollment.progress.completedLessons.length > 0 && (
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <div className="mb-1 text-2xl">🎯</div>
                    <div className="text-xs font-medium text-green-800">
                      {t('learning.firstLesson')}
                    </div>
                  </div>
                )}

                {/* Streak Achievements */}
                {enrollment.progress.streak >= 3 && (
                  <div className="rounded-lg bg-yellow-50 p-3 text-center">
                    <div className="mb-1 text-2xl">🔥</div>
                    <div className="text-xs font-medium text-yellow-800">
                      {enrollment.progress.streak >= 30
                        ? t('learning.streakMaster')
                        : enrollment.progress.streak >= 14
                          ? t('learning.streakChampion')
                          : enrollment.progress.streak >= 7
                            ? t('learning.weekStreak')
                            : t('learning.streakStarter')}
                    </div>
                  </div>
                )}

                {/* Progress Achievements */}
                {enrollment.progress.totalProgress >= 25 && (
                  <div className="rounded-lg bg-blue-50 p-3 text-center">
                    <div className="mb-1 text-2xl">
                      {enrollment.progress.totalProgress >= 100
                        ? '🏆'
                        : enrollment.progress.totalProgress >= 75
                          ? '🥉'
                          : enrollment.progress.totalProgress >= 50
                            ? '🥈'
                            : '🥉'}
                    </div>
                    <div className="text-xs font-medium text-blue-800">
                      {enrollment.progress.totalProgress >= 100
                        ? t('learning.courseCompleted')
                        : enrollment.progress.totalProgress >= 75
                          ? t('learning.almostThere')
                          : enrollment.progress.totalProgress >= 50
                            ? t('learning.halfwayHero')
                            : t('learning.goodStart')}
                    </div>
                  </div>
                )}

                {/* Time Spent Achievement */}
                {enrollment.progress.timeSpent >= 60 && (
                  <div className="rounded-lg bg-purple-50 p-3 text-center">
                    <div className="mb-1 text-2xl">⏰</div>
                    <div className="text-xs font-medium text-purple-800">
                      {enrollment.progress.timeSpent >= 600
                        ? t('learning.timeChampion')
                        : enrollment.progress.timeSpent >= 300
                          ? t('learning.dedicatedLearner')
                          : t('learning.timeInvestor')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CourseProgress;
