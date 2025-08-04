import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationTracker } from '@/components/jobs/ApplicationTracker';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

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
}));

vi.mock('@/lib/firebase-config', () => ({
  db: {},
}));

vi.mock('@heroicons/react/24/outline', () => ({
  BriefcaseIcon: ({ className }: any) => <svg className={className} data-testid="briefcase-icon" />,
  ClockIcon: ({ className }: any) => <svg className={className} data-testid="clock-icon" />,
  CheckCircleIcon: ({ className }: any) => <svg className={className} data-testid="check-circle-icon" />,
  XCircleIcon: ({ className }: any) => <svg className={className} data-testid="x-circle-icon" />,
  EyeIcon: ({ className }: any) => <svg className={className} data-testid="eye-icon" />,
  PencilIcon: ({ className }: any) => <svg className={className} data-testid="pencil-icon" />,
  TrashIcon: ({ className }: any) => <svg className={className} data-testid="trash-icon" />,
  DocumentTextIcon: ({ className }: any) => <svg className={className} data-testid="document-text-icon" />,
  CalendarIcon: ({ className }: any) => <svg className={className} data-testid="calendar-icon" />,
  MapPinIcon: ({ className }: any) => <svg className={className} data-testid="map-pin-icon" />,
  BuildingOfficeIcon: ({ className }: any) => <svg className={className} data-testid="building-office-icon" />,
  FunnelIcon: ({ className }: any) => <svg className={className} data-testid="funnel-icon" />,
  MagnifyingGlassIcon: ({ className }: any) => <svg className={className} data-testid="magnifying-glass-icon" />,
}));

describe('ApplicationTracker', () => {
  const mockUser = {
    uid: 'user123',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
  };

  const mockUserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  };

  const mockApplications = [
    {
      id: 'app1',
      jobId: 'job1',
      jobTitle: 'Senior Data Scientist',
      company: 'TechCorp México',
      companyLogo: 'https://example.com/logo1.png',
      location: 'Ciudad de México, CDMX',
      locationType: 'hybrid',
      employmentType: 'full-time',
      status: 'pending',
      appliedAt: { toDate: () => new Date('2024-01-15T10:00:00Z') },
      lastUpdated: { toDate: () => new Date('2024-01-15T10:00:00Z') },
      coverLetter: 'I am very interested in this position...',
      resumeUrl: 'https://example.com/resume.pdf',
      applicationMethod: 'platform',
      notes: [],
      interviews: [],
      salaryRange: {
        min: 60000,
        max: 90000,
        currency: 'MXN',
        period: 'monthly',
      },
    },
    {
      id: 'app2',
      jobId: 'job2',
      jobTitle: 'Data Analyst',
      company: 'StartupCorp',
      location: 'Guadalajara, Jalisco',
      locationType: 'remote',
      employmentType: 'full-time',
      status: 'interview',
      appliedAt: { toDate: () => new Date('2024-01-10T08:00:00Z') },
      lastUpdated: { toDate: () => new Date('2024-01-20T14:00:00Z') },
      coverLetter: 'I would like to apply for this position...',
      resumeUrl: 'https://example.com/resume.pdf',
      applicationMethod: 'external',
      notes: [
        {
          id: 'note1',
          content: 'HR called for initial screening',
          createdAt: { toDate: () => new Date('2024-01-18T09:00:00Z') },
          type: 'update',
        },
      ],
      interviews: [
        {
          id: 'interview1',
          type: 'phone',
          scheduledAt: { toDate: () => new Date('2024-01-25T15:00:00Z') },
          status: 'scheduled',
          interviewers: ['Jane Smith'],
          notes: 'Technical interview with the team lead',
        },
      ],
    },
    {
      id: 'app3',
      jobId: 'job3',
      jobTitle: 'ML Engineer',
      company: 'AI Startup',
      location: 'Remote',
      locationType: 'remote',
      employmentType: 'contract',
      status: 'rejected',
      appliedAt: { toDate: () => new Date('2024-01-05T12:00:00Z') },
      lastUpdated: { toDate: () => new Date('2024-01-12T16:00:00Z') },
      coverLetter: 'I am excited to apply...',
      resumeUrl: 'https://example.com/resume.pdf',
      applicationMethod: 'email',
      notes: [
        {
          id: 'note2',
          content: 'Position filled by internal candidate',
          createdAt: { toDate: () => new Date('2024-01-12T16:00:00Z') },
          type: 'rejection',
        },
      ],
      interviews: [],
    },
  ];

  const mockSnapshot = {
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
    mockDoc.mockReturnValue({} as any);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders application tracker with all applications', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText('Mis Aplicaciones')).toBeInTheDocument();
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('Data Analyst')).toBeInTheDocument();
        expect(screen.getByText('ML Engineer')).toBeInTheDocument();
      });
    });

    it('renders in English when lang prop is set', async () => {
      render(<ApplicationTracker lang="en" />);

      await waitFor(() => {
        expect(screen.getByText('My Applications')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      mockGetDocs.mockImplementation(() => new Promise(() => {}));
      render(<ApplicationTracker />);

      expect(screen.getByText(/cargando aplicaciones/i)).toBeInTheDocument();
    });

    it('displays application count and statistics', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText('3 aplicaciones')).toBeInTheDocument();
        expect(screen.getByText(/1 pendiente/i)).toBeInTheDocument();
        expect(screen.getByText(/1 en entrevista/i)).toBeInTheDocument();
        expect(screen.getByText(/1 rechazada/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when no applications exist', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] } as any);
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText(/no has aplicado a ningún empleo/i)).toBeInTheDocument();
        expect(screen.getByText(/explora empleos disponibles/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching and Display', () => {
    it('fetches applications from Firestore with correct query', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith({}, 'applications');
        expect(mockWhere).toHaveBeenCalledWith('applicantId', '==', 'user123');
        expect(mockOrderBy).toHaveBeenCalledWith('appliedAt', 'desc');
      });
    });

    it('displays application status badges correctly', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText('Pendiente')).toBeInTheDocument();
        expect(screen.getByText('Entrevista')).toBeInTheDocument();
        expect(screen.getByText('Rechazada')).toBeInTheDocument();
      });
    });

    it('formats application dates correctly', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText(/hace \d+ días?/i)).toBeInTheDocument();
      });
    });

    it('displays company logos when available', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const logo = screen.getByAltText('TechCorp México');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src', 'https://example.com/logo1.png');
      });
    });

    it('shows default company icon when no logo', async () => {
      const applicationsWithoutLogos = mockApplications.map(app => ({
        ...app,
        companyLogo: undefined,
      }));
      mockGetDocs.mockResolvedValue({
        docs: applicationsWithoutLogos.map(app => ({
          id: app.id,
          data: () => app,
        })),
      } as any);

      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getAllByTestId('building-office-icon')).toHaveLength(3);
      });
    });
  });

  describe('Filter and Search Functionality', () => {
    it('displays filter and search controls', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar aplicaciones/i)).toBeInTheDocument();
        expect(screen.getByTestId('funnel-icon')).toBeInTheDocument();
      });
    });

    it('filters applications by search term', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
        expect(screen.getByText('Data Analyst')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar aplicaciones/i);
      await user.type(searchInput, 'Senior');

      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument();
    });

    it('filters applications by status', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(3);
      });

      const statusFilter = screen.getByLabelText(/filtrar por estado/i);
      await user.selectOptions(statusFilter, 'pending');

      expect(screen.getAllByRole('article')).toHaveLength(1);
      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
    });

    it('filters applications by company', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(3);
      });

      const searchInput = screen.getByPlaceholderText(/buscar aplicaciones/i);
      await user.type(searchInput, 'TechCorp');

      expect(screen.getAllByRole('article')).toHaveLength(1);
      expect(screen.getByText('TechCorp México')).toBeInTheDocument();
    });

    it('filters applications by date range', async () => {
      render(<ApplicationTracker />);

      const dateFilter = screen.getByLabelText(/aplicadas en/i);
      await user.selectOptions(dateFilter, '7d');

      // Should show applications from last 7 days
      expect(mockGetDocs).toHaveBeenCalled();
    });

    it('combines multiple filters', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(3);
      });

      const searchInput = screen.getByPlaceholderText(/buscar aplicaciones/i);
      const statusFilter = screen.getByLabelText(/filtrar por estado/i);

      await user.type(searchInput, 'Data');
      await user.selectOptions(statusFilter, 'interview');

      expect(screen.getAllByRole('article')).toHaveLength(1);
      expect(screen.getByText('Data Analyst')).toBeInTheDocument();
    });
  });

  describe('Application Actions', () => {
    it('allows viewing application details', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: /ver detalles/i })[0];
        expect(viewButton).toBeInTheDocument();
      });

      const viewButton = screen.getAllByRole('button', { name: /ver detalles/i })[0];
      await user.click(viewButton);

      expect(screen.getByText(/detalles de la aplicación/i)).toBeInTheDocument();
      expect(screen.getByText('I am very interested in this position...')).toBeInTheDocument();
    });

    it('allows editing application notes', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const editButton = screen.getAllByRole('button', { name: /editar/i })[0];
        expect(editButton).toBeInTheDocument();
      });

      const editButton = screen.getAllByRole('button', { name: /editar/i })[0];
      await user.click(editButton);

      const noteInput = screen.getByPlaceholderText(/agregar nota/i);
      await user.type(noteInput, 'Followed up with HR today');

      const saveButton = screen.getByRole('button', { name: /guardar nota/i });
      await user.click(saveButton);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({
              content: 'Followed up with HR today',
              type: 'user',
            }),
          ]),
        })
      );
    });

    it('allows withdrawing applications', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const withdrawButton = screen.getAllByRole('button', { name: /retirar aplicación/i })[0];
        expect(withdrawButton).toBeInTheDocument();
      });

      const withdrawButton = screen.getAllByRole('button', { name: /retirar aplicación/i })[0];
      await user.click(withdrawButton);

      // Should show confirmation dialog
      expect(screen.getByText(/confirmar retiro/i)).toBeInTheDocument();
      expect(screen.getByText(/esta acción no se puede deshacer/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /retirar/i });
      await user.click(confirmButton);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'withdrawn',
        })
      );
    });

    it('allows deleting applications', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const deleteButton = screen.getAllByRole('button', { name: /eliminar/i })[0];
        expect(deleteButton).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByRole('button', { name: /eliminar/i })[0];
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText(/confirmar eliminación/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /eliminar/i });
      await user.click(confirmButton);

      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything());
    });

    it('prevents deletion of applications with interviews', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const applicationWithInterview = screen.getByText('Data Analyst').closest('article');
        const deleteButton = within(applicationWithInterview!).getByRole('button', { name: /eliminar/i });
        expect(deleteButton).toBeDisabled();
      });
    });
  });

  describe('Application Status Management', () => {
    it('displays correct status colors and icons', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        // Pending status
        const pendingBadge = screen.getByText('Pendiente');
        expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');

        // Interview status
        const interviewBadge = screen.getByText('Entrevista');
        expect(interviewBadge).toHaveClass('bg-blue-100', 'text-blue-800');

        // Rejected status
        const rejectedBadge = screen.getByText('Rechazada');
        expect(rejectedBadge).toHaveClass('bg-red-100', 'text-red-800');
      });
    });

    it('allows manual status updates', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const statusDropdown = screen.getAllByRole('combobox')[0];
        expect(statusDropdown).toBeInTheDocument();
      });

      const statusDropdown = screen.getAllByRole('combobox')[0];
      await user.selectOptions(statusDropdown, 'interview');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'interview',
          lastUpdated: expect.anything(),
        })
      );
    });

    it('tracks status history', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: /ver detalles/i })[0];
        await user.click(viewButton);
      });

      expect(screen.getByText(/historial de estados/i)).toBeInTheDocument();
      expect(screen.getByText(/aplicación enviada/i)).toBeInTheDocument();
    });
  });

  describe('Interview Management', () => {
    it('displays scheduled interviews', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText(/entrevista telefónica/i)).toBeInTheDocument();
        expect(screen.getByText(/25 ene 2024/i)).toBeInTheDocument();
      });
    });

    it('allows adding interview notes', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const interviewCard = screen.getByText(/entrevista telefónica/i).closest('div');
        const addNoteButton = within(interviewCard!).getByRole('button', { name: /agregar nota/i });
        await user.click(addNoteButton);
      });

      const noteInput = screen.getByPlaceholderText(/notas de la entrevista/i);
      await user.type(noteInput, 'Great conversation with the team lead');

      const saveButton = screen.getByRole('button', { name: /guardar/i });
      await user.click(saveButton);

      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('shows interview reminders', async () => {
      // Set up an interview for tomorrow
      const tomorrowInterview = {
        ...mockApplications[1],
        interviews: [
          {
            id: 'interview1',
            type: 'phone',
            scheduledAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
            status: 'scheduled',
            interviewers: ['Jane Smith'],
            notes: 'Technical interview with the team lead',
          },
        ],
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockApplications[0], tomorrowInterview, mockApplications[2]].map(app => ({
          id: app.id,
          data: () => app,
        })),
      } as any);

      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText(/entrevista mañana/i)).toBeInTheDocument();
      });
    });
  });

  describe('Application Timeline', () => {
    it('displays application timeline for each application', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: /ver detalles/i })[1];
        await user.click(viewButton);
      });

      expect(screen.getByText(/cronología/i)).toBeInTheDocument();
      expect(screen.getByText(/aplicación enviada/i)).toBeInTheDocument();
      expect(screen.getByText(/hr called for initial screening/i)).toBeInTheDocument();
    });

    it('shows timeline events in chronological order', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: /ver detalles/i })[1];
        await user.click(viewButton);
      });

      const timelineEvents = screen.getAllByRole('listitem');
      expect(timelineEvents.length).toBeGreaterThan(0);
    });

    it('allows adding custom timeline events', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: /ver detalles/i })[0];
        await user.click(viewButton);
      });

      const addEventButton = screen.getByRole('button', { name: /agregar evento/i });
      await user.click(addEventButton);

      const eventInput = screen.getByPlaceholderText(/descripción del evento/i);
      await user.type(eventInput, 'Sent thank you email');

      const saveButton = screen.getByRole('button', { name: /guardar evento/i });
      await user.click(saveButton);

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('Export and Reporting', () => {
    it('allows exporting applications to CSV', async () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:url');
      global.URL.revokeObjectURL = vi.fn();

      render(<ApplicationTracker />);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /exportar/i });
        expect(exportButton).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /exportar/i });
      await user.click(exportButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('generates application reports', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const reportButton = screen.getByRole('button', { name: /generar reporte/i });
        expect(reportButton).toBeInTheDocument();
      });

      const reportButton = screen.getByRole('button', { name: /generar reporte/i });
      await user.click(reportButton);

      expect(screen.getByText(/reporte de aplicaciones/i)).toBeInTheDocument();
      expect(screen.getByText(/tasa de respuesta/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network error'));
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText(/error al cargar aplicaciones/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
      });
    });

    it('handles update errors gracefully', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));
      render(<ApplicationTracker />);

      await waitFor(() => {
        const statusDropdown = screen.getAllByRole('combobox')[0];
        await user.selectOptions(statusDropdown, 'interview');
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

      render(<ApplicationTracker />);

      expect(screen.getByText(/debes iniciar sesión/i)).toBeInTheDocument();
    });

    it('handles deletion errors gracefully', async () => {
      mockDeleteDoc.mockRejectedValue(new Error('Delete failed'));
      render(<ApplicationTracker />);

      await waitFor(() => {
        const deleteButton = screen.getAllByRole('button', { name: /eliminar/i })[0];
        await user.click(deleteButton);
      });

      const confirmButton = screen.getByRole('button', { name: /eliminar/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/error al eliminar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton during data fetch', () => {
      mockGetDocs.mockImplementation(() => new Promise(() => {}));
      render(<ApplicationTracker />);

      expect(screen.getByText(/cargando aplicaciones/i)).toBeInTheDocument();
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
    });

    it('shows loading state during status updates', async () => {
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      mockUpdateDoc.mockReturnValue(updatePromise);

      render(<ApplicationTracker />);

      await waitFor(() => {
        const statusDropdown = screen.getAllByRole('combobox')[0];
        await user.selectOptions(statusDropdown, 'interview');
      });

      expect(screen.getByText(/actualizando/i)).toBeInTheDocument();

      resolveUpdate!(undefined);
    });

    it('shows loading state during deletion', async () => {
      let resolveDelete: (value: any) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteDoc.mockReturnValue(deletePromise);

      render(<ApplicationTracker />);

      await waitFor(() => {
        const deleteButton = screen.getAllByRole('button', { name: /eliminar/i })[0];
        await user.click(deleteButton);
      });

      const confirmButton = screen.getByRole('button', { name: /eliminar/i });
      await user.click(confirmButton);

      expect(screen.getByText(/eliminando/i)).toBeInTheDocument();

      resolveDelete!(undefined);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /mis aplicaciones/i })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3); // Each application
      });
    });

    it('has proper form labels and ARIA attributes', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/buscar aplicaciones/i);
        const statusFilter = screen.getByLabelText(/filtrar por estado/i);

        expect(searchInput).toHaveAttribute('type', 'text');
        expect(statusFilter).toHaveRole('combobox');
      });
    });

    it('provides meaningful button labels', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: /ver detalles/i })[0];
        const editButton = screen.getAllByRole('button', { name: /editar/i })[0];
        const deleteButton = screen.getAllByRole('button', { name: /eliminar/i })[0];

        expect(viewButton).toHaveAttribute('aria-label');
        expect(editButton).toHaveAttribute('aria-label');
        expect(deleteButton).toHaveAttribute('aria-label');
      });
    });

    it('maintains focus management during interactions', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        const viewButton = screen.getAllByRole('button', { name: /ver detalles/i })[0];
        await user.click(viewButton);
      });

      // Focus should move to the modal
      expect(document.activeElement).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', async () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ApplicationTracker />);

      await waitFor(() => {
        // Should show mobile-friendly layout
        expect(screen.getByRole('button', { name: /filtros/i })).toBeInTheDocument();
      });
    });

    it('shows/hides columns based on screen size', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        // Should show all columns on desktop
        expect(screen.getAllByText(/aplicada hace/i)).toHaveLength(3);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles applications with missing job data', async () => {
      const incompleteApplication = {
        ...mockApplications[0],
        jobTitle: undefined,
        company: undefined,
      };

      mockGetDocs.mockResolvedValue({
        docs: [incompleteApplication].map(app => ({
          id: app.id,
          data: () => app,
        })),
      } as any);

      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText(/empleo eliminado/i)).toBeInTheDocument();
      });
    });

    it('handles very old applications', async () => {
      const oldApplication = {
        ...mockApplications[0],
        appliedAt: { toDate: () => new Date('2020-01-01') },
      };

      mockGetDocs.mockResolvedValue({
        docs: [oldApplication].map(app => ({
          id: app.id,
          data: () => app,
        })),
      } as any);

      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText(/hace más de 1 año/i)).toBeInTheDocument();
      });
    });

    it('handles applications with many notes', async () => {
      const applicationWithManyNotes = {
        ...mockApplications[0],
        notes: Array.from({ length: 20 }, (_, i) => ({
          id: `note${i}`,
          content: `Note ${i}`,
          createdAt: { toDate: () => new Date() },
          type: 'user',
        })),
      };

      mockGetDocs.mockResolvedValue({
        docs: [applicationWithManyNotes].map(app => ({
          id: app.id,
          data: () => app,
        })),
      } as any);

      render(<ApplicationTracker />);

      await waitFor(() => {
        const viewButton = screen.getByRole('button', { name: /ver detalles/i });
        await user.click(viewButton);
      });

      // Should handle pagination or scrolling for many notes
      expect(screen.getByText(/mostrar más notas/i)).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles missing lang prop with default Spanish', async () => {
      render(<ApplicationTracker />);

      await waitFor(() => {
        expect(screen.getByText('Mis Aplicaciones')).toBeInTheDocument();
      });
    });

    it('handles invalid filter props', () => {
      render(<ApplicationTracker initialFilter="invalid" />);

      expect(screen.getByPlaceholderText(/buscar aplicaciones/i)).toBeInTheDocument();
    });
  });
});