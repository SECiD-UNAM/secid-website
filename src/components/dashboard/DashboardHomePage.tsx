import React from 'react';
import { DashboardShell } from './DashboardShell';
import { DashboardStats } from './DashboardStats';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import { JobMatches } from './JobMatches';
import { UpcomingEvents } from './UpcomingEvents';

interface DashboardHomePageProps {
  lang?: 'es' | 'en';
}

const i18n = {
  es: {
    welcome: 'Bienvenido al Panel de Miembros',
    subtitle:
      'Gestiona tu perfil, explora oportunidades laborales y conecta con la comunidad.',
    recentActivity: 'Actividad Reciente',
    recommendedJobs: 'Trabajos Recomendados',
    upcomingEvents: 'Pr\u00f3ximos Eventos',
  },
  en: {
    welcome: 'Welcome to Your Dashboard',
    subtitle:
      'Manage your profile, explore job opportunities, and connect with the community.',
    recentActivity: 'Recent Activity',
    recommendedJobs: 'Recommended Jobs',
    upcomingEvents: 'Upcoming Events',
  },
};

export const DashboardHomePage: React.FC<DashboardHomePageProps> = ({
  lang = 'es',
}) => {
  const t = i18n[lang];

  return (
    <DashboardShell lang={lang}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-white">
          {t.welcome}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t.subtitle}</p>
      </div>

      {/* Stats Overview */}
      <DashboardStats lang={lang} />

      {/* Quick Actions */}
      <div className="mt-8">
        <QuickActions lang={lang} />
      </div>

      {/* Main Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Activity */}
        <div>
          <h2 className="mb-4 font-heading text-xl font-semibold text-gray-900 dark:text-white">
            {t.recentActivity}
          </h2>
          <RecentActivity lang={lang} />
        </div>

        {/* Job Matches */}
        <div>
          <h2 className="mb-4 font-heading text-xl font-semibold text-gray-900 dark:text-white">
            {t.recommendedJobs}
          </h2>
          <JobMatches lang={lang} />
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          {t.upcomingEvents}
        </h2>
        <UpcomingEvents lang={lang} />
      </div>
    </DashboardShell>
  );
};

export default DashboardHomePage;
