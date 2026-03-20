import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import CourseProgress from './CourseProgress';

import type {
  Course,
  Lesson,
  CourseEnrollment,
  User,
  QuizAttempt,
} from '@/types/learning';
import {
  getCourse,
  getUserEnrollment,
  enrollInCourse,
  updateLessonProgress,
  submitQuizAttempt,
} from '../../lib/learning';

interface CourseDetailProps {
  courseId: string;
  currentUser: User;
}

const CourseDetail: React.FC<CourseDetailProps> = ({
  courseId,
  currentUser,
}) => {
  const { t } = useTranslations();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'curriculum' | 'reviews' | 'resources'
  >('overview');

  useEffect(() => {
    loadCourseData();
  }, [courseId, currentUser.id]);

  useEffect(() => {
    if (course && course.lessons.length > 0) {
      if (enrollment && enrollment.progress.currentLesson) {
        const currentLesson = course.lessons.find(
          (l) => l.id === enrollment.progress.currentLesson
        );
        setSelectedLesson(currentLesson || course.lessons?.[0]);
      } else {
        setSelectedLesson(course.lessons?.[0]);
      }
    }
  }, [course, enrollment]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const [courseData, enrollmentData] = await Promise.all([
        getCourse(courseId),
        getUserEnrollment(currentUser.id, courseId),
      ]);

      setCourse(courseData);
      setEnrollment(enrollmentData);
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;

    try {
      setEnrolling(true);
      const newEnrollment = await enrollInCourse(currentUser.id, courseId);
      setEnrollment(newEnrollment);
    } catch (error) {
      console.error('Error enrolling in course:', error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonComplete = async (lessonId: string) => {
    if (!enrollment || !selectedLesson) return;

    try {
      await updateLessonProgress(enrollment.id, lessonId, 100);
      await loadCourseData(); // Reload to update progress

      // Move to next lesson
      const currentIndex = course!.lessons.findIndex((l) => l.id === lessonId);
      if (currentIndex < course!.lessons.length - 1) {
        setSelectedLesson(course!.lessons[currentIndex + 1]);
      }
    } catch (error) {
      console.error('Error updating lesson progress:', error);
    }
  };

  const handleQuizSubmit = async () => {
    if (!selectedLesson?.content.quiz || !enrollment) return;

    try {
      const quiz = selectedLesson.content.quiz;
      let correctAnswers = 0;

      quiz.questions.forEach((question) => {
        const userAnswer = quizAnswers[question.id];
        if (Array.isArray(question.correctAnswers)) {
          if (
            Array.isArray(userAnswer) &&
            userAnswer.length === question.correctAnswers.length &&
            userAnswer.every((answer) =>
              question.correctAnswers.includes(answer)
            )
          ) {
            correctAnswers++;
          }
        } else {
          if (userAnswer === question.correctAnswers?.[0]) {
            correctAnswers++;
          }
        }
      });

      const score = (correctAnswers / quiz.questions.length) * 100;

      const attempt: Omit<QuizAttempt, 'id'> = {
        quizId: quiz.id,
        score,
        totalQuestions: quiz.questions.length,
        correctAnswers,
        timeSpent: 0, // Would track actual time in real implementation
        answers: quizAnswers,
        completedAt: new Date(),
      };

      const submittedAttempt = await submitQuizAttempt(
        enrollment.id,
        selectedLesson.id,
        attempt
      );
      setQuizAttempt(submittedAttempt);

      if (score >= quiz.passingScore) {
        await handleLessonComplete(selectedLesson.id);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return enrollment?.progress.completedLessons.includes(lessonId) || false;
  };

  const isLessonAccessible = (lesson: Lesson) => {
    if (!enrollment) return false;

    // Check if prerequisites are met
    return lesson.prerequisites.every((prereqId) =>
      enrollment.progress.completedLessons.includes(prereqId)
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderQuizQuestion = (question: any, index: number) => {
    const userAnswer = quizAnswers[question.id];

    return (
      <div
        key={question.id}
        className="mb-6 rounded-lg border border-gray-200 p-4"
      >
        <h4 className="mb-3 font-medium text-gray-900">
          {index + 1}. {question.question}
        </h4>

        {question['type'] === 'multiple-choice' && (
          <div className="space-y-2">
            {question.options.map((option: string, optionIndex: number) => (
              <label key={optionIndex} className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={userAnswer === option}
                  onChange={(e) =>
                    setQuizAnswers((prev) => ({
                      ...prev,
                      [question.id]: e.target.value,
                    }))
                  }
                  className="mr-2"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

        {question['type'] === 'true-false' && (
          <div className="space-y-2">
            {['True', 'False'].map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={userAnswer === option}
                  onChange={(e) =>
                    setQuizAnswers((prev) => ({
                      ...prev,
                      [question.id]: e.target.value,
                    }))
                  }
                  className="mr-2"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

        {question['type'] === 'fill-blank' && (
          <input
            type="text"
            value={userAnswer || ''}
            onChange={(e) =>
              setQuizAnswers((prev) => ({
                ...prev,
                [question.id]: e.target.value,
              }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder={t('learning.yourAnswer')}
          />
        )}

        {quizAttempt && (
          <div className="mt-3 rounded bg-gray-50 p-3">
            <div className="mb-2 flex items-center">
              {question.correctAnswers.includes(userAnswer) ? (
                <svg
                  className="mr-2 h-5 w-5 text-green-500"
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
                  className="mr-2 h-5 w-5 text-red-500"
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
              <span className="font-medium">
                {question.correctAnswers.includes(userAnswer)
                  ? t('learning.correct')
                  : t('learning.incorrect')}
              </span>
            </div>
            <p className="text-sm text-gray-600">{question.explanation}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          {t('learning.courseNotFound')}
        </h2>
        <p className="text-gray-600">
          {t('learning.courseNotFoundDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Course Header */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-gray-900">
                  {course.title}
                </h1>
                <p className="mb-4 text-lg text-gray-600">
                  {course.shortDescription}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${getDifficultyColor(course.difficulty)}`}
                  >
                    {t(`learning.${course.difficulty}`)}
                  </span>
                  <span>
                    {t('learning.lessonsCount', {
                      count: course.lessons.length,
                    })}
                  </span>
                  <span>{course.duration}h</span>
                  <div className="flex items-center">
                    <svg
                      className="mr-1 h-4 w-4 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>
                      {course.averageRating.toFixed(1)} ({course.totalRatings})
                    </span>
                  </div>
                </div>
              </div>

              {course.isPremium && (
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                  {t('learning.premium')}
                </span>
              )}
            </div>

            {/* Instructor */}
            <div className="flex items-center border-t pt-4">
              <img
                src={course.instructor.avatar || '/default-avatar.png'}
                alt={course.instructor['name']}
                className="mr-4 h-12 w-12 rounded-full"
              />
              <div>
                <h3 className="font-medium text-gray-900">
                  {course.instructor.name}
                </h3>
                <p className="text-sm text-gray-600">{course.instructor.bio}</p>
                <p className="text-xs text-gray-500">
                  {course.instructor.credentials.join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6 rounded-lg bg-white shadow-md">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: 'overview', label: t('learning.overview') },
                  { key: 'curriculum', label: t('learning.curriculum') },
                  { key: 'reviews', label: t('learning.reviews') },
                  { key: 'resources', label: t('learning.resources') },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`border-b-2 px-1 py-4 text-sm font-medium ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-lg font-medium text-gray-900">
                      {t('learning.aboutCourse')}
                    </h3>
                    <p className="leading-relaxed text-gray-600">
                      {course['description']}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-medium text-gray-900">
                      {t('learning.learningObjectives')}
                    </h3>
                    <ul className="space-y-2">
                      {course.learningObjectives.map((objective, index) => (
                        <li key={index} className="flex items-start">
                          <svg
                            className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-gray-600">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {course.prerequisites.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-lg font-medium text-gray-900">
                        {t('learning.prerequisites')}
                      </h3>
                      <p className="text-gray-600">
                        {t('learning.prerequisitesDescription')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Curriculum Tab */}
              {activeTab === 'curriculum' && (
                <div className="space-y-4">
                  {course.lessons.map((lesson, index) => {
                    const isCompleted = isLessonCompleted(lesson.id);
                    const isAccessible = isLessonAccessible(lesson);
                    const isCurrent = selectedLesson?.id === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        className={`rounded-lg border p-4 ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        } ${!isAccessible ? 'opacity-50' : 'cursor-pointer hover:border-gray-300'}`}
                        onClick={() =>
                          isAccessible && setSelectedLesson(lesson)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="mr-4 flex items-center">
                              <span className="mr-2 text-sm text-gray-500">
                                {index + 1}.
                              </span>
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
                              ) : (
                                <svg
                                  className="h-5 w-5 text-gray-300"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {lesson.title}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {lesson['description']}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{lesson.duration} min</span>
                            <span className="capitalize">{lesson['type']}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  <p className="text-gray-600">
                    {t('learning.reviewsComingSoon')}
                  </p>
                </div>
              )}

              {/* Resources Tab */}
              {activeTab === 'resources' && (
                <div>
                  <p className="text-gray-600">
                    {t('learning.resourcesComingSoon')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lesson Content */}
          {enrollment && selectedLesson && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedLesson.title}
                </h2>
                <button
                  onClick={() => handleLessonComplete(selectedLesson.id)}
                  disabled={isLessonCompleted(selectedLesson.id)}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    isLessonCompleted(selectedLesson.id)
                      ? 'cursor-not-allowed bg-green-100 text-green-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isLessonCompleted(selectedLesson.id)
                    ? t('learning.completed')
                    : t('learning.markComplete')}
                </button>
              </div>

              {/* Video Content */}
              {selectedLesson.content.video && (
                <div className="mb-6">
                  <video
                    src={selectedLesson.content.video.url}
                    controls
                    className="h-64 w-full rounded-lg"
                    onTimeUpdate={(e) =>
                      setVideoCurrentTime(e.currentTarget.currentTime)
                    }
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                  >
                    {selectedLesson.content.video.subtitles.map((subtitle) => (
                      <track
                        key={subtitle.language}
                        kind="subtitles"
                        src={subtitle.url}
                        srcLang={subtitle.language}
                        label={subtitle.language}
                      />
                    ))}
                  </video>
                </div>
              )}

              {/* Text Content */}
              {selectedLesson.content.text && (
                <div className="prose mb-6 max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedLesson.content.text.content,
                    }}
                  />
                </div>
              )}

              {/* Quiz Content */}
              {selectedLesson.content.quiz && (
                <div className="mb-6">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">
                    {t('learning.quiz')}
                  </h3>

                  {!quizAttempt ? (
                    <>
                      <div className="mb-6 space-y-6">
                        {selectedLesson.content.quiz.questions.map(
                          (question, index) =>
                            renderQuizQuestion(question, index)
                        )}
                      </div>

                      <button
                        onClick={handleQuizSubmit}
                        disabled={
                          Object.keys(quizAnswers).length <
                          selectedLesson.content.quiz.questions.length
                        }
                        className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t('learning.submitQuiz')}
                      </button>
                    </>
                  ) : (
                    <div className="mb-6 rounded-lg bg-gray-50 p-4">
                      <h4 className="mb-2 font-medium text-gray-900">
                        {t('learning.quizResults')}
                      </h4>
                      <p className="text-gray-600">
                        {t('learning.scoreDisplay', {
                          score: Math.round(quizAttempt.score),
                          total: quizAttempt.totalQuestions,
                          correct: quizAttempt.correctAnswers,
                        })}
                      </p>
                      {quizAttempt.score >=
                      selectedLesson.content.quiz.passingScore ? (
                        <p className="mt-2 font-medium text-green-600">
                          {t('learning.quizPassed')}
                        </p>
                      ) : (
                        <p className="mt-2 font-medium text-red-600">
                          {t('learning.quizFailed')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enrollment Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            {enrollment ? (
              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-900">
                  {t('learning.yourProgress')}
                </h3>
                <CourseProgress enrollment={enrollment} course={course} />
              </div>
            ) : (
              <div>
                <div className="mb-4 text-center">
                  {course.price > 0 ? (
                    <div className="mb-2 text-3xl font-bold text-gray-900">
                      ${course.price}
                    </div>
                  ) : (
                    <div className="mb-2 text-2xl font-bold text-green-600">
                      {t('learning.free')}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enrolling ? (
                    <div className="flex items-center justify-center">
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                      {t('learning.enrolling')}
                    </div>
                  ) : course.price > 0 ? (
                    t('learning.enrollNow')
                  ) : (
                    t('learning.enrollFree')
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-gray-500">
                  {t('learning.enrollmentTerms')}
                </p>
              </div>
            )}
          </div>

          {/* Course Info */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              {t('learning.courseIncludes')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <svg
                  className="mr-3 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                <span className="text-gray-600">
                  {t('learning.videoLessons', {
                    count: course.lessons.filter((l) => l.type === 'video')
                      .length,
                  })}
                </span>
              </li>
              <li className="flex items-center">
                <svg
                  className="mr-3 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-600">
                  {t('learning.quizzes', {
                    count: course.lessons.filter((l) => l.type === 'quiz')
                      .length,
                  })}
                </span>
              </li>
              <li className="flex items-center">
                <svg
                  className="mr-3 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-600">
                  {t('learning.downloadableResources')}
                </span>
              </li>
              {course.certificate.enabled && (
                <li className="flex items-center">
                  <svg
                    className="mr-3 h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2L3 7v3c0 5.55 3.84 9.74 9 9.74s9-4.19 9-9.74V7l-7-5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-600">
                    {t('learning.certificateOfCompletion')}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Course Stats */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              {t('learning.courseStats')}
            </h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">
                  {t('learning.totalEnrollments')}
                </dt>
                <dd className="font-medium text-gray-900">
                  {course.totalEnrollments.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">{t('learning.averageRating')}</dt>
                <dd className="font-medium text-gray-900">
                  {course.averageRating.toFixed(1)} / 5
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">{t('learning.totalReviews')}</dt>
                <dd className="font-medium text-gray-900">
                  {course.totalRatings}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
