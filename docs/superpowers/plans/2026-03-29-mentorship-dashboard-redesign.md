# Mentorship Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the mentorship dashboard into a modular, elegant, responsive feature with working profile creation, match browsing, session management, and all bugs fixed.

**Architecture:** Break the monolithic MentorshipDashboard.tsx (803 lines) into an orchestrator + 5 tab components + 3 shared components. Profile creation happens inline via tabs. All components use Tailwind with dark mode. The wrapper (MentorshipPage.tsx) and Astro pages stay unchanged.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Firebase (existing lib/mentorship), Heroicons (SVG inline)

**Spec:** `docs/superpowers/specs/2026-03-29-mentorship-dashboard-redesign.md`

---

## File Map

| Action  | File                                                      | Responsibility                                           |
| ------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Create  | `src/components/mentorship/shared/StatsCard.tsx`          | Reusable stat card (label, value, trend, icon)           |
| Create  | `src/components/mentorship/shared/SessionCard.tsx`        | Reusable session item (title, partner, time, type badge) |
| Create  | `src/components/mentorship/shared/MentorCard.tsx`         | Reusable mentor/mentee avatar + info + status            |
| Create  | `src/components/mentorship/MenteeProfileForm.tsx`         | Mentee profile create/edit form                          |
| Create  | `src/components/mentorship/MentorshipProfileTab.tsx`      | Role selection + profile view/edit + form orchestration  |
| Create  | `src/components/mentorship/MentorshipOverview.tsx`        | Stats grid + upcoming sessions + active matches          |
| Create  | `src/components/mentorship/MentorshipMatches.tsx`         | Full matches list with filters and actions               |
| Create  | `src/components/mentorship/MentorshipSessionsTab.tsx`     | Sessions list + scheduling (wraps MentorshipSessions)    |
| Create  | `src/components/mentorship/MentorBrowseTab.tsx`           | Inline mentor browse (wraps MentorshipMatcher)           |
| Rewrite | `src/components/mentorship/MentorshipDashboard.tsx`       | Slim orchestrator: tabs, data fetching, state            |
| Modify  | `src/components/mentorship/MentorProfile.tsx`             | Tailwind rewrite of existing form/view                   |
| Modify  | `src/components/mentorship/MentorshipMatcher.tsx:553-572` | Fix no-op button, add onCreateProfile prop               |

---

### Task 1: Create Shared Components — StatsCard, SessionCard, MentorCard

These are the building blocks used by Overview, Matches, and Sessions tabs.

**Files:**

- Create: `src/components/mentorship/shared/StatsCard.tsx`
- Create: `src/components/mentorship/shared/SessionCard.tsx`
- Create: `src/components/mentorship/shared/MentorCard.tsx`

- [ ] **Step 1: Create the `shared/` directory**

```bash
ls src/components/mentorship/
```

Verify the mentorship directory exists, then proceed.

- [ ] **Step 2: Create StatsCard.tsx**

```tsx
// src/components/mentorship/shared/StatsCard.tsx
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  accent?: 'primary' | 'blue' | 'green' | 'yellow' | 'purple';
}

const accentStyles = {
  primary: 'text-primary-600 dark:text-primary-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

export default function StatsCard({
  label,
  value,
  trend,
  trendUp,
  icon,
  accent = 'primary',
}: StatsCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-gray-700/30 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${accentStyles[accent]}`}>
            {value}
          </p>
          {trend && (
            <p
              className={`mt-1 text-xs ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {trendUp ? '↑' : ''} {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create SessionCard.tsx**

```tsx
// src/components/mentorship/shared/SessionCard.tsx
import React from 'react';
import type { MentorshipSession } from '@/types/mentorship';

interface SessionCardProps {
  session: MentorshipSession;
  partnerName: string;
  partnerInitials: string;
  onJoin?: () => void;
  onEdit?: () => void;
  compact?: boolean;
}

const typeBadgeStyles: Record<string, string> = {
  video: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  voice:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  chat: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'in-person':
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const typeLabels: Record<string, string> = {
  video: 'Video',
  voice: 'Voice',
  chat: 'Chat',
  'in-person': 'In Person',
};

export default function SessionCard({
  session,
  partnerName,
  partnerInitials,
  onJoin,
  onEdit,
  compact = false,
}: SessionCardProps) {
  const isUpcoming =
    session.status === 'scheduled' &&
    new Date(session.scheduledAt) > new Date();
  const dateStr = new Date(session.scheduledAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = new Date(session.scheduledAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700/60">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-amber-400 text-xs font-semibold text-white">
        {partnerInitials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {session.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {partnerName} · {dateStr} {timeStr}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeStyles[session.type] || typeBadgeStyles.video}`}
        >
          {typeLabels[session.type] || session.type}
        </span>
        {!compact && isUpcoming && onJoin && (
          <button
            onClick={onJoin}
            className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700"
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create MentorCard.tsx**

```tsx
// src/components/mentorship/shared/MentorCard.tsx
import React from 'react';

interface MentorCardProps {
  displayName: string;
  title?: string;
  company?: string;
  profileImage?: string;
  status?: 'active' | 'pending' | 'completed' | 'cancelled';
  sessionCount?: number;
  matchScore?: number;
  compact?: boolean;
  onClick?: () => void;
}

const statusStyles: Record<string, string> = {
  active:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MentorCard({
  displayName,
  title,
  company,
  profileImage,
  status,
  sessionCount,
  matchScore,
  compact = false,
  onClick,
}: MentorCardProps) {
  const initials = getInitials(displayName);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex-shrink-0">
        {profileImage ? (
          <img
            src={profileImage}
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-secondary-500 to-blue-400 text-sm font-semibold text-white">
            {initials}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {displayName}
        </p>
        {!compact && title && (
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {title}
            {company ? ` · ${company}` : ''}
          </p>
        )}
        {!compact && sessionCount != null && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {sessionCount} sessions
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {matchScore != null && (
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {Math.round(matchScore * 100)}%
          </span>
        )}
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[status] || statusStyles.active}`}
          >
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit shared components**

```bash
git add src/components/mentorship/shared/
git commit -m "feat(mentorship): add shared StatsCard, SessionCard, MentorCard components"
```

---

### Task 2: Create MenteeProfileForm

New component for creating/editing mentee profiles. Mirrors the MentorProfile form pattern but with mentee-specific fields.

**Files:**

- Create: `src/components/mentorship/MenteeProfileForm.tsx`

- [ ] **Step 1: Create MenteeProfileForm.tsx**

This form covers: display name, bio, goals, interests, current level, preferred mentorship style, availability, languages. All with Tailwind styling, dark mode, responsive layout.

```tsx
// src/components/mentorship/MenteeProfileForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import type { MenteeProfile } from '@/types/mentorship';
import {
  getMenteeProfile,
  createMenteeProfile,
  updateMenteeProfile,
} from '@/lib/mentorship';

interface MenteeProfileFormProps {
  userId?: string;
  mode: 'create' | 'edit';
  onSave?: (profile: MenteeProfile) => void;
  onCancel?: () => void;
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
  'Natural Language Processing',
  'Computer Vision',
  'Business Intelligence',
  'Cloud Computing',
  'Python Programming',
  'R Programming',
  'SQL',
  'Big Data',
  'Analytics Strategy',
];

const LEVELS: {
  value: MenteeProfile['currentLevel'];
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
    description: '2-5 years of professional experience',
  },
  {
    value: 'senior',
    label: 'Senior',
    description: '5+ years, looking for specialized guidance',
  },
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

const LANGUAGES = ['Spanish', 'English', 'Portuguese', 'French', 'German'];

interface FormData {
  displayName: string;
  bio: string;
  goals: string[];
  interests: string[];
  currentLevel: MenteeProfile['currentLevel'];
  preferredMentorshipStyle: string[];
  preferredMeetingType: 'video' | 'chat' | 'both';
  availability: { hoursPerWeek: number; preferredDays: string[] };
  languages: string[];
  yearsOfExperience: number;
}

export default function MenteeProfileForm({
  userId,
  mode = 'create',
  onSave,
  onCancel,
}: MenteeProfileFormProps) {
  const { user } = useAuthContext();
  const t = useTranslations();
  const targetUserId = userId || user?.uid;

  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    bio: '',
    goals: [],
    interests: [],
    currentLevel: 'student',
    preferredMentorshipStyle: [],
    preferredMeetingType: 'both',
    availability: { hoursPerWeek: 2, preferredDays: [] },
    languages: ['Spanish'],
    yearsOfExperience: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>(
    []
  );
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (targetUserId && mode === 'edit') {
      getMenteeProfile(targetUserId).then((profile) => {
        if (profile) {
          setFormData({
            displayName: profile.displayName,
            bio: profile.bio,
            goals: profile.goals,
            interests: profile.interests,
            currentLevel: profile.currentLevel,
            preferredMentorshipStyle: profile.preferredMentorshipStyle || [],
            preferredMeetingType: profile.preferredMeetingType || 'both',
            availability: profile.availability || {
              hoursPerWeek: 2,
              preferredDays: [],
            },
            languages: profile.languages || ['Spanish'],
            yearsOfExperience: profile.background?.yearsOfExperience || 0,
          });
        }
      });
    }
  }, [targetUserId, mode]);

  const validate = () => {
    const errs: typeof errors = [];
    if (!formData.displayName.trim())
      errs.push({ field: 'displayName', message: 'Display name is required' });
    if (formData.bio.length < 30)
      errs.push({
        field: 'bio',
        message: 'Bio must be at least 30 characters',
      });
    if (formData.goals.length === 0)
      errs.push({ field: 'goals', message: 'Select at least one goal' });
    if (formData.interests.length === 0)
      errs.push({
        field: 'interests',
        message: 'Select at least one interest',
      });
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    setSuccess(false);

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
        availability: formData.availability,
        languages: formData.languages,
        background: { yearsOfExperience: formData.yearsOfExperience },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isActive: true,
        updatedAt: new Date(),
      };

      let saved: MenteeProfile;
      if (mode === 'create') {
        saved = await createMenteeProfile({
          ...profileData,
          id: '',
          joinedAt: new Date(),
          createdAt: new Date(),
        } as MenteeProfile);
      } else {
        saved = await updateMenteeProfile(targetUserId, profileData);
      }

      setSuccess(true);
      onSave?.(saved);
    } catch (error) {
      console.error('Error saving mentee profile:', error);
      setErrors([
        {
          field: 'general',
          message: 'Failed to save profile. Please try again.',
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleArrayItem = (
    arr: string[],
    item: string,
    setter: (v: string[]) => void
  ) => {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const fieldError = (field: string) =>
    errors.find((e) => e.field === field)?.message;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600 dark:text-red-400">
              {err.message}
            </p>
          ))}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm text-green-600 dark:text-green-400">
            Profile saved successfully!
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
              htmlFor="mentee-displayName"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Display Name *
            </label>
            <input
              id="mentee-displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, displayName: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Your display name"
            />
            {fieldError('displayName') && (
              <p className="mt-1 text-xs text-red-500">
                {fieldError('displayName')}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="mentee-bio"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bio *
            </label>
            <textarea
              id="mentee-bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((p) => ({ ...p, bio: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Tell mentors about yourself, your background, and what you're looking for..."
            />
            <p className="mt-1 text-xs text-gray-400">
              {formData.bio.length}/500 characters (min 30)
            </p>
          </div>
        </div>
      </section>

      {/* Current Level */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Experience Level
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LEVELS.map((level) => (
            <label
              key={level.value}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                formData.currentLevel === level.value
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name="currentLevel"
                value={level.value}
                checked={formData.currentLevel === level.value}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    currentLevel: e.target
                      .value as MenteeProfile['currentLevel'],
                  }))
                }
                className="sr-only"
              />
              <p className="font-medium text-gray-900 dark:text-white">
                {level.label}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {level.description}
              </p>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <label
            htmlFor="mentee-years"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Years of Experience
          </label>
          <input
            id="mentee-years"
            type="number"
            min="0"
            max="50"
            value={formData.yearsOfExperience}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                yearsOfExperience: parseInt(e.target.value) || 0,
              }))
            }
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </section>

      {/* Goals */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Goals *
        </h3>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() =>
                toggleArrayItem(formData.goals, goal, (v) =>
                  setFormData((p) => ({ ...p, goals: v }))
                )
              }
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                formData.goals.includes(goal)
                  ? 'border-primary-500 bg-primary-50 font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
        {fieldError('goals') && (
          <p className="mt-1 text-xs text-red-500">{fieldError('goals')}</p>
        )}
      </section>

      {/* Interests */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Interests *
        </h3>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() =>
                toggleArrayItem(formData.interests, interest, (v) =>
                  setFormData((p) => ({ ...p, interests: v }))
                )
              }
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                formData.interests.includes(interest)
                  ? 'border-secondary-500 bg-secondary-50 font-medium text-secondary-700 dark:border-secondary-400 dark:bg-secondary-900/20 dark:text-secondary-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        {fieldError('interests') && (
          <p className="mt-1 text-xs text-red-500">{fieldError('interests')}</p>
        )}
      </section>

      {/* Mentorship Style */}
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
                  setFormData((p) => ({ ...p, preferredMentorshipStyle: v }))
                )
              }
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                formData.preferredMentorshipStyle.includes(style)
                  ? 'border-primary-500 bg-primary-50 font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
              }`}
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
              htmlFor="mentee-hours"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Hours per week
            </label>
            <input
              id="mentee-hours"
              type="number"
              min="1"
              max="20"
              value={formData.availability.hoursPerWeek}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  availability: {
                    ...p.availability,
                    hoursPerWeek: parseInt(e.target.value) || 1,
                  },
                }))
              }
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preferred Days
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    toggleArrayItem(
                      formData.availability.preferredDays,
                      day,
                      (v) =>
                        setFormData((p) => ({
                          ...p,
                          availability: { ...p.availability, preferredDays: v },
                        }))
                    )
                  }
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                    formData.availability.preferredDays.includes(day)
                      ? 'border-primary-500 bg-primary-50 font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Meeting Preference
            </p>
            <div className="flex gap-3">
              {(['video', 'chat', 'both'] as const).map((opt) => (
                <label
                  key={opt}
                  className={`cursor-pointer rounded-lg border-2 px-4 py-2 text-sm transition-all ${
                    formData.preferredMeetingType === opt
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="meetingType"
                    value={opt}
                    checked={formData.preferredMeetingType === opt}
                    onChange={() =>
                      setFormData((p) => ({ ...p, preferredMeetingType: opt }))
                    }
                    className="sr-only"
                  />
                  <span className="capitalize">{opt}</span>
                </label>
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
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() =>
                toggleArrayItem(formData.languages, lang, (v) =>
                  setFormData((p) => ({ ...p, languages: v }))
                )
              }
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                formData.languages.includes(lang)
                  ? 'border-primary-500 bg-primary-50 font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mentorship/MenteeProfileForm.tsx
git commit -m "feat(mentorship): add MenteeProfileForm component with Tailwind"
```

---

### Task 3: Create MentorshipProfileTab

Orchestrates role selection for new users and profile view/edit for existing users.

**Files:**

- Create: `src/components/mentorship/MentorshipProfileTab.tsx`

- [ ] **Step 1: Create MentorshipProfileTab.tsx**

```tsx
// src/components/mentorship/MentorshipProfileTab.tsx
import React, { useState } from 'react';
import type { MentorProfile, MenteeProfile } from '@/types/mentorship';
import MentorProfileComponent from './MentorProfile';
import MenteeProfileForm from './MenteeProfileForm';

interface MentorshipProfileTabProps {
  mentorProfile: MentorProfile | null;
  menteeProfile: MenteeProfile | null;
  userId: string;
  onProfileCreated: () => void;
  onProfileUpdated: () => void;
}

type CreatingRole = null | 'mentor' | 'mentee';
type EditingRole = null | 'mentor' | 'mentee';

export default function MentorshipProfileTab({
  mentorProfile,
  menteeProfile,
  userId,
  onProfileCreated,
  onProfileUpdated,
}: MentorshipProfileTabProps) {
  const [creatingRole, setCreatingRole] = useState<CreatingRole>(null);
  const [editingRole, setEditingRole] = useState<EditingRole>(null);

  const hasAnyProfile = mentorProfile || menteeProfile;

  // --- Creating a profile ---
  if (creatingRole === 'mentor') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setCreatingRole(null)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Mentor Profile
          </h2>
        </div>
        <MentorProfileComponent
          userId={userId}
          mode="create"
          onSave={() => {
            setCreatingRole(null);
            onProfileCreated();
          }}
          onCancel={() => setCreatingRole(null)}
        />
      </div>
    );
  }

  if (creatingRole === 'mentee') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setCreatingRole(null)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Mentee Profile
          </h2>
        </div>
        <MenteeProfileForm
          userId={userId}
          mode="create"
          onSave={() => {
            setCreatingRole(null);
            onProfileCreated();
          }}
          onCancel={() => setCreatingRole(null)}
        />
      </div>
    );
  }

  // --- Editing a profile ---
  if (editingRole === 'mentor' && mentorProfile) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setEditingRole(null)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Mentor Profile
          </h2>
        </div>
        <MentorProfileComponent
          userId={userId}
          mode="edit"
          onSave={() => {
            setEditingRole(null);
            onProfileUpdated();
          }}
          onCancel={() => setEditingRole(null)}
        />
      </div>
    );
  }

  if (editingRole === 'mentee' && menteeProfile) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setEditingRole(null)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Mentee Profile
          </h2>
        </div>
        <MenteeProfileForm
          userId={userId}
          mode="edit"
          onSave={() => {
            setEditingRole(null);
            onProfileUpdated();
          }}
          onCancel={() => setEditingRole(null)}
        />
      </div>
    );
  }

  // --- No profile: onboarding ---
  if (!hasAnyProfile) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <div className="mb-4 text-5xl">🎓</div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          Welcome to Mentorship
        </h2>
        <p className="mx-auto mb-8 max-w-md text-gray-500 dark:text-gray-400">
          Connect with experienced data science professionals or help the next
          generation grow. Choose how you'd like to participate.
        </p>
        <div className="mx-auto flex max-w-xl flex-col gap-4 sm:flex-row">
          {/* Mentor Card */}
          <button
            onClick={() => setCreatingRole('mentor')}
            className="group flex-1 rounded-2xl border-2 border-gray-200 p-6 text-left transition-all hover:border-primary-400 hover:shadow-lg dark:border-gray-600 dark:hover:border-primary-500"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-amber-400 text-xl text-white">
              👨‍🏫
            </div>
            <h3 className="mb-1 font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
              Become a Mentor
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Share your expertise and guide aspiring data scientists on their
              career path.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
              Create Profile
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>

          {/* Mentee Card */}
          <button
            onClick={() => setCreatingRole('mentee')}
            className="group flex-1 rounded-2xl border-2 border-gray-200 p-6 text-left transition-all hover:border-secondary-400 hover:shadow-lg dark:border-gray-600 dark:hover:border-secondary-500"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-500 to-blue-400 text-xl text-white">
              🎯
            </div>
            <h3 className="mb-1 font-semibold text-gray-900 group-hover:text-secondary-600 dark:text-white dark:group-hover:text-secondary-400">
              Find a Mentor
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Get personalized guidance from experienced professionals matched
              to your goals.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-secondary-600 dark:text-secondary-400">
              Create Profile
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        </div>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          You can create both profiles to mentor and be mentored
        </p>
      </div>
    );
  }

  // --- View existing profiles ---
  return (
    <div className="space-y-6">
      {/* Mentor Profile View */}
      {mentorProfile && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-primary-50 to-amber-50 px-6 py-4 dark:border-gray-700 dark:from-primary-900/10 dark:to-amber-900/10">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Mentor Profile
            </h3>
            <button
              onClick={() => setEditingRole('mentor')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          </div>
          <div className="flex flex-col gap-6 p-6 sm:flex-row">
            <div className="flex-shrink-0">
              {mentorProfile.profileImage ? (
                <img
                  src={mentorProfile.profileImage}
                  alt={mentorProfile.displayName}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900/30"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-amber-400 text-2xl font-bold text-white">
                  {mentorProfile.displayName
                    ?.split(' ')
                    .map((w: string) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {mentorProfile.displayName}
                </h4>
                <p className="text-sm text-gray-500">
                  {mentorProfile.experience.currentPosition} at{' '}
                  {mentorProfile.experience.currentCompany}
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {mentorProfile.bio}
              </p>
              <div className="flex gap-6">
                <div className="text-center">
                  <span className="block text-xl font-bold text-primary-600 dark:text-primary-400">
                    {mentorProfile.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">Rating</span>
                </div>
                <div className="text-center">
                  <span className="block text-xl font-bold text-green-600 dark:text-green-400">
                    {mentorProfile.totalSessions}
                  </span>
                  <span className="text-xs text-gray-500">Sessions</span>
                </div>
                <div className="text-center">
                  <span className="block text-xl font-bold text-purple-600 dark:text-purple-400">
                    {mentorProfile.currentMentees}/{mentorProfile.maxMentees}
                  </span>
                  <span className="text-xs text-gray-500">Mentees</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mentorProfile.expertiseAreas
                  .slice(0, 6)
                  .map((area: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                    >
                      {area}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mentee Profile View */}
      {menteeProfile && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-secondary-50 to-blue-50 px-6 py-4 dark:border-gray-700 dark:from-secondary-900/10 dark:to-blue-900/10">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Mentee Profile
            </h3>
            <button
              onClick={() => setEditingRole('mentee')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          </div>
          <div className="flex flex-col gap-6 p-6 sm:flex-row">
            <div className="flex-shrink-0">
              {menteeProfile.profileImage ? (
                <img
                  src={menteeProfile.profileImage}
                  alt={menteeProfile.displayName}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-secondary-100 dark:ring-secondary-900/30"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-secondary-500 to-blue-400 text-2xl font-bold text-white">
                  {menteeProfile.displayName
                    ?.split(' ')
                    .map((w: string) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {menteeProfile.displayName}
                </h4>
                <p className="text-sm capitalize text-gray-500">
                  {menteeProfile.currentLevel} ·{' '}
                  {menteeProfile.background?.yearsOfExperience || 0} years
                  experience
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {menteeProfile.bio}
              </p>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Goals
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {menteeProfile.goals.map((goal: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Interests
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {menteeProfile.interests
                    .slice(0, 6)
                    .map((interest: string, i: number) => (
                      <span
                        key={i}
                        className="rounded-full bg-secondary-50 px-2.5 py-0.5 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300"
                      >
                        {interest}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add another profile CTA */}
      {!mentorProfile && menteeProfile && (
        <button
          onClick={() => setCreatingRole('mentor')}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-primary-400 dark:border-gray-600 dark:hover:border-primary-500"
        >
          <p className="font-medium text-gray-600 dark:text-gray-400">
            Want to mentor too? Create a Mentor Profile
          </p>
        </button>
      )}
      {mentorProfile && !menteeProfile && (
        <button
          onClick={() => setCreatingRole('mentee')}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-secondary-400 dark:border-gray-600 dark:hover:border-secondary-500"
        >
          <p className="font-medium text-gray-600 dark:text-gray-400">
            Looking for a mentor? Create a Mentee Profile
          </p>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mentorship/MentorshipProfileTab.tsx
git commit -m "feat(mentorship): add MentorshipProfileTab with role selection and inline editing"
```

---

### Task 4: Create MentorshipOverview

The overview tab showing stats, upcoming sessions, and active matches.

**Files:**

- Create: `src/components/mentorship/MentorshipOverview.tsx`

- [ ] **Step 1: Create MentorshipOverview.tsx**

```tsx
// src/components/mentorship/MentorshipOverview.tsx
import React from 'react';
import type {
  MentorProfile,
  MenteeProfile,
  MentorshipMatch,
  MentorshipSession,
  MentorshipStats,
} from '@/types/mentorship';
import StatsCard from './shared/StatsCard';
import SessionCard from './shared/SessionCard';
import MentorCard from './shared/MentorCard';

interface MentorshipOverviewProps {
  mentorProfile: MentorProfile | null;
  menteeProfile: MenteeProfile | null;
  matches: MentorshipMatch[];
  upcomingSessions: MentorshipSession[];
  globalStats: MentorshipStats | null;
  onSwitchTab: (tab: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MentorshipOverview({
  mentorProfile,
  menteeProfile,
  matches,
  upcomingSessions,
  globalStats,
  onSwitchTab,
}: MentorshipOverviewProps) {
  const activeMatches = matches.filter((m) => m.status === 'active');
  const pendingMatches = matches.filter((m) => m.status === 'pending');
  const completedSessionsCount = matches.reduce(
    (sum, m) => sum + (m.sessionsCompleted || 0),
    0
  );
  const nextSession = upcomingSessions[0];
  const nextSessionDate = nextSession
    ? new Date(nextSession.scheduledAt).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const rating = mentorProfile?.rating || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatsCard
          label="Active Matches"
          value={activeMatches.length}
          trend={
            pendingMatches.length > 0
              ? `${pendingMatches.length} pending`
              : undefined
          }
          trendUp={pendingMatches.length > 0}
          accent="blue"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        />
        <StatsCard
          label="Sessions"
          value={completedSessionsCount}
          trend={`${upcomingSessions.length} upcoming`}
          accent="green"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatsCard
          label="Next Session"
          value={nextSessionDate || 'None'}
          trend={
            nextSession
              ? new Date(nextSession.scheduledAt).toLocaleTimeString(
                  undefined,
                  { hour: '2-digit', minute: '2-digit' }
                )
              : undefined
          }
          accent="primary"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        {mentorProfile ? (
          <StatsCard
            label="Rating"
            value={rating > 0 ? rating.toFixed(1) : '—'}
            trend={
              rating > 0 ? '★'.repeat(Math.round(rating)) : 'No reviews yet'
            }
            accent="yellow"
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            }
          />
        ) : (
          <StatsCard
            label="Community"
            value={globalStats?.totalMentors || 0}
            trend="Mentors available"
            accent="purple"
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
          />
        )}
      </div>

      {/* Two column content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <div className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Upcoming Sessions
            </h3>
            <button
              onClick={() => onSwitchTab('sessions')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View all →
            </button>
          </div>
          {upcomingSessions.length === 0 ? (
            <div className="py-8 text-center">
              <svg
                className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No upcoming sessions
              </p>
              {activeMatches.length > 0 && (
                <button
                  onClick={() => onSwitchTab('sessions')}
                  className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Schedule one →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.slice(0, 3).map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  partnerName={session.mentorId || 'Partner'}
                  partnerInitials="??"
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Active Matches */}
        <div className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Active Matches
            </h3>
            <button
              onClick={() => onSwitchTab('matches')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View all →
            </button>
          </div>
          {activeMatches.length === 0 ? (
            <div className="py-8 text-center">
              <svg
                className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No active matches yet
              </p>
              {menteeProfile && (
                <button
                  onClick={() => onSwitchTab('browse')}
                  className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Browse mentors →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {activeMatches.slice(0, 3).map((match) => (
                <MentorCard
                  key={match.id}
                  displayName={match.mentorId}
                  status={match.status}
                  sessionCount={match.sessionsCompleted}
                  matchScore={match.matchScore}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Global Stats */}
      {globalStats && (
        <div className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
            Program Statistics
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {globalStats.totalMentors}
              </p>
              <p className="text-xs text-gray-500">Mentors</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {globalStats.totalMentees}
              </p>
              <p className="text-xs text-gray-500">Mentees</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-900/20">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {globalStats.activeMatches}
              </p>
              <p className="text-xs text-gray-500">Active Matches</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-900/20">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {(globalStats.successRate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">Success Rate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mentorship/MentorshipOverview.tsx
git commit -m "feat(mentorship): add MentorshipOverview with stats, sessions, and matches"
```

---

### Task 5: Create MentorshipMatches, MentorshipSessionsTab, MentorBrowseTab

The remaining three tab components.

**Files:**

- Create: `src/components/mentorship/MentorshipMatches.tsx`
- Create: `src/components/mentorship/MentorshipSessionsTab.tsx`
- Create: `src/components/mentorship/MentorBrowseTab.tsx`

- [ ] **Step 1: Create MentorshipMatches.tsx**

```tsx
// src/components/mentorship/MentorshipMatches.tsx
import React, { useState } from 'react';
import type { MentorshipMatch } from '@/types/mentorship';

interface MentorshipMatchesProps {
  matches: MentorshipMatch[];
  onSwitchTab: (tab: string) => void;
}

type MatchFilter = 'all' | 'active' | 'pending' | 'completed';

const statusStyles: Record<string, string> = {
  active:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function MentorshipMatches({
  matches,
  onSwitchTab,
}: MentorshipMatchesProps) {
  const [filter, setFilter] = useState<MatchFilter>('all');

  const filtered =
    filter === 'all' ? matches : matches.filter((m) => m.status === filter);
  const counts = {
    all: matches.length,
    active: matches.filter((m) => m.status === 'active').length,
    pending: matches.filter((m) => m.status === 'pending').length,
    completed: matches.filter((m) => m.status === 'completed').length,
  };

  if (matches.length === 0) {
    return (
      <div className="rounded-xl bg-white py-16 text-center shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <svg
          className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          No matches yet
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Start by browsing mentors to find your match.
        </p>
        <button
          onClick={() => onSwitchTab('browse')}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Browse Mentors
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'pending', 'completed'] as MatchFilter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {f} ({counts[f]})
            </button>
          )
        )}
      </div>

      {/* Match list */}
      <div className="space-y-3">
        {filtered.map((match) => (
          <div
            key={match.id}
            className="rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border dark:border-gray-700/30 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-secondary-500 to-blue-400 text-sm font-semibold text-white">
                  ??
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Match #{match.id.slice(0, 6)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(match.createdAt).toLocaleDateString()} ·{' '}
                    {match.sessionsCompleted} sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {Math.round(match.matchScore * 100)}%
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[match.status]}`}
                >
                  {match.status}
                </span>
              </div>
            </div>
            {match.goals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {match.goals.slice(0, 3).map((goal, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  >
                    {goal}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {match.status === 'active' && (
                <button
                  onClick={() => onSwitchTab('sessions')}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  Schedule Session
                </button>
              )}
              {match.status === 'pending' && (
                <button className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                  Respond
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create MentorshipSessionsTab.tsx**

```tsx
// src/components/mentorship/MentorshipSessionsTab.tsx
import React, { useState } from 'react';
import type { MentorshipSession, MentorshipMatch } from '@/types/mentorship';
import MentorshipSessions from './MentorshipSessions';

interface MentorshipSessionsTabProps {
  sessions: MentorshipSession[];
  matches: MentorshipMatch[];
  onSessionCreated: () => void;
}

export default function MentorshipSessionsTab({
  sessions,
  matches,
  onSessionCreated,
}: MentorshipSessionsTabProps) {
  const [creating, setCreating] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const activeMatches = matches.filter((m) => m.status === 'active');

  if (creating && selectedMatchId) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => {
              setCreating(false);
              setSelectedMatchId(null);
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Schedule Session
          </h2>
        </div>
        <MentorshipSessions
          matchId={selectedMatchId}
          mode="create"
          onSessionCreated={() => {
            setCreating(false);
            setSelectedMatchId(null);
            onSessionCreated();
          }}
          onCancel={() => {
            setCreating(false);
            setSelectedMatchId(null);
          }}
        />
      </div>
    );
  }

  // Pick a match first if creating
  if (creating && !selectedMatchId) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setCreating(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Select Match
          </h2>
        </div>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Choose which mentorship match to schedule a session for:
        </p>
        <div className="space-y-2">
          {activeMatches.map((match) => (
            <button
              key={match.id}
              onClick={() => setSelectedMatchId(match.id)}
              className="w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-primary-900/10"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                Match #{match.id.slice(0, 6)}
              </p>
              <p className="text-xs text-gray-500">
                {match.sessionsCompleted} sessions completed ·{' '}
                {Math.round(match.matchScore * 100)}% match
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Session list
  const upcoming = sessions.filter(
    (s) => s.status === 'scheduled' && new Date(s.scheduledAt) > new Date()
  );
  const past = sessions.filter(
    (s) => s.status === 'completed' || new Date(s.scheduledAt) <= new Date()
  );

  return (
    <div className="space-y-4">
      {activeMatches.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Schedule Session
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-xl bg-white py-16 text-center shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <svg
            className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            No sessions yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Schedule your first mentorship session.
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                Upcoming
              </h3>
              <div className="space-y-2">
                {upcoming.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(session.scheduledAt).toLocaleString()} ·{' '}
                          {session.duration} min
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {session.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                Past
              </h3>
              <div className="space-y-2">
                {past.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl bg-white p-4 opacity-75 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(session.scheduledAt).toLocaleString()} ·{' '}
                          {session.duration} min
                        </p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create MentorBrowseTab.tsx**

```tsx
// src/components/mentorship/MentorBrowseTab.tsx
import React from 'react';
import type { MenteeProfile } from '@/types/mentorship';
import MentorshipMatcher from './MentorshipMatcher';

interface MentorBrowseTabProps {
  menteeProfile: MenteeProfile | null;
  onSwitchTab: (tab: string) => void;
}

export default function MentorBrowseTab({
  menteeProfile,
  onSwitchTab,
}: MentorBrowseTabProps) {
  if (!menteeProfile) {
    return (
      <div className="rounded-xl bg-white py-16 text-center shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
        <svg
          className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600"
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
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          Mentee Profile Required
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Create a mentee profile first so we can match you with the best
          mentors.
        </p>
        <button
          onClick={() => onSwitchTab('profile')}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Create Mentee Profile
        </button>
      </div>
    );
  }

  return <MentorshipMatcher onCreateProfile={() => onSwitchTab('profile')} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/mentorship/MentorshipMatches.tsx src/components/mentorship/MentorshipSessionsTab.tsx src/components/mentorship/MentorBrowseTab.tsx
git commit -m "feat(mentorship): add Matches, Sessions, and Browse tab components"
```

---

### Task 6: Fix MentorshipMatcher — Add onCreateProfile Prop

Fix the no-op "Create Profile" button by adding a callback prop.

**Files:**

- Modify: `src/components/mentorship/MentorshipMatcher.tsx:393,553-569`

- [ ] **Step 1: Add `onCreateProfile` prop to MentorshipMatcher**

In the component interface (line 393), add the prop:

```tsx
// Change the function signature from:
export default function MentorshipMatcher() {
// To:
export default function MentorshipMatcher({ onCreateProfile }: { onCreateProfile?: () => void }) {
```

- [ ] **Step 2: Wire the button onClick (lines 564-569)**

Replace the no-op button with one that calls the callback:

```tsx
// Replace lines 564-569:
<button
  type="button"
  onClick={onCreateProfile}
  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
>
  {t?.mentorship?.matcher?.createMenteeProfile ?? 'Create Mentee Profile'}
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mentorship/MentorshipMatcher.tsx
git commit -m "fix(mentorship): wire onCreateProfile callback to MentorshipMatcher button"
```

---

### Task 7: Rewrite MentorshipDashboard.tsx as Slim Orchestrator

Replace the 803-line monolith with a ~150-line orchestrator that fetches data and delegates to tab components.

**Files:**

- Rewrite: `src/components/mentorship/MentorshipDashboard.tsx`

- [ ] **Step 1: Rewrite MentorshipDashboard.tsx**

```tsx
// src/components/mentorship/MentorshipDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import type {
  MentorProfile,
  MenteeProfile,
  MentorshipMatch,
  MentorshipSession,
  MentorshipStats,
} from '@/types/mentorship';
import {
  getMentorProfile,
  getMenteeProfile,
  getUserMatches,
  getUpcomingSessions,
  getMentorshipStats,
  getMentorshipSessions,
} from '@/lib/mentorship';

import MentorshipOverview from './MentorshipOverview';
import MentorshipMatches from './MentorshipMatches';
import MentorshipSessionsTab from './MentorshipSessionsTab';
import MentorshipProfileTab from './MentorshipProfileTab';
import MentorBrowseTab from './MentorBrowseTab';

type Tab = 'overview' | 'matches' | 'sessions' | 'profile' | 'browse';

const TAB_CONFIG: { key: Tab; label: string; shortLabel: string }[] = [
  { key: 'overview', label: 'Overview', shortLabel: 'Overview' },
  { key: 'matches', label: 'My Matches', shortLabel: 'Matches' },
  { key: 'sessions', label: 'Sessions', shortLabel: 'Sessions' },
  { key: 'profile', label: 'Profile', shortLabel: 'Profile' },
  { key: 'browse', label: 'Browse Mentors', shortLabel: 'Browse' },
];

export default function MentorshipDashboard() {
  const { user } = useAuthContext();
  const t = useTranslations();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(
    null
  );
  const [menteeProfile, setMenteeProfile] = useState<MenteeProfile | null>(
    null
  );
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<MentorshipSession[]>(
    []
  );
  const [globalStats, setGlobalStats] = useState<MentorshipStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [mentor, mentee, userMatches, upcoming, allSessions, stats] =
        await Promise.all([
          getMentorProfile(user.uid),
          getMenteeProfile(user.uid),
          getUserMatches(user.uid),
          getUpcomingSessions(user.uid),
          getMentorshipSessions({ userId: user.uid }),
          getMentorshipStats(),
        ]);

      setMentorProfile(mentor);
      setMenteeProfile(mentee);
      setMatches(userMatches);
      setUpcomingSessions(upcoming);
      setSessions(allSessions);
      setGlobalStats(stats);

      // Force profile tab if no profiles exist
      if (!mentor && !mentee) {
        setActiveTab('profile');
      }
    } catch (error) {
      console.error('Error loading mentorship data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSwitchTab = useCallback((tab: string) => {
    setActiveTab(tab as Tab);
  }, []);

  const pendingCount = matches.filter((m) => m.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading mentorship data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav
          className="scrollbar-hide -mb-px flex gap-1 overflow-x-auto"
          aria-label="Mentorship tabs"
        >
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              {tab.key === 'matches' && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <MentorshipOverview
          mentorProfile={mentorProfile}
          menteeProfile={menteeProfile}
          matches={matches}
          upcomingSessions={upcomingSessions}
          globalStats={globalStats}
          onSwitchTab={handleSwitchTab}
        />
      )}
      {activeTab === 'matches' && (
        <MentorshipMatches matches={matches} onSwitchTab={handleSwitchTab} />
      )}
      {activeTab === 'sessions' && (
        <MentorshipSessionsTab
          sessions={sessions}
          matches={matches}
          onSessionCreated={loadData}
        />
      )}
      {activeTab === 'profile' && user && (
        <MentorshipProfileTab
          mentorProfile={mentorProfile}
          menteeProfile={menteeProfile}
          userId={user.uid}
          onProfileCreated={loadData}
          onProfileUpdated={loadData}
        />
      )}
      {activeTab === 'browse' && (
        <MentorBrowseTab
          menteeProfile={menteeProfile}
          onSwitchTab={handleSwitchTab}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update MentorshipPage wrapper**

The wrapper currently passes `userRole="both"` which the new orchestrator doesn't need. Update:

```tsx
// src/components/wrappers/MentorshipPage.tsx
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import MentorshipDashboard from '@/components/mentorship/MentorshipDashboard';

interface Props {
  lang?: 'es' | 'en';
}

export default function MentorshipPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MentorshipDashboard />
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mentorship/MentorshipDashboard.tsx src/components/wrappers/MentorshipPage.tsx
git commit -m "feat(mentorship): rewrite dashboard as slim orchestrator with 5 tab components"
```

---

### Task 8: Rewrite MentorProfile.tsx with Tailwind

Convert the old CSS-class-based form to Tailwind, matching the MenteeProfileForm style.

**Files:**

- Rewrite: `src/components/mentorship/MentorProfile.tsx`

- [ ] **Step 1: Rewrite MentorProfile.tsx**

Keep the exact same logic, form fields, validation, and Firebase calls. Only replace CSS classes with Tailwind utilities. The form and view mode should match the design system (rounded-xl cards, chip-based multi-select, consistent input styling). The view mode should use the same profile card pattern as MentorshipProfileTab.

Key changes:

- Replace `className="mentor-profile-view"` → Tailwind layout classes
- Replace `className="profile-header"` → flex layout with gap
- Replace `className="form-section"` → `<section>` with spacing
- Replace `className="form-group"` → label + input + error pattern
- Replace `className="checkbox-grid"` → flex-wrap chip buttons
- Replace `className="btn btn-primary"` → Tailwind button classes
- Replace all `className="tags-list"` → `flex flex-wrap gap-1.5`
- Replace `className="form-errors"` → error alert box pattern
- Replace `className="form-success"` → success alert box pattern

Use the same toggle-chip pattern from MenteeProfileForm for expertise areas, styles, days, languages, and meeting times.

Use the same input styling: `w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white`

- [ ] **Step 2: Commit**

```bash
git add src/components/mentorship/MentorProfile.tsx
git commit -m "refactor(mentorship): rewrite MentorProfile with Tailwind CSS, remove old CSS classes"
```

---

### Task 9: Verify and Fix Build

- [ ] **Step 1: Run TypeScript check**

```bash
npm run check
```

Expected: No type errors in the mentorship components. If there are errors, fix them.

- [ ] **Step 2: Run lint**

```bash
npm run lint -- --no-error-on-unmatched-pattern src/components/mentorship/
```

Fix any lint issues.

- [ ] **Step 3: Run format**

```bash
npm run format
```

- [ ] **Step 4: Test build**

```bash
npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 5: Commit any fixes**

```bash
git add -u
git commit -m "fix(mentorship): resolve build and lint issues"
```

---

### Task 10: Manual Responsive Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify desktop (1280px+)**

Navigate to `/es/dashboard/mentorship`. Verify:

- Tab bar shows all 5 tabs with full labels
- Stats grid is 4 columns
- Content area is 2-column grid
- Profile tab shows onboarding if no profiles exist
- Creating a profile works and dashboard updates

- [ ] **Step 3: Verify mobile (375px)**

In browser dev tools, set viewport to 375px. Verify:

- Tabs are horizontally scrollable
- Stats grid is 2x2
- Content stacks vertically
- Forms are usable with touch targets ≥44px
- No horizontal overflow

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(mentorship): complete mentorship dashboard redesign with responsive UI"
```
