import React, { useState, useEffect } from 'react';
import {
  HeartIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  UserGroupIcon,
  TrophyIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  LightBulbIcon,
  ChartBarIcon,
  GlobeAltIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import type { OnboardingStepProps } from '../../types/onboarding';

const OnboardingInterests: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  onBack,
  onSkip,
  progress,
  className = ''
}) => {
  const t = useTranslations();

  // Form state - Career Goals
  const [shortTermGoals, setShortTermGoals] = useState<string[]>(
    data['goalsDefinition'].careerGoals.shortTerm || []
  );
  const [longTermGoals, setLongTermGoals] = useState<string[]>(
    data['goalsDefinition'].careerGoals.longTerm || []
  );
  const [dreamRole, setDreamRole] = useState(
    data?.goalsDefinition?.careerGoals.dreamRole || ''
  );
  const [targetCompanies, setTargetCompanies] = useState<string[]>(
    data['goalsDefinition'].careerGoals.targetCompanies || []
  );
  const [salaryRange, setSalaryRange] = useState({
    min: data['goalsDefinition'].careerGoals?.targetSalaryRange?.min || '',
    max: data['goalsDefinition'].careerGoals?.targetSalaryRange?.max || '',
    currency: data['goalsDefinition'].careerGoals?.targetSalaryRange?.currency || 'MXN'
  });

  // Learning Goals
  const [skillsToLearn, setSkillsToLearn] = useState<string[]>(
    data['goalsDefinition'].learningGoals.skillsToLearn || []
  );
  const [certificationGoals, setCertificationGoals] = useState<string[]>(
    data['goalsDefinition'].learningGoals.certificationGoals || []
  );
  const [timeCommitment, setTimeCommitment] = useState<'casual' | 'regular' | 'intensive'>(
    data['goalsDefinition'].learningGoals.timeCommitment || 'regular'
  );
  const [learningStyle, setLearningStyle] = useState<'self-paced' | 'structured' | 'mentored' | 'group'>(
    data['goalsDefinition'].learningGoals.preferredLearningStyle || 'self-paced'
  );

  // Networking Goals
  const [connectionTargets, setConnectionTargets] = useState(
    data['goalsDefinition'].networkingGoals.connectionTargets || 10
  );
  const [mentorshipInterest, setMentorshipInterest] = useState<'mentor' | 'mentee' | 'both' | 'none'>(
    data['goalsDefinition'].networkingGoals.mentorshipInterest || 'none'
  );
  const [eventParticipation, setEventParticipation] = useState<'active' | 'occasional' | 'observer'>(
    data['goalsDefinition'].networkingGoals.eventParticipation || 'occasional'
  );
  const [contributionLevel, setContributionLevel] = useState<'content-creator' | 'discussion-participant' | 'consumer'>(
    data['goalsDefinition'].networkingGoals.contributionLevel || 'discussion-participant'
  );

  // Industries & interests from previous step
  const [industries, setIndustries] = useState<string[]>(
    data['interestsSelection'].industries || []
  );
  const [learningGoals, setLearningGoals] = useState<string[]>(
    data['interestsSelection'].learningGoals || []
  );
  const [hobbies, setHobbies] = useState<string[]>(
    data?.interestsSelection?.hobbies || []
  );

  const [currentSection, setCurrentSection] = useState<'career' | 'learning' | 'networking' | 'interests'>('career');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [companyInput, setCompanyInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  // Predefined options
  const careerGoalOptions = [
    'Get promoted to senior role', 'Switch to management track', 'Become a technical lead',
    'Start my own company', 'Work for a FAANG company', 'Join a startup',
    'Transition to consulting', 'Move to data engineering', 'Focus on AI/ML research',
    'Become a product manager', 'Work remotely full-time', 'Freelance consultant'
  ];

  const learningSkillOptions = [
    'Advanced Machine Learning', 'Cloud Architecture', 'Data Engineering',
    'Product Management', 'Leadership Skills', 'Public Speaking',
    'Technical Writing', 'System Design', 'MLOps', 'DevOps',
    'Blockchain', 'Cybersecurity', 'UX/UI Design', 'Business Strategy'
  ];

  const industryOptions = [
    'Technology', 'Financial Services', 'Healthcare', 'E-commerce',
    'Consulting', 'Media & Entertainment', 'Government', 'Education',
    'Automotive', 'Energy', 'Telecommunications', 'Retail',
    'Manufacturing', 'Real Estate', 'Travel & Hospitality', 'Gaming'
  ];

  const hobbyOptions = [
    'Open Source Contributing', 'Blogging', 'Photography', 'Travel',
    'Reading', 'Gaming', 'Cooking', 'Sports', 'Music', 'Art',
    'Volunteering', 'Gardening', 'Fitness', 'Learning Languages'
  ];

  const topCompanies = [
    'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix',
    'Uber', 'Airbnb', 'Spotify', 'Tesla', 'NVIDIA', 'Adobe',
    'Salesforce', 'IBM', 'Oracle', 'Intel', 'Cisco', 'Twitter'
  ];

  // Add/remove functions
  const addToArray = (item: string, array: string[], setArray: (arr: string[]) => void) => {
    if (item.trim() && !array.includes(item.trim())) {
      setArray([...array, item.trim()]);
    }
  };

  const removeFromArray = (item: string, array: string[], setArray: (arr: string[]) => void) => {
    setArray(array.filter(i => i !== item));
  };

  // Section navigation
  const sections = [
    { id: 'career', title: 'Career Goals', icon: <BriefcaseIcon className="h-5 w-5" /> },
    { id: 'learning', title: 'Learning', icon: <AcademicCapIcon className="h-5 w-5" /> },
    { id: 'networking', title: 'Networking', icon: <UserGroupIcon className="h-5 w-5" /> },
    { id: 'interests', title: 'Interests', icon: <HeartIcon className="h-5 w-5" /> }
  ];

  // Validation
  const isValid = shortTermGoals.length > 0 || longTermGoals.length > 0 || skillsToLearn.length > 0;
  const completeness = Math.min(100, 
    (shortTermGoals.length * 10) + 
    (longTermGoals.length * 10) + 
    (skillsToLearn.length * 8) + 
    (industries.length * 5) + 
    (dreamRole ? 15 : 0) + 
    (targetCompanies.length * 5)
  );

  const handleNext = () => {
    if(isValid) {
      onNext({
        careerGoals: {
          shortTerm: shortTermGoals,
          longTerm: longTermGoals,
          dreamRole,
          targetCompanies,
          targetSalaryRange: {
            min: salaryRange.min ? Number(salaryRange.min) : undefined,
            max: salaryRange.max ? Number(salaryRange.max) : undefined,
            currency: salaryRange.currency as 'MXN' | 'USD' | 'EUR'
          }
        },
        learningGoals: {
          skillsToLearn,
          certificationGoals,
          timeCommitment,
          preferredLearningStyle: learningStyle
        },
        networkingGoals: {
          connectionTargets,
          mentorshipInterest,
          eventParticipation,
          contributionLevel
        }
      });
    }
  };

  const renderCareerSection = () => (
    <div className="space-y-8">
      {/* Short-term Goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Short-term Goals (6-12 months)</h3>
          <button
            onMouseEnter={() => setShowTooltip('short-term')}
            onMouseLeave={() => setShowTooltip(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <LightBulbIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {careerGoalOptions.slice(0, 6).map((goal) => (
            <button
              key={goal}
              onClick={() => addToArray(goal, shortTermGoals, setShortTermGoals)}
              disabled={shortTermGoals.includes(goal)}
              className={`p-3 text-sm rounded-lg transition-colors ${
                shortTermGoals.includes(goal)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {shortTermGoals.map((goal) => (
            <span
              key={goal}
              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {goal}
              <button
                onClick={() => removeFromArray(goal, shortTermGoals, setShortTermGoals)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Long-term Goals */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Long-term Goals (2-5 years)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {careerGoalOptions.slice(6).map((goal) => (
            <button
              key={goal}
              onClick={() => addToArray(goal, longTermGoals, setLongTermGoals)}
              disabled={longTermGoals.includes(goal)}
              className={`p-3 text-sm rounded-lg transition-colors ${
                longTermGoals.includes(goal)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {longTermGoals.map((goal) => (
            <span
              key={goal}
              className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
            >
              {goal}
              <button
                onClick={() => removeFromArray(goal, longTermGoals, setLongTermGoals)}
                className="ml-2 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Dream Role */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dream Role</h3>
        <input
          type="text"
          placeholder="e.g., Senior Data Scientist at a tech startup"
          value={dreamRole}
          onChange={(e) => setDreamRole(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Target Companies */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Companies</h3>
        
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            placeholder="Add company name..."
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addToArray(companyInput, targetCompanies, setTargetCompanies);
                setCompanyInput('');
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              addToArray(companyInput, targetCompanies, setTargetCompanies);
              setCompanyInput('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {topCompanies.map((company) => (
            <button
              key={company}
              onClick={() => addToArray(company, targetCompanies, setTargetCompanies)}
              disabled={targetCompanies.includes(company)}
              className={`p-2 text-sm rounded-lg transition-colors ${
                targetCompanies.includes(company)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {company}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {targetCompanies.map((company) => (
            <span
              key={company}
              className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
            >
              {company}
              <button
                onClick={() => removeFromArray(company, targetCompanies, setTargetCompanies)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Salary Range */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Salary Range (Optional)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum</label>
            <input
              type="number"
              placeholder="50000"
              value={salaryRange.min}
              onChange={(e) => setSalaryRange(prev => ({ ...prev, min: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum</label>
            <input
              type="number"
              placeholder="80000"
              value={salaryRange.max}
              onChange={(e) => setSalaryRange(prev => ({ ...prev, max: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select
              value={salaryRange.currency}
              onChange={(e) => setSalaryRange(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLearningSection = () => (
    <div className="space-y-8">
      {/* Skills to Learn */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills You Want to Learn</h3>
        
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            placeholder="Add skill..."
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addToArray(skillInput, skillsToLearn, setSkillsToLearn);
                setSkillInput('');
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              addToArray(skillInput, skillsToLearn, setSkillsToLearn);
              setSkillInput('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {learningSkillOptions.map((skill) => (
            <button
              key={skill}
              onClick={() => addToArray(skill, skillsToLearn, setSkillsToLearn)}
              disabled={skillsToLearn.includes(skill)}
              className={`p-3 text-sm rounded-lg transition-colors ${
                skillsToLearn.includes(skill)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {skillsToLearn.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {skill}
              <button
                onClick={() => removeFromArray(skill, skillsToLearn, setSkillsToLearn)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Time Commitment */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Time Commitment</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'casual', label: 'Casual', desc: '1-3 hours/week', icon: <ClockIcon className="h-5 w-5" /> },
            { value: 'regular', label: 'Regular', desc: '4-10 hours/week', icon: <ChartBarIcon className="h-5 w-5" /> },
            { value: 'intensive', label: 'Intensive', desc: '10+ hours/week', icon: <TrophyIcon className="h-5 w-5" /> }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeCommitment(option.value as any)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                timeCommitment === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                {option.icon}
              </div>
              <div className="font-medium">{option.label}</div>
              <div className="text-sm opacity-75">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Learning Style */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferred Learning Style</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: 'self-paced', label: 'Self-Paced', desc: 'Learn at your own speed' },
            { value: 'structured', label: 'Structured', desc: 'Follow a curriculum' },
            { value: 'mentored', label: 'Mentored', desc: 'Learn with guidance' },
            { value: 'group', label: 'Group', desc: 'Learn with others' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setLearningStyle(option.value as any)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                learningStyle === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm opacity-75">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNetworkingSection = () => (
    <div className="space-y-8">
      {/* Connection Targets */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Networking Goals</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How many new professional connections would you like to make?
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={connectionTargets}
              onChange={(e) => setConnectionTargets(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>5</span>
              <span className="font-medium text-blue-600">{connectionTargets} connections</span>
              <span>50+</span>
            </div>
          </div>

          {/* Mentorship Interest */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mentorship Interest
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { value: 'mentor', label: 'Be a Mentor', desc: 'Help others grow' },
                { value: 'mentee', label: 'Find Mentors', desc: 'Learn from experts' },
                { value: 'both', label: 'Both', desc: 'Mentor and learn' },
                { value: 'none', label: 'Not Interested', desc: 'Focus elsewhere' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMentorshipInterest(option.value as any)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    mentorshipInterest === option.value
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Event Participation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Participation Level
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'active', label: 'Active', desc: 'Frequently attend and participate' },
                { value: 'occasional', label: 'Occasional', desc: 'Attend when interested' },
                { value: 'observer', label: 'Observer', desc: 'Prefer to watch and learn' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEventParticipation(option.value as any)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    eventParticipation === option.value
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm opacity-75">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInterestsSection = () => (
    <div className="space-y-8">
      {/* Industries */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Industries of Interest</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {industryOptions.map((industry) => (
            <button
              key={industry}
              onClick={() => addToArray(industry, industries, setIndustries)}
              disabled={industries.includes(industry)}
              className={`p-3 text-sm rounded-lg transition-colors ${
                industries.includes(industry)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {industry}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {industries.map((industry) => (
            <span
              key={industry}
              className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
            >
              {industry}
              <button
                onClick={() => removeFromArray(industry, industries, setIndustries)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Hobbies */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hobbies & Interests</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {hobbyOptions.map((hobby) => (
            <button
              key={hobby}
              onClick={() => addToArray(hobby, hobbies, setHobbies)}
              disabled={hobbies.includes(hobby)}
              className={`p-3 text-sm rounded-lg transition-colors ${
                hobbies.includes(hobby)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {hobby}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {hobbies.map((hobby) => (
            <span
              key={hobby}
              className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
            >
              {hobby}
              <button
                onClick={() => removeFromArray(hobby, hobbies, setHobbies)}
                className="ml-2 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`onboarding-interests ${className}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <HeartIcon className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            What are your goals and interests?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Help us understand your aspirations so we can provide personalized recommendations and connect you with like-minded professionals.
          </p>
          
          {/* Progress Indicator */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Profile Completeness</span>
              <span>{completeness}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                initial={{ width: 0 }}
                animate={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Section Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id as any)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  currentSection === section.id
                    ? 'border-purple-600 bg-purple-50 text-purple-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  {section.icon}
                </div>
                <div className="text-sm font-medium">{section.title}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Section Content */}
        <motion.div
          key={currentSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8"
        >
          {currentSection === 'career' && renderCareerSection()}
          {currentSection === 'learning' && renderLearningSection()}
          {currentSection === 'networking' && renderNetworkingSection()}
          {currentSection === 'interests' && renderInterestsSection()}
        </motion.div>

        {/* Validation Message */}
        {!isValid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <p className="text-sm text-yellow-800">
              Please set at least one goal or learning objective to continue. This helps us provide better recommendations.
            </p>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between"
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
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
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

export default OnboardingInterests;