import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AuthActionHandler } from '@/components/auth/AuthActionHandler';

vi.mock('firebase/auth', () => ({
  verifyPasswordResetCode: vi.fn(),
  confirmPasswordReset: vi.fn(),
  applyActionCode: vi.fn(),
  checkActionCode: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { name: 'mock-auth' },
}));

const mockedVerify = vi.mocked(verifyPasswordResetCode);
const mockedConfirm = vi.mocked(confirmPasswordReset);
const mockedApply = vi.mocked(applyActionCode);
const mockedCheck = vi.mocked(checkActionCode);

function setSearch(search: string) {
  window.history.replaceState({}, '', `/en/auth/action${search}`);
}

// Tests share window.location, so they must not run concurrently
// (vitest.config.ts enables sequence.concurrent + shuffle).
describe.sequential('AuthActionHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSearch('');
  });

  describe('resetPassword', () => {
    it('verifies the code, shows the email, and confirms the new password', async () => {
      setSearch('?mode=resetPassword&oobCode=code-123&lang=en');
      mockedVerify.mockResolvedValue('ana@example.com');
      mockedConfirm.mockResolvedValue(undefined);

      render(<AuthActionHandler lang="en" />);

      expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
      expect(mockedVerify).toHaveBeenCalledWith(auth, 'code-123');

      const user = userEvent.setup();
      await user.type(screen.getByLabelText('New password'), 'Secret123');
      await user.type(screen.getByLabelText('Confirm password'), 'Secret123');
      await user.click(
        screen.getByRole('button', { name: 'Save new password' })
      );

      await waitFor(() =>
        expect(mockedConfirm).toHaveBeenCalledWith(
          auth,
          'code-123',
          'Secret123'
        )
      );
      expect(await screen.findByText('Password updated')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Go to sign in' })
      ).toHaveAttribute('href', '/en/login');
    });

    it('rejects a password that does not meet the signup rules without calling Firebase', async () => {
      setSearch('?mode=resetPassword&oobCode=code-123');
      mockedVerify.mockResolvedValue('ana@example.com');

      render(<AuthActionHandler lang="en" />);
      await screen.findByText('ana@example.com');

      const user = userEvent.setup();
      await user.type(screen.getByLabelText('New password'), 'short');
      await user.type(screen.getByLabelText('Confirm password'), 'short');
      await user.click(
        screen.getByRole('button', { name: 'Save new password' })
      );

      expect(
        await screen.findByText('Password must be at least 8 characters')
      ).toBeInTheDocument();
      expect(mockedConfirm).not.toHaveBeenCalled();
    });

    it('shows a clear error and a link to request a new email when the code is invalid', async () => {
      setSearch('?mode=resetPassword&oobCode=bad-code');
      mockedVerify.mockRejectedValue({ code: 'auth/invalid-action-code' });

      render(<AuthActionHandler lang="en" />);

      expect(
        await screen.findByText(
          'This link is invalid or has already been used. Request a new one.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Request a new email' })
      ).toHaveAttribute('href', '/en/login?reset=1');
      expect(mockedConfirm).not.toHaveBeenCalled();
    });

    it('maps an expired code to the expired message', async () => {
      setSearch('?mode=resetPassword&oobCode=old-code');
      mockedVerify.mockRejectedValue({ code: 'auth/expired-action-code' });

      render(<AuthActionHandler lang="en" />);

      expect(
        await screen.findByText('This link has expired. Request a new one.')
      ).toBeInTheDocument();
    });
  });

  describe('verifyEmail', () => {
    it('applies the code and shows the success state', async () => {
      setSearch('?mode=verifyEmail&oobCode=verify-1');
      mockedApply.mockResolvedValue(undefined);

      render(<AuthActionHandler lang="en" />);

      expect(await screen.findByText('Email verified')).toBeInTheDocument();
      expect(mockedApply).toHaveBeenCalledWith(auth, 'verify-1');
      expect(
        screen.getByRole('link', { name: 'Go to sign in' })
      ).toHaveAttribute('href', '/en/login');
    });
  });

  describe('recoverEmail', () => {
    it('shows the restored email after checking and applying the code', async () => {
      setSearch('?mode=recoverEmail&oobCode=recover-1');
      mockedCheck.mockResolvedValue({
        data: { email: 'old@example.com' },
        operation: 'RECOVER_EMAIL',
      } as never);
      mockedApply.mockResolvedValue(undefined);

      render(<AuthActionHandler lang="en" />);

      expect(await screen.findByText('Email restored')).toBeInTheDocument();
      expect(screen.getByText('old@example.com')).toBeInTheDocument();
      expect(mockedCheck).toHaveBeenCalledWith(auth, 'recover-1');
      expect(mockedApply).toHaveBeenCalledWith(auth, 'recover-1');
    });
  });

  describe('invalid requests', () => {
    it('shows an error when mode is missing and never calls Firebase', async () => {
      setSearch('?oobCode=code-123');

      render(<AuthActionHandler lang="en" />);

      expect(
        await screen.findByText(
          'The link is incomplete or not valid. Request a new email and try again.'
        )
      ).toBeInTheDocument();
      expect(mockedVerify).not.toHaveBeenCalled();
      expect(mockedApply).not.toHaveBeenCalled();
      expect(mockedCheck).not.toHaveBeenCalled();
    });

    it('shows an error when the mode is unknown', async () => {
      setSearch('?mode=somethingElse&oobCode=code-123');

      render(<AuthActionHandler lang="en" />);

      expect(
        await screen.findByText(
          'The link is incomplete or not valid. Request a new email and try again.'
        )
      ).toBeInTheDocument();
    });

    it('renders Spanish copy when lang is es', async () => {
      setSearch('');

      render(<AuthActionHandler lang="es" />);

      expect(
        await screen.findByText(
          'El enlace está incompleto o no es válido. Solicita un correo nuevo e inténtalo de nuevo.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Solicitar un correo nuevo' })
      ).toHaveAttribute('href', '/es/login?reset=1');
    });
  });
});
