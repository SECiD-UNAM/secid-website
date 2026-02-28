import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  PlusCircleIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  UserPlusIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface QuickActionsProps {
  lang?: 'es' | 'en';
}

interface Action {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ lang = 'es' }) => {
  const { isVerified } = useAuth();

  const actions: Action[] = [
    {
      title: lang === 'es' ? 'Buscar Empleos' : 'Browse Jobs',
      description:
        lang === 'es'
          ? 'Explora oportunidades laborales'
          : 'Explore job opportunities',
      icon: MagnifyingGlassIcon,
      href: `/${lang}/dashboard/jobs`,
      color: 'blue',
    },
    {
      title: lang === 'es' ? 'Actualizar CV' : 'Update Resume',
      description:
        lang === 'es'
          ? 'Mantén tu perfil actualizado'
          : 'Keep your profile up to date',
      icon: DocumentTextIcon,
      href: `/${lang}/dashboard/profile`,
      color: 'green',
    },
    {
      title: lang === 'es' ? 'Ver Eventos' : 'View Events',
      description:
        lang === 'es'
          ? 'Próximos eventos y talleres'
          : 'Upcoming events and workshops',
      icon: CalendarDaysIcon,
      href: `/${lang}/dashboard/events`,
      color: 'purple',
    },
    {
      title: lang === 'es' ? 'Publicar Empleo' : 'Post a Job',
      description:
        lang === 'es' ? 'Comparte oportunidades' : 'Share opportunities',
      icon: PlusCircleIcon,
      href: `/${lang}/dashboard/jobs/post`,
      color: 'orange',
    },
    {
      title: lang === 'es' ? 'Conectar' : 'Connect',
      description:
        lang === 'es' ? 'Encuentra otros miembros' : 'Find other members',
      icon: UserPlusIcon,
      href: `/${lang}/dashboard/members`,
      color: 'pink',
    },
    {
      title: lang === 'es' ? 'Mentoría' : 'Mentorship',
      description:
        lang === 'es' ? 'Programa de mentores' : 'Mentorship program',
      icon: AcademicCapIcon,
      href: `/${lang}/dashboard/mentorship`,
      color: 'indigo',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-secondary-100 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-900/30',
      green:
        'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/30',
      purple:
        'bg-accent-100 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 hover:bg-accent-200 dark:hover:bg-accent-900/30',
      orange:
        'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/30',
      pink: 'bg-secondary-100 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-900/30',
      indigo:
        'bg-accent-100 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 hover:bg-accent-200 dark:hover:bg-accent-900/30',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        const isDisabled = action.href.includes('mentorship') && !isVerified;

        return (
          <a
            key={action.title}
            href={isDisabled ? '#' : action.href}
            className={`
              group relative block overflow-hidden rounded-xl bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800 dark:border dark:border-gray-700/30
              ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 hover:-translate-y-1'}
            `}
            onClick={isDisabled ? (e) => e.preventDefault() : undefined}
          >
            {/* Top gradient stripe on hover */}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-start space-x-4">
              <div
                className={`rounded-lg p-3 ${getColorClasses(action.color)}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-lg font-semibold text-gray-900 dark:text-white">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {action['description']}
                </p>
                {isDisabled && (
                  <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                    {lang === 'es'
                      ? 'Verificación requerida'
                      : 'Verification required'}
                  </p>
                )}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
};

export default QuickActions;
