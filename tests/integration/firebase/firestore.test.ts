import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { initializeTestApp, initializeAdminApp } from '@firebase/rules-unit-testing';
import { 
  createTestUser, 
  createTestJob, 
  createTestEvent,
  cleanupTestData 
} from '../helpers/firebase-test-helpers';
import { mockUsers, mockJobs, mockEvents } from '../../fixtures';

// Test configuration
const TEST_PROJECT_ID = 'secid-test-project';
const TEST_UID = 'test-user-uid';

describe('Firestore Integration Tests', () => {
  let testApp: any;
  let adminApp: any;
  let firestore: any;
  let adminFirestore: any;

  beforeEach(async () => {
    // Initialize test apps
    testApp = initializeTestApp({
      projectId: TEST_PROJECT_ID,
      auth: { uid: TEST_UID },
    });

    adminApp = initializeAdminApp({
      projectId: TEST_PROJECT_ID,
    });

    firestore = getFirestore(testApp);
    adminFirestore = getFirestore(adminApp);

    // Connect to emulator
    if (!firestore._delegate._databaseId.projectId.includes('test')) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      connectFirestoreEmulator(adminFirestore, 'localhost', 8080);
    }
  });

  afterEach(async () => {
    await cleanupTestData(adminFirestore);
    await testApp.delete();
    await adminApp.delete();
  });

  describe('Security Rules', () => {
    describe('User Profile Rules', () => {
      it('allows users to read their own profile', async () => {
        await createTestUser(adminFirestore, TEST_UID, mockUsers.regularUser.profile);
        
        const userDoc = firestore.collection('users').doc(TEST_UID);
        const snapshot = await userDoc.get();
        
        expect(snapshot.exists()).toBe(true);
        expect(snapshot.data()).toMatchObject(mockUsers.regularUser.profile);
      });

      it('allows users to update their own profile', async () => {
        await createTestUser(adminFirestore, TEST_UID, mockUsers.regularUser.profile);
        
        const userDoc = firestore.collection('users').doc(TEST_UID);
        const updates = { bio: 'Updated bio' };
        
        await expect(userDoc.update(updates)).resolves.not.toThrow();
      });

      it('prevents users from reading other users private profiles', async () => {
        const otherUserId = 'other-user-uid';
        await createTestUser(adminFirestore, otherUserId, {
          ...mockUsers.regularUser.profile,
          isPublic: false,
        });
        
        const otherUserDoc = firestore.collection('users').doc(otherUserId);
        
        await expect(otherUserDoc.get()).rejects.toThrow();
      });

      it('allows reading public profiles', async () => {
        const otherUserId = 'other-user-uid';
        await createTestUser(adminFirestore, otherUserId, {
          ...mockUsers.regularUser.profile,
          isPublic: true,
        });
        
        const testAppOther = initializeTestApp({
          projectId: TEST_PROJECT_ID,
          auth: { uid: 'different-user-uid' },
        });
        
        const otherFirestore = getFirestore(testAppOther);
        const otherUserDoc = otherFirestore.collection('users').doc(otherUserId);
        const snapshot = await otherUserDoc.get();
        
        expect(snapshot.exists()).toBe(true);
        
        await testAppOther.delete();
      });

      it('prevents users from updating other users profiles', async () => {
        const otherUserId = 'other-user-uid';
        await createTestUser(adminFirestore, otherUserId, mockUsers.regularUser.profile);
        
        const otherUserDoc = firestore.collection('users').doc(otherUserId);
        
        await expect(
          otherUserDoc.update({ bio: 'Malicious update' })
        ).rejects.toThrow();
      });
    });

    describe('Job Posting Rules', () => {
      it('allows companies to create job postings', async () => {
        const companyApp = initializeTestApp({
          projectId: TEST_PROJECT_ID,
          auth: { 
            uid: 'company-uid',
            token: { role: 'company' },
          },
        });
        
        const companyFirestore = getFirestore(companyApp);
        const jobsCollection = companyFirestore.collection('jobs');
        
        await expect(
          jobsCollection.add({
            ...mockJobs.dataScientistJob,
            companyId: 'company-uid',
          })
        ).resolves.not.toThrow();
        
        await companyApp.delete();
      });

      it('prevents regular users from creating job postings', async () => {
        const jobsCollection = firestore.collection('jobs');
        
        await expect(
          jobsCollection.add(mockJobs.dataScientistJob)
        ).rejects.toThrow();
      });

      it('allows anyone to read active job postings', async () => {
        await createTestJob(adminFirestore, mockJobs.dataScientistJob);
        
        const jobsCollection = firestore.collection('jobs');
        const snapshot = await jobsCollection
          .where('status', '==', 'active')
          .get();
        
        expect(snapshot.empty).toBe(false);
        expect(snapshot.docs[0].data()).toMatchObject(mockJobs.dataScientistJob);
      });

      it('allows companies to update their own job postings', async () => {
        const companyId = 'company-uid';
        await createTestJob(adminFirestore, {
          ...mockJobs.dataScientistJob,
          companyId,
        });
        
        const companyApp = initializeTestApp({
          projectId: TEST_PROJECT_ID,
          auth: { 
            uid: companyId,
            token: { role: 'company' },
          },
        });
        
        const companyFirestore = getFirestore(companyApp);
        const jobDoc = companyFirestore.collection('jobs').doc(mockJobs.dataScientistJob.id);
        
        await expect(
          jobDoc.update({ title: 'Updated Title' })
        ).resolves.not.toThrow();
        
        await companyApp.delete();
      });

      it('prevents companies from updating other companies job postings', async () => {
        await createTestJob(adminFirestore, {
          ...mockJobs.dataScientistJob,
          companyId: 'different-company-uid',
        });
        
        const companyApp = initializeTestApp({
          projectId: TEST_PROJECT_ID,
          auth: { 
            uid: 'company-uid',
            token: { role: 'company' },
          },
        });
        
        const companyFirestore = getFirestore(companyApp);
        const jobDoc = companyFirestore.collection('jobs').doc(mockJobs.dataScientistJob.id);
        
        await expect(
          jobDoc.update({ title: 'Malicious Update' })
        ).rejects.toThrow();
        
        await companyApp.delete();
      });
    });

    describe('Job Application Rules', () => {
      beforeEach(async () => {
        await createTestJob(adminFirestore, mockJobs.dataScientistJob);
      });

      it('allows users to create job applications', async () => {
        const applicationsCollection = firestore.collection('job_applications');
        
        await expect(
          applicationsCollection.add({
            jobId: mockJobs.dataScientistJob.id,
            userId: TEST_UID,
            status: 'pending',
            appliedAt: new Date(),
            coverLetter: 'I am interested...',
          })
        ).resolves.not.toThrow();
      });

      it('allows users to read their own applications', async () => {
        const applicationId = 'test-application-id';
        await adminFirestore.collection('job_applications').doc(applicationId).set({
          jobId: mockJobs.dataScientistJob.id,
          userId: TEST_UID,
          status: 'pending',
          appliedAt: new Date(),
        });
        
        const applicationDoc = firestore.collection('job_applications').doc(applicationId);
        const snapshot = await applicationDoc.get();
        
        expect(snapshot.exists()).toBe(true);
      });

      it('prevents users from reading other users applications', async () => {
        const applicationId = 'other-application-id';
        await adminFirestore.collection('job_applications').doc(applicationId).set({
          jobId: mockJobs.dataScientistJob.id,
          userId: 'other-user-uid',
          status: 'pending',
          appliedAt: new Date(),
        });
        
        const applicationDoc = firestore.collection('job_applications').doc(applicationId);
        
        await expect(applicationDoc.get()).rejects.toThrow();
      });

      it('allows companies to read applications for their jobs', async () => {
        const companyId = 'company-uid';
        const applicationId = 'company-application-id';
        
        await createTestJob(adminFirestore, {
          ...mockJobs.dataScientistJob,
          id: 'company-job-id',
          companyId,
        });
        
        await adminFirestore.collection('job_applications').doc(applicationId).set({
          jobId: 'company-job-id',
          userId: 'applicant-uid',
          status: 'pending',
          appliedAt: new Date(),
        });
        
        const companyApp = initializeTestApp({
          projectId: TEST_PROJECT_ID,
          auth: { 
            uid: companyId,
            token: { role: 'company' },
          },
        });
        
        const companyFirestore = getFirestore(companyApp);
        const applicationsQuery = companyFirestore
          .collection('job_applications')
          .where('jobId', '==', 'company-job-id');
        
        const snapshot = await applicationsQuery.get();
        expect(snapshot.empty).toBe(false);
        
        await companyApp.delete();
      });
    });

    describe('Event Rules', () => {
      it('allows admins to create events', async () => {
        const adminApp = initializeTestApp({
          projectId: TEST_PROJECT_ID,
          auth: { 
            uid: 'admin-uid',
            token: { role: 'admin' },
          },
        });
        
        const adminFirestore = getFirestore(adminApp);
        const eventsCollection = adminFirestore.collection('events');
        
        await expect(
          eventsCollection.add(mockEvents.upcomingEvent)
        ).resolves.not.toThrow();
        
        await adminApp.delete();
      });

      it('prevents regular users from creating events', async () => {
        const eventsCollection = firestore.collection('events');
        
        await expect(
          eventsCollection.add(mockEvents.upcomingEvent)
        ).rejects.toThrow();
      });

      it('allows anyone to read published events', async () => {
        await createTestEvent(adminFirestore, mockEvents.upcomingEvent);
        
        const eventsCollection = firestore.collection('events');
        const snapshot = await eventsCollection
          .where('status', '==', 'published')
          .get();
        
        expect(snapshot.empty).toBe(false);
      });

      it('prevents reading draft events by non-admins', async () => {
        await createTestEvent(adminFirestore, mockEvents.draftEvent);
        
        const eventsCollection = firestore.collection('events');
        const snapshot = await eventsCollection
          .where('status', '==', 'draft')
          .get();
        
        expect(snapshot.empty).toBe(true);
      });
    });
  });

  describe('Data Validation', () => {
    it('validates user profile schema', async () => {
      const invalidProfile = {
        firstName: '', // Required field empty
        email: 'invalid-email', // Invalid format
        graduationYear: 'not-a-number', // Wrong type
      };
      
      const userDoc = firestore.collection('users').doc(TEST_UID);
      
      await expect(userDoc.set(invalidProfile)).rejects.toThrow();
    });

    it('validates job posting schema', async () => {
      const companyApp = initializeTestApp({
        projectId: TEST_PROJECT_ID,
        auth: { 
          uid: 'company-uid',
          token: { role: 'company' },
        },
      });
      
      const companyFirestore = getFirestore(companyApp);
      const invalidJob = {
        title: '', // Required field empty
        salary: {
          min: 'not-a-number', // Wrong type
          max: -1000, // Invalid value
        },
        applicationDeadline: 'invalid-date', // Wrong type
      };
      
      const jobsCollection = companyFirestore.collection('jobs');
      
      await expect(jobsCollection.add(invalidJob)).rejects.toThrow();
      
      await companyApp.delete();
    });
  });

  describe('Performance and Indexing', () => {
    it('efficiently queries jobs with compound indexes', async () => {
      // Create multiple test jobs
      const testJobs = [
        { ...mockJobs.dataScientistJob, location: 'Mexico City', type: 'full-time', level: 'senior' },
        { ...mockJobs.juniorAnalystJob, location: 'Guadalajara', type: 'full-time', level: 'junior' },
        { ...mockJobs.internshipJob, location: 'Remote', type: 'internship', level: 'entry' },
      ];
      
      for (const job of testJobs) {
        await createTestJob(adminFirestore, job);
      }
      
      const startTime = Date.now();
      
      // Complex query that should use compound index
      const snapshot = await firestore
        .collection('jobs')
        .where('status', '==', 'active')
        .where('type', '==', 'full-time')
        .where('level', '==', 'senior')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(snapshot.empty).toBe(false);
    });
  });
});