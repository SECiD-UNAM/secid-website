import { z } from 'zod';
import { CommonSchemas } from './validation-utils';

/**
 * Job validation schemas for SECiD platform
 * Handles job posting, application, and search validation
 */

/**
 * Job types enum
 */
export const JobTypes = [
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
  'temporary',
  'volunteer',
] as const;
export type JobType = (typeof JobTypes)[number];

/**
 * Remote work options
 */
export const RemoteOptions = [
  'on-site',
  'remote',
  'hybrid',
  'flexible',
] as const;
export type RemoteOption = (typeof RemoteOptions)[number];

/**
 * Experience levels for jobs
 */
export const JobExperienceLevels = [
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'manager',
  'director',
  'executive',
] as const;
export type JobExperienceLevel = (typeof JobExperienceLevels)[number];

/**
 * Job status enum
 */
export const JobStatuses = [
  'draft',
  'active',
  'paused',
  'closed',
  'expired',
  'cancelled',
] as const;
export type JobStatus = (typeof JobStatuses)[number];

/**
 * Application status enum
 */
export const ApplicationStatuses = [
  'submitted',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'interview_completed',
  'offer_extended',
  'hired',
  'rejected',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof ApplicationStatuses)[number];

/**
 * Salary currencies
 */
export const SalaryCurrencies = ['USD', 'MXN', 'EUR', 'CAD', 'GBP'] as const;
export type SalaryCurrency = (typeof SalaryCurrencies)[number];

/**
 * Salary periods
 */
export const SalaryPeriods = [
  'hour',
  'day',
  'week',
  'month',
  'year',
  'project',
] as const;
export type SalaryPeriod = (typeof SalaryPeriods)[number];

/**
 * Job posting schema
 */
export const JobPostingSchema = z
  .object({
    // Basic information
    title: CommonSchemas.nonEmptyString(5, 100),
    company: CommonSchemas.nonEmptyString(2, 100),
    description: CommonSchemas.nonEmptyString(50, 5000),

    // Job details
    type: CommonSchemas.enumValue(JobTypes),
    experienceLevel: CommonSchemas.enumValue(JobExperienceLevels),
    remote: CommonSchemas.enumValue(RemoteOptions),

    // Location
    country: CommonSchemas.nonEmptyString(2, 60),
    state: CommonSchemas.nonEmptyString(2, 60).optional(),
    city: CommonSchemas.nonEmptyString(2, 60),
    address: CommonSchemas.nonEmptyString(5, 200).optional(),

    // Requirements
    requirements: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(3, 200),
      1,
      20
    ),
    skills: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(2, 50),
      1,
      30
    ),
    education: CommonSchemas.nonEmptyString(5, 200).optional(),
    certifications: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(3, 100),
      0,
      10
    ).optional(),

    // Compensation
    salaryMin: z.number().min(0).max(10000000).optional(),
    salaryMax: z.number().min(0).max(10000000).optional(),
    salaryCurrency: CommonSchemas.enumValue(SalaryCurrencies).default('USD'),
    salaryPeriod: CommonSchemas.enumValue(SalaryPeriods).default('year'),
    salaryIsNegotiable: z.boolean().default(false),
    benefits: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(3, 100),
      0,
      15
    ).optional(),

    // Application details
    applicationDeadline: z.string().datetime().optional(),
    applicationInstructions: CommonSchemas.nonEmptyString(10, 1000).optional(),
    contactEmail: CommonSchemas.email,
    contactPhone: CommonSchemas.phone,
    applicationUrl: CommonSchemas.url,

    // Company information
    companyDescription: CommonSchemas.nonEmptyString(50, 2000).optional(),
    companyWebsite: CommonSchemas.url,
    companySize: z
      .enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
      .optional(),
    industry: CommonSchemas.nonEmptyString(2, 50).optional(),

    // Meta information
    isUrgent: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    tags: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(2, 30),
      0,
      10
    ).optional(),

    // CAPTCHA for public posting
    captchaToken: CommonSchemas.nonEmptyString(1, 2000).optional(),
  })
  .refine(
    (data) => {
      if (data.salaryMin && data['salaryMax']) {
        return data['salaryMin'] <= data['salaryMax'];
      }
      return true;
    },
    {
      message: 'Minimum salary cannot be greater than maximum salary',
      path: ['salaryMin'],
    }
  )
  .refine(
    (data) => {
      if (data['applicationDeadline']) {
        return new Date(data['applicationDeadline']) > new Date();
      }
      return true;
    },
    {
      message: 'Application deadline must be in the future',
      path: ['applicationDeadline'],
    }
  );

/**
 * Job update schema (for editing existing jobs)
 */
export const JobUpdateSchema = JobPostingSchema.omit({
  captchaToken: true,
})
  .extend({
    status: CommonSchemas.enumValue(JobStatuses).optional(),
  })
  .partial();

/**
 * Job application schema
 */
export const JobApplicationSchema = z
  .object({
    jobId: CommonSchemas.objectId,

    // Application content
    coverLetter: CommonSchemas.nonEmptyString(50, 2000),
    additionalInfo: CommonSchemas.nonEmptyString(10, 1000).optional(),

    // Resume/CV
    resumeUrl: CommonSchemas.url.optional(),
    portfolioUrl: CommonSchemas.url.optional(),

    // Availability
    availableStartDate: z.string().datetime().optional(),
    expectedSalary: z.number().min(0).max(10000000).optional(),
    salaryCurrency: CommonSchemas.enumValue(SalaryCurrencies).default('USD'),
    salaryPeriod: CommonSchemas.enumValue(SalaryPeriods).default('year'),

    // Questions (dynamic)
    customQuestions: z
      .record(z.string(), CommonSchemas.nonEmptyString(1, 500))
      .optional(),

    // Consent
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the application terms',
    }),
    allowContactByRecruiter: z.boolean().default(true),

    // CAPTCHA
    captchaToken: CommonSchemas.nonEmptyString(1, 2000),
  })
  .refine(
    (data) => {
      if (data.availableStartDate) {
        return new Date(data['availableStartDate']) >= new Date();
      }
      return true;
    },
    {
      message: 'Available start date cannot be in the past',
      path: ['availableStartDate'],
    }
  );

/**
 * Job search schema
 */
export const JobSearchSchema = z.object({
  query: CommonSchemas.nonEmptyString(1, 100).optional(),
  type: CommonSchemas.enumValue(JobTypes).optional(),
  experienceLevel: CommonSchemas.enumValue(JobExperienceLevels).optional(),
  remote: CommonSchemas.enumValue(RemoteOptions).optional(),
  location: CommonSchemas.nonEmptyString(2, 100).optional(),
  country: CommonSchemas.nonEmptyString(2, 60).optional(),
  state: CommonSchemas.nonEmptyString(2, 60).optional(),
  city: CommonSchemas.nonEmptyString(2, 60).optional(),
  skills: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 50),
    0,
    10
  ).optional(),
  company: CommonSchemas.nonEmptyString(2, 100).optional(),
  salaryMin: z.number().min(0).max(10000000).optional(),
  salaryMax: z.number().min(0).max(10000000).optional(),
  salaryCurrency: CommonSchemas.enumValue(SalaryCurrencies).optional(),
  postedAfter: z.string().datetime().optional(),
  postedBefore: z.string().datetime().optional(),
  isUrgent: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  tags: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 30),
    0,
    5
  ).optional(),
});

/**
 * Job application update schema (for recruiters/admins)
 */
export const JobApplicationUpdateSchema = z.object({
  status: CommonSchemas.enumValue(ApplicationStatuses),
  recruiterNotes: CommonSchemas.nonEmptyString(10, 1000).optional(),
  interviewDate: z.string().datetime().optional(),
  feedback: CommonSchemas.nonEmptyString(10, 2000).optional(),
  offerDetails: z
    .object({
      salary: z.number().min(0).max(10000000),
      currency: CommonSchemas.enumValue(SalaryCurrencies),
      period: CommonSchemas.enumValue(SalaryPeriods),
      benefits: CommonSchemas.boundedArray(
        CommonSchemas.nonEmptyString(3, 100),
        0,
        10
      ).optional(),
      startDate: z.string().datetime(),
      terms: CommonSchemas.nonEmptyString(10, 1000).optional(),
    })
    .optional(),
});

/**
 * Job analytics schema
 */
export const JobAnalyticsSchema = z.object({
  jobId: CommonSchemas.objectId,
  views: z.number().min(0).default(0),
  applications: z.number().min(0).default(0),
  saves: z.number().min(0).default(0),
  shares: z.number().min(0).default(0),
  clickThroughs: z.number().min(0).default(0),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
});

/**
 * Job alert schema
 */
export const JobAlertSchema = z.object({
  name: CommonSchemas.nonEmptyString(3, 50),
  searchCriteria: JobSearchSchema,
  frequency: z
    .enum(['immediate', 'daily', 'weekly', 'monthly'])
    .default('weekly'),
  isActive: z.boolean().default(true),
});

/**
 * Job save/bookmark schema
 */
export const JobSaveSchema = z.object({
  jobId: CommonSchemas.objectId,
  notes: CommonSchemas.nonEmptyString(1, 500).optional(),
  tags: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 30),
    0,
    5
  ).optional(),
});

/**
 * Job report schema
 */
export const JobReportSchema = z.object({
  jobId: CommonSchemas.objectId,
  reason: z.enum([
    'inappropriate_content',
    'discriminatory',
    'fake_job',
    'spam',
    'scam',
    'duplicate',
    'misleading_info',
    'other',
  ]),
  description: CommonSchemas.nonEmptyString(10, 1000),
  evidence: CommonSchemas.boundedArray(CommonSchemas.url, 0, 3).optional(),
  captchaToken: CommonSchemas.nonEmptyString(1, 2000),
});

/**
 * Bulk job operations schema
 */
export const BulkJobOperationSchema = z.object({
  jobIds: CommonSchemas.boundedArray(CommonSchemas.objectId, 1, 50),
  operation: z.enum([
    'activate',
    'pause',
    'close',
    'delete',
    'feature',
    'unfeature',
  ]),
  reason: CommonSchemas.nonEmptyString(5, 200).optional(),
});

/**
 * Export type definitions
 */
export type JobPosting = z.infer<typeof JobPostingSchema>;
export type JobUpdate = z.infer<typeof JobUpdateSchema>;
export type JobApplication = z.infer<typeof JobApplicationSchema>;
export type JobSearch = z.infer<typeof JobSearchSchema>;
export type JobApplicationUpdate = z.infer<typeof JobApplicationUpdateSchema>;
export type JobAnalytics = z.infer<typeof JobAnalyticsSchema>;
export type JobAlert = z.infer<typeof JobAlertSchema>;
export type JobSave = z.infer<typeof JobSaveSchema>;
export type JobReport = z.infer<typeof JobReportSchema>;
export type BulkJobOperation = z.infer<typeof BulkJobOperationSchema>;
