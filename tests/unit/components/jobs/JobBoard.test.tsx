import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobBoard } from '@/components/jobs/JobBoard';
import { useAuth } from '@/contexts/AuthContext';
import { getDocs, query, collection, where, orderBy, limit, startAfter } from 'firebase/firestore';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@/lib/firebase-config', () => ({
  db: {},
}));

vi.mock('@/components/jobs/JobCard', () => ({
  default: ({ job, lang }: any) => (
    <div data-testid={`job-card-${job.id}`}>
      <h3>{job.title}</h3>
      <p>{job.company}</p>
      <span data-testid="match-score">{job.matchScore}</span>
    </div>
  ),
}));

vi.mock('@heroicons/react/24/outline', () => ({
  MagnifyingGlassIcon: ({ className }: any) => <svg className={className} data-testid="search-icon" />,
}));

describe('JobBoard', () => {
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

  const mockJobs = [
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
      postedAt: { toDate: () => new Date('2024-01-15') },
      postedBy: 'company123',
      applicationCount: 23,
      viewCount: 156,
      featured: true,
      status: 'active',
      isApproved: true,
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
      postedAt: { toDate: () => new Date('2024-01-10') },
      postedBy: 'company456',
      applicationCount: 45,
      viewCount: 245,
      featured: false,
      status: 'active',
      isApproved: true,
    },
  ];

  const mockSnapshot = {
    empty: false,
    docs: mockJobs.map((job, index) => ({
      id: job.id,
      data: () => job,
    })),
  };

  const mockUseAuth = vi.mocked(useAuth);
  const mockGetDocs = vi.mocked(getDocs);
  const mockQuery = vi.mocked(query);
  const mockCollection = vi.mocked(collection);
  const mockWhere = vi.mocked(where);
  const mockOrderBy = vi.mocked(orderBy);
  const mockLimit = vi.mocked(limit);
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    });
    mockGetDocs.mockResolvedValue(mockSnapshot as any);
    mockQuery.mockReturnValue({} as any);
    mockCollection.mockReturnValue({} as any);
    mockWhere.mockReturnValue({} as any);
    mockOrderBy.mockReturnValue({} as any);
    mockLimit.mockReturnValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders job board with search and sort controls', async () => {
      render(<JobBoard />);

      expect(screen.getByPlaceholderText(/buscar por título, empresa/i)).toBeInTheDocument();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/más recientes/i)).toBeInTheDocument();
    });

    it('renders in English when lang prop is set', async () => {
      render(<JobBoard lang="en" />);

      expect(screen.getByPlaceholderText(/search by title, company/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/most recent/i)).toBeInTheDocument();
    });

    it('shows loading skeleton while fetching jobs', () => {
      mockGetDocs.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<JobBoard />);

      expect(screen.getAllByRole('generic')).toHaveLength(3); // 3 skeleton items
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('displays results count when jobs are loaded', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando 2 empleos/i)).toBeInTheDocument();
      });
    });

    it('displays empty state when no jobs found', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] } as any);
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron empleos/i)).toBeInTheDocument();
        expect(screen.getByText(/intenta ajustar tus filtros/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching and Display', () => {
    it('fetches jobs from Firestore with correct query', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith({}, 'jobs');
        expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active');
        expect(mockWhere).toHaveBeenCalledWith('isApproved', '==', true);
        expect(mockOrderBy).toHaveBeenCalledWith('postedAt', 'desc');
        expect(mockLimit).toHaveBeenCalledWith(10);
      });
    });

    it('displays job cards for fetched jobs', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('job-card-2')).toBeInTheDocument();
        expect(screen.getByText('Senior data scientist', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Data analyst junior', { exact: false })).toBeInTheDocument();
      });
    });

    it('calculates and displays match scores based on user skills', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        const matchScores = screen.getAllByTestId('match-score');
        expect(matchScores).toHaveLength(2);
        // Should calculate match score based on overlapping skills
        expect(matchScores[0]).toHaveTextContent('100'); // Perfect match for first job
      });
    });

    it('falls back to mock data on fetch error', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network error'));
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/senior data scientist/i)).toBeInTheDocument();
        expect(screen.getByText(/techcorp méxico/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    const mockFilters = {
      location: 'cdmx',
      locationType: ['hybrid'],
      employmentType: ['full-time'],
      experienceLevel: ['senior'],
      salaryMin: 50000,
      salaryMax: 100000,
      skills: ['Python'],
      postedWithin: '7d',
      industry: ['technology'],
      companySize: ['large'],
      benefits: ['health-insurance'],
    };

    it('applies location filter to Firestore query', async () => {
      render(<JobBoard filters={mockFilters} />);

      await waitFor(() => {
        expect(mockWhere).toHaveBeenCalledWith('location', '==', 'cdmx');
      });
    });

    it('applies employment type filter to Firestore query', async () => {
      const singleEmploymentTypeFilter = {
        ...mockFilters,
        employmentType: ['full-time'],
      };
      render(<JobBoard filters={singleEmploymentTypeFilter} />);

      await waitFor(() => {
        expect(mockWhere).toHaveBeenCalledWith('employmentType', '==', 'full-time');
      });
    });

    it('filters jobs client-side for complex conditions', async () => {
      const complexFilter = {
        ...mockFilters,
        locationType: ['hybrid', 'remote'],
        salaryMin: 70000,
      };
      render(<JobBoard filters={complexFilter} />);

      await waitFor(() => {
        // Should filter out jobs that don't match salary requirement
        expect(screen.queryByText(/data analyst junior/i)).not.toBeInTheDocument();
        expect(screen.getByText(/senior data scientist/i)).toBeInTheDocument();
      });
    });

    it('filters by skills/tags', async () => {
      const skillFilter = {
        ...mockFilters,
        skills: ['machine-learning'],
      };
      render(<JobBoard filters={skillFilter} />);

      await waitFor(() => {
        expect(screen.getByText(/senior data scientist/i)).toBeInTheDocument();
        expect(screen.queryByText(/data analyst junior/i)).not.toBeInTheDocument();
      });
    });

    it('filters by posted date', async () => {
      const dateFilter = {
        ...mockFilters,
        postedWithin: '3d',
      };
      
      // Mock recent date for first job
      const recentJobs = [...mockJobs];
      recentJobs[0] = {
        ...recentJobs[0],
        postedAt: { toDate: () => new Date() },
      };
      
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: recentJobs.map(job => ({ id: job.id, data: () => job })),
      } as any);

      render(<JobBoard filters={dateFilter} />);

      await waitFor(() => {
        expect(screen.getByText(/senior data scientist/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters jobs by search term', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('job-card-2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar por título/i);
      await user.type(searchInput, 'Senior');

      expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('job-card-2')).not.toBeInTheDocument();
    });

    it('searches across title, company, location, and tags', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getAllByTestId(/job-card-/)).toHaveLength(2);
      });

      // Search by company
      const searchInput = screen.getByPlaceholderText(/buscar por título/i);
      await user.type(searchInput, 'TechCorp');

      expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('job-card-2')).not.toBeInTheDocument();
    });

    it('handles form submission for search', async () => {
      render(<JobBoard />);

      const searchInput = screen.getByPlaceholderText(/buscar por título/i);
      await user.type(searchInput, 'Python');
      await user.keyboard('{Enter}');

      // Should trigger fetchJobs with current filters
      expect(mockGetDocs).toHaveBeenCalled();
    });
  });

  describe('Sorting Functionality', () => {
    it('sorts by date by default', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(mockOrderBy).toHaveBeenCalledWith('postedAt', 'desc');
      });
    });

    it('changes sort order when sort selection changes', async () => {
      render(<JobBoard />);

      const sortSelect = screen.getByDisplayValue(/más recientes/i);
      await user.selectOptions(sortSelect, 'salary');

      await waitFor(() => {
        expect(mockOrderBy).toHaveBeenCalledWith('salaryRange.max', 'desc');
      });
    });

    it('sorts by match score when selected', async () => {
      render(<JobBoard />);

      const sortSelect = screen.getByDisplayValue(/más recientes/i);
      await user.selectOptions(sortSelect, 'match');

      await waitFor(() => {
        const jobCards = screen.getAllByTestId(/job-card-/);
        // Should display jobs in order of match score
        expect(jobCards[0]).toHaveAttribute('data-testid', 'job-card-1'); // Higher match score first
      });
    });
  });

  describe('Pagination and Load More', () => {
    it('shows load more button when hasMore is true', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/cargar más empleos/i)).toBeInTheDocument();
      });
    });

    it('loads more jobs when load more button is clicked', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/cargar más empleos/i)).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText(/cargar más empleos/i);
      await user.click(loadMoreButton);

      expect(mockGetDocs).toHaveBeenCalledTimes(2); // Initial load + load more
    });

    it('shows loading state during load more', async () => {
      let resolveGetDocs: (value: any) => void;
      const getDocsPromise = new Promise((resolve) => {
        resolveGetDocs = resolve;
      });

      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/cargar más empleos/i)).toBeInTheDocument();
      });

      // Mock second call to return a promise
      mockGetDocs.mockReturnValueOnce(getDocsPromise);

      const loadMoreButton = screen.getByText(/cargar más empleos/i);
      await user.click(loadMoreButton);

      expect(screen.getByText(/cargando.../i)).toBeInTheDocument();
      expect(loadMoreButton).toBeDisabled();

      resolveGetDocs!(mockSnapshot);
    });

    it('hides load more button when no more jobs available', async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [mockSnapshot.docs[0]], // Only one job
      } as any);

      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.queryByText(/cargar más empleos/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles Firestore query errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'));
      render(<JobBoard />);

      await waitFor(() => {
        // Should show mock data as fallback
        expect(screen.getByText(/senior data scientist/i)).toBeInTheDocument();
      });
    });

    it('handles empty search results', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getAllByTestId(/job-card-/)).toHaveLength(2);
      });

      const searchInput = screen.getByPlaceholderText(/buscar por título/i);
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no se encontraron empleos/i)).toBeInTheDocument();
      expect(screen.getByText(/intenta ajustar tus filtros/i)).toBeInTheDocument();
    });

    it('handles missing user profile gracefully', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
        // Should not show match scores when no user profile
        expect(screen.getAllByTestId('match-score')[0]).toHaveTextContent('0');
      });
    });
  });

  describe('Loading States', () => {
    it('shows skeleton loading during initial fetch', () => {
      mockGetDocs.mockImplementation(() => new Promise(() => {}));
      render(<JobBoard />);

      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
    });

    it('shows loading state during filter changes', async () => {
      let resolveGetDocs: (value: any) => void;
      const getDocsPromise = new Promise((resolve) => {
        resolveGetDocs = resolve;
      });

      const { rerender } = render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getAllByTestId(/job-card-/)).toHaveLength(2);
      });

      mockGetDocs.mockReturnValueOnce(getDocsPromise);

      // Change filters to trigger new fetch
      rerender(<JobBoard filters={{ location: 'guadalajara' } as any} />);

      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

      resolveGetDocs!(mockSnapshot);
    });
  });

  describe('User Interaction Tests', () => {
    it('updates search term on input change', async () => {
      render(<JobBoard />);

      const searchInput = screen.getByPlaceholderText(/buscar por título/i) as HTMLInputElement;
      await user.type(searchInput, 'Data Scientist');

      expect(searchInput.value).toBe('Data Scientist');
    });

    it('updates sort order on select change', async () => {
      render(<JobBoard />);

      const sortSelect = screen.getByDisplayValue(/más recientes/i) as HTMLSelectElement;
      await user.selectOptions(sortSelect, 'salary');

      expect(sortSelect.value).toBe('salary');
    });

    it('shows search results count with search term', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando 2 empleos/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar por título/i);
      await user.type(searchInput, 'Senior');

      expect(screen.getByText(/mostrando 1 empleos para "senior"/i)).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles missing lang prop', () => {
      render(<JobBoard />);
      expect(screen.getByPlaceholderText(/buscar por título/i)).toBeInTheDocument();
    });

    it('handles undefined filters prop', () => {
      render(<JobBoard filters={undefined} />);
      expect(screen.getByPlaceholderText(/buscar por título/i)).toBeInTheDocument();
    });

    it('applies custom filters when provided', async () => {
      const customFilters = {
        location: 'guadalajara',
        locationType: ['onsite'],
        employmentType: ['full-time'],
        experienceLevel: [],
        salaryMin: 0,
        salaryMax: 200000,
        skills: [],
        postedWithin: 'all',
        industry: [],
        companySize: [],
        benefits: [],
      };

      render(<JobBoard filters={customFilters} />);

      await waitFor(() => {
        expect(mockWhere).toHaveBeenCalledWith('location', '==', 'guadalajara');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(<JobBoard />);

      const searchInput = screen.getByPlaceholderText(/buscar por título/i);
      const sortSelect = screen.getByDisplayValue(/más recientes/i);

      expect(searchInput).toHaveAttribute('type', 'text');
      expect(sortSelect).toHaveRole('combobox');
    });

    it('maintains focus management during interactions', async () => {
      render(<JobBoard />);

      const searchInput = screen.getByPlaceholderText(/buscar por título/i);
      await user.click(searchInput);

      expect(searchInput).toHaveFocus();
    });

    it('provides appropriate feedback for screen readers', async () => {
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/mostrando 2 empleos/i)).toBeInTheDocument();
      });

      // Should announce results to screen readers
      const resultsText = screen.getByText(/mostrando 2 empleos/i);
      expect(resultsText).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles malformed job data', async () => {
      const malformedJobs = [
        {
          id: '1',
          title: '',
          company: null,
          postedAt: null,
          requirements: null,
          tags: null,
        },
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: malformedJobs.map(job => ({ id: job.id, data: () => job })),
      } as any);

      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('job-card-1')).toBeInTheDocument();
      });
    });

    it('handles empty job list from Firestore', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] } as any);
      render(<JobBoard />);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron empleos/i)).toBeInTheDocument();
      });
    });

    it('handles very long search terms', async () => {
      render(<JobBoard />);

      const longSearchTerm = 'a'.repeat(1000);
      const searchInput = screen.getByPlaceholderText(/buscar por título/i);
      await user.type(searchInput, longSearchTerm);

      expect((searchInput as HTMLInputElement).value).toBe(longSearchTerm);
    });

    it('handles rapid filter changes', async () => {
      const { rerender } = render(<JobBoard />);

      // Rapidly change filters
      for (let i = 0; i < 10; i++) {
        rerender(<JobBoard filters={{ location: `location-${i}` } as any} />);
      }

      // Should handle all changes without errors
      expect(mockGetDocs).toHaveBeenCalled();
    });
  });
});