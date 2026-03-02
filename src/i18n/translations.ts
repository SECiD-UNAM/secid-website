/**
 * Barrel file that merges all domain-specific translation files.
 * Preserves the original public API: Language, Translations, translations,
 * getTranslations, getLanguageFromUrl, getAlternateUrls, supportedLanguages, defaultLanguage.
 */

import { commonTranslations } from './common';
import { authTranslations } from './auth';
import { pricingTranslations } from './pricing';
import { resourcesTranslations } from './resources-translations';
import { mentorshipTranslations } from './mentorship-translations';

export type Language = 'es' | 'en';

export interface Translations {
  site: {
    name: string;
    title: string;
    description: string;
  };
  nav: {
    home: string;
    about: string;
    jobs: string;
    contact: string;
    community: string;
    members: string;
    events: string;
    mentorship: string;
    resources: string;
    blog: string;
    commissions: string;
    spotlights: string;
    newsletter: string;
    journalClub: string;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
    joinButton: string;
    jobsButton: string;
  };
  features: {
    title: string;
    networking: {
      title: string;
      description: string;
    };
    jobs: {
      title: string;
      description: string;
    };
    growth: {
      title: string;
      description: string;
    };
    community: {
      title: string;
      description: string;
    };
  };
  initiatives: {
    title: string;
    talentMatcher: {
      title: string;
      description: string;
      cta: string;
    };
    consulting: {
      title: string;
      description: string;
      cta: string;
    };
    hackathons: {
      title: string;
      description: string;
      cta: string;
    };
    workshops: {
      title: string;
      description: string;
      cta: string;
    };
    seminars: {
      title: string;
      description: string;
      cta: string;
    };
    mentoring: {
      title: string;
      description: string;
      cta: string;
    };
  };
  cta: {
    title: string;
    jobs: {
      title: string;
      description: string;
      button: string;
    };
    register: {
      title: string;
      description: string;
      button: string;
    };
  };
  search: {
    placeholder: string;
  };
  sidebar: {
    menu: string;
    getInTouch: string;
    description: string;
  };
  footer: {
    rights: string;
    design: string;
  };
  common: {
    loading: string;
    error: string;
    success: string;
    submit: string;
    cancel: string;
    close: string;
    save: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    previous: string;
    more: string;
    all: string;
    any: string;
    from: string;
    to: string;
    add: string;
    optional: string;
    clearFilters: string;
    button: string;
  };
  auth: {
    signUp: {
      title: string;
      subtitle: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
      acceptTerms: string;
      alreadyHaveAccount: string;
      signInHere: string;
      orContinueWith: string;
      googleSignUp: string;
      createAccount: string;
      termsAndConditions: string;
      privacyPolicy: string;
      button: string;
      google: string;
      haveAccount: string;
      signIn: string;
    };
    signIn: {
      title: string;
      subtitle: string;
      email: string;
      password: string;
      rememberMe: string;
      forgotPassword: string;
      signIn: string;
      noAccount: string;
      signUpHere: string;
      orContinueWith: string;
      googleSignIn: string;
      button: string;
    };
    or: string;
    acceptTerms: {
      prefix: string;
      link: string;
    };
    errors: {
      [key: string]: string;
      default: string;
    };
  };
  pricing: {
    [key: string]: string;
  };
  languages: {
    spanish: string;
    english: string;
  };
  resources: {
    [key: string]: any;
  };
  mentorship: {
    dashboard: {
      title: string;
      welcome: string;
      findMentor: string;
      editProfile: string;
      scheduleSession: string;
      overview: string;
      matches: string;
      sessions: string;
      profile: string;
      activeMatches: string;
      completedSessions: string;
      upcomingSessions: string;
      averageRating: string;
      recentActivity: string;
      pendingRequests: string;
      newMenteeRequest: string;
      mentorRequestPending: string;
      view: string;
      join: string;
      programStats: string;
      totalMentors: string;
      totalMentees: string;
      globalActiveMatches: string;
      successRate: string;
      yourMatches: string;
      noMatches: string;
      noMatchesDescription: string;
      becomeMentor: string;
      menteeMatch: string;
      mentorMatch: string;
      compatibility: string;
      goals: string;
      acceptRequest: string;
      viewRequest: string;
      declineRequest: string;
      sendMessage: string;
      noSessions: string;
      noSessionsDescription: string;
      minutes: string;
      agenda: string;
      joinSession: string;
      editSession: string;
      cancelSession: string;
      yourProfile: string;
      mentorProfile: string;
      menteeProfile: string;
      rating: string;
      mentees: string;
      expertise: string;
      interests: string;
      yearsExperience: string;
      noProfile: string;
      noProfileDescription: string;
      createMentorProfile: string;
      createMenteeProfile: string;
    };
    matcher: {
      excellent: string;
      veryGood: string;
      good: string;
      fair: string;
      poor: string;
      loading: string;
      createProfile: string;
      createProfileDescription: string;
      createMenteeProfile: string;
      title: string;
      description: string;
      availableMentors: string;
      matches: string;
      filters: string;
      sortBy: string;
      compatibility: string;
      rating: string;
      experience: string;
      calculating: string;
      recalculate: string;
      filterOptions: string;
      minimumRating: string;
      stars: string;
      experienceLevel: string;
      anyExperience: string;
      juniorLevel: string;
      midLevel: string;
      seniorLevel: string;
      minimumHours: string;
      hoursPerWeek: string;
      clearFilters: string;
      analyzingProfiles: string;
      calculatingCompatibility: string;
      noMatches: string;
      noMatchesDescription: string;
      adjustFilters: string;
      yearsExperience: string;
      sessions: string;
      mentees: string;
      compatibilityBreakdown: string;
      skills: string;
      availability: string;
      style: string;
      language: string;
      whyThisMatch: string;
      expertise: string;
      viewProfile: string;
      requestPending: string;
      requestMentorship: string;
      requestModalDescription: string;
      yourGoals: string;
      continueRequest: string;
    };
    status: {
      [key: string]: string;
    };
    frequency: {
      [key: string]: string;
    };
    communication: {
      [key: string]: string;
    };
    sessionType: {
      [key: string]: string;
    };
    level: {
      [key: string]: string;
    };
  };
}

/**
 * Merged translations object. Each language spreads its domain slices together.
 */
export const translations: Record<Language, Translations> = {
  es: {
    ...commonTranslations.es,
    ...authTranslations.es,
    ...pricingTranslations.es,
    ...resourcesTranslations.es,
    ...mentorshipTranslations.es,
  },
  en: {
    ...commonTranslations.en,
    ...authTranslations.en,
    ...pricingTranslations.en,
    ...resourcesTranslations.en,
    ...mentorshipTranslations.en,
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.es;
}

export function getLanguageFromUrl(url: URL): Language {
  const pathname = url.pathname;
  if (pathname.startsWith('/en/')) return 'en';
  return 'es';
}

export function getAlternateUrls(currentUrl: URL): Record<Language, string> {
  const pathname = currentUrl.pathname;

  // Remove language prefix if present
  const cleanPath = pathname.replace(/^\/(es|en)/, '') || '/';

  return {
    es: `/es${cleanPath}`,
    en: `/en${cleanPath}`,
  };
}

export const supportedLanguages: Language[] = ['es', 'en'];

export const defaultLanguage: Language = 'es';
