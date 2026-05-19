import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  accent?: 'primary' | 'blue' | 'green' | 'yellow' | 'purple';
}

const ACCENT_CLASSES: Record<NonNullable<StatsCardProps['accent']>, string> = {
  primary: 'text-primary-600 dark:text-primary-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

function StatsCard({
  label,
  value,
  trend,
  trendUp,
  icon,
  accent = 'primary',
}: StatsCardProps) {
  const accentClass = ACCENT_CLASSES[accent];

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-gray-700/30 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${accentClass}`}>{value}</p>
          {trend != null && (
            <p
              data-testid="stats-trend"
              className={`mt-1 text-sm ${
                trendUp
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend}
            </p>
          )}
        </div>
        {icon != null && (
          <div
            data-testid="stats-icon"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsCard;
