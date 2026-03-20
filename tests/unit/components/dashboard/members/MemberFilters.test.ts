/**
 * Tests for MemberFilters — filterMembers business logic and utility functions
 *
 * TC-member-dashboard-001 through TC-member-dashboard-020:
 * Verifies filter logic for all FilterState fields
 */
import { describe, it, expect } from 'vitest';
import {
  filterMembers,
  extractFilterOptions,
  countActiveFilters,
  DEFAULT_FILTER_STATE,
  type FilterState,
} from '@/components/dashboard/members/MemberFilters';
import type { MemberProfile } from '@/types/member';

function createMockMember(overrides: Record<string, unknown> = {}): MemberProfile {
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
    searchableKeywords: [],
    featuredSkills: [],
    isPremium: false,
  };

  // Deep merge for nested objects
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      (merged as Record<string, unknown>)[key] = {
        ...((base as Record<string, unknown>)[key] as Record<string, unknown> || {}),
        ...(value as Record<string, unknown>),
      };
    } else {
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  return merged as unknown as MemberProfile;
}

describe('filterMembers', () => {
  describe('collaborator filtering', () => {
    /**
     * TC-member-dashboard-001
     * Verifies: AC-1 — collaborators excluded by default
     */
    it('should exclude collaborators when includeCollaborators is false', () => {
      const members = [
        createMockMember({ uid: '1', role: 'member' }),
        createMockMember({ uid: '2', role: 'collaborator' }),
        createMockMember({ uid: '3', role: 'member' }),
      ];
      const filters: FilterState = { includeCollaborators: false };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.role === 'member')).toBe(true);
    });

    /**
     * TC-member-dashboard-002
     * Verifies: AC-1 — collaborators included when flag is true
     */
    it('should include collaborators when includeCollaborators is true', () => {
      const members = [
        createMockMember({ uid: '1', role: 'member' }),
        createMockMember({ uid: '2', role: 'collaborator' }),
        createMockMember({ uid: '3', role: 'member' }),
      ];
      const filters: FilterState = { includeCollaborators: true };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(3);
    });

    /**
     * TC-member-dashboard-003
     * Verifies: AC-1 — empty array returns empty
     */
    it('should return empty array when no members provided', () => {
      const filters: FilterState = { includeCollaborators: false };

      const result = filterMembers([], filters);

      expect(result).toHaveLength(0);
    });

    /**
     * TC-member-dashboard-004
     * Verifies: AC-1 — only collaborators returns empty when excluded
     */
    it('should return empty array when all members are collaborators and excluded', () => {
      const members = [
        createMockMember({ uid: '1', role: 'collaborator' }),
        createMockMember({ uid: '2', role: 'collaborator' }),
      ];
      const filters: FilterState = { includeCollaborators: false };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(0);
    });
  });

  describe('campus filtering', () => {
    /**
     * TC-member-dashboard-006
     * Verifies: AC-3 — campus multi-select filter
     */
    it('should filter by selected campuses', () => {
      const members = [
        createMockMember({ uid: '1', campus: 'CU' }),
        createMockMember({ uid: '2', campus: 'FES Acatlan' }),
        createMockMember({ uid: '3', campus: 'CU' }),
      ];
      const filters: FilterState = { includeCollaborators: true, campuses: ['CU'] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });

    it('should not filter when campuses array is empty', () => {
      const members = [
        createMockMember({ uid: '1', campus: 'CU' }),
        createMockMember({ uid: '2', campus: 'FES Acatlan' }),
      ];
      const filters: FilterState = { includeCollaborators: true, campuses: [] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('generation filtering', () => {
    /**
     * TC-member-dashboard-007
     * Verifies: AC-3 — generation multi-select filter
     */
    it('should filter by selected generations', () => {
      const members = [
        createMockMember({ uid: '1', generation: '2020' }),
        createMockMember({ uid: '2', generation: '2021' }),
        createMockMember({ uid: '3', generation: '2020' }),
      ];
      const filters: FilterState = { includeCollaborators: true, generations: ['2020'] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('company filtering', () => {
    /**
     * TC-member-dashboard-008
     * Verifies: AC-3 — company multi-select filter
     */
    it('should filter by selected companies', () => {
      const members = [
        createMockMember({ uid: '1', profile: { company: 'Google' } }),
        createMockMember({ uid: '2', profile: { company: 'Meta' } }),
        createMockMember({ uid: '3', profile: { company: 'Google' } }),
      ];
      const filters: FilterState = { includeCollaborators: true, companies: ['Google'] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('skills filtering', () => {
    /**
     * TC-member-dashboard-009
     * Verifies: AC-3 — skills multi-select filter (OR logic — any match)
     */
    it('should filter by skills with OR logic', () => {
      const members = [
        createMockMember({ uid: '1', profile: { skills: ['Python', 'R'] } }),
        createMockMember({ uid: '2', profile: { skills: ['Java'] } }),
        createMockMember({ uid: '3', profile: { skills: ['Python', 'SQL'] } }),
      ];
      const filters: FilterState = { includeCollaborators: true, skills: ['Python'] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });

    it('should match if member has any of the selected skills', () => {
      const members = [
        createMockMember({ uid: '1', profile: { skills: ['Python', 'R'] } }),
        createMockMember({ uid: '2', profile: { skills: ['Java'] } }),
      ];
      const filters: FilterState = { includeCollaborators: true, skills: ['Python', 'Java'] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('experience level filtering', () => {
    /**
     * TC-member-dashboard-010
     * Verifies: AC-3 — experience level multi-select filter
     */
    it('should filter by experience levels', () => {
      const members = [
        createMockMember({ uid: '1', experience: { level: 'senior' } }),
        createMockMember({ uid: '2', experience: { level: 'junior' } }),
        createMockMember({ uid: '3', experience: { level: 'senior' } }),
      ];
      const filters: FilterState = { includeCollaborators: true, experienceLevels: ['senior'] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('professional status filtering', () => {
    /**
     * TC-member-dashboard-011
     * Verifies: AC-3 — professional status multi-select filter
     */
    it('should filter by professional statuses', () => {
      const members = [
        createMockMember({ uid: '1', professionalStatus: 'employed' }),
        createMockMember({ uid: '2', professionalStatus: 'freelance' }),
        createMockMember({ uid: '3', professionalStatus: 'employed' }),
      ];
      const filters: FilterState = {
        includeCollaborators: true,
        professionalStatuses: ['employed'],
      };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });

    it('should skip professional status filter if member has no status', () => {
      const members = [
        createMockMember({ uid: '1', professionalStatus: undefined }),
        createMockMember({ uid: '2', professionalStatus: 'employed' }),
      ];
      const filters: FilterState = {
        includeCollaborators: true,
        professionalStatuses: ['employed'],
      };

      const result = filterMembers(members, filters);

      // Member without status is excluded when filter is active
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('2');
    });
  });

  describe('boolean filters', () => {
    /**
     * TC-member-dashboard-012
     * Verifies: AC-4 — online only filter
     */
    it('should filter for online members only', () => {
      const members = [
        createMockMember({ uid: '1', isOnline: true }),
        createMockMember({ uid: '2', isOnline: false }),
        createMockMember({ uid: '3', isOnline: true }),
      ];
      const filters: FilterState = { includeCollaborators: true, onlineOnly: true };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.isOnline)).toBe(true);
    });

    /**
     * TC-member-dashboard-013
     * Verifies: AC-4 — mentorship available filter
     */
    it('should filter for mentorship-available members', () => {
      const members = [
        createMockMember({
          uid: '1',
          networking: { availableForMentoring: true },
        }),
        createMockMember({
          uid: '2',
          networking: { availableForMentoring: false },
        }),
      ];
      const filters: FilterState = { includeCollaborators: true, mentorshipAvailable: true };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('1');
    });

    it('should not filter when onlineOnly is false', () => {
      const members = [
        createMockMember({ uid: '1', isOnline: true }),
        createMockMember({ uid: '2', isOnline: false }),
      ];
      const filters: FilterState = { includeCollaborators: true, onlineOnly: false };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('date filtering', () => {
    /**
     * TC-member-dashboard-014
     * Verifies: AC-5 — joined after date filter
     */
    it('should filter by joinedAfter date', () => {
      const members = [
        createMockMember({ uid: '1', joinedAt: new Date('2023-01-01') }),
        createMockMember({ uid: '2', joinedAt: new Date('2024-06-01') }),
        createMockMember({ uid: '3', joinedAt: new Date('2024-01-15') }),
      ];
      const filters: FilterState = {
        includeCollaborators: true,
        joinedAfter: '2024-01-01',
      };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });

    it('should not filter when joinedAfter is undefined', () => {
      const members = [
        createMockMember({ uid: '1', joinedAt: new Date('2020-01-01') }),
        createMockMember({ uid: '2', joinedAt: new Date('2024-06-01') }),
      ];
      const filters: FilterState = { includeCollaborators: true };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('combined filters', () => {
    /**
     * TC-member-dashboard-015
     * Verifies: AC-6 — multiple filters applied simultaneously (AND logic)
     */
    it('should apply all filters with AND logic', () => {
      const members = [
        createMockMember({
          uid: '1',
          campus: 'CU',
          isOnline: true,
          experience: { level: 'senior' },
          profile: { skills: ['Python'] },
        }),
        createMockMember({
          uid: '2',
          campus: 'CU',
          isOnline: false,
          experience: { level: 'senior' },
          profile: { skills: ['Python'] },
        }),
        createMockMember({
          uid: '3',
          campus: 'FES',
          isOnline: true,
          experience: { level: 'senior' },
          profile: { skills: ['Python'] },
        }),
      ];
      const filters: FilterState = {
        includeCollaborators: true,
        campuses: ['CU'],
        onlineOnly: true,
        experienceLevels: ['senior'],
        skills: ['Python'],
      };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('1');
    });
  });

  describe('gender filtering', () => {
    /**
     * TC-member-dashboard-016
     * Verifies: AC-3 — gender multi-select filter using registrationData fallback
     */
    it('should filter by gender from registrationData', () => {
      const members = [
        createMockMember({ uid: '1', registrationData: { gender: 'M' } } as Record<string, unknown>),
        createMockMember({ uid: '2', registrationData: { gender: 'F' } } as Record<string, unknown>),
        createMockMember({ uid: '3', registrationData: { gender: 'M' } } as Record<string, unknown>),
      ];
      const filters: FilterState = { includeCollaborators: true, genders: ['M'] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('degree filtering', () => {
    /**
     * TC-member-dashboard-017
     * Verifies: AC-3 — degree multi-select filter using academicLevel
     */
    it('should filter by academicLevel', () => {
      const members = [
        createMockMember({ uid: '1', academicLevel: 'licenciatura' }),
        createMockMember({ uid: '2', academicLevel: 'posgrado' }),
        createMockMember({ uid: '3', academicLevel: 'licenciatura' }),
      ];
      const filters: FilterState = { includeCollaborators: true, degrees: ['licenciatura'] };

      const result = filterMembers(members, filters);

      expect(result).toHaveLength(2);
    });
  });

  describe('FilterState type', () => {
    /**
     * TC-member-dashboard-005
     * Verifies: AC-2 — FilterState has all required optional fields
     */
    it('should accept a complete FilterState with all optional fields', () => {
      const filters: FilterState = {
        includeCollaborators: true,
        generations: ['2020', '2021'],
        campuses: ['CU'],
        genders: ['M'],
        degrees: ['BSc'],
        companies: ['Google'],
        skills: ['Python'],
        experienceLevels: ['senior'],
        professionalStatuses: ['employed'],
        joinedAfter: '2023-01-01',
        onlineOnly: true,
        mentorshipAvailable: false,
      };

      const result = filterMembers([], filters);
      expect(result).toHaveLength(0);
    });
  });
});

describe('extractFilterOptions', () => {
  /**
   * TC-member-dashboard-018
   * Verifies: AC-7 — dropdown options derived from members array
   */
  it('should extract unique campuses from members', () => {
    const members = [
      createMockMember({ uid: '1', campus: 'CU' }),
      createMockMember({ uid: '2', campus: 'FES Acatlan' }),
      createMockMember({ uid: '3', campus: 'CU' }),
      createMockMember({ uid: '4' }), // no campus
    ];

    const options = extractFilterOptions(members);

    expect(options.campuses).toEqual(expect.arrayContaining(['CU', 'FES Acatlan']));
    expect(options.campuses).toHaveLength(2);
  });

  it('should extract unique skills from members', () => {
    const members = [
      createMockMember({ uid: '1', profile: { skills: ['Python', 'R'] } }),
      createMockMember({ uid: '2', profile: { skills: ['Python', 'SQL'] } }),
    ];

    const options = extractFilterOptions(members);

    expect(options.skills).toEqual(expect.arrayContaining(['Python', 'R', 'SQL']));
    expect(options.skills).toHaveLength(3);
  });

  it('should extract unique experience levels', () => {
    const members = [
      createMockMember({ uid: '1', experience: { level: 'senior' } }),
      createMockMember({ uid: '2', experience: { level: 'junior' } }),
      createMockMember({ uid: '3', experience: { level: 'senior' } }),
    ];

    const options = extractFilterOptions(members);

    expect(options.experienceLevels).toEqual(expect.arrayContaining(['senior', 'junior']));
    expect(options.experienceLevels).toHaveLength(2);
  });

  it('should extract unique companies excluding empty strings', () => {
    const members = [
      createMockMember({ uid: '1', profile: { company: 'Google' } }),
      createMockMember({ uid: '2', profile: { company: '' } }),
      createMockMember({ uid: '3', profile: { company: 'Google' } }),
    ];

    const options = extractFilterOptions(members);

    expect(options.companies).toEqual(['Google']);
  });
});

describe('countActiveFilters', () => {
  /**
   * TC-member-dashboard-019
   * Verifies: AC-8 — active filter count displayed on toggle button
   */
  it('should return 0 for default filters', () => {
    expect(countActiveFilters(DEFAULT_FILTER_STATE)).toBe(0);
  });

  it('should count non-empty array filters', () => {
    const filters: FilterState = {
      includeCollaborators: false,
      campuses: ['CU'],
      skills: ['Python', 'R'],
    };

    expect(countActiveFilters(filters)).toBe(2);
  });

  it('should count boolean filters when true', () => {
    const filters: FilterState = {
      includeCollaborators: false,
      onlineOnly: true,
      mentorshipAvailable: true,
    };

    expect(countActiveFilters(filters)).toBe(2);
  });

  it('should count joinedAfter when set', () => {
    const filters: FilterState = {
      includeCollaborators: false,
      joinedAfter: '2024-01-01',
    };

    expect(countActiveFilters(filters)).toBe(1);
  });

  it('should count includeCollaborators when true', () => {
    const filters: FilterState = {
      includeCollaborators: true,
    };

    expect(countActiveFilters(filters)).toBe(1);
  });

  /**
   * TC-member-dashboard-020
   * Verifies: AC-9 — clear all resets to defaults
   */
  it('should return 0 after applying DEFAULT_FILTER_STATE', () => {
    expect(countActiveFilters({ ...DEFAULT_FILTER_STATE })).toBe(0);
  });
});
