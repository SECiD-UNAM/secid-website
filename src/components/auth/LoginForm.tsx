import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn, resetPassword, updateLastLogin } from '@/lib/auth';
import { getTwoFactorStatus } from '@/lib/auth/two-factor';
import { isDemoMode } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import SocialLoginButtons from './SocialLoginButtons';
import TwoFactorVerification from './TwoFactorVerification';
import { useTranslations } from '@/hooks/useTranslations';
import { Eye, EyeOff, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  lang?: 'es' | 'en';
  className?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  lang = 'es',
  className = '',
}) => {
  const t = useTranslations(lang);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrength | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const watchedPassword = watch('password', '');
  const watchedEmail = watch('email', '');

  // Calculate password strength
  useEffect(() => {
    if (watchedPassword && showPasswordStrength) {
      const strength = calculatePasswordStrength(watchedPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [watchedPassword, showPasswordStrength]);

  // Auto-fill email for forgot password
  useEffect(() => {
    if (watchedEmail && showForgotPassword) {
      setForgotPasswordEmail(watchedEmail);
    }
  }, [watchedEmail, showForgotPassword]);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    let label = '';
    let color = '';

    switch (score) {
      case 0:
      case 1:
        label = lang === 'es' ? 'Muy débil' : 'Very weak';
        color = 'text-red-600';
        break;
      case 2:
        label = lang === 'es' ? 'Débil' : 'Weak';
        color = 'text-orange-600';
        break;
      case 3:
        label = lang === 'es' ? 'Regular' : 'Fair';
        color = 'text-yellow-600';
        break;
      case 4:
        label = lang === 'es' ? 'Fuerte' : 'Strong';
        color = 'text-green-600';
        break;
      case 5:
        label = lang === 'es' ? 'Muy fuerte' : 'Very strong';
        color = 'text-green-700';
        break;
    }

    return { score, label, color, checks };
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await signIn(data['email'], data['password']);

      // Check if user has 2FA enabled
      const twoFactorStatus = await getTwoFactorStatus(user.uid);

      if (twoFactorStatus.isEnabled) {
        setCurrentUserId(user.uid);
        setRequiresTwoFactor(true);
        setIsLoading(false);
        return;
      }

      // Update last login
      await updateLastLogin(user.uid, 'email');

      // Handle remember me
      if (data['rememberMe']) {
        localStorage.setItem(
          'secid_remember_user',
          JSON.stringify({
            email: data.email,
            timestamp: Date.now(),
          })
        );
      } else {
        localStorage.removeItem('secid_remember_user');
      }

      toast.success(lang === 'es' ? '¡Bienvenido!' : 'Welcome!');
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = `/${lang}/dashboard`;
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err.code || err['message']);
      setError(errorMessage);
      toast['error'](errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, { es: string; en: string }> = {
      'auth/user-not-found': {
        es: 'No existe una cuenta con este correo electrónico',
        en: 'No account found with this email address',
      },
      'auth/wrong-password': {
        es: 'Contraseña incorrecta',
        en: 'Incorrect password',
      },
      'auth/invalid-email': {
        es: 'Correo electrónico inválido',
        en: 'Invalid email address',
      },
      'auth/user-disabled': {
        es: 'Esta cuenta ha sido deshabilitada',
        en: 'This account has been disabled',
      },
      'auth/too-many-requests': {
        es: 'Demasiados intentos fallidos. Inténtalo más tarde',
        en: 'Too many failed attempts. Try again later',
      },
      'auth/network-request-failed': {
        es: 'Error de conexión. Verifica tu internet',
        en: 'Connection error. Check your internet',
      },
      'auth/configuration-not-found': {
        es: 'El servicio de autenticación no está configurado. Contacta al administrador.',
        en: 'Authentication service is not configured. Contact the administrator.',
      },
      'auth/unauthorized-domain': {
        es: 'Este dominio no está autorizado para iniciar sesión. Contacta al administrador.',
        en: 'This domain is not authorized for sign-in. Contact the administrator.',
      },
    };

    const errorInfo = errorMessages[errorCode];
    if (errorInfo) {
      return errorInfo[lang];
    }

    return lang === 'es'
      ? 'Error al iniciar sesión. Inténtalo de nuevo'
      : 'Sign in error. Please try again';
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast['error'](
        lang === 'es'
          ? 'Por favor ingresa tu correo electrónico'
          : 'Please enter your email address'
      );
      return;
    }

    try {
      await resetPassword(forgotPasswordEmail);
      setForgotPasswordSent(true);
      toast.success(
        lang === 'es' ? 'Correo de recuperación enviado' : 'Recovery email sent'
      );
    } catch (error) {
      toast['error'](
        lang === 'es'
          ? 'Error al enviar correo de recuperación'
          : 'Error sending recovery email'
      );
    }
  };

  const handleSocialLoginSuccess = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      window.location.href = `/${lang}/dashboard`;
    }
  };

  const handleTwoFactorSuccess = () => {
    if (currentUserId) {
      updateLastLogin(currentUserId, 'email-2fa');
    }
    toast.success(
      lang === 'es' ? '¡Autenticación exitosa!' : 'Authentication successful!'
    );
    if (onSuccess) {
      onSuccess();
    } else {
      window.location.href = `/${lang}/dashboard`;
    }
  };

  // Load remembered user
  useEffect(() => {
    const remembered = localStorage.getItem('secid_remember_user');
    if (remembered) {
      try {
        const { email, timestamp } = JSON.parse(remembered);
        // Remember for 30 days
        if (Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000) {
          setValue('email', email);
          setValue('rememberMe', true);
        } else {
          localStorage.removeItem('secid_remember_user');
        }
      } catch (error) {
        localStorage.removeItem('secid_remember_user');
      }
    }
  }, [setValue]);

  if (requiresTwoFactor && currentUserId) {
    return (
      <div className={className}>
        <TwoFactorVerification
          uid={currentUserId}
          mode="login"
          lang={lang}
          onSuccess={handleTwoFactorSuccess}
          onCancel={() => {
            setRequiresTwoFactor(false);
            setCurrentUserId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md space-y-8 ${className}`}>
      <div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Accede a tu cuenta de SECiD'
            : 'Access your SECiD account'}
        </p>
      </div>

      {/* Demo mode warning */}
      {isDemoMode() && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <div className="flex">
            <AlertCircle className="mr-3 mt-0.5 h-5 w-5 text-yellow-500" />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              {lang === 'es'
                ? 'La autenticación no está configurada. Contacta al administrador.'
                : 'Authentication is not configured. Contact the administrator.'}
            </p>
          </div>
        </div>
      )}

      {/* Social Login Buttons */}
      <SocialLoginButtons
        lang={lang}
        mode="signin"
        onSuccess={handleSocialLoginSuccess}
        onError={(error) => setError(error)}
        disabled={isLoading}
      />

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              {lang === 'es' ? 'Recuperar contraseña' : 'Recover password'}
            </h3>

            {!forgotPasswordSent ? (
              <>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es'
                    ? 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.'
                    : 'Enter your email address and we will send you a link to reset your password.'}
                </p>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder={
                    lang === 'es' ? 'Correo electrónico' : 'Email address'
                  }
                  className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1"
                    onClick={handleForgotPassword}
                  >
                    {lang === 'es' ? 'Enviar' : 'Send'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {lang === 'es'
                      ? 'Hemos enviado un correo con instrucciones para restablecer tu contraseña.'
                      : 'We have sent an email with instructions to reset your password.'}
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordSent(false);
                    }}
                  >
                    {lang === 'es' ? 'Entendido' : 'Got it'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex">
              <AlertCircle className="mr-3 mt-0.5 h-5 w-5 text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {lang === 'es' ? 'Correo electrónico' : 'Email address'}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
            {errors['email'] && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors['email'].message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {lang === 'es' ? 'Contraseña' : 'Password'}
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                onFocus={() => setShowPasswordStrength(true)}
                onBlur={() =>
                  setTimeout(() => setShowPasswordStrength(false), 200)
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:text-sm"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? (lang === 'es' ? 'Ocultar contraseña' : 'Hide password') : (lang === 'es' ? 'Mostrar contraseña' : 'Show password')}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.password.message}
              </p>
            )}

            {/* Password Strength Indicator */}
            {passwordStrength && showPasswordStrength && (
              <div className="mt-2 rounded-md bg-gray-50 p-3 dark:bg-gray-700">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {lang === 'es'
                      ? 'Fortaleza de contraseña:'
                      : 'Password strength:'}
                  </span>
                  <span
                    className={`text-xs font-medium ${passwordStrength.color}`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="mb-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.score <= 1
                        ? 'bg-red-500'
                        : passwordStrength.score <= 2
                          ? 'bg-orange-500'
                          : passwordStrength.score <= 3
                            ? 'bg-yellow-500'
                            : passwordStrength.score <= 4
                              ? 'bg-green-500'
                              : 'bg-green-600'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries({
                    length: lang === 'es' ? '8+ caracteres' : '8+ characters',
                    uppercase: lang === 'es' ? 'Mayúscula' : 'Uppercase',
                    lowercase: lang === 'es' ? 'Minúscula' : 'Lowercase',
                    number: lang === 'es' ? 'Número' : 'Number',
                    special: lang === 'es' ? 'Especial' : 'Special',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-1">
                      {passwordStrength.checks[
                        key as keyof typeof passwordStrength.checks
                      ] ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-gray-400" />
                      )}
                      <span
                        className={`${
                          passwordStrength.checks[
                            key as keyof typeof passwordStrength.checks
                          ]
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              {...register('rememberMe')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
            >
              {lang === 'es' ? 'Recordarme' : 'Remember me'}
            </label>
          </div>

          <div className="text-sm">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              {lang === 'es'
                ? '¿Olvidaste tu contraseña?'
                : 'Forgot your password?'}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={isLoading}
        >
          {lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;
