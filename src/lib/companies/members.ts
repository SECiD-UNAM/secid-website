/**
 * Company-member relationship queries.
 * Finds current and alumni members for a given company.
 */

import { getMemberProfiles } from '@/lib/members';
import type { MemberProfile } from '@/types/member';

export interface CompanyMembers {
  current: MemberProfile[];
  alumni: MemberProfile[];
}

export async function getCompanyMembers(
  companyId: string,
  companyName: string
): Promise<CompanyMembers> {
  const allMembers = await getMemberProfiles({ limit: 500 });

  const current: MemberProfile[] = [];
  const alumni: MemberProfile[] = [];
  const seen = new Set<string>();

  for (const member of allMembers) {
    // 1. Check companyId on profile (current employer)
    if (member.profile.companyId === companyId) {
      current.push(member);
      seen.add(member.uid);
      continue;
    }

    // 2. Check work history entries
    const roles = member.experience?.previousRoles || [];
    const currentRole = roles.find(
      (r) => r.companyId === companyId && r.current
    );
    const pastRoles = roles.filter(
      (r) => r.companyId === companyId && !r.current
    );

    if (currentRole) {
      current.push(member);
      seen.add(member.uid);
    } else if (pastRoles.length > 0) {
      alumni.push(member);
      seen.add(member.uid);
    }

    // 3. Fallback: string match on company name
    if (!seen.has(member.uid)) {
      if (member.profile.company?.toLowerCase() === companyName.toLowerCase()) {
        current.push(member);
        seen.add(member.uid);
      }
    }
  }

  return { current, alumni };
}
