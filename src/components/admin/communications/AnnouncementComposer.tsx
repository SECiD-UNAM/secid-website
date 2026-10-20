import React, { useMemo, useState } from 'react';
import {
  previewAnnouncementAudience,
  sendAnnouncement,
  type Audience,
} from '@/lib/announcements';
import { renderMarkdown } from '@/lib/markdown';
import AudienceSelect, { selectClass } from './AudienceSelect';
import { t, type Lang } from './i18n';

interface Props {
  lang: Lang;
  onSent: () => void;
}

type Toast = { kind: 'success' | 'error'; text: string } | null;
type Pending = { subject: string; count: number } | null;

function errorMessage(err: unknown, lang: Lang): string {
  const code = (err as { code?: string })?.code ?? '';
  return code.includes('permission-denied')
    ? t('errorDenied', lang)
    : t('errorGeneric', lang);
}

/** Preview pane: the same renderer the callable uses for the email body. */
function Preview({ markdown, lang }: { markdown: string; lang: Lang }) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  return (
    <div
      className="prose prose-sm max-w-none rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900 dark:prose-invert"
      data-testid="announcement-preview"
    >
      {html ? (
        // Safe: renderMarkdown escapes the source before applying any rule.
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-gray-400">{t('previewEmpty', lang)}</p>
      )}
    </div>
  );
}

function ConfirmDialog({
  lang,
  pending,
  busy,
  onConfirm,
  onCancel,
}: {
  lang: Lang;
  pending: NonNullable<Pending>;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-send-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h3
          id="confirm-send-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          {t('confirmTitle', lang)}
        </h3>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          {pending.count === 0
            ? t('confirmNone', lang)
            : t('confirmBody', lang, pending)}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('cancel', lang)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || pending.count === 0}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t('sending', lang) : t('confirmSend', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementComposer({ lang, onSent }: Props) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>({ kind: 'all_active' });
  const [emailLang, setEmailLang] = useState<Lang>(lang);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [pending, setPending] = useState<Pending>(null);

  const input = {
    subject: subject.trim(),
    bodyMarkdown: body,
    audience,
    lang: emailLang,
  };
  const valid = input.subject.length > 0 && body.trim().length > 0;

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

  const sendTest = () =>
    run(async () => {
      await sendAnnouncement({ ...input, audience: { kind: 'test' } });
      setToast({ kind: 'success', text: t('testOk', lang) });
      onSent();
    });

  const askToSend = () =>
    run(async () => {
      const { recipientCount } = await previewAnnouncementAudience(input);
      setPending({ subject: input.subject, count: recipientCount });
    });

  const confirmSend = () =>
    run(async () => {
      const { recipientCount } = await sendAnnouncement(input);
      setPending(null);
      setSubject('');
      setBody('');
      setToast({
        kind: 'success',
        text: t('sentOk', lang, { count: recipientCount }),
      });
      onSent();
    });

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      {toast && (
        <div
          role="status"
          data-testid="announcement-toast"
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            toast.kind === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {toast.text}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
              {t('subject', lang)}
            </span>
            <input
              type="text"
              name="subject"
              maxLength={200}
              value={subject}
              disabled={busy}
              placeholder={t('subjectPlaceholder', lang)}
              onChange={(e) => setSubject(e.target.value)}
              className={selectClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
              {t('body', lang)}
            </span>
            <textarea
              name="bodyMarkdown"
              rows={12}
              value={body}
              disabled={busy}
              onChange={(e) => setBody(e.target.value)}
              className={`${selectClass} font-mono`}
            />
            <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
              {t('bodyHelp', lang)}
            </span>
          </label>
          <AudienceSelect
            lang={lang}
            value={audience}
            onChange={setAudience}
            disabled={busy}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
              {t('language', lang)}
            </span>
            <select
              className={selectClass}
              value={emailLang}
              disabled={busy}
              onChange={(e) => setEmailLang(e.target.value as Lang)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('preview', lang)}
          </p>
          <Preview markdown={body} lang={lang} />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('volumeNote', lang)}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={sendTest}
            disabled={busy || !valid}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('sendTest', lang)}
          </button>
          <button
            type="button"
            onClick={askToSend}
            disabled={busy || !valid}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && !pending ? t('counting', lang) : t('send', lang)}
          </button>
        </div>
      </div>
      {pending && (
        <ConfirmDialog
          lang={lang}
          pending={pending}
          busy={busy}
          onConfirm={confirmSend}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
