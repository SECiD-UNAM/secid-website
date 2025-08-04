import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanyDashboard } from '@/components/jobs/CompanyDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
}));

vi.mock('@/lib/firebase-config', () => ({
  db: {},
}));

vi.mock('@heroicons/react/24/outline', () => ({
  BriefcaseIcon: ({ className }: any) => <svg className={className} data-testid="briefcase-icon" />,
  UserGroupIcon: ({ className }: any) => <svg className={className} data-testid="user-group-icon" />,
  EyeIcon: ({ className }: any) => <svg className={className} data-testid="eye-icon" />,
  ClockIcon: ({ className }: any) => <svg className={className} data-testid="clock-icon" />,
  PlusIcon: ({ className }: any) => <svg className={className} data-testid="plus-icon" />,
  PencilIcon: ({ className }: any) => <svg className={className} data-testid="pencil-icon" />,
  TrashIcon: ({ className }: any) => <svg className={className} data-testid="trash-icon" />,
  CheckCircleIcon: ({ className }: any) => <svg className={className} data-testid="check-circle-icon" />,
  XCircleIcon: ({ className }: any) => <svg className={className} data-testid="x-circle-icon" />,
  ChartBarIcon: ({ className }: any) => <svg className={className} data-testid="chart-bar-icon" />,
  DocumentDuplicateIcon: ({ className }: any) => <svg className={className} data-testid="document-duplicate-icon" />,
  CalendarIcon: ({ className }: any) => <svg className={className} data-testid="calendar-icon" />,
  MagnifyingGlassIcon: ({ className }: any) => <svg className={className} data-testid="magnifying-glass-icon" />,
  FunnelIcon: ({ className }: any) => <svg className={className} data-testid="funnel-icon" />,
}));

describe('CompanyDashboard', () => {
  const mockUser = {
    uid: 'company123',
    email: 'hr@techcorp.com',
    displayName: 'HR Manager',
  };

  const mockUserProfile = {
    company: 'TechCorp México',
    type: 'company',
    verified: true,
    plan: 'premium',
  };

  const mockJobs = [
    {
      id: 'job1',
      title: 'Senior Data Scientist',
      company: 'TechCorp México',
      location: 'Ciudad de México, CDMX',
      locationType: 'hybrid',
      employmentType: 'full-time',
      status: 'active',
      isApproved: true,
      featured: true,
      postedAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
      postedBy: 'company123',
      applicationCount: 25,
      viewCount: 156,
      salaryRange: {
        min: 60000,
        max: 90000,
        currency: 'MXN',
        period: 'monthly',
      },
      requirements: ['Python', 'Machine Learning', 'SQL'],
      description: 'We are looking for an experienced Data Scientist...',
    },
    {
      id: 'job2',
      title: 'Data Analyst',
      company: 'TechCorp México',
      location: 'Guadalajara, Jalisco',
      locationType: 'onsite',
      employmentType: 'full-time',
      status: 'active',
      isApproved: true,
      featured: false,
      postedAt: { toDate: () => new Date('2024-01-10T08:00:00Z') },
      postedBy: 'company123',
      applicationCount: 12,
      viewCount: 89,
      salaryRange: {
        min: 35000,
        max: 50000,
        currency: 'MXN',
        period: 'monthly',
      },
      requirements: ['SQL', 'Excel', 'Tableau'],
      description: 'Join our analytics team...',
    },
    {
      id: 'job3',
      title: 'ML Engineer',
      company: 'TechCorp México',
      location: 'Remote',
      locationType: 'remote',
      employmentType: 'contract',
      status: 'draft',
      isApproved: false,
      featured: false,
      postedAt: { toDate: () => new Date('2024-01-08T12:00:00Z') },
      postedBy: 'company123',
      applicationCount: 0,
      viewCount: 0,
      requirements: ['Python', 'TensorFlow', 'MLOps'],
      description: 'Looking for an ML Engineer...',
    },
  ];

  const mockApplications = [
    {
      id: 'app1',
      jobId: 'job1',
      jobTitle: 'Senior Data Scientist',
      applicantId: 'user1',
      applicantInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+52 55 1234 5678',
      },
      status: 'pending',
      appliedAt: { toDate: () => new Date('2024-01-16T14:00:00Z') },
      resumeUrl: 'https://example.com/resume1.pdf',
      coverLetter: 'I am very interested in this position...',
      matchScore: 85,
    },
    {
      id: 'app2',
      jobId: 'job1',
      jobTitle: 'Senior Data Scientist',
      applicantId: 'user2',
      applicantInfo: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+52 55 5678 1234',
      },
      status: 'interview',
      appliedAt: { toDate: () => new Date('2024-01-17T09:00:00Z') },
      resumeUrl: 'https://example.com/resume2.pdf',
      coverLetter: 'I would love to join your team...',
      matchScore: 92,
    },
    {
      id: 'app3',
      jobId: 'job2',
      jobTitle: 'Data Analyst',
      applicantId: 'user3',
      applicantInfo: {
        firstName: 'Carlos',
        lastName: 'García',
        email: 'carlos.garcia@example.com',
        phone: '+52 33 1234 5678',
      },
      status: 'rejected',
      appliedAt: { toDate: () => new Date('2024-01-12T11:00:00Z') },
      resumeUrl: 'https://example.com/resume3.pdf',
      coverLetter: 'I am applying for the Data Analyst position...',
      matchScore: 67,
    },
  ];

  const mockJobsSnapshot = {
    docs: mockJobs.map(job => ({
      id: job.id,
      data: () => job,
    })),
  };

  const mockApplicationsSnapshot = {
    docs: mockApplications.map(app => ({
      id: app.id,
      data: () => app,
    })),
  };

  const mockUseAuth = vi.mocked(useAuth);
  const mockGetDocs = vi.mocked(getDocs);
  const mockQuery = vi.mocked(query);
  const mockCollection = vi.mocked(collection);
  const mockWhere = vi.mocked(where);
  const mockOrderBy = vi.mocked(orderBy);
  const mockDoc = vi.mocked(doc);
  const mockUpdateDoc = vi.mocked(updateDoc);
  const mockDeleteDoc = vi.mocked(deleteDoc);
  const mockAddDoc = vi.mocked(addDoc);
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
    mockGetDocs.mockImplementation((queryObj) => {
      // Mock different responses based on collection
      if (queryObj.toString().includes('jobs')) {
        return Promise.resolve(mockJobsSnapshot as any);
      }
      return Promise.resolve(mockApplicationsSnapshot as any);
    });
    mockQuery.mockReturnValue({} as any);
    mockCollection.mockReturnValue({} as any);
    mockWhere.mockReturnValue({} as any);
    mockOrderBy.mockReturnValue({} as any);
    mockDoc.mockReturnValue({} as any);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: 'newjob123' } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders company dashboard with overview statistics', async () => {
      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Panel de Empresa')).toBeInTheDocument();
        expect(screen.getByText('3 empleos publicados')).toBeInTheDocument();
        expect(screen.getByText('37 aplicaciones totales')).toBeInTheDocument();
        expect(screen.getByText('245 vistas totales')).toBeInTheDocument();
      });
    });

    it('renders in English when lang prop is set', async () => {
      render(<CompanyDashboard lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('Company Dashboard')).toBeInTheDocument();
        expect(screen.getByText('3 published jobs')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      mockGetDocs.mockImplementation(() => new Promise(() => {}));
      render(<CompanyDashboard />);

      expect(screen.getByText(/cargando dashboard/i)).toBeInTheDocument();
    });

    it('displays navigation tabs', async () => {
      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /resumen/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /empleos/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /aplicaciones/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /estadísticas/i })).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching and Display', () => {
    it('fetches company jobs and applications from Firestore', async () => {
      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith({}, 'jobs');
        expect(mockCollection).toHaveBeenCalledWith({}, 'applications');
        expect(mockWhere).toHaveBeenCalledWith('postedBy', '==', 'company123');
      });
    });

    it('displays all company jobs in jobs tab', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('Data Analyst')).toBeInTheDocument();
        expect(screen.getByText('ML Engineer')).toBeInTheDocument();
      });
    });

    it('displays job status badges correctly', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        expect(screen.getByText('Activo')).toBeInTheDocument();
        expect(screen.getByText('Borrador')).toBeInTheDocument();
      });
    });

    it('displays application statistics per job', async () => {
      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('25 aplicaciones')).toBeInTheDocument();
        expect(screen.getByText('156 vistas')).toBeInTheDocument();
      });
    });
  });

  describe('Job Management', () => {
    it('allows creating new job postings', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const newJobButton = screen.getByRole('button', { name: /nuevo empleo/i });
        expect(newJobButton).toBeInTheDocument();
      });

      const newJobButton = screen.getByRole('button', { name: /nuevo empleo/i });
      await user.click(newJobButton);

      expect(screen.getByText(/crear nuevo empleo/i)).toBeInTheDocument();
    });

    it('allows editing existing job postings', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /editar/i });
        expect(editButtons[0]).toBeInTheDocument();
      });

      const editButton = screen.getAllByRole('button', { name: /editar/i })[0];
      await user.click(editButton);

      expect(screen.getByText(/editar empleo/i)).toBeInTheDocument();
    });

    it('allows deleting job postings', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
        expect(deleteButtons[0]).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /eliminar/i })[0];
      await user.click(deleteButton);

      expect(screen.getByText(/confirmar eliminación/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /eliminar/i });
      await user.click(confirmButton);

      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything());
    });

    it('allows duplicating job postings', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const duplicateButtons = screen.getAllByRole('button', { name: /duplicar/i });
        expect(duplicateButtons[0]).toBeInTheDocument();
      });

      const duplicateButton = screen.getAllByRole('button', { name: /duplicar/i })[0];
      await user.click(duplicateButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: expect.stringContaining('Senior Data Scientist'),
          status: 'draft',
        })
      );
    });

    it('allows toggling job status between active and paused', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const statusToggle = screen.getAllByRole('button', { name: /pausar/i })[0];
        expect(statusToggle).toBeInTheDocument();
      });

      const statusToggle = screen.getAllByRole('button', { name: /pausar/i })[0];
      await user.click(statusToggle);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'paused',
        })
      );
    });

    it('allows marking jobs as featured', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const featuredToggle = screen.getAllByRole('button', { name: /destacar/i })[0];
        expect(featuredToggle).toBeInTheDocument();
      });

      const featuredToggle = screen.getAllByRole('button', { name: /destacar/i })[0];
      await user.click(featuredToggle);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          featured: true,
        })
      );
    });
  });

  describe('Application Management', () => {
    it('displays all applications in applications tab', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Carlos García')).toBeInTheDocument();
      });
    });

    it('allows filtering applications by status', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/filtrar por estado/i);
        expect(statusFilter).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filtrar por estado/i);
      await user.selectOptions(statusFilter, 'pending');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Carlos García')).not.toBeInTheDocument();
    });

    it('allows filtering applications by job', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const jobFilter = screen.getByLabelText(/filtrar por empleo/i);
        expect(jobFilter).toBeInTheDocument();
      });

      const jobFilter = screen.getByLabelText(/filtrar por empleo/i);
      await user.selectOptions(jobFilter, 'job1');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Carlos García')).not.toBeInTheDocument();
    });

    it('allows updating application status', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const statusDropdowns = screen.getAllByRole('combobox');
        const applicationStatus = statusDropdowns.find(dropdown => 
          (dropdown as HTMLSelectElement).value === 'pending'
        );
        expect(applicationStatus).toBeInTheDocument();
      });

      const statusDropdown = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
      await user.selectOptions(statusDropdown, 'interview');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'interview',
        })
      );
    });

    it('displays applicant match scores', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        expect(screen.getByText('85% compatible')).toBeInTheDocument();
        expect(screen.getByText('92% compatible')).toBeInTheDocument();
      });
    });

    it('allows viewing applicant details', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: /ver perfil/i });
        expect(viewButtons[0]).toBeInTheDocument();
      });

      const viewButton = screen.getAllByRole('button', { name: /ver perfil/i })[0];
      await user.click(viewButton);

      expect(screen.getByText(/perfil del candidato/i)).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('allows downloading applicant resumes', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const resumeLinks = screen.getAllByRole('link', { name: /descargar cv/i });
        expect(resumeLinks[0]).toBeInTheDocument();
      });

      const resumeLink = screen.getAllByRole('link', { name: /descargar cv/i })[0];
      expect(resumeLink).toHaveAttribute('href', 'https://example.com/resume1.pdf');
      expect(resumeLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Statistics and Analytics', () => {
    it('displays job performance metrics in statistics tab', async () => {
      render(<CompanyDashboard />);

      const statisticsTab = screen.getByRole('tab', { name: /estadísticas/i });
      await user.click(statisticsTab);

      await waitFor(() => {
        expect(screen.getByText(/tasa de aplicación/i)).toBeInTheDocument();
        expect(screen.getByText(/tiempo promedio de respuesta/i)).toBeInTheDocument();
        expect(screen.getByText(/empleos más populares/i)).toBeInTheDocument();
      });
    });

    it('shows application trends over time', async () => {
      render(<CompanyDashboard />);

      const statisticsTab = screen.getByRole('tab', { name: /estadísticas/i });
      await user.click(statisticsTab);

      await waitFor(() => {
        expect(screen.getByText(/tendencia semanal/i)).toBeInTheDocument();
        expect(screen.getByTestId('chart-bar-icon')).toBeInTheDocument();
      });
    });

    it('displays conversion funnel', async () => {
      render(<CompanyDashboard />);

      const statisticsTab = screen.getByRole('tab', { name: /estadísticas/i });
      await user.click(statisticsTab);

      await waitFor(() => {
        expect(screen.getByText(/embudo de conversión/i)).toBeInTheDocument();
        expect(screen.getByText(/vistas → aplicaciones/i)).toBeInTheDocument();
      });
    });

    it('shows top performing jobs', async () => {
      render(<CompanyDashboard />);

      const statisticsTab = screen.getByRole('tab', { name: /estadísticas/i });
      await user.click(statisticsTab);

      await waitFor(() => {
        expect(screen.getByText(/empleos con mejor rendimiento/i)).toBeInTheDocument();
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter Functionality', () => {
    it('allows searching jobs by title', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/buscar empleos/i);
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar empleos/i);
      await user.type(searchInput, 'Senior');

      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument();
    });

    it('allows filtering jobs by status', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/filtrar por estado/i);
        expect(statusFilter).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filtrar por estado/i);
      await user.selectOptions(statusFilter, 'active');

      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      expect(screen.queryByText('ML Engineer')).not.toBeInTheDocument();
    });

    it('allows searching applications by candidate name', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/buscar candidatos/i);
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar candidatos/i);
      await user.type(searchInput, 'John');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Bulk Actions', () => {
    it('allows selecting multiple applications', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      const secondCheckbox = screen.getAllByRole('checkbox')[1];

      await user.click(firstCheckbox);
      await user.click(secondCheckbox);

      expect(screen.getByText(/2 seleccionados/i)).toBeInTheDocument();
    });

    it('allows bulk status updates', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[0]);
        await user.click(checkboxes[1]);
      });

      const bulkActionButton = screen.getByRole('button', { name: /acciones masivas/i });
      await user.click(bulkActionButton);

      const updateStatusOption = screen.getByRole('menuitem', { name: /actualizar estado/i });
      await user.click(updateStatusOption);

      const statusSelect = screen.getByLabelText(/nuevo estado/i);
      await user.selectOptions(statusSelect, 'interview');

      const confirmButton = screen.getByRole('button', { name: /aplicar cambios/i });
      await user.click(confirmButton);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

    it('allows bulk rejection with message', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[0]);
      });

      const bulkActionButton = screen.getByRole('button', { name: /acciones masivas/i });
      await user.click(bulkActionButton);

      const rejectOption = screen.getByRole('menuitem', { name: /rechazar/i });
      await user.click(rejectOption);

      const messageInput = screen.getByLabelText(/mensaje de rechazo/i);
      await user.type(messageInput, 'Thank you for your interest...');

      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'rejected',
          rejectionMessage: 'Thank you for your interest...',
        })
      );
    });
  });

  describe('Notifications and Communication', () => {
    it('shows notification indicators for new applications', async () => {
      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/2 nuevas aplicaciones/i)).toBeInTheDocument();
      });
    });

    it('allows sending messages to applicants', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const messageButtons = screen.getAllByRole('button', { name: /enviar mensaje/i });
        expect(messageButtons[0]).toBeInTheDocument();
      });

      const messageButton = screen.getAllByRole('button', { name: /enviar mensaje/i })[0];
      await user.click(messageButton);

      expect(screen.getByText(/enviar mensaje a john doe/i)).toBeInTheDocument();

      const messageInput = screen.getByLabelText(/mensaje/i);
      await user.type(messageInput, 'Thank you for your application...');

      const sendButton = screen.getByRole('button', { name: /enviar/i });
      await user.click(sendButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'message',
          content: 'Thank you for your application...',
        })
      );
    });

    it('shows interview scheduling interface', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const scheduleButtons = screen.getAllByRole('button', { name: /programar entrevista/i });
        expect(scheduleButtons[0]).toBeInTheDocument();
      });

      const scheduleButton = screen.getAllByRole('button', { name: /programar entrevista/i })[0];
      await user.click(scheduleButton);

      expect(screen.getByText(/programar entrevista con john doe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fecha y hora/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tipo de entrevista/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network error'));
      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/error al cargar datos/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
      });
    });

    it('handles update errors gracefully', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const statusToggle = screen.getAllByRole('button', { name: /pausar/i })[0];
        await user.click(statusToggle);
      });

      await waitFor(() => {
        expect(screen.getByText(/error al actualizar/i)).toBeInTheDocument();
      });
    });

    it('handles authentication errors', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(<CompanyDashboard />);

      expect(screen.getByText(/debes iniciar sesión/i)).toBeInTheDocument();
    });

    it('handles non-company users', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, type: 'member' },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(<CompanyDashboard />);

      expect(screen.getByText(/acceso denegado/i)).toBeInTheDocument();
    });
  });

  describe('Export and Reporting', () => {
    it('allows exporting applications to CSV', async () => {
      global.URL.createObjectURL = vi.fn(() => 'blob:url');
      global.URL.revokeObjectURL = vi.fn();

      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /exportar/i });
        expect(exportButton).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /exportar/i });
      await user.click(exportButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('generates recruitment reports', async () => {
      render(<CompanyDashboard />);

      const statisticsTab = screen.getByRole('tab', { name: /estadísticas/i });
      await user.click(statisticsTab);

      await waitFor(() => {
        const reportButton = screen.getByRole('button', { name: /generar reporte/i });
        expect(reportButton).toBeInTheDocument();
      });

      const reportButton = screen.getByRole('button', { name: /generar reporte/i });
      await user.click(reportButton);

      expect(screen.getByText(/reporte de reclutamiento/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper tab navigation', async () => {
      render(<CompanyDashboard />);

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab');
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      });

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      expect(jobsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('has proper heading hierarchy', async () => {
      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /panel de empresa/i })).toBeInTheDocument();
      });
    });

    it('provides meaningful button labels', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const editButton = screen.getAllByRole('button', { name: /editar/i })[0];
        expect(editButton).toHaveAttribute('aria-label');
      });
    });

    it('maintains focus management during navigation', async () => {
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      expect(document.activeElement).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('implements pagination for large datasets', async () => {
      render(<CompanyDashboard />);

      const applicationsTab = screen.getByRole('tab', { name: /aplicaciones/i });
      await user.click(applicationsTab);

      await waitFor(() => {
        expect(screen.getByText(/mostrando 1-3 de 3/i)).toBeInTheDocument();
      });
    });

    it('shows loading states for individual actions', async () => {
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      mockUpdateDoc.mockReturnValue(updatePromise);

      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        const statusToggle = screen.getAllByRole('button', { name: /pausar/i })[0];
        await user.click(statusToggle);
      });

      expect(screen.getByText(/pausando/i)).toBeInTheDocument();

      resolveUpdate!(undefined);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty job listings', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] } as any);
      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        expect(screen.getByText(/no has publicado empleos/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /crear primer empleo/i })).toBeInTheDocument();
      });
    });

    it('handles jobs with missing application data', async () => {
      const jobsWithoutApps = [
        {
          ...mockJobs[0],
          applicationCount: 0,
          viewCount: 0,
        },
      ];

      mockGetDocs.mockImplementation((queryObj) => {
        if (queryObj.toString().includes('jobs')) {
          return Promise.resolve({
            docs: jobsWithoutApps.map(job => ({
              id: job.id,
              data: () => job,
            })),
          } as any);
        }
        return Promise.resolve({ docs: [] } as any);
      });

      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('0 aplicaciones totales')).toBeInTheDocument();
      });
    });

    it('handles very long job titles', async () => {
      const jobWithLongTitle = {
        ...mockJobs[0],
        title: 'Senior Principal Lead Data Scientist Machine Learning Engineer AI Specialist Position',
      };

      mockGetDocs.mockImplementation((queryObj) => {
        if (queryObj.toString().includes('jobs')) {
          return Promise.resolve({
            docs: [jobWithLongTitle].map(job => ({
              id: job.id,
              data: () => job,
            })),
          } as any);
        }
        return Promise.resolve(mockApplicationsSnapshot as any);
      });

      render(<CompanyDashboard />);

      const jobsTab = screen.getByRole('tab', { name: /empleos/i });
      await user.click(jobsTab);

      await waitFor(() => {
        expect(screen.getByText(jobWithLongTitle.title)).toBeInTheDocument();
      });
    });
  });

  describe('Props Validation', () => {
    it('handles missing lang prop with default Spanish', async () => {
      render(<CompanyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Panel de Empresa')).toBeInTheDocument();
      });
    });
  });
});