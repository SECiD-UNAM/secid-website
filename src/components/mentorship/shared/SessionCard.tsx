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

const TYPE_BADGE_CLASSES: Record<MentorshipSession['type'], string> = {
  video: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  voice:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  chat: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'in-person':
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function formatSessionDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatSessionTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SessionCard({
  session,
  partnerName,
  partnerInitials,
  onJoin,
  onEdit,
  compact = false,
}: SessionCardProps) {
  const isUpcoming = session.status === 'scheduled';
  const showJoinButton = isUpcoming && onJoin && !compact;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-amber-400 text-xs font-semibold text-white">
        {partnerInitials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {session.title}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {partnerName} &middot; {formatSessionDate(session.scheduledAt)},{' '}
          {formatSessionTime(session.scheduledAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASSES[session.type]}`}
        >
          {session.type}
        </span>

        {showJoinButton && (
          <button
            type="button"
            onClick={onJoin}
            className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-700"
          >
            Join
          </button>
        )}

        {onEdit && !compact && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

export default SessionCard;
