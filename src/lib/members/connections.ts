/**
 * Connection helpers and privacy/visibility utilities.
 */

import { db, isUsingMockAPI } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { MemberProfile } from '@/types/member';

const COLLECTIONS = {
  CONNECTION_REQUESTS: 'connectionRequests',
};

/**
 * Check whether a pending connection request already exists between two users.
 */
export async function hasPendingConnectionRequest(
  fromUid: string,
  toUid: string
): Promise<boolean> {
  if (isUsingMockAPI()) return false;

  const q = query(
    collection(db, COLLECTIONS.CONNECTION_REQUESTS),
    where('from', '==', fromUid),
    where('to', '==', toUid),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Visible-fields result describing what the viewer is allowed to see.
 */
export interface VisibleFields {
  canViewProfile: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showCompany: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowMessages: boolean;
  allowConnectionRequests: boolean;
}

/**
 * Determine which fields a viewer may see based on the member's privacy settings
 * and the relationship between the viewer and the member.
 */
export function getVisibleFields(
  member: MemberProfile,
  viewerUid?: string
): VisibleFields {
  const privacy = member.privacy;
  const isOwn = viewerUid === member.uid;

  // Owner can always see everything
  if (isOwn) {
    return {
      canViewProfile: true,
      showEmail: true,
      showLocation: true,
      showCompany: true,
      showOnlineStatus: true,
      showLastSeen: true,
      allowMessages: false,
      allowConnectionRequests: false,
    };
  }

  const isConnection = viewerUid
    ? member.networking.connections.includes(viewerUid)
    : false;
  const isAuthenticated = !!viewerUid;

  // Profile-level visibility gate
  let canViewProfile = false;
  switch (privacy.profileVisibility) {
    case 'public':
      canViewProfile = true;
      break;
    case 'members':
      canViewProfile = isAuthenticated;
      break;
    case 'connections':
      canViewProfile = isConnection;
      break;
    case 'private':
      canViewProfile = false;
      break;
  }

  if (!canViewProfile) {
    return {
      canViewProfile: false,
      showEmail: false,
      showLocation: false,
      showCompany: false,
      showOnlineStatus: false,
      showLastSeen: false,
      allowMessages: false,
      allowConnectionRequests: privacy.allowConnectionRequests,
    };
  }

  // Per-field visibility
  const allowMessages =
    privacy.allowMessages === 'all' ||
    (privacy.allowMessages === 'connections' && isConnection);

  return {
    canViewProfile: true,
    showEmail: privacy.showEmail,
    showLocation: privacy.showLocation,
    showCompany: privacy.showCurrentCompany,
    showOnlineStatus: privacy.showOnlineStatus,
    showLastSeen: privacy.showLastSeen,
    allowMessages,
    allowConnectionRequests: privacy.allowConnectionRequests,
  };
}
