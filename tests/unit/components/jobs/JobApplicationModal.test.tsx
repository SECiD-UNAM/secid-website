// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobApplicationModal } from '@/components/jobs/JobApplicationModal';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
  storage: {},
}));

// Mock all heroicons with Proxy to auto-handle any icon import
vi.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, {
    get: (_target, prop) => {
      if (typeof prop === 'string' && prop !== '__esModule') {
        const Icon = ({ className }: any) => <svg className={className} data-testid={`${prop}-icon`} />;
        Icon.displayName = String(prop);
        return Icon;
      }
      return undefined;
    },
  })
);

// Mock file upload
const mockFileUpload = vi.fn();
vi.mock('@/lib/file-upload', () => ({
  uploadFile: mockFileUpload,
}));

describe('JobApplicationModal', () => {
  const mockUser = {
    uid: 'user123',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
  };

  const mockUserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+52 55 1234 5678',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    resumeUrl: 'https://example.com/resume.pdf',
    skills: ['Python', 'Machine Learning', 'SQL'],
    experience: 'senior',
    location: 'Ciudad de México',
  };

  const mockJob = {
    id: 'job123',
    title: 'Senior Data Scientist',
    company: 'TechCorp México',
    location: 'Ciudad de México, CDMX',
    locationType: 'hybrid',
    employmentType: 'full-time',
    salaryRange: {
      min: 60000,
      max: 90000,
      currency: 'MXN',
      period: 'monthly',
    },
    description: 'We are looking for an experienced Data Scientist...',
    requirements: ['Python', 'Machine Learning', 'SQL'],
    applicationMethod: 'platform',
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockUseAuth = vi.mocked(useAuth);
  const mockAddDoc = vi.mocked(addDoc);
  const mockCollection = vi.mocked(collection);
  const mockServerTimestamp = vi.mocked(serverTimestamp);
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
    mockAddDoc.mockResolvedValue({ id: 'application123' } as any);
    mockCollection.mockReturnValue({} as any);
    mockServerTimestamp.mockReturnValue({} as any);
    mockFileUpload.mockResolvedValue('https://example.com/uploaded-file.pdf');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders modal with job information and application form', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Aplicar a Senior Data Scientist')).toBeInTheDocument();
      expect(screen.getByText('TechCorp México')).toBeInTheDocument();
      expect(screen.getByLabelText(/carta de presentación/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currículum/i)).toBeInTheDocument();
    });

    it('renders in English when lang prop is set', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          lang="en"
        />
      );

      expect(screen.getByText('Apply to Senior Data Scientist')).toBeInTheDocument();
      expect(screen.getByLabelText(/cover letter/i)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByText('Aplicar a Senior Data Scientist')).not.toBeInTheDocument();
    });

    it('pre-fills user information from profile', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect((screen.getByLabelText(/nombre/i) as HTMLInputElement).value).toBe('John');
      expect((screen.getByLabelText(/apellido/i) as HTMLInputElement).value).toBe('Doe');
      expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('john.doe@example.com');
      expect((screen.getByLabelText(/teléfono/i) as HTMLInputElement).value).toBe('+52 55 1234 5678');
    });

    it('shows existing resume when available', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/currículum actual/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ver currículum/i })).toHaveAttribute(
        'href',
        'https://example.com/resume.pdf'
      );
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Clear required fields
      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
    });

    it('validates email format', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(screen.getByText(/email válido/i)).toBeInTheDocument();
    });

    it('validates phone number format', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const phoneInput = screen.getByLabelText(/teléfono/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '123');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(screen.getByText(/teléfono válido/i)).toBeInTheDocument();
    });

    it('validates cover letter length', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'Short');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(screen.getByText(/carta de presentación debe tener al menos 50 caracteres/i)).toBeInTheDocument();
    });

    it('validates LinkedIn URL format', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const linkedinInput = screen.getByLabelText(/linkedin/i);
      await user.clear(linkedinInput);
      await user.type(linkedinInput, 'invalid-url');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(screen.getByText(/url de linkedin válida/i)).toBeInTheDocument();
    });

    it('requires resume upload if none exists', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, resumeUrl: undefined },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(screen.getByText(/currículum es requerido/i)).toBeInTheDocument();
    });
  });

  describe('File Upload Functionality', () => {
    it('handles resume file upload', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/subir nuevo currículum/i);

      await user.upload(fileInput, file);

      expect(mockFileUpload).toHaveBeenCalledWith(file, 'resumes');
      await waitFor(() => {
        expect(screen.getByText('resume.pdf')).toBeInTheDocument();
      });
    });

    it('validates file type for resume', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const file = new File(['content'], 'resume.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/subir nuevo currículum/i);

      await user.upload(fileInput, file);

      expect(screen.getByText(/tipo de archivo no válido/i)).toBeInTheDocument();
    });

    it('validates file size for resume', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large-resume.pdf', {
        type: 'application/pdf',
      });
      const fileInput = screen.getByLabelText(/subir nuevo currículum/i);

      await user.upload(fileInput, largeFile);

      expect(screen.getByText(/archivo muy grande/i)).toBeInTheDocument();
    });

    it('shows upload progress', async () => {
      let resolveUpload: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });
      mockFileUpload.mockReturnValue(uploadPromise);

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/subir nuevo currículum/i);

      await user.upload(fileInput, file);

      expect(screen.getByText(/subiendo/i)).toBeInTheDocument();

      resolveUpload!('https://example.com/uploaded-resume.pdf');
    });

    it('handles file upload errors', async () => {
      mockFileUpload.mockRejectedValue(new Error('Upload failed'));

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/subir nuevo currículum/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/error al subir archivo/i)).toBeInTheDocument();
      });
    });

    it('allows removing uploaded file', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/subir nuevo currículum/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('resume.pdf')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /eliminar/i });
      await user.click(removeButton);

      expect(screen.queryByText('resume.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Application Submission', () => {
    it('submits application with all data', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(
        coverLetterInput,
        'I am very interested in this position and believe my skills in Python and Machine Learning make me a great fit.'
      );

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          jobId: 'job123',
          applicantId: 'user123',
          applicantInfo: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+52 55 1234 5678',
          }),
          coverLetter: expect.stringContaining('I am very interested'),
          resumeUrl: 'https://example.com/resume.pdf',
          status: 'pending',
          appliedAt: expect.anything(),
        })
      );
    });

    it('shows loading state during submission', async () => {
      let resolveAddDoc: (value: any) => void;
      const addDocPromise = new Promise((resolve) => {
        resolveAddDoc = resolve;
      });
      mockAddDoc.mockReturnValue(addDocPromise);

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is my cover letter with more than 50 characters.');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(screen.getByText(/enviando aplicación/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      resolveAddDoc!({ id: 'application123' });
    });

    it('shows success message after successful submission', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is my cover letter with more than 50 characters.');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/aplicación enviada exitosamente/i)).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('handles submission errors', async () => {
      mockAddDoc.mockRejectedValue(new Error('Network error'));

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is my cover letter with more than 50 characters.');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error al enviar aplicación/i)).toBeInTheDocument();
        expect(screen.getByTestId('exclamation-triangle-icon')).toBeInTheDocument();
      });
    });

    it('includes uploaded resume in submission', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, resumeUrl: undefined },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Upload new resume
      const file = new File(['resume content'], 'new-resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/subir currículum/i);
      await user.upload(fileInput, file);

      // Fill cover letter
      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is my cover letter with more than 50 characters.');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          resumeUrl: 'https://example.com/uploaded-file.pdf',
        })
      );
    });
  });

  describe('Modal Interactions', () => {
    it('closes modal when close button is clicked', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when overlay is clicked', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const overlay = document.querySelector('[data-testid="modal-overlay"]') || 
                     document.querySelector('.fixed.inset-0');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents modal close during submission', async () => {
      let resolveAddDoc: (value: any) => void;
      const addDocPromise = new Promise((resolve) => {
        resolveAddDoc = resolve;
      });
      mockAddDoc.mockReturnValue(addDocPromise);

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is my cover letter with more than 50 characters.');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      // Try to close modal during submission
      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      expect(closeButton).toBeDisabled();

      resolveAddDoc!({ id: 'application123' });
    });

    it('shows confirmation dialog when trying to close with unsaved changes', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Make changes to form
      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'Some changes');

      const closeButton = screen.getByRole('button', { name: /cerrar/i });
      await user.click(closeButton);

      expect(screen.getByText(/cambios no guardados/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /descartar cambios/i })).toBeInTheDocument();
    });
  });

  describe('Job Information Display', () => {
    it('displays job details in modal header', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
      expect(screen.getByText('TechCorp México')).toBeInTheDocument();
      expect(screen.getByText('Ciudad de México, CDMX')).toBeInTheDocument();
      expect(screen.getByText('Híbrido')).toBeInTheDocument();
    });

    it('displays salary range when available', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('MXN 60,000 - 90,000 por mes')).toBeInTheDocument();
    });

    it('shows job requirements', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('SQL')).toBeInTheDocument();
    });

    it('highlights matching skills', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const pythonSkill = screen.getByText('Python');
      expect(pythonSkill).toHaveClass('text-green-600'); // Matching skill
    });
  });

  describe('User Experience Features', () => {
    it('shows character count for cover letter', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is a test cover letter');

      expect(screen.getByText(/27 caracteres/i)).toBeInTheDocument();
    });

    it('provides cover letter suggestions based on job requirements', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/menciona tu experiencia con/i)).toBeInTheDocument();
      expect(screen.getByText(/python/i)).toBeInTheDocument();
      expect(screen.getByText(/machine learning/i)).toBeInTheDocument();
    });

    it('shows application tips', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/consejos para tu aplicación/i)).toBeInTheDocument();
      expect(screen.getByText(/personaliza tu carta/i)).toBeInTheDocument();
    });

    it('displays estimated response time', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/tiempo estimado de respuesta/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles authentication errors', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/debes iniciar sesión/i)).toBeInTheDocument();
    });

    it('handles incomplete user profile', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, firstName: '', lastName: '' },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/completa tu perfil/i)).toBeInTheDocument();
    });

    it('handles network errors during submission', async () => {
      mockAddDoc.mockRejectedValue(new Error('Network error'));

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is my cover letter with more than 50 characters.');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
      });
    });

    it('handles duplicate application attempts', async () => {
      mockAddDoc.mockRejectedValue({ code: 'already-exists' });

      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is my cover letter with more than 50 characters.');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/ya aplicaste a este empleo/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper modal accessibility attributes', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');
    });

    it('has proper form labels and ARIA attributes', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/nombre/i);
      const emailInput = screen.getByLabelText(/email/i);
      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);

      expect(nameInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(coverLetterInput).toHaveAttribute('aria-describedby');
    });

    it('manages focus properly', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Focus should be on first focusable element
      const firstInput = screen.getByLabelText(/nombre/i);
      expect(firstInput).toHaveFocus();
    });

    it('traps focus within modal', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Tab through all elements and ensure focus stays within modal
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBeInTheDocument();

      // Should not focus elements outside modal
      const outsideElement = document.body.querySelector('button') || document.body;
      expect(document.activeElement).not.toBe(outsideElement);
    });

    it('handles keyboard navigation', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Escape key should close modal
      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long cover letters', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const longCoverLetter = 'A'.repeat(5000);
      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, longCoverLetter);

      expect((coverLetterInput as HTMLTextAreaElement).value).toBe(longCoverLetter);
    });

    it('handles special characters in form fields', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'José María');

      expect((nameInput as HTMLInputElement).value).toBe('José María');
    });

    it('handles job without requirements', () => {
      const jobWithoutRequirements = { ...mockJob, requirements: [] };

      render(
        <JobApplicationModal
          job={jobWithoutRequirements}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByText(/requisitos/i)).not.toBeInTheDocument();
    });

    it('handles missing job data', () => {
      const minimalJob = {
        id: 'job123',
        title: 'Test Job',
        company: 'Test Company',
        applicationMethod: 'platform' as const,
      };

      render(
        <JobApplicationModal
          job={minimalJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Test Job')).toBeInTheDocument();
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles missing onClose callback', () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={undefined as any}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Aplicar a Senior Data Scientist')).toBeInTheDocument();
    });

    it('handles missing onSuccess callback', async () => {
      render(
        <JobApplicationModal
          job={mockJob}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={undefined as any}
        />
      );

      const coverLetterInput = screen.getByLabelText(/carta de presentación/i);
      await user.type(coverLetterInput, 'This is my cover letter with more than 50 characters.');

      const submitButton = screen.getByRole('button', { name: /enviar aplicación/i });
      expect(() => user.click(submitButton)).not.toThrow();
    });
  });
});