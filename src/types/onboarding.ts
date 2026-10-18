/**
 * Onboarding Flow Type Definitions
 * Comprehensive types for SECiD member onboarding process
 */

import type { MemberProfile } from './member';
import type { UserProfile } from './user';

// Onboarding step definitions
export type OnboardingStep =
  | 'welcome'
  | 'profile-setup'
  | 'interests-selection'
  | 'goals-definition'
  | 'connection-suggestions'
  | 'complete';

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  totalSteps: number;
  completionPercentage: number;
  startedAt: Date;
  lastUpdated: Date;
  estimatedTimeRemaining?: number; // in minutes
  canSkipStep: boolean;
  isOptionalStep: boolean;
}

export interface OnboardingState {
  progress: OnboardingProgress;
  data: OnboardingData;
  preferences: OnboardingPreferences;
  analytics: OnboardingAnalytics;
}

export interface OnboardingData {
  // Welcome step data
  welcome: {
    hasWatchedIntro?: boolean;
    selectedLanguage?: 'es' | 'en';
    agreedToTerms: boolean;
    subscribedToNewsletter?: boolean;
  };

  // Profile setup data
  profileSetup: {
    basicInfo: {
      displayName?: string;
      firstName?: string;
      lastName?: string;
      headline?: string;
      bio?: string;
      location?: {
        city?: string;
        state?: string;
        country?: string;
      };
      profilePhoto?: string;
    };
    contact: {
      email?: string;
      phone?: string;
      preferredContactMethod?: 'email' | 'phone' | 'platform';
    };
    professional: {
      currentCompany?: string;
      currentRole?: string;
      experienceLevel?:
        | 'student'
        | 'junior'
        | 'mid'
        | 'senior'
        | 'lead'
        | 'executive';
      yearsOfExperience?: number;
      graduationYear?: number;
      specialization?: string[];
    };
  };

  // Interests and skills selection
  interestsSelection: {
    primarySkills: string[];
    secondarySkills: string[];
    learningGoals: string[];
    industries: string[];
    technologies: string[];
    certifications: string[];
    languagesSpoken: string[];
    hobbies: string[];
  };

  // Goals definition
  goalsDefinition: {
    careerGoals: {
      shortTerm: string[]; // 6-12 months
      longTerm: string[]; // 2-5 years
      dreamRole?: string;
      targetCompanies?: string[];
      targetSalaryRange?: {
        min?: number;
        max?: number;
        currency: 'MXN' | 'USD' | 'EUR';
      };
    };
    learningGoals: {
      skillsToLearn: string[];
      certificationGoals: string[];
      timeCommitment: 'casual' | 'regular' | 'intensive';
      preferredLearningStyle:
        | 'self-paced'
        | 'structured'
        | 'mentored'
        | 'group';
    };
    networkingGoals: {
      connectionTargets: number;
      mentorshipInterest: 'mentor' | 'mentee' | 'both' | 'none';
      eventParticipation: 'active' | 'occasional' | 'observer';
      contributionLevel:
        | 'content-creator'
        | 'discussion-participant'
        | 'consumer';
    };
  };

  // Connection suggestions preferences
  connectionSuggestions: {
    selectedConnections: string[]; // UIDs of members to connect with
    connectionCriteria: {
      sameCompany: boolean;
      sameLocation: boolean;
      similarSkills: boolean;
      similarGoals: boolean;
      mentorshipMatch: boolean;
    };
    privacySettings: {
      allowDiscovery: boolean;
      showInDirectory: boolean;
      allowDirectMessages: boolean;
    };
  };

  // Completion preferences
  completion: {
    tourPreferences: {
      takePlatformTour: boolean;
      focusAreas: ('jobs' | 'networking' | 'learning' | 'events')[];
    };
    notificationPreferences: {
      email: boolean;
      push: boolean;
      frequency: 'immediate' | 'daily' | 'weekly';
      types: ('connections' | 'jobs' | 'events' | 'content')[];
    };
    quickStartActions: string[];
  };
}

export interface OnboardingPreferences {
  language: 'es' | 'en';
  skipOptionalSteps: boolean;
  saveProgress: boolean;
  receiveReminders: boolean;
  shareAnalytics: boolean;
  participateInResearch: boolean;
}

export interface OnboardingAnalytics {
  sessionId: string;
  userId: string;
  startTime: Date;
  stepTimings: Record<
    OnboardingStep,
    {
      startTime?: Date;
      endTime?: Date;
      duration?: number;
      interactions?: OnboardingInteraction[];
    }
  >;
  totalDuration?: number;
  abandonmentPoint?: OnboardingStep;
  completionTime?: Date;
  deviceInfo: {
    userAgent: string;
    screenSize: string;
    isMobile: boolean;
    platform: string;
  };
  abTestVariant?: string;
}

export interface OnboardingInteraction {
  type:
    | 'click'
    | 'focus'
    | 'input'
    | 'scroll'
    | 'hover'
    | 'skip'
    | 'back'
    | 'help';
  element: string;
  timestamp: Date;
  value?: any;
  metadata?: Record<string, any>;
}

// Component prop interfaces
export interface OnboardingFlowProps {
  initialStep?: OnboardingStep;
  onComplete: (data: OnboardingData) => void;
  onStepChange?: (step: OnboardingStep, progress: OnboardingProgress) => void;
  onAbandonment?: (step: OnboardingStep, reason: string) => void;
  className?: string;
  abTestVariant?: string;
}

export interface OnboardingStepProps {
  data: OnboardingData;
  onNext: (stepData: any) => void;
  onBack?: () => void;
  onSkip?: () => void;
  progress: OnboardingProgress;
  isActive: boolean;
  className?: string;
}

// Achievement and gamification
export interface OnboardingAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'completion' | 'engagement' | 'social' | 'profile';
  unlockedAt?: Date;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface OnboardingGamification {
  points: number;
  level: number;
  achievements: OnboardingAchievement[];
  streaks: {
    dailyLogins: number;
    profileCompleteness: number;
    socialInteractions: number;
  };
  badges: string[];
  leaderboardPosition?: number;
}

// Recommendation and personalization
export interface OnboardingRecommendation {
  type: 'connection' | 'job' | 'event' | 'content' | 'skill' | 'mentor';
  title: string;
  description: string;
  confidence: number; // 0-1
  reasoning: string[];
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface OnboardingPersonalization {
  recommendedConnections: MemberProfile[];
  suggestedJobs: any[]; // Job type from jobs module
  recommendedEvents: any[]; // Event type from events module
  personalizedContent: OnboardingRecommendation[];
  learningPath: {
    skills: string[];
    resources: any[];
    timeline: string;
  };
}

// Tour and tutorial definitions
export interface OnboardingTourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  showSkip: boolean;
  optional: boolean;
  action?: {
    type: 'click' | 'input' | 'navigate';
    selector?: string;
    value?: string;
    url?: string;
  };
}

export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  steps: OnboardingTourStep[];
  estimatedDuration: number; // in minutes
  category:
    | 'platform-basics'
    | 'job-search'
    | 'networking'
    | 'advanced-features';
  required: boolean;
}

// API and Firebase integration types
export interface OnboardingFirebaseData {
  uid: string;
  progress: OnboardingProgress;
  data: OnboardingData;
  preferences: OnboardingPreferences;
  analytics: OnboardingAnalytics;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  version: string; // For schema versioning
}

export interface OnboardingEmailTrigger {
  type: 'welcome' | 'reminder' | 'completion' | 'achievement';
  recipientId: string;
  templateId: string;
  personalizations: Record<string, any>;
  scheduledFor?: Date;
  sent: boolean;
  sentAt?: Date;
}

// A/B Testing support
export interface OnboardingABTest {
  id: string;
  name: string;
  description: string;
  variants: OnboardingABVariant[];
  allocation: Record<string, number>; // variant -> percentage
  active: boolean;
  startDate: Date;
  endDate?: Date;
  targetMetric: string;
}

export interface OnboardingABVariant {
  id: string;
  name: string;
  description: string;
  changes: {
    stepOrder?: OnboardingStep[];
    skipableSteps?: OnboardingStep[];
    styling?: Record<string, any>;
    content?: Record<string, any>;
    features?: string[];
  };
}

// Validation schemas
export interface OnboardingValidation {
  step: OnboardingStep;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number; // 0-1
}

// Quick start guide generation
export interface QuickStartGuide {
  id: string;
  userId: string;
  personalizedSteps: QuickStartStep[];
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
  generatedAt: Date;
  expiresAt: Date;
}

export interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  actionUrl: string;
  estimatedTime: number; // in minutes
  importance: 'critical' | 'recommended' | 'optional';
  category: 'profile' | 'networking' | 'job-search' | 'learning';
  completed: boolean;
  completedAt?: Date;
}

// Export utility types
export type OnboardingStepComponent = React.ComponentType<OnboardingStepProps>;
export type OnboardingStepRegistry = Record<
  OnboardingStep,
  OnboardingStepComponent
>;

// Event types for analytics
export type OnboardingEvent =
  | { type: 'step_started'; step: OnboardingStep; timestamp: Date }
  | {
      type: 'step_completed';
      step: OnboardingStep;
      duration: number;
      timestamp: Date;
    }
  | {
      type: 'step_skipped';
      step: OnboardingStep;
      reason?: string;
      timestamp: Date;
    }
  | {
      type: 'onboarding_abandoned';
      step: OnboardingStep;
      reason: string;
      timestamp: Date;
    }
  | { type: 'onboarding_completed'; totalDuration: number; timestamp: Date }
  | {
      type: 'achievement_unlocked';
      achievement: OnboardingAchievement;
      timestamp: Date;
    }
  | {
      type: 'connection_made';
      connectionId: string;
      source: 'suggestion' | 'manual';
      timestamp: Date;
    }
  | { type: 'tour_started'; tourId: string; timestamp: Date }
  | {
      type: 'tour_completed';
      tourId: string;
      duration: number;
      timestamp: Date;
    };
