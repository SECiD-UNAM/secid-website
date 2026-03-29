import React, { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerificationBannerProps {
  lang?: 'es' | 'en';
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  lang = 'es',
}) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await sendEmailVerification(user);
      setSent(true);
    } catch {
      // Silently fail — rate limits may apply
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {lang === 'es'
              ? 'Verifica tu correo electrónico'
              : 'Verify your email address'}
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {lang === 'es'
              ? 'Revisa tu bandeja de entrada y haz clic en el enlace de verificación para acceder a todas las funciones.'
              : 'Check your inbox and click the verification link to unlock all features.'}
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleResend}
              disabled={sending || sent}
              className="text-sm font-medium text-amber-800 underline hover:text-amber-900 disabled:opacity-50 dark:text-amber-200 dark:hover:text-amber-100"
            >
              {sent
                ? (lang === 'es' ? 'Correo enviado' : 'Email sent')
                : sending
                  ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                  : (lang === 'es' ? 'Reenviar correo' : 'Resend email')}
            </button>
            <button
              onClick={handleRefresh}
              className="text-sm font-medium text-amber-800 underline hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
            >
              {lang === 'es' ? 'Ya verifiqué' : 'I already verified'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
