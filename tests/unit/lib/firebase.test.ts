import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createUser, 
  updateUserProfile, 
  getUserProfile,
  deleteUser,
  validateFirebaseConfig,
  initializeFirebaseApp
} from '@/lib/firebase';
import { mockUsers, mockEnvVars } from '../../fixtures';

// Mock Firebase modules
const mockAuth = {
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  currentUser: null,
  onAuthStateChanged: vi.fn(),
};

const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
};

const mockStorage = {
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
};

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => mockStorage),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

describe('Firebase Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set mock environment variables
    Object.entries(mockEnvVars).forEach(([key, value]) => {
      vi.stubEnv(key, value);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Configuration Validation', () => {
    it('validates Firebase configuration correctly', () => {
      expect(() => validateFirebaseConfig()).not.toThrow();
    });

    it('throws error when required config is missing', () => {
      vi.stubEnv('FIREBASE_API_KEY', '');
      
      expect(() => validateFirebaseConfig()).toThrow(/Firebase API key is required/);
    });

    it('initializes Firebase app with correct config', () => {
      const app = initializeFirebaseApp();
      
      expect(app).toBeDefined();
      expect(app.name).toBe('mock-app');
    });
  });

  describe('User Management', () => {
    const mockUserData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('creates new user successfully', async () => {
      const mockUserCredential = {
        user: { uid: 'test-uid', email: mockUserData.email },
      };
      
      mockAuth.createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      mockFirestore.setDoc.mockResolvedValue(undefined);
      
      const result = await createUser(mockUserData);
      
      expect(mockAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        mockUserData.email,
        mockUserData.password
      );
      
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
          email: mockUserData.email,
        })
      );
      
      expect(result.uid).toBe('test-uid');
    });

    it('handles user creation errors', async () => {
      mockAuth.createUserWithEmailAndPassword.mockRejectedValue(
        new Error('Email already in use')
      );
      
      await expect(createUser(mockUserData)).rejects.toThrow('Email already in use');
    });

    it('gets user profile successfully', async () => {
      const mockProfile = mockUsers.regularUser.profile;
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProfile,
      });
      
      const profile = await getUserProfile('test-uid');
      
      expect(mockFirestore.getDoc).toHaveBeenCalled();
      expect(profile).toEqual(mockProfile);
    });

    it('returns null for non-existent user profile', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => false,
      });
      
      const profile = await getUserProfile('non-existent-uid');
      
      expect(profile).toBeNull();
    });

    it('updates user profile successfully', async () => {
      const updates = { bio: 'Updated bio', skills: ['New Skill'] };
      mockFirestore.updateDoc.mockResolvedValue(undefined);
      
      await updateUserProfile('test-uid', updates);
      
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...updates,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('deletes user successfully', async () => {
      mockFirestore.deleteDoc.mockResolvedValue(undefined);
      
      await deleteUser('test-uid');
      
      expect(mockFirestore.deleteDoc).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockFirestore.getDoc.mockRejectedValue(new Error('Network error'));
      
      await expect(getUserProfile('test-uid')).rejects.toThrow('Network error');
    });

    it('handles permission errors', async () => {
      mockFirestore.setDoc.mockRejectedValue(new Error('Permission denied'));
      
      const userData = { email: 'test@example.com', password: 'password123' };
      await expect(createUser(userData)).rejects.toThrow('Permission denied');
    });
  });

  describe('Data Validation', () => {
    it('validates email format before creating user', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };
      
      await expect(createUser(invalidData)).rejects.toThrow(/invalid email/i);
    });

    it('validates password strength', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
      };
      
      await expect(createUser(weakPasswordData)).rejects.toThrow(/password too weak/i);
    });

    it('validates required fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        password: 'password123',
        // Missing firstName and lastName
      };
      
      await expect(createUser(incompleteData)).rejects.toThrow(/required fields missing/i);
    });
  });
});