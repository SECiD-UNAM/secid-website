/**
 * Company Type Definitions
 * Types for the companies collection feature — employer profiles
 * linked to member work history via email domain matching.
 */

export interface Company {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
  memberCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  pendingReview: boolean;
  lastReviewedBy?: string;
  lastReviewedAt?: Date;
}

export interface CompanyCreateInput {
  name: string;
  domain: string;
  logoUrl?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
}

export interface CompanyUpdateInput {
  name?: string;
  domain?: string;
  logoUrl?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
}
