import React, { useState, useEffect, useCallback } from 'react';
import { Tab } from '@headlessui/react';
import { clsx } from 'clsx';
import MetricCard, { MetricCardTemplates } from './MetricCard';
import ChartWidget, { ChartTemplates } from './ChartWidget';
import { analyticsService} from '../../lib/analytics';
import { useTranslation } from 'react-i18next';
import {
  CalendarDaysIcon, 
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import type { 
  AnalyticsDashboardData,
  AnalyticsFilter,
  AnalyticsDateRange,
  ReportConfig
} from '../../types/analytics';

interface AnalyticsDashboardProps {
  className?: string;
  defaultFilters?: Partial<AnalyticsFilter>;
  showExportOptions?: boolean;
  showRealTime?: boolean;
  refreshInterval?: number; // in seconds
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className,
  defaultFilters,
  showExportOptions = true,
  showRealTime = true,
  refreshInterval = 300 // 5 minutes
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [filters, setFilters] = useState<AnalyticsFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
      preset: 'last30days'
    },
    ...defaultFilters
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Dashboard tabs configuration
  const tabs = [
    { 
      id: 'overview', 
      name: t('analytics.tabs.overview', 'Overview'), 
      icon: ChartBarIcon 
    },
    { 
      id: 'users', 
      name: t('analytics.tabs.users', 'Users'), 
      icon: UserGroupIcon 
    },
    { 
      id: 'content', 
      name: t('analytics.tabs.content', 'Content'), 
      icon: EyeIcon 
    },
    { 
      id: 'engagement', 
      name: t('analytics.tabs.engagement', 'Engagement'), 
      icon: ChartBarIcon 
    },
    { 
      id: 'revenue', 
      name: t('analytics.tabs.revenue', 'Revenue'), 
      icon: CurrencyDollarIcon 
    },
    { 
      id: 'geographic', 
      name: t('analytics.tabs.geographic', 'Geographic'), 
      icon: GlobeAltIcon 
    },
    { 
      id: 'performance', 
      name: t('analytics.tabs.performance', 'Performance'), 
      icon: BoltIcon 
    },
    { 
      id: 'errors', 
      name: t('analytics.tabs.errors', 'Errors'), 
      icon: ExclamationTriangleIcon 
    },
    { 
      id: 'funnels', 
      name: t('analytics.tabs.funnels', 'Funnels'), 
      icon: FunnelIcon 
    },
    { 
      id: 'search', 
      name: t('analytics.tabs.search', 'Search'), 
      icon: MagnifyingGlassIcon 
    },
    { 
      id: 'technology', 
      name: t('analytics.tabs.technology', 'Technology'), 
      icon: DevicePhoneMobileIcon 
    }
  ];

  // Load dashboard data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await analyticsService.getDashboardData(filters);
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      console.error('Analytics data loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      loadData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  // Date range presets
  const dateRangePresets = [
    { key: 'today', label: t('analytics.dateRange.today', 'Today'), days: 1 },
    { key: 'yesterday', label: t('analytics.dateRange.yesterday', 'Yesterday'), days: 1, offset: 1 },
    { key: 'last7days', label: t('analytics.dateRange.last7days', 'Last 7 days'), days: 7 },
    { key: 'last30days', label: t('analytics.dateRange.last30days', 'Last 30 days'), days: 30 },
    { key: 'last90days', label: t('analytics.dateRange.last90days', 'Last 90 days'), days: 90 },
    { key: 'last12months', label: t('analytics.dateRange.last12months', 'Last 12 months'), days: 365 }
  ];

  // Handle date range change
  const handleDateRangeChange = (preset: string) => {
    const presetConfig = dateRangePresets.find(p => p.key === preset);
    if (!presetConfig) return;

    const end = new Date();
    if (presetConfig.offset) {
      end.setDate(end.getDate() - presetConfig.offset);
    }
    
    const start = new Date(end);
    start.setDate(start.getDate() - presetConfig.days + 1);

    setFilters({
      ...filters,
      dateRange: {
        start,
        end,
        preset: preset as any
      }
    });
  };

  // Export report
  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    if (!data) return;

    try {
      const reportConfig: ReportConfig = {
        id: `report_${Date.now()}`,
        name: `Analytics Report - ${new Date().toISOString().split('T')[0]}`,
        description: 'Comprehensive analytics report',
        type: 'one-time',
        format,
        sections: ['overview', 'users', 'content', 'engagement', 'revenue'],
        filters,
        isActive: true
      };

      const blob = await analyticsService.exportReport(reportConfig, format);
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report.${format}`;
      document.body.appendChild(a);
      a.click();
      document['body'].removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Render loading state
  if (loading && !data) {
    return (
      <div className={clsx('bg-white rounded-lg shadow p-8', className)}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-600">{t('analytics.loading', 'Loading analytics data...')}</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !data) {
    return (
      <div className={clsx('bg-white rounded-lg shadow p-8', className)}>
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t('analyticserror', 'Error loading data')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            {t('analytics.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('analytics.title', 'Analytics Dashboard')}
              </h1>
              <p className="text-sm text-gray-500">
                {t('analytics.lastUpdated', 'Last updated: {{date}}', {
                  date: data['lastUpdated'].toLocaleString()
                })}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Date Range Selector */}
              <select
                value={filters.dateRange.preset || 'custom'}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {dateRangePresets.map(preset => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
                <option value="custom">{t('analytics.dateRange.custom', 'Custom')}</option>
              </select>

              {/* Auto Refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={clsx(
                  'inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md',
                  autoRefresh
                    ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                )}
              >
                <ArrowPathIcon className={clsx('h-4 w-4 mr-2', autoRefresh && 'animate-spin')} />
                {t('analytics.autoRefresh', 'Auto Refresh')}
              </button>

              {/* Export Options */}
              {showExportOptions && (
                <div className="relative">
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    {t('analytics.export', 'Export')}
                  </button>
                  {/* Export dropdown would be implemented here */}
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowPathIcon className={clsx('h-4 w-4 mr-2', loading && 'animate-spin')} />
                {t('analytics.refresh', 'Refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Stats Bar */}
        {showRealTime && data['realTimeAnalytics'] && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
                  <span className="text-sm text-gray-600">
                    {t('analytics.realTime.activeUsers', '{{count}} active users', {
                      count: data['realTimeAnalytics'].activeUsers
                    })}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {t('analytics.realTime.currentSessions', '{{count}} sessions', {
                    count: data['realTimeAnalytics'].currentSessions
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {t('analytics.realTime.pageViewsPerMinute', '{{count}} views/min', {
                    count: data['realTimeAnalytics'].pageViewsPerMinute
                  })}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  data['realTimeAnalytics'].systemStatus.apiStatus === 'healthy' ? 'bg-green-400' :
                  data['realTimeAnalytics'].systemStatus.apiStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                )} />
                <span className="text-xs text-gray-500">
                  {t('analytics.systemStatus', 'System: {{status}}', {
                    status: data['realTimeAnalytics'].systemStatus.apiStatus
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              className={({ selected }) =>
                clsx(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                )
              }
            >
              <div className="flex items-center justify-center space-x-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab['name']}</span>
              </div>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          {/* Overview Tab */}
          <Tab.Panel className="space-y-6">
            <OverviewPanel data={data} />
          </Tab.Panel>

          {/* Users Tab */}
          <Tab.Panel className="space-y-6">
            <UsersPanel data={data['userAnalytics']} />
          </Tab.Panel>

          {/* Content Tab */}
          <Tab.Panel className="space-y-6">
            <ContentPanel data={data['contentAnalytics']} />
          </Tab.Panel>

          {/* Engagement Tab */}
          <Tab.Panel className="space-y-6">
            <EngagementPanel data={data['engagementAnalytics']} />
          </Tab.Panel>

          {/* Revenue Tab */}
          <Tab.Panel className="space-y-6">
            <RevenuePanel data={data['revenueAnalytics']} />
          </Tab.Panel>

          {/* Geographic Tab */}
          <Tab.Panel className="space-y-6">
            <GeographicPanel data={data['geographicAnalytics']} />
          </Tab.Panel>

          {/* Performance Tab */}
          <Tab.Panel className="space-y-6">
            <PerformancePanel data={data['performanceAnalytics']} />
          </Tab.Panel>

          {/* Errors Tab */}
          <Tab.Panel className="space-y-6">
            <ErrorsPanel data={data['errorAnalytics']} />
          </Tab.Panel>

          {/* Funnels Tab */}
          <Tab.Panel className="space-y-6">
            <FunnelsPanel data={data['funnelAnalytics']} />
          </Tab.Panel>

          {/* Search Tab */}
          <Tab.Panel className="space-y-6">
            <SearchPanel data={data['searchAnalytics']} />
          </Tab.Panel>

          {/* Technology Tab */}
          <Tab.Panel className="space-y-6">
            <TechnologyPanel data={data['technologyAnalytics']} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

// Overview Panel Component
const OverviewPanel: React.FC<{ data: AnalyticsDashboardData }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          config={MetricCardTemplates.activeUsers({
            current: data['userAnalytics'].activeUsers,
            previous: data?.userAnalytics?.totalUsers - data['userAnalytics'].newUsers
          })}
        />
        <MetricCard
          config={MetricCardTemplates.jobApplications({
            current: data?.contentAnalytics?.jobAnalytics.applications
          })}
        />
        <MetricCard
          config={MetricCardTemplates.revenue({
            current: data['revenueAnalytics'].totalRevenue
          })}
        />
        <MetricCard
          config={MetricCardTemplates.averageLoadTime({
            current: data['performanceAnalytics'].pageLoadMetrics.averageLoadTime / 1000
          })}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWidget
          config={ChartTemplates.userRegistrationsOverTime(
            data['userAnalytics'].registrationTrend.map(item => ({
              date: item.timestamp.toISOString().split('T')[0],
              registrations: item.value
            }))
          )}
        />
        <ChartWidget
          config={ChartTemplates.revenueGrowth(
            data['revenueAnalytics'].revenueBySource.map(item => ({
              month: item.source,
              revenue: item.revenue
            }))
          )}
        />
      </div>
    </div>
  );
};

// Users Panel Component
const UsersPanel: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          config={MetricCardTemplates.userRegistrations({
            current: data['newUsers'],
            trend: data['registrationTrend']
          })}
        />
        <MetricCard
          config={MetricCardTemplates.activeUsers({
            current: data['activeUsers']
          })}
        />
        {/* Add more user-specific metrics */}
      </div>
      {/* Add user analytics charts */}
    </div>
  );
};

// Content Panel Component
const ContentPanel: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Content metrics and charts */}
    </div>
  );
};

// Additional panel components would be implemented similarly...
const EngagementPanel: React.FC<{ data: any }> = ({ data }) => <div>Engagement Panel</div>;
const RevenuePanel: React.FC<{ data: any }> = ({ data }) => <div>Revenue Panel</div>;
const GeographicPanel: React.FC<{ data: any }> = ({ data }) => <div>Geographic Panel</div>;
const PerformancePanel: React.FC<{ data: any }> = ({ data }) => <div>Performance Panel</div>;
const ErrorsPanel: React.FC<{ data: any }> = ({ data }) => <div>Errors Panel</div>;
const FunnelsPanel: React.FC<{ data: any }> = ({ data }) => <div>Funnels Panel</div>;
const SearchPanel: React.FC<{ data: any }> = ({ data }) => <div>Search Panel</div>;
const TechnologyPanel: React.FC<{ data: any }> = ({ data }) => <div>Technology Panel</div>;

export default AnalyticsDashboard;