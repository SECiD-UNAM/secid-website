import Stripe from 'stripe';
import { stripe } from './stripe-server';
import { db } from '../firebase';
import { logger } from '../logger';
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';

const log = logger.child('stripe-webhooks');

// Webhook endpoint secret for signature verification
const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

// ---------------------------------------------------------------------------
// Firestore collection references
// ---------------------------------------------------------------------------
const userSubscriptionsRef = collection(db, 'userSubscriptions');
const stripeCustomersRef = collection(db, 'stripeCustomers');
const transactionsRef = collection(db, 'transactions');
const webhookEventsRef = collection(db, 'webhookEvents');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Handler registry
// ---------------------------------------------------------------------------

const webhookHandlers: Record<string, WebhookHandler> = {
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'customer.subscription.paused': handleSubscriptionPaused,
  'customer.subscription.resumed': handleSubscriptionResumed,
  'invoice.payment_succeeded': handleInvoicePaymentSucceeded,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'customer.created': handleCustomerCreated,
  'customer.updated': handleCustomerUpdated,
  'customer.deleted': handleCustomerDeleted,
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'checkout.session.completed': handleCheckoutSessionCompleted,
};

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

/**
 * Record a webhook event in Firestore for auditing.
 * Keyed by the Stripe event id so redelivered events overwrite their own
 * audit doc instead of appending duplicates.
 * Fires-and-forgets so a logging failure never blocks the handler.
 */
async function logWebhookEvent(
  event: WebhookEvent,
  status: 'processed' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    await setDoc(doc(webhookEventsRef, event.id), {
      eventId: event.id,
      eventType: event.type,
      status,
      errorMessage: errorMessage ?? null,
      processedAt: serverTimestamp(),
      createdAt: Timestamp.fromMillis(event.created * 1000),
    });
  } catch (logError) {
    // Never let audit logging crash the webhook handler
    log.error('Failed to write webhook audit log', logError);
  }
}

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

/**
 * Look up the Firebase UID linked to a Stripe customer ID.
 * Returns null when no mapping exists.
 */
async function findFirebaseUidByCustomerId(
  stripeCustomerId: string
): Promise<string | null> {
  const customerDoc = await getDoc(doc(stripeCustomersRef, stripeCustomerId));
  if (customerDoc.exists()) {
    return (customerDoc.data().firebaseUid as string) ?? null;
  }
  return null;
}

/**
 * Idempotency guard: check whether a transaction doc was already written for
 * a given Stripe event id (webhooks can be redelivered).
 */
async function transactionExistsForEvent(eventId: string): Promise<boolean> {
  const q = query(transactionsRef, where('stripeEventId', '==', eventId));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Find the Firestore document ID of a userSubscription by its Stripe subscription ID.
 */
async function findSubscriptionDocId(
  stripeSubscriptionId: string
): Promise<string | null> {
  const q = query(
    userSubscriptionsRef,
    where('stripeSubscriptionId', '==', stripeSubscriptionId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].id;
}

/**
 * Derive the plan tier from Stripe metadata or default to 'basic'.
 */
function derivePlanTier(
  metadata: Stripe.Metadata
): 'free' | 'basic' | 'professional' | 'enterprise' {
  const planId = metadata?.planId?.toLowerCase() ?? '';
  if (['free', 'basic', 'professional', 'enterprise'].includes(planId)) {
    return planId as 'free' | 'basic' | 'professional' | 'enterprise';
  }
  // Map stripe-client plan IDs to subscription tier names
  if (planId === 'premium') return 'professional';
  return 'basic';
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify webhook signature and parse event
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): Stripe.Event {
  // constructEvent() with an undefined secret SKIPS signature verification,
  // which would let anyone POST forged events. Fail closed instead.
  if (!webhookSecret) {
    log.error('STRIPE_WEBHOOK_SECRET is not configured');
    throw new Error('Webhook secret not configured — refusing to process');
  }
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    log.error('Webhook signature verification failed', error);
    throw new Error('Invalid webhook signature');
  }
}

// ---------------------------------------------------------------------------
// Event processing
// ---------------------------------------------------------------------------

/**
 * Process webhook event by dispatching to the appropriate handler and logging the result.
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  log.info('Processing webhook event', { type: event.type });

  const handler = webhookHandlers[event.type];

  if (handler) {
    try {
      await handler(event as WebhookEvent);
      await logWebhookEvent(event as WebhookEvent, 'processed');
      log.info('Successfully processed event', { type: event.type });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await logWebhookEvent(event as WebhookEvent, 'failed', message);
      log.error('Error processing event', { type: event.type, error });
      throw error;
    }
  } else {
    log.info('No handler found for event type', { type: event.type });
  }
}

// ---------------------------------------------------------------------------
// Subscription handlers
// ---------------------------------------------------------------------------

/**
 * customer.subscription.created
 * Store the new subscription in Firestore with status=active and plan details.
 */
async function handleSubscriptionCreated(event: WebhookEvent): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  log.info('Subscription created', { id: subscription.id });

  try {
    // Idempotency: skip if this subscription is already stored (redelivery)
    const existingDocId = await findSubscriptionDocId(subscription.id);
    if (existingDocId) {
      log.info('Subscription already stored. Skipping duplicate create.', {
        stripeSubscriptionId: subscription.id,
      });
      return;
    }

    const firebaseUid = await findFirebaseUidByCustomerId(customerId);
    const tier = derivePlanTier(subscription.metadata);

    await addDoc(userSubscriptionsRef, {
      userId: firebaseUid,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      tier,
      status: 'active',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: Timestamp.fromMillis(
        subscription.current_period_start * 1000
      ),
      currentPeriodEnd: Timestamp.fromMillis(
        subscription.current_period_end * 1000
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    log.info('Subscription stored for customer', {
      subscriptionId: subscription.id,
      customerId,
    });
  } catch (error) {
    log.error('Failed to handle subscription creation', error);
    throw error;
  }
}

/**
 * customer.subscription.updated
 * Sync subscription status, plan tier, and cancellation flags to Firestore.
 */
async function handleSubscriptionUpdated(event: WebhookEvent): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes = event.data.previous_attributes;

  log.info('Subscription updated', { id: subscription.id });

  try {
    const docId = await findSubscriptionDocId(subscription.id);
    if (!docId) {
      log.warn(
        'No Firestore subscription found for Stripe ID. Skipping update.',
        { stripeSubscriptionId: subscription.id }
      );
      return;
    }

    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'past_due',
      incomplete: 'active',
      incomplete_expired: 'expired',
      trialing: 'active',
      paused: 'paused',
    };

    const updates: Record<string, unknown> = {
      status: statusMap[subscription.status] ?? subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: Timestamp.fromMillis(
        subscription.current_period_start * 1000
      ),
      currentPeriodEnd: Timestamp.fromMillis(
        subscription.current_period_end * 1000
      ),
      updatedAt: serverTimestamp(),
    };

    // Detect plan change
    if (previousAttributes?.items) {
      updates.tier = derivePlanTier(subscription.metadata);
      log.info('Subscription plan changed', { tier: updates.tier });
    }

    // Detect cancellation scheduling
    if (previousAttributes?.cancel_at_period_end !== undefined) {
      if (subscription.cancel_at_period_end) {
        log.info('Subscription scheduled for cancellation');
      } else {
        log.info('Subscription cancellation reversed');
      }
    }

    await updateDoc(doc(userSubscriptionsRef, docId), updates);

    log.info('Subscription updated in Firestore', { id: subscription.id });
  } catch (error) {
    log.error('Failed to handle subscription update', error);
    throw error;
  }
}

/**
 * customer.subscription.deleted
 * Mark the subscription as cancelled and record the cancellation date.
 */
async function handleSubscriptionDeleted(event: WebhookEvent): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  log.info('Subscription deleted', { id: subscription.id });

  try {
    const docId = await findSubscriptionDocId(subscription.id);
    if (!docId) {
      log.warn(
        'No Firestore subscription found for Stripe ID. Skipping deletion.',
        { stripeSubscriptionId: subscription.id }
      );
      return;
    }

    await updateDoc(doc(userSubscriptionsRef, docId), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    log.info('Subscription marked as cancelled in Firestore', {
      id: subscription.id,
    });
  } catch (error) {
    log.error('Failed to handle subscription deletion', error);
    throw error;
  }
}

/**
 * customer.subscription.paused
 * Set subscription status to paused.
 */
async function handleSubscriptionPaused(event: WebhookEvent): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  log.info('Subscription paused', { id: subscription.id });

  try {
    const docId = await findSubscriptionDocId(subscription.id);
    if (!docId) {
      log.warn(
        'No Firestore subscription found for Stripe ID. Skipping pause.',
        { stripeSubscriptionId: subscription.id }
      );
      return;
    }

    await updateDoc(doc(userSubscriptionsRef, docId), {
      status: 'paused',
      updatedAt: serverTimestamp(),
    });

    log.info('Subscription marked as paused in Firestore', {
      id: subscription.id,
    });
  } catch (error) {
    log.error('Failed to handle subscription pause', error);
    throw error;
  }
}

/**
 * customer.subscription.resumed
 * Set subscription status back to active.
 */
async function handleSubscriptionResumed(event: WebhookEvent): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  log.info('Subscription resumed', { id: subscription.id });

  try {
    const docId = await findSubscriptionDocId(subscription.id);
    if (!docId) {
      log.warn(
        'No Firestore subscription found for Stripe ID. Skipping resume.',
        { stripeSubscriptionId: subscription.id }
      );
      return;
    }

    await updateDoc(doc(userSubscriptionsRef, docId), {
      status: 'active',
      updatedAt: serverTimestamp(),
    });

    log.info('Subscription marked as active in Firestore', {
      id: subscription.id,
    });
  } catch (error) {
    log.error('Failed to handle subscription resume', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Invoice handlers
// ---------------------------------------------------------------------------

/**
 * invoice.payment_succeeded
 * Update the subscription's last payment date and record a successful transaction.
 */
async function handleInvoicePaymentSucceeded(
  event: WebhookEvent
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  log.info('Invoice payment succeeded', { id: invoice.id });

  try {
    // Idempotency: skip if this event was already processed (redelivery)
    if (await transactionExistsForEvent(event.id)) {
      log.info('Transaction already recorded for event. Skipping duplicate.', {
        eventId: event.id,
        invoiceId: invoice.id,
      });
      return;
    }

    // Record the transaction
    const firebaseUid = await findFirebaseUidByCustomerId(customerId);

    await addDoc(transactionsRef, {
      userId: firebaseUid,
      type: 'subscription',
      status: 'succeeded',
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: invoice.currency ?? 'mxn',
      description: `Invoice ${invoice.number ?? invoice.id}`,
      stripeEventId: event.id,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId:
        typeof invoice.payment_intent === 'string'
          ? invoice.payment_intent
          : (invoice.payment_intent?.id ?? null),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // If this invoice is tied to a subscription, update the period dates
    if (invoice.subscription) {
      const stripeSubId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;
      const docId = await findSubscriptionDocId(stripeSubId);

      if (docId) {
        const updates: Record<string, unknown> = {
          status: 'active',
          lastPaymentAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (invoice.lines?.data?.[0]) {
          const line = invoice.lines.data[0];
          if (line.period?.start) {
            updates.currentPeriodStart = Timestamp.fromMillis(
              line.period.start * 1000
            );
          }
          if (line.period?.end) {
            updates.currentPeriodEnd = Timestamp.fromMillis(
              line.period.end * 1000
            );
          }
        }

        await updateDoc(doc(userSubscriptionsRef, docId), updates);
      }
    }

    log.info('Invoice payment recorded', { id: invoice.id });
  } catch (error) {
    log.error('Failed to handle successful payment', error);
    throw error;
  }
}

/**
 * invoice.payment_failed
 * Mark the subscription as past_due and increment the failure count.
 */
async function handleInvoicePaymentFailed(event: WebhookEvent): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  log.info('Invoice payment failed', { id: invoice.id });

  try {
    // Idempotency: skip if this event was already processed (redelivery) —
    // also prevents double-incrementing paymentFailureCount below.
    if (await transactionExistsForEvent(event.id)) {
      log.info('Transaction already recorded for event. Skipping duplicate.', {
        eventId: event.id,
        invoiceId: invoice.id,
      });
      return;
    }

    // Record the failed transaction
    const firebaseUid = await findFirebaseUidByCustomerId(customerId);

    await addDoc(transactionsRef, {
      userId: firebaseUid,
      type: 'subscription',
      status: 'failed',
      amount: (invoice.amount_due ?? 0) / 100,
      currency: invoice.currency ?? 'mxn',
      description: `Failed payment for invoice ${invoice.number ?? invoice.id}`,
      stripeEventId: event.id,
      stripeInvoiceId: invoice.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update subscription status to past_due and increment failure count
    if (invoice.subscription) {
      const stripeSubId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;
      const docId = await findSubscriptionDocId(stripeSubId);

      if (docId) {
        const subDoc = await getDoc(doc(userSubscriptionsRef, docId));
        const currentFailureCount =
          (subDoc.data()?.paymentFailureCount as number) ?? 0;

        await updateDoc(doc(userSubscriptionsRef, docId), {
          status: 'past_due',
          paymentFailureCount: currentFailureCount + 1,
          lastPaymentFailureAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        log.info('Subscription marked as past_due', {
          failureNumber: currentFailureCount + 1,
        });
      }
    }

    log.info('Invoice payment failure recorded', { id: invoice.id });
  } catch (error) {
    log.error('Failed to handle payment failure', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Customer handlers
// ---------------------------------------------------------------------------

/**
 * customer.created
 * Store the Stripe customer ID -> Firebase UID mapping.
 * The Firebase UID is expected in customer.metadata.firebaseUid.
 */
async function handleCustomerCreated(event: WebhookEvent): Promise<void> {
  const customer = event.data.object as Stripe.Customer;

  log.info('Customer created', { id: customer.id });

  try {
    const firebaseUid = customer.metadata?.firebaseUid ?? null;

    await setDoc(doc(stripeCustomersRef, customer.id), {
      stripeCustomerId: customer.id,
      firebaseUid,
      email: customer.email ?? null,
      name: customer.name ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    log.info('Customer mapping stored', {
      stripeCustomerId: customer.id,
      firebaseUid: firebaseUid ?? 'unknown',
    });
  } catch (error) {
    log.error('Failed to handle customer creation', error);
    throw error;
  }
}

/**
 * customer.updated
 * Sync updated customer details (email, name) to Firestore.
 */
async function handleCustomerUpdated(event: WebhookEvent): Promise<void> {
  const customer = event.data.object as Stripe.Customer;

  log.info('Customer updated', { id: customer.id });

  try {
    const customerDocRef = doc(stripeCustomersRef, customer.id);
    const customerDoc = await getDoc(customerDocRef);

    if (!customerDoc.exists()) {
      log.warn(
        'No Firestore mapping found for Stripe customer. Creating one.',
        { stripeCustomerId: customer.id }
      );
      await setDoc(customerDocRef, {
        stripeCustomerId: customer.id,
        firebaseUid: customer.metadata?.firebaseUid ?? null,
        email: customer.email ?? null,
        name: customer.name ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await updateDoc(customerDocRef, {
      email: customer.email ?? null,
      name: customer.name ?? null,
      updatedAt: serverTimestamp(),
    });

    log.info('Customer details updated in Firestore', { id: customer.id });
  } catch (error) {
    log.error('Failed to handle customer update', error);
    throw error;
  }
}

/**
 * customer.deleted
 * Remove the Stripe customer mapping from Firestore.
 * We soft-delete by marking as deleted rather than removing the document,
 * so that audit queries can still find historical data.
 */
async function handleCustomerDeleted(event: WebhookEvent): Promise<void> {
  const customer = event.data.object as Stripe.Customer;

  log.info('Customer deleted', { id: customer.id });

  try {
    const customerDocRef = doc(stripeCustomersRef, customer.id);
    const customerDoc = await getDoc(customerDocRef);

    if (!customerDoc.exists()) {
      log.warn('No Firestore mapping found for deleted Stripe customer', {
        stripeCustomerId: customer.id,
      });
      return;
    }

    await updateDoc(customerDocRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    log.info('Customer marked as deleted in Firestore', { id: customer.id });
  } catch (error) {
    log.error('Failed to handle customer deletion', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Payment intent handlers
// ---------------------------------------------------------------------------

/**
 * payment_intent.succeeded
 * Record a successful one-time payment transaction.
 */
async function handlePaymentIntentSucceeded(
  event: WebhookEvent
): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const customerId = paymentIntent.customer as string | null;

  log.info('Payment intent succeeded', { id: paymentIntent.id });

  try {
    // Idempotency: skip if this event's transaction was already recorded
    if (await transactionExistsForEvent(event.id)) {
      log.info('Transaction already recorded for event. Skipping duplicate.', {
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    const firebaseUid = customerId
      ? await findFirebaseUidByCustomerId(customerId)
      : null;

    const metadata = paymentIntent.metadata ?? {};
    const paymentType = metadata.type ?? 'one_time';

    await addDoc(transactionsRef, {
      userId: firebaseUid,
      type: 'one_time',
      status: 'succeeded',
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      description: metadata.description ?? `Payment ${paymentIntent.id}`,
      stripeEventId: event.id,
      stripePaymentIntentId: paymentIntent.id,
      metadata: {
        paymentType,
        ...(metadata.courseId ? { courseId: metadata.courseId } : {}),
        ...(metadata.eventId ? { eventId: metadata.eventId } : {}),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (paymentType === 'course_purchase') {
      log.info('Course purchase recorded', { courseId: metadata.courseId });
    } else if (paymentType === 'event_ticket') {
      log.info('Event ticket purchase recorded', { eventId: metadata.eventId });
    }

    log.info('Payment intent transaction recorded', { id: paymentIntent.id });
  } catch (error) {
    log.error('Failed to handle payment intent success', error);
    throw error;
  }
}

/**
 * payment_intent.payment_failed
 * Record a failed one-time payment transaction.
 */
async function handlePaymentIntentFailed(event: WebhookEvent): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const customerId = paymentIntent.customer as string | null;

  log.info('Payment intent failed', { id: paymentIntent.id });

  try {
    // Idempotency: skip if this event's transaction was already recorded
    if (await transactionExistsForEvent(event.id)) {
      log.info('Transaction already recorded for event. Skipping duplicate.', {
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    const firebaseUid = customerId
      ? await findFirebaseUidByCustomerId(customerId)
      : null;

    await addDoc(transactionsRef, {
      userId: firebaseUid,
      type: 'one_time',
      status: 'failed',
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      description: `Failed payment ${paymentIntent.id}`,
      stripeEventId: event.id,
      stripePaymentIntentId: paymentIntent.id,
      failureMessage:
        paymentIntent.last_payment_error?.message ?? 'Unknown failure',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    log.info('Payment intent failure recorded', { id: paymentIntent.id });
  } catch (error) {
    log.error('Failed to handle payment intent failure', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Checkout session handler
// ---------------------------------------------------------------------------

/**
 * checkout.session.completed
 * For subscription checkouts, ensure the subscription mapping is stored.
 * For one-time payment checkouts, record the transaction.
 */
async function handleCheckoutSessionCompleted(
  event: WebhookEvent
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const customerId = session.customer as string | null;

  log.info('Checkout session completed', { id: session.id });

  try {
    if (session.mode === 'subscription') {
      // The subscription.created webhook handles the main work.
      // Here we ensure the customer mapping has the Firebase UID from checkout metadata.
      if (customerId && session.metadata?.firebaseUid) {
        const customerDocRef = doc(stripeCustomersRef, customerId);
        const customerDoc = await getDoc(customerDocRef);

        if (customerDoc.exists()) {
          const data = customerDoc.data();
          if (!data.firebaseUid) {
            await updateDoc(customerDocRef, {
              firebaseUid: session.metadata.firebaseUid,
              updatedAt: serverTimestamp(),
            });
            log.info('Updated customer with firebaseUid from checkout', {
              customerId,
            });
          }
        }
      }

      log.info('Subscription checkout completed', { sessionId: session.id });
    } else if (session.mode === 'payment') {
      // One-time payment: the transaction is recorded exactly once by the
      // payment_intent.succeeded handler. Recording it here too produced a
      // duplicate `transactions` doc per payment (corrupting revenue
      // reporting). This branch intentionally does NOT write a transaction.
      log.info(
        'One-time payment checkout completed (transaction recorded by payment_intent.succeeded)',
        { sessionId: session.id }
      );
    }
  } catch (error) {
    log.error('Failed to handle checkout session completion', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
      return;
    } catch (error) {
      retries++;

      if (retries >= maxRetries) {
        log.error('Failed to process webhook after retries', {
          maxRetries,
          error,
        });
        throw error;
      }

      const delay = baseDelay * Math.pow(2, retries - 1);
      log.info('Retrying webhook processing', {
        delayMs: delay,
        attempt: retries,
        maxRetries,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Validate webhook event data
 */
export function validateWebhookEvent(event: Stripe.Event): boolean {
  if (!event.id || !event.type || !event.created) {
    log.error('Invalid webhook event structure');
    return false;
  }

  if (!event.data || !event.data.object) {
    log.error('Invalid webhook event data');
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
