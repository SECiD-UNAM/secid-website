/**
 * Firebase Test Helpers
 * Utility functions for Firebase integration testing
 */

import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { mockUsers, mockJobs, mockEvents } from '../../fixtures';

// Test project configuration
export const TEST_PROJECT_ID = 'secid-test-project';

/**
 * Create a test user in Firestore
 */
export async function createTestUser(
  firestore: any,
  uid: string,
  userData: any
): Promise<void> {
  const userDoc = doc(firestore, 'users', uid);
  await setDoc(userDoc, {
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Create a test job in Firestore
 */
export async function createTestJob(
  firestore: any,
  jobData: any
): Promise<void> {
  const jobDoc = doc(firestore, 'jobs', jobData.id);
  await setDoc(jobDoc, {
    ...jobData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Create a test event in Firestore
 */
export async function createTestEvent(
  firestore: any,
  eventData: any
): Promise<void> {
  const eventDoc = doc(firestore, 'events', eventData.id);
  await setDoc(eventDoc, {
    ...eventData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Clean up all test data from Firestore
 */
export async function cleanupTestData(firestore: any): Promise<void> {
  const collections = ['users', 'jobs', 'events', 'job_applications', 'event_registrations'];
  
  for (const collectionName of collections) {
    try {
      const collectionRef = collection(firestore, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`Cleaned up ${snapshot.docs.length} documents from ${collectionName}`);
    } catch (error) {
      console.warn(`Failed to cleanup collection ${collectionName}:`, error);
    }
  }
}

/**
 * Seed test data for integration tests
 */
export async function seedTestData(firestore: any): Promise<void> {
  // Create test users
  for (const [key, user] of Object.entries(mockUsers)) {
    if (user.uid && user.profile) {
      await createTestUser(firestore, user.uid, user.profile);
    }
  }
  
  // Create test jobs
  for (const job of Object.values(mockJobs)) {
    await createTestJob(firestore, job);
  }
  
  // Create test events
  for (const event of Object.values(mockEvents)) {
    await createTestEvent(firestore, event);
  }
  
  console.log('Test data seeded successfully');
}

/**
 * Wait for Firebase emulators to be ready
 */
export async function waitForEmulators(timeout: number = 30000): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      // Check Auth emulator
      const authResponse = await fetch('http://localhost:9099/');
      
      // Check Firestore emulator
      const firestoreResponse = await fetch('http://localhost:8080/');
      
      if (authResponse.ok && firestoreResponse.ok) {
        console.log('Firebase emulators are ready');
        return;
      }
    } catch (error) {
      // Emulators not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Firebase emulators did not start within timeout');
}

/**
 * Create a test Firebase app with authentication
 */
export function createTestApp(uid: string, customClaims: any = {}) {
  return {
    projectId: TEST_PROJECT_ID,
    auth: { uid, ...customClaims },
  };
}

/**
 * Mock Firebase Auth user for testing
 */
export function createMockUser(overrides: any = {}) {
  return {
    uid: 'test-uid',
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User',
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    customClaims: {},
    providerData: [],
    ...overrides,
  };
}

/**
 * Create batch operations for Firestore testing
 */
export async function batchCreateDocuments(
  firestore: any,
  operations: Array<{ collection: string; id: string; data: any }>
): Promise<void> {
  const promises = operations.map(({ collection: collectionName, id, data }) => {
    const docRef = doc(firestore, collectionName, id);
    return setDoc(docRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
  
  await Promise.all(promises);
}

/**
 * Verify security rules by attempting unauthorized operations
 */
export async function testSecurityRule(
  firestore: any,
  operation: () => Promise<any>,
  shouldFail: boolean = true
): Promise<void> {
  try {
    await operation();
    
    if (shouldFail) {
      throw new Error('Operation should have failed but succeeded');
    }
  } catch (error) {
    if (!shouldFail) {
      throw new Error(`Operation should have succeeded but failed: ${error.message}`);
    }
    
    // Expected failure for security rule violation
    if (!error.message.includes('permission') && !error.message.includes('denied')) {
      throw error;
    }
  }
}

/**
 * Generate test data with realistic values
 */
export function generateTestData(type: 'user' | 'job' | 'event', overrides: any = {}) {
  const baseData = {
    user: {
      firstName: 'Test',
      lastName: 'User',
      email: `test+${Date.now()}@example.com`,
      university: 'UNAM',
      graduationYear: 2020,
      major: 'Data Science',
      skills: ['Python', 'Machine Learning'],
      isPublic: true,
    },
    job: {
      title: 'Software Engineer',
      company: 'Test Company',
      location: 'Mexico City',
      type: 'full-time',
      level: 'mid',
      description: 'Test job description',
      requirements: ['Experience with testing'],
      skills: ['JavaScript', 'React'],
      status: 'active',
    },
    event: {
      title: 'Test Workshop',
      description: 'Test event description',
      startDate: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date(Date.now() + 90000000), // Tomorrow + 1 hour
      location: {
        type: 'virtual',
        url: 'https://zoom.us/test',
      },
      capacity: 50,
      registeredCount: 0,
      status: 'published',
      category: 'workshop',
    },
  };
  
  return {
    ...baseData[type],
    ...overrides,
    id: `test-${type}-${Date.now()}`,
  };
}

/**
 * Assert collection contains expected documents
 */
export async function assertCollectionContains(
  firestore: any,
  collectionName: string,
  expectedCount: number,
  filter?: (doc: any) => boolean
): Promise<void> {
  const collectionRef = collection(firestore, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  if (filter) {
    docs = docs.filter(filter);
  }
  
  if (docs.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} documents in ${collectionName}, but found ${docs.length}`
    );
  }
}

/**
 * Performance testing helper
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  maxDuration: number = 1000
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  
  if (duration > maxDuration) {
    console.warn(
      `Operation took ${duration}ms, which exceeds the maximum expected duration of ${maxDuration}ms`
    );
  }
  
  return { result, duration };
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}