/**
 * GCP Services Client
 * Wraps Firebase Cloud Functions for Google Admin Groups management
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Cloud Function callables
const syncGroupMembershipFn = httpsCallable(functions, 'syncGroupMembership');
const updateMemberGroupsFn = httpsCallable(functions, 'updateMemberGroups');
const getMemberGroupListFn = httpsCallable(functions, 'getMemberGroupList');

export interface GroupData {
  name: string;
  description: string;
  memberCount: string;
  members: Array<{ email: string; role: string; status: string }>;
}

export interface GroupSyncResult {
  success: boolean;
  groups: Record<string, GroupData>;
}

export interface UpdateGroupsResult {
  success: boolean;
  results: {
    added: string[];
    removed: string[];
    errors: string[];
  };
}

export interface MemberGroupsResult {
  success: boolean;
  groups: string[];
}

/**
 * Fetch all Google Groups and their members (admin-only)
 */
export async function syncGroupMembership(): Promise<GroupSyncResult> {
  const result = await syncGroupMembershipFn();
  return result.data as GroupSyncResult;
}

/**
 * Add/remove a member from specific Google Groups (admin-only)
 */
export async function updateMemberGroups(
  memberEmail: string,
  addToGroups?: string[],
  removeFromGroups?: string[]
): Promise<UpdateGroupsResult> {
  const result = await updateMemberGroupsFn({
    memberEmail,
    addToGroups,
    removeFromGroups,
  });
  return result.data as UpdateGroupsResult;
}

/**
 * Get all groups a member belongs to (admin-only)
 */
export async function getMemberGroupList(
  memberEmail: string
): Promise<MemberGroupsResult> {
  const result = await getMemberGroupListFn({ memberEmail });
  return result.data as MemberGroupsResult;
}

/**
 * Group configuration — mirrors functions/src/group-config.ts
 */
export const GROUP_MAP = {
  members: 'miembros@secid.mx',
  board: 'direccion@secid.mx',
  collaborators: 'colaboradores@secid.mx',
  outreach: 'divulgacion@secid.mx',
  finance: 'finanzas@secid.mx',
} as const;

export type GroupKey = keyof typeof GROUP_MAP;

export const GROUP_LABELS: Record<string, { es: string; en: string }> = {
  'miembros@secid.mx': { es: 'Miembros', en: 'Members' },
  'direccion@secid.mx': { es: 'Dirección', en: 'Board' },
  'colaboradores@secid.mx': { es: 'Colaboradores', en: 'Collaborators' },
  'divulgacion@secid.mx': { es: 'Divulgación', en: 'Outreach' },
  'finanzas@secid.mx': { es: 'Finanzas', en: 'Finance' },
};
