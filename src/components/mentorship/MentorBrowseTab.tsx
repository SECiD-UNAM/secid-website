import React from 'react';
import type { MenteeProfile } from '@/types/mentorship';
import MentorshipMatcher from './MentorshipMatcher';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MentorBrowseTabProps {
  menteeProfile: MenteeProfile | null;
  onSwitchTab: (tab: string) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NeedProfileState({
  onCreateProfile,
}: {
  onCreateProfile: () => void;
}) {
  return (
    <div className="rounded-xl bg-white p-12 text-center shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
      <svg
        className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
        Mentee Profile Required
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Create a mentee profile to browse and match with mentors.
      </p>
      <button
        type="button"
        onClick={onCreateProfile}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        Create Mentee Profile
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function MentorBrowseTab({ menteeProfile, onSwitchTab }: MentorBrowseTabProps) {
  if (!menteeProfile) {
    return <NeedProfileState onCreateProfile={() => onSwitchTab('profile')} />;
  }

  return <MentorshipMatcher onCreateProfile={() => onSwitchTab('profile')} />;
}

export default MentorBrowseTab;
