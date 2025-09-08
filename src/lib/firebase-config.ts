import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import {
  getAuth,
  type Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import {
  getStorage,
  type FirebaseStorage,
  connectStorageEmulator
} from 'firebase/storage';
import {
  getFunctions,
  type Functions,
  connectFunctionsEmulator
} from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-secid-alumni.firebaseapp.com',
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || 'demo-secid-alumni',
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-secid-alumni.appspot.com',
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef123456',
};

// Check if we're in development/emulator mode
const USE_EMULATOR = import.meta.env.DEV || import.meta.env.PUBLIC_USE_EMULATOR === 'true';
const EMULATOR_HOST = 'localhost';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;
let analytics: Analytics | null = null;

// Initialize Firebase only on client-side
if (typeof window !== 'undefined') {
  // Check if Firebase is already initialized
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  // Set persistence for auth
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting persistence:', error);
  });

  // Enable offline persistence for Firestore
  enableIndexedDbPersistence(db).catch((error) => {
    if (error.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (error['code'] === 'unimplemented') {
      console.warn('The current browser does not support offline persistence');
    }
  });

  // Connect to emulators in development
  if (USE_EMULATOR) {
    console.log('🔧 Connecting to Firebase Emulators...');
    
    // Connect Auth emulator
    try {
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { 
        disableWarnings: true 
      });
      console.log('✅ Connected to Auth Emulator');
    } catch (error) {
      console.warn('Auth Emulator already connected or error:', error);
    }

    // Connect Firestore emulator
    try {
      connectFirestoreEmulator(db, EMULATOR_HOST, 8088);
      console.log('✅ Connected to Firestore Emulator');
    } catch (error) {
      console.warn('Firestore Emulator already connected or error:', error);
    }

    // Connect Storage emulator
    try {
      connectStorageEmulator(storage, EMULATOR_HOST, 9199);
      console.log('✅ Connected to Storage Emulator');
    } catch (error) {
      console.warn('Storage Emulator already connected or error:', error);
    }

    // Connect Functions emulator
    try {
      connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
      console.log('✅ Connected to Functions Emulator');
    } catch (error) {
      console.warn('Functions Emulator already connected or error:', error);
    }
  }

  // Initialize Analytics (only in production, not in emulator)
  if (!USE_EMULATOR) {
    isSupported().then((supported) => {
      if(supported) {
        analytics = getAnalytics(app);
        console.log('📊 Analytics initialized');
      }
    });
  }
}

// Helper functions for checking connection status
export const isEmulatorMode = (): boolean => USE_EMULATOR;

export const getEmulatorStatus = () => ({
  auth: USE_EMULATOR ? `http://${EMULATOR_HOST}:9099` : null,
  firestore: USE_EMULATOR ? `http://${EMULATOR_HOST}:8088` : null,
  storage: USE_EMULATOR ? `http://${EMULATOR_HOST}:9199` : null,
  functions: USE_EMULATOR ? `http://${EMULATOR_HOST}:5001` : null,
  ui: USE_EMULATOR ? `http://${EMULATOR_HOST}:4000` : null,
});

// Export initialized services
export { app, auth, db, storage, functions, analytics };

// Export types for TypeScript
export type { FirebaseApp, Auth, Firestore, FirebaseStorage, Functions, Analytics };