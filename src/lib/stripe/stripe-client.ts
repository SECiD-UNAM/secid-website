// @ts-nocheck
import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Stripe configuration
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
const stripePublishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Server-side Stripe instance - lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!_stripe) {
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key is not configured');
    }
    _stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }
  return _stripe;
};

// Legacy export for backwards compatibility
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia', typescript: true })
  : ({} as Stripe);

// Client-side Stripe instance
export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

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
 * Create a new customer in Stripe
 */
export async function createCustomer(
  customerData: CustomerData
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData['name'],
      address: customerData.address,
      metadata: {
        ...customerData.metadata,
        rfc: customerData.rfc || '',
        platform: 'secid',
      },
    });

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw new Error('Failed to create customer');
  }
}

/**
 * Create a subscription for a customer
 */
export async function createSubscription(
  subscriptionData: SubscriptionData
): Promise<Stripe.Subscription> {
  try {
    const plan = SUBSCRIPTION_PLANS[subscriptionData.planId];

    if (!plan.priceId) {
      throw new Error(
        `Price ID not configured for plan: ${subscriptionData['planId']}`
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: subscriptionData.customerId,
      items: [
        {
          price: plan.priceId,
        },
      ],
      billing_cycle_anchor:
        subscriptionData.billingCycle === 'yearly'
          ? Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
          : undefined,
      metadata: {
        ...subscriptionData.metadata,
        planId: subscriptionData['planId'],
        commissionType: subscriptionData['commissionType'] || '',
        platform: 'secid',
      },
    });

    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Create a payment intent for one-time payments
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'mxn',
  customerId?: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...metadata,
        platform: 'secid',
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
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

/**
 * Create an invoice with Mexican tax configuration
 */
export async function createInvoice(
  invoiceData: InvoiceData
): Promise<Stripe.Invoice> {
  try {
    const taxCalculation = calculateMexicanTaxes(invoiceData.amount);

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: invoiceData.customerId,
      amount: Math.round(invoiceData.amount * 100), // Convert to cents
      currency: invoiceData.currency.toLowerCase(),
      description: invoiceData.description,
    });

    // Add IVA tax line item
    await stripe.invoiceItems.create({
      customer: invoiceData.customerId,
      amount: Math.round(taxCalculation['iva'] * 100),
      currency: invoiceData.currency.toLowerCase(),
      description: 'IVA (16%)',
    });

    // Create the invoice
    const invoice = await stripe.invoices.create({
      customer: invoiceData.customerId,
      due_date: invoiceData.dueDate
        ? Math.floor(invoiceData.dueDate.getTime() / 1000)
        : undefined,
      metadata: {
        ...invoiceData.metadata,
        subtotal: invoiceData.amount.toString(),
        iva: taxCalculation['iva'].toString(),
        total: taxCalculation.total.toString(),
        platform: 'secid',
      },
    });

    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw new Error('Failed to create invoice');
  }
}

/**
 * Get customer subscriptions
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });

    return subscriptions['data'];
  } catch (error) {
    console.error('Error fetching customer subscriptions:', error);
    throw new Error('Failed to fetch subscriptions');
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  try {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Update subscription plan
 */
export async function updateSubscription(
  subscriptionId: string,
  newPlanId: keyof typeof SUBSCRIPTION_PLANS
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const newPlan = SUBSCRIPTION_PLANS[newPlanId];

    if (!newPlan.priceId) {
      throw new Error(`Price ID not configured for plan: ${newPlanId}`);
    }

    return await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data?.[0].id,
          price: newPlan.priceId,
        },
      ],
      metadata: {
        ...subscription['metadata'],
        planId: newPlanId,
      },
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw new Error('Failed to update subscription');
  }
}

/**
 * Create a customer portal session
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw new Error('Failed to create customer portal session');
  }
}

/**
 * Get usage statistics for analytics
 */
export async function getUsageStats(
  customerId: string,
  period: 'month' | 'year' = 'month'
) {
  try {
    const now = new Date();
    const startDate = new Date();

    if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
      },
    });

    const subscriptions = await getCustomerSubscriptions(customerId);
    const activeSubscriptions = subscriptions.filter(
      (sub) => sub.status === 'active'
    );

    return {
      totalInvoices: invoices['data'].length,
      totalAmount:
        invoices['data'].reduce(
          (sum, invoice) => sum + (invoice.amount_paid || 0),
          0
        ) / 100,
      activeSubscriptions: activeSubscriptions.length,
      subscriptions: activeSubscriptions.map((sub) => ({
        id: sub.id,
        status: sub['status'],
        planId: sub['metadata'].planId,
        currentPeriodEnd: new Date(sub['current_period_end'] * 1000),
      })),
    };
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    throw new Error('Failed to fetch usage statistics');
  }
}

export default {
  stripe,
  stripePromise,
  SUBSCRIPTION_PLANS,
  COMMISSION_TYPES,
  MEXICO_TAX_CONFIG,
  createCustomer,
  createSubscription,
  createPaymentIntent,
  calculateMexicanTaxes,
  validateRFC,
  createInvoice,
  getCustomerSubscriptions,
  cancelSubscription,
  updateSubscription,
  createCustomerPortalSession,
  getUsageStats,
};
