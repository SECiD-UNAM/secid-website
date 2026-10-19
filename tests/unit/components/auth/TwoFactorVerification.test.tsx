import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { TwoFactorVerification } from '@/components/auth/TwoFactorVerification';
import {
  verifyTwoFactorLogin,
  useBackupCode,
  verifyTwoFactorSession,
} from '@/lib/auth/two-factor';
import toast from 'react-hot-toast';

vi.mock('@/lib/auth/two-factor', () => ({
  verifyTwoFactorLogin: vi.fn(),
  useBackupCode: vi.fn(),
  verifyTwoFactorSession: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  Shield: () => null,
  Key: () => null,
  Clock: () => null,
  AlertTriangle: () => null,
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

type Props = ComponentProps<typeof TwoFactorVerification>;

// The component defaults to lang='es' and hardcodes its copy per language;
// the suite asserts English, so every render opts into 'en' unless a test
// is explicitly about Spanish.
const renderForm = (props: Partial<Props> = {}) =>
  render(<TwoFactorVerification uid="user123" lang="en" {...props} />);

const codeInput = () =>
  screen.getByLabelText(/authentication code/i) as HTMLInputElement;
const verifyButton = () => screen.getByRole('button', { name: /verify/i });
const backupInput = () =>
  screen.getByLabelText(/backup code \(8 digits\)/i) as HTMLInputElement;
const backupSubmitButton = () =>
  screen.getByRole('button', { name: /use code/i });

// Every test renders into the shared document and shares the toast/service
// mocks, which is incompatible with the suite's per-file concurrent
// execution (vitest sequence.concurrent) — run sequentially.
describe('TwoFactorVerification', { concurrent: false }, () => {
  const mockVerifyLogin = vi.mocked(verifyTwoFactorLogin);
  const mockUseBackupCode = vi.mocked(useBackupCode);
  const mockVerifySession = vi.mocked(verifyTwoFactorSession);
  const mockToast = vi.mocked(toast);
  const user = userEvent.setup();

  // RHF reset() clears the input via native form.reset(), which bypasses the
  // value setter user-event intercepts; clear first so user-event's tracked
  // value is in sync before re-typing.
  const submitCode = async (code = '123456') => {
    await user.clear(codeInput());
    await user.type(codeInput(), code);
    await user.click(verifyButton());
  };

  const openBackupForm = async () => {
    await user.click(screen.getByRole('button', { name: /lost your device/i }));
    return backupInput();
  };

  const submitBackupCode = async (code = '12345678') => {
    await openBackupForm();
    await user.clear(backupInput());
    await user.type(backupInput(), code);
    await user.click(backupSubmitButton());
  };

  // The session countdown re-arms a 1 s setTimeout from an effect after each
  // state update, so each second must be advanced inside its own act() for
  // React to flush the effect that schedules the next tick.
  const tickSeconds = (seconds: number) => {
    for (let i = 0; i < seconds; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders the verification form for login mode', () => {
      renderForm({ mode: 'login' });

      expect(
        screen.getByRole('heading', { name: /two-factor verification/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/enter the code from your authenticator app/i)
      ).toBeInTheDocument();
      expect(codeInput()).toBeInTheDocument();
      expect(verifyButton()).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it('renders the verification form for session mode', () => {
      renderForm({ uid: undefined, sessionId: 'session123', mode: 'session' });

      expect(
        screen.getByRole('heading', { name: /two-factor verification/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
    });

    it('shows a 5:00 session timer in session mode', () => {
      renderForm({ uid: undefined, sessionId: 'session123', mode: 'session' });

      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('does not show the session timer in login mode', () => {
      renderForm({ mode: 'login' });

      expect(screen.queryByText(/time remaining/i)).not.toBeInTheDocument();
    });

    it('renders Spanish copy by default', () => {
      render(<TwoFactorVerification uid="user123" />);

      expect(
        screen.getByRole('heading', { name: /verificación de dos factores/i })
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/código de autenticación/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /verificar/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancelar/i })
      ).toBeInTheDocument();
    });

    it('shows the lost-device link', () => {
      renderForm();

      expect(
        screen.getByRole('button', { name: /lost your device/i })
      ).toBeInTheDocument();
    });
  });

  describe('TOTP Code Verification', () => {
    it('enables the verify button only for a 6-character code', async () => {
      renderForm();

      expect(verifyButton()).toBeDisabled();

      await user.type(codeInput(), '123');
      expect(verifyButton()).toBeDisabled();

      // maxLength=6 truncates the 7th character, so the value is 6 long.
      await user.clear(codeInput());
      await user.type(codeInput(), '1234567');
      expect(codeInput()).toHaveValue('123456');
      expect(verifyButton()).not.toBeDisabled();

      await user.clear(codeInput());
      await user.type(codeInput(), '123456');
      expect(verifyButton()).not.toBeDisabled();
    });

    it('rejects a non-numeric code with the zod message', async () => {
      renderForm();

      // Length gating alone lets this through; the resolver stops it.
      await submitCode('abcdef');

      expect(
        await screen.findByText(/code must contain only numbers/i)
      ).toBeInTheDocument();
      expect(mockVerifyLogin).not.toHaveBeenCalled();
    });

    it('handles successful login verification', async () => {
      mockVerifyLogin.mockResolvedValue(true);
      const onSuccess = vi.fn();
      renderForm({ mode: 'login', onSuccess });

      await submitCode();

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      expect(mockVerifyLogin).toHaveBeenCalledWith('user123', '123456');
      expect(mockToast.success).toHaveBeenCalledWith('Verification successful');
      expect(mockVerifySession).not.toHaveBeenCalled();
    });

    it('handles successful session verification', async () => {
      mockVerifySession.mockResolvedValue(true);
      const onSuccess = vi.fn();
      renderForm({
        uid: undefined,
        sessionId: 'session123',
        mode: 'session',
        onSuccess,
      });

      await submitCode();

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      expect(mockVerifySession).toHaveBeenCalledWith('session123', '123456');
      expect(mockToast.success).toHaveBeenCalledWith('Verification successful');
      expect(mockVerifyLogin).not.toHaveBeenCalled();
    });

    it('tracks remaining attempts on a failed verification', async () => {
      mockVerifyLogin.mockResolvedValue(false);
      renderForm();

      await submitCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Incorrect code. 2 attempts remaining'
        );
      });
      expect(
        screen.getByText(/warning: 2 attempts remaining/i)
      ).toBeInTheDocument();
    });

    it('cancels after three failed attempts', async () => {
      mockVerifyLogin.mockResolvedValue(false);
      const onCancel = vi.fn();
      renderForm({ onCancel });

      await submitCode();
      await waitFor(() => expect(codeInput()).toHaveValue(''));
      await submitCode();
      await waitFor(() => expect(codeInput()).toHaveValue(''));
      expect(onCancel).not.toHaveBeenCalled();

      await submitCode();

      await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
      expect(mockToast.error).toHaveBeenLastCalledWith(
        'Too many failed attempts'
      );
      expect(mockVerifyLogin).toHaveBeenCalledTimes(3);
    });

    it('shows the service error message and consumes an attempt', async () => {
      mockVerifyLogin.mockRejectedValue(new Error('Network error'));
      renderForm();

      await submitCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error');
      });
      expect(
        await screen.findByText(/warning: 2 attempts remaining/i)
      ).toBeInTheDocument();
    });

    it('falls back to a generic message when the error has none', async () => {
      mockVerifyLogin.mockRejectedValue({});
      renderForm();

      await submitCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Verification error');
      });
    });

    it('clears the code after a failed attempt', async () => {
      mockVerifyLogin.mockResolvedValue(false);
      renderForm();

      await submitCode();

      await waitFor(() => expect(codeInput()).toHaveValue(''));
      expect(verifyButton()).toBeDisabled();
    });
  });

  describe('Backup Code Verification', () => {
    it('switches to the backup code form', async () => {
      renderForm();

      await openBackupForm();

      expect(
        screen.getByRole('heading', { name: /use backup code/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/enter one of your 8-digit backup codes/i)
      ).toBeInTheDocument();
      expect(backupInput()).toBeInTheDocument();
      expect(backupSubmitButton()).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^back$/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/authentication code/i)
      ).not.toBeInTheDocument();
    });

    it('enables the use-code button only for an 8-character code', async () => {
      renderForm();
      await openBackupForm();

      expect(backupSubmitButton()).toBeDisabled();

      await user.type(backupInput(), '123');
      expect(backupSubmitButton()).toBeDisabled();

      // maxLength=8 truncates the 9th character.
      await user.clear(backupInput());
      await user.type(backupInput(), '123456789');
      expect(backupInput()).toHaveValue('12345678');
      expect(backupSubmitButton()).not.toBeDisabled();
    });

    it('rejects a non-numeric backup code with the zod message', async () => {
      renderForm();

      await submitBackupCode('abcdefgh');

      expect(
        await screen.findByText(/backup code must contain only numbers/i)
      ).toBeInTheDocument();
      expect(mockUseBackupCode).not.toHaveBeenCalled();
    });

    it('handles a valid backup code', async () => {
      mockUseBackupCode.mockResolvedValue(true);
      const onSuccess = vi.fn();
      renderForm({ onSuccess });

      await submitBackupCode();

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      expect(mockUseBackupCode).toHaveBeenCalledWith('user123', '12345678');
      expect(mockToast.success).toHaveBeenCalledWith('Valid backup code');
    });

    it('handles an invalid or used backup code', async () => {
      mockUseBackupCode.mockResolvedValue(false);
      const onSuccess = vi.fn();
      renderForm({ onSuccess });

      await submitBackupCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Invalid or already used backup code'
        );
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('shows the service error message when the backup check throws', async () => {
      mockUseBackupCode.mockRejectedValue(new Error('Backup service down'));
      renderForm();

      await submitBackupCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Backup service down');
      });
    });

    it('switches back to the TOTP form', async () => {
      renderForm();
      await openBackupForm();

      await user.click(screen.getByRole('button', { name: /^back$/i }));

      expect(codeInput()).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /use backup code/i })
      ).not.toBeInTheDocument();
    });

    it('clears the backup code after a failed attempt', async () => {
      mockUseBackupCode.mockResolvedValue(false);
      renderForm();

      await submitBackupCode();

      await waitFor(() => expect(backupInput()).toHaveValue(''));
      expect(backupSubmitButton()).toBeDisabled();
    });
  });

  describe('Session Timer (Session Mode)', () => {
    const renderSession = (props: Partial<Props> = {}) =>
      renderForm({
        uid: undefined,
        sessionId: 'session123',
        mode: 'session',
        ...props,
      });

    it('counts down from 5 minutes', () => {
      vi.useFakeTimers();
      renderSession();

      expect(screen.getByText('5:00')).toBeInTheDocument();
      tickSeconds(1);
      expect(screen.getByText('4:59')).toBeInTheDocument();
    });

    it('formats the remaining time as m:ss', () => {
      vi.useFakeTimers();
      renderSession();

      tickSeconds(4 * 60 - 5);

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('expires the session after 5 minutes', () => {
      vi.useFakeTimers();
      const onCancel = vi.fn();
      renderSession({ onCancel });

      tickSeconds(5 * 60);

      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalledWith('Session expired');
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('uses the Spanish expiry message', () => {
      vi.useFakeTimers();
      renderSession({ lang: 'es' });

      tickSeconds(5 * 60);

      expect(mockToast.error).toHaveBeenCalledWith('Sesión expirada');
    });

    it('does not count down in login mode', () => {
      vi.useFakeTimers();
      renderForm({ mode: 'login' });

      tickSeconds(5 * 60);

      expect(screen.queryByText(/time remaining/i)).not.toBeInTheDocument();
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('cleans up the timer on unmount', () => {
      vi.useFakeTimers();
      const onCancel = vi.fn();
      const { unmount } = renderSession({ onCancel });
      expect(screen.getByText('5:00')).toBeInTheDocument();

      unmount();
      tickSeconds(5 * 60);

      expect(mockToast.error).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during verification', async () => {
      let resolveVerification: (value: boolean) => void = () => {};
      mockVerifyLogin.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveVerification = resolve;
        })
      );
      renderForm();

      await submitCode();

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveVerification(true);
      await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    });

    it('shows loading state during backup code verification', async () => {
      let resolveBackup: (value: boolean) => void = () => {};
      mockUseBackupCode.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveBackup = resolve;
        })
      );
      renderForm();

      await submitBackupCode();

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveBackup(true);
      await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    });

    it('disables the cancel button while verifying', async () => {
      let resolveVerification: (value: boolean) => void = () => {};
      mockVerifyLogin.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveVerification = resolve;
        })
      );
      renderForm();

      await submitCode();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      });

      resolveVerification(true);
      await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    });
  });

  describe('Error Handling', () => {
    it('reports missing session information in session mode without a sessionId', async () => {
      renderForm({ uid: undefined, sessionId: undefined, mode: 'session' });

      await submitCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Missing session information'
        );
      });
      expect(mockVerifySession).not.toHaveBeenCalled();
    });

    it('reports missing session information in login mode without a uid', async () => {
      renderForm({ uid: undefined, mode: 'login' });

      await submitCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Missing session information'
        );
      });
      expect(mockVerifyLogin).not.toHaveBeenCalled();
    });

    it('reports a missing user ID for backup codes', async () => {
      renderForm({ uid: undefined, sessionId: 'session123', mode: 'session' });

      await submitBackupCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Missing user ID');
      });
      expect(mockUseBackupCode).not.toHaveBeenCalled();
    });

    it('reports a mode/parameter mismatch as a verification error', async () => {
      // uid is present so the guard passes, but session mode has no sessionId.
      renderForm({ uid: 'user123', mode: 'session' });

      await submitCode();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Invalid verification mode or missing parameters'
        );
      });
      expect(mockVerifySession).not.toHaveBeenCalled();
      expect(mockVerifyLogin).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('calls onCancel when the cancel button is clicked', async () => {
      const onCancel = vi.fn();
      renderForm({ onCancel });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('submits with the Enter key', async () => {
      mockVerifyLogin.mockResolvedValue(true);
      renderForm();

      await user.type(codeInput(), '123456{Enter}');

      await waitFor(() => {
        expect(mockVerifyLogin).toHaveBeenCalledWith('user123', '123456');
      });
    });

    it('uses the one-time-code autocomplete hint', () => {
      renderForm();

      expect(codeInput()).toHaveAttribute('autocomplete', 'one-time-code');
    });

    it('limits the code input to 6 characters', () => {
      renderForm();

      expect(codeInput()).toHaveAttribute('maxlength', '6');
    });

    it('limits the backup code input to 8 characters', async () => {
      renderForm();

      await openBackupForm();

      expect(backupInput()).toHaveAttribute('maxlength', '8');
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      renderForm();

      expect(codeInput()).toHaveAttribute('id', 'code');
      expect(codeInput()).toHaveAttribute('type', 'text');
    });

    it('has proper button labeling', () => {
      renderForm();

      expect(verifyButton()).toHaveAttribute('type', 'submit');
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAttribute(
        'type',
        'button'
      );
    });

    it('shows the support help text', () => {
      renderForm();

      expect(
        screen.getByText(/can't access\? contact technical support/i)
      ).toBeInTheDocument();
    });

    it('has a proper heading', () => {
      renderForm();

      expect(
        screen.getByRole('heading', { name: /two-factor verification/i })
      ).toBeInTheDocument();
    });

    it('keeps focus on the code input while typing', async () => {
      renderForm();

      await user.click(codeInput());
      expect(codeInput()).toHaveFocus();

      await user.keyboard('123');
      expect(codeInput()).toHaveFocus();
      expect(codeInput()).toHaveValue('123');
    });
  });

  describe('Attempts Warning', () => {
    it('shows the warning once attempts are low', async () => {
      mockVerifyLogin.mockResolvedValue(false);
      renderForm();

      await submitCode();
      expect(
        await screen.findByText(/warning: 2 attempts remaining/i)
      ).toBeInTheDocument();

      await waitFor(() => expect(codeInput()).toHaveValue(''));
      await submitCode();
      expect(
        await screen.findByText(/warning: 1 attempts remaining/i)
      ).toBeInTheDocument();
    });

    it('does not show the warning initially', () => {
      renderForm();

      expect(screen.queryByText(/warning/i)).not.toBeInTheDocument();
    });
  });

  describe('Language Support', () => {
    it('renders Spanish copy', () => {
      renderForm({ lang: 'es' });

      expect(
        screen.getByText(/verificación de dos factores/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /perdiste tu dispositivo/i })
      ).toBeInTheDocument();
    });

    it('renders English copy', () => {
      renderForm({ lang: 'en' });

      expect(screen.getByText(/two-factor verification/i)).toBeInTheDocument();
    });

    it('uses Spanish toast messages', async () => {
      mockVerifyLogin.mockResolvedValue(false);
      renderForm({ lang: 'es' });

      await user.type(
        screen.getByLabelText(/código de autenticación/i),
        '123456'
      );
      await user.click(screen.getByRole('button', { name: /verificar/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Código incorrecto. 2 intentos restantes'
        );
      });
      expect(
        screen.getByText(/cuidado: 2 intentos restantes/i)
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('works without callback props', async () => {
      mockVerifyLogin.mockResolvedValue(true);
      renderForm({ onSuccess: undefined, onCancel: undefined });

      await submitCode();

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          'Verification successful'
        );
      });
    });

    it('only verifies once on rapid clicks', async () => {
      mockVerifyLogin.mockResolvedValue(true);
      renderForm();

      await user.type(codeInput(), '123456');
      await user.click(verifyButton());
      await user.click(verifyButton());
      await user.click(verifyButton());

      await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
      // The code is reset after the first submit, disabling the button.
      expect(mockVerifyLogin).toHaveBeenCalledTimes(1);
      expect(verifyButton()).toBeDisabled();
    });

    it('switches to session mode on rerender', () => {
      const { rerender } = renderForm();
      expect(codeInput()).toBeInTheDocument();
      expect(screen.queryByText(/time remaining/i)).not.toBeInTheDocument();

      rerender(
        <TwoFactorVerification
          sessionId="session123"
          mode="session"
          lang="en"
        />
      );

      expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
      expect(screen.getByText('5:00')).toBeInTheDocument();
    });
  });
});
