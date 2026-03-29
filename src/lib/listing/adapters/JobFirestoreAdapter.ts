// src/lib/listing/adapters/JobFirestoreAdapter.ts
import {
  query,
  collection,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@lib/firebase';
import type { DataAdapter } from './types';
import type { FetchParams, FetchResult } from '../types';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  locationType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  industry?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  description: string;
  requirements: string[];
  benefits?: string[];
  tags: string[];
  postedAt: Date;
  postedBy: string;
  applicationCount: number;
  viewCount: number;
  featured: boolean;
  matchScore?: number;
}

export interface JobFilters {
  location?: string;
  locationType?: string[];
  employmentType?: string[];
  experienceLevel?: string[];
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  postedWithin?: string;
  industry?: string[];
  companySize?: string[];
  benefits?: string[];
}

export interface JobFirestoreAdapterConfig {
  userSkills?: string[];
  pageSize?: number;
}

const MATCH_SORT_FIELD = 'matchScore';
const DEFAULT_PAGE_SIZE = 10;
const POSTED_WITHIN_LIMITS: Record<string, number> = {
  '24h': 1,
  '3d': 3,
  '7d': 7,
  '30d': 30,
};

export class JobFirestoreAdapter implements DataAdapter<Job> {
  private userSkills: string[];

  constructor(config: JobFirestoreAdapterConfig = {}) {
    this.userSkills = config.userSkills ?? [];
  }

  async fetch(params: FetchParams): Promise<FetchResult<Job>> {
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const isMatchSort = params.sort?.field === MATCH_SORT_FIELD;

    // For match score sort, fetch more items and sort client-side
    const fetchSize = isMatchSort ? pageSize * 5 : pageSize + 1;

    const constraints = this.buildFetchConstraints(params, fetchSize, isMatchSort);
    const ref = collection(db, 'jobs');
    const snapshot = await getDocs(query(ref, ...constraints));

    let jobs = snapshot.docs.map((doc) => this.mapDoc(doc.id, doc.data()));

    if (params.query?.trim()) {
      jobs = this.applySearch(jobs, params.query.trim());
    }

    if (params.filters) {
      jobs = this.applyClientFilters(jobs, params.filters as JobFilters);
    }

    if (isMatchSort) {
      jobs = jobs.slice().sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }

    const hasMore = jobs.length > pageSize;
    const paginatedJobs = jobs.slice(0, pageSize);
    const totalCount = await this.getTotalCount(params);

    return {
      items: paginatedJobs,
      totalCount,
      nextCursor: snapshot.docs[snapshot.docs.length - 1] ?? undefined,
      hasMore,
    };
  }

  private mapDoc(id: string, data: Record<string, unknown>): Job {
    const requirements = (data['requirements'] as string[] | null) ?? [];
    return {
      id,
      title: (data['title'] as string) ?? '',
      company: (data['company'] as string) ?? '',
      companyLogo: data['companyLogo'] as string | undefined,
      location: (data['location'] as string) ?? '',
      locationType: (data['locationType'] as Job['locationType']) ?? 'onsite',
      employmentType: (data['employmentType'] as Job['employmentType']) ?? 'full-time',
      experienceLevel: data['experienceLevel'] as Job['experienceLevel'],
      industry: data['industry'] as string | undefined,
      companySize: data['companySize'] as Job['companySize'],
      salaryRange: data['salaryRange'] as Job['salaryRange'],
      description: (data['description'] as string) ?? '',
      requirements,
      benefits: data['benefits'] as string[] | undefined,
      tags: (data['tags'] as string[]) ?? [],
      postedAt: (data['postedAt'] as { toDate: () => Date } | null)?.toDate() ?? new Date(),
      postedBy: (data['postedBy'] as string) ?? '',
      applicationCount: (data['applicationCount'] as number) ?? 0,
      viewCount: (data['viewCount'] as number) ?? 0,
      featured: (data['featured'] as boolean) ?? false,
      matchScore: this.calculateMatchScore(requirements),
    };
  }

  private calculateMatchScore(requirements: string[]): number {
    if (this.userSkills.length === 0 || requirements.length === 0) return 0;
    const matching = this.userSkills.filter((skill) =>
      requirements.some((req) => req.toLowerCase().includes(skill.toLowerCase()))
    );
    return Math.round((matching.length / requirements.length) * 100);
  }

  private buildBaseConstraints(filters: JobFilters | undefined): QueryConstraint[] {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'active'),
      where('isApproved', '==', true),
    ];

    if (!filters) return constraints;

    if (filters.location) {
      constraints.push(where('location', '==', filters.location));
    }
    if (filters.employmentType?.length === 1) {
      constraints.push(where('employmentType', '==', filters.employmentType[0]));
    }
    if (filters.experienceLevel?.length === 1) {
      constraints.push(where('experienceLevel', '==', filters.experienceLevel[0]));
    }
    if (filters.industry?.length === 1) {
      constraints.push(where('industry', '==', filters.industry[0]));
    }
    if (filters.companySize?.length === 1) {
      constraints.push(where('companySize', '==', filters.companySize[0]));
    }

    return constraints;
  }

  private buildFetchConstraints(
    params: FetchParams,
    fetchSize: number,
    skipSort: boolean
  ): QueryConstraint[] {
    const constraints = this.buildBaseConstraints(params.filters as JobFilters | undefined);

    if (!skipSort) {
      const sortField = params.sort?.field;
      const sortDir = params.sort?.direction ?? 'desc';
      constraints.push(
        orderBy(sortField && sortField !== MATCH_SORT_FIELD ? sortField : 'postedAt', sortDir)
      );
    }

    if (params.cursor) {
      constraints.push(startAfter(params.cursor));
    }

    constraints.push(limit(fetchSize));
    return constraints;
  }

  private applySearch(jobs: Job[], searchQuery: string): Job[] {
    const lower = searchQuery.toLowerCase();
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(lower) ||
        job.company.toLowerCase().includes(lower) ||
        job.location.toLowerCase().includes(lower) ||
        job.tags.some((tag) => tag.toLowerCase().includes(lower))
    );
  }

  private applyClientFilters(jobs: Job[], filters: JobFilters): Job[] {
    return jobs.filter((job) => {
      if (!this.passesLocationTypeFilter(job, filters)) return false;
      if (!this.passesEmploymentTypeFilter(job, filters)) return false;
      if (!this.passesExperienceLevelFilter(job, filters)) return false;
      if (!this.passesSalaryFilter(job, filters)) return false;
      if (!this.passesSkillsFilter(job, filters)) return false;
      if (!this.passesPostedWithinFilter(job, filters)) return false;
      if (!this.passesIndustryFilter(job, filters)) return false;
      if (!this.passesCompanySizeFilter(job, filters)) return false;
      if (!this.passesBenefitsFilter(job, filters)) return false;
      return true;
    });
  }

  private passesLocationTypeFilter(job: Job, filters: JobFilters): boolean {
    if (!filters.locationType?.length) return true;
    return filters.locationType.includes(job.locationType);
  }

  private passesEmploymentTypeFilter(job: Job, filters: JobFilters): boolean {
    if (!filters.employmentType || filters.employmentType.length <= 1) return true;
    return filters.employmentType.includes(job.employmentType);
  }

  private passesExperienceLevelFilter(job: Job, filters: JobFilters): boolean {
    if (!filters.experienceLevel || filters.experienceLevel.length <= 1) return true;
    if (!job.experienceLevel) return true;
    return filters.experienceLevel.includes(job.experienceLevel);
  }

  private passesSalaryFilter(job: Job, filters: JobFilters): boolean {
    const hasSalaryMin = filters.salaryMin !== undefined && filters.salaryMin > 0;
    const hasSalaryMax = filters.salaryMax !== undefined && filters.salaryMax < 200000;

    if (!hasSalaryMin && !hasSalaryMax) return true;

    if (!job.salaryRange) {
      // Exclude jobs without salary info when a salary filter is active
      return false;
    }

    const { min, max } = job.salaryRange;
    if (hasSalaryMin && filters.salaryMin !== undefined && max < filters.salaryMin) return false;
    if (hasSalaryMax && filters.salaryMax !== undefined && min > filters.salaryMax) return false;
    return true;
  }

  private passesSkillsFilter(job: Job, filters: JobFilters): boolean {
    if (!filters.skills?.length) return true;
    const jobSkills = [...job.requirements, ...job.tags].map((s) => s.toLowerCase());
    return filters.skills.some((skill) =>
      jobSkills.some((js) => js.includes(skill.toLowerCase()))
    );
  }

  private passesPostedWithinFilter(job: Job, filters: JobFilters): boolean {
    if (!filters.postedWithin || filters.postedWithin === 'all') return true;
    const daysDiff = Math.floor((Date.now() - job.postedAt.getTime()) / (1000 * 60 * 60 * 24));
    const maxDays = POSTED_WITHIN_LIMITS[filters.postedWithin];
    return maxDays === undefined || daysDiff <= maxDays;
  }

  private passesIndustryFilter(job: Job, filters: JobFilters): boolean {
    if (!filters.industry || filters.industry.length <= 1) return true;
    if (!job.industry) return true;
    return filters.industry.includes(job.industry);
  }

  private passesCompanySizeFilter(job: Job, filters: JobFilters): boolean {
    if (!filters.companySize || filters.companySize.length <= 1) return true;
    if (!job.companySize) return true;
    return filters.companySize.includes(job.companySize);
  }

  private passesBenefitsFilter(job: Job, filters: JobFilters): boolean {
    if (!filters.benefits?.length) return true;
    if (!job.benefits) return false;
    const jobBenefits = job.benefits.map((b) => b.toLowerCase());
    return filters.benefits.some((benefit) =>
      jobBenefits.some((jb) => jb.includes(benefit.replace('-', ' ')))
    );
  }

  private async getTotalCount(params: FetchParams): Promise<number> {
    const constraints = this.buildBaseConstraints(params.filters as JobFilters | undefined);
    const ref = collection(db, 'jobs');
    const countSnapshot = await getCountFromServer(query(ref, ...constraints));
    return countSnapshot.data().count;
  }
}
