import Stripe from 'stripe';
import { stripe } from './stripe-client';

// Webhook endpoint secret for signature verification
const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  api_version: string;
}

export interface WebhookHandler {
  (event: WebhookEvent): Promise<void>;
}

// Webhook event handlers
const webhookHandlers: Record<string, WebhookHandler> = {
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.payment_succeeded': handleInvoicePaymentSucceeded,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'customer.created': handleCustomerCreated,
  'customer.updated': handleCustomerUpdated,
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'checkout.session.completed': handleCheckoutSessionCompleted,
};

/**
 * Verify webhook signature and parse event
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Process webhook event
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`Processing webhook event: ${event.type}`);

  const handler = webhookHandlers[event['type']];

  if (handler) {
    try {
      await handler(event as WebhookEvent);
      console.log(`Successfully processed ${event.type} event`);
    } catch (error) {
      console.error(`Error processing ${event['type']} event:`, error);
      throw error;
    }
  } else {
    console.log(`No handler found for event type: ${event.type}`);
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(event: WebhookEvent): Promise<void> {
  const subscription = event['data'].object as Stripe.Subscription;

  console.log('Subscription created:', subscription['id']);

  // TODO: Update user record in Firebase with subscription details
  // TODO: Send welcome email with subscription confirmation
  // TODO: Grant access to premium features

  try {
    // Example: Update user subscription status in Firebase
    // await updateUserSubscription(subscription['customer'] as string, {
    //   subscriptionId: subscription['id'],
    //   status: subscription['status'],
    //   planId: subscription['metadata'].planId,
    //   currentPeriodEnd: new Date(subscription['current_period_end'] * 1000),
    //   cancelAtPeriodEnd: subscription['cancel_at_period_end'],
    // });

    console.log('User subscription status updated successfully');
  } catch (error) {
    console.error('Failed to update user subscription status:', error);
    throw error;
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(event: WebhookEvent): Promise<void> {
  const subscription = event['data'].object as Stripe.Subscription;
  const previousAttributes = event['data'].previous_attributes;

  console.log('Subscription updated:', subscription['id']);
  console.log('Previous attributes:', previousAttributes);

  try {
    // Update user subscription in database
    // Handle plan changes, cancellations, etc.

    if (previousAttributes?.cancel_at_period_end !== undefined) {
      if (subscription.cancel_at_period_end) {
        console.log('Subscription scheduled for cancellation');
        // TODO: Send cancellation confirmation email
        // TODO: Update user UI to show cancellation status
      } else {
        console.log('Subscription cancellation reversed');
        // TODO: Send reactivation confirmation email
      }
    }

    if (previousAttributes?.items) {
      console.log('Subscription plan changed');
      // TODO: Update user permissions based on new plan
      // TODO: Send plan change confirmation email
    }
  } catch (error) {
    console.error('Failed to handle subscription update:', error);
    throw error;
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(event: WebhookEvent): Promise<void> {
  const subscription = event['data'].object as Stripe.Subscription;

  console.log('Subscription deleted:', subscription['id']);

  try {
    // Revoke premium access
    // TODO: Update user to free tier
    // TODO: Send subscription ended email
    // TODO: Offer reactivation options

    console.log('User downgraded to free tier');
  } catch (error) {
    console.error('Failed to handle subscription deletion:', error);
    throw error;
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(
  event: WebhookEvent
): Promise<void> {
  const invoice = event['data'].object as Stripe.Invoice;

  console.log('Invoice payment succeeded:', invoice['id']);

  try {
    // Update payment history
    // Send receipt email
    // Extend subscription if needed

    if (invoice['subscription']) {
      console.log('Subscription payment processed successfully');
      // TODO: Extend subscription period
      // TODO: Send payment receipt
    }
  } catch (error) {
    console.error('Failed to handle successful payment:', error);
    throw error;
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(event: WebhookEvent): Promise<void> {
  const invoice = event['data'].object as Stripe.Invoice;

  console.log('Invoice payment failed:', invoice['id']);

  try {
    // Send payment failure notification
    // Suggest updating payment method
    // Handle dunning management

    if (invoice['subscription']) {
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      );

      if (subscription['status'] === 'past_due') {
        console.log('Subscription is past due');
        // TODO: Send payment retry notification
        // TODO: Limit access to certain features
      }
    }
  } catch (error) {
    console.error('Failed to handle payment failure:', error);
    throw error;
  }
}

/**
 * Handle customer creation
 */
async function handleCustomerCreated(event: WebhookEvent): Promise<void> {
  const customer = event['data'].object as Stripe.Customer;

  console.log('Customer created:', customer.id);

  try {
    // Link Stripe customer to user account
    // Send welcome email
    // Set up customer preferences

    console.log('Customer setup completed');
  } catch (error) {
    console.error('Failed to handle customer creation:', error);
    throw error;
  }
}

/**
 * Handle customer updates
 */
async function handleCustomerUpdated(event: WebhookEvent): Promise<void> {
  const customer = event['data'].object as Stripe.Customer;
  const previousAttributes = event['data'].previous_attributes;

  console.log('Customer updated:', customer.id);

  try {
    // Sync customer data with user profile
    // Handle email changes, address updates, etc.

    if (previousAttributes?.email) {
      console.log('Customer email updated');
      // TODO: Update user email in Firebase
      // TODO: Send email change confirmation
    }
  } catch (error) {
    console.error('Failed to handle customer update:', error);
    throw error;
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(
  event: WebhookEvent
): Promise<void> {
  const paymentIntent = event['data'].object as Stripe.PaymentIntent;

  console.log('Payment intent succeeded:', paymentIntent.id);

  try {
    // Process one-time payment
    // Unlock purchased content/features
    // Send confirmation email

    const metadata = paymentIntent.metadata;

    if (metadata['type'] === 'course_purchase') {
      console.log('Course purchase completed');
      // TODO: Grant access to purchased course
    } else if (metadata['type'] === 'event_ticket') {
      console.log('Event ticket purchased');
      // TODO: Send event ticket and details
    }
  } catch (error) {
    console.error('Failed to handle payment intent success:', error);
    throw error;
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(event: WebhookEvent): Promise<void> {
  const paymentIntent = event['data'].object as Stripe.PaymentIntent;

  console.log('Payment intent failed:', paymentIntent.id);

  try {
    // Send payment failure notification
    // Suggest alternative payment methods
    // Log for analysis

    console.log('Payment failure handled');
  } catch (error) {
    console.error('Failed to handle payment intent failure:', error);
    throw error;
  }
}

/**
 * Handle completed checkout session
 */
async function handleCheckoutSessionCompleted(
  event: WebhookEvent
): Promise<void> {
  const session = event['data'].object as Stripe.Checkout.Session;

  console.log('Checkout session completed:', session.id);

  try {
    // Process successful checkout
    // Update user subscription or grant access
    // Send confirmation email

    if (session.mode === 'subscription') {
      console.log('Subscription checkout completed');
      // Subscription will be handled by subscription['created'] event
    } else if (session.mode === 'payment') {
      console.log('One-time payment checkout completed');
      // Handle one-time purchase
    }
  } catch (error) {
    console.error('Failed to handle checkout session completion:', error);
    throw error;
  }
}

/**
 * Get webhook event types that require handling
 */
export function getRequiredWebhookEvents(): string[] {
  return Object.keys(webhookHandlers);
}

/**
 * Register a custom webhook handler
 */
export function registerWebhookHandler(
  eventType: string,
  handler: WebhookHandler
): void {
  webhookHandlers[eventType] = handler;
}

/**
 * Webhook retry logic with exponential backoff
 */
export async function retryWebhookProcessing(
  event: Stripe.Event,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await processWebhookEvent(event);
      return; // Success, exit retry loop
    } catch (error) {
      retries++;

      if (retries >= maxRetries) {
        console.error(
          `Failed to process webhook after ${maxRetries} retries:`,
          error
        );
        throw error;
      }

      const delay = baseDelay * Math.pow(2, retries - 1);
      console.log(
        `Retrying webhook processing in ${delay}ms (attempt ${retries}/${maxRetries})`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Validate webhook event data
 */
export function validateWebhookEvent(event: Stripe.Event): boolean {
  if (!event.id || !event.type || !event.created) {
    console.error('Invalid webhook event structure');
    return false;
  }

  if (!event['data'] || !event['data'].object) {
    console.error('Invalid webhook event data');
    return false;
  }

  return true;
}

export default {
  verifyWebhookSignature,
  processWebhookEvent,
  retryWebhookProcessing,
  validateWebhookEvent,
  getRequiredWebhookEvents,
  registerWebhookHandler,
};
