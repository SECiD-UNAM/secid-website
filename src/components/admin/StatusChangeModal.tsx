// @ts-nocheck
import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { MemberStatus } from '@/types/member';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newStatus: MemberStatus, reason: string) => void;
  currentStatus: MemberStatus;
  targetStatus: MemberStatus;
  memberName: string;
  memberEmail: string;
  language: string;
}

const STATUS_LABELS: Record<MemberStatus, { es: string; en: string }> = {
  collaborator: { es: 'Colaborador', en: 'Collaborator' },
  pending: { es: 'Pendiente', en: 'Pending' },
  active: { es: 'Activo', en: 'Active' },
  inactive: { es: 'Inactivo', en: 'Inactive' },
  suspended: { es: 'Suspendido', en: 'Suspended' },
  alumni: { es: 'Alumni', en: 'Alumni' },
  deactivated: { es: 'Desactivado', en: 'Deactivated' },
};

const STATUS_COLORS: Record<MemberStatus, string> = {
  collaborator: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
  alumni: 'bg-purple-100 text-purple-800',
  deactivated: 'bg-gray-100 text-gray-800',
};

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  targetStatus,
  memberName,
  memberEmail,
  language,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isDestructive = ['suspended', 'deactivated'].includes(targetStatus);

  const handleConfirm = () => {
    onConfirm(targetStatus, reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-2">
            {isDestructive && <AlertTriangle className="h-5 w-5 text-red-500" />}
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'es' ? 'Cambiar Estado' : 'Change Status'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              {language === 'es'
                ? `¿Cambiar el estado de ${memberName} (${memberEmail})?`
                : `Change status for ${memberName} (${memberEmail})?`}
            </p>
          </div>

          {/* Status transition */}
          <div className="flex items-center justify-center space-x-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[currentStatus]}`}>
              {STATUS_LABELS[currentStatus]?.[language === 'es' ? 'es' : 'en'] || currentStatus}
            </span>
            <span className="text-gray-400">→</span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[targetStatus]}`}>
              {STATUS_LABELS[targetStatus]?.[language === 'es' ? 'es' : 'en'] || targetStatus}
            </span>
          </div>

          {/* Google Groups impact */}
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">
              {language === 'es' ? 'Impacto en Google Groups:' : 'Google Groups impact:'}
            </p>
            <p className="text-sm text-gray-700">
              {getGroupImpactMessage(currentStatus, targetStatus, language)}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'es' ? 'Razón (opcional)' : 'Reason (optional)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder={language === 'es' ? 'Motivo del cambio...' : 'Reason for the change...'}
            />
          </div>
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
            onClick={handleConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {language === 'es' ? 'Confirmar' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

function getGroupImpactMessage(from: MemberStatus, to: MemberStatus, language: string): string {
  const es = language === 'es';
  switch (to) {
    case 'active':
      return es
        ? 'Se agregará a miembros@secid.mx y se removerá de colaboradores@secid.mx'
        : 'Will be added to miembros@secid.mx and removed from colaboradores@secid.mx';
    case 'suspended':
    case 'deactivated':
      return es
        ? 'Se removerá de todos los grupos de Google'
        : 'Will be removed from all Google Groups';
    case 'alumni':
      return es
        ? 'Se removerá de miembros@secid.mx'
        : 'Will be removed from miembros@secid.mx';
    case 'collaborator':
      return es
        ? 'Se agregará a colaboradores@secid.mx y se removerá de miembros@secid.mx'
        : 'Will be added to colaboradores@secid.mx and removed from miembros@secid.mx';
    default:
      return es ? 'Sin cambios en grupos' : 'No group changes';
  }
}

export default StatusChangeModal;
