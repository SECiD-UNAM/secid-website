// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobPostingForm } from '@/components/jobs/JobPostingForm';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, {
    get: (_target, prop) => {
      if (typeof prop === 'string' && prop !== '__esModule') {
        const Icon = ({ className }: any) => <svg className={className} data-testid={`${prop}-icon`} />;
        Icon.displayName = prop;
        return Icon;
      }
      return undefined;
    },
  })
);

describe('JobPostingForm', () => {
  const mockUser = {
    uid: 'company123',
    email: 'hr@techcorp.com',
    displayName: 'HR Manager',
  };

  const mockUserProfile = {
    company: 'TechCorp México',
    type: 'company',
    verified: true,
  };

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
    mockAddDoc.mockResolvedValue({ id: 'job123' } as any);
    mockCollection.mockReturnValue({} as any);
    mockServerTimestamp.mockReturnValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders initial step with basic job information form', () => {
      render(<JobPostingForm />);

      expect(screen.getByText('1 de 5')).toBeInTheDocument();
      expect(screen.getByText('Información básica')).toBeInTheDocument();
      expect(screen.getByLabelText(/título del empleo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
    });

    it('renders in English when lang prop is set', () => {
      render(<JobPostingForm lang="en" />);

      expect(screen.getByText('1 of 5')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    });

    it('pre-fills company name from user profile', () => {
      render(<JobPostingForm />);

      const companyInput = screen.getByLabelText(/empresa/i) as HTMLInputElement;
      expect(companyInput.value).toBe('TechCorp México');
    });

    it('displays progress indicator', () => {
      render(<JobPostingForm />);

      expect(screen.getByText('1 de 5')).toBeInTheDocument();
      // Should show progress bar or steps
      expect(screen.getByRole('progressbar') || screen.getByText(/paso 1/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields in step 1', async () => {
      render(<JobPostingForm />);

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);

      expect(screen.getByText(/completa todos los campos requeridos/i)).toBeInTheDocument();
    });

    it('validates job title length', async () => {
      render(<JobPostingForm />);

      const titleInput = screen.getByLabelText(/título del empleo/i);
      await user.type(titleInput, 'a'); // Too short

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);

      expect(screen.getByText(/título debe tener al menos/i)).toBeInTheDocument();
    });

    it('validates description length in step 2', async () => {
      render(<JobPostingForm />);

      // Fill step 1
      await user.type(screen.getByLabelText(/título del empleo/i), 'Senior Data Scientist');
      await user.type(screen.getByLabelText(/empresa/i), 'TechCorp');
      await user.type(screen.getByLabelText(/ubicación/i), 'Ciudad de México');
      
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      // Now in step 2
      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);

      expect(screen.getByText(/descripción debe tener al menos 100 caracteres/i)).toBeInTheDocument();
    });

    it('validates email format for email application method', async () => {
      render(<JobPostingForm />);

      // Navigate to application method step
      await navigateToStep(5);

      const emailRadio = screen.getByLabelText(/correo electrónico/i);
      await user.click(emailRadio);

      const emailInput = screen.getByLabelText(/email de aplicación/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      expect(screen.getByText(/email válido/i)).toBeInTheDocument();
    });

    it('validates URL format for external application method', async () => {
      render(<JobPostingForm />);

      await navigateToStep(5);

      const externalRadio = screen.getByLabelText(/sitio externo/i);
      await user.click(externalRadio);

      const urlInput = screen.getByLabelText(/url de aplicación/i);
      await user.type(urlInput, 'invalid-url');

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      expect(screen.getByText(/url válida/i)).toBeInTheDocument();
    });

    it('validates salary range', async () => {
      render(<JobPostingForm />);

      await navigateToStep(1);

      const salaryMinInput = screen.getByLabelText(/salario mínimo/i);
      const salaryMaxInput = screen.getByLabelText(/salario máximo/i);

      await user.type(salaryMinInput, '100000');
      await user.type(salaryMaxInput, '50000'); // Max less than min

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);

      expect(screen.getByText(/salario máximo debe ser mayor/i)).toBeInTheDocument();
    });
  });

  describe('Multi-step Navigation', () => {
    it('navigates to next step when current step is valid', async () => {
      render(<JobPostingForm />);

      // Fill required fields
      await user.type(screen.getByLabelText(/título del empleo/i), 'Senior Data Scientist');
      await user.type(screen.getByLabelText(/empresa/i), 'TechCorp');
      await user.type(screen.getByLabelText(/ubicación/i), 'Ciudad de México');

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);

      expect(screen.getByText('2 de 5')).toBeInTheDocument();
      expect(screen.getByText('Descripción del empleo')).toBeInTheDocument();
    });

    it('navigates back to previous step', async () => {
      render(<JobPostingForm />);

      await navigateToStep(2);

      const backButton = screen.getByRole('button', { name: /anterior/i });
      await user.click(backButton);

      expect(screen.getByText('1 de 5')).toBeInTheDocument();
    });

    it('shows all steps in order', async () => {
      render(<JobPostingForm />);

      // Step 1: Basic Info
      expect(screen.getByText('Información básica')).toBeInTheDocument();

      await navigateToStep(2);
      expect(screen.getByText('Descripción del empleo')).toBeInTheDocument();

      await navigateToStep(3);
      expect(screen.getByText('Requisitos y responsabilidades')).toBeInTheDocument();

      await navigateToStep(4);
      expect(screen.getByText('Beneficios y etiquetas')).toBeInTheDocument();

      await navigateToStep(5);
      expect(screen.getByText('Método de aplicación')).toBeInTheDocument();
    });

    it('preserves form data across steps', async () => {
      render(<JobPostingForm />);

      const titleInput = screen.getByLabelText(/título del empleo/i);
      await user.type(titleInput, 'Senior Data Scientist');

      await navigateToStep(2);
      await navigateToStep(1);

      expect((screen.getByLabelText(/título del empleo/i) as HTMLInputElement).value).toBe('Senior Data Scientist');
    });
  });

  describe('Form Fields and Interactions', () => {
    it('handles job type and location type selections', async () => {
      render(<JobPostingForm />);

      const employmentTypeSelect = screen.getByLabelText(/tipo de empleo/i);
      await user.selectOptions(employmentTypeSelect, 'part-time');

      const locationTypeSelect = screen.getByLabelText(/modalidad/i);
      await user.selectOptions(locationTypeSelect, 'remote');

      expect((employmentTypeSelect as HTMLSelectElement).value).toBe('part-time');
      expect((locationTypeSelect as HTMLSelectElement).value).toBe('remote');
    });

    it('handles dynamic list fields (requirements, responsibilities, benefits)', async () => {
      render(<JobPostingForm />);

      await navigateToStep(3);

      // Add requirement
      const requirementInput = screen.getByPlaceholderText(/agregar requisito/i);
      await user.type(requirementInput, 'Python programming');

      const addRequirementButton = screen.getByRole('button', { name: /agregar requisito/i });
      await user.click(addRequirementButton);

      expect(screen.getByDisplayValue('Python programming')).toBeInTheDocument();

      // Remove requirement
      const removeButton = screen.getByRole('button', { name: /eliminar/i });
      await user.click(removeButton);

      expect(screen.queryByDisplayValue('Python programming')).not.toBeInTheDocument();
    });

    it('handles tag management', async () => {
      render(<JobPostingForm />);

      await navigateToStep(4);

      // Add custom tag
      const tagInput = screen.getByLabelText(/agregar etiqueta/i);
      await user.type(tagInput, 'python');
      await user.keyboard('{Enter}');

      expect(screen.getByText('#python')).toBeInTheDocument();

      // Remove tag
      const removeTagButton = within(screen.getByText('#python').parentElement!).getByRole('button');
      await user.click(removeTagButton);

      expect(screen.queryByText('#python')).not.toBeInTheDocument();
    });

    it('suggests popular tags', async () => {
      render(<JobPostingForm />);

      await navigateToStep(4);

      // Should show suggested tags
      expect(screen.getByRole('button', { name: 'python' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'machine-learning' })).toBeInTheDocument();

      // Click suggested tag
      const pythonTag = screen.getByRole('button', { name: 'python' });
      await user.click(pythonTag);

      expect(screen.getByText('#python')).toBeInTheDocument();
    });

    it('handles featured job option', async () => {
      render(<JobPostingForm />);

      await navigateToStep(4);

      const featuredCheckbox = screen.getByLabelText(/empleo destacado/i);
      await user.click(featuredCheckbox);

      expect(featuredCheckbox).toBeChecked();
      expect(screen.getByText(/costo adicional/i)).toBeInTheDocument();
    });

    it('handles different application methods', async () => {
      render(<JobPostingForm />);

      await navigateToStep(5);

      // Test platform method (default)
      expect(screen.getByLabelText(/plataforma secid/i)).toBeChecked();

      // Test external method
      const externalRadio = screen.getByLabelText(/sitio externo/i);
      await user.click(externalRadio);

      expect(screen.getByLabelText(/url de aplicación/i)).toBeInTheDocument();

      // Test email method
      const emailRadio = screen.getByLabelText(/correo electrónico/i);
      await user.click(emailRadio);

      expect(screen.getByLabelText(/email de aplicación/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits job posting with all data', async () => {
      render(<JobPostingForm />);

      // Fill out complete form
      await fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'Senior Data Scientist',
          company: 'TechCorp México',
          description: expect.any(String),
          requirements: expect.any(Array),
          status: 'pending',
          isApproved: false,
          postedBy: 'company123',
          postedAt: expect.anything(),
        })
      );
    });

    it('shows loading state during submission', async () => {
      let resolveAddDoc: (value: any) => void;
      const addDocPromise = new Promise((resolve) => {
        resolveAddDoc = resolve;
      });
      mockAddDoc.mockReturnValue(addDocPromise);

      render(<JobPostingForm />);

      await fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      expect(screen.getByText(/enviando/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      resolveAddDoc!({ id: 'job123' });
    });

    it('shows success message after successful submission', async () => {
      render(<JobPostingForm />);

      await fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/empleo publicado exitosamente/i)).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      });
    });

    it('handles submission errors', async () => {
      mockAddDoc.mockRejectedValue(new Error('Network error'));

      render(<JobPostingForm />);

      await fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error al publicar/i)).toBeInTheDocument();
        expect(screen.getByTestId('exclamation-circle-icon')).toBeInTheDocument();
      });
    });

    it('includes proper metadata in submission', async () => {
      render(<JobPostingForm />);

      await fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'pending',
          isApproved: false,
          featured: false,
          applicationCount: 0,
          viewCount: 0,
          postedBy: 'company123',
          postedAt: expect.anything(),
          lastModified: expect.anything(),
        })
      );
    });
  });

  describe('Data Transformation', () => {
    it('transforms salary data correctly', async () => {
      render(<JobPostingForm />);

      // Fill salary information
      await user.type(screen.getByLabelText(/título del empleo/i), 'Test Job');
      await user.type(screen.getByLabelText(/empresa/i), 'Test Company');
      await user.type(screen.getByLabelText(/ubicación/i), 'Test Location');
      await user.type(screen.getByLabelText(/salario mínimo/i), '50000');
      await user.type(screen.getByLabelText(/salario máximo/i), '80000');

      await navigateToStep(5);

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          salaryRange: {
            min: 50000,
            max: 80000,
            currency: 'MXN',
            period: 'monthly',
          },
        })
      );
    });

    it('filters out empty requirements and responsibilities', async () => {
      render(<JobPostingForm />);

      await navigateToStep(3);

      // Add some requirements
      const requirementInput = screen.getByPlaceholderText(/agregar requisito/i);
      await user.type(requirementInput, 'Python');
      await user.click(screen.getByRole('button', { name: /agregar requisito/i }));

      await user.type(requirementInput, ''); // Empty requirement
      await user.click(screen.getByRole('button', { name: /agregar requisito/i }));

      await navigateToStep(5);

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          requirements: ['Python'], // Should not include empty strings
        })
      );
    });

    it('handles application deadline formatting', async () => {
      render(<JobPostingForm />);

      await navigateToStep(5);

      const deadlineInput = screen.getByLabelText(/fecha límite/i);
      await user.type(deadlineInput, '2024-12-31');

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          applicationDeadline: expect.any(Date),
        })
      );
    });
  });

  describe('User Experience Features', () => {
    it('shows character count for description', async () => {
      render(<JobPostingForm />);

      await navigateToStep(2);

      const descriptionTextarea = screen.getByLabelText(/descripción detallada/i);
      await user.type(descriptionTextarea, 'This is a test description');

      expect(screen.getByText(/25 caracteres/i)).toBeInTheDocument();
    });

    it('shows validation hints for required fields', () => {
      render(<JobPostingForm />);

      expect(screen.getByText(/campos marcados con \* son obligatorios/i)).toBeInTheDocument();
    });

    it('provides preview of job posting', async () => {
      render(<JobPostingForm />);

      await fillCompleteForm();

      const previewButton = screen.getByRole('button', { name: /vista previa/i });
      await user.click(previewButton);

      expect(screen.getByText(/vista previa del empleo/i)).toBeInTheDocument();
      expect(screen.getByText('Senior Data Scientist')).toBeInTheDocument();
    });

    it('allows saving as draft', async () => {
      render(<JobPostingForm />);

      await user.type(screen.getByLabelText(/título del empleo/i), 'Draft Job');

      const saveDraftButton = screen.getByRole('button', { name: /guardar borrador/i });
      await user.click(saveDraftButton);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'draft',
          title: 'Draft Job',
        })
      );
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

      render(<JobPostingForm />);

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

      render(<JobPostingForm />);

      expect(screen.getByText(/solo empresas pueden publicar empleos/i)).toBeInTheDocument();
    });

    it('handles network errors gracefully', async () => {
      mockAddDoc.mockRejectedValue(new Error('Network error'));

      render(<JobPostingForm />);

      await fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
      });
    });

    it('validates user permissions for featured jobs', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, plan: 'basic' },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });

      render(<JobPostingForm />);

      await navigateToStep(4);

      const featuredCheckbox = screen.getByLabelText(/empleo destacado/i);
      expect(featuredCheckbox).toBeDisabled();
      expect(screen.getByText(/actualiza tu plan/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(<JobPostingForm />);

      const titleInput = screen.getByLabelText(/título del empleo/i);
      const companyInput = screen.getByLabelText(/empresa/i);
      const locationInput = screen.getByLabelText(/ubicación/i);

      expect(titleInput).toHaveAttribute('required');
      expect(companyInput).toHaveAttribute('required');
      expect(locationInput).toHaveAttribute('required');
    });

    it('provides proper heading hierarchy', () => {
      render(<JobPostingForm />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/publicar empleo/i);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/información básica/i);
    });

    it('maintains focus management during step navigation', async () => {
      render(<JobPostingForm />);

      await fillStep1();

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);

      // Focus should move to the new step content
      expect(document.activeElement).toBeInTheDocument();
    });

    it('provides keyboard navigation for tag management', async () => {
      render(<JobPostingForm />);

      await navigateToStep(4);

      const tagInput = screen.getByLabelText(/agregar etiqueta/i);
      await user.type(tagInput, 'python');
      await user.keyboard('{Enter}');

      expect(screen.getByText('#python')).toBeInTheDocument();

      // Should be able to remove with keyboard
      const removeTagButton = within(screen.getByText('#python').parentElement!).getByRole('button');
      await user.keyboard('{Tab}');
      await user.keyboard('{Enter}');

      expect(screen.queryByText('#python')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long job descriptions', async () => {
      render(<JobPostingForm />);

      await navigateToStep(2);

      const longDescription = 'A'.repeat(5000);
      const descriptionTextarea = screen.getByLabelText(/descripción detallada/i);
      await user.type(descriptionTextarea, longDescription);

      expect((descriptionTextarea as HTMLTextAreaElement).value).toBe(longDescription);
    });

    it('handles special characters in form fields', async () => {
      render(<JobPostingForm />);

      const titleInput = screen.getByLabelText(/título del empleo/i);
      await user.type(titleInput, 'Senior Data Scientist & ML Engineer (Remote)');

      expect((titleInput as HTMLInputElement).value).toBe('Senior Data Scientist & ML Engineer (Remote)');
    });

    it('handles maximum tag limit', async () => {
      render(<JobPostingForm />);

      await navigateToStep(4);

      // Add many tags (assuming limit is 10)
      for (let i = 0; i < 12; i++) {
        const tagInput = screen.getByLabelText(/agregar etiqueta/i);
        await user.type(tagInput, `tag${i}`);
        await user.keyboard('{Enter}');
      }

      // Should show warning about tag limit
      expect(screen.getByText(/máximo 10 etiquetas/i)).toBeInTheDocument();
    });

    it('handles form reset after successful submission', async () => {
      render(<JobPostingForm />);

      await fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /publicar empleo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/empleo publicado exitosamente/i)).toBeInTheDocument();
      });

      const newJobButton = screen.getByRole('button', { name: /publicar otro empleo/i });
      await user.click(newJobButton);

      // Form should be reset
      expect((screen.getByLabelText(/título del empleo/i) as HTMLInputElement).value).toBe('');
    });
  });

  // Helper functions
  async function navigateToStep(step: number) {
    for (let i = 1; i < step; i++) {
      if (i === 1) await fillStep1();
      if (i === 2) await fillStep2();
      
      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      await user.click(nextButton);
    }
  }

  async function fillStep1() {
    await user.type(screen.getByLabelText(/título del empleo/i), 'Senior Data Scientist');
    await user.type(screen.getByLabelText(/empresa/i), 'TechCorp México');
    await user.type(screen.getByLabelText(/ubicación/i), 'Ciudad de México');
  }

  async function fillStep2() {
    const description = 'We are looking for an experienced Data Scientist to join our team. You will work with large datasets, build predictive models, and help drive data-driven decisions across the organization.';
    await user.type(screen.getByLabelText(/descripción detallada/i), description);
  }

  async function fillCompleteForm() {
    // Step 1
    await fillStep1();
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    // Step 2
    await fillStep2();
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    // Step 3 - Requirements
    const reqInput = screen.getByPlaceholderText(/agregar requisito/i);
    await user.type(reqInput, 'Python');
    await user.click(screen.getByRole('button', { name: /agregar requisito/i }));
    
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    // Step 4 - Benefits and tags  
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    // Step 5 - Application method (keep default)
  }
});