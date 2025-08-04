import React, { useState, useEffect } from 'react';
import { 
import { CheckIcon} from '@heroicons/react/24/solid';
import { motion, AnimatePresence} from 'framer-motion';
import { useTranslations} from '../../hooks/useTranslations';

  UserPlusIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  AcademicCapIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

import type { OnboardingStepProps } from '../../types/onboarding';
import type { MemberProfile } from '../../types/member';

const ConnectionSuggestions: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  onBack,
  onSkip,
  progress,
  className = ''
}) => {
  const t = useTranslations();

  // Form state
  const [selectedConnections, setSelectedConnections] = useState<string[]>(
    data['connectionSuggestions'].selectedConnections || []
  );
  const [connectionCriteria, setConnectionCriteria] = useState({
    sameCompany: data['connectionSuggestions'].connectionCriteria.sameCompany ?? true,
    sameLocation: data?.connectionSuggestions?.connectionCriteria.sameLocation ?? true,
    similarSkills: data['connectionSuggestions'].connectionCriteria.similarSkills ?? true,
    similarGoals: data?.connectionSuggestions?.connectionCriteria.similarGoals ?? true,
    mentorshipMatch: data['connectionSuggestions'].connectionCriteria.mentorshipMatch ?? false
  });
  const [privacySettings, setPrivacySettings] = useState({
    allowDiscovery: data?.connectionSuggestions?.privacySettings.allowDiscovery ?? true,
    showInDirectory: data['connectionSuggestions'].privacySettings.showInDirectory ?? true,
    allowDirectMessages: data?.connectionSuggestions?.privacySettings.allowDirectMessages ?? true
  });

  const [currentTab, setCurrentTab] = useState<'suggestions' | 'criteria' | 'privacy'>('suggestions');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock member suggestions - in real implementation, this would come from API
  const [suggestedMembers] = useState<MemberProfile[]>([
    {
      uid: 'user1',
      displayName: 'María González',
      initials: 'MG',
      isOnline: true,
      lastSeen: new Date(),
      joinedAt: new Date(2023, 0, 15),
      email: 'maria.gonzalez@example.com',
      avatar: '',
      skills: ['Python', 'Machine Learning', 'Data Analysis'],
      location: { city: 'Ciudad de México', country: 'México' },
      bio: 'Data Scientist at Microsoft with 5 years of experience in ML and analytics.',
      company: 'Microsoft',
      jobTitle: 'Senior Data Scientist',
      experience: {
        years: 5,
        level: 'senior',
        currentRole: 'Senior Data Scientist',
        previousRoles: [],
        industries: ['Technology']
      },
      social: {
        linkedin: 'https://linkedin.com/in/mariagonzalez'
      },
      networking: {
        connections: [],
        pendingConnections: [],
        blockedUsers: [],
        followers: [],
        following: [],
        availableForMentoring: true,
        openToOpportunities: false
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
        showCurrentCompany: true,
        showSalaryExpectations: false,
        allowMessages: 'all',
        allowConnectionRequests: true,
        showOnlineStatus: true,
        showLastSeen: true
      },
      activity: {
        profileViews: 125,
        totalConnections: 45,
        postsCount: 12,
        commentsCount: 34,
        helpfulVotes: 67,
        reputation: 85,
        lastActive: new Date()
      },
      searchableKeywords: ['python', 'machine learning', 'data science'],
      featuredSkills: ['Python', 'Machine Learning', 'Data Analysis'],
      isPremium: false
    },
    {
      uid: 'user2',
      displayName: 'Carlos Rodríguez',
      initials: 'CR',
      isOnline: false,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      joinedAt: new Date(2022, 8, 10),
      email: 'carlos.rodriguez@example.com',
      avatar: '',
      skills: ['R', 'Statistics', 'Business Intelligence'],
      location: { city: 'Guadalajara', country: 'México' },
      bio: 'Lead Data Analyst at BBVA, passionate about statistical modeling and BI.',
      company: 'BBVA',
      jobTitle: 'Lead Data Analyst',
      experience: {
        years: 7,
        level: 'lead',
        currentRole: 'Lead Data Analyst',
        previousRoles: [],
        industries: ['Finance']
      },
      social: {
        linkedin: 'https://linkedin.com/in/carlosrodriguez'
      },
      networking: {
        connections: [],
        pendingConnections: [],
        blockedUsers: [],
        followers: [],
        following: [],
        availableForMentoring: true,
        openToOpportunities: false
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
        showCurrentCompany: true,
        showSalaryExpectations: false,
        allowMessages: 'all',
        allowConnectionRequests: true,
        showOnlineStatus: true,
        showLastSeen: true
      },
      activity: {
        profileViews: 89,
        totalConnections: 32,
        postsCount: 8,
        commentsCount: 21,
        helpfulVotes: 45,
        reputation: 72,
        lastActive: new Date()
      },
      searchableKeywords: ['r', 'statistics', 'business intelligence'],
      featuredSkills: ['R', 'Statistics', 'Business Intelligence'],
      isPremium: true
    },
    {
      uid: 'user3',
      displayName: 'Ana López',
      initials: 'AL',
      isOnline: true,
      lastSeen: new Date(),
      joinedAt: new Date(2023, 3, 20),
      email: 'ana.lopez@example.com',
      avatar: '',
      skills: ['SQL', 'Tableau', 'Power BI'],
      location: { city: 'Monterrey', country: 'México' },
      bio: 'BI Developer at Cemex, creating insightful dashboards and data visualizations.',
      company: 'Cemex',
      jobTitle: 'BI Developer',
      experience: {
        years: 3,
        level: 'mid',
        currentRole: 'BI Developer',
        previousRoles: [],
        industries: ['Manufacturing']
      },
      social: {
        linkedin: 'https://linkedin.com/in/analopez'
      },
      networking: {
        connections: [],
        pendingConnections: [],
        blockedUsers: [],
        followers: [],
        following: [],
        availableForMentoring: false,
        openToOpportunities: true
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
        showCurrentCompany: true,
        showSalaryExpectations: false,
        allowMessages: 'all',
        allowConnectionRequests: true,
        showOnlineStatus: true,
        showLastSeen: true
      },
      activity: {
        profileViews: 67,
        totalConnections: 28,
        postsCount: 15,
        commentsCount: 42,
        helpfulVotes: 38,
        reputation: 65,
        lastActive: new Date()
      },
      searchableKeywords: ['sql', 'tableau', 'power bi'],
      featuredSkills: ['SQL', 'Tableau', 'Power BI'],
      isPremium: false
    }
  ]);

  // Filter suggestions based on criteria and search
  const filteredSuggestions = suggestedMembers.filter(member => {
    // Search filter
    if(searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        member.displayName.toLowerCase().includes(searchLower) ||
        member?.company?.toLowerCase().includes(searchLower) ||
        member?.jobTitle?.toLowerCase().includes(searchLower) ||
        member?.skills?.some(skill => skill.toLowerCase().includes(searchLower)) ||
        member?.location?.city?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Criteria filters
    let matchesCriteria = true;

    if (connectionCriteria.sameCompany && data?.profileSetup?.professional.currentCompany) {
      matchesCriteria = matchesCriteria && member.company === data['profileSetup'].professional.currentCompany;
    }

    if (connectionCriteria.sameLocation && data?.profileSetup?.basicInfo?.location?.city) {
      matchesCriteria = matchesCriteria && member?.location?.city === data['profileSetup'].basicInfo.location.city;
    }

    if (connectionCriteria.similarSkills && data?.interestsSelection?.primarySkills.length > 0) {
      const commonSkills = member?.skills?.filter(skill => 
        data['interestsSelection'].primarySkills.includes(skill)
      ).length || 0;
      matchesCriteria = matchesCriteria && commonSkills > 0;
    }

    if (connectionCriteria.mentorshipMatch) {
      const userWantsMentoring = data?.goalsDefinition?.networkingGoals.mentorshipInterest === 'mentee' ||
                                data['goalsDefinition'].networkingGoals.mentorshipInterest === 'both';
      const memberIsMentor = member.networking.availableForMentoring;
      matchesCriteria = matchesCriteria && (userWantsMentoring && memberIsMentor);
    }

    return matchesCriteria;
  });

  // Toggle connection selection
  const toggleConnection = (uid: string) => {
    setSelectedConnections(prev => 
      prev.includes(uid) 
        ? prev.filter(id => id !== uid)
        : [...prev, uid]
    );
  };

  // Get match reasons for a member
  const getMatchReasons = (member: MemberProfile): string[] => {
    const reasons: string[] = [];

    if (member.company === data?.profileSetup?.professional.currentCompany) {
      reasons.push(t.onboarding.connections.matchReasons.sameCompany);
    }

    if (member?.location?.city === data['profileSetup'].basicInfo?.location?.city) {
      reasons.push(t.onboarding.connections.matchReasons.sameLocation);
    }

    const commonSkills = member?.skills?.filter(skill => 
      data?.interestsSelection?.primarySkills.includes(skill)
    ) || [];
    if (commonSkills.length > 0) {
      reasons.push(t.onboarding.connections.matchReasons.similarSkills.replace('{count}', commonSkills.length.toString()));
    }

    if (member.networking.availableForMentoring && 
        (data?.goalsDefinition?.networkingGoals.mentorshipInterest === 'mentee' ||
         data['goalsDefinition'].networkingGoals.mentorshipInterest === 'both')) {
      reasons.push(t.onboarding.connections.matchReasons.mentoring);
    }

    return reasons;
  };

  const handleNext = () => {
    onNext({
      selectedConnections,
      connectionCriteria,
      privacySettings
    });
  };

  const tabs = [
    {
      id: 'suggestions',
      title: t.onboarding.connections.tabs.suggestions,
      icon: <UsersIcon className="h-5 w-5" />,
      count: filteredSuggestions.length
    },
    {
      id: 'criteria',
      title: t.onboarding.connections.tabs.criteria,
      icon: <MagnifyingGlassIcon className="h-5 w-5" />
    },
    {
      id: 'privacy',
      title: t.onboarding.connections.tabs.privacy,
      icon: <ShieldCheckIcon className="h-5 w-5" />
    }
  ];

  return (
    <div className={`connection-suggestions-step ${className}`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t.onboarding.connections.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t.onboarding.connections.description}
          </p>
        </motion.div>

        {/* Selection Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-blue-50 rounded-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserPlusIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  {t.onboarding.connections.summary.title}
                </h3>
                <p className="text-blue-700">
                  {t.onboarding.connections.summary['description'].replace('{count}', selectedConnections.length.toString())}
                </p>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {selectedConnections.length}
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    currentTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.title}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      currentTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
        >

          {/* Suggestions Tab */}
          {currentTab === 'suggestions' && (
            <div>
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.connections.searchPlaceholder}
                  />
                </div>
              </div>

              {/* Suggested Members */}
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredSuggestions.map((member) => {
                    const isSelected = selectedConnections.includes(member.uid);
                    const matchReasons = getMatchReasons(member);

                    return (
                      <motion.div
                        key={member.uid}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`border-2 rounded-xl p-6 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleConnection(member.uid)}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                              {member.avatar ? (
                                <img 
                                  src={member.avatar} 
                                  alt={member.displayName} 
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xl font-bold text-gray-600">
                                  {member.initials}
                                </span>
                              )}
                            </div>
                            {member.isOnline && (
                              <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-400 rounded-full border-2 border-white"></div>
                            )}
                            {member.isPremium && (
                              <div className="absolute -top-1 -right-1 h-5 w-5 bg-yellow-400 rounded-full flex items-center justify-center">
                                <SparklesIcon className="h-3 w-3 text-yellow-800" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                  {member.displayName}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  {member.jobTitle} at {member.company}
                                </p>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                                  {member.bio}
                                </p>
                              </div>
                              
                              {/* Selection Indicator */}
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <CheckIcon className="h-4 w-4 text-white" />
                                )}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                              {member.location && (
                                <div className="flex items-center">
                                  <MapPinIcon className="h-4 w-4 mr-1" />
                                  {member.location.city}, {member.location.country}
                                </div>
                              )}
                              <div className="flex items-center">
                                <UsersIcon className="h-4 w-4 mr-1" />
                                {member.activity.totalConnections} {t.onboarding.connections.connectionCount}
                              </div>
                              {member.networking.availableForMentoring && (
                                <div className="flex items-center text-green-600">
                                  <AcademicCapIcon className="h-4 w-4 mr-1" />
                                  {t.onboarding.connections.mentor}
                                </div>
                              )}
                            </div>

                            {/* Skills */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {member.featuredSkills.slice(0, 3).map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                              {member.featuredSkills.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                                  +{member.featuredSkills.length - 3} more
                                </span>
                              )}
                            </div>

                            {/* Match Reasons */}
                            {matchReasons.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {matchReasons.map((reason, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center"
                                  >
                                    <SparklesIcon className="h-3 w-3 mr-1" />
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filteredSuggestions.length === 0 && (
                  <div className="text-center py-12">
                    <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t.onboarding.connections.noSuggestions.title}
                    </h3>
                    <p className="text-gray-600">
                      {t.onboarding.connections.noSuggestions['description']}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Criteria Tab */}
          {currentTab === 'criteria' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.connections.criteria.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t.onboarding.connections.criteria.description}
                </p>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={connectionCriteria.sameCompany}
                      onChange={(e) => setConnectionCriteria(prev => ({ ...prev, sameCompany: e.target.checked }))}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">
                        {t.onboarding.connections.criteria.sameCompany.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t.onboarding.connections.criteria.sameCompany['description']}
                        {data['profileSetup'].professional.currentCompany && (
                          <span className="font-medium"> ({data['profileSetup'].professional.currentCompany})</span>
                        )}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={connectionCriteria.sameLocation}
                      onChange={(e) => setConnectionCriteria(prev => ({ ...prev, sameLocation: e.target.checked }))}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">
                        {t.onboarding.connections.criteria.sameLocation.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t.onboarding.connections.criteria.sameLocation['description']}
                        {data['profileSetup'].basicInfo?.location?.city && (
                          <span className="font-medium"> ({data['profileSetup'].basicInfo.location.city})</span>
                        )}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={connectionCriteria.similarSkills}
                      onChange={(e) => setConnectionCriteria(prev => ({ ...prev, similarSkills: e.target.checked }))}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">
                        {t.onboarding.connections.criteria.similarSkills.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t.onboarding.connections.criteria.similarSkills.description}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={connectionCriteria.similarGoals}
                      onChange={(e) => setConnectionCriteria(prev => ({ ...prev, similarGoals: e.target.checked }))}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">
                        {t.onboarding.connections.criteria.similarGoals.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t.onboarding.connections.criteria.similarGoals.description}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={connectionCriteria.mentorshipMatch}
                      onChange={(e) => setConnectionCriteria(prev => ({ ...prev, mentorshipMatch: e.target.checked }))}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">
                        {t.onboarding.connections.criteria.mentorshipMatch.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t.onboarding.connections.criteria.mentorshipMatch['description']}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {currentTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t.onboarding.connections.privacy.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t.onboarding.connections.privacy.description}
                </p>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <EyeIcon className="h-6 w-6 text-gray-600 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {t.onboarding.connections.privacy.allowDiscovery.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {t.onboarding.connections.privacy.allowDiscovery.description}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.allowDiscovery}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, allowDiscovery: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <UsersIcon className="h-6 w-6 text-gray-600 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {t.onboarding.connections.privacy.showInDirectory.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {t.onboarding.connections.privacy.showInDirectory.description}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.showInDirectory}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, showInDirectory: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-600 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {t.onboarding.connections.privacy.allowDirectMessages.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {t.onboarding.connections.privacy.allowDirectMessages.description}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.allowDirectMessages}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, allowDirectMessages: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
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

export default ConnectionSuggestions;