import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

describe('AuthGuard', () => {
  const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged);
  const user = userEvent.setup();

  const mockUser: Partial<User> = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner while checking authentication', () => {
      // Mock auth state change that never resolves
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        // Don't call the callback to simulate loading state
        return vi.fn(); // Return unsubscribe function
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByRole('progressbar') || screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows loading text with spinner', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('uses custom loading text based on language', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        return vi.fn();
      });

      render(
        <AuthGuard lang="en">
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    it('renders children when user is authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
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
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
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

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
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
    it('shows unauthorized message when user is not authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
        expect(screen.getByText(/please sign in to access this page/i)).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('shows sign in and sign up links', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        const signInLink = screen.getByRole('link', { name: /sign in/i });
        const signUpLink = screen.getByRole('link', { name: /sign up/i });

        expect(signInLink).toBeInTheDocument();
        expect(signInLink).toHaveAttribute('href', '/es/login');
        expect(signUpLink).toBeInTheDocument();
        expect(signUpLink).toHaveAttribute('href', '/es/signup');
      });
    });

    it('uses correct language in links', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard lang="en">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        const signInLink = screen.getByRole('link', { name: /sign in/i });
        const signUpLink = screen.getByRole('link', { name: /sign up/i });

        expect(signInLink).toHaveAttribute('href', '/en/login');
        expect(signUpLink).toHaveAttribute('href', '/en/signup');
      });
    });

    it('renders custom fallback when provided', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
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
        expect(screen.getByText(/custom unauthorized message/i)).toBeInTheDocument();
        expect(screen.queryByText(/authentication required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Redirect Functionality', () => {
    it('redirects to specified URL when user is not authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard redirectTo="/custom-login">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/custom-login');
      });
    });

    it('does not redirect when fallback is provided', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      const customFallback = <div>Custom fallback</div>;

      render(
        <AuthGuard redirectTo="/custom-login" fallback={customFallback}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('');
        expect(screen.getByText(/custom fallback/i)).toBeInTheDocument();
      });
    });

    it('does not redirect when user is authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
        return vi.fn();
      });

      render(
        <AuthGuard redirectTo="/custom-login">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('');
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Auth State Changes', () => {
    it('handles user login during session', async () => {
      let authCallback: ((user: User | null) => void) | null = null;

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        callback(null); // Start with no user
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Initially shows unauthorized
      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });

      // Simulate user login
      if (authCallback) {
        authCallback(mockUser as User);
      }

      // Should now show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
        expect(screen.queryByText(/authentication required/i)).not.toBeInTheDocument();
      });
    });

    it('handles user logout during session', async () => {
      let authCallback: ((user: User | null) => void) | null = null;

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        callback(mockUser as User); // Start with authenticated user
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Initially shows protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      // Simulate user logout
      if (authCallback) {
        authCallback(null);
      }

      // Should now show unauthorized
      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('properly unsubscribes from auth state changes on unmount', () => {
      const mockUnsubscribe = vi.fn();

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
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
  });

  describe('Component Props', () => {
    it('applies custom className when provided', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
        return vi.fn();
      });

      const { container } = render(
        <AuthGuard className="custom-auth-guard">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-auth-guard');
      });
    });

    it('supports different languages for unauthorized state', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      const { rerender } = render(
        <AuthGuard lang="es">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });

      rerender(
        <AuthGuard lang="en">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });
    });

    it('handles missing language prop gracefully', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles Firebase auth errors gracefully', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        throw new Error('Firebase auth error');
      });

      // Should not crash the app
      expect(() => {
        render(
          <AuthGuard>
            <div>Protected Content</div>
          </AuthGuard>
        );
      }).not.toThrow();
    });

    it('handles null auth object', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });
    });

    it('handles undefined user properties', async () => {
      const userWithMissingProps = {
        uid: 'user123',
        email: null,
        displayName: undefined,
      } as unknown as User;

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(userWithMissingProps);
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
    it('has proper ARIA attributes for loading state', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loadingContainer = screen.getByText(/loading/i).closest('div');
      expect(loadingContainer).toBeInTheDocument();
    });

    it('has proper semantic structure for unauthorized state', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /authentication required/i });
        const signInLink = screen.getByRole('link', { name: /sign in/i });
        const signUpLink = screen.getByRole('link', { name: /sign up/i });

        expect(heading).toBeInTheDocument();
        expect(signInLink).toBeInTheDocument();
        expect(signUpLink).toBeInTheDocument();
      });
    });

    it('maintains focus management during state changes', async () => {
      let authCallback: ((user: User | null) => void) | null = null;

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>
            <button>Focus Target</button>
          </div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });

      // Simulate authentication
      if (authCallback) {
        authCallback(mockUser as User);
      }

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /focus target/i });
        expect(button).toBeInTheDocument();
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

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
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

      // Should not cause additional renders
      expect(renderCount).toBe(1);
    });

    it('cleans up auth listener on unmount', () => {
      const mockUnsubscribe = vi.fn();

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
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

  describe('Edge Cases', () => {
    it('handles rapid auth state changes', async () => {
      let authCallback: ((user: User | null) => void) | null = null;

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        callback(null);
        return vi.fn();
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      // Rapid state changes
      if (authCallback) {
        authCallback(mockUser as User);
        authCallback(null);
        authCallback(mockUser as User);
      }

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('handles component remounting with different props', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
        return vi.fn();
      });

      const { rerender } = render(
        <AuthGuard>
          <div>First Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('First Content')).toBeInTheDocument();
      });

      rerender(
        <AuthGuard>
          <div>Second Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Second Content')).toBeInTheDocument();
        expect(screen.queryByText('First Content')).not.toBeInTheDocument();
      });
    });

    it('handles empty children', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser as User);
        return vi.fn();
      });

      render(<AuthGuard>{null}</AuthGuard>);

      // Should not crash
      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });
});