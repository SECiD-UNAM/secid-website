export type Resource =
  | 'events'
  | 'spotlights'
  | 'newsletter'
  | 'journal-club'
  | 'jobs'
  | 'blog'
  | 'forums'
  | 'resources'
  | 'users'
  | 'companies'
  | 'commissions'
  | 'mentorship'
  | 'settings'
  | 'analytics'
  | 'reports'
  | 'notifications'
  | 'assessments'
  | 'salary-insights'
  | 'groups';

export type Operation =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'publish'
  | 'moderate'
  | 'export'
  | 'assign';

export const RESOURCES: readonly Resource[] = [
  'events',
  'spotlights',
  'newsletter',
  'journal-club',
  'jobs',
  'blog',
  'forums',
  'resources',
  'users',
  'companies',
  'commissions',
  'mentorship',
  'settings',
  'analytics',
  'reports',
  'notifications',
  'assessments',
  'salary-insights',
  'groups',
] as const;

export const OPERATIONS: readonly Operation[] = [
  'view',
  'create',
  'edit',
  'delete',
  'publish',
  'moderate',
  'export',
  'assign',
] as const;

export const RESOURCE_ABBREV: Record<Resource, string> = {
  events: 'ev',
  spotlights: 'sp',
  newsletter: 'nl',
  'journal-club': 'jc',
  jobs: 'jo',
  blog: 'bl',
  forums: 'fo',
  resources: 'rs',
  users: 'us',
  companies: 'co',
  commissions: 'cm',
  mentorship: 'mn',
  settings: 'st',
  analytics: 'an',
  reports: 'rp',
  notifications: 'nt',
  assessments: 'as',
  'salary-insights': 'si',
  groups: 'gr',
};

export const OP_ABBREV: Record<Operation, string> = {
  view: 'v',
  create: 'c',
  edit: 'e',
  delete: 'd',
  publish: 'p',
  moderate: 'm',
  export: 'x',
  assign: 'a',
};

export const RESOURCE_FROM_ABBREV: Record<string, Resource> =
  Object.fromEntries(
    Object.entries(RESOURCE_ABBREV).map(([resource, abbrev]) => [
      abbrev,
      resource as Resource,
    ])
  ) as Record<string, Resource>;

export const OP_FROM_ABBREV: Record<string, Operation> = Object.fromEntries(
  Object.entries(OP_ABBREV).map(([operation, abbrev]) => [
    abbrev,
    operation as Operation,
  ])
) as Record<string, Operation>;

export type Scope = 'own' | 'all';

export type Effect = 'allow' | 'deny';

export interface PermissionGrant {
  resource: Resource;
  operation: Operation;
  scope: Scope;
  effect: Effect;
}

export interface RBACGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionGrant[];
  isSystem: boolean;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface UserGroupAssignment {
  userId: string;
  groups: string[];
  assignedBy: string;
  updatedAt: unknown;
}

export interface RBACAuditEntry {
  action:
    | 'group_created'
    | 'group_updated'
    | 'group_deleted'
    | 'user_assigned'
    | 'user_unassigned'
    | 'permissions_resolved';
  actorId: string;
  targetId: string;
  changes: Record<string, unknown>;
  timestamp: unknown;
}
