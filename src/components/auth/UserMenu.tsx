import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useTranslations } from '@/hooks/useTranslations';
import clsx from 'clsx';

interface UserMenuProps {
  user: User;
  lang?: 'es' | 'en';
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, lang = 'es' }) => {
  const t = useTranslations(lang);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = `/${lang}`;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuItems = [
    { label: t.userMenu.profile, href: `/${lang}/profile`, icon: 'user' },
    {
      label: t.userMenu.dashboard,
      href: `/${lang}/dashboard`,
      icon: 'dashboard',
    },
    { label: t.userMenu.settings, href: `/${lang}/settings`, icon: 'settings' },
    { type: 'divider' as const },
    { label: t.userMenu.signOut, action: handleSignOut, icon: 'logout' },
  ];

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n?.[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getIcon = (icon: string) => {
    const icons: Record<string, JSX.Element> = {
      user: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      dashboard: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      settings: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      logout: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      ),
    };
    return icons[icon] || null;
  };

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
        {user.photoURL ? (
          <img
            className="h-8 w-8 rounded-full"
            src={user.photoURL}
            alt={user.displayName || 'User'}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
            {getInitials(user.displayName)}
          </div>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user.displayName || t.userMenu.user}
            </p>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
              {user['email']}
            </p>
          </div>

          <div className="py-1">
            {menuItems.map((item, index) => {
              if (item['type'] === 'divider') {
                return (
                  <div
                    key={index}
                    className="my-1 border-t border-gray-200 dark:border-gray-700"
                  />
                );
              }

              return (
                <Menu.Item key={index}>
                  {({ active }) =>
                    item.action ? (
                      <button
                        onClick={item.action}
                        className={clsx(
                          active ? 'bg-gray-100 dark:bg-gray-700' : '',
                          'flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {getIcon(item.icon!)}
                        <span className="ml-3">{item.label}</span>
                      </button>
                    ) : (
                      <a
                        href={item.href}
                        className={clsx(
                          active ? 'bg-gray-100 dark:bg-gray-700' : '',
                          'block flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {getIcon(item.icon!)}
                        <span className="ml-3">{item.label}</span>
                      </a>
                    )
                  }
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};
