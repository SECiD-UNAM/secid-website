import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth, db, isEmulatorMode} from '@/lib/firebase';
import {
  doc,
  onSnapshot,
  getDoc,
  type Unsubscribe
} from 'firebase/firestore';

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
  createdAt?: any;
  updatedAt?: any;
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
        setUserProfile(null);
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
    let unsubscribeProfile: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if(firebaseUser) {
        setUser(firebaseUser);
        
        // Subscribe to profile changes
        unsubscribeProfile = subscribeToProfile(firebaseUser.uid);
        
        // Show emulator status in development
        if (isEmulatorMode()) {
          console.log('🔧 Auth Context: Using Firebase Emulator');
          console.log('👤 Authenticated user:', firebaseUser['email']);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        
        // Clean up profile subscription
        if(unsubscribeProfile) {
          unsubscribeProfile();
        }
      }
      
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeAuth();
      if(unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;