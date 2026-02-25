/**
 * Firebase Configuration & Services
 * Consolidated module for Firebase initialization (SSR + client-side),
 * emulator support, auth persistence, and utility functions.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import {
  getAuth,
  type Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import {
  getStorage,
  type FirebaseStorage,
  connectStorageEmulator,
} from 'firebase/storage';
import {
  getFunctions,
  type Functions,
  connectFunctionsEmulator,
} from 'firebase/functions';
import { firebaseLogger as logger } from './logger';

// ---------------------------------------------------------------------------
// Firebase configuration with fallback defaults for dev/build/SSR safety
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain:
    import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'demo-secid-alumni.firebaseapp.com',
  projectId:
    import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || 'demo-secid-alumni',
  storageBucket:
    import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'demo-secid-alumni.appspot.com',
  messagingSenderId:
    import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId:
    import.meta.env.PUBLIC_FIREBASE_APP_ID ||
    '1:123456789:web:abcdef123456',
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ---------------------------------------------------------------------------
// Emulator settings
// ---------------------------------------------------------------------------
const USE_EMULATOR =
  import.meta.env.DEV ||
  import.meta.env.PUBLIC_USE_EMULATOR === 'true' ||
  import.meta.env.PUBLIC_USE_EMULATORS === 'true';
const EMULATOR_HOST = 'localhost';

// ---------------------------------------------------------------------------
// Service instances
// ---------------------------------------------------------------------------
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;
let analytics: Analytics | null = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
if (typeof window === 'undefined') {
  // ---- Server-side (SSR / Build) ----
  // Minimal init so that modules importing db/auth don't blow up during SSR.
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
} else {
  // ---- Client-side ----
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0]!;
    }

    // Core services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    // Auth persistence
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      logger.error('Error setting auth persistence', error);
    });

    // Firestore offline persistence
    enableIndexedDbPersistence(db).catch((error) => {
      if (error.code === 'failed-precondition') {
        logger.warn(
          'Multiple tabs open, persistence can only be enabled in one tab at a time.'
        );
      } else if (error.code === 'unimplemented') {
        logger.warn(
          'The current browser does not support offline persistence'
        );
      }
    });

    // Emulator connections (each wrapped in try/catch so a reconnect doesn't crash)
    if (USE_EMULATOR) {
      logger.info('Connecting to Firebase Emulators...');

      try {
        connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, {
          disableWarnings: true,
        });
        logger.info('Connected to Auth Emulator');
      } catch (error) {
        logger.warn('Auth Emulator already connected or error', {
          error: String(error),
        });
      }

      try {
        connectFirestoreEmulator(db, EMULATOR_HOST, 8088);
        logger.info('Connected to Firestore Emulator');
      } catch (error) {
        logger.warn('Firestore Emulator already connected or error', {
          error: String(error),
        });
      }

      try {
        connectStorageEmulator(storage, EMULATOR_HOST, 9199);
        logger.info('Connected to Storage Emulator');
      } catch (error) {
        logger.warn('Storage Emulator already connected or error', {
          error: String(error),
        });
      }

      try {
        connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
        logger.info('Connected to Functions Emulator');
      } catch (error) {
        logger.warn('Functions Emulator already connected or error', {
          error: String(error),
        });
      }
    }

    // Analytics (only in production / non-emulator mode)
    if (!USE_EMULATOR) {
      isSupported().then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
          logger.info('Analytics initialized');
        }
      });
    }

    // Debug logging
    if (import.meta.env.PUBLIC_DEBUG_MODE === 'true') {
      logger.info('Firebase initialized with project', {
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase', error as Error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Exports: service instances
// ---------------------------------------------------------------------------
export { app, auth, db, storage, functions, analytics };

// ---------------------------------------------------------------------------
// Exports: types
// ---------------------------------------------------------------------------
export type {
  FirebaseApp,
  Auth,
  Firestore,
  FirebaseStorage,
  Functions,
  Analytics,
};
export type { UserCredential } from 'firebase/auth';

// ---------------------------------------------------------------------------
// Emulator helpers
// ---------------------------------------------------------------------------

/** Whether the app is running in emulator / development mode. */
export const isEmulatorMode = (): boolean => USE_EMULATOR;

/** URLs for each emulator service (or null when not in emulator mode). */
export const getEmulatorStatus = () => ({
  auth: USE_EMULATOR ? `http://${EMULATOR_HOST}:9099` : null,
  firestore: USE_EMULATOR ? `http://${EMULATOR_HOST}:8088` : null,
  storage: USE_EMULATOR ? `http://${EMULATOR_HOST}:9199` : null,
  functions: USE_EMULATOR ? `http://${EMULATOR_HOST}:5001` : null,
  ui: USE_EMULATOR ? `http://${EMULATOR_HOST}:4000` : null,
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Check whether Firebase has been initialised (client-side only). */
export function isFirebaseInitialized(): boolean {
  return typeof window !== 'undefined' && !!app;
}

/** Translate a Firebase error code into a user-friendly Spanish string. */
export function handleFirebaseError(error: any): string {
  const errorCode = error?.code || 'unknown';
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contrasena incorrecta',
    'auth/email-already-in-use': 'El correo electronico ya esta en uso',
    'auth/weak-password': 'La contrasena es muy debil',
    'auth/invalid-email': 'Correo electronico invalido',
    'auth/operation-not-allowed': 'Operacion no permitida',
    'auth/account-exists-with-different-credential':
      'La cuenta existe con diferentes credenciales',
    'auth/requires-recent-login': 'Por favor, vuelve a iniciar sesion',
    'auth/too-many-requests':
      'Demasiados intentos. Por favor, intenta mas tarde',
    'permission-denied': 'No tienes permisos para realizar esta accion',
    unavailable: 'El servicio no esta disponible temporalmente',
    'deadline-exceeded': 'La operacion tardo demasiado tiempo',
    'not-found': 'Recurso no encontrado',
    'already-exists': 'El recurso ya existe',
    'resource-exhausted': 'Cuota excedida',
    cancelled: 'Operacion cancelada',
    'data-loss': 'Error de datos irrecuperable',
    unknown: 'Error desconocido',
  };

  return errorMessages[errorCode] || `Error: ${error?.message || errorCode}`;
}

/**
 * Check if the app should use the mock API instead of real Firebase.
 * Returns true when PUBLIC_USE_MOCK_API is explicitly set or when there is
 * no API key configured in a development build.
 */
export function isUsingMockAPI(): boolean {
  return (
    import.meta.env.PUBLIC_USE_MOCK_API === 'true' ||
    (!import.meta.env.PUBLIC_FIREBASE_API_KEY && import.meta.env.DEV)
  );
}

/**
 * Check if Firebase is running with demo/fallback credentials.
 * Returns true when the API key is the default placeholder, meaning
 * authentication will silently fail.
 */
export function isDemoMode(): boolean {
  return firebaseConfig.apiKey === 'demo-api-key';
}
