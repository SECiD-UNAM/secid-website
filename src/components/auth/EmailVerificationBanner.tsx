import React, { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerificationBannerProps {
  lang?: 'es' | 'en';
}

type Tone = 'action' | 'info';

const TONE: Record<
  Tone,
  { wrap: string; icon: string; title: string; body: string }
> = {
  action: {
    wrap: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
    icon: 'text-amber-600',
    title: 'text-amber-800 dark:text-amber-200',
    body: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    wrap: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950',
    icon: 'text-sky-600',
    title: 'text-sky-800 dark:text-sky-200',
    body: 'text-sky-700 dark:text-sky-300',
  },
};

/**
 * Two-tier verification banner. States (first match wins):
 *  A. Email not verified            → verify email to unlock BASIC access.
 *  B. Email verified, registration  → finish membership (numeroCuenta +
 *     incomplete                       proof) to unlock FULL access.
 *  C. Submitted, pending review     → informational, awaiting admin.
 *  D. Submitted, rejected           → action: resubmit membership.
 * Fully verified (FULL tier) renders nothing.
 */
export const EmailVerificationBanner: React.FC<
  EmailVerificationBannerProps
> = ({ lang = 'es' }) => {
  const { user, userProfile, emailVerified, isVerified, registrationComplete } =
    useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing to nudge if signed out or already FULL tier.
  if (!user || isVerified) return null;

  const status = userProfile?.verificationStatus;
  const signupHref = `/${lang}/signup`;

  const handleResend = async () => {
    if (sending || sent) return;
    setSending(true);
    setError(null);
    try {
      await sendEmailVerification(user);
      setSent(true);
    } catch (e: unknown) {
      // Surface the failure — previously this was swallowed silently, so a
      // failed send looked identical to "no email arrived" with zero
      // feedback. Show the reason (rate limit, config, network) + log it.
      const code =
        (e as { code?: string; message?: string })?.code ||
        (e as { message?: string })?.message ||
        'unknown';
      console.error('sendEmailVerification failed:', e);
      setError(
        lang === 'es'
          ? `No se pudo enviar el correo (${code}). Revisa spam o intenta más tarde.`
          : `Could not send the email (${code}). Check spam or try again later.`
      );
    } finally {
      setSending(false);
    }
  };

  // ── Resolve the active state ──────────────────────────────────────────
  let tone: Tone = 'action';
  let title = '';
  let message = '';
  let actions: React.ReactNode = null;

  if (!emailVerified) {
    // STATE A — verify email for BASIC access.
    title =
      lang === 'es'
        ? 'Verifica tu correo electrónico'
        : 'Verify your email address';
    message =
      lang === 'es'
        ? 'Revisa tu bandeja de entrada (y spam) y haz clic en el enlace para desbloquear el acceso básico.'
        : 'Check your inbox (and spam) and click the link to unlock basic access.';
    actions = (
      <>
        <button
          onClick={handleResend}
          disabled={sending || sent}
          className="text-sm font-medium text-amber-800 underline hover:text-amber-900 disabled:opacity-50 dark:text-amber-200 dark:hover:text-amber-100"
        >
          {sent
            ? lang === 'es'
              ? 'Correo enviado'
              : 'Email sent'
            : sending
              ? lang === 'es'
                ? 'Enviando...'
                : 'Sending...'
              : lang === 'es'
                ? 'Reenviar correo'
                : 'Resend email'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-amber-800 underline hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
        >
          {lang === 'es' ? 'Ya verifiqué' : 'I already verified'}
        </button>
      </>
    );
  } else if (!registrationComplete) {
    // STATE B — email OK, but membership registration never completed.
    title =
      lang === 'es' ? 'Completa tu membresía' : 'Complete your membership';
    message =
      lang === 'es'
        ? 'Tienes acceso básico. Para desbloquear todo (mentoría, salarios, red de empresas) completa tu registro con tu número de cuenta UNAM y un comprobante.'
        : 'You have basic access. To unlock everything (mentorship, salaries, company network) finish registration with your UNAM account number and a proof document.';
    actions = (
      <a
        href={signupHref}
        className="text-sm font-medium text-amber-800 underline hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
      >
        {lang === 'es' ? 'Completar registro' : 'Complete registration'}
      </a>
    );
  } else if (status === 'rejected') {
    // STATE D — submitted but admin rejected; allow resubmission.
    title = lang === 'es' ? 'Verificación rechazada' : 'Verification rejected';
    message =
      lang === 'es'
        ? 'Tu solicitud de membresía fue rechazada (revisa tu correo para el motivo). Puedes corregir y volver a enviar tu comprobante.'
        : 'Your membership request was rejected (check your email for the reason). You can fix and resubmit your proof.';
    actions = (
      <a
        href={signupHref}
        className="text-sm font-medium text-amber-800 underline hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
      >
        {lang === 'es' ? 'Reenviar solicitud' : 'Resubmit request'}
      </a>
    );
  } else {
    // STATE C — submitted, pending admin review (or status 'pending'/'none'
    // after a completed registration). Informational only.
    tone = 'info';
    title = lang === 'es' ? 'Membresía en revisión' : 'Membership under review';
    message =
      lang === 'es'
        ? 'Recibimos tu registro y un administrador lo revisará pronto. Mientras tanto tienes acceso básico.'
        : 'We received your registration; an admin will review it soon. Meanwhile you have basic access.';
  }

  const t = TONE[tone];

  return (
    <div className={`mb-6 rounded-lg border p-4 ${t.wrap}`}>
      <div className="flex items-start gap-3">
        <svg
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${t.icon}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
        <div className="flex-1">
          <p className={`text-sm font-medium ${t.title}`}>{title}</p>
          <p className={`mt-1 text-sm ${t.body}`}>{message}</p>
          {actions && <div className="mt-3 flex gap-3">{actions}</div>}
          {error && (
            <p
              role="alert"
              className="mt-2 text-sm font-medium text-red-700 dark:text-red-400"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
