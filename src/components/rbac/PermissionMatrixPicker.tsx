import React, { useCallback, useMemo } from 'react';
import type { Resource, Operation, PermissionGrant } from '@/lib/rbac/types';
import { RESOURCES, OPERATIONS } from '@/lib/rbac/types';

// ---------------------------------------------------------------------------
// i18n label maps
// ---------------------------------------------------------------------------

const RESOURCE_LABELS: Record<Resource, Record<'es' | 'en', string>> = {
  events: { en: 'Events', es: 'Eventos' },
  spotlights: { en: 'Spotlights', es: 'Destacados' },
  newsletter: { en: 'Newsletter', es: 'Boletín' },
  'journal-club': { en: 'Journal Club', es: 'Club de Revista' },
  jobs: { en: 'Jobs', es: 'Empleos' },
  blog: { en: 'Blog', es: 'Blog' },
  forums: { en: 'Forums', es: 'Foros' },
  resources: { en: 'Resources', es: 'Recursos' },
  users: { en: 'Users', es: 'Usuarios' },
  companies: { en: 'Companies', es: 'Empresas' },
  commissions: { en: 'Commissions', es: 'Comisiones' },
  mentorship: { en: 'Mentorship', es: 'Mentoría' },
  settings: { en: 'Settings', es: 'Configuración' },
  analytics: { en: 'Analytics', es: 'Analíticas' },
  reports: { en: 'Reports', es: 'Reportes' },
  notifications: { en: 'Notifications', es: 'Notificaciones' },
  assessments: { en: 'Assessments', es: 'Evaluaciones' },
  'salary-insights': { en: 'Salary Insights', es: 'Perspectivas Salariales' },
  groups: { en: 'Groups', es: 'Grupos' },
};

const OPERATION_LABELS: Record<Operation, Record<'es' | 'en', string>> = {
  view: { en: 'View', es: 'Ver' },
  create: { en: 'Create', es: 'Crear' },
  edit: { en: 'Edit', es: 'Editar' },
  delete: { en: 'Delete', es: 'Eliminar' },
  publish: { en: 'Publish', es: 'Publicar' },
  moderate: { en: 'Moderate', es: 'Moderar' },
  export: { en: 'Export', es: 'Exportar' },
  assign: { en: 'Assign', es: 'Asignar' },
};

// ---------------------------------------------------------------------------
// Resource categories for visual grouping
// ---------------------------------------------------------------------------

interface ResourceCategory {
  label: Record<'es' | 'en', string>;
  resources: Resource[];
}

const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    label: { en: 'Content', es: 'Contenido' },
    resources: [
      'events',
      'spotlights',
      'newsletter',
      'journal-club',
      'jobs',
      'blog',
      'forums',
      'resources',
    ],
  },
  {
    label: { en: 'People', es: 'Personas' },
    resources: ['users', 'companies', 'commissions', 'mentorship'],
  },
  {
    label: { en: 'Platform', es: 'Plataforma' },
    resources: [
      'settings',
      'analytics',
      'reports',
      'notifications',
      'assessments',
      'salary-insights',
    ],
  },
  {
    label: { en: 'RBAC', es: 'RBAC' },
    resources: ['groups'],
  },
];

// ---------------------------------------------------------------------------
// Cell value helpers
// ---------------------------------------------------------------------------

type CellValue = '' | 'own' | 'all' | 'deny:own' | 'deny:all';

function grantToCellValue(grant: PermissionGrant | undefined): CellValue {
  if (!grant) return '';
  if (grant.effect === 'deny') return `deny:${grant.scope}` as CellValue;
  return grant.scope;
}

function cellValueToGrant(
  resource: Resource,
  operation: Operation,
  value: CellValue
): PermissionGrant | null {
  if (value === '') return null;
  if (value === 'own')
    return { resource, operation, scope: 'own', effect: 'allow' };
  if (value === 'all')
    return { resource, operation, scope: 'all', effect: 'allow' };
  if (value === 'deny:own')
    return { resource, operation, scope: 'own', effect: 'deny' };
  if (value === 'deny:all')
    return { resource, operation, scope: 'all', effect: 'deny' };
  return null;
}

function cellColorClass(value: CellValue): string {
  if (value === 'own' || value === 'all') return 'bg-green-50 text-green-900';
  if (value === 'deny:own' || value === 'deny:all')
    return 'bg-red-50 text-red-900';
  return '';
}

// ---------------------------------------------------------------------------
// Lookup index: (resource, operation) -> grant
// ---------------------------------------------------------------------------

function buildGrantIndex(
  grants: PermissionGrant[]
): Map<string, PermissionGrant> {
  const map = new Map<string, PermissionGrant>();
  for (const g of grants) {
    map.set(`${g.resource}:${g.operation}`, g);
  }
  return map;
}

// ---------------------------------------------------------------------------
// MatrixCell — memoized to avoid 152 re-renders
// ---------------------------------------------------------------------------

interface MatrixCellProps {
  resource: Resource;
  operation: Operation;
  value: CellValue;
  disabled: boolean;
  onCellChange: (
    resource: Resource,
    operation: Operation,
    value: CellValue
  ) => void;
}

const MatrixCell = React.memo(function MatrixCell({
  resource,
  operation,
  value,
  disabled,
  onCellChange,
}: MatrixCellProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onCellChange(resource, operation, e.target.value as CellValue);
    },
    [resource, operation, onCellChange]
  );

  const colorClass = cellColorClass(value);

  return (
    <td className="px-1 py-0.5">
      <select
        data-testid={`cell-${resource}-${operation}`}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full rounded border border-gray-300 px-1 py-0.5 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${colorClass}`}
      >
        <option value="">&mdash;</option>
        <option value="own">own</option>
        <option value="all">all</option>
        <option value="deny:own">deny:own</option>
        <option value="deny:all">deny:all</option>
      </select>
    </td>
  );
});

// ---------------------------------------------------------------------------
// PermissionMatrixPicker
// ---------------------------------------------------------------------------

export interface PermissionMatrixPickerProps {
  value: PermissionGrant[];
  onChange: (grants: PermissionGrant[]) => void;
  disabled?: boolean;
  lang?: 'es' | 'en';
}

export default function PermissionMatrixPicker({
  value,
  onChange,
  disabled = false,
  lang = 'es',
}: PermissionMatrixPickerProps) {
  const grantIndex = useMemo(() => buildGrantIndex(value), [value]);

  const handleCellChange = useCallback(
    (resource: Resource, operation: Operation, cellValue: CellValue) => {
      const newGrant = cellValueToGrant(resource, operation, cellValue);

      // Build new grants array: filter out old grant for this cell, then add new if present
      const filtered = value.filter(
        (g) => !(g.resource === resource && g.operation === operation)
      );

      if (newGrant) {
        onChange([...filtered, newGrant]);
      } else {
        onChange(filtered);
      }
    },
    [value, onChange]
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-sm" role="table">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600">
              {lang === 'es' ? 'Recurso' : 'Resource'}
            </th>
            {OPERATIONS.map((op) => (
              <th
                key={op}
                className="px-1 py-2 text-center text-xs font-semibold text-gray-600"
              >
                {OPERATION_LABELS[op][lang]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RESOURCE_CATEGORIES.map((category) => (
            <React.Fragment key={category.label.en}>
              <tr>
                <td
                  colSpan={OPERATIONS.length + 1}
                  className="bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500"
                >
                  {category.label[lang]}
                </td>
              </tr>
              {category.resources.map((resource) => {
                return (
                  <tr
                    key={resource}
                    data-testid={`resource-row-${resource}`}
                    className="border-t border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="sticky left-0 z-10 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                      {RESOURCE_LABELS[resource][lang]}
                    </td>
                    {OPERATIONS.map((operation) => {
                      const grant = grantIndex.get(
                        `${resource}:${operation}`
                      );
                      const cellValue = grantToCellValue(grant);
                      return (
                        <MatrixCell
                          key={operation}
                          resource={resource}
                          operation={operation}
                          value={cellValue}
                          disabled={disabled}
                          onCellChange={handleCellChange}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
