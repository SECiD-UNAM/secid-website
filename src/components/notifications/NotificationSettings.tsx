import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Clock,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Settings,
  Shield,
  Users,
  Briefcase,
  Calendar,
  MessageCircle,
  Trophy,
  CreditCard,
} from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { useAuth } from '../../contexts/AuthContext';
import {
  getNotificationSettings,
  updateNotificationSettings,
  requestPushPermission,
} from '../../lib/notifications';
import type {
  NotificationSettings,
  NotificationType,
  NotificationCategory,
  NotificationDeliveryMethod,
} from '../../types';

interface NotificationSettingsProps {
  className?: string;
  onClose?: () => void;
}

const categoryIcons: Record<
  NotificationCategory,
  React.ComponentType<{ className?: string }>
> = {
  jobs: Briefcase,
  events: Calendar,
  messages: MessageSquare,
  connections: Users,
  mentorship: Users,
  forum: MessageCircle,
  achievements: Trophy,
  system: Settings,
  security: Shield,
  billing: CreditCard,
};

const notificationTypes: Record<NotificationCategory, NotificationType[]> = {
  jobs: ['job_match', 'job_application', 'job_expiring'],
  events: ['event_reminder', 'event_update', 'event_cancelled'],
  messages: ['message_received', 'message_reply'],
  connections: ['connection_request', 'connection_accepted'],
  mentorship: [
    'mentorship_request',
    'mentorship_accepted',
    'mentorship_session',
  ],
  forum: ['forum_mention', 'forum_reply', 'forum_topic_update'],
  achievements: ['badge_earned', 'achievement_unlocked'],
  system: [
    'system_announcement',
    'maintenance',
    'newsletter',
    'data_export_ready',
  ],
  security: ['security_alert'],
  billing: ['payment_reminder', 'membership_expiring'],
};

export default function NotificationSettings({
  className = '',
  onClose,
}: NotificationSettingsProps) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<NotificationCategory>('jobs');
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>('default');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
    checkPushPermission();
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const userSettings = await getNotificationSettings(user.id);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setErrors({ load: t('notificationssettings.errorLoading') });
    } finally {
      setLoading(false);
    }
  };

  const checkPushPermission = () => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !settings) return;

    setSaving(true);
    setErrors({});
    setSuccessMessage('');

    try {
      await updateNotificationSettings(user.id, settings);
      setHasChanges(false);
      setSuccessMessage(t('notificationssettings.saved'));

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setErrors({ save: t('notificationssettings.errorSaving') });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (user?.id) {
      loadSettings();
      setHasChanges(false);
      setErrors({});
      setSuccessMessage('');
    }
  };

  const updatePreference = (
    type: NotificationType,
    field: 'enabled' | 'deliveryMethods' | 'frequency',
    value: any
  ) => {
    if (!settings) return;

    setSettings((prev) => ({
      ...prev!,
      preferences: {
        ...prev!.preferences,
        [type]: {
          ...prev!.preferences[type],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const updateGlobalSetting = (
    field: keyof NotificationSettings.globalSettings,
    value: any
  ) => {
    if (!settings) return;

    setSettings((prev) => ({
      ...prev!,
      globalSettings: {
        ...prev!.globalSettings,
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const updateEmailSetting = (
    field: keyof NotificationSettings['emailSettings'],
    value: any
  ) => {
    if (!settings) return;

    setSettings((prev) => ({
      ...prev!,
      emailSettings: {
        ...prev!.emailSettings,
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const toggleDeliveryMethod = (
    type: NotificationType,
    method: NotificationDeliveryMethod
  ) => {
    if (!settings) return;

    const currentMethods = settings.preferences[type].deliveryMethods;
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter((m) => m !== method)
      : [...currentMethods, method];

    updatePreference(type, 'deliveryMethods', newMethods);
  };

  const enablePushNotifications = async () => {
    try {
      const permission = await requestPushPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        // Update push settings to enable browser notifications
        setSettings((prev) => ({
          ...prev!,
          pushSettings: {
            ...prev!.pushSettings,
            browserEnabled: true,
          },
        }));
        setHasChanges(true);
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      setErrors({ push: t('notificationssettings.errorPush') });
    }
  };

  const categories = Object.keys(notificationTypes) as NotificationCategory[];

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p>{t('notificationssettings.errorLoading')}</p>
          <button
            onClick={loadSettings}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-4xl ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('notificationssettings.title')}
          </h1>
          <p className="mt-1 text-gray-600">
            {t('notifications.settings.description')}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
              disabled={saving}
            >
              <RotateCcw className="mr-2 inline h-4 w-4" />
              {t('common.reset')}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <div className="mr-2 inline h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Save className="mr-2 inline h-4 w-4" />
            )}
            {t('common.save')}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              {t('common.close')}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 flex items-center rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="mr-3 h-5 w-5 text-green-600" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          {Object.values(errors).map((error, index) => (
            <div key={index} className="flex items-center text-red-800">
              <AlertCircle className="mr-3 h-5 w-5" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-sm font-medium text-gray-900">
              {t('notificationssettings.categories')}
            </h3>

            <nav className="space-y-1">
              {categories.map((category) => {
                const IconComponent = categoryIcons[category];
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                      activeCategory === category
                        ? 'border border-blue-200 bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <IconComponent className="mr-3 h-4 w-4" />
                    {t(`notifications.category.${category}`)}
                  </button>
                );
              })}

              <div className="mt-4 border-t border-gray-200 pt-4">
                <button
                  onClick={() => setActiveCategory('system' as any)}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  {t('notificationssettings.global')}
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Global Settings */}
            {activeCategory === 'system' && (
              <div className="p-6">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">
                  {t('notificationssettings.global')}
                </h2>

                <div className="space-y-6">
                  {/* Do Not Disturb */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Moon className="h-5 w-5 text-gray-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          {t('notificationssettings.doNotDisturb')}
                        </label>
                        <p className="text-xs text-gray-500">
                          {t('notificationssettings.doNotDisturbDesc')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        updateGlobalSetting(
                          'doNotDisturb',
                          !settings?.globalSettings?.doNotDisturb
                        )
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings?.globalSettings?.doNotDisturb
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings?.globalSettings?.doNotDisturb
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sound Enabled */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {settings?.globalSettings?.soundEnabled ? (
                        <Volume2 className="h-5 w-5 text-gray-600" />
                      ) : (
                        <VolumeX className="h-5 w-5 text-gray-600" />
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          {t('notificationssettings.sound')}
                        </label>
                        <p className="text-xs text-gray-500">
                          {t('notificationssettings.soundDesc')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        updateGlobalSetting(
                          'soundEnabled',
                          !settings?.globalSettings?.soundEnabled
                        )
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings?.globalSettings?.soundEnabled
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings?.globalSettings?.soundEnabled
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Group Similar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-gray-600" />
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          {t('notificationssettings.groupSimilar')}
                        </label>
                        <p className="text-xs text-gray-500">
                          {t('notificationssettings.groupSimilarDesc')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        updateGlobalSetting(
                          'groupSimilar',
                          !settings?.globalSettings?.groupSimilar
                        )
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings?.globalSettings?.groupSimilar
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings?.globalSettings?.groupSimilar
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Max Daily Notifications */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-900">
                      {t('notificationssettings.maxDaily')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={settings?.globalSettings?.maxDailyNotifications}
                      onChange={(e) =>
                        updateGlobalSetting(
                          'maxDailyNotifications',
                          parseInt(e.target.value)
                        )
                      }
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('notificationssettings.maxDailyDesc')}
                    </p>
                  </div>

                  {/* Email Digest Settings */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-md mb-4 font-medium text-gray-900">
                      {t('notificationssettings.emailDigest')}
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">
                            {t('notificationssettings.digestEnabled')}
                          </label>
                          <p className="text-xs text-gray-500">
                            {t('notificationssettings.digestEnabledDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateEmailSetting(
                              'digestEnabled',
                              !settings?.emailSettings?.digestEnabled
                            )
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            settings?.emailSettings?.digestEnabled
                              ? 'bg-blue-600'
                              : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings?.emailSettings?.digestEnabled
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {settings?.emailSettings?.digestEnabled && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-900">
                              {t('notificationssettings.digestFrequency')}
                            </label>
                            <select
                              value={settings?.emailSettings?.digestFrequency}
                              onChange={(e) =>
                                updateEmailSetting(
                                  'digestFrequency',
                                  e.target.value
                                )
                              }
                              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="daily">
                                {t('notifications.frequency.daily')}
                              </option>
                              <option value="weekly">
                                {t('notifications.frequency.weekly')}
                              </option>
                              <option value="monthly">
                                {t('notifications.frequency.monthly')}
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-900">
                              {t('notificationssettings.digestTime')}
                            </label>
                            <input
                              type="time"
                              value={settings?.emailSettings?.digestTime}
                              onChange={(e) =>
                                updateEmailSetting('digestTime', e.target.value)
                              }
                              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Push Notification Settings */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-md mb-4 font-medium text-gray-900">
                      {t('notificationssettings.pushNotifications')}
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">
                            {t('notificationssettings.browserPush')}
                          </label>
                          <p className="text-xs text-gray-500">
                            {t('notificationssettings.browserPushDesc')}
                          </p>
                        </div>

                        {pushPermission === 'granted' ? (
                          <button
                            onClick={() => {
                              setSettings((prev) => ({
                                ...prev!,
                                pushSettings: {
                                  ...prev!.pushSettings,
                                  browserEnabled:
                                    !prev!.pushSettings.browserEnabled,
                                },
                              }));
                              setHasChanges(true);
                            }}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              settings?.pushSettings?.browserEnabled
                                ? 'bg-blue-600'
                                : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                settings?.pushSettings?.browserEnabled
                                  ? 'translate-x-5'
                                  : 'translate-x-0'
                              }`}
                            />
                          </button>
                        ) : (
                          <button
                            onClick={enablePushNotifications}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                          >
                            {t('notificationssettings.enablePush')}
                          </button>
                        )}
                      </div>

                      {pushPermission === 'denied' && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                          <p className="text-sm text-yellow-800">
                            {t('notificationssettings.pushDenied')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category-specific Settings */}
            {activeCategory !== 'system' && (
              <div className="p-6">
                <div className="mb-6 flex items-center">
                  {React.createElement(categoryIcons[activeCategory], {
                    className: 'w-6 h-6 text-gray-600 mr-3',
                  })}
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t(`notifications.category.${activeCategory}`)}
                  </h2>
                </div>

                <div className="space-y-6">
                  {notificationTypes[activeCategory].map((type) => (
                    <div
                      key={type}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {t(`notifications['type'].${type}`)}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {t(`notifications.typeDesc.${type}`)}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            updatePreference(
                              type,
                              'enabled',
                              !settings['preferences'][type].enabled
                            )
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            settings['preferences'][type].enabled
                              ? 'bg-blue-600'
                              : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings['preferences'][type].enabled
                                ? 'translate-x-5'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {settings['preferences'][type].enabled && (
                        <div className="space-y-4">
                          {/* Delivery Methods */}
                          <div>
                            <label className="mb-2 block text-xs font-medium text-gray-700">
                              {t('notificationssettings.deliveryMethods')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {(
                                [
                                  'app',
                                  'email',
                                  'push',
                                ] as NotificationDeliveryMethod[]
                              ).map((method) => (
                                <button
                                  key={method}
                                  onClick={() =>
                                    toggleDeliveryMethod(type, method)
                                  }
                                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                    settings.preferences[
                                      type
                                    ].deliveryMethods.includes(method)
                                      ? 'border border-blue-200 bg-blue-100 text-blue-800'
                                      : 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {method === 'app' && (
                                    <Bell className="mr-1 h-3 w-3" />
                                  )}
                                  {method === 'email' && (
                                    <Mail className="mr-1 h-3 w-3" />
                                  )}
                                  {method === 'push' && (
                                    <Smartphone className="mr-1 h-3 w-3" />
                                  )}
                                  {t(`notifications.delivery.${method}`)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Frequency */}
                          <div>
                            <label className="mb-2 block text-xs font-medium text-gray-700">
                              {t('notificationssettings.frequency')}
                            </label>
                            <select
                              value={settings['preferences'][type].frequency}
                              onChange={(e) =>
                                updatePreference(
                                  type,
                                  'frequency',
                                  e.target.value
                                )
                              }
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="immediate">
                                {t('notifications.frequency.immediate')}
                              </option>
                              <option value="hourly">
                                {t('notifications.frequency.hourly')}
                              </option>
                              <option value="daily">
                                {t('notifications.frequency.daily')}
                              </option>
                              <option value="weekly">
                                {t('notifications.frequency.weekly')}
                              </option>
                              <option value="never">
                                {t('notifications.frequency.never')}
                              </option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
