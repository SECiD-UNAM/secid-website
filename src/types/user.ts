/**
 * User Type Definitions
 */

export interface UserProfile {
  email: string;
  role: 'member' | 'admin' | 'moderator';
  createdAt: Date;
  profile: {
    firstName: string;
    lastName: string;
    bio: string;
    company: string;
    position: string;
    location: string;
    linkedin: string;
    skills: string[];
    photoURL?: string;
    graduationYear?: number;
    degree?: string;
    specialization?: string;
  };
  settings?: {
    emailNotifications: boolean;
    profileVisibility: 'public' | 'members' | 'private';
    language: 'es' | 'en';
  };
  // Authentication & Security
  twoFactor?: TwoFactorSettings;
  linkedAccounts?: LinkedAccount[];
  lastLogin?: Date;
  lastLoginProvider?: string;
  securityEvents?: SecurityEvent[];
}

export interface UserBasicInfo {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
}

// ===== OAuth & Social Login Types =====

export type SupportedProvider = 'google' | 'github' | 'linkedin';

export interface LinkedAccount {
  providerId: SupportedProvider;
  email: string;
  displayName: string;
  photoURL?: string;
  linkedAt: Date;
}

export interface OAuthUserInfo {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerId: SupportedProvider;
  accessToken?: string;
  refreshToken?: string;
}

export interface ProviderConfig {
  id: SupportedProvider;
  name: string;
  enabled: boolean;
  clientId?: string;
  scopes: string[];
}

// ===== Two-Factor Authentication Types =====

export interface TwoFactorSettings {
  isEnabled: boolean;
  secret?: string;
  backupCodes?: BackupCode[];
  setupAt?: Date;
  enabledAt?: Date;
  disabledAt?: Date;
  backupCodesRegeneratedAt?: Date;
}

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  isEnabled: boolean;
  setupAt?: Date;
}

export interface TwoFactorSession {
  uid: string;
  sessionId: string;
  expiresAt: Date;
  isVerified: boolean;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  verifiedAt?: Date;
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  hasBackupCodes: boolean;
  unusedBackupCodes: number;
}

// ===== Authentication Types =====

export interface AuthResult {
  user: UserBasicInfo;
  isNewUser: boolean;
  requiresTwoFactor?: boolean;
  sessionId?: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  provider: string;
  success: boolean;
  failureReason?: string;
  twoFactorRequired?: boolean;
}

export interface SecurityEvent {
  id: string;
  type:
    | 'login'
    | 'logout'
    | 'password_change'
    | '2fa_enabled'
    | '2fa_disabled'
    | 'provider_linked'
    | 'provider_unlinked'
    | 'suspicious_activity';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActiveSession {
  id: string;
  uid: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress: string;
  location?: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  current: boolean;
  expiresAt?: Date;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge?: number; // days
  preventReuse?: number; // number of previous passwords to check
}

export interface AccountSecuritySettings {
  passwordPolicy: PasswordPolicy;
  twoFactorRequired: boolean;
  sessionTimeout: number; // minutes
  maxActiveSessions: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}

// ===== Password Strength Types =====

export interface PasswordStrength {
  score: number; // 0-5
  label: string;
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  suggestions: string[];
}

export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  errors: string[];
  warnings: string[];
}

// ===== Account Recovery Types =====

export interface RecoveryMethod {
  type: 'email' | 'phone' | 'backup_codes' | 'trusted_device';
  value: string;
  verified: boolean;
  primary: boolean;
  addedAt: Date;
}

export interface AccountRecoveryRequest {
  id: string;
  userId: string;
  method: RecoveryMethod['type'];
  token: string;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  ipAddress: string;
  userAgent: string;
}

// ===== User Preferences & Settings =====

export interface UserSecurityPreferences {
  loginNotifications: boolean;
  newDeviceAlerts: boolean;
  passwordChangeNotifications: boolean;
  twoFactorBackupReminders: boolean;
  securityEventEmails: boolean;
  weeklySecuritySummary: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'members' | 'private';
  showEmail: boolean;
  showLocation: boolean;
  showSocialLinks: boolean;
  allowDirectMessages: boolean;
  allowEventInvitations: boolean;
  allowJobNotifications: boolean;
  searchable: boolean;
}

// ===== Extended User Profile =====

export interface ExtendedUserProfile extends UserProfile {
  securityPreferences?: UserSecurityPreferences;
  privacySettings?: PrivacySettings;
  recoveryMethods?: RecoveryMethod[];
  activeSessions?: ActiveSession[];
  recentLoginAttempts?: LoginAttempt[];
  accountSecuritySettings?: AccountSecuritySettings;
}
