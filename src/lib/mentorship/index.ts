/**
 * Mentorship module barrel file.
 * Re-exports all public functions to preserve the original import paths.
 */

// Profiles
export {
  getMentorProfile,
  getMentorProfiles,
  createMentorProfile,
  updateMentorProfile,
  getMenteeProfile,
  createMenteeProfile,
  updateMenteeProfile,
  uploadProfileImage,
} from './profiles';

// Matching
export {
  calculateMatchScore,
  getUserMatches,
  createMentorshipMatch,
} from './matching';

// Requests
export {
  getMentorshipRequests,
  createMentorshipRequest,
  updateMentorshipRequest,
} from './requests';

// Sessions
export {
  getMentorshipSessions,
  getUpcomingSessions,
  createMentorshipSession,
  updateMentorshipSession,
} from './sessions';

// Feedback & Stats
export {
  createMentorshipFeedback,
  getMentorshipStats,
} from './feedback';

// Real-time subscriptions
export {
  subscribeMentorshipRequests,
  subscribeUpcomingSessions,
} from './subscriptions';

// Goals & Resources
export {
  createMentorshipResource,
  getMentorshipResources,
  createMentorshipGoal,
  updateMentorshipGoal,
  getMentorshipGoals,
} from './goals';
