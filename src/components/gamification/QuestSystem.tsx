import React, { useState, useEffect } from 'react';
import {
  getActiveQuests,
  getUserQuestProgress,
  completeQuestStep,
} from '../../lib/gamification';

import type { Quest, QuestProgress, QuestType } from '../../types/gamification';

interface QuestSystemProps {
  userId: string;
  className?: string;
}

export const QuestSystem: React.FC<QuestSystemProps> = ({
  userId,
  className = '',
}) => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questProgress, setQuestProgress] = useState<
    Record<string, QuestProgress>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | QuestType>('all');

  useEffect(() => {
    loadQuestData();
  }, [userId]);

  const loadQuestData = async () => {
    try {
      setLoading(true);
      const [activeQuests, userProgress] = await Promise.all([
        getActiveQuests(),
        getUserQuestProgress(userId),
      ]);

      setQuests(activeQuests);
      setQuestProgress(userProgress);
    } catch (err) {
      setError('Failed to load quest data');
      console.error('Quest system error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestAction = async (questId: string, actionType: string) => {
    try {
      await completeQuestStep(userId, questId, actionType);
      // Reload quest data to get updated progress
      await loadQuestData();
    } catch (err) {
      console.error('Failed to complete quest step:', err);
    }
  };

  const getQuestTypeIcon = (type: QuestType) => {
    const icons = {
      daily: '📅',
      weekly: '📊',
      monthly: '🗓️',
      achievement: '🏆',
      special: '✨',
    };
    return icons[type];
  };

  const getQuestTypeColor = (type: QuestType) => {
    const colors = {
      daily: 'bg-blue-100 text-blue-800 border-blue-200',
      weekly: 'bg-green-100 text-green-800 border-green-200',
      monthly: 'bg-purple-100 text-purple-800 border-purple-200',
      achievement: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      special: 'bg-pink-100 text-pink-800 border-pink-200',
    };
    return colors[type];
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    const colors = {
      easy: 'text-green-600',
      medium: 'text-yellow-600',
      hard: 'text-red-600',
    };
    return colors[difficulty];
  };

  const getDifficultyStars = (difficulty: 'easy' | 'medium' | 'hard') => {
    const stars = {
      easy: '⭐',
      medium: '⭐⭐',
      hard: '⭐⭐⭐',
    };
    return stars[difficulty];
  };

  const isQuestCompleted = (questId: string) => {
    const progress = questProgress[questId];
    return progress?.completed || false;
  };

  const getQuestProgressPercentage = (questId: string) => {
    const progress = questProgress[questId];
    if (!progress) return 0;

    const quest = quests.find((q) => q.id === questId);
    if (!quest) return 0;

    return Math.min((progress.currentProgress / quest.targetValue) * 100, 100);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const renderQuestCard = (quest: Quest) => {
    const progress = questProgress[quest.id];
    const completed = isQuestCompleted(quest.id);
    const progressPercentage = getQuestProgressPercentage(quest.id);
    const timeLeft = getTimeRemaining(quest.expiresAt);

    return (
      <div
        key={quest.id}
        className={`
          relative rounded-lg border-2 p-6 transition-all duration-300
          ${
            completed
              ? 'border-green-200 bg-green-50 opacity-75'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }
        `}
      >
        {/* Quest Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getQuestTypeIcon(quest['type'])}</span>
            <div>
              <h3
                className={`text-lg font-semibold ${completed ? 'text-green-800' : 'text-gray-900'}`}
              >
                {quest.title}
              </h3>
              <div className="mt-1 flex items-center space-x-2">
                <span
                  className={`
                  rounded-md border px-2 py-1 text-xs font-medium
                  ${getQuestTypeColor(quest['type'])}
                `}
                >
                  {quest['type']}
                </span>
                <span
                  className={`text-sm ${getDifficultyColor(quest.difficulty)}`}
                >
                  {getDifficultyStars(quest.difficulty)}
                </span>
              </div>
            </div>
          </div>

          {completed && (
            <div className="animate-bounce text-2xl text-green-600">✅</div>
          )}
        </div>

        {/* Quest Description */}
        <p className="mb-4 text-gray-600">{quest['description']}</p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>
              {progress?.currentProgress || 0} / {quest.targetValue}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                completed ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Rewards */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-yellow-500">⭐</span>
              <span className="font-semibold">{quest.rewards.points}</span>
            </div>
            {quest.rewards.badge && (
              <div className="flex items-center space-x-1">
                <span className="text-blue-500">🎖️</span>
                <span className="text-sm font-medium">
                  {quest.rewards.badge}
                </span>
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">Expires in</p>
            <p
              className={`font-semibold ${timeLeft === 'Expired' ? 'text-red-600' : 'text-gray-900'}`}
            >
              {timeLeft}
            </p>
          </div>
        </div>

        {/* Action Steps */}
        {quest.steps && quest.steps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Steps:</h4>
            {quest.steps.map((step, index) => {
              const stepCompleted =
                progress?.completedSteps?.includes(step.id) || false;
              return (
                <div
                  key={step.id}
                  className={`
                    flex items-center justify-between rounded-md border p-3
                    ${stepCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={
                        stepCompleted ? 'text-green-600' : 'text-gray-400'
                      }
                    >
                      {stepCompleted ? '✅' : '⭕'}
                    </span>
                    <span
                      className={`text-sm ${stepCompleted ? 'text-green-800' : 'text-gray-700'}`}
                    >
                      {step['description']}
                    </span>
                  </div>
                  {!stepCompleted && step.actionType && (
                    <button
                      onClick={() =>
                        handleQuestAction(quest.id, step.actionType!)
                      }
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
                    >
                      {step.actionType === 'navigate' ? 'Go' : 'Complete'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Completion Status */}
        {completed && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-100 p-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">🎉</span>
              <span className="font-semibold text-green-800">
                Quest Completed!
              </span>
            </div>
            <p className="mt-1 text-sm text-green-700">
              You earned {quest.rewards.points} points!
            </p>
          </div>
        )}
      </div>
    );
  };

  const filteredQuests = quests.filter((quest) => {
    if (activeFilter === 'all') return true;
    return quest['type'] === activeFilter;
  });

  const activeQuests = filteredQuests.filter(
    (quest) => !isQuestCompleted(quest.id)
  );
  const completedQuests = filteredQuests.filter((quest) =>
    isQuestCompleted(quest.id)
  );

  if (loading) {
    return (
      <div className={`${className} animate-pulse space-y-6`}>
        <div className="flex space-x-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-md bg-gray-200"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-gray-200"></div>
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
          onClick={loadQuestData}
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
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Quest System</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`
              rounded-md px-4 py-2 font-medium transition-colors
              ${
                activeFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            All Quests
          </button>
          {(
            [
              'daily',
              'weekly',
              'monthly',
              'achievement',
              'special',
            ] as QuestType[]
          ).map((type) => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`
                flex items-center space-x-2 rounded-md px-4 py-2 font-medium capitalize transition-colors
                ${
                  activeFilter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span>{getQuestTypeIcon(type)}</span>
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quest Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-semibold text-blue-900">Active Quests</p>
              <p className="text-2xl font-bold text-blue-700">
                {activeQuests.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-900">Completed</p>
              <p className="text-2xl font-bold text-green-700">
                {completedQuests.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-semibold text-yellow-900">Available Points</p>
              <p className="text-2xl font-bold text-yellow-700">
                {activeQuests.reduce(
                  (sum, quest) => sum + quest.rewards.points,
                  0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Quests */}
      {activeQuests.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-xl font-semibold text-gray-900">
            Active Quests
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {activeQuests.map(renderQuestCard)}
          </div>
        </div>
      )}

      {/* Completed Quests */}
      {completedQuests.length > 0 && (
        <div>
          <h3 className="mb-4 text-xl font-semibold text-gray-900">
            Completed Quests
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {completedQuests.slice(0, 6).map(renderQuestCard)}
          </div>
          {completedQuests.length > 6 && (
            <div className="mt-4 text-center">
              <button className="font-medium text-blue-600 hover:text-blue-800">
                View All Completed Quests ({completedQuests.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {filteredQuests.length === 0 && (
        <div className="py-12 text-center">
          <div className="mb-4 text-6xl">🎯</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            No Quests Available
          </h3>
          <p className="text-gray-600">
            Check back later for new challenges and quests!
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestSystem;
