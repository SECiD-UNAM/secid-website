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
          <div className="flex items-start">
            <input
              id="privacy-profile-visible"
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
              <label
                htmlFor="privacy-profile-visible"
                className="font-medium text-gray-900 dark:text-white"
              >
                {lang === 'es' ? 'Perfil público' : 'Public profile'}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Tu perfil será visible para otros miembros'
                  : 'Your profile will be visible to other members'}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="privacy-contact-visible"
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
              <label
                htmlFor="privacy-contact-visible"
                className="font-medium text-gray-900 dark:text-white"
              >
                {lang === 'es'
                  ? 'Mostrar información de contacto'
                  : 'Show contact information'}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Permite que otros miembros vean tu email y teléfono'
                  : 'Allow other members to see your email and phone'}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="privacy-job-searching"
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
              <label
                htmlFor="privacy-job-searching"
                className="font-medium text-gray-900 dark:text-white"
              >
                {lang === 'es' ? 'Buscando empleo' : 'Job seeking'}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Indica que estás abierto a nuevas oportunidades'
                  : "Indicate that you're open to new opportunities"}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="privacy-mentorship-available"
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
              <label
                htmlFor="privacy-mentorship-available"
                className="font-medium text-gray-900 dark:text-white"
              >
                {lang === 'es'
                  ? 'Disponible como mentor'
                  : 'Available as mentor'}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Otros miembros pueden contactarte para mentoría'
                  : 'Other members can contact you for mentorship'}
              </p>
            </div>
          </div>
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
          <div className="flex items-start">
            <input
              id="privacy-email-notifications"
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
              <label
                htmlFor="privacy-email-notifications"
                className="font-medium text-gray-900 dark:text-white"
              >
                {lang === 'es'
                  ? 'Notificaciones por email'
                  : 'Email notifications'}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Recibe actualizaciones importantes por correo'
                  : 'Receive important updates via email'}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="privacy-job-match-notifications"
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
              <label
                htmlFor="privacy-job-match-notifications"
                className="font-medium text-gray-900 dark:text-white"
              >
                {lang === 'es' ? 'Alertas de empleos' : 'Job alerts'}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Notificaciones sobre empleos que coincidan con tu perfil'
                  : 'Notifications about jobs matching your profile'}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="privacy-event-notifications"
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
              <label
                htmlFor="privacy-event-notifications"
                className="font-medium text-gray-900 dark:text-white"
              >
                {lang === 'es' ? 'Recordatorios de eventos' : 'Event reminders'}
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es'
                  ? 'Recordatorios sobre eventos próximos'
                  : 'Reminders about upcoming events'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyTab;
