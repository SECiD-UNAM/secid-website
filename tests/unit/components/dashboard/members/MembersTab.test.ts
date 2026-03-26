/**
 * Tests for MembersTab — sortMembers business logic
 *
 * TC-member-dashboard-030 through TC-member-dashboard-042:
 * Verifies sorting logic for all sortable columns
 */
import { describe, it, expect } from 'vitest';
import {
  searchMembers,
  sortMembers,
  type SortColumn,
  type SortDirection,
} from '@/components/dashboard/members/MembersTab';
import type { MemberProfile } from '@/types/member';

function createMockMember(
  overrides: Record<string, unknown> = {}
): MemberProfile {
  const base = {
    uid: 'test-uid',
    displayName: 'Test User',
    slug: 'test-user',
    initials: 'TU',
    isOnline: false,
    lastSeen: new Date(),
    joinedAt: new Date('2023-06-01'),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'member' as const,
    isVerified: true,
    isActive: true,
    membershipTier: 'free',
    campus: undefined as string | undefined,
    generation: undefined as string | undefined,
    academicLevel: undefined as string | undefined,
    professionalStatus: undefined as string | undefined,
    createdAt: new Date(),
    profile: {
      firstName: 'Test',
      lastName: 'User',
      bio: '',
      company: '',
      position: '',
      location: '',
      linkedin: '',
      skills: [] as string[],
    },
    experience: {
      years: 2,
      level: 'mid' as const,
      currentRole: 'Developer',
      previousRoles: [],
      industries: [],
    },
    social: {},
    networking: {
      connections: [],
      pendingConnections: [],
      blockedUsers: [],
      followers: [],
      following: [],
      availableForMentoring: false,
      openToOpportunities: false,
    },
    privacy: {
      profileVisibility: 'public' as const,
      showEmail: false,
      showPhone: false,
      showLocation: false,
      showCurrentCompany: false,
      showSalaryExpectations: false,
      allowMessages: 'all' as const,
      allowConnectionRequests: true,
      showOnlineStatus: true,
      showLastSeen: true,
    },
    activity: {
      profileViews: 0,
      totalConnections: 0,
      postsCount: 0,
      commentsCount: 0,
      helpfulVotes: 0,
      reputation: 0,
      lastActive: new Date(),
    },
    lifecycle: undefined,
    searchableKeywords: [],
    featuredSkills: [],
    isPremium: false,
  };

  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      (merged as Record<string, unknown>)[key] = {
        ...(((base as Record<string, unknown>)[key] as Record<
          string,
          unknown
        >) || {}),
        ...(value as Record<string, unknown>),
      };
    } else {
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  return merged as unknown as MemberProfile;
}

describe('sortMembers', () => {
  const alice = createMockMember({
    uid: '1',
    displayName: 'Alice Zaragoza',
    campus: 'CU',
    generation: '2020',
    profile: { company: 'Xignify', skills: ['Python', 'ML'] },
    role: 'member',
  });

  const bob = createMockMember({
    uid: '2',
    displayName: 'Bob Alvarado',
    campus: 'Juriquilla',
    generation: '2019',
    profile: { company: 'Acme Corp', skills: ['R', 'Statistics'] },
    role: 'admin',
  });

  const clara = createMockMember({
    uid: '3',
    displayName: 'Clara Mendez',
    campus: undefined,
    generation: '2021',
    profile: { company: '', skills: [] },
    role: 'collaborator',
  });

  const members = [alice, bob, clara];

  describe('name sorting', () => {
    /**
     * TC-member-dashboard-030
     * Verifies: AC-sort — ascending name sort
     */
    it('should sort by name ascending', () => {
      const result = sortMembers(members, 'name', 'asc');
      expect(result.map((m) => m.displayName)).toEqual([
        'Alice Zaragoza',
        'Bob Alvarado',
        'Clara Mendez',
      ]);
    });

    /**
     * TC-member-dashboard-031
     * Verifies: AC-sort — descending name sort
     */
    it('should sort by name descending', () => {
      const result = sortMembers(members, 'name', 'desc');
      expect(result.map((m) => m.displayName)).toEqual([
        'Clara Mendez',
        'Bob Alvarado',
        'Alice Zaragoza',
      ]);
    });
  });

  describe('company sorting', () => {
    /**
     * TC-member-dashboard-032
     * Verifies: AC-sort — ascending company sort
     */
    it('should sort by company ascending', () => {
      const result = sortMembers(members, 'company', 'asc');
      expect(result.map((m) => m.profile.company)).toEqual([
        '',
        'Acme Corp',
        'Xignify',
      ]);
    });

    /**
     * TC-member-dashboard-033
     * Verifies: AC-sort — descending company sort
     */
    it('should sort by company descending', () => {
      const result = sortMembers(members, 'company', 'desc');
      expect(result.map((m) => m.profile.company)).toEqual([
        'Xignify',
        'Acme Corp',
        '',
      ]);
    });
  });

  describe('campus sorting', () => {
    /**
     * TC-member-dashboard-034
     * Verifies: AC-sort — ascending campus sort, undefined last
     */
    it('should sort by campus ascending with undefined at end', () => {
      const result = sortMembers(members, 'campus', 'asc');
      const campuses = result.map((m) => m.campus ?? '');
      expect(campuses).toEqual(['', 'CU', 'Juriquilla']);
    });
  });

  describe('generation sorting', () => {
    /**
     * TC-member-dashboard-035
     * Verifies: AC-sort — ascending generation sort
     */
    it('should sort by generation ascending', () => {
      const result = sortMembers(members, 'generation', 'asc');
      const generations = result.map((m) => m.generation ?? '');
      expect(generations).toEqual(['2019', '2020', '2021']);
    });

    /**
     * TC-member-dashboard-036
     * Verifies: AC-sort — descending generation sort
     */
    it('should sort by generation descending', () => {
      const result = sortMembers(members, 'generation', 'desc');
      const generations = result.map((m) => m.generation ?? '');
      expect(generations).toEqual(['2021', '2020', '2019']);
    });
  });

  describe('status sorting', () => {
    /**
     * TC-member-dashboard-037
     * Verifies: AC-sort — ascending status sort
     */
    it('should sort by status ascending', () => {
      const result = sortMembers(members, 'status', 'asc');
      const statuses = result.map((m) => m.lifecycle?.status ?? m.role);
      expect(statuses).toEqual(['admin', 'collaborator', 'member']);
    });
  });

  describe('empty array', () => {
    /**
     * TC-member-dashboard-038
     * Verifies: AC-sort — empty array returns empty array
     */
    it('should return empty array when given empty input', () => {
      const result = sortMembers([], 'name', 'asc');
      expect(result).toEqual([]);
    });
  });

  describe('single member', () => {
    /**
     * TC-member-dashboard-039
     * Verifies: AC-sort — single member returns unchanged
     */
    it('should return single member unchanged', () => {
      const result = sortMembers([alice], 'name', 'asc');
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('1');
    });
  });

  describe('immutability', () => {
    /**
     * TC-member-dashboard-040
     * Verifies: AC-sort — original array is not mutated
     */
    it('should not mutate the original array', () => {
      const original = [bob, alice, clara];
      const originalCopy = [...original];
      sortMembers(original, 'name', 'asc');
      expect(original.map((m) => m.uid)).toEqual(
        originalCopy.map((m) => m.uid)
      );
    });
  });

  describe('skills sorting', () => {
    /**
     * TC-member-dashboard-041
     * Verifies: AC-sort — skills sort uses count
     */
    it('should sort by skills count ascending', () => {
      const result = sortMembers(members, 'skills', 'asc');
      const skillCounts = result.map((m) => m.profile.skills.length);
      expect(skillCounts).toEqual([0, 2, 2]);
    });

    /**
     * TC-member-dashboard-042
     * Verifies: AC-sort — skills sort descending
     */
    it('should sort by skills count descending', () => {
      const result = sortMembers(members, 'skills', 'desc');
      const skillCounts = result.map((m) => m.profile.skills.length);
      // Both alice and bob have 2 skills, clara has 0
      expect(skillCounts[2]).toBe(0);
      expect(skillCounts[0]).toBe(2);
    });
  });
});

describe('searchMembers', () => {
  const alice = createMockMember({
    uid: '1',
    displayName: 'Alice Zaragoza',
    email: 'alice@example.com',
    profile: { company: 'Xignify', skills: ['Python', 'ML'] },
  });

  const bob = createMockMember({
    uid: '2',
    displayName: 'Bob Alvarado',
    email: 'bob@acme.com',
    profile: { company: 'Acme Corp', skills: ['R', 'Statistics'] },
  });

  const members = [alice, bob];

  it('returns all members for empty query', () => {
    expect(searchMembers(members, '   ')).toEqual(members);
  });

  it('matches by display name', () => {
    const result = searchMembers(members, 'alice');
    expect(result.map((m) => m.uid)).toEqual(['1']);
  });

  it('matches by email', () => {
    const result = searchMembers(members, 'acme.com');
    expect(result.map((m) => m.uid)).toEqual(['2']);
  });

  it('matches by company and skills case-insensitively', () => {
    expect(searchMembers(members, 'xignify').map((m) => m.uid)).toEqual(['1']);
    expect(searchMembers(members, 'python').map((m) => m.uid)).toEqual(['1']);
  });
});
