import React, { useState } from 'react';
import { 
import { motion} from 'framer-motion';
import { useTranslations} from '../../hooks/useTranslations';

  TrophyIcon,
  AcademicCapIcon,
  UsersIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  LightBulbIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import type { OnboardingStepProps } from '../../types/onboarding';

const GoalsDefinition: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  onBack,
  onSkip,
  progress,
  className = ''
}) => {
  const t = useTranslations();

  // Form state
  const [careerGoals, setCareerGoals] = useState({
    shortTerm: data['goalsDefinition'].careerGoals.shortTerm || [],
    longTerm: data['goalsDefinition'].careerGoals.longTerm || [],
    dreamRole: data?.goalsDefinition?.careerGoals.dreamRole || '',
    targetCompanies: data['goalsDefinition'].careerGoals.targetCompanies || [],
    targetSalaryRange: {
      min: data['goalsDefinition'].careerGoals?.targetSalaryRange?.min || undefined,
      max: data?.goalsDefinition?.careerGoals?.targetSalaryRange?.max || undefined,
      currency: data['goalsDefinition'].careerGoals?.targetSalaryRange?.currency || 'MXN'
    }
  });

  const [learningGoals, setLearningGoals] = useState({
    skillsToLearn: data['goalsDefinition'].learningGoals.skillsToLearn || [],
    certificationGoals: data['goalsDefinition'].learningGoals.certificationGoals || [],
    timeCommitment: data?.goalsDefinition?.learningGoals.timeCommitment || 'regular',
    preferredLearningStyle: data['goalsDefinition'].learningGoals.preferredLearningStyle || 'self-paced'
  });

  const [networkingGoals, setNetworkingGoals] = useState({
    connectionTargets: data['goalsDefinition'].networkingGoals.connectionTargets || 10,
    mentorshipInterest: data['goalsDefinition'].networkingGoals.mentorshipInterest || 'none',
    eventParticipation: data['goalsDefinition'].networkingGoals.eventParticipation || 'occasional',
    contributionLevel: data['goalsDefinition'].networkingGoals.contributionLevel || 'discussion-participant'
  });

  const [currentSection, setCurrentSection] = useState<'career' | 'learning' | 'networking'>('career');
  const [customInputs, setCustomInputs] = useState({
    shortTermGoal: '',
    longTermGoal: '',
    targetCompany: '',
    skillToLearn: '',
    certificationGoal: ''
  });

  // Predefined options
  const shortTermGoalsOptions = [
    'Get promoted to senior role',
    'Switch to a data-focused position',
    'Learn a new programming language',
    'Complete a certification',
    'Lead a data project',
    'Improve presentation skills',
    'Build a professional network',
    'Increase technical skills',
    'Get a salary increase',
    'Find a better work-life balance'
  ];

  const longTermGoalsOptions = [
    'Become a Data Science Manager',
    'Start my own data consultancy',
    'Become a Chief Data Officer',
    'Transition to Machine Learning Engineer',
    'Lead a data science team',
    'Become a data science consultant',
    'Pursue a PhD in Data Science',
    'Work for a FAANG company',
    'Build a data product startup',
    'Become a data science educator'
  ];

  const targetCompaniesOptions = [
    'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Uber',
    'Spotify', 'Airbnb', 'Tesla', 'BBVA', 'Santander', 'Mercado Libre',
    'Rappi', 'Kavak', 'Clip', 'Konfío', 'Creditas', 'Nubank', 'Startup'
  ];

  const skillsToLearnOptions = [
    'Advanced Machine Learning', 'Deep Learning', 'MLOps', 'Cloud Computing',
    'Data Engineering', 'Natural Language Processing', 'Computer Vision',
    'Time Series Analysis', 'A/B Testing', 'Leadership Skills',
    'Project Management', 'Business Intelligence', 'Data Visualization',
    'Statistical Modeling', 'Big Data Technologies', 'DevOps'
  ];

  const certificationGoalsOptions = [
    'AWS Certified Machine Learning',
    'Google Cloud Professional Data Engineer',
    'Microsoft Azure Data Scientist',
    'Databricks Certified Data Engineer',
    'Tableau Desktop Certified Associate',
    'SAS Certified Data Scientist',
    'IBM Data Science Professional',
    'Cloudera Data Platform Generalist',
    'Snowflake SnowPro Core',
    'PMP Certification'
  ];

  const timeCommitmentOptions = [
    { value: 'casual', label: t.onboarding.goals.learning.timeCommitment.casual, hours: '1-3 hours/week' },
    { value: 'regular', label: t.onboarding.goals.learning.timeCommitment.regular, hours: '4-8 hours/week' },
    { value: 'intensive', label: t.onboarding.goals.learning.timeCommitment.intensive, hours: '10+ hours/week' }
  ];

  const learningStyleOptions = [
    { value: 'self-paced', label: t.onboarding.goals.learning.styles.selfPaced, icon: <ClockIcon className="h-5 w-5" /> },
    { value: 'structured', label: t.onboarding.goals.learning.styles.structured, icon: <AcademicCapIcon className="h-5 w-5" /> },
    { value: 'mentored', label: t.onboarding.goals.learning.styles.mentored, icon: <UsersIcon className="h-5 w-5" /> },
    { value: 'group', label: t.onboarding.goals.learning.styles.group, icon: <UsersIcon className="h-5 w-5" /> }
  ];

  const mentorshipOptions = [
    { value: 'none', label: t.onboarding.goals.networking.mentorship.none },
    { value: 'mentee', label: t.onboarding.goals.networking.mentorship.mentee },
    { value: 'mentor', label: t.onboarding.goals.networking.mentorship.mentor },
    { value: 'both', label: t.onboarding.goals.networking.mentorship.both }
  ];

  const eventParticipationOptions = [
    { value: 'observer', label: t.onboarding.goals.networking.events.observer },
    { value: 'occasional', label: t.onboarding.goals.networking.events.occasional },
    { value: 'active', label: t.onboarding.goals.networking.events.active }
  ];

  const contributionLevelOptions = [
    { value: 'consumer', label: t.onboarding.goals.networking.contribution.consumer },
    { value: 'discussion-participant', label: t.onboarding.goals.networking.contribution.participant },
    { value: 'content-creator', label: t.onboarding.goals.networking.contribution.creator }
  ];

  const sections = [
    {
      id: 'career',
      title: t.onboarding.goals.sections.career.title,
      description: t.onboarding.goals.sections.career['description'],
      icon: <TrophyIcon className="h-6 w-6" />,
      color: 'blue'
    },
    {
      id: 'learning',
      title: t.onboarding.goals.sections.learning.title,
      description: t.onboarding.goals.sections.learning['description'],
      icon: <AcademicCapIcon className="h-6 w-6" />,
      color: 'green'
    },
    {
      id: 'networking',
      title: t.onboarding.goals.sections.networking.title,
      description: t.onboarding.goals.sections.networking['description'],
      icon: <UsersIcon className="h-6 w-6" />,
      color: 'purple'
    }
  ];

  // Helper functions
  const addToList = (listType: string, value: string) => {
    if (!value.trim()) return;

    switch(listType) {
      case 'shortTerm':
        if (!careerGoals.shortTerm.includes(value)) {
          setCareerGoals(prev => ({ ...prev, shortTerm: [...prev.shortTerm, value] }));
        }
        break;
      case 'longTerm':
        if (!careerGoals.longTerm.includes(value)) {
          setCareerGoals(prev => ({ ...prev, longTerm: [...prev.longTerm, value] }));
        }
        break;
      case 'targetCompany':
        if (!careerGoals.targetCompanies.includes(value)) {
          setCareerGoals(prev => ({ ...prev, targetCompanies: [...prev.targetCompanies, value] }));
        }
        break;
      case 'skillToLearn':
        if (!learningGoals.skillsToLearn.includes(value)) {
          setLearningGoals(prev => ({ ...prev, skillsToLearn: [...prev.skillsToLearn, value] }));
        }
        break;
      case 'certificationGoal':
        if (!learningGoals.certificationGoals.includes(value)) {
          setLearningGoals(prev => ({ ...prev, certificationGoals: [...prev.certificationGoals, value] }));
        }
        break;
    }

    setCustomInputs(prev => ({ ...prev, [listType]: '' }));
  };

  const removeFromList = (listType: string, value: string) => {
    switch(listType) {
      case 'shortTerm':
        setCareerGoals(prev => ({ ...prev, shortTerm: prev.shortTerm.filter(item => item !== value) }));
        break;
      case 'longTerm':
        setCareerGoals(prev => ({ ...prev, longTerm: prev.longTerm.filter(item => item !== value) }));
        break;
      case 'targetCompany':
        setCareerGoals(prev => ({ ...prev, targetCompanies: prev.targetCompanies.filter(item => item !== value) }));
        break;
      case 'skillToLearn':
        setLearningGoals(prev => ({ ...prev, skillsToLearn: prev.skillsToLearn.filter(item => item !== value) }));
        break;
      case 'certificationGoal':
        setLearningGoals(prev => ({ ...prev, certificationGoals: prev.certificationGoals.filter(item => item !== value) }));
        break;
    }
  };

  const handleNext = () => {
    onNext({
      careerGoals,
      learningGoals,
      networkingGoals
    });
  };

  return (
    <div className={`goals-definition-step ${className}`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t.onboarding.goals.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.onboarding.goals.description}
          </p>
        </motion.div>

        {/* Section Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id as any)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  currentSection === section.id
                    ? `border-${section.color}-500 bg-${section.color}-50`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center mb-3">
                  <div className={`text-${section.color}-600`}>{section.icon}</div>
                  <h3 className={`text-lg font-semibold ml-3 ${
                    currentSection === section.id ? `text-${section.color}-900` : 'text-gray-900'
                  }`}>
                    {section.title}
                  </h3>
                </div>
                <p className={`text-sm text-left ${
                  currentSection === section.id ? `text-${section.color}-700` : 'text-gray-600'
                }`}>
                  {section['description']}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
        >

          {/* Career Goals Section */}
          {currentSection === 'career' && (
            <div className="space-y-8">
              {/* Dream Role */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.career.dreamRole.title}
                </label>
                <input
                  type="text"
                  value={careerGoals.dreamRole}
                  onChange={(e) => setCareerGoals(prev => ({ ...prev, dreamRole: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.onboarding.goals.career.dreamRole.placeholder}
                />
              </div>

              {/* Short-term Goals */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.career.shortTerm.title}
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({t.onboarding.goals.career.shortTerm.timeframe})
                  </span>
                </label>
                
                {/* Selected goals */}
                {careerGoals.shortTerm.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {careerGoals.shortTerm.map((goal) => (
                      <motion.div
                        key={goal}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-900 rounded-full"
                      >
                        <span className="text-sm font-medium">{goal}</span>
                        <button
                          onClick={() => removeFromList('shortTerm', goal)}
                          className="ml-2 p-1 hover:bg-blue-200 rounded-full transition-colors"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Add custom goal */}
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={customInputs.shortTermGoal}
                    onChange={(e) => setCustomInputs(prev => ({ ...prev, shortTermGoal: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addToList('shortTerm', customInputs.shortTermGoal)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.goals.career.shortTerm.placeholder}
                  />
                  <button
                    onClick={() => addToList('shortTerm', customInputs.shortTermGoal)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Predefined options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shortTermGoalsOptions
                    .filter(goal => !careerGoals.shortTerm.includes(goal))
                    .map((goal) => (
                      <button
                        key={goal}
                        onClick={() => addToList('shortTerm', goal)}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">{goal}</span>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Long-term Goals */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.career.longTerm.title}
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({t.onboarding.goals.career.longTerm.timeframe})
                  </span>
                </label>
                
                {/* Selected goals */}
                {careerGoals.longTerm.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {careerGoals.longTerm.map((goal) => (
                      <motion.div
                        key={goal}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center px-3 py-2 bg-green-100 text-green-900 rounded-full"
                      >
                        <span className="text-sm font-medium">{goal}</span>
                        <button
                          onClick={() => removeFromList('longTerm', goal)}
                          className="ml-2 p-1 hover:bg-green-200 rounded-full transition-colors"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Add custom goal */}
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={customInputs.longTermGoal}
                    onChange={(e) => setCustomInputs(prev => ({ ...prev, longTermGoal: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addToList('longTerm', customInputs.longTermGoal)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={t.onboarding.goals.career.longTerm.placeholder}
                  />
                  <button
                    onClick={() => addToList('longTerm', customInputs.longTermGoal)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Predefined options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {longTermGoalsOptions
                    .filter(goal => !careerGoals.longTerm.includes(goal))
                    .map((goal) => (
                      <button
                        key={goal}
                        onClick={() => addToList('longTerm', goal)}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">{goal}</span>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Target Companies */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.career.targetCompanies.title}
                </label>
                
                {/* Selected companies */}
                {careerGoals.targetCompanies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {careerGoals.targetCompanies.map((company) => (
                      <motion.div
                        key={company}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center px-3 py-2 bg-purple-100 text-purple-900 rounded-full"
                      >
                        <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">{company}</span>
                        <button
                          onClick={() => removeFromList('targetCompany', company)}
                          className="ml-2 p-1 hover:bg-purple-200 rounded-full transition-colors"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Add custom company */}
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={customInputs.targetCompany}
                    onChange={(e) => setCustomInputs(prev => ({ ...prev, targetCompany: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addToList('targetCompany', customInputs.targetCompany)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t.onboarding.goals.career.targetCompanies.placeholder}
                  />
                  <button
                    onClick={() => addToList('targetCompany', customInputs.targetCompany)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Predefined options */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {targetCompaniesOptions
                    .filter(company => !careerGoals.targetCompanies.includes(company))
                    .map((company) => (
                      <button
                        key={company}
                        onClick={() => addToList('targetCompany', company)}
                        className="p-3 text-center border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">{company}</span>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.career.salaryRange.title}
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({t.onboarding.goals.career.salaryRange.optional})
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.onboarding.goals.career.salaryRange.minimum}
                    </label>
                    <input
                      type="number"
                      value={careerGoals.targetSalaryRange.min || ''}
                      onChange={(e) => setCareerGoals(prev => ({
                        ...prev,
                        targetSalaryRange: {
                          ...prev.targetSalaryRange,
                          min: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="50,000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.onboarding.goals.career.salaryRange.maximum}
                    </label>
                    <input
                      type="number"
                      value={careerGoals.targetSalaryRange.max || ''}
                      onChange={(e) => setCareerGoals(prev => ({
                        ...prev,
                        targetSalaryRange: {
                          ...prev.targetSalaryRange,
                          max: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100,000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.onboarding.goals.career.salaryRange.currency}
                    </label>
                    <select
                      value={careerGoals.targetSalaryRange.currency}
                      onChange={(e) => setCareerGoals(prev => ({
                        ...prev,
                        targetSalaryRange: {
                          ...prev.targetSalaryRange,
                          currency: e.target.value as 'MXN' | 'USD' | 'EUR'
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Learning Goals Section */}
          {currentSection === 'learning' && (
            <div className="space-y-8">
              {/* Skills to Learn */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.learning.skills.title}
                </label>
                
                {/* Selected skills */}
                {learningGoals.skillsToLearn.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {learningGoals.skillsToLearn.map((skill) => (
                      <motion.div
                        key={skill}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center px-3 py-2 bg-green-100 text-green-900 rounded-full"
                      >
                        <LightBulbIcon className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">{skill}</span>
                        <button
                          onClick={() => removeFromList('skillToLearn', skill)}
                          className="ml-2 p-1 hover:bg-green-200 rounded-full transition-colors"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Add custom skill */}
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={customInputs.skillToLearn}
                    onChange={(e) => setCustomInputs(prev => ({ ...prev, skillToLearn: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addToList('skillToLearn', customInputs.skillToLearn)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={t.onboarding.goals.learning.skills.placeholder}
                  />
                  <button
                    onClick={() => addToList('skillToLearn', customInputs.skillToLearn)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Predefined options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {skillsToLearnOptions
                    .filter(skill => !learningGoals.skillsToLearn.includes(skill))
                    .map((skill) => (
                      <button
                        key={skill}
                        onClick={() => addToList('skillToLearn', skill)}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">{skill}</span>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Certification Goals */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.learning.certifications.title}
                </label>
                
                {/* Selected certifications */}
                {learningGoals.certificationGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {learningGoals.certificationGoals.map((cert) => (
                      <motion.div
                        key={cert}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-900 rounded-full"
                      >
                        <AcademicCapIcon className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">{cert}</span>
                        <button
                          onClick={() => removeFromList('certificationGoal', cert)}
                          className="ml-2 p-1 hover:bg-blue-200 rounded-full transition-colors"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Add custom certification */}
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={customInputs.certificationGoal}
                    onChange={(e) => setCustomInputs(prev => ({ ...prev, certificationGoal: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addToList('certificationGoal', customInputs.certificationGoal)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.goals.learning.certifications.placeholder}
                  />
                  <button
                    onClick={() => addToList('certificationGoal', customInputs.certificationGoal)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Predefined options */}
                <div className="grid grid-cols-1 gap-3">
                  {certificationGoalsOptions
                    .filter(cert => !learningGoals.certificationGoals.includes(cert))
                    .map((cert) => (
                      <button
                        key={cert}
                        onClick={() => addToList('certificationGoal', cert)}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">{cert}</span>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Time Commitment */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.learning.timeCommitment.title}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {timeCommitmentOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLearningGoals(prev => ({ ...prev, timeCommitment: option.value as any }))}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        learningGoals.timeCommitment === option.value
                          ? 'border-green-500 bg-green-50 text-green-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        <ClockIcon className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm opacity-75">{option.hours}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Learning Style */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.learning.style.title}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {learningStyleOptions.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setLearningGoals(prev => ({ ...prev, preferredLearningStyle: style.value as any }))}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        learningGoals.preferredLearningStyle === style.value
                          ? 'border-green-500 bg-green-50 text-green-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        {style.icon}
                        <div className="font-medium mt-2">{style.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Networking Goals Section */}
          {currentSection === 'networking' && (
            <div className="space-y-8">
              {/* Connection Targets */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.networking.connections.title}
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={networkingGoals.connectionTargets}
                    onChange={(e) => setNetworkingGoals(prev => ({ ...prev, connectionTargets: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <div className="flex items-center px-4 py-2 bg-purple-100 text-purple-900 rounded-lg min-w-0">
                    <UsersIcon className="h-5 w-5 mr-2" />
                    <span className="font-medium">{networkingGoals.connectionTargets}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {t.onboarding.goals.networking.connections.description}
                </p>
              </div>

              {/* Mentorship Interest */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.networking.mentorship.title}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {mentorshipOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setNetworkingGoals(prev => ({ ...prev, mentorshipInterest: option.value as any }))}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        networkingGoals.mentorshipInterest === option.value
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-medium">{option.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Participation */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.networking.events.title}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {eventParticipationOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setNetworkingGoals(prev => ({ ...prev, eventParticipation: option.value as any }))}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        networkingGoals.eventParticipation === option.value
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-medium">{option.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contribution Level */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.goals.networking.contribution.title}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {contributionLevelOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setNetworkingGoals(prev => ({ ...prev, contributionLevel: option.value as any }))}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        networkingGoals.contributionLevel === option.value
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-medium">{option.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-between items-center mt-8"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            {t.onboarding.navigation.back}
          </button>

          <div className="flex items-center space-x-4">
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t.onboarding.navigation.skip}
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {t.onboarding.navigation.continue}
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GoalsDefinition;