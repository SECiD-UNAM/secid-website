/**
 * Member inscription survey types.
 * See docs/specs/member-inscription-survey.md
 */

import type { AcademicLevel } from './user';

export type IndustryCategory =
  | 'tech'
  | 'finance'
  | 'consulting'
  | 'academia'
  | 'healthcare'
  | 'retail'
  | 'consumer'
  | 'energy'
  | 'government'
  | 'manufacturing'
  | 'media'
  | 'fintech'
  | 'biotech'
  | 'logistics'
  | 'gaming'
  | 'other';

export type JobFunction =
  | 'data-scientist'
  | 'ml-engineer'
  | 'data-engineer'
  | 'data-analyst'
  | 'research'
  | 'product-manager'
  | 'engineering-manager'
  | 'founder'
  | 'consultant'
  | 'student'
  | 'other';

export type SeniorityLevel =
  | 'student'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'director'
  | 'vp'
  | 'c-level';

export type WorkMode = 'remote' | 'hybrid' | 'on-site';

export type AreaOfInterest =
  | 'ml'
  | 'dl'
  | 'nlp'
  | 'cv'
  | 'rl'
  | 'gen-ai'
  | 'mlops'
  | 'data-eng'
  | 'analytics'
  | 'bi'
  | 'statistics'
  | 'research'
  | 'ethics'
  | 'product'
  | 'leadership';

export type TechTool =
  | 'python'
  | 'r'
  | 'sql'
  | 'scala'
  | 'java'
  | 'rust'
  | 'go'
  | 'spark'
  | 'kafka'
  | 'airflow'
  | 'dbt'
  | 'snowflake'
  | 'bigquery'
  | 'tensorflow'
  | 'pytorch'
  | 'sklearn'
  | 'transformers'
  | 'langchain'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'docker'
  | 'kubernetes'
  | 'terraform'
  | 'tableau'
  | 'power-bi'
  | 'looker';

export type MentorshipRole =
  | 'want-mentor'
  | 'want-mentee'
  | 'both'
  | 'neither';

export type OpenToOpportunities = 'actively-looking' | 'open' | 'not-looking';

export type ReasonForJoining =
  | 'networking'
  | 'job-opportunities'
  | 'stay-updated'
  | 'learning'
  | 'mentorship'
  | 'speaking'
  | 'recruiting'
  | 'community-building';

export type HeardAboutUsFrom =
  | 'unam'
  | 'friend'
  | 'event'
  | 'social'
  | 'search'
  | 'other';

export type SalaryBucket =
  | '<10k'
  | '10-20k'
  | '20-35k'
  | '35-50k'
  | '50-75k'
  | '75-100k'
  | '100k+';

export type SurveyVisibility =
  | 'public'
  | 'members'
  | 'private'
  | 'aggregate-only';

/**
 * Full member survey response, stored at /member_surveys/{uid}.
 * All fields except uid/version/visibility/createdAt/updatedAt are optional;
 * members can fill in as much or as little as they want.
 */
export interface MemberSurveyResponse {
  uid: string;
  version: number;
  createdAt: unknown; // Firestore Timestamp or Date
  updatedAt: unknown;
  completedAt?: unknown; // null until member finishes the first pass
  visibility: SurveyVisibility;

  // Demographic
  generation?: string;
  academicLevel?: AcademicLevel;

  // Career
  industry?: IndustryCategory;
  jobFunction?: JobFunction;
  seniority?: SeniorityLevel;
  workMode?: WorkMode;
  yearsOfExperience?: number;
  countryCode?: string;
  city?: string;

  // Interests & skills
  areasOfInterest?: AreaOfInterest[];
  techStack?: TechTool[];
  toolProficiency?: Partial<Record<TechTool, number>>;

  // Community engagement
  mentorshipRole?: MentorshipRole;
  openToOpportunities?: OpenToOpportunities;
  reasonsForJoining?: ReasonForJoining[];
  heardAboutUsFrom?: HeardAboutUsFrom;

  // Optional sensitive
  salaryRange?: SalaryBucket;
  remoteAvailability?: boolean;
  freelanceAvailability?: boolean;

  // Ad-hoc, evolves with survey_config
  customAnswers?: Record<string, string | string[] | number | boolean>;
}

/**
 * Input shape for survey mutations — everything optional except visibility.
 */
export type SurveyInput = Partial<
  Omit<MemberSurveyResponse, 'uid' | 'version' | 'createdAt' | 'updatedAt'>
> & {
  visibility?: SurveyVisibility;
};

/**
 * Pre-computed aggregate counts at /survey_aggregates/global (and dated docs).
 * Aggregator collapses buckets with count < K_ANONYMITY_THRESHOLD into 'other'.
 */
export interface SurveyAggregates {
  totalRespondents: number;
  totalCompleted: number;
  totalFallbackUsers?: number;
  kAnonymityThreshold: number;

  byIndustry: Record<IndustryCategory | 'other', number>;
  bySeniority: Record<SeniorityLevel, number>;
  byJobFunction: Record<JobFunction, number>;
  byWorkMode: Record<WorkMode, number>;
  byGeneration: Record<string, number>;
  byCountry: Record<string, number>;
  byAreaOfInterest: Record<AreaOfInterest, number>;
  byTechStack: Record<TechTool, number>;
  byMentorship: Record<MentorshipRole, number>;
  byOpenToOpportunities: Record<OpenToOpportunities, number>;
  byReasonsForJoining: Record<ReasonForJoining, number>;
  byAcademicLevel: Record<AcademicLevel, number>;

  updatedAt: unknown;
  generatedFrom: 'survey' | 'user-profile-fallback' | 'mixed';
}

export const K_ANONYMITY_THRESHOLD = 5;
export const SURVEY_CURRENT_VERSION = 1;
