import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { useTranslations } from '@/hooks/useTranslations';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Bell,
  Mail,
  Shield,
  Database,
  Monitor,
  DollarSign,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Plus,
  Lock,
} from 'lucide-react';

interface PlatformSettings {
  general: {
    siteName: string;
    siteDescription: string;
    supportEmail: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    jobPostingEnabled: boolean;
    eventCreationEnabled: boolean;
    forumEnabled: boolean;
    maxUsersLimit: number;
    defaultLanguage: 'es' | 'en';
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
    emailEnabled: boolean;
    notificationEmails: string[];
  };
  moderation: {
    autoApproveJobs: boolean;
    autoApproveEvents: boolean;
    autoApproveForumPosts: boolean;
    requireManualReview: boolean;
    flaggedContentThreshold: number;
    reportActionThreshold: number;
    moderatorNotifications: boolean;
  };
  payments: {
    premiumMembershipPrice: number;
    corporateMembershipPrice: number;
    eventTicketBasePrice: number;
    paymentEnabled: boolean;
    stripePublishableKey: string;
    stripeSecretKey: string;
    paypalClientId: string;
  };
  analytics: {
    googleAnalyticsId: string;
    amplitudeApiKey: string;
    hotjarSiteId: string;
    analyticsEnabled: boolean;
    dataRetentionDays: number;
    cookieConsentRequired: boolean;
  };
  security: {
    twoFactorRequired: boolean;
    passwordMinLength: number;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    apiRateLimit: number;
    allowedDomains: string[];
    blockedIPs: string[];
  };
  notifications: {
    welcomeEmailEnabled: boolean;
    jobAlertEmailEnabled: boolean;
    eventRemindersEnabled: boolean;
    forumNotificationsEnabled: boolean;
    pushNotificationsEnabled: boolean;
    slackWebhookUrl: string;
    discordWebhookUrl: string;
  };
}

interface BackupInfo {
  id: string;
  name: string;
  size: string;
  createdAt: Date;
  type: 'manual' | 'automatic';
  status: 'completed' | 'in_progress' | 'failed';
}

const defaultSettings: PlatformSettings = {
  general: {
    siteName: 'SECiD',
    siteDescription: 'UNAM Data Science Alumni Society',
    supportEmail: 'admin@secid.mx',
    maintenanceMode: false,
    registrationEnabled: true,
    jobPostingEnabled: true,
    eventCreationEnabled: true,
    forumEnabled: true,
    maxUsersLimit: 10000,
    defaultLanguage: 'es',
  },
  email: {
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@secid.mx',
    fromName: 'SECiD',
    emailEnabled: false,
    notificationEmails: ['admin@secid.mx'],
  },
  moderation: {
    autoApproveJobs: false,
    autoApproveEvents: false,
    autoApproveForumPosts: true,
    requireManualReview: true,
    flaggedContentThreshold: 5,
    reportActionThreshold: 3,
    moderatorNotifications: true,
  },
  payments: {
    premiumMembershipPrice: 500,
    corporateMembershipPrice: 5000,
    eventTicketBasePrice: 100,
    paymentEnabled: false,
    stripePublishableKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
  },
  analytics: {
    googleAnalyticsId: '',
    amplitudeApiKey: '',
    hotjarSiteId: '',
    analyticsEnabled: true,
    dataRetentionDays: 365,
    cookieConsentRequired: true,
  },
  security: {
    twoFactorRequired: false,
    passwordMinLength: 8,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    apiRateLimit: 100,
    allowedDomains: [],
    blockedIPs: [],
  },
  notifications: {
    welcomeEmailEnabled: true,
    jobAlertEmailEnabled: true,
    eventRemindersEnabled: true,
    forumNotificationsEnabled: true,
    pushNotificationsEnabled: false,
    slackWebhookUrl: '',
    discordWebhookUrl: '',
  },
};

export const Settings: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const { language } = useTranslations();
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [showPasswords, setShowPasswords] = useState(false);
  const [testEmailSending, setTestEmailSending] = useState(false);

  const tabs = [
    {
      id: 'general',
      name: language === 'es' ? 'General' : 'General',
      icon: SettingsIcon,
    },
    { id: 'email', name: language === 'es' ? 'Email' : 'Email', icon: Mail },
    {
      id: 'moderation',
      name: language === 'es' ? 'Moderación' : 'Moderation',
      icon: Shield,
    },
    {
      id: 'payments',
      name: language === 'es' ? 'Pagos' : 'Payments',
      icon: DollarSign,
    },
    {
      id: 'analytics',
      name: language === 'es' ? 'Analytics' : 'Analytics',
      icon: Monitor,
    },
    {
      id: 'security',
      name: language === 'es' ? 'Seguridad' : 'Security',
      icon: Lock,
    },
    {
      id: 'notifications',
      name: language === 'es' ? 'Notificaciones' : 'Notifications',
      icon: Bell,
    },
    {
      id: 'backup',
      name: language === 'es' ? 'Respaldos' : 'Backups',
      icon: Database,
    },
  ];

  useEffect(() => {
    if (!isAdmin) {
      setError('Unauthorized access. Admin privileges required.');
      setLoading(false);
      return;
    }

    loadSettings();
    loadBackups();
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'admin_settings', 'platform_config');
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as PlatformSettings;
        setSettings({ ...defaultSettings, ...data });
      } else {
        // Create default settings document
        await updateDoc(
          settingsRef,
          defaultSettings as unknown as Record<string, unknown>
        );
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(
        language === 'es'
          ? 'Error al cargar configuración'
          : 'Error loading settings'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = () => {
    const backupsQuery = query(
      collection(db, 'system_backups'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(backupsQuery, (snapshot) => {
      const backupsList: BackupInfo[] = [];
      snapshot['forEach']((doc) => {
        const data = doc['data']();
        backupsList.push({
          id: doc['id'],
          name: data['name'],
          size: data['size'],
          createdAt: data['createdAt'].toDate(),
          type: data['type'],
          status: data['status'],
        });
      });
      setBackups(backupsList);
    });

    return unsubscribe;
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const settingsRef = doc(db, 'admin_settings', 'platform_config');
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: Timestamp.now(),
        updatedBy: userProfile?.uid,
      });

      // Log settings change
      await addDoc(collection(db, 'admin_activity_log'), {
        adminId: userProfile?.uid,
        adminEmail: userProfile?.email,
        action: 'settings_updated',
        details: { tab: activeTab },
        timestamp: Timestamp.now(),
      });

      setSuccess(
        language === 'es'
          ? 'Configuración guardada exitosamente'
          : 'Settings saved successfully'
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(
        language === 'es'
          ? 'Error al guardar configuración'
          : 'Error saving settings'
      );
    } finally {
      setSaving(false);
    }
  };

  const testEmailConfiguration = async () => {
    try {
      setTestEmailSending(true);

      // This would call a cloud function to test email
      // TODO: Uncomment when cloud function is ready
      // const testEmailData = {
      //   to: userProfile?.email,
      //   subject: 'Test Email Configuration',
      //   body: 'This is a test email to verify your SMTP configuration is working correctly.',
      //   settings: settings['email']
      // };
      // await functions().httpsCallable('testEmailConfiguration')(testEmailData);

      setSuccess(
        language === 'es' ? 'Email de prueba enviado' : 'Test email sent'
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error testing email:', err);
      setError(
        language === 'es'
          ? 'Error al enviar email de prueba'
          : 'Error sending test email'
      );
    } finally {
      setTestEmailSending(false);
    }
  };

  const createBackup = async () => {
    try {
      await addDoc(collection(db, 'backup_requests'), {
        requestedBy: userProfile?.uid,
        requestedAt: Timestamp.now(),
        type: 'manual',
        status: 'pending',
      });

      setSuccess(language === 'es' ? 'Respaldo iniciado' : 'Backup started');
    } catch (err) {
      console.error('Error creating backup:', err);
      setError(
        language === 'es' ? 'Error al crear respaldo' : 'Error creating backup'
      );
    }
  };

  const updateSettingsField = (
    section: keyof PlatformSettings,
    field: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <SettingsIcon className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600">
            {language === 'es'
              ? 'Se requieren privilegios de administrador para acceder a la configuración.'
              : 'Administrator privileges are required to access settings.'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">
            {language === 'es'
              ? 'Cargando configuración...'
              : 'Loading settings...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'es'
              ? 'Configuración del Sistema'
              : 'System Settings'}
          </h1>
          <p className="mt-2 text-gray-600">
            {language === 'es'
              ? 'Administrar la configuración global de la plataforma'
              : 'Manage global platform configuration'}
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving
              ? language === 'es'
                ? 'Guardando...'
                : 'Saving...'
              : language === 'es'
                ? 'Guardar'
                : 'Save'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab['id']}
                onClick={() => setActiveTab(tab['id'])}
                className={`flex items-center whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === tab['id']
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {tab['name']}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6 p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'es' ? 'Configuración General' : 'General Settings'}
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es' ? 'Nombre del Sitio' : 'Site Name'}
                </label>
                <input
                  type="text"
                  value={settings?.general?.siteName}
                  onChange={(e) =>
                    updateSettingsField('general', 'siteName', e.target.value)
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es' ? 'Email de Soporte' : 'Support Email'}
                </label>
                <input
                  type="email"
                  value={settings?.general?.supportEmail}
                  onChange={(e) =>
                    updateSettingsField(
                      'general',
                      'supportEmail',
                      e.target.value
                    )
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es'
                    ? 'Descripción del Sitio'
                    : 'Site Description'}
                </label>
                <textarea
                  value={settings?.general?.siteDescription}
                  onChange={(e) =>
                    updateSettingsField(
                      'general',
                      'siteDescription',
                      e.target.value
                    )
                  }
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es'
                    ? 'Límite Máximo de Usuarios'
                    : 'Max Users Limit'}
                </label>
                <input
                  type="number"
                  value={settings?.general?.maxUsersLimit}
                  onChange={(e) =>
                    updateSettingsField(
                      'general',
                      'maxUsersLimit',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es'
                    ? 'Idioma por Defecto'
                    : 'Default Language'}
                </label>
                <select
                  value={settings?.general?.defaultLanguage}
                  onChange={(e) =>
                    updateSettingsField(
                      'general',
                      'defaultLanguage',
                      e.target.value
                    )
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">
                {language === 'es'
                  ? 'Características de la Plataforma'
                  : 'Platform Features'}
              </h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.maintenanceMode}
                    onChange={(e) =>
                      updateSettingsField(
                        'general',
                        'maintenanceMode',
                        e.target.checked
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es'
                      ? 'Modo de Mantenimiento'
                      : 'Maintenance Mode'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.registrationEnabled}
                    onChange={(e) =>
                      updateSettingsField(
                        'general',
                        'registrationEnabled',
                        e.target.checked
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es'
                      ? 'Registro Habilitado'
                      : 'Registration Enabled'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.jobPostingEnabled}
                    onChange={(e) =>
                      updateSettingsField(
                        'general',
                        'jobPostingEnabled',
                        e.target.checked
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es'
                      ? 'Publicación de Empleos'
                      : 'Job Posting Enabled'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.eventCreationEnabled}
                    onChange={(e) =>
                      updateSettingsField(
                        'general',
                        'eventCreationEnabled',
                        e.target.checked
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es'
                      ? 'Creación de Eventos'
                      : 'Event Creation Enabled'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.forumEnabled}
                    onChange={(e) =>
                      updateSettingsField(
                        'general',
                        'forumEnabled',
                        e.target.checked
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es' ? 'Foro Habilitado' : 'Forum Enabled'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Email Settings */}
        {activeTab === 'email' && (
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === 'es'
                  ? 'Configuración de Email'
                  : 'Email Settings'}
              </h3>
              <button
                onClick={testEmailConfiguration}
                disabled={testEmailSending}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {testEmailSending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {language === 'es' ? 'Probar Email' : 'Test Email'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es' ? 'Servidor SMTP' : 'SMTP Host'}
                </label>
                <input
                  type="text"
                  value={settings['email'].smtpHost}
                  onChange={(e) =>
                    updateSettingsField('email', 'smtpHost', e.target.value)
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es' ? 'Puerto SMTP' : 'SMTP Port'}
                </label>
                <input
                  type="number"
                  value={settings['email'].smtpPort}
                  onChange={(e) =>
                    updateSettingsField(
                      'email',
                      'smtpPort',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es' ? 'Usuario SMTP' : 'SMTP User'}
                </label>
                <input
                  type="text"
                  value={settings['email'].smtpUser}
                  onChange={(e) =>
                    updateSettingsField('email', 'smtpUser', e.target.value)
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es' ? 'Contraseña SMTP' : 'SMTP Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={settings['email'].smtpPassword}
                    onChange={(e) =>
                      updateSettingsField(
                        'email',
                        'smtpPassword',
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border-gray-300 pr-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPasswords ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es' ? 'Email Remitente' : 'From Email'}
                </label>
                <input
                  type="email"
                  value={settings['email'].fromEmail}
                  onChange={(e) =>
                    updateSettingsField('email', 'fromEmail', e.target.value)
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {language === 'es' ? 'Nombre Remitente' : 'From Name'}
                </label>
                <input
                  type="text"
                  value={settings['email'].fromName}
                  onChange={(e) =>
                    updateSettingsField('email', 'fromName', e.target.value)
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings['email'].emailEnabled}
                  onChange={(e) =>
                    updateSettingsField(
                      'email',
                      'emailEnabled',
                      e.target.checked
                    )
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {language === 'es' ? 'Email Habilitado' : 'Email Enabled'}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === 'es'
                  ? 'Gestión de Respaldos'
                  : 'Backup Management'}
              </h3>
              <button
                onClick={createBackup}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                {language === 'es' ? 'Crear Respaldo' : 'Create Backup'}
              </button>
            </div>

            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup['id']}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`rounded-lg p-2 ${
                        backup['status'] === 'completed'
                          ? 'bg-green-50'
                          : backup['status'] === 'in_progress'
                            ? 'bg-yellow-50'
                            : 'bg-red-50'
                      }`}
                    >
                      <Database
                        className={`h-5 w-5 ${
                          backup['status'] === 'completed'
                            ? 'text-green-600'
                            : backup['status'] === 'in_progress'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {backup['name']}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatDate(backup['createdAt'])} • {backup.size} •{' '}
                        {backup['type']}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs would follow similar patterns... */}
      </div>
    </div>
  );
};

export default Settings;
