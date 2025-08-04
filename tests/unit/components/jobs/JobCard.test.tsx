import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobCard } from '@/components/jobs/JobCard';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@heroicons/react/24/outline', () => ({
  MapPinIcon: ({ className }: any) => <svg className={className} data-testid="map-pin-icon" />,
  BriefcaseIcon: ({ className }: any) => <svg className={className} data-testid="briefcase-icon" />,
  CurrencyDollarIcon: ({ className }: any) => <svg className={className} data-testid="currency-icon" />,
  ClockIcon: ({ className }: any) => <svg className={className} data-testid="clock-icon" />,
  UserGroupIcon: ({ className }: any) => <svg className={className} data-testid="user-group-icon" />,
  BookmarkIcon: ({ className }: any) => <svg className={className} data-testid="bookmark-icon" />,
  EyeIcon: ({ className }: any) => <svg className={className} data-testid="eye-icon" />,
  SparklesIcon: ({ className }: any) => <svg className={className} data-testid="sparkles-icon" />,
}));

vi.mock('@heroicons/react/24/solid', () => ({
  BookmarkIcon: ({ className }: any) => <svg className={className} data-testid="bookmark-solid-icon" />,
}));

describe('JobCard', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockJob = {
    id: '1',
    title: 'Senior Data Scientist',
    company: 'TechCorp México',
    companyLogo: 'https://example.com/logo.png',
    location: 'Ciudad de México, CDMX',
    locationType: 'hybrid' as const,
    employmentType: 'full-time' as const,
    salaryRange: {
      min: 60000,
      max: 90000,
      currency: 'MXN',
      period: 'monthly',
    },
    description: 'We are looking for an experienced Data Scientist to join our team and help drive data-driven decisions across the organization.',
    requirements: ['Python', 'Machine Learning', 'SQL', 'Statistics'],
    benefits: ['Seguro de gastos médicos', 'Home office', 'Capacitación'],
    tags: ['python', 'machine-learning', 'sql', 'senior'],
    postedAt: new Date('2024-01-15T10:00:00Z'),
    applicationCount: 23,
    viewCount: 156,
    featured: true,
    matchScore: 85,
  };

  const mockJobWithoutOptionalFields = {
    id: '2',
    title: 'Data Analyst',
    company: 'StartupCorp',
    location: 'Remote',
    locationType: 'remote' as const,
    employmentType: 'part-time' as const,
    description: 'Looking for a data analyst.',
    requirements: ['SQL', 'Excel'],
    tags: ['sql', 'analyst'],
    postedAt: new Date('2024-01-10T08:00:00Z'),
    applicationCount: 5,
    viewCount: 42,
    featured: false,
  };

  const mockUseAuth = vi.mocked(useAuth);
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userProfile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders job card with all basic information', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      expect(screen.getByText('TechCorp México')).toBeInTheDocument();
      expect(screen.getByText('Ciudad de México, CDMX')).toBeInTheDocument();
      expect(screen.getByText('Híbrido')).toBeInTheDocument();
      expect(screen.getByText('Tiempo completo')).toBeInTheDocument();
    });

    it('renders with English labels when lang is set to en', () => {
      render(<JobCard job={mockJob} lang="en" />);

      expect(screen.getByText('Hybrid')).toBeInTheDocument();
      expect(screen.getByText('Full-time')).toBeInTheDocument();
      expect(screen.getByText('Featured')).toBeInTheDocument();
      expect(screen.getByText('View details')).toBeInTheDocument();
    });

    it('displays company logo when provided', () => {
      render(<JobCard job={mockJob} />);

      const logo = screen.getByAltText('TechCorp México');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('displays default briefcase icon when no company logo', () => {
      const jobWithoutLogo = { ...mockJob, companyLogo: undefined };
      render(<JobCard job={jobWithoutLogo} />);

      expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument();
    });

    it('shows featured badge for featured jobs', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByText('Destacado')).toBeInTheDocument();
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });

    it('does not show featured badge for non-featured jobs', () => {
      render(<JobCard job={mockJobWithoutOptionalFields} />);

      expect(screen.queryByText('Destacado')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sparkles-icon')).not.toBeInTheDocument();
    });

    it('displays match score when provided', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByText('85% compatible')).toBeInTheDocument();
    });

    it('does not display match score when not provided', () => {
      render(<JobCard job={mockJobWithoutOptionalFields} />);

      expect(screen.queryByText(/% compatible/)).not.toBeInTheDocument();
    });
  });

  describe('Data Display and Formatting', () => {
    it('formats salary range correctly in Spanish', () => {
      render(<JobCard job={mockJob} lang="es" />);

      expect(screen.getByText('MXN 60,000-90,000/mes')).toBeInTheDocument();
    });

    it('formats salary range correctly in English', () => {
      render(<JobCard job={mockJob} lang="en" />);

      expect(screen.getByText('MXN 60,000-90,000/monthly')).toBeInTheDocument();
    });

    it('displays "Salary not specified" when no salary range', () => {
      const jobWithoutSalary = { ...mockJobWithoutOptionalFields };
      render(<JobCard job={jobWithoutSalary} lang="es" />);

      expect(screen.getByText('Salario no especificado')).toBeInTheDocument();
    });

    it('formats posted date correctly for recent jobs', () => {
      const recentJob = {
        ...mockJob,
        postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      render(<JobCard job={recentJob} />);

      expect(screen.getByText('Hace 2 horas')).toBeInTheDocument();
    });

    it('formats posted date correctly for older jobs', () => {
      const oldJob = {
        ...mockJob,
        postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      };
      render(<JobCard job={oldJob} />);

      expect(screen.getByText('Hace 5 días')).toBeInTheDocument();
    });

    it('formats posted date correctly for very old jobs', () => {
      const veryOldJob = {
        ...mockJob,
        postedAt: new Date('2023-01-15'),
      };
      render(<JobCard job={veryOldJob} />);

      // Should show formatted date
      expect(screen.getByText(/15\/1\/2023|1\/15\/2023/)).toBeInTheDocument();
    });

    it('displays location type labels correctly', () => {
      const remoteJob = { ...mockJob, locationType: 'remote' as const };
      const onsiteJob = { ...mockJob, locationType: 'onsite' as const };

      const { rerender } = render(<JobCard job={remoteJob} />);
      expect(screen.getByText('Remoto')).toBeInTheDocument();

      rerender(<JobCard job={onsiteJob} />);
      expect(screen.getByText('Presencial')).toBeInTheDocument();
    });

    it('displays employment type labels correctly', () => {
      const contractJob = { ...mockJob, employmentType: 'contract' as const };
      const internshipJob = { ...mockJob, employmentType: 'internship' as const };

      const { rerender } = render(<JobCard job={contractJob} />);
      expect(screen.getByText('Por proyecto')).toBeInTheDocument();

      rerender(<JobCard job={internshipJob} />);
      expect(screen.getByText('Práctica')).toBeInTheDocument();
    });
  });

  describe('Requirements and Tags Display', () => {
    it('displays key requirements with limit', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByText('Requisitos principales:')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('SQL')).toBeInTheDocument();
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    it('shows "more" indicator when requirements exceed display limit', () => {
      const jobWithManyRequirements = {
        ...mockJob,
        requirements: ['Python', 'R', 'SQL', 'Machine Learning', 'Deep Learning', 'Statistics', 'Tableau'],
      };
      render(<JobCard job={jobWithManyRequirements} />);

      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('+3 más')).toBeInTheDocument();
    });

    it('displays job tags with hashtags', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByText('#python')).toBeInTheDocument();
      expect(screen.getByText('#machine-learning')).toBeInTheDocument();
      expect(screen.getByText('#sql')).toBeInTheDocument();
      expect(screen.getByText('#senior')).toBeInTheDocument();
    });

    it('limits tag display to 5 tags', () => {
      const jobWithManyTags = {
        ...mockJob,
        tags: ['python', 'ml', 'sql', 'stats', 'tableau', 'spark', 'aws'],
      };
      render(<JobCard job={jobWithManyTags} />);

      const tagElements = screen.getAllByText(/^#/);
      expect(tagElements).toHaveLength(5);
    });
  });

  describe('User Interactions', () => {
    it('toggles save state when bookmark is clicked', async () => {
      render(<JobCard job={mockJob} />);

      const bookmarkButton = screen.getByRole('button', { name: /guardar/i });
      expect(screen.getByTestId('bookmark-icon')).toBeInTheDocument();

      await user.click(bookmarkButton);

      expect(screen.getByTestId('bookmark-solid-icon')).toBeInTheDocument();
      expect(bookmarkButton).toHaveAttribute('title', 'Guardado');
    });

    it('navigates to job details when title is clicked', () => {
      render(<JobCard job={mockJob} />);

      const titleLink = screen.getByRole('link', { name: 'Senior Data Scientist' });
      expect(titleLink).toHaveAttribute('href', '/es/dashboard/jobs/1');
    });

    it('navigates to job details when "View details" button is clicked', () => {
      render(<JobCard job={mockJob} />);

      const detailsLink = screen.getByRole('link', { name: /ver detalles/i });
      expect(detailsLink).toHaveAttribute('href', '/es/dashboard/jobs/1');
    });

    it('uses correct language in URLs', () => {
      render(<JobCard job={mockJob} lang="en" />);

      const titleLink = screen.getByRole('link', { name: 'Senior Data Scientist' });
      expect(titleLink).toHaveAttribute('href', '/en/dashboard/jobs/1');
    });
  });

  describe('Match Score Display', () => {
    it('displays match score with appropriate color for high scores', () => {
      const highScoreJob = { ...mockJob, matchScore: 90 };
      render(<JobCard job={highScoreJob} />);

      const matchBadge = screen.getByText('90% compatible');
      expect(matchBadge).toHaveClass('text-green-600');
    });

    it('displays match score with appropriate color for medium scores', () => {
      const mediumScoreJob = { ...mockJob, matchScore: 65 };
      render(<JobCard job={mediumScoreJob} />);

      const matchBadge = screen.getByText('65% compatible');
      expect(matchBadge).toHaveClass('text-yellow-600');
    });

    it('displays match score with appropriate color for low scores', () => {
      const lowScoreJob = { ...mockJob, matchScore: 30 };
      render(<JobCard job={lowScoreJob} />);

      const matchBadge = screen.getByText('30% compatible');
      expect(matchBadge).toHaveClass('text-gray-600');
    });
  });

  describe('Footer Information', () => {
    it('displays application count and view count', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByText('23 aplicaciones')).toBeInTheDocument();
      expect(screen.getByText('156 vistas')).toBeInTheDocument();
    });

    it('displays counts in English when lang is en', () => {
      render(<JobCard job={mockJob} lang="en" />);

      expect(screen.getByText('23 applications')).toBeInTheDocument();
      expect(screen.getByText('156 views')).toBeInTheDocument();
    });

    it('displays all relevant icons in footer', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getAllByTestId('clock-icon')).toHaveLength(2); // Posted time + employment type
      expect(screen.getByTestId('user-group-icon')).toBeInTheDocument();
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies featured styling for featured jobs', () => {
      const { container } = render(<JobCard job={mockJob} />);

      const cardElement = container.firstChild as HTMLElement;
      expect(cardElement).toHaveClass('border-2', 'border-primary-500');
    });

    it('does not apply featured styling for non-featured jobs', () => {
      const { container } = render(<JobCard job={mockJobWithoutOptionalFields} />);

      const cardElement = container.firstChild as HTMLElement;
      expect(cardElement).not.toHaveClass('border-2', 'border-primary-500');
    });

    it('applies hover effects', () => {
      const { container } = render(<JobCard job={mockJob} />);

      const cardElement = container.firstChild as HTMLElement;
      expect(cardElement).toHaveClass('hover:shadow-lg', 'transition-all');
    });

    it('truncates long descriptions', () => {
      const jobWithLongDescription = {
        ...mockJob,
        description: 'This is a very long description that should be truncated because it exceeds the reasonable length for a job card display and we want to keep the layout clean and consistent across all job cards.',
      };
      render(<JobCard job={jobWithLongDescription} />);

      const descriptionElement = screen.getByText(/this is a very long description/i);
      expect(descriptionElement).toHaveClass('line-clamp-2');
    });
  });

  describe('Accessibility', () => {
    it('has proper link labels and ARIA attributes', () => {
      render(<JobCard job={mockJob} />);

      const titleLink = screen.getByRole('link', { name: 'Senior Data Scientist' });
      const detailsLink = screen.getByRole('link', { name: /ver detalles/i });
      const bookmarkButton = screen.getByRole('button', { name: /guardar/i });

      expect(titleLink).toHaveAttribute('href');
      expect(detailsLink).toHaveAttribute('href');
      expect(bookmarkButton).toHaveAttribute('title');
    });

    it('provides meaningful button titles', () => {
      render(<JobCard job={mockJob} />);

      const bookmarkButton = screen.getByRole('button', { name: /guardar/i });
      expect(bookmarkButton).toHaveAttribute('title', 'Guardar');
    });

    it('has proper semantic structure', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Senior Data Scientist');
      expect(screen.getAllByRole('link')).toHaveLength(2); // Title link and details link
      expect(screen.getByRole('button')).toBeInTheDocument(); // Bookmark button
    });

    it('includes alt text for company logo', () => {
      render(<JobCard job={mockJob} />);

      const logo = screen.getByAltText('TechCorp México');
      expect(logo).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles missing salary range gracefully', () => {
      const jobWithoutSalary = {
        ...mockJob,
        salaryRange: undefined,
      };
      render(<JobCard job={jobWithoutSalary} />);

      expect(screen.getByText('Salario no especificado')).toBeInTheDocument();
    });

    it('handles empty requirements array', () => {
      const jobWithoutRequirements = {
        ...mockJob,
        requirements: [],
      };
      render(<JobCard job={jobWithoutRequirements} />);

      expect(screen.getByText('Requisitos principales:')).toBeInTheDocument();
    });

    it('handles empty tags array', () => {
      const jobWithoutTags = {
        ...mockJob,
        tags: [],
      };
      render(<JobCard job={jobWithoutTags} />);

      expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
    });

    it('handles missing benefits', () => {
      const jobWithoutBenefits = {
        ...mockJob,
        benefits: undefined,
      };
      render(<JobCard job={jobWithoutBenefits} />);

      // Should render without errors
      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
    });

    it('handles invalid dates', () => {
      const jobWithInvalidDate = {
        ...mockJob,
        postedAt: new Date('invalid'),
      };
      render(<JobCard job={jobWithInvalidDate} />);

      // Should handle gracefully and render the card
      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
    });

    it('handles very long job titles', () => {
      const jobWithLongTitle = {
        ...mockJob,
        title: 'Senior Principal Lead Data Scientist Machine Learning Engineer AI Specialist Position',
      };
      render(<JobCard job={jobWithLongTitle} />);

      expect(screen.getByText(jobWithLongTitle.title)).toBeInTheDocument();
    });

    it('handles zero application and view counts', () => {
      const jobWithZeroCounts = {
        ...mockJob,
        applicationCount: 0,
        viewCount: 0,
      };
      render(<JobCard job={jobWithZeroCounts} />);

      expect(screen.getByText('0 aplicaciones')).toBeInTheDocument();
      expect(screen.getByText('0 vistas')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles missing lang prop with default Spanish', () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByText('Híbrido')).toBeInTheDocument();
      expect(screen.getByText('Ver detalles')).toBeInTheDocument();
    });

    it('validates job object structure', () => {
      const minimalJob = {
        id: '1',
        title: 'Test Job',
        company: 'Test Company',
        location: 'Test Location',
        locationType: 'remote' as const,
        employmentType: 'full-time' as const,
        description: 'Test description',
        requirements: ['Test requirement'],
        tags: ['test'],
        postedAt: new Date(),
        applicationCount: 0,
        viewCount: 0,
        featured: false,
      };

      render(<JobCard job={minimalJob} />);

      expect(screen.getByText('Test Job')).toBeInTheDocument();
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
  });

  describe('Date Formatting Edge Cases', () => {
    it('handles jobs posted less than an hour ago', () => {
      const veryRecentJob = {
        ...mockJob,
        postedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };
      render(<JobCard job={veryRecentJob} />);

      expect(screen.getByText('Hace menos de 1 hora')).toBeInTheDocument();
    });

    it('handles jobs posted weeks ago', () => {
      const weekOldJob = {
        ...mockJob,
        postedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
      };
      render(<JobCard job={weekOldJob} />);

      expect(screen.getByText('Hace 2 semanas')).toBeInTheDocument();
    });

    it('handles singular vs plural time units correctly', () => {
      const oneHourJob = {
        ...mockJob,
        postedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      render(<JobCard job={oneHourJob} />);

      expect(screen.getByText('Hace 1 hora')).toBeInTheDocument();
    });
  });
});