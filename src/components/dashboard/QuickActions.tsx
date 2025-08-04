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
      blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30',
      green:
        'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30',
      purple:
        'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/30',
      orange:
        'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/30',
      pink: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/30',
      indigo:
        'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/30',
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
              block rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800
              ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'}
            `}
            onClick={isDisabled ? (e) => e.preventDefault() : undefined}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`rounded-lg p-3 ${getColorClasses(action.color)}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
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
