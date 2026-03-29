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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      Edit
    </button>
  );
}

function CardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
      {children}
    </div>
  );
}

function FormHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <BackButton onClick={onBack} />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const initials = name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2);

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-amber-400 text-2xl font-bold text-white">
      {initials}
    </div>
  );
}

function MentorProfileView({
  profile,
  onEdit,
}: {
  profile: MentorProfile;
  onEdit: () => void;
}) {
  return (
    <CardWrapper>
      <div className="rounded-t-xl bg-gradient-to-r from-primary-50 to-amber-50 px-6 py-4 dark:from-primary-900/10 dark:to-amber-900/10 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mentor Profile</h3>
          <EditButton onClick={onEdit} />
        </div>
      </div>

      <div className="flex items-start gap-4">
        {profile.profileImage || profile.avatar ? (
          <img
            src={profile.profileImage || profile.avatar}
            alt={profile.displayName}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <Initials name={profile.displayName} />
        )}
        <div className="flex-1">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">
            {profile.displayName}
          </h4>
          {(profile.title || profile.company) && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {[profile.title, profile.company].filter(Boolean).join(' at ')}
            </p>
          )}
          {profile.bio && (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{profile.bio}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary-600">{profile.rating.toFixed(1)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{profile.totalSessions}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sessions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {profile.currentMentees}/{profile.maxMentees}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Mentees</p>
        </div>
      </div>

      {profile.expertise && profile.expertise.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {profile.expertise.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </CardWrapper>
  );
}

function MenteeProfileView({
  profile,
  onEdit,
}: {
  profile: MenteeProfile;
  onEdit: () => void;
}) {
  const levelLabels: Record<string, string> = {
    student: 'Student',
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
  };

  return (
    <CardWrapper>
      <div className="rounded-t-xl bg-gradient-to-r from-secondary-50 to-blue-50 px-6 py-4 dark:from-secondary-900/10 dark:to-blue-900/10 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mentee Profile</h3>
          <EditButton onClick={onEdit} />
        </div>
      </div>

      <div className="flex items-start gap-4">
        {profile.profileImage || profile.avatar ? (
          <img
            src={profile.profileImage || profile.avatar}
            alt={profile.displayName}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <Initials name={profile.displayName} />
        )}
        <div className="flex-1">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">
            {profile.displayName}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {levelLabels[profile.currentLevel] || profile.currentLevel}
            {profile.background?.yearsOfExperience != null &&
              ` \u00B7 ${profile.background.yearsOfExperience} years`}
          </p>
          {profile.bio && (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{profile.bio}</p>
          )}
        </div>
      </div>

      {profile.goals && profile.goals.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Goals
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.goals.map((goal) => (
              <span
                key={goal}
                className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300"
              >
                {goal}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.interests && profile.interests.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Interests
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <span
                key={interest}
                className="rounded-full bg-secondary-50 px-3 py-1 text-xs font-medium text-secondary-700 dark:bg-secondary-900/20 dark:text-secondary-300"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </CardWrapper>
  );
}

function RoleSelectionCard({
  emoji,
  gradientFrom,
  gradientTo,
  title,
  description,
  ctaText,
  hoverBorderColor,
  hoverTextColor,
  ctaColor,
  onClick,
}: {
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  title: string;
  description: string;
  ctaText: string;
  hoverBorderColor: string;
  hoverTextColor: string;
  ctaColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex-1 rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:shadow-md dark:border-gray-700 ${hoverBorderColor}`}
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-2xl`}
      >
        {emoji}
      </div>
      <h3
        className={`mb-2 text-lg font-semibold text-gray-900 transition-colors dark:text-white ${hoverTextColor}`}
      >
        {title}
      </h3>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      <span className={`inline-flex items-center text-sm font-medium ${ctaColor}`}>
        {ctaText}
        <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
      </span>
    </button>
  );
}

function WelcomeScreen({ onSelectRole }: { onSelectRole: (role: 'mentor' | 'mentee') => void }) {
  return (
    <div className="flex flex-col items-center py-12">
      <CardWrapper>
        <div className="flex flex-col items-center text-center">
          <span className="text-5xl">&#x1F393;</span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Mentorship
          </h2>
          <p className="mt-2 max-w-md text-gray-600 dark:text-gray-400">
            Connect with experienced professionals or guide the next generation of data scientists.
            Choose your role to get started.
          </p>

          <div className="mt-8 flex w-full max-w-xl flex-col gap-4 sm:flex-row">
            <RoleSelectionCard
              emoji="&#x1F468;&#x200D;&#x1F3EB;"
              gradientFrom="from-primary-500"
              gradientTo="to-amber-400"
              title="Become a Mentor"
              description="Share your expertise and help mentees grow in their data science careers."
              ctaText="Create Profile"
              hoverBorderColor="hover:border-primary-400"
              hoverTextColor="group-hover:text-primary-600"
              ctaColor="text-primary-600"
              onClick={() => onSelectRole('mentor')}
            />
            <RoleSelectionCard
              emoji="&#x1F3AF;"
              gradientFrom="from-secondary-500"
              gradientTo="to-blue-400"
              title="Find a Mentor"
              description="Get guidance from experienced professionals to accelerate your growth."
              ctaText="Create Profile"
              hoverBorderColor="hover:border-secondary-400"
              hoverTextColor="group-hover:text-secondary-600"
              ctaColor="text-secondary-600"
              onClick={() => onSelectRole('mentee')}
            />
          </div>

          <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            You can create both profiles to mentor and be mentored
          </p>
        </div>
      </CardWrapper>
    </div>
  );
}

function AddProfileCta({
  role,
  onClick,
}: {
  role: 'mentor' | 'mentee';
  onClick: () => void;
}) {
  const isMentor = role === 'mentor';
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-primary-400 dark:border-gray-600 dark:hover:border-primary-400"
    >
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {isMentor
          ? 'Want to share your expertise? Create a mentor profile too.'
          : 'Looking for guidance? Create a mentee profile too.'}
      </p>
      <span className="mt-2 inline-block text-sm font-semibold text-primary-600">
        Create {isMentor ? 'Mentor' : 'Mentee'} Profile &rarr;
      </span>
    </button>
  );
}

export default function MentorshipProfileTab({
  mentorProfile,
  menteeProfile,
  userId,
  onProfileCreated,
  onProfileUpdated,
}: MentorshipProfileTabProps) {
  const [creatingRole, setCreatingRole] = useState<CreatingRole>(null);
  const [editingRole, setEditingRole] = useState<EditingRole>(null);

  const hasProfiles = mentorProfile !== null || menteeProfile !== null;

  if (creatingRole) {
    const isMentor = creatingRole === 'mentor';
    return (
      <CardWrapper>
        <FormHeader
          title={isMentor ? 'Create Mentor Profile' : 'Create Mentee Profile'}
          onBack={() => setCreatingRole(null)}
        />
        {isMentor ? (
          <MentorProfileComponent
            mode="create"
            userId={userId}
            onSave={() => {
              setCreatingRole(null);
              onProfileCreated();
            }}
            onCancel={() => setCreatingRole(null)}
          />
        ) : (
          <MenteeProfileForm
            mode="create"
            userId={userId}
            onSave={() => {
              setCreatingRole(null);
              onProfileCreated();
            }}
            onCancel={() => setCreatingRole(null)}
          />
        )}
      </CardWrapper>
    );
  }

  if (editingRole) {
    const isMentor = editingRole === 'mentor';
    return (
      <CardWrapper>
        <FormHeader
          title={isMentor ? 'Edit Mentor Profile' : 'Edit Mentee Profile'}
          onBack={() => setEditingRole(null)}
        />
        {isMentor ? (
          <MentorProfileComponent
            mode="edit"
            userId={userId}
            onSave={() => {
              setEditingRole(null);
              onProfileUpdated();
            }}
            onCancel={() => setEditingRole(null)}
          />
        ) : (
          <MenteeProfileForm
            mode="edit"
            userId={userId}
            onSave={() => {
              setEditingRole(null);
              onProfileUpdated();
            }}
            onCancel={() => setEditingRole(null)}
          />
        )}
      </CardWrapper>
    );
  }

  if (!hasProfiles) {
    return <WelcomeScreen onSelectRole={(role) => setCreatingRole(role)} />;
  }

  return (
    <div className="space-y-6">
      {mentorProfile && (
        <MentorProfileView profile={mentorProfile} onEdit={() => setEditingRole('mentor')} />
      )}
      {menteeProfile && (
        <MenteeProfileView profile={menteeProfile} onEdit={() => setEditingRole('mentee')} />
      )}
      {mentorProfile && !menteeProfile && (
        <AddProfileCta role="mentee" onClick={() => setCreatingRole('mentee')} />
      )}
      {menteeProfile && !mentorProfile && (
        <AddProfileCta role="mentor" onClick={() => setCreatingRole('mentor')} />
      )}
    </div>
  );
}
