import React from 'react';
import SurveyForm from '@/components/survey/SurveyForm';

interface Props {
  uid: string;
  lang?: 'es' | 'en';
  onDone: () => void;
}

export default function SignupSurveyStep({ uid, lang = 'es', onDone }: Props) {
  return (
    <SurveyForm
      uid={uid}
      lang={lang}
      scope="signup"
      hideReset
      onSaved={() => onDone()}
      onSkip={() => onDone()}
    />
  );
}
