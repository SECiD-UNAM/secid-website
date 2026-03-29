import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createMergeRequest,
  fetchUserProfile,
  hasPendingMergeRequest,
} from '@/lib/merge/mutations';
import { ProfileComparison } from './ProfileComparison';
import type { FieldGroupKey, FieldSelections } from '@/types/merge';
import { FIELD_GROUPS } from '@/lib/merge/field-groups';

interface ClaimFlowProps {
  lang?: 'es' | 'en';
  onClose: () => void;
}

type FlowState = 'loading' | 'comparison' | 'submitting' | 'submitted' | 'error';

function buildDefaultSelections(): FieldSelections {
  return (Object.keys(FIELD_GROUPS) as FieldGroupKey[]).reduce(
    (acc, key) => ({ ...acc, [key]: 'target' }),
    {} as FieldSelections
  );
}

export const ClaimFlow: React.FC<ClaimFlowProps> = ({ lang = 'es', onClose }) => {
  const { user, userProfile } = useAuth();
  const [flowState, setFlowState] = useState<FlowState>('loading');
  const [staleProfile, setStaleProfile] = useState<Record<string, any> | null>(null);
  const [selections, setSelections] = useState<FieldSelections>(buildDefaultSelections);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const match = userProfile?.potentialMergeMatch;

  useEffect(() => {
    if (!match?.matchedUid) {
      setErrorMessage(
        lang === 'es'
          ? 'No se encontró ningún perfil coincidente.'
          : 'No matching profile found.'
      );
      setFlowState('error');
      return;
    }

    let cancelled = false;

    const loadStaleProfile = async () => {
      try {
        const profile = await fetchUserProfile(match.matchedUid);
        if (cancelled) return;

        if (!profile) {
          setErrorMessage(
            lang === 'es'
              ? 'El perfil anterior ya no está disponible.'
              : 'The previous profile is no longer available.'
          );
          setFlowState('error');
          return;
        }

        setStaleProfile(profile);
        setFlowState('comparison');
      } catch {
        if (!cancelled) {
          setErrorMessage(
            lang === 'es'
              ? 'Error al cargar el perfil anterior. Inténtalo de nuevo.'
              : 'Error loading the previous profile. Please try again.'
          );
          setFlowState('error');
        }
      }
    };

    loadStaleProfile();
    return () => {
      cancelled = true;
    };
  }, [match?.matchedUid, lang]);

  const handleSubmit = async () => {
    if (!user?.uid || !match) return;

    setFlowState('submitting');
    setErrorMessage(null);

    try {
      const alreadyPending = await hasPendingMergeRequest(user.uid);
      if (alreadyPending) {
        setErrorMessage(
          lang === 'es'
            ? 'Ya tienes una solicitud de fusión pendiente.'
            : 'You already have a pending merge request.'
        );
        setFlowState('error');
        return;
      }

      await createMergeRequest({
        sourceUid: match.matchedUid,
        targetUid: user.uid,
        numeroCuenta: match.numeroCuenta,
        fieldSelections: selections,
        createdBy: user.uid,
      });

      setFlowState('submitted');
    } catch (err: any) {
      const isDuplicate =
        err?.message?.includes('pending merge request') ||
        err?.message?.includes('already have');

      setErrorMessage(
        isDuplicate
          ? lang === 'es'
            ? 'Ya tienes una solicitud de fusión pendiente.'
            : 'You already have a pending merge request.'
          : lang === 'es'
            ? 'Error al enviar la solicitud. Inténtalo de nuevo.'
            : 'Error submitting the request. Please try again.'
      );
      setFlowState('error');
    }
  };

  const currentProfile: Record<string, any> = {
    uid: user?.uid,
    displayName: userProfile?.displayName,
    firstName: userProfile?.firstName,
    lastName: userProfile?.lastName,
    photoURL: userProfile?.photoURL,
    skills: userProfile?.skills,
    experience: userProfile?.experience,
    education: userProfile?.education,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'es' ? 'Reclamar perfil anterior' : 'Claim previous profile'}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Reclamar perfil anterior' : 'Claim previous profile'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {flowState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Cargando perfil anterior…' : 'Loading previous profile…'}
              </p>
            </div>
          )}

          {flowState === 'comparison' && staleProfile && (
            <>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Elige qué información conservar de cada sección. "Mantener nuevo" es la selección predeterminada.'
                  : 'Choose which information to keep for each section. "Keep new" is the default selection.'}
              </p>
              <ProfileComparison
                sourceProfile={staleProfile}
                targetProfile={currentProfile}
                selections={selections}
                onSelectionsChange={setSelections}
                lang={lang}
              />
            </>
          )}

          {flowState === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Enviando solicitud…' : 'Submitting request…'}
              </p>
            </div>
          )}

          {flowState === 'submitted' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                {lang === 'es' ? '¡Solicitud enviada!' : 'Request submitted!'}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Un administrador revisará tu solicitud de fusión de perfiles. Te notificaremos cuando sea procesada.'
                  : 'An administrator will review your profile merge request. We will notify you once it has been processed.'}
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          )}

          {flowState === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
              <button
                onClick={onClose}
                className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          )}
        </div>

        {/* Footer — only shown during comparison */}
        {flowState === 'comparison' && (
          <div className="flex justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {lang === 'es' ? 'Enviar solicitud' : 'Submit request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
