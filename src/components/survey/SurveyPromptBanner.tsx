import React, { useEffect, useState } from 'react';
import { ClipboardDocumentListIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { getSurvey } from '@/lib/survey/queries';

interface Props {
  lang?: 'es' | 'en';
}

const DISMISS_KEY = 'secid:survey-banner:dismissed-until';
const DISMISS_DAYS = 7;

const COPY = {
  es: {
    titleIncomplete: '¿Cuéntanos sobre ti?',
    bodyIncomplete:
      'Completa tu encuesta de miembro para ayudarnos a conectarte con eventos, mentores y oportunidades relevantes.',
    cta: 'Completar encuesta',
    dismiss: 'Más tarde',
  },
  en: {
    titleIncomplete: 'Tell us about yourself?',
    bodyIncomplete:
      'Complete your member survey so we can connect you with relevant events, mentors, and opportunities.',
    cta: 'Complete survey',
    dismiss: 'Maybe later',
  },
} as const;

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY));
    if (!until) return false;
    return until > Date.now();
  } catch {
    return false;
  }
}

function dismissFor(days: number) {
  try {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + days * 24 * 3600 * 1000)
    );
  } catch {
    // ignore
  }
}

export default function SurveyPromptBanner({ lang = 'es' }: Props) {
  const t = COPY[lang];
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user?.uid) return;
      if (isDismissed()) return;
      const survey = await getSurvey(user.uid);
      if (cancelled) return;
      if (!survey || !survey.completedAt) {
        setShow(true);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (!show) return null;

  const profileHref =
    lang === 'es' ? '/es/dashboard/profile/edit#survey' : '/en/dashboard/profile/edit#survey';

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/20">
      <ClipboardDocumentListIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          {t.titleIncomplete}
        </h3>
        <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
          {t.bodyIncomplete}
        </p>
        <div className="mt-3 flex gap-2">
          <a
            href={profileHref}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t.cta}
          </a>
          <button
            type="button"
            onClick={() => {
              dismissFor(DISMISS_DAYS);
              setShow(false);
            }}
            className="inline-flex items-center rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-transparent dark:text-blue-200 dark:hover:bg-blue-900/40"
          >
            {t.dismiss}
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label={lang === 'es' ? 'Cerrar' : 'Dismiss'}
        onClick={() => {
          dismissFor(DISMISS_DAYS);
          setShow(false);
        }}
        className="flex-shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-300"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
