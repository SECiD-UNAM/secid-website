import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import type {
  MentorProfile,
  MenteeProfile,
  MentorshipMatch,
  MentorshipSession,
  MentorshipRequest,
  MentorshipStats,
} from '@/types/mentorship';
import {
  getMentorProfile,
  getMenteeProfile,
  getUserMatches,
  getUpcomingSessions,
  getMentorshipStats,
  getMentorshipSessions,
  subscribeMentorshipRequests,
  subscribeUpcomingSessions,
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
  const [profileNames, setProfileNames] = useState<Map<string, string>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const unsubscribeRefs = useRef<(() => void)[]>([]);

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

      // Build a name lookup from loaded profiles and matches
      const names = new Map<string, string>();
      if (mentor) names.set(mentor.userId, mentor.displayName);
      if (mentee) names.set(mentee.userId, mentee.displayName);
      // Resolve partner names from matches by fetching their profiles
      const partnerIds = new Set<string>();
      for (const match of userMatches) {
        if (!names.has(match.mentorId)) partnerIds.add(match.mentorId);
        if (!names.has(match.menteeId)) partnerIds.add(match.menteeId);
      }
      if (partnerIds.size > 0) {
        const profileFetches = Array.from(partnerIds).map(async (id) => {
          try {
            const mp = await getMentorProfile(id);
            if (mp) return { id, name: mp.displayName };
            const me = await getMenteeProfile(id);
            if (me) return { id, name: me.displayName };
          } catch {
            /* ignore */
          }
          return null;
        });
        const results = await Promise.all(profileFetches);
        for (const r of results) {
          if (r) names.set(r.id, r.name);
        }
      }
      setProfileNames(names);

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

  // Wire real-time subscriptions for requests and sessions
  useEffect(() => {
    if (!user) return;

    // Clean up previous subscriptions
    unsubscribeRefs.current.forEach((unsub) => unsub());
    unsubscribeRefs.current = [];

    const unsubRequests = subscribeMentorshipRequests(
      user.uid,
      (_requests: MentorshipRequest[]) => {
        // When new requests arrive, refresh all data
        loadData();
      }
    );

    const unsubSessions = subscribeUpcomingSessions(
      user.uid,
      (liveSessions: MentorshipSession[]) => {
        setUpcomingSessions(liveSessions);
      }
    );

    unsubscribeRefs.current = [unsubRequests, unsubSessions];

    return () => {
      unsubscribeRefs.current.forEach((unsub) => unsub());
      unsubscribeRefs.current = [];
    };
  }, [user, loadData]);

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
          className="-mb-px flex gap-1 overflow-x-auto"
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
          profileNames={profileNames}
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
