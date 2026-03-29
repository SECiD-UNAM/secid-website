import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import { useBeta } from '@/hooks/useBeta';
import { isFeatureEnabled, type BetaFeatureId } from '@/lib/beta';
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
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  NewspaperIcon,
  StarIcon,
  RectangleGroupIcon,
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
  requireRole?: (
    | 'member'
    | 'admin'
    | 'moderator'
    | 'company'
    | 'collaborator'
  )[];
  requireVerified?: boolean;
  requireBeta?: BetaFeatureId;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  lang = 'es',
  mobileOpen = false,
  onClose,
}) => {
  const { userProfile, isVerified, isAdmin, isModerator, signOut } = useAuth();
  const t = useTranslations(lang);
  const isBeta = useBeta();

  // Display-only toggle for hiding admin nav during demos. No security function.
  const [showAdminNav, setShowAdminNav] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('secid-admin-mode') === 'true';
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSettingsPointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowAdminNav((prev) => {
        const next = !prev;
        sessionStorage.setItem('secid-admin-mode', String(next));
        // Play toggle sound
        try {
          const ctx = new AudioContext();
          if (next) {
            // Activate: ascending two-tone chime
            [440, 660].forEach((freq, i) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
              osc.connect(gain).connect(ctx.destination);
              osc.start(ctx.currentTime + i * 0.12);
              osc.stop(ctx.currentTime + i * 0.12 + 0.3);
            });
          } else {
            // Deactivate: descending two-tone
            [660, 440].forEach((freq, i) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
              osc.connect(gain).connect(ctx.destination);
              osc.start(ctx.currentTime + i * 0.12);
              osc.stop(ctx.currentTime + i * 0.12 + 0.25);
            });
          }
        } catch { /* ignore if AudioContext unavailable */ }
        return next;
      });
    }, 3000);
  }, []);

  const onSettingsPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '';

  const menuItems: MenuItem[] = [
    {
      name: lang === 'es' ? 'Panel' : 'Dashboard',
      href: `/${lang}/dashboard`,
      icon: HomeIcon,
    },
    {
      name: lang === 'es' ? 'Mi Perfil' : 'My Profile',
      href: `/${lang}/dashboard/profile`,
      icon: UserCircleIcon,
    },
    {
      name: lang === 'es' ? 'Empleos' : 'Jobs',
      href: `/${lang}/dashboard/jobs`,
      icon: BriefcaseIcon,
      requireVerified: true,
    },
    {
      name: lang === 'es' ? 'Eventos' : 'Events',
      href: `/${lang}/dashboard/events`,
      icon: CalendarIcon,
      requireVerified: true,
    },
    {
      name: lang === 'es' ? 'Foros' : 'Forums',
      href: `/${lang}/dashboard/forums`,
      icon: ChatBubbleLeftRightIcon,
      requireVerified: true,
    },
    {
      name: lang === 'es' ? 'Mentoría' : 'Mentorship',
      href: `/${lang}/dashboard/mentorship`,
      icon: AcademicCapIcon,
      requireVerified: true,
    },
    {
      name: lang === 'es' ? 'Recursos' : 'Resources',
      href: `/${lang}/dashboard/resources`,
      icon: BookOpenIcon,
      requireVerified: true,
    },
    {
      name: lang === 'es' ? 'Miembros' : 'Members',
      href: `/${lang}/dashboard/members`,
      icon: UserGroupIcon,
      requireVerified: true,
    },
    {
      name: lang === 'es' ? 'Red de Empresas' : 'Company Network',
      href: `/${lang}/dashboard/companies`,
      icon: BuildingOffice2Icon,
      requireVerified: true,
    },
    {
      name: lang === 'es' ? 'Salarios' : 'Salary Insights',
      href: `/${lang}/dashboard/salary-insights`,
      icon: CurrencyDollarIcon,
      requireVerified: true,
    },
  ];

  const contentItems: MenuItem[] = [
    {
      name: lang === 'es' ? 'Journal Club' : 'Journal Club',
      href: `/${lang}/dashboard/journal-club`,
      icon: BookOpenIcon,
      requireRole: ['admin', 'moderator', 'collaborator'],
    },
    {
      name: lang === 'es' ? 'Newsletter' : 'Newsletter',
      href: `/${lang}/dashboard/newsletter`,
      icon: NewspaperIcon,
      requireRole: ['admin', 'moderator', 'collaborator'],
    },
    {
      name: lang === 'es' ? 'Destacados' : 'Spotlights',
      href: `/${lang}/dashboard/spotlights`,
      icon: StarIcon,
      requireRole: ['admin', 'moderator', 'collaborator'],
    },
  ];

  const adminItems: MenuItem[] = [
    {
      name: lang === 'es' ? 'Panel Admin' : 'Admin Panel',
      href: `/${lang}/dashboard/admin`,
      icon: ChartBarIcon,
      requireRole: ['admin'],
    },
    {
      name: lang === 'es' ? 'Gestión Miembros' : 'Manage Members',
      href: `/${lang}/dashboard/admin/members`,
      icon: UserGroupIcon,
      requireRole: ['admin', 'moderator'],
    },
    {
      name: lang === 'es' ? 'Empresas' : 'Companies',
      href: `/${lang}/dashboard/admin/companies`,
      icon: BriefcaseIcon,
      requireRole: ['admin', 'moderator'],
    },
    {
      name: lang === 'es' ? 'Grupos' : 'Groups',
      href: `/${lang}/dashboard/admin/groups`,
      icon: RectangleGroupIcon,
      requireRole: ['admin'],
    },
    {
      name: lang === 'es' ? 'Salarios (Admin)' : 'Salary Data',
      href: `/${lang}/dashboard/admin/salary`,
      icon: CurrencyDollarIcon,
      requireRole: ['admin'],
    },
    {
      name: lang === 'es' ? 'Reportes' : 'Reports',
      href: `/${lang}/dashboard/admin/reports`,
      icon: DocumentTextIcon,
      requireRole: ['admin', 'moderator'],
    },
    {
      name: lang === 'es' ? 'Notificaciones' : 'Notifications',
      href: `/${lang}/dashboard/admin/notifications`,
      icon: BellIcon,
      requireRole: ['admin', 'moderator'],
    },
  ];

  const bottomItems: MenuItem[] = [
    {
      name: lang === 'es' ? 'Configuración' : 'Settings',
      href: `/${lang}/dashboard/settings`,
      icon: Cog6ToothIcon,
    },
  ];

  const isItemAccessible = (item: MenuItem): boolean => {
    if (item.requireBeta && !isFeatureEnabled(item.requireBeta)) return false;
    if (item.requireVerified && !isVerified) return false;
    if (
      item.requireRole &&
      !item.requireRole.includes(userProfile?.role || 'member')
    )
      return false;
    return true;
  };

  const allHrefs = [
    ...menuItems,
    ...contentItems,
    ...adminItems,
    ...bottomItems,
  ].map((i) => i.href);

  const isItemActive = (href: string): boolean => {
    const path = currentPath.replace(/\/$/, '');
    const target = href.replace(/\/$/, '');
    if (path === target) return true;
    // Only match as prefix if no more-specific sibling matches
    if (path.startsWith(target + '/')) {
      return !allHrefs.some(
        (other) =>
          other !== href &&
          other.startsWith(target + '/') &&
          path.startsWith(other.replace(/\/$/, ''))
      );
    }
    return false;
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
              ? 'bg-primary-100 text-primary-700 dark:border-l-2 dark:border-primary-500 dark:bg-primary-900/20 dark:text-primary-400'
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
              {lang === 'es'
                ? '(Verificación requerida)'
                : '(Verification Required)'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {item.requireBeta && isBeta && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              Beta
            </span>
          )}
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
        </div>
      </a>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-1 overflow-y-auto px-4 pt-4 pb-4">
        {/* Main menu items */}
        <div className="space-y-1">{menuItems.map(renderMenuItem)}</div>

        {/* Content management section (visible to authorized roles) */}
        {contentItems.some(isItemAccessible) && (
          <>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {lang === 'es' ? 'Contenido' : 'Content'}
              </p>
              {contentItems.map((item) => {
                if (isItemAccessible(item)) {
                  return renderMenuItem(item);
                }
                return null;
              })}
            </div>
          </>
        )}

        {/* Admin section (hidden until admin mode activated) */}
        {showAdminNav && (isAdmin || isModerator) && (
          <>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {lang === 'es' ? 'Administración' : 'Administration'}
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

      {/* Bottom section — sticky, never overlaps */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
        {bottomItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onPointerDown={onSettingsPointerDown}
            onPointerUp={onSettingsPointerUp}
            onPointerLeave={onSettingsPointerUp}
            className={`flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isItemActive(item.href)
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span>{item.name}</span>
            {showAdminNav && (
              <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" title="Admin mode" />
            )}
          </a>
        ))}
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
          <span>{lang === 'es' ? 'Cerrar Sesión' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed bottom-0 left-0 z-30 hidden w-64 border-r border-gray-200 bg-white pb-4 dark:border-gray-800 dark:bg-gray-800 lg:block ${isBeta ? 'top-24' : 'top-16'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <aside
            className={`fixed bottom-0 left-0 z-50 w-64 border-r border-gray-200 bg-white pb-4 dark:border-gray-800 dark:bg-gray-800 lg:hidden ${isBeta ? 'top-24' : 'top-16'}`}
          >
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
