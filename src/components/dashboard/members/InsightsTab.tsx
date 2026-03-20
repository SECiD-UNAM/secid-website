import React from 'react';
import type { MemberStatisticsData } from '@/types/member';

interface InsightsTabProps {
  statistics: MemberStatisticsData;
  lang: 'es' | 'en';
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ lang }) => {
  return (
    <div className="text-gray-500">
      {lang === 'es' ? 'Análisis (en desarrollo)' : 'Insights (in progress)'}
    </div>
  );
};
