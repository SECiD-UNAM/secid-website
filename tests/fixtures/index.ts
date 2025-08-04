export * from './users';
export * from './jobs';
export * from './events';

// API Response Mocks
export const mockApiResponses = {
  success: {
    status: 'success',
    data: {},
    message: 'Operation completed successfully',
  },
  
  error: {
    status: 'error',
    error: {
      code: 'GENERIC_ERROR',
      message: 'An error occurred',
    },
  },
  
  validationError: {
    status: 'error',
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: {
        email: 'Invalid email format',
        password: 'Password too short',
      },
    },
  },
  
  unauthorized: {
    status: 'error',
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  },
  
  forbidden: {
    status: 'error',
    error: {
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
    },
  },
  
  notFound: {
    status: 'error',
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  },
};

// Mock Firebase Collections
export const mockFirebaseCollections = {
  users: 'users',
  jobs: 'jobs',
  events: 'events',
  applications: 'job_applications',
  registrations: 'event_registrations',
  payments: 'payments',
  notifications: 'notifications',
};

// Mock Environment Variables
export const mockEnvVars = {
  FIREBASE_API_KEY: 'mock-api-key',
  FIREBASE_AUTH_DOMAIN: 'mock-project.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'mock-project',
  FIREBASE_STORAGE_BUCKET: 'mock-project.appspot.com',
  FIREBASE_MESSAGING_SENDER_ID: '123456789',
  FIREBASE_APP_ID: '1:123456789:web:abcdef',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_mock_key',
  STRIPE_SECRET_KEY: 'sk_test_mock_key',
};