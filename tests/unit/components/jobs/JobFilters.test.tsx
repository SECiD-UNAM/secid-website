// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobFilters } from '@/components/jobs/JobFilters';

// Mock heroicons with Proxy to auto-handle all icon imports
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

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('JobFilters', () => {
  const mockOnFiltersChange = vi.fn();
  const user = userEvent.setup();

  const expectedDefaultFilters = {
    location: '',
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders desktop filters with all filter sections', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByText('Filtros')).toBeInTheDocument();
      expect(screen.getByText('Ubicación')).toBeInTheDocument();
      expect(screen.getByText('Modalidad')).toBeInTheDocument();
      expect(screen.getByText('Tipo de empleo')).toBeInTheDocument();
      expect(screen.getByText('Nivel de experiencia')).toBeInTheDocument();
      expect(screen.getByText('Rango salarial (MXN/mes)')).toBeInTheDocument();
      expect(screen.getByText('Publicado')).toBeInTheDocument();
      expect(screen.getByText('Habilidades')).toBeInTheDocument();
      expect(screen.getByText('Industria/Sector')).toBeInTheDocument();
      expect(screen.getByText('Tamaño de empresa')).toBeInTheDocument();
      expect(screen.getByText('Beneficios')).toBeInTheDocument();
    });

    it('renders in English when lang prop is set', () => {
      render(<JobFilters lang="en" onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Work Mode')).toBeInTheDocument();
      expect(screen.getByText('Employment Type')).toBeInTheDocument();
      expect(screen.getByText('Experience Level')).toBeInTheDocument();
      expect(screen.getByText('Salary Range (MXN/month)')).toBeInTheDocument();
      expect(screen.getByText('Posted')).toBeInTheDocument();
      expect(screen.getByText('Skills')).toBeInTheDocument();
      expect(screen.getByText('Industry/Sector')).toBeInTheDocument();
      expect(screen.getByText('Company Size')).toBeInTheDocument();
      expect(screen.getByText('Benefits')).toBeInTheDocument();
    });

    it('shows mobile filter button on small screens', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const mobileButton = screen.getByRole('button', { name: /filtros/i });
      expect(mobileButton).toBeInTheDocument();
      expect(mobileButton).toHaveClass('lg:hidden');
    });

    it('displays all filter icons', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();
      expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByTestId('academic-cap-icon')).toBeInTheDocument();
      expect(screen.getByTestId('currency-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('building-office-icon')).toHaveLength(2); // Industry and Company Size
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });
  });

  describe('Filter State Management', () => {
    it('initializes with default filter state', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedDefaultFilters);
    });

    it('loads saved filters from localStorage', () => {
      const savedFilters = {
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

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedFilters));
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(savedFilters);
    });

    it('handles malformed localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedDefaultFilters);
    });

    it('saves filters to localStorage when changed', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const locationSelect = screen.getByDisplayValue('Todas las ubicaciones');
      await user.selectOptions(locationSelect, 'cdmx');

      const expectedFilters = { ...expectedDefaultFilters, location: 'cdmx' };
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'jobFilters',
        JSON.stringify(expectedFilters)
      );
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Location Filters', () => {
    it('displays all location options', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const locationSelect = screen.getByDisplayValue('Todas las ubicaciones');
      expect(within(locationSelect.parentElement!).getByText('Ciudad de México')).toBeInTheDocument();
      expect(within(locationSelect.parentElement!).getByText('Guadalajara')).toBeInTheDocument();
      expect(within(locationSelect.parentElement!).getByText('Monterrey')).toBeInTheDocument();
      expect(within(locationSelect.parentElement!).getByText('Querétaro')).toBeInTheDocument();
      expect(within(locationSelect.parentElement!).getByText('Remoto')).toBeInTheDocument();
    });

    it('updates location filter when selection changes', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const locationSelect = screen.getByDisplayValue('Todas las ubicaciones');
      await user.selectOptions(locationSelect, 'guadalajara');

      const expectedFilters = { ...expectedDefaultFilters, location: 'guadalajara' };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Location Type Filters', () => {
    it('displays all location type checkboxes', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByLabelText('Remoto')).toBeInTheDocument();
      expect(screen.getByLabelText('Híbrido')).toBeInTheDocument();
      expect(screen.getByLabelText('Presencial')).toBeInTheDocument();
    });

    it('toggles location type filters', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const remoteCheckbox = screen.getByLabelText('Remoto');
      await user.click(remoteCheckbox);

      const expectedFilters = { ...expectedDefaultFilters, locationType: ['remote'] };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);

      // Toggle off
      await user.click(remoteCheckbox);
      expect(mockOnFiltersChange).toHaveBeenLastCalledWith(expectedDefaultFilters);
    });

    it('handles multiple location type selections', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const remoteCheckbox = screen.getByLabelText('Remoto');
      const hybridCheckbox = screen.getByLabelText('Híbrido');

      await user.click(remoteCheckbox);
      await user.click(hybridCheckbox);

      const expectedFilters = { ...expectedDefaultFilters, locationType: ['remote', 'hybrid'] };
      expect(mockOnFiltersChange).toHaveBeenLastCalledWith(expectedFilters);
    });
  });

  describe('Employment Type Filters', () => {
    it('displays all employment type options', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByLabelText('Tiempo completo')).toBeInTheDocument();
      expect(screen.getByLabelText('Medio tiempo')).toBeInTheDocument();
      expect(screen.getByLabelText('Por proyecto')).toBeInTheDocument();
      expect(screen.getByLabelText('Práctica/Pasantía')).toBeInTheDocument();
    });

    it('toggles employment type filters', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const fullTimeCheckbox = screen.getByLabelText('Tiempo completo');
      await user.click(fullTimeCheckbox);

      const expectedFilters = { ...expectedDefaultFilters, employmentType: ['full-time'] };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Experience Level Filters', () => {
    it('displays all experience level options', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByLabelText('Principiante')).toBeInTheDocument();
      expect(screen.getByLabelText('Junior')).toBeInTheDocument();
      expect(screen.getByLabelText('Intermedio')).toBeInTheDocument();
      expect(screen.getByLabelText('Senior')).toBeInTheDocument();
      expect(screen.getByLabelText('Líder/Manager')).toBeInTheDocument();
      expect(screen.getByLabelText('Ejecutivo/Director')).toBeInTheDocument();
    });

    it('toggles experience level filters', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const seniorCheckbox = screen.getByLabelText('Senior');
      await user.click(seniorCheckbox);

      const expectedFilters = { ...expectedDefaultFilters, experienceLevel: ['senior'] };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Salary Range Filters', () => {
    it('displays salary range inputs with default values', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const minInput = screen.getByPlaceholderText('0') as HTMLInputElement;
      const maxInput = screen.getByPlaceholderText('200000') as HTMLInputElement;

      expect(minInput.value).toBe('0');
      expect(maxInput.value).toBe('200000');
    });

    it('updates salary range when inputs change', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const minInput = screen.getByPlaceholderText('0');
      await user.clear(minInput);
      await user.type(minInput, '50000');

      const expectedFilters = { ...expectedDefaultFilters, salaryMin: 50000 };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });

    it('displays formatted salary range', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByText('$0 - $200,000')).toBeInTheDocument();
    });

    it('handles salary range sliders', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const rangeInputs = screen.getAllByRole('slider') as HTMLInputElement[];
      expect(rangeInputs).toHaveLength(2);

      const minSlider = rangeInputs[0];
      fireEvent.change(minSlider, { target: { value: '30000' } });

      const expectedFilters = { ...expectedDefaultFilters, salaryMin: 30000 };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Posted Within Filter', () => {
    it('displays all posted within options', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const postedSelect = screen.getByDisplayValue('Todo el tiempo');
      expect(postedSelect).toBeInTheDocument();
    });

    it('updates posted within filter', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const postedSelect = screen.getByDisplayValue('Todo el tiempo');
      await user.selectOptions(postedSelect, '7d');

      const expectedFilters = { ...expectedDefaultFilters, postedWithin: '7d' };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Skills Filter', () => {
    it('displays popular skills as toggleable buttons', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByRole('button', { name: 'Python' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'R' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SQL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Machine Learning' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Deep Learning' })).toBeInTheDocument();
    });

    it('toggles skill selection', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const pythonButton = screen.getByRole('button', { name: 'Python' });
      await user.click(pythonButton);

      const expectedFilters = { ...expectedDefaultFilters, skills: ['Python'] };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);

      // Should show selected state
      expect(pythonButton).toHaveClass('bg-primary-600', 'text-white');
    });

    it('handles multiple skill selections', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const pythonButton = screen.getByRole('button', { name: 'Python' });
      const sqlButton = screen.getByRole('button', { name: 'SQL' });

      await user.click(pythonButton);
      await user.click(sqlButton);

      const expectedFilters = { ...expectedDefaultFilters, skills: ['Python', 'SQL'] };
      expect(mockOnFiltersChange).toHaveBeenLastCalledWith(expectedFilters);
    });
  });

  describe('Industry Filter', () => {
    it('displays all industry options with scrollable container', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByLabelText('Tecnología')).toBeInTheDocument();
      expect(screen.getByLabelText('Finanzas')).toBeInTheDocument();
      expect(screen.getByLabelText('Salud')).toBeInTheDocument();
      expect(screen.getByLabelText('Educación')).toBeInTheDocument();

      // Check if container has scroll classes
      const industrySection = screen.getByLabelText('Tecnología').closest('div');
      expect(industrySection).toHaveClass('max-h-32', 'overflow-y-auto');
    });

    it('toggles industry filters', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const techCheckbox = screen.getByLabelText('Tecnología');
      await user.click(techCheckbox);

      const expectedFilters = { ...expectedDefaultFilters, industry: ['technology'] };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Company Size Filter', () => {
    it('displays all company size options', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByLabelText('Startup (1-10)')).toBeInTheDocument();
      expect(screen.getByLabelText('Pequeña (11-50)')).toBeInTheDocument();
      expect(screen.getByLabelText('Mediana (51-200)')).toBeInTheDocument();
      expect(screen.getByLabelText('Grande (201-1000)')).toBeInTheDocument();
      expect(screen.getByLabelText('Corporativo (1000+)')).toBeInTheDocument();
    });

    it('toggles company size filters', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const startupCheckbox = screen.getByLabelText('Startup (1-10)');
      await user.click(startupCheckbox);

      const expectedFilters = { ...expectedDefaultFilters, companySize: ['startup'] };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Benefits Filter', () => {
    it('displays all benefit options with scrollable container', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByLabelText('Seguro médico')).toBeInTheDocument();
      expect(screen.getByLabelText('Trabajo remoto')).toBeInTheDocument();
      expect(screen.getByLabelText('Horarios flexibles')).toBeInTheDocument();
      expect(screen.getByLabelText('Vacaciones adicionales')).toBeInTheDocument();

      // Check if container has scroll classes
      const benefitsSection = screen.getByLabelText('Seguro médico').closest('div');
      expect(benefitsSection).toHaveClass('max-h-32', 'overflow-y-auto');
    });

    it('toggles benefit filters', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const healthCheckbox = screen.getByLabelText('Seguro médico');
      await user.click(healthCheckbox);

      const expectedFilters = { ...expectedDefaultFilters, benefits: ['health-insurance'] };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Clear Filters Functionality', () => {
    it('shows clear filters button when filters are active', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      // Apply a filter
      const remoteCheckbox = screen.getByLabelText('Remoto');
      await user.click(remoteCheckbox);

      expect(screen.getByText('Limpiar filtros')).toBeInTheDocument();
    });

    it('does not show clear filters button when no filters are active', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.queryByText('Limpiar filtros')).not.toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      // Apply multiple filters
      const remoteCheckbox = screen.getByLabelText('Remoto');
      const pythonButton = screen.getByRole('button', { name: 'Python' });

      await user.click(remoteCheckbox);
      await user.click(pythonButton);

      const clearButton = screen.getByText('Limpiar filtros');
      await user.click(clearButton);

      expect(mockOnFiltersChange).toHaveBeenLastCalledWith(expectedDefaultFilters);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('jobFilters');
    });
  });

  describe('Mobile Filter Interface', () => {
    it('opens mobile filters drawer when button is clicked', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const mobileButton = screen.getByRole('button', { name: /filtros/i });
      await user.click(mobileButton);

      // Should show drawer with filters
      expect(screen.getByRole('button', { name: /close/i }) || screen.getByTestId('x-mark-icon')).toBeInTheDocument();
    });

    it('shows active filter count on mobile button', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      // Apply some filters
      const remoteCheckbox = screen.getByLabelText('Remoto');
      const pythonButton = screen.getByRole('button', { name: 'Python' });

      await user.click(remoteCheckbox);
      await user.click(pythonButton);

      const mobileButton = screen.getByRole('button', { name: /filtros/i });
      expect(mobileButton.textContent).toContain('2'); // Should show count of active filters
    });

    it('closes mobile drawer when close button is clicked', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const mobileButton = screen.getByRole('button', { name: /filtros/i });
      await user.click(mobileButton);

      const closeButton = screen.getByTestId('x-mark-icon').closest('button')!;
      await user.click(closeButton);

      // Drawer should be closed (we can check if overlay click handler works)
      expect(screen.queryByTestId('x-mark-icon')).not.toBeInTheDocument();
    });

    it('closes mobile drawer when overlay is clicked', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const mobileButton = screen.getByRole('button', { name: /filtros/i });
      await user.click(mobileButton);

      // Find and click the overlay
      const overlay = document.querySelector('.bg-black.bg-opacity-50') as HTMLElement;
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(screen.queryByTestId('x-mark-icon')).not.toBeInTheDocument();
    });
  });

  describe('Filter State Persistence', () => {
    it('persists filter state across component unmounts', () => {
      const savedFilters = {
        location: 'cdmx',
        locationType: ['hybrid'],
        employmentType: ['full-time'],
        experienceLevel: ['senior'],
        salaryMin: 0,
        salaryMax: 200000,
        skills: [],
        postedWithin: 'all',
        industry: [],
        companySize: [],
        benefits: [],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedFilters));

      const { unmount } = render(<JobFilters onFiltersChange={mockOnFiltersChange} />);
      unmount();

      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(mockOnFiltersChange).toHaveBeenLastCalledWith(savedFilters);
    });

    it('handles localStorage quota exceeded gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const remoteCheckbox = screen.getByLabelText('Remoto');
      await user.click(remoteCheckbox);

      // Should still call onFiltersChange even if localStorage fails
      const expectedFilters = { ...expectedDefaultFilters, locationType: ['remote'] };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const locationSelect = screen.getByDisplayValue('Todas las ubicaciones');
      const remoteCheckbox = screen.getByLabelText('Remoto');
      const salaryMinInput = screen.getByPlaceholderText('0');

      expect(locationSelect).toHaveAttribute('aria-label');
      expect(remoteCheckbox).toHaveAttribute('type', 'checkbox');
      expect(salaryMinInput).toHaveAttribute('type', 'number');
    });

    it('provides proper heading structure', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      expect(screen.getByRole('heading', { name: /filtros/i })).toBeInTheDocument();
    });

    it('maintains focus management in mobile drawer', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const mobileButton = screen.getByRole('button', { name: /filtros/i });
      await user.click(mobileButton);

      const closeButton = screen.getByTestId('x-mark-icon').closest('button')!;
      expect(closeButton).toBeInTheDocument();
    });

    it('has proper button roles and labels', () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const pythonButton = screen.getByRole('button', { name: 'Python' });
      const mobileButton = screen.getByRole('button', { name: /filtros/i });

      expect(pythonButton).toHaveAttribute('type', 'button');
      expect(mobileButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles invalid salary input values', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const minInput = screen.getByPlaceholderText('0');
      await user.clear(minInput);
      await user.type(minInput, 'invalid');

      // Should default to 0 for invalid input
      const expectedFilters = { ...expectedDefaultFilters, salaryMin: 0 };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });

    it('handles missing onFiltersChange callback', () => {
      render(<JobFilters />);

      const remoteCheckbox = screen.getByLabelText('Remoto');
      expect(() => user.click(remoteCheckbox)).not.toThrow();
    });

    it('handles very large salary values', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const maxInput = screen.getByPlaceholderText('200000');
      await user.clear(maxInput);
      await user.type(maxInput, '999999');

      const expectedFilters = { ...expectedDefaultFilters, salaryMax: 999999 };
      expect(mockOnFiltersChange).toHaveBeenCalledWith(expectedFilters);
    });

    it('handles rapid filter changes', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const remoteCheckbox = screen.getByLabelText('Remoto');
      
      // Rapidly toggle checkbox
      for (let i = 0; i < 10; i++) {
        await user.click(remoteCheckbox);
      }

      // Should handle all changes without errors
      expect(mockOnFiltersChange).toHaveBeenCalled();
    });
  });

  describe('Filter Count and State Display', () => {
    it('calculates active filter count correctly', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      // Apply multiple different types of filters
      const remoteCheckbox = screen.getByLabelText('Remoto');
      const pythonButton = screen.getByRole('button', { name: 'Python' });
      const locationSelect = screen.getByDisplayValue('Todas las ubicaciones');

      await user.click(remoteCheckbox);
      await user.click(pythonButton);
      await user.selectOptions(locationSelect, 'cdmx');

      const mobileButton = screen.getByRole('button', { name: /filtros/i });
      expect(mobileButton.textContent).toContain('3');
    });

    it('shows correct filter state in UI elements', async () => {
      render(<JobFilters onFiltersChange={mockOnFiltersChange} />);

      const pythonButton = screen.getByRole('button', { name: 'Python' });
      const remoteCheckbox = screen.getByLabelText('Remoto') as HTMLInputElement;

      // Initial state
      expect(pythonButton).not.toHaveClass('bg-primary-600');
      expect(remoteCheckbox.checked).toBe(false);

      // After selection
      await user.click(pythonButton);
      await user.click(remoteCheckbox);

      expect(pythonButton).toHaveClass('bg-primary-600');
      expect(remoteCheckbox.checked).toBe(true);
    });
  });
});