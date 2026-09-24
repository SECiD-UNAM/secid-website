import React, { useState, useEffect } from 'react';
import { getBadges, getUserGameData } from '../../lib/gamification';

import type {
  Badge,
  Achievement,
  UserGameData,
} from '../../types/gamification';

interface BadgeSystemProps {
  userId: string;
  className?: string;
}

export const BadgeSystem: React.FC<BadgeSystemProps> = ({
  userId,
  className = '',
}) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBadgeData();
  }, [userId]);

  const loadBadgeData = async () => {
    try {
      setLoading(true);
      const [allBadges, userData] = await Promise.all([
        getBadges(),
        getUserGameData(userId),
      ]);

      setBadges(allBadges);
      setUserBadges(userData.badges);
      setRecentAchievements(userData.recentAchievements);
    } catch (err) {
      setError('Failed to load badge data');
      console.error('Badge system error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badgeType: string) => {
    const icons = {
      networking: '🤝',
      learning: '📚',
      contribution: '🌟',
      mentor: '👨‍🏫',
      job_hunter: '💼',
      event_host: '🎪',
      forum_star: '💬',
      project_leader: '🚀',
      data_wizard: '🧙‍♂️',
      code_reviewer: '🔍',
    };
    return icons[badgeType] || '🏆';
  };

  const getBadgeColor = (tier: string) => {
    const colors = {
      bronze: 'text-orange-600 bg-orange-100',
      silver: 'text-gray-600 bg-gray-100',
      gold: 'text-yellow-600 bg-yellow-100',
      platinum: 'text-purple-600 bg-purple-100',
      diamond: 'text-blue-600 bg-blue-100',
    };
    return colors[tier] || 'text-gray-600 bg-gray-100';
  };

  const renderBadge = (badge: Badge, isEarned: boolean) => (
    <div
      key={badge.id}
      className={`
        relative rounded-lg border-2 p-4 transition-all duration-300
        ${
          isEarned
            ? `${getBadgeColor(badge.tier)} border-current shadow-md`
            : 'border-gray-200 bg-gray-50 text-gray-400'
        }
        ${isEarned ? 'transform cursor-pointer hover:scale-105' : ''}
      `}
      title={badge['description']}
    >
      <div className="text-center">
        <div className="mb-2 text-3xl">{getBadgeIcon(badge['type'])}</div>
        <h3 className="mb-1 text-sm font-semibold">{badge['name']}</h3>
        <p className="text-xs opacity-75">{badge.tier}</p>
        {!isEarned && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-200 bg-opacity-50">
            <span className="text-2xl">🔒</span>
          </div>
        )}
        {isEarned && recentAchievements.some((a) => a.badgeId === badge.id) && (
          <div className="absolute -right-2 -top-2 flex h-6 w-6 animate-bounce items-center justify-center rounded-full bg-red-500 text-xs text-white">
            NEW
          </div>
        )}
      </div>
    </div>
  );

  const earnedBadges = badges.filter((badge) => userBadges.includes(badge.id));
  const lockedBadges = badges.filter((badge) => !userBadges.includes(badge.id));

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-200"></div>
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
          onClick={loadBadgeData}
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
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Badges & Achievements
        </h2>
        <p className="text-gray-600">
          {earnedBadges.length} of {badges.length} badges earned
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${(earnedBadges.length / badges.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="mb-3 font-semibold text-green-800">
            🎉 Recent Achievements
          </h3>
          <div className="space-y-2">
            {recentAchievements.slice(0, 3).map((achievement, index) => {
              const badge = badges.find((b) => b.id === achievement.badgeId);
              return (
                <div key={index} className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {badge ? getBadgeIcon(badge['type']) : '🏆'}
                  </span>
                  <div>
                    <p className="font-medium text-green-800">
                      {badge?.name || 'Unknown Badge'}
                    </p>
                    <p className="text-sm text-green-600">
                      Earned{' '}
                      {new Date(achievement.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Earned Badges ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {earnedBadges.map((badge) => renderBadge(badge, true))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Available Badges ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {lockedBadges.map((badge) => renderBadge(badge, false))}
          </div>
        </div>
      )}

      {/* Badge Categories Legend */}
      <div className="mt-8 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Badge Categories</h3>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3 lg:grid-cols-5">
          <div className="flex items-center space-x-2">
            <span>🤝</span>
            <span>Networking</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>📚</span>
            <span>Learning</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🌟</span>
            <span>Contribution</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>👨‍🏫</span>
            <span>Mentoring</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>💼</span>
            <span>Career</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeSystem;
