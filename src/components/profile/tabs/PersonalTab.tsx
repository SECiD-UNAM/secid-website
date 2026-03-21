// @ts-nocheck
import React from 'react';
import {
  UserCircleIcon,
  CameraIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import type { FormData } from '../profile-edit-types';

interface PersonalTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingPhoto: boolean;
  lang: 'es' | 'en';
}

export const PersonalTab: React.FC<PersonalTabProps> = ({
  formData,
  setFormData,
  onPhotoUpload,
  uploadingPhoto,
  lang,
}) => {
  return (
    <div className="space-y-6">
      {/* Profile Photo */}
      <div>
        <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Foto de perfil' : 'Profile photo'}
        </label>
        <div className="flex items-center space-x-6">
          <div className="relative">
            {formData.photoURL ? (
              <img
                src={formData.photoURL}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <UserCircleIcon className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary-600 p-1 hover:bg-primary-700">
              <CameraIcon className="h-5 w-5 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={onPhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
            </label>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>
              {lang === 'es'
                ? 'JPG, GIF o PNG. Máximo 5MB.'
                : 'JPG, GIF or PNG. Max 5MB.'}
            </p>
            {uploadingPhoto && (
              <p className="text-primary-600 dark:text-primary-400">
                {lang === 'es' ? 'Subiendo...' : 'Uploading...'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Nombre' : 'First name'} *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                firstName: e.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Apellido' : 'Last name'} *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                lastName: e.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Nombre para mostrar' : 'Display name'} *
        </label>
        <input
          type="text"
          value={formData.displayName}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              displayName: e.target.value,
            }))
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <EnvelopeIcon className="mr-1 inline h-4 w-4" />
            {lang === 'es' ? 'Correo electrónico' : 'Email'} *
          </label>
          <input
            type="email"
            value={formData['email']}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <PhoneIcon className="mr-1 inline h-4 w-4" />
            {lang === 'es' ? 'Teléfono' : 'Phone'}
          </label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                phoneNumber: e.target.value,
              }))
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="+52 55 1234 5678"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          <MapPinIcon className="mr-1 inline h-4 w-4" />
          {lang === 'es' ? 'Ubicación' : 'Location'}
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, location: e.target.value }))
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder={
            lang === 'es' ? 'Ciudad de México, CDMX' : 'Mexico City, CDMX'
          }
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Biografía' : 'Bio'}
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, bio: e.target.value }))
          }
          rows={4}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder={
            lang === 'es'
              ? 'Cuéntanos sobre ti...'
              : 'Tell us about yourself...'
          }
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formData.bio.length}/500{' '}
          {lang === 'es' ? 'caracteres' : 'characters'}
        </p>
      </div>
    </div>
  );
};

export default PersonalTab;
