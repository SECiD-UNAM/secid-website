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
  LanguageIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence} from 'framer-motion';
import { useTranslations} from '../../hooks/useTranslations';

import type { OnboardingStepProps } from '../../types/onboarding';

const InterestsSelection: React.FC<OnboardingStepProps> = ({
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
  const [learningGoals, setLearningGoals] = useState<string[]>(data?.interestsSelection?.learningGoals || []);
  const [industries, setIndustries] = useState<string[]>(data['interestsSelection'].industries || []);
  const [technologies, setTechnologies] = useState<string[]>(data?.interestsSelection?.technologies || []);
  const [certifications, setCertifications] = useState<string[]>(data['interestsSelection'].certifications || []);
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>(data?.interestsSelection?.languagesSpoken || []);
  const [hobbies, setHobbies] = useState<string[]>(data['interestsSelection'].hobbies || []);

  const [currentCategory, setCurrentCategory] = useState<'skills' | 'learning' | 'industries' | 'technologies' | 'certifications' | 'languages' | 'hobbies'>('skills');
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');

  // Predefined options
  const skillsOptions = [
    'Python', 'R', 'SQL', 'Machine Learning', 'Deep Learning', 'Data Visualization',
    'Statistics', 'Business Intelligence', 'Data Mining', 'Big Data', 'Apache Spark',
    'Tableau', 'Power BI', 'Excel', 'TensorFlow', 'PyTorch', 'Scikit-learn',
    'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Plotly', 'Jupyter',
    'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch'
  ];

  const learningGoalsOptions = [
    'Machine Learning Mastery', 'Cloud Computing', 'MLOps', 'Data Engineering',
    'Advanced Statistics', 'Deep Learning', 'Natural Language Processing',
    'Computer Vision', 'Time Series Analysis', 'A/B Testing',
    'Business Analytics', 'Data Storytelling', 'Leadership Skills',
    'Project Management', 'Agile Methodologies', 'DevOps'
  ];

  const industriesOptions = [
    'Technology', 'Finance', 'Healthcare', 'E-commerce', 'Marketing',
    'Education', 'Government', 'Manufacturing', 'Energy', 'Transportation',
    'Media & Entertainment', 'Real Estate', 'Agriculture', 'Consulting',
    'Non-profit', 'Research', 'Telecommunications', 'Retail'
  ];

  const technologiesOptions = [
    'Jupyter Notebooks', 'Apache Airflow', 'Kafka', 'Hadoop', 'Spark',
    'Databricks', 'Snowflake', 'dbt', 'Looker', 'Grafana',
    'Jenkins', 'GitHub Actions', 'Terraform', 'FastAPI', 'Flask',
    'Django', 'React', 'Vue.js', 'Node.js', 'Docker'
  ];

  const certificationsOptions = [
    'AWS Certified Data Analytics', 'Google Cloud Professional Data Engineer',
    'Microsoft Azure Data Scientist', 'Tableau Desktop Specialist',
    'Cloudera Data Analyst', 'SAS Certified Data Scientist',
    'IBM Data Science Professional', 'Databricks Certified',
    'Snowflake SnowPro Core', 'Kubernetes Administrator'
  ];

  const languagesOptions = [
    'Español', 'English', 'Français', 'Deutsch', 'Italiano', 'Português',
    '中文', '日本語', '한국어', 'العربية', 'Русский', 'हिन्दी'
  ];

  const hobbiesOptions = [
    'Reading', 'Writing', 'Photography', 'Traveling', 'Gaming',
    'Music', 'Sports', 'Cooking', 'Art', 'Hiking', 'Swimming',
    'Chess', 'Board Games', 'Volunteering', 'Gardening', 'Fitness'
  ];

  const categories = [
    {
      id: 'skills',
      title: t.onboarding.interests.categories.skills.title,
      description: t.onboarding.interests.categories.skills['description'],
      icon: <CodeBracketIcon className="h-6 w-6" />,
      options: skillsOptions,
      selected: primarySkills,
      setSelected: setPrimarySkills,
      maxSelections: 10,
      minSelections: 3
    },
    {
      id: 'learning',
      title: t.onboarding.interests.categories.learning.title,
      description: t.onboarding.interests.categories.learning['description'],
      icon: <SparklesIcon className="h-6 w-6" />,
      options: learningGoalsOptions,
      selected: learningGoals,
      setSelected: setLearningGoals,
      maxSelections: 8,
      minSelections: 0
    },
    {
      id: 'industries',
      title: t.onboarding.interests.categories.industries.title,
      description: t.onboarding.interests.categories.industries['description'],
      icon: <ChartBarIcon className="h-6 w-6" />,
      options: industriesOptions,
      selected: industries,
      setSelected: setIndustries,
      maxSelections: 5,
      minSelections: 0
    },
    {
      id: 'technologies',
      title: t.onboarding.interests.categories.technologies.title,
      description: t.onboarding.interests.categories.technologies['description'],
      icon: <CpuChipIcon className="h-6 w-6" />,
      options: technologiesOptions,
      selected: technologies,
      setSelected: setTechnologies,
      maxSelections: 10,
      minSelections: 0
    },
    {
      id: 'certifications',
      title: t.onboarding.interests.categories.certifications.title,
      description: t.onboarding.interests.categories.certifications['description'],
      icon: <GlobeAltIcon className="h-6 w-6" />,
      options: certificationsOptions,
      selected: certifications,
      setSelected: setCertifications,
      maxSelections: 5,
      minSelections: 0
    },
    {
      id: 'languages',
      title: t.onboarding.interests.categories.languages.title,
      description: t.onboarding.interests.categories.languages['description'],
      icon: <LanguageIcon className="h-6 w-6" />,
      options: languagesOptions,
      selected: languagesSpoken,
      setSelected: setLanguagesSpoken,
      maxSelections: 8,
      minSelections: 0
    },
    {
      id: 'hobbies',
      title: t.onboarding.interests.categories.hobbies.title,
      description: t.onboarding.interests.categories.hobbies['description'],
      icon: <SparklesIcon className="h-6 w-6" />,
      options: hobbiesOptions,
      selected: hobbies,
      setSelected: setHobbies,
      maxSelections: 8,
      minSelections: 0
    }
  ];

  const currentCategoryData = categories.find(cat => cat.id === currentCategory);

  // Filter options based on search
  const filteredOptions = currentCategoryData?.options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !currentCategoryData.selected.includes(option)
  ) || [];

  // Toggle selection
  const toggleSelection = (option: string) => {
    if (!currentCategoryData) return;

    const { selected, setSelected, maxSelections } = currentCategoryData;
    
    if (selected.includes(option)) {
      setSelected(selected.filter(item => item !== option));
    } else if (selected.length < maxSelections) {
      setSelected([...selected, option]);
    }
  };

  // Add custom option
  const addCustomOption = () => {
    if (!currentCategoryData || !customInput.trim()) return;

    const { selected, setSelected, maxSelections, options } = currentCategoryData;
    
    if (selected.length >= maxSelections) return;
    if (selected.includes(customInput) || options.includes(customInput)) return;

    setSelected([...selected, customInput.trim()]);
    setCustomInput('');
  };

  // Remove selected option
  const removeSelection = (option: string) => {
    if (!currentCategoryData) return;
    const { selected, setSelected } = currentCategoryData;
    setSelected(selected.filter(item => item !== option));
  };

  // Validation
  const canProceed = primarySkills.length >= 3; // At least 3 primary skills required

  const handleNext = () => {
    if(canProceed) {
      onNext({
        primarySkills,
        secondarySkills,
        learningGoals,
        industries,
        technologies,
        certifications,
        languagesSpoken,
        hobbies
      });
    }
  };

  // Auto-suggest based on profile data
  const getSuggestions = () => {
    // This would typically use AI/ML to suggest based on profile
    // For now, we'll use simple heuristics
    const suggestions: string[] = [];
    
    // Add suggestions based on current company, role, etc.
    // This is a simplified example
    if (data?.profileSetup?.professional?.currentRole?.toLowerCase().includes('analyst')) {
      suggestions.push('SQL', 'Excel', 'Tableau', 'Business Intelligence');
    }
    if (data['profileSetup'].professional?.currentRole?.toLowerCase().includes('scientist')) {
      suggestions.push('Python', 'R', 'Machine Learning', 'Statistics');
    }
    if (data['profileSetup'].professional?.currentRole?.toLowerCase().includes('engineer')) {
      suggestions.push('Python', 'SQL', 'Apache Spark', 'AWS');
    }

    return suggestions.filter(s => !primarySkills.includes(s)).slice(0, 5);
  };

  const suggestions = getSuggestions();

  return (
    <div className={`interests-selection-step ${className}`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t.onboarding.interests.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.onboarding.interests.description}
          </p>
        </motion.div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-blue-50 rounded-xl p-6 mb-8"
          >
            <div className="flex items-center mb-4">
              <SparklesIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-blue-900">
                {t.onboarding.interests.suggestions.title}
              </h3>
            </div>
            <p className="text-blue-700 mb-4">
              {t.onboarding.interests.suggestions.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => toggleSelection(suggestion)}
                  className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Category Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t.onboarding.interests.categories.title}
              </h3>
              <nav className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setCurrentCategory(category.id as any);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center px-3 py-3 rounded-lg text-left transition-colors ${
                      currentCategory === category.id
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="mr-3">{category.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium">{category.title}</div>
                      <div className="text-sm opacity-75">
                        {category.selected.length}/{category.maxSelections}
                      </div>
                    </div>
                    {category.selected.length >= category.minSelections && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </nav>

              {/* Progress Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {t.onboarding.interests.progress.title}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t.onboarding.interests.categories.skills.title}:</span>
                    <span className={primarySkills.length >= 3 ? 'text-green-600' : 'text-red-600'}>
                      {primarySkills.length}/3+
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t.onboarding.interests.progress.total}:</span>
                    <span className="text-gray-600">
                      {primarySkills.length + secondarySkills.length + learningGoals.length + 
                       industries.length + technologies.length + certifications.length + 
                       languagesSpoken.length + hobbies.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              
              {/* Category Header */}
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  {currentCategoryData?.icon}
                  <h2 className="text-2xl font-bold text-gray-900 ml-3">
                    {currentCategoryData?.title}
                  </h2>
                </div>
                <p className="text-gray-600">
                  {currentCategoryData?.description}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    {currentCategoryData?.selected.length || 0} / {currentCategoryData?.maxSelections} {t.onboarding.interests.selected}
                    {currentCategoryData?.minSelections > 0 && (
                      <span className="ml-2">
                        ({t.onboarding.interests.minimum}: {currentCategoryData.minSelections})
                      </span>
                    )}
                  </div>
                  {currentCategoryData && currentCategoryData.selected.length >= currentCategoryData.minSelections && (
                    <div className="flex items-center text-green-600 text-sm">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t.onboarding.interests.completed}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Items */}
              {currentCategoryData && currentCategoryData.selected.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    {t.onboarding.interests.yourSelections}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {currentCategoryData.selected.map((item) => (
                        <motion.div
                          key={item}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-900 rounded-full"
                        >
                          <span className="text-sm font-medium">{item}</span>
                          <button
                            onClick={() => removeSelection(item)}
                            className="ml-2 p-1 hover:bg-blue-200 rounded-full transition-colors"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Search and Add Custom */}
              <div className="mb-6 space-y-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.interests.searchPlaceholder}
                  />
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomOption()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.interests.addCustomPlaceholder}
                  />
                  <button
                    onClick={addCustomOption}
                    disabled={!customInput.trim() || (currentCategoryData?.selected.length || 0) >= (currentCategoryData?.maxSelections || 0)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Available Options */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {t.onboarding.interests.availableOptions}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                  {filteredOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => toggleSelection(option)}
                      disabled={(currentCategoryData?.selected.length || 0) >= (currentCategoryData?.maxSelections || 0)}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">{option}</span>
                    </button>
                  ))}
                </div>
                
                {filteredOptions.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-gray-500">
                    {t.onboarding.interests.noResults}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
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
              disabled={!canProceed}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                canProceed
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {t.onboarding.navigation.continue}
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>

        {!canProceed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4"
          >
            <p className="text-sm text-red-600">
              {t.onboarding.interests.validation.minimumSkills}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InterestsSelection;