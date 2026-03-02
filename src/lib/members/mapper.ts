/**
 * Member profile data mapping and mock data generation.
 */

import type { MemberProfile } from '@/types/member';

/**
 * Map a flat Firestore user document (as written by Cloud Functions)
 * to the MemberProfile shape expected by the UI components.
 */
export function mapUserDocToMemberProfile(uid: string, data: Record<string, any>): MemberProfile {
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
      lastActive: data.lifecycle?.lastActiveDate?.toDate?.() || data.updatedAt?.toDate?.() || new Date(),
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
export const createMockMemberProfile = (index: number): MemberProfile => ({
  uid: `member_${index}`,
  email: `member${index}@example.com`,
  role: 'member',
  createdAt: new Date(2023, 0, index),
  displayName: `Member ${index}`,
  initials: `M${index}`,
  isOnline: Math.random() > 0.5,
  lastSeen: new Date(Date.now() - Math.random() * 86400000 * 7),
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
