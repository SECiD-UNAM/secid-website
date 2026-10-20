import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import { useTranslations } from '@/hooks/useTranslations';
import { passwordSchema } from '@/lib/auth/password-rules';
import { toSafeInternalPath } from '@/lib/auth/safe-redirect';

/**
 * Branded handler for Firebase Auth email links (the `/__/auth/action` page
 * Firebase serves by default). Reads `mode`, `oobCode`, `continueUrl` and
 * `lang` from the query string and runs the matching Firebase flow.
 *
 * See issue #79 and docs/runbooks/prod-cutover.md ("URL de acción").
 */

type Lang = 'es' | 'en';
type Mode = 'resetPassword' | 'verifyEmail' | 'recoverEmail';
type Phase = 'loading' | 'reset-form' | 'success' | 'error';

interface ActionParams {
  mode: Mode | null;
  oobCode: string | null;
  continueUrl: string | null;
  lang: Lang | null;
}

interface AuthActionHandlerProps {
  lang?: Lang;
  className?: string;
}

const MODES: readonly Mode[] = ['resetPassword', 'verifyEmail', 'recoverEmail'];

function isMode(value: string | null): value is Mode {
  return value !== null && (MODES as readonly string[]).includes(value);
}

function isLang(value: string | null): value is Lang {
  return value === 'es' || value === 'en';
}

function readActionParams(): ActionParams {
  try {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const lang = params.get('lang');
    return {
      mode: isMode(mode) ? mode : null,
      oobCode: params.get('oobCode'),
      continueUrl: params.get('continueUrl'),
      lang: isLang(lang) ? lang : null,
    };
  } catch {
    return { mode: null, oobCode: null, continueUrl: null, lang: null };
  }
}

/**
 * Firebase sends `continueUrl` as an absolute URL. Keep it only when it points
 * back to this origin; otherwise fall back to the login page.
 */
function resolveContinuePath(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return toSafeInternalPath(
      `${url.pathname}${url.search}${url.hash}`,
      fallback
    );
  } catch {
    return fallback;
  }
}

function getErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

export const AuthActionHandler: React.FC<AuthActionHandlerProps> = ({
  lang: pageLang = 'es',
  className = '',
}) => {
  // Rendered with client:only, so window is available on first render.
  const [params] = useState<ActionParams>(readActionParams);
  const lang = params.lang ?? pageLang;
  const t = useTranslations(lang);
  const copy = t.auth.action;

  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [successMode, setSuccessMode] = useState<Mode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const startedRef = useRef(false);

  const mapError = (err: unknown): string =>
    t.auth.errors[getErrorCode(err)] ?? copy.errors.generic;

  const fail = (message: string) => {
    setErrorMessage(message);
    setPhase('error');
  };

  const succeed = (mode: Mode) => {
    setSuccessMode(mode);
    setPhase('success');
  };

  useEffect(() => {
    // StrictMode mounts twice; applying an action code twice would fail the
    // second time with auth/invalid-action-code, so guard the first run.
    if (startedRef.current) return;
    startedRef.current = true;

    if (!params.mode || !params.oobCode) {
      fail(copy.errors.missing);
      return;
    }
    runAction(params.mode, params.oobCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async (mode: Mode, oobCode: string) => {
    try {
      if (mode === 'resetPassword') {
        setEmail(await verifyPasswordResetCode(auth, oobCode));
        setPhase('reset-form');
        return;
      }
      if (mode === 'recoverEmail') {
        const info = await checkActionCode(auth, oobCode);
        setEmail(info.data.email ?? null);
      }
      await applyActionCode(auth, oobCode);
      succeed(mode);
    } catch (err) {
      fail(mapError(err));
    }
  };

  const handleNewPassword = async (
    password: string
  ): Promise<string | null> => {
    if (!params.oobCode) return copy.errors.missing;
    try {
      await confirmPasswordReset(auth, params.oobCode, password);
      succeed('resetPassword');
      return null;
    } catch (err) {
      return mapError(err);
    }
  };

  const loginHref = `/${lang}/login`;
  const requestNewHref = `/${lang}/login?reset=1`;
  const continueHref = resolveContinuePath(params.continueUrl, loginHref);

  return (
    <div
      className={`mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xs dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {phase === 'loading' && (
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-500" />
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            {copy.loading}
          </p>
        </div>
      )}

      {phase === 'reset-form' && (
        <ResetPasswordForm
          lang={lang}
          email={email}
          onSubmitPassword={handleNewPassword}
        />
      )}

      {phase === 'success' && successMode && (
        <SuccessCard
          lang={lang}
          mode={successMode}
          email={email}
          continueHref={continueHref}
          requestNewHref={requestNewHref}
        />
      )}

      {phase === 'error' && (
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {copy.errorTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {errorMessage}
          </p>
          <div className="mt-6">
            <Button href={requestNewHref} variant="primary">
              {copy.requestNew}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Reset-password form
// ---------------------------------------------------------------------------

interface ResetPasswordFormProps {
  lang: Lang;
  email: string | null;
  /** Resolves to an error message, or null on success. */
  onSubmitPassword: (password: string) => Promise<string | null>;
}

interface ResetFormData {
  password: string;
  confirmPassword: string;
}

const inputClass =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-xs focus:border-primary-500 focus:outline-hidden focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:text-sm';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  lang,
  email,
  onSubmitPassword,
}) => {
  const copy = useTranslations(lang).auth.action;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = z
    .object({
      password: passwordSchema({
        tooShort: copy.errors.passwordTooShort,
        needsUppercase: copy.errors.passwordNeedsUppercase,
        needsNumber: copy.errors.passwordNeedsNumber,
      }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: copy.errors.passwordsMismatch,
      path: ['confirmPassword'],
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ResetFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const message = await onSubmitPassword(data.password);
    if (message) setSubmitError(message);
    setIsSubmitting(false);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {copy.resetTitle}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {copy.resetSubtitle}
        </p>
        {email && (
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {email}
          </p>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
        >
          <div className="flex">
            <AlertCircle className="mt-0.5 mr-3 h-5 w-5 text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-400">
              {submitError}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="new-password" className={labelClass}>
            {copy.newPassword}
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            aria-describedby="new-password-hint"
            {...register('password')}
            className={inputClass}
          />
          <p
            id="new-password-hint"
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            {copy.passwordHint}
          </p>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className={labelClass}>
            {copy.confirmPassword}
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className={inputClass}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={isSubmitting}
      >
        {copy.submit}
      </Button>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Success card
// ---------------------------------------------------------------------------

interface SuccessCardProps {
  lang: Lang;
  mode: Mode;
  email: string | null;
  continueHref: string;
  requestNewHref: string;
}

const SuccessCard: React.FC<SuccessCardProps> = ({
  lang,
  mode,
  email,
  continueHref,
  requestNewHref,
}) => {
  const copy = useTranslations(lang).auth.action;
  const title = {
    resetPassword: copy.resetSuccessTitle,
    verifyEmail: copy.verifySuccessTitle,
    recoverEmail: copy.recoverSuccessTitle,
  }[mode];
  const body = {
    resetPassword: copy.resetSuccessBody,
    verifyEmail: copy.verifySuccessBody,
    recoverEmail: copy.recoverSuccessBody,
  }[mode];

  return (
    <div className="text-center">
      <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
      <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{body}</p>
      {mode === 'recoverEmail' && email && (
        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
          {email}
        </p>
      )}
      {mode === 'recoverEmail' && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {copy.recoverHint}{' '}
          <a
            href={requestNewHref}
            className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            {copy.requestNew}
          </a>
        </p>
      )}
      <div className="mt-6">
        <Button href={continueHref} variant="primary">
          {copy.goToLogin}
        </Button>
      </div>
    </div>
  );
};

export default AuthActionHandler;
