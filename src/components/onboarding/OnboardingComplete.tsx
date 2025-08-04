import React, { useState, useEffect } from 'react';
import { 
import { motion, AnimatePresence} from 'framer-motion';
import confetti from 'canvas-confetti';
import { useTranslations} from '../../hooks/useTranslations';
import { getOnboardingAchievements, calculateProfileCompleteness} from '../../lib/onboarding';

  CheckCircleIcon,
  SparklesIcon,
  TrophyIcon,
  GiftIcon,
  RocketLaunchIcon,
  PlayIcon,
  BookOpenIcon,
  UsersIcon,
  BriefcaseIcon,
  CalendarIcon,
  BellIcon,
  EyeIcon,
  EnvelopeIcon,
  StarIcon,
  FireIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  AcademicCapIcon,
  HeartIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import type { OnboardingStepProps, QuickStartStep } from '../../types/onboarding';
import type { OnboardingAchievement } from '../../types/onboarding';

// Generate personalized recommendations based on onboarding data
const generatePersonalizedRecommendations = (data: any) => {
  const recommendations = [];
  
  // Job recommendations
  if (data['goalsDefinition'].careerGoals.targetCompanies.length > 0) {
    recommendations.push({
      type: 'job',
      title: 'Recommended Jobs',
      description: `We found ${12} open positions at your target companies`,
      action: 'View Jobs',
      url: '/jobs',
      icon: <BriefcaseIcon className="h-6 w-6" />,
      priority: 'high'
    });
  }
  
  // Learning recommendations
  if (data['goalsDefinition'].learningGoals.skillsToLearn.length > 0) {
    recommendations.push({
      type: 'learning',
      title: 'Learning Resources',
      description: `Curated courses for ${data['goalsDefinition'].learningGoals.skillsToLearn.slice(0, 2).join(' and ')}`,
      action: 'Explore Courses',
      url: '/resources',
      icon: <AcademicCapIcon className="h-6 w-6" />,
      priority: 'medium'
    });
  }
  
  // Networking recommendations
  if (data['connectionSuggestions'].selectedConnections.length > 3) {
    recommendations.push({
      type: 'networking',
      title: 'Networking Events',
      description: 'Upcoming events with your connections',
      action: 'View Events',
      url: '/events',
      icon: <CalendarIcon className="h-6 w-6" />,
      priority: 'medium'
    });
  }
  
  // Industry insights
  if (data['interestsSelection'].industries.length > 0) {
    recommendations.push({
      type: 'insights',
      title: 'Industry Insights',
      description: `Latest trends in ${data['interestsSelection'].industries?.[0]}`,
      action: 'Read Articles',
      url: '/blog',
      icon: <ChartBarIcon className="h-6 w-6" />,
      priority: 'low'
    });
  }
  
  return recommendations;
};

const OnboardingComplete: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  progress,
  className = ''
}) => {
  const t = useTranslations();

  // Form state
  const [tourPreferences, setTourPreferences] = useState({
    takePlatformTour: data['completion'].tourPreferences.takePlatformTour ?? true,
    focusAreas: data['completion'].tourPreferences.focusAreas || []
  });

  const [notificationPreferences, setNotificationPreferences] = useState({
    email: data?.completion?.notificationPreferences['email'] ?? true,
    push: data['completion'].notificationPreferences.push ?? false,
    frequency: data['completion'].notificationPreferences.frequency || 'weekly',
    types: data['completion'].notificationPreferences.types || []
  });

  const [quickStartActions, setQuickStartActions] = useState<string[]>(
    data['completion'].quickStartActions || []
  );

  const [currentView, setCurrentView] = useState<'celebration' | 'achievements' | 'recommendations' | 'tour' | 'notifications' | 'quickstart'>('celebration');
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(false);
  const [achievements, setAchievements] = useState<OnboardingAchievement[]>([]);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<OnboardingAchievement | null>(null);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<any[]>([]);

  // Load achievements and recommendations
  useEffect(() => {
    const loadedAchievements = getOnboardingAchievements(data);
    const completeness = calculateProfileCompleteness(data);
    
    setAchievements(loadedAchievements);
    setProfileCompleteness(completeness);
    
    // Generate personalized recommendations
    const recommendations = generatePersonalizedRecommendations(data);
    setPersonalizedRecommendations(recommendations);
    
    // Show achievement modal if there are achievements
    if (loadedAchievements.length > 0) {
      setTimeout(() => {
        setCurrentAchievement(loadedAchievements?.[0]);
        setShowAchievementModal(true);
        setAchievementsUnlocked(true);
      }, 2000);
    }
  }, [data]);

  // Celebration effect
  useEffect(() => {
    // Trigger confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      }));
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      }));
    }, 250);

    // Mark achievements as unlocked after a delay
    setTimeout(() => {
      setAchievementsUnlocked(true);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Focus areas options
  const focusAreasOptions = [
    {
      id: 'jobs',
      title: t.onboarding.complete.tour.focusAreas.jobs.title,
      description: t.onboarding.complete.tour.focusAreas.jobs['description'],
      icon: <BriefcaseIcon className="h-8 w-8" />
    },
    {
      id: 'networking',
      title: t.onboarding.complete.tour.focusAreas.networking.title,
      description: t.onboarding.complete.tour.focusAreas.networking['description'],
      icon: <UsersIcon className="h-8 w-8" />
    },
    {
      id: 'learning',
      title: t.onboarding.complete.tour.focusAreas.learning.title,
      description: t.onboarding.complete.tour.focusAreas.learning['description'],
      icon: <BookOpenIcon className="h-8 w-8" />
    },
    {
      id: 'events',
      title: t.onboarding.complete.tour.focusAreas.events.title,
      description: t.onboarding.complete.tour.focusAreas.events['description'],
      icon: <CalendarIcon className="h-8 w-8" />
    }
  ];

  // Notification types
  const notificationTypes = [
    {
      id: 'connections',
      title: t.onboarding.complete.notifications.types.connections,
      icon: <UsersIcon className="h-5 w-5" />
    },
    {
      id: 'jobs',
      title: t.onboarding.complete.notifications.types.jobs,
      icon: <BriefcaseIcon className="h-5 w-5" />
    },
    {
      id: 'events',
      title: t.onboarding.complete.notifications.types.events,
      icon: <CalendarIcon className="h-5 w-5" />
    },
    {
      id: 'content',
      title: t.onboarding.complete.notifications.types.content,
      icon: <BookOpenIcon className="h-5 w-5" />
    }
  ];

  // Generate personalized quick start guide
  const generateQuickStartGuide = (): QuickStartStep[] => {
    const steps: QuickStartStep[] = [];

    // Profile completion steps
    if (!data['profileSetup'].basicInfo.profilePhoto) {
      steps.push({
        id: 'upload_photo',
        title: t.onboarding.complete.quickStart.steps.uploadPhoto.title,
        description: t.onboarding.complete.quickStart.steps.uploadPhoto.description,
        actionUrl: '/dashboard/profile/edit',
        estimatedTime: 5,
        importance: 'recommended',
        category: 'profile',
        completed: false
      });
    }

    if (data['interestsSelection'].primarySkills.length < 5) {
      steps.push({
        id: 'add_skills',
        title: t.onboarding.complete.quickStart.steps.addSkills.title,
        description: t.onboarding.complete.quickStart.steps.addSkills.description,
        actionUrl: '/dashboard/profile/edit',
        estimatedTime: 3,
        importance: 'recommended',
        category: 'profile',
        completed: false
      });
    }

    // Networking steps
    if (data['connectionSuggestions'].selectedConnections.length > 0) {
      steps.push({
        id: 'connect_members',
        title: t.onboarding.complete.quickStart.steps.connectMembers.title,
        description: t.onboarding.complete.quickStart.steps.connectMembers.description.replace('{count}', data['connectionSuggestions'].selectedConnections.length.toString()),
        actionUrl: '/members',
        estimatedTime: 10,
        importance: 'critical',
        category: 'networking',
        completed: false
      });
    }

    steps.push({
      id: 'join_forum',
      title: t.onboarding.complete.quickStart.steps.joinForum.title,
      description: t.onboarding.complete.quickStart.steps.joinForum.description,
      actionUrl: '/forum',
      estimatedTime: 5,
      importance: 'recommended',
      category: 'networking',
      completed: false
    });

    // Job search steps
    if (data['goalsDefinition'].careerGoals.targetCompanies.length > 0) {
      steps.push({
        id: 'setup_job_alerts',
        title: t.onboarding.complete.quickStart.steps.setupJobAlerts.title,
        description: t.onboarding.complete.quickStart.steps.setupJobAlerts.description,
        actionUrl: '/jobs',
        estimatedTime: 8,
        importance: 'critical',
        category: 'job-search',
        completed: false
      });
    }

    // Learning steps
    if (data['goalsDefinition'].learningGoals.skillsToLearn.length > 0) {
      steps.push({
        id: 'explore_resources',
        title: t.onboarding.complete.quickStart.steps.exploreResources.title,
        description: t.onboarding.complete.quickStart.steps.exploreResources.description,
        actionUrl: '/resources',
        estimatedTime: 15,
        importance: 'recommended',
        category: 'learning',
        completed: false
      });
    }

    return steps.sort((a, b) => {
      const importanceOrder = { critical: 3, recommended: 2, optional: 1 };
      return importanceOrder[b.importance] - importanceOrder[a.importance];
    });
  };

  const quickStartGuide = generateQuickStartGuide();

  // Achievements earned
  const staticAchievements = [
    {
      id: 'profile_creator',
      title: t.onboarding.complete.achievements.profileCreator.title,
      description: t.onboarding.complete.achievements.profileCreator.description,
      icon: '👤',
      rarity: 'common'
    },
    {
      id: 'goal_setter',
      title: t.onboarding.complete.achievements.goalSetter.title,
      description: t.onboarding.complete.achievements.goalSetter.description,
      icon: '🎯',
      rarity: 'common'
    },
    {
      id: 'connector',
      title: t.onboarding.complete.achievements.connector.title,
      description: t.onboarding.complete.achievements.connector.description,
      icon: '🤝',
      rarity: 'rare',
      condition: data['connectionSuggestions'].selectedConnections.length > 3
    },
    {
      id: 'learner',
      title: t.onboarding.complete.achievements.learner.title,
      description: t.onboarding.complete.achievements.learner.description,
      icon: '📚',
      rarity: 'common',
      condition: data['goalsDefinition'].learningGoals.skillsToLearn.length > 0
    }
  ].filter(achievement => !achievement.condition || achievement.condition);

  // Toggle focus area
  const toggleFocusArea = (areaId: string) => {
    setTourPreferences(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(areaId)
        ? prev.focusAreas.filter(id => id !== areaId)
        : [...prev.focusAreas, areaId]
    }));
  };

  // Toggle notification type
  const toggleNotificationType = (typeId: string) => {
    setNotificationPreferences(prev => ({
      ...prev,
      types: prev.types.includes(typeId)
        ? prev.types.filter(id => id !== typeId)
        : [...prev.types, typeId]
    }));
  };

  // Toggle quick start action
  const toggleQuickStartAction = (actionId: string) => {
    setQuickStartActions(prev =>
      prev.includes(actionId)
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const handleComplete = () => {
    onNext({
      tourPreferences,
      notificationPreferences,
      quickStartActions
    });
  };

  const viewSteps = [
    { id: 'celebration', title: t.onboarding.complete.steps.celebration },
    { id: 'tour', title: t.onboarding.complete.steps.tour },
    { id: 'notifications', title: t.onboarding.complete.steps.notifications },
    { id: 'quickstart', title: t.onboarding.complete.steps.quickStart }
  ];

  return (
    <div className={`onboarding-complete-step ${className}`}>
      <div className="max-w-4xl mx-auto">

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center space-x-4">
            {viewSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentView === step.id
                    ? 'bg-blue-600 text-white'
                    : index < viewSteps.findIndex(s => s.id === currentView)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < viewSteps.findIndex(s => s.id === currentView) ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index < viewSteps.length - 1 && (
                  <div className={`w-16 h-1 ${
                    index < viewSteps.findIndex(s => s.id === currentView)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Celebration View */}
          {currentView === 'celebration' && (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6"
                >
                  <CheckCircleIcon className="h-16 w-16 text-green-600" />
                </motion.div>
                
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-4xl font-bold text-gray-900 mb-4"
                >
                  {t.onboarding.complete.celebration.title}
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="text-xl text-gray-600 max-w-2xl mx-auto mb-8"
                >
                  {t.onboarding.complete.celebration.description}
                </motion.p>
              </div>

              {/* Achievements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: achievementsUnlocked ? 1 : 0, y: achievementsUnlocked ? 0 : 20 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8"
              >
                <div className="flex items-center justify-center mb-6">
                  <TrophyIcon className="h-8 w-8 text-yellow-600 mr-3" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {t.onboarding.complete.achievements.title}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staticAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                      className={`p-4 rounded-lg border-2 ${
                        achievement.rarity === 'rare'
                          ? 'border-purple-200 bg-purple-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3">{achievement.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                          <p className="text-sm text-gray-600">{achievement['description']}</p>
                        </div>
                      </div>
                      {achievement.rarity === 'rare' && (
                        <div className="flex items-center text-purple-600 text-xs">
                          <SparklesIcon className="h-3 w-3 mr-1" />
                          {t.onboarding.complete.achievements.rare}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Profile Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="bg-blue-50 rounded-xl p-6 mb-8"
              >
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  {t.onboarding.complete.summary.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {data['interestsSelection'].primarySkills.length}
                    </div>
                    <div className="text-blue-800">{t.onboarding.complete.summary.skills}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {data['goalsDefinition'].careerGoals.shortTerm.length + data['goalsDefinition'].careerGoals.longTerm.length}
                    </div>
                    <div className="text-blue-800">{t.onboarding.complete.summary.goals}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {data['connectionSuggestions'].selectedConnections.length}
                    </div>
                    <div className="text-blue-800">{t.onboarding.complete.summary.connections}</div>
                  </div>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                onClick={() => setCurrentView('achievements')}
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                {t.onboarding.complete.celebration.continue}
                <RocketLaunchIcon className="ml-2 h-5 w-5" />
              </motion.button>
            </motion.div>
          )}

          {/* Achievements View */}
          {currentView === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6">
                  <TrophyIcon className="h-16 w-16 text-yellow-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Achievements Unlocked!
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                  Congratulations! You've earned these achievements by completing your profile.
                </p>
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {staticAchievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-4">{achievement.icon}</div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {achievement['name']}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {achievement['description']}
                      </p>
                      <div className="flex items-center justify-center space-x-2">
                        <StarIcon className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-600">
                          {achievement.points} points
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          achievement.rarity === 'legendary' ? 'bg-purple-100 text-purple-800' :
                          achievement.rarity === 'epic' ? 'bg-orange-100 text-orange-800' :
                          achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {staticAchievements.length === 0 && (
                <div className="bg-gray-50 rounded-xl p-8 mb-8">
                  <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Complete more of your profile to unlock achievements!
                  </p>
                </div>
              )}

              {/* Profile Completeness */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Completeness</h3>
                  <span className="text-2xl font-bold text-blue-600">{profileCompleteness}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <motion.div
                    className="bg-blue-600 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompleteness}%` }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {profileCompleteness >= 80 ? 
                    'Excellent! Your profile is well-developed.' :
                    profileCompleteness >= 60 ?
                    'Good progress! Add more details to improve your visibility.' :
                    'Keep building your profile to unlock more features.'
                  }
                </p>
              </div>

              <button
                onClick={() => setCurrentView('recommendations')}
                className="inline-flex items-center px-8 py-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium text-lg"
              >
                View Recommendations
                <SparklesIcon className="ml-2 h-5 w-5" />
              </button>
            </motion.div>
          )}

          {/* Personalized Recommendations View */}
          {currentView === 'recommendations' && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-purple-100 rounded-full mb-6">
                  <SparklesIcon className="h-16 w-16 text-purple-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Personalized for You
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                  Based on your profile, here are some recommendations to help you achieve your goals.
                </p>
              </div>

              {/* Recommendations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {personalizedRecommendations.map((recommendation, index) => (
                  <motion.div
                    key={recommendation['type']}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`bg-white rounded-xl shadow-lg border-2 p-6 text-left ${
                      recommendation.priority === 'high' ? 'border-red-200' :
                      recommendation.priority === 'medium' ? 'border-yellow-200' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${
                        recommendation.priority === 'high' ? 'bg-red-100 text-red-600' :
                        recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {recommendation.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {recommendation.title}
                          </h3>
                          {recommendation.priority === 'high' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <FireIcon className="h-3 w-3 mr-1" />
                              Priority
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">
                          {recommendation['description']}
                        </p>
                        <a
                          href={recommendation.url}
                          className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                            recommendation.priority === 'high' ? 'bg-red-600 text-white hover:bg-red-700' :
                            recommendation.priority === 'medium' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                            'bg-gray-600 text-white hover:bg-gray-700'
                          }`}
                        >
                          {recommendation.action}
                          <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {personalizedRecommendations.length === 0 && (
                <div className="bg-gray-50 rounded-xl p-8 mb-8">
                  <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    We'll provide personalized recommendations as you use the platform!
                  </p>
                </div>
              )}

              <button
                onClick={() => setCurrentView('tour')}
                className="inline-flex items-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-lg"
              >
                Continue Setup
                <RocketLaunchIcon className="ml-2 h-5 w-5" />
              </button>
            </motion.div>
          )}

          {/* Tour Preferences View */}
          {currentView === 'tour' && (
            <motion.div
              key="tour"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
            >
              <div className="text-center mb-8">
                <PlayIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t.onboarding.complete.tour.title}
                </h2>
                <p className="text-gray-600">
                  {t.onboarding.complete.tour.description}
                </p>
              </div>

              {/* Take Tour Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {t.onboarding.complete.tour.enable.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t.onboarding.complete.tour.enable.description}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tourPreferences.takePlatformTour}
                    onChange={(e) => setTourPreferences(prev => ({ ...prev, takePlatformTour: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Focus Areas */}
              {tourPreferences.takePlatformTour && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t.onboarding.complete.tour.focusAreas.title}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t.onboarding.complete.tour.focusAreas.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {focusAreasOptions.map((area) => (
                      <button
                        key={area.id}
                        onClick={() => toggleFocusArea(area.id)}
                        className={`p-6 rounded-lg border-2 text-left transition-colors ${
                          tourPreferences.focusAreas.includes(area.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center mb-3">
                          <div className={`${
                            tourPreferences.focusAreas.includes(area.id) ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {area.icon}
                          </div>
                          <h4 className="font-semibold ml-3">{area.title}</h4>
                        </div>
                        <p className="text-sm opacity-75">{area['description']}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentView('celebration')}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t.onboarding.navigation.back}
                </button>
                <button
                  onClick={() => setCurrentView('notifications')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t.onboarding.navigation.next}
                </button>
              </div>
            </motion.div>
          )}

          {/* Notification Preferences View */}
          {currentView === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
            >
              <div className="text-center mb-8">
                <BellIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t.onboarding.complete.notifications.title}
                </h2>
                <p className="text-gray-600">
                  {t.onboarding.complete.notifications.description}
                </p>
              </div>

              {/* Email Notifications */}
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-6 w-6 text-gray-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {t.onboarding.complete.notifications.email.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t.onboarding.complete.notifications['email']['description']}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPreferences['email']}
                      onChange={(e) => setNotificationPreferences(prev => ({ ...prev, email: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Frequency */}
                {notificationPreferences['email'] && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {t.onboarding.complete.notifications.frequency.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { value: 'immediate', label: t.onboarding.complete.notifications.frequency.immediate },
                        { value: 'daily', label: t.onboarding.complete.notifications.frequency.daily },
                        { value: 'weekly', label: t.onboarding.complete.notifications.frequency.weekly }
                      ].map((freq) => (
                        <button
                          key={freq.value}
                          onClick={() => setNotificationPreferences(prev => ({ ...prev, frequency: freq.value as any }))}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            notificationPreferences.frequency === freq.value
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>

                    {/* Notification Types */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {t.onboarding.complete.notifications.types.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {notificationTypes.map((type) => (
                        <label key={type.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationPreferences.types.includes(type.id)}
                            onChange={() => toggleNotificationType(type.id)}
                            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="ml-3 flex items-center">
                            <div className="text-gray-600 mr-3">{type.icon}</div>
                            <span className="font-medium text-gray-900">{type.title}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentView('tour')}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t.onboarding.navigation.back}
                </button>
                <button
                  onClick={() => setCurrentView('quickstart')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t.onboarding.navigation.next}
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Start Guide View */}
          {currentView === 'quickstart' && (
            <motion.div
              key="quickstart"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
            >
              <div className="text-center mb-8">
                <RocketLaunchIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t.onboarding.complete.quickStart.title}
                </h2>
                <p className="text-gray-600">
                  {t.onboarding.complete.quickStart.description}
                </p>
              </div>

              {/* Quick Start Items */}
              <div className="space-y-4 mb-8">
                {quickStartGuide.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-6 rounded-lg border-2 ${
                      step.importance === 'critical'
                        ? 'border-red-200 bg-red-50'
                        : step.importance === 'recommended'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                          step.importance === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : step.importance === 'recommended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                          <span className="text-sm text-gray-500">{step.estimatedTime} min</span>
                        </div>
                        <p className="text-gray-600 mb-4">{step['description']}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              step.importance === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : step.importance === 'recommended'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {step.importance === 'critical' ? t.onboarding.complete.quickStart.importance.critical :
                               step.importance === 'recommended' ? t.onboarding.complete.quickStart.importance.recommended :
                               t.onboarding.complete.quickStart.importance.optional}
                            </span>
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                              {step.category}
                            </span>
                          </div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={quickStartActions.includes(step.id)}
                              onChange={() => toggleQuickStartAction(step.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-600">
                              {t.onboarding.complete.quickStart.addToList}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentView('notifications')}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t.onboarding.navigation.back}
                </button>
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
                >
                  {t.onboarding.complete.finish}
                  <CheckCircleIcon className="ml-2 h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Achievement Modal */}
        <AnimatePresence>
          {showAchievementModal && currentAchievement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowAchievementModal(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setShowAchievementModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>

                {/* Achievement content */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-6xl mb-4">{currentAchievement.icon}</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Achievement Unlocked!
                  </h2>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {currentAchievement['name']}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {currentAchievement['description']}
                  </p>
                  
                  <div className="flex items-center justify-center space-x-4 mb-6">
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium text-yellow-600">
                        {currentAchievement.points} points
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      currentAchievement.rarity === 'legendary' ? 'bg-purple-100 text-purple-800' :
                      currentAchievement.rarity === 'epic' ? 'bg-orange-100 text-orange-800' :
                      currentAchievement.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {currentAchievement.rarity.charAt(0).toUpperCase() + currentAchievement.rarity.slice(1)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setShowAchievementModal(false);
                      // Show next achievement if there are more
                      const currentIndex = staticAchievements.findIndex(a => a.id === currentAchievement.id);
                      if (currentIndex < staticAchievements.length - 1) {
                        setTimeout(() => {
                          setCurrentAchievement(staticAchievements[currentIndex + 1]);
                          setShowAchievementModal(true);
                        }, 500);
                      }
                    }}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {staticAchievements.findIndex(a => a.id === currentAchievement.id) < staticAchievements.length - 1 ? 'Next Achievement' : 'Continue'}
                    {staticAchievements.findIndex(a => a.id === currentAchievement.id) < staticAchievements.length - 1 ? 
                      <TrophyIcon className="ml-2 h-5 w-5" /> : 
                      <CheckCircleIcon className="ml-2 h-5 w-5" />
                    }
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingComplete;