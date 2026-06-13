import { z } from 'zod';
import { CommonSchemas } from './validation-utils';

/**
 * User validation schemas for SECiD platform
 * Handles user registration, authentication, and profile validation
 */

/**
 * User roles enum
 */
export const UserRoles = ['member', 'admin', 'moderator', 'mentor'] as const;
export type UserRole = (typeof UserRoles)[number];

/**
 * User status enum
 */
export const UserStatuses = [
  'active',
  'inactive',
  'pending',
  'suspended',
  'banned',
] as const;
export type UserStatus = (typeof UserStatuses)[number];

/**
 * Education levels
 */
export const EducationLevels = [
  'bachelor',
  'master',
  'phd',
  'postdoc',
  'bootcamp',
  'self-taught',
  'other',
] as const;
export type EducationLevel = (typeof EducationLevels)[number];

/**
 * Experience levels
 */
export const ExperienceLevels = [
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'manager',
  'director',
  'executive',
] as const;
export type ExperienceLevel = (typeof ExperienceLevels)[number];

/**
 * User registration schema
 */
export const UserRegistrationSchema = z
  .object({
    // Basic information
    email: CommonSchemas.email,
    password: CommonSchemas.password,
    confirmPassword: z.string(),

    // Personal information
    firstName: CommonSchemas.nonEmptyString(2, 50).regex(
      /^[a-zA-ZÀ-ÿ\s]+$/,
      'First name can only contain letters and spaces'
    ),
    lastName: CommonSchemas.nonEmptyString(2, 50).regex(
      /^[a-zA-ZÀ-ÿ\s]+$/,
      'Last name can only contain letters and spaces'
    ),

    // Optional fields
    phone: CommonSchemas.phone,
    dateOfBirth: z.string().datetime().optional(),

    // Professional information
    currentTitle: CommonSchemas.nonEmptyString(2, 100).optional(),
    company: CommonSchemas.nonEmptyString(2, 100).optional(),
    education: CommonSchemas.enumValue(EducationLevels).optional(),
    experienceLevel: CommonSchemas.enumValue(ExperienceLevels).optional(),
    graduationYear: z
      .number()
      .min(1950)
      .max(new Date().getFullYear() + 10)
      .optional(),

    // Skills and interests
    skills: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(2, 50),
      0,
      20
    ).optional(),
    interests: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(2, 50),
      0,
      10
    ).optional(),

    // Location
    country: CommonSchemas.nonEmptyString(2, 60).optional(),
    city: CommonSchemas.nonEmptyString(2, 60).optional(),

    // Social media
    linkedinUrl: CommonSchemas.url,
    githubUrl: CommonSchemas.url,
    portfolioUrl: CommonSchemas.url,

    // Agreement fields
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
    agreeToPrivacy: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the privacy policy',
    }),
    allowMarketing: z.boolean().default(false),

    // CAPTCHA
    captchaToken: CommonSchemas.nonEmptyString(1, 2000),
  })
  .refine((data) => data.password === data['confirmPassword'], {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

/**
 * User login schema
 */
export const UserLoginSchema = z.object({
  email: CommonSchemas['email'],
  password: CommonSchemas.nonEmptyString(1, 128),
  rememberMe: z.boolean().default(false),
  captchaToken: CommonSchemas.nonEmptyString(1, 2000).optional(),
});

/**
 * Password reset request schema
 */
export const PasswordResetRequestSchema = z.object({
  email: CommonSchemas.email,
  captchaToken: CommonSchemas.nonEmptyString(1, 2000),
});

/**
 * Password reset schema
 */
export const PasswordResetSchema = z
  .object({
    token: CommonSchemas.nonEmptyString(10, 500),
    newPassword: CommonSchemas.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data['newPassword'] === data['confirmPassword'], {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

/**
 * Email verification schema
 */
export const EmailVerificationSchema = z.object({
  token: CommonSchemas.nonEmptyString(10, 500),
  email: CommonSchemas['email'],
});

/**
 * Change password schema (for authenticated users)
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: CommonSchemas.nonEmptyString(1, 128),
    newPassword: CommonSchemas.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data['confirmPassword'], {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data['currentPassword'] !== data['newPassword'], {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/**
 * Change email schema
 */
export const ChangeEmailSchema = z.object({
  newEmail: CommonSchemas['email'],
  password: CommonSchemas.nonEmptyString(1, 128),
  captchaToken: CommonSchemas.nonEmptyString(1, 2000),
});

/**
 * User profile update schema
 */
export const UserProfileUpdateSchema = z.object({
  // Personal information
  firstName: CommonSchemas.nonEmptyString(2, 50)
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'First name can only contain letters and spaces')
    .optional(),
  lastName: CommonSchemas.nonEmptyString(2, 50)
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Last name can only contain letters and spaces')
    .optional(),

  phone: CommonSchemas.phone,
  dateOfBirth: z.string().datetime().optional(),

  // Professional information
  currentTitle: CommonSchemas.nonEmptyString(2, 100).optional(),
  company: CommonSchemas.nonEmptyString(2, 100).optional(),
  education: CommonSchemas.enumValue(EducationLevels).optional(),
  experienceLevel: CommonSchemas.enumValue(ExperienceLevels).optional(),
  graduationYear: z
    .number()
    .min(1950)
    .max(new Date().getFullYear() + 10)
    .optional(),

  // Bio and description
  bio: CommonSchemas.nonEmptyString(10, 1000).optional(),

  // Skills and interests
  skills: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 50),
    0,
    20
  ).optional(),
  interests: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 50),
    0,
    10
  ).optional(),

  // Location
  country: CommonSchemas.nonEmptyString(2, 60).optional(),
  city: CommonSchemas.nonEmptyString(2, 60).optional(),

  // Social media
  linkedinUrl: CommonSchemas.url,
  githubUrl: CommonSchemas.url,
  portfolioUrl: CommonSchemas.url,
  twitterUrl: CommonSchemas.url,

  // Privacy settings
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  allowDirectMessages: z.boolean().default(true),
  allowMentorship: z.boolean().default(false),

  // Notification preferences
  emailNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  jobAlerts: z.boolean().default(true),
  eventNotifications: z.boolean().default(true),
});

/**
 * Admin user creation schema
 */
export const AdminUserCreationSchema = UserRegistrationSchema.extend({
  role: CommonSchemas.enumValue(UserRoles),
  status: CommonSchemas.enumValue(UserStatuses),
  isVerified: z.boolean().default(false),
  skipEmailVerification: z.boolean().default(false),
}).omit({
  password: true,
  confirmPassword: true,
  agreeToTerms: true,
  agreeToPrivacy: true,
  captchaToken: true,
});

/**
 * User search/filter schema
 */
export const UserSearchSchema = z.object({
  query: CommonSchemas.nonEmptyString(1, 100).optional(),
  role: CommonSchemas.enumValue(UserRoles).optional(),
  status: CommonSchemas.enumValue(UserStatuses).optional(),
  education: CommonSchemas.enumValue(EducationLevels).optional(),
  experienceLevel: CommonSchemas.enumValue(ExperienceLevels).optional(),
  skills: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(1, 50),
    0,
    10
  ).optional(),
  country: CommonSchemas.nonEmptyString(2, 60).optional(),
  city: CommonSchemas.nonEmptyString(2, 60).optional(),
  isVerified: z.boolean().optional(),
  joinedAfter: z.string().datetime().optional(),
  joinedBefore: z.string().datetime().optional(),
});

/**
 * User invite schema
 */
export const UserInviteSchema = z.object({
  email: CommonSchemas.email,
  role: CommonSchemas.enumValue(UserRoles).default('member'),
  message: CommonSchemas.nonEmptyString(10, 500).optional(),
  expiresIn: z.number().min(1).max(30).default(7), // days
});

/**
 * Bulk user operation schema
 */
export const BulkUserOperationSchema = z.object({
  userIds: CommonSchemas.boundedArray(CommonSchemas.uuid, 1, 100),
  operation: z.enum(['activate', 'deactivate', 'delete', 'verify', 'unverify']),
  reason: CommonSchemas.nonEmptyString(5, 200).optional(),
});

/**
 * User report schema
 */
export const UserReportSchema = z.object({
  reportedUserId: CommonSchemas.uuid,
  reason: z.enum([
    'inappropriate_content',
    'harassment',
    'spam',
    'fake_profile',
    'copyright_violation',
    'other',
  ]),
  description: CommonSchemas.nonEmptyString(10, 1000),
  evidence: CommonSchemas.boundedArray(CommonSchemas.url, 0, 5).optional(),
});

/**
 * Export type definitions
 */
export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordReset = z.infer<typeof PasswordResetSchema>;
export type EmailVerification = z.infer<typeof EmailVerificationSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type ChangeEmail = z.infer<typeof ChangeEmailSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
export type AdminUserCreation = z.infer<typeof AdminUserCreationSchema>;
export type UserSearch = z.infer<typeof UserSearchSchema>;
export type UserInvite = z.infer<typeof UserInviteSchema>;
export type BulkUserOperation = z.infer<typeof BulkUserOperationSchema>;
export type UserReport = z.infer<typeof UserReportSchema>;
