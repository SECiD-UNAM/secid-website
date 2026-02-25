// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { getMemberGroupList, updateMemberGroups, GROUP_MAP, GROUP_LABELS } from '@/lib/gcp-services';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberEmail: string;
  memberName: string;
  language: string;
  onSuccess?: () => void;
}

export const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
  isOpen,
  onClose,
  memberEmail,
  memberName,
  language,
  onSuccess,
}) => {
  const [currentGroups, setCurrentGroups] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allGroups = Object.values(GROUP_MAP);

  useEffect(() => {
    if (isOpen && memberEmail) {
      loadMemberGroups();
    }
  }, [isOpen, memberEmail]);

  const loadMemberGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMemberGroupList(memberEmail);
      const groups = new Set(result.groups);
      setCurrentGroups(groups);
      setSelectedGroups(new Set(groups));
    } catch (err: any) {
      console.error('Error loading member groups:', err);
      setError(
        language === 'es'
          ? 'Error al cargar los grupos del miembro'
          : 'Error loading member groups'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGroup = (groupEmail: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupEmail)) {
      newSelected.delete(groupEmail);
    } else {
      newSelected.add(groupEmail);
    }
    setSelectedGroups(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const addToGroups = [...selectedGroups].filter((g) => !currentGroups.has(g));
    const removeFromGroups = [...currentGroups].filter((g) => !selectedGroups.has(g));

    if (addToGroups.length === 0 && removeFromGroups.length === 0) {
      onClose();
      return;
    }

    try {
      const result = await updateMemberGroups(memberEmail, addToGroups, removeFromGroups);
      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.results.errors.join(', '));
      }
    } catch (err: any) {
      console.error('Error updating member groups:', err);
      setError(
        language === 'es'
          ? 'Error al actualizar los grupos'
          : 'Error updating groups'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasChanges =
    [...selectedGroups].some((g) => !currentGroups.has(g)) ||
    [...currentGroups].some((g) => !selectedGroups.has(g));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'es' ? 'Gestionar Grupos' : 'Manage Groups'}
            </h3>
            <p className="text-sm text-gray-500">{memberName} ({memberEmail})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">
                {language === 'es' ? 'Cargando grupos...' : 'Loading groups...'}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {allGroups.map((groupEmail) => {
                const label = GROUP_LABELS[groupEmail];
                const isSelected = selectedGroups.has(groupEmail);
                const wasInGroup = currentGroups.has(groupEmail);
                const changed = isSelected !== wasInGroup;

                return (
                  <label
                    key={groupEmail}
                    className={`flex cursor-pointer items-center rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleGroup(groupEmail)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {label?.[language === 'es' ? 'es' : 'en'] || groupEmail}
                      </p>
                      <p className="text-xs text-gray-500">{groupEmail}</p>
                    </div>
                    {changed && (
                      <span
                        className={`text-xs font-medium ${
                          isSelected ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isSelected
                          ? language === 'es' ? '+ Agregar' : '+ Add'
                          : language === 'es' ? '- Quitar' : '- Remove'}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {language === 'es' ? 'Guardar' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupManagementModal;
