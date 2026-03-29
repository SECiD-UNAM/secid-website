import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ProfileEdit from '@/components/profile/ProfileEdit';

interface Props {
  lang?: 'es' | 'en';
}

export default function ProfileEditPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <ProfileEdit lang={lang} />
    </AuthProvider>
  );
}
