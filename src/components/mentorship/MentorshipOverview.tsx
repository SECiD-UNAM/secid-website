import React from 'react';
import type {
  MentorProfile,
  MenteeProfile,
  MentorshipMatch,
  MentorshipSession,
  MentorshipStats,
} from '@/types/mentorship';
import { StatsCard, SessionCard, MentorCard } from './shared';

interface MentorshipOverviewProps {
  mentorProfile: MentorProfile | null;
  menteeProfile: MenteeProfile | null;
  matches: MentorshipMatch[];
  upcomingSessions: MentorshipSession[];
  globalStats: MentorshipStats | null;
  profileNames?: Map<string, string>;
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

function formatNextSessionDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatNextSessionTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ---------- SVG icon helpers ---------- */

function UsersIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

/* ---------- Component ---------- */

function MentorshipOverview({
  mentorProfile,
  menteeProfile,
  matches,
  upcomingSessions,
  globalStats,
  profileNames = new Map(),
  onSwitchTab,
}: MentorshipOverviewProps) {
  const resolveName = (id: string) => profileNames.get(id) || 'Partner';
  const activeMatches = matches.filter((m) => m.status === 'active');
  const pendingMatches = matches.filter((m) => m.status === 'pending');
  const completedSessionsCount = matches.reduce(
    (sum, m) => sum + (m.sessionsCompleted || 0),
    0
  );
  const nextSession = upcomingSessions[0];
  const rating = mentorProfile?.rating || 0;

  const displayedSessions = upcomingSessions.slice(0, 3);
  const displayedMatches = activeMatches.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* --- 1. Stats Grid --- */}
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
          icon={<UsersIcon />}
        />

        <StatsCard
          label="Sessions"
          value={completedSessionsCount}
          trend={
            upcomingSessions.length > 0
              ? `${upcomingSessions.length} upcoming`
              : undefined
          }
          accent="green"
          icon={<CalendarIcon />}
        />

        <StatsCard
          label="Next Session"
          value={
            nextSession
              ? formatNextSessionDate(nextSession.scheduledAt)
              : 'None'
          }
          trend={
            nextSession
              ? formatNextSessionTime(nextSession.scheduledAt)
              : undefined
          }
          accent="primary"
          icon={<ClockIcon />}
        />

        {mentorProfile ? (
          <StatsCard
            label="Rating"
            value={rating > 0 ? rating.toFixed(1) : '\u2014'}
            trend={
              mentorProfile.reviewCount > 0
                ? `${'★'.repeat(Math.round(rating))}`
                : 'No reviews yet'
            }
            accent="yellow"
            icon={<StarIcon />}
          />
        ) : (
          <StatsCard
            label="Community"
            value={globalStats?.totalMentors ?? 0}
            trend="Mentors available"
            accent="purple"
            icon={<CommunityIcon />}
          />
        )}
      </div>

      {/* --- 2. Two-column content --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <div className="rounded-xl bg-white shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700/30">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Upcoming Sessions
            </h3>
            <button
              type="button"
              onClick={() => onSwitchTab('sessions')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View all &rarr;
            </button>
          </div>

          <div className="p-4">
            {displayedSessions.length === 0 ? (
              <div className="py-8 text-center">
                <svg
                  className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No upcoming sessions
                </p>
                {activeMatches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSwitchTab('sessions')}
                    className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    Schedule one &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    partnerName={resolveName(
                      session.mentorId === mentorProfile?.userId
                        ? session.menteeId
                        : session.mentorId
                    )}
                    partnerInitials={getInitials(
                      resolveName(
                        session.mentorId === mentorProfile?.userId
                          ? session.menteeId
                          : session.mentorId
                      )
                    )}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Matches */}
        <div className="rounded-xl bg-white shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700/30">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Active Matches
            </h3>
            <button
              type="button"
              onClick={() => onSwitchTab('matches')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View all &rarr;
            </button>
          </div>

          <div className="p-4">
            {displayedMatches.length === 0 ? (
              <div className="py-8 text-center">
                <svg
                  className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No active matches yet
                </p>
                {menteeProfile && (
                  <button
                    type="button"
                    onClick={() => onSwitchTab('browse')}
                    className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    Browse mentors &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedMatches.map((match) => (
                  <MentorCard
                    key={match.id}
                    displayName={resolveName(
                      match.mentorId === mentorProfile?.userId
                        ? match.menteeId
                        : match.mentorId
                    )}
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
      </div>

      {/* --- 3. Global Stats --- */}
      {globalStats && (
        <div className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Program Statistics
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {globalStats.totalMentors}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mentors
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {globalStats.totalMentees}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mentees
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-900/20">
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {globalStats.activeMatches}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Active Matches
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-900/20">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {globalStats.successRate}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Success Rate
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MentorshipOverview;
