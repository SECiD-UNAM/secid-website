import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminCommunications from '@/components/admin/communications/AdminCommunications';

interface Props {
  lang?: 'es' | 'en';
}

export default function AdminCommunicationsPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <AdminCommunications lang={lang} />
    </AuthProvider>
  );
}
