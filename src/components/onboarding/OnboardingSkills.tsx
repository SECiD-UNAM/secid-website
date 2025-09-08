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
  TrophyIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence} from 'framer-motion';
import { useTranslations} from '../../hooks/useTranslations';

import type { OnboardingStepProps } from '../../types/onboarding';

const OnboardingSkills: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  onBack,
  onSkip,
  progress,
  className = ''
}) => {
  const t = useTranslations();

  // Form state
  const [primarySkills, setPrimarySkills] = useState<string[]>(data['interestsSelection'].primarySkills || []);
  const [secondarySkills, setSecondarySkills] = useState<string[]>(data['interestsSelection'].secondarySkills || []);
  const [technologies, setTechnologies] = useState<string[]>(data?.interestsSelection?.technologies || []);
  const [certifications, setCertifications] = useState<string[]>(data['interestsSelection'].certifications || []);

  const [currentCategory, setCurrentCategory] = useState<'primary' | 'secondary' | 'technologies' | 'certifications'>('primary');
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
        'Python', 'R', 'SQL', 'Machine Learning', 'Deep Learning', 'Data Visualization',
        'Statistics', 'Business Intelligence', 'Data Mining', 'Big Data', 'Data Analysis',
        'Predictive Modeling', 'Statistical Analysis', 'A/B Testing', 'Data Science',
        'Artificial Intelligence', 'Natural Language Processing', 'Computer Vision'
      ]
    },
    secondary: {
      icon: <ChartBarIcon className="h-5 w-5" />,
      title: 'Supporting Skills',
      description: 'Additional skills that complement your expertise',
      options: [
        'Project Management', 'Data Storytelling', 'Presentation Skills', 'Excel',
        'Leadership', 'Agile Methodology', 'Research', 'Communication',
        'Problem Solving', 'Critical Thinking', 'Team Collaboration', 'Mentoring'
      ]
    },
    technologies: {
      icon: <CpuChipIcon className="h-5 w-5" />,
      title: 'Technologies & Tools',
      description: 'Software, platforms, and tools you work with',
      options: [
        'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib',
        'Seaborn', 'Plotly', 'Jupyter', 'Apache Spark', 'Hadoop', 'Kafka',
        'Docker', 'Kubernetes', 'Git', 'AWS', 'Azure', 'Google Cloud',
        'Tableau', 'Power BI', 'Databricks', 'Snowflake', 'MongoDB', 'PostgreSQL'
      ]
    },
    certifications: {
      icon: <TrophyIcon className="h-5 w-5" />,
      title: 'Certifications',
      description: 'Professional certifications and credentials',
      options: [
        'AWS Certified Data Analytics', 'Google Cloud Professional Data Engineer',
        'Microsoft Azure Data Scientist', 'Tableau Desktop Specialist',
        'SAS Certified Data Scientist', 'IBM Data Science Professional',
        'Cloudera Data Analyst', 'MongoDB Certified Developer',
        'Databricks Certified Associate', 'Snowflake SnowPro Core'
      ]
    }
  };

  // Filter options based on search
  const filteredOptions = skillCategories[currentCategory].options.filter(skill =>
    skill.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get current skills array based on category
  const getCurrentSkills = () => {
    switch(currentCategory) {
      case 'primary': return primarySkills;
      case 'secondary': return secondarySkills;
      case 'technologies': return technologies;
      case 'certifications': return certifications;
      default: return [];
    }
  };

  // Update skills array based on category
  const updateCurrentSkills = (newSkills: string[]) => {
    switch(currentCategory) {
      case 'primary': setPrimarySkills(newSkills); break;
      case 'secondary': setSecondarySkills(newSkills); break;
      case 'technologies': setTechnologies(newSkills); break;
      case 'certifications': setCertifications(newSkills); break;
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
    updateCurrentSkills(currentSkills.filter(s => s !== skill));
  };

  // Add custom skill
  const addCustomSkill = () => {
    if (customInput.trim() && !getCurrentSkills().includes(customInput.trim())) {
      addSkill(customInput.trim());
      setCustomInput('');
    }
  };

  // Generate personalized recommendations based on existing skills
  useEffect(() => {
    const allSelectedSkills = [...primarySkills, ...secondarySkills, ...technologies];
    const recommendations = [];

    // ML/AI recommendations
    if (allSelectedSkills.some(skill => ['Python', 'Machine Learning', 'Statistics'].includes(skill))) {
      recommendations.push('Deep Learning', 'TensorFlow', 'PyTorch', 'Computer Vision');
    }

    // Data Engineering recommendations
    if (allSelectedSkills.some(skill => ['SQL', 'Big Data', 'Python'].includes(skill))) {
      recommendations.push('Apache Spark', 'Docker', 'AWS', 'Data Pipelines');
    }

    // Business Intelligence recommendations
    if (allSelectedSkills.some(skill => ['Data Visualization', 'Business Intelligence'].includes(skill))) {
      recommendations.push('Tableau', 'Power BI', 'Data Storytelling');
    }

    setRecommendedSkills(recommendations.filter(rec => !allSelectedSkills.includes(rec)).slice(0, 6));
  }, [primarySkills, secondarySkills, technologies]);

  // Validation
  const isValid = primarySkills.length >= 3;
  const completeness = Math.min(100, (primarySkills.length * 20) + (secondarySkills.length * 10) + (technologies.length * 5));

  const handleNext = () => {
    if(isValid) {
      onNext({
        primarySkills,
        secondarySkills,
        learningGoals: data?.interestsSelection?.learningGoals,
        industries: data['interestsSelection'].industries,
        technologies,
        certifications,
        languagesSpoken: data?.interestsSelection?.languagesSpoken,
        hobbies: data['interestsSelection'].hobbies
      });
    }
  };

  return (
    <div className={`onboarding-skills ${className}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <SparklesIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tell us about your skills
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Help us understand your expertise so we can connect you with relevant opportunities and peers.
          </p>
          
          {/* Progress Indicator */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Profile Completeness</span>
              <span>{completeness}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(skillCategories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setCurrentCategory(key as any)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  currentCategory === key
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  {category.icon}
                </div>
                <div className="text-sm font-medium">{category.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {getCurrentSkills().length} selected
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Skills Selection */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
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
              
              <p className="text-sm text-gray-600 mb-4">
                {skillCategories[currentCategory].description}
              </p>

              {/* Tooltip */}
              <AnimatePresence>
                {showTooltip === currentCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 p-3 bg-black text-white text-sm rounded-lg -mt-2 ml-4"
                  >
                    Select at least 3 skills that best represent your expertise in this area.
                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-black transform rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${skillCategories[currentCategory].title.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Custom Skill Input */}
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="Add custom skill..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addCustomSkill}
                  disabled={!customInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {filteredOptions.map((skill) => (
                  <motion.button
                    key={skill}
                    onClick={() => addSkill(skill)}
                    disabled={getCurrentSkills().includes(skill)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      getCurrentSkills().includes(skill)
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </motion.button>
                ))}
              </div>

              {filteredOptions.length === 0 && searchTerm && (
                <div className="text-center py-8 text-gray-500">
                  <p>No skills found matching "{searchTerm}"</p>
                  <p className="text-sm">Try adding it as a custom skill above.</p>
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
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Skills
              </h3>
              
              <div className="space-y-4">
                {Object.entries(skillCategories).map(([key, category]) => {
                  const skills = key === 'primary' ? primarySkills :
                                key === 'secondary' ? secondarySkills :
                                key === 'technologies' ? technologies :
                                certifications;
                  
                  if (skills.length === 0) return null;
                  
                  return (
                    <div key={key}>
                      <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        {category.icon}
                        <span className="ml-2">{category.title}</span>
                      </div>
                      <div className="space-y-1">
                        {skills.map((skill) => (
                          <div
                            key={skill}
                            className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                          >
                            <span className="text-sm text-gray-700">{skill}</span>
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

              {primarySkills.length === 0 && secondarySkills.length === 0 && technologies.length === 0 && certifications.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <SparklesIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recommended for You
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Based on your selected skills, these might interest you:
                </p>
                
                <div className="space-y-2">
                  {recommendedSkills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => addSkill(skill)}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-900 rounded-lg hover:bg-blue-100 transition-colors"
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
            className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <p className="text-sm text-yellow-800">
              Please select at least 3 primary skills to continue. This helps us provide better recommendations.
            </p>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between mt-8"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>

          <div className="flex items-center space-x-4">
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip for now
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isValid}
              className={`inline-flex items-center px-8 py-3 rounded-lg font-medium transition-colors ${
                isValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue
              <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingSkills;