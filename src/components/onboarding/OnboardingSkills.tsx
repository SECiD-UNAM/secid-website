import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  CodeBracketIcon,
  ChartBarIcon,
  CpuChipIcon,
  GlobeAltIcon,
  LightBulbIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '../../hooks/useTranslations';

import type { OnboardingStepProps } from '../../types/onboarding';

const OnboardingSkills: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  onBack,
  onSkip,
  progress,
  className = '',
}) => {
  const t = useTranslations();

  // Form state
  const [primarySkills, setPrimarySkills] = useState<string[]>(
    data['interestsSelection'].primarySkills || []
  );
  const [secondarySkills, setSecondarySkills] = useState<string[]>(
    data['interestsSelection'].secondarySkills || []
  );
  const [technologies, setTechnologies] = useState<string[]>(
    data?.interestsSelection?.technologies || []
  );
  const [certifications, setCertifications] = useState<string[]>(
    data['interestsSelection'].certifications || []
  );

  const [currentCategory, setCurrentCategory] = useState<
    'primary' | 'secondary' | 'technologies' | 'certifications'
  >('primary');
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [recommendedSkills, setRecommendedSkills] = useState<string[]>([]);

  // Predefined skill options with categories
  const skillCategories = {
    primary: {
      icon: <SparklesIcon className="h-5 w-5" />,
      title: 'Core Skills',
      description: 'Your strongest technical skills',
      options: [
        'Python',
        'R',
        'SQL',
        'Machine Learning',
        'Deep Learning',
        'Data Visualization',
        'Statistics',
        'Business Intelligence',
        'Data Mining',
        'Big Data',
        'Data Analysis',
        'Predictive Modeling',
        'Statistical Analysis',
        'A/B Testing',
        'Data Science',
        'Artificial Intelligence',
        'Natural Language Processing',
        'Computer Vision',
      ],
    },
    secondary: {
      icon: <ChartBarIcon className="h-5 w-5" />,
      title: 'Supporting Skills',
      description: 'Additional skills that complement your expertise',
      options: [
        'Project Management',
        'Data Storytelling',
        'Presentation Skills',
        'Excel',
        'Leadership',
        'Agile Methodology',
        'Research',
        'Communication',
        'Problem Solving',
        'Critical Thinking',
        'Team Collaboration',
        'Mentoring',
      ],
    },
    technologies: {
      icon: <CpuChipIcon className="h-5 w-5" />,
      title: 'Technologies & Tools',
      description: 'Software, platforms, and tools you work with',
      options: [
        'TensorFlow',
        'PyTorch',
        'Scikit-learn',
        'Pandas',
        'NumPy',
        'Matplotlib',
        'Seaborn',
        'Plotly',
        'Jupyter',
        'Apache Spark',
        'Hadoop',
        'Kafka',
        'Docker',
        'Kubernetes',
        'Git',
        'AWS',
        'Azure',
        'Google Cloud',
        'Tableau',
        'Power BI',
        'Databricks',
        'Snowflake',
        'MongoDB',
        'PostgreSQL',
      ],
    },
    certifications: {
      icon: <TrophyIcon className="h-5 w-5" />,
      title: 'Certifications',
      description: 'Professional certifications and credentials',
      options: [
        'AWS Certified Data Analytics',
        'Google Cloud Professional Data Engineer',
        'Microsoft Azure Data Scientist',
        'Tableau Desktop Specialist',
        'SAS Certified Data Scientist',
        'IBM Data Science Professional',
        'Cloudera Data Analyst',
        'MongoDB Certified Developer',
        'Databricks Certified Associate',
        'Snowflake SnowPro Core',
      ],
    },
  };

  // Filter options based on search
  const filteredOptions = skillCategories[currentCategory].options.filter(
    (skill) => skill.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get current skills array based on category
  const getCurrentSkills = () => {
    switch (currentCategory) {
      case 'primary':
        return primarySkills;
      case 'secondary':
        return secondarySkills;
      case 'technologies':
        return technologies;
      case 'certifications':
        return certifications;
      default:
        return [];
    }
  };

  // Update skills array based on category
  const updateCurrentSkills = (newSkills: string[]) => {
    switch (currentCategory) {
      case 'primary':
        setPrimarySkills(newSkills);
        break;
      case 'secondary':
        setSecondarySkills(newSkills);
        break;
      case 'technologies':
        setTechnologies(newSkills);
        break;
      case 'certifications':
        setCertifications(newSkills);
        break;
    }
  };

  // Add skill to current category
  const addSkill = (skill: string) => {
    const currentSkills = getCurrentSkills();
    if (!currentSkills.includes(skill)) {
      updateCurrentSkills([...currentSkills, skill]);
    }
  };

  // Remove skill from current category
  const removeSkill = (skill: string) => {
    const currentSkills = getCurrentSkills();
    updateCurrentSkills(currentSkills.filter((s) => s !== skill));
  };

  // Add custom skill
  const addCustomSkill = () => {
    if (
      customInput.trim() &&
      !getCurrentSkills().includes(customInput.trim())
    ) {
      addSkill(customInput.trim());
      setCustomInput('');
    }
  };

  // Generate personalized recommendations based on existing skills
  useEffect(() => {
    const allSelectedSkills = [
      ...primarySkills,
      ...secondarySkills,
      ...technologies,
    ];
    const recommendations = [];

    // ML/AI recommendations
    if (
      allSelectedSkills.some((skill) =>
        ['Python', 'Machine Learning', 'Statistics'].includes(skill)
      )
    ) {
      recommendations.push(
        'Deep Learning',
        'TensorFlow',
        'PyTorch',
        'Computer Vision'
      );
    }

    // Data Engineering recommendations
    if (
      allSelectedSkills.some((skill) =>
        ['SQL', 'Big Data', 'Python'].includes(skill)
      )
    ) {
      recommendations.push('Apache Spark', 'Docker', 'AWS', 'Data Pipelines');
    }

    // Business Intelligence recommendations
    if (
      allSelectedSkills.some((skill) =>
        ['Data Visualization', 'Business Intelligence'].includes(skill)
      )
    ) {
      recommendations.push('Tableau', 'Power BI', 'Data Storytelling');
    }

    setRecommendedSkills(
      recommendations
        .filter((rec) => !allSelectedSkills.includes(rec))
        .slice(0, 6)
    );
  }, [primarySkills, secondarySkills, technologies]);

  // Validation
  const isValid = primarySkills.length >= 3;
  const completeness = Math.min(
    100,
    primarySkills.length * 20 +
      secondarySkills.length * 10 +
      technologies.length * 5
  );

  const handleNext = () => {
    if (isValid) {
      onNext({
        primarySkills,
        secondarySkills,
        learningGoals: data?.interestsSelection?.learningGoals,
        industries: data['interestsSelection'].industries,
        technologies,
        certifications,
        languagesSpoken: data?.interestsSelection?.languagesSpoken,
        hobbies: data['interestsSelection'].hobbies,
      });
    }
  };

  return (
    <div className={`onboarding-skills ${className}`}>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <SparklesIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Tell us about your skills
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Help us understand your expertise so we can connect you with
            relevant opportunities and peers.
          </p>

          {/* Progress Indicator */}
          <div className="mx-auto mt-6 max-w-md">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Profile Completeness</span>
              <span>{completeness}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <motion.div
                className="h-2 rounded-full bg-green-600 transition-all duration-500"
                initial={{ width: 0 }}
                animate={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Category Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Object.entries(skillCategories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setCurrentCategory(key as any)}
                className={`rounded-lg border-2 p-4 transition-all ${
                  currentCategory === key
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="mb-2 flex items-center justify-center">
                  {category.icon}
                </div>
                <div className="text-sm font-medium">{category.title}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {getCurrentSkills().length} selected
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Skills Selection */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {skillCategories[currentCategory].title}
                </h3>
                <button
                  onMouseEnter={() => setShowTooltip(currentCategory)}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <LightBulbIcon className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-4 text-sm text-gray-600">
                {skillCategories[currentCategory].description}
              </p>

              {/* Tooltip */}
              <AnimatePresence>
                {showTooltip === currentCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 -mt-2 ml-4 rounded-lg bg-black p-3 text-sm text-white"
                  >
                    Select at least 3 skills that best represent your expertise
                    in this area.
                    <div className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 transform bg-black" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${skillCategories[currentCategory].title.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Custom Skill Input */}
              <div className="mb-4 flex space-x-2">
                <input
                  type="text"
                  placeholder="Add custom skill..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addCustomSkill}
                  disabled={!customInput.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Skills Grid */}
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                {filteredOptions.map((skill) => (
                  <motion.button
                    key={skill}
                    onClick={() => addSkill(skill)}
                    disabled={getCurrentSkills().includes(skill)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`rounded-lg p-2 text-sm transition-colors ${
                      getCurrentSkills().includes(skill)
                        ? 'cursor-not-allowed bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </motion.button>
                ))}
              </div>

              {filteredOptions.length === 0 && searchTerm && (
                <div className="py-8 text-center text-gray-500">
                  <p>No skills found matching "{searchTerm}"</p>
                  <p className="text-sm">
                    Try adding it as a custom skill above.
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Selected Skills & Recommendations */}
          <div className="space-y-6">
            {/* Selected Skills */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Selected Skills
              </h3>

              <div className="space-y-4">
                {Object.entries(skillCategories).map(([key, category]) => {
                  const skills =
                    key === 'primary'
                      ? primarySkills
                      : key === 'secondary'
                        ? secondarySkills
                        : key === 'technologies'
                          ? technologies
                          : certifications;

                  if (skills.length === 0) return null;

                  return (
                    <div key={key}>
                      <div className="mb-2 flex items-center text-sm font-medium text-gray-700">
                        {category.icon}
                        <span className="ml-2">{category.title}</span>
                      </div>
                      <div className="space-y-1">
                        {skills.map((skill) => (
                          <div
                            key={skill}
                            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                          >
                            <span className="text-sm text-gray-700">
                              {skill}
                            </span>
                            <button
                              onClick={() => removeSkill(skill)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {primarySkills.length === 0 &&
                secondarySkills.length === 0 &&
                technologies.length === 0 &&
                certifications.length === 0 && (
                  <div className="py-8 text-center text-gray-500">
                    <SparklesIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    <p>Start adding your skills to see them here</p>
                  </div>
                )}
            </motion.div>

            {/* Recommendations */}
            {recommendedSkills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
              >
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Recommended for You
                </h3>
                <p className="mb-4 text-sm text-gray-600">
                  Based on your selected skills, these might interest you:
                </p>

                <div className="space-y-2">
                  {recommendedSkills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => addSkill(skill)}
                      className="flex w-full items-center justify-between rounded-lg bg-blue-50 p-3 text-blue-900 transition-colors hover:bg-blue-100"
                    >
                      <span className="text-sm font-medium">{skill}</span>
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Validation Message */}
        {!isValid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4"
          >
            <p className="text-sm text-yellow-800">
              Please select at least 3 primary skills to continue. This helps us
              provide better recommendations.
            </p>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-between"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50"
          >
            Back
          </button>

          <div className="flex items-center space-x-4">
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-500 transition-colors hover:text-gray-700"
              >
                Skip for now
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isValid}
              className={`inline-flex items-center rounded-lg px-8 py-3 font-medium transition-colors ${
                isValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500'
              }`}
            >
              Continue
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingSkills;
