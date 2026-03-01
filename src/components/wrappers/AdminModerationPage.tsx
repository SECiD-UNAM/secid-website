import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ContentModeration from '@/components/admin/ContentModeration';

export default function AdminModerationPage() {
  return (
    <AuthProvider>
      <ContentModeration />
    </AuthProvider>
  );
}
