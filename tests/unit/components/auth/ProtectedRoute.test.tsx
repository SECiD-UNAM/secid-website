// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Mock useAuth hook
const mockAuthContext = {
  user: null,
  userProfile: null,
  loading: false,
  isAuthenticated: false,
  isVerified: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => mockAuthContext),
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => ({
    common: {
      loading: 'Loading...',
    },
    auth: {
      unauthorized: {
        title: 'Authentication Required',
        message: 'Please sign in to access this page.',
        signIn: 'Sign In',
        signUp: 'Sign Up',
      },
    },
  })),
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

describe.skip('ProtectedRoute', () => {
  const user = userEvent.setup();

  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockUserProfile = {
    uid: 'user123',
    role: 'member' as const,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
    // Reset mock context
    mockAuthContext.user = null;
    mockAuthContext.userProfile = null;
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.isVerified = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner while checking authentication', () => {
      mockAuthContext.loading = true;

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows proper loading animation', () => {
      mockAuthContext.loading = true;

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('uses correct language for loading text', () => {
      mockAuthContext.loading = true;

      render(
        <ProtectedRoute lang="en">
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Authentication Protection', () => {
    it('redirects to login when user is not authenticated', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = false;

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/es/login');
      });
    });

    it('uses custom redirect URL', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = false;

      render(
        <ProtectedRoute redirectTo="/custom-login">
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/es/custom-login');
      });
    });

    it('includes language in redirect URL', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = false;

      render(
        <ProtectedRoute lang="en">
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/en/login');
      });
    });

    it('shows authentication required message before redirect', () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = null;

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      expect(screen.getByText(/please sign in to access this page/i)).toBeInTheDocument();
    });

    it('renders children when user is authenticated', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Verification Requirements', () => {
    it('allows access when verification is not required', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.isVerified = false;

      render(
        <ProtectedRoute requireVerified={false}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('blocks access when verification is required but user is not verified', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.isVerified = false;

      render(
        <ProtectedRoute requireVerified={true}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/unam verification required/i)).toBeInTheDocument();
        expect(screen.getByText(/please verify your unam email/i)).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('allows access when user is verified', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.isVerified = true;

      render(
        <ProtectedRoute requireVerified={true}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('shows verification link for unverified users', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.isVerified = false;

      render(
        <ProtectedRoute requireVerified={true} lang="en">
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        const verificationLink = screen.getByRole('link', { name: /complete verification/i });
        expect(verificationLink).toBeInTheDocument();
        expect(verificationLink).toHaveAttribute('href', '/en/dashboard/settings');
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('allows access when no role requirement is specified', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('allows access when user has required role', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'admin' };

      render(
        <ProtectedRoute requireRole={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });

    it('blocks access when user does not have required role', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };

      render(
        <ProtectedRoute requireRole={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      });
    });

    it('allows access when user has one of multiple required roles', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'moderator' };

      render(
        <ProtectedRoute requireRole={['admin', 'moderator']}>
          <div>Staff Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Staff Content')).toBeInTheDocument();
      });
    });

    it('shows dashboard link for users with insufficient permissions', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };

      render(
        <ProtectedRoute requireRole={['admin']} lang="en">
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        const dashboardLink = screen.getByRole('link', { name: /go to dashboard/i });
        expect(dashboardLink).toBeInTheDocument();
        expect(dashboardLink).toHaveAttribute('href', '/en/dashboard');
      });
    });

    it('handles missing user profile gracefully', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = null;

      render(
        <ProtectedRoute requireRole={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });
  });

  describe('Combined Requirements', () => {
    it('enforces both verification and role requirements', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.isVerified = false;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'admin' };

      render(
        <ProtectedRoute requireVerified={true} requireRole={['admin']}>
          <div>Verified Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/unam verification required/i)).toBeInTheDocument();
        expect(screen.queryByText('Verified Admin Content')).not.toBeInTheDocument();
      });
    });

    it('allows access when all requirements are met', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.isVerified = true;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'admin' };

      render(
        <ProtectedRoute requireVerified={true} requireRole={['admin']}>
          <div>Verified Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Verified Admin Content')).toBeInTheDocument();
      });
    });

    it('prioritizes authentication over other requirements', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = null;
      mockAuthContext.isVerified = false;

      render(
        <ProtectedRoute requireVerified={true} requireRole={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/es/login');
      });
    });

    it('prioritizes verification over role requirements', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.isVerified = false;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };

      render(
        <ProtectedRoute requireVerified={true} requireRole={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/unam verification required/i)).toBeInTheDocument();
        expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing auth context gracefully', async () => {
      // Mock useAuth to return undefined
      vi.mocked(require('@/contexts/AuthContext').useAuth).mockReturnValue(undefined);

      expect(() => {
        render(
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        );
      }).not.toThrow();
    });

    it('handles auth context errors', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = null; // Inconsistent state

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });
    });

    it('handles navigation errors gracefully', async () => {
      // Mock location.href to throw
      Object.defineProperty(window, 'location', {
        value: {
          get href() { return ''; },
          set href(value) { throw new Error('Navigation failed'); },
        },
        writable: true,
      });

      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = false;

      expect(() => {
        render(
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        );
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for loading state', () => {
      mockAuthContext.loading = true;

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const loadingContainer = screen.getByText(/loading/i).closest('div');
      expect(loadingContainer).toHaveClass('min-h-screen');
    });

    it('has proper semantic structure for error states', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };

      render(
        <ProtectedRoute requireRole={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /access denied/i });
        const link = screen.getByRole('link', { name: /go to dashboard/i });

        expect(heading).toBeInTheDocument();
        expect(link).toBeInTheDocument();
      });
    });

    it('maintains proper focus management', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = false;

      render(
        <ProtectedRoute>
          <div>
            <button>Focus Target</button>
          </div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        const signInLink = screen.getByRole('link', { name: /sign in/i });
        expect(signInLink).toBeInTheDocument();
      });
    });
  });

  describe('Component Props', () => {
    it('handles different language props', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = false;

      const { rerender } = render(
        <ProtectedRoute lang="es">
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/es/login');
      });

      window.location.href = '';

      rerender(
        <ProtectedRoute lang="en">
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/en/login');
      });
    });

    it('handles empty children', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;

      render(<ProtectedRoute>{null}</ProtectedRoute>);

      // Should not crash
      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('handles multiple children', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;

      render(
        <ProtectedRoute>
          <div>First Child</div>
          <div>Second Child</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('First Child')).toBeInTheDocument();
        expect(screen.getByText('Second Child')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;

      let renderCount = 0;
      const TestChild = () => {
        renderCount++;
        return <div>Render count: {renderCount}</div>;
      };

      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      expect(renderCount).toBe(1);
    });

    it('handles rapid state changes efficiently', async () => {
      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      // Simulate rapid auth state changes
      mockAuthContext.loading = true;
      rerender(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      rerender(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles component role strings correctly', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'company' };

      render(
        <ProtectedRoute requireRole={['company']}>
          <div>Company Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Company Content')).toBeInTheDocument();
      });
    });

    it('handles empty role requirements array', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };

      render(
        <ProtectedRoute requireRole={[]}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('handles undefined role in user profile', async () => {
      mockAuthContext.loading = false;
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = mockUser;
      mockAuthContext.userProfile = { ...mockUserProfile, role: undefined as any };

      render(
        <ProtectedRoute requireRole={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });
  });
});