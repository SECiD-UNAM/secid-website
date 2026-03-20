import React from 'react';
import type { MemberProfile } from '@/types/member';
import type { FilterState } from './MemberFilters';

interface MembersTabProps {
  members: MemberProfile[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  lang: 'es' | 'en';
}

export const MembersTab: React.FC<MembersTabProps> = ({ lang }) => {
  return (
    <div className="text-gray-500">
      {lang === 'es' ? 'Miembros (en desarrollo)' : 'Members (in progress)'}
    </div>
  );
};
