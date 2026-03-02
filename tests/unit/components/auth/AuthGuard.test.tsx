// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { onAuthStateChanged, type User } from 'firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
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

describe('AuthGuard', () => {
  const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged);

  const mockUser: Partial<User> = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading indicator while checking authentication', () => {
      mockOnAuthStateChanged.mockImplementation(() => vi.fn());

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loadingElements = screen.getAllByText('Loading...');
      expect(loadingElements.length).toBeGreaterThan(0);
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('does not show protected content during loading', () => {
      mockOnAuthStateChanged.mockImplementation(() => vi.fn());

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    it('renders children when user is authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(mockUser as User);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('renders complex children components', async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(mockUser as User);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back!</p>
            <button>Action</button>
          </div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
      });
    });

    it('preserves children props and state', async () => {
      const TestComponent = ({ name }: { name: string }) => (
        <div data-testid="test-component">Hello {name}</div>
      );

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(mockUser as User);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <TestComponent name="John" />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toHaveTextContent('Hello John');
      });
    });
  });

  describe('Unauthenticated State', () => {
    it('shows unauthorized message and navigation when user is not authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        // Title and message
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
        expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

        // Links with correct hrefs (defaults to Spanish)
        const signInLink = screen.getByText('Sign In').closest('a');
        const signUpLink = screen.getByText('Sign Up').closest('a');
        expect(signInLink).toHaveAttribute('href', '/es/login');
        expect(signUpLink).toHaveAttribute('href', '/es/signup');
      });
    });
  });

  // Separate describe for English locale test to avoid jsdom contamination
  describe('Unauthenticated State (English)', () => {
    it('uses correct language in links', async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(null);
        return vi.fn();
      });

      render(
        <AuthGuard lang="en">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        const signInLink = screen.getByText('Sign In').closest('a');
        const signUpLink = screen.getByText('Sign Up').closest('a');

        expect(signInLink).toHaveAttribute('href', '/en/login');
        expect(signUpLink).toHaveAttribute('href', '/en/signup');
      });
    });
  });

  // Separate describe for fallback test to avoid jsdom contamination
  describe('Unauthenticated State (Fallback)', () => {
    it('renders custom fallback when provided', async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(null);
        return vi.fn();
      });

      const customFallback = <div data-testid="custom-fallback">Custom unauthorized message</div>;

      render(
        <AuthGuard fallback={customFallback}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
        expect(screen.getByText('Custom unauthorized message')).toBeInTheDocument();
        expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Auth Lifecycle', () => {
    it('properly unsubscribes from auth state changes on unmount', () => {
      const mockUnsubscribe = vi.fn();

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(mockUser as User);
        return mockUnsubscribe;
      });

      const { unmount } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('cleans up auth listener on unmount without extra calls', () => {
      const mockUnsubscribe = vi.fn();

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(mockUser as User);
        return mockUnsubscribe;
      });

      const { unmount } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(mockUnsubscribe).not.toHaveBeenCalled();
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Props', () => {
    it('defaults to Spanish when no language prop provided', async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles undefined user properties', async () => {
      const userWithMissingProps = {
        uid: 'user123',
        email: null,
        displayName: undefined,
      } as unknown as User;

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(userWithMissingProps);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has loading text accessible in loading state', () => {
      mockOnAuthStateChanged.mockImplementation(() => vi.fn());

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loadingElements = screen.getAllByText('Loading...');
      expect(loadingElements.length).toBeGreaterThan(0);
      const loadingContainer = loadingElements[0].closest('div');
      expect(loadingContainer).toBeInTheDocument();
    });
  });

  // Separate describe to avoid contamination from other unauthenticated tests
  describe('Accessibility (Unauthorized)', () => {
    it('has proper semantic structure for unauthorized state', async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /authentication required/i });
        expect(heading).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('does not re-render children unnecessarily', async () => {
      let renderCount = 0;
      const TestChild = () => {
        renderCount++;
        return <div>Render count: {renderCount}</div>;
      };

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(mockUser as User);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <TestChild />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Render count: 1')).toBeInTheDocument();
      });

      expect(renderCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        (callback as any)(mockUser as User);
        return vi.fn();
      });

      render(<AuthGuard>{null}</AuthGuard>);

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });
});
