// Subscription and payment types for SECiD platform

export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'bank_account';
  stripePaymentMethodId: string;
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface PaymentSettings {
  userId: string;
  defaultPaymentMethodId?: string;
  billingEmail?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  invoiceSettings?: InvoiceSettings;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface InvoiceSettings {
  companyName?: string;
  taxId?: string;
  footer?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'subscription' | 'one_time' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description: string;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  limits: PlanLimits;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  isPopular: boolean;
  isActive: boolean;
}

export interface PlanLimits {
  jobPostings: number;
  jobApplications: number;
  messagesPerMonth: number;
  storageGB: number;
  apiRequestsPerMonth: number;
  teamMembers: number;
}
