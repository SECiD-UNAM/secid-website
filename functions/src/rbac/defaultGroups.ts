/**
 * Default RBAC system groups.
 *
 * These are the 9 built-in groups seeded into Firestore on first deployment.
 * All marked isSystem: true to prevent accidental deletion.
 *
 * The permission grant types mirror src/lib/rbac/types.ts but are defined
 * locally since Cloud Functions have a separate build.
 */

// ---------------------------------------------------------------------------
// Types (local copy — Cloud Functions cannot import from src/lib/rbac/)
// ---------------------------------------------------------------------------

type Resource =
  | "events"
  | "spotlights"
  | "newsletter"
  | "journal-club"
  | "jobs"
  | "blog"
  | "forums"
  | "resources"
  | "users"
  | "companies"
  | "commissions"
  | "mentorship"
  | "settings"
  | "analytics"
  | "reports"
  | "notifications"
  | "assessments"
  | "salary-insights"
  | "groups";

type Operation =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "publish"
  | "moderate"
  | "export"
  | "assign";

type Scope = "own" | "all";
type Effect = "allow" | "deny";

export interface PermissionGrant {
  resource: Resource;
  operation: Operation;
  scope: Scope;
  effect: Effect;
}

export interface DefaultGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionGrant[];
  isSystem: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_RESOURCES: readonly Resource[] = [
  "events",
  "spotlights",
  "newsletter",
  "journal-club",
  "jobs",
  "blog",
  "forums",
  "resources",
  "users",
  "companies",
  "commissions",
  "mentorship",
  "settings",
  "analytics",
  "reports",
  "notifications",
  "assessments",
  "salary-insights",
  "groups",
] as const;

const ALL_OPERATIONS: readonly Operation[] = [
  "view",
  "create",
  "edit",
  "delete",
  "publish",
  "moderate",
  "export",
  "assign",
] as const;

export const CONTENT_RESOURCES: readonly Resource[] = [
  "events",
  "spotlights",
  "newsletter",
  "journal-club",
  "blog",
  "resources",
  "forums",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function grant(
  resource: Resource,
  operation: Operation,
  scope: Scope,
  effect: Effect = "allow",
): PermissionGrant {
  return { resource, operation, scope, effect };
}

function allOpsOnResource(resource: Resource, scope: Scope): PermissionGrant[] {
  return ALL_OPERATIONS.map((op) => grant(resource, op, scope));
}

function viewAllOnResources(resources: readonly Resource[]): PermissionGrant[] {
  return resources.map((r) => grant(r, "view", "all"));
}

function ownCrudOnResource(resource: Resource): PermissionGrant[] {
  return [
    grant(resource, "create", "own"),
    grant(resource, "edit", "own"),
    grant(resource, "delete", "own"),
    grant(resource, "publish", "own"),
  ];
}

// ---------------------------------------------------------------------------
// Default Groups
// ---------------------------------------------------------------------------

const superAdmin: DefaultGroup = {
  id: "super-admin",
  name: "Super Admin",
  description: "Full access to all resources and operations",
  isSystem: true,
  permissions: ALL_RESOURCES.flatMap((r) => allOpsOnResource(r, "all")),
};

const moderator: DefaultGroup = {
  id: "moderator",
  name: "Moderator",
  description: "View all resources, moderate and manage content",
  isSystem: true,
  permissions: [
    // All resources: view.all + moderate.all
    ...ALL_RESOURCES.map((r) => grant(r, "view", "all")),
    ...ALL_RESOURCES.map((r) => grant(r, "moderate", "all")),
    // Content resources: edit.all + publish.all
    ...CONTENT_RESOURCES.map((r) => grant(r, "edit", "all")),
    ...CONTENT_RESOURCES.map((r) => grant(r, "publish", "all")),
  ],
};

const contentEditor: DefaultGroup = {
  id: "content-editor",
  name: "Content Editor",
  description: "Create, edit, and publish content across content resources",
  isSystem: true,
  permissions: [
    ...CONTENT_RESOURCES.map((r) => grant(r, "create", "all")),
    ...CONTENT_RESOURCES.map((r) => grant(r, "edit", "all")),
    ...CONTENT_RESOURCES.map((r) => grant(r, "delete", "own")),
    ...CONTENT_RESOURCES.map((r) => grant(r, "publish", "all")),
    ...CONTENT_RESOURCES.map((r) => grant(r, "view", "all")),
  ],
};

const eventManager: DefaultGroup = {
  id: "event-manager",
  name: "Event Manager",
  description: "Full control over events, view access to other content",
  isSystem: true,
  permissions: [
    ...allOpsOnResource("events", "all"),
    ...viewAllOnResources(
      CONTENT_RESOURCES.filter((r) => r !== "events"),
    ),
  ],
};

const newsletterEditor: DefaultGroup = {
  id: "newsletter-editor",
  name: "Newsletter Editor",
  description: "Full control over newsletter, view access to other content",
  isSystem: true,
  permissions: [
    ...allOpsOnResource("newsletter", "all"),
    ...viewAllOnResources(
      CONTENT_RESOURCES.filter((r) => r !== "newsletter"),
    ),
  ],
};

const jcCoordinator: DefaultGroup = {
  id: "jc-coordinator",
  name: "Journal Club Coordinator",
  description:
    "Full control over journal club, view access to other content",
  isSystem: true,
  permissions: [
    ...allOpsOnResource("journal-club", "all"),
    ...viewAllOnResources(
      CONTENT_RESOURCES.filter((r) => r !== "journal-club"),
    ),
  ],
};

const mentor: DefaultGroup = {
  id: "mentor",
  name: "Mentor",
  description: "Manage own mentorship sessions",
  isSystem: true,
  permissions: [
    grant("mentorship", "view", "all"),
    grant("mentorship", "create", "own"),
    grant("mentorship", "edit", "own"),
    grant("mentorship", "delete", "own"),
    grant("mentorship", "publish", "own"),
  ],
};

const member: DefaultGroup = {
  id: "member",
  name: "Member",
  description: "Standard member access to content and community features",
  isSystem: true,
  permissions: [
    // View all content resources
    ...viewAllOnResources(CONTENT_RESOURCES),
    // Forums: own CRUD
    ...ownCrudOnResource("forums"),
    // Jobs: own CRUD + view.all (view.all already from content)
    grant("jobs", "create", "own"),
    grant("jobs", "edit", "own"),
    grant("jobs", "delete", "own"),
    grant("jobs", "publish", "own"),
    grant("jobs", "view", "all"),
    // Mentorship: create.own + edit.own
    grant("mentorship", "create", "own"),
    grant("mentorship", "edit", "own"),
  ],
};

const company: DefaultGroup = {
  id: "company",
  name: "Company",
  description: "Company account with job posting and company profile access",
  isSystem: true,
  permissions: [
    // Jobs: own CRUD + view.all
    grant("jobs", "create", "own"),
    grant("jobs", "edit", "own"),
    grant("jobs", "delete", "own"),
    grant("jobs", "view", "all"),
    // Companies: edit own profile
    grant("companies", "edit", "own"),
    // View all content resources
    ...viewAllOnResources(CONTENT_RESOURCES),
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const DEFAULT_GROUPS: DefaultGroup[] = [
  superAdmin,
  moderator,
  contentEditor,
  eventManager,
  newsletterEditor,
  jcCoordinator,
  mentor,
  member,
  company,
];
