import { db, storage, isUsingMockAPI } from './firebase';

/**
 * Firebase utilities for member data operations
 * Handles CRUD operations for member profiles, connections, and networking features
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import {
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import type {
  MemberProfile,
  MemberSearchFilters,
  MemberSearchResult,
  MemberStats,
  MemberStatus,
  MemberLifecycle,
  ConnectionRequest,
  DirectMessage,
  Conversation,
  MemberRecommendation,
  NetworkingAnalytics,
  vCardData
} from '@/types/member';
import type { DirectoryStats } from '@/types/admin';

// Collection names — Cloud Functions write user profiles to 'users', so we read from there
const COLLECTIONS = {
  MEMBERS: 'users',
  CONNECTION_REQUESTS: 'connectionRequests',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  MEMBER_ANALYTICS: 'memberAnalytics'
};

/**
 * Map a flat Firestore user document (as written by Cloud Functions)
 * to the MemberProfile shape expected by the UI components.
 */
function mapUserDocToMemberProfile(uid: string, data: Record<string, any>): MemberProfile {
  const firstName = data.firstName || data.profile?.firstName || '';
  const lastName = data.lastName || data.profile?.lastName || '';
  const displayName = data.displayName || `${firstName} ${lastName}`.trim() || 'Miembro';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    uid,
    email: data.email || '',
    role: data.role || 'member',
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    displayName,
    initials,
    isOnline: data.isOnline || false,
    lastSeen: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    joinedAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    profile: data.profile || {
      firstName,
      lastName,
      bio: data.bio || '',
      company: data.currentCompany || '',
      position: data.currentPosition || '',
      location: data.location || '',
      linkedin: data.linkedinUrl || '',
      skills: data.skills || [],
      photoURL: data.photoURL || undefined,
      graduationYear: data.graduationYear,
      degree: data.degree || 'Ciencia de Datos',
      specialization: data.specialization || '',
    },
    experience: data.experience || {
      years: 0,
      level: 'mid' as const,
      currentRole: data.currentPosition || '',
      previousRoles: [],
      industries: '',
    },
    social: data.social || {
      linkedin: data.linkedinUrl,
      github: data.githubUrl,
      portfolio: data.portfolioUrl,
    },
    networking: data.networking || {
      connections: [],
      pendingConnections: [],
      blockedUsers: [],
      followers: [],
      following: [],
      mentorshipStatus: 'none',
      availableForMentoring: data.privacySettings?.mentorshipAvailable || false,
      openToOpportunities: data.privacySettings?.jobSearching || false,
    },
    privacy: data.privacy || {
      profileVisibility: data.privacySettings?.profileVisible !== false ? 'public' : 'private',
      showEmail: data.privacySettings?.contactVisible || false,
      showPhone: false,
      showLocation: true,
      showCurrentCompany: true,
      showSalaryExpectations: false,
      allowMessages: 'all',
      allowConnectionRequests: true,
      showOnlineStatus: true,
      showLastSeen: true,
    },
    activity: data.activity || {
      profileViews: 0,
      totalConnections: 0,
      postsCount: 0,
      commentsCount: 0,
      helpfulVotes: 0,
      reputation: 0,
      lastActive: data.updatedAt?.toDate?.() || new Date(),
    },
    searchableKeywords: data.searchableKeywords || (data.skills || []).map((s: string) => s.toLowerCase()),
    featuredSkills: data.featuredSkills || (data.skills || []).slice(0, 5),
    isPremium: data.isPremium || data.membershipTier === 'premium' || data.membershipTier === 'corporate',
    settings: data.settings || {
      emailNotifications: data.notificationSettings?.email !== false,
      profileVisibility: data.privacySettings?.profileVisible !== false ? 'public' : 'private',
      language: 'es',
    },
  };
}

// Mock data for development
const createMockMemberProfile = (index: number): MemberProfile => ({
  uid: `member_${index}`,
  email: `member${index}@example.com`,
  role: 'member',
  createdAt: new Date(2023, 0, index),
  displayName: `Member ${index}`,
  initials: `M${index}`,
  isOnline: Math.random() > 0.5,
  lastSeen: new Date(Date.now() - Math.random() * 86400000 * 7), // Random within last week
  joinedAt: new Date(2023, 0, index),
  profile: {
    firstName: `Member`,
    lastName: `${index}`,
    bio: `Experienced data scientist with ${3 + Math.floor(Math.random() * 10)} years in the field. Passionate about machine learning and data visualization.`,
    company: ['Google', 'Microsoft', 'Amazon', 'Facebook', 'Netflix'][Math.floor(Math.random() * 5)] ?? 'Google',
    position: ['Data Scientist', 'ML Engineer', 'Data Analyst', 'Senior Data Scientist', 'Data Engineering Lead'][Math.floor(Math.random() * 5)] ?? 'Data Scientist',
    location: ['Mexico City', 'Guadalajara', 'Monterrey', 'Remote', 'San Francisco'][Math.floor(Math.random() * 5)] ?? 'Mexico City',
    linkedin: `https://linkedin.com/in/member${index}`,
    skills: ['Python', 'SQL', 'Machine Learning', 'TensorFlow', 'Pandas'].slice(0, Math.floor(Math.random() * 5) + 3),
    photoURL: undefined,
    graduationYear: 2015 + Math.floor(Math.random() * 8),
    degree: 'Data Science',
    specialization: 'Machine Learning'
  },
  experience: {
    years: 3 + Math.floor(Math.random() * 10),
    level: ['junior', 'mid', 'senior', 'lead'][Math.floor(Math.random() * 4)] as any,
    currentRole: 'Data Scientist',
    previousRoles: [],
    industries: [['Technology', 'Finance', 'Healthcare'][Math.floor(Math.random() * 3)] ?? 'Technology']
  },
  social: {
    linkedin: `https://linkedin.com/in/member${index}`,
    github: `https://github.com/member${index}`,
    portfolio: `https://member${index}.dev`
  },
  networking: {
    connections: [],
    pendingConnections: [],
    blockedUsers: [],
    followers: [],
    following: [],
    mentorshipStatus: 'none',
    availableForMentoring: Math.random() > 0.5,
    openToOpportunities: Math.random() > 0.3
  },
  privacy: {
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showLocation: true,
    showCurrentCompany: true,
    showSalaryExpectations: false,
    allowMessages: 'all',
    allowConnectionRequests: true,
    showOnlineStatus: true,
    showLastSeen: true
  },
  activity: {
    profileViews: Math.floor(Math.random() * 500),
    totalConnections: Math.floor(Math.random() * 100),
    postsCount: Math.floor(Math.random() * 50),
    commentsCount: Math.floor(Math.random() * 200),
    helpfulVotes: Math.floor(Math.random() * 150),
    reputation: Math.floor(Math.random() * 1000),
    lastActive: new Date()
  },
  searchableKeywords: ['data', 'science', 'machine', 'learning'],
  featuredSkills: ['Python', 'SQL', 'Machine Learning'],
  isPremium: Math.random() > 0.8,
  settings: {
    emailNotifications: true,
    profileVisibility: 'public',
    language: 'es'
  }
});

/**
 * Get member profiles with optional filters and pagination
 */
export async function getMemberProfiles(options: {
  filters?: Partial<MemberSearchFilters>;
  limit?: number;
  lastDoc?: DocumentSnapshot;
} = {}): Promise<MemberProfile[]> {
  if (isUsingMockAPI()) {
    // Return mock data for development
    const count = options.limit || 20;
    return Array.from({ length: count }, (_, i) => createMockMemberProfile(i + 1));
  }

  try {
    const { filters = {}, limit: queryLimit = 20, lastDoc } = options;
    let q = query(collection(db, COLLECTIONS.MEMBERS));

    // Apply filters
    if (filters?.experienceLevel?.length) {
      q = query(q, where('experience.level', 'in', filters.experienceLevel));
    }

    if (filters?.locations?.length) {
      q = query(q, where('profile.location', 'in', filters.locations));
    }

    if (filters.onlineStatus) {
      q = query(q, where('isOnline', '==', true));
    }

    if (filters.isPremium) {
      q = query(q, where('isPremium', '==', true));
    }

    if (filters.hasPortfolio) {
      q = query(q, where('portfolio.projects', '!=', null));
    }

    if (filters.joinedAfter) {
      q = query(q, where('joinedAt', '>=', filters.joinedAfter));
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'activity';
    const sortOrder = filters.sortOrder || 'desc';
    
    switch(sortBy) {
      case 'name':
        q = query(q, orderBy('displayName', sortOrder));
        break;
      case 'joinDate':
        q = query(q, orderBy('joinedAt', sortOrder));
        break;
      case 'reputation':
        q = query(q, orderBy('activity.reputation', sortOrder));
        break;
      default:
        q = query(q, orderBy('activity.lastActive', sortOrder));
    }

    // Add pagination
    if(lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    q = query(q, limit(queryLimit));

    const snapshot = await getDocs(q);
    return snapshot['docs'].map(doc => mapUserDocToMemberProfile(doc['id'], doc.data()));
  } catch (error) {
    console.error('Error fetching member profiles:', error);
    throw error;
  }
}

/**
 * Search members with advanced filters
 */
export async function searchMembers(filters: MemberSearchFilters): Promise<MemberSearchResult[]> {
  if (isUsingMockAPI()) {
    // Mock search results
    const mockMembers = Array.from({ length: 10 }, (_, i) => createMockMemberProfile(i + 1));
    return mockMembers.map(member => ({
      member,
      matchScore: Math.floor(Math.random() * 40) + 60, // 60-100%
      matchReasons: ['Similar skills', 'Same location'],
      relevantSkills: member.featuredSkills.slice(0, 2)
    }));
  }

  try {
    // For complex searches, we might need to use multiple queries or Algolia
    let baseQuery = query(collection(db, COLLECTIONS.MEMBERS));

    // Text search on searchable keywords (simplified)
    if (filters.query) {
      const keywords = filters.query.toLowerCase().split(' ');
      baseQuery = query(baseQuery, where('searchableKeywords', 'array-contains-any', keywords));
    }

    // Apply other filters similar to getMemberProfiles
    const snapshot = await getDocs(baseQuery);
    const members = snapshot['docs'].map(doc => mapUserDocToMemberProfile(doc['id'], doc.data()));

    // Calculate match scores (simplified implementation)
    return members.map(member => ({
      member,
      matchScore: calculateMatchScore(member, filters),
      matchReasons: getMatchReasons(member, filters),
      relevantSkills: getRelevantSkills(member, filters)
    }));
  } catch (error) {
    console.error('Error searching members:', error);
    throw error;
  }
}

/**
 * Get a single member profile by UID
 */
export async function getMemberProfile(uid: string): Promise<MemberProfile | null> {
  if (isUsingMockAPI()) {
    return createMockMemberProfile(1);
  }

  try {
    const docRef = doc(db, COLLECTIONS.MEMBERS, uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return mapUserDocToMemberProfile(docSnap['id'], docSnap.data());
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching member profile:', error);
    throw error;
  }
}

/**
 * Update member profile
 */
export async function updateMemberProfile(uid: string, updates: Partial<MemberProfile>): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Updating member profile', uid, updates);
    return;
  }

  try {
    const docRef = doc(db, COLLECTIONS.MEMBERS, uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating member profile:', error);
    throw error;
  }
}

/**
 * Get member statistics
 */
export async function getMemberStats(): Promise<MemberStats> {
  if (isUsingMockAPI()) {
    return {
      totalMembers: 1247,
      onlineMembers: 89,
      newMembersThisMonth: 23,
      topSkills: [
        { skill: 'Python', count: 892 },
        { skill: 'SQL', count: 756 },
        { skill: 'Machine Learning', count: 634 }
      ],
      topCompanies: [
        { company: 'Google', count: 45 },
        { company: 'Microsoft', count: 38 },
        { company: 'Amazon', count: 32 }
      ],
      topLocations: [
        { location: 'Mexico City', count: 234 },
        { location: 'Guadalajara', count: 123 },
        { location: 'Remote', count: 89 }
      ]
    };
  }

  try {
    // In production, these would be aggregated queries or pre-computed stats
    const membersRef = collection(db, COLLECTIONS.MEMBERS);
    
    // Total members
    const totalSnapshot = await getDocs(query(membersRef));
    const totalMembers = totalSnapshot.size;

    // Online members
    const onlineSnapshot = await getDocs(query(membersRef, where('isOnline', '==', true)));
    const onlineMembers = onlineSnapshot.size;

    // New members this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newMembersSnapshot = await getDocs(
      query(membersRef, where('joinedAt', '>=', startOfMonth))
    );
    const newMembersThisMonth = newMembersSnapshot.size;

    // For aggregated data like top skills, you'd typically use Cloud Functions
    // or maintain separate aggregation collections
    return {
      totalMembers,
      onlineMembers,
      newMembersThisMonth,
      topSkills: [], // Would be computed from aggregated data
      topCompanies: [],
      topLocations: []
    };
  } catch (error) {
    console.error('Error fetching member stats:', error);
    throw error;
  }
}

/**
 * Connection management functions
 */
export async function sendConnectionRequest(
  fromUid: string, 
  toUid: string, 
  message?: string
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Sending connection request', { fromUid, toUid, message });
    return;
  }

  try {
    const batch = writeBatch(db);
    
    // Create connection request
    const requestRef = doc(collection(db, COLLECTIONS.CONNECTION_REQUESTS));
    const connectionRequest: ConnectionRequest = {
      id: requestRef['id'],
      from: fromUid,
      to: toUid,
      message,
      status: 'pending',
      createdAt: new Date()
    };
    
    batch.set(requestRef, connectionRequest);
    
    // Update recipient's pending connections
    const toMemberRef = doc(db, COLLECTIONS.MEMBERS, toUid);
    batch.update(toMemberRef, {
      'networking.pendingConnections': arrayUnion(fromUid)
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error sending connection request:', error);
    throw error;
  }
}

export async function acceptConnectionRequest(requestId: string): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Accepting connection request', requestId);
    return;
  }

  try {
    const requestRef = doc(db, COLLECTIONS.CONNECTION_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Connection request not found');
    }
    
    const request = requestSnap['data']() as ConnectionRequest;
    const batch = writeBatch(db);
    
    // Update request status
    batch.update(requestRef, {
      status: 'accepted',
      respondedAt: serverTimestamp()
    });
    
    // Add to both users' connections
    const fromMemberRef = doc(db, COLLECTIONS.MEMBERS, request.from);
    const toMemberRef = doc(db, COLLECTIONS.MEMBERS, request.to);
    
    batch.update(fromMemberRef, {
      'networking.connections': arrayUnion(request.to),
      'activity.totalConnections': increment(1)
    });
    
    batch.update(toMemberRef, {
      'networking.connections': arrayUnion(request.from),
      'networking.pendingConnections': arrayRemove(request.from),
      'activity.totalConnections': increment(1)
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error accepting connection request:', error);
    throw error;
  }
}

/**
 * Messaging functions
 */
export async function sendMessage(
  fromUid: string,
  toUid: string,
  content: string
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Sending message', { fromUid, toUid, content });
    return;
  }

  try {
    // Find or create conversation
    const conversationId = await getOrCreateConversation(fromUid, toUid);
    
    // Create message
    const messageRef = doc(collection(db, COLLECTIONS.MESSAGES));
    const message: DirectMessage = {
      id: messageRef['id'],
      conversationId,
      from: fromUid,
      to: toUid,
      content,
      type: 'text',
      timestamp: new Date(),
      read: false
    };
    
    const batch = writeBatch(db);
    batch.set(messageRef, message);
    
    // Update conversation
    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
    batch.update(conversationRef, {
      lastMessage: message,
      updatedAt: serverTimestamp(),
      [`unreadCount.${toUid}`]: increment(1)
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

async function getOrCreateConversation(uid1: string, uid2: string): Promise<string> {
  const participants = [uid1, uid2].sort();
  
  // Try to find existing conversation
  const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
  const q = query(conversationsRef, where('participants', '==', participants));
  const snapshot = await getDocs(q);
  
  if (!snapshot['empty'] && snapshot['docs'][0]) {
    return snapshot['docs'][0].id;
  }
  
  // Create new conversation
  const conversationRef = doc(conversationsRef);
  const conversation: Conversation = {
    id: conversationRef['id'],
    participants,
    unreadCount: { [uid1]: 0, [uid2]: 0 },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await setDoc(conversationRef, conversation);
  return conversationRef['id'];
}

/**
 * Real-time subscriptions
 */
export function subscribeToMemberUpdates(
  uid: string,
  callback: (member: MemberProfile | null) => void
): Unsubscribe {
  if (isUsingMockAPI()) {
    // Mock subscription
    callback(createMockMemberProfile(1));
    return () => {};
  }

  const memberRef = doc(db, COLLECTIONS.MEMBERS, uid);
  return onSnapshot(memberRef, (doc) => {
    if (doc.exists()) {
      callback(mapUserDocToMemberProfile(doc['id'], doc.data()));
    } else {
      callback(null);
    }
  });
}

export function subscribeToConnectionRequests(
  uid: string,
  callback: (requests: ConnectionRequest[]) => void
): Unsubscribe {
  if (isUsingMockAPI()) {
    callback([]);
    return () => {};
  }

  const requestsRef = collection(db, COLLECTIONS.CONNECTION_REQUESTS);
  const q = query(requestsRef, where('to', '==', uid), where('status', '==', 'pending'));
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data()
    } as ConnectionRequest));
    callback(requests);
  });
}

/**
 * Utility functions
 */
function calculateMatchScore(member: MemberProfile, filters: MemberSearchFilters): number {
  let score = 0;
  
  // Skills match
  if (filters?.skills?.length) {
    const commonSkills = member.profile.skills.filter(skill => 
      filters.skills!.some(filterSkill => 
        skill.toLowerCase().includes(filterSkill.toLowerCase())
      )
    );
    score += (commonSkills.length / filters.skills.length) * 40;
  }
  
  // Location match
  if (filters?.locations?.includes(member.profile.location)) {
    score += 20;
  }
  
  // Experience level match
  if (filters?.experienceLevel?.includes(member.experience.level)) {
    score += 15;
  }
  
  // Base score for active profiles
  score += Math.min(member.activity.reputation / 10, 25);
  
  return Math.min(Math.round(score), 100);
}

function getMatchReasons(member: MemberProfile, filters: MemberSearchFilters): string[] {
  const reasons: string[] = [];
  
  if (filters?.skills?.some(skill => member.profile.skills.includes(skill))) {
    reasons.push('Similar skills');
  }
  
  if (filters?.locations?.includes(member.profile.location)) {
    reasons.push('Same location');
  }
  
  if (filters?.companies?.includes(member.profile.company)) {
    reasons.push('Same company');
  }
  
  return reasons;
}

function getRelevantSkills(member: MemberProfile, filters: MemberSearchFilters): string[] {
  if (!filters?.skills?.length) return [];
  
  return member.profile.skills.filter(skill => 
    filters.skills!.some(filterSkill => 
      skill.toLowerCase().includes(filterSkill.toLowerCase())
    )
  );
}

/**
 * File upload functions
 */
export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  if (isUsingMockAPI()) {
    return 'https://via.placeholder.com/150';
  }

  try {
    const fileRef = ref(storage, `profiles/${uid}/avatar.jpg`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
}

/**
 * Analytics functions
 */
export async function trackProfileView(viewerUid: string, profileUid: string): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Tracking profile view', { viewerUid, profileUid });
    return;
  }

  try {
    const profileRef = doc(db, COLLECTIONS.MEMBERS, profileUid);
    await updateDoc(profileRef, {
      'activity.profileViews': increment(1)
    });
  } catch (error) {
    console.error('Error tracking profile view:', error);
  }
}

/**
 * Update a member's lifecycle status (admin action)
 * The Cloud Function onMemberStatusChange will handle Google Groups sync
 */
export async function updateMemberStatus(
  uid: string,
  newStatus: MemberStatus,
  changedBy: string,
  reason: string = ''
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Updating member status', { uid, newStatus, changedBy, reason });
    return;
  }

  const docRef = doc(db, COLLECTIONS.MEMBERS, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Member not found');
  }

  const data = docSnap.data();
  const currentStatus = data.lifecycle?.status || data.role || 'collaborator';

  const statusChange = {
    from: currentStatus,
    to: newStatus,
    changedBy,
    changedAt: new Date(),
    reason,
  };

  await updateDoc(docRef, {
    'lifecycle.status': newStatus,
    'lifecycle.statusChangedAt': serverTimestamp(),
    'lifecycle.statusChangedBy': changedBy,
    'lifecycle.statusReason': reason,
    'lifecycle.statusHistory': arrayUnion(statusChange),
    // Also update the top-level role for backwards compat
    ...(newStatus === 'active' ? { role: 'member' } : {}),
    ...(newStatus === 'collaborator' ? { role: 'collaborator' } : {}),
    ...(newStatus === 'pending' ? { verificationStatus: 'pending' } : {}),
    ...(newStatus === 'active' ? { verificationStatus: 'approved', isVerified: true } : {}),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Bulk update member statuses
 */
export async function bulkUpdateMemberStatus(
  uids: string[],
  newStatus: MemberStatus,
  changedBy: string,
  reason: string = ''
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Bulk updating member status', { uids, newStatus });
    return;
  }

  // Firestore batches are limited to 500 operations
  const batch = writeBatch(db);
  for (const uid of uids.slice(0, 250)) {
    const docRef = doc(db, COLLECTIONS.MEMBERS, uid);
    batch.update(docRef, {
      'lifecycle.status': newStatus,
      'lifecycle.statusChangedAt': Timestamp.now(),
      'lifecycle.statusChangedBy': changedBy,
      'lifecycle.statusReason': reason,
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();
}

/**
 * Get directory statistics
 */
export async function getDirectoryStatsData(): Promise<DirectoryStats> {
  if (isUsingMockAPI()) {
    return {
      totalMembers: 35,
      byStatus: {
        collaborator: 4,
        pending: 2,
        active: 25,
        inactive: 1,
        suspended: 0,
        alumni: 3,
        deactivated: 0,
      },
      newThisMonth: 3,
      pendingApproval: 2,
      recentlyActive: 20,
      dormant: 5,
      profileCompleteness: { complete: 15, partial: 12, minimal: 8 },
    };
  }

  const membersRef = collection(db, COLLECTIONS.MEMBERS);
  const snapshot = await getDocs(membersRef);

  const byStatus: Record<string, number> = {
    collaborator: 0,
    pending: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    alumni: 0,
    deactivated: 0,
  };

  let newThisMonth = 0;
  let pendingApproval = 0;
  let recentlyActive = 0;
  let dormant = 0;
  const completeness = { complete: 0, partial: 0, minimal: 0 };

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  snapshot.forEach((d) => {
    const data = d.data();
    const status = data.lifecycle?.status || (data.role === 'member' ? 'active' : 'collaborator');
    if (status && status in byStatus) {
      (byStatus as Record<string, number>)[status] = ((byStatus as Record<string, number>)[status] || 0) + 1;
    }

    const createdAt = data.createdAt?.toDate?.() || new Date(0);
    if (createdAt >= startOfMonth) newThisMonth++;

    if (data.verificationStatus === 'pending' || status === 'pending') pendingApproval++;

    const lastActive = data.lifecycle?.lastActiveDate?.toDate?.() || data.updatedAt?.toDate?.() || new Date(0);
    if (lastActive >= thirtyDaysAgo) {
      recentlyActive++;
    } else if (status === 'active') {
      dormant++;
    }

    const pc = data.profileCompleteness || 0;
    if (pc >= 80) completeness.complete++;
    else if (pc >= 40) completeness.partial++;
    else completeness.minimal++;
  });

  return {
    totalMembers: snapshot.size,
    byStatus: byStatus as Record<MemberStatus, number>,
    newThisMonth,
    pendingApproval,
    recentlyActive,
    dormant,
    profileCompleteness: completeness,
  };
}

/**
 * Export member data as vCard
 */
export function generateVCard(member: MemberProfile): vCardData {
  return {
    name: member.displayName,
    email: member['email'],
    phone: undefined, // Would come from profile if available
    company: member.profile.company,
    title: member.profile.position,
    linkedin: member.social.linkedin,
    website: member.social.portfolio
  };
}

/**
 * Member recommendations
 */
export async function getMemberRecommendations(uid: string): Promise<MemberRecommendation[]> {
  if (isUsingMockAPI()) {
    // Mock recommendations
    const mockMembers = Array.from({ length: 5 }, (_, i) => createMockMemberProfile(i + 10));
    return mockMembers.map(member => ({
      member,
      reason: ['similar_skills', 'same_company', 'mutual_connections'][Math.floor(Math.random() * 3)] as any,
      score: Math.floor(Math.random() * 30) + 70,
      commonElements: ['Python', 'Machine Learning']
    }));
  }

  try {
    // In production, this would use ML algorithms or rule-based recommendations
    const userProfile = await getMemberProfile(uid);
    if (!userProfile) return [];

    // For now, simple implementation based on skills and location
    const allMembers = await getMemberProfiles({ limit: 100 });
    
    return allMembers
      .filter(member => member.uid !== uid)
      .map(member => {
        const commonSkills = member.profile.skills.filter(skill => 
          userProfile.profile.skills.includes(skill)
        );
        
        let reason: MemberRecommendation['reason'] = 'similar_interests';
        let score = 50;
        
        if (commonSkills.length > 0) {
          reason = 'similar_skills';
          score += commonSkills.length * 10;
        }
        
        if (member.profile.company === userProfile.profile.company) {
          reason = 'same_company';
          score += 20;
        }
        
        if (member.profile.location === userProfile.profile.location) {
          score += 15;
        }
        
        return {
          member,
          reason,
          score: Math.min(score, 100),
          commonElements: commonSkills
        };
      })
      .filter(rec => rec.score > 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting member recommendations:', error);
    return [];
  }
}