import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  BriefcaseIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  type:
    | 'job_application'
    | 'event_registration'
    | 'forum_post'
    | 'profile_update'
    | 'connection'
    | 'verification';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

interface RecentActivityProps {
  lang?: 'es' | 'en';
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  lang = 'es',
}) => {
  const { user, userProfile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real activities from Firestore when activity tracking is implemented
    setActivities([]);
    setLoading(false);
  }, [userProfile, lang]);

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      return lang === 'es' ? 'Hace menos de 1 hora' : 'Less than 1 hour ago';
    } else if (hours < 24) {
      return lang === 'es'
        ? `Hace ${hours} hora${hours > 1 ? 's' : ''}`
        : `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return lang === 'es'
        ? `Hace ${days} día${days > 1 ? 's' : ''}`
        : `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US');
    }
  };

  const getIconColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green:
        'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple:
        'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      orange:
        'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800 dark:border dark:border-gray-700/30">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800 dark:border dark:border-gray-700/30">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {lang === 'es' ? 'No hay actividad reciente' : 'No recent activity'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow dark:bg-gray-800 dark:border dark:border-gray-700/30">
      <div className="p-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              const isLast = index === activities.length - 1;

              return (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {!isLast && (
                      <span
                        className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div
                        className={`relative rounded-full px-1.5 py-1.5 ${getIconColorClasses(activity.iconColor)}`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {activity['description']}
                          </p>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          {formatTimestamp(activity['timestamp'])}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 px-6 py-3 dark:bg-gray-800/50">
        <a
          href={`/${lang}/dashboard/activity`}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {lang === 'es' ? 'Ver toda la actividad →' : 'View all activity →'}
        </a>
      </div>
    </div>
  );
};

export default RecentActivity;
