// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createJob,
  getJobs, 
  getJobById, 
  updateJob, 
  deleteJob,
  applyToJob,
  getJobApplications 
} from '@/lib/jobs';
import { firestore } from '@/lib/firebase';
import { mockJobs, mockJobApplications, mockUsers } from '../../fixtures';

// Mock Firebase Firestore
vi.mock('@/lib/firebase', () => ({
  firestore: {
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
  },
}));

// Mock authentication
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => mockUsers.companyUser),
  requireAuth: vi.fn(() => mockUsers.companyUser),
}));

describe.skip('Jobs API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Job Creation', () => {
    const jobData = {
      title: 'Senior Data Scientist',
      company: 'Tech Company',
      location: 'Mexico City',
      type: 'full-time',
      level: 'senior',
      description: 'We are looking for a senior data scientist...',
      requirements: ['PhD in Data Science', '5+ years experience'],
      skills: ['Python', 'Machine Learning', 'Statistics'],
      salary: {
        min: 80000,
        max: 120000,
        currency: 'MXN',
        period: 'monthly',
      },
    };

    it('successfully creates a new job posting', async () => {
      const mockJobId = 'new-job-id';
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      vi.mocked(firestore.doc).mockReturnValue({ id: mockJobId } as any);
      
      const result = await createJob(jobData);
      
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...jobData,
          companyId: mockUsers.companyUser.uid,
          status: 'active',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
      
      expect(result.id).toBe(mockJobId);
    });

    it('validates required fields before creation', async () => {
      const incompleteJobData = {
        title: 'Data Scientist',
        // Missing required fields
      };
      
      await expect(createJob(incompleteJobData)).rejects.toThrow(
        /required fields missing/i
      );
    });

    it('enforces company authentication', async () => {
      vi.mocked(require('@/lib/auth').getCurrentUser).mockReturnValue(null);
      
      await expect(createJob(jobData)).rejects.toThrow(/authentication required/i);
    });

    it('validates salary range', async () => {
      const invalidSalaryData = {
        ...jobData,
        salary: {
          min: 100000,
          max: 50000, // Invalid: max < min
          currency: 'MXN',
          period: 'monthly',
        },
      };
      
      await expect(createJob(invalidSalaryData)).rejects.toThrow(
        /invalid salary range/i
      );
    });
  });

  describe('Job Retrieval', () => {
    it('retrieves jobs with filters', async () => {
      const mockJobDocs = Object.values(mockJobs).map(job => ({
        id: job.id,
        data: () => job,
        exists: () => true,
      }));
      
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: mockJobDocs,
        empty: false,
        size: mockJobDocs.length,
      } as any);
      
      const filters = {
        location: 'Mexico City',
        type: 'full-time',
        level: 'senior',
        remote: true,
      };
      
      const result = await getJobs(filters);
      
      expect(firestore.query).toHaveBeenCalled();
      expect(firestore.where).toHaveBeenCalledWith('location', '==', 'Mexico City');
      expect(firestore.where).toHaveBeenCalledWith('type', '==', 'full-time');
      expect(firestore.where).toHaveBeenCalledWith('level', '==', 'senior');
      expect(firestore.where).toHaveBeenCalledWith('remote', '==', true);
      
      expect(result.jobs).toHaveLength(mockJobDocs.length);
    });

    it('supports pagination', async () => {
      const mockJobDocs = Object.values(mockJobs).slice(0, 2).map(job => ({
        id: job.id,
        data: () => job,
        exists: () => true,
      }));
      
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: mockJobDocs,
        empty: false,
        size: mockJobDocs.length,
      } as any);
      
      const result = await getJobs({}, { limit: 2, offset: 0 });
      
      expect(firestore.limit).toHaveBeenCalledWith(2);
      expect(result.jobs).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('retrieves a single job by ID', async () => {
      const mockJob = mockJobs.dataScientistJob;
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockJob,
        id: mockJob.id,
      } as any);
      
      const result = await getJobById(mockJob.id);
      
      expect(firestore.getDoc).toHaveBeenCalled();
      expect(result).toEqual(mockJob);
    });

    it('returns null for non-existent job', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any);
      
      const result = await getJobById('non-existent-job');
      
      expect(result).toBeNull();
    });

    it('filters out expired jobs by default', async () => {
      const activeJobs = Object.values(mockJobs).filter(job => job.status === 'active');
      const mockJobDocs = activeJobs.map(job => ({
        id: job.id,
        data: () => job,
        exists: () => true,
      }));
      
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: mockJobDocs,
        empty: false,
        size: mockJobDocs.length,
      } as any);
      
      const result = await getJobs();
      
      expect(firestore.where).toHaveBeenCalledWith('status', '==', 'active');
      expect(result.jobs.every(job => job.status === 'active')).toBe(true);
    });
  });

  describe('Job Updates', () => {
    it('successfully updates job posting', async () => {
      const jobId = mockJobs.dataScientistJob.id;
      const updates = {
        title: 'Updated Data Scientist Position',
        description: 'Updated description...',
      };
      
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);
      
      await updateJob(jobId, updates);
      
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...updates,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('validates job ownership before update', async () => {
      const jobId = mockJobs.dataScientistJob.id;
      const updates = { title: 'Updated Title' };
      
      // Mock different company user
      vi.mocked(require('@/lib/auth').getCurrentUser).mockReturnValue({
        uid: 'different-company-uid',
        customClaims: { role: 'company' },
      });
      
      await expect(updateJob(jobId, updates)).rejects.toThrow(
        /not authorized to update this job/i
      );
    });

    it('prevents updating protected fields', async () => {
      const jobId = mockJobs.dataScientistJob.id;
      const updates = {
        id: 'new-id', // Should not be allowed
        companyId: 'different-company', // Should not be allowed
        createdAt: new Date(), // Should not be allowed
      };
      
      await expect(updateJob(jobId, updates)).rejects.toThrow(
        /cannot update protected fields/i
      );
    });
  });

  describe('Job Deletion', () => {
    it('successfully deletes job posting', async () => {
      const jobId = mockJobs.dataScientistJob.id;
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);
      
      await deleteJob(jobId);
      
      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('validates job ownership before deletion', async () => {
      const jobId = mockJobs.dataScientistJob.id;
      
      // Mock different company user
      vi.mocked(require('@/lib/auth').getCurrentUser).mockReturnValue({
        uid: 'different-company-uid',
        customClaims: { role: 'company' },
      });
      
      await expect(deleteJob(jobId)).rejects.toThrow(
        /not authorized to delete this job/i
      );
    });

    it('soft deletes job when applications exist', async () => {
      const jobId = mockJobs.dataScientistJob.id;
      
      // Mock existing applications
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [{ id: 'app-1' }, { id: 'app-2' }],
        empty: false,
        size: 2,
      } as any);
      
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);
      
      await deleteJob(jobId);
      
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'deleted',
          deletedAt: expect.any(Date),
        })
      );
    });
  });

  describe('Job Applications', () => {
    const applicationData = {
      jobId: mockJobs.dataScientistJob.id,
      coverLetter: 'I am interested in this position...',
      resume: 'resume-file-url',
      customFields: {
        expectedSalary: '100000',
        availableStartDate: '2024-03-01',
      },
    };

    it('successfully submits job application', async () => {
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      vi.mocked(firestore.doc).mockReturnValue({ id: 'app-1' } as any);
      
      // Mock user authentication
      vi.mocked(require('@/lib/auth').getCurrentUser).mockReturnValue(mockUsers.regularUser);
      
      const result = await applyToJob(applicationData);
      
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...applicationData,
          userId: mockUsers.regularUser.uid,
          status: 'pending',
          appliedAt: expect.any(Date),
        })
      );
      
      expect(result.id).toBe('app-1');
    });

    it('prevents duplicate applications', async () => {
      // Mock existing application
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [{ id: 'existing-app' }],
        empty: false,
        size: 1,
      } as any);
      
      await expect(applyToJob(applicationData)).rejects.toThrow(
        /already applied to this job/i
      );
    });

    it('validates application deadline', async () => {
      const expiredJobApplication = {
        ...applicationData,
        jobId: mockJobs.expiredJob.id,
      };
      
      await expect(applyToJob(expiredJobApplication)).rejects.toThrow(
        /application deadline has passed/i
      );
    });

    it('retrieves job applications for company', async () => {
      const mockApplicationDocs = Object.values(mockJobApplications).map(app => ({
        id: app.id,
        data: () => app,
        exists: () => true,
      }));
      
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: mockApplicationDocs,
        empty: false,
        size: mockApplicationDocs.length,
      } as any);
      
      const result = await getJobApplications(mockJobs.dataScientistJob.id);
      
      expect(firestore.query).toHaveBeenCalled();
      expect(firestore.where).toHaveBeenCalledWith('jobId', '==', mockJobs.dataScientistJob.id);
      expect(result).toHaveLength(mockApplicationDocs.length);
    });
  });

  describe('Search and Filtering', () => {
    it('performs text search across job fields', async () => {
      const searchTerm = 'data scientist';
      const matchingJobs = Object.values(mockJobs).filter(job => 
        job.title.toLowerCase().includes(searchTerm) ||
        job.description.toLowerCase().includes(searchTerm)
      );
      
      const mockJobDocs = matchingJobs.map(job => ({
        id: job.id,
        data: () => job,
        exists: () => true,
      }));
      
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: mockJobDocs,
        empty: false,
        size: mockJobDocs.length,
      } as any);
      
      const result = await getJobs({ search: searchTerm });
      
      expect(result.jobs.every(job => 
        job.title.toLowerCase().includes(searchTerm) ||
        job.description.toLowerCase().includes(searchTerm)
      )).toBe(true);
    });

    it('filters by salary range', async () => {
      const filters = {
        salaryMin: 50000,
        salaryMax: 100000,
      };
      
      const result = await getJobs(filters);
      
      expect(firestore.where).toHaveBeenCalledWith('salary.min', '>=', 50000);
      expect(firestore.where).toHaveBeenCalledWith('salary.max', '<=', 100000);
    });

    it('filters by skills', async () => {
      const filters = {
        skills: ['Python', 'Machine Learning'],
      };
      
      const result = await getJobs(filters);
      
      expect(firestore.where).toHaveBeenCalledWith('skills', 'array-contains-any', ['Python', 'Machine Learning']);
    });
  });
});