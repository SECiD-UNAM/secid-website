import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';

import type { MetricCardConfig, TimeSeriesData } from '../../types/analytics';

interface MetricCardProps {
  config: MetricCardConfig;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  config,
  className,
  size = 'md',
  showTrend = true,
}) => {
  const {
    title,
    value,
    previousValue,
    change,
    changeType,
    unit,
    format,
    icon,
    color,
    trend,
    target,
    description,
  } = config;

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'duration':
        if (val < 60) return `${val}s`;
        if (val < 3600) return `${Math.floor(val / 60)}m ${val % 60}s`;
        return `${Math.floor(val / 3600)}h ${Math.floor((val % 3600) / 60)}m`;
      case 'number':
      default:
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        }
        if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
        return val.toLocaleString();
    }
  };

  const getChangeIcon = () => {
    if (!change || changeType === 'neutral') return null;

    return changeType === 'increase' ? (
      <ArrowUpIcon className="h-4 w-4" />
    ) : (
      <ArrowDownIcon className="h-4 w-4" />
    );
  };

  const getChangeColor = () => {
    if (!change || changeType === 'neutral') return 'text-gray-500';
    return changeType === 'increase' ? 'text-green-600' : 'text-red-600';
  };

  const getCardColor = () => {
    switch (color) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'danger':
        return 'border-red-200 bg-red-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      case 'primary':
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-4';
      case 'lg':
        return 'p-8';
      case 'md':
      default:
        return 'p-6';
    }
  };

  const getProgressPercent = () => {
    if (!target || typeof value !== 'number') return 0;
    return Math.min((value / target) * 100, 100);
  };

  return (
    <div
      className={clsx(
        'rounded-lg border shadow-sm transition-shadow hover:shadow-md',
        getCardColor(),
        getSizeClasses(),
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>

          <div className="mt-2">
            <p className="text-2xl font-semibold text-gray-900">
              {formatValue(value)}
              {unit && (
                <span className="ml-1 text-sm font-normal text-gray-500">
                  {unit}
                </span>
              )}
            </p>

            {change !== undefined && (
              <div
                className={clsx(
                  'mt-1 flex items-center gap-1',
                  getChangeColor()
                )}
              >
                {getChangeIcon()}
                <span className="text-sm font-medium">
                  {Math.abs(change).toFixed(1)}%
                </span>
                {previousValue && (
                  <span className="text-xs text-gray-500">
                    vs {formatValue(previousValue)}
                  </span>
                )}
              </div>
            )}
          </div>

          {description && (
            <p className="mt-2 text-xs text-gray-500">{description}</p>
          )}

          {target && typeof value === 'number' && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Progress</span>
                <span>{formatValue(target)} target</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={clsx(
                    'h-2 rounded-full transition-all duration-300',
                    color === 'success'
                      ? 'bg-green-500'
                      : color === 'warning'
                        ? 'bg-yellow-500'
                        : color === 'danger'
                          ? 'bg-red-500'
                          : color === 'info'
                            ? 'bg-blue-500'
                            : 'bg-blue-500'
                  )}
                  style={{ width: `${getProgressPercent()}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {getProgressPercent().toFixed(1)}% of target
              </p>
            </div>
          )}
        </div>

        {showTrend && trend && trend.length > 0 && (
          <div className="ml-4 h-12 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={
                    changeType === 'increase'
                      ? '#10b981'
                      : changeType === 'decrease'
                        ? '#ef4444'
                        : '#6b7280'
                  }
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// Predefined metric card configurations for common use cases
export const MetricCardTemplates = {
  userRegistrations: (data: {
    current: number;
    previous?: number;
    trend?: TimeSeriesData[];
  }): MetricCardConfig => ({
    title: 'New Registrations',
    value: data['current'],
    previousValue: data['previous'],
    change: data['previous']
      ? ((data['current'] - data['previous']) / data['previous']) * 100
      : undefined,
    changeType:
      data['previous'] && data['current'] > data['previous']
        ? 'increase'
        : 'decrease',
    format: 'number',
    icon: '👥',
    color: 'success',
    trend: data['trend'],
    description: 'New user registrations this period',
  }),

  activeUsers: (data: {
    current: number;
    previous?: number;
    trend?: TimeSeriesData[];
  }): MetricCardConfig => ({
    title: 'Active Users',
    value: data['current'],
    previousValue: data['previous'],
    change: data['previous']
      ? ((data['current'] - data['previous']) / data['previous']) * 100
      : undefined,
    changeType:
      data['previous'] && data['current'] > data['previous']
        ? 'increase'
        : 'decrease',
    format: 'number',
    icon: '🟢',
    color: 'primary',
    trend: data['trend'],
    description: 'Users active in the last 30 days',
  }),

  jobApplications: (data: {
    current: number;
    previous?: number;
    trend?: TimeSeriesData[];
  }): MetricCardConfig => ({
    title: 'Job Applications',
    value: data['current'],
    previousValue: data['previous'],
    change: data['previous']
      ? ((data['current'] - data['previous']) / data['previous']) * 100
      : undefined,
    changeType:
      data['previous'] && data['current'] > data['previous']
        ? 'increase'
        : 'decrease',
    format: 'number',
    icon: '💼',
    color: 'info',
    trend: data['trend'],
    description: 'Total job applications submitted',
  }),

  revenue: (data: {
    current: number;
    previous?: number;
    trend?: TimeSeriesData[];
    target?: number;
  }): MetricCardConfig => ({
    title: 'Revenue',
    value: data['current'],
    previousValue: data['previous'],
    change: data['previous']
      ? ((data['current'] - data['previous']) / data['previous']) * 100
      : undefined,
    changeType:
      data['previous'] && data['current'] > data['previous']
        ? 'increase'
        : 'decrease',
    format: 'currency',
    icon: '💰',
    color: 'success',
    trend: data['trend'],
    target: data['target'],
    description: 'Total revenue generated',
  }),

  conversionRate: (data: {
    current: number;
    previous?: number;
    trend?: TimeSeriesData[];
  }): MetricCardConfig => ({
    title: 'Conversion Rate',
    value: data['current'],
    previousValue: data['previous'],
    change: data['previous']
      ? ((data['current'] - data['previous']) / data['previous']) * 100
      : undefined,
    changeType:
      data['previous'] && data['current'] > data['previous']
        ? 'increase'
        : 'decrease',
    format: 'percentage',
    icon: '📈',
    color: 'warning',
    trend: data['trend'],
    description: 'Percentage of visitors who convert',
  }),

  averageLoadTime: (data: {
    current: number;
    previous?: number;
    trend?: TimeSeriesData[];
  }): MetricCardConfig => ({
    title: 'Avg Load Time',
    value: data['current'],
    previousValue: data['previous'],
    change: data['previous']
      ? ((data['current'] - data['previous']) / data['previous']) * 100
      : undefined,
    changeType:
      data['previous'] && data['current'] < data['previous']
        ? 'increase'
        : 'decrease', // Lower is better
    format: 'duration',
    icon: '⚡',
    color:
      data['current'] > 3
        ? 'danger'
        : data['current'] > 2
          ? 'warning'
          : 'success',
    trend: data['trend'],
    description: 'Average page load time',
  }),

  errorRate: (data: {
    current: number;
    previous?: number;
    trend?: TimeSeriesData[];
  }): MetricCardConfig => ({
    title: 'Error Rate',
    value: data['current'],
    previousValue: data['previous'],
    change: data['previous']
      ? ((data['current'] - data['previous']) / data['previous']) * 100
      : undefined,
    changeType:
      data['previous'] && data['current'] < data['previous']
        ? 'increase'
        : 'decrease', // Lower is better
    format: 'percentage',
    icon: '⚠️',
    color:
      data['current'] > 5
        ? 'danger'
        : data['current'] > 2
          ? 'warning'
          : 'success',
    trend: data['trend'],
    description: 'Application error rate',
  }),
};

export default MetricCard;
