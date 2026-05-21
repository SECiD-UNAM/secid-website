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
import { doc, getDoc, type Unsubscribe } from 'firebase/firestore';
import type { UserProfile } from '@/types/user';
import { useResolvedProfile } from '@/hooks/useResolvedProfile';
export type { UserProfile };

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  // Two-tier access:
  //  emailVerified (Firebase Auth)  → BASIC access
  //  isVerified    (Firestore users/{uid}.isVerified, set only after
  //                 numeroCuenta + proof + admin review) → FULL access
  emailVerified: boolean;
  isVerified: boolean;
  // True once the user picked a registration type / ran completeRegistration.
  // Used to route incomplete accounts back into the completion flow.
  registrationComplete: boolean;
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
  emailVerified: false,
  isVerified: false,
  registrationComplete: false,
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
  const [loading, setLoading] = useState(true);
  // authReady tracks whether the Firebase Auth state has been resolved at
  // least once; until then we hold loading=true regardless of the hook.
  const authReadyRef = useRef(false);

  // Use the shared hook for alias-aware profile subscription.
  const {
    profile: userProfile,
    loading: profileLoading,
    error,
  } = useResolvedProfile(user?.uid);

  // Mirror hook error into local state (hook provides it directly, but the
  // context exposes a mutable error so we keep a local copy for signOut/refresh).
  const [localError, setLocalError] = useState<string | null>(null);

  // Propagate hook error changes into local error state.
  useEffect(() => {
    setLocalError(error);
  }, [error]);

  // Once the auth state is ready AND (there is no user OR the profile hook has
  // resolved its first snapshot), clear the global loading flag.
  // This preserves the original onFirstSnapshot behaviour: loading stays true
  // until the profile is available, preventing ProtectedRoute flicker.
  useEffect(() => {
    if (!authReadyRef.current) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (!profileLoading) {
      setLoading(false);
    }
  }, [user, profileLoading]);

  // Refresh user profile manually
  const refreshProfile = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        // useResolvedProfile will pick up the updated doc via its live listener;
        // this manual refresh is a one-shot read kept for API compatibility.
        setLocalError(null);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setLocalError('Failed to refresh profile');
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setLocalError(null);
    } catch (err) {
      console.error('Error signing out:', err);
      setLocalError('Failed to sign out');
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
        authReadyRef.current = true;
        if (firebaseUser) {
          setUser(firebaseUser);

          // Show emulator status in development
          if (isEmulatorMode()) {
            console.log('Auth Context: Using Firebase Emulator');
            console.log('Authenticated user:', firebaseUser['email']);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      });
    });

    // Cleanup on unmount
    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
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
  // BASIC tier: Firebase Auth email verified.
  const emailVerified = user?.emailVerified || false;
  // FULL tier: Firestore field, set only after numeroCuenta + proof +
  // admin review (completeRegistration → verificationStatus:'pending' →
  // admin approve → isVerified:true).
  const isVerified = userProfile?.isVerified || false;
  // Registration is "complete" once a type was chosen (member/recruiter
  // get a registrationType; collaborator path also sets it). Used to
  // detect accounts stuck pre-completeRegistration (e.g. the 403 cohort).
  const registrationComplete = !!userProfile?.registrationType;
  const isAdmin = userProfile?.role === 'admin';
  const isModerator = userProfile?.role === 'moderator';
  const isCompany = userProfile?.role === 'company';

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    error: localError,
    isAuthenticated,
    emailVerified,
    isVerified,
    registrationComplete,
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
