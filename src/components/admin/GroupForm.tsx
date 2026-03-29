import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/rbac/hooks';
import RequirePermission from '@/components/rbac/RequirePermission';
import PermissionMatrixPicker from '@/components/rbac/PermissionMatrixPicker';
import type { PermissionGrant, RBACGroup } from '@/lib/rbac/types';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const labels: Record<string, Record<'es' | 'en', string>> = {
  createTitle: { en: 'Group Information', es: 'Informacion del Grupo' },
  editTitle: { en: 'Group Information', es: 'Informacion del Grupo' },
  name: { en: 'Name', es: 'Nombre' },
  namePlaceholder: { en: 'e.g. Content Editors', es: 'p.ej. Editores de Contenido' },
  description: { en: 'Description', es: 'Descripcion' },
  descriptionPlaceholder: {
    en: 'Describe the purpose of this group',
    es: 'Describe el proposito de este grupo',
  },
  permissions: { en: 'Permissions', es: 'Permisos' },
  save: { en: 'Save', es: 'Guardar' },
  saving: { en: 'Saving...', es: 'Guardando...' },
  create: { en: 'Create Group', es: 'Crear Grupo' },
  update: { en: 'Update Group', es: 'Actualizar Grupo' },
  successCreate: { en: 'Group created successfully', es: 'Grupo creado exitosamente' },
  successUpdate: { en: 'Group updated successfully', es: 'Grupo actualizado exitosamente' },
  errorAuth: { en: 'You must be logged in', es: 'Debes iniciar sesion' },
  errorGeneric: { en: 'An error occurred. Please try again.', es: 'Ocurrio un error. Intenta de nuevo.' },
  errorNotFound: { en: 'Group not found', es: 'Grupo no encontrado' },
  errorNameRequired: { en: 'Name is required', es: 'El nombre es requerido' },
  systemGroupNotice: {
    en: 'This is a system group. Name and description cannot be changed.',
    es: 'Este es un grupo de sistema. El nombre y la descripcion no pueden cambiarse.',
  },
  viewGroups: { en: 'View Groups', es: 'Ver Grupos' },
  createAnother: { en: 'Create Another', es: 'Crear Otro' },
};

function t(key: string, lang: 'es' | 'en'): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner form (rendered inside RequirePermission gate)
// ---------------------------------------------------------------------------

interface GroupFormInnerProps {
  lang: 'es' | 'en';
  groupId?: string;
}

function GroupFormInner({ lang, groupId }: GroupFormInnerProps) {
  const { user } = useAuth();
  const isEdit = !!groupId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<PermissionGrant[]>([]);
  const [isSystem, setIsSystem] = useState(false);
  const [loading, setLoading] = useState(!!groupId);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Fetch group data for edit mode
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    async function fetchGroup() {
      try {
        const snap = await getDoc(doc(db, 'rbac_groups', groupId!));
        if (cancelled) return;
        if (!snap.exists()) {
          setSubmitError(t('errorNotFound', lang));
          setLoading(false);
          return;
        }
        const data = snap.data() as Omit<RBACGroup, 'id'>;
        setName(data.name);
        setDescription(data.description);
        setPermissions(data.permissions ?? []);
        setIsSystem(data.isSystem ?? false);
      } catch {
        if (!cancelled) setSubmitError(t('errorGeneric', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGroup();
    return () => {
      cancelled = true;
    };
  }, [groupId, lang]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setNameError(null);
      setSubmitError(null);

      if (!user) {
        setSubmitError(t('errorAuth', lang));
        return;
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        setNameError(t('errorNameRequired', lang));
        return;
      }

      setSubmitting(true);

      try {
        if (isEdit && groupId) {
          const updatePayload: Record<string, unknown> = {
            permissions,
            updatedAt: serverTimestamp(),
          };
          // System groups keep name/description immutable
          if (!isSystem) {
            updatePayload.name = trimmedName;
            updatePayload.description = description.trim();
          }
          await updateDoc(doc(db, 'rbac_groups', groupId), updatePayload);
        } else {
          await addDoc(collection(db, 'rbac_groups'), {
            name: trimmedName,
            description: description.trim(),
            permissions,
            isSystem: false,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        setSuccess(true);
      } catch (err) {
        console.error('Error saving group:', err);
        setSubmitError(t('errorGeneric', lang));
      } finally {
        setSubmitting(false);
      }
    },
    [user, name, description, permissions, isEdit, groupId, isSystem, lang]
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg bg-white p-6 shadow dark:bg-gray-800"
          >
            <div className="mb-4 h-6 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <CheckCircleIcon className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? t('successUpdate', lang) : t('successCreate', lang)}
        </h2>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href={`/${lang}/dashboard/admin/groups`}
            className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
          >
            {t('viewGroups', lang)}
          </a>
          {!isEdit && (
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setName('');
                setDescription('');
                setPermissions([]);
              }}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('createAnother', lang)}
            </button>
          )}
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:cursor-not-allowed disabled:opacity-60';
  const sectionClass = 'rounded-lg bg-white p-6 shadow dark:bg-gray-800 mb-6';

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
      {submitError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {isSystem && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 p-4 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <span>{t('systemGroupNotice', lang)}</span>
        </div>
      )}

      {/* Basic Information */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {isEdit ? t('editTitle', lang) : t('createTitle', lang)}
        </legend>
        <div className="space-y-4">
          <Field label={t('name', lang)} error={nameError ?? undefined}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder', lang)}
              disabled={isSystem}
              className={inputClass}
            />
          </Field>
          <Field label={t('description', lang)}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder', lang)}
              rows={3}
              disabled={isSystem}
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      {/* Permissions Matrix */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('permissions', lang)}
        </legend>
        <PermissionMatrixPicker
          value={permissions}
          onChange={setPermissions}
          lang={lang}
        />
      </fieldset>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-lg bg-primary-600 px-8 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? t('saving', lang)
            : isEdit
              ? t('update', lang)
              : t('create', lang)}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Exported component with permission gate
// ---------------------------------------------------------------------------

interface GroupFormProps {
  lang?: 'es' | 'en';
  groupId?: string;
}

export default function GroupForm({ lang = 'es', groupId }: GroupFormProps) {
  const operation = groupId ? 'edit' : 'create';

  return (
    <RequirePermission resource="groups" operation={operation}>
      <GroupFormInner lang={lang} groupId={groupId} />
    </RequirePermission>
  );
}
