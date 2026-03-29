/**
 * Tests for MemberDirectoryAdapter -- domain-specific adapter for MemberDirectory.
 *
 * Tests cover: text search, filter matching for all filter types,
 * sorting by multiple fields, pagination, and fetch integration.
 *
 * Verifies: Task 12 acceptance criteria -- adapter handles MemberProfile's
 * nested fields correctly for search, filtering, and sorting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MemberProfile } from '@/types/member';

// Mock getMemberProfiles before importing the adapter
vi.mock('@/lib/members', () => ({
  getMemberProfiles: vi.fn(),
}));

// Dynamic import so the mock is in place
const { MemberDirectoryAdapter } = await import(
  '@/components/directory/MemberDirectoryAdapter'
);
const { getMemberProfiles } = await import('@/lib/members');
const mockGetMemberProfiles = getMemberProfiles as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Test fixture factory
// ---------------------------------------------------------------------------

function createMember(overrides: Record<string, unknown> = {}): MemberProfile {
  return {
    uid: 'uid-1',
    displayName: 'Default Member',
    slug: 'default-member',
    initials: 'DM',
    email: 'default@example.com',
    role: 'member',
    isOnline: false,
    lastSeen: new Date('2026-03-20'),
    joinedAt: new Date('2025-06-01'),
    profile: {
      company: 'Default Corp',
      position: 'Engineer',
      location: 'Somewhere',
      bio: '',
      skills: [],
      graduationYear: '2022',
    },
    experience: {
      years: 2,
      level: 'mid',
      currentRole: 'Engineer',
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
      mentorshipStatus: 'none',
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: true,
      showPhone: false,
      showLocation: true,
      showCurrentCompany: true,
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
      lastActive: new Date('2026-03-01'),
    },
    searchableKeywords: [],
    featuredSkills: [],
    isPremium: false,
    educationHistory: [],
    languages: [],
    cvVisibility: 'public',
    ...overrides,
  } as MemberProfile;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const alice = createMember({
  uid: 'uid-alice',
  displayName: 'Alice Doe',
  searchableKeywords: ['alice', 'acme', 'python'],
  profile: {
    company: 'Acme Corp',
    position: 'Data Scientist',
    location: 'Ciudad de Mexico',
    bio: '',
    skills: ['Python', 'SQL'],
    graduationYear: '2022',
  },
  experience: {
    years: 3,
    level: 'mid',
    currentRole: 'Data Scientist',
    previousRoles: [],
    industries: ['Technology'],
  },
  featuredSkills: ['Python', 'Machine Learning'],
  isPremium: false,
  isOnline: true,
  joinedAt: new Date('2025-06-01'),
  activity: {
    profileViews: 42,
    totalConnections: 10,
    postsCount: 5,
    commentsCount: 12,
    helpfulVotes: 3,
    reputation: 150,
    lastActive: new Date('2026-03-22'),
  },
  networking: {
    connections: [],
    pendingConnections: [],
    blockedUsers: [],
    followers: [],
    following: [],
    availableForMentoring: true,
    openToOpportunities: true,
    mentorshipStatus: 'mentor',
  },
});

const bob = createMember({
  uid: 'uid-bob',
  displayName: 'Bob Smith',
  searchableKeywords: ['bob', 'google', 'tensorflow'],
  profile: {
    company: 'Google',
    position: 'ML Engineer',
    location: 'Guadalajara',
    bio: '',
    skills: ['TensorFlow', 'Python'],
    graduationYear: '2020',
  },
  experience: {
    years: 6,
    level: 'senior',
    currentRole: 'ML Engineer',
    previousRoles: [],
    industries: ['Technology', 'AI'],
  },
  featuredSkills: ['TensorFlow', 'Deep Learning'],
  isPremium: true,
  isOnline: false,
  joinedAt: new Date('2024-01-15'),
  activity: {
    profileViews: 100,
    totalConnections: 50,
    postsCount: 20,
    commentsCount: 30,
    helpfulVotes: 15,
    reputation: 400,
    lastActive: new Date('2026-03-10'),
  },
  networking: {
    connections: [],
    pendingConnections: [],
    blockedUsers: [],
    followers: [],
    following: [],
    availableForMentoring: false,
    openToOpportunities: false,
    mentorshipStatus: 'none',
  },
  portfolio: {
    projects: [
      {
        id: 'p1',
        title: 'Project',
        description: 'Desc',
        technologies: [],
        category: 'machine-learning',
        featured: false,
        createdAt: new Date(),
      },
    ],
    achievements: [],
    certifications: [],
  },
});

const carol = createMember({
  uid: 'uid-carol',
  displayName: 'Carol Lee',
  searchableKeywords: ['carol', 'microsoft', 'tableau'],
  profile: {
    company: 'Microsoft',
    position: 'Data Analyst',
    location: 'Remote',
    bio: '',
    skills: ['R', 'Tableau'],
    graduationYear: '2023',
  },
  experience: {
    years: 1,
    level: 'junior',
    currentRole: 'Data Analyst',
    previousRoles: [],
    industries: ['Consulting'],
  },
  featuredSkills: ['R', 'Tableau'],
  isPremium: false,
  isOnline: false,
  joinedAt: new Date('2026-01-10'),
  activity: {
    profileViews: 10,
    totalConnections: 2,
    postsCount: 1,
    commentsCount: 3,
    helpfulVotes: 0,
    reputation: 20,
    lastActive: new Date('2026-03-15'),
  },
  networking: {
    connections: [],
    pendingConnections: [],
    blockedUsers: [],
    followers: [],
    following: [],
    availableForMentoring: false,
    openToOpportunities: true,
    mentorshipStatus: 'mentee',
  },
});

const members = [alice, bob, carol];

// ---------------------------------------------------------------------------
// Tests -- using describe.sequential to avoid shared mock contamination
// ---------------------------------------------------------------------------

describe.sequential('MemberDirectoryAdapter', () => {
  let adapter: InstanceType<typeof MemberDirectoryAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMemberProfiles.mockResolvedValue(members);
    adapter = new MemberDirectoryAdapter('member', 50);
  });

  // --------------------------------------------------
  // TC-dir-001..006: Text search across nested fields
  // --------------------------------------------------
  describe.sequential('applySearch', () => {
    it('TC-dir-001: finds members by displayName', () => {
      /** Verifies: text search matches displayName */
      const result = adapter.applySearch(members, 'alice');
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-alice');
    });

    it('TC-dir-002: finds members by company name', () => {
      /** Verifies: text search matches nested profile.company */
      const result = adapter.applySearch(members, 'google');
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-bob');
    });

    it('TC-dir-003: finds members by position', () => {
      /** Verifies: text search matches nested profile.position */
      const result = adapter.applySearch(members, 'analyst');
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-carol');
    });

    it('TC-dir-004: finds members by featuredSkill', () => {
      /** Verifies: text search matches array fields */
      const result = adapter.applySearch(members, 'tensorflow');
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-bob');
    });

    it('TC-dir-005: search is case-insensitive', () => {
      /** Verifies: case insensitivity */
      const result = adapter.applySearch(members, 'ALICE');
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-alice');
    });

    it('TC-dir-006: no match returns empty array', () => {
      /** Verifies: unmatched query returns nothing */
      const result = adapter.applySearch(members, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  // --------------------------------------------------
  // TC-dir-010..022: Filter tests for each filter type
  // --------------------------------------------------
  describe.sequential('applyFilters', () => {
    it('TC-dir-010: filters by skills', () => {
      /** Verifies: skills filter matches featuredSkills + profile.skills */
      const result = adapter.applyFilters(members, {
        skills: ['Python'],
      });
      // alice: featuredSkills has Python. bob: profile.skills has Python
      expect(result).toHaveLength(2);
      expect(result.map((m: MemberProfile) => m.uid).sort()).toEqual([
        'uid-alice',
        'uid-bob',
      ]);
    });

    it('TC-dir-011: filters by companies', () => {
      /** Verifies: companies filter matches profile.company substring */
      const result = adapter.applyFilters(members, {
        companies: ['Google'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-bob');
    });

    it('TC-dir-012: filters by locations', () => {
      /** Verifies: locations filter matches profile.location substring */
      const result = adapter.applyFilters(members, {
        locations: ['Remote'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-carol');
    });

    it('TC-dir-013: filters by experience level', () => {
      /** Verifies: experienceLevel filter matches exact level */
      const result = adapter.applyFilters(members, {
        experienceLevel: ['senior'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-bob');
    });

    it('TC-dir-014: filters by industries', () => {
      /** Verifies: industries filter matches experience.industries */
      const result = adapter.applyFilters(members, {
        industries: ['Consulting'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-carol');
    });

    it('TC-dir-015: filters by availability (mentoring)', () => {
      /** Verifies: availability mentoring filter checks networking.availableForMentoring */
      const result = adapter.applyFilters(members, {
        availability: ['mentoring'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-alice');
    });

    it('TC-dir-016: filters by availability (opportunities)', () => {
      /** Verifies: availability opportunities filter checks networking.openToOpportunities */
      const result = adapter.applyFilters(members, {
        availability: ['opportunities'],
      });
      // alice and carol have openToOpportunities = true
      expect(result).toHaveLength(2);
    });

    it('TC-dir-017: filters by onlineStatus', () => {
      /** Verifies: onlineStatus filter checks isOnline */
      const result = adapter.applyFilters(members, {
        onlineStatus: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-alice');
    });

    it('TC-dir-018: filters by isPremium', () => {
      /** Verifies: isPremium filter checks isPremium */
      const result = adapter.applyFilters(members, {
        isPremium: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-bob');
    });

    it('TC-dir-019: filters by hasPortfolio', () => {
      /** Verifies: hasPortfolio filter checks portfolio.projects */
      const result = adapter.applyFilters(members, {
        hasPortfolio: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-bob');
    });

    it('TC-dir-020: filters by joinedAfter', () => {
      /** Verifies: joinedAfter filter checks joinedAt date */
      const result = adapter.applyFilters(members, {
        joinedAfter: new Date('2025-12-01'),
      });
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-carol');
    });

    it('TC-dir-021: multiple filters combine with AND', () => {
      /** Verifies: multiple filters are applied conjunctively */
      const result = adapter.applyFilters(members, {
        experienceLevel: ['mid', 'senior'],
        onlineStatus: true,
      });
      // mid or senior: alice (mid), bob (senior). online: alice only.
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-alice');
    });

    it('TC-dir-022: empty filter values are skipped', () => {
      /** Verifies: undefined/empty filter values do not exclude items */
      const result = adapter.applyFilters(members, {
        skills: [],
        companies: undefined as unknown as string[],
        onlineStatus: undefined,
      });
      expect(result).toHaveLength(3);
    });
  });

  // --------------------------------------------------
  // TC-dir-030..034: Sort tests
  // --------------------------------------------------
  describe.sequential('applySort', () => {
    it('TC-dir-030: sorts by name ascending', () => {
      /** Verifies: name sort uses displayName.localeCompare */
      const result = adapter.applySort(members, {
        field: 'name',
        direction: 'asc',
      });
      expect(result.map((m: MemberProfile) => m.displayName)).toEqual([
        'Alice Doe',
        'Bob Smith',
        'Carol Lee',
      ]);
    });

    it('TC-dir-031: sorts by name descending', () => {
      /** Verifies: name sort descending reverses order */
      const result = adapter.applySort(members, {
        field: 'name',
        direction: 'desc',
      });
      expect(result.map((m: MemberProfile) => m.displayName)).toEqual([
        'Carol Lee',
        'Bob Smith',
        'Alice Doe',
      ]);
    });

    it('TC-dir-032: sorts by reputation', () => {
      /** Verifies: reputation sort uses activity.reputation */
      const result = adapter.applySort(members, {
        field: 'reputation',
        direction: 'desc',
      });
      expect(result[0].uid).toBe('uid-bob'); // 400
      expect(result[1].uid).toBe('uid-alice'); // 150
      expect(result[2].uid).toBe('uid-carol'); // 20
    });

    it('TC-dir-033: sorts by joinDate', () => {
      /** Verifies: joinDate sort uses joinedAt timestamp */
      const result = adapter.applySort(members, {
        field: 'joinDate',
        direction: 'asc',
      });
      expect(result[0].uid).toBe('uid-bob'); // 2024-01-15
      expect(result[1].uid).toBe('uid-alice'); // 2025-06-01
      expect(result[2].uid).toBe('uid-carol'); // 2026-01-10
    });

    it('TC-dir-034: sorts by activity (lastActive)', () => {
      /** Verifies: activity sort uses activity.lastActive timestamp */
      const result = adapter.applySort(members, {
        field: 'activity',
        direction: 'desc',
      });
      expect(result[0].uid).toBe('uid-alice'); // 2026-03-22
      expect(result[1].uid).toBe('uid-carol'); // 2026-03-15
      expect(result[2].uid).toBe('uid-bob'); // 2026-03-10
    });
  });

  // --------------------------------------------------
  // TC-dir-040..044: fetch integration (pagination, cache, params)
  // --------------------------------------------------
  describe.sequential('fetch', () => {
    it('TC-dir-040: paginates results correctly', async () => {
      /** Verifies: offset pagination with page/pageSize */
      const result = await adapter.fetch({
        pageSize: 2,
        page: 1,
      });
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(true);

      const page2 = await adapter.fetch({
        pageSize: 2,
        page: 2,
      });
      expect(page2.items).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });

    it('TC-dir-041: applies search, filters, and sort together', async () => {
      /** Verifies: all pipeline stages combine correctly */
      const result = await adapter.fetch({
        query: 'data',
        filters: { experienceLevel: ['mid', 'junior'] },
        sort: { field: 'name', direction: 'asc' },
        pageSize: 10,
        page: 1,
      });
      // "data" appears in: Alice "Data Scientist" position, Carol "Data Analyst" position
      // experienceLevel mid or junior: Alice (mid) and Carol (junior)
      // intersection: Alice and Carol, sorted asc by name
      expect(result.items.map((m: MemberProfile) => m.displayName)).toEqual([
        'Alice Doe',
        'Carol Lee',
      ]);
      expect(result.totalCount).toBe(2);
    });

    it('TC-dir-042: caches data after first fetch', async () => {
      /** Verifies: adapter caches data and does not re-fetch */
      const freshAdapter = new MemberDirectoryAdapter('member', 50);
      await freshAdapter.fetch({ pageSize: 10, page: 1 });
      await freshAdapter.fetch({ pageSize: 10, page: 1 });
      // Only one call for this specific adapter instance
      // Use toHaveBeenCalledTimes with the delta since we have a fresh adapter
      const callsBefore = mockGetMemberProfiles.mock.calls.length;
      await freshAdapter.fetch({ pageSize: 10, page: 1 });
      expect(mockGetMemberProfiles.mock.calls.length).toBe(callsBefore);
    });

    it('TC-dir-043: invalidate clears cache and re-fetches', async () => {
      /** Verifies: invalidate forces fresh data load */
      const freshAdapter = new MemberDirectoryAdapter('member', 50);
      await freshAdapter.fetch({ pageSize: 10, page: 1 });
      const callsBefore = mockGetMemberProfiles.mock.calls.length;
      freshAdapter.invalidate();
      await freshAdapter.fetch({ pageSize: 10, page: 1 });
      expect(mockGetMemberProfiles.mock.calls.length).toBe(callsBefore + 1);
    });

    it('TC-dir-044: passes memberType and maxMembers to getMemberProfiles', async () => {
      /** Verifies: adapter forwards constructor params to data source */
      const customAdapter = new MemberDirectoryAdapter('collaborator', 100);
      await customAdapter.fetch({ pageSize: 10, page: 1 });
      expect(mockGetMemberProfiles).toHaveBeenCalledWith({
        filters: { memberType: 'collaborator' },
        limit: 100,
      });
    });
  });
});
