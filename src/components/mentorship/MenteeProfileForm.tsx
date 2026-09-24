import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslations } from '../../hooks/useTranslations';
import type { MenteeProfile } from '@/types/mentorship';
import {
  getMenteeProfile,
  createMenteeProfile,
  updateMenteeProfile,
} from '../../lib/mentorship';

interface MenteeProfileFormProps {
  userId?: string;
  mode: 'create' | 'edit';
  onSave?: (profile: MenteeProfile) => void;
  onCancel?: () => void;
}

interface MenteeFormData {
  displayName: string;
  bio: string;
  currentLevel: 'student' | 'entry' | 'mid' | 'senior';
  yearsOfExperience: number;
  goals: string[];
  interests: string[];
  preferredMentorshipStyle: string[];
  hoursPerWeek: number;
  preferredDays: string[];
  preferredMeetingType: 'video' | 'chat' | 'both';
  languages: string[];
}

interface FormAlert {
  type: 'error' | 'success';
  message: string;
}

const GOALS = [
  'Career Growth',
  'Skill Development',
  'Industry Transition',
  'Academic Research',
  'Entrepreneurship',
  'Networking',
  'Leadership',
  'Technical Mastery',
];

const INTERESTS = [
  'Machine Learning',
  'Data Engineering',
  'Data Visualization',
  'Statistical Analysis',
  'Deep Learning',
  'NLP',
  'Computer Vision',
  'Business Intelligence',
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
  { full: 'Monday', abbr: 'Mon' },
  { full: 'Tuesday', abbr: 'Tue' },
  { full: 'Wednesday', abbr: 'Wed' },
  { full: 'Thursday', abbr: 'Thu' },
  { full: 'Friday', abbr: 'Fri' },
  { full: 'Saturday', abbr: 'Sat' },
  { full: 'Sunday', abbr: 'Sun' },
];

const LANGUAGES = ['Spanish', 'English', 'Portuguese', 'French', 'German'];

const LEVEL_OPTIONS: {
  value: MenteeFormData['currentLevel'];
  label: string;
  description: string;
}[] = [
  {
    value: 'student',
    label: 'Student',
    description: 'Currently studying or recently graduated',
  },
  {
    value: 'entry',
    label: 'Entry Level',
    description: '0-2 years of professional experience',
  },
  {
    value: 'mid',
    label: 'Mid Level',
    description: '3-5 years of professional experience',
  },
  {
    value: 'senior',
    label: 'Senior',
    description: '6+ years of professional experience',
  },
];

const INITIAL_FORM_DATA: MenteeFormData = {
  displayName: '',
  bio: '',
  currentLevel: 'student',
  yearsOfExperience: 0,
  goals: [],
  interests: [],
  preferredMentorshipStyle: [],
  hoursPerWeek: 2,
  preferredDays: [],
  preferredMeetingType: 'both',
  languages: ['Spanish'],
};

const toggleArrayItem = (
  arr: string[],
  item: string,
  setter: (v: string[]) => void
) => {
  setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
};

export default function MenteeProfileForm({
  userId,
  mode,
  onSave,
  onCancel,
}: MenteeProfileFormProps) {
  const { user } = useAuthContext();
  const t = useTranslations();

  const [formData, setFormData] = useState<MenteeFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [alert, setAlert] = useState<FormAlert | null>(null);

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    if (mode === 'edit' && targetUserId) {
      loadProfile();
    }
  }, [targetUserId, mode]);

  const loadProfile = async () => {
    if (!targetUserId) return;

    setIsLoading(true);
    try {
      const profile = await getMenteeProfile(targetUserId);
      if (profile) {
        setFormData({
          displayName: profile.displayName || '',
          bio: profile.bio || '',
          currentLevel: profile.currentLevel || 'student',
          yearsOfExperience: profile.background?.yearsOfExperience || 0,
          goals: profile.goals || [],
          interests: profile.interests || [],
          preferredMentorshipStyle: profile.preferredMentorshipStyle || [],
          hoursPerWeek: profile.availability?.hoursPerWeek || 2,
          preferredDays: profile.availability?.preferredDays || [],
          preferredMeetingType: profile.preferredMeetingType || 'both',
          languages: profile.languages || ['Spanish'],
        });
      }
    } catch (error) {
      console.error('Error loading mentee profile:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load profile. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): string | null => {
    if (!formData.displayName.trim()) {
      return 'Display name is required.';
    }
    if (!formData.bio.trim() || formData.bio.trim().length < 30) {
      return 'Bio must be at least 30 characters.';
    }
    if (formData.goals.length === 0) {
      return 'Please select at least one goal.';
    }
    if (formData.interests.length === 0) {
      return 'Please select at least one interest.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetUserId) return;

    setAlert(null);

    const validationError = validate();
    if (validationError) {
      setAlert({ type: 'error', message: validationError });
      return;
    }

    setIsSubmitting(true);

    try {
      const profileData: Partial<MenteeProfile> = {
        userId: targetUserId,
        name: formData.displayName,
        displayName: formData.displayName,
        bio: formData.bio,
        goals: formData.goals,
        interests: formData.interests,
        currentLevel: formData.currentLevel,
        preferredMentorshipStyle: formData.preferredMentorshipStyle,
        preferredMeetingType: formData.preferredMeetingType,
        availability: {
          hoursPerWeek: formData.hoursPerWeek,
          preferredDays: formData.preferredDays,
        },
        languages: formData.languages,
        background: { yearsOfExperience: formData.yearsOfExperience },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isActive: true,
        updatedAt: new Date(),
      };

      let savedProfile: MenteeProfile;

      if (mode === 'create') {
        savedProfile = await createMenteeProfile({
          ...profileData,
          id: '',
          joinedAt: new Date(),
          createdAt: new Date(),
        } as MenteeProfile);
      } else {
        savedProfile = await updateMenteeProfile(targetUserId, profileData);
      }

      setAlert({
        type: 'success',
        message:
          mode === 'create'
            ? 'Profile created successfully!'
            : 'Profile updated successfully!',
      });

      onSave?.(savedProfile);
    } catch (error) {
      console.error('Error saving mentee profile:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Alert */}
      {alert && (
        <div
          role="alert"
          className={
            alert.type === 'error'
              ? 'rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'
              : 'rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20'
          }
        >
          <p
            className={
              alert.type === 'error'
                ? 'text-sm text-red-700 dark:text-red-300'
                : 'text-sm text-green-700 dark:text-green-300'
            }
          >
            {alert.message}
          </p>
        </div>
      )}

      {/* Basic Info */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h3>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Display Name *
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
              placeholder="Your display name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bio *
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Tell mentors about yourself, your background, and what you're looking for (min. 30 characters)"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.bio.length} / 30 min characters
            </p>
          </div>
        </div>
      </section>

      {/* Experience Level */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Experience Level
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LEVEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    currentLevel: option.value,
                  }))
                }
                className={
                  formData.currentLevel === option.value
                    ? 'cursor-pointer rounded-xl border-2 border-primary-500 bg-primary-50 p-4 text-left dark:border-primary-400 dark:bg-primary-900/20'
                    : 'cursor-pointer rounded-xl border-2 border-gray-200 p-4 text-left hover:border-gray-300 dark:border-gray-600'
                }
              >
                <p
                  className={
                    formData.currentLevel === option.value
                      ? 'text-sm font-medium text-primary-700 dark:text-primary-300'
                      : 'text-sm font-medium text-gray-900 dark:text-white'
                  }
                >
                  {option.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>
              </button>
            ))}
          </div>

          <div>
            <label
              htmlFor="yearsOfExperience"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Years of Experience
            </label>
            <input
              type="number"
              id="yearsOfExperience"
              min={0}
              max={50}
              value={formData.yearsOfExperience}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  yearsOfExperience: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </section>

      {/* Goals */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Goals *
        </h3>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Select at least one goal for your mentorship.
        </p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() =>
                toggleArrayItem(formData.goals, goal, (v) =>
                  setFormData((prev) => ({ ...prev, goals: v }))
                )
              }
              className={
                formData.goals.includes(goal)
                  ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
              }
            >
              {goal}
            </button>
          ))}
        </div>
      </section>

      {/* Interests */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Interests *
        </h3>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Select at least one area of interest.
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() =>
                toggleArrayItem(formData.interests, interest, (v) =>
                  setFormData((prev) => ({ ...prev, interests: v }))
                )
              }
              className={
                formData.interests.includes(interest)
                  ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
              }
            >
              {interest}
            </button>
          ))}
        </div>
      </section>

      {/* Preferred Mentorship Style */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Preferred Mentorship Style
        </h3>
        <div className="flex flex-wrap gap-2">
          {MENTORSHIP_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() =>
                toggleArrayItem(formData.preferredMentorshipStyle, style, (v) =>
                  setFormData((prev) => ({
                    ...prev,
                    preferredMentorshipStyle: v,
                  }))
                )
              }
              className={
                formData.preferredMentorshipStyle.includes(style)
                  ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
              }
            >
              {style}
            </button>
          ))}
        </div>
      </section>

      {/* Availability */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Availability
        </h3>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="hoursPerWeek"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Hours per Week
            </label>
            <input
              type="number"
              id="hoursPerWeek"
              min={1}
              max={20}
              value={formData.hoursPerWeek}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hoursPerWeek: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preferred Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.full}
                  type="button"
                  onClick={() =>
                    toggleArrayItem(formData.preferredDays, day.full, (v) =>
                      setFormData((prev) => ({ ...prev, preferredDays: v }))
                    )
                  }
                  className={
                    formData.preferredDays.includes(day.full)
                      ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
                  }
                >
                  {day.abbr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Meeting Preference
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { value: 'video', label: 'Video' },
                  { value: 'chat', label: 'Chat' },
                  { value: 'both', label: 'Both' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      preferredMeetingType: option.value,
                    }))
                  }
                  className={
                    formData.preferredMeetingType === option.value
                      ? 'cursor-pointer rounded-xl border-2 border-primary-500 bg-primary-50 p-3 text-center text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'cursor-pointer rounded-xl border-2 border-gray-200 p-3 text-center text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Languages */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Languages
        </h3>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              onClick={() =>
                toggleArrayItem(formData.languages, language, (v) =>
                  setFormData((prev) => ({ ...prev, languages: v }))
                )
              }
              className={
                formData.languages.includes(language)
                  ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
              }
            >
              {language}
            </button>
          ))}
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Profile'
              : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
