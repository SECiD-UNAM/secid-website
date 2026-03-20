import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslations } from '../../hooks/useTranslations';
import type {
  MentorProfile,
  MenteeProfile,
  MentorshipMatch,
  MentorshipSession,
  MentorshipStats,
  User,
} from '../../types';
import {
  getMentorProfile,
  getMenteeProfile,
  getUserMatches,
  getUpcomingSessions,
  getMentorshipStats,
} from '../../lib/mentorship';

interface MentorshipDashboardProps {
  userRole: 'mentor' | 'mentee' | 'both';
}

interface DashboardStats {
  activeMatches: number;
  completedSessions: number;
  upcomingSessions: number;
  averageRating: number;
}

export default function MentorshipDashboard({
  userRole,
}: MentorshipDashboardProps) {
  const { user } = useAuthContext();
  const t = useTranslations();

  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(
    null
  );
  const [menteeProfile, setMenteeProfile] = useState<MenteeProfile | null>(
    null
  );
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<MentorshipSession[]>(
    []
  );
  const [stats, setStats] = useState<DashboardStats>({
    activeMatches: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    averageRating: 0,
  });
  const [globalStats, setGlobalStats] = useState<MentorshipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'matches' | 'sessions' | 'profile'
  >('overview');

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Load profiles based on user role
        const promises: Promise<any>[] = [];

        if (userRole === 'mentor' || userRole === 'both') {
          promises.push(getMentorProfile(user.uid));
        }

        if (userRole === 'mentee' || userRole === 'both') {
          promises.push(getMenteeProfile(user.uid));
        }

        promises.push(getUserMatches(user.uid));
        promises.push(getUpcomingSessions(user.uid));
        promises.push(getMentorshipStats());

        const results = await Promise.all(promises);

        let resultIndex = 0;

        if (userRole === 'mentor' || userRole === 'both') {
          setMentorProfile(results[resultIndex] || null);
          resultIndex++;
        }

        if (userRole === 'mentee' || userRole === 'both') {
          setMenteeProfile(results[resultIndex] || null);
          resultIndex++;
        }

        const userMatches = results[resultIndex] || [];
        const sessions = results[resultIndex + 1] || [];
        const globalStatsData = results[resultIndex + 2] || null;

        setMatches(userMatches);
        setUpcomingSessions(sessions);
        setGlobalStats(globalStatsData);

        // Calculate user stats
        const activeMatches = userMatches.filter(
          (m: MentorshipMatch) => m.status === 'active'
        ).length;
        const completedSessions = userMatches.reduce(
          (total: number, match: MentorshipMatch) => {
            // This would be calculated from actual session data
            return total;
          },
          0
        );

        setStats({
          activeMatches,
          completedSessions,
          upcomingSessions: sessions.length,
          averageRating: userRole === 'mentor' ? mentorProfile?.rating || 0 : 0,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, userRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t?.common?.loading || 'Loading...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {(userRole === 'mentee' || userRole === 'both') && (
          <button
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            onClick={() => setActiveTab('matches')}
          >
            {t?.mentorship?.dashboard?.findMentor || 'Find a Mentor'}
          </button>
        )}

        {(userRole === 'mentor' || userRole === 'both') && (
          <button
            className="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            onClick={() => setActiveTab('profile')}
          >
            {t?.mentorship?.dashboard?.editProfile || 'Edit Profile'}
          </button>
        )}

        <button
          className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={() => setActiveTab('sessions')}
        >
          {t?.mentorship?.dashboard?.scheduleSession || 'Schedule Session'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            {
              key: 'overview',
              label: t?.mentorship?.dashboard?.overview || 'Overview',
            },
            {
              key: 'matches',
              label: t?.mentorship?.dashboard?.matches || 'Matches',
              badge: matches.filter((m) => m['status'] === 'pending').length,
            },
            {
              key: 'sessions',
              label: t?.mentorship?.dashboard?.sessions || 'Sessions',
              badge: upcomingSessions.length,
            },
            {
              key: 'profile',
              label: t?.mentorship?.dashboard?.profile || 'Profile',
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t?.mentorship?.dashboard?.activeMatches || 'Active Matches'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeMatches}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t?.mentorship?.dashboard?.completedSessions ||
                    'Completed Sessions'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completedSessions}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t?.mentorship?.dashboard?.upcomingSessions ||
                    'Upcoming Sessions'}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.upcomingSessions}
                </p>
              </div>
              {userRole === 'mentor' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t?.mentorship?.dashboard?.averageRating || 'Rating'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.averageRating.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t?.mentorship?.dashboard?.recentActivity || 'Recent Activity'}
              </h2>

              {matches.filter((m) => m['status'] === 'pending').length > 0 ? (
                <div className="space-y-3">
                  {matches
                    .filter((m) => m['status'] === 'pending')
                    .slice(0, 3)
                    .map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50"
                      >
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {userRole === 'mentor'
                              ? t?.mentorship?.dashboard?.newMenteeRequest ||
                                'New mentee request'
                              : t?.mentorship?.dashboard
                                  ?.mentorRequestPending ||
                                'Mentor request pending'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(match['createdAt']).toLocaleDateString()}
                          </p>
                        </div>
                        <button className="rounded-md bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700">
                          {t?.mentorship?.dashboard?.view || 'View'}
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm italic text-gray-500 dark:text-gray-400">
                  No hay actividad reciente
                </p>
              )}
            </div>

            {/* Global Statistics */}
            {globalStats && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  {t?.mentorship?.dashboard?.programStats ||
                    'Program Statistics'}
                </h2>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {globalStats.totalMentors}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t?.mentorship?.dashboard?.totalMentors || 'Mentors'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {globalStats.totalMentees}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t?.mentorship?.dashboard?.totalMentees || 'Mentees'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-900/20">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {globalStats.activeMatches}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t?.mentorship?.dashboard?.globalActiveMatches ||
                        'Active Matches'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-900/20">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {(globalStats.successRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t?.mentorship?.dashboard?.successRate || 'Success Rate'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            {matches.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  {t?.mentorship?.dashboard?.noMatches || 'No matches yet'}
                </h3>
                <p className="mb-4 text-gray-500 dark:text-gray-400">
                  {t?.mentorship?.dashboard?.noMatchesDescription ||
                    'Start by finding a mentor or becoming one.'}
                </p>
                <button className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700">
                  {userRole === 'mentee'
                    ? t?.mentorship?.dashboard?.findMentor || 'Find a Mentor'
                    : t?.mentorship?.dashboard?.becomeMentor ||
                      'Become a Mentor'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {userRole === 'mentor'
                            ? t?.mentorship?.dashboard?.menteeMatch ||
                              'Mentee Match'
                            : t?.mentorship?.dashboard?.mentorMatch ||
                              'Mentor Match'}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            match['status'] === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : match['status'] === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {t?.mentorship?.status?.[match['status']] ||
                            match['status']}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {Math.round(match.matchScore * 100)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t?.mentorship?.dashboard?.compatibility ||
                            'Compatibility'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      {match['status'] === 'pending' && (
                        <button className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                          {userRole === 'mentor'
                            ? t?.mentorship?.dashboard?.acceptRequest ||
                              'Accept'
                            : t?.mentorship?.dashboard?.viewRequest || 'View'}
                        </button>
                      )}
                      {match['status'] === 'active' && (
                        <button className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                          {t?.mentorship?.dashboard?.scheduleSession ||
                            'Schedule Session'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {upcomingSessions.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="mx-auto mb-4 h-12 w-12 text-gray-400"
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
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  {t?.mentorship?.dashboard?.noSessions ||
                    'No sessions scheduled'}
                </h3>
                <p className="mb-4 text-gray-500 dark:text-gray-400">
                  {t?.mentorship?.dashboard?.noSessionsDescription ||
                    'Schedule a session with your mentor or mentee.'}
                </p>
                <button className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700">
                  {t?.mentorship?.dashboard?.scheduleSession ||
                    'Schedule Session'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {session.title}
                      </h3>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {t?.mentorship?.sessionType?.[session['type']] ||
                          session['type']}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(session.scheduledAt).toLocaleString()} (
                      {session.duration} min)
                    </p>
                    {session.description && (
                      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        {session['description']}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
                        {t?.mentorship?.dashboard?.joinSession || 'Join'}
                      </button>
                      <button className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                        {t?.mentorship?.dashboard?.editSession || 'Edit'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t.mentorship.dashboard.yourProfile}
            </h2>

            {(userRole === 'mentor' || userRole === 'both') &&
              mentorProfile && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-blue-50 px-6 py-4 dark:border-gray-700 dark:bg-blue-900/20">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t.mentorship.dashboard.mentorProfile}
                    </h3>
                    <button className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      {t.mentorship.dashboard.editProfile}
                    </button>
                  </div>

                  <div className="flex flex-col gap-6 p-6 sm:flex-row">
                    <div className="flex-shrink-0">
                      {mentorProfile.profileImage ? (
                        <img
                          src={mentorProfile.profileImage}
                          alt={mentorProfile.displayName}
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <svg
                            className="h-10 w-10 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {mentorProfile.displayName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {mentorProfile.experience.currentPosition} at{' '}
                          {mentorProfile.experience.currentCompany}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {mentorProfile.bio}
                      </p>

                      <div className="flex gap-6">
                        <div className="text-center">
                          <span className="block text-xl font-bold text-blue-600 dark:text-blue-400">
                            {mentorProfile.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t.mentorship.dashboard.rating}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="block text-xl font-bold text-green-600 dark:text-green-400">
                            {mentorProfile.totalSessions}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t.mentorship.dashboard.sessions}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="block text-xl font-bold text-purple-600 dark:text-purple-400">
                            {mentorProfile.currentMentees}/
                            {mentorProfile.maxMentees}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t.mentorship.dashboard.mentees}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t.mentorship.dashboard.expertise}
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {mentorProfile.expertiseAreas
                            .slice(0, 5)
                            .map((skill, index) => (
                              <span
                                key={index}
                                className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {skill}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {(userRole === 'mentee' || userRole === 'both') &&
              menteeProfile && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-green-50 px-6 py-4 dark:border-gray-700 dark:bg-green-900/20">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t.mentorship.dashboard.menteeProfile}
                    </h3>
                    <button className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      {t.mentorship.dashboard.editProfile}
                    </button>
                  </div>

                  <div className="flex flex-col gap-6 p-6 sm:flex-row">
                    <div className="flex-shrink-0">
                      {menteeProfile.profileImage ? (
                        <img
                          src={menteeProfile.profileImage}
                          alt={menteeProfile.displayName}
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <svg
                            className="h-10 w-10 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {menteeProfile.displayName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t.mentorship.level[menteeProfile.currentLevel]} -{' '}
                          {menteeProfile.background.yearsOfExperience}{' '}
                          {t.mentorship.dashboard.yearsExperience}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {menteeProfile.bio}
                      </p>

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t.mentorship.dashboard.goals}
                        </h5>
                        <ul className="space-y-1">
                          {menteeProfile.goals
                            .slice(0, 3)
                            .map((goal, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                              >
                                <svg
                                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4"
                                  />
                                </svg>
                                {goal}
                              </li>
                            ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t.mentorship.dashboard.interests}
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {menteeProfile.interests
                            .slice(0, 5)
                            .map((interest, index) => (
                              <span
                                key={index}
                                className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
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

            {!mentorProfile && !menteeProfile && (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
                <svg
                  className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {t.mentorship.dashboard.noProfile}
                </h3>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                  {t.mentorship.dashboard.noProfileDescription}
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    onClick={() => {
                      const lang = window.location.pathname.startsWith('/en')
                        ? 'en'
                        : 'es';
                      window.location.href = `/${lang}/dashboard/mentorship/browse`;
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    {t.mentorship.dashboard.createMentorProfile}
                  </button>
                  <button
                    onClick={() => {
                      const lang = window.location.pathname.startsWith('/en')
                        ? 'en'
                        : 'es';
                      window.location.href = `/${lang}/dashboard/mentorship/browse`;
                    }}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    {t.mentorship.dashboard.createMenteeProfile}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
