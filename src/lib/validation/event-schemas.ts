import { z } from 'zod';
import { CommonSchemas } from './validation-utils';

/**
 * Event validation schemas for SECiD platform
 * Handles event creation, registration, and management validation
 */

/**
 * Event types enum
 */
export const EventTypes = [
  'workshop',
  'webinar',
  'conference',
  'meetup',
  'networking',
  'hackathon',
  'panel',
  'training',
  'social',
  'career_fair',
  'other',
] as const;
export type EventType = (typeof EventTypes)[number];

/**
 * Event status enum
 */
export const EventStatuses = [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
] as const;
export type EventStatus = (typeof EventStatuses)[number];

/**
 * Event format enum
 */
export const EventFormats = ['in-person', 'virtual', 'hybrid'] as const;
export type EventFormat = (typeof EventFormats)[number];

/**
 * Registration status enum
 */
export const RegistrationStatuses = [
  'registered',
  'attended',
  'no_show',
  'cancelled',
  'waitlisted',
] as const;
export type RegistrationStatus = (typeof RegistrationStatuses)[number];

/**
 * Event difficulty levels
 */
export const DifficultyLevels = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'all_levels',
] as const;
export type DifficultyLevel = (typeof DifficultyLevels)[number];

/**
 * Event creation schema
 */
export const EventCreationSchema = z
  .object({
    // Basic information
    title: CommonSchemas.nonEmptyString(5, 150),
    description: CommonSchemas.nonEmptyString(50, 5000),
    shortDescription: CommonSchemas.nonEmptyString(20, 300),

    // Event details
    type: CommonSchemas.enumValue(EventTypes),
    format: CommonSchemas.enumValue(EventFormats),
    difficultyLevel:
      CommonSchemas.enumValue(DifficultyLevels).default('all_levels'),

    // Scheduling
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timezone: CommonSchemas.nonEmptyString(3, 50).default(
      'America/Mexico_City'
    ),

    // Location (for in-person and hybrid events)
    venue: CommonSchemas.nonEmptyString(3, 100).optional(),
    address: CommonSchemas.nonEmptyString(10, 200).optional(),
    city: CommonSchemas.nonEmptyString(2, 60).optional(),
    state: CommonSchemas.nonEmptyString(2, 60).optional(),
    country: CommonSchemas.nonEmptyString(2, 60).optional(),

    // Virtual event details
    meetingUrl: CommonSchemas.url.optional(),
    meetingId: CommonSchemas.nonEmptyString(5, 50).optional(),
    meetingPassword: CommonSchemas.nonEmptyString(3, 50).optional(),

    // Registration
    maxAttendees: z.number().min(1).max(10000).optional(),
    registrationStartDate: z.string().datetime().optional(),
    registrationEndDate: z.string().datetime().optional(),
    requiresApproval: z.boolean().default(false),
    allowWaitlist: z.boolean().default(true),

    // Cost
    isFree: z.boolean().default(true),
    price: z.number().min(0).max(100000).optional(),
    currency: z.enum(['USD', 'MXN', 'EUR']).default('MXN'),
    earlyBirdPrice: z.number().min(0).max(100000).optional(),
    earlyBirdDeadline: z.string().datetime().optional(),
    memberDiscount: z.number().min(0).max(100).default(0), // percentage

    // Content
    agenda: CommonSchemas.boundedArray(
      z.object({
        time: z.string(),
        title: CommonSchemas.nonEmptyString(3, 100),
        description: CommonSchemas.nonEmptyString(10, 500).optional(),
        speaker: CommonSchemas.nonEmptyString(3, 100).optional(),
        duration: z.number().min(1).max(480).optional(), // minutes
      }),
      0,
      20
    ).optional(),

    // Speakers
    speakers: CommonSchemas.boundedArray(
      z.object({
        name: CommonSchemas.nonEmptyString(3, 100),
        title: CommonSchemas.nonEmptyString(3, 150),
        company: CommonSchemas.nonEmptyString(3, 100).optional(),
        bio: CommonSchemas.nonEmptyString(50, 1000),
        photo: CommonSchemas.url.optional(),
        linkedin: CommonSchemas.url.optional(),
        twitter: CommonSchemas.url.optional(),
        website: CommonSchemas.url.optional(),
      }),
      0,
      10
    ).optional(),

    // Requirements and materials
    prerequisites: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(10, 200),
      0,
      10
    ).optional(),
    materials: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(10, 200),
      0,
      10
    ).optional(),

    // Tags and categories
    tags: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(2, 30),
      0,
      15
    ).optional(),
    categories: CommonSchemas.boundedArray(
      CommonSchemas.nonEmptyString(3, 50),
      0,
      5
    ).optional(),

    // Media
    bannerImage: CommonSchemas.url.optional(),
    images: CommonSchemas.boundedArray(CommonSchemas.url, 0, 10).optional(),

    // Contact and support
    contactEmail: CommonSchemas.email,
    supportEmail: CommonSchemas['email'].optional(),
    organizerNotes: CommonSchemas.nonEmptyString(10, 1000).optional(),

    // Features
    isFeatured: z.boolean().default(false),
    isRecurring: z.boolean().default(false),
    recurringPattern: z
      .object({
        frequency: z.enum(['daily', 'weekly', 'monthly']),
        interval: z.number().min(1).max(12),
        endDate: z.string().datetime(),
      })
      .optional(),

    // Recording and resources
    willBeRecorded: z.boolean().default(false),
    recordingAvailable: z.boolean().default(false),
    resourcesUrl: CommonSchemas.url.optional(),

    // Social
    hashtag: CommonSchemas.nonEmptyString(3, 30).optional(),
    socialDescription: CommonSchemas.nonEmptyString(50, 280).optional(),

    // CAPTCHA for public event creation
    captchaToken: CommonSchemas.nonEmptyString(1, 2000).optional(),
  })
  .refine(
    (data) => {
      return new Date(data.startDate) < new Date(data['endDate']);
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (data['registrationEndDate']) {
        return (
          new Date(data['registrationEndDate']) <= new Date(data['startDate'])
        );
      }
      return true;
    },
    {
      message:
        'Registration end date must be before or equal to event start date',
      path: ['registrationEndDate'],
    }
  )
  .refine(
    (data) => {
      if (data['registrationStartDate'] && data['registrationEndDate']) {
        return (
          new Date(data['registrationStartDate']) <
          new Date(data['registrationEndDate'])
        );
      }
      return true;
    },
    {
      message: 'Registration start date must be before registration end date',
      path: ['registrationStartDate'],
    }
  )
  .refine(
    (data) => {
      if (data['earlyBirdDeadline'] && data['earlyBirdPrice'] !== undefined) {
        return (
          new Date(data['earlyBirdDeadline']) < new Date(data['startDate'])
        );
      }
      return true;
    },
    {
      message: 'Early bird deadline must be before event start date',
      path: ['earlyBirdDeadline'],
    }
  )
  .refine(
    (data) => {
      if (data['format'] === 'virtual' || data['format'] === 'hybrid') {
        return data['meetingUrl'] || data['meetingId'];
      }
      return true;
    },
    {
      message: 'Virtual or hybrid events must have meeting URL or meeting ID',
      path: ['meetingUrl'],
    }
  )
  .refine(
    (data) => {
      if (data['format'] === 'in-person' || data['format'] === 'hybrid') {
        return (
          data['venue'] && data['address'] && data['city'] && data['country']
        );
      }
      return true;
    },
    {
      message:
        'In-person or hybrid events must have venue, address, city, and country',
      path: ['venue'],
    }
  );

/**
 * Event update schema
 */
export const EventUpdateSchema = EventCreationSchema.omit({
  captchaToken: true,
})
  .extend({
    status: CommonSchemas.enumValue(EventStatuses).optional(),
  })
  .partial();

/**
 * Event registration schema
 */
export const EventRegistrationSchema = z.object({
  eventId: CommonSchemas.objectId,

  // Registration details
  attendeeNotes: CommonSchemas.nonEmptyString(10, 500).optional(),
  dietaryRestrictions: CommonSchemas.nonEmptyString(5, 200).optional(),
  accessibilityNeeds: CommonSchemas.nonEmptyString(5, 200).optional(),

  // Emergency contact
  emergencyContactName: CommonSchemas.nonEmptyString(3, 100).optional(),
  emergencyContactPhone: CommonSchemas.phone.optional(),

  // Custom fields (dynamic based on event)
  customFields: z
    .record(z.string(), CommonSchemas.nonEmptyString(1, 500))
    .optional(),

  // Marketing preferences
  allowMarketingEmails: z.boolean().default(false),
  shareInfoWithSponsors: z.boolean().default(false),

  // Agreement
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the event terms and conditions',
  }),
  agreeToPhotography: z.boolean().default(false),

  // CAPTCHA
  captchaToken: CommonSchemas.nonEmptyString(1, 2000),
});

/**
 * Event search schema
 */
export const EventSearchSchema = z.object({
  query: CommonSchemas.nonEmptyString(1, 100).optional(),
  type: CommonSchemas.enumValue(EventTypes).optional(),
  format: CommonSchemas.enumValue(EventFormats).optional(),
  difficultyLevel: CommonSchemas.enumValue(DifficultyLevels).optional(),
  status: CommonSchemas.enumValue(EventStatuses).optional(),
  isFree: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  startDateAfter: z.string().datetime().optional(),
  startDateBefore: z.string().datetime().optional(),
  city: CommonSchemas.nonEmptyString(2, 60).optional(),
  country: CommonSchemas.nonEmptyString(2, 60).optional(),
  tags: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(2, 30),
    0,
    5
  ).optional(),
  categories: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(3, 50),
    0,
    3
  ).optional(),
  hasAvailableSpots: z.boolean().optional(),
});

/**
 * Event attendance schema
 */
export const EventAttendanceSchema = z.object({
  registrationIds: CommonSchemas.boundedArray(CommonSchemas.objectId, 1, 100),
  status: CommonSchemas.enumValue(RegistrationStatuses),
  checkInTime: z.string().datetime().optional(),
  checkOutTime: z.string().datetime().optional(),
  notes: CommonSchemas.nonEmptyString(5, 500).optional(),
});

/**
 * Event feedback schema
 */
export const EventFeedbackSchema = z.object({
  eventId: CommonSchemas.objectId,

  // Ratings (1-5 scale)
  overallRating: z.number().min(1).max(5),
  contentRating: z.number().min(1).max(5),
  speakerRating: z.number().min(1).max(5),
  organizationRating: z.number().min(1).max(5),
  venueRating: z.number().min(1).max(5).optional(),

  // Comments
  feedback: CommonSchemas.nonEmptyString(10, 2000),
  suggestions: CommonSchemas.nonEmptyString(10, 1000).optional(),

  // Recommendations
  wouldRecommend: z.boolean(),
  wouldAttendAgain: z.boolean(),

  // Topics of interest for future events
  futureTopics: CommonSchemas.boundedArray(
    CommonSchemas.nonEmptyString(3, 100),
    0,
    10
  ).optional(),

  // Anonymous feedback option
  isAnonymous: z.boolean().default(false),
});

/**
 * Event analytics schema
 */
export const EventAnalyticsSchema = z.object({
  eventId: CommonSchemas.objectId,
  views: z.number().min(0).default(0),
  registrations: z.number().min(0).default(0),
  attendees: z.number().min(0).default(0),
  noShows: z.number().min(0).default(0),
  cancellations: z.number().min(0).default(0),
  waitlistSize: z.number().min(0).default(0),
  conversionRate: z.number().min(0).max(100).default(0), // percentage
  avgRating: z.number().min(0).max(5).default(0),
  period: z.enum(['day', 'week', 'month', 'event']).default('event'),
});

/**
 * Event report schema
 */
export const EventReportSchema = z.object({
  eventId: CommonSchemas.objectId,
  reason: z.enum([
    'inappropriate_content',
    'misinformation',
    'discrimination',
    'spam',
    'scam',
    'copyright_violation',
    'other',
  ]),
  description: CommonSchemas.nonEmptyString(10, 1000),
  evidence: CommonSchemas.boundedArray(CommonSchemas.url, 0, 3).optional(),
  captchaToken: CommonSchemas.nonEmptyString(1, 2000),
});

/**
 * Bulk event operations schema
 */
export const BulkEventOperationSchema = z.object({
  eventIds: CommonSchemas.boundedArray(CommonSchemas.objectId, 1, 20),
  operation: z.enum([
    'publish',
    'unpublish',
    'cancel',
    'delete',
    'feature',
    'unfeature',
  ]),
  reason: CommonSchemas.nonEmptyString(5, 200).optional(),
});

/**
 * Export type definitions
 */
export type EventCreation = z.infer<typeof EventCreationSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;
export type EventRegistration = z.infer<typeof EventRegistrationSchema>;
export type EventSearch = z.infer<typeof EventSearchSchema>;
export type EventAttendance = z.infer<typeof EventAttendanceSchema>;
export type EventFeedback = z.infer<typeof EventFeedbackSchema>;
export type EventAnalytics = z.infer<typeof EventAnalyticsSchema>;
export type EventReport = z.infer<typeof EventReportSchema>;
export type BulkEventOperation = z.infer<typeof BulkEventOperationSchema>;
