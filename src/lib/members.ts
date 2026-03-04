/**
 * Firebase utilities for member data operations.
 *
 * This file re-exports everything from the modularized members/ directory.
 * Existing imports from '@/lib/members' continue to work unchanged.
 */

export {
  // Queries
  getMemberProfiles,
  searchMembers,
  getMemberProfile,
  getMemberStats,
  getDirectoryStatsData,
  generateVCard,
  getMemberRecommendations,
  // Mutations
  updateMemberProfile,
  sendConnectionRequest,
  acceptConnectionRequest,
  sendMessage,
  followMember,
  unfollowMember,
  uploadProfileImage,
  trackProfileView,
  updateMemberStatus,
  bulkUpdateMemberStatus,
  // Connections & Privacy
  hasPendingConnectionRequest,
  getVisibleFields,
  // Subscriptions
  subscribeToMemberUpdates,
  subscribeToConnectionRequests,
} from './members/index';

export type { VisibleFields } from './members/index';
