/**
 * Firebase Client SDK Configuration
 * This module initializes Firebase services for client-side use only
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  type Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from 'firebase/functions';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate configuration
function validateConfig(): void {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ] as const;

  for (const field of requiredFields) {
    if (!firebaseConfig[field]) {
      throw new Error(
        `Missing required Firebase configuration: ${field}. ` +
          `Please check your environment variables.`
      );
    }
  }
}

// Initialize Firebase services
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;
let analytics: Analytics | null = null;

// Only initialize on client-side
if (typeof window !== 'undefined') {
  try {
    validateConfig();

    // Initialize app or use existing
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

    // Enable offline persistence for Firestore
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this browser');
      }
    });

    // Initialize Analytics if supported
    isSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized');
      }
    });

    // Connect to emulators in development
    if (import.meta.env.PUBLIC_USE_EMULATORS === 'true') {
      console.log('Connecting to Firebase emulators...');

      // Auth emulator
      connectAuthEmulator(auth, 'http://localhost:9099', {
        disableWarnings: true,
      });

      // Firestore emulator
      connectFirestoreEmulator(db, 'localhost', 8080);

      // Storage emulator
      connectStorageEmulator(storage, 'localhost', 9199);

      // Functions emulator
      connectFunctionsEmulator(functions, 'localhost', 5001);

      console.log('Connected to Firebase emulators');
    }

    // Debug logging in development
    if (import.meta.env.PUBLIC_DEBUG_MODE === 'true') {
      console.log(
        'Firebase initialized with project:',
        firebaseConfig.projectId
      );
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

// Export services and utilities
export { app, auth, db, storage, functions, analytics };

// Export types
export type {
  FirebaseApp,
  Auth,
  Firestore,
  FirebaseStorage,
  Functions,
  Analytics,
};

// Utility function to check if Firebase is initialized
export function isFirebaseInitialized(): boolean {
  return typeof window !== 'undefined' && !!app;
}

// Error handler for Firebase operations
export function handleFirebaseError(error: any): string {
  const errorCode = error?.code || 'unknown';
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'El correo electrónico ya está en uso',
    'auth/weak-password': 'La contraseña es muy débil',
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/account-exists-with-different-credential':
      'La cuenta existe con diferentes credenciales',
    'auth/requires-recent-login': 'Por favor, vuelve a iniciar sesión',
    'auth/too-many-requests':
      'Demasiados intentos. Por favor, intenta más tarde',
    'permission-denied': 'No tienes permisos para realizar esta acción',
    unavailable: 'El servicio no está disponible temporalmente',
    'deadline-exceeded': 'La operación tardó demasiado tiempo',
    'not-found': 'Recurso no encontrado',
    'already-exists': 'El recurso ya existe',
    'resource-exhausted': 'Cuota excedida',
    cancelled: 'Operación cancelada',
    'data-loss': 'Error de datos irrecuperable',
    unknown: 'Error desconocido',
  };

  return errorMessages[errorCode] || `Error: ${error?.message || errorCode}`;
}
