import React, { useState, useEffect } from 'react';
import { useForm} from 'react-hook-form';
import { zodResolver} from '@hookform/resolvers/zod';
import { z} from 'zod';
import Button from '@/components/ui/Button';
import { useTranslations} from '@/hooks/useTranslations';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider} from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  getCurrentUser,
  getLinkedOAuthProviders,
  linkProvider,
  unlinkProvider,
  updateLastLogin
} from '@/lib/auth';
import {
  getTwoFactorStatus,
  TWO_FACTOR_AVAILABLE,
  TWO_FACTOR_NOT_AVAILABLE_MESSAGE,
  TWO_FACTOR_NOT_AVAILABLE_MESSAGE_ES,
} from '@/lib/auth/two-factor';
import {
  Shield, 
  Key,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
  Link as LinkIcon,
  Unlink,
  History,
  MapPin
} from 'lucide-react';
import type { LinkedAccount, SupportedProvider } from '@/lib/auth/oauth-providers';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data['confirmPassword'], {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

interface SecuritySettingsProps {
  lang?: 'es' | 'en';
  onClose?: () => void;
}

interface LoginHistory {
  id: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  provider: string;
  success: boolean;
}

interface ActiveSession {
  id: string;
  deviceName: string;
  ipAddress: string;
  location?: string;
  lastActivity: Date;
  current: boolean;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ 
  lang = 'es',
  onClose 
}) => {
  const t = useTranslations(lang);
  const [activeTab, setActiveTab] = useState<'password' | 'twofactor' | 'sessions' | 'providers' | 'history'>('password');
  const [loading, setLoading] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState({ isEnabled: false, hasBackupCodes: false, unusedBackupCodes: 0 });
  const [linkedProviders, setLinkedProviders] = useState<LinkedAccount[]>([]);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const newPassword = watch('newPassword', '');

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user) return;

      // Load 2FA status
      const twoFactor = await getTwoFactorStatus(user.uid);
      setTwoFactorStatus(twoFactor);

      // Load linked providers
      const providers = await getLinkedOAuthProviders(user.uid);
      setLinkedProviders(providers);

      // Load mock active sessions and login history
      await loadActiveSessions(user.uid);
      await loadLoginHistory(user.uid);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async (uid: string) => {
    // Mock active sessions - in production, implement proper session tracking
    const mockSessions: ActiveSession[] = [
      {
        id: 'current',
        deviceName: 'Chrome on Windows',
        ipAddress: '192.168.1.100',
        location: 'Mexico City, Mexico',
        lastActivity: new Date(),
        current: true,
      },
      {
        id: 'session-2',
        deviceName: 'Safari on iPhone',
        ipAddress: '192.168.1.101',
        location: 'Mexico City, Mexico',
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        current: false,
      },
    ];
    setActiveSessions(mockSessions);
  };

  const loadLoginHistory = async (uid: string) => {
    // Mock login history - in production, load from Firestore
    const mockHistory: LoginHistory[] = [
      {
        id: '1',
        timestamp: new Date(),
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome 120.0.0.0',
        location: 'Mexico City, Mexico',
        provider: 'email',
        success: true,
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        ipAddress: '192.168.1.101',
        userAgent: 'Safari 17.0',
        location: 'Mexico City, Mexico',
        provider: 'google',
        success: true,
      },
    ];
    setLoginHistory(mockHistory);
  };

  const handlePasswordChange = async (data: PasswordChangeFormData) => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user?.email) {
        throw new Error('No authenticated user found');
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, data['currentPassword']);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, data['newPassword']);

      toast.success(lang === 'es' 
        ? 'Contraseña actualizada exitosamente' 
        : 'Password updated successfully');
      
      reset();
    } catch (error: any) {
      let errorMessage = lang === 'es' 
        ? 'Error al actualizar la contraseña' 
        : 'Error updating password';

      if (error['code'] === 'auth/wrong-password') {
        errorMessage = lang === 'es' 
          ? 'Contraseña actual incorrecta' 
          : 'Current password is incorrect';
      }

      toast['error'](errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkProvider = async (providerId: SupportedProvider) => {
    try {
      await linkProvider(providerId);
      await loadSecurityData(); // Reload data
      toast.success(lang === 'es' 
        ? `Cuenta de ${providerId} vinculada exitosamente` 
        : `${providerId} account linked successfully`);
    } catch (error: any) {
      toast['error'](error['message'] || (lang === 'es' 
        ? 'Error al vincular cuenta' 
        : 'Error linking account'));
    }
  };

  const handleUnlinkProvider = async (providerId: SupportedProvider) => {
    try {
      await unlinkProvider(providerId);
      await loadSecurityData(); // Reload data
      toast.success(lang === 'es' 
        ? `Cuenta de ${providerId} desvinculada` 
        : `${providerId} account unlinked`);
    } catch (error: any) {
      toast['error'](error['message'] || (lang === 'es' 
        ? 'Error al desvincular cuenta' 
        : 'Error unlinking account'));
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      // In production, implement session revocation
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success(lang === 'es' 
        ? 'Sesión revocada' 
        : 'Session revoked');
    } catch (error) {
      toast['error'](lang === 'es' 
        ? 'Error al revocar sesión' 
        : 'Error revoking session');
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch(providerId) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'github':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      case 'linkedin':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        );
      default:
        return <Key className="w-5 h-5" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return lang === 'es' ? 'Ahora' : 'Now';
    if (diffInMinutes < 60) return lang === 'es' ? `Hace ${diffInMinutes} min` : `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return lang === 'es' ? `Hace ${diffInHours}h` : `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return lang === 'es' ? `Hace ${diffInDays}d` : `${diffInDays}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Configuración de Seguridad' : 'Security Settings'}
              </h1>
            </div>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'password', label: lang === 'es' ? 'Contraseña' : 'Password', icon: Lock },
              { id: 'twofactor', label: lang === 'es' ? '2FA' : '2FA', icon: Smartphone },
              { id: 'providers', label: lang === 'es' ? 'Cuentas' : 'Accounts', icon: LinkIcon },
              { id: 'sessions', label: lang === 'es' ? 'Sesiones' : 'Sessions', icon: Clock },
              { id: 'history', label: lang === 'es' ? 'Historial' : 'History', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {lang === 'es' ? 'Cambiar Contraseña' : 'Change Password'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'Actualiza tu contraseña para mantener tu cuenta segura.' 
                    : 'Update your password to keep your account secure.'}
                </p>
              </div>

              <form onSubmit={handleSubmit(handlePasswordChange)} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === 'es' ? 'Contraseña actual' : 'Current password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      {...register('currentPassword')}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === 'es' ? 'Nueva contraseña' : 'New password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      {...register('newPassword')}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lang === 'es' ? 'Confirmar contraseña' : 'Confirm password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      {...register('confirmPassword')}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={!newPassword}
                >
                  {lang === 'es' ? 'Actualizar Contraseña' : 'Update Password'}
                </Button>
              </form>
            </div>
          )}

          {/* Two-Factor Tab */}
          {activeTab === 'twofactor' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {lang === 'es' ? 'Autenticaci\u00f3n de Dos Factores' : 'Two-Factor Authentication'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {lang === 'es'
                      ? 'Agrega una capa extra de seguridad a tu cuenta.'
                      : 'Add an extra layer of security to your account.'}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  {lang === 'es' ? 'Pr\u00f3ximamente' : 'Coming Soon'}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Smartphone className="h-8 w-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-300">
                      {lang === 'es' ? 'Funci\u00f3n en Desarrollo' : 'Feature In Development'}
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      {lang === 'es'
                        ? TWO_FACTOR_NOT_AVAILABLE_MESSAGE_ES
                        : TWO_FACTOR_NOT_AVAILABLE_MESSAGE}
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-2">
                      {lang === 'es'
                        ? 'Estamos trabajando en integrar autenticaci\u00f3n TOTP con aplicaciones como Google Authenticator y Authy. Te notificaremos cuando est\u00e9 disponible.'
                        : 'We are working on integrating TOTP authentication with apps like Google Authenticator and Authy. We will notify you when it becomes available.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 opacity-60">
                <div className="flex items-center space-x-3 mb-4">
                  <Smartphone className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  <div>
                    <h3 className="font-medium text-gray-500 dark:text-gray-400">
                      {lang === 'es' ? 'Aplicaci\u00f3n de Autenticaci\u00f3n' : 'Authenticator App'}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      {lang === 'es' ? 'No disponible a\u00fan' : 'Not yet available'}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  disabled
                >
                  {lang === 'es' ? 'Configurar' : 'Set up'}
                </Button>
              </div>
            </div>
          )}

          {/* Linked Providers Tab */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {lang === 'es' ? 'Cuentas Vinculadas' : 'Linked Accounts'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'Gestiona las cuentas externas vinculadas a tu perfil.' 
                    : 'Manage external accounts linked to your profile.'}
                </p>
              </div>

              <div className="space-y-4">
                {['google', 'github', 'linkedin'].map((providerId) => {
                  const isLinked = linkedProviders.some(p => p.providerId === providerId);
                  const linkedAccount = linkedProviders.find(p => p.providerId === providerId);

                  return (
                    <div key={providerId} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getProviderIcon(providerId)}
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                            {providerId}
                          </h3>
                          {isLinked && linkedAccount ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {linkedAccount['email']}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {lang === 'es' ? 'No vinculado' : 'Not linked'}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant={isLinked ? "outline" : "primary"}
                        size="sm"
                        onClick={() => isLinked 
                          ? handleUnlinkProvider(providerId as SupportedProvider)
                          : handleLinkProvider(providerId as SupportedProvider)
                        }
                        loading={loading}
                      >
                        {isLinked ? (
                          <>
                            <Unlink className="h-4 w-4 mr-2" />
                            {lang === 'es' ? 'Desvincular' : 'Unlink'}
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            {lang === 'es' ? 'Vincular' : 'Link'}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {lang === 'es' ? 'Sesiones Activas' : 'Active Sessions'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'Gestiona las sesiones activas en diferentes dispositivos.' 
                    : 'Manage active sessions on different devices.'}
                </p>
              </div>

              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {session.deviceName}
                          </h3>
                          {session.current && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded-full">
                              {lang === 'es' ? 'Actual' : 'Current'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {session.ipAddress}
                        </p>
                        {session.location && (
                          <div className="flex items-center space-x-1 mt-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {session.location}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {lang === 'es' ? 'Última actividad: ' : 'Last activity: '}
                          {formatTimeAgo(session.lastActivity)}
                        </p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {lang === 'es' ? 'Revocar' : 'Revoke'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Login History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {lang === 'es' ? 'Historial de Inicios de Sesión' : 'Login History'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'Revisa la actividad reciente de tu cuenta.' 
                    : 'Review recent activity on your account.'}
                </p>
              </div>

              <div className="space-y-3">
                {loginHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        entry.success 
                          ? 'bg-green-100 dark:bg-green-900'
                          : 'bg-red-100 dark:bg-red-900'
                      }`}>
                        {entry.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {entry.success 
                              ? (lang === 'es' ? 'Inicio exitoso' : 'Successful login')
                              : (lang === 'es' ? 'Intento fallido' : 'Failed attempt')
                            }
                          </h3>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                            {entry.provider}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.userAgent} • {entry.ipAddress}
                        </p>
                        {entry.location && (
                          <div className="flex items-center space-x-1 mt-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatTimeAgo(entry['timestamp'])}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry['timestamp'].toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;