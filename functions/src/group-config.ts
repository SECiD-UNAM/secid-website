/**
 * Google Admin Groups configuration for SECiD
 * Maps platform roles and commissions to Google Workspace group emails
 */

export const GROUP_MAP = {
  members: "miembros@secid.mx",
  board: "direccion@secid.mx",
  collaborators: "colaboradores@secid.mx",
  outreach: "divulgacion@secid.mx",
  finance: "finanzas@secid.mx",
} as const;

export type GroupKey = keyof typeof GROUP_MAP;
export type GroupEmail = typeof GROUP_MAP[GroupKey];

/**
 * Returns the default group for new users (collaborators)
 */
export function getDefaultGroup(): string {
  return GROUP_MAP.collaborators;
}

/**
 * Returns the group email for approved members
 */
export function getMembersGroup(): string {
  return GROUP_MAP.members;
}

/**
 * Returns all group emails as an array
 */
export function getAllGroups(): string[] {
  return Object.values(GROUP_MAP);
}
