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
  SparklesIcon,
} from '@heroicons/react/24/outline';

import type { OnboardingStepProps } from '../../types/onboarding';

const OnboardingInterests: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  onBack,
  onSkip,
  progress,
  className = '',
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
    currency:
      data['goalsDefinition'].careerGoals?.targetSalaryRange?.currency || 'MXN',
  });

  // Learning Goals
  const [skillsToLearn, setSkillsToLearn] = useState<string[]>(
    data['goalsDefinition'].learningGoals.skillsToLearn || []
  );
  const [certificationGoals, setCertificationGoals] = useState<string[]>(
    data['goalsDefinition'].learningGoals.certificationGoals || []
  );
  const [timeCommitment, setTimeCommitment] = useState<
    'casual' | 'regular' | 'intensive'
  >(data['goalsDefinition'].learningGoals.timeCommitment || 'regular');
  const [learningStyle, setLearningStyle] = useState<
    'self-paced' | 'structured' | 'mentored' | 'group'
  >(
    data['goalsDefinition'].learningGoals.preferredLearningStyle || 'self-paced'
  );

  // Networking Goals
  const [connectionTargets, setConnectionTargets] = useState(
    data['goalsDefinition'].networkingGoals.connectionTargets || 10
  );
  const [mentorshipInterest, setMentorshipInterest] = useState<
    'mentor' | 'mentee' | 'both' | 'none'
  >(data['goalsDefinition'].networkingGoals.mentorshipInterest || 'none');
  const [eventParticipation, setEventParticipation] = useState<
    'active' | 'occasional' | 'observer'
  >(data['goalsDefinition'].networkingGoals.eventParticipation || 'occasional');
  const [contributionLevel, setContributionLevel] = useState<
    'content-creator' | 'discussion-participant' | 'consumer'
  >(
    data['goalsDefinition'].networkingGoals.contributionLevel ||
      'discussion-participant'
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

  const [currentSection, setCurrentSection] = useState<
    'career' | 'learning' | 'networking' | 'interests'
  >('career');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [companyInput, setCompanyInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  // Predefined options
  const careerGoalOptions = [
    'Get promoted to senior role',
    'Switch to management track',
    'Become a technical lead',
    'Start my own company',
    'Work for a FAANG company',
    'Join a startup',
    'Transition to consulting',
    'Move to data engineering',
    'Focus on AI/ML research',
    'Become a product manager',
    'Work remotely full-time',
    'Freelance consultant',
  ];

  const learningSkillOptions = [
    'Advanced Machine Learning',
    'Cloud Architecture',
    'Data Engineering',
    'Product Management',
    'Leadership Skills',
    'Public Speaking',
    'Technical Writing',
    'System Design',
    'MLOps',
    'DevOps',
    'Blockchain',
    'Cybersecurity',
    'UX/UI Design',
    'Business Strategy',
  ];

  const industryOptions = [
    'Technology',
    'Financial Services',
    'Healthcare',
    'E-commerce',
    'Consulting',
    'Media & Entertainment',
    'Government',
    'Education',
    'Automotive',
    'Energy',
    'Telecommunications',
    'Retail',
    'Manufacturing',
    'Real Estate',
    'Travel & Hospitality',
    'Gaming',
  ];

  const hobbyOptions = [
    'Open Source Contributing',
    'Blogging',
    'Photography',
    'Travel',
    'Reading',
    'Gaming',
    'Cooking',
    'Sports',
    'Music',
    'Art',
    'Volunteering',
    'Gardening',
    'Fitness',
    'Learning Languages',
  ];

  const topCompanies = [
    'Google',
    'Microsoft',
    'Amazon',
    'Meta',
    'Apple',
    'Netflix',
    'Uber',
    'Airbnb',
    'Spotify',
    'Tesla',
    'NVIDIA',
    'Adobe',
    'Salesforce',
    'IBM',
    'Oracle',
    'Intel',
    'Cisco',
    'Twitter',
  ];

  // Add/remove functions
  const addToArray = (
    item: string,
    array: string[],
    setArray: (arr: string[]) => void
  ) => {
    if (item.trim() && !array.includes(item.trim())) {
      setArray([...array, item.trim()]);
    }
  };

  const removeFromArray = (
    item: string,
    array: string[],
    setArray: (arr: string[]) => void
  ) => {
    setArray(array.filter((i) => i !== item));
  };

  // Section navigation
  const sections = [
    {
      id: 'career',
      title: 'Career Goals',
      icon: <BriefcaseIcon className="h-5 w-5" />,
    },
    {
      id: 'learning',
      title: 'Learning',
      icon: <AcademicCapIcon className="h-5 w-5" />,
    },
    {
      id: 'networking',
      title: 'Networking',
      icon: <UserGroupIcon className="h-5 w-5" />,
    },
    {
      id: 'interests',
      title: 'Interests',
      icon: <HeartIcon className="h-5 w-5" />,
    },
  ];

  // Validation
  const isValid =
    shortTermGoals.length > 0 ||
    longTermGoals.length > 0 ||
    skillsToLearn.length > 0;
  const completeness = Math.min(
    100,
    shortTermGoals.length * 10 +
      longTermGoals.length * 10 +
      skillsToLearn.length * 8 +
      industries.length * 5 +
      (dreamRole ? 15 : 0) +
      targetCompanies.length * 5
  );

  const handleNext = () => {
    if (isValid) {
      onNext({
        careerGoals: {
          shortTerm: shortTermGoals,
          longTerm: longTermGoals,
          dreamRole,
          targetCompanies,
          targetSalaryRange: {
            min: salaryRange.min ? Number(salaryRange.min) : undefined,
            max: salaryRange.max ? Number(salaryRange.max) : undefined,
            currency: salaryRange.currency as 'MXN' | 'USD' | 'EUR',
          },
        },
        learningGoals: {
          skillsToLearn,
          certificationGoals,
          timeCommitment,
          preferredLearningStyle: learningStyle,
        },
        networkingGoals: {
          connectionTargets,
          mentorshipInterest,
          eventParticipation,
          contributionLevel,
        },
      });
    }
  };

  const renderCareerSection = () => (
    <div className="space-y-8">
      {/* Short-term Goals */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Short-term Goals (6-12 months)
          </h3>
          <button
            onMouseEnter={() => setShowTooltip('short-term')}
            onMouseLeave={() => setShowTooltip(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <LightBulbIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {careerGoalOptions.slice(0, 6).map((goal) => (
            <button
              key={goal}
              onClick={() =>
                addToArray(goal, shortTermGoals, setShortTermGoals)
              }
              disabled={shortTermGoals.includes(goal)}
              className={`rounded-lg p-3 text-sm transition-colors ${
                shortTermGoals.includes(goal)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {shortTermGoals.map((goal) => (
            <span
              key={goal}
              className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
            >
              {goal}
              <button
                onClick={() =>
                  removeFromArray(goal, shortTermGoals, setShortTermGoals)
                }
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Long-term Goals (2-5 years)
        </h3>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {careerGoalOptions.slice(6).map((goal) => (
            <button
              key={goal}
              onClick={() => addToArray(goal, longTermGoals, setLongTermGoals)}
              disabled={longTermGoals.includes(goal)}
              className={`rounded-lg p-3 text-sm transition-colors ${
                longTermGoals.includes(goal)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {longTermGoals.map((goal) => (
            <span
              key={goal}
              className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800"
            >
              {goal}
              <button
                onClick={() =>
                  removeFromArray(goal, longTermGoals, setLongTermGoals)
                }
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Dream Role</h3>
        <input
          type="text"
          placeholder="e.g., Senior Data Scientist at a tech startup"
          value={dreamRole}
          onChange={(e) => setDreamRole(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Target Companies */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Target Companies
        </h3>

        <div className="mb-4 flex space-x-2">
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
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              addToArray(companyInput, targetCompanies, setTargetCompanies);
              setCompanyInput('');
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 lg:grid-cols-4">
          {topCompanies.map((company) => (
            <button
              key={company}
              onClick={() =>
                addToArray(company, targetCompanies, setTargetCompanies)
              }
              disabled={targetCompanies.includes(company)}
              className={`rounded-lg p-2 text-sm transition-colors ${
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
              className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
            >
              {company}
              <button
                onClick={() =>
                  removeFromArray(company, targetCompanies, setTargetCompanies)
                }
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Target Salary Range (Optional)
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Minimum
            </label>
            <input
              type="number"
              placeholder="50000"
              value={salaryRange.min}
              onChange={(e) =>
                setSalaryRange((prev) => ({ ...prev, min: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Maximum
            </label>
            <input
              type="number"
              placeholder="80000"
              value={salaryRange.max}
              onChange={(e) =>
                setSalaryRange((prev) => ({ ...prev, max: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              value={salaryRange.currency}
              onChange={(e) =>
                setSalaryRange((prev) => ({
                  ...prev,
                  currency: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Skills You Want to Learn
        </h3>

        <div className="mb-4 flex space-x-2">
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
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              addToArray(skillInput, skillsToLearn, setSkillsToLearn);
              setSkillInput('');
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {learningSkillOptions.map((skill) => (
            <button
              key={skill}
              onClick={() => addToArray(skill, skillsToLearn, setSkillsToLearn)}
              disabled={skillsToLearn.includes(skill)}
              className={`rounded-lg p-3 text-sm transition-colors ${
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
              className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
            >
              {skill}
              <button
                onClick={() =>
                  removeFromArray(skill, skillsToLearn, setSkillsToLearn)
                }
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Learning Time Commitment
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              value: 'casual',
              label: 'Casual',
              desc: '1-3 hours/week',
              icon: <ClockIcon className="h-5 w-5" />,
            },
            {
              value: 'regular',
              label: 'Regular',
              desc: '4-10 hours/week',
              icon: <ChartBarIcon className="h-5 w-5" />,
            },
            {
              value: 'intensive',
              label: 'Intensive',
              desc: '10+ hours/week',
              icon: <TrophyIcon className="h-5 w-5" />,
            },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeCommitment(option.value as any)}
              className={`rounded-lg border-2 p-4 transition-colors ${
                timeCommitment === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="mb-2 flex items-center justify-center">
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Preferred Learning Style
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              value: 'self-paced',
              label: 'Self-Paced',
              desc: 'Learn at your own speed',
            },
            {
              value: 'structured',
              label: 'Structured',
              desc: 'Follow a curriculum',
            },
            {
              value: 'mentored',
              label: 'Mentored',
              desc: 'Learn with guidance',
            },
            { value: 'group', label: 'Group', desc: 'Learn with others' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setLearningStyle(option.value as any)}
              className={`rounded-lg border-2 p-4 transition-colors ${
                learningStyle === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Networking Goals
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
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
            <div className="mt-1 flex justify-between text-sm text-gray-500">
              <span>5</span>
              <span className="font-medium text-blue-600">
                {connectionTargets} connections
              </span>
              <span>50+</span>
            </div>
          </div>

          {/* Mentorship Interest */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Mentorship Interest
            </label>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  value: 'mentor',
                  label: 'Be a Mentor',
                  desc: 'Help others grow',
                },
                {
                  value: 'mentee',
                  label: 'Find Mentors',
                  desc: 'Learn from experts',
                },
                { value: 'both', label: 'Both', desc: 'Mentor and learn' },
                {
                  value: 'none',
                  label: 'Not Interested',
                  desc: 'Focus elsewhere',
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMentorshipInterest(option.value as any)}
                  className={`rounded-lg border-2 p-3 transition-colors ${
                    mentorshipInterest === option.value
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Event Participation */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Event Participation Level
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  value: 'active',
                  label: 'Active',
                  desc: 'Frequently attend and participate',
                },
                {
                  value: 'occasional',
                  label: 'Occasional',
                  desc: 'Attend when interested',
                },
                {
                  value: 'observer',
                  label: 'Observer',
                  desc: 'Prefer to watch and learn',
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEventParticipation(option.value as any)}
                  className={`rounded-lg border-2 p-4 transition-colors ${
                    eventParticipation === option.value
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Industries of Interest
        </h3>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {industryOptions.map((industry) => (
            <button
              key={industry}
              onClick={() => addToArray(industry, industries, setIndustries)}
              disabled={industries.includes(industry)}
              className={`rounded-lg p-3 text-sm transition-colors ${
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
              className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
            >
              {industry}
              <button
                onClick={() =>
                  removeFromArray(industry, industries, setIndustries)
                }
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
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Hobbies & Interests
        </h3>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {hobbyOptions.map((hobby) => (
            <button
              key={hobby}
              onClick={() => addToArray(hobby, hobbies, setHobbies)}
              disabled={hobbies.includes(hobby)}
              className={`rounded-lg p-3 text-sm transition-colors ${
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
              className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800"
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
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <HeartIcon className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            What are your goals and interests?
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Help us understand your aspirations so we can provide personalized
            recommendations and connect you with like-minded professionals.
          </p>

          {/* Progress Indicator */}
          <div className="mx-auto mt-6 max-w-md">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Profile Completeness</span>
              <span>{completeness}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <motion.div
                className="h-2 rounded-full bg-purple-600 transition-all duration-500"
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id as any)}
                className={`rounded-lg border-2 p-4 transition-all ${
                  currentSection === section.id
                    ? 'border-purple-600 bg-purple-50 text-purple-900'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="mb-2 flex items-center justify-center">
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
          className="mb-8 rounded-xl border border-gray-200 bg-white p-8 shadow-lg"
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
            className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4"
          >
            <p className="text-sm text-yellow-800">
              Please set at least one goal or learning objective to continue.
              This helps us provide better recommendations.
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
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
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

export default OnboardingInterests;
