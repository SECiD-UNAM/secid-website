// @ts-nocheck
import React from 'react';
import type { FormData } from '../profile-edit-types';

interface PrivacyTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  lang: 'es' | 'en';
}

export const PrivacyTab: React.FC<PrivacyTabProps> = ({
  formData,
  setFormData,
  lang,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Configuración de privacidad' : 'Privacy settings'}
        </h3>

        <div className="space-y-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.profileVisible}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  profileVisible: e.target.checked,
                }))
              }
              className="mr-3 mt-1"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Perfil público' : 'Public profile'}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Tu perfil será visible para otros miembros'
                  : 'Your profile will be visible to other members'}
              </p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.contactVisible}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  contactVisible: e.target.checked,
                }))
              }
              className="mr-3 mt-1"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {lang === 'es'
                  ? 'Mostrar información de contacto'
                  : 'Show contact information'}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Permite que otros miembros vean tu email y teléfono'
                  : 'Allow other members to see your email and phone'}
              </p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.jobSearching}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  jobSearching: e.target.checked,
                }))
              }
              className="mr-3 mt-1"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Buscando empleo' : 'Job seeking'}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Indica que estás abierto a nuevas oportunidades'
                  : "Indicate that you're open to new opportunities"}
              </p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.mentorshipAvailable}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  mentorshipAvailable: e.target.checked,
                }))
              }
              className="mr-3 mt-1"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {lang === 'es'
                  ? 'Disponible como mentor'
                  : 'Available as mentor'}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Otros miembros pueden contactarte para mentoría'
                  : 'Other members can contact you for mentorship'}
              </p>
            </div>
          </label>
          <div className="flex items-start">
            <div className="w-full">
              <label
                htmlFor="cvVisibility"
                className="font-medium text-gray-900 dark:text-white"
              >
                {lang === 'es' ? 'Visibilidad del CV' : 'CV Visibility'}
              </label>
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Controla quién puede ver tu página de CV generada automáticamente'
                  : 'Control who can view your auto-generated CV page'}
              </p>
              <select
                id="cvVisibility"
                value={formData.cvVisibility}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cvVisibility: e.target.value as
                      | 'public'
                      | 'members'
                      | 'private',
                  }))
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="public">
                  {lang === 'es' ? 'Público' : 'Public'}
                </option>
                <option value="members">
                  {lang === 'es' ? 'Solo Miembros' : 'Members Only'}
                </option>
                <option value="private">
                  {lang === 'es' ? 'Privado' : 'Private'}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Notificaciones' : 'Notifications'}
        </h3>

        <div className="space-y-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.emailNotifications}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  emailNotifications: e.target.checked,
                }))
              }
              className="mr-3 mt-1"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {lang === 'es'
                  ? 'Notificaciones por email'
                  : 'Email notifications'}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Recibe actualizaciones importantes por correo'
                  : 'Receive important updates via email'}
              </p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.jobMatchNotifications}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  jobMatchNotifications: e.target.checked,
                }))
              }
              className="mr-3 mt-1"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Alertas de empleos' : 'Job alerts'}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Notificaciones sobre empleos que coincidan con tu perfil'
                  : 'Notifications about jobs matching your profile'}
              </p>
            </div>
          </label>

          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.eventNotifications}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  eventNotifications: e.target.checked,
                }))
              }
              className="mr-3 mt-1"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Recordatorios de eventos' : 'Event reminders'}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Recordatorios sobre eventos próximos'
                  : 'Reminders about upcoming events'}
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default PrivacyTab;
