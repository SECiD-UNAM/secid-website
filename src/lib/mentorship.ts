/**
 * Mentorship Platform Firebase Operations
 *
 * This file re-exports everything from the modularized mentorship/ directory.
 * Existing imports from '../../lib/mentorship' continue to work unchanged.
 */

export {
  // Profiles
  getMentorProfile,
  getMentorProfiles,
  createMentorProfile,
  updateMentorProfile,
  getMenteeProfile,
  createMenteeProfile,
  updateMenteeProfile,
  uploadProfileImage,
  // Matching
  calculateMatchScore,
  getUserMatches,
  createMentorshipMatch,
  // Requests
  getMentorshipRequests,
  createMentorshipRequest,
  updateMentorshipRequest,
  // Sessions
  getMentorshipSessions,
  getUpcomingSessions,
  createMentorshipSession,
  updateMentorshipSession,
  // Feedback & Stats
  createMentorshipFeedback,
  getMentorshipStats,
  // Subscriptions
  subscribeMentorshipRequests,
  subscribeUpcomingSessions,
  // Goals & Resources
  createMentorshipResource,
  getMentorshipResources,
  createMentorshipGoal,
  updateMentorshipGoal,
  getMentorshipGoals,
} from './mentorship/index';
