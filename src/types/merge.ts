/**
 * Profile Merge System Type Definitions
 *
 * Types for the member profile merge flow, which allows re-registered members
 * to associate an old profile (sourceUid) with a new account (targetUid)
 * by matching on numeroCuenta.
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * Controls which profile's version of a field group is kept after merge.
 * 'discard' means neither side is kept (used when conflicting data should be dropped).
 */
export type FieldSelection = 'source' | 'target' | 'discard';

/**
 * Logical groups of UserProfile fields that can be independently selected
 * during a merge operation.
 */
export type FieldGroupKey =
  | 'basicInfo'
  | 'professional'
  | 'experience'
  | 'skills'
  | 'socialLinks'
  | 'education'
  | 'privacySettings'
  | 'notificationSettings'
  | 'settings';

/**
 * One selection per field group — fully determines how every field
 * in the merged profile will be populated.
 */
export type FieldSelections = Record<FieldGroupKey, FieldSelection>;

/**
 * Lifecycle states of a MergeRequest document in Firestore.
 *
 * Transitions:
 *   pending → approved → executing → completed
 *   pending → rejected
 *   executing → failed
 */
export type MergeRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed';

/**
 * What happens to the old (source) Firestore document after a successful merge.
 */
export type OldDocAction = 'soft-delete' | 'hard-delete' | 'archive';

/**
 * A Firestore document representing a pending or completed profile merge.
 *
 * Stored in the `mergeRequests` collection, keyed by auto-generated ID.
 */
export interface MergeRequest {
  id: string;
  /** UID of the old profile whose data is being merged in */
  sourceUid: string;
  /** UID of the new (active) account that receives the merged data */
  targetUid: string;
  /** The attribute used to confirm both accounts belong to the same person */
  matchedBy: 'numeroCuenta';
  numeroCuenta: string;
  fieldSelections: FieldSelections;
  migrateReferences: boolean;
  oldDocAction?: OldDocAction;
  status: MergeRequestStatus;
  /** Whether the request was self-initiated by the member or triggered by an admin */
  initiatedBy: 'user' | 'admin';
  createdAt: Timestamp;
  createdBy: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewNotes?: string;
  completedAt?: Timestamp;
  error?: string;
  /** Collections that were successfully migrated during execution */
  migratedCollections?: string[];
  /** Per-collection migration progress tracking (collection name → status string) */
  migrationProgress?: Record<string, string>;
}

/**
 * Embedded in a user's profile document when the system detects another
 * account sharing the same numeroCuenta — prompting the user to initiate a merge.
 */
export interface PotentialMergeMatch {
  matchedUid: string;
  numeroCuenta: string;
  detectedAt: Timestamp;
  dismissed: boolean;
}

/**
 * Entry in the `numeroCuentaIndex` collection that maps a numeroCuenta value
 * to the currently authoritative user account.
 *
 * Used for O(1) conflict detection on profile save.
 */
export interface NumeroCuentaIndex {
  uid: string;
  displayName: string;
}

/**
 * Written to a user's profile document when their numeroCuenta is already
 * claimed by a different account.
 */
export interface NumeroCuentaConflict {
  existingUid: string;
  numeroCuenta: string;
  detectedAt: Timestamp;
}
