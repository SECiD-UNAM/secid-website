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

const STATUS_BADGE_CLASSES: Record<
  NonNullable<MentorCardProps['status']>,
  string
> = {
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
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function MentorCard({
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
  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={`flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 ${
        isClickable ? 'cursor-pointer' : ''
      }`}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {profileImage ? (
        <img
          src={profileImage}
          alt={displayName}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-secondary-500 to-blue-400 text-sm font-semibold text-white">
          {initials}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {displayName}
        </p>
        {title && (
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {title}
          </p>
        )}
        {company && (
          <p className="truncate text-xs text-gray-400 dark:text-gray-500">
            {company}
          </p>
        )}
        {sessionCount != null && (
          <p
            data-testid="session-count"
            className="mt-0.5 text-xs text-gray-400 dark:text-gray-500"
          >
            {sessionCount} sessions
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {matchScore != null && (
          <span
            data-testid="match-score"
            className="text-sm font-semibold text-primary-600 dark:text-primary-400"
          >
            {matchScore}%
          </span>
        )}

        {status && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
          >
            {status}
          </span>
        )}
      </div>
    </div>
  );
}

export default MentorCard;
