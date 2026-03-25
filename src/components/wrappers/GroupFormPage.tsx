import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import GroupForm from '@/components/admin/GroupForm';

interface Props {
  lang?: 'es' | 'en';
  groupId?: string;
}

export default function GroupFormPage({ lang = 'es', groupId }: Props) {
  return (
    <AuthProvider>
      <GroupForm lang={lang} groupId={groupId} />
    </AuthProvider>
  );
}
