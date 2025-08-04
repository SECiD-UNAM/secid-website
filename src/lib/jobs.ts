import { 
import { db, isUsingMockAPI} from './firebase';

/**
 * Jobs Service
 * High-level job board functions that work with both Firebase and Mock API
 */

  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint
} from 'firebase/firestore';
import type { Job, JobFormData } from '@/types/job';

/**
 * Create a new job posting
 */
export async function createJob(jobData: JobFormData, userId: string): Promise<string> {
  const newJob = {
    ...jobData,
    postedBy: userId,
    postedAt: new Date(),
    status: 'active',
    views: 0,
    applications: 0,
  };

  if (isUsingMockAPI()) {
    return db.addDoc('jobs', newJob);
  }

  const docRef = await addDoc(collection(db, 'jobs'), newJob);
  return docRef['id'];
}

/**
 * Get a single job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  if (isUsingMockAPI()) {
    const result = await db.getDoc('jobs', jobId);
    return result.exists ? { id: jobId, ...result.data() } as Job : null;
  }

  const docRef = doc(db, 'jobs', jobId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap['id'], ...docSnap.data() } as Job;
  }
  
  return null;
}

/**
 * Get all active jobs
 */
export async function getActiveJobs(limitCount: number = 20): Promise<Job[]> {
  if (isUsingMockAPI()) {
    const results = await db.getDocs('jobs', {
      where: ['status', '==', 'active'],
      orderBy: ['postedAt', 'desc'],
      limit: limitCount,
    });
    
    return results.map((doc: any) => ({
      id: doc['id'],  
      ...doc['data']()
    })) as Job[];
  }

  const constraints: QueryConstraint[] = [
    where('status', '==', 'active'),
    orderBy('postedAt', 'desc')
  ];
  
  if (limitCount > 0) {
    constraints.push(limit(limitCount));
  }

  const q = query(collection(db, 'jobs'), ...constraints);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc['id'],
    ...doc['data']()
  })) as Job[];
}

/**
 * Get jobs posted by a specific user
 */
export async function getUserJobs(userId: string): Promise<Job[]> {
  if (isUsingMockAPI()) {
    const results = await db.getDocs('jobs', {
      where: ['postedBy', '==', userId],
      orderBy: ['postedAt', 'desc'],
    });
    
    return results.map((doc: any) => ({
      id: doc['id'],  
      ...doc['data']()
    })) as Job[];
  }

  const q = query(
    collection(db, 'jobs'),
    where('postedBy', '==', userId),
    orderBy('postedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc['id'],
    ...doc['data']()
  })) as Job[];
}

/**
 * Update a job posting
 */
export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  const updateData = {
    ...updates,
    updatedAt: new Date(),
  };

  if (isUsingMockAPI()) {
    return db.updateDoc('jobs', jobId, updateData);
  }

  const docRef = doc(db, 'jobs', jobId);
  return updateDoc(docRef, updateData);
}

/**
 * Delete a job posting
 */
export async function deleteJob(jobId: string): Promise<void> {
  if (isUsingMockAPI()) {
    return db.deleteDoc('jobs', jobId);
  }

  const docRef = doc(db, 'jobs', jobId);
  return deleteDoc(docRef);
}

/**
 * Search jobs by keywords
 */
export async function searchJobs(keywords: string): Promise<Job[]> {
  // Note: Full-text search requires additional setup in Firebase
  // For now, we'll do client-side filtering
  const allJobs = await getActiveJobs(100);
  
  const searchTerms = keywords.toLowerCase().split(' ');
  
  return allJobs.filter(job => {
    const searchableText = `
      ${job.title} 
      ${job.company} 
      ${job.location} 
      ${job.description} 
      ${job?.requirements?.join(' ') || ''}
    `.toLowerCase();
    
    return searchTerms.every(term => searchableText.includes(term));
  });
}

/**
 * Filter jobs by criteria
 */
export async function filterJobs(filters: {
  type?: string;
  location?: string;
  remote?: boolean;
  salaryMin?: number;
}): Promise<Job[]> {
  if (isUsingMockAPI()) {
    // Mock API doesn't support complex queries yet
    const allJobs = await getActiveJobs(100);
    
    return allJobs.filter(job => {
      if (filters['type'] && job['type'] !== filters['type']) return false;
      if (filters.location && !job.location.includes(filters.location)) return false;
      if (filters.remote !== undefined && job.remote !== filters.remote) return false;
      if (filters.salaryMin && job.salary && job.salary.min < filters.salaryMin) return false;
      return true;
    });
  }

  // For Firebase, we'd need composite indexes for multiple where clauses
  // For now, do client-side filtering
  const allJobs = await getActiveJobs(100);
  
  return allJobs.filter(job => {
    if (filters['type'] && job['type'] !== filters['type']) return false;
    if (filters.location && !job.location.includes(filters.location)) return false;
    if (filters.remote !== undefined && job.remote !== filters.remote) return false;
    if (filters.salaryMin && job.salary && job.salary.min < filters.salaryMin) return false;
    return true;
  });
}

/**
 * Increment job view count
 */
export async function incrementJobViews(jobId: string): Promise<void> {
  if (isUsingMockAPI()) {
    const job = await getJob(jobId);
    if(job) {
      return db.updateDoc('jobs', jobId, { views: (job.views || 0) + 1 });
    }
    return;
  }

  const docRef = doc(db, 'jobs', jobId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const currentViews = docSnap.data()['views'] || 0;
    return updateDoc(docRef, { views: currentViews + 1 });
  }
}