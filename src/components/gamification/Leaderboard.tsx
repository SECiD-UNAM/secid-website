import React, { useState, useEffect } from 'react';
import { getLeaderboard, getUserRank } from '../../lib/gamification';

import type {
  LeaderboardEntry,
  LeaderboardType,
} from '../../types/gamification';

interface LeaderboardProps {
  userId: string;
  className?: string;
  limit?: number;
  showUserRank?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  userId,
  className = '',
  limit = 20,
  showUserRank = true,
}) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [activeType, setActiveType] = useState<LeaderboardType>('points');
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboardData();
  }, [activeType, period, limit]);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      const [leaderboard, rank] = await Promise.all([
        getLeaderboard(activeType, period, limit),
        showUserRank
          ? getUserRank(userId, activeType, period)
          : Promise.resolve(null),
      ]);

      setLeaderboardData(leaderboard);
      setUserRank(rank);
    } catch (err) {
      setError('Failed to load leaderboard data');
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const getTypeIcon = (type: LeaderboardType) => {
    const icons = {
      points: '⭐',
      level: '🏆',
      badges: '🎖️',
      streak: '🔥',
    };
    return icons[type];
  };

  const getTypeLabel = (type: LeaderboardType) => {
    const labels = {
      points: 'Points',
      level: 'Level',
      badges: 'Badges',
      streak: 'Streak',
    };
    return labels[type];
  };

  const formatValue = (entry: LeaderboardEntry) => {
    switch (activeType) {
      case 'points':
        return entry?.points?.toLocaleString() || '0';
      case 'level':
        return `Level ${entry.level || 0}`;
      case 'badges':
        return `${entry.badgeCount || 0} badges`;
      case 'streak':
        return `${entry.streak || 0} days`;
      default:
        return '0';
    }
  };

  const renderUserCard = (
    entry: LeaderboardEntry,
    position: number,
    isCurrentUser = false
  ) => (
    <div
      key={entry['userId']}
      className={`
        flex items-center justify-between rounded-lg border p-4 transition-all duration-200
        ${
          isCurrentUser
            ? 'border-blue-200 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${position <= 3 ? 'ring-2 ring-yellow-200' : ''}
      `}
    >
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div
            className={`
            flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold
            ${
              position === 1
                ? 'bg-yellow-100 text-yellow-800'
                : position === 2
                  ? 'bg-gray-100 text-gray-800'
                  : position === 3
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-50 text-gray-600'
            }
          `}
          >
            {getPositionIcon(position)}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 font-bold text-white">
            {entry.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3
              className={`font-semibold ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}
            >
              {entry.displayName}
              {isCurrentUser && (
                <span className="ml-2 text-blue-600">(You)</span>
              )}
            </h3>
            <p className="text-sm text-gray-500">{entry.title || 'Member'}</p>
          </div>
        </div>
      </div>

      <div className="text-right">
        <p
          className={`text-lg font-bold ${isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}
        >
          {formatValue(entry)}
        </p>
        {activeType === 'points' && entry.level && (
          <p className="text-sm text-gray-500">Level {entry.level}</p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`${className} animate-pulse space-y-4`}>
        <div className="flex space-x-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 flex-1 rounded-md bg-gray-200"></div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} py-8 text-center`}>
        <div className="mb-4 text-red-600">⚠️</div>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadLeaderboardData}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Leaderboard</h2>

        {/* Type Selection */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(['points', 'level', 'badges', 'streak'] as LeaderboardType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`
                flex items-center space-x-2 rounded-md px-4 py-2 font-medium transition-colors
                ${
                  activeType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              >
                <span>{getTypeIcon(type)}</span>
                <span>{getTypeLabel(type)}</span>
              </button>
            )
          )}
        </div>

        {/* Period Selection */}
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'All Time' },
            { key: 'month', label: 'This Month' },
            { key: 'week', label: 'This Week' },
          ].map((periodOption) => (
            <button
              key={periodOption.key}
              onClick={() => setPeriod(periodOption.key as any)}
              className={`
                rounded-md px-3 py-1 text-sm transition-colors
                ${
                  period === periodOption.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {periodOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* User's Current Rank */}
      {showUserRank && userRank && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Your Ranking
          </h3>
          {renderUserCard(userRank, userRank.rank, true)}
        </div>
      )}

      {/* Top Rankings */}
      <div className="space-y-3">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Top {getTypeLabel(activeType)} Leaders
        </h3>

        {leaderboardData.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="mb-4 text-4xl">🏆</div>
            <p>No leaderboard data available yet.</p>
            <p className="mt-2 text-sm">
              Start engaging with the platform to see rankings!
            </p>
          </div>
        ) : (
          leaderboardData.map((entry, index) =>
            renderUserCard(entry, index + 1, entry.userId === userId)
          )
        )}
      </div>

      {/* Competition Info */}
      <div className="mt-8 rounded-lg bg-gray-50 p-4">
        <h4 className="mb-2 font-semibold text-gray-900">
          🏁 How Rankings Work
        </h4>
        <div className="space-y-1 text-sm text-gray-600">
          <p>
            <strong>Points:</strong> Earned through platform activities and
            engagement
          </p>
          <p>
            <strong>Level:</strong> Increases as you accumulate more points
          </p>
          <p>
            <strong>Badges:</strong> Achievements unlocked through specific
            milestones
          </p>
          <p>
            <strong>Streak:</strong> Consecutive days of platform activity
          </p>
        </div>
      </div>

      {/* Motivational Footer */}
      {userRank && userRank.rank > 10 && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="font-semibold text-blue-900">Keep climbing!</p>
              <p className="text-sm text-blue-700">
                You're #{userRank.rank}. Complete more activities to improve
                your ranking!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
