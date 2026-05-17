// @ts-nocheck
// BROWSER / SHARED Stripe module.
//
// Deliberately does NOT `import Stripe from 'stripe'` and never reads
// STRIPE_SECRET_KEY — only the publishable key + plan constants + pure
// tax helpers. Safe to import from client/React islands. All server-side
// Stripe SDK usage lives in `./stripe-server` (server-only).
//
// (@ts-nocheck retained only because `import.meta.env.STRIPE_*_PRICE_ID`
// are not yet declared in env.d.ts; unrelated to the client/server split.)
import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Client-side Stripe instance (publishable key only)
export const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

// Subscription plans for SECiD platform
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    priceId: '',
    price: 0,
    currency: 'mxn',
    interval: 'month',
    features: [
      'Access to job board',
      'Basic profile creation',
      'Community forum access',
      'Limited networking features',
    ],
    limits: {
      jobApplications: 5,
      directMessages: 10,
      eventsPerMonth: 2,
    },
  },
  BASIC: {
    id: 'basic',
    name: 'Basic',
    priceId: import.meta.env.STRIPE_BASIC_PRICE_ID,
    price: 199,
    currency: 'mxn',
    interval: 'month',
    features: [
      'All Free features',
      'Unlimited job applications',
      'Advanced profile features',
      'Priority customer support',
      'Access to exclusive events',
      'Basic analytics dashboard',
    ],
    limits: {
      jobApplications: Infinity,
      directMessages: 100,
      eventsPerMonth: 10,
    },
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    priceId: import.meta.env.STRIPE_PREMIUM_PRICE_ID,
    price: 399,
    currency: 'mxn',
    interval: 'month',
    features: [
      'All Basic features',
      'Advanced analytics and insights',
      'Commission-specific dashboards',
      'Mentorship program access',
      'Skill assessments and certifications',
      'AI-powered job matching',
      'Unlimited direct messages',
      'Early access to new features',
    ],
    limits: {
      jobApplications: Infinity,
      directMessages: Infinity,
      eventsPerMonth: Infinity,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: import.meta.env.STRIPE_ENTERPRISE_PRICE_ID,
    price: 799,
    currency: 'mxn',
    interval: 'month',
    features: [
      'All Premium features',
      'Company dashboard and branding',
      'Dedicated account manager',
      'Custom integrations',
      'Bulk user management',
      'Advanced reporting and analytics',
      'White-label options',
      'API access',
    ],
    limits: {
      jobApplications: Infinity,
      directMessages: Infinity,
      eventsPerMonth: Infinity,
      companyProfiles: 10,
      teamMembers: 50,
    },
  },
} as const;

// Commission types for specialized dashboards
export const COMMISSION_TYPES = {
  ANALYTICS: 'analytics',
  NLP: 'nlp',
  ML: 'machine-learning',
  DATA_ENG: 'data-engineering',
  DEEP_LEARNING: 'deep-learning',
  BIOINFORMATICS: 'bioinformatics',
  DATA_VIZ: 'data-visualization',
} as const;

// Mexico tax rates and configuration
export const MEXICO_TAX_CONFIG = {
  IVA_RATE: 0.16, // 16% IVA (Value Added Tax)
  RETENTION_RATE: 0.1, // 10% retention for services
  RFC_VALIDATION_REGEX: /^[A-ZÑ&]{3,4}[0-9]{6}[A-V1-9][A-Z1-9][0-9A]$/,
  CURRENCY: 'MXN',
  COUNTRY_CODE: 'MX',
};

export interface CustomerData {
  email: string;
  name: string;
  rfc?: string; // Mexican tax ID
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  metadata?: Record<string, string>;
}

export interface SubscriptionData {
  planId: keyof typeof SUBSCRIPTION_PLANS;
  customerId: string;
  commissionType?: keyof typeof COMMISSION_TYPES;
  billingCycle: 'monthly' | 'yearly';
  metadata?: Record<string, string>;
}

export interface InvoiceData {
  customerId: string;
  amount: number;
  currency: string;
  description: string;
  taxRate?: number;
  dueDate?: Date;
  metadata?: Record<string, string>;
}

/**
 * Calculate Mexican taxes for an amount
 */
export function calculateMexicanTaxes(subtotal: number): {
  subtotal: number;
  iva: number;
  total: number;
  retention?: number;
} {
  const iva = subtotal * MEXICO_TAX_CONFIG.IVA_RATE;
  const total = subtotal + iva;

  return {
    subtotal,
    iva,
    total,
  };
}

/**
 * Validate Mexican RFC (tax ID)
 */
export function validateRFC(rfc: string): boolean {
  return MEXICO_TAX_CONFIG.RFC_VALIDATION_REGEX.test(rfc.toUpperCase());
}

export default {
  stripePromise,
  SUBSCRIPTION_PLANS,
  COMMISSION_TYPES,
  MEXICO_TAX_CONFIG,
  calculateMexicanTaxes,
  validateRFC,
};
