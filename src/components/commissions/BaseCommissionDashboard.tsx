import React, { useState, useEffect } from 'react';
import {
  type CommissionMetrics,
  CommissionService,
} from '../../lib/commissions';
import { useTranslations } from '../../hooks/useTranslations';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
} from 'recharts';

import type { CommissionConfig } from '../../lib/commissions';
import {
  ChartBarIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface BaseCommissionDashboardProps {
  commissionId: string;
  children?: React.ReactNode;
  customMetrics?: React.ReactNode;
  customTools?: React.ReactNode;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p
            className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}
          >
            {change}
          </p>
        )}
      </div>
      <div className={`rounded-lg p-3 ${color}`}>{icon}</div>
    </div>
  </div>
);

export const BaseCommissionDashboard: React.FC<
  BaseCommissionDashboardProps
> = ({ commissionId, children, customMetrics, customTools }) => {
  const { t } = useTranslations();
  const [config, setConfig] = useState<CommissionConfig | null>(null);
  const [metrics, setMetrics] = useState<CommissionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'projects' | 'members' | 'resources'
  >('overview');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [commissionConfig, commissionMetrics] = await Promise.all([
          CommissionService.getCommissionConfig(commissionId),
          CommissionService.getCommissionMetrics(commissionId),
        ]);

        setConfig(commissionConfig);
        setMetrics(commissionMetrics);
      } catch (error) {
        console.error('Error loading commission data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [commissionId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config || !metrics) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('commission.notFound')}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: t('commission.overview'), icon: ChartBarIcon },
    {
      id: 'projects',
      name: t('commission.projects'),
      icon: ClipboardDocumentListIcon,
    },
    { id: 'members', name: t('commission.members'), icon: UserGroupIcon },
    { id: 'resources', name: t('commission.resources'), icon: BookOpenIcon },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center space-x-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: config.color }}
          >
            <span className="text-xl font-bold">
              {config['name'].charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {config['name']}
            </h1>
            <p className="text-gray-600">{config['description']}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={t('commission.members')}
            value={metrics.memberCount}
            change={`+${Math.floor(Math.random() * 10)}%`}
            icon={<UserGroupIcon className="h-6 w-6 text-white" />}
            color="bg-blue-500"
          />
          <MetricCard
            title={t('commission.activeProjects')}
            value={metrics.activeProjects}
            change={`+${Math.floor(Math.random() * 5)}`}
            icon={<ClipboardDocumentListIcon className="h-6 w-6 text-white" />}
            color="bg-green-500"
          />
          <MetricCard
            title={t('commission.upcomingEvents')}
            value={metrics.upcomingEvents}
            icon={<CalendarDaysIcon className="h-6 w-6 text-white" />}
            color="bg-purple-500"
          />
          <MetricCard
            title={t('commission.engagementScore')}
            value={`${metrics.engagementScore.toFixed(1)}%`}
            change={`+${(Math.random() * 5).toFixed(1)}%`}
            icon={<ArrowTrendingUpIcon className="h-6 w-6 text-white" />}
            color="bg-orange-500"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab['name']}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Activity Chart */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {t('commission.monthlyActivity')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="projects"
                    stroke={config.color}
                    strokeWidth={2}
                    name={t('commission.projects')}
                  />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke="#10B981"
                    strokeWidth={2}
                    name={t('commission.events')}
                  />
                  <Line
                    type="monotone"
                    dataKey="members"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name={t('commission.newMembers')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Skills & Tools */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  {t('commission.skillAreas')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {config?.skillAreas?.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  {t('commission.tools')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {config?.tools?.map((tool, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Metrics */}
            {customMetrics}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {t('commission.projectOverview')}
            </h3>
            <p className="text-gray-600">
              {t('commission.projectsComingSoon')}
            </p>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {t('commission.memberDirectory')}
            </h3>
            <p className="text-gray-600">{t('commission.membersComingSoon')}</p>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {t('commission.resourceLibrary')}
            </h3>
            <p className="text-gray-600">
              {t('commission.resourcesComingSoon')}
            </p>
          </div>
        )}
      </div>

      {/* Commission-Specific Content */}
      {children}

      {/* Custom Tools */}
      {customTools && (
        <div className="mt-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            {t('commission.tools')}
          </h2>
          {customTools}
        </div>
      )}
    </div>
  );
};

export default BaseCommissionDashboard;
