import React, { useState, useEffect } from 'react';
import { useTranslations} from '../../hooks/useTranslations';
import type { 
  LearningPath, 
  Course, 
  CourseCategory, 
  CourseEnrollment,
  User 
 } from '@/types/learning';
import {
  getLearningPaths, 
  getCourses, 
  getUserEnrollments,
  enrollInCourse,
  getRecommendedPaths 
} from '../../lib/learning';

interface LearningPathsProps {
  currentUser: User;
}

const LearningPaths: React.FC<LearningPathsProps> = ({ currentUser }) => {
  const { t } = useTranslations();
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [recommendedPaths, setRecommendedPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'paths' | 'courses' | 'my-learning'>('paths');

  const categories: { value: CourseCategory | 'all'; label: string }[] = [
    { value: 'all', label: t('learning.allCategories') },
    { value: 'python', label: t('learning.python') },
    { value: 'sql', label: t('learning.sql') },
    { value: 'machine-learning', label: t('learning.machineLearning') },
    { value: 'data-visualization', label: t('learning.dataVisualization') },
    { value: 'statistics', label: t('learning.statistics') },
    { value: 'deep-learning', label: t('learning.deepLearning') },
    { value: 'data-engineering', label: t('learning.dataEngineering') },
    { value: 'business-intelligence', label: t('learning.businessIntelligence') },
    { value: 'r-programming', label: t('learning.rProgramming') },
    { value: 'big-data', label: t('learning.bigData') },
    { value: 'cloud-computing', label: t('learning.cloudComputing') },
    { value: 'data-science-fundamentals', label: t('learning.dataScienceFundamentals') }
  ];

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pathsData, coursesData, enrollmentsData, recommendedData] = await Promise.all([
        getLearningPaths(),
        getCourses(),
        getUserEnrollments(currentUser.id),
        getRecommendedPaths(currentUser.id)
      ]);

      setLearningPaths(pathsData);
      setCourses(coursesData);
      setEnrollments(enrollmentsData);
      setRecommendedPaths(recommendedData);
    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPaths = learningPaths.filter(path => {
    const matchesCategory = selectedCategory === 'all' || path.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || path.difficulty === selectedDifficulty;
    const matchesSearch = path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         path.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || course.difficulty === selectedDifficulty;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesDifficulty && matchesSearch && course.isPublished;
  });

  const myEnrolledCourses = enrollments.map(enrollment => 
    courses.find(course => course.id === enrollment.courseId)
  ).filter(Boolean) as Course[];

  const handleEnrollInCourse = async (courseId: string) => {
    try {
      await enrollInCourse(currentUser.id, courseId);
      await loadData(); // Reload to update enrollments
    } catch (error) {
      console.error('Error enrolling in course:', error);
    }
  };

  const isEnrolledInCourse = (courseId: string) => {
    return enrollments.some(enrollment => enrollment.courseId === courseId);
  };

  const getCourseProgress = (courseId: string) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    return enrollment?.progress.totalProgress || 0;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: CourseCategory) => {
    const icons: Record<CourseCategory, string> = {
      'python': '🐍',
      'sql': '💾',
      'machine-learning': '🤖',
      'data-visualization': '📊',
      'statistics': '📈',
      'deep-learning': '🧠',
      'data-engineering': '⚙️',
      'business-intelligence': '💼',
      'r-programming': '📊',
      'big-data': '🗄️',
      'cloud-computing': '☁️',
      'data-science-fundamentals': '🔬'
    };
    return icons[category] || '📚';
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return t('learning.minutesDuration', { minutes: Math.round(hours * 60) });
    if (hours < 24) return t('learning.hoursDuration', { hours: Math.round(hours) });
    const days = Math.ceil(hours / 24);
    return t('learning.daysDuration', { days });
  };

  const renderPathCard = (path: LearningPath) => (
    <div key={path.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img 
          src={path.thumbnail} 
          alt={path.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 left-4">
          <span className="text-2xl">{getCategoryIcon(path.category)}</span>
        </div>
        <div className="absolute top-4 right-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(path.difficulty)}`}>
            {t(`learning.${path.difficulty}`)}
          </span>
        </div>
        {path.isRecommended && (
          <div className="absolute bottom-4 left-4">
            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
              {t('learning.recommended')}
            </span>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{path.title}</h3>
        <p className="text-gray-600 mb-4 line-clamp-3">{path['description']}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>{t('learning.coursesCount', { count: path.courses.length })}</span>
          <span>{formatDuration(path.estimatedDuration)}</span>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('learning.youWillLearn')}</h4>
          <ul className="space-y-1">
            {path.learningOutcomes.slice(0, 3).map((outcome, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {outcome}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t('learning.enrolledCount', { count: path.enrollmentCount })}
          </div>
          <button
            onClick={() => {
              // Navigate to path detail
              window.location.href = `/learning/paths/${path.id}`;
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('learning.startPath')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCourseCard = (course: Course) => {
    const isEnrolled = isEnrolledInCourse(course.id);
    const progress = getCourseProgress(course.id);

    return (
      <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative">
          <img 
            src={course.thumbnail} 
            alt={course.title}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-4 left-4">
            <span className="text-2xl">{getCategoryIcon(course.category)}</span>
          </div>
          <div className="absolute top-4 right-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty)}`}>
              {t(`learning.${course.difficulty}`)}
            </span>
          </div>
          {course.isPremium && (
            <div className="absolute bottom-4 left-4">
              <span className="bg-yellow-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                {t('learning.premium')}
              </span>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
          <p className="text-gray-600 mb-4 line-clamp-3">{course.shortDescription}</p>
          
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
            <span>{t('learning.lessonsCount', { count: course.lessons.length })}</span>
            <span>{formatDuration(course.duration)}</span>
          </div>

          <div className="flex items-center mb-4">
            <img 
              src={course.instructor.avatar || '/default-avatar.png'} 
              alt={course.instructor['name']}
              className="w-8 h-8 rounded-full mr-3"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{course.instructor.name}</p>
              <p className="text-xs text-gray-500">{course.instructor.credentials.join(', ')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(course.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {course.averageRating.toFixed(1)} ({course.totalRatings})
                </span>
              </div>
            </div>
            
            {course.price > 0 ? (
              <span className="text-lg font-bold text-gray-900">
                ${course.price}
              </span>
            ) : (
              <span className="text-lg font-bold text-green-600">
                {t('learning.free')}
              </span>
            )}
          </div>

          {isEnrolled && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>{t('learning.progress')}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            {isEnrolled ? (
              <button
                onClick={() => window.location.href = `/learning/courses/${course.id}`}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                {progress > 0 ? t('learning.continue') : t('learning.start')}
              </button>
            ) : (
              <button
                onClick={() => handleEnrollInCourse(course.id)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {course.price > 0 ? t('learning.enroll') : t('learning.enrollFree')}
              </button>
            )}
            <button
              onClick={() => window.location.href = `/learning/courses/${course.id}/preview`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              {t('learning.preview')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if(loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t('learning.title')}
        </h1>
        <p className="text-lg text-gray-600">
          {t('learning.subtitle')}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'paths', label: t('learning.learningPaths') },
            { key: 'courses', label: t('learning.allCourses') },
            { key: 'my-learning', label: t('learning.myLearning') }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                view === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      {(view === 'paths' || view === 'courses') && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('learning.search')}
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('learning.searchPlaceholder')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('learning.category')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('learning.difficulty')}
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('learning.allDifficulties')}</option>
                <option value="beginner">{t('learning.beginner')}</option>
                <option value="intermediate">{t('learning.intermediate')}</option>
                <option value="advanced">{t('learning.advanced')}</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                {t('learning.clearFilters')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Paths */}
      {view === 'paths' && recommendedPaths.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t('learning.recommendedForYou')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedPaths.map(renderPathCard)}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {view === 'paths' && filteredPaths.map(renderPathCard)}
        {view === 'courses' && filteredCourses.map(renderCourseCard)}
        {view === 'my-learning' && myEnrolledCourses.map(renderCourseCard)}
      </div>

      {/* Empty State */}
      {((view === 'paths' && filteredPaths.length === 0) ||
        (view === 'courses' && filteredCourses.length === 0) ||
        (view === 'my-learning' && myEnrolledCourses.length === 0)) && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {view === 'my-learning' ? t('learning.noEnrollments') : t('learning.noResults')}
          </h3>
          <p className="text-gray-500">
            {view === 'my-learning' 
              ? t('learning.noEnrollmentsDescription')
              : t('learning.noResultsDescription')
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default LearningPaths;