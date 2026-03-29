import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyManagement } from '@/components/dashboard/admin/CompanyManagement';

interface Props {
  lang?: 'es' | 'en';
}

export default function CompanyManagementPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CompanyManagement lang={lang} />
    </AuthProvider>
  );
}
