import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { VerifyAlternateEmail } from '@/components/profile/VerifyAlternateEmail';

interface Props {
  lang?: 'es' | 'en';
}

export default function VerifyAlternateEmailPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <VerifyAlternateEmail lang={lang} />
    </AuthProvider>
  );
}
