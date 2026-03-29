/**
 * Maps legacy role strings to RBAC group IDs.
 *
 * Pure function — no external dependencies.
 * Used by backfillUsers.ts (Cloud Function) and by tests directly.
 */

const ROLE_GROUP_MAP: Record<string, string[]> = {
  admin: ["super-admin", "member"],
  moderator: ["moderator", "member"],
  member: ["member"],
  collaborator: ["member"],
  company: ["company"],
};

const DEFAULT_GROUPS = ["member"];

/**
 * Maps a legacy role string to an array of RBAC group IDs.
 */
export function mapRoleToGroups(role: string | undefined): string[] {
  if (!role) return DEFAULT_GROUPS;
  return ROLE_GROUP_MAP[role] ?? DEFAULT_GROUPS;
}
