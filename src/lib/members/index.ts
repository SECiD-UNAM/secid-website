/**
 * Members module barrel file.
 * Re-exports all public functions to preserve the original import paths.
 */

// Queries
export {
  getMemberProfiles,
  searchMembers,
  getMemberProfile,
  getMemberStats,
  getMemberStatistics,
  getDirectoryStatsData,
  generateVCard,
  getMemberRecommendations,
  getEducationEcosystem,
} from './queries';
export type {
  InstitutionAggregate,
  EducationEcosystemData,
} from './queries';

// Mutations
export {
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
} from './mutations';

// Connections & Privacy
export { hasPendingConnectionRequest, getVisibleFields } from './connections';
export type { VisibleFields } from './connections';

// Subscriptions
export {
  subscribeToMemberUpdates,
  subscribeToConnectionRequests,
} from './subscriptions';
