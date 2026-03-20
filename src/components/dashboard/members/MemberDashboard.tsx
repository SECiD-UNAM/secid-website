import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMemberStatistics,
  getMemberStats,
  getMemberProfiles,
} from '@/lib/members';
import type {
  MemberStatisticsData,
  MemberStats,
  MemberProfile,
} from '@/types/member';
import { OverviewTab } from './OverviewTab';
import { MembersTab } from './MembersTab';
import { InsightsTab } from './InsightsTab';
import type { FilterState } from './MemberFilters';

type DashboardTab = 'overview' | 'members' | 'insights';

interface MemberDashboardProps {
  lang?: 'es' | 'en';
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  lang = 'es',
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [statistics, setStatistics] = useState<MemberStatisticsData | null>(
    null
  );
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    includeCollaborators: false,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statisticsData, statsData, membersData] = await Promise.all([
        getMemberStatistics(),
        getMemberStats(),
        getMemberProfiles({ limit: 200 }),
      ]);
      setStatistics(statisticsData);
      setStats(statsData);
      setMembers(membersData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(
        lang === 'es'
          ? 'Error al cargar los datos. Intenta de nuevo.'
          : 'Error loading data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Cargando dashboard...' : 'Loading dashboard...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
        >
          {lang === 'es' ? 'Intentar de nuevo' : 'Try again'}
        </button>
      </div>
    );
  }

  const tabs: Array<{ value: DashboardTab; label: string }> = [
    { value: 'overview', label: lang === 'es' ? 'Resumen' : 'Overview' },
    { value: 'members', label: lang === 'es' ? 'Miembros' : 'Members' },
    { value: 'insights', label: lang === 'es' ? 'Análisis' : 'Insights' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-primary-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && statistics && stats && (
        <OverviewTab statistics={statistics} stats={stats} lang={lang} />
      )}
      {activeTab === 'members' && (
        <MembersTab
          members={members}
          filters={filters}
          onFiltersChange={setFilters}
          lang={lang}
        />
      )}
      {activeTab === 'insights' && statistics && (
        <InsightsTab statistics={statistics} lang={lang} />
      )}
    </div>
  );
};

export default MemberDashboard;
