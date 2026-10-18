// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { AuthGuard } from '@/components/auth/AuthGuard';

// AuthGuard consumes useAuth() from AuthContext (it no longer subscribes to
// onAuthStateChanged directly), so we mock the context hook with a mutable
// shared object that each test configures before rendering.
const mockAuthContext = {
  user: null as null | Record<string, unknown>,
  loading: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => mockAuthContext),
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => ({
    common: {
      loading: 'Loading...',
    },
  })),
}));

// Tests in this file mutate shared state (mockAuthContext, sessionStore and a
// window.location stub), which is incompatible with the suite's per-file
// concurrent execution (vitest sequence.concurrent) — run sequentially.
describe.sequential('AuthGuard', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  // The global test setup replaces window.sessionStorage with a stub whose
  // methods are not usable as a real store, so we back the methods with an
  // in-memory Map to observe the returnUrl stashing behavior.
  const sessionStore = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.user = null;
    mockAuthContext.loading = false;
    sessionStore.clear();
    vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(
      (key: string, value: string) => {
        sessionStore.set(key, value);
      }
    );
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(
      (key: string) => sessionStore.get(key) ?? null
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading indicator while checking authentication', () => {
      mockAuthContext.loading = true;

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
      mockAuthContext.loading = true;

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
      mockAuthContext.user = mockUser;

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
      mockAuthContext.user = mockUser;

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
        expect(
          screen.getByRole('heading', { name: /dashboard/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /action/i })
        ).toBeInTheDocument();
      });
    });

    it('preserves children props and state', async () => {
      const TestComponent = ({ name }: { name: string }) => (
        <div data-testid="test-component">Hello {name}</div>
      );

      mockAuthContext.user = mockUser;

      render(
        <AuthGuard>
          <TestComponent name="John" />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toHaveTextContent(
          'Hello John'
        );
      });
    });
  });

  describe('Unauthenticated State', () => {
    it('shows unauthorized message and navigation when user is not authenticated', async () => {
      mockAuthContext.user = null;

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        // Title and message come from the local lang-keyed copy map
        // (defaults to Spanish)
        expect(screen.getByText('Autenticación requerida')).toBeInTheDocument();
        expect(
          screen.getByText('Inicia sesión para acceder a esta página.')
        ).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

        // Links with correct hrefs (defaults to Spanish)
        const signInLink = screen.getByText('Iniciar sesión').closest('a');
        const signUpLink = screen.getByText('Crear cuenta').closest('a');
        expect(signInLink).toHaveAttribute('href', '/es/login');
        expect(signUpLink).toHaveAttribute('href', '/es/signup');
      });
    });
  });

  // Separate describe for English locale test to avoid jsdom contamination
  describe('Unauthenticated State (English)', () => {
    it('uses English copy and links when lang="en"', async () => {
      mockAuthContext.user = null;

      render(
        <AuthGuard lang="en">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
        expect(
          screen.getByText('Please sign in to access this page.')
        ).toBeInTheDocument();

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
      mockAuthContext.user = null;

      const customFallback = (
        <div data-testid="custom-fallback">Custom unauthorized message</div>
      );

      render(
        <AuthGuard fallback={customFallback}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
        expect(
          screen.getByText('Custom unauthorized message')
        ).toBeInTheDocument();
        expect(
          screen.queryByText('Autenticación requerida')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Redirect Behavior', () => {
    // Assigning window.location.href performs a real navigation in the test
    // DOM, which both mutates the URL the assertions read and poisons later
    // renders in this file — so the block swaps in an inert location stub.
    const originalLocation = window.location;
    let locationStub: {
      pathname: string;
      search: string;
      href: string;
    };

    beforeEach(() => {
      locationStub = {
        pathname: '/es/dashboard',
        search: '?tab=jobs',
        href: '',
      };
      Object.defineProperty(window, 'location', {
        value: locationStub,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('stashes the return URL when redirecting an unauthenticated user', async () => {
      mockAuthContext.user = null;

      render(
        <AuthGuard redirectTo="/es/login">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(sessionStore.get('secid_returnUrl')).toBe(
          '/es/dashboard?tab=jobs'
        );
      });
      expect(locationStub.href).toBe('/es/login');
    });

    it('does not redirect while loading', () => {
      mockAuthContext.user = null;
      mockAuthContext.loading = true;

      render(
        <AuthGuard redirectTo="/es/login">
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(sessionStore.has('secid_returnUrl')).toBe(false);
      expect(locationStub.href).toBe('');
    });

    it('does not redirect when the user is authenticated', async () => {
      mockAuthContext.user = mockUser;

      render(
        <AuthGuard redirectTo="/es/login">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
      expect(sessionStore.has('secid_returnUrl')).toBe(false);
      expect(locationStub.href).toBe('');
    });
  });

  describe('Component Props', () => {
    it('defaults to Spanish when no language prop provided', async () => {
      mockAuthContext.user = null;

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Autenticación requerida')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles undefined user properties', async () => {
      mockAuthContext.user = {
        uid: 'user123',
        email: null,
        displayName: undefined,
      };

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
      mockAuthContext.loading = true;

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
      mockAuthContext.user = null;

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', {
          name: /autenticación requerida/i,
        });
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

      mockAuthContext.user = mockUser;

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
      mockAuthContext.user = mockUser;

      render(<AuthGuard>{null}</AuthGuard>);

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });
});
