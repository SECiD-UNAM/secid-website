import React, { useState, useMemo } from 'react';
import type { MentorshipMatch } from '@/types/mentorship';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MentorshipMatchesProps {
  matches: MentorshipMatch[];
  onSwitchTab: (tab: string) => void;
}

type MatchFilter = 'all' | 'active' | 'pending' | 'completed';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  active:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const FILTERS: MatchFilter[] = ['all', 'active', 'pending', 'completed'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
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
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
        No matches yet
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Browse available mentors and find the perfect match for your goals.
      </p>
      <button
        type="button"
        onClick={onBrowse}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        Browse Mentors
      </button>
    </div>
  );
}

function FilterPills({
  active,
  counts,
  onChange,
}: {
  active: MatchFilter;
  counts: Record<MatchFilter, number>;
  onChange: (f: MatchFilter) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const isActive = f === active;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              isActive
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {f} ({counts[f]})
          </button>
        );
      })}
    </div>
  );
}

function MatchCard({
  match,
  onSwitchTab,
}: {
  match: MentorshipMatch;
  onSwitchTab: (tab: string) => void;
}) {
  const scorePercent = Math.round(match.matchScore * 100);
  const displayGoals = (match.goals || []).slice(0, 3);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-4">
        {/* Left side */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-amber-400 text-sm font-bold text-white">
            {getInitials(match.id)}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
              #{match.id.slice(0, 6)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(match.createdAt)} &middot; {match.sessionsCompleted}{' '}
              {match.sessionsCompleted === 1 ? 'session' : 'sessions'}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {scorePercent}%
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[match.status] || ''}`}
          >
            {match.status}
          </span>
        </div>
      </div>

      {/* Goals */}
      {displayGoals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {displayGoals.map((goal, i) => (
            <span
              key={i}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {goal}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {match.status === 'active' && (
          <button
            type="button"
            onClick={() => onSwitchTab('sessions')}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
          >
            Schedule Session
          </button>
        )}
        {match.status === 'pending' && (
          <button
            type="button"
            onClick={() => onSwitchTab('matches')}
            className="rounded-lg border border-primary-300 px-3 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
          >
            Respond
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function MentorshipMatches({ matches, onSwitchTab }: MentorshipMatchesProps) {
  const [filter, setFilter] = useState<MatchFilter>('all');

  const counts = useMemo<Record<MatchFilter, number>>(
    () => ({
      all: matches.length,
      active: matches.filter((m) => m.status === 'active').length,
      pending: matches.filter((m) => m.status === 'pending').length,
      completed: matches.filter((m) => m.status === 'completed').length,
    }),
    [matches]
  );

  const filtered = useMemo(
    () =>
      filter === 'all' ? matches : matches.filter((m) => m.status === filter),
    [matches, filter]
  );

  if (matches.length === 0) {
    return <EmptyState onBrowse={() => onSwitchTab('browse')} />;
  }

  return (
    <div className="space-y-4">
      <FilterPills active={filter} counts={counts} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white py-12 text-center shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No {filter} matches
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((match) => (
            <MatchCard key={match.id} match={match} onSwitchTab={onSwitchTab} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MentorshipMatches;
