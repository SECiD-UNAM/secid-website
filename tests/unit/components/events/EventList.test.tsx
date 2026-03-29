// tests/unit/components/events/EventList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EventList from '@/components/events/EventList';

// ---------------------------------------------------------------------------
// Module mocks — hoisted, no module-scope variable references inside factories
// ---------------------------------------------------------------------------

vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  isDemoMode: false,
  isUsingMockAPI: () => true,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('clsx', () => ({ clsx: (...args: unknown[]) => args.filter(Boolean).join(' ') }));

vi.mock('@heroicons/react/24/outline', () => {
  const stub = () => null;
  return {
    CalendarIcon: stub,
    MapPinIcon: stub,
    UserGroupIcon: stub,
    ClockIcon: stub,
    VideoCameraIcon: stub,
    BuildingOfficeIcon: stub,
    SparklesIcon: stub,
    ChevronRightIcon: stub,
    ArrowRightIcon: stub,
  };
});

// ---------------------------------------------------------------------------
// Import mocked modules for control
// ---------------------------------------------------------------------------

import { getDocs } from 'firebase/firestore';

const mockGetDocs = getDocs as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeEvent(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: 'evt-1',
    title: 'Python Workshop',
    description: 'Learn Python fundamentals',
    type: 'workshop',
    startDate: future,
    endDate: new Date(future.getTime() + 2 * 60 * 60 * 1000),
    timezone: 'America/Mexico_City',
    duration: 120,
    location: { type: 'virtual', virtualLink: 'https://meet.example.com' },
    registrationRequired: true,
    maxAttendees: 50,
    currentAttendees: 20,
    registrationFee: 0,
    tags: ['python', 'beginner'],
    organizers: ['SECiD'],
    status: 'published',
    featured: false,
    ...overrides,
  };
}

function makePastEvent(overrides: Record<string, unknown> = {}) {
  const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return makeEvent({
    id: 'evt-past',
    title: 'Past Networking Event',
    startDate: past,
    endDate: new Date(past.getTime() + 60 * 60 * 1000),
    type: 'networking',
    ...overrides,
  });
}

function mockFirestoreSnapshot(events: ReturnType<typeof makeEvent>[]) {
  mockGetDocs.mockResolvedValue({
    docs: events.map((e) => ({
      id: e.id,
      data: () => ({
        ...e,
        startDate: { toDate: () => e.startDate },
        endDate: { toDate: () => e.endDate },
        registrationDeadline: e.registrationDeadline
          ? { toDate: () => (e as any).registrationDeadline }
          : undefined,
      }),
    })),
  } as any);
}

// ---------------------------------------------------------------------------
// Tests — each in its own describe for jsdom isolation
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe.sequential('EventList — rendering', () => {
  describe('TC-EVT-001: renders listing/calendar tab bar', () => {
    /**
     * TC-EVT-001
     * Verifies: AC-evt-01 — a tab bar toggling listing vs calendar view is rendered
     */
    it('shows listing and calendar tabs', async () => {
      mockFirestoreSnapshot([]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Calendar/i })).toBeInTheDocument();
      });
    });
  });

  describe('TC-EVT-002: renders search input in listing view', () => {
    /**
     * TC-EVT-002
     * Verifies: AC-evt-02 — a search input is rendered in listing view
     */
    it('shows searchbox in listing view', async () => {
      mockFirestoreSnapshot([]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });
    });
  });

  describe('TC-EVT-003: loading skeleton shown on mount', () => {
    /**
     * TC-EVT-003
     * Verifies: AC-evt-03 — loading skeleton displayed while fetching
     */
    it('shows loading skeleton during fetch', () => {
      // Never resolves — keeps loading state active
      mockGetDocs.mockReturnValue(new Promise(() => {}));

      render(<EventList lang="en" />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('TC-EVT-004: empty state when no events match', () => {
    /**
     * TC-EVT-004
     * Verifies: AC-evt-04 — empty state is shown when no events match current filters
     */
    it('shows empty state text when result list is empty', async () => {
      mockFirestoreSnapshot([]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('No events found')).toBeInTheDocument();
      });
    });
  });

  describe('TC-EVT-005: renders event card in grid view', () => {
    /**
     * TC-EVT-005
     * Verifies: AC-evt-05 — event title is rendered in a card
     */
    it('renders event title', async () => {
      const event = makeEvent({ id: 'evt-1', title: 'Data Science Summit' });
      mockFirestoreSnapshot([event]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('Data Science Summit')).toBeInTheDocument();
      });
    });
  });

  describe('TC-EVT-006: renders event card in list view', () => {
    /**
     * TC-EVT-006
     * Verifies: AC-evt-06 — switching to list view renders event in list layout
     */
    it('renders event in list view after toggle', async () => {
      const event = makeEvent({ id: 'evt-1', title: 'ML Webinar' });
      mockFirestoreSnapshot([event]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('ML Webinar')).toBeInTheDocument();
      });

      // Switch to list view using the ListingViewToggle radio group
      const listBtn = screen.getByRole('radio', { name: 'List' });
      act(() => { fireEvent.click(listBtn); });

      expect(screen.getByText('ML Webinar')).toBeInTheDocument();
    });
  });
});

describe.sequential('EventList — time filter', () => {
  describe('TC-EVT-007: upcoming events shown by default', () => {
    /**
     * TC-EVT-007
     * Verifies: AC-evt-07 — only upcoming events shown when time filter is "upcoming" (default)
     */
    it('shows upcoming event, hides past event by default', async () => {
      const upcomingEvent = makeEvent({ id: 'evt-upcoming', title: 'Future Event' });
      const pastEvent = makePastEvent({ title: 'Ancient Event' });
      mockFirestoreSnapshot([upcomingEvent, pastEvent]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('Future Event')).toBeInTheDocument();
      });
      expect(screen.queryByText('Ancient Event')).not.toBeInTheDocument();
    });
  });

  describe('TC-EVT-008: "All" time filter shows both upcoming and past', () => {
    /**
     * TC-EVT-008
     * Verifies: AC-evt-08 — "All" time filter shows all published events
     */
    it('shows all events when All filter selected', async () => {
      const upcomingEvent = makeEvent({ id: 'evt-future', title: 'Future Conference' });
      const pastEvent = makePastEvent({ title: 'Past Workshop' });
      mockFirestoreSnapshot([upcomingEvent, pastEvent]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('Future Conference')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'All' }));
      });

      await waitFor(() => {
        expect(screen.getByText('Future Conference')).toBeInTheDocument();
        expect(screen.getByText('Past Workshop')).toBeInTheDocument();
      });
    });
  });

  describe('TC-EVT-009: "Past" time filter shows only past events', () => {
    /**
     * TC-EVT-009
     * Verifies: AC-evt-09 — "Past" time filter shows only past events
     */
    it('shows only past events when Past filter selected', async () => {
      const upcomingEvent = makeEvent({ id: 'evt-f', title: 'Upcoming Webinar' });
      const pastEvent = makePastEvent({ title: 'Old Webinar' });
      mockFirestoreSnapshot([upcomingEvent, pastEvent]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Webinar')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Past' }));
      });

      await waitFor(() => {
        expect(screen.getByText('Old Webinar')).toBeInTheDocument();
      });
      expect(screen.queryByText('Upcoming Webinar')).not.toBeInTheDocument();
    });
  });
});

describe.sequential('EventList — calendar view', () => {
  describe('TC-EVT-010: calendar tab switches to calendar view', () => {
    /**
     * TC-EVT-010
     * Verifies: AC-evt-10 — clicking "Calendar" tab renders calendar placeholder; search disappears
     */
    it('shows calendar placeholder and hides search on calendar tab click', async () => {
      mockFirestoreSnapshot([]);

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Calendar/i }));
      });

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.getByText('Calendar view coming soon')).toBeInTheDocument();
    });
  });

  describe('TC-EVT-011: listing tab returns to listing view from calendar', () => {
    /**
     * TC-EVT-011
     * Verifies: AC-evt-11 — clicking "List" tab returns to listing view from calendar
     */
    it('returns to listing view from calendar on List tab click', async () => {
      mockFirestoreSnapshot([]);

      render(<EventList lang="en" />);

      // Switch to calendar
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /Calendar/i }));
      });
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

      // Switch back to listing
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'List' }));
      });

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });
    });
  });
});

describe.sequential('EventList — Spanish translations', () => {
  describe('TC-EVT-012: Spanish time filter labels', () => {
    /**
     * TC-EVT-012
     * Verifies: AC-evt-12 — time filter shows Spanish labels when lang="es"
     */
    it('renders Spanish time filter buttons', async () => {
      mockFirestoreSnapshot([]);

      render(<EventList lang="es" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Próximos' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pasados' })).toBeInTheDocument();
      });
    });
  });
});

describe.sequential('EventList — graceful degradation', () => {
  describe('TC-EVT-013: empty state on Firestore fetch error', () => {
    /**
     * TC-EVT-013
     * Verifies: AC-evt-13 — empty state shown when Firestore fetch fails
     */
    it('shows empty state when getDocs throws', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore unavailable'));

      render(<EventList lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('No events found')).toBeInTheDocument();
      });
    });
  });
});
