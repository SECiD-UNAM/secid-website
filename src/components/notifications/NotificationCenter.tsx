import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Settings,
  MoreHorizontal,
  X,
  Check,
  Archive,
  Trash2,
} from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationHistory,
} from '../../lib/notifications';
import { useAuth } from '../../contexts/AuthContext';
import NotificationItem from './NotificationItem';

import type {
  Notification,
  NotificationGroup,
  NotificationHistory,
} from '../../types';

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({
  className = '',
}: NotificationCenterProps) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<NotificationHistory | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'history' | 'settings'>(
    'recent'
  );
  const [selectedNotifications, setSelectedNotifications] = useState<
    Set<string>
  >(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'category'>(
    'date'
  );
  const [filterBy, setFilterBy] = useState<'all' | 'unread' | 'urgent'>('all');
  const [groupedView, setGroupedView] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSoundTime, setLastSoundTime] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load notifications when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      // Set up real-time listener
      const unsubscribe = setupRealtimeListener();
      return unsubscribe;
    }
  }, [user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef?.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document['removeEventListener']('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document['addEventListener']('keydown', handleKeyDown);
      return () => document['removeEventListener']('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await getNotifications(user.id, { limit: 20 });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (page = 1) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await getNotificationHistory(user.id, { page, limit: 50 });
      setHistory(result);
    } catch (error) {
      console.error('Error loading notification history:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = () => {
    if (!user?.id) return () => {};

    // Set up Firebase real-time listener for notifications
    // This would typically use Firebase onSnapshot
    // For now, we'll implement a polling mechanism
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  };

  const playNotificationSound = () => {
    if (!soundEnabled) return;

    const now = Date.now();
    // Throttle sound to prevent spam
    if (now - lastSoundTime < 2000) return;

    setLastSoundTime(now);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedNotifications).map((id) => deleteNotification(id))
      );

      setNotifications((prev) =>
        prev.filter((n) => !selectedNotifications.has(n.id))
      );
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filterBy === 'unread' && notification.isRead) return false;
    if (filterBy === 'urgent' && notification.priority !== 'urgent')
      return false;
    return true;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'category':
        return a.category.localeCompare(b.category);
      case 'date':
      default:
        return (
          new Date(b['createdAt']).getTime() -
          new Date(a['createdAt']).getTime()
        );
    }
  });

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedNotifications(new Set(sortedNotifications.map((n) => n.id)));
  };

  const clearSelection = () => {
    setSelectedNotifications(new Set());
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Sound */}
      <audio ref={audioRef} preload="auto" src="/sounds/notification.mp3" />

      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-gray-600 transition-colors hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={t('notifications.toggle')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-6 w-6" />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] animate-pulse items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Active Indicator */}
        {isOpen && (
          <span className="absolute inset-0 -z-10 rounded-lg bg-blue-100" />
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 z-50 mt-2 flex max-h-[70vh] w-96 max-w-[90vw] flex-col rounded-lg border border-gray-200 bg-white shadow-lg"
          role="dialog"
          aria-label={t('notifications.center')}
        >
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('notifications.title')}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'recent'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('notifications.recent')}
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  if (!history) loadHistory();
                }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('notifications.history')}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'recent' && (
              <div className="flex h-full flex-col">
                {/* Toolbar */}
                {sortedNotifications.length > 0 && (
                  <div className="border-b border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <select
                          value={filterBy}
                          onChange={(e) => setFilterBy(e.target.value as any)}
                          className="rounded border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="all">
                            {t('notifications.filter.all')}
                          </option>
                          <option value="unread">
                            {t('notifications.filter.unread')}
                          </option>
                          <option value="urgent">
                            {t('notifications.filter.urgent')}
                          </option>
                        </select>

                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="rounded border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="date">
                            {t('notifications.sort.date')}
                          </option>
                          <option value="priority">
                            {t('notifications.sort.priority')}
                          </option>
                          <option value="category">
                            {t('notifications.sort.category')}
                          </option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-1">
                        {selectedNotifications.size > 0 && (
                          <>
                            <button
                              onClick={handleDeleteSelected}
                              className="rounded p-1 text-red-600 hover:text-red-800"
                              title={t('notifications.deleteSelected')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={clearSelection}
                              className="rounded p-1 text-gray-600 hover:text-gray-800"
                              title={t('notifications.clearSelection')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="rounded p-1 text-blue-600 hover:text-blue-800"
                            title={t('notifications.markAllRead')}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        <div className="relative">
                          <button
                            className="rounded p-1 text-gray-600 hover:text-gray-800"
                            title={t('notifications.moreActions')}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedNotifications.size > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {t('notifications.selectedCount', {
                          count: selectedNotifications.size,
                        })}
                        {selectedNotifications.size <
                          sortedNotifications.length && (
                          <button
                            onClick={selectAllVisible}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            {t('notifications.selectAll')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto">
                  {loading && sortedNotifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                      {t('common.loading')}
                    </div>
                  ) : sortedNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <p className="text-sm">{t('notifications.empty')}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {sortedNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          isSelected={selectedNotifications.has(
                            notification.id
                          )}
                          onSelect={toggleNotificationSelection}
                          onClick={handleNotificationClick}
                          showSelection={selectedNotifications.size > 0}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {sortedNotifications.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 p-3">
                    <button
                      onClick={() => {
                        setActiveTab('history');
                        if (!history) loadHistory();
                      }}
                      className="w-full text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {t('notifications.viewAll')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="h-full overflow-y-auto p-4">
                <p className="mb-4 text-sm text-gray-600">
                  {t('notifications.historyDescription')}
                </p>

                {loading ? (
                  <div className="text-center text-gray-500">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    {t('common.loading')}
                  </div>
                ) : history?.notifications.length === 0 ? (
                  <div className="text-center text-gray-500">
                    <Archive className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="text-sm">{t('notifications.historyEmpty')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history?.notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        isSelected={false}
                        onSelect={() => {}}
                        onClick={handleNotificationClick}
                        showSelection={false}
                        compact
                      />
                    ))}

                    {history?.hasMore && (
                      <button
                        onClick={() => loadHistory((history.page || 1) + 1)}
                        className="w-full py-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        {t('notifications.loadMore')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="h-full overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {t('notificationssettings.sound')}
                    </label>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          soundEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() =>
                        (window.location.href = '/settings/notifications')
                      }
                      className="w-full rounded-lg px-4 py-2 text-left text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                    >
                      {t('notificationssettings.advanced')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
