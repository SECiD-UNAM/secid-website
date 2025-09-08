import React, { useState, useEffect } from 'react';
import { useForm} from 'react-hook-form';
import { zodResolver} from '@hookform/resolvers/zod';
import { z} from 'zod';
import Button from '@/components/ui/Button';
import { useTranslations} from '@/hooks/useTranslations';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Shield, Copy, Download, Key } from 'lucide-react';
import {
  setupTwoFactor, 
  enableTwoFactor, 
  regenerateBackupCodes,
  type TwoFactorSetup as TwoFactorSetupType 
} from '@/lib/auth/two-factor';

const verificationSchema = z.object({
  code: z.string().min(6, 'Code must be 6 digits').max(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only numbers'),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

interface TwoFactorSetupProps {
  onSetupComplete?: () => void;
  onCancel?: () => void;
  lang?: 'es' | 'en';
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  onSetupComplete,
  onCancel,
  lang = 'es',
}) => {
  const t = useTranslations(lang);
  const [currentStep, setCurrentStep] = useState<'setup' | 'verify' | 'backup' | 'complete'>('setup');
  const [setupData, setSetupData] = useState<TwoFactorSetupType | null>(null);
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  });

  const codeValue = watch('code', '');

  useEffect(() => {
    initializeSetup();
  }, []);

  const initializeSetup = async () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user?.email) {
        throw new Error('No authenticated user found');
      }

      const setup = await setupTwoFactor(user['email']);
      setSetupData(setup);
      setCurrentStep('verify');
    } catch (error: any) {
      toast['error'](error['message'] || (lang === 'es' 
        ? 'Error al configurar la autenticación de dos factores' 
        : 'Error setting up two-factor authentication'));
      onCancel?.();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (data: VerificationFormData) => {
    if (!setupData) return;

    setLoading(true);
    try {
      await enableTwoFactor(data.code);
      
      // Generate backup codes
      const codes = await regenerateBackupCodes();
      setBackupCodes(codes);
      setCurrentStep('backup');
      
      toast.success(lang === 'es' 
        ? 'Autenticación de dos factores activada exitosamente' 
        : 'Two-factor authentication enabled successfully');
    } catch (error: any) {
      toast['error'](error['message'] || (lang === 'es' 
        ? 'Código de verificación inválido' 
        : 'Invalid verification code'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(lang === 'es' ? 'Copiado al portapapeles' : 'Copied to clipboard');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document['createElement']('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document['execCommand']('copy');
      document['body'].removeChild(textArea);
      toast.success(lang === 'es' ? 'Copiado al portapapeles' : 'Copied to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'secid-backup-codes.txt';
    document['body'].appendChild(a);
    a.click();
    document['body'].removeChild(a);
    window.URL.revokeObjectURL(url);
    setBackupCodesDownloaded(true);
  };

  const handleComplete = () => {
    setCurrentStep('complete');
    setTimeout(() => {
      onSetupComplete?.();
    }, 2000);
  };

  if (loading && currentStep === 'setup') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Configurando...' : 'Setting up...'}
        </p>
      </div>
    );
  }

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
              ? 'Configurar Autenticación de Dos Factores' 
              : 'Set Up Two-Factor Authentication'}
          </h2>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            {['verify', 'backup', 'complete'].map((step, index) => (
              <div
                key={step}
                className={`h-2 w-8 rounded-full ${
                  currentStep === step || 
                  (['backup', 'complete'].includes(currentStep) && step === 'verify') ||
                  (currentStep === 'complete' && step === 'backup')
                    ? 'bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Verify Step */}
        {currentStep === 'verify' && setupData && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {lang === 'es' 
                  ? 'Escanea el código QR con tu aplicación de autenticación:' 
                  : 'Scan the QR code with your authenticator app:'}
              </p>
              
              <div className="inline-block p-4 bg-white rounded-lg shadow-sm border">
                <img 
                  src={setupData.qrCodeUrl} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {lang === 'es' 
                  ? 'O ingresa manualmente este código:' 
                  : 'Or manually enter this code:'}
              </p>
              
              <div className="mt-2 flex items-center justify-center space-x-2">
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                  {setupData.secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(setupData.secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit(handleVerifyCode)} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' 
                    ? 'Código de verificación (6 dígitos)' 
                    : 'Verification code (6 digits)'}
                </label>
                <input
                  id="code"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  {...register('code')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-lg font-mono"
                />
                {errors['code'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors['code']['message']}</p>
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
            </form>
          </div>
        )}

        {/* Backup Codes Step */}
        {currentStep === 'backup' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 mb-4">
                <Key className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {lang === 'es' ? 'Códigos de Respaldo' : 'Backup Codes'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' 
                  ? 'Guarda estos códigos en un lugar seguro. Puedes usarlos para acceder a tu cuenta si pierdes tu dispositivo de autenticación.' 
                  : 'Save these codes in a safe place. You can use them to access your account if you lose your authentication device.'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
              >
                <Copy className="h-4 w-4 mr-2" />
                {lang === 'es' ? 'Copiar' : 'Copy'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={downloadBackupCodes}
              >
                <Download className="h-4 w-4 mr-2" />
                {lang === 'es' ? 'Descargar' : 'Download'}
              </Button>
            </div>

            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={handleComplete}
              disabled={!backupCodesDownloaded}
            >
              {lang === 'es' ? 'Continuar' : 'Continue'}
            </Button>

            {!backupCodesDownloaded && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                {lang === 'es' 
                  ? 'Por favor descarga los códigos antes de continuar' 
                  : 'Please download the codes before continuing'}
              </p>
            )}
          </div>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {lang === 'es' ? '¡Configuración Completa!' : 'Setup Complete!'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lang === 'es' 
                ? 'La autenticación de dos factores ha sido activada exitosamente en tu cuenta.' 
                : 'Two-factor authentication has been successfully enabled on your account.'}
            </p>
            <div className="animate-pulse text-primary-600 dark:text-primary-400">
              {lang === 'es' ? 'Redirigiendo...' : 'Redirecting...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;