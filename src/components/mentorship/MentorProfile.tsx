import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslations } from '../../hooks/useTranslations';
import type { MentorProfile, FormState, ValidationError } from '@/types';
import {
  getMentorProfile,
  createMentorProfile,
  updateMentorProfile,
  uploadProfileImage,
} from '../../lib/mentorship';

interface MentorProfileProps {
  userId?: string;
  mode: 'view' | 'edit' | 'create';
  onSave?: (profile: MentorProfile) => void;
  onCancel?: () => void;
}

interface MentorProfileForm {
  displayName: string;
  bio: string;
  expertiseAreas: string[];
  skills: string[];
  experience: {
    yearsInField: number;
    currentPosition: string;
    currentCompany: string;
    previousRoles: {
      title: string;
      company: string;
      duration: string;
    }[];
  };
  availability: {
    hoursPerWeek: number;
    preferredDays: string[];
    timezone: string;
    preferredMeetingTimes: string[];
  };
  mentorshipStyle: string[];
  maxMentees: number;
  languages: string[];
}

const EXPERTISE_AREAS = [
  'Machine Learning',
  'Data Engineering',
  'Data Visualization',
  'Statistical Analysis',
  'Deep Learning',
  'Natural Language Processing',
  'Computer Vision',
  'Business Intelligence',
  'Data Architecture',
  'Cloud Computing',
  'Python Programming',
  'R Programming',
  'SQL',
  'Big Data',
  'Analytics Strategy',
];

const MENTORSHIP_STYLES = [
  'Structured Learning',
  'Project-Based',
  'Career Guidance',
  'Technical Deep-Dives',
  'Problem Solving',
  'Industry Insights',
  'Skill Development',
  'Leadership Development',
];

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const MEETING_TIMES = [
  'Early Morning (6-9 AM)',
  'Morning (9-12 PM)',
  'Afternoon (12-5 PM)',
  'Evening (5-8 PM)',
  'Night (8-11 PM)',
];

const LANGUAGES = [
  'Spanish',
  'English',
  'Portuguese',
  'French',
  'German',
  'Italian',
  'Chinese',
  'Japanese',
];

const inputClasses =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const numberInputClasses =
  'w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const labelClasses =
  'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300';

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${filled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function MentorProfile({
  userId,
  mode = 'view',
  onSave,
  onCancel,
}: MentorProfileProps) {
  const { user } = useAuthContext();
  const _t = useTranslations();

  // Fallbacks for missing mentorship translation keys
  const t = {
    mentorship: {
      ..._t.mentorship,
      errors: {
        loadProfile: 'Error loading profile',
        saveProfile: 'Error saving profile. Please try again.',
        ...((_t.mentorship as Record<string, unknown>)?.errors as Record<
          string,
          string
        >),
      },
      validation: {
        displayNameRequired: 'Display name is required',
        bioMinLength: 'Bio must be at least 50 characters',
        expertiseRequired: 'Select at least one area of expertise',
        positionRequired: 'Current position is required',
        companyRequired: 'Current company is required',
        experienceMinimum: 'At least 1 year of experience is required',
        hoursMinimum: 'At least 1 hour per week is required',
        daysRequired: 'Select at least one preferred day',
        styleRequired: 'Select at least one mentorship style',
        ...((_t.mentorship as Record<string, unknown>)?.validation as Record<
          string,
          string
        >),
      },
      profile: {
        yearsExperience: 'years of experience',
        rating: 'Rating',
        totalSessions: 'Sessions',
        mentees: 'Mentees',
        requestMentorship: 'Request Mentorship',
        sendMessage: 'Send Message',
        about: 'About',
        expertise: 'Expertise',
        skills: 'Skills',
        mentorshipStyle: 'Mentorship Style',
        availability: 'Availability',
        hoursPerWeek: 'hours/week',
        experience: 'Experience',
        current: 'Current',
        languages: 'Languages',
        createProfile: 'Create Mentor Profile',
        editProfile: 'Edit Mentor Profile',
        formDescription: 'Fill in your details to set up your mentor profile.',
        saveSuccess: 'Profile saved successfully!',
        basicInfo: 'Basic Information',
        profileImage: 'Profile Image',
        changeImage: 'Change Photo',
        displayName: 'Display Name',
        displayNamePlaceholder: 'Your display name',
        bio: 'Bio',
        bioPlaceholder:
          'Tell mentees about yourself, your background, and your approach to mentoring...',
        characters: 'characters (min 50)',
        currentPosition: 'Current Position',
        positionPlaceholder: 'e.g. Senior Data Scientist',
        currentCompany: 'Current Company',
        companyPlaceholder: 'e.g. Google',
        yearsInField: 'Years in Field',
        previousRoles: 'Previous Roles',
        addRole: '+ Add Role',
        expertiseAreas: 'Areas of Expertise',
        skillsLabel: 'Skills',
        addSkill: '+ Add Skill',
        skillPlaceholder: 'Type a skill and press Enter',
        mentorshipStyleLabel: 'Mentorship Style',
        maxMentees: 'Maximum Mentees',
        availabilitySection: 'Availability',
        hoursPerWeekLabel: 'Hours per week',
        preferredDays: 'Preferred Days',
        meetingTimes: 'Preferred Meeting Times',
        languagesLabel: 'Languages',
        save: 'Save Profile',
        saving: 'Saving...',
        cancel: 'Cancel',
        jobTitle: 'Job Title',
        company: 'Company',
        duration: 'Duration',
        additionalSkills: 'Additional Skills',
        addSkillPlaceholder: 'Type a skill and press Add',
        preferredStyle: 'Preferred Style',
        maxMenteesHelp:
          'Maximum number of mentees you can support simultaneously',
        timezone: 'Timezone',
        preferredMeetingTimes: 'Preferred Meeting Times',
        spokenLanguages: 'Spoken Languages',
        ...((_t.mentorship as Record<string, unknown>)?.profile as Record<
          string,
          string
        >),
      },
    },
  };

  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [formData, setFormData] = useState<MentorProfileForm>({
    displayName: '',
    bio: '',
    expertiseAreas: [],
    skills: [],
    experience: {
      yearsInField: 0,
      currentPosition: '',
      currentCompany: '',
      previousRoles: [],
    },
    availability: {
      hoursPerWeek: 2,
      preferredDays: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredMeetingTimes: [],
    },
    mentorshipStyle: [],
    maxMentees: 3,
    languages: ['Spanish'],
  });

  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    errors: [],
    success: false,
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newRole, setNewRole] = useState({
    title: '',
    company: '',
    duration: '',
  });

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    if (targetUserId && mode !== 'create') {
      loadProfile();
    }
  }, [targetUserId, mode]);

  const loadProfile = async () => {
    if (!targetUserId) return;

    try {
      const profileData = await getMentorProfile(targetUserId);
      if (profileData) {
        setProfile(profileData);
        setFormData({
          displayName: profileData.displayName,
          bio: profileData.bio,
          expertiseAreas: profileData.expertiseAreas,
          skills: profileData.skills,
          experience: profileData.experience,
          availability: {
            hoursPerWeek: profileData.availability.hoursPerWeek,
            preferredDays: profileData.availability.preferredDays,
            timezone:
              profileData.availability.timezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            preferredMeetingTimes:
              profileData.availability.preferredMeetingTimes || [],
          },
          mentorshipStyle: profileData.mentorshipStyle,
          maxMentees: profileData.maxMentees,
          languages: profileData.languages,
        });
        setImagePreview(profileData.profileImage || '');
      }
    } catch (error) {
      console.error('Error loading mentor profile:', error);
      setFormState((prev) => ({
        ...prev,
        errors: [
          { field: 'general', message: t.mentorship.errors.loadProfile },
        ],
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e?.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!formData.displayName.trim()) {
      errors.push({
        field: 'displayName',
        message: t.mentorship.validation.displayNameRequired,
      });
    }

    if (!formData.bio.trim() || formData.bio.length < 50) {
      errors.push({
        field: 'bio',
        message: t.mentorship.validation.bioMinLength,
      });
    }

    if (formData.expertiseAreas.length === 0) {
      errors.push({
        field: 'expertiseAreas',
        message: t.mentorship.validation.expertiseRequired,
      });
    }

    if (!formData.experience.currentPosition.trim()) {
      errors.push({
        field: 'currentPosition',
        message: t.mentorship.validation.positionRequired,
      });
    }

    if (!formData.experience.currentCompany.trim()) {
      errors.push({
        field: 'currentCompany',
        message: t.mentorship.validation.companyRequired,
      });
    }

    if (formData.experience.yearsInField < 1) {
      errors.push({
        field: 'yearsInField',
        message: t.mentorship.validation.experienceMinimum,
      });
    }

    if (formData.availability.hoursPerWeek < 1) {
      errors.push({
        field: 'hoursPerWeek',
        message: t.mentorship.validation.hoursMinimum,
      });
    }

    if (formData.availability.preferredDays.length === 0) {
      errors.push({
        field: 'preferredDays',
        message: t.mentorship.validation.daysRequired,
      });
    }

    if (formData.mentorshipStyle.length === 0) {
      errors.push({
        field: 'mentorshipStyle',
        message: t.mentorship.validation.styleRequired,
      });
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetUserId) return;

    setFormState((prev) => ({
      ...prev,
      isSubmitting: true,
      errors: [],
      success: false,
    }));

    const errors = validateForm();
    if (errors.length > 0) {
      setFormState((prev) => ({ ...prev, errors, isSubmitting: false }));
      return;
    }

    try {
      let profileImageUrl = profile?.profileImage || '';

      // Upload new image if selected
      if (profileImage) {
        profileImageUrl = await uploadProfileImage(targetUserId, profileImage);
      }

      const profileData = {
        ...formData,
        userId: targetUserId,
        email: user?.email || '',
        profileImage: profileImageUrl,
        isActive: true,
        updatedAt: new Date(),
      } as unknown as Partial<MentorProfile>;

      let savedProfile: MentorProfile;

      if (mode === 'create') {
        savedProfile = await createMentorProfile({
          ...profileData,
          id: '', // Will be set by Firebase
          rating: 0,
          totalSessions: 0,
          currentMentees: 0,
          joinedAt: new Date(),
        } as MentorProfile);
      } else {
        savedProfile = await updateMentorProfile(targetUserId, profileData);
      }

      setProfile(savedProfile);
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        success: true,
        errors: [],
      }));

      if (onSave) {
        onSave(savedProfile);
      }
    } catch (error) {
      console.error('Error saving mentor profile:', error);
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: [
          { field: 'general', message: t.mentorship.errors.saveProfile },
        ],
      }));
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const addPreviousRole = () => {
    if (newRole.title.trim() && newRole.company.trim()) {
      setFormData((prev) => ({
        ...prev,
        experience: {
          ...prev.experience,
          previousRoles: [...prev.experience.previousRoles, { ...newRole }],
        },
      }));
      setNewRole({ title: '', company: '', duration: '' });
    }
  };

  const removePreviousRole = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      experience: {
        ...prev.experience,
        previousRoles: prev.experience.previousRoles.filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  const toggleArrayValue = (
    array: string[],
    value: string,
    setter: (newArray: string[]) => void
  ) => {
    if (array.includes(value)) {
      setter(array.filter((item) => item !== value));
    } else {
      setter([...array, value]);
    }
  };

  // ---------- VIEW MODE ----------
  if (mode === 'view' && profile) {
    return (
      <div className="space-y-6">
        {/* Header card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="bg-gradient-to-r from-primary-50 to-amber-50 px-6 py-8 dark:from-primary-900/10 dark:to-amber-900/10">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              {/* Avatar */}
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile.displayName}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-white dark:ring-gray-800"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-amber-400 ring-4 ring-white dark:ring-gray-800">
                  <svg
                    className="h-10 w-10 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.displayName}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {profile?.experience?.currentPosition} at{' '}
                  {profile?.experience?.currentCompany}
                </p>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-500">
                  {profile?.experience?.yearsInField}{' '}
                  {t.mentorship.profile.yearsExperience}
                </p>

                {/* Stats row */}
                <div className="mt-4 flex flex-wrap justify-center gap-6 sm:justify-start">
                  <div className="text-center">
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                      {profile?.rating?.toFixed(1)}
                    </span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      {t.mentorship.profile.rating}
                    </span>
                    <div className="mt-0.5 flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon key={star} filled={star <= profile.rating} />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {profile.totalSessions}
                    </span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      {t.mentorship.profile.totalSessions}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {profile.currentMentees}/{profile.maxMentees}
                    </span>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      {t.mentorship.profile.mentees}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  {t.mentorship.profile.requestMentorship}
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {t.mentorship.profile.sendMessage}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          {/* About */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t.mentorship.profile.about}
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {profile.bio}
            </p>
          </section>

          {/* Expertise */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t.mentorship.profile.expertise}
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.expertiseAreas?.map((area, index) => (
                <span
                  key={index}
                  className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                >
                  {area}
                </span>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t.mentorship.profile.skills}
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.skills?.map((skill, index) => (
                <span
                  key={index}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          {/* Mentorship Style */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t.mentorship.profile.mentorshipStyle}
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.mentorshipStyle?.map((style, index) => (
                <span
                  key={index}
                  className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                >
                  {style}
                </span>
              ))}
            </div>
          </section>

          {/* Availability */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t.mentorship.profile.availability}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {profile?.availability?.hoursPerWeek}{' '}
                  {t.mentorship.profile.hoursPerWeek}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{profile?.availability?.preferredDays.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{profile?.availability?.timezone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {profile?.availability?.preferredMeetingTimes?.join(', ')}
                </span>
              </div>
            </div>
          </section>

          {/* Experience history */}
          {profile?.experience?.previousRoles &&
            profile.experience.previousRoles.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                  {t.mentorship.profile.experience}
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-primary-50 px-4 py-3 dark:bg-primary-900/10">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {profile?.experience?.currentPosition}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {profile?.experience?.currentCompany}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      {t.mentorship.profile.current}
                    </span>
                  </div>
                  {profile?.experience?.previousRoles.map((role, index) => (
                    <div
                      key={index}
                      className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/40"
                    >
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {role.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {role.company}
                      </p>
                      {role.duration && (
                        <span className="text-xs text-gray-400">
                          {role.duration}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Languages */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              {t.mentorship.profile.languages}
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.languages?.map((language, index) => (
                <span
                  key={index}
                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300"
                >
                  {language}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ---------- EDIT / CREATE MODE ----------
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {mode === 'create'
            ? t.mentorship.profile.createProfile
            : t.mentorship.profile.editProfile}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.mentorship.profile.formDescription}
        </p>
      </div>

      {formState.errors.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          {formState.errors.map((error, index) => (
            <p
              key={index}
              className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
            >
              <svg
                className="h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error['message']}
            </p>
          ))}
        </div>
      )}

      {formState.success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {t.mentorship.profile.saveSuccess}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t.mentorship.profile.basicInfo}
          </h3>

          {/* Profile Image */}
          <div className="mb-4">
            <label className={labelClasses}>
              {t.mentorship.profile.profileImage}
            </label>
            <div className="mt-2 flex items-center gap-4">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900/30"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
              <div>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                >
                  {t.mentorship.profile.changeImage}
                </button>
                {showImageUpload && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-2 text-sm"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <label htmlFor="displayName" className={labelClasses}>
              {t.mentorship.profile.displayName} *
            </label>
            <input
              type="text"
              id="displayName"
              value={formData.displayName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  displayName: e.target.value,
                }))
              }
              placeholder={t.mentorship.profile.displayNamePlaceholder}
              className={inputClasses}
              required
            />
          </div>

          {/* Bio */}
          <div className="mb-4">
            <label htmlFor="bio" className={labelClasses}>
              {t.mentorship.profile.bio} *
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  bio: e.target.value,
                }))
              }
              placeholder={t.mentorship.profile.bioPlaceholder}
              rows={4}
              minLength={50}
              className={`${inputClasses} resize-none`}
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.bio.length}/500 {t.mentorship.profile.characters}
            </p>
          </div>
        </section>

        {/* Experience */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t.mentorship.profile.experience}
          </h3>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="currentPosition" className={labelClasses}>
                {t.mentorship.profile.currentPosition} *
              </label>
              <input
                type="text"
                id="currentPosition"
                value={formData.experience.currentPosition}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    experience: {
                      ...prev.experience,
                      currentPosition: e.target.value,
                    },
                  }))
                }
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="currentCompany" className={labelClasses}>
                {t.mentorship.profile.currentCompany} *
              </label>
              <input
                type="text"
                id="currentCompany"
                value={formData.experience.currentCompany}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    experience: {
                      ...prev.experience,
                      currentCompany: e.target.value,
                    },
                  }))
                }
                className={inputClasses}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="yearsInField" className={labelClasses}>
              {t.mentorship.profile.yearsInField} *
            </label>
            <input
              type="number"
              id="yearsInField"
              min="1"
              max="50"
              value={formData.experience.yearsInField}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  experience: {
                    ...prev.experience,
                    yearsInField: parseInt(e.target.value) || 0,
                  },
                }))
              }
              className={numberInputClasses}
              required
            />
          </div>

          {/* Previous Roles */}
          <div className="mb-4">
            <label className={labelClasses}>
              {t.mentorship.profile.previousRoles}
            </label>

            {formData.experience.previousRoles.length > 0 && (
              <div className="mb-3 space-y-2">
                {formData.experience.previousRoles.map((role, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/40"
                  >
                    <div className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {role.title}
                      </span>
                      <span className="text-gray-500"> at {role.company}</span>
                      {role.duration && (
                        <span className="text-gray-400">
                          {' '}
                          ({role.duration})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => removePreviousRole(index)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder={t.mentorship.profile.jobTitle}
                value={newRole.title}
                onChange={(e) =>
                  setNewRole((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className={`flex-1 ${inputClasses}`}
              />
              <input
                type="text"
                placeholder={t.mentorship.profile.company}
                value={newRole.company}
                onChange={(e) =>
                  setNewRole((prev) => ({
                    ...prev,
                    company: e.target.value,
                  }))
                }
                className={`flex-1 ${inputClasses}`}
              />
              <input
                type="text"
                placeholder={t.mentorship.profile.duration}
                value={newRole.duration}
                onChange={(e) =>
                  setNewRole((prev) => ({
                    ...prev,
                    duration: e.target.value,
                  }))
                }
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-32`}
              />
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
                onClick={addPreviousRole}
                disabled={!newRole.title.trim() || !newRole.company.trim()}
              >
                +
              </button>
            </div>
          </div>
        </section>

        {/* Expertise */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t.mentorship.profile.expertise}
          </h3>

          <div className="mb-4">
            <label className={labelClasses}>
              {t.mentorship.profile.expertiseAreas} *
            </label>
            <div className="flex flex-wrap gap-2">
              {EXPERTISE_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() =>
                    toggleArrayValue(
                      formData.expertiseAreas,
                      area,
                      (newAreas) =>
                        setFormData((prev) => ({
                          ...prev,
                          expertiseAreas: newAreas,
                        }))
                    )
                  }
                  className={
                    formData.expertiseAreas.includes(area)
                      ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                  }
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClasses}>
              {t.mentorship.profile.additionalSkills}
            </label>

            {formData.skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-0.5 text-primary-400 hover:text-primary-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t.mentorship.profile.addSkillPlaceholder}
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addSkill())
                }
                className={`flex-1 ${inputClasses}`}
              />
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
                onClick={addSkill}
                disabled={!newSkill.trim()}
              >
                +
              </button>
            </div>
          </div>
        </section>

        {/* Mentorship Style */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t.mentorship.profile.mentorshipStyle}
          </h3>

          <div className="mb-4">
            <label className={labelClasses}>
              {t.mentorship.profile.preferredStyle} *
            </label>
            <div className="flex flex-wrap gap-2">
              {MENTORSHIP_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() =>
                    toggleArrayValue(
                      formData.mentorshipStyle,
                      style,
                      (newStyles) =>
                        setFormData((prev) => ({
                          ...prev,
                          mentorshipStyle: newStyles,
                        }))
                    )
                  }
                  className={
                    formData.mentorshipStyle.includes(style)
                      ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                  }
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="maxMentees" className={labelClasses}>
              {t.mentorship.profile.maxMentees}
            </label>
            <input
              type="number"
              id="maxMentees"
              min="1"
              max="10"
              value={formData.maxMentees}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxMentees: parseInt(e.target.value) || 1,
                }))
              }
              className={numberInputClasses}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t.mentorship.profile.maxMenteesHelp}
            </p>
          </div>
        </section>

        {/* Availability */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t.mentorship.profile.availability}
          </h3>

          <div className="mb-4">
            <label htmlFor="hoursPerWeek" className={labelClasses}>
              {t.mentorship.profile.hoursPerWeek} *
            </label>
            <input
              type="number"
              id="hoursPerWeek"
              min="1"
              max="20"
              value={formData.availability.hoursPerWeek}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  availability: {
                    ...prev.availability,
                    hoursPerWeek: parseInt(e.target.value) || 1,
                  },
                }))
              }
              className={numberInputClasses}
              required
            />
          </div>

          <div className="mb-4">
            <label className={labelClasses}>
              {t.mentorship.profile.preferredDays} *
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    toggleArrayValue(
                      formData.availability.preferredDays,
                      day,
                      (newDays) =>
                        setFormData((prev) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            preferredDays: newDays,
                          },
                        }))
                    )
                  }
                  className={
                    formData.availability.preferredDays.includes(day)
                      ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                  }
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="timezone" className={labelClasses}>
              {t.mentorship.profile.timezone}
            </label>
            <input
              type="text"
              id="timezone"
              value={formData.availability.timezone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  availability: {
                    ...prev.availability,
                    timezone: e.target.value,
                  },
                }))
              }
              placeholder="UTC-6, EST, PST, etc."
              className={inputClasses}
            />
          </div>

          <div className="mb-4">
            <label className={labelClasses}>
              {t.mentorship.profile.preferredMeetingTimes}
            </label>
            <div className="flex flex-wrap gap-2">
              {MEETING_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() =>
                    toggleArrayValue(
                      formData.availability.preferredMeetingTimes,
                      time,
                      (newTimes) =>
                        setFormData((prev) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            preferredMeetingTimes: newTimes,
                          },
                        }))
                    )
                  }
                  className={
                    formData.availability.preferredMeetingTimes.includes(time)
                      ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                  }
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Languages */}
        <section>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t.mentorship.profile.languages}
          </h3>

          <div className="mb-4">
            <label className={labelClasses}>
              {t.mentorship.profile.spokenLanguages}
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() =>
                    toggleArrayValue(
                      formData.languages,
                      language,
                      (newLanguages) =>
                        setFormData((prev) => ({
                          ...prev,
                          languages: newLanguages,
                        }))
                    )
                  }
                  className={
                    formData.languages.includes(language)
                      ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                  }
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onCancel}
            disabled={formState.isSubmitting}
          >
            {t.mentorship.profile.cancel}
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t.mentorship.profile.saving}
              </>
            ) : (
              <>
                {mode === 'create'
                  ? t.mentorship.profile.createProfile
                  : t.mentorship.profile.save}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
