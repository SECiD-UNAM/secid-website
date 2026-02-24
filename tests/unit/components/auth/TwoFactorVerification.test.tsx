// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorVerification } from '@/components/auth/TwoFactorVerification';
import { 
  verifyTwoFactorLogin, 
  useBackupCode,
  verifyTwoFactorSession
} from '@/lib/auth/two-factor';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/lib/auth/two-factor', () => ({
  verifyTwoFactorLogin: vi.fn(),
  useBackupCode: vi.fn(),
  verifyTwoFactorSession: vi.fn(),
  createTwoFactorSession: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => ({
    twoFactor: {
      verification: {
        title: 'Two-Factor Verification',
        instructions: 'Enter the code from your authenticator app',
        codeLabel: 'Authentication code (6 digits)',
        backupCodeLabel: 'Backup code (8 digits)',
        backupTitle: 'Use Backup Code',
        backupInstructions: 'Enter one of your 8-digit backup codes',
        timeRemaining: 'Time remaining: ',
        warning: 'Warning: ',
        attemptsRemaining: 'attempts remaining',
        lostDevice: 'Lost your device? Use a backup code',
        helpText: "Can't access? Contact technical support.",
      },
      buttons: {
        cancel: 'Cancel',
        verify: 'Verify',
        back: 'Back',
        useCode: 'Use Code',
      },
      messages: {
        sessionExpired: 'Session expired',
        verificationSuccess: 'Verification successful',
        incorrectCode: 'Incorrect code.',
        tooManyAttempts: 'Too many failed attempts',
        verificationError: 'Verification error',
        validBackupCode: 'Valid backup code',
        invalidBackupCode: 'Invalid or already used backup code',
        backupCodeError: 'Backup code error',
        missingSession: 'Missing session information',
        missingUserId: 'Missing user ID',
      },
    },
  })),
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, loading, disabled, onClick, type, variant, ...props }: any) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={loading ? 'loading-button' : 'button'}
      data-variant={variant}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

describe.skip('TwoFactorVerification', () => {
  const mockVerifyTwoFactorLogin = vi.mocked(verifyTwoFactorLogin);
  const mockUseBackupCode = vi.mocked(useBackupCode);
  const mockVerifyTwoFactorSession = vi.mocked(verifyTwoFactorSession);
  const mockToast = vi.mocked(toast);
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders verification form for login mode', () => {
      render(<TwoFactorVerification uid="user123" mode="login" />);

      expect(screen.getByText(/two-factor verification/i)).toBeInTheDocument();
      expect(screen.getByText(/enter the code from your authenticator app/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/authentication code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders verification form for session mode', () => {
      render(<TwoFactorVerification sessionId="session123" mode="session" />);

      expect(screen.getByText(/two-factor verification/i)).toBeInTheDocument();
      expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
    });

    it('shows session timer for session mode', () => {
      render(<TwoFactorVerification sessionId="session123" mode="session" />);

      expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('does not show session timer for login mode', () => {
      render(<TwoFactorVerification uid="user123" mode="login" />);

      expect(screen.queryByText(/time remaining/i)).not.toBeInTheDocument();
    });

    it('renders with correct language', () => {
      render(<TwoFactorVerification uid="user123" lang="en" />);

      expect(screen.getByText(/two-factor verification/i)).toBeInTheDocument();
    });

    it('shows lost device link', () => {
      render(<TwoFactorVerification uid="user123" />);

      expect(screen.getByRole('button', { name: /lost your device/i })).toBeInTheDocument();
    });
  });

  describe('TOTP Code Verification', () => {
    it('validates code format', async () => {
      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      // Test invalid codes
      await user.type(codeInput, '123');
      expect(verifyButton).toBeDisabled();

      await user.clear(codeInput);
      await user.type(codeInput, '1234567');
      expect(verifyButton).toBeDisabled();

      await user.clear(codeInput);
      await user.type(codeInput, 'abcdef');
      expect(verifyButton).toBeDisabled();

      // Test valid code
      await user.clear(codeInput);
      await user.type(codeInput, '123456');
      expect(verifyButton).not.toBeDisabled();
    });

    it('handles successful login verification', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(true);

      const onSuccess = vi.fn();
      render(<TwoFactorVerification uid="user123" mode="login" onSuccess={onSuccess} />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockVerifyTwoFactorLogin).toHaveBeenCalledWith('user123', '123456');
        expect(mockToast.success).toHaveBeenCalledWith('Verification successful');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles successful session verification', async () => {
      mockVerifyTwoFactorSession.mockResolvedValue(true);

      const onSuccess = vi.fn();
      render(<TwoFactorVerification sessionId="session123" mode="session" onSuccess={onSuccess} />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockVerifyTwoFactorSession).toHaveBeenCalledWith('session123', '123456');
        expect(mockToast.success).toHaveBeenCalledWith('Verification successful');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles verification failure with attempts tracking', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(false);

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Incorrect code. 2 attempts remaining');
        expect(screen.getByText(/warning: 2 attempts remaining/i)).toBeInTheDocument();
      });
    });

    it('handles too many failed attempts', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(false);

      const onCancel = vi.fn();
      render(<TwoFactorVerification uid="user123" onCancel={onCancel} />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      // Simulate 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await user.clear(codeInput);
        await user.type(codeInput, '123456');
        await user.click(verifyButton);
        
        await waitFor(() => {
          expect(mockVerifyTwoFactorLogin).toHaveBeenCalled();
        });
      }

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Too many failed attempts');
        expect(onCancel).toHaveBeenCalled();
      });
    });

    it('handles network errors', async () => {
      mockVerifyTwoFactorLogin.mockRejectedValue(new Error('Network error'));

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('clears form after failed attempt', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(false);

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i) as HTMLInputElement;
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(codeInput.value).toBe('');
      });
    });
  });

  describe('Backup Code Verification', () => {
    it('switches to backup code form', async () => {
      render(<TwoFactorVerification uid="user123" />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByText(/use backup code/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /use code/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });

    it('validates backup code format', async () => {
      render(<TwoFactorVerification uid="user123" />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      });

      const backupCodeInput = screen.getByLabelText(/backup code/i);
      const useCodeButton = screen.getByRole('button', { name: /use code/i });

      // Test invalid codes
      await user.type(backupCodeInput, '123');
      expect(useCodeButton).toBeDisabled();

      await user.clear(backupCodeInput);
      await user.type(backupCodeInput, '123456789');
      expect(useCodeButton).toBeDisabled();

      await user.clear(backupCodeInput);
      await user.type(backupCodeInput, 'abcdefgh');
      expect(useCodeButton).toBeDisabled();

      // Test valid code
      await user.clear(backupCodeInput);
      await user.type(backupCodeInput, '12345678');
      expect(useCodeButton).not.toBeDisabled();
    });

    it('handles successful backup code verification', async () => {
      mockUseBackupCode.mockResolvedValue(true);

      const onSuccess = vi.fn();
      render(<TwoFactorVerification uid="user123" onSuccess={onSuccess} />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      });

      const backupCodeInput = screen.getByLabelText(/backup code/i);
      const useCodeButton = screen.getByRole('button', { name: /use code/i });

      await user.type(backupCodeInput, '12345678');
      await user.click(useCodeButton);

      await waitFor(() => {
        expect(mockUseBackupCode).toHaveBeenCalledWith('user123', '12345678');
        expect(mockToast.success).toHaveBeenCalledWith('Valid backup code');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles invalid backup code', async () => {
      mockUseBackupCode.mockResolvedValue(false);

      render(<TwoFactorVerification uid="user123" />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      });

      const backupCodeInput = screen.getByLabelText(/backup code/i);
      const useCodeButton = screen.getByRole('button', { name: /use code/i });

      await user.type(backupCodeInput, '12345678');
      await user.click(useCodeButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Invalid or already used backup code');
      });
    });

    it('switches back to TOTP form', async () => {
      render(<TwoFactorVerification uid="user123" />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByText(/use backup code/i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/authentication code/i)).toBeInTheDocument();
        expect(screen.queryByText(/use backup code/i)).not.toBeInTheDocument();
      });
    });

    it('clears backup code form after failed attempt', async () => {
      mockUseBackupCode.mockResolvedValue(false);

      render(<TwoFactorVerification uid="user123" />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      });

      const backupCodeInput = screen.getByLabelText(/backup code/i) as HTMLInputElement;
      const useCodeButton = screen.getByRole('button', { name: /use code/i });

      await user.type(backupCodeInput, '12345678');
      await user.click(useCodeButton);

      await waitFor(() => {
        expect(backupCodeInput.value).toBe('');
      });
    });
  });

  describe('Session Timer (Session Mode)', () => {
    it('counts down from 5 minutes', async () => {
      render(<TwoFactorVerification sessionId="session123" mode="session" />);

      expect(screen.getByText('5:00')).toBeInTheDocument();

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('4:59')).toBeInTheDocument();
      });
    });

    it('formats time correctly', async () => {
      render(<TwoFactorVerification sessionId="session123" mode="session" />);

      // Advance time to 1 minute 5 seconds remaining
      vi.advanceTimersByTime(4 * 60 * 1000 - 5000);

      await waitFor(() => {
        expect(screen.getByText('1:05')).toBeInTheDocument();
      });
    });

    it('handles session expiration', async () => {
      const onCancel = vi.fn();
      render(<TwoFactorVerification sessionId="session123" mode="session" onCancel={onCancel} />);

      // Advance time to expiration
      vi.advanceTimersByTime(5 * 60 * 1000);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Session expired');
        expect(onCancel).toHaveBeenCalled();
      });
    });

    it('does not show timer for login mode', () => {
      render(<TwoFactorVerification uid="user123" mode="login" />);

      expect(screen.queryByText(/time remaining/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during verification', async () => {
      let resolveVerification: (value: any) => void;
      const verificationPromise = new Promise((resolve) => {
        resolveVerification = resolve;
      });
      mockVerifyTwoFactorLogin.mockReturnValue(verificationPromise);

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveVerification!(true);
    });

    it('shows loading state during backup code verification', async () => {
      let resolveBackupCode: (value: any) => void;
      const backupCodePromise = new Promise((resolve) => {
        resolveBackupCode = resolve;
      });
      mockUseBackupCode.mockReturnValue(backupCodePromise);

      render(<TwoFactorVerification uid="user123" />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      });

      const backupCodeInput = screen.getByLabelText(/backup code/i);
      const useCodeButton = screen.getByRole('button', { name: /use code/i });

      await user.type(backupCodeInput, '12345678');
      await user.click(useCodeButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveBackupCode!(true);
    });

    it('disables form during loading', async () => {
      let resolveVerification: (value: any) => void;
      const verificationPromise = new Promise((resolve) => {
        resolveVerification = resolve;
      });
      mockVerifyTwoFactorLogin.mockReturnValue(verificationPromise);

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(cancelButton).toBeDisabled();
      });

      resolveVerification!(true);
    });
  });

  describe('Error Handling', () => {
    it('handles missing session information', async () => {
      render(<TwoFactorVerification mode="session" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Missing session information');
      });
    });

    it('handles missing user ID for backup codes', async () => {
      render(<TwoFactorVerification mode="login" />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/backup code/i)).toBeInTheDocument();
      });

      const backupCodeInput = screen.getByLabelText(/backup code/i);
      const useCodeButton = screen.getByRole('button', { name: /use code/i });

      await user.type(backupCodeInput, '12345678');
      await user.click(useCodeButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Missing user ID');
      });
    });

    it('handles verification errors gracefully', async () => {
      mockVerifyTwoFactorLogin.mockRejectedValue(new Error('Verification service unavailable'));

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Verification service unavailable');
      });
    });

    it('handles invalid verification mode', async () => {
      render(<TwoFactorVerification mode="login" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Missing session information');
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      render(<TwoFactorVerification uid="user123" onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('handles form submission with Enter key', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(true);

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);

      await user.type(codeInput, '123456');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockVerifyTwoFactorLogin).toHaveBeenCalled();
      });
    });

    it('auto-completes code input with one-time-code', () => {
      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      expect(codeInput).toHaveAttribute('autoComplete', 'one-time-code');
    });

    it('limits code input length', () => {
      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      expect(codeInput).toHaveAttribute('maxLength', '6');
    });

    it('limits backup code input length', async () => {
      render(<TwoFactorVerification uid="user123" />);

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        const backupCodeInput = screen.getByLabelLabel(/backup code/i);
        expect(backupCodeInput).toHaveAttribute('maxLength', '8');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      expect(codeInput).toHaveAttribute('id', 'code');
      expect(codeInput).toHaveAttribute('type', 'text');
    });

    it('has proper button labeling', () => {
      render(<TwoFactorVerification uid="user123" />);

      expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('shows help text for support', () => {
      render(<TwoFactorVerification uid="user123" />);

      expect(screen.getByText(/can't access\? contact technical support/i)).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<TwoFactorVerification uid="user123" />);

      expect(screen.getByRole('heading', { name: /two-factor verification/i })).toBeInTheDocument();
    });

    it('maintains focus during state changes', async () => {
      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      await user.click(codeInput);
      expect(codeInput).toHaveFocus();

      const lostDeviceButton = screen.getByRole('button', { name: /lost your device/i });
      await user.click(lostDeviceButton);

      await waitFor(() => {
        const backupCodeInput = screen.getByLabelText(/backup code/i);
        expect(backupCodeInput).toBeInTheDocument();
      });
    });
  });

  describe('Attempts Warning', () => {
    it('shows warning when attempts are low', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(false);

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      // First failed attempt
      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/warning: 2 attempts remaining/i)).toBeInTheDocument();
      });

      // Second failed attempt
      await user.clear(codeInput);
      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/warning: 1 attempts remaining/i)).toBeInTheDocument();
      });
    });

    it('does not show warning initially', () => {
      render(<TwoFactorVerification uid="user123" />);

      expect(screen.queryByText(/warning/i)).not.toBeInTheDocument();
    });
  });

  describe('Language Support', () => {
    it('uses correct language for Spanish', () => {
      render(<TwoFactorVerification uid="user123" lang="es" />);

      expect(screen.getByText(/verificación de dos factores/i)).toBeInTheDocument();
    });

    it('uses correct language for English', () => {
      render(<TwoFactorVerification uid="user123" lang="en" />);

      expect(screen.getByText(/two-factor verification/i)).toBeInTheDocument();
    });

    it('uses correct error messages for language', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(false);

      render(<TwoFactorVerification uid="user123" lang="en" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Incorrect code. 2 attempts remaining');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing callback props gracefully', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(true);

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      
      expect(async () => {
        await user.click(verifyButton);
      }).not.toThrow();
    });

    it('handles rapid user interactions', async () => {
      mockVerifyTwoFactorLogin.mockResolvedValue(true);

      render(<TwoFactorVerification uid="user123" />);

      const codeInput = screen.getByLabelText(/authentication code/i);
      const verifyButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      
      // Rapid clicks
      await user.click(verifyButton);
      await user.click(verifyButton);
      await user.click(verifyButton);

      // Should only be called once due to loading state
      expect(mockVerifyTwoFactorLogin).toHaveBeenCalledTimes(1);
    });

    it('handles component remounting', () => {
      const { rerender } = render(<TwoFactorVerification uid="user123" />);

      expect(screen.getByLabelText(/authentication code/i)).toBeInTheDocument();

      rerender(<TwoFactorVerification sessionId="session123" mode="session" />);

      expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
    });

    it('cleans up timer on unmount', () => {
      const { unmount } = render(<TwoFactorVerification sessionId="session123" mode="session" />);

      expect(screen.getByText('5:00')).toBeInTheDocument();

      unmount();

      // Timer should be cleaned up (tested by no memory leaks)
    });
  });
});