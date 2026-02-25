/**
 * Member Directory Type Definitions
 * Enhanced member types with networking and privacy features
 */

import type { UserProfile } from './user';

// Member lifecycle status
export type MemberStatus = 'collaborator' | 'pending' | 'active' | 'inactive' | 'suspended' | 'alumni' | 'deactivated';

export interface MemberLifecycle {
  status: MemberStatus;
  statusChangedAt: Date;
  statusChangedBy?: string;
  statusReason?: string;
  statusHistory: StatusChange[];
  lastActiveDate: Date;
}

export interface StatusChange {
  from: MemberStatus;
  to: MemberStatus;
  changedBy: string;
  changedAt: Date;
  reason: string;
}

export interface MemberProfile extends UserProfile {
  uid: string;
  displayName: string;
  initials: string;
  isOnline: boolean;
  lastSeen: Date;
  joinedAt: Date;

  // Extended profile information
  portfolio?: {
    website?: string;
    github?: string;
    projects: ProjectShowcase[];
    achievements: Achievement[];
    certifications: Certification[];
  };

  // Professional information
  experience: {
    years: number;
    level: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
    currentRole: string;
    previousRoles: WorkExperience[];
    industries: string[];
  };

  // Social and networking
  social: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    portfolio?: string;
    personalWebsite?: string;
  };

  // Networking features
  networking: {
    connections: string[]; // UIDs of connected members
    pendingConnections: string[]; // UIDs of pending connection requests
    blockedUsers: string[]; // UIDs of blocked members
    followers: string[]; // UIDs of followers
    following: string[]; // UIDs of users they follow
    mentorshipStatus?: 'mentor' | 'mentee' | 'both' | 'none';
    availableForMentoring: boolean;
    openToOpportunities: boolean;
  };

  // Privacy and visibility settings
  privacy: {
    profileVisibility: 'public' | 'members' | 'connections' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    showCurrentCompany: boolean;
    showSalaryExpectations: boolean;
    allowMessages: 'all' | 'connections' | 'none';
    allowConnectionRequests: boolean;
    showOnlineStatus: boolean;
    showLastSeen: boolean;
  };

  // Activity and engagement
  activity: {
    profileViews: number;
    totalConnections: number;
    postsCount: number;
    commentsCount: number;
    helpfulVotes: number;
    reputation: number;
    lastActive: Date;
  };

  // Lifecycle management
  lifecycle?: MemberLifecycle;

  // Search and filtering metadata
  searchableKeywords: string[];
  featuredSkills: string[]; // Top 5 skills for quick display

  // Premium features
  isPremium: boolean;
  premiumFeatures?: {
    featuredProfile: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
  };
}

export interface ProjectShowcase {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  imageUrl?: string;
  githubUrl?: string;
  liveUrl?: string;
  category:
    | 'machine-learning'
    | 'data-analysis'
    | 'web-development'
    | 'research'
    | 'other';
  featured: boolean;
  createdAt: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl?: string;
  category: 'education' | 'professional' | 'community' | 'technical';
  earnedAt: Date;
  verificationUrl?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
  verified: boolean;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  technologies?: string[];
  achievements?: string[];
  current: boolean;
}

export interface ConnectionRequest {
  id: string;
  from: string; // UID
  to: string; // UID
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  respondedAt?: Date;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  from: string; // UID
  to: string; // UID
  content: string;
  type: 'text' | 'file' | 'image';
  timestamp: Date;
  read: boolean;
  readAt?: Date;
}

export interface Conversation {
  id: string;
  participants: string[]; // UIDs
  lastMessage?: DirectMessage;
  unreadCount: Record<string, number>; // UID -> unread count
  createdAt: Date;
  updatedAt: Date;
}

// Search and filter interfaces
export interface MemberSearchFilters {
  query?: string;
  skills?: string[];
  companies?: string[];
  locations?: string[];
  experienceLevel?: string[];
  industries?: string[];
  availability?: ('mentoring' | 'opportunities' | 'networking')[];
  onlineStatus?: boolean;
  hasPortfolio?: boolean;
  isPremium?: boolean;
  joinedAfter?: Date;
  sortBy?: 'relevance' | 'name' | 'joinDate' | 'activity' | 'reputation';
  sortOrder?: 'asc' | 'desc';
}

export interface MemberSearchResult {
  member: MemberProfile;
  matchScore?: number;
  matchReasons?: string[];
  relevantSkills?: string[];
}

export interface MemberStats {
  totalMembers: number;
  onlineMembers: number;
  newMembersThisMonth: number;
  topSkills: Array<{ skill: string; count: number }>;
  topCompanies: Array<{ company: string; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
}

// View mode types
export type ViewMode = 'grid' | 'list' | 'compact';

// Privacy levels for different data
export type PrivacyLevel = 'public' | 'members' | 'connections' | 'private';

// Member recommendation interface
export interface MemberRecommendation {
  member: MemberProfile;
  reason:
    | 'similar_skills'
    | 'same_company'
    | 'same_location'
    | 'mutual_connections'
    | 'similar_interests';
  score: number;
  commonElements?: string[];
}

// Networking analytics
export interface NetworkingAnalytics {
  connectionGrowth: Array<{ date: Date; count: number }>;
  profileViews: Array<{ date: Date; views: number }>;
  messageActivity: Array<{ date: Date; sent: number; received: number }>;
  topViewers: Array<{ member: MemberProfile; views: number }>;
  connectionSources: Array<{ source: string; count: number }>;
}

// Export/import interfaces
export interface vCardData {
  name: string;
  email: string;
  phone?: string;
  company: string;
  title: string;
  linkedin?: string;
  website?: string;
}

export interface MemberExportData {
  profile: MemberProfile;
  vCard: vCardData;
  qrCode?: string; // Base64 encoded QR code
}
