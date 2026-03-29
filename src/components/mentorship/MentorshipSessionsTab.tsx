import React, { useState, useMemo } from 'react';
import type { MentorshipSession, MentorshipMatch } from '@/types/mentorship';
import MentorshipSessions from './MentorshipSessions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MentorshipSessionsTabProps {
  sessions: MentorshipSession[];
  matches: MentorshipMatch[];
  onSessionCreated: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUpcoming(session: MentorshipSession): boolean {
  return (
    session.status === 'scheduled' &&
    new Date(session.scheduledAt).getTime() > Date.now()
  );
}

function formatSessionDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatSessionTime(date: Date): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  );
}

function CardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl bg-white py-12 text-center shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
      <svg
        className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
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
        No sessions yet
      </p>
    </div>
  );
}

function MatchSelector({
  activeMatches,
  onSelect,
  onBack,
}: {
  activeMatches: MentorshipMatch[];
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <CardWrapper>
      <div className="mb-6 flex items-center gap-3">
        <BackButton onClick={onBack} />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Select Match
        </h2>
      </div>

      <div className="space-y-2">
        {activeMatches.map((match) => (
          <button
            key={match.id}
            type="button"
            onClick={() => onSelect(match.id)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700/60"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-amber-400 text-xs font-bold text-white">
                {match.id.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Match #{match.id.slice(0, 6)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {match.sessionsCompleted}{' '}
                  {match.sessionsCompleted === 1 ? 'session' : 'sessions'}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {Math.round(match.matchScore * 100)}%
            </span>
          </button>
        ))}
      </div>
    </CardWrapper>
  );
}

function SessionCardSimple({
  session,
  faded,
}: {
  session: MentorshipSession;
  faded?: boolean;
}) {
  const typeBadge: Record<string, string> = {
    video: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    voice:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    chat: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'in-person':
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };

  const statusBadge: Record<string, string> = {
    scheduled:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    'no-show':
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 ${faded ? 'opacity-75' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {session.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatSessionDate(session.scheduledAt)},{' '}
          {formatSessionTime(session.scheduledAt)} &middot; {session.duration}{' '}
          min
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge[session.type] || ''}`}
        >
          {session.type}
        </span>
        {faded && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[session.status] || ''}`}
          >
            {session.status}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function MentorshipSessionsTab({
  sessions,
  matches,
  onSessionCreated,
}: MentorshipSessionsTabProps) {
  const [creating, setCreating] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const activeMatches = useMemo(
    () => matches.filter((m) => m.status === 'active'),
    [matches]
  );

  const upcoming = useMemo(() => sessions.filter(isUpcoming), [sessions]);

  const past = useMemo(
    () => sessions.filter((s) => !isUpcoming(s)),
    [sessions]
  );

  function handleSessionCreated() {
    setCreating(false);
    setSelectedMatchId(null);
    onSessionCreated();
  }

  function handleCancel() {
    setCreating(false);
    setSelectedMatchId(null);
  }

  // State 1: Creating with a selected match -- show MentorshipSessions form
  if (creating && selectedMatchId) {
    return (
      <CardWrapper>
        <div className="mb-6 flex items-center gap-3">
          <BackButton onClick={() => setSelectedMatchId(null)} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Schedule Session
          </h2>
        </div>
        <MentorshipSessions
          matchId={selectedMatchId}
          mode="create"
          onSessionCreated={handleSessionCreated}
          onCancel={handleCancel}
        />
      </CardWrapper>
    );
  }

  // State 2: Creating but no match selected -- show match selector
  if (creating && !selectedMatchId) {
    return (
      <MatchSelector
        activeMatches={activeMatches}
        onSelect={setSelectedMatchId}
        onBack={handleCancel}
      />
    );
  }

  // State 3: Session list view
  return (
    <div className="space-y-4">
      {/* Header with "Schedule Session" button */}
      {activeMatches.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Schedule Session
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Upcoming
              </h3>
              <div className="space-y-2">
                {upcoming.map((session) => (
                  <SessionCardSimple key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Past
              </h3>
              <div className="space-y-2">
                {past.map((session) => (
                  <SessionCardSimple key={session.id} session={session} faded />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MentorshipSessionsTab;
