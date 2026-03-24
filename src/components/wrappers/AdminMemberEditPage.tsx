import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ProfileEdit from '@/components/profile/ProfileEdit';

interface Props {
  lang?: 'es' | 'en';
  uid: string;
}

export default function AdminMemberEditPage({ lang = 'es', uid }: Props) {
  return (
    <AuthProvider>
      <ProfileEdit lang={lang} targetUid={uid} isAdmin={true} />
    </AuthProvider>
  );
}
