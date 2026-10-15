/**
 * Client-side Firestore mutations for the profile merge system.
 *
 * Functions in this module operate on three collections:
 *   - `users`               — member profile documents
 *   - `merge_requests`      — pending/completed merge requests
 *   - `numero_cuenta_index` — O(1) conflict-detection index keyed by numeroCuenta
 */

import { db, isUsingMockAPI } from '../firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type {
  MergeRequest,
  FieldSelections,
  NumeroCuentaIndex,
} from '@/types/merge';

const COLLECTIONS = {
  USERS: 'users',
  MERGE_REQUESTS: 'merge_requests',
  NUMERO_CUENTA_INDEX: 'numero_cuenta_index',
} as const;

/**
 * Checks whether a given numeroCuenta is already claimed by a different user.
 *
 * Returns the index entry (uid + displayName) when a conflict exists,
 * or null when the numeroCuenta is unclaimed or owned by the current user.
 */
export async function checkNumeroCuentaMatch(
  numeroCuenta: string,
  currentUid: string
): Promise<NumeroCuentaIndex | null> {
  if (isUsingMockAPI()) return null;

  const indexRef = doc(db, COLLECTIONS.NUMERO_CUENTA_INDEX, numeroCuenta);
  const snap = await getDoc(indexRef);

  if (!snap.exists()) return null;

  const data = snap.data() as NumeroCuentaIndex;
  if (data.uid === currentUid) return null;

  return data;
}

/**
 * Embeds a potentialMergeMatch sub-document in the user's profile,
 * signalling that another account shares the same numeroCuenta.
 *
 * Called server-side (or from Cloud Functions) after conflict detection.
 */
export async function setPotentialMergeMatch(
  uid: string,
  match: { matchedUid: string; numeroCuenta: string }
): Promise<void> {
  if (isUsingMockAPI()) return;

  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    potentialMergeMatch: {
      matchedUid: match.matchedUid,
      numeroCuenta: match.numeroCuenta,
      detectedAt: serverTimestamp(),
      dismissed: false,
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Marks the user's potentialMergeMatch as dismissed so the banner
 * does not reappear on subsequent logins.
 */
export async function dismissMergeMatch(uid: string): Promise<void> {
  if (isUsingMockAPI()) return;

  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    'potentialMergeMatch.dismissed': true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Returns true when the target user already has a pending merge request,
 * preventing duplicate requests from being submitted.
 */
export async function hasPendingMergeRequest(
  targetUid: string
): Promise<boolean> {
  if (isUsingMockAPI()) return false;

  const q = query(
    collection(db, COLLECTIONS.MERGE_REQUESTS),
    where('targetUid', '==', targetUid),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Creates a new merge request document in Firestore.
 *
 * Throws if the target user already has a pending request to prevent
 * duplicates. Returns the newly created document ID.
 */
export async function createMergeRequest(params: {
  sourceUid: string;
  targetUid: string;
  numeroCuenta: string;
  fieldSelections: FieldSelections;
  createdBy: string;
}): Promise<string> {
  if (isUsingMockAPI()) return 'mock-merge-request-id';

  const hasPending = await hasPendingMergeRequest(params.targetUid);
  if (hasPending) {
    throw new Error('You already have a pending merge request.');
  }

  const mergeRef = doc(collection(db, COLLECTIONS.MERGE_REQUESTS));

  const request: Omit<MergeRequest, 'id'> = {
    sourceUid: params.sourceUid,
    targetUid: params.targetUid,
    matchedBy: 'numeroCuenta',
    numeroCuenta: params.numeroCuenta,
    fieldSelections: params.fieldSelections,
    migrateReferences: true,
    status: 'pending',
    initiatedBy: 'user',
    createdAt: serverTimestamp() as any,
    createdBy: params.createdBy,
  };

  await setDoc(mergeRef, { ...request, id: mergeRef.id });
  return mergeRef.id;
}

/**
 * Fetches the raw Firestore profile document for a given UID.
 *
 * Returns null when the document does not exist. Used to populate the
 * field-selection UI before the user submits a merge request.
 */
export async function fetchUserProfile(
  uid: string
): Promise<Record<string, unknown> | null> {
  if (isUsingMockAPI()) return null;

  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}
