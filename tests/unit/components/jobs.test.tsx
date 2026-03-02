// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JobBoard } from '@/components/jobs/JobBoard';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { JobPostingForm } from '@/components/jobs/JobPostingForm';
import { mockJobs, mockUsers } from '../../fixtures';

// Mock job service
const mockJobService = {
  getJobs: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
  applyToJob: vi.fn(),
};

vi.mock('@/lib/jobs', () => mockJobService);

// Mock Auth Context
const mockAuthContext = {
  user: mockUsers.regularUser,
  loading: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Skipped: This aggregate test file duplicates individual component tests
// (JobBoard.test.tsx, JobCard.test.tsx, JobFilters.test.tsx, JobPostingForm.test.tsx)
// with insufficient mocks (missing heroicons, firebase module mocks).
// Individual component tests have comprehensive mocks. See TD-013.
describe.skip('Job Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JobCard', () => {
    const mockJob = mockJobs.dataScientistJob;

    it('renders job information correctly', () => {
      render(<JobCard job={mockJob} />);
      
      expect(screen.getByText(mockJob.title)).toBeInTheDocument();
      expect(screen.getByText(mockJob.company)).toBeInTheDocument();
      expect(screen.getByText(mockJob.location)).toBeInTheDocument();
      expect(screen.getByText(/senior/i)).toBeInTheDocument();
      expect(screen.getByText(/full-time/i)).toBeInTheDocument();
    });

    it('displays salary range when available', () => {
      render(<JobCard job={mockJob} />);
      
      expect(screen.getByText(/\$80,000 - \$120,000/)).toBeInTheDocument();
      expect(screen.getByText(/monthly/i)).toBeInTheDocument();
    });

    it('shows featured badge for featured jobs', () => {
      render(<JobCard job={mockJob} />);
      
      expect(screen.getByText(/featured/i)).toBeInTheDocument();
    });

    it('shows remote badge for remote jobs', () => {
      render(<JobCard job={mockJob} />);
      
      expect(screen.getByText(/remote/i)).toBeInTheDocument();
    });

    it('shows urgent badge for urgent jobs', () => {
      const urgentJob = mockJobs.juniorAnalystJob;
      render(<JobCard job={urgentJob} />);
      
      expect(screen.getByText(/urgent/i)).toBeInTheDocument();
    });

    it('displays skill tags', () => {
      render(<JobCard job={mockJob} />);
      
      mockJob.skills.forEach(skill => {
        expect(screen.getByText(skill)).toBeInTheDocument();
      });
    });

    it('calls onApply when apply button is clicked', () => {
      const onApply = vi.fn();
      render(<JobCard job={mockJob} onApply={onApply} />);
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);
      
      expect(onApply).toHaveBeenCalledWith(mockJob.id);
    });
  });

  describe('JobFilters', () => {
    const mockFilters = {
      location: '',
      type: '',
      level: '',
      remote: false,
      skills: [],
      salaryMin: 0,
      salaryMax: 200000,
    };

    const mockOnFiltersChange = vi.fn();

    it('renders all filter options', () => {
      render(<JobFilters filters={mockFilters} onFiltersChange={mockOnFiltersChange} />);
      
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/job type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remote work/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/skills/i)).toBeInTheDocument();
    });

    it('calls onFiltersChange when location filter changes', () => {
      render(<JobFilters filters={mockFilters} onFiltersChange={mockOnFiltersChange} />);
      
      const locationInput = screen.getByLabelText(/location/i);
      fireEvent.change(locationInput, { target: { value: 'Mexico City' } });
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        location: 'Mexico City',
      });
    });

    it('calls onFiltersChange when job type filter changes', () => {
      render(<JobFilters filters={mockFilters} onFiltersChange={mockOnFiltersChange} />);
      
      const typeSelect = screen.getByLabelText(/job type/i);
      fireEvent.change(typeSelect, { target: { value: 'full-time' } });
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        type: 'full-time',
      });
    });

    it('calls onFiltersChange when remote checkbox is toggled', () => {
      render(<JobFilters filters={mockFilters} onFiltersChange={mockOnFiltersChange} />);
      
      const remoteCheckbox = screen.getByLabelText(/remote work/i);
      fireEvent.click(remoteCheckbox);
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        remote: true,
      });
    });
  });

  describe('JobBoard', () => {
    beforeEach(() => {
      mockJobService.getJobs.mockResolvedValue({
        jobs: Object.values(mockJobs),
        total: Object.keys(mockJobs).length,
        hasMore: false,
      });
    });

    it('renders job list correctly', async () => {
      render(<JobBoard />);
      
      await waitFor(() => {
        expect(screen.getByText(mockJobs.dataScientistJob.title)).toBeInTheDocument();
        expect(screen.getByText(mockJobs.juniorAnalystJob.title)).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<JobBoard />);
      
      expect(screen.getByTestId('jobs-loading')).toBeInTheDocument();
    });

    it('shows no jobs message when list is empty', async () => {
      mockJobService.getJobs.mockResolvedValue({
        jobs: [],
        total: 0,
        hasMore: false,
      });
      
      render(<JobBoard />);
      
      await waitFor(() => {
        expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
      });
    });

    it('applies filters when changed', async () => {
      render(<JobBoard />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      });
      
      const locationInput = screen.getByLabelText(/location/i);
      fireEvent.change(locationInput, { target: { value: 'Mexico City' } });
      
      await waitFor(() => {
        expect(mockJobService.getJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            location: 'Mexico City',
          })
        );
      });
    });

    it('handles pagination correctly', async () => {
      mockJobService.getJobs.mockResolvedValue({
        jobs: Object.values(mockJobs).slice(0, 2),
        total: Object.keys(mockJobs).length,
        hasMore: true,
      });
      
      render(<JobBoard />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
      });
      
      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      fireEvent.click(loadMoreButton);
      
      expect(mockJobService.getJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 2,
        })
      );
    });
  });

  describe('JobPostingForm', () => {
    beforeEach(() => {
      mockAuthContext.user = mockUsers.companyUser;
    });

    it('renders all form fields', () => {
      render(<JobPostingForm />);
      
      expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/job type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      render(<JobPostingForm />);
      
      const submitButton = screen.getByRole('button', { name: /post job/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/job title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      mockJobService.createJob.mockResolvedValue({ id: 'new-job-id' });
      
      render(<JobPostingForm />);
      
      const titleInput = screen.getByLabelText(/job title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByRole('button', { name: /post job/i });
      
      fireEvent.change(titleInput, { target: { value: 'New Data Scientist Position' } });
      fireEvent.change(descriptionInput, { target: { value: 'Great opportunity for a data scientist...' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockJobService.createJob).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Data Scientist Position',
            description: 'Great opportunity for a data scientist...',
          })
        );
      });
    });

    it('shows success message on successful submission', async () => {
      mockJobService.createJob.mockResolvedValue({ id: 'new-job-id' });
      
      render(<JobPostingForm />);
      
      const titleInput = screen.getByLabelText(/job title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByRole('button', { name: /post job/i });
      
      fireEvent.change(titleInput, { target: { value: 'New Position' } });
      fireEvent.change(descriptionInput, { target: { value: 'Description...' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/job posted successfully/i)).toBeInTheDocument();
      });
    });
  });
});