import React from 'react';
import type { MemberStatisticsData, MemberStats } from '@/types/member';

interface OverviewTabProps {
  statistics: MemberStatisticsData;
  stats: MemberStats;
  lang: 'es' | 'en';
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ lang }) => {
  return (
    <div className="text-gray-500">
      {lang === 'es' ? 'Resumen (en desarrollo)' : 'Overview (in progress)'}
    </div>
  );
};
