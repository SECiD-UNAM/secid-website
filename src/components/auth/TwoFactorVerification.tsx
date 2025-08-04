import React, { useState, useEffect } from 'react';
import { useForm} from 'react-hook-form';
import { zodResolver} from '@hookform/resolvers/zod';
import { z} from 'zod';
import Button from '@/components/ui/Button';
import { useTranslations} from '@/hooks/useTranslations';
import { 
import toast from 'react-hot-toast';
import { Shield, Key, Clock, AlertTriangle} from 'lucide-react';

  verifyTwoFactorLogin, 
  useBackupCode,
  createTwoFactorSession,
  verifyTwoFactorSession
} from '@/lib/auth/two-factor';

const verificationSchema = z.object({
  code: z.string().min(6, 'Code must be 6 digits').max(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only numbers'),
});

const backupCodeSchema = z.object({
  backupCode: z.string().min(8, 'Backup code must be 8 digits').max(8, 'Backup code must be 8 digits').regex(/^\d+$/, 'Backup code must contain only numbers'),
});

type VerificationFormData = z.infer<typeof verificationSchema>;
type BackupCodeFormData = z.infer<typeof backupCodeSchema>;

interface TwoFactorVerificationProps {
  uid?: string;
  sessionId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  lang?: 'es' | 'en';
  mode?: 'login' | 'session'; // login for sign-in, session for step-up auth
}

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  uid,
  sessionId,
  onSuccess,
  onCancel,
  lang = 'es',
  mode = 'login',
}) => {
  const t = useTranslations(lang);
  const [loading, setLoading] = useState(false);
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes for session mode

  const {
    register: registerCode,
    handleSubmit: handleSubmitCode,
    formState: { errors: codeErrors },
    watch: watchCode,
    reset: resetCode,
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  });

  const {
    register: registerBackup,
    handleSubmit: handleSubmitBackup,
    formState: { errors: backupErrors },
    watch: watchBackup,
    reset: resetBackup,
  } = useForm<BackupCodeFormData>({
    resolver: zodResolver(backupCodeSchema),
  });

  const codeValue = watchCode('code', '');
  const backupCodeValue = watchBackup('backupCode', '');

  // Timer for session mode
  useEffect(() => {
    if (mode === 'session' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (mode === 'session' && timeLeft === 0) {
      toast['error'](lang === 'es' ? 'Sesión expirada' : 'Session expired');
      onCancel?.();
    }
  }, [timeLeft, mode, lang, onCancel]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVerifyCode = async (data: VerificationFormData) => {
    if (!uid && !sessionId) {
      toast['error'](lang === 'es' ? 'Información de sesión faltante' : 'Missing session information');
      return;
    }

    setLoading(true);
    try {
      let isValid = false;

      if (mode === 'session' && sessionId) {
        isValid = await verifyTwoFactorSession(sessionId, data['code']);
      } else if (mode === 'login' && uid) {
        isValid = await verifyTwoFactorLogin(uid, data['code']);
      } else {
        throw new Error('Invalid verification mode or missing parameters');
      }

      if(isValid) {
        toast.success(lang === 'es' 
          ? 'Verificación exitosa' 
          : 'Verification successful');
        onSuccess?.();
      } else {
        setAttemptsLeft(prev => prev - 1);
        if (attemptsLeft <= 1) {
          toast.error(lang === 'es' 
            ? 'Demasiados intentos fallidos' 
            : 'Too many failed attempts');
          onCancel?.();
        } else {
          toast.error(lang === 'es' 
            ? `Código incorrecto. ${attemptsLeft - 1} intentos restantes` 
            : `Incorrect code. ${attemptsLeft - 1} attempts remaining`);
        }
      }
    } catch (error: any) {
      toast.error(error['message'] || (lang === 'es' 
        ? 'Error de verificación' 
        : 'Verification error'));
      setAttemptsLeft(prev => prev - 1);
    } finally {
      setLoading(false);
      resetCode();
    }
  };

  const handleUseBackupCode = async (data: BackupCodeFormData) => {
    if (!uid) {
      toast['error'](lang === 'es' ? 'ID de usuario faltante' : 'Missing user ID');
      return;
    }

    setLoading(true);
    try {
      const isValid = await useBackupCode(uid, data['backupCode']);
      
      if(isValid) {
        toast.success(lang === 'es' 
          ? 'Código de respaldo válido' 
          : 'Valid backup code');
        onSuccess?.();
      } else {
        toast.error(lang === 'es' 
          ? 'Código de respaldo inválido o ya usado' 
          : 'Invalid or already used backup code');
      }
    } catch (error: any) {
      toast['error'](error['message'] || (lang === 'es' 
        ? 'Error con código de respaldo' 
        : 'Backup code error'));
    } finally {
      setLoading(false);
      resetBackup();
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
            <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {lang === 'es' 
              ? 'Verificación de Dos Factores' 
              : 'Two-Factor Verification'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {lang === 'es' 
              ? 'Ingresa el código de tu aplicación de autenticación' 
              : 'Enter the code from your authenticator app'}
          </p>
        </div>

        {/* Session timer (only for session mode) */}
        {mode === 'session' && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-800 dark:text-yellow-300">
                {lang === 'es' ? 'Tiempo restante: ' : 'Time remaining: '}
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </span>
            </div>
          </div>
        )}

        {/* Attempts warning */}
        {attemptsLeft <= 2 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-800 dark:text-red-300">
                {lang === 'es' 
                  ? `Cuidado: ${attemptsLeft} intentos restantes` 
                  : `Warning: ${attemptsLeft} attempts remaining`}
              </span>
            </div>
          </div>
        )}

        {!showBackupCode ? (
          /* TOTP Code Form */
          <form onSubmit={handleSubmitCode(handleVerifyCode)} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' 
                  ? 'Código de autenticación (6 dígitos)' 
                  : 'Authentication code (6 digits)'}
              </label>
              <input
                id="code"
                type="text"
                maxLength={6}
                placeholder="123456"
                autoComplete="one-time-code"
                {...registerCode('code')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-lg font-mono"
              />
              {codeErrors['code'] && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeErrors['code']['message']}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={loading}
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                loading={loading}
                disabled={codeValue.length !== 6}
              >
                {lang === 'es' ? 'Verificar' : 'Verify'}
              </Button>
            </div>

            {/* Backup code option */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowBackupCode(true)}
                className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 underline"
              >
                {lang === 'es' 
                  ? '¿Perdiste tu dispositivo? Usa un código de respaldo' 
                  : 'Lost your device? Use a backup code'}
              </button>
            </div>
          </form>
        ) : (
          /* Backup Code Form */
          <form onSubmit={handleSubmitBackup(handleUseBackupCode)} className="space-y-4">
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 mb-2">
                <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Usar Código de Respaldo' : 'Use Backup Code'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' 
                  ? 'Ingresa uno de tus códigos de respaldo de 8 dígitos' 
                  : 'Enter one of your 8-digit backup codes'}
              </p>
            </div>

            <div>
              <label htmlFor="backupCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' 
                  ? 'Código de respaldo (8 dígitos)' 
                  : 'Backup code (8 digits)'}
              </label>
              <input
                id="backupCode"
                type="text"
                maxLength={8}
                placeholder="12345678"
                {...registerBackup('backupCode')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-lg font-mono"
              />
              {backupErrors.backupCode && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{backupErrors.backupCode.message}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowBackupCode(false)}
                disabled={loading}
              >
                {lang === 'es' ? 'Volver' : 'Back'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                loading={loading}
                disabled={backupCodeValue.length !== 8}
              >
                {lang === 'es' ? 'Usar Código' : 'Use Code'}
              </Button>
            </div>
          </form>
        )}

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {lang === 'es' 
              ? 'No puedes acceder? Contacta al soporte técnico.' 
              : "Can't access? Contact technical support."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerification;