import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { SignUpForm } from '@/components/auth/SignUpForm';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  sendEmailVerification,
} from 'firebase/auth';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

// `vi.mock` factories are hoisted above imports, so anything they close over
// must be hoisted too.
const { mockCompleteRegistration, mockAuth } = vi.hoisted(() => ({
  mockCompleteRegistration: vi.fn(),
  mockAuth: {
    currentUser: null as { uid: string } | null,
    authStateReady: vi.fn(() => Promise.resolve()),
    onAuthStateChanged: vi.fn(() => () => {}),
  },
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPopup: vi.fn(),
  sendEmailVerification: vi.fn(() => Promise.resolve()),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ path: 'users/user123' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({ fullPath: 'verification-docs/user123/proof.pdf' })),
  uploadBytes: vi.fn(() => Promise.resolve()),
  getDownloadURL: vi.fn(() => Promise.resolve('https://cdn.test/proof.pdf')),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => mockCompleteRegistration),
}));

vi.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  db: {},
  storage: {},
  functions: {},
}));

vi.mock('@/lib/merge/mutations', () => ({
  checkNumeroCuentaMatch: vi.fn(() => Promise.resolve(null)),
  setPotentialMergeMatch: vi.fn(() => Promise.resolve()),
}));

vi.mock('lucide-react', () => ({
  Building2: () => null,
}));

// The survey step is a separate component with its own suite; here it only
// needs to hand control back so the wizard can reach the "done" step.
vi.mock('@/components/auth/SignupSurveyStep', () => ({
  default: ({ uid, onDone }: { uid: string; onDone: () => void }) => (
    <div data-testid="signup-survey" data-uid={uid}>
      <button type="button" onClick={onDone}>
        Finish survey
      </button>
    </div>
  ),
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

type SignUpFormProps = ComponentProps<typeof SignUpForm>;

// SignUpForm defaults to lang='es'; the suite asserts English copy, so every
// render opts into 'en' unless a test is explicitly about Spanish.
const renderForm = (props: Partial<SignUpFormProps> = {}) =>
  render(<SignUpForm lang="en" {...props} />);

const VALID = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'Password123',
};

// Every test renders into the shared document and mutates the shared auth
// stub, which is incompatible with the suite's per-file concurrent execution
// (vitest sequence.concurrent) — run sequentially.
describe('SignUpForm', { concurrent: false }, () => {
  const mockCreateUser = vi.mocked(createUserWithEmailAndPassword);
  const mockUpdateProfile = vi.mocked(updateProfile);
  const mockSignInWithPopup = vi.mocked(signInWithPopup);
  const mockOnSnapshot = vi.mocked(onSnapshot);
  const user = userEvent.setup();

  const mockUserCredential = {
    user: { uid: 'user123', email: VALID.email, displayName: 'John Doe' },
  };

  // Firestore delivers snapshots asynchronously; firing synchronously would
  // hit the component's `unsubscribe` before it is assigned (TDZ), which the
  // real SDK never does.
  const profileDocAppears = () => {
    mockOnSnapshot.mockImplementation(((_ref: unknown, onNext: unknown) => {
      Promise.resolve().then(() =>
        (onNext as (snap: { exists: () => boolean }) => void)({
          exists: () => true,
        })
      );
      return () => {};
    }) as typeof onSnapshot);
  };

  const profileSubscriptionFails = (err: Error) => {
    mockOnSnapshot.mockImplementation(((
      _ref: unknown,
      _onNext: unknown,
      onError: unknown
    ) => {
      Promise.resolve().then(() => (onError as (e: Error) => void)(err));
      return () => {};
    }) as typeof onSnapshot);
  };

  const getAccountFields = () => ({
    firstName: screen.getByLabelText(/first name/i),
    lastName: screen.getByLabelText(/last name/i),
    email: screen.getByLabelText(/email address/i),
    password: screen.getByLabelText(/^password$/i),
    confirmPassword: screen.getByLabelText(/confirm password/i),
    terms: screen.getByLabelText(/i accept the/i),
    submit: screen.getByRole('button', { name: /create account/i }),
  });

  const fillValidAccount = async (overrides: Partial<typeof VALID> = {}) => {
    const values = { ...VALID, ...overrides };
    const f = getAccountFields();
    await user.type(f.firstName, values.firstName);
    await user.type(f.lastName, values.lastName);
    await user.type(f.email, values.email);
    await user.type(f.password, values.password);
    await user.type(f.confirmPassword, values.password);
    await user.click(f.terms);
    return f;
  };

  const submitValidAccount = async () => {
    const f = await fillValidAccount();
    await user.click(f.submit);
  };

  const expectTypeStep = () =>
    screen.findByRole('heading', { name: /registration type/i });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = null;
    mockCreateUser.mockResolvedValue(mockUserCredential as never);
    mockUpdateProfile.mockResolvedValue(undefined);
    mockCompleteRegistration.mockResolvedValue({ data: {} });
    profileDocAppears();
    // The component logs every failure path; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the account step with all required elements', () => {
      renderForm();

      expect(
        screen.getByRole('heading', { name: /create account/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/join the unam data science alumni community/i)
      ).toBeInTheDocument();
      const f = getAccountFields();
      Object.values(f).forEach((el) => expect(el).toBeInTheDocument());
      expect(
        screen.getByRole('button', { name: /sign up with google/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /sign in here/i })
      ).toHaveAttribute('href', '/en/login');
    });

    it('renders Spanish copy by default', () => {
      render(<SignUpForm />);

      expect(
        screen.getByRole('heading', { name: /crear cuenta/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /registrarse con google/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /términos y condiciones/i })
      ).toHaveAttribute('href', '/es/terms');
    });

    it('links the terms page for the active language', () => {
      renderForm();

      expect(
        screen.getByRole('link', { name: /terms and conditions/i })
      ).toHaveAttribute('href', '/en/terms');
    });

    it('shows the step indicator with account, type and survey steps', () => {
      const { container } = renderForm();

      const indicators = container.querySelectorAll('.rounded-full');
      expect(indicators).toHaveLength(3);
      expect(indicators[0]).toHaveClass('bg-primary-500');
      expect(indicators[1]).not.toHaveClass('bg-primary-500');
    });
  });

  describe('Form Validation', () => {
    it('validates first name length', async () => {
      renderForm();
      const f = getAccountFields();

      await user.type(f.firstName, 'A');
      await user.click(f.submit);

      expect(
        await screen.findByText(/first name must be at least 2 characters/i)
      ).toBeInTheDocument();
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('validates last name length', async () => {
      renderForm();
      const f = getAccountFields();

      await user.type(f.lastName, 'B');
      await user.click(f.submit);

      expect(
        await screen.findByText(/last name must be at least 2 characters/i)
      ).toBeInTheDocument();
    });

    it('blocks a malformed email with native validation before zod runs', async () => {
      renderForm();
      const f = getAccountFields();

      await user.type(f.email, 'invalid-email');
      await user.click(f.submit);

      // type="email" + no noValidate: the browser rejects the value itself.
      expect((f.email as HTMLInputElement).validity.typeMismatch).toBe(true);
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(
        screen.queryByText(/invalid email address/i)
      ).not.toBeInTheDocument();
    });

    it('shows the zod email message for a syntactically valid but unaccepted address', async () => {
      renderForm();
      const f = getAccountFields();

      // Passes native validation (no TLD required) but fails z.string().email().
      await user.type(f.email, 'user@localhost');
      await user.click(f.submit);

      expect(
        await screen.findByText(/invalid email address/i)
      ).toBeInTheDocument();
    });

    it('validates password requirements', async () => {
      renderForm();
      const f = getAccountFields();

      await user.type(f.password, '123');
      await user.click(f.submit);
      expect(
        await screen.findByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();

      await user.clear(f.password);
      await user.type(f.password, 'password123');
      await user.click(f.submit);
      expect(
        await screen.findByText(
          /password must contain at least one uppercase letter/i
        )
      ).toBeInTheDocument();

      await user.clear(f.password);
      await user.type(f.password, 'PASSWORDXX');
      await user.click(f.submit);
      expect(
        await screen.findByText(/password must contain at least one number/i)
      ).toBeInTheDocument();
    });

    it('validates password confirmation match', async () => {
      renderForm();
      const f = getAccountFields();

      await user.type(f.password, 'Password123');
      await user.type(f.confirmPassword, 'DifferentPassword123');
      await user.click(f.submit);

      expect(
        await screen.findByText(/passwords don't match/i)
      ).toBeInTheDocument();
    });

    it('validates terms acceptance', async () => {
      renderForm();
      const f = getAccountFields();

      await user.type(f.firstName, VALID.firstName);
      await user.type(f.lastName, VALID.lastName);
      await user.type(f.email, VALID.email);
      await user.type(f.password, VALID.password);
      await user.type(f.confirmPassword, VALID.password);
      await user.click(f.submit);

      expect(
        await screen.findByText(/you must accept the terms/i)
      ).toBeInTheDocument();
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('shows every field error on an empty submission', async () => {
      renderForm();

      await user.click(getAccountFields().submit);

      expect(
        await screen.findByText(/first name must be at least 2 characters/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/last name must be at least 2 characters/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/you must accept the terms/i)
      ).toBeInTheDocument();
    });

    it('renders validation errors with the error styling', async () => {
      renderForm();

      await user.click(getAccountFields().submit);

      const message = await screen.findByText(
        /first name must be at least 2 characters/i
      );
      expect(message).toHaveClass('text-red-600');
    });
  });

  describe('Account creation', () => {
    it('creates the account, sets the display name and advances to the type step', async () => {
      renderForm();

      await submitValidAccount();

      expect(await expectTypeStep()).toBeInTheDocument();
      expect(mockCreateUser).toHaveBeenCalledWith(
        mockAuth,
        VALID.email,
        VALID.password
      );
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUserCredential.user, {
        displayName: 'John Doe',
      });
      expect(sendEmailVerification).toHaveBeenCalledWith(
        mockUserCredential.user
      );
    });

    it('writes first/last name to the profile once the Cloud Function creates it', async () => {
      renderForm();

      await submitValidAccount();
      await expectTypeStep();

      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
        firstName: VALID.firstName,
        lastName: VALID.lastName,
      });
    });

    it('does not call onSuccess on account creation alone', async () => {
      const onSuccess = vi.fn();
      renderForm({ onSuccess });

      await submitValidAccount();
      await expectTypeStep();

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('keeps typed values in the inputs', async () => {
      renderForm();
      const f = getAccountFields();

      await user.type(f.firstName, VALID.firstName);
      await user.type(f.email, VALID.email);

      expect(f.firstName).toHaveValue(VALID.firstName);
      expect(f.email).toHaveValue(VALID.email);
    });

    it('clears validation errors once the form is filled correctly', async () => {
      renderForm();

      await user.click(getAccountFields().submit);
      expect(
        await screen.findByText(/first name must be at least 2 characters/i)
      ).toBeInTheDocument();

      await submitValidAccount();

      await expectTypeStep();
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Google Sign Up', () => {
    it('advances to the type step after a successful popup', async () => {
      mockSignInWithPopup.mockResolvedValue({
        user: { uid: 'google123' },
      } as never);
      renderForm();

      await user.click(
        screen.getByRole('button', { name: /sign up with google/i })
      );

      expect(await expectTypeStep()).toBeInTheDocument();
      expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('shows the default error when the popup fails', async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: 'auth/popup-closed-by-user',
      });
      renderForm();

      await user.click(
        screen.getByRole('button', { name: /sign up with google/i })
      );

      expect(await screen.findByText(/an error occurred/i)).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /create account/i })
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays the translated Firebase error', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
      renderForm();

      await submitValidAccount();

      expect(
        await screen.findByText(/this email is already registered/i)
      ).toBeInTheDocument();
    });

    it('displays the translated Firebase error in Spanish', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
      render(<SignUpForm />);

      const f = {
        firstName: screen.getByLabelText(/^nombre$/i),
        lastName: screen.getByLabelText(/^apellido$/i),
        email: screen.getByLabelText(/correo electrónico/i),
        password: screen.getByLabelText(/^contraseña$/i),
        confirmPassword: screen.getByLabelText(/confirmar contraseña/i),
        terms: screen.getByLabelText(/acepto los/i),
        submit: screen.getByRole('button', { name: /crear cuenta/i }),
      };
      await user.type(f.firstName, VALID.firstName);
      await user.type(f.lastName, VALID.lastName);
      await user.type(f.email, VALID.email);
      await user.type(f.password, VALID.password);
      await user.type(f.confirmPassword, VALID.password);
      await user.click(f.terms);
      await user.click(f.submit);

      expect(
        await screen.findByText(/este correo ya está registrado/i)
      ).toBeInTheDocument();
    });

    it('displays the default error for unknown error codes', async () => {
      mockCreateUser.mockRejectedValue({ code: 'unknown-error' });
      renderForm();

      await submitValidAccount();

      expect(await screen.findByText(/an error occurred/i)).toBeInTheDocument();
    });

    it('explains configuration errors that arrive as internal errors', async () => {
      mockCreateUser.mockRejectedValue({
        code: 'auth/internal-error',
        message: 'CONFIGURATION_NOT_FOUND',
      });
      renderForm();

      await submitValidAccount();

      expect(
        await screen.findByText(/authentication service is not configured/i)
      ).toBeInTheDocument();
    });

    it('surfaces a profile update failure', async () => {
      mockUpdateProfile.mockRejectedValue(new Error('Profile update failed'));
      renderForm();

      await submitValidAccount();

      expect(await screen.findByText(/an error occurred/i)).toBeInTheDocument();
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it('surfaces a profile subscription error (e.g. rules denial)', async () => {
      profileSubscriptionFails(
        Object.assign(new Error('Missing or insufficient permissions.'), {
          code: 'permission-denied',
        })
      );
      renderForm();

      await submitValidAccount();

      expect(await screen.findByText(/an error occurred/i)).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /create account/i })
      ).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state and disables both buttons during submission', async () => {
      let resolveCreateUser: (value: unknown) => void = () => {};
      mockCreateUser.mockReturnValue(
        new Promise((resolve) => {
          resolveCreateUser = resolve;
        }) as never
      );
      renderForm();

      await submitValidAccount();

      await waitFor(() => {
        expect(screen.getAllByTestId('loading-button')).toHaveLength(2);
      });
      screen
        .getAllByTestId('loading-button')
        .forEach((b) => expect(b).toBeDisabled());

      resolveCreateUser(mockUserCredential);
      await expectTypeStep();
    });

    it('shows loading state during Google sign up', async () => {
      let resolveGoogle: (value: unknown) => void = () => {};
      mockSignInWithPopup.mockReturnValue(
        new Promise((resolve) => {
          resolveGoogle = resolve;
        }) as never
      );
      renderForm();

      await user.click(
        screen.getByRole('button', { name: /sign up with google/i })
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('loading-button')).toHaveLength(2);
      });

      resolveGoogle({ user: { uid: 'google123' } });
      await expectTypeStep();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and attributes', () => {
      renderForm();
      const f = getAccountFields();

      expect(f.firstName).toHaveAttribute('type', 'text');
      expect(f.firstName).toHaveAttribute('autocomplete', 'given-name');
      expect(f.lastName).toHaveAttribute('type', 'text');
      expect(f.lastName).toHaveAttribute('autocomplete', 'family-name');
      expect(f.email).toHaveAttribute('type', 'email');
      expect(f.email).toHaveAttribute('autocomplete', 'email');
      expect(f.password).toHaveAttribute('type', 'password');
      expect(f.password).toHaveAttribute('autocomplete', 'new-password');
      expect(f.confirmPassword).toHaveAttribute('type', 'password');
      expect(f.confirmPassword).toHaveAttribute('autocomplete', 'new-password');
    });

    it('has proper checkbox accessibility', () => {
      renderForm();

      const terms = getAccountFields().terms;
      expect(terms).toHaveAttribute('type', 'checkbox');
      expect(terms).toHaveAttribute('id', 'acceptTerms');
    });
  });

  describe('Re-entry for an already authenticated user', () => {
    it('skips account creation and starts at the type step', async () => {
      mockAuth.currentUser = { uid: 'user123' };
      renderForm();

      expect(await expectTypeStep()).toBeInTheDocument();
      expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
      expect(mockAuth.authStateReady).toHaveBeenCalled();
      expect(mockAuth.onAuthStateChanged).toHaveBeenCalled();
    });

    it('offers member, collaborator and recruiter options', async () => {
      mockAuth.currentUser = { uid: 'user123' };
      renderForm();
      await expectTypeStep();

      expect(
        screen.getByRole('button', { name: /unam data science graduate/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /collaborate with secid/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /recruit talent/i })
      ).toBeInTheDocument();
    });
  });

  describe('Collaborator path', () => {
    it('completes registration, runs the survey and calls onSuccess from the done step', async () => {
      mockAuth.currentUser = { uid: 'user123' };
      const onSuccess = vi.fn();
      renderForm({ onSuccess });
      await expectTypeStep();

      await user.click(
        screen.getByRole('button', { name: /collaborate with secid/i })
      );

      const survey = await screen.findByTestId('signup-survey');
      expect(survey).toHaveAttribute('data-uid', 'user123');
      expect(httpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        'completeRegistration'
      );
      expect(mockCompleteRegistration).toHaveBeenCalledWith({
        registrationType: 'collaborator',
      });

      await user.click(screen.getByRole('button', { name: /finish survey/i }));

      expect(
        await screen.findByRole('heading', { name: /welcome, collaborator/i })
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: /go to dashboard/i })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('shows an error when the Cloud Function fails', async () => {
      mockAuth.currentUser = { uid: 'user123' };
      mockCompleteRegistration.mockRejectedValue(new Error('internal'));
      renderForm();
      await expectTypeStep();

      await user.click(
        screen.getByRole('button', { name: /collaborate with secid/i })
      );

      await waitFor(() => {
        expect(mockCompleteRegistration).toHaveBeenCalled();
      });
      expect(screen.queryByTestId('signup-survey')).not.toBeInTheDocument();
      // The type step has no error slot; the message is shown on the next
      // form step the user reaches.
      await user.click(
        screen.getByRole('button', { name: /unam data science graduate/i })
      );
      expect(
        await screen.findByText(/error completing registration/i)
      ).toBeInTheDocument();
    });
  });

  describe('Member (UNAM verification) path', () => {
    const goToUnamStep = async () => {
      mockAuth.currentUser = { uid: 'user123' };
      renderForm();
      await expectTypeStep();
      await user.click(
        screen.getByRole('button', { name: /unam data science graduate/i })
      );
      return screen.findByRole('heading', { name: /unam verification/i });
    };

    it('validates the 9-digit account number and campus', async () => {
      await goToUnamStep();

      await user.type(screen.getByLabelText(/unam account number/i), '1234');
      await user.click(
        screen.getByRole('button', { name: /submit membership request/i })
      );

      expect(
        await screen.findByText(/must be exactly 9 digits/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/campus is required/i)).toBeInTheDocument();
      expect(mockCompleteRegistration).not.toHaveBeenCalled();
    });

    it('submits the member registration and reaches the survey', async () => {
      await goToUnamStep();

      await user.type(
        screen.getByLabelText(/unam account number/i),
        '317123456'
      );
      await user.selectOptions(screen.getByLabelText(/academic level/i), [
        'posgrado',
      ]);
      await user.selectOptions(screen.getByLabelText(/^campus/i), ['IIMAS']);
      await user.click(
        screen.getByRole('button', { name: /submit membership request/i })
      );

      expect(await screen.findByTestId('signup-survey')).toBeInTheDocument();
      expect(mockCompleteRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          registrationType: 'member',
          numeroCuenta: '317123456',
          academicLevel: 'posgrado',
          campus: 'IIMAS',
          generation: '',
          verificationDocumentUrl: '',
        })
      );
      expect(uploadBytes).not.toHaveBeenCalled();
    });

    it('sends the graduation year as a number when provided', async () => {
      await goToUnamStep();

      await user.type(
        screen.getByLabelText(/unam account number/i),
        '317123456'
      );
      await user.selectOptions(screen.getByLabelText(/^campus/i), ['IIMAS']);
      await user.type(screen.getByLabelText(/graduation year/i), '2024');
      await user.click(
        screen.getByRole('button', { name: /submit membership request/i })
      );

      await screen.findByTestId('signup-survey');
      expect(mockCompleteRegistration).toHaveBeenCalledWith(
        expect.objectContaining({ graduationYear: 2024 })
      );
    });

    it('blocks an out-of-range graduation year natively, and zod renders its message when bypassed', async () => {
      await goToUnamStep();
      const year = screen.getByLabelText(
        /graduation year/i
      ) as HTMLInputElement;

      await user.type(
        screen.getByLabelText(/unam account number/i),
        '317123456'
      );
      await user.selectOptions(screen.getByLabelText(/^campus/i), ['IIMAS']);
      await user.type(year, '1999');
      await user.click(
        screen.getByRole('button', { name: /submit membership request/i })
      );

      // min="2000" on the input: the browser rejects the value before zod.
      expect(year.validity.rangeUnderflow).toBe(true);
      expect(mockCompleteRegistration).not.toHaveBeenCalled();

      // fireEvent.submit skips constraint validation, so zod runs and the
      // (previously unrendered) graduationYear error is shown.
      fireEvent.submit(year.closest('form') as HTMLFormElement);
      expect(
        await screen.findByText(/greater than or equal to 2000/i)
      ).toBeInTheDocument();
      expect(mockCompleteRegistration).not.toHaveBeenCalled();
    });

    it('uploads the verification document and sends its URL', async () => {
      await goToUnamStep();
      const file = new File(['%PDF-1.4'], 'proof.pdf', {
        type: 'application/pdf',
      });

      await user.upload(screen.getByLabelText(/choose file/i), file);
      expect(
        await screen.findByText(/file selected: proof\.pdf/i)
      ).toBeInTheDocument();

      await user.type(
        screen.getByLabelText(/unam account number/i),
        '317123456'
      );
      await user.selectOptions(screen.getByLabelText(/^campus/i), ['IIMAS']);
      await user.click(
        screen.getByRole('button', { name: /submit membership request/i })
      );

      await screen.findByTestId('signup-survey');
      expect(uploadBytes).toHaveBeenCalledWith(expect.anything(), file);
      expect(getDownloadURL).toHaveBeenCalled();
      expect(mockCompleteRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationDocumentUrl: 'https://cdn.test/proof.pdf',
        })
      );
    });

    it('rejects a verification document with an unsupported type', async () => {
      await goToUnamStep();
      // ".pdf" passes the input's accept filter; the component checks MIME.
      const file = new File(['nope'], 'proof.pdf', { type: 'text/plain' });

      await user.upload(screen.getByLabelText(/choose file/i), file);

      expect(
        await screen.findByText(/invalid format\. use pdf, jpg or png/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/file selected/i)).not.toBeInTheDocument();
    });

    it('shows an error when the Cloud Function rejects', async () => {
      mockCompleteRegistration.mockRejectedValue(new Error('internal'));
      await goToUnamStep();

      await user.type(
        screen.getByLabelText(/unam account number/i),
        '317123456'
      );
      await user.selectOptions(screen.getByLabelText(/^campus/i), ['IIMAS']);
      await user.click(
        screen.getByRole('button', { name: /submit membership request/i })
      );

      expect(
        await screen.findByText(/error submitting request/i)
      ).toBeInTheDocument();
      expect(screen.queryByTestId('signup-survey')).not.toBeInTheDocument();
    });

    it('goes back to the type step', async () => {
      await goToUnamStep();

      await user.click(screen.getByRole('button', { name: /^back$/i }));

      expect(await expectTypeStep()).toBeInTheDocument();
    });
  });

  describe('Recruiter path', () => {
    const goToCompanyStep = async () => {
      mockAuth.currentUser = { uid: 'user123' };
      const utils = renderForm();
      await expectTypeStep();
      await user.click(screen.getByRole('button', { name: /recruit talent/i }));
      await screen.findByRole('heading', { name: /company information/i });
      return utils;
    };

    it('validates company name and position', async () => {
      await goToCompanyStep();

      await user.click(
        screen.getByRole('button', { name: /complete registration/i })
      );

      expect(
        await screen.findByText(/company name is required/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/position is required/i)).toBeInTheDocument();
      expect(mockCompleteRegistration).not.toHaveBeenCalled();
    });

    it('submits the recruiter registration and ends on the recruiter welcome', async () => {
      const { container } = await goToCompanyStep();
      const input = (name: string) =>
        container.querySelector(`input[name="${name}"]`) as HTMLInputElement;

      await user.type(input('companyName'), 'Acme Corp');
      await user.type(input('companyPosition'), 'Talent Lead');
      await user.type(input('companyWebsite'), 'https://acme.example');
      await user.click(
        screen.getByRole('button', { name: /complete registration/i })
      );

      await screen.findByTestId('signup-survey');
      expect(mockCompleteRegistration).toHaveBeenCalledWith({
        registrationType: 'recruiter',
        companyName: 'Acme Corp',
        companyPosition: 'Talent Lead',
        companyWebsite: 'https://acme.example',
      });

      await user.click(screen.getByRole('button', { name: /finish survey/i }));

      expect(
        await screen.findByRole('heading', { name: /welcome, recruiter/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /post a job/i })).toHaveAttribute(
        'href',
        '/en/post-job'
      );
    });
  });
});
