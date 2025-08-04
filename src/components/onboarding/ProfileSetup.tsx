import React, { useState, useRef } from 'react';
import { 
import { motion} from 'framer-motion';
import { useTranslations} from '../../hooks/useTranslations';

  UserIcon,
  PhotoIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import type { OnboardingStepProps } from '../../types/onboarding';

const ProfileSetup: React.FC<OnboardingStepProps> = ({
  data,
  onNext,
  onBack,
  progress,
  className = ''
}) => {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [basicInfo, setBasicInfo] = useState({
    displayName: data['profileSetup'].basicInfo.displayName || '',
    firstName: data['profileSetup'].basicInfo.firstName || '',
    lastName: data['profileSetup'].basicInfo.lastName || '',
    headline: data['profileSetup'].basicInfo.headline || '',
    bio: data['profileSetup'].basicInfo.bio || '',
    location: {
      city: data['profileSetup'].basicInfo?.location?.city || '',
      state: data['profileSetup'].basicInfo?.location?.state || '',
      country: data['profileSetup'].basicInfo?.location?.country || 'México'
    },
    profilePhoto: data['profileSetup'].basicInfo.profilePhoto || ''
  });

  const [contact, setContact] = useState({
    email: data['profileSetup'].contact['email'] || '',
    phone: data['profileSetup'].contact.phone || '',
    preferredContactMethod: data['profileSetup'].contact.preferredContactMethod || 'email' as 'email' | 'phone' | 'platform'
  });

  const [professional, setProfessional] = useState({
    currentCompany: data['profileSetup'].professional.currentCompany || '',
    currentRole: data['profileSetup'].professional.currentRole || '',
    experienceLevel: data['profileSetup'].professional.experienceLevel || 'junior' as 'student' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive',
    yearsOfExperience: data['profileSetup'].professional.yearsOfExperience || 0,
    graduationYear: data['profileSetup'].professional.graduationYear || new Date().getFullYear(),
    specialization: data?.profileSetup?.professional.specialization || []
  });

  const [currentTab, setCurrentTab] = useState<'basic' | 'contact' | 'professional'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const experienceLevels = [
    { value: 'student', label: t.onboarding.profileSetup.professional.levels.student },
    { value: 'junior', label: t.onboarding.profileSetup.professional.levels.junior },
    { value: 'mid', label: t.onboarding.profileSetup.professional.levels.mid },
    { value: 'senior', label: t.onboarding.profileSetup.professional.levels.senior },
    { value: 'lead', label: t.onboarding.profileSetup.professional.levels.lead },
    { value: 'executive', label: t.onboarding.profileSetup.professional.levels.executive }
  ];

  const specializationOptions = [
    'Machine Learning',
    'Data Analysis',
    'Business Intelligence',
    'Data Engineering',
    'Data Visualization',
    'Statistics',
    'Deep Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Big Data',
    'Database Management',
    'Statistical Modeling'
  ];

  const contactMethods = [
    { value: 'email', label: t.onboarding.profileSetup.contact.methods['email'], icon: <EnvelopeIcon className="h-5 w-5" /> },
    { value: 'phone', label: t.onboarding.profileSetup.contact.methods.phone, icon: <PhoneIcon className="h-5 w-5" /> },
    { value: 'platform', label: t.onboarding.profileSetup.contact.methods.platform, icon: <UserIcon className="h-5 w-5" /> }
  ];

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Basic info validation
    if (!basicInfo.firstName.trim()) {
      newErrors.firstName = t.onboarding.profileSetup.validation.firstNameRequired;
    }
    if (!basicInfo.lastName.trim()) {
      newErrors.lastName = t.onboarding.profileSetup.validation.lastNameRequired;
    }
    if (!basicInfo.displayName.trim()) {
      newErrors.displayName = t.onboarding.profileSetup.validation.displayNameRequired;
    }

    // Contact validation
    if (!contact['email'].trim()) {
      newErrors.email = t.onboarding.profileSetup.validation.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact['email'])) {
      newErrors['email'] = t.onboarding.profileSetup.validation.emailInvalid;
    }

    // Professional validation
    if (!professional.currentRole.trim()) {
      newErrors.currentRole = t.onboarding.profileSetup.validation.currentRoleRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file['type'].startsWith('image/')) {
      setErrors(prev => ({ ...prev, profilePhoto: t.onboarding.profileSetup.validation.invalidImageType }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(prev => ({ ...prev, profilePhoto: t.onboarding.profileSetup.validation.imageTooLarge }));
      return;
    }

    setIsUploading(true);
    setErrors(prev => ({ ...prev, profilePhoto: '' }));

    try {
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e?.target?.result) {
          setBasicInfo(prev => ({
            ...prev,
            profilePhoto: e.target!.result as string
          }));
        }
      };
      reader.readAsDataURL(file);

      // Here you would typically upload to Firebase Storage
      // For now, we'll just use the local preview
      setTimeout(() => {
        setIsUploading(false);
      }, 1000);

    } catch (error) {
      console.error('Error uploading photo:', error);
      setErrors(prev => ({ ...prev, profilePhoto: t.onboarding.profileSetup.validation.uploadFailed }));
      setIsUploading(false);
    }
  };

  // Handle specialization changes
  const toggleSpecialization = (spec: string) => {
    setProfessional(prev => ({
      ...prev,
      specialization: prev.specialization.includes(spec)
        ? prev.specialization.filter(s => s !== spec)
        : [...prev.specialization, spec]
    }));
  };

  // Auto-generate display name
  const generateDisplayName = () => {
    if (basicInfo.firstName && basicInfo.lastName) {
      const generated = `${basicInfo.firstName} ${basicInfo.lastName}`;
      setBasicInfo(prev => ({ ...prev, displayName: generated }));
    }
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext({
        basicInfo,
        contact,
        professional
      });
    }
  };

  const tabs = [
    { id: 'basic', label: t.onboarding.profileSetup.tabs.basic, icon: <UserIcon className="h-5 w-5" /> },
    { id: 'contact', label: t.onboarding.profileSetup.tabs.contact, icon: <EnvelopeIcon className="h-5 w-5" /> },
    { id: 'professional', label: t.onboarding.profileSetup.tabs.professional, icon: <BriefcaseIcon className="h-5 w-5" /> }
  ];

  return (
    <div className={`profile-setup-step ${className}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t.onboarding.profileSetup.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t.onboarding.profileSetup.description}
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as 'basic' | 'contact' | 'professional')}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    currentTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Form Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
        >
          
          {/* Basic Information Tab */}
          {currentTab === 'basic' && (
            <div className="space-y-6">
              {/* Profile Photo */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {basicInfo.profilePhoto ? (
                      <img 
                        src={basicInfo.profilePhoto} 
                        alt="Profile" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => fileInputRef?.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    {basicInfo.profilePhoto ? t.onboarding.profileSetup.basic.changePhoto : t.onboarding.profileSetup.basic.uploadPhoto}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {errors.profilePhoto && (
                    <p className="mt-1 text-sm text-red-600">{errors.profilePhoto}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {t.onboarding.profileSetup.basic.photoGuidelines}
                  </p>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.onboarding.profileSetup.basic.firstName} *
                  </label>
                  <input
                    type="text"
                    value={basicInfo.firstName}
                    onChange={(e) => {
                      setBasicInfo(prev => ({ ...prev, firstName: e.target.value }));
                      setErrors(prev => ({ ...prev, firstName: '' }));
                    }}
                    onBlur={generateDisplayName}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.profileSetup.basic.firstNamePlaceholder}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.onboarding.profileSetup.basic.lastName} *
                  </label>
                  <input
                    type="text"
                    value={basicInfo.lastName}
                    onChange={(e) => {
                      setBasicInfo(prev => ({ ...prev, lastName: e.target.value }));
                      setErrors(prev => ({ ...prev, lastName: '' }));
                    }}
                    onBlur={generateDisplayName}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.profileSetup.basic.lastNamePlaceholder}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.basic.displayName} *
                </label>
                <input
                  type="text"
                  value={basicInfo.displayName}
                  onChange={(e) => {
                    setBasicInfo(prev => ({ ...prev, displayName: e.target.value }));
                    setErrors(prev => ({ ...prev, displayName: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.onboarding.profileSetup.basic.displayNamePlaceholder}
                />
                {errors.displayName && (
                  <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {t.onboarding.profileSetup.basic.displayNameHelp}
                </p>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.basic.headline}
                </label>
                <input
                  type="text"
                  value={basicInfo.headline}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, headline: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.onboarding.profileSetup.basic.headlinePlaceholder}
                  maxLength={100}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {t.onboarding.profileSetup.basic.headlineHelp}
                  </p>
                  <span className="text-xs text-gray-400">
                    {basicInfo.headline.length}/100
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.basic.bio}
                </label>
                <textarea
                  value={basicInfo.bio}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.onboarding.profileSetup.basic.bioPlaceholder}
                  maxLength={500}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {t.onboarding.profileSetup.basic.bioHelp}
                  </p>
                  <span className="text-xs text-gray-400">
                    {basicInfo.bio.length}/500
                  </span>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.basic.location}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={basicInfo.location.city}
                    onChange={(e) => setBasicInfo(prev => ({
                      ...prev,
                      location: { ...prev.location, city: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.profileSetup.basic.city}
                  />
                  <input
                    type="text"
                    value={basicInfo.location.state}
                    onChange={(e) => setBasicInfo(prev => ({
                      ...prev,
                      location: { ...prev.location, state: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.profileSetup.basic.state}
                  />
                  <input
                    type="text"
                    value={basicInfo.location.country}
                    onChange={(e) => setBasicInfo(prev => ({
                      ...prev,
                      location: { ...prev.location, country: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t.onboarding.profileSetup.basic.country}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Information Tab */}
          {currentTab === 'contact' && (
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.contact.email} *
                </label>
                <input
                  type="email"
                  value={contact['email']}
                  onChange={(e) => {
                    setContact(prev => ({ ...prev, email: e.target.value }));
                    setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.onboarding.profileSetup.contact.emailPlaceholder}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors['email']}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.contact.phone}
                </label>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.onboarding.profileSetup.contact.phonePlaceholder}
                />
              </div>

              {/* Preferred Contact Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  {t.onboarding.profileSetup.contact.preferredMethod}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {contactMethods.map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setContact(prev => ({ ...prev, preferredContactMethod: method.value as any }))}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        contact.preferredContactMethod === method.value
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        {method.icon}
                        <span className="font-medium">{method.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Professional Information Tab */}
          {currentTab === 'professional' && (
            <div className="space-y-6">
              {/* Current Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.professional.currentRole} *
                </label>
                <input
                  type="text"
                  value={professional.currentRole}
                  onChange={(e) => {
                    setProfessional(prev => ({ ...prev, currentRole: e.target.value }));
                    setErrors(prev => ({ ...prev, currentRole: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.onboarding.profileSetup.professional.currentRolePlaceholder}
                />
                {errors.currentRole && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentRole}</p>
                )}
              </div>

              {/* Current Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.professional.currentCompany}
                </label>
                <input
                  type="text"
                  value={professional.currentCompany}
                  onChange={(e) => setProfessional(prev => ({ ...prev, currentCompany: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t.onboarding.profileSetup.professional.currentCompanyPlaceholder}
                />
              </div>

              {/* Experience Level and Years */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.onboarding.profileSetup.professional.experienceLevel}
                  </label>
                  <select
                    value={professional.experienceLevel}
                    onChange={(e) => setProfessional(prev => ({ ...prev, experienceLevel: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {experienceLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.onboarding.profileSetup.professional.yearsOfExperience}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={professional.yearsOfExperience}
                    onChange={(e) => setProfessional(prev => ({ ...prev, yearsOfExperience: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Graduation Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.onboarding.profileSetup.professional.graduationYear}
                </label>
                <input
                  type="number"
                  min="1980"
                  max={new Date().getFullYear() + 10}
                  value={professional.graduationYear}
                  onChange={(e) => setProfessional(prev => ({ ...prev, graduationYear: parseInt(e.target.value) || new Date().getFullYear() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  {t.onboarding.profileSetup.professional.specialization}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {specializationOptions.map((spec) => (
                    <button
                      key={spec}
                      onClick={() => toggleSpecialization(spec)}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        professional.specialization.includes(spec)
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {t.onboarding.profileSetup.professional.specializationHelp}
                </p>
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
            {/* Tab Navigation */}
            <div className="flex space-x-2">
              {currentTab !== 'professional' && (
                <button
                  onClick={() => {
                    const nextTab = currentTab === 'basic' ? 'contact' : 'professional';
                    setCurrentTab(nextTab);
                  }}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {t.onboarding.navigation.next}
                </button>
              )}
            </div>

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

export default ProfileSetup;