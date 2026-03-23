// Mentorship types for SECiD mentorship program

export interface MentorProfile {
  id: string;
  userId: string;
  name: string;
  displayName: string;
  avatar?: string;
  profileImage?: string;
  title: string;
  company: string;
  bio: string;
  expertise: string[];
  expertiseAreas: string[];
  industries: string[];
  yearsOfExperience: number;
  linkedinUrl?: string;
  availability: MentorAvailability;
  maxMentees: number;
  currentMentees: number;
  rating: number;
  reviewCount: number;
  totalSessions: number;
  isActive: boolean;
  isVerified: boolean;
  mentorshipStyle: string[];
  languages: string[];
  experience: {
    currentPosition: string;
    currentCompany: string;
    yearsInField: number;
  };
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenteeProfile {
  id: string;
  userId: string;
  name: string;
  displayName: string;
  avatar?: string;
  profileImage?: string;
  title?: string;
  company?: string;
  bio: string;
  goals: string[];
  interests: string[];
  currentLevel: 'student' | 'entry' | 'mid' | 'senior';
  linkedinUrl?: string;
  preferredMeetingType: 'video' | 'chat' | 'both';
  preferredMentorshipStyle: string[];
  languages: string[];
  timezone: string;
  isActive: boolean;
  availability: {
    hoursPerWeek: number;
    preferredDays: string[];
  };
  background: {
    yearsOfExperience: number;
  };
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
  hoursPerWeek: number;
  preferredDays: string[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;
}

export interface MentorshipMatch {
  id: string;
  mentorId: string;
  menteeId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  matchScore: number;
  matchReason?: string[];
  requestMessage?: string;
  meetingFrequency: string;
  communicationPreference: string;
  startDate: Date;
  endDate?: Date;
  lastActivity?: Date;
  goals: string[];
  notes?: string;
  rating?: number;
  feedback?: string;
  sessionsCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorshipRequest {
  id: string;
  menteeId: string;
  mentorId: string;
  message: string;
  goals: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  responseMessage?: string;
  meetingFrequency?: string;
  communicationPreference?: string;
  createdAt: Date;
  respondedAt?: Date;
}

export interface MentorshipSession {
  id: string;
  matchId: string;
  mentorId: string;
  menteeId: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number; // minutes
  type: 'video' | 'chat' | 'in-person' | 'voice';
  meetingLink?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  rating?: number;
  feedback?: string;
  agenda?: string[];
  homework?: Array<{
    title: string;
    description?: string;
    dueDate?: Date;
    completed?: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorshipStats {
  totalMentors: number;
  totalMentees: number;
  activeMatches: number;
  completedSessions: number;
  averageRating: number;
  successRate: number;
  averageMatchScore: number;
  topExpertise: Array<{ skill: string; count: number }>;
  popularSkills: Array<{ skill: string; count: number }>;
}

export interface MentorshipFeedback {
  id: string;
  sessionId?: string;
  matchId?: string;
  fromUserId: string;
  toUserId: string;
  type: 'session' | 'overall';
  rating: number;
  comment?: string;
  strengths?: string[];
  improvements?: string[];
  createdAt: Date;
}

export interface MentorshipGoal {
  id: string;
  matchId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  targetDate?: Date;
  milestones: Array<{
    title: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorshipResource {
  id: string;
  title: string;
  description?: string;
  url?: string;
  category: string;
  difficulty?: string;
  tags: string[];
  sharedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
