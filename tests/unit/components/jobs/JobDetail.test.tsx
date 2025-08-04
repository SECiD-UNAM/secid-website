import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobDetail } from '@/components/jobs/JobDetail';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  increment: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@/lib/firebase-config', () => ({
  db: {},
}));

vi.mock('@heroicons/react/24/outline', () => ({
  ArrowLeftIcon: ({ className }: any) => <svg className={className} data-testid="arrow-left-icon" />,
  MapPinIcon: ({ className }: any) => <svg className={className} data-testid="map-pin-icon" />,
  BriefcaseIcon: ({ className }: any) => <svg className={className} data-testid="briefcase-icon" />,
  CurrencyDollarIcon: ({ className }: any) => <svg className={className} data-testid="currency-icon" />,
  ClockIcon: ({ className }: any) => <svg className={className} data-testid="clock-icon" />,
  UserGroupIcon: ({ className }: any) => <svg className={className} data-testid="user-group-icon" />,
  BuildingOfficeIcon: ({ className }: any) => <svg className={className} data-testid="building-office-icon" />,
  CalendarIcon: ({ className }: any) => <svg className={className} data-testid="calendar-icon" />,
  BookmarkIcon: ({ className }: any) => <svg className={className} data-testid="bookmark-icon" />,
  ShareIcon: ({ className }: any) => <svg className={className} data-testid="share-icon" />,
  CheckCircleIcon: ({ className }: any) => <svg className={className} data-testid="check-circle-icon" />,
  ExclamationTriangleIcon: ({ className }: any) => <svg className={className} data-testid="exclamation-triangle-icon" />,
  SparklesIcon: ({ className }: any) => <svg className={className} data-testid="sparkles-icon" />,
  ChevronRightIcon: ({ className }: any) => <svg className={className} data-testid="chevron-right-icon" />,
}));

vi.mock('@heroicons/react/24/solid', () => ({
  BookmarkIcon: ({ className }: any) => <svg className={className} data-testid="bookmark-solid-icon" />,
}));

describe('JobDetail', () => {
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

  const mockJobData = {
    id: '1',
    title: 'Senior Data Scientist',
    company: 'TechCorp México',
    companyLogo: 'https://example.com/logo.png',
    companyDescription: 'TechCorp is a leading technology company specializing in data science and AI solutions.',
    location: 'Ciudad de México, CDMX',
    locationType: 'hybrid',
    employmentType: 'full-time',
    salaryRange: {
      min: 60000,
      max: 90000,
      currency: 'MXN',
      period: 'monthly',
    },
    description: 'We are looking for an experienced Data Scientist to join our team and help drive data-driven decisions across the organization. You will work with large datasets, build predictive models, and collaborate with cross-functional teams.',
    requirements: ['Python', 'Machine Learning', 'SQL', 'Statistics', 'Data Visualization'],
    benefits: ['Seguro de gastos médicos', 'Home office', 'Capacitación', 'Bonos por desempeño'],
    responsibilities: [
      'Build and deploy machine learning models',
      'Analyze large datasets to extract insights',
      'Collaborate with product teams',
      'Present findings to stakeholders',
    ],
    tags: ['python', 'machine-learning', 'sql', 'senior'],
    postedAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
    postedBy: 'company123',
    applicationMethod: 'platform',
    applicationUrl: 'https://example.com/apply',
    applicationEmail: 'jobs@techcorp.com',
    applicationDeadline: { toDate: () => new Date('2024-02-15T23:59:59Z') },
    applicationCount: 23,
    viewCount: 156,
    featured: true,
    status: 'active',
  };

  const mockSimilarJobs = [
    {
      id: '2',
      title: 'Data Scientist',
      company: 'DataCorp',
      tags: ['python', 'machine-learning'],
    },
    {
      id: '3',
      title: 'ML Engineer',
      company: 'AI Startup',
      tags: ['machine-learning', 'tensorflow'],
    },
  ];

  const mockDoc = {
    exists: () => true,
    id: '1',
    data: () => mockJobData,
  };

  const mockSimilarJobsSnapshot = {
    docs: mockSimilarJobs.map(job => ({
      id: job.id,
      data: () => job,
    })),
  };

  const mockUseAuth = vi.mocked(useAuth);
  const mockGetDoc = vi.mocked(getDoc);
  const mockUpdateDoc = vi.mocked(updateDoc);
  const mockGetDocs = vi.mocked(getDocs);
  const mockDoc = vi.mocked(doc);
  const mockIncrement = vi.mocked(increment);
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
    mockGetDoc.mockResolvedValue(mockDoc as any);
    mockGetDocs.mockResolvedValue(mockSimilarJobsSnapshot as any);
    mockDoc.mockReturnValue({} as any);
    mockIncrement.mockReturnValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders job detail with all information when loaded', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('TechCorp México')).toBeInTheDocument();
        expect(screen.getByText('Ciudad de México, CDMX')).toBeInTheDocument();
        expect(screen.getByText('Híbrido')).toBeInTheDocument();
        expect(screen.getByText('Tiempo completo')).toBeInTheDocument();
      });
    });

    it('renders in English when lang prop is set', async () => {
      render(<JobDetail jobId="1" lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('Hybrid')).toBeInTheDocument();
        expect(screen.getByText('Full-time')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      mockGetDoc.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<JobDetail jobId="1" />);

      expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    });

    it('displays company logo when available', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const logo = screen.getByAltText('TechCorp México');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
      });
    });

    it('shows default company icon when no logo', async () => {
      const jobWithoutLogo = { ...mockJobData, companyLogo: undefined };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => jobWithoutLogo,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('building-office-icon')).toBeInTheDocument();
      });
    });

    it('displays featured badge for featured jobs', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Destacado')).toBeInTheDocument();
        expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching and Display', () => {
    it('fetches job details from Firestore', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(mockDoc).toHaveBeenCalledWith({}, 'jobs', '1');
        expect(mockGetDoc).toHaveBeenCalled();
      });
    });

    it('tracks job view on component mount', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          { viewCount: expect.anything() }
        );
      });
    });

    it('calculates and displays match score', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        // Should calculate match score based on user skills vs job requirements
        expect(screen.getByText(/60% compatible/i)).toBeInTheDocument(); // 3/5 skills match
      });
    });

    it('fetches and displays similar jobs', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('ML Engineer')).toBeInTheDocument();
      });
    });

    it('handles job not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      render(<JobDetail jobId="nonexistent" />);

      await waitFor(() => {
        expect(screen.getByText(/trabajo no encontrado/i)).toBeInTheDocument();
      });
    });
  });

  describe('Job Information Display', () => {
    it('displays job description with formatting', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/we are looking for an experienced data scientist/i)).toBeInTheDocument();
      });
    });

    it('displays all job requirements', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Python')).toBeInTheDocument();
        expect(screen.getByText('Machine Learning')).toBeInTheDocument();
        expect(screen.getByText('SQL')).toBeInTheDocument();
        expect(screen.getByText('Statistics')).toBeInTheDocument();
      });
    });

    it('displays job responsibilities when available', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/build and deploy machine learning models/i)).toBeInTheDocument();
        expect(screen.getByText(/analyze large datasets/i)).toBeInTheDocument();
      });
    });

    it('displays job benefits', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Seguro de gastos médicos')).toBeInTheDocument();
        expect(screen.getByText('Home office')).toBeInTheDocument();
        expect(screen.getByText('Capacitación')).toBeInTheDocument();
      });
    });

    it('displays company description when available', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/techcorp is a leading technology company/i)).toBeInTheDocument();
      });
    });

    it('formats salary range correctly', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('MXN 60,000 - 90,000 por mes')).toBeInTheDocument();
      });
    });

    it('displays application deadline when available', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/fecha límite/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('toggles job save state when bookmark is clicked', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-icon')).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByRole('button', { name: /guardar/i });
      await user.click(bookmarkButton);

      expect(screen.getByTestId('bookmark-solid-icon')).toBeInTheDocument();
    });

    it('opens application modal when apply button is clicked', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /aplicar/i });
        expect(applyButton).toBeInTheDocument();
      });

      const applyButton = screen.getByRole('button', { name: /aplicar/i });
      await user.click(applyButton);

      expect(screen.getByText(/solicitud de empleo/i)).toBeInTheDocument();
    });

    it('handles share functionality', async () => {
      // Mock navigator.share
      const mockShare = vi.fn();
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
      });

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const shareButton = screen.getByRole('button', { name: /compartir/i });
        expect(shareButton).toBeInTheDocument();
      });

      const shareButton = screen.getByRole('button', { name: /compartir/i });
      await user.click(shareButton);

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Senior Data Scientist - TechCorp México',
        url: expect.stringContaining('/jobs/1'),
      });
    });

    it('falls back to clipboard when navigator.share is not available', async () => {
      // Mock clipboard
      const mockWriteText = vi.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const shareButton = screen.getByRole('button', { name: /compartir/i });
        expect(shareButton).toBeInTheDocument();
      });

      const shareButton = screen.getByRole('button', { name: /compartir/i });
      await user.click(shareButton);

      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('/jobs/1'));
    });

    it('navigates back when back button is clicked', async () => {
      const mockHistoryBack = vi.fn();
      Object.defineProperty(window, 'history', {
        value: { back: mockHistoryBack },
        writable: true,
      });

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /volver/i });
        expect(backButton).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /volver/i });
      await user.click(backButton);

      expect(mockHistoryBack).toHaveBeenCalled();
    });
  });

  describe('Application Status and Methods', () => {
    it('shows correct application method for platform applications', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /aplicar ahora/i })).toBeInTheDocument();
      });
    });

    it('shows external link for external applications', async () => {
      const externalJob = {
        ...mockJobData,
        applicationMethod: 'external',
        applicationUrl: 'https://external-site.com/apply',
      };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => externalJob,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const externalLink = screen.getByRole('link', { name: /aplicar en sitio externo/i });
        expect(externalLink).toHaveAttribute('href', 'https://external-site.com/apply');
        expect(externalLink).toHaveAttribute('target', '_blank');
      });
    });

    it('shows email application for email method', async () => {
      const emailJob = {
        ...mockJobData,
        applicationMethod: 'email',
        applicationEmail: 'jobs@techcorp.com',
      };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => emailJob,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const emailLink = screen.getByRole('link', { name: /enviar por email/i });
        expect(emailLink).toHaveAttribute('href', 'mailto:jobs@techcorp.com');
      });
    });

    it('disables apply button when user has already applied', async () => {
      // Mock application check to return true
      const appliedSnapshot = {
        empty: false,
        docs: [{ id: 'app1' }],
      };
      mockGetDocs.mockResolvedValue(appliedSnapshot as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /ya aplicaste/i });
        expect(applyButton).toBeDisabled();
      });
    });

    it('shows application deadline warning when close to deadline', async () => {
      const soonDeadlineJob = {
        ...mockJobData,
        applicationDeadline: { toDate: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }, // 2 days from now
      };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => soonDeadlineJob,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/aplicaciones cierran pronto/i)).toBeInTheDocument();
        expect(screen.getByTestId('exclamation-triangle-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Similar Jobs Display', () => {
    it('displays similar jobs section when jobs are found', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/empleos similares/i)).toBeInTheDocument();
        expect(screen.getByText('Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('ML Engineer')).toBeInTheDocument();
      });
    });

    it('hides similar jobs section when no similar jobs found', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.queryByText(/empleos similares/i)).not.toBeInTheDocument();
      });
    });

    it('fetches similar jobs based on tags', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(mockGetDocs).toHaveBeenCalledWith(
          expect.objectContaining({
            // Should query for jobs with similar tags
          })
        );
      });
    });
  });

  describe('Match Score Display', () => {
    it('displays match score with appropriate styling', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const matchBadge = screen.getByText(/60% compatible/i);
        expect(matchBadge).toBeInTheDocument();
        expect(matchBadge).toHaveClass('text-yellow-600'); // Medium score styling
      });
    });

    it('does not display match score when user has no skills', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, skills: [] },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.queryByText(/% compatible/i)).not.toBeInTheDocument();
      });
    });

    it('calculates high match score correctly', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: {
          ...mockUserProfile,
          skills: ['Python', 'Machine Learning', 'SQL', 'Statistics', 'Data Visualization'],
        },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const matchBadge = screen.getByText(/100% compatible/i);
        expect(matchBadge).toHaveClass('text-green-600'); // High score styling
      });
    });
  });

  describe('Error Handling', () => {
    it('handles Firestore fetch errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Network error'));

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
      });
    });

    it('handles missing job data fields gracefully', async () => {
      const incompleteJob = {
        id: '1',
        title: 'Test Job',
        company: 'Test Company',
        // Missing many optional fields
      };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => incompleteJob,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
        expect(screen.getByText('Test Company')).toBeInTheDocument();
      });
    });

    it('handles view tracking errors gracefully', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        // Should still render the job details even if view tracking fails
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      });
    });

    it('handles similar jobs fetch errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Fetch error'));

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        // Should still render main job details
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        // Similar jobs section should not appear
        expect(screen.queryByText(/empleos similares/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton during data fetch', () => {
      mockGetDoc.mockImplementation(() => new Promise(() => {}));
      render(<JobDetail jobId="1" />);

      expect(screen.getByText(/cargando/i)).toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows loading state for similar jobs', async () => {
      let resolveSimilarJobs: (value: any) => void;
      const similarJobsPromise = new Promise((resolve) => {
        resolveSimilarJobs = resolve;
      });

      // Main job loads immediately, similar jobs load slowly
      mockGetDocs.mockReturnValue(similarJobsPromise);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      });

      // Similar jobs should be loading
      expect(screen.getByText(/cargando empleos similares/i)).toBeInTheDocument();

      resolveSimilarJobs!(mockSimilarJobsSnapshot);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /senior data scientist/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: /descripción/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: /requisitos/i })).toBeInTheDocument();
      });
    });

    it('has proper button labels and ARIA attributes', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /aplicar ahora/i });
        const bookmarkButton = screen.getByRole('button', { name: /guardar trabajo/i });
        const shareButton = screen.getByRole('button', { name: /compartir trabajo/i });

        expect(applyButton).toHaveAttribute('type', 'button');
        expect(bookmarkButton).toHaveAttribute('aria-label');
        expect(shareButton).toHaveAttribute('aria-label');
      });
    });

    it('provides meaningful alt text for images', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const logo = screen.getByAltText('TechCorp México logo');
        expect(logo).toBeInTheDocument();
      });
    });

    it('maintains focus management during interactions', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /aplicar ahora/i });
        expect(applyButton).toBeInTheDocument();
      });

      const applyButton = screen.getByRole('button', { name: /aplicar ahora/i });
      await user.click(applyButton);

      // Focus should move to the modal
      expect(document.activeElement).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long job descriptions', async () => {
      const longDescription = 'A'.repeat(5000);
      const jobWithLongDescription = {
        ...mockJobData,
        description: longDescription,
      };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => jobWithLongDescription,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(longDescription)).toBeInTheDocument();
      });
    });

    it('handles jobs with no requirements', async () => {
      const jobWithoutRequirements = {
        ...mockJobData,
        requirements: [],
      };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => jobWithoutRequirements,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        expect(screen.queryByText(/requisitos/i)).not.toBeInTheDocument();
      });
    });

    it('handles expired job postings', async () => {
      const expiredJob = {
        ...mockJobData,
        applicationDeadline: { toDate: () => new Date('2023-01-01') },
      };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => expiredJob,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText(/aplicaciones cerradas/i)).toBeInTheDocument();
        const applyButton = screen.queryByRole('button', { name: /aplicar/i });
        expect(applyButton).toBeDisabled();
      });
    });

    it('handles invalid application URLs', async () => {
      const jobWithInvalidUrl = {
        ...mockJobData,
        applicationMethod: 'external',
        applicationUrl: 'invalid-url',
      };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => jobWithInvalidUrl,
      } as any);

      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        // Should fallback to platform application
        expect(screen.getByRole('button', { name: /aplicar ahora/i })).toBeInTheDocument();
      });
    });
  });

  describe('Props Validation', () => {
    it('handles missing jobId prop', () => {
      render(<JobDetail jobId="" />);
      expect(screen.getByText(/trabajo no encontrado/i)).toBeInTheDocument();
    });

    it('handles undefined lang prop with default Spanish', async () => {
      render(<JobDetail jobId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Híbrido')).toBeInTheDocument();
        expect(screen.getByText('Tiempo completo')).toBeInTheDocument();
      });
    });
  });
});