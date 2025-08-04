/**
 * DashboardStats Component Unit Tests
 * 
 * Tests for the DashboardStats component including:
 * - Stats fetching and display
 * - Loading states and skeletons
 * - Error handling and fallbacks
 * - User authentication integration
 * - Locale-specific content
 * - Profile completeness calculation
 * - Dark mode styling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@/lib/firebase-config', () => ({
  db: {},
}));

// Mock Firestore functions
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockGetDocs = vi.mocked(getDocs);

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
  profileCompleteness: 75,
  isVerified: true,
};

const mockApplicationsSnapshot = {
  size: 5,
  docs: [],
};

const mockEventsSnapshot = {
  size: 3,
  docs: [],
};

describe('DashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default auth context mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
      loading: false,
      isVerified: true,
    });

    // Default Firestore mocks
    mockCollection.mockReturnValue({} as any);
    mockQuery.mockReturnValue({} as any);
    mockWhere.mockReturnValue({} as any);
    mockGetDocs.mockResolvedValue(mockApplicationsSnapshot as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders stats grid', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('Aplicaciones Enviadas')).toBeInTheDocument();
        expect(screen.getByText('Eventos Registrados')).toBeInTheDocument();
        expect(screen.getByText('Conexiones')).toBeInTheDocument();
        expect(screen.getByText('Perfil Completo')).toBeInTheDocument();
      });
    });

    it('renders in English when lang prop is en', async () => {
      render(<DashboardStats lang="en" />);
      
      await waitFor(() => {
        expect(screen.getByText('Applications Sent')).toBeInTheDocument();
        expect(screen.getByText('Events Registered')).toBeInTheDocument();
        expect(screen.getByText('Connections')).toBeInTheDocument();
        expect(screen.getByText('Profile Complete')).toBeInTheDocument();
      });
    });

    it('displays stats in grid layout', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        const grid = screen.getByText('Aplicaciones Enviadas').closest('.grid');
        expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4', 'gap-4');
      });
    });
  });

  describe('Data Fetching', () => {
    it('fetches application data correctly', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith({}, 'applications');
        expect(mockWhere).toHaveBeenCalledWith('applicantId', '==', 'test-user-id');
        expect(mockGetDocs).toHaveBeenCalled();
      });
    });

    it('fetches event registration data correctly', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith({}, 'eventRegistrations');
        expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'test-user-id');
      });
    });

    it('displays fetched application count', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Applications count
      });
    });

    it('displays fetched events count', async () => {
      mockGetDocs
        .mockResolvedValueOnce(mockApplicationsSnapshot as any) // First call for applications
        .mockResolvedValueOnce(mockEventsSnapshot as any); // Second call for events
      
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Events count
      });
    });

    it('displays profile completeness from user profile', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('uses default profile completeness when not available', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, profileCompleteness: undefined },
        loading: false,
        isVerified: true,
      });
      
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('20%')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeleton while fetching data', () => {
      render(<DashboardStats />);
      
      // Should show 4 skeleton items
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('hides loading state after data is fetched', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        const skeletons = screen.queryAllByRole('generic').filter(el => 
          el.classList.contains('animate-pulse')
        );
        expect(skeletons).toHaveLength(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles Firestore errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetDocs.mockRejectedValue(new Error('Firestore error'));
      
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching stats:', expect.any(Error));
      });
      
      // Should show default values
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument(); // Default applications count
      });
      
      consoleSpy.mockRestore();
    });

    it('shows default stats when fetch fails', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network error'));
      
      render(<DashboardStats />);
      
      await waitFor(() => {
        // Should show default values for all stats
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues.length).toBeGreaterThanOrEqual(3); // At least 3 stats should be 0
        expect(screen.getByText('20%')).toBeInTheDocument(); // Default profile completeness
      });
    });
  });

  describe('No User Handling', () => {
    it('does not fetch data when user is not available', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        isVerified: false,
      });
      
      render(<DashboardStats />);
      
      // Should not call Firestore functions
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('shows loading state when user is not available', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        loading: false,
        isVerified: false,
      });
      
      render(<DashboardStats />);
      
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.classList.contains('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Stats Display', () => {
    it('displays stat cards with proper structure', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        const statCards = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('bg-white') && el.classList.contains('rounded-lg')
        );
        expect(statCards).toHaveLength(4);
      });
    });

    it('shows increase change indicators', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('+12%')).toBeInTheDocument();
        expect(screen.getByText('+3')).toBeInTheDocument();
        expect(screen.getByText('+5%')).toBeInTheDocument();
      });
    });

    it('shows appropriate change type for profile completeness', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        // Profile is 75% complete, so should show "Completar" (incomplete)
        expect(screen.getByText('Completar')).toBeInTheDocument();
      });
    });

    it('shows complete status when profile is 100%', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, profileCompleteness: 100 },
        loading: false,
        isVerified: true,
      });
      
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.getByText('Completo')).toBeInTheDocument();
      });
    });

    it('shows complete status in English', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, profileCompleteness: 100 },
        loading: false,
        isVerified: true,
      });
      
      render(<DashboardStats lang="en" />);
      
      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeInTheDocument();
      });
    });
  });

  describe('Icons and Styling', () => {
    it('displays appropriate icons for each stat', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        // Icons should be rendered (we can't easily test the actual icons, but we can check their containers)
        const iconContainers = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('p-3') && el.classList.contains('rounded-full')
        );
        expect(iconContainers).toHaveLength(4);
      });
    });

    it('applies correct color classes for increase changes', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        const increaseText = screen.getByText('+12%');
        expect(increaseText).toHaveClass('text-green-600');
      });
    });

    it('applies correct color classes for incomplete profile', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        const completeText = screen.getByText('Completar');
        expect(completeText).toHaveClass('text-yellow-600');
      });
    });

    it('applies hover effects to stat cards', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        const statCards = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('hover:shadow-lg')
        );
        expect(statCards).toHaveLength(4);
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('includes dark mode classes', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        const statCards = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('dark:bg-gray-800')
        );
        expect(statCards.length).toBeGreaterThan(0);
      });
    });

    it('includes dark mode text classes', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        const statTitles = screen.getAllByRole('generic').filter(el => 
          el.classList.contains('dark:text-gray-400')
        );
        expect(statTitles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper structure for screen readers', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        // Each stat should have a clear name and value structure
        expect(screen.getByText('Aplicaciones Enviadas')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('maintains semantic structure', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        // The component should have a grid structure with appropriate hierarchy
        const mainContainer = screen.getByText('Aplicaciones Enviadas').closest('.grid');
        expect(mainContainer).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('updates when user profile changes', async () => {
      const { rerender } = render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
      
      // Update user profile
      mockUseAuth.mockReturnValue({
        user: mockUser,
        userProfile: { ...mockUserProfile, profileCompleteness: 90 },
        loading: false,
        isVerified: true,
      });
      
      rerender(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('90%')).toBeInTheDocument();
      });
    });

    it('updates when language changes', async () => {
      const { rerender } = render(<DashboardStats lang="es" />);
      
      await waitFor(() => {
        expect(screen.getByText('Aplicaciones Enviadas')).toBeInTheDocument();
      });
      
      rerender(<DashboardStats lang="en" />);
      
      await waitFor(() => {
        expect(screen.getByText('Applications Sent')).toBeInTheDocument();
      });
    });
  });

  describe('Static Content', () => {
    it('displays static connection count', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        expect(screen.getByText('24')).toBeInTheDocument(); // Static connections count
      });
    });

    it('shows connections in correct context', async () => {
      render(<DashboardStats />);
      
      await waitFor(() => {
        // Check that 24 appears in the connections context
        const connectionsCard = screen.getByText('Conexiones').closest('div');
        expect(within(connectionsCard!).getByText('24')).toBeInTheDocument();
      });
    });
  });
});