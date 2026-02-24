import React, { useState, useEffect } from 'react';
import { useAuth} from '@/contexts/AuthContext';
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
  Timestamp
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
  Lock
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
    defaultLanguage: 'es'
  },
  email: {
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@secid.mx',
    fromName: 'SECiD',
    emailEnabled: false,
    notificationEmails: ['admin@secid.mx']
  },
  moderation: {
    autoApproveJobs: false,
    autoApproveEvents: false,
    autoApproveForumPosts: true,
    requireManualReview: true,
    flaggedContentThreshold: 5,
    reportActionThreshold: 3,
    moderatorNotifications: true
  },
  payments: {
    premiumMembershipPrice: 500,
    corporateMembershipPrice: 5000,
    eventTicketBasePrice: 100,
    paymentEnabled: false,
    stripePublishableKey: '',
    stripeSecretKey: '',
    paypalClientId: ''
  },
  analytics: {
    googleAnalyticsId: '',
    amplitudeApiKey: '',
    hotjarSiteId: '',
    analyticsEnabled: true,
    dataRetentionDays: 365,
    cookieConsentRequired: true
  },
  security: {
    twoFactorRequired: false,
    passwordMinLength: 8,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    apiRateLimit: 100,
    allowedDomains: [],
    blockedIPs: []
  },
  notifications: {
    welcomeEmailEnabled: true,
    jobAlertEmailEnabled: true,
    eventRemindersEnabled: true,
    forumNotificationsEnabled: true,
    pushNotificationsEnabled: false,
    slackWebhookUrl: '',
    discordWebhookUrl: ''
  }
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
    { id: 'general', name: language === 'es' ? 'General' : 'General', icon: SettingsIcon },
    { id: 'email', name: language === 'es' ? 'Email' : 'Email', icon: Mail },
    { id: 'moderation', name: language === 'es' ? 'Moderación' : 'Moderation', icon: Shield },
    { id: 'payments', name: language === 'es' ? 'Pagos' : 'Payments', icon: DollarSign },
    { id: 'analytics', name: language === 'es' ? 'Analytics' : 'Analytics', icon: Monitor },
    { id: 'security', name: language === 'es' ? 'Seguridad' : 'Security', icon: Lock },
    { id: 'notifications', name: language === 'es' ? 'Notificaciones' : 'Notifications', icon: Bell },
    { id: 'backup', name: language === 'es' ? 'Respaldos' : 'Backups', icon: Database }
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
        await updateDoc(settingsRef, defaultSettings as unknown as Record<string, unknown>);
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(language === 'es' ? 'Error al cargar configuración' : 'Error loading settings');
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
          status: data['status']
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
        updatedBy: userProfile?.uid
      });

      // Log settings change
      await addDoc(collection(db, 'admin_activity_log'), {
        adminId: userProfile?.uid,
        adminEmail: userProfile?.email,
        action: 'settings_updated',
        details: { tab: activeTab },
        timestamp: Timestamp.now()
      });

      setSuccess(language === 'es' ? 'Configuración guardada exitosamente' : 'Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(language === 'es' ? 'Error al guardar configuración' : 'Error saving settings');
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
      
      setSuccess(language === 'es' ? 'Email de prueba enviado' : 'Test email sent');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error testing email:', err);
      setError(language === 'es' ? 'Error al enviar email de prueba' : 'Error sending test email');
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
        status: 'pending'
      });

      setSuccess(language === 'es' ? 'Respaldo iniciado' : 'Backup started');
    } catch (err) {
      console.error('Error creating backup:', err);
      setError(language === 'es' ? 'Error al crear respaldo' : 'Error creating backup');
    }
  };

  const updateSettingsField = (section: keyof PlatformSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <SettingsIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600">
            {language === 'es' 
              ? 'Se requieren privilegios de administrador para acceder a la configuración.'
              : 'Administrator privileges are required to access settings.'
            }
          </p>
        </div>
      </div>
    );
  }

  if(loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {language === 'es' ? 'Cargando configuración...' : 'Loading settings...'}
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
            {language === 'es' ? 'Configuración del Sistema' : 'System Settings'}
          </h1>
          <p className="mt-2 text-gray-600">
            {language === 'es' 
              ? 'Administrar la configuración global de la plataforma'
              : 'Manage global platform configuration'
            }
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving 
              ? (language === 'es' ? 'Guardando...' : 'Saving...')
              : (language === 'es' ? 'Guardar' : 'Save')
            }
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab['id']
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab['name']}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'es' ? 'Configuración General' : 'General Settings'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Nombre del Sitio' : 'Site Name'}
                </label>
                <input
                  type="text"
                  value={settings?.general?.siteName}
                  onChange={(e) => updateSettingsField('general', 'siteName', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Email de Soporte' : 'Support Email'}
                </label>
                <input
                  type="email"
                  value={settings?.general?.supportEmail}
                  onChange={(e) => updateSettingsField('general', 'supportEmail', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Descripción del Sitio' : 'Site Description'}
                </label>
                <textarea
                  value={settings?.general?.siteDescription}
                  onChange={(e) => updateSettingsField('general', 'siteDescription', e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Límite Máximo de Usuarios' : 'Max Users Limit'}
                </label>
                <input
                  type="number"
                  value={settings?.general?.maxUsersLimit}
                  onChange={(e) => updateSettingsField('general', 'maxUsersLimit', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Idioma por Defecto' : 'Default Language'}
                </label>
                <select
                  value={settings?.general?.defaultLanguage}
                  onChange={(e) => updateSettingsField('general', 'defaultLanguage', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">
                {language === 'es' ? 'Características de la Plataforma' : 'Platform Features'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.maintenanceMode}
                    onChange={(e) => updateSettingsField('general', 'maintenanceMode', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es' ? 'Modo de Mantenimiento' : 'Maintenance Mode'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.registrationEnabled}
                    onChange={(e) => updateSettingsField('general', 'registrationEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es' ? 'Registro Habilitado' : 'Registration Enabled'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.jobPostingEnabled}
                    onChange={(e) => updateSettingsField('general', 'jobPostingEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es' ? 'Publicación de Empleos' : 'Job Posting Enabled'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.eventCreationEnabled}
                    onChange={(e) => updateSettingsField('general', 'eventCreationEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {language === 'es' ? 'Creación de Eventos' : 'Event Creation Enabled'}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.general?.forumEnabled}
                    onChange={(e) => updateSettingsField('general', 'forumEnabled', e.target.checked)}
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
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === 'es' ? 'Configuración de Email' : 'Email Settings'}
              </h3>
              <button
                onClick={testEmailConfiguration}
                disabled={testEmailSending}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {testEmailSending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {language === 'es' ? 'Probar Email' : 'Test Email'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Servidor SMTP' : 'SMTP Host'}
                </label>
                <input
                  type="text"
                  value={settings['email'].smtpHost}
                  onChange={(e) => updateSettingsField('email', 'smtpHost', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Puerto SMTP' : 'SMTP Port'}
                </label>
                <input
                  type="number"
                  value={settings['email'].smtpPort}
                  onChange={(e) => updateSettingsField('email', 'smtpPort', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Usuario SMTP' : 'SMTP User'}
                </label>
                <input
                  type="text"
                  value={settings['email'].smtpUser}
                  onChange={(e) => updateSettingsField('email', 'smtpUser', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Contraseña SMTP' : 'SMTP Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={settings['email'].smtpPassword}
                    onChange={(e) => updateSettingsField('email', 'smtpPassword', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Email Remitente' : 'From Email'}
                </label>
                <input
                  type="email"
                  value={settings['email'].fromEmail}
                  onChange={(e) => updateSettingsField('email', 'fromEmail', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'es' ? 'Nombre Remitente' : 'From Name'}
                </label>
                <input
                  type="text"
                  value={settings['email'].fromName}
                  onChange={(e) => updateSettingsField('email', 'fromName', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings['email'].emailEnabled}
                  onChange={(e) => updateSettingsField('email', 'emailEnabled', e.target.checked)}
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
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === 'es' ? 'Gestión de Respaldos' : 'Backup Management'}
              </h3>
              <button
                onClick={createBackup}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Crear Respaldo' : 'Create Backup'}
              </button>
            </div>

            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup['id']} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      backup['status'] === 'completed' ? 'bg-green-50' :
                      backup['status'] === 'in_progress' ? 'bg-yellow-50' : 'bg-red-50'
                    }`}>
                      <Database className={`w-5 h-5 ${
                        backup['status'] === 'completed' ? 'text-green-600' :
                        backup['status'] === 'in_progress' ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{backup['name']}</h4>
                      <p className="text-sm text-gray-500">
                        {formatDate(backup['createdAt'])} • {backup.size} • {backup['type']}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
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