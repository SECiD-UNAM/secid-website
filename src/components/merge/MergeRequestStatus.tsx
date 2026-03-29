import React from 'react';
import type { MergeRequestStatus as StatusType } from '@/types/merge';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  StatusType,
  {
    label: { es: string; en: string };
    color: string;
    icon: React.ComponentType<any>;
  }
> = {
  pending: {
    label: { es: 'Pendiente', en: 'Pending' },
    color:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    icon: Clock,
  },
  approved: {
    label: { es: 'Aprobada', en: 'Approved' },
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
  },
  rejected: {
    label: { es: 'Rechazada', en: 'Rejected' },
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: XCircle,
  },
  executing: {
    label: { es: 'Ejecutando', en: 'Executing' },
    color:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    icon: Loader2,
  },
  completed: {
    label: { es: 'Completada', en: 'Completed' },
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
  },
  failed: {
    label: { es: 'Fallida', en: 'Failed' },
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: AlertTriangle,
  },
};

interface MergeRequestStatusProps {
  status: StatusType;
  lang?: 'es' | 'en';
}

export const MergeRequestStatusBadge: React.FC<MergeRequestStatusProps> = ({
  status,
  lang = 'es',
}) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      <Icon className={`h-3 w-3 ${status === 'executing' ? 'animate-spin' : ''}`} />
      {config.label[lang]}
    </span>
  );
};
