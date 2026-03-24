// tests/unit/components/mentorship/MentorshipMatcher.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { MentorProfile, MenteeProfile, MentorshipRequest } from '@/types';

// ---------------------------------------------------------------------------
// Hoisted mock functions (must be hoisted before vi.mock factories run)
// ---------------------------------------------------------------------------

const {
  mockGetMentorProfiles,
  mockGetMenteeProfile,
  mockCalculateMatchScore,
  mockGetMentorshipRequests,
  mockUseAuthContext,
} = vi.hoisted(() => ({
  mockGetMentorProfiles: vi.fn(),
  mockGetMenteeProfile: vi.fn(),
  mockCalculateMatchScore: vi.fn(),
  mockGetMentorshipRequests: vi.fn(),
  mockUseAuthContext: vi.fn(() => ({ user: { uid: 'user-1' } })),
}));

// ---------------------------------------------------------------------------
// Module mocks — must be top-level, factories use hoisted fns
// ---------------------------------------------------------------------------

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: mockUseAuthContext,
}));

vi.mock('@/lib/mentorship', () => ({
  getMentorProfiles: mockGetMentorProfiles,
  getMenteeProfile: mockGetMenteeProfile,
  calculateMatchScore: mockCalculateMatchScore,
  getMentorshipRequests: mockGetMentorshipRequests,
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => ({
    mentorship: {
      matcher: {
        loading: 'Loading...',
        createProfile: 'Create Profile',
        createProfileDescription: 'Create mentee profile to get started',
        createMenteeProfile: 'Create Mentee Profile',
        title: 'Find Your Mentor',
        description: 'Match with a mentor',
        availableMentors: 'Available Mentors',
        matches: 'Matches',
        filters: 'Filters',
        sortBy: 'Sort By',
        compatibility: 'Compatibility',
        rating: 'Rating',
        experience: 'Experience',
        calculating: 'Calculating...',
        recalculate: 'Recalculate',
        filterOptions: 'Filter Options',
        minimumRating: 'Minimum Rating',
        stars: 'Stars',
        experienceLevel: 'Experience Level',
        anyExperience: 'Any',
        juniorLevel: 'Junior',
        midLevel: 'Mid',
        seniorLevel: 'Senior',
        minimumHours: 'Min Hours',
        hoursPerWeek: 'hrs/week',
        clearFilters: 'Clear Filters',
        analyzingProfiles: 'Analyzing Profiles',
        calculatingCompatibility: 'Calculating compatibility...',
        noMatches: 'No Matches',
        noMatchesDescription: 'No mentors match your filters',
        adjustFilters: 'Adjust Filters',
        yearsExperience: 'years',
        sessions: 'Sessions',
        mentees: 'Mentees',
        compatibilityBreakdown: 'Compatibility Breakdown',
        skills: 'Skills',
        availability: 'Availability',
        style: 'Style',
        language: 'Language',
        whyThisMatch: 'Why This Match',
        expertise: 'Expertise',
        viewProfile: 'View Profile',
        requestPending: 'Request Pending',
        requestMentorship: 'Request Mentorship',
        excellent: 'Excellent',
        veryGood: 'Very Good',
        good: 'Good',
        fair: 'Fair',
        poor: 'Poor',
        requestModalDescription: 'Send a request to this mentor',
        yourGoals: 'Your Goals',
        continueRequest: 'Continue',
      },
    },
    common: { cancel: 'Cancel' },
  })),
}));

// ---------------------------------------------------------------------------
// Import the component under test (after all vi.mock calls)
// ---------------------------------------------------------------------------

import MentorshipMatcher from '@components/mentorship/MentorshipMatcher';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMentor(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 'mentor-1',
    userId: 'uid-1',
    name: 'Alice Smith',
    displayName: 'Alice Smith',
    title: 'Senior Data Scientist',
    company: 'Acme Corp',
    bio: 'Experienced in ML',
    expertise: ['ML', 'Python'],
    expertiseAreas: ['Machine Learning', 'Python'],
    industries: ['Tech'],
    yearsOfExperience: 8,
    availability: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
      hoursPerWeek: 5,
      preferredDays: ['monday', 'wednesday'],
    },
    maxMentees: 3,
    currentMentees: 1,
    rating: 4.5,
    reviewCount: 10,
    totalSessions: 25,
    isActive: true,
    isVerified: true,
    mentorshipStyle: ['hands-on', 'structured'],
    languages: ['es', 'en'],
    experience: {
      currentPosition: 'Senior Data Scientist',
      currentCompany: 'Acme Corp',
      yearsInField: 8,
    },
    joinedAt: new Date('2023-01-01'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  };
}

function makeMentee(overrides: Partial<MenteeProfile> = {}): MenteeProfile {
  return {
    id: 'mentee-1',
    userId: 'user-1',
    name: 'Bob Learner',
    displayName: 'Bob Learner',
    bio: 'Aspiring data scientist',
    goals: ['Learn ML', 'Get a job in data science'],
    interests: ['ML', 'Python'],
    currentLevel: 'entry',
    preferredMeetingType: 'video',
    preferredMentorshipStyle: ['hands-on'],
    languages: ['es', 'en'],
    timezone: 'America/Mexico_City',
    isActive: true,
    availability: {
      hoursPerWeek: 3,
      preferredDays: ['monday'],
    },
    background: {
      yearsOfExperience: 1,
    },
    joinedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeRequest(overrides: Partial<MentorshipRequest> = {}): MentorshipRequest {
  return {
    id: 'req-1',
    menteeId: 'user-1',
    mentorId: 'mentor-1',
    message: 'Please mentor me',
    goals: ['Learn ML'],
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}

const defaultMatchScore = {
  score: 0.85,
  reasons: ['Matching skills', 'Compatible availability'],
  compatibility: {
    skills: 0.9,
    availability: 0.8,
    style: 0.85,
    language: 1.0,
    experience: 0.7,
  },
};

function setupDefaultMocks(mentorOverrides: Partial<MentorProfile> = {}) {
  const mentor = makeMentor(mentorOverrides);
  const mentee = makeMentee();

  mockGetMentorProfiles.mockResolvedValue([mentor]);
  mockGetMenteeProfile.mockResolvedValue(mentee);
  mockGetMentorshipRequests.mockResolvedValue([]);
  mockCalculateMatchScore.mockResolvedValue(defaultMatchScore);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.sequential('MentorshipMatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ user: { uid: 'user-1' } });
    setupDefaultMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('TC-MATCHER-001: renders loading state initially', () => {
    /**
     * Verifies: AC-matcher-01 — loading state is shown while data loads
     */
    mockGetMentorProfiles.mockImplementation(() => new Promise(() => {})); // never resolves

    render(<MentorshipMatcher />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('TC-MATCHER-002: shows create-profile state when no mentee profile', async () => {
    /**
     * Verifies: AC-matcher-02 — empty state is shown when mentee profile is missing
     */
    mockGetMenteeProfile.mockResolvedValue(null);

    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(screen.getByText('Create Profile')).toBeInTheDocument();
    });
  });

  it('TC-MATCHER-003: renders mentor match cards after data loads', async () => {
    /**
     * Verifies: AC-matcher-03 — match cards are rendered for active mentors
     */
    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  it('TC-MATCHER-004: renders compatibility score badge', async () => {
    /**
     * Verifies: AC-matcher-04 — compatibility score percentage is shown on each match card
     */
    render(<MentorshipMatcher />);

    await waitFor(() => {
      // Multiple 85% elements appear (score badge + compatibility bars) — assert at least one
      const badges = screen.getAllByText('85%');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('TC-MATCHER-005: search input is visible and functional', async () => {
    /**
     * Verifies: AC-matcher-05 — search box from UniversalListing is rendered
     */
    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
  });

  it('TC-MATCHER-006: filters panel toggles via the filter button', async () => {
    /**
     * Verifies: AC-matcher-06 — collapsible filter panel opens when clicked
     */
    const user = userEvent.setup();
    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    // ListingFilters renders a toggle button with aria-expanded
    const filterButton = screen.getByRole('button', { name: /filtros|filters/i });
    await user.click(filterButton);
    expect(filterButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('TC-MATCHER-007: existing pending request shows disabled button', async () => {
    /**
     * Verifies: AC-matcher-07 — Request Pending button is disabled for pending requests
     */
    mockGetMentorshipRequests.mockResolvedValue([makeRequest()]);

    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(screen.getByText('Request Pending')).toBeInTheDocument();
    });

    const pendingBtn = screen.getByRole('button', { name: /request pending/i });
    expect(pendingBtn).toBeDisabled();
  });

  it('TC-MATCHER-008: request mentorship button shown when no pending request', async () => {
    /**
     * Verifies: AC-matcher-08 — active Request Mentorship button shown when no request pending
     */
    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /request mentorship/i })
      ).toBeInTheDocument();
    });
  });

  it('TC-MATCHER-009: clicking request button opens modal', async () => {
    /**
     * Verifies: AC-matcher-09 — clicking Request Mentorship opens a confirmation modal
     */
    const user = userEvent.setup();
    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /request mentorship/i })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /request mentorship/i }));

    expect(screen.getByText('Send a request to this mentor')).toBeInTheDocument();
  });

  it('TC-MATCHER-010: inactive mentors are not shown', async () => {
    /**
     * Verifies: AC-matcher-10 — only active mentors with available capacity are matched
     */
    const inactiveMentor = makeMentor({
      id: 'mentor-2',
      isActive: false,
      displayName: 'Inactive One',
    });
    const fullMentor = makeMentor({
      id: 'mentor-3',
      displayName: 'Full One',
      currentMentees: 3,
      maxMentees: 3,
    });
    const activeMentor = makeMentor({ id: 'mentor-4', displayName: 'Active One' });

    mockGetMentorProfiles.mockResolvedValue([inactiveMentor, fullMentor, activeMentor]);
    mockCalculateMatchScore.mockResolvedValue({
      score: 0.8,
      reasons: ['Good match'],
      compatibility: {
        skills: 0.8,
        availability: 0.8,
        style: 0.8,
        language: 0.8,
        experience: 0.8,
      },
    });

    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(screen.getByText('Active One')).toBeInTheDocument();
    });

    expect(screen.queryByText('Inactive One')).not.toBeInTheDocument();
    expect(screen.queryByText('Full One')).not.toBeInTheDocument();
  });

  it('TC-MATCHER-011: view mode toggle is present (grid/list)', async () => {
    /**
     * Verifies: AC-matcher-11 — view mode toggle offers grid and list options
     * Note: component uses lang="es" so aria-labels are in Spanish: "Cuadrícula" / "Lista"
     */
    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    // View toggle uses aria-label from listing i18n (Spanish)
    const gridBtn = screen.getByRole('radio', { name: /cuadr[íi]cula/i });
    const listBtn = screen.getByRole('radio', { name: /lista/i });
    expect(gridBtn).toBeInTheDocument();
    expect(listBtn).toBeInTheDocument();
  });

  it('TC-MATCHER-012: empty state shown when no active mentors', async () => {
    /**
     * Verifies: AC-matcher-12 — empty state appears when no mentors are available
     * The component passes emptyTitle="No Matches" to UniversalListing
     */
    mockGetMentorProfiles.mockResolvedValue([]);

    render(<MentorshipMatcher />);

    await waitFor(
      () => {
        // emptyTitle prop overrides the default listing empty title
        expect(screen.getByText('No Matches')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('TC-MATCHER-013: compatibility reasons are displayed on match card', async () => {
    /**
     * Verifies: AC-matcher-13 — match reason list is visible on each match card
     */
    render(<MentorshipMatcher />);

    await waitFor(() => {
      expect(screen.getByText('Matching skills')).toBeInTheDocument();
    });
  });
});
