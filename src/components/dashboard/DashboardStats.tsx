import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  BriefcaseIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface DashboardStatsProps {
  lang?: 'es' | 'en';
}

interface Stat {
  name: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: string;
  changeType?: 'increase' | 'decrease';
  loading?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  lang = 'es',
}) => {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Fetch job applications count
        const applicationsQuery = query(
          collection(db, 'applications'),
          where('applicantId', '==', user.uid)
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        const applicationsCount = applicationsSnapshot.size;

        // Fetch registered events count
        const eventsQuery = query(
          collection(db, 'eventRegistrations'),
          where('userId', '==', user.uid)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsCount = eventsSnapshot.size;

        // Calculate profile completeness
        const profileCompleteness = userProfile?.profileCompleteness || 20;

        // Set stats
        setStats([
          {
            name: lang === 'es' ? 'Aplicaciones Enviadas' : 'Applications Sent',
            value: applicationsCount,
            icon: BriefcaseIcon,
          },
          {
            name: lang === 'es' ? 'Eventos Registrados' : 'Events Registered',
            value: eventsCount,
            icon: CalendarIcon,
          },
          {
            name: lang === 'es' ? 'Conexiones' : 'Connections',
            value: 0,
            icon: UserGroupIcon,
          },
          {
            name: lang === 'es' ? 'Perfil Completo' : 'Profile Complete',
            value: `${profileCompleteness}%`,
            icon: ChartBarIcon,
            change:
              profileCompleteness < 100
                ? lang === 'es'
                  ? 'Completar'
                  : 'Complete'
                : lang === 'es'
                  ? 'Completo'
                  : 'Complete',
            changeType: profileCompleteness < 100 ? 'decrease' : 'increase',
          },
        ]);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set default stats on error
        setStats([
          {
            name: lang === 'es' ? 'Aplicaciones Enviadas' : 'Applications Sent',
            value: 0,
            icon: BriefcaseIcon,
          },
          {
            name: lang === 'es' ? 'Eventos Registrados' : 'Events Registered',
            value: 0,
            icon: CalendarIcon,
          },
          {
            name: lang === 'es' ? 'Conexiones' : 'Connections',
            value: 0,
            icon: UserGroupIcon,
          },
          {
            name: lang === 'es' ? 'Perfil Completo' : 'Profile Complete',
            value: '20%',
            icon: ChartBarIcon,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, userProfile, lang]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-white p-6 shadow dark:bg-gray-800 dark:border dark:border-gray-700/30"
          >
            <div className="mb-4 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-8 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat['name']}
            className="rounded-xl bg-white p-6 shadow transition-all hover:shadow-lg hover:-translate-y-1 dark:bg-gray-800 dark:border dark:border-gray-700/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat['name']}
                </p>
                <p className="mt-2 font-heading text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.change && (
                  <p
                    className={`mt-2 text-sm ${
                      stat.changeType === 'increase'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}
                  >
                    {stat.change}
                  </p>
                )}
              </div>
              <div className="ml-4">
                <div
                  className={`rounded-full p-3 ${
                    stat.changeType === 'increase'
                      ? 'bg-primary-100 dark:bg-primary-900/20'
                      : stat.changeType === 'decrease'
                        ? 'bg-accent-100 dark:bg-accent-900/20'
                        : 'bg-secondary-100 dark:bg-secondary-900/20'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      stat.changeType === 'increase'
                        ? 'text-primary-600 dark:text-primary-400'
                        : stat.changeType === 'decrease'
                          ? 'text-accent-600 dark:text-accent-400'
                          : 'text-secondary-600 dark:text-secondary-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
