import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import {
  HomeIcon,
  UserCircleIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface DashboardSidebarProps {
  lang?: 'es' | 'en';
  mobileOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  requireRole?: ('member' | 'admin' | 'moderator' | 'company' | 'collaborator')[];
  requireVerified?: boolean;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  lang = 'es',
  mobileOpen = false,
  onClose,
}) => {
  const { userProfile, isVerified, isAdmin, isModerator, signOut } = useAuth();
  const t = useTranslations(lang);

  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '';

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      href: `/${lang}/dashboard`,
      icon: HomeIcon,
    },
    {
      name: 'My Profile',
      href: `/${lang}/dashboard/profile`,
      icon: UserCircleIcon,
    },
    {
      name: 'Jobs',
      href: `/${lang}/dashboard/jobs`,
      icon: BriefcaseIcon,
      badge: 'New',
    },
    {
      name: 'Events',
      href: `/${lang}/dashboard/events`,
      icon: CalendarIcon,
      badge: 3,
    },
    {
      name: 'Forums',
      href: `/${lang}/dashboard/forums`,
      icon: ChatBubbleLeftRightIcon,
    },
    {
      name: 'Mentorship',
      href: `/${lang}/dashboard/mentorship`,
      icon: AcademicCapIcon,
      requireVerified: true,
    },
    {
      name: 'Resources',
      href: `/${lang}/dashboard/resources`,
      icon: BookOpenIcon,
    },
    {
      name: 'Members',
      href: `/${lang}/dashboard/members`,
      icon: UserGroupIcon,
      requireVerified: true,
    },
  ];

  const adminItems: MenuItem[] = [
    {
      name: 'Admin Panel',
      href: `/${lang}/dashboard/admin`,
      icon: ChartBarIcon,
      requireRole: ['admin'],
    },
    {
      name: 'Reports',
      href: `/${lang}/dashboard/admin/reports`,
      icon: DocumentTextIcon,
      requireRole: ['admin', 'moderator'],
    },
    {
      name: 'Notifications',
      href: `/${lang}/dashboard/admin/notifications`,
      icon: BellIcon,
      requireRole: ['admin', 'moderator'],
    },
  ];

  const bottomItems: MenuItem[] = [
    {
      name: 'Settings',
      href: `/${lang}/dashboard/settings`,
      icon: Cog6ToothIcon,
    },
  ];

  const isItemAccessible = (item: MenuItem): boolean => {
    if (item.requireVerified && !isVerified) return false;
    if (
      item.requireRole &&
      !item.requireRole.includes(userProfile?.role || 'member')
    )
      return false;
    return true;
  };

  const isItemActive = (href: string): boolean => {
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = `/${lang}`;
  };

  const renderMenuItem = (item: MenuItem) => {
    const accessible = isItemAccessible(item);
    const active = isItemActive(item.href);
    const Icon = item.icon;

    return (
      <a
        key={item.href}
        href={accessible ? item.href : '#'}
        className={`
          flex items-center justify-between rounded-lg px-4 py-2 text-sm font-medium transition-colors
          ${
            active
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 dark:border-l-2 dark:border-primary-500'
              : accessible
                ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                : 'cursor-not-allowed text-gray-400 opacity-50 dark:text-gray-600'
          }
        `}
        onClick={!accessible ? (e) => e.preventDefault() : undefined}
      >
        <div className="flex items-center">
          <Icon className="mr-3 h-5 w-5" />
          <span>{item['name']}</span>
          {!accessible && item.requireVerified && (
            <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
              (Verification Required)
            </span>
          )}
        </div>
        {item.badge && accessible && (
          <span
            className={`
            rounded-full px-2 py-1 text-xs font-semibold
            ${
              typeof item.badge === 'number'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
            }
          `}
          >
            {item.badge}
          </span>
        )}
      </a>
    );
  };

  const sidebarContent = (
    <>
      <div className="space-y-1 px-4">
        {/* Main menu items */}
        <div className="space-y-1">{menuItems.map(renderMenuItem)}</div>

        {/* Admin section */}
        {(isAdmin || isModerator) && (
          <>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Administration
              </p>
              {adminItems.map((item) => {
                if (isItemAccessible(item)) {
                  return renderMenuItem(item);
                }
                return null;
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
        {bottomItems.map(renderMenuItem)}
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
          <span>{lang === 'es' ? 'Cerrar Sesión' : 'Sign Out'}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed top-16 bottom-0 left-0 z-30 hidden w-64 overflow-y-auto border-r border-gray-200 bg-white pb-4 dark:border-gray-800 dark:bg-gray-800 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <aside className="fixed top-16 bottom-0 left-0 z-50 w-64 overflow-y-auto border-r border-gray-200 bg-white pb-4 dark:border-gray-800 dark:bg-gray-800 lg:hidden">
            <div className="flex items-center justify-end px-4 py-2">
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label={lang === 'es' ? 'Cerrar menú' : 'Close menu'}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};

export default DashboardSidebar;
