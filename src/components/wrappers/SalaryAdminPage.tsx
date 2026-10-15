import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SalaryAdminPageComponent from '@/components/salary/SalaryAdminPage';

interface Props {
  lang?: 'es' | 'en';
}

export default function SalaryAdminPageWrapper({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <SalaryAdminPageComponent lang={lang} />
    </AuthProvider>
  );
}
