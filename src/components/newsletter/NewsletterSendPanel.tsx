import React, { useState } from 'react';
import { usePermissions } from '@/lib/rbac/hooks';
import {
  previewNewsletterAudience,
  sendNewsletterIssue,
} from '@/lib/newsletter-send';
import type { NewsletterIssue } from '@/lib/newsletter';
import { formatDateTime } from '@/lib/format-date';

interface Props {
  lang: 'es' | 'en';
  issue: Pick<NewsletterIssue, 'id' | 'title' | 'sentAt' | 'recipientCount'>;
  onSent?: (recipientCount: number) => void;
}

const labels = {
  title: { es: 'Enviar a suscriptores', en: 'Send to subscribers' },
  help: {
    es: 'Se envía por correo a quienes confirmaron su suscripción (doble opt-in), con enlace de baja en cada mensaje. Guarda los cambios antes de enviar.',
    en: 'Emails everyone who confirmed their subscription (double opt-in), with an unsubscribe link in each message. Save your changes before sending.',
  },
  lastSent: {
    es: 'Último envío: {date} a {count} suscriptores.',
    en: 'Last sent: {date} to {count} subscribers.',
  },
  button: { es: 'Enviar a suscriptores', en: 'Send to subscribers' },
  resend: { es: 'Volver a enviar', en: 'Send again' },
  counting: { es: 'Contando suscriptores…', en: 'Counting subscribers…' },
  sending: { es: 'Enviando…', en: 'Sending…' },
  confirmTitle: { es: 'Confirmar envío', en: 'Confirm send' },
  confirmBody: {
    es: 'Se enviará «{title}» a {count} suscriptores confirmados.',
    en: '"{title}" will be sent to {count} confirmed subscribers.',
  },
  confirmAgain: {
    es: 'Esta edición ya se envió; se volverá a enviar a todos.',
    en: 'This issue was already sent; it will go out to everyone again.',
  },
  none: {
    es: 'No hay suscriptores confirmados todavía.',
    en: 'There are no confirmed subscribers yet.',
  },
  confirm: { es: 'Sí, enviar', en: 'Yes, send' },
  cancel: { es: 'Cancelar', en: 'Cancel' },
  ok: {
    es: 'Newsletter enviado a {count} suscriptores.',
    en: 'Newsletter sent to {count} subscribers.',
  },
  errorDenied: {
    es: 'No tienes permiso para enviar el newsletter.',
    en: 'You do not have permission to send the newsletter.',
  },
  errorGeneric: {
    es: 'No se pudo enviar. Intenta de nuevo.',
    en: 'Could not send. Please try again.',
  },
} as const;

type Key = keyof typeof labels;

function t(
  key: Key,
  lang: 'es' | 'en',
  vars: Record<string, string | number> = {}
) {
  return Object.entries(vars).reduce<string>(
    (text, [k, v]) => text.replace(`{${k}}`, String(v)),
    labels[key][lang]
  );
}

function errorMessage(err: unknown, lang: 'es' | 'en'): string {
  const code = (err as { code?: string })?.code ?? '';
  return code.includes('permission-denied')
    ? t('errorDenied', lang)
    : t('errorGeneric', lang);
}

type Toast = { kind: 'success' | 'error'; text: string } | null;

/**
 * "Enviar a suscriptores" for the issue editor (F21). Only rendered for
 * holders of newsletter:publish (newsletter-editor, content-editor, admin).
 */
export default function NewsletterSendPanel({ lang, issue, onSent }: Props) {
  const { can, loading } = usePermissions();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [lastSend, setLastSend] = useState({
    sentAt: issue.sentAt ?? null,
    recipientCount: issue.recipientCount ?? 0,
  });

  if (loading || !can('newsletter', 'publish')) return null;
  const alreadySent = !!lastSend.sentAt;

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setToast(null);
    try {
      await task();
    } catch (err) {
      setToast({ kind: 'error', text: errorMessage(err, lang) });
    } finally {
      setBusy(false);
    }
  };

  const ask = () =>
    run(async () => {
      const { recipientCount } = await previewNewsletterAudience(issue.id);
      setCount(recipientCount);
    });

  const confirm = () =>
    run(async () => {
      const { recipientCount } = await sendNewsletterIssue({
        issueId: issue.id,
        force: alreadySent,
      });
      setCount(null);
      setLastSend({ sentAt: new Date(), recipientCount });
      setToast({
        kind: 'success',
        text: t('ok', lang, { count: recipientCount }),
      });
      onSent?.(recipientCount);
    });

  return (
    <section
      className="mb-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
      data-testid="newsletter-send-panel"
    >
      <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {t('title', lang)}
      </h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {t('help', lang)}
      </p>
      {alreadySent && (
        <p
          className="mb-4 text-sm text-gray-700 dark:text-gray-300"
          data-testid="newsletter-last-sent"
        >
          {t('lastSent', lang, {
            date: formatDateTime(lastSend.sentAt as Date, lang),
            count: lastSend.recipientCount,
          })}
        </p>
      )}
      {toast && (
        <div
          role="status"
          data-testid="newsletter-send-toast"
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            toast.kind === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {toast.text}
        </div>
      )}
      <button
        type="button"
        onClick={ask}
        disabled={busy}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && count === null
          ? t('counting', lang)
          : t(alreadySent ? 'resend' : 'button', lang)}
      </button>
      {count !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-send-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3
              id="newsletter-send-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {t('confirmTitle', lang)}
            </h3>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {count === 0
                ? t('none', lang)
                : t('confirmBody', lang, { title: issue.title, count })}
              {count > 0 && alreadySent && ` ${t('confirmAgain', lang)}`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCount(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('cancel', lang)}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy || count === 0}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? t('sending', lang) : t('confirm', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
