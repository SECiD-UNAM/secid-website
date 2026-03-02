/**
 * Real-time Firestore subscriptions for member data.
 */

import { db, isUsingMockAPI } from '../firebase';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import type { MemberProfile, ConnectionRequest } from '@/types/member';
import { mapUserDocToMemberProfile, createMockMemberProfile } from './mapper';

const COLLECTIONS = {
  MEMBERS: 'users',
  CONNECTION_REQUESTS: 'connectionRequests',
};

export function subscribeToMemberUpdates(
  uid: string,
  callback: (member: MemberProfile | null) => void
): Unsubscribe {
  if (isUsingMockAPI()) {
    callback(createMockMemberProfile(1));
    return () => {};
  }

  const memberRef = doc(db, COLLECTIONS.MEMBERS, uid);
  return onSnapshot(memberRef, (doc) => {
    if (doc.exists()) {
      callback(mapUserDocToMemberProfile(doc['id'], doc.data()));
    } else {
      callback(null);
    }
  });
}

export function subscribeToConnectionRequests(
  uid: string,
  callback: (requests: ConnectionRequest[]) => void
): Unsubscribe {
  if (isUsingMockAPI()) {
    callback([]);
    return () => {};
  }

  const requestsRef = collection(db, COLLECTIONS.CONNECTION_REQUESTS);
  const q = query(requestsRef, where('to', '==', uid), where('status', '==', 'pending'));

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data()
    } as ConnectionRequest));
    callback(requests);
  });
}
