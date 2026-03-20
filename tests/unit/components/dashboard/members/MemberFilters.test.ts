/**
 * Tests for MemberFilters — filterMembers business logic
 *
 * TC-member-dashboard-001: Verifies filter logic for member/collaborator inclusion
 */
import { describe, it, expect } from 'vitest';
import { filterMembers, type FilterState } from '@/components/dashboard/members/MemberFilters';
import type { MemberProfile } from '@/types/member';

function createMockMember(overrides: Partial<MemberProfile> = {}): MemberProfile {
  return {
    uid: 'test-uid',
    displayName: 'Test User',
    slug: 'test-user',
    initials: 'TU',
    isOnline: false,
    lastSeen: new Date(),
    joinedAt: new Date(),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'member',
    isVerified: true,
    isActive: true,
    membershipTier: 'free',
    experience: {
      years: 2,
      level: 'mid',
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
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      showLocation: false,
      showCurrentCompany: false,
      showSalaryExpectations: false,
      allowMessages: 'all',
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
    ...overrides,
  } as MemberProfile;
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

      // If this compiles and doesn't throw, the type is correct
      const result = filterMembers([], filters);
      expect(result).toHaveLength(0);
    });
  });
});
