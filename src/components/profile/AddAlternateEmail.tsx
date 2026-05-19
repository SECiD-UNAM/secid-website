// @ts-nocheck
import React, { useState } from 'react';
import { EnvelopeIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface AddAlternateEmailProps {
  lang: 'es' | 'en';
}

const labels = {
  es: {
    title: 'Correo alterno',
    description:
      'Agrega otro correo para poder iniciar sesión con cualquiera de los dos y acceder al mismo perfil.',
    currentTitle: 'Correos verificados',
    verified: 'Verificado',
    pending: 'Pendiente',
    placeholder: 'tu-otro-correo@ejemplo.com',
    add: 'Enviar enlace de verificación',
    sending: 'Enviando...',
    success:
      'Si el correo es válido, te enviamos un enlace de verificación. Revisa tu bandeja (y spam).',
    errorInvalid: 'Correo inválido',
    errorOwnPrimary: 'Ese ya es el correo principal de tu cuenta.',
    errorMembersOnly:
      'Los correos alternos están disponibles solo para miembros con membresía completa.',
    errorGeneric: 'No se pudo procesar la solicitud. Inténtalo de nuevo.',
    errorEmpty: 'Ingresa un correo',
  },
  en: {
    title: 'Alternate email',
    description:
      'Add another email so you can sign in with either one and reach the same profile.',
    currentTitle: 'Verified emails',
    verified: 'Verified',
    pending: 'Pending',
    placeholder: 'your-other-email@example.com',
    add: 'Send verification link',
    sending: 'Sending...',
    success:
      'If the email is valid, we sent you a verification link. Check your inbox (and spam).',
    errorInvalid: 'Invalid email',
    errorOwnPrimary: "That's already your account's primary email.",
    errorMembersOnly: 'Alternate emails are available to full members only.',
    errorGeneric: 'Could not process the request. Please try again.',
    errorEmpty: 'Enter an email',
  },
};

export const AddAlternateEmail: React.FC<AddAlternateEmailProps> = ({
  lang,
}) => {
  const { userProfile, isVerified } = useAuth();
  const l = labels[lang];

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const alternateEmails: { email: string; verifiedAt: any }[] =
    userProfile?.alternateEmails ?? [];

  const handleSubmit = async () => {
    setMessage(null);
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError(l.errorEmpty);
      return;
    }

    setSending(true);
    try {
      const fn = httpsCallable(functions, 'requestAlternateEmail');
      await fn({ email: trimmed });
      // Always generic — the backend never reveals whether the email exists.
      setMessage(l.success);
      setEmail('');
    } catch (err: any) {
      console.error('requestAlternateEmail error:', err);
      const reason = err?.details?.reason;
      if (reason === 'members_only') {
        setError(l.errorMembersOnly);
      } else if (reason === 'primary_email') {
        setError(l.errorOwnPrimary);
      } else if (
        reason === 'invalid_format' ||
        err?.code === 'functions/invalid-argument'
      ) {
        setError(l.errorInvalid);
      } else {
        setError(l.errorGeneric);
      }
    } finally {
      setSending(false);
    }
  };

  // First-class members only (numeroCuenta + proof + admin approval).
  // Use the AuthContext-derived flag so membership is judged exactly
  // like the sidebar/rest of the app (truthy), not a brittle === true.
  if (!isVerified) return null;

  return (
    <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
      <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-white">
        {l.title}
      </h3>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {l.description}
      </p>

      {alternateEmails.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {l.currentTitle}
          </p>
          <ul className="space-y-2">
            {alternateEmails.map((entry) => (
              <li
                key={entry.email}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                  {entry.email}
                </span>
                <span
                  className={
                    entry.verifiedAt
                      ? 'inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }
                >
                  {entry.verifiedAt && (
                    <CheckBadgeIcon className="h-3.5 w-3.5" />
                  )}
                  {entry.verifiedAt ? l.verified : l.pending}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Nuevo correo' : 'New email'}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={l.placeholder}
            disabled={sending}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-700 dark:text-green-300">
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!email.trim() || sending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? l.sending : l.add}
        </button>
      </div>
    </div>
  );
};

export default AddAlternateEmail;
