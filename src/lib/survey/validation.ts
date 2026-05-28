/**
 * Zod schemas for client-side survey validation.
 */
import { z } from 'zod';

const industryEnum = z.enum([
  'tech', 'finance', 'consulting', 'academia', 'healthcare',
  'retail', 'consumer', 'energy', 'government', 'manufacturing',
  'media', 'fintech', 'biotech', 'logistics', 'gaming', 'other',
]);

const jobFunctionEnum = z.enum([
  'data-scientist', 'ml-engineer', 'data-engineer', 'data-analyst',
  'research', 'product-manager', 'engineering-manager', 'founder',
  'consultant', 'student', 'other',
]);

const seniorityEnum = z.enum([
  'student', 'junior', 'mid', 'senior', 'lead',
  'manager', 'director', 'vp', 'c-level',
]);

const workModeEnum = z.enum(['remote', 'hybrid', 'on-site']);

const areaEnum = z.enum([
  'ml', 'dl', 'nlp', 'cv', 'rl', 'gen-ai', 'mlops',
  'data-eng', 'analytics', 'bi', 'statistics', 'research',
  'ethics', 'product', 'leadership',
]);

const techEnum = z.enum([
  'python', 'r', 'sql', 'scala', 'java', 'rust', 'go',
  'spark', 'kafka', 'airflow', 'dbt', 'snowflake', 'bigquery',
  'tensorflow', 'pytorch', 'sklearn', 'transformers', 'langchain',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
  'tableau', 'power-bi', 'looker',
]);

const mentorshipEnum = z.enum(['want-mentor', 'want-mentee', 'both', 'neither']);

const opportunitiesEnum = z.enum(['actively-looking', 'open', 'not-looking']);

const reasonsEnum = z.enum([
  'networking', 'job-opportunities', 'stay-updated', 'learning',
  'mentorship', 'speaking', 'recruiting', 'community-building',
]);

const heardEnum = z.enum(['unam', 'friend', 'event', 'social', 'search', 'other']);

const salaryEnum = z.enum([
  '<10k', '10-20k', '20-35k', '35-50k', '50-75k', '75-100k', '100k+',
]);

const visibilityEnum = z.enum(['public', 'members', 'private', 'aggregate-only']);

export const surveyInputSchema = z.object({
  industry: industryEnum.optional(),
  jobFunction: jobFunctionEnum.optional(),
  seniority: seniorityEnum.optional(),
  workMode: workModeEnum.optional(),
  yearsOfExperience: z.number().min(0).max(60).optional(),
  countryCode: z.string().length(2).optional(),
  city: z.string().max(80).optional(),
  areasOfInterest: z.array(areaEnum).max(15).optional(),
  techStack: z.array(techEnum).max(40).optional(),
  toolProficiency: z.record(techEnum, z.number().min(1).max(5)).optional(),
  mentorshipRole: mentorshipEnum.optional(),
  openToOpportunities: opportunitiesEnum.optional(),
  reasonsForJoining: z.array(reasonsEnum).max(10).optional(),
  heardAboutUsFrom: heardEnum.optional(),
  salaryRange: salaryEnum.optional(),
  remoteAvailability: z.boolean().optional(),
  freelanceAvailability: z.boolean().optional(),
  visibility: visibilityEnum.optional(),
  customAnswers: z
    .record(
      z.string(),
      z.union([z.string(), z.array(z.string()), z.number(), z.boolean()])
    )
    .optional(),
});

export type SurveyInputValidated = z.infer<typeof surveyInputSchema>;
