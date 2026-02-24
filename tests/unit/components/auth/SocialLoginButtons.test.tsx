// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { signInWithProvider } from '@/lib/auth';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  signInWithProvider: vi.fn(),
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
      signUp: {
        google: 'Sign up with Google',
      },
      signIn: {
        google: 'Continue with Google',
      },
      or: 'or',
    },
  })),
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, loading, disabled, onClick, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={loading ? 'loading-button' : 'button'}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

describe.skip('SocialLoginButtons', () => {
  const mockSignInWithProvider = vi.mocked(signInWithProvider);
  const mockToast = vi.mocked(toast);
  const user = userEvent.setup();

  const mockSuccessResult = {
    user: {
      uid: 'google123',
      email: 'user@example.com',
      displayName: 'Test User',
    },
    isNewUser: false,
  };

  const mockNewUserResult = {
    user: {
      uid: 'google123',
      email: 'user@example.com',
      displayName: 'Test User',
    },
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
      render(<SocialLoginButtons />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with linkedin/i })).toBeInTheDocument();
    });

    it('renders divider when providers are available', () => {
      render(<SocialLoginButtons />);

      expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('renders signup mode text correctly', () => {
      render(<SocialLoginButtons mode="signup" />);

      expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear cuenta con github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear cuenta con linkedin/i })).toBeInTheDocument();
    });

    it('renders signin mode text correctly', () => {
      render(<SocialLoginButtons mode="signin" />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con linkedin/i })).toBeInTheDocument();
    });

    it('uses correct language for Spanish', () => {
      render(<SocialLoginButtons lang="es" mode="signup" />);

      expect(screen.getByRole('button', { name: /crear cuenta con google/i })).toBeInTheDocument();
    });

    it('uses correct language for English', () => {
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
      buttons.forEach(button => {
        const svgElement = button.querySelector('svg');
        expect(svgElement).toBeInTheDocument();
      });
    });
  });

  describe('Provider Configuration', () => {
    it('renders Google button with correct styling', () => {
      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      expect(googleButton).toHaveClass('bg-white');
      expect(googleButton).toHaveClass('border-gray-300');
      expect(googleButton).toHaveClass('text-gray-700');
    });

    it('renders GitHub button with correct styling', () => {
      render(<SocialLoginButtons />);

      const githubButton = screen.getByRole('button', { name: /continuar con github/i });
      expect(githubButton).toHaveClass('bg-gray-900');
      expect(githubButton).toHaveClass('text-white');
    });

    it('renders LinkedIn button with correct styling', () => {
      render(<SocialLoginButtons />);

      const linkedinButton = screen.getByRole('button', { name: /continuar con linkedin/i });
      expect(linkedinButton).toHaveClass('bg-blue-600');
      expect(linkedinButton).toHaveClass('text-white');
    });

    it('applies correct button size and variant', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('data-variant', 'outline');
        expect(button).toHaveAttribute('data-size', 'lg');
      });
    });
  });

  describe('User Interactions', () => {
    it('handles successful Google login', async () => {
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      const onSuccess = vi.fn();
      render(<SocialLoginButtons onSuccess={onSuccess} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalledWith('google');
        expect(mockToast.success).toHaveBeenCalledWith('¡Bienvenido de vuelta!');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles successful GitHub login', async () => {
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      const onSuccess = vi.fn();
      render(<SocialLoginButtons onSuccess={onSuccess} />);

      const githubButton = screen.getByRole('button', { name: /continuar con github/i });
      await user.click(githubButton);

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalledWith('github');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('handles successful LinkedIn login', async () => {
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      const onSuccess = vi.fn();
      render(<SocialLoginButtons onSuccess={onSuccess} />);

      const linkedinButton = screen.getByRole('button', { name: /continuar con linkedin/i });
      await user.click(linkedinButton);

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalledWith('linkedin');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('shows different success message for new users', async () => {
      mockSignInWithProvider.mockResolvedValue(mockNewUserResult);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('¡Bienvenido! Tu cuenta ha sido creada exitosamente.');
      });
    });

    it('uses correct language for success messages', async () => {
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back!');
      });
    });

    it('uses correct language for new user messages', async () => {
      mockSignInWithProvider.mockResolvedValue(mockNewUserResult);

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Welcome! Your account has been created successfully.');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles provider authentication errors', async () => {
      const error = new Error('Authentication failed');
      mockSignInWithProvider.mockRejectedValue(error);

      const onError = vi.fn();
      render(<SocialLoginButtons onError={onError} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Authentication failed');
        expect(onError).toHaveBeenCalledWith('Authentication failed');
      });
    });

    it('handles errors without message', async () => {
      mockSignInWithProvider.mockRejectedValue({});

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al iniciar sesión');
      });
    });

    it('uses correct language for error messages', async () => {
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
      mockSignInWithProvider.mockRejectedValue({});

      render(<SocialLoginButtons lang="en" />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Sign in error');
      });
    });

    it('calls onError callback when provided', async () => {
      const error = new Error('Custom error');
      mockSignInWithProvider.mockRejectedValue(error);

      const onError = vi.fn();
      render(<SocialLoginButtons onError={onError} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Custom error');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state for the clicked provider', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveSignIn!(mockSuccessResult);
    });

    it('disables all buttons during loading', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        const allButtons = screen.getAllByRole('button');
        allButtons.forEach(button => {
          expect(button).toBeDisabled();
        });
      });

      resolveSignIn!(mockSuccessResult);
    });

    it('prevents multiple simultaneous requests', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const githubButton = screen.getByRole('button', { name: /continuar con github/i });

      await user.click(googleButton);
      await user.click(githubButton); // Should not trigger second request

      expect(mockSignInWithProvider).toHaveBeenCalledTimes(1);
      expect(mockSignInWithProvider).toHaveBeenCalledWith('google');

      resolveSignIn!(mockSuccessResult);
    });

    it('resets loading state after successful authentication', async () => {
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalled();
      });

      // Loading state should be reset
      await waitFor(() => {
        expect(screen.queryByTestId('loading-button')).not.toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });

    it('resets loading state after error', async () => {
      mockSignInWithProvider.mockRejectedValue(new Error('Authentication failed'));

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Loading state should be reset
      await waitFor(() => {
        expect(screen.queryByTestId('loading-button')).not.toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Disabled State', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(<SocialLoginButtons disabled={true} />);

      const allButtons = screen.getAllByRole('button');
      allButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('prevents interactions when disabled', async () => {
      render(<SocialLoginButtons disabled={true} />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      expect(mockSignInWithProvider).not.toHaveBeenCalled();
    });

    it('does not disable buttons when disabled is false', () => {
      render(<SocialLoginButtons disabled={false} />);

      const allButtons = screen.getAllByRole('button');
      allButtons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper button structure', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Each button should have text content
        expect(button.textContent).toBeTruthy();
        
        // Each button should have an icon
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('maintains focus during loading states', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      resolveSignIn!(mockSuccessResult);
    });

    it('has proper button labeling', () => {
      render(<SocialLoginButtons />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con linkedin/i })).toBeInTheDocument();
    });

    it('provides visual feedback for interactions', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
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
      buttons.forEach(button => {
        expect(button).toHaveClass('w-full');
        expect(button).toHaveClass('justify-center');
      });
    });

    it('has proper spacing between icon and text', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const flexContainer = button.querySelector('.flex.items-center.justify-center.space-x-3');
        expect(flexContainer).toBeInTheDocument();
      });
    });

    it('applies shadow effects correctly', () => {
      render(<SocialLoginButtons />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('shadow-sm');
        expect(button).toHaveClass('hover:shadow-md');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing onSuccess callback', async () => {
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      expect(async () => {
        await user.click(googleButton);
      }).not.toThrow();

      await waitFor(() => {
        expect(mockSignInWithProvider).toHaveBeenCalled();
      });
    });

    it('handles missing onError callback', async () => {
      mockSignInWithProvider.mockRejectedValue(new Error('Test error'));

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      expect(async () => {
        await user.click(googleButton);
      }).not.toThrow();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });

    it('handles rapid consecutive clicks', async () => {
      mockSignInWithProvider.mockResolvedValue(mockSuccessResult);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      
      // Rapid clicks
      await user.click(googleButton);
      await user.click(googleButton);
      await user.click(googleButton);

      // Should only be called once due to loading state
      expect(mockSignInWithProvider).toHaveBeenCalledTimes(1);
    });

    it('handles provider-specific errors', async () => {
      const providerError = {
        code: 'auth/popup-closed-by-user',
        message: 'The popup has been closed by the user before finalizing the operation.',
      };
      mockSignInWithProvider.mockRejectedValue(providerError);

      render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('The popup has been closed by the user before finalizing the operation.');
      });
    });

    it('maintains state across re-renders', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInWithProvider.mockReturnValue(signInPromise);

      const { rerender } = render(<SocialLoginButtons />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-button')).toBeInTheDocument();
      });

      // Re-render with different props
      rerender(<SocialLoginButtons lang="en" />);

      // Should still be in loading state
      expect(screen.getByTestId('loading-button')).toBeInTheDocument();

      resolveSignIn!(mockSuccessResult);
    });
  });
});