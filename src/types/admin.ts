/**
 * Admin Dashboard Type Definitions
 */

export interface AdminDashboardStats {
  totalUsers: number;
  newUsersThisMonth: number;
  totalJobs: number;
  activeJobs: number;
  pendingJobs: number;
  totalEvents: number;
  upcomingEvents: number;
  totalForumPosts: number;
  pendingReports: number;
  monthlyRevenue: number;
  membershipRevenue: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

export interface UserManagementFilters {
  role: string;
  membershipTier: string;
  isVerified: boolean | null;
  isActive: boolean | null;
  graduationYear: string;
  program: string;
  searchTerm: string;
}

export interface ModerationItem {
  id: string;
  type: 'job' | 'event' | 'forum_post' | 'forum_reply' | 'user_report';
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  title: string;
  content: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  createdAt: Date;
  submittedAt: Date;
  moderatedAt?: Date;
  moderatedBy?: string;
  moderatorId?: string;
  reason?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportCount?: number;
  reportReasons?: string[];
  metadata?: {
    originalId?: string;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

export interface Report {
  id: string;
  reportedItemId: string;
  reportedItemType: 'job' | 'event' | 'forum_post' | 'forum_reply' | 'user';
  reporterId: string;
  reporterEmail: string;
  reporterName: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerId?: string;
  action?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    screenshots?: string[];
    additionalEvidence?: string[];
    [key: string]: any;
  };
}

export interface AnalyticsTimeRange {
  label: string;
  value: string;
  days: number;
}

export interface AnalyticsData {
  userGrowth: Array<{
    date: string;
    users: number;
    activeUsers: number;
    premiumUsers?: number;
  }>;
  jobMetrics: Array<{
    date: string;
    posted: number;
    applied: number;
    filled: number;
    views?: number;
  }>;
  eventMetrics: Array<{
    date: string;
    created: number;
    attendees: number;
    revenue?: number;
  }>;
  forumActivity: Array<{
    date: string;
    posts: number;
    replies: number;
    views: number;
    activeUsers?: number;
  }>;
  membershipDistribution: Array<{
    name: string;
    value: number;
    color: string;
    revenue?: number;
  }>;
  topSkills: Array<{
    skill: string;
    count: number;
    trend?: 'up' | 'down' | 'stable';
  }>;
  topCompanies: Array<{
    company: string;
    users: number;
    jobs: number;
    revenue?: number;
  }>;
  geographicDistribution: Array<{
    location: string;
    users: number;
    coordinates?: [number, number];
  }>;
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionTime: number;
    bounceRate: number;
    pageViews: number;
    uniqueVisitors: number;
    returnVisitors: number;
  };
  revenueMetrics: {
    monthlyRevenue: number;
    yearlyRevenue: number;
    membershipRevenue: number;
    eventRevenue: number;
    averageRevenuePerUser: number;
    churnRate: number;
    lifetimeValue: number;
    conversionRate: number;
  };
}

export interface PlatformSettings {
  general: {
    siteName: string;
    siteDescription: string;
    supportEmail: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    jobPostingEnabled: boolean;
    eventCreationEnabled: boolean;
    forumEnabled: boolean;
    maxUsersLimit: number;
    defaultLanguage: 'es' | 'en';
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
    emailEnabled: boolean;
    notificationEmails: string[];
    replyToEmail?: string;
    bounceEmail?: string;
  };
  moderation: {
    autoApproveJobs: boolean;
    autoApproveEvents: boolean;
    autoApproveForumPosts: boolean;
    requireManualReview: boolean;
    flaggedContentThreshold: number;
    reportActionThreshold: number;
    moderatorNotifications: boolean;
    wordFilter: string[];
    bannedDomains: string[];
    imageModeration: boolean;
    linkModeration: boolean;
  };
  payments: {
    premiumMembershipPrice: number;
    corporateMembershipPrice: number;
    eventTicketBasePrice: number;
    paymentEnabled: boolean;
    stripePublishableKey: string;
    stripeSecretKey: string;
    paypalClientId: string;
    paypalClientSecret: string;
    currency: string;
    taxRate: number;
    refundPolicy: string;
  };
  analytics: {
    googleAnalyticsId: string;
    amplitudeApiKey: string;
    hotjarSiteId: string;
    analyticsEnabled: boolean;
    dataRetentionDays: number;
    cookieConsentRequired: boolean;
    trackingEnabled: boolean;
    anonymizeIPs: boolean;
  };
  security: {
    twoFactorRequired: boolean;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    apiRateLimit: number;
    allowedDomains: string[];
    blockedIPs: string[];
    corsOrigins: string[];
    csrfProtection: boolean;
  };
  notifications: {
    welcomeEmailEnabled: boolean;
    jobAlertEmailEnabled: boolean;
    eventRemindersEnabled: boolean;
    forumNotificationsEnabled: boolean;
    pushNotificationsEnabled: boolean;
    slackWebhookUrl: string;
    discordWebhookUrl: string;
    emailDigestEnabled: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly';
    adminAlerts: {
      newUsers: boolean;
      suspiciousActivity: boolean;
      systemErrors: boolean;
      paymentIssues: boolean;
    };
  };
  features: {
    mentorshipEnabled: boolean;
    jobRecommendationsEnabled: boolean;
    skillAssessmentEnabled: boolean;
    certificationsEnabled: boolean;
    portfolioEnabled: boolean;
    networkingEventsEnabled: boolean;
    companyProfilesEnabled: boolean;
    salaryInsightsEnabled: boolean;
    careerPathsEnabled: boolean;
    learningResourcesEnabled: boolean;
  };
}

export interface SystemBackup {
  id: string;
  name: string;
  description?: string;
  size: number; // in bytes
  createdAt: Date;
  createdBy: string;
  type: 'manual' | 'automatic' | 'scheduled';
  status: 'completed' | 'in_progress' | 'failed' | 'cancelled';
  collections: string[];
  downloadUrl?: string;
  expiresAt?: Date;
  checksum?: string;
  metadata?: {
    userCount?: number;
    jobCount?: number;
    eventCount?: number;
    storageUsed?: number;
    [key: string]: any;
  };
}

export interface AdminActivity {
  id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: AdminActionType;
  targetType:
    | 'user'
    | 'job'
    | 'event'
    | 'forum_post'
    | 'settings'
    | 'system'
    | 'backup';
  targetId?: string;
  targetName?: string;
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: {
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
    reason?: string;
    [key: string]: any;
  };
}

export type AdminActionType =
  // User actions
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_suspended'
  | 'user_activated'
  | 'user_verified'
  | 'user_unverified'
  | 'user_role_changed'
  | 'user_membership_changed'
  // Content moderation actions
  | 'content_approved'
  | 'content_rejected'
  | 'content_flagged'
  | 'content_deleted'
  | 'report_reviewed'
  | 'report_resolved'
  | 'report_dismissed'
  // System actions
  | 'settings_updated'
  | 'backup_created'
  | 'backup_restored'
  | 'backup_deleted'
  | 'system_maintenance'
  | 'feature_toggled'
  | 'email_sent'
  | 'notification_sent'
  // Bulk actions
  | 'bulk_user_update'
  | 'bulk_user_delete'
  | 'bulk_content_approve'
  | 'bulk_content_reject';

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: 'system' | 'user' | 'external';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  metadata?: {
    errorCode?: string;
    stackTrace?: string;
    affectedUsers?: number;
    systemLoad?: number;
    [key: string]: any;
  };
}

export interface ContentModerationRules {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: {
    contentType: string[];
    patterns: string[];
    userRole?: string[];
    reportThreshold?: number;
  };
  actions: {
    autoReject?: boolean;
    autoFlag?: boolean;
    requireManualReview?: boolean;
    notifyModerators?: boolean;
    escalateToAdmin?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    role?: string[];
    membershipTier?: string[];
    graduationYear?: { min?: number; max?: number };
    registrationDate?: { start?: Date; end?: Date };
    lastLoginDate?: { start?: Date; end?: Date };
    skillsInclude?: string[];
    skillsExclude?: string[];
    location?: string[];
    company?: string[];
    isActive?: boolean;
    isVerified?: boolean;
  };
  userCount: number;
  lastUpdated: Date;
  createdAt: Date;
  createdBy: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  template: string;
  targetSegments: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduledAt?: Date;
  sentAt?: Date;
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
  bounceRate?: number;
  unsubscribeRate?: number;
  createdAt: Date;
  createdBy: string;
  metadata?: {
    previewUrl?: string;
    trackingEnabled?: boolean;
    [key: string]: any;
  };
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers?: string[];
  targetSegments?: string[];
  environment: 'development' | 'staging' | 'production';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata?: {
    experimentId?: string;
    variants?: Array<{
      key: string;
      name: string;
      percentage: number;
    }>;
    [key: string]: any;
  };
}

export interface AdminUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'admin' | 'moderator';
  permissions: AdminPermission[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata?: {
    department?: string;
    phoneNumber?: string;
    timezone?: string;
    [key: string]: any;
  };
}

export type AdminPermission =
  | 'users.view'
  | 'users.edit'
  | 'users.delete'
  | 'users.assign_roles'
  | 'content.moderate'
  | 'content.approve'
  | 'content.delete'
  | 'analytics.view'
  | 'analytics.export'
  | 'settings.view'
  | 'settings.edit'
  | 'backups.create'
  | 'backups.restore'
  | 'backups.delete'
  | 'campaigns.create'
  | 'campaigns.send'
  | 'features.toggle'
  | 'system.maintenance';

export interface AdminAuditLog extends AdminActivity {
  // Extends AdminActivity with additional audit-specific fields
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceCategory?: string;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod?: number; // in days
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  users: {
    online: number;
    activeInLast24h: number;
    activeInLastWeek: number;
  };
}

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
  recipientId: string;
  metadata?: {
    source?: string;
    category?: string;
    [key: string]: any;
  };
}

// Directory management types
import type { MemberStatus } from './member';

export interface DirectoryManagementFilters extends UserManagementFilters {
  status: MemberStatus | 'all';
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;
  graduationYearRange?: { min: number; max: number };
  hasCompletedProfile: boolean | null;
  exportFormat?: 'csv' | 'json' | 'google-sheets';
}

export interface DirectoryStats {
  totalMembers: number;
  byStatus: Record<MemberStatus, number>;
  newThisMonth: number;
  pendingApproval: number;
  recentlyActive: number;
  dormant: number;
  profileCompleteness: {
    complete: number;
    partial: number;
    minimal: number;
  };
}

export type AdminDirectoryAction =
  | 'approve_member'
  | 'suspend_member'
  | 'activate_member'
  | 'deactivate_member'
  | 'mark_alumni'
  | 'bulk_status_change'
  | 'export_directory'
  | 'send_reactivation_email';

// All types are exported individually above
// Use named imports: import type { AdminDashboardStats, UserManagementFilters } from './admin';
