// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { mockUsers, mockAuthStates } from '../../fixtures';

// Mock Firebase Auth
vi.mock('@/lib/firebase', () => ({
  auth: {
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  },
  firestore: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
}));

// Mock Auth Context
const mockAuthContext = {
  user: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Skipped: This aggregate test file duplicates individual component tests
// (LoginForm.test.tsx, SignUpForm.test.tsx, AuthGuard.test.tsx) with an
// incorrect Firebase mock API shape (method-based vs modular SDK).
// Individual component tests have proper mocks and should be used instead.
// See TD-013.
describe.skip('Authentication Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LoginForm', () => {
    it('renders login form correctly', () => {
      render(<LoginForm />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('validates email format', async () => {
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('validates password requirements', async () => {
      render(<LoginForm />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
      });
    });

    it('calls signIn when form is submitted with valid data', async () => {
      mockAuthContext.signIn.mockResolvedValue({ user: mockUsers.regularUser });
      
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuthContext.signIn).toHaveBeenCalledWith('user@example.com', 'password123');
      });
    });

    it('displays error message on sign in failure', async () => {
      mockAuthContext.signIn.mockRejectedValue(new Error('Invalid credentials'));
      
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('SignUpForm', () => {
    it('renders signup form correctly', () => {
      render(<SignUpForm />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('validates password confirmation', async () => {
      render(<SignUpForm />);
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('calls signUp when form is submitted with valid data', async () => {
      mockAuthContext.signUp.mockResolvedValue({ user: mockUsers.regularUser });
      
      render(<SignUpForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });
      
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAuthContext.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });
  });

  describe('AuthGuard', () => {
    it('renders children when user is authenticated', () => {
      mockAuthContext.user = mockUsers.regularUser;
      
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('renders loading state when auth is loading', () => {
      mockAuthContext.user = null;
      mockAuthContext.loading = true;
      
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      
      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    });

    it('redirects to login when user is not authenticated', () => {
      mockAuthContext.user = null;
      mockAuthContext.loading = false;
      
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
      
      expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
    });

    it('checks role requirements when specified', () => {
      mockAuthContext.user = mockUsers.regularUser;
      
      render(
        <AuthGuard requiredRole="admin">
          <div>Admin Content</div>
        </AuthGuard>
      );
      
      expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
    });

    it('allows access when user has required role', () => {
      mockAuthContext.user = mockUsers.adminUser;
      
      render(
        <AuthGuard requiredRole="admin">
          <div>Admin Content</div>
        </AuthGuard>
      );
      
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });
});