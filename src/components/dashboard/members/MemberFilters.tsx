import type { MemberProfile } from '@/types/member';

export interface FilterState {
  includeCollaborators: boolean;
  generations?: string[];
  campuses?: string[];
  genders?: string[];
  degrees?: string[];
  companies?: string[];
  skills?: string[];
  experienceLevels?: string[];
  professionalStatuses?: string[];
  joinedAfter?: string;
  onlineOnly?: boolean;
  mentorshipAvailable?: boolean;
}

export function filterMembers(members: MemberProfile[], filters: FilterState): MemberProfile[] {
  return members.filter((m) => {
    if (!filters.includeCollaborators && m.role === 'collaborator') return false;
    if (filters.includeCollaborators === false && m.role !== 'member') return false;
    return true;
  });
}
