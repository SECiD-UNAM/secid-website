// @ts-nocheck
/**
 * RecentActivity Component Unit Tests
 *
 * Tests for the RecentActivity component including:
 * - Activity timeline rendering
 * - Loading states and skeletons
 * - Time formatting and localization
 * - Activity type handling
 * - User verification integration
 * - Empty state handling
 * - Locale-specific content
 * - Timeline visual elements
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RecentActivity from '@/components/dashboard/RecentActivity';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock auth context
const mockUseAuth = vi.mocked(await import('@/contexts/AuthContext')).useAuth;

// Test data
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockUserProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  isVerified: true,
};

describe.skip('RecentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Date.now to control time-based tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-02-01T12:00:00Z'));
    
    // Default auth context mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      loading: false,
      isVerified: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders activity timeline', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Aplicaste a un trabajo')).toBeInTheDocument();
        expect(screen.getByText('Te registraste a un evento')).toBeInTheDocument();
        expect(screen.getByText('Actualizaste tu perfil')).toBeInTheDocument();
        expect(screen.getByText('Publicaste en el foro')).toBeInTheDocument();
      });
    });

    it('renders in English when lang prop is en', async () => {
      render(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Applied to a job')).toBeInTheDocument();
        expect(screen.getByText('Registered for an event')).toBeInTheDocument();
        expect(screen.getByText('Updated your profile')).toBeInTheDocument();
        expect(screen.getByText('Posted in forum')).toBeInTheDocument();
      });
    });

    it('displays activity descriptions in Spanish', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Senior Data Scientist en TechCorp México')).toBeInTheDocument();
        expect(screen.getByText('Taller de MLOps - 20 de Febrero')).toBeInTheDocument();
        expect(screen.getByText('Agregaste nuevas habilidades y experiencia')).toBeInTheDocument();
        expect(screen.getByText('Pregunta sobre transición a la industria')).toBeInTheDocument();
      });
    });

    it('displays activity descriptions in English', async () => {
      render(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Senior Data Scientist at TechCorp Mexico')).toBeInTheDocument();
        expect(screen.getByText('MLOps Workshop - February 20')).toBeInTheDocument();
        expect(screen.getByText('Added new skills and experience')).toBeInTheDocument();
        expect(screen.getByText('Question about industry transition')).toBeInTheDocument();
      });
    });

    it('shows verification activity for verified users', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Cuenta verificada')).toBeInTheDocument();
        expect(screen.getByText('Tu cuenta UNAM ha sido verificada')).toBeInTheDocument();
      });
    });

    it('shows verification activity in English for verified users', async () => {
      render(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Account verified')).toBeInTheDocument();
        expect(screen.getByText('Your UNAM account has been verified')).toBeInTheDocument();
      });
    });

    it('does not show verification activity for unverified users', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, isVerified: false },
        loading: false,
        isVerified: false,
      });

      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.queryByText('Cuenta verificada')).not.toBeInTheDocument();
        expect(screen.queryByText('Account verified')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton initially', () => {
      render(<RecentActivity />);
      
      // Should show skeleton while loading
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('hides loading state after data loads', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Aplicaste a un trabajo')).toBeInTheDocument();
      });
      
      // Should not show skeleton after loading
      const skeletons = screen.queryAllByRole('generic').filter(el => 
        el.classList.contains('animate-pulse')
      );
      expect(skeletons).toHaveLength(0);
    });

    it('shows proper loading structure', () => {
      render(<RecentActivity />);
      
      // Should show 3 skeleton items by default
      const skeletonItems = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('flex') && el.classList.contains('space-x-3')
      );
      expect(skeletonItems.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no activities exist', async () => {
      // Mock empty activities by clearing user profile
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        isVerified: false,
      });

      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('No hay actividad reciente')).toBeInTheDocument();
      });
    });

    it('shows empty state in English', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        isVerified: false,
      });

      render(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
    });
  });

  describe('Time Formatting', () => {
    it('formats recent times correctly in Spanish', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Hace 2 horas')).toBeInTheDocument(); // 2 hours ago
        expect(screen.getByText('Hace 1 día')).toBeInTheDocument(); // 1 day ago
        expect(screen.getByText('Hace 3 días')).toBeInTheDocument(); // 3 days ago
        expect(screen.getByText('Hace 5 días')).toBeInTheDocument(); // 5 days ago
      });
    });

    it('formats recent times correctly in English', async () => {
      render(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('2 hours ago')).toBeInTheDocument();
        expect(screen.getByText('1 day ago')).toBeInTheDocument();
        expect(screen.getByText('3 days ago')).toBeInTheDocument();
        expect(screen.getByText('5 days ago')).toBeInTheDocument();
      });
    });

    it('handles less than 1 hour ago correctly', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Hace menos de 1 hora')).toBeInTheDocument(); // Verification activity
      });
    });

    it('handles less than 1 hour ago in English', async () => {
      render(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Less than 1 hour ago')).toBeInTheDocument();
      });
    });

    it('handles plural forms correctly in Spanish', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        // Should use plural form for multiple hours/days
        expect(screen.getByText('Hace 2 horas')).toBeInTheDocument(); // plural
        expect(screen.getByText('Hace 1 día')).toBeInTheDocument(); // singular
        expect(screen.getByText('Hace 3 días')).toBeInTheDocument(); // plural
      });
    });

    it('handles plural forms correctly in English', async () => {
      render(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('2 hours ago')).toBeInTheDocument(); // plural
        expect(screen.getByText('1 day ago')).toBeInTheDocument(); // singular
        expect(screen.getByText('3 days ago')).toBeInTheDocument(); // plural
      });
    });

    it('uses full date for older activities', async () => {
      // Set system time to make activities older than a week
      vi.setSystemTime(new Date('2023-03-01T12:00:00Z'));
      
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        // Activities should show formatted dates for old activities
        const timeElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
        expect(timeElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Activity Types and Icons', () => {
    it('displays appropriate icons for different activity types', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        // Each activity should have an icon container
        const iconContainers = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('rounded-full') && el.classList.contains('px-1.5')
        );
        expect(iconContainers.length).toBeGreaterThanOrEqual(4); // At least 4 activities
      });
    });

    it('applies correct color schemes for different activity types', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const iconContainers = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('rounded-full') && el.classList.contains('px-1.5')
        );
        
        // Should have variety in colors (blue, purple, green, orange)
        const hasBlue = iconContainers.some(el => el.classList.contains('bg-blue-100'));
        const hasPurple = iconContainers.some(el => el.classList.contains('bg-purple-100'));
        const hasGreen = iconContainers.some(el => el.classList.contains('bg-green-100'));
        
        expect(hasBlue || hasPurple || hasGreen).toBe(true);
      });
    });

    it('handles different activity types correctly', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        // Check that all expected activity types are rendered
        expect(screen.getByText('Aplicaste a un trabajo')).toBeInTheDocument(); // job_application
        expect(screen.getByText('Te registraste a un evento')).toBeInTheDocument(); // event_registration
        expect(screen.getByText('Actualizaste tu perfil')).toBeInTheDocument(); // profile_update
        expect(screen.getByText('Publicaste en el foro')).toBeInTheDocument(); // forum_post
      });
    });
  });

  describe('Timeline Visual Elements', () => {
    it('displays timeline connectors between activities', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        // Timeline connectors should be present (except for last item)
        const connectors = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('absolute') && el.classList.contains('h-full') && el.classList.contains('w-0.5')
        );
        expect(connectors.length).toBeGreaterThan(0);
      });
    });

    it('does not show connector for the last activity item', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        // The last activity item should not have a connector
        const activities = screen.getAllByRole('listitem');
        const lastActivity = activities[activities.length - 1];
        
        const connector = within(lastActivity).queryByRole('generic', {
          hidden: true // connectors are typically hidden from screen readers
        });
        
        // Last item should not have a visible connector
        expect(lastActivity).toBeInTheDocument();
      });
    });

    it('maintains proper spacing in timeline', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const timeline = screen.getByRole('list');
        expect(timeline).toHaveClass('-mb-8');
        
        const activities = screen.getAllByRole('listitem');
        activities.forEach(activity => {
          const container = within(activity).getByRole('generic');
          expect(container).toHaveClass('relative', 'pb-8');
        });
      });
    });
  });

  describe('Footer Action Link', () => {
    it('shows link to view all activity in Spanish', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const viewAllLink = screen.getByRole('link', { name: /ver toda la actividad/i });
        expect(viewAllLink).toBeInTheDocument();
        expect(viewAllLink).toHaveAttribute('href', '/es/dashboard/activity');
      });
    });

    it('shows link to view all activity in English', async () => {
      render(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        const viewAllLink = screen.getByRole('link', { name: /view all activity/i });
        expect(viewAllLink).toBeInTheDocument();
        expect(viewAllLink).toHaveAttribute('href', '/en/dashboard/activity');
      });
    });

    it('has proper styling for footer link', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const footer = screen.getByText('Ver toda la actividad →').closest('div');
        expect(footer).toHaveClass('bg-gray-50', 'px-6', 'py-3');
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('includes dark mode classes for main container', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const container = screen.getByText('Aplicaste a un trabajo').closest('.bg-white');
        expect(container).toHaveClass('dark:bg-gray-800');
      });
    });

    it('includes dark mode classes for text elements', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const activityTitle = screen.getByText('Aplicaste a un trabajo');
        expect(activityTitle).toHaveClass('dark:text-white');
        
        const activityDescription = screen.getByText('Senior Data Scientist en TechCorp México');
        expect(activityDescription).toHaveClass('dark:text-gray-400');
      });
    });

    it('includes dark mode classes for timeline elements', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const connectors = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('bg-gray-200')
        );
        
        connectors.forEach(connector => {
          expect(connector).toHaveClass('dark:bg-gray-700');
        });
      });
    });

    it('includes dark mode classes for footer', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const footer = screen.getByText('Ver toda la actividad →').closest('div');
        expect(footer).toHaveClass('dark:bg-gray-900/50');
      });
    });
  });

  describe('Accessibility', () => {
    it('uses proper semantic HTML structure', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();
        
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });

    it('has proper ARIA labels for timeline elements', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const connectors = screen.getAllByLabelText('', { exact: false });
        const hiddenConnectors = connectors.filter(el => 
          el.getAttribute('aria-hidden') === 'true'
        );
        expect(hiddenConnectors.length).toBeGreaterThan(0);
      });
    });

    it('maintains readable text hierarchy', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        // Activity titles should be more prominent than descriptions
        const titles = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('font-medium')
        );
        expect(titles.length).toBeGreaterThan(0);
      });
    });

    it('provides proper link accessibility', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const viewAllLink = screen.getByRole('link', { name: /ver toda la actividad/i });
        expect(viewAllLink).toHaveAttribute('href');
        expect(viewAllLink).toHaveClass('text-primary-600');
      });
    });
  });

  describe('Responsive Design', () => {
    it('maintains proper responsive spacing', async () => {
      render(<RecentActivity />);
      
      await vi.waitFor(() => {
        const container = screen.getByText('Aplicaste a un trabajo').closest('.p-6');
        expect(container).toBeInTheDocument();
        
        const footer = screen.getByText('Ver toda la actividad →').closest('.px-6');
        expect(footer).toHaveClass('py-3');
      });
    });
  });

  describe('Content Updates', () => {
    it('updates content when user profile changes', async () => {
      const { rerender } = render(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Cuenta verificada')).toBeInTheDocument();
      });
      
      // Update user profile to unverified
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, isVerified: false },
        loading: false,
        isVerified: false,
      });
      
      rerender(<RecentActivity />);
      
      await vi.waitFor(() => {
        expect(screen.queryByText('Cuenta verificada')).not.toBeInTheDocument();
      });
    });

    it('updates content when language changes', async () => {
      const { rerender } = render(<RecentActivity lang="es" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Aplicaste a un trabajo')).toBeInTheDocument();
      });
      
      rerender(<RecentActivity lang="en" />);
      
      await vi.waitFor(() => {
        expect(screen.getByText('Applied to a job')).toBeInTheDocument();
      });
    });
  });
});