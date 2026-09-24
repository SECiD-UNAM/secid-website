// @ts-nocheck
import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import {
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface SecurityTabProps {
  user: any;
  lang: 'es' | 'en';
  onSuccess: () => void;
  onError: (message: string) => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  user,
  lang,
  onSuccess,
  onError,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      onError(
        lang === 'es'
          ? 'Las contraseñas no coinciden'
          : 'Passwords do not match'
      );
      return;
    }

    if (passwordData.newPassword.length < 6) {
      onError(
        lang === 'es'
          ? 'La contraseña debe tener al menos 6 caracteres'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    setSaving(true);

    try {
      await updatePassword(user, passwordData.newPassword);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error updating password:', error);
      onError(
        error['message'] ||
          (lang === 'es'
            ? 'Error al actualizar la contraseña'
            : 'Error updating password')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Cambiar contraseña' : 'Change password'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {lang === 'es' ? 'Nueva contraseña' : 'New password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-500 dark:text-gray-400"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {lang === 'es' ? 'Confirmar contraseña' : 'Confirm password'}
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={
              !passwordData.newPassword ||
              !passwordData.confirmPassword ||
              saving
            }
            className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {lang === 'es' ? 'Actualizar contraseña' : 'Update password'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          <ShieldCheckIcon className="mr-1 inline h-4 w-4" />
          {lang === 'es'
            ? 'Mantén tu cuenta segura usando una contraseña fuerte y única'
            : 'Keep your account secure by using a strong, unique password'}
        </p>
      </div>
    </div>
  );
};

export default SecurityTab;
