import React from 'react';
import SurveyForm from '@/components/survey/SurveyForm';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  lang?: 'es' | 'en';
  targetUid?: string;
}

export default function SurveyTab({ lang = 'es', targetUid }: Props) {
  const { user } = useAuth();
  const uid = targetUid || user?.uid || '';

  if (!uid) {
    return (
      <p className="text-sm text-gray-500">
        {lang === 'es' ? 'Inicia sesión para editar tu encuesta.' : 'Sign in to edit your survey.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Encuesta de miembros' : 'Member survey'}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Tus respuestas alimentan los agregados que se muestran en /miembros. Solo agregados con 5+ respuestas son visibles.'
            : 'Your responses feed the aggregate charts shown on /members. Only buckets with 5+ responses are exposed.'}
        </p>
      </header>
      <SurveyForm uid={uid} lang={lang} scope="all" />
    </div>
  );
}
