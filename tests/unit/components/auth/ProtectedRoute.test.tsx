// @ts-nocheck
/**
 * ProtectedRoute Component Unit Tests
 *
 * IMPORTANT: Each test is in its own describe block to prevent jsdom
 * DOM contamination. The ProtectedRoute component uses useAuth() which
 * is backed by a mutable shared mock object. Tests that render different
 * states (loading, unauthenticated, authenticated, unverified, access denied)
 * contaminate jsdom for subsequent tests in the same describe block.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
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
    common: { loading: 'Loading...' },
    auth: {
      unauthorized: {
        title: 'Authentication Required',
        message: 'Please sign in to access this page.',
        signIn: 'Sign In',
      },
    },
  })),
}));

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

function resetContext() {
  mockAuthContext.user = null;
  mockAuthContext.userProfile = null;
  mockAuthContext.loading = false;
  mockAuthContext.isAuthenticated = false;
  mockAuthContext.isVerified = false;
}

function setup() {
  vi.clearAllMocks();
  resetContext();
}

function teardown() {
  cleanup();
  vi.restoreAllMocks();
}

// ---- Loading Tests ----

describe('ProtectedRoute: shows loading spinner', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = true;
    render(<ProtectedRoute><div>Protected</div></ProtectedRoute>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });
});

describe('ProtectedRoute: shows loading animation', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = true;
    render(<ProtectedRoute><div>Protected</div></ProtectedRoute>);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('ProtectedRoute: loading text', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = true;
    render(<ProtectedRoute lang="en"><div>Protected</div></ProtectedRoute>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

// ---- Unauthenticated Tests ----

describe('ProtectedRoute: unauthenticated shows sign-in', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = false;
    render(<ProtectedRoute><div>Protected</div></ProtectedRoute>);
    expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/es/login');
  });
});

describe('ProtectedRoute: unauthenticated English link', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = false;
    render(<ProtectedRoute lang="en"><div>Protected</div></ProtectedRoute>);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/en/login');
  });
});

describe('ProtectedRoute: unauthenticated prioritizes auth', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = false;
    render(
      <ProtectedRoute requireVerified={true} requireRole={['admin']}>
        <div>Protected</div>
      </ProtectedRoute>
    );
    expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
  });
});

describe('ProtectedRoute: user=null but isAuthenticated=true', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = null;
    render(<ProtectedRoute><div>Protected</div></ProtectedRoute>);
    expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
  });
});

// ---- Authenticated Tests ----

describe('ProtectedRoute: renders children when authenticated', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    render(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});

describe('ProtectedRoute: no verification required allows access', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.isVerified = false;
    render(<ProtectedRoute requireVerified={false}><div>Content</div></ProtectedRoute>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('ProtectedRoute: verified user with requireVerified', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.isVerified = true;
    render(<ProtectedRoute requireVerified={true}><div>Content</div></ProtectedRoute>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('ProtectedRoute: no role requirement allows member', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };
    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('ProtectedRoute: admin role allows admin', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = { ...mockUserProfile, role: 'admin' };
    render(<ProtectedRoute requireRole={['admin']}><div>Admin</div></ProtectedRoute>);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});

describe('ProtectedRoute: multiple roles allows matching role', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = { ...mockUserProfile, role: 'moderator' };
    render(<ProtectedRoute requireRole={['admin', 'moderator']}><div>Staff</div></ProtectedRoute>);
    expect(screen.getByText('Staff')).toBeInTheDocument();
  });
});

describe('ProtectedRoute: null profile skips role check', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = null;
    render(<ProtectedRoute requireRole={['admin']}><div>Content</div></ProtectedRoute>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('ProtectedRoute: all combined requirements met', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.isVerified = true;
    mockAuthContext.userProfile = { ...mockUserProfile, role: 'admin' };
    render(
      <ProtectedRoute requireVerified={true} requireRole={['admin']}>
        <div>Verified Admin</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Verified Admin')).toBeInTheDocument();
  });
});

// ---- Verification Denied Tests ----

describe('ProtectedRoute: blocks unverified user', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', async () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.isVerified = false;
    render(<ProtectedRoute requireVerified={true}><div>Content</div></ProtectedRoute>);
    await waitFor(() => {
      expect(screen.getByText(/unam verification required/i)).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute: verification link for unverified', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', async () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.isVerified = false;
    render(<ProtectedRoute requireVerified={true} lang="en"><div>Content</div></ProtectedRoute>);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /complete verification/i });
      expect(link).toHaveAttribute('href', '/en/dashboard/settings');
    });
  });
});

describe('ProtectedRoute: verification priority over role', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', async () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.isVerified = false;
    mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };
    render(
      <ProtectedRoute requireVerified={true} requireRole={['admin']}>
        <div>Content</div>
      </ProtectedRoute>
    );
    await waitFor(() => {
      expect(screen.getByText(/unam verification required/i)).toBeInTheDocument();
      expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    });
  });
});

// ---- Role Denied Tests ----

describe('ProtectedRoute: blocks wrong role', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', async () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };
    render(<ProtectedRoute requireRole={['admin']}><div>Admin</div></ProtectedRoute>);
    await waitFor(() => {
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute: dashboard link for wrong role', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', async () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };
    render(<ProtectedRoute requireRole={['admin']} lang="en"><div>Admin</div></ProtectedRoute>);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /go to dashboard/i });
      expect(link).toHaveAttribute('href', '/en/dashboard');
    });
  });
});

// ---- Accessibility Tests ----

describe('ProtectedRoute: loading state accessibility', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', () => {
    mockAuthContext.loading = true;
    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);
    const loadingDiv = screen.getByText(/loading/i).closest('div');
    expect(loadingDiv).toBeInTheDocument();
  });
});

describe('ProtectedRoute: access denied semantic structure', () => {
  beforeEach(setup);
  afterEach(teardown);
  it('renders', async () => {
    mockAuthContext.loading = false;
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = { ...mockUserProfile, role: 'member' };
    render(<ProtectedRoute requireRole={['admin']}><div>Admin</div></ProtectedRoute>);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument();
    });
  });
});
