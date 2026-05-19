import { z } from 'zod';
import { CommonSchemas } from './validation-utils';
import { EducationLevels, ExperienceLevels } from './user-schemas';

/**
 * Profile validation schemas for SECiD platform
 * Handles user profile management, settings, and preferences
 */

/**
 * Profile visibility options
 */
export const ProfileVisibility = ['public', 'members_only', 'private'] as const;
export type ProfileVisibilityType = (typeof ProfileVisibility)[number];

/**
 * Social media platforms
 */
export const SocialPlatforms = [
  'linkedin',
  'github',
  'twitter',
  'instagram',
  'facebook',
  'youtube',
  'website',
  'portfolio',
  'blog',
] as const;
export type SocialPlatform = (typeof SocialPlatforms)[number];

/**
 * Language proficiency levels
 */
export const LanguageLevels = [
  'basic',
  'intermediate',
  'advanced',
  'fluent',
  'native',
] as const;
export type LanguageLevel = (typeof LanguageLevels)[number];

/**
 * Profile completion schema
 */
export const ProfileCompletionSchema = z.object({
  basicInfo: z.boolean().default(false),
  education: z.boolean().default(false),
  experience: z.boolean().default(false),
  skills: z.boolean().default(false),
  socialMedia: z.boolean().default(false),
  preferences: z.boolean().default(false),
  photo: z.boolean().default(false),
  bio: z.boolean().default(false),
  completionPercentage: z.number().min(0).max(100).default(0),
});

/**
 * Professional experience schema
 */
export const ProfessionalExperienceSchema = z
  .object({
    company: CommonSchemas.nonEmptyString(2, 100),
    position: CommonSchemas.nonEmptyString(2, 100),
    description: CommonSchemas.nonEmptyString(20, 2000).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format')
      .optional(),
    isCurrent: z.boolean().default(false),
    location: CommonSchemas.nonEmptyString(3, 100).optional(),
    website: CommonSchemas.url.optional(),
    skills: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(2, 50),
      0,
      15
    ).optional(),
    achievements: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(10, 300),
      0,
      10
    ).optional(),
  })
  .refine(
    (data) => {
      if (!data.isCurrent && !data['endDate']) {
        return false;
      }
      if (data['isCurrent'] && data['endDate']) {
        return false;
      }
      if (data['endDate'] && data['startDate'] >= data['endDate']) {
        return false;
      }
      return true;
    },
    {
      message:
        'End date must be after start date, or position must be marked as current',
      path: ['endDate'],
    }
  );

/**
 * Education schema
 */
export const EducationSchema = z
  .object({
    institution: CommonSchemas.nonEmptyString(3, 150),
    degree: CommonSchemas.nonEmptyString(3, 100),
    fieldOfStudy: CommonSchemas.nonEmptyString(3, 100),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format')
      .optional(),
    isCurrent: z.boolean().default(false),
    gpa: z.number().min(0).max(10).optional(),
    description: CommonSchemas.nonEmptyString(20, 1000).optional(),
    location: CommonSchemas.nonEmptyString(3, 100).optional(),
    website: CommonSchemas.url.optional(),
    achievements: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(10, 300),
      0,
      10
    ).optional(),
  })
  .refine(
    (data) => {
      if (!data.isCurrent && !data['endDate']) {
        return false;
      }
      if (data['isCurrent'] && data['endDate']) {
        return false;
      }
      if (data['endDate'] && data['startDate'] >= data['endDate']) {
        return false;
      }
      return true;
    },
    {
      message:
        'End date must be after start date, or education must be marked as current',
      path: ['endDate'],
    }
  );

/**
 * Certification schema
 */
export const CertificationSchema = z
  .object({
    name: CommonSchemas.nonEmptyString(3, 150),
    issuer: CommonSchemas.nonEmptyString(3, 100),
    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format'),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format')
      .optional(),
    credentialId: CommonSchemas.nonEmptyString(3, 100).optional(),
    credentialUrl: CommonSchemas.url.optional(),
    description: CommonSchemas.nonEmptyString(10, 500).optional(),
    skills: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(2, 50),
      0,
      10
    ).optional(),
  })
  .refine(
    (data) => {
      if (data.expiryDate && data['issueDate'] >= data['expiryDate']) {
        return false;
      }
      return true;
    },
    {
      message: 'Expiry date must be after issue date',
      path: ['expiryDate'],
    }
  );

/**
 * Project schema
 */
export const ProjectSchema = z
  .object({
    name: CommonSchemas.nonEmptyString(3, 100),
    description: CommonSchemas.nonEmptyString(20, 2000),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format')
      .optional(),
    isCurrent: z.boolean().default(false),
    role: CommonSchemas.nonEmptyString(3, 100).optional(),
    technologies: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(2, 50),
      0,
      20
    ).optional(),
    teamSize: z.number().min(1).max(100).optional(),
    projectUrl: CommonSchemas.url.optional(),
    githubUrl: CommonSchemas.url.optional(),
    demoUrl: CommonSchemas.url.optional(),
    images: CommonSchemas.boundedArray(CommonSchemas.url, 0, 5).optional(),
    achievements: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(10, 300),
      0,
      10
    ).optional(),
  })
  .refine(
    (data) => {
      if (!data.isCurrent && !data['endDate']) {
        return false;
      }
      if (data['isCurrent'] && data['endDate']) {
        return false;
      }
      if (data['endDate'] && data['startDate'] >= data['endDate']) {
        return false;
      }
      return true;
    },
    {
      message:
        'End date must be after start date, or project must be marked as current',
      path: ['endDate'],
    }
  );

/**
 * Language schema
 */
export const LanguageSchema = z.object({
  language: CommonSchemas.nonEmptyString(2, 50),
  proficiency: CommonSchemas.enumValue(LanguageLevels),
  certifications: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(3, 100),
    0,
    5
  ).optional(),
});

/**
 * Skill category schema
 */
export const SkillCategorySchema = z.object({
  category: CommonSchemas.nonEmptyString(3, 50),
  skills: CommonSchemas.boundedArray(
    z.object({
      name: CommonSchemas.nonEmptyString(2, 50),
      level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      yearsOfExperience: z.number().min(0).max(50).optional(),
      endorsements: z.number().min(0).default(0),
    }),
    1,
    20
  ),
});

/**
 * Social media profile schema
 */
export const SocialMediaProfileSchema = z.object({
  platform: CommonSchemas.enumValue(SocialPlatforms),
  url: CommonSchemas.url,
  username: CommonSchemas.nonEmptyString(1, 50).optional(),
  isVisible: z.boolean().default(true),
});

/**
 * Complete profile schema
 */
export const CompleteProfileSchema = z.object({
  // Basic information
  firstName: CommonSchemas.nonEmptyString(2, 50).regex(
    /^[a-zA-ZÀ-ÿ\s]+$/,
    'First name can only contain letters and spaces'
  ),
  lastName: CommonSchemas.nonEmptyString(2, 50).regex(
    /^[a-zA-ZÀ-ÿ\s]+$/,
    'Last name can only contain letters and spaces'
  ),
  headline: CommonSchemas.nonEmptyString(10, 120).optional(),
  bio: CommonSchemas.nonEmptyString(50, 2000).optional(),

  // Profile settings
  visibility:
    CommonSchemas.enumValue(ProfileVisibility).default('members_only'),
  profilePhoto: CommonSchemas.url.optional(),
  coverPhoto: CommonSchemas.url.optional(),

  // Contact information
  email: CommonSchemas.email,
  phone: CommonSchemas.phone,
  website: CommonSchemas.url.optional(),

  // Location
  country: CommonSchemas.nonEmptyString(2, 60).optional(),
  state: CommonSchemas.nonEmptyString(2, 60).optional(),
  city: CommonSchemas.nonEmptyString(2, 60).optional(),
  timezone: CommonSchemas.nonEmptyString(3, 50).optional(),

  // Professional information
  currentTitle: CommonSchemas.nonEmptyString(2, 100).optional(),
  currentCompany: CommonSchemas.nonEmptyString(2, 100).optional(),
  education: CommonSchemas.enumValue(EducationLevels).optional(),
  experienceLevel: CommonSchemas.enumValue(ExperienceLevels).optional(),

  // Detailed sections
  experience: CommonSchemas.boundedArray(
    ProfessionalExperienceSchema,
    0,
    10
  ).optional(),
  educationHistory: CommonSchemas.boundedArray(
    EducationSchema,
    0,
    5
  ).optional(),
  certifications: CommonSchemas.boundedArray(
    CertificationSchema,
    0,
    20
  ).optional(),
  projects: CommonSchemas.boundedArray(ProjectSchema, 0, 15).optional(),
  languages: CommonSchemas.boundedArray(LanguageSchema, 0, 10).optional(),
  skillCategories: CommonSchemas.boundedArray(
    SkillCategorySchema,
    0,
    10
  ).optional(),
  socialMedia: CommonSchemas.boundedArray(
    SocialMediaProfileSchema,
    0,
    9
  ).optional(),

  // Preferences and availability
  openToWork: z.boolean().default(false),
  openToMentoring: z.boolean().default(false),
  openToBeingMentored: z.boolean().default(false),
  availableForFreelance: z.boolean().default(false),
  availableForConsulting: z.boolean().default(false),

  // Interests and goals
  interests: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 50),
    0,
    20
  ).optional(),
  careerGoals: CommonSchemas.nonEmptyString(20, 1000).optional(),
  lookingFor: CommonSchemas.boundedArray(
    z.enum([
      'job_opportunities',
      'networking',
      'mentorship',
      'collaboration',
      'learning',
      'speaking_opportunities',
      'investment',
      'cofounders',
    ]),
    0,
    8
  ).optional(),

  // Privacy settings
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  allowDirectMessages: z.boolean().default(true),
  allowEndorsements: z.boolean().default(true),
  showConnectionCount: z.boolean().default(true),

  // Completion tracking
  profileCompletion: ProfileCompletionSchema.optional(),
});

/**
 * Profile update schema (partial updates)
 */
export const ProfileUpdateSchema = CompleteProfileSchema.partial();

/**
 * Profile search schema
 */
export const ProfileSearchSchema = z.object({
  query: CommonSchemas.nonEmptyString(1, 100).optional(),
  skills: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 50),
    0,
    10
  ).optional(),
  experienceLevel: CommonSchemas.enumValue(ExperienceLevels).optional(),
  education: CommonSchemas.enumValue(EducationLevels).optional(),
  country: CommonSchemas.nonEmptyString(2, 60).optional(),
  city: CommonSchemas.nonEmptyString(2, 60).optional(),
  openToWork: z.boolean().optional(),
  openToMentoring: z.boolean().optional(),
  availableForFreelance: z.boolean().optional(),
  company: CommonSchemas.nonEmptyString(2, 100).optional(),
  languages: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 50),
    0,
    5
  ).optional(),
  lookingFor: CommonSchemas.boundedArray(
    z.enum([
      'job_opportunities',
      'networking',
      'mentorship',
      'collaboration',
      'learning',
      'speaking_opportunities',
      'investment',
      'cofounders',
    ]),
    0,
    5
  ).optional(),
});

/**
 * Profile privacy settings schema
 */
export const ProfilePrivacySettingsSchema = z.object({
  visibility: CommonSchemas.enumValue(ProfileVisibility),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  showExperience: z.boolean().default(true),
  showEducation: z.boolean().default(true),
  showSkills: z.boolean().default(true),
  showProjects: z.boolean().default(true),
  showSocialMedia: z.boolean().default(true),
  allowDirectMessages: z.boolean(),
  allowEndorsements: z.boolean(),
  allowProfileViews: z.boolean().default(true),
  showConnectionCount: z.boolean(),
  showLastActive: z.boolean().default(false),
});

/**
 * Profile notification settings schema
 */
export const ProfileNotificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),

  // Specific notification types
  connectionRequests: z.boolean().default(true),
  messages: z.boolean().default(true),
  endorsements: z.boolean().default(true),
  profileViews: z.boolean().default(false),
  jobAlerts: z.boolean().default(true),
  eventInvites: z.boolean().default(true),
  mentorshipRequests: z.boolean().default(true),
  weeklyDigest: z.boolean().default(true),
  monthlyNewsletter: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  productUpdates: z.boolean().default(true),
  securityAlerts: z.boolean().default(true),
});

/**
 * Export type definitions
 */
export type CompleteProfile = z.infer<typeof CompleteProfileSchema>;
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
export type ProfileSearch = z.infer<typeof ProfileSearchSchema>;
export type ProfilePrivacySettings = z.infer<
  typeof ProfilePrivacySettingsSchema
>;
export type ProfileNotificationSettings = z.infer<
  typeof ProfileNotificationSettingsSchema
>;
export type ProfessionalExperience = z.infer<
  typeof ProfessionalExperienceSchema
>;
export type Education = z.infer<typeof EducationSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type SocialMediaProfile = z.infer<typeof SocialMediaProfileSchema>;
export type ProfileCompletion = z.infer<typeof ProfileCompletionSchema>;
