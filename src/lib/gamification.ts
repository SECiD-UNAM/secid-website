import type {
  Badge,
  Achievement,
  UserGameData,
  PointsActivity,
  PointsBreakdown,
  LeaderboardEntry,
  LeaderboardType,
  Quest,
  QuestProgress,
  QuestType,
} from '../types/gamification';

/**
 * Gamification System Library
 * Handles points, badges, quests, and leaderboards for user engagement
 */

// Constants
const POINTS_CONFIG = {
  LOGIN: 5,
  PROFILE_COMPLETE: 50,
  JOB_APPLICATION: 20,
  FORUM_POST: 15,
  FORUM_COMMENT: 5,
  EVENT_ATTENDANCE: 30,
  MENTORSHIP_SESSION: 40,
  RESOURCE_UPLOAD: 25,
  NETWORK_CONNECTION: 10,
  SKILL_ASSESSMENT: 35,
  JOB_POSTING: 45,
  LIKE_RECEIVED: 2,
  SHARE: 5,
  REFERRAL: 100,
};

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000,
];

const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'first_login',
    name: 'Welcome Aboard',
    description: 'Complete your first login',
    type: 'networking',
    tier: 'bronze',
    requirements: { login_count: 1 },
  },
  {
    id: 'profile_master',
    name: 'Profile Master',
    description: 'Complete 100% of your profile',
    type: 'contribution',
    tier: 'silver',
    requirements: { profile_completion: 100 },
  },
  {
    id: 'networking_ninja',
    name: 'Networking Ninja',
    description: 'Connect with 50 other members',
    type: 'networking',
    tier: 'gold',
    requirements: { connections: 50 },
  },
  {
    id: 'forum_star',
    name: 'Forum Star',
    description: 'Create 25 forum posts',
    type: 'forum_star',
    tier: 'silver',
    requirements: { forum_posts: 25 },
  },
  {
    id: 'mentor_master',
    name: 'Mentor Master',
    description: 'Complete 10 mentorship sessions',
    type: 'mentor',
    tier: 'gold',
    requirements: { mentorship_sessions: 10 },
  },
  {
    id: 'job_hunter',
    name: 'Job Hunter',
    description: 'Apply to 10 jobs',
    type: 'job_hunter',
    tier: 'bronze',
    requirements: { job_applications: 10 },
  },
  {
    id: 'data_wizard',
    name: 'Data Wizard',
    description: 'Complete 5 skill assessments with 80%+ score',
    type: 'data_wizard',
    tier: 'platinum',
    requirements: { skill_assessments: 5, min_score: 80 },
  },
  {
    id: 'event_host',
    name: 'Event Host',
    description: 'Organize and host 3 events',
    type: 'event_host',
    tier: 'gold',
    requirements: { events_hosted: 3 },
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain a 30-day login streak',
    type: 'contribution',
    tier: 'diamond',
    requirements: { streak: 30 },
  },
  {
    id: 'project_leader',
    name: 'Project Leader',
    description: 'Lead 5 collaborative projects',
    type: 'project_leader',
    tier: 'platinum',
    requirements: { projects_led: 5 },
  },
];

/**
 * Points Management
 */
export async function awardPoints(
  userId: string,
  activityType: keyof typeof POINTS_CONFIG,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const points = POINTS_CONFIG[activityType];
    if (!points) throw new Error(`Unknown activity type: ${activityType}`);

    // Create points activity record
    const activity: PointsActivity = {
      userId,
      activityType,
      points,
      description,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Save to database (implement based on your database choice)
    await savePointsActivity(activity);

    // Update user's total points and level
    await updateUserGameData(userId, points);

    // Check for badge achievements
    await checkBadgeAchievements(userId);

    console.log(
      `Awarded ${points} points to user ${userId} for ${activityType}`
    );
  } catch (error) {
    console.error('Error awarding points:', error);
    throw error;
  }
}

export async function getUserGameData(userId: string): Promise<UserGameData> {
  try {
    // Implement database query
    const userData = await fetchUserGameData(userId);
    return (
      userData || {
        userId,
        totalPoints: 0,
        level: 1,
        streak: 0,
        badges: [],
        recentAchievements: [],
        lastLogin: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('Error fetching user game data:', error);
    throw error;
  }
}

export async function getPointsHistory(
  userId: string,
  limit = 50
): Promise<PointsActivity[]> {
  try {
    return await fetchPointsHistory(userId, limit);
  } catch (error) {
    console.error('Error fetching points history:', error);
    return [];
  }
}

export async function getPointsBreakdown(
  userId: string
): Promise<PointsBreakdown> {
  try {
    const activities = await fetchPointsHistory(userId);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const breakdown: PointsBreakdown = {
      byCategory: {},
      thisWeek: 0,
      thisMonth: 0,
    };

    activities.forEach((activity) => {
      const activityDate = new Date(activity.timestamp);

      // Category breakdown
      if (!breakdown.byCategory[activity.activityType]) {
        breakdown.byCategory[activity.activityType] = 0;
      }
      breakdown.byCategory[activity.activityType] += activity.points;

      // Time-based breakdown
      if (activityDate >= weekAgo) {
        breakdown.thisWeek += activity.points;
      }
      if (activityDate >= monthAgo) {
        breakdown.thisMonth += activity.points;
      }
    });

    return breakdown;
  } catch (error) {
    console.error('Error calculating points breakdown:', error);
    throw error;
  }
}

/**
 * Badge Management
 */
export function getBadges(): Badge[] {
  return BADGE_DEFINITIONS;
}

export async function awardBadge(
  userId: string,
  badgeId: string
): Promise<void> {
  try {
    const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
    if (!badge) throw new Error(`Badge not found: ${badgeId}`);

    const achievement: Achievement = {
      userId,
      badgeId,
      earnedAt: new Date().toISOString(),
    };

    await saveBadgeAchievement(achievement);

    // Award bonus points for badge achievement
    await awardPoints(userId, 'REFERRAL', `Earned badge: ${badge['name']}`);

    console.log(`Awarded badge ${badgeId} to user ${userId}`);
  } catch (error) {
    console.error('Error awarding badge:', error);
    throw error;
  }
}

export async function checkBadgeAchievements(userId: string): Promise<void> {
  try {
    const userData = await getUserGameData(userId);
    const userStats = await getUserStats(userId);

    for (const badge of BADGE_DEFINITIONS) {
      // Skip if user already has this badge
      if (userData.badges.includes(badge.id)) continue;

      // Check requirements
      const meetsRequirements = checkBadgeRequirements(badge, userStats);
      if (meetsRequirements) {
        await awardBadge(userId, badge.id);
      }
    }
  } catch (error) {
    console.error('Error checking badge achievements:', error);
  }
}

function checkBadgeRequirements(badge: Badge, userStats: any): boolean {
  const { requirements } = badge;

  for (const [key, value] of Object.entries(requirements)) {
    if (userStats[key] < value) {
      return false;
    }
  }

  return true;
}

/**
 * Leaderboard Management
 */
export async function getLeaderboard(
  type: LeaderboardType,
  period: 'all' | 'month' | 'week',
  limit = 20
): Promise<LeaderboardEntry[]> {
  try {
    return await fetchLeaderboard(type, period, limit);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export async function getUserRank(
  userId: string,
  type: LeaderboardType,
  period: 'all' | 'month' | 'week'
): Promise<LeaderboardEntry | null> {
  try {
    return await fetchUserRank(userId, type, period);
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return null;
  }
}

/**
 * Quest Management
 */
export async function getActiveQuests(): Promise<Quest[]> {
  try {
    const now = new Date().toISOString();
    return await fetchActiveQuests(now);
  } catch (error) {
    console.error('Error fetching active quests:', error);
    return [];
  }
}

export async function getUserQuestProgress(
  userId: string
): Promise<Record<string, QuestProgress>> {
  try {
    return await fetchUserQuestProgress(userId);
  } catch (error) {
    console.error('Error fetching quest progress:', error);
    return {};
  }
}

export async function completeQuestStep(
  userId: string,
  questId: string,
  actionType: string
): Promise<void> {
  try {
    await updateQuestProgress(userId, questId, actionType);

    // Check if quest is completed
    const quest = await getQuestById(questId);
    const progress = await getQuestProgress(userId, questId);

    if (quest && progress && progress.currentProgress >= quest.targetValue) {
      await completeQuest(userId, questId);
    }
  } catch (error) {
    console.error('Error completing quest step:', error);
    throw error;
  }
}

/**
 * Level System
 */
export function calculateLevel(totalPoints: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getPointsForNextLevel(currentPoints: number): number {
  const currentLevel = calculateLevel(currentPoints);
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel];
  return nextThreshold ? nextThreshold - currentPoints : 0;
}

/**
 * Database Interface Functions
 * These should be implemented based on your database choice (Firebase, MongoDB, etc.)
 */

async function savePointsActivity(activity: PointsActivity): Promise<void> {
  // Implementation depends on your database
  // For Firebase: add to 'pointsActivities' collection
  // For MongoDB: insert into pointsActivities collection
  console.log('Saving points activity:', activity);
}

async function updateUserGameData(
  userId: string,
  pointsToAdd: number
): Promise<void> {
  // Implementation depends on your database
  // Update user's total points, recalculate level, update streak if daily login
  console.log(`Updating user ${userId} game data with ${pointsToAdd} points`);
}

async function fetchUserGameData(userId: string): Promise<UserGameData | null> {
  // Implementation depends on your database
  // Return user's game data or null if not found
  return null;
}

async function fetchPointsHistory(
  userId: string,
  limit = 50
): Promise<PointsActivity[]> {
  // Implementation depends on your database
  // Return user's points history, sorted by timestamp desc
  return [];
}

async function saveBadgeAchievement(achievement: Achievement): Promise<void> {
  // Implementation depends on your database
  console.log('Saving badge achievement:', achievement);
}

async function getUserStats(userId: string): Promise<any> {
  // Implementation depends on your database
  // Return aggregated user statistics for badge checking
  return {};
}

async function fetchLeaderboard(
  type: LeaderboardType,
  period: 'all' | 'month' | 'week',
  limit: number
): Promise<LeaderboardEntry[]> {
  // Implementation depends on your database
  // Return leaderboard data based on type and period
  return [];
}

async function fetchUserRank(
  userId: string,
  type: LeaderboardType,
  period: 'all' | 'month' | 'week'
): Promise<LeaderboardEntry | null> {
  // Implementation depends on your database
  // Return user's rank for the specified leaderboard
  return null;
}

async function fetchActiveQuests(currentTime: string): Promise<Quest[]> {
  // Implementation depends on your database
  // Return quests that are currently active (not expired)
  return [];
}

async function fetchUserQuestProgress(
  userId: string
): Promise<Record<string, QuestProgress>> {
  // Implementation depends on your database
  // Return user's progress for all quests
  return {};
}

async function updateQuestProgress(
  userId: string,
  questId: string,
  actionType: string
): Promise<void> {
  // Implementation depends on your database
  // Update quest progress for the user
  console.log(`Updating quest progress: ${userId}, ${questId}, ${actionType}`);
}

async function getQuestById(questId: string): Promise<Quest | null> {
  // Implementation depends on your database
  // Return quest by ID
  return null;
}

async function getQuestProgress(
  userId: string,
  questId: string
): Promise<QuestProgress | null> {
  // Implementation depends on your database
  // Return user's progress for a specific quest
  return null;
}

async function completeQuest(userId: string, questId: string): Promise<void> {
  // Implementation depends on your database
  // Mark quest as completed and award rewards
  console.log(`Completing quest: ${userId}, ${questId}`);
}

/**
 * Utility Functions
 */
export function getEngagementLevel(
  points: number
): 'low' | 'medium' | 'high' | 'expert' {
  if (points < 100) return 'low';
  if (points < 1000) return 'medium';
  if (points < 5000) return 'high';
  return 'expert';
}

export function formatPoints(points: number): string {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
  return points.toString();
}

export function getStreakBonus(streak: number): number {
  if (streak >= 30) return 10;
  if (streak >= 14) return 5;
  if (streak >= 7) return 2;
  return 0;
}

export default {
  awardPoints,
  getUserGameData,
  getPointsHistory,
  getPointsBreakdown,
  getBadges,
  awardBadge,
  checkBadgeAchievements,
  getLeaderboard,
  getUserRank,
  getActiveQuests,
  getUserQuestProgress,
  completeQuestStep,
  calculateLevel,
  getPointsForNextLevel,
  getEngagementLevel,
  formatPoints,
  getStreakBonus,
};
