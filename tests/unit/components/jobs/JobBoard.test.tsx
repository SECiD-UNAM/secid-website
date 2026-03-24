// tests/unit/components/jobs/JobBoard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobBoard } from '@/components/jobs/JobBoard';
import { useAuth } from '@/contexts/AuthContext';
import * as JobFirestoreAdapterModule from '@lib/listing/adapters/JobFirestoreAdapter';
import type { Job } from '@lib/listing/adapters/JobFirestoreAdapter';

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the adapter at the module level so we can control fetch responses
vi.mock('@lib/listing/adapters/JobFirestoreAdapter', async (importOriginal) => {
  const actual = await importOriginal<typeof JobFirestoreAdapterModule>();
  return {
    ...actual,
    JobFirestoreAdapter: vi.fn().mockImplementation(() => ({
      fetch: vi.fn(),
    })),
  };
});

// Mock JobCard to keep tests focused on JobBoard behavior
vi.mock('@/components/jobs/JobCard', () => ({
  default: ({ job, lang }: { job: Job; lang: string }) => (
    <div data-testid={`job-card-${job.id}`}>
      <h3>{job.title}</h3>
      <p>{job.company}</p>
      {job.matchScore !== undefined && (
        <span data-testid="match-score">{job.matchScore}</span>
      )}
    </div>
  ),
}));

vi.mock(
  '@heroicons/react/24/outline',
  () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop === 'string' && prop !== '__esModule') {
            const Icon = ({ className }: { className?: string }) => (
              <svg className={className} data-testid={`${prop}-icon`} />
            );
            Icon.displayName = String(prop);
            return Icon;
          }
          return undefined;
        },
      }
    )
);

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Senior Data Scientist',
    company: 'TechCorp México',
    location: 'Ciudad de México, CDMX',
    locationType: 'hybrid',
    employmentType: 'full-time',
    experienceLevel: 'senior',
    industry: 'technology',
    companySize: 'large',
    salaryRange: {
      min: 60000,
      max: 90000,
      currency: 'MXN',
      period: 'monthly',
    },
    description: 'We are looking for an experienced Data Scientist...',
    requirements: ['Python', 'Machine Learning', 'SQL'],
    benefits: ['Seguro médico', 'Home office'],
    tags: ['python', 'machine-learning', 'sql'],
    postedAt: new Date('2024-01-15'),
    postedBy: 'company123',
    applicationCount: 23,
    viewCount: 156,
    featured: true,
    matchScore: 100,
  },
  {
    id: '2',
    title: 'Data Analyst Junior',
    company: 'Startup Fintech',
    location: 'Guadalajara, Jalisco',
    locationType: 'onsite',
    employmentType: 'full-time',
    experienceLevel: 'junior',
    industry: 'finance',
    companySize: 'startup',
    salaryRange: {
      min: 20000,
      max: 30000,
      currency: 'MXN',
      period: 'monthly',
    },
    description: 'Join our growing fintech startup...',
    requirements: ['SQL', 'Excel', 'Python'],
    benefits: ['Seguro médico'],
    tags: ['sql', 'analyst'],
    postedAt: new Date('2024-01-10'),
    postedBy: 'company456',
    applicationCount: 45,
    viewCount: 245,
    featured: false,
    matchScore: 33,
  },
];

const mockUser = {
  uid: 'user123',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockUserProfile = {
  skills: ['Python', 'Machine Learning', 'SQL'],
  experienceLevel: 'senior',
  location: 'Ciudad de México',
};

describe.sequential('JobBoard', () => {
  const MockedJobFirestoreAdapter = vi.mocked(
    JobFirestoreAdapterModule.JobFirestoreAdapter
  );
  const mockUseAuth = vi.mocked(useAuth);

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFetch = vi.fn().mockResolvedValue({
      items: mockJobs,
      totalCount: 2,
      hasMore: true,
      nextCursor: 'cursor-token',
    });

    MockedJobFirestoreAdapter.mockImplementation(() => ({
      fetch: mockFetch,
    }));

    mockUseAuth.mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    } as any);
  });

  describe('Component Rendering', () => {
    it('TC-JOBBOARD-001: renders search input in Spanish by default', async () => {
      /**
       * TC-JOBBOARD-001
       * Verifies: AC-jobboard-01 — renders search input with correct i18n placeholder
       */
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
      });
    });

    it('TC-JOBBOARD-002: renders search input in English when lang="en"', async () => {
      /**
       * TC-JOBBOARD-002
       * Verifies: AC-jobboard-02 — i18n switches to English correctly
       */
      render(<JobBoard lang="en" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    it('TC-JOBBOARD-003: shows loading state during initial fetch', async () => {
      /**
       * TC-JOBBOARD-003
       * Verifies: AC-jobboard-03 — loading skeleton visible before data arrives
       */
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<JobBoard />);

      // ListingLoading renders skeleton elements with animate-pulse
      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      });
    });

    it('TC-JOBBOARD-004: renders job cards after successful fetch', async () => {
      /**
       * TC-JOBBOARD-004
       * Verifies: AC-jobboard-04 — job cards render with fetched data
       */
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('job-card-2')).toBeInTheDocument();
      });
    });

    it('TC-JOBBOARD-005: renders sort options in Spanish', async () => {
      /**
       * TC-JOBBOARD-005
       * Verifies: AC-jobboard-05 — sort dropdown shows Spanish labels
       */
      render(<JobBoard />);

      // ListingSort renders options inside a <select>; wait for component to settle
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
        const options = Array.from(select.querySelectorAll('option'));
        expect(options.some((o) => o.textContent === 'Más recientes')).toBe(true);
      });
    });

    it('TC-JOBBOARD-006: renders sort options in English', async () => {
      /**
       * TC-JOBBOARD-006
       * Verifies: AC-jobboard-06 — sort dropdown shows English labels
       */
      render(<JobBoard lang="en" />);

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        const options = Array.from(select.querySelectorAll('option'));
        expect(options.some((o) => o.textContent === 'Most recent')).toBe(true);
      });
    });
  });

  describe('Adapter Integration', () => {
    it('TC-JOBBOARD-007: instantiates JobFirestoreAdapter with user skills', () => {
      /**
       * TC-JOBBOARD-007
       * Verifies: AC-jobboard-07 — adapter is created with user skills for match scoring
       */
      render(<JobBoard />);

      expect(MockedJobFirestoreAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          userSkills: mockUserProfile.skills,
        })
      );
    });

    it('TC-JOBBOARD-008: instantiates adapter with empty skills when no user profile', () => {
      /**
       * TC-JOBBOARD-008
       * Verifies: AC-jobboard-08 — adapter handles null user profile gracefully
       */
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      } as any);

      render(<JobBoard />);

      expect(MockedJobFirestoreAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          userSkills: [],
        })
      );
    });

    it('TC-JOBBOARD-009: calls adapter fetch on mount', async () => {
      /**
       * TC-JOBBOARD-009
       * Verifies: AC-jobboard-09 — adapter fetch is called on component mount
       */
      render(<JobBoard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('TC-JOBBOARD-010: passes sort field to adapter', async () => {
      /**
       * TC-JOBBOARD-010
       * Verifies: AC-jobboard-10 — default sort is postedAt descending
       */
      render(<JobBoard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: expect.objectContaining({
              field: 'postedAt',
              direction: 'desc',
            }),
          })
        );
      });
    });
  });

  describe('Empty State', () => {
    it('TC-JOBBOARD-011: shows empty state in Spanish when no jobs', async () => {
      /**
       * TC-JOBBOARD-011
       * Verifies: AC-jobboard-11 — empty state with i18n text when adapter returns zero items
       */
      mockFetch.mockResolvedValue({
        items: [],
        totalCount: 0,
        hasMore: false,
      });

      render(<JobBoard />);

      await waitFor(() => {
        expect(
          screen.getByText('No se encontraron empleos')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Intenta ajustar tus filtros o términos de búsqueda')
        ).toBeInTheDocument();
      });
    });

    it('TC-JOBBOARD-012: shows empty state in English when no jobs', async () => {
      /**
       * TC-JOBBOARD-012
       * Verifies: AC-jobboard-12 — empty state uses English text when lang="en"
       */
      mockFetch.mockResolvedValue({
        items: [],
        totalCount: 0,
        hasMore: false,
      });

      render(<JobBoard lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('No jobs found')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Try adjusting your filters or search terms'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('TC-JOBBOARD-013: shows error state with retry when adapter fails', async () => {
      /**
       * TC-JOBBOARD-013
       * Verifies: AC-jobboard-13 — error state with retry button when fetch rejects
       */
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Load More (Cursor Pagination)', () => {
    it('TC-JOBBOARD-014: shows load more button when hasMore is true', async () => {
      /**
       * TC-JOBBOARD-014
       * Verifies: AC-jobboard-14 — load more button visible when adapter reports hasMore=true
       */
      render(<JobBoard />);

      await waitFor(() => {
        // ListingPagination cursor mode renders a button with text "Cargar más"
        const loadMoreBtn = screen.getByRole('button', { name: /cargar más/i });
        expect(loadMoreBtn).toBeInTheDocument();
      });
    });

    it('TC-JOBBOARD-015: triggers adapter fetch when load more is clicked', async () => {
      /**
       * TC-JOBBOARD-015
       * Verifies: AC-jobboard-15 — clicking load more triggers cursor pagination fetch
       */
      const user = userEvent.setup();
      render(<JobBoard />);

      const loadMoreButton = await screen.findByRole('button', {
        name: /cargar más/i,
      });
      const callsBefore = mockFetch.mock.calls.length;

      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it('TC-JOBBOARD-016: hides load more when hasMore is false', async () => {
      /**
       * TC-JOBBOARD-016
       * Verifies: AC-jobboard-16 — load more not shown when adapter reports hasMore=false
       */
      mockFetch.mockResolvedValue({
        items: mockJobs.slice(0, 1),
        totalCount: 1,
        hasMore: false,
      });

      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('button', { name: /cargar más/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('TC-JOBBOARD-017: renders list view by default', async () => {
      /**
       * TC-JOBBOARD-017
       * Verifies: AC-jobboard-17 — default view mode is list (ListingList uses role="list")
       */
      render(<JobBoard />);

      await waitFor(() => {
        // ListingList renders a <div role="list"> container
        expect(screen.getByRole('list')).toBeInTheDocument();
      });
    });
  });

  describe('External Filters Prop', () => {
    it('TC-JOBBOARD-018: passes location filter to adapter fetch', async () => {
      /**
       * TC-JOBBOARD-018
       * Verifies: AC-jobboard-18 — external filters prop is forwarded to adapter
       */
      const externalFilters = {
        location: 'cdmx',
        locationType: [],
        employmentType: [],
        experienceLevel: [],
        salaryMin: 0,
        salaryMax: 200000,
        skills: [],
        postedWithin: 'all',
        industry: [],
        companySize: [],
        benefits: [],
      };

      render(<JobBoard filters={externalFilters} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({ location: 'cdmx' }),
          })
        );
      });
    });

    it('TC-JOBBOARD-019: renders with undefined filters prop without error', () => {
      /**
       * TC-JOBBOARD-019
       * Verifies: AC-jobboard-19 — undefined filters prop handled gracefully
       */
      expect(() => render(<JobBoard filters={undefined} />)).not.toThrow();
    });

    it('TC-JOBBOARD-020: passes salary filter when below max threshold', async () => {
      /**
       * TC-JOBBOARD-020
       * Verifies: AC-jobboard-20 — salary filters forwarded when non-default values set
       */
      const filtersWithSalary = {
        location: '',
        locationType: [],
        employmentType: [],
        experienceLevel: [],
        salaryMin: 50000,
        salaryMax: 100000,
        skills: [],
        postedWithin: 'all',
        industry: [],
        companySize: [],
        benefits: [],
      };

      render(<JobBoard filters={filtersWithSalary} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              salaryMin: 50000,
              salaryMax: 100000,
            }),
          })
        );
      });
    });
  });

  describe('Search Integration', () => {
    it('TC-JOBBOARD-021: search input updates query and triggers refetch', async () => {
      /**
       * TC-JOBBOARD-021
       * Verifies: AC-jobboard-21 — typing in search triggers debounced adapter fetch with query
       */
      const user = userEvent.setup();
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar...');
      await user.type(searchInput, 'Senior');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'Senior',
          })
        );
      });
    });
  });

  describe('Stats Display', () => {
    it('TC-JOBBOARD-022: shows results stats when items are loaded', async () => {
      /**
       * TC-JOBBOARD-022
       * Verifies: AC-jobboard-22 — stats bar shows item count range
       */
      mockFetch.mockResolvedValue({
        items: mockJobs,
        totalCount: 20,
        hasMore: true,
        nextCursor: 'cursor',
      });

      render(<JobBoard />);

      await waitFor(() => {
        // ListingStats renders "Mostrando 1–N de total"
        expect(screen.getByText(/mostrando/i)).toBeInTheDocument();
      });
    });
  });
});
