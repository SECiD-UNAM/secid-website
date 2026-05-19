/**
 * Mock API for Local Development
 * Provides fake data and endpoints when Firebase is not available
 */

import type { User } from 'firebase/auth';

// Mock data storage
const mockStorage = {
  users: new Map<string, any>(),
  jobs: new Map<string, any>(),
  events: new Map<string, any>(),
  currentUser: null as any,
};

// Initialize with sample data
const initializeMockData = () => {
  // Sample users
  mockStorage.users.set('user1', {
    uid: 'user1',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    photoURL: null,
    role: 'member',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Data Scientist at TechCorp',
      company: 'TechCorp',
      position: 'Senior Data Scientist',
      location: 'Mexico City',
      linkedin: 'https://linkedin.com/in/johndoe',
      skills: ['Python', 'Machine Learning', 'SQL'],
    },
  });

  // Sample jobs
  const sampleJobs = [
    {
      id: 'job1',
      title: 'Senior Data Scientist',
      company: 'Tech Innovations SA',
      location: 'Ciudad de México',
      type: 'Full-time',
      remote: true,
      salary: { min: 80000, max: 120000, currency: 'MXN' },
      description: 'We are looking for an experienced data scientist...',
      requirements: ['5+ years experience', 'Python', 'Machine Learning'],
      postedAt: new Date('2024-01-15'),
      postedBy: 'user1',
    },
    {
      id: 'job2',
      title: 'ML Engineer',
      company: 'AI Startup',
      location: 'Guadalajara',
      type: 'Full-time',
      remote: false,
      salary: { min: 60000, max: 90000, currency: 'MXN' },
      description: 'Join our growing ML team...',
      requirements: ['3+ years experience', 'TensorFlow', 'Cloud platforms'],
      postedAt: new Date('2024-01-20'),
      postedBy: 'user1',
    },
  ];

  sampleJobs.forEach((job) => mockStorage.jobs.set(job.id, job));
};

// Initialize on first import
initializeMockData();

/**
 * Mock Authentication
 */
export const mockAuth = {
  currentUser: (): User | null => mockStorage.currentUser,

  signIn: async (email: string, password: string): Promise<User> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if user exists
    const user = Array.from(mockStorage.users.values()).find(
      (u) => u.email === email
    );

    if (!user) {
      throw new Error('auth/user-not-found');
    }

    if (password.length < 6) {
      throw new Error('auth/wrong-password');
    }

    mockStorage.currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: true,
      metadata: {},
      providerData: [],
      refreshToken: 'mock-token',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'mock-id-token',
      getIdTokenResult: async () =>
        ({ token: 'mock-id-token', claims: {} }) as any,
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      providerId: 'firebase',
      isAnonymous: false,
    } as User;

    return mockStorage.currentUser;
  },

  signUp: async (email: string, password: string, data: any): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if user already exists
    const existing = Array.from(mockStorage.users.values()).find(
      (u) => u.email === email
    );
    if (existing) {
      throw new Error('auth/email-already-in-use');
    }

    const uid = `user${mockStorage.users.size + 1}`;
    const newUser = {
      uid,
      email,
      displayName: `${data.firstName} ${data['lastName']}`,
      photoURL: null,
      role: 'member',
      profile: {
        firstName: data['firstName'],
        lastName: data['lastName'],
        bio: '',
        company: '',
        position: '',
        location: '',
        linkedin: '',
        skills: [],
      },
    };

    mockStorage.users.set(uid, newUser);

    return mockAuth.signIn(email, password);
  },

  signOut: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    mockStorage.currentUser = null;
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    // Call immediately with current state
    callback(mockStorage.currentUser);

    // Return unsubscribe function
    return () => {};
  },
};

/**
 * Mock Firestore
 */
export const mockFirestore = {
  // Get a document
  getDoc: async (collection: string, id: string): Promise<any> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const storage = mockStorage[collection as keyof typeof mockStorage] as Map<
      string,
      any
    >;
    if (!storage) {
      throw new Error(`Collection ${collection} not found`);
    }

    const doc = storage.get(id);
    if (!doc) {
      return { exists: false, data: () => null };
    }

    return {
      exists: true,
      id,
      data: () => doc,
    };
  },

  // Get all documents in a collection
  getDocs: async (collection: string, query?: any): Promise<any[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const storage = mockStorage[collection as keyof typeof mockStorage] as Map<
      string,
      any
    >;
    if (!storage) {
      return [];
    }

    let docs = Array.from(storage.values());

    // Simple query simulation
    if (query?.where) {
      const [field, operator, value] = query.where;
      docs = docs.filter((doc) => {
        const fieldValue = field
          .split('')
          .reduce((obj: any, key: string) => obj?.[key], doc);

        switch (operator) {
          case '==':
            return fieldValue === value;
          case '!=':
            return fieldValue !== value;
          case '>':
            return fieldValue > value;
          case '>=':
            return fieldValue >= value;
          case '<':
            return fieldValue < value;
          case '<=':
            return fieldValue <= value;
          case 'in':
            return value.includes(fieldValue);
          case 'array-contains':
            return fieldValue?.includes(value);
          default:
            return true;
        }
      });
    }

    if (query?.orderBy) {
      const [field, direction = 'asc'] = query.orderBy;
      docs.sort((a, b) => {
        const aVal = field
          .split('')
          .reduce((obj: any, key: string) => obj?.[key], a);
        const bVal = field
          .split('')
          .reduce((obj: any, key: string) => obj?.[key], b);

        if (direction === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    if (query?.limit) {
      docs = docs.slice(0, query.limit);
    }

    return docs.map((doc, index) => ({
      id: `doc${index}`,
      data: () => doc,
    }));
  },

  // Add a document
  addDoc: async (collection: string, data: any): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const storage = mockStorage[collection as keyof typeof mockStorage] as Map<
      string,
      any
    >;
    if (!storage) {
      throw new Error(`Collection ${collection} not found`);
    }

    const id = `${collection}${storage.size + 1}`;
    storage.set(id, { ...data, id });

    return id;
  },

  // Update a document
  updateDoc: async (
    collection: string,
    id: string,
    data: any
  ): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const storage = mockStorage[collection as keyof typeof mockStorage] as Map<
      string,
      any
    >;
    if (!storage) {
      throw new Error(`Collection ${collection} not found`);
    }

    const existing = storage.get(id);
    if (!existing) {
      throw new Error(`Document ${id} not found`);
    }

    storage.set(id, { ...existing, ...data, updatedAt: new Date() });
  },

  // Delete a document
  deleteDoc: async (collection: string, id: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const storage = mockStorage[collection as keyof typeof mockStorage] as Map<
      string,
      any
    >;
    if (!storage) {
      throw new Error(`Collection ${collection} not found`);
    }

    storage.delete(id);
  },

  // Real-time listener simulation
  onSnapshot: (collection: string, callback: (docs: any[]) => void) => {
    // Initial call
    mockFirestore.getDocs(collection).then(callback);

    // Return unsubscribe function
    return () => {};
  },
};

/**
 * Mock Storage Service
 */
export const mockStorageService = {
  uploadFile: async (path: string, file: File): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate upload progress
    console.log(`Uploading ${file.name} to ${path}...`);

    // Return a fake URL
    return `https://mock-storage.secid.mx/${path}/${file['name']}`;
  },

  deleteFile: async (url: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`Deleted file: ${url}`);
  },

  getDownloadURL: async (path: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return `https://mock-storage.secid.mx/${path}`;
  },
};

/**
 * Check if we should use mock API
 */
export const shouldUseMockAPI = (): boolean => {
  // Use mock API if:
  // 1. Explicitly enabled in environment
  // 2. Firebase config is missing
  // 3. Running in test environment

  const useMock = import.meta.env.PUBLIC_USE_MOCK_API === 'true';
  const hasFirebaseConfig = import.meta.env.PUBLIC_FIREBASE_API_KEY;
  const isTest = import.meta.env['MODE'] === 'test';

  return useMock || !hasFirebaseConfig || isTest;
};

/**
 * Mock API wrapper that matches Firebase API
 */
export const createMockAPI = () => {
  console.warn('🔧 Using Mock API - Data will not persist');

  return {
    auth: mockAuth,
    db: mockFirestore,
    storage: mockStorageService,
  };
};

export default createMockAPI;
