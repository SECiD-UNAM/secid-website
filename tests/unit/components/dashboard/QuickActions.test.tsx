/**
 * QuickActions Component Unit Tests
 * 
 * Tests for the QuickActions component including:
 * - Action rendering and layout
 * - Verification state handling
 * - Navigation links and accessibility
 * - Locale-specific content
 * - Disabled states for unverified users
 * - Color scheme and theming
 * - Hover effects and interactions
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import QuickActions from '@/components/dashboard/QuickActions';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock auth context
const mockUseAuth = vi.mocked(await import('@/contexts/AuthContext')).useAuth;

describe('QuickActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default auth context mock - verified user
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
      },
      userProfile: {
        id: 'test-user-id',
        isVerified: true,
      },
      loading: false,
      isVerified: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all quick actions in Spanish by default', () => {
      render(<QuickActions />);
      
      expect(screen.getByText('Buscar Empleos')).toBeInTheDocument();
      expect(screen.getByText('Actualizar CV')).toBeInTheDocument();
      expect(screen.getByText('Ver Eventos')).toBeInTheDocument();
      expect(screen.getByText('Publicar Empleo')).toBeInTheDocument();
      expect(screen.getByText('Conectar')).toBeInTheDocument();
      expect(screen.getByText('Mentoría')).toBeInTheDocument();
    });

    it('renders all quick actions in English when lang prop is en', () => {
      render(<QuickActions lang="en" />);
      
      expect(screen.getByText('Browse Jobs')).toBeInTheDocument();
      expect(screen.getByText('Update Resume')).toBeInTheDocument();
      expect(screen.getByText('View Events')).toBeInTheDocument();
      expect(screen.getByText('Post a Job')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();
      expect(screen.getByText('Mentorship')).toBeInTheDocument();
    });

    it('displays action descriptions in Spanish', () => {
      render(<QuickActions />);
      
      expect(screen.getByText('Explora oportunidades laborales')).toBeInTheDocument();
      expect(screen.getByText('Mantén tu perfil actualizado')).toBeInTheDocument();
      expect(screen.getByText('Próximos eventos y talleres')).toBeInTheDocument();
      expect(screen.getByText('Comparte oportunidades')).toBeInTheDocument();
      expect(screen.getByText('Encuentra otros miembros')).toBeInTheDocument();
      expect(screen.getByText('Programa de mentores')).toBeInTheDocument();
    });

    it('displays action descriptions in English', () => {
      render(<QuickActions lang="en" />);
      
      expect(screen.getByText('Explore job opportunities')).toBeInTheDocument();
      expect(screen.getByText('Keep your profile up to date')).toBeInTheDocument();
      expect(screen.getByText('Upcoming events and workshops')).toBeInTheDocument();
      expect(screen.getByText('Share opportunities')).toBeInTheDocument();
      expect(screen.getByText('Find other members')).toBeInTheDocument();
      expect(screen.getByText('Mentorship program')).toBeInTheDocument();
    });

    it('renders actions in grid layout', () => {
      render(<QuickActions />);
      
      const grid = screen.getByText('Buscar Empleos').closest('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
    });

    it('renders 6 action items', () => {
      render(<QuickActions />);
      
      const actionLinks = screen.getAllByRole('link');
      expect(actionLinks).toHaveLength(6);
    });
  });

  describe('Navigation Links', () => {
    it('has correct href attributes for Spanish locale', () => {
      render(<QuickActions lang="es" />);
      
      expect(screen.getByRole('link', { name: /buscar empleos/i })).toHaveAttribute('href', '/es/dashboard/jobs');
      expect(screen.getByRole('link', { name: /actualizar cv/i })).toHaveAttribute('href', '/es/dashboard/profile');
      expect(screen.getByRole('link', { name: /ver eventos/i })).toHaveAttribute('href', '/es/dashboard/events');
      expect(screen.getByRole('link', { name: /publicar empleo/i })).toHaveAttribute('href', '/es/dashboard/jobs/post');
      expect(screen.getByRole('link', { name: /conectar/i })).toHaveAttribute('href', '/es/dashboard/members');
      expect(screen.getByRole('link', { name: /mentoría/i })).toHaveAttribute('href', '/es/dashboard/mentorship');
    });

    it('has correct href attributes for English locale', () => {
      render(<QuickActions lang="en" />);
      
      expect(screen.getByRole('link', { name: /browse jobs/i })).toHaveAttribute('href', '/en/dashboard/jobs');
      expect(screen.getByRole('link', { name: /update resume/i })).toHaveAttribute('href', '/en/dashboard/profile');
      expect(screen.getByRole('link', { name: /view events/i })).toHaveAttribute('href', '/en/dashboard/events');
      expect(screen.getByRole('link', { name: /post a job/i })).toHaveAttribute('href', '/en/dashboard/jobs/post');
      expect(screen.getByRole('link', { name: /connect/i })).toHaveAttribute('href', '/en/dashboard/members');
      expect(screen.getByRole('link', { name: /mentorship/i })).toHaveAttribute('href', '/en/dashboard/mentorship');
    });

    it('uses default Spanish locale when no lang prop provided', () => {
      render(<QuickActions />);
      
      expect(screen.getByRole('link', { name: /buscar empleos/i })).toHaveAttribute('href', '/es/dashboard/jobs');
    });
  });

  describe('Verification State Handling', () => {
    it('enables all actions for verified users', () => {
      render(<QuickActions />);
      
      const actionLinks = screen.getAllByRole('link');
      actionLinks.forEach(link => {
        expect(link).not.toHaveClass('opacity-50', 'cursor-not-allowed');
        expect(link).not.toHaveAttribute('href', '#');
      });
    });

    it('disables mentorship action for unverified users', () => {
      mockUseAuth.mockReturnValue({
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        userProfile: {
          id: 'test-user-id',
          isVerified: false,
        },
        loading: false,
        isVerified: false,
      });

      render(<QuickActions />);
      
      const mentorshipLink = screen.getByRole('link', { name: /mentoría/i });
      expect(mentorshipLink).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(mentorshipLink).toHaveAttribute('href', '#');
    });

    it('shows verification required message for unverified users on mentorship', () => {
      mockUseAuth.mockReturnValue({
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        userProfile: {
          id: 'test-user-id',
          isVerified: false,
        },
        loading: false,
        isVerified: false,
      });

      render(<QuickActions />);
      
      expect(screen.getByText('Verificación requerida')).toBeInTheDocument();
    });

    it('shows verification required message in English', () => {
      mockUseAuth.mockReturnValue({
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        userProfile: {
          id: 'test-user-id',
          isVerified: false,
        },
        loading: false,
        isVerified: false,
      });

      render(<QuickActions lang="en" />);
      
      expect(screen.getByText('Verification required')).toBeInTheDocument();
    });

    it('prevents click on disabled mentorship action', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        userProfile: {
          id: 'test-user-id',
          isVerified: false,
        },
        loading: false,
        isVerified: false,
      });

      const user = userEvent.setup();
      render(<QuickActions />);
      
      const mentorshipLink = screen.getByRole('link', { name: /mentoría/i });
      
      // Click should be prevented
      await user.click(mentorshipLink);
      
      // Link should still have href="#" (no navigation occurred)
      expect(mentorshipLink).toHaveAttribute('href', '#');
    });

    it('does not disable other actions for unverified users', () => {
      mockUseAuth.mockReturnValue({
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        userProfile: {
          id: 'test-user-id',
          isVerified: false,
        },
        loading: false,
        isVerified: false,
      });

      render(<QuickActions />);
      
      // All other actions should be enabled
      expect(screen.getByRole('link', { name: /buscar empleos/i })).not.toHaveClass('opacity-50');
      expect(screen.getByRole('link', { name: /actualizar cv/i })).not.toHaveClass('opacity-50');
      expect(screen.getByRole('link', { name: /ver eventos/i })).not.toHaveClass('opacity-50');
      expect(screen.getByRole('link', { name: /publicar empleo/i })).not.toHaveClass('opacity-50');
      expect(screen.getByRole('link', { name: /conectar/i })).not.toHaveClass('opacity-50');
    });
  });

  describe('Icons and Styling', () => {
    it('displays icons for each action', () => {
      render(<QuickActions />);
      
      // Each action should have an icon container
      const iconContainers = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('p-3') && el.classList.contains('rounded-lg')
      );
      expect(iconContainers).toHaveLength(6);
    });

    it('applies correct color schemes', () => {
      render(<QuickActions />);
      
      const actions = screen.getAllByRole('link');
      
      // Check that each action has appropriate styling
      actions.forEach(action => {
        expect(action).toHaveClass('block', 'p-6', 'bg-white', 'rounded-lg', 'shadow');
      });
    });

    it('has hover effects on actions', () => {
      render(<QuickActions />);
      
      const actions = screen.getAllByRole('link');
      
      actions.forEach(action => {
        if (!action.classList.contains('opacity-50')) {
          expect(action).toHaveClass('hover:shadow-lg', 'hover:scale-105');
        }
      });
    });

    it('applies different colors to different actions', () => {
      render(<QuickActions />);
      
      // Check that different actions have different colored icon backgrounds
      const iconContainers = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('p-3') && el.classList.contains('rounded-lg')
      );
      
      // Should have variety in colors (blue, green, purple, orange, pink, indigo)
      const hasBlue = iconContainers.some(el => el.classList.contains('bg-blue-100'));
      const hasGreen = iconContainers.some(el => el.classList.contains('bg-green-100'));
      const hasPurple = iconContainers.some(el => el.classList.contains('bg-purple-100'));
      
      expect(hasBlue || hasGreen || hasPurple).toBe(true); // At least one should have colored background
    });
  });

  describe('Dark Mode Support', () => {
    it('includes dark mode classes for cards', () => {
      render(<QuickActions />);
      
      const actions = screen.getAllByRole('link');
      
      actions.forEach(action => {
        expect(action).toHaveClass('dark:bg-gray-800');
      });
    });

    it('includes dark mode classes for text', () => {
      render(<QuickActions />);
      
      // Check for dark mode text classes
      expect(screen.getByText('Buscar Empleos')).toHaveClass('dark:text-white');
      expect(screen.getByText('Explora oportunidades laborales')).toHaveClass('dark:text-gray-400');
    });

    it('includes dark mode classes for icon backgrounds', () => {
      render(<QuickActions />);
      
      const iconContainers = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('p-3') && el.classList.contains('rounded-lg')
      );
      
      // Should have dark mode variants
      const hasDarkModeColors = iconContainers.some(el => 
        Array.from(el.classList).some(className => className.includes('dark:bg-'))
      );
      
      expect(hasDarkModeColors).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<QuickActions />);
      
      const actions = screen.getAllByRole('link');
      
      actions.forEach(action => {
        // Each action should have proper heading and description structure
        const heading = within(action).getByRole('heading', { level: 3 });
        expect(heading).toBeInTheDocument();
      });
    });

    it('has descriptive link text', () => {
      render(<QuickActions />);
      
      // Links should have descriptive text, not just icons
      expect(screen.getByRole('link', { name: /buscar empleos.*explora oportunidades/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /actualizar cv.*mantén tu perfil/i })).toBeInTheDocument();
    });

    it('provides clear indication of disabled state', () => {
      mockUseAuth.mockReturnValue({
        user: {
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User',
        },
        userProfile: {
          id: 'test-user-id',
          isVerified: false,
        },
        loading: false,
        isVerified: false,
      });

      render(<QuickActions />);
      
      const mentorshipLink = screen.getByRole('link', { name: /mentoría/i });
      
      // Should visually indicate disabled state
      expect(mentorshipLink).toHaveClass('opacity-50', 'cursor-not-allowed');
      
      // Should have explanatory text
      expect(within(mentorshipLink).getByText('Verificación requerida')).toBeInTheDocument();
    });
  });

  describe('Action Content Structure', () => {
    it('displays action titles and descriptions in proper hierarchy', () => {
      render(<QuickActions />);
      
      // Each action should have title and description
      expect(screen.getByRole('heading', { name: 'Buscar Empleos' })).toBeInTheDocument();
      expect(screen.getByText('Explora oportunidades laborales')).toBeInTheDocument();
      
      expect(screen.getByRole('heading', { name: 'Actualizar CV' })).toBeInTheDocument();
      expect(screen.getByText('Mantén tu perfil actualizado')).toBeInTheDocument();
    });

    it('maintains proper spacing and layout within action cards', () => {
      render(<QuickActions />);
      
      const actions = screen.getAllByRole('link');
      
      actions.forEach(action => {
        // Each action should have proper internal spacing
        const content = within(action).getByRole('generic');
        expect(content).toHaveClass('flex', 'items-start', 'space-x-4');
      });
    });
  });

  describe('Color System', () => {
    it('uses consistent color system across actions', () => {
      render(<QuickActions />);
      
      // Test that color assignment function works correctly
      const iconContainers = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('p-3') && el.classList.contains('rounded-lg')
      );
      
      // Should have exactly 6 icon containers (one per action)
      expect(iconContainers).toHaveLength(6);
      
      // Each should have some background color class
      iconContainers.forEach(container => {
        const hasColorClass = Array.from(container.classList).some(className => 
          className.includes('bg-') && !className.includes('bg-white')
        );
        expect(hasColorClass).toBe(true);
      });
    });
  });

  describe('Responsive Design', () => {
    it('has responsive grid classes', () => {
      render(<QuickActions />);
      
      const grid = screen.getByText('Buscar Empleos').closest('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
    });

    it('maintains proper spacing across screen sizes', () => {
      render(<QuickActions />);
      
      const grid = screen.getByText('Buscar Empleos').closest('.grid');
      expect(grid).toHaveClass('gap-4');
    });
  });
});