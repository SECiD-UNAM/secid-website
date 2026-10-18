import React from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface EntryCardProps {
  title: string;
  subtitle?: string;
  dateRange?: string;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  lang?: 'es' | 'en';
}

export const EntryCard: React.FC<EntryCardProps> = ({
  title,
  subtitle,
  dateRange,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  children,
  lang = 'es',
}) => {
  const handleDelete = () => {
    const message =
      lang === 'es'
        ? 'Estas seguro de que deseas eliminar este elemento?'
        : 'Are you sure you want to delete this item?';
    if (window.confirm(message)) {
      onDelete();
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-primary-200 bg-white p-4 dark:border-primary-800 dark:bg-gray-800">
        <div className="space-y-4">{children}</div>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={
              'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium ' +
              'text-gray-700 hover:bg-gray-50 ' +
              'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }
          >
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onSave}
            className={
              'rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium ' +
              'text-white hover:bg-primary-700 ' +
              'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
            }
          >
            {lang === 'es' ? 'Guardar' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h4>
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {dateRange && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
              {dateRange}
            </p>
          )}
        </div>

        <div className="ml-4 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className={
              'rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 ' +
              'dark:hover:bg-gray-700 dark:hover:text-gray-300'
            }
            aria-label={lang === 'es' ? 'Editar' : 'Edit'}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={
              'rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 ' +
              'dark:hover:bg-red-900/20 dark:hover:text-red-400'
            }
            aria-label={lang === 'es' ? 'Eliminar' : 'Delete'}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryCard;
