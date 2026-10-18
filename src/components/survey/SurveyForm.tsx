import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { SURVEY_QUESTIONS, SIGNUP_QUESTION_IDS } from '@/lib/survey/defaults';
import { upsertSurvey, resetSurvey } from '@/lib/survey/mutations';
import { getSurvey } from '@/lib/survey/queries';
import { surveyInputSchema } from '@/lib/survey/validation';
import type {
  MemberSurveyResponse,
  SurveyInput,
  SurveyVisibility,
} from '@/types/survey';
import SurveyQuestion from './SurveyQuestion';

type Props = {
  uid: string;
  lang?: 'es' | 'en';
  /** Subset of questions to show. Default: all. */
  scope?: 'all' | 'signup';
  /** Called after a successful save (e.g. to advance wizard) */
  onSaved?: (response: SurveyInput) => void;
  /** Show "Skip" button (for wizard contexts). Hides when undefined. */
  onSkip?: () => void;
  /** Hide the reset button (defaults true in signup, false in profile) */
  hideReset?: boolean;
};

const COPY = {
  es: {
    saveBtn: 'Guardar respuestas',
    saving: 'Guardando...',
    saved: 'Respuestas guardadas',
    saveError: 'No se pudieron guardar las respuestas',
    skipBtn: 'Saltar por ahora',
    resetBtn: 'Restablecer respuestas',
    resetConfirm:
      '¿Borrar todas tus respuestas? Esta acción no se puede deshacer.',
    resetDone: 'Respuestas restablecidas',
    visibility: 'Visibilidad de las respuestas',
    vAggregateOnly: 'Solo agregadas (mis respuestas individuales son privadas)',
    vMembers: 'Visibles para otros miembros de SECiD',
    vPublic: 'Públicas',
    vPrivate: 'Solo yo y los administradores',
    lastUpdated: 'Última actualización',
    version: 'Versión',
    intro:
      'Estas respuestas son opcionales y nos ayudan a entender mejor a la comunidad. Las puedes cambiar en cualquier momento.',
    signupVisibilityNote:
      'Tus respuestas se usan solo de forma agregada por defecto; puedes cambiarlo después en tu perfil.',
  },
  en: {
    saveBtn: 'Save responses',
    saving: 'Saving…',
    saved: 'Responses saved',
    saveError: 'Could not save responses',
    skipBtn: 'Skip for now',
    resetBtn: 'Reset responses',
    resetConfirm: 'Erase all your responses? This cannot be undone.',
    resetDone: 'Responses reset',
    visibility: 'Response visibility',
    vAggregateOnly: 'Aggregate only (my individual responses stay private)',
    vMembers: 'Visible to other SECiD members',
    vPublic: 'Public',
    vPrivate: 'Only me and admins',
    lastUpdated: 'Last updated',
    version: 'Version',
    intro:
      'These responses are optional and help us understand the community better. You can change them at any time.',
    signupVisibilityNote:
      'Your responses default to aggregate-only; you can change this later in your profile.',
  },
} as const;

function formatTs(t: unknown, lang: 'es' | 'en'): string {
  if (!t || typeof t !== 'object') return '—';
  const ts = t as { toDate?: () => Date; seconds?: number };
  let d: Date | null = null;
  if (typeof ts.toDate === 'function') d = ts.toDate();
  else if (typeof ts.seconds === 'number') d = new Date(ts.seconds * 1000);
  if (!d) return '—';
  return d.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US');
}

export default function SurveyForm({
  uid,
  lang = 'es',
  scope = 'all',
  onSaved,
  onSkip,
  hideReset,
}: Props) {
  const t = COPY[lang];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<SurveyInput>({});
  const [existing, setExisting] = useState<MemberSurveyResponse | null>(null);

  const visibleQuestions = useMemo(() => {
    if (scope === 'signup') {
      const allowed = new Set<string>(SIGNUP_QUESTION_IDS as readonly string[]);
      return SURVEY_QUESTIONS.filter((q) => allowed.has(String(q.id)));
    }
    return SURVEY_QUESTIONS;
  }, [scope]);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getSurvey(uid).then((s) => {
      if (cancelled) return;
      setExisting(s);
      if (s) {
        const {
          uid: _uid,
          version: _v,
          createdAt: _c,
          updatedAt: _u,
          completedAt: _cp,
          ...rest
        } = s;
        setAnswers(rest as SurveyInput);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  function setField<K extends keyof SurveyInput>(k: K, v: SurveyInput[K]) {
    setAnswers((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    setSaving(true);
    const parsed = surveyInputSchema.safeParse(answers);
    if (!parsed.success) {
      toast.error(t.saveError);
      setSaving(false);
      return;
    }
    try {
      await upsertSurvey(uid, parsed.data, {
        markComplete: scope === 'signup',
      });
      toast.success(t.saved);
      onSaved?.(parsed.data);
    } catch {
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm(t.resetConfirm)) return;
    try {
      await resetSurvey(uid);
      setAnswers({});
      toast.success(t.resetDone);
    } catch {
      toast.error(t.saveError);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">{t.intro}</p>

      {existing && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
          {t.lastUpdated}: {formatTs(existing.updatedAt, lang)} · {t.version}{' '}
          {existing.version}
        </div>
      )}

      <div className="space-y-5">
        {visibleQuestions.map((q) => (
          <SurveyQuestion
            key={String(q.id)}
            question={q}
            value={answers[q.id as keyof SurveyInput]}
            onChange={(v) => setField(q.id as keyof SurveyInput, v as never)}
            lang={lang}
          />
        ))}
      </div>

      {scope === 'signup' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t.signupVisibilityNote}
        </p>
      )}

      {scope === 'all' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            {t.visibility}
          </label>
          <select
            value={(answers.visibility as SurveyVisibility) || 'aggregate-only'}
            onChange={(e) =>
              setField('visibility', e.target.value as SurveyVisibility)
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="aggregate-only">{t.vAggregateOnly}</option>
            <option value="members">{t.vMembers}</option>
            <option value="public">{t.vPublic}</option>
            <option value="private">{t.vPrivate}</option>
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? t.saving : t.saveBtn}
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t.skipBtn}
          </button>
        )}
        {!hideReset && existing && (
          <button
            type="button"
            onClick={handleReset}
            className="ml-auto text-sm text-red-600 hover:text-red-700 dark:text-red-400"
          >
            {t.resetBtn}
          </button>
        )}
      </div>
    </div>
  );
}
