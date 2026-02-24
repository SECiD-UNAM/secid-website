// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';
import { signIn, resetPassword, updateLastLogin } from '@/lib/auth';
import { getTwoFactorStatus } from '@/lib/auth/two-factor';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
  resetPassword: vi.fn(),
  updateLastLogin: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/auth/two-factor', () => ({
  getTwoFactorStatus: vi.fn(),
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => ({
    auth: {
      signIn: {
        title: 'Sign in',
        subtitle: 'Access your SECiD account',
      },
      fields: {
        email: 'Email address',
        password: 'Password',
      },
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot your password?',
      signInButton: 'Sign in',
      errors: {
        'auth/user-not-found': 'No account found with this email address',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/too-many-requests': 'Too many failed attempts. Try again later',
        'auth/network-request-failed': 'Connection error. Check your internet',
        default: 'Sign in error. Please try again',
      },
    },
  })),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

vi.mock('@/components/auth/SocialLoginButtons', () => ({
  default: ({ onSuccess, onError, disabled }: any) => (
    <div data-testid="social-login-buttons">
      <button
        onClick={() => onSuccess?.()}
        disabled={disabled}
        data-testid="google-login"
      >
        Sign in with Google
      </button>
      <button
        onClick={() => onError?.('Social login error')}
        data-testid="social-error"
      >
        Trigger Error
      </button>
    </div>
  ),
}));

vi.mock('@/components/auth/TwoFactorVerification', () => ({
  default: ({ onSuccess, onCancel }: any) => (
    <div data-testid="two-factor-verification">
      <button onClick={() => onSuccess?.()} data-testid="2fa-success">
        Complete 2FA
      </button>
      <button onClick={() => onCancel?.()} data-testid="2fa-cancel">
        Cancel 2FA
      </button>
    </div>
  ),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe.skip('LoginForm', () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockSignIn = vi.mocked(signIn);
  const mockResetPassword = vi.mocked(resetPassword);
  const mockUpdateLastLogin = vi.mocked(updateLastLogin);
  const mockGetTwoFactorStatus = vi.mocked(getTwoFactorStatus);
  const mockToast = vi.mocked(toast);
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders login form with all required elements', () => {
      render(<LoginForm />);

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/access your secid account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /forgot your password/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByTestId('social-login-buttons')).toBeInTheDocument();
    });

    it('renders with Spanish language', () => {
      render(<LoginForm lang="es" />);

      expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
      expect(screen.getByText(/accede a tu cuenta de secid/i)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<LoginForm className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('shows password toggle button', () => {
      render(<LoginForm />);
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i }) || 
                           document.querySelector('button[type="button"]');
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('validates password length', async () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, '123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('requires both email and password', async () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('shows password strength indicator on focus', async () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.click(passwordInput);
      await user.type(passwordInput, 'Password123!');

      await waitFor(() => {
        expect(screen.getByText(/password strength/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('toggles password visibility', async () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      const toggleButtons = document.querySelectorAll('button[type="button"]');
      const toggleButton = Array.from(toggleButtons).find(btn => 
        btn.querySelector('svg') || btn.textContent?.includes('Show') || btn.textContent?.includes('Hide')
      );

      expect(passwordInput.type).toBe('password');

      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput.type).toBe('text');
      }
    });

    it('handles remember me checkbox', async () => {
      render(<LoginForm />);

      const rememberCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
      expect(rememberCheckbox.checked).toBe(false);

      await user.click(rememberCheckbox);
      expect(rememberCheckbox.checked).toBe(true);
    });

    it('opens forgot password modal', async () => {
      render(<LoginForm />);

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot your password/i });
      await user.click(forgotPasswordButton);

      await waitFor(() => {
        expect(screen.getByText(/recover password/i)).toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      mockSignIn.mockResolvedValue(mockUser as any);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: false });

      const onSuccess = vi.fn();
      render(<LoginForm onSuccess={onSuccess} />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays authentication errors', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/incorrect password/i)).toBeInTheDocument();
        expect(mockToast.error).toHaveBeenCalledWith('Incorrect password');
      });
    });

    it('displays generic error for unknown error codes', async () => {
      mockSignIn.mockRejectedValue({ code: 'unknown-error' });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/sign in error. please try again/i)).toBeInTheDocument();
      });
    });

    it('handles social login errors', async () => {
      render(<LoginForm />);

      const socialErrorButton = screen.getByTestId('social-error');
      await user.click(socialErrorButton);

      // The error should be set in the component state
      await waitFor(() => {
        expect(screen.getByText(/social login error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during form submission', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignIn.mockReturnValue(signInPromise);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveSignIn!(mockUser);
    });

    it('disables social login buttons during loading', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignIn.mockReturnValue(signInPromise);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        const googleButton = screen.getByTestId('google-login');
        expect(googleButton).toBeDisabled();
      });

      resolveSignIn!(mockUser);
    });
  });

  describe('Two-Factor Authentication', () => {
    it('shows 2FA verification when user has 2FA enabled', async () => {
      mockSignIn.mockResolvedValue(mockUser as any);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: true });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('two-factor-verification')).toBeInTheDocument();
      });
    });

    it('handles 2FA completion', async () => {
      mockSignIn.mockResolvedValue(mockUser as any);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: true });

      const onSuccess = vi.fn();
      render(<LoginForm onSuccess={onSuccess} />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('two-factor-verification')).toBeInTheDocument();
      });

      const twoFactorSuccessButton = screen.getByTestId('2fa-success');
      await user.click(twoFactorSuccessButton);

      await waitFor(() => {
        expect(mockUpdateLastLogin).toHaveBeenCalledWith('user123', 'email-2fa');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles 2FA cancellation', async () => {
      mockSignIn.mockResolvedValue(mockUser as any);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: true });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('two-factor-verification')).toBeInTheDocument();
      });

      const twoFactorCancelButton = screen.getByTestId('2fa-cancel');
      await user.click(twoFactorCancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('two-factor-verification')).not.toBeInTheDocument();
      });
    });
  });

  describe('Forgot Password Flow', () => {
    it('opens forgot password modal with pre-filled email', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot your password/i });
      await user.click(forgotPasswordButton);

      await waitFor(() => {
        const modalEmailInput = screen.getByDisplayValue('test@example.com');
        expect(modalEmailInput).toBeInTheDocument();
      });
    });

    it('sends password reset email', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      render(<LoginForm />);

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot your password/i });
      await user.click(forgotPasswordButton);

      await waitFor(() => {
        expect(screen.getByText(/recover password/i)).toBeInTheDocument();
      });

      const modalEmailInput = screen.getByPlaceholderText(/email address/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(modalEmailInput, 'test@example.com');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
        expect(mockToast.success).toHaveBeenCalledWith('Recovery email sent');
      });
    });

    it('handles forgot password errors', async () => {
      mockResetPassword.mockRejectedValue(new Error('Email not found'));

      render(<LoginForm />);

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot your password/i });
      await user.click(forgotPasswordButton);

      await waitFor(() => {
        expect(screen.getByText(/recover password/i)).toBeInTheDocument();
      });

      const modalEmailInput = screen.getByPlaceholderText(/email address/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(modalEmailInput, 'test@example.com');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error sending recovery email');
      });
    });
  });

  describe('Remember Me Functionality', () => {
    it('saves user data when remember me is checked', async () => {
      mockSignIn.mockResolvedValue(mockUser as any);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: false });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberCheckbox = screen.getByLabelText(/remember me/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(rememberCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'secid_remember_user',
          expect.stringContaining('test@example.com')
        );
      });
    });

    it('removes remembered data when remember me is unchecked', async () => {
      mockSignIn.mockResolvedValue(mockUser as any);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: false });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('secid_remember_user');
      });
    });

    it('loads remembered user data on component mount', () => {
      const rememberedData = JSON.stringify({
        email: 'remembered@example.com',
        timestamp: Date.now(),
      });
      mockLocalStorage.getItem.mockReturnValue(rememberedData);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const rememberCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;

      expect(emailInput.value).toBe('remembered@example.com');
      expect(rememberCheckbox.checked).toBe(true);
    });

    it('clears expired remembered data', () => {
      const expiredData = JSON.stringify({
        email: 'expired@example.com',
        timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 days ago
      });
      mockLocalStorage.getItem.mockReturnValue(expiredData);

      render(<LoginForm />);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('secid_remember_user');
    });
  });

  describe('Social Login Integration', () => {
    it('handles successful social login', async () => {
      const onSuccess = vi.fn();
      render(<LoginForm onSuccess={onSuccess} />);

      const socialLoginButton = screen.getByTestId('google-login');
      await user.click(socialLoginButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('shows validation errors with proper ARIA attributes', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email address/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });

    it('maintains focus management during interactions', async () => {
      render(<LoginForm />);

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot your password/i });
      await user.click(forgotPasswordButton);

      await waitFor(() => {
        const modal = screen.getByRole('dialog') || screen.getByText(/recover password/i).closest('div');
        expect(modal).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles network errors gracefully', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed' });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/connection error. check your internet/i)).toBeInTheDocument();
      });
    });

    it('handles malformed localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      render(<LoginForm />);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('secid_remember_user');
    });

    it('handles empty form submission', async () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });
  });
});