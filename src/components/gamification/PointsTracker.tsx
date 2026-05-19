import React, { useState, useEffect } from 'react';
import {
  getUserGameData,
  getPointsHistory,
  getPointsBreakdown,
} from '../../lib/gamification';

import type {
  PointsActivity,
  UserGameData,
  PointsBreakdown,
} from '../../types/gamification';

interface PointsTrackerProps {
  userId: string;
  className?: string;
  showHistory?: boolean;
}

export const PointsTracker: React.FC<PointsTrackerProps> = ({
  userId,
  className = '',
  showHistory = true,
}) => {
  const [userData, setUserData] = useState<UserGameData | null>(null);
  const [pointsHistory, setPointsHistory] = useState<PointsActivity[]>([]);
  const [pointsBreakdown, setPointsBreakdown] =
    useState<PointsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'history' | 'breakdown'
  >('overview');

  useEffect(() => {
    loadPointsData();
  }, [userId]);

  const loadPointsData = async () => {
    try {
      setLoading(true);
      const [gameData, history, breakdown] = await Promise.all([
        getUserGameData(userId),
        getPointsHistory(userId, 50),
        getPointsBreakdown(userId),
      ]);

      setUserData(gameData);
      setPointsHistory(history);
      setPointsBreakdown(breakdown);
    } catch (err) {
      setError('Failed to load points data');
      console.error('Points tracker error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    const icons = {
      login: '🔐',
      profile_complete: '📝',
      job_application: '💼',
      forum_post: '💬',
      event_attendance: '🎪',
      mentorship_session: '👨‍🏫',
      resource_upload: '📚',
      network_connection: '🤝',
      skill_assessment: '🎯',
      job_posting: '📢',
      comment: '💭',
      like: '👍',
      share: '🔄',
      referral: '🎁',
    };
    return icons[activityType] || '⭐';
  };

  const getLevelProgress = () => {
    if (!userData) return { current: 0, next: 0, progress: 0 };

    const pointsThresholds = [
      0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000,
    ];
    const currentLevel = userData.level;
    const currentLevelThreshold = pointsThresholds[currentLevel - 1] || 0;
    const nextLevelThreshold =
      pointsThresholds[currentLevel] ||
      pointsThresholds[pointsThresholds.length - 1];

    const progress =
      ((userData.totalPoints - currentLevelThreshold) /
        (nextLevelThreshold - currentLevelThreshold)) *
      100;

    return {
      current: currentLevelThreshold,
      next: nextLevelThreshold,
      progress: Math.min(progress, 100),
    };
  };

  const renderOverview = () => {
    if (!userData) return null;

    const levelProgress = getLevelProgress();

    return (
      <div className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Total Points</p>
                <p className="text-3xl font-bold">
                  {userData.totalPoints.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">Current Level</p>
                <p className="text-3xl font-bold">{userData.level}</p>
              </div>
              <div className="text-4xl">🏆</div>
            </div>
          </div>

          <div className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100">Current Streak</p>
                <p className="text-3xl font-bold">{userData.streak}</p>
              </div>
              <div className="text-4xl">🔥</div>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Level Progress</h3>
            <span className="text-sm text-gray-500">
              Level {userData.level} → {userData.level + 1}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{levelProgress.current.toLocaleString()} points</span>
              <span>{levelProgress.next.toLocaleString()} points</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${levelProgress.progress}%` }}
              ></div>
            </div>
            <p className="text-center text-sm text-gray-600">
              {(levelProgress.next - userData.totalPoints).toLocaleString()}{' '}
              points to next level
            </p>
          </div>
        </div>

        {/* Recent Activity Preview */}
        {pointsHistory.length > 0 && (
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
            <div className="space-y-3">
              {pointsHistory.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">
                      {getActivityIcon(activity.activityType)}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {activity['description']}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity['timestamp']).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">
                    +{activity.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="rounded-lg border bg-white">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Points History</h3>
        <p className="text-gray-600">Complete activity log</p>
      </div>

      <div className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
        {pointsHistory.map((activity, index) => (
          <div key={index} className="p-4 transition-colors hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xl">
                  {getActivityIcon(activity.activityType)}
                </span>
                <div>
                  <p className="font-medium text-gray-900">
                    {activity['description']}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(activity['timestamp']).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="font-semibold text-green-600">
                +{activity.points}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBreakdown = () => {
    if (!pointsBreakdown) return null;

    const categories = Object.entries(pointsBreakdown.byCategory);
    const totalCategoryPoints = categories.reduce(
      (sum, [, points]) => sum + points,
      0
    );

    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">Points by Category</h3>
          <div className="space-y-4">
            {categories.map(([category, points]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">
                    {category.replace('_', ' ')}
                  </span>
                  <span className="font-semibold">{points} pts</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{
                      width: `${(points / totalCategoryPoints) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-6">
            <h4 className="mb-3 font-semibold">This Month</h4>
            <p className="text-2xl font-bold text-blue-600">
              {pointsBreakdown.thisMonth}
            </p>
            <p className="text-sm text-gray-600">Points earned</p>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h4 className="mb-3 font-semibold">This Week</h4>
            <p className="text-2xl font-bold text-green-600">
              {pointsBreakdown.thisWeek}
            </p>
            <p className="text-sm text-gray-600">Points earned</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`${className} animate-pulse space-y-6`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-200"></div>
          ))}
        </div>
        <div className="h-32 rounded-lg bg-gray-200"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} py-8 text-center`}>
        <div className="mb-4 text-red-600">⚠️</div>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadPointsData}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Navigation Tabs */}
      {showHistory && (
        <div className="mb-6 flex space-x-1 rounded-lg bg-gray-100 p-1">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'history', label: 'History' },
            { key: 'breakdown', label: 'Breakdown' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`
                flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors
                ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'breakdown' && renderBreakdown()}
    </div>
  );
};

export default PointsTracker;
