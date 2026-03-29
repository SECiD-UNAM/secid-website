import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { signInWithProvider } from '@/lib/auth';
import { signInWithLinkedIn } from '@/lib/auth/linkedin-auth';
import { handleAccountExistsError, completeMerge } from '@/lib/auth/auto-merge';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  signInWithProvider: vi.fn(),
}));

vi.mock('@/lib/auth/linkedin-auth', () => ({
  signInWithLinkedIn: vi.fn(),
}));

vi.mock('@/lib/auth/auto-merge', () => ({
  handleAccountExistsError: vi.fn().mockResolvedValue(null),
  completeMerge: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: vi.fn(() => ({
    auth: {
      signUp: { google: 'Sign up with Google' },
      signIn: { google: 'Continue with Google' },
      or: 'or',
    },
  })),
}));

describe.sequential('SocialLoginButtons', () => {
  const mockSignInWithProvider = vi.mocked(signInWithProvider);
  const mockSignInWithLinkedIn = vi.mocked(signInWithLinkedIn);
  const mockHandleAccountExistsError = vi.mocked(handleAccountExistsError);
  const mockCompleteMerge = vi.mocked(completeMerge);
  const mockToast = vi.mocked(toast);

  const mockSuccessResult = {
    user: { uid: 'google123', email: 'user@example.com', displayName: 'Test User' },
    isNewUser: false,
  };

  const mockNewUserResult = {
    user: { uid: 'google123', email: 'user@example.com', displayName: 'Test User' },
    isNewUser: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders all social login providers', () => {
      render(<SocialLoginButtons lang="en" />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with linkedin/i })).toBeInTheDocument();
    });

    it('renders divider text in English', () => {
      const { container } = render(<SocialLoginButtons lang="en" />);

      const dividers = container.querySelectorAll('.bg-white.px-2.text-gray-500');
      expect(dividers.length).toBe(1);
      expect(dividers[0].textContent).toBe('or');
    });

    it('renders divider text in Spanish', () => {
      const { container } = render(<SocialLoginButtons lang="es" />);

      const dividers = container.querySelectorAll('.bg-white.px-2.text-gray-500');
      expect(dividers.length).toBe(1);
      expect(dividers[0].textContent).toBe('o');
    });

    it('renders signup mode text correctly in Spanish', () => {
      render(<SocialLoginButtons mode="signup" lang="es" />);

      expect(screen.getByRole('button', { name: /crear cuenta con google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear cuenta con github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear cuenta con linkedin/i })).toBeInTheDocument();
    });

    it('renders signup mode text correctly in English', () => {
      render(<SocialLoginButtons mode="signup" lang="en" />);

      expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up with github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up with linkedin/i })).toBeInTheDocument();
    });

    it('renders signin mode text correctly in Spanish', () => {
      render(<SocialLoginButtons mode="signin" lang="es" />);

      expect(screen.getByRole('button', { name: /continuar con google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con linkedin/i })).toBeInTheDocument();
    });

    it('uses correct language for Spanish signup', () => {
      render(<SocialLoginButtons lang="es" mode="signup" />);

      expect(screen.getByRole('button', { name: /crear cuenta con google/i })).toBeInTheDocument();
    });

    it('uses correct language for English signup', () => {
      render(<SocialLoginButtons lang="en" mode="signup" />);

      expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<SocialLoginButtons className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders provider icons', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        const svgElement = button.querySelector('svg');
        expect(svgElement).toBeInTheDocument();
      });
    });
  });

  describe('Provider Configuration', () => {
    it('renders Google button with correct styling', () => {
      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      expect(googleButton).toHaveClass('bg-white');
      expect(googleButton).toHaveClass('border-gray-300');
      expect(googleButton).toHaveClass('text-gray-700');
    });

    it('renders GitHub button with correct styling', () => {
      render(<SocialLoginButtons lang="es" />);

      const githubButton = screen.getByRole('button', { name: /continuar con github/i });
      expect(githubButton).toHaveClass('bg-gray-900');
      expect(githubButton).toHaveClass('text-white');
    });

    it('renders LinkedIn button with correct styling', () => {
      render(<SocialLoginButtons lang="es" />);

      const linkedinButton = screen.getByRole('button', { name: /continuar con linkedin/i });
      expect(linkedinButton).toHaveClass('bg-[#0A66C2]');
      expect(linkedinButton).toHaveClass('text-white');
    });
  });

  describe('User Interactions', () => {
    it('handles successful Google login', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      const onSuccess = vi.fn();
      render(<SocialLoginButtons lang="es" onSuccess={onSuccess} />);

      const googleButton = screen.getByRole('button', { name: /continuar con google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalledWith('google');
        expect(mockToast.success).toHaveBeenCalledWith('¡Bienvenido de vuelta!');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles successful GitHub login', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      const onSuccess = vi.fn();
      render(<SocialLoginButtons lang="es" onSuccess={onSuccess} />);

      const githubButton = screen.getByRole('button', { name: /continuar con github/i });
      await user.click(githubButton);

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalledWith('github');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles LinkedIn login with redirect', async () => {
      const user = userEvent.setup();
      mockSignInWithLinkedIn.mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<SocialLoginButtons lang="es" onSuccess={onSuccess} />);

      const linkedinButton = screen.getByRole('button', { name: /continuar con linkedin/i });
      await user.click(linkedinButton);

      await waitFor(() => {
        expect(mockSignInWithLinkedIn).toHaveBeenCalled();
        // onSuccess is not called because page redirects
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });

    it('shows success message for returning users in Spanish', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      render(<SocialLoginButtons lang="es" />);

      const googleButton = screen.getByRole('button', { name: /continuar con google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('¡Bienvenido de vuelta!');
      });
    });

    it('shows different success message for new users in English', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockResolvedValue(mockNewUserResult);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          'Welcome! Your account has been created successfully.'
        );
      });
    });

    it('uses correct language for success messages', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back!');
      });
    });

    it('uses correct language for new user messages', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockResolvedValue(mockNewUserResult);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          'Welcome! Your account has been created successfully.'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles provider authentication errors', async () => {
      const user = userEvent.setup();
      const error = new Error('Authentication failed');
      mockSignInWithProvider.mockRejectedValue(error);

      const onError = vi.fn();
      render(<SocialLoginButtons lang="en" onError={onError} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Authentication failed');
        expect(onError).toHaveBeenCalledWith('Authentication failed');
      });
    });

    it('handles errors without message in Spanish', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockRejectedValue({});

      render(<SocialLoginButtons lang="es" />);

      const googleButton = screen.getByRole('button', { name: /continuar con google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al iniciar sesión');
      });
    });

    it('uses correct language for error messages', async () => {
      const user = userEvent.setup();
      const error = new Error('Authentication failed');
      mockSignInWithProvider.mockRejectedValue(error);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Authentication failed');
      });
    });

    it('uses generic error message for unknown errors in English', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockRejectedValue({});

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Sign in error');
      });
    });

    it('calls onError callback when provided', async () => {
      const user = userEvent.setup();
      const error = new Error('Custom error');
      mockSignInWithProvider.mockRejectedValue(error);

      const onError = vi.fn();
      render(<SocialLoginButtons lang="en" onError={onError} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Custom error');
      });
    });

    it('handles popup-closed-by-user error with translated message in Spanish', async () => {
      const user = userEvent.setup();
      const providerError = {
        code: 'auth/popup-closed-by-user',
        message: 'The popup has been closed by the user before finalizing the operation.',
      };
      mockSignInWithProvider.mockRejectedValue(providerError);

      render(<SocialLoginButtons lang="es" />);

      const googleButton = screen.getByRole('button', { name: /continuar con google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Inicio de sesión cancelado');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner for the clicked provider', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      const { container } = render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });

      resolveSignIn!(mockSuccessResult);
    });

    it('disables all buttons during loading', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        const allButtons = screen.getAllByRole('button');
        allButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });

      resolveSignIn!(mockSuccessResult);
    });

    it('prevents multiple simultaneous requests', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const githubButton = screen.getByRole('button', { name: /continue with github/i });

      await user.click(googleButton);
      await user.click(githubButton); // Should not trigger second request

      expect(mockSignInWithProvider).toHaveBeenCalledTimes(1);
      expect(mockSignInWithProvider).toHaveBeenCalledWith('google');

      resolveSignIn!(mockSuccessResult);
    });

    it('resets loading state after successful authentication', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      const { container } = render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalled();
      });

      // Loading state should be reset — spinner should be gone
      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).toBeNull();
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });

    it('resets loading state after error', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockRejectedValue(new Error('Authentication failed'));

      const { container } = render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Loading state should be reset
      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).toBeNull();
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Disabled State', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(<SocialLoginButtons disabled={true} />);

      const allButtons = screen.getAllByRole('button');
      allButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('prevents interactions when disabled', async () => {
      const user = userEvent.setup();
      render(<SocialLoginButtons lang="en" disabled={true} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      expect(mockSignInWithProvider).not.toHaveBeenCalled();
    });

    it('does not disable buttons when disabled is false', () => {
      render(<SocialLoginButtons lang="en" disabled={false} />);

      const allButtons = screen.getAllByRole('button');
      allButtons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper button structure', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        // Each button should have text content
        expect(button.textContent).toBeTruthy();

        // Each button should have an icon
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('has proper button labeling in Spanish', () => {
      render(<SocialLoginButtons lang="es" />);

      expect(screen.getByRole('button', { name: /continuar con google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con linkedin/i })).toBeInTheDocument();
    });

    it('provides visual feedback for interactions', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('transition-all');
        expect(button).toHaveClass('duration-200');
      });
    });
  });

  describe('Styling and Layout', () => {
    it('applies correct container styling', () => {
      const { container } = render(<SocialLoginButtons />);
      const buttonsContainer = container.firstChild;

      expect(buttonsContainer).toHaveClass('space-y-3');
    });

    it('renders buttons with full width', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('w-full');
        expect(button).toHaveClass('justify-center');
      });
    });

    it('applies shadow effects correctly', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('shadow-sm');
        expect(button).toHaveClass('hover:shadow-md');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing onSuccess callback gracefully', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });

      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalled();
      });
    });

    it('handles missing onError callback gracefully', async () => {
      const user = userEvent.setup();
      mockSignInWithProvider.mockRejectedValue(new Error('Test error'));

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });

      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });

    it('handles rapid consecutive clicks — only fires once', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });

      // Click once to start loading, then rapid clicks while loading
      await user.click(googleButton);

      // After first click, button is disabled — subsequent clicks are blocked
      await user.click(googleButton);
      await user.click(googleButton);

      // Should only be called once due to loading state
      expect(mockSignInWithProvider).toHaveBeenCalledTimes(1);

      resolveSignIn!(mockSuccessResult);
    });

    it('maintains loading state across re-renders', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      const { rerender, container } = render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
      });

      // Re-render with different props — should still be in loading state
      rerender(<SocialLoginButtons lang="es" />);

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();

      resolveSignIn!(mockSuccessResult);
    });
  });

  describe('Account Merge Flow', () => {
    const mockMergeData = {
      email: 'user@example.com',
      pendingCredential: { providerId: 'github.com' },
      existingProvider: 'google' as const,
    };

    it('shows merge prompt when account-exists-with-different-credential is detected', async () => {
      /**
       * TC-SLB-001: Verifies merge prompt is displayed on account conflict
       * Verifies: AC-merge-01
       */
      const user = userEvent.setup();
      const conflictError = { code: 'auth/account-exists-with-different-credential' };
      mockSignInWithProvider.mockRejectedValue(conflictError);
      mockHandleAccountExistsError.mockResolvedValue(mockMergeData);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/already exists via Google/i)).toBeInTheDocument();
      });
    });

    it('shows merge prompt in Spanish when lang is es', async () => {
      /**
       * TC-SLB-002: Verifies merge prompt message is in Spanish
       * Verifies: AC-merge-01
       */
      const user = userEvent.setup();
      const conflictError = { code: 'auth/account-exists-with-different-credential' };
      mockSignInWithProvider.mockRejectedValue(conflictError);
      mockHandleAccountExistsError.mockResolvedValue(mockMergeData);

      render(<SocialLoginButtons lang="es" />);

      const googleButton = screen.getByRole('button', { name: /continuar con google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/Ya existe una cuenta con/i)).toBeInTheDocument();
      });
    });

    it('clears loading state when merge prompt is shown', async () => {
      /**
       * TC-SLB-003: Verifies loading is cleared when merge prompt appears
       * Verifies: AC-merge-02
       */
      const user = userEvent.setup();
      const conflictError = { code: 'auth/account-exists-with-different-credential' };
      mockSignInWithProvider.mockRejectedValue(conflictError);
      mockHandleAccountExistsError.mockResolvedValue(mockMergeData);

      const { container } = render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/already exists via Google/i)).toBeInTheDocument();
      });

      // Provider buttons should not be in loading state
      expect(container.querySelector('.animate-spin')).toBeNull();
    });

    it('does not show merge prompt for non-conflict errors', async () => {
      /**
       * TC-SLB-004: Verifies non-conflict errors still show generic error message
       * Verifies: AC-merge-03
       */
      const user = userEvent.setup();
      const genericError = new Error('Authentication failed');
      mockSignInWithProvider.mockRejectedValue(genericError);
      mockHandleAccountExistsError.mockResolvedValue(null);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Authentication failed');
      });

      expect(screen.queryByText(/already exists via/i)).not.toBeInTheDocument();
    });

    it('dismisses merge prompt when cancel is clicked', async () => {
      /**
       * TC-SLB-005: Verifies cancel button hides the merge prompt
       * Verifies: AC-merge-04
       */
      const user = userEvent.setup();
      const conflictError = { code: 'auth/account-exists-with-different-credential' };
      mockSignInWithProvider.mockRejectedValue(conflictError);
      mockHandleAccountExistsError.mockResolvedValue(mockMergeData);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/already exists via Google/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText(/already exists via Google/i)).not.toBeInTheDocument();
    });

    it('completes merge and calls onSuccess when sign in with existing is clicked', async () => {
      /**
       * TC-SLB-006: Verifies successful merge flow calls completeMerge and onSuccess
       * Verifies: AC-merge-05
       */
      const user = userEvent.setup();
      const conflictError = { code: 'auth/account-exists-with-different-credential' };
      mockSignInWithProvider.mockRejectedValue(conflictError);
      mockHandleAccountExistsError.mockResolvedValue(mockMergeData);
      mockCompleteMerge.mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      render(<SocialLoginButtons lang="en" onSuccess={onSuccess} />);

      // First click triggers the conflict flow (there are multiple "Continue with Google" buttons)
      const providerButtons = screen.getAllByRole('button', { name: /continue with google/i });
      await user.click(providerButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/already exists via Google/i)).toBeInTheDocument();
      });

      // The merge prompt button is now first in the list; use the amber-styled one
      const mergeButtons = screen.getAllByRole('button', { name: /continue with google/i });
      const mergePromptButton = mergeButtons.find((btn) =>
        btn.className.includes('bg-amber-600')
      )!;
      await user.click(mergePromptButton);

      await waitFor(() => {
        expect(mockCompleteMerge).toHaveBeenCalledWith('google', mockMergeData.pendingCredential);
        expect(mockToast.success).toHaveBeenCalledWith('Accounts linked successfully!');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('shows error toast when merge fails', async () => {
      /**
       * TC-SLB-007: Verifies error is shown when completeMerge throws
       * Verifies: AC-merge-06
       */
      const user = userEvent.setup();
      const conflictError = { code: 'auth/account-exists-with-different-credential' };
      mockSignInWithProvider.mockRejectedValue(conflictError);
      mockHandleAccountExistsError.mockResolvedValue(mockMergeData);
      mockCompleteMerge.mockRejectedValue(new Error('Merge failed'));

      render(<SocialLoginButtons lang="en" />);

      const providerButtons = screen.getAllByRole('button', { name: /continue with google/i });
      await user.click(providerButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/already exists via Google/i)).toBeInTheDocument();
      });

      const mergeButtons = screen.getAllByRole('button', { name: /continue with google/i });
      const mergePromptButton = mergeButtons.find((btn) =>
        btn.className.includes('bg-amber-600')
      )!;
      await user.click(mergePromptButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to link accounts');
      });
    });

    it('shows Spanish success message after merge when lang is es', async () => {
      /**
       * TC-SLB-008: Verifies merge success message is in Spanish
       * Verifies: AC-merge-05
       */
      const user = userEvent.setup();
      const conflictError = { code: 'auth/account-exists-with-different-credential' };
      mockSignInWithProvider.mockRejectedValue(conflictError);
      mockHandleAccountExistsError.mockResolvedValue(mockMergeData);
      mockCompleteMerge.mockResolvedValue(undefined);

      render(<SocialLoginButtons lang="es" />);

      const providerButtons = screen.getAllByRole('button', { name: /continuar con google/i });
      await user.click(providerButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Ya existe una cuenta con/i)).toBeInTheDocument();
      });

      const mergeButtons = screen.getAllByRole('button', { name: /Continuar con Google/i });
      const mergePromptButton = mergeButtons.find((btn) =>
        btn.className.includes('bg-amber-600')
      )!;
      await user.click(mergePromptButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('¡Cuentas vinculadas exitosamente!');
      });
    });
  });
});
