import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, analytics } from './firebase-config';
import { logEvent } from 'firebase/analytics';

/**
 * Onboarding Utilities and Firebase Integration
 * Comprehensive utilities for managing SECiD member onboarding process
 */

import {
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

import type {
  OnboardingFirebaseData,
  OnboardingState,
  OnboardingStep,
  OnboardingEvent,
  OnboardingAnalytics,
  OnboardingEmailTrigger,
  OnboardingABTest,
  OnboardingRecommendation,
  OnboardingPersonalization,
  OnboardingTour,
  QuickStartGuide,
  OnboardingAchievement,
  OnboardingData
} from '../types/onboarding';
import type { MemberProfile } from '../types/member';

// Firestore collections
const ONBOARDING_COLLECTION = 'onboarding';
const ONBOARDING_ANALYTICS_COLLECTION = 'onboarding_analytics';
const ONBOARDING_EVENTS_COLLECTION = 'onboarding_events';
const ONBOARDING_EMAIL_TRIGGERS_COLLECTION = 'onboarding_email_triggers';
const ONBOARDING_AB_TESTS_COLLECTION = 'onboarding_ab_tests';
const QUICK_START_GUIDES_COLLECTION = 'quick_start_guides';

// Storage paths
const ONBOARDING_STORAGE_PATH = 'onboarding';
const PROFILE_PHOTOS_PATH = `${ONBOARDING_STORAGE_PATH}/profile_photos`;

/**
 * Save onboarding progress to Firebase
 */
export async function saveOnboardingProgress(
  userId: string, 
  onboardingState: Partial<OnboardingState>
): Promise<void> {
  try {
    const onboardingRef = doc(db, ONBOARDING_COLLECTION, userId);
    
    const firebaseData: Partial<OnboardingFirebaseData> = {
      uid: userId,
      ...onboardingState,
      updatedAt: serverTimestamp() as Timestamp,
      version: '1.0.0'
    };

    // If this is the first save, add createdAt
    const existingDoc = await getDoc(onboardingRef);
    if (!existingDoc.exists()) {
      firebaseData['createdAt'] = serverTimestamp() as Timestamp;
    }

    // If onboarding is complete, mark completion time
    if (onboardingState?.progress?.completionPercentage === 100) {
      firebaseData.completedAt = serverTimestamp() as Timestamp;
    }

    await setDoc(onboardingRef, firebaseData, { merge: true });
    
    // Log analytics event
    if(analytics) {
      logEvent(analytics, 'onboarding_progress_saved', {
        user_id: userId,
        current_step: onboardingState?.progress?.currentStep,
        completion_percentage: onboardingState?.progress?.completionPercentage
      });
    }
  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    throw new Error('Failed to save onboarding progress');
  }
}

/**
 * Load onboarding progress from Firebase
 */
export async function loadOnboardingProgress(userId: string): Promise<OnboardingFirebaseData | null> {
  try {
    const onboardingRef = doc(db, ONBOARDING_COLLECTION, userId);
    const docSnap = await getDoc(onboardingRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as OnboardingFirebaseData;
      return {
        ...data,
        // Convert Firestore timestamps to Date objects
        createdAt: data['createdAt']?.toDate?.() || new Date(),
        updatedAt: data['updatedAt']?.toDate?.() || new Date(),
        completedAt: data['completedAt']?.toDate?.() || undefined,
        analytics: {
          ...data.analytics,
          startTime: data['analytics']?.startTime?.toDate?.() || new Date()
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error loading onboarding progress:', error);
    throw new Error('Failed to load onboarding progress');
  }
}

/**
 * Delete onboarding progress (for cleanup or reset)
 */
export async function deleteOnboardingProgress(userId: string): Promise<void> {
  try {
    const onboardingRef = doc(db, ONBOARDING_COLLECTION, userId);
    await deleteDoc(onboardingRef);
    
    // Also delete related analytics data
    await deleteOnboardingAnalytics(userId);
    
    if(analytics) {
      logEvent(analytics, 'onboarding_progress_deleted', { user_id: userId });
    }
  } catch (error) {
    console.error('Error deleting onboarding progress:', error);
    throw new Error('Failed to delete onboarding progress');
  }
}

/**
 * Track onboarding events for analytics
 */
export async function trackOnboardingEvent(
  sessionId: string, 
  event: OnboardingEvent
): Promise<void> {
  try {
    const eventRef = doc(collection(db, ONBOARDING_EVENTS_COLLECTION));
    
    await setDoc(eventRef, {
      sessionId,
      ...event,
      timestamp: serverTimestamp()
    });

    // Also log to Firebase Analytics if available
    if(analytics) {
      logEvent(analytics, `onboarding_${event['type']}`, {
        session_id: sessionId,
        step: 'step' in event ? event.step : undefined,
        duration: 'duration' in event ? event.duration : undefined,
        reason: 'reason' in event ? event.reason : undefined
      });
    }
  } catch (error) {
    console.error('Error tracking onboarding event:', error);
    // Don't throw error for analytics - it shouldn't break the flow
  }
}

/**
 * Get onboarding analytics for a user
 */
export async function getOnboardingAnalytics(userId: string): Promise<OnboardingAnalytics | null> {
  try {
    const analyticsRef = doc(db, ONBOARDING_ANALYTICS_COLLECTION, userId);
    const docSnap = await getDoc(analyticsRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        startTime: data['startTime']?.toDate?.() || new Date(),
        completionTime: data?.completionTime?.toDate?.() || undefined
      } as OnboardingAnalytics;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting onboarding analytics:', error);
    return null;
  }
}

/**
 * Delete onboarding analytics data
 */
export async function deleteOnboardingAnalytics(userId: string): Promise<void> {
  try {
    const analyticsRef = doc(db, ONBOARDING_ANALYTICS_COLLECTION, userId);
    await deleteDoc(analyticsRef);
  } catch (error) {
    console.error('Error deleting onboarding analytics:', error);
  }
}

/**
 * Upload profile photo during onboarding
 */
export async function uploadOnboardingProfilePhoto(
  userId: string, 
  file: File
): Promise<string> {
  try {
    // Validate file
    if (!file['type'].startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size must be less than 5MB');
    }

    // Create unique filename
    const fileExtension = file['name'].split('').pop();
    const fileName = `${userId}_${Date.now()}.${fileExtension}`;
    const photoRef = ref(storage, `${PROFILE_PHOTOS_PATH}/${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(photoRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    if(analytics) {
      logEvent(analytics, 'onboarding_photo_uploaded', {
        user_id: userId,
        file_size: file.size,
        file_type: file['type']
      });
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw new Error('Failed to upload profile photo');
  }
}

/**
 * Delete old profile photo
 */
export async function deleteOnboardingProfilePhoto(photoUrl: string): Promise<void> {
  try {
    if (photoUrl.includes(PROFILE_PHOTOS_PATH)) {
      const photoRef = ref(storage, photoUrl);
      await deleteObject(photoRef);
    }
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    // Don't throw error - photo deletion is not critical
  }
}

/**
 * Get A/B test variant for user
 */
export async function getABTestVariant(userId: string, testId?: string): Promise<string | null> {
  try {
    // If no test ID provided, get the active test
    let activeTestId = testId;
    
    if (!activeTestId) {
      const testsQuery = query(
        collection(db, ONBOARDING_AB_TESTS_COLLECTION),
        where('active', '==', true),
        orderBy('startDate', 'desc'),
        limit(1)
      );
      
      const testsDocs = await getDocs(testsQuery);
      if (testsDocs.empty) return null;
      
      activeTestId = testsDocs.docs?.[0].id;
    }
    
    // Use a hash of user ID to consistently assign variant
    const hash = await hashString(userId + activeTestId);
    const variants = ['control', 'variant_a', 'variant_b'];
    const variantIndex = hash % variants.length;
    
    const variant = variants[variantIndex];
    
    if(analytics) {
      logEvent(analytics, 'onboarding_ab_test_assigned', {
        user_id: userId,
        test_id: activeTestId,
        variant
      });
    }
    
    return variant;
  } catch (error) {
    console.error('Error getting A/B test variant:', error);
    return null;
  }
}

/**
 * Generate personalized recommendations based on onboarding data
 */
export async function generateOnboardingRecommendations(
  userId: string,
  onboardingData: OnboardingData
): Promise<OnboardingPersonalization> {
  try {
    // This would typically call a cloud function for ML-based recommendations
    // For now, we'll implement basic rule-based recommendations
    
    const recommendations: OnboardingRecommendation[] = [];
    
    // Job recommendations based on skills and goals
    if (onboardingData.goalsDefinition.careerGoals.targetCompanies.length > 0) {
      recommendations.push({
        type: 'job',
        title: 'Recommended Jobs',
        description: `Jobs at ${onboardingData.goalsDefinition.careerGoals.targetCompanies.slice(0, 2).join(' and ')}`,
        confidence: 0.8,
        reasoning: ['Target companies match', 'Skills alignment'],
        actionUrl: '/jobs',
        metadata: {
          companies: onboardingData.goalsDefinition.careerGoals.targetCompanies
        }
      });
    }
    
    // Learning recommendations
    if (onboardingData.goalsDefinition.learningGoals.skillsToLearn.length > 0) {
      recommendations.push({
        type: 'content',
        title: 'Learning Resources',
        description: `Resources for ${onboardingData.goalsDefinition.learningGoals.skillsToLearn.slice(0, 2).join(' and ')}`,
        confidence: 0.9,
        reasoning: ['Learning goals match'],
        actionUrl: '/resources',
        metadata: {
          skills: onboardingData.goalsDefinition.learningGoals.skillsToLearn
        }
      });
    }
    
    // Event recommendations
    recommendations.push({
      type: 'event',
      title: 'Upcoming Events',
      description: 'Data science events and workshops',
      confidence: 0.7,
      reasoning: ['Interest-based matching'],
      actionUrl: '/events'
    });
    
    return {
      recommendedConnections: [], // Would be populated by connection algorithm
      suggestedJobs: [], // Would be populated by job matching algorithm
      recommendedEvents: [], // Would be populated by event recommendation algorithm
      personalizedContent: recommendations,
      learningPath: {
        skills: onboardingData.goalsDefinition.learningGoals.skillsToLearn,
        resources: [],
        timeline: onboardingData.goalsDefinition.learningGoals.timeCommitment === 'intensive' ? '3-6 months' : '6-12 months'
      }
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      recommendedConnections: [],
      suggestedJobs: [],
      recommendedEvents: [],
      personalizedContent: [],
      learningPath: {
        skills: [],
        resources: [],
        timeline: '6-12 months'
      }
    };
  }
}

/**
 * Create and save personalized quick start guide
 */
export async function createQuickStartGuide(
  userId: string, 
  onboardingData: OnboardingData
): Promise<QuickStartGuide> {
  try {
    const guide: QuickStartGuide = {
      id: `${userId}_${Date.now()}`,
      userId,
      personalizedSteps: [], // Steps would be generated based on onboarding data
      estimatedTime: 30, // Total estimated time in minutes
      priority: 'high',
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
    
    // Save to Firestore
    const guideRef = doc(db, QUICK_START_GUIDES_COLLECTION, guide['id']);
    await setDoc(guideRef, {
      ...guide,
      generatedAt: serverTimestamp(),
      expiresAt: serverTimestamp()
    });
    
    if(analytics) {
      logEvent(analytics, 'quick_start_guide_created', {
        user_id: userId,
        guide_id: guide['id'],
        steps_count: guide.personalizedSteps.length
      });
    }
    
    return guide;
  } catch (error) {
    console.error('Error creating quick start guide:', error);
    throw new Error('Failed to create quick start guide');
  }
}

/**
 * Trigger welcome email after onboarding completion
 */
export async function triggerWelcomeEmail(
  userId: string, 
  onboardingData: OnboardingData
): Promise<void> {
  try {
    const emailTrigger: OnboardingEmailTrigger = {
      type: 'welcome',
      recipientId: userId,
      templateId: 'onboarding_welcome',
      personalizations: {
        firstName: onboardingData.profileSetup.basicInfo.firstName,
        displayName: onboardingData.profileSetup.basicInfo.displayName,
        primarySkills: onboardingData.interestsSelection.primarySkills.slice(0, 3),
        connectionCount: onboardingData.connectionSuggestions.selectedConnections.length
      },
      sent: false
    };
    
    // Save trigger to Firestore - Cloud Function will process it
    const triggerRef = doc(collection(db, ONBOARDING_EMAIL_TRIGGERS_COLLECTION));
    await setDoc(triggerRef, {
      ...emailTrigger,
      createdAt: serverTimestamp()
    });
    
    if(analytics) {
      logEvent(analytics, 'welcome_email_triggered', { user_id: userId });
    }
  } catch (error) {
    console.error('Error triggering welcome email:', error);
    // Don't throw error - email is not critical for onboarding completion
  }
}

/**
 * Get platform tour configuration
 */
export async function getPlatformTour(focusAreas: string[]): Promise<OnboardingTour[]> {
  try {
    // In a real implementation, this would fetch tour configurations from Firestore
    // For now, return static tour configurations based on focus areas
    
    const allTours: OnboardingTour[] = [
      {
        id: 'dashboard_basics',
        name: 'Dashboard Basics',
        description: 'Learn the fundamentals of navigating your dashboard',
        steps: [
          {
            id: 'dashboard_overview',
            target: '#dashboard-nav',
            title: 'Your Dashboard',
            content: 'This is your personal dashboard where you can access all platform features.',
            position: 'bottom',
            showSkip: true,
            optional: false
          }
        ],
        estimatedDuration: 5,
        category: 'platform-basics',
        required: true
      }
    ];
    
    return focusAreas.length > 0 
      ? allTours.filter(tour => focusAreas.includes(tour.category))
      : allTours.filter(tour => tour.required);
  } catch (error) {
    console.error('Error getting platform tour:', error);
    return [];
  }
}

/**
 * Calculate profile completeness score
 */
export function calculateProfileCompleteness(onboardingData: OnboardingData): number {
  let score = 0;
  let totalFields = 0;
  
  // Basic info (30% weight)
  const basicFields = [
    'firstName', 'lastName', 'displayName', 'headline', 'bio', 
    'profilePhoto', 'location.city', 'location.state', 'location.country'
  ];
  
  basicFields.forEach(field => {
    totalFields += 3; // Weight for basic fields
    const value = getNestedValue(onboardingData.profileSetup.basicInfo, field);
    if (value && value.toString().trim()) {
      score += 3;
    }
  });
  
  // Contact info (10% weight)
  totalFields += 2; // email (2), phone (1), preferredContactMethod (1)
  if (onboardingData.profileSetup.contact['email']?.trim()) score += 2;
  if (onboardingData.profileSetup.contact?.phone?.trim()) score += 1;
  if (onboardingData.profileSetup.contact.preferredContactMethod) score += 1;
  
  // Professional info (25% weight)
  const professionalFields = [
    'currentRole', 'currentCompany', 'experienceLevel', 
    'yearsOfExperience', 'graduationYear', 'specialization'
  ];
  
  professionalFields.forEach(field => {
    totalFields += 2;
    const value = getNestedValue(onboardingData.profileSetup.professional, field);
    if (value && (Array.isArray(value) ? value.length > 0 : value.toString().trim())) {
      score += 2;
    }
  });
  
  // Skills and interests (20% weight)
  totalFields += 5;
  if (onboardingData.interestsSelection.primarySkills.length >= 3) score += 2;
  if (onboardingData.interestsSelection.learningGoals.length > 0) score += 1;
  if (onboardingData.interestsSelection.industries.length > 0) score += 1;
  if (onboardingData.interestsSelection.technologies.length > 0) score += 1;
  
  // Goals (15% weight)
  totalFields += 3;
  if (onboardingData.goalsDefinition.careerGoals.shortTerm.length > 0) score += 1;
  if (onboardingData.goalsDefinition.careerGoals.longTerm.length > 0) score += 1;
  if (onboardingData.goalsDefinition.learningGoals.skillsToLearn.length > 0) score += 1;
  
  return Math.round((score / totalFields) * 100);
}

/**
 * Get achievements based on onboarding completion
 */
export function getOnboardingAchievements(onboardingData: OnboardingData): OnboardingAchievement[] {
  const achievements: OnboardingAchievement[] = [];
  
  // Profile Completeness achievements
  const completeness = calculateProfileCompleteness(onboardingData);
  if (completeness >= 80) {
    achievements.push({
      id: 'profile_complete',
      name: 'Profile Master',
      description: 'Completed 80% or more of your profile',
      icon: '👤',
      type: 'completion',
      points: 100,
      rarity: 'common'
    });
  }
  
  // Skills achievements
  if (onboardingData.interestsSelection.primarySkills.length >= 5) {
    achievements.push({
      id: 'skill_collector',
      name: 'Skill Collector',
      description: 'Added 5 or more primary skills',
      icon: '🛠️',
      type: 'profile',
      points: 75,
      rarity: 'common'
    });
  }
  
  // Networking achievements
  if (onboardingData.connectionSuggestions.selectedConnections.length >= 5) {
    achievements.push({
      id: 'super_connector',
      name: 'Super Connector',
      description: 'Selected 5 or more connections to start networking',
      icon: '🤝',
      type: 'social',
      points: 150,
      rarity: 'rare'
    });
  }
  
  // Goal setting achievements
  const totalGoals = onboardingData.goalsDefinition.careerGoals.shortTerm.length + 
                    onboardingData.goalsDefinition.careerGoals.longTerm.length +
                    onboardingData.goalsDefinition.learningGoals.skillsToLearn.length;
  
  if (totalGoals >= 5) {
    achievements.push({
      id: 'goal_setter',
      name: 'Ambitious Planner',
      description: 'Set 5 or more career and learning goals',
      icon: '🎯',
      type: 'engagement',
      points: 125,
      rarity: 'rare'
    });
  }
  
  return achievements.map(achievement => ({
    ...achievement,
    unlockedAt: new Date()
  }));
}

/**
 * Utility function to get nested object values
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('').reduce((current, key) => current?.[key], obj);
}

/**
 * Simple hash function for consistent A/B test assignment
 */
async function hashString(str: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.reduce((hash, byte) => hash + byte, 0);
}

/**
 * Validate onboarding data before saving
 */
export function validateOnboardingData(data: OnboardingData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields validation
  if (!data?.profileSetup?.basicInfo?.firstName?.trim()) {
    errors.push('First name is required');
  }
  
  if (!data['profileSetup'].basicInfo?.lastName?.trim()) {
    errors.push('Last name is required');
  }
  
  if (!data['profileSetup'].contact['email']?.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data?.profileSetup?.contact['email'])) {
    errors.push('Valid email is required');
  }
  
  if (!data['profileSetup'].professional?.currentRole?.trim()) {
    errors.push('Current role is required');
  }
  
  if (data['interestsSelection'].primarySkills.length < 3) {
    errors.push('At least 3 primary skills are required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Export for use in Cloud Functions
 */
export const onboardingUtils = {
  saveOnboardingProgress,
  loadOnboardingProgress,
  trackOnboardingEvent,
  generateOnboardingRecommendations,
  createQuickStartGuide,
  triggerWelcomeEmail,
  calculateProfileCompleteness,
  validateOnboardingData
};