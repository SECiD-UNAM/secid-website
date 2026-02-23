// Mentorship types for SECiD mentorship program

export interface MentorProfile {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  title: string;
  company: string;
  bio: string;
  expertise: string[];
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
  createdAt: Date;
  updatedAt: Date;
}

export interface MenteeProfile {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  title?: string;
  company?: string;
  bio: string;
  goals: string[];
  interests: string[];
  currentLevel: 'student' | 'entry' | 'mid' | 'senior';
  linkedinUrl?: string;
  preferredMeetingType: 'video' | 'chat' | 'both';
  timezone: string;
  isActive: boolean;
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
  startDate: Date;
  endDate?: Date;
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
  type: 'video' | 'chat' | 'in-person';
  meetingLink?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MentorshipStats {
  totalMentors: number;
  totalMentees: number;
  activeMatches: number;
  completedSessions: number;
  averageRating: number;
  topExpertise: Array<{ skill: string; count: number }>;
}
