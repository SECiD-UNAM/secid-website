/**
 * Member write operations: profile updates, connections, messaging, status changes.
 */

import { db, storage, isUsingMockAPI } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import type {
  MemberProfile,
  MemberStatus,
  ConnectionRequest,
  DirectMessage,
  Conversation,
} from '@/types/member';
import { mapUserDocToMemberProfile } from './mapper';

const COLLECTIONS = {
  MEMBERS: 'users',
  CONNECTION_REQUESTS: 'connectionRequests',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  MEMBER_ANALYTICS: 'memberAnalytics'
};

/**
 * Update member profile
 */
export async function updateMemberProfile(uid: string, updates: Partial<MemberProfile>): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Updating member profile', uid, updates);
    return;
  }

  try {
    const docRef = doc(db, COLLECTIONS.MEMBERS, uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating member profile:', error);
    throw error;
  }
}

/**
 * Connection management functions
 */
export async function sendConnectionRequest(
  fromUid: string,
  toUid: string,
  message?: string
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Sending connection request', { fromUid, toUid, message });
    return;
  }

  try {
    const batch = writeBatch(db);

    const requestRef = doc(collection(db, COLLECTIONS.CONNECTION_REQUESTS));
    const connectionRequest: ConnectionRequest = {
      id: requestRef['id'],
      from: fromUid,
      to: toUid,
      message,
      status: 'pending',
      createdAt: new Date()
    };

    batch.set(requestRef, connectionRequest);

    const toMemberRef = doc(db, COLLECTIONS.MEMBERS, toUid);
    batch.update(toMemberRef, {
      'networking.pendingConnections': arrayUnion(fromUid)
    });

    await batch.commit();
  } catch (error) {
    console.error('Error sending connection request:', error);
    throw error;
  }
}

export async function acceptConnectionRequest(requestId: string): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Accepting connection request', requestId);
    return;
  }

  try {
    const requestRef = doc(db, COLLECTIONS.CONNECTION_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Connection request not found');
    }

    const request = requestSnap['data']() as ConnectionRequest;
    const batch = writeBatch(db);

    batch.update(requestRef, {
      status: 'accepted',
      respondedAt: serverTimestamp()
    });

    const fromMemberRef = doc(db, COLLECTIONS.MEMBERS, request.from);
    const toMemberRef = doc(db, COLLECTIONS.MEMBERS, request.to);

    batch.update(fromMemberRef, {
      'networking.connections': arrayUnion(request.to),
      'activity.totalConnections': increment(1)
    });

    batch.update(toMemberRef, {
      'networking.connections': arrayUnion(request.from),
      'networking.pendingConnections': arrayRemove(request.from),
      'activity.totalConnections': increment(1)
    });

    await batch.commit();
  } catch (error) {
    console.error('Error accepting connection request:', error);
    throw error;
  }
}

/**
 * Messaging functions
 */
export async function sendMessage(
  fromUid: string,
  toUid: string,
  content: string
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Sending message', { fromUid, toUid, content });
    return;
  }

  try {
    const conversationId = await getOrCreateConversation(fromUid, toUid);

    const messageRef = doc(collection(db, COLLECTIONS.MESSAGES));
    const message: DirectMessage = {
      id: messageRef['id'],
      conversationId,
      from: fromUid,
      to: toUid,
      content,
      type: 'text',
      timestamp: new Date(),
      read: false
    };

    const batch = writeBatch(db);
    batch.set(messageRef, message);

    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
    batch.update(conversationRef, {
      lastMessage: message,
      updatedAt: serverTimestamp(),
      [`unreadCount.${toUid}`]: increment(1)
    });

    await batch.commit();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

async function getOrCreateConversation(uid1: string, uid2: string): Promise<string> {
  const participants = [uid1, uid2].sort();

  const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
  const q = query(conversationsRef, where('participants', '==', participants));
  const snapshot = await getDocs(q);

  if (!snapshot['empty'] && snapshot['docs'][0]) {
    return snapshot['docs'][0].id;
  }

  const conversationRef = doc(conversationsRef);
  const conversation: Conversation = {
    id: conversationRef['id'],
    participants,
    unreadCount: { [uid1]: 0, [uid2]: 0 },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await setDoc(conversationRef, conversation);
  return conversationRef['id'];
}

/**
 * File upload functions
 */
export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  if (isUsingMockAPI()) {
    return 'https://via.placeholder.com/150';
  }

  try {
    const fileRef = ref(storage, `profiles/${uid}/avatar.jpg`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
}

/**
 * Analytics functions
 */
export async function trackProfileView(viewerUid: string, profileUid: string): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Tracking profile view', { viewerUid, profileUid });
    return;
  }

  try {
    const profileRef = doc(db, COLLECTIONS.MEMBERS, profileUid);
    await updateDoc(profileRef, {
      'activity.profileViews': increment(1)
    });
  } catch (error) {
    console.error('Error tracking profile view:', error);
  }
}

/**
 * Update a member's lifecycle status (admin action)
 */
export async function updateMemberStatus(
  uid: string,
  newStatus: MemberStatus,
  changedBy: string,
  reason: string = ''
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Updating member status', { uid, newStatus, changedBy, reason });
    return;
  }

  const docRef = doc(db, COLLECTIONS.MEMBERS, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Member not found');
  }

  const data = docSnap.data();
  const currentStatus = data.lifecycle?.status || data.role || 'collaborator';

  const statusChange = {
    from: currentStatus,
    to: newStatus,
    changedBy,
    changedAt: new Date(),
    reason,
  };

  await updateDoc(docRef, {
    'lifecycle.status': newStatus,
    'lifecycle.statusChangedAt': serverTimestamp(),
    'lifecycle.statusChangedBy': changedBy,
    'lifecycle.statusReason': reason,
    'lifecycle.statusHistory': arrayUnion(statusChange),
    ...(newStatus === 'active' ? { role: 'member' } : {}),
    ...(newStatus === 'collaborator' ? { role: 'collaborator' } : {}),
    ...(newStatus === 'pending' ? { verificationStatus: 'pending' } : {}),
    ...(newStatus === 'active' ? { verificationStatus: 'approved', isVerified: true } : {}),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Bulk update member statuses
 */
export async function bulkUpdateMemberStatus(
  uids: string[],
  newStatus: MemberStatus,
  changedBy: string,
  reason: string = ''
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Bulk updating member status', { uids, newStatus });
    return;
  }

  const batch = writeBatch(db);
  for (const uid of uids.slice(0, 250)) {
    const docRef = doc(db, COLLECTIONS.MEMBERS, uid);
    batch.update(docRef, {
      'lifecycle.status': newStatus,
      'lifecycle.statusChangedAt': Timestamp.now(),
      'lifecycle.statusChangedBy': changedBy,
      'lifecycle.statusReason': reason,
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();
}
