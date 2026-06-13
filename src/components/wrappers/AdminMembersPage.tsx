import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminMembersTable } from '@/components/dashboard/admin/AdminMembersTable';

interface Props {
  lang?: 'es' | 'en';
}

export default function AdminMembersPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <AdminMembersTable lang={lang} />
    </AuthProvider>
  );
}
