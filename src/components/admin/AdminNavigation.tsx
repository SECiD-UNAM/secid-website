import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import {
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  User,
  Search,
  Home,
  AlertTriangle,
} from 'lucide-react';

interface AdminNavigationProps {
  currentPath?: string;
  onNavClick?: (path: string) => void;
}

interface NavigationItem {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  requiredPermission?: string;
  badge?: number;
  subItems?: NavigationItem[];
}

export const AdminNavigation: React.FC<AdminNavigationProps> = ({
  currentPath = '/admin',
  onNavClick,
}) => {
  const { userProfile, isAdmin, isModerator, signOut } = useAuth();
  const { t: _t, language } = useTranslations();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Mock notification count - in real app, this would come from a context or API
  const notificationCount = 3;

  const navigationItems: NavigationItem[] = [
    {
      key: 'dashboard',
      label: language === 'es' ? 'Panel Principal' : 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin',
    },
    {
      key: 'users',
      label: language === 'es' ? 'Usuarios' : 'Users',
      icon: Users,
      path: '/admin/users',
      subItems: [
        {
          key: 'users-list',
          label: language === 'es' ? 'Lista de Usuarios' : 'User List',
          icon: Users,
          path: '/admin/users',
        },
        {
          key: 'user-roles',
          label: language === 'es' ? 'Roles y Permisos' : 'Roles & Permissions',
          icon: Shield,
          path: '/admin/users/roles',
        },
      ],
    },
    {
      key: 'moderation',
      label: language === 'es' ? 'Moderación' : 'Moderation',
      icon: Shield,
      path: '/admin/moderation',
      badge: 5, // Mock pending items count
      subItems: [
        {
          key: 'content-queue',
          label: language === 'es' ? 'Cola de Contenido' : 'Content Queue',
          icon: AlertTriangle,
          path: '/admin/moderation/queue',
          badge: 3,
        },
        {
          key: 'reports',
          label: language === 'es' ? 'Reportes' : 'Reports',
          icon: AlertTriangle,
          path: '/admin/moderation/reports',
          badge: 2,
        },
      ],
    },
    {
      key: 'analytics',
      label: language === 'es' ? 'Analytics' : 'Analytics',
      icon: BarChart3,
      path: '/admin/analytics',
      requiredPermission: 'admin',
    },
    {
      key: 'settings',
      label: language === 'es' ? 'Configuración' : 'Settings',
      icon: Settings,
      path: '/admin/settings',
      requiredPermission: 'admin',
    },
  ];

  const handleNavigation = (path: string) => {
    if (onNavClick) {
      onNavClick(path);
    } else {
      // Default navigation behavior
      window.location.href = path;
    }
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleExpandedItem = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const hasPermission = (requiredPermission?: string) => {
    if (!requiredPermission) return true;
    if (requiredPermission === 'admin') return isAdmin;
    if (requiredPermission === 'moderator') return isAdmin || isModerator;
    return true;
  };

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    if (!hasPermission(item.requiredPermission)) return null;

    const isActive =
      currentPath === item.path ||
      (item.subItems && item.subItems.some((sub) => currentPath === sub.path));
    const isExpanded = expandedItems.has(item.key);
    const hasSubItems = item.subItems && item.subItems.length > 0;

    const Icon = item.icon;

    return (
      <div key={item.key}>
        <div
          className={`flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm transition-colors ${
            depth > 0 ? 'ml-4' : ''
          } ${
            isActive
              ? 'border-r-2 border-blue-600 bg-blue-100 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
          onClick={() => {
            if (hasSubItems) {
              toggleExpandedItem(item.key);
            } else {
              handleNavigation(item.path);
            }
          }}
        >
          <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{item.label}</span>

          {item.badge && item.badge > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-white">
              {item.badge}
            </span>
          )}

          {hasSubItems && (
            <ChevronDown
              className={`ml-2 h-4 w-4 transition-transform ${
                isExpanded ? 'rotate-180 transform' : ''
              }`}
            />
          )}
        </div>

        {hasSubItems && isExpanded && (
          <div className="mt-1">
            {item.subItems!.map((subItem) =>
              renderNavigationItem(subItem, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="rounded-md border border-gray-200 bg-white p-2 text-gray-700 shadow-lg hover:bg-gray-50"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:inset-0 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">SECiD</h1>
              <p className="text-xs text-gray-500">
                {language === 'es' ? 'Panel Admin' : 'Admin Panel'}
              </p>
            </div>
          </div>

          {/* Back to main site */}
          <button
            onClick={() => handleNavigation('/')}
            className="p-1 text-gray-400 hover:text-gray-600"
            title={
              language === 'es'
                ? 'Volver al sitio principal'
                : 'Back to main site'
            }
          >
            <Home className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.firstName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {userProfile?.firstName} {userProfile?.lastName}
              </p>
              <p className="truncate text-xs text-gray-500">
                {userProfile?.email}
              </p>
              <span
                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                  userProfile?.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {userProfile?.role === 'admin'
                  ? language === 'es'
                    ? 'Administrador'
                    : 'Administrator'
                  : language === 'es'
                    ? 'Moderador'
                    : 'Moderator'}
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {navigationItems.map((item) => renderNavigationItem(item))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title={language === 'es' ? 'Notificaciones' : 'Notifications'}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {notificationCount}
                  </span>
                )}
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <User className="h-5 w-5" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={() => handleNavigation('/admin/profile')}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="mr-3 h-4 w-4" />
                      {language === 'es' ? 'Mi Perfil' : 'My Profile'}
                    </button>
                    <button
                      onClick={() => handleNavigation('/admin/settings')}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      {language === 'es' ? 'Configuración' : 'Settings'}
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      {language === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top bar for desktop */}
      <div className="ml-64 hidden h-16 border-b border-gray-200 bg-white lg:block">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {/* This would be dynamically set based on current page */}
              {language === 'es'
                ? 'Panel de Administración'
                : 'Admin Dashboard'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <button
              className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title={language === 'es' ? 'Notificaciones' : 'Notifications'}
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {notificationCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 rounded-lg p-2 text-gray-700 hover:bg-gray-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.firstName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-200 px-4 py-2">
                    <p className="text-sm font-medium text-gray-900">
                      {userProfile?.firstName} {userProfile?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userProfile?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleNavigation('/admin/profile')}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="mr-3 h-4 w-4" />
                    {language === 'es' ? 'Mi Perfil' : 'My Profile'}
                  </button>
                  <button
                    onClick={() => handleNavigation('/admin/settings')}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    {language === 'es' ? 'Configuración' : 'Settings'}
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    {language === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminNavigation;
