/**
 * Gamification Type Definitions
 * Types for the gamification system including badges, quests, points, and leaderboards
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  type:
    | 'networking'
    | 'learning'
    | 'contribution'
    | 'mentor'
    | 'job_hunter'
    | 'event_host'
    | 'forum_star'
    | 'project_leader'
    | 'data_wizard'
    | 'code_reviewer';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  requirements: Record<string, number>;
  icon?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface Achievement {
  userId: string;
  badgeId: string;
  earnedAt: string;
  metadata?: Record<string, any>;
}

export interface UserGameData {
  userId: string;
  totalPoints: number;
  level: number;
  streak: number;
  badges: string[];
  recentAchievements: Achievement[];
  lastLogin: string;
  seasonalPoints?: number;
  rank?: number;
  experience?: number;
}

export interface PointsActivity {
  userId: string;
  activityType: string;
  points: number;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
  category?: 'social' | 'learning' | 'contribution' | 'engagement';
}

export interface PointsBreakdown {
  byCategory: Record<string, number>;
  thisWeek: number;
  thisMonth: number;
  seasonal?: number;
  allTime?: number;
}

export type LeaderboardType = 'points' | 'level' | 'badges' | 'streak';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatar?: string;
  points?: number;
  level?: number;
  badgeCount?: number;
  streak?: number;
  rank: number;
  title?: string;
  lastActive?: string;
}

export type QuestType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'achievement'
  | 'special';

export interface QuestStep {
  id: string;
  description: string;
  actionType?: 'navigate' | 'complete' | 'interact';
  targetUrl?: string;
  requiredData?: Record<string, any>;
}

export interface QuestRewards {
  points: number;
  badge?: string;
  specialReward?: string;
  experience?: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  difficulty: 'easy' | 'medium' | 'hard';
  targetValue: number;
  currentValue?: number;
  rewards: QuestRewards;
  expiresAt: string;
  category: string;
  steps?: QuestStep[];
  prerequisites?: string[];
  isRepeatable?: boolean;
  cooldownHours?: number;
}

export interface QuestProgress {
  userId: string;
  questId: string;
  currentProgress: number;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
  completedSteps?: string[];
  metadata?: Record<string, any>;
}

export interface GamificationSettings {
  enabledFeatures: {
    points: boolean;
    badges: boolean;
    leaderboards: boolean;
    quests: boolean;
    achievements: boolean;
  };
  pointsMultiplier: number;
  dailyQuestLimit: number;
  weeklyQuestLimit: number;
  streakBonusEnabled: boolean;
  leaderboardUpdateInterval: number;
}

export interface UserEngagementMetrics {
  userId: string;
  loginStreak: number;
  totalLogins: number;
  averageSessionTime: number;
  activitiesCompleted: number;
  socialInteractions: number;
  contentCreated: number;
  engagementScore: number;
  lastActiveDate: string;
}

export interface SeasonalChallenge {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  rewards: QuestRewards;
  participants: number;
  maxParticipants?: number;
  type: 'individual' | 'team' | 'community';
  status: 'upcoming' | 'active' | 'completed';
}

export interface TeamChallenge extends SeasonalChallenge {
  teamSize: number;
  teams: Array<{
    id: string;
    name: string;
    members: string[];
    score: number;
    rank: number;
  }>;
}

export interface NotificationPreferences {
  badges: boolean;
  levelUp: boolean;
  questCompletion: boolean;
  leaderboardRank: boolean;
  streakReminder: boolean;
  weeklyDigest: boolean;
}

export interface GamificationProfile {
  userId: string;
  preferences: NotificationPreferences;
  favoriteCategories: string[];
  goals: {
    dailyPoints: number;
    weeklyQuests: number;
    targetLevel: number;
  };
  statistics: {
    joinDate: string;
    totalTimeSpent: number;
    favoriteActivity: string;
    bestStreak: number;
    totalBadges: number;
  };
}

// API Response Types
export interface GamificationResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface LeaderboardResponse
  extends GamificationResponse<LeaderboardEntry[]> {
  totalCount: number;
  page: number;
  limit: number;
  period: 'all' | 'month' | 'week';
  type: LeaderboardType;
}

export interface QuestListResponse extends GamificationResponse<Quest[]> {
  activeCount: number;
  completedCount: number;
  availablePoints: number;
}

export interface UserProgressResponse
  extends GamificationResponse<UserGameData> {
  nextLevelPoints: number;
  completionPercentage: number;
  recommendations: string[];
}

// Event Types for Real-time Updates
export interface GamificationEvent {
  type:
    | 'points_awarded'
    | 'badge_earned'
    | 'level_up'
    | 'quest_completed'
    | 'streak_updated';
  userId: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface PointsAwardedEvent extends GamificationEvent {
  type: 'points_awarded';
  data: {
    points: number;
    activity: string;
    total: number;
  };
}

export interface BadgeEarnedEvent extends GamificationEvent {
  type: 'badge_earned';
  data: {
    badgeId: string;
    badgeName: string;
    tier: string;
  };
}

export interface LevelUpEvent extends GamificationEvent {
  type: 'level_up';
  data: {
    newLevel: number;
    previousLevel: number;
    bonusPoints: number;
  };
}

export interface QuestCompletedEvent extends GamificationEvent {
  type: 'quest_completed';
  data: {
    questId: string;
    questName: string;
    rewards: QuestRewards;
  };
}

// Analytics and Reporting Types
export interface GamificationAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  metrics: {
    totalUsers: number;
    activeUsers: number;
    pointsAwarded: number;
    badgesEarned: number;
    questsCompleted: number;
    averageEngagement: number;
  };
  trends: {
    userGrowth: number;
    engagementChange: number;
    topActivities: Array<{
      activity: string;
      count: number;
      points: number;
    }>;
  };
}

export interface UserRetentionMetrics {
  userId: string;
  retentionRate: number;
  engagementTrend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  lastEngagement: string;
}

// Configuration Types
export interface GamificationConfig {
  features: GamificationSettings;
  pointsConfig: Record<string, number>;
  levelThresholds: number[];
  badgeDefinitions: Badge[];
  questTemplates: Omit<Quest, 'id' | 'expiresAt'>[];
  seasonalEvents: SeasonalChallenge[];
}

// All types are exported individually above
// Use named imports: import type { Badge, Achievement, Quest } from './gamification';
