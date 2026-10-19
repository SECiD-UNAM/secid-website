import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { LoginForm } from '@/components/auth/LoginForm';
import { signIn, resetPassword, updateLastLogin } from '@/lib/auth';
import { getTwoFactorStatus } from '@/lib/auth/two-factor';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
  resetPassword: vi.fn(),
  updateLastLogin: vi.fn(),
}));

vi.mock('@/lib/auth/two-factor', () => ({
  getTwoFactorStatus: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({
    children,
    loading,
    disabled,
    onClick,
    type,
    className,
  }: {
    children: ReactNode;
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit';
    className?: string;
  }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      data-testid={loading ? 'loading-button' : 'button'}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

vi.mock('@/components/auth/SocialLoginButtons', () => ({
  default: ({
    onSuccess,
    onError,
    disabled,
  }: {
    onSuccess?: () => void;
    onError?: (message: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="social-login-buttons">
      <button
        type="button"
        onClick={() => onSuccess?.()}
        disabled={disabled}
        data-testid="google-login"
      >
        Sign in with Google
      </button>
      <button
        type="button"
        onClick={() => onError?.('Social login error')}
        data-testid="social-error"
      >
        Trigger Error
      </button>
    </div>
  ),
}));

vi.mock('@/components/auth/TwoFactorVerification', () => ({
  default: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess?: () => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="two-factor-verification">
      <button
        type="button"
        onClick={() => onSuccess?.()}
        data-testid="2fa-success"
      >
        Complete 2FA
      </button>
      <button
        type="button"
        onClick={() => onCancel?.()}
        data-testid="2fa-cancel"
      >
        Cancel 2FA
      </button>
    </div>
  ),
}));

// The global setup stubs isDemoMode() as true, which renders a warning
// banner. Keep the form in its normal (configured) state here.
vi.mock('@/lib/firebase', () => ({
  isDemoMode: vi.fn(() => false),
  auth: {},
  db: {},
}));

const REMEMBER_KEY = 'secid_remember_user';

// LoginForm defaults to lang='es'; the suite asserts English copy, so every
// render opts into 'en' unless a test is explicitly about Spanish.
type LoginFormProps = ComponentProps<typeof LoginForm>;
const renderForm = (props: Partial<LoginFormProps> = {}) =>
  render(<LoginForm lang="en" {...props} />);

// Every test renders into the shared document and reads the shared
// localStorage/mock state, which is incompatible with the suite's per-file
// concurrent execution (vitest sequence.concurrent) — run sequentially.
describe('LoginForm', { concurrent: false }, () => {
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  } as unknown as User;

  const mockSignIn = vi.mocked(signIn);
  const mockResetPassword = vi.mocked(resetPassword);
  const mockUpdateLastLogin = vi.mocked(updateLastLogin);
  const mockGetTwoFactorStatus = vi.mocked(getTwoFactorStatus);
  const mockToast = vi.mocked(toast);
  const user = userEvent.setup();

  // Fills the form and submits it. Returns the onSuccess spy so tests can
  // await the end of the async submit flow instead of leaving it pending.
  const submitCredentials = async (
    email = 'test@example.com',
    password = 'password123',
    props: Partial<LoginFormProps> = {}
  ) => {
    const onSuccess = vi.fn();
    renderForm({ onSuccess, ...props });

    await user.type(screen.getByLabelText(/email address/i), email);
    await user.type(screen.getByLabelText(/^password$/i), password);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    return onSuccess;
  };

  const openForgotPasswordModal = async () => {
    await user.click(
      screen.getByRole('button', { name: /forgot your password/i })
    );
    await screen.findByRole('heading', { name: /recover password/i });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: false });
    mockUpdateLastLogin.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders login form with all required elements', () => {
      renderForm();

      expect(
        screen.getByRole('heading', { name: /^sign in$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/access your secid account/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /forgot your password/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^sign in$/i })
      ).toBeInTheDocument();
      expect(screen.getByTestId('social-login-buttons')).toBeInTheDocument();
    });

    it('renders in Spanish by default', () => {
      render(<LoginForm />);

      expect(
        screen.getByRole('heading', { name: /iniciar sesión/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/accede a tu cuenta de secid/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = renderForm({ className: 'custom-class' });
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('shows a labelled password visibility toggle', () => {
      renderForm();

      expect(
        screen.getByRole('button', { name: /show password/i })
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    // The form has no `noValidate`, so <input type="email"> lets the browser
    // reject obviously malformed values before react-hook-form/zod runs.
    it('lets native validation block a malformed email', async () => {
      renderForm();

      const emailInput = screen.getByLabelText(
        /email address/i
      ) as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      expect(emailInput.validity.typeMismatch).toBe(true);
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    // `user@localhost` passes the browser's permissive email check but
    // fails zod's `.email()` (no TLD), so this exercises the schema path.
    it('validates email format with the schema', async () => {
      renderForm();

      await user.type(
        screen.getByLabelText(/email address/i),
        'user@localhost'
      );
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      expect(
        await screen.findByText(/invalid email address/i)
      ).toBeInTheDocument();
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
      renderForm();

      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      );
      await user.type(screen.getByLabelText(/^password$/i), '123');
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      expect(
        await screen.findByText(/password must be at least 6 characters/i)
      ).toBeInTheDocument();
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('requires both email and password on empty submission', async () => {
      renderForm();

      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      expect(
        await screen.findByText(/invalid email address/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/password must be at least 6 characters/i)
      ).toBeInTheDocument();
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('shows password strength indicator while the password is focused', async () => {
      renderForm();

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.click(passwordInput);
      await user.type(passwordInput, 'Password123!');

      expect(await screen.findByText(/password strength/i)).toBeInTheDocument();
      expect(screen.getByText(/very strong/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('toggles password visibility', async () => {
      renderForm();

      const passwordInput = screen.getByLabelText(
        /^password$/i
      ) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      await user.click(screen.getByRole('button', { name: /show password/i }));
      expect(passwordInput.type).toBe('text');

      await user.click(screen.getByRole('button', { name: /hide password/i }));
      expect(passwordInput.type).toBe('password');
    });

    it('handles remember me checkbox', async () => {
      renderForm();

      const rememberCheckbox = screen.getByLabelText(
        /remember me/i
      ) as HTMLInputElement;
      expect(rememberCheckbox.checked).toBe(false);

      await user.click(rememberCheckbox);
      expect(rememberCheckbox.checked).toBe(true);
    });

    it('opens forgot password modal', async () => {
      renderForm();

      await openForgotPasswordModal();

      expect(
        screen.getByRole('heading', { name: /recover password/i })
      ).toBeInTheDocument();
    });

    it('submits form with valid data', async () => {
      mockSignIn.mockResolvedValue(mockUser);

      const onSuccess = await submitCredentials();

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
      expect(mockSignIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(mockGetTwoFactorStatus).toHaveBeenCalledWith('user123');
      expect(mockUpdateLastLogin).toHaveBeenCalledWith('user123', 'email');
      expect(mockToast.success).toHaveBeenCalledWith('Welcome!');
    });
  });

  describe('Error Handling', () => {
    it('displays authentication errors', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });

      const onSuccess = await submitCredentials(
        'test@example.com',
        'wrongpassword'
      );

      expect(
        await screen.findByText(/incorrect password/i)
      ).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalledWith('Incorrect password');
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('explains auth/invalid-credential (bad password or Google-only account)', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });

      await submitCredentials('google-only@example.com', 'whatever');

      const message = await screen.findByText(
        /incorrect email or password.*signed up with google/i
      );
      expect(message).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalledWith(message.textContent);
    });

    it('explains auth/invalid-credential in Spanish', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });

      const onSuccess = vi.fn();
      render(<LoginForm lang="es" onSuccess={onSuccess} />);

      await user.type(
        screen.getByLabelText(/correo electrónico/i),
        'google-only@example.com'
      );
      await user.type(screen.getByLabelText(/^contraseña$/i), 'whatever');
      await user.click(
        screen.getByRole('button', { name: /^iniciar sesión$/i })
      );

      expect(
        await screen.findByText(
          /correo o contraseña incorrectos.*te registraste con google/i
        )
      ).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('displays generic error for unknown error codes', async () => {
      mockSignIn.mockRejectedValue({ code: 'unknown-error' });

      await submitCredentials();

      expect(
        await screen.findByText(/sign in error\. please try again/i)
      ).toBeInTheDocument();
    });

    it('falls back to the error message when there is no code', async () => {
      mockSignIn.mockRejectedValue(new Error('auth/too-many-requests'));

      await submitCredentials();

      expect(
        await screen.findByText(/too many failed attempts/i)
      ).toBeInTheDocument();
    });

    it('handles social login errors', async () => {
      renderForm();

      await user.click(screen.getByTestId('social-error'));

      expect(
        await screen.findByText(/social login error/i)
      ).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state and disables social login during submission', async () => {
      let resolveSignIn: (value: User) => void = () => {};
      mockSignIn.mockReturnValue(
        new Promise<User>((resolve) => {
          resolveSignIn = resolve;
        })
      );

      const onSuccess = await submitCredentials();

      expect(await screen.findByTestId('loading-button')).toBeInTheDocument();
      expect(screen.getByTestId('google-login')).toBeDisabled();

      resolveSignIn(mockUser);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
      expect(screen.queryByTestId('loading-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('google-login')).toBeEnabled();
    });
  });

  describe('Two-Factor Authentication', () => {
    it('shows 2FA verification when user has 2FA enabled', async () => {
      mockSignIn.mockResolvedValue(mockUser);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: true });

      const onSuccess = await submitCredentials();

      expect(
        await screen.findByTestId('two-factor-verification')
      ).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(mockUpdateLastLogin).not.toHaveBeenCalled();
    });

    it('handles 2FA completion', async () => {
      mockSignIn.mockResolvedValue(mockUser);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: true });

      const onSuccess = await submitCredentials();
      await screen.findByTestId('two-factor-verification');

      await user.click(screen.getByTestId('2fa-success'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
      expect(mockUpdateLastLogin).toHaveBeenCalledWith('user123', 'email-2fa');
      expect(mockToast.success).toHaveBeenCalledWith(
        'Authentication successful!'
      );
    });

    it('handles 2FA cancellation', async () => {
      mockSignIn.mockResolvedValue(mockUser);
      mockGetTwoFactorStatus.mockResolvedValue({ isEnabled: true });

      const onSuccess = await submitCredentials();
      await screen.findByTestId('two-factor-verification');

      await user.click(screen.getByTestId('2fa-cancel'));

      await waitFor(() => {
        expect(
          screen.queryByTestId('two-factor-verification')
        ).not.toBeInTheDocument();
      });
      expect(
        screen.getByRole('heading', { name: /^sign in$/i })
      ).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Forgot Password Flow', () => {
    it('opens forgot password modal with pre-filled email', async () => {
      renderForm();

      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      );
      await openForgotPasswordModal();

      expect(screen.getByPlaceholderText(/email address/i)).toHaveValue(
        'test@example.com'
      );
    });

    it('sends password reset email', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      renderForm();
      await openForgotPasswordModal();

      await user.type(
        screen.getByPlaceholderText(/email address/i),
        'test@example.com'
      );
      await user.click(screen.getByRole('button', { name: /^send$/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
      });
      expect(mockToast.success).toHaveBeenCalledWith('Recovery email sent');
      expect(
        await screen.findByText(/we have sent an email with instructions/i)
      ).toBeInTheDocument();
    });

    it('requires an email before sending the reset link', async () => {
      renderForm();
      await openForgotPasswordModal();

      await user.click(screen.getByRole('button', { name: /^send$/i }));

      expect(mockToast.error).toHaveBeenCalledWith(
        'Please enter your email address'
      );
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('handles forgot password errors', async () => {
      mockResetPassword.mockRejectedValue(new Error('Email not found'));

      renderForm();
      await openForgotPasswordModal();

      await user.type(
        screen.getByPlaceholderText(/email address/i),
        'test@example.com'
      );
      await user.click(screen.getByRole('button', { name: /^send$/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Error sending recovery email'
        );
      });
      expect(
        screen.queryByText(/we have sent an email with instructions/i)
      ).not.toBeInTheDocument();
    });

    it('closes the modal on cancel', async () => {
      renderForm();
      await openForgotPasswordModal();

      await user.click(screen.getByRole('button', { name: /^cancel$/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: /recover password/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Remember Me Functionality', () => {
    it('saves user data when remember me is checked', async () => {
      mockSignIn.mockResolvedValue(mockUser);

      const onSuccess = vi.fn();
      renderForm({ onSuccess });

      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      );
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.click(screen.getByLabelText(/remember me/i));
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
      const stored = JSON.parse(
        window.localStorage.getItem(REMEMBER_KEY) ?? 'null'
      );
      expect(stored).toMatchObject({ email: 'test@example.com' });
      expect(typeof stored.timestamp).toBe('number');
    });

    it('removes remembered data when remember me is unchecked', async () => {
      mockSignIn.mockResolvedValue(mockUser);
      window.localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({ email: 'old@example.com', timestamp: Date.now() })
      );

      const onSuccess = vi.fn();
      renderForm({ onSuccess });

      // The remembered email is pre-filled and the box pre-checked; the
      // user replaces the email and opts out of being remembered.
      await user.clear(screen.getByLabelText(/email address/i));
      await user.type(
        screen.getByLabelText(/email address/i),
        'test@example.com'
      );
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.click(screen.getByLabelText(/remember me/i));
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
      expect(window.localStorage.getItem(REMEMBER_KEY)).toBeNull();
    });

    it('loads remembered user data on component mount', async () => {
      window.localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          email: 'remembered@example.com',
          timestamp: Date.now(),
        })
      );

      renderForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toHaveValue(
          'remembered@example.com'
        );
      });
      expect(screen.getByLabelText(/remember me/i)).toBeChecked();
    });

    it('clears expired remembered data', async () => {
      window.localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          email: 'expired@example.com',
          timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
        })
      );

      renderForm();

      await waitFor(() => {
        expect(window.localStorage.getItem(REMEMBER_KEY)).toBeNull();
      });
      expect(screen.getByLabelText(/email address/i)).toHaveValue('');
      expect(screen.getByLabelText(/remember me/i)).not.toBeChecked();
    });
  });

  describe('Social Login Integration', () => {
    it('handles successful social login', async () => {
      const onSuccess = vi.fn();
      renderForm({ onSuccess });

      await user.click(screen.getByTestId('google-login'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and autocomplete attributes', () => {
      renderForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('shows validation errors in the error colour', async () => {
      renderForm();

      await user.type(
        screen.getByLabelText(/email address/i),
        'user@localhost'
      );
      await user.click(screen.getByRole('button', { name: /^sign in$/i }));

      const errorMessage = await screen.findByText(/invalid email address/i);
      expect(errorMessage).toHaveClass('text-red-600');
    });
  });

  describe('Edge Cases', () => {
    it('handles network errors gracefully', async () => {
      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed' });

      await submitCredentials();

      expect(
        await screen.findByText(/connection error\. check your internet/i)
      ).toBeInTheDocument();
    });

    it('handles malformed localStorage data', async () => {
      window.localStorage.setItem(REMEMBER_KEY, 'invalid-json');

      renderForm();

      await waitFor(() => {
        expect(window.localStorage.getItem(REMEMBER_KEY)).toBeNull();
      });
      expect(screen.getByLabelText(/email address/i)).toHaveValue('');
    });

    it('still signs the user in when the 2FA status check fails', async () => {
      mockSignIn.mockResolvedValue(mockUser);
      mockGetTwoFactorStatus.mockRejectedValue(new Error('Firestore down'));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const onSuccess = await submitCredentials();

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
      expect(
        screen.queryByTestId('two-factor-verification')
      ).not.toBeInTheDocument();
      expect(warn).toHaveBeenCalled();
    });
  });
});
