import React, { useState, useEffect } from 'react';
import { 
import { motion, AnimatePresence} from 'framer-motion';
import { useTranslations} from '../../hooks/useTranslations';

  PlayIcon, 
  CheckIcon, 
  GlobeAltIcon,
  UsersIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import type { OnboardingStepProps } from '../../types/onboarding';

const WelcomeStep: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  progress,
  className = ''
}) => {
  const t = useTranslations();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasWatchedIntro, setHasWatchedIntro] = useState(data['welcome'].hasWatchedIntro || false);
  const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'en'>(data['welcome'].selectedLanguage || 'es');
  const [agreedToTerms, setAgreedToTerms] = useState(data['welcome'].agreedToTerms || false);
  const [subscribedToNewsletter, setSubscribedToNewsletter] = useState(data['welcome'].subscribedToNewsletter || false);
  const [isPlaying, setIsPlaying] = useState(false);

  const introSlides = [
    {
      icon: <UsersIcon className="h-16 w-16 text-blue-600" />,
      title: t.onboarding.welcome.slides.community.title,
      description: t.onboarding.welcome.slides.community.description,
      features: [
        t.onboarding.welcome.slides.community.features.networking,
        t.onboarding.welcome.slides.community.features.mentorship,
        t.onboarding.welcome.slides.community.features.events
      ]
    },
    {
      icon: <BriefcaseIcon className="h-16 w-16 text-green-600" />,
      title: t.onboarding.welcome.slides.careers.title,
      description: t.onboarding.welcome.slides.careers.description,
      features: [
        t.onboarding.welcome.slides.careers.features.jobBoard,
        t.onboarding.welcome.slides.careers.features.careerGuidance,
        t.onboarding.welcome.slides.careers.features.salaryInsights
      ]
    },
    {
      icon: <AcademicCapIcon className="h-16 w-16 text-purple-600" />,
      title: t.onboarding.welcome.slides.learning.title,
      description: t.onboarding.welcome.slides.learning.description,
      features: [
        t.onboarding.welcome.slides.learning.features.resources,
        t.onboarding.welcome.slides.learning.features.workshops,
        t.onboarding.welcome.slides.learning.features.certifications
      ]
    },
    {
      icon: <SparklesIcon className="h-16 w-16 text-yellow-600" />,
      title: t.onboarding.welcome.slides.benefits.title,
      description: t.onboarding.welcome.slides.benefits['description'],
      features: [
        t.onboarding.welcome.slides.benefits.features.premiumAccess,
        t.onboarding.welcome.slides.benefits.features.exclusiveEvents,
        t.onboarding.welcome.slides.benefits.features.industryInsights
      ]
    }
  ];

  const platformStats = [
    { label: t.onboarding.welcome.stats.members, value: '2,500+', icon: <UsersIcon className="h-6 w-6" /> },
    { label: t.onboarding.welcome.stats.jobs, value: '150+', icon: <BriefcaseIcon className="h-6 w-6" /> },
    { label: t.onboarding.welcome.stats.companies, value: '80+', icon: <GlobeAltIcon className="h-6 w-6" /> }
  ];

  // Auto-advance slides during intro
  useEffect(() => {
    if(isPlaying) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => {
          if (prev < introSlides.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            setHasWatchedIntro(true);
            return prev;
          }
        });
      }, 4000); // 4 seconds per slide

      return () => clearInterval(interval);
    }
  }, [isPlaying, introSlides.length]);

  const startIntroTour = () => {
    setIsPlaying(true);
    setCurrentSlide(0);
  };

  const skipIntro = () => {
    setHasWatchedIntro(true);
    setIsPlaying(false);
  };

  const handleLanguageChange = (language: 'es' | 'en') => {
    setSelectedLanguage(language);
  };

  const canProceed = agreedToTerms;

  const handleNext = () => {
    if(canProceed) {
      onNext({
        hasWatchedIntro,
        selectedLanguage,
        agreedToTerms,
        subscribedToNewsletter
      });
    }
  };

  return (
    <div className={`welcome-step ${className}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <img 
              src="/images/logo.png" 
              alt="SECiD Logo" 
              className="h-20 w-auto mx-auto mb-6"
            />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {t.onboarding.welcome.title}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t.onboarding.welcome.subtitle}
            </p>
          </motion.div>

          {/* Platform Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            {platformStats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-center space-x-3">
                  <div className="text-blue-600">{stat.icon}</div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Interactive Platform Tour */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t.onboarding.welcome.tour.title}
            </h2>
            <p className="text-gray-600">
              {t.onboarding.welcome.tour.description}
            </p>
          </div>

          {!hasWatchedIntro && !isPlaying && (
            <div className="text-center space-y-4">
              <button
                onClick={startIntroTour}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                {t.onboarding.welcome.tour.start}
              </button>
              <div>
                <button
                  onClick={skipIntro}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {t.onboarding.welcome.tour.skip}
                </button>
              </div>
            </div>
          )}

          {(isPlaying || hasWatchedIntro) && (
            <div className="relative">
              {/* Slide Navigation Dots */}
              <div className="flex justify-center space-x-2 mb-6">
                {introSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => !isPlaying && setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentSlide 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    disabled={isPlaying}
                  />
                ))}
              </div>

              {/* Slide Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-center"
                >
                  <div className="flex justify-center mb-6">
                    {introSlides[currentSlide].icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {introSlides[currentSlide].title}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    {introSlides[currentSlide].description}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {introSlides[currentSlide].features.map((feature, index) => (
                      <div key={index} className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                        <CheckIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Tour Controls */}
              {!isPlaying && hasWatchedIntro && (
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                    disabled={currentSlide === 0}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t.onboarding.navigation.previous}
                  </button>
                  <button
                    onClick={() => setCurrentSlide(Math.min(introSlides.length - 1, currentSlide + 1))}
                    disabled={currentSlide === introSlides.length - 1}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t.onboarding.navigation.next}
                  </button>
                </div>
              )}

              {isPlaying && (
                <div className="text-center mt-6">
                  <button
                    onClick={skipIntro}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {t.onboarding.welcome.tour.skip}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Language Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t.onboarding.welcome.language.title}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleLanguageChange('es')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedLanguage === 'es'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🇲🇽</div>
                <div className="font-medium">Español</div>
                <div className="text-sm opacity-75">{t.onboarding.welcome.language.spanish}</div>
              </div>
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                selectedLanguage === 'en'
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🇺🇸</div>
                <div className="font-medium">English</div>
                <div className="text-sm opacity-75">{t.onboarding.welcome.language.english}</div>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Terms and Agreements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t.onboarding.welcome.agreements.title}
          </h3>
          <div className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                required
              />
              <div className="text-sm text-gray-700">
                {t.onboarding.welcome.agreements.terms.prefix}{' '}
                <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-800">
                  {t.onboarding.welcome.agreements.terms.link}
                </a>{' '}
                {t.onboarding.welcome.agreements.terms.and}{' '}
                <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-800">
                  {t.onboarding.welcome.agreements.privacy.link}
                </a>
                {t.onboarding.welcome.agreements.terms.suffix}
              </div>
            </label>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={subscribedToNewsletter}
                onChange={(e) => setSubscribedToNewsletter(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="text-sm text-gray-700">
                {t.onboarding.welcome.agreements.newsletter.text}
              </div>
            </label>
          </div>
        </motion.div>

        {/* Next Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-center"
        >
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`inline-flex items-center px-8 py-4 rounded-lg font-medium text-lg transition-colors ${
              canProceed
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {t.onboarding.welcome.getStarted}
            <svg 
              className="ml-2 h-5 w-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!canProceed && (
            <p className="text-sm text-gray-500 mt-2">
              {t.onboarding.welcome.agreements.required}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeStep;