import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, db, isEmulatorMode } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, type Unsubscribe } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'member' | 'admin' | 'moderator' | 'company' | 'collaborator';
  isVerified: boolean;
  isActive: boolean;
  membershipTier: 'free' | 'premium' | 'corporate';
  unamEmail?: string;
  studentId?: string;
  graduationYear?: number;
  program?: string;
  currentPosition?: string;
  currentCompany?: string;
  phoneNumber?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  profileCompleteness?: number;
  photoURL?: string;
  onboardingCompleted?: boolean;
  trustedContributor?: boolean;
  createdAt?: any;
  updatedAt?: any;
  // Profile merge detection
  potentialMergeMatch?: {
    matchedUid: string;
    numeroCuenta: string;
    detectedAt: any;
    dismissed: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isCompany: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  isVerified: false,
  isAdmin: false,
  isModerator: false,
  isCompany: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileUnsubRef = useRef<Unsubscribe | null>(null);

  // Subscribe to user profile changes
  const subscribeToProfile = (uid: string): Unsubscribe => {
    const userRef = doc(db, 'users', uid);

    return onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot['exists']()) {
          const data = snapshot['data']() as UserProfile;
          setUserProfile({
            ...data,
            uid: snapshot['id'],
          });
          setError(null);
        } else {
          // Profile doesn't exist yet (might be created by Cloud Function)
          setUserProfile(null);
          console.log('User profile not found, waiting for creation...');
        }
      },
      (err) => {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile');
        // Keep last known profile to prevent auth flapping on transient errors

        const firebaseErr = err as { code?: string };
        if (firebaseErr.code === 'permission-denied') {
          // Firebase terminates the listener on permission-denied; attempt recovery
          setTimeout(() => {
            auth.currentUser
              ?.getIdToken(true)
              .then(() => {
                if (profileUnsubRef.current) {
                  profileUnsubRef.current();
                }
                profileUnsubRef.current = subscribeToProfile(uid);
              })
              .catch((refreshErr) => {
                console.error(
                  'Token refresh failed during recovery:',
                  refreshErr
                );
              });
          }, 2000);
        }
      }
    );
  };

  // Refresh user profile manually
  const refreshProfile = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot['data']() as UserProfile;
        setUserProfile({
          ...data,
          uid: snapshot['id'],
        });
        setError(null);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError('Failed to refresh profile');
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setError(null);
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    }
  };

  useEffect(() => {
    let unsubscribeAuth: Unsubscribe | null = null;

    // Wait for Firebase to restore any persisted session before subscribing.
    // Without this, onAuthStateChanged can fire with null before the
    // persisted session is read from IndexedDB, causing ProtectedRoute
    // to redirect to login prematurely.
    auth.authStateReady().then(() => {
      unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Subscribe to profile changes
          if (profileUnsubRef.current) {
            profileUnsubRef.current();
          }
          profileUnsubRef.current = subscribeToProfile(firebaseUser.uid);

          // Show emulator status in development
          if (isEmulatorMode()) {
            console.log('🔧 Auth Context: Using Firebase Emulator');
            console.log('👤 Authenticated user:', firebaseUser['email']);
          }
        } else {
          setUser(null);
          setUserProfile(null);

          // Clean up profile subscription
          if (profileUnsubRef.current) {
            profileUnsubRef.current();
            profileUnsubRef.current = null;
          }
        }

        setLoading(false);
      });
    });

    // Cleanup on unmount
    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
      }
    };
  }, []);

  // Force token refresh when tab becomes visible to prevent stale auth
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        auth.currentUser.getIdToken(true).catch((err) => {
          console.warn('Token refresh failed:', err);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Compute derived state
  const isAuthenticated = !!user;
  const isVerified = userProfile?.isVerified || false;
  const isAdmin = userProfile?.role === 'admin';
  const isModerator = userProfile?.role === 'moderator';
  const isCompany = userProfile?.role === 'company';

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated,
    isVerified,
    isAdmin,
    isModerator,
    isCompany,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
