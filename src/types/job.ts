/**
 * Job Type Definitions
 */

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Freelance';
  locationType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary?: {
    min: number;
    max: number;
    currency: 'MXN' | 'USD' | 'EUR';
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  description: string;
  requirements: string[];
  benefits?: string[];
  experienceLevel?:
    | 'entry'
    | 'junior'
    | 'mid'
    | 'senior'
    | 'lead'
    | 'executive';
  industry?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  postedAt: Date;
  postedBy: string;
  updatedAt?: Date;
  deadline?: Date;
  status: 'active' | 'closed' | 'draft';
  isApproved?: boolean;
  views?: number;
  viewCount?: number;
  applications?: number;
  applicationCount?: number;
  tags?: string[];
  companyLogo?: string;
  externalUrl?: string;
  contactEmail?: string;
  featured?: boolean;
  matchScore?: number;
}

export interface JobFormData {
  title: string;
  company: string;
  location: string;
  type: Job['type'];
  locationType: Job['locationType'];
  employmentType: Job['employmentType'];
  salary?: Job['salary'];
  salaryRange?: Job['salaryRange'];
  description: string;
  requirements: string[];
  benefits?: string[];
  experienceLevel?: Job['experienceLevel'];
  industry?: Job['industry'];
  companySize?: Job['companySize'];
  deadline?: Date;
  tags?: string[];
  companyLogo?: string;
  externalUrl?: string;
  contactEmail?: string;
}

export interface FilterState {
  location: string;
  locationType: string[];
  employmentType: string[];
  experienceLevel: string[];
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  postedWithin: string;
  industry: string[];
  companySize: string[];
  benefits: string[];
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  appliedAt: Date;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'accepted';
  coverLetter?: string;
  resumeUrl?: string;
  notes?: string;
}
