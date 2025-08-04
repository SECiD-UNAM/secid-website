import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
}));

vi.mock('@/lib/firebase-config', () => ({
  auth: {},
  db: {},
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => ({
    auth: {
      signUp: {
        title: 'Create Account',
        subtitle: 'Join the SECiD community',
        button: 'Create Account',
        google: 'Sign up with Google',
        haveAccount: 'Already have an account?',
        signIn: 'Sign in',
      },
      fields: {
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email Address',
        password: 'Password',
        confirmPassword: 'Confirm Password',
      },
      acceptTerms: {
        prefix: 'I accept the',
        link: 'Terms and Conditions',
      },
      or: 'or',
      errors: {
        'auth/email-already-in-use': 'Email address is already in use',
        'auth/weak-password': 'Password is too weak',
        'auth/invalid-email': 'Invalid email address',
        default: 'An error occurred during sign up',
      },
    },
  })),
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, loading, disabled, onClick, type, ...props }: any) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={loading ? 'loading-button' : 'button'}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

describe('SignUpForm', () => {
  const mockCreateUser = vi.mocked(createUserWithEmailAndPassword);
  const mockUpdateProfile = vi.mocked(updateProfile);
  const mockSignInWithPopup = vi.mocked(signInWithPopup);
  const mockSetDoc = vi.mocked(setDoc);
  const mockDoc = vi.mocked(doc);
  const user = userEvent.setup();

  const mockUserCredential = {
    user: {
      uid: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders signup form with all required elements', () => {
      render(<SignUpForm />);

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/join the secid community/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/i accept the/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
    });

    it('renders with Spanish language', () => {
      render(<SignUpForm lang="es" />);

      expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument();
    });

    it('shows terms and conditions link', () => {
      render(<SignUpForm />);

      const termsLink = screen.getByRole('link', { name: /terms and conditions/i });
      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute('href', '/es/terms');
    });

    it('uses correct terms link for English', () => {
      render(<SignUpForm lang="en" />);

      const termsLink = screen.getByRole('link', { name: /terms and conditions/i });
      expect(termsLink).toHaveAttribute('href', '/en/terms');
    });
  });

  describe('Form Validation', () => {
    it('validates first name length', async () => {
      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'A');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('validates last name length', async () => {
      render(<SignUpForm />);

      const lastNameInput = screen.getByLabelText(/last name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(lastNameInput, 'B');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/last name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      render(<SignUpForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('validates password requirements', async () => {
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      // Test minimum length
      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      await user.clear(passwordInput);

      // Test uppercase requirement
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument();
      });

      await user.clear(passwordInput);

      // Test number requirement
      await user.type(passwordInput, 'PASSWORD');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one number/i)).toBeInTheDocument();
      });
    });

    it('validates password confirmation match', async () => {
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'DifferentPassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('validates terms acceptance', async () => {
      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('submits form with valid data', async () => {
      mockCreateUser.mockResolvedValue(mockUserCredential as any);
      mockUpdateProfile.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<SignUpForm onSuccess={onSuccess} />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateUser).toHaveBeenCalledWith(
          expect.anything(),
          'john@example.com',
          'Password123'
        );
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          mockUserCredential.user,
          { displayName: 'John Doe' }
        );
        expect(mockSetDoc).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('creates proper user profile document', async () => {
      mockCreateUser.mockResolvedValue(mockUserCredential as any);
      mockUpdateProfile.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      render(<SignUpForm lang="en" />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'Jane');
      await user.type(lastNameInput, 'Smith');
      await user.type(emailInput, 'jane@example.com');
      await user.type(passwordInput, 'SecurePassword123');
      await user.type(confirmPasswordInput, 'SecurePassword123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            uid: 'user123',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            displayName: 'Jane Smith',
            role: 'member',
            status: 'active',
            settings: expect.objectContaining({
              language: 'en',
              theme: 'system',
            }),
          })
        );
      });
    });
  });

  describe('Google Sign Up', () => {
    it('handles Google sign up successfully', async () => {
      const mockGoogleResult = {
        user: {
          uid: 'google123',
          email: 'google@example.com',
          displayName: 'Google User',
        },
      };

      mockSignInWithPopup.mockResolvedValue(mockGoogleResult as any);
      mockSetDoc.mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<SignUpForm onSuccess={onSuccess} />);

      const googleButton = screen.getByRole('button', { name: /sign up with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithPopup).toHaveBeenCalled();
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            uid: 'google123',
            firstName: 'Google',
            lastName: 'User',
            email: 'google@example.com',
          })
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles Google sign up with single name', async () => {
      const mockGoogleResult = {
        user: {
          uid: 'google123',
          email: 'google@example.com',
          displayName: 'SingleName',
        },
      };

      mockSignInWithPopup.mockResolvedValue(mockGoogleResult as any);
      mockSetDoc.mockResolvedValue(undefined);

      render(<SignUpForm />);

      const googleButton = screen.getByRole('button', { name: /sign up with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            firstName: 'SingleName',
            lastName: '',
          })
        );
      });
    });

    it('handles Google sign up errors', async () => {
      mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });

      render(<SignUpForm />);

      const googleButton = screen.getByRole('button', { name: /sign up with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/an error occurred during sign up/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays Firebase authentication errors', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });

      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email address is already in use/i)).toBeInTheDocument();
      });
    });

    it('displays generic error for unknown error codes', async () => {
      mockCreateUser.mockRejectedValue({ code: 'unknown-error' });

      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/an error occurred during sign up/i)).toBeInTheDocument();
      });
    });

    it('handles profile creation errors', async () => {
      mockCreateUser.mockResolvedValue(mockUserCredential as any);
      mockUpdateProfile.mockRejectedValue(new Error('Profile update failed'));

      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/an error occurred during sign up/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during form submission', async () => {
      let resolveCreateUser: (value: any) => void;
      const createUserPromise = new Promise((resolve) => {
        resolveCreateUser = resolve;
      });
      mockCreateUser.mockReturnValue(createUserPromise);

      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveCreateUser!(mockUserCredential);
    });

    it('shows loading state during Google sign up', async () => {
      let resolveGoogleSignIn: (value: any) => void;
      const googleSignInPromise = new Promise((resolve) => {
        resolveGoogleSignIn = resolve;
      });
      mockSignInWithPopup.mockReturnValue(googleSignInPromise);

      render(<SignUpForm />);

      const googleButton = screen.getByRole('button', { name: /sign up with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveGoogleSignIn!({
        user: {
          uid: 'google123',
          email: 'google@example.com',
          displayName: 'Google User',
        },
      });
    });

    it('disables all buttons during loading', async () => {
      let resolveCreateUser: (value: any) => void;
      const createUserPromise = new Promise((resolve) => {
        resolveCreateUser = resolve;
      });
      mockCreateUser.mockReturnValue(createUserPromise);

      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        const googleButton = screen.getByRole('button', { name: /sign up with google/i });
        expect(googleButton).toBeDisabled();
      });

      resolveCreateUser!(mockUserCredential);
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and attributes', () => {
      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(firstNameInput).toHaveAttribute('type', 'text');
      expect(firstNameInput).toHaveAttribute('autoComplete', 'given-name');
      expect(lastNameInput).toHaveAttribute('type', 'text');
      expect(lastNameInput).toHaveAttribute('autoComplete', 'family-name');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');
    });

    it('displays validation errors with proper styling', async () => {
      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'A');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/first name must be at least 2 characters/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });

    it('has proper checkbox accessibility', () => {
      render(<SignUpForm />);

      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      expect(termsCheckbox).toHaveAttribute('type', 'checkbox');
      expect(termsCheckbox).toHaveAttribute('id', 'acceptTerms');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing display name from Google', async () => {
      const mockGoogleResult = {
        user: {
          uid: 'google123',
          email: 'google@example.com',
          displayName: null,
        },
      };

      mockSignInWithPopup.mockResolvedValue(mockGoogleResult as any);
      mockSetDoc.mockResolvedValue(undefined);

      render(<SignUpForm />);

      const googleButton = screen.getByRole('button', { name: /sign up with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            firstName: '',
            lastName: '',
          })
        );
      });
    });

    it('handles empty form submission', async () => {
      render(<SignUpForm />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/last name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('handles network errors during Firestore operations', async () => {
      mockCreateUser.mockResolvedValue(mockUserCredential as any);
      mockUpdateProfile.mockResolvedValue(undefined);
      mockSetDoc.mockRejectedValue(new Error('Network error'));

      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/an error occurred during sign up/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form State Management', () => {
    it('maintains form state during interactions', async () => {
      render(<SignUpForm />);

      const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;

      await user.type(firstNameInput, 'John');
      await user.type(emailInput, 'john@example.com');

      expect(firstNameInput.value).toBe('John');
      expect(emailInput.value).toBe('john@example.com');
    });

    it('clears form errors on successful submission', async () => {
      mockCreateUser.mockResolvedValue(mockUserCredential as any);
      mockUpdateProfile.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      render(<SignUpForm />);

      // First, trigger validation errors
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
      });

      // Then fill the form correctly
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const termsCheckbox = screen.getByLabelText(/i accept the/i);

      await user.type(firstNameInput, 'John');
      await user.type(lastNameInput, 'Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateUser).toHaveBeenCalled();
      });
    });
  });
});