// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface VerifyAlternateEmailProps {
  lang: 'es' | 'en';
}

type State = 'loading' | 'auth-required' | 'success' | 'admin-merge' | 'error';

const labels = {
  es: {
    loading: 'Verificando tu correo...',
    authTitle: 'Inicia sesión para continuar',
    authBody:
      'Necesitas iniciar sesión con tu cuenta de SECiD para verificar este correo.',
    signIn: 'Iniciar sesión',
    successTitle: 'Correo alterno verificado',
    successBody:
      'Ahora puedes iniciar sesión con este correo y acceder al mismo perfil.',
    adminTitle: 'Verificación recibida',
    adminBody:
      'Este correo ya pertenece a otra cuenta; un administrador debe vincularlas. No necesitas hacer nada más por ahora.',
    goToProfile: 'Ir a mi perfil',
    errors: {
      missingToken: 'El enlace no es válido o está incompleto.',
      expired: 'Este enlace de verificación expiró. Solicita uno nuevo.',
      invalid: 'Este enlace de verificación no es válido.',
      used: 'Este enlace ya fue utilizado.',
      permission:
        'Este enlace pertenece a otra cuenta. Inicia sesión con la cuenta correcta.',
      generic: 'No se pudo verificar el correo. Inténtalo de nuevo.',
    },
  },
  en: {
    loading: 'Verifying your email...',
    authTitle: 'Sign in to continue',
    authBody:
      'You need to sign in with your SECiD account to verify this email.',
    signIn: 'Sign in',
    successTitle: 'Alternate email verified',
    successBody:
      'You can now sign in with this email and reach the same profile.',
    adminTitle: 'Verification received',
    adminBody:
      'This email already belongs to another account; an administrator must link them. You do not need to do anything else for now.',
    goToProfile: 'Go to my profile',
    errors: {
      missingToken: 'The link is invalid or incomplete.',
      expired: 'This verification link has expired. Request a new one.',
      invalid: 'This verification link is not valid.',
      used: 'This link has already been used.',
      permission:
        'This link belongs to another account. Sign in with the correct account.',
      generic: 'Could not verify the email. Please try again.',
    },
  },
};

export const VerifyAlternateEmail: React.FC<VerifyAlternateEmailProps> = ({
  lang,
}) => {
  const { user, loading, refreshProfile } = useAuth();
  const l = labels[lang];

  const [state, setState] = useState<State>('loading');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>(l.errors.generic);
  const calledRef = useRef(false);

  const getToken = (): string | null => {
    try {
      return new URLSearchParams(window.location.search).get('token');
    } catch {
      return null;
    }
  };

  const mapError = (code: string): string => {
    // Firebase callable errors arrive as `functions/<code>`.
    const suffix = (code || '').split('/').pop();
    switch (suffix) {
      case 'deadline-exceeded':
        return l.errors.expired;
      case 'invalid-argument':
      case 'not-found':
        return l.errors.invalid;
      case 'already-exists':
      case 'failed-precondition':
        return l.errors.used;
      case 'permission-denied':
      case 'unauthenticated':
        return l.errors.permission;
      default:
        return l.errors.generic;
    }
  };

  useEffect(() => {
    // Wait until auth has resolved.
    if (loading) return;

    // The callable requires auth + uid match — gate before calling.
    if (!user) {
      setState('auth-required');
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    const token = getToken();
    if (!token) {
      setErrorMsg(l.errors.missingToken);
      setState('error');
      return;
    }

    (async () => {
      try {
        const fn = httpsCallable(functions, 'confirmAlternateEmail');
        const res: any = await fn({ token });
        const data = res?.data ?? {};
        setVerifiedEmail(data.email ?? null);
        if (data.requiresAdminMerge) {
          setState('admin-merge');
        } else {
          setState('success');
          // Pull the freshly-appended alternateEmails into context.
          try {
            await refreshProfile();
          } catch {
            /* non-blocking */
          }
        }
      } catch (err: any) {
        console.error('confirmAlternateEmail error:', err);
        setErrorMsg(mapError(err?.code || ''));
        setState('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const profileHref = `/${lang}/dashboard/profile`;
  const loginHref = `/${lang}/login`;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {state === 'loading' && (
        <>
          <ArrowPathIcon className="mx-auto h-10 w-10 animate-spin text-primary-500" />
          <p className="mt-4 text-gray-700 dark:text-gray-300">{l.loading}</p>
        </>
      )}

      {state === 'auth-required' && (
        <>
          <InformationCircleIcon className="mx-auto h-12 w-12 text-primary-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {l.authTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {l.authBody}
          </p>
          <a
            href={loginHref}
            className="mt-6 inline-block rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            {l.signIn}
          </a>
        </>
      )}

      {state === 'success' && (
        <>
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {l.successTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {verifiedEmail ? `${verifiedEmail} — ` : ''}
            {l.successBody}
          </p>
          <a
            href={profileHref}
            className="mt-6 inline-block rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            {l.goToProfile}
          </a>
        </>
      )}

      {state === 'admin-merge' && (
        <>
          <InformationCircleIcon className="mx-auto h-12 w-12 text-blue-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {l.adminTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {verifiedEmail ? `${verifiedEmail} — ` : ''}
            {l.adminBody}
          </p>
          <a
            href={profileHref}
            className="mt-6 inline-block rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            {l.goToProfile}
          </a>
        </>
      )}

      {state === 'error' && (
        <>
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'No se pudo verificar' : 'Verification failed'}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {errorMsg}
          </p>
          <a
            href={profileHref}
            className="mt-6 inline-block rounded-lg border border-gray-300 px-5 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
          >
            {l.goToProfile}
          </a>
        </>
      )}
    </div>
  );
};

export default VerifyAlternateEmail;
