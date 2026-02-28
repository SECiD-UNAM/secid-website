import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import {
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface DashboardNavigationProps {
  lang?: 'es' | 'en';
}

export const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  lang = 'es',
}) => {
  const { user, userProfile, signOut } = useAuth();
  const t = useTranslations(lang);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = `/${lang}`;
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Left side - Logo and menu button */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white lg:hidden"
            >
              {showMobileMenu ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>

            {/* Logo */}
            <div className="ml-4 flex flex-shrink-0 items-center lg:ml-0">
              <a href={`/${lang}/dashboard`} className="flex items-center">
                <img
                  className="h-8 w-auto"
                  src="/images/logo.png"
                  alt="SECiD"
                />
                <span className="ml-2 font-heading text-xl font-bold text-gray-900 dark:text-white">
                  SECiD
                </span>
              </a>
            </div>

            {/* Dashboard title */}
            <div className="ml-6 hidden lg:block">
              <h1 className="font-heading text-lg font-semibold text-gray-900 dark:text-white">
                Member Dashboard
              </h1>
            </div>
          </div>

          {/* Right side - User menu and notifications */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                <BellIcon className="h-6 w-6" />
                {/* Notification badge */}
                <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-primary-500"></span>
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800">
                  <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      No new notifications
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {userProfile?.photoURL ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={userProfile.photoURL}
                    alt={userProfile.displayName}
                  />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                )}
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {userProfile?.displayName || user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {userProfile?.role || 'Member'}
                  </p>
                </div>
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800">
                  <a
                    href={`/${lang}/dashboard/profile`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <UserCircleIcon className="mr-2 h-5 w-5" />
                    Profile
                  </a>
                  <a
                    href={`/${lang}/dashboard/settings`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Cog6ToothIcon className="mr-2 h-5 w-5" />
                    Settings
                  </a>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <ArrowRightOnRectangleIcon className="mr-2 h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile menu content will be handled by DashboardSidebar */}
          </div>
        </div>
      )}
    </nav>
  );
};

export default DashboardNavigation;
