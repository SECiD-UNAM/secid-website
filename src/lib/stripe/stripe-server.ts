// @ts-nocheck
// SERVER-ONLY Stripe module.
//
// This file imports the `stripe` Node SDK and reads STRIPE_SECRET_KEY, so it
// MUST NOT be imported from any client/React island — doing so would bundle
// the secret into browser JS. Browser/shared code imports `./stripe-client`
// (publishable key + constants only), which has no Stripe SDK import.
//
// (@ts-nocheck retained: the Stripe SDK loose-typed `obj['prop']` access
// pattern here predates this split; tightening it is a separate cleanup and
// out of scope for the security fix that motivated the split.)
import Stripe from 'stripe';
import {
  SUBSCRIPTION_PLANS,
  calculateMexicanTaxes,
  type CustomerData,
  type SubscriptionData,
  type InvoiceData,
} from './stripe-client';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

// Lazy init so importing this module never throws at build/load time.
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

// Backwards-compatible `stripe` export. A lazy proxy so the secret is only
// read when a server function actually calls the SDK (never at import).
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe() as unknown as Record<string | symbol, unknown>;
    return instance[prop];
  },
});

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
          // The billing interval (monthly vs yearly) is a property of the
          // Stripe Price, not of the subscription. The previous code set
          // billing_cycle_anchor = now + 365d for "yearly", which Stripe
          // interprets as a ~1-year free trial (no charge) on a monthly
          // price — not an annual plan. Annual billing must use a
          // dedicated annual Price ID (plan.annualPriceId) when present.
          price:
            subscriptionData.billingCycle === 'yearly' && plan.annualPriceId
              ? plan.annualPriceId
              : plan.priceId,
        },
      ],
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
  getStripe,
  createCustomer,
  createSubscription,
  createPaymentIntent,
  createInvoice,
  getCustomerSubscriptions,
  cancelSubscription,
  updateSubscription,
  createCustomerPortalSession,
  getUsageStats,
};
