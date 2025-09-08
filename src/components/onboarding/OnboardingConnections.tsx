import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  StarIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence} from 'framer-motion';
import { useTranslations} from '../../hooks/useTranslations';

import type { OnboardingStepProps } from '../../types/onboarding';

interface SuggestedMember {
  id: string;
  name: string;
  headline: string;
  company: string;
  location: string;
  profilePhoto: string;
  skills: string[];
  mutualConnections: number;
  matchScore: number;
  matchReasons: string[];
  isAlumni: boolean;
  graduationYear?: number;
  isOnline: boolean;
  lastActive: string;
}

const OnboardingConnections: React.FC<OnboardingStepProps> = ({
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

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'alumni' | 'company' | 'location' | 'skills'>('all');
  const [sortBy, setSortBy] = useState<'match' | 'name' | 'recent'>('match');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Mock suggested members based on user's profile data
  const [suggestedMembers] = useState<SuggestedMember[]>([
    {
      id: '1',
      name: 'María González',
      headline: 'Senior Data Scientist at BBVA',
      company: 'BBVA',
      location: 'Ciudad de México, México',
      profilePhoto: '/api/placeholder/64/64',
      skills: ['Python', 'Machine Learning', 'SQL'],
      mutualConnections: 12,
      matchScore: 95,
      matchReasons: ['Similar skills', 'Same location', 'Alumni connection'],
      isAlumni: true,
      graduationYear: 2018,
      isOnline: true,
      lastActive: '2 hours ago'
    },
    {
      id: '2',
      name: 'Carlos Rodríguez',
      headline: 'ML Engineer at Mercado Libre',
      company: 'Mercado Libre',
      location: 'Buenos Aires, Argentina',
      profilePhoto: '/api/placeholder/64/64',
      skills: ['TensorFlow', 'Python', 'Deep Learning'],
      mutualConnections: 8,
      matchScore: 88,
      matchReasons: ['Similar skills', 'Career goals alignment'],
      isAlumni: true,
      graduationYear: 2019,
      isOnline: false,
      lastActive: '1 day ago'
    },
    {
      id: '3',
      name: 'Ana Martínez',
      headline: 'Data Analytics Manager at Grupo Bimbo',
      company: 'Grupo Bimbo',
      location: 'Ciudad de México, México',
      profilePhoto: '/api/placeholder/64/64',
      skills: ['Business Intelligence', 'Tableau', 'SQL'],
      mutualConnections: 15,
      matchScore: 82,
      matchReasons: ['Same location', 'Mentorship potential'],
      isAlumni: true,
      graduationYear: 2016,
      isOnline: true,
      lastActive: '30 minutes ago'
    },
    {
      id: '4',
      name: 'Roberto Silva',
      headline: 'Data Engineer at Spotify',
      company: 'Spotify',
      location: 'São Paulo, Brasil',
      profilePhoto: '/api/placeholder/64/64',
      skills: ['Apache Spark', 'AWS', 'Python'],
      mutualConnections: 6,
      matchScore: 79,
      matchReasons: ['Similar skills', 'Tech industry'],
      isAlumni: true,
      graduationYear: 2020,
      isOnline: false,
      lastActive: '3 hours ago'
    },
    {
      id: '5',
      name: 'Laura Fernández',
      headline: 'Product Data Analyst at Uber',
      company: 'Uber',
      location: 'Guadalajara, México',
      profilePhoto: '/api/placeholder/64/64',
      skills: ['A/B Testing', 'Statistics', 'R'],
      mutualConnections: 10,
      matchScore: 75,
      matchReasons: ['Alumni connection', 'Similar goals'],
      isAlumni: true,
      graduationYear: 2021,
      isOnline: true,
      lastActive: '1 hour ago'
    },
    {
      id: '6',
      name: 'Diego Morales',
      headline: 'VP of Data Science at Nubank',
      company: 'Nubank',
      location: 'São Paulo, Brasil',
      profilePhoto: '/api/placeholder/64/64',
      skills: ['Leadership', 'Machine Learning', 'Strategy'],
      mutualConnections: 20,
      matchScore: 72,
      matchReasons: ['Leadership role', 'Mentorship potential'],
      isAlumni: true,
      graduationYear: 2014,
      isOnline: false,
      lastActive: '2 days ago'
    }
  ]);

  // Filter and sort members
  const filteredMembers = suggestedMembers
    .filter(member => {
      if (searchTerm && !member.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !member.company.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !member.headline.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      switch(filterBy) {
        case 'alumni': return member.isAlumni;
        case 'company': return data['profileSetup'].professional.currentCompany && 
                              member.company === data['profileSetup'].professional.currentCompany;
        case 'location': return member.location.includes('México');
        case 'skills': return member.skills.some(skill => 
                              data?.interestsSelection?.primarySkills.includes(skill));
        default: return true;
      }
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'match': return b.matchScore - a.matchScore;
        case 'name': return a['name'].localeCompare(b['name']);
        case 'recent': return new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
        default: return 0;
      }
    });

  // Connection actions
  const toggleConnection = (memberId: string) => {
    setSelectedConnections(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredMembers.map(m => m.id);
    setSelectedConnections(prev => [...new Set([...prev, ...visibleIds])]);
  };

  const deselectAll = () => {
    setSelectedConnections([]);
  };

  // Validation
  const isValid = true; // Connections are optional but recommended
  const recommendedMinimum = 5;
  const completeness = Math.min(100, (selectedConnections.length / recommendedMinimum) * 100);

  const handleNext = () => {
    onNext({
      selectedConnections,
      connectionCriteria,
      privacySettings
    });
  };

  const renderMemberCard = (member: SuggestedMember) => {
    const isSelected = selectedConnections.includes(member.id);
    
    return (
      <motion.div
        key={member.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`bg-white border-2 rounded-xl p-6 transition-all cursor-pointer ${
          isSelected 
            ? 'border-blue-600 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
        onClick={() => toggleConnection(member.id)}
      >
        <div className="flex items-start space-x-4">
          {/* Profile Photo */}
          <div className="relative">
            <img
              src={member.profilePhoto}
              alt={member.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            {member.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
            )}
            {isSelected && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Member Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {member['name']}
              </h3>
              <div className="flex items-center space-x-1">
                <StarIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-600">
                  {member.matchScore}%
                </span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2 truncate">
              {member.headline}
            </p>

            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
              <div className="flex items-center space-x-1">
                <BriefcaseIcon className="w-3 h-3" />
                <span>{member.company}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPinIcon className="w-3 h-3" />
                <span>{member.location}</span>
              </div>
              {member.isAlumni && (
                <div className="flex items-center space-x-1">
                  <AcademicCapIcon className="w-3 h-3" />
                  <span>UNAM {member.graduationYear}</span>
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1 mb-3">
              {member.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {skill}
                </span>
              ))}
              {member.skills.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{member.skills.length - 3}
                </span>
              )}
            </div>

            {/* Match Reasons */}
            <div className="flex flex-wrap gap-1 mb-3">
              {member.matchReasons.map((reason) => (
                <span
                  key={reason}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {reason}
                </span>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{member.mutualConnections} mutual connections</span>
              <span>Active {member.lastActive}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`onboarding-connections ${className}`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <UserGroupIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connect with fellow alumni
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start building your professional network by connecting with other SECiD members who share your interests and goals.
          </p>
          
          {/* Progress Indicator */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Connections Selected</span>
              <span>{selectedConnections.length} of {recommendedMinimum} recommended</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Filters & Controls */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-8"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Find Connections</h3>
              
              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Filter Options */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-gray-700">Filter by</h4>
                {[
                  { value: 'all', label: 'All Members', count: suggestedMembers.length },
                  { value: 'alumni', label: 'Alumni', count: suggestedMembers.filter(m => m.isAlumni).length },
                  { value: 'company', label: 'Same Company', count: 2 },
                  { value: 'location', label: 'Same Location', count: 3 },
                  { value: 'skills', label: 'Similar Skills', count: 4 }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setFilterBy(filter.value as any)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      filterBy === filter.value
                        ? 'bg-green-100 text-green-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-sm">{filter.label}</span>
                    <span className="text-xs">{filter.count}</span>
                  </button>
                ))}
              </div>

              {/* Sort Options */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-gray-700">Sort by</h4>
                {[
                  { value: 'match', label: 'Best Match' },
                  { value: 'name', label: 'Name' },
                  { value: 'recent', label: 'Recently Active' }
                ].map((sort) => (
                  <button
                    key={sort.value}
                    onClick={() => setSortBy(sort.value as any)}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${
                      sortBy === sort.value
                        ? 'bg-green-100 text-green-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-sm">{sort.label}</span>
                  </button>
                ))}
              </div>

              {/* Bulk Actions */}
              <div className="space-y-2 mb-6">
                <button
                  onClick={selectAllVisible}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <UserPlusIcon className="w-4 h-4 inline mr-2" />
                  Select All Visible
                </button>
                <button
                  onClick={deselectAll}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <XMarkIcon className="w-4 h-4 inline mr-2" />
                  Deselect All
                </button>
              </div>

              {/* Privacy Settings */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="w-full flex items-center justify-between p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="flex items-center">
                    <ShieldCheckIcon className="w-4 h-4 mr-2" />
                    Privacy Settings
                  </span>
                  <span className="text-xs text-gray-400">Configure</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Members Grid */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Suggested Connections
                  </h3>
                  <p className="text-sm text-gray-600">
                    {filteredMembers.length} members found • {selectedConnections.length} selected
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {selectedConnections.length >= recommendedMinimum ? '✓' : `${recommendedMinimum - selectedConnections.length} more recommended`}
                  </span>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredMembers.map((member) => renderMemberCard(member))}
                </AnimatePresence>
              </div>

              {filteredMembers.length === 0 && (
                <div className="text-center py-12">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No members found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search criteria or filters.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Privacy Modal */}
        <AnimatePresence>
          {showPrivacyModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPrivacyModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Allow Discovery</div>
                      <div className="text-sm text-gray-600">Let others find you in searches</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.allowDiscovery}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, allowDiscovery: e.target.checked }))}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Show in Directory</div>
                      <div className="text-sm text-gray-600">Appear in member directory</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.showInDirectory}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, showInDirectory: e.target.checked }))}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Allow Direct Messages</div>
                      <div className="text-sm text-gray-600">Receive messages from other members</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacySettings.allowDirectMessages}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, allowDirectMessages: e.target.checked }))}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                  </label>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
              className="inline-flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
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

export default OnboardingConnections;