import { db } from './firebase';
import {
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import type { 
  SubscriptionTier, 
  UserSubscription, 
  PaymentMethod, 
  Transaction, 
  Invoice, 
  PaymentSettings 
} from '../types';

// Collection references
const subscriptionTiersRef = collection(db, 'subscriptionTiers');
const userSubscriptionsRef = collection(db, 'userSubscriptions');
const paymentMethodsRef = collection(db, 'paymentMethods');
const transactionsRef = collection(db, 'transactions');
const invoicesRef = collection(db, 'invoices');
const paymentSettingsRef = collection(db, 'paymentSettings');

// Stripe configuration
const STRIPE_PUBLIC_KEY = process.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'];

// Subscription Tier Functions
export const getSubscriptionTiers = async (): Promise<SubscriptionTier[]> => {
  try {
    const tiersQuery = query(
      subscriptionTiersRef,
      where('isActive', '==', true),
      orderBy('price', 'asc')
    );

    const snapshot = await getDocs(tiersQuery);
    return snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as SubscriptionTier[];
  } catch (error) {
    console.error('Error getting subscription tiers:', error);
    throw new Error('Failed to get subscription tiers');
  }
};

export const getSubscriptionTier = async (tierId: string): Promise<SubscriptionTier> => {
  try {
    const tierDoc = await getDoc(doc(subscriptionTiersRef, tierId));
    
    if (!tierDoc.exists()) {
      throw new Error('Subscription tier not found');
    }

    return {
      id: tierDoc['id'],
      ...tierDoc.data(),
      createdAt: tierDoc['data']().createdAt?.toDate() || new Date(),
      updatedAt: tierDoc.data().updatedAt?.toDate() || new Date()
    } as SubscriptionTier;
  } catch (error) {
    console.error('Error getting subscription tier:', error);
    throw new Error('Failed to get subscription tier');
  }
};

// User Subscription Functions
export const getUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  try {
    const subscriptionQuery = query(
      userSubscriptionsRef,
      where('userId', '==', userId),
      where('status', 'in', ['active', 'trialing', 'past_due']),
      limit(1)
    );

    const snapshot = await getDocs(subscriptionQuery);
    
    if (snapshot['empty']) {
      return null;
    }

    const doc = snapshot['docs'][0];
    return {
      id: doc['id'],
      ...doc['data'](),
      currentPeriodStart: doc['data']().currentPeriodStart?.toDate() || new Date(),
      currentPeriodEnd: doc['data']().currentPeriodEnd?.toDate() || new Date(),
      trialEnd: doc.data().trialEnd?.toDate(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as UserSubscription;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw new Error('Failed to get user subscription');
  }
};

export const createSubscription = async (subscriptionData: {
  userId: string;
  tierId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: UserSubscription['status'];
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
}): Promise<UserSubscription> => {
  try {
    const subscription = {
      ...subscriptionData,
      cancelAtPeriodEnd: false,
      currentPeriodStart: Timestamp.fromDate(subscriptionData.currentPeriodStart),
      currentPeriodEnd: Timestamp.fromDate(subscriptionData.currentPeriodEnd),
      trialEnd: subscriptionData.trialEnd ? Timestamp.fromDate(subscriptionData.trialEnd) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(userSubscriptionsRef, subscription);

    return {
      id: docRef['id'],
      ...subscriptionData,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription');
  }
};

export const updateSubscription = async (subscriptionId: string, newTierId: string): Promise<void> => {
  try {
    // In a real implementation, this would call Stripe API to modify the subscription
    const response = await fetch('/api/stripe/update-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId,
        newTierId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update subscription');
    }

    // Update local record
    const subscriptionDocRef = doc(userSubscriptionsRef, subscriptionId);
    await updateDoc(subscriptionDocRef, {
      tierId: newTierId,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw new Error('Failed to update subscription');
  }
};

export const cancelSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    const subscriptionDocRef = doc(userSubscriptionsRef, subscriptionId);
    const subscriptionDoc = await getDoc(subscriptionDocRef);
    
    if (!subscriptionDoc.exists()) {
      throw new Error('Subscription not found');
    }

    const subscriptionData = subscriptionDoc['data']();

    // Call Stripe API to cancel subscription
    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }

    // Update local record
    await updateDoc(subscriptionDocRef, {
      cancelAtPeriodEnd: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
};

export const resumeSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    const subscriptionDocRef = doc(userSubscriptionsRef, subscriptionId);
    const subscriptionDoc = await getDoc(subscriptionDocRef);
    
    if (!subscriptionDoc.exists()) {
      throw new Error('Subscription not found');
    }

    const subscriptionData = subscriptionDoc['data']();

    // Call Stripe API to resume subscription
    const response = await fetch('/api/stripe/resume-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to resume subscription');
    }

    // Update local record
    await updateDoc(subscriptionDocRef, {
      cancelAtPeriodEnd: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    throw new Error('Failed to resume subscription');
  }
};

// Payment Method Functions
export const getPaymentMethods = async (userId: string): Promise<PaymentMethod[]> => {
  try {
    const methodsQuery = query(
      paymentMethodsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(methodsQuery);
    return snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as PaymentMethod[];
  } catch (error) {
    console.error('Error getting payment methods:', error);
    throw new Error('Failed to get payment methods');
  }
};

export const createPaymentMethod = async (
  userId: string, 
  stripePaymentMethod: any
): Promise<PaymentMethod> => {
  try {
    const paymentMethodData = {
      userId,
      stripePaymentMethodId: stripePaymentMethod['id'],
      type: stripePaymentMethod['type'],
      brand: stripePaymentMethod?.card?.brand,
      last4: stripePaymentMethod?.card?.last4,
      expiryMonth: stripePaymentMethod?.card?.exp_month,
      expiryYear: stripePaymentMethod?.card?.exp_year,
      isDefault: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(paymentMethodsRef, paymentMethodData);

    return {
      id: docRef['id'],
      userId,
      stripePaymentMethodId: stripePaymentMethod['id'],
      type: stripePaymentMethod['type'],
      brand: stripePaymentMethod?.card?.brand,
      last4: stripePaymentMethod?.card?.last4,
      expiryMonth: stripePaymentMethod?.card?.exp_month,
      expiryYear: stripePaymentMethod?.card?.exp_year,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating payment method:', error);
    throw new Error('Failed to create payment method');
  }
};

export const setDefaultPaymentMethod = async (
  userId: string, 
  paymentMethodId: string
): Promise<void> => {
  try {
    // Get all user's payment methods
    const methodsQuery = query(
      paymentMethodsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(methodsQuery);
    
    // Update all methods to not be default, then set the selected one as default
    const batch = snapshot['docs'].map(async (methodDoc) => {
      return updateDoc(methodDoc.ref, {
        isDefault: methodDoc['id'] === paymentMethodId,
        updatedAt: serverTimestamp()
      });
    });

    await Promise.all(batch);
  } catch (error) {
    console.error('Error setting default payment method:', error);
    throw new Error('Failed to set default payment method');
  }
};

export const deletePaymentMethod = async (paymentMethodId: string): Promise<void> => {
  try {
    const paymentMethodDocRef = doc(paymentMethodsRef, paymentMethodId);
    const paymentMethodDoc = await getDoc(paymentMethodDocRef);
    
    if (!paymentMethodDoc.exists()) {
      throw new Error('Payment method not found');
    }

    const paymentMethodData = paymentMethodDoc['data']();

    // Call Stripe API to detach payment method
    const response = await fetch('/api/stripe/detach-payment-method', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethodId: paymentMethodData.stripePaymentMethodId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete payment method');
    }

    // Delete from Firebase
    await deleteDoc(paymentMethodDocRef);
  } catch (error) {
    console.error('Error deleting payment method:', error);
    throw new Error('Failed to delete payment method');
  }
};

// Stripe Integration Functions
export const createStripeCheckoutSession = async (data: {
  userId: string;
  tierId: string;
  paymentMethodId?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; subscriptionId: string }> => {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
};

export const getUpcomingInvoice = async (stripeSubscriptionId: string): Promise<any> => {
  try {
    const response = await fetch(`/api/stripe/upcoming-invoice?subscription=${stripeSubscriptionId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get upcoming invoice');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting upcoming invoice:', error);
    return null;
  }
};

// Transaction Functions
export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const transactionsQuery = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(transactionsQuery);
    return snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Transaction[];
  } catch (error) {
    console.error('Error getting user transactions:', error);
    throw new Error('Failed to get user transactions');
  }
};

export const createTransaction = async (transactionData: {
  userId: string;
  type: Transaction['type'];
  status: Transaction['status'];
  amount: number;
  currency: string;
  description: string;
  stripeTransactionId?: string;
  paymentMethodId?: string;
  subscriptionId?: string;
  courseId?: string;
  metadata?: Record<string, any>;
}): Promise<Transaction> => {
  try {
    const transaction = {
      ...transactionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(transactionsRef, transaction);

    return {
      id: docRef['id'],
      ...transactionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw new Error('Failed to create transaction');
  }
};

export const requestRefund = async (transactionId: string, userId: string): Promise<void> => {
  try {
    const transactionDoc = await getDoc(doc(transactionsRef, transactionId));
    
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }

    const transactionData = transactionDoc['data']();

    // Verify the transaction belongs to the user
    if (transactionData['userId'] !== userId) {
      throw new Error('Unauthorized');
    }

    // Call Stripe API to create refund
    const response = await fetch('/api/stripe/create-refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentIntentId: transactionData.stripeTransactionId,
        amount: transactionData.amount
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create refund');
    }

    const refundData = await response.json();

    // Create refund transaction record
    await createTransaction({
      userId,
      type: 'refund',
      status: 'succeeded',
      amount: -transactionData.amount,
      currency: transactionData.currency,
      description: `Refund for ${transactionData.description}`,
      stripeTransactionId: refundData['id'],
      metadata: {
        originalTransactionId: transactionId
      }
    });
  } catch (error) {
    console.error('Error requesting refund:', error);
    throw new Error('Failed to request refund');
  }
};

// Invoice Functions
export const getUserInvoices = async (userId: string): Promise<Invoice[]> => {
  try {
    const invoicesQuery = query(
      invoicesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(invoicesQuery);
    return snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      dueDate: doc['data']().dueDate?.toDate() || new Date(),
      paidAt: doc.data().paidAt?.toDate(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Invoice[];
  } catch (error) {
    console.error('Error getting user invoices:', error);
    throw new Error('Failed to get user invoices');
  }
};

export const downloadInvoice = async (invoiceId: string): Promise<string> => {
  try {
    const response = await fetch(`/api/stripe/download-invoice?invoiceId=${invoiceId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get invoice download URL');
    }

    const data = await response.json();
    return data.downloadUrl;
  } catch (error) {
    console.error('Error downloading invoice:', error);
    throw new Error('Failed to download invoice');
  }
};

// Payment Settings Functions
export const getPaymentSettings = async (userId: string): Promise<PaymentSettings | null> => {
  try {
    const settingsQuery = query(
      paymentSettingsRef,
      where('userId', '==', userId),
      limit(1)
    );

    const snapshot = await getDocs(settingsQuery);
    
    if (snapshot['empty']) {
      // Create default settings
      return await createDefaultPaymentSettings(userId);
    }

    const doc = snapshot['docs'][0];
    return {
      userId,
      ...doc.data(),
      updatedAt: doc['data']().updatedAt?.toDate() || new Date()
    } as PaymentSettings;
  } catch (error) {
    console.error('Error getting payment settings:', error);
    throw new Error('Failed to get payment settings');
  }
};

export const updatePaymentSettings = async (
  userId: string, 
  updates: Partial<PaymentSettings>
): Promise<PaymentSettings> => {
  try {
    const settingsQuery = query(
      paymentSettingsRef,
      where('userId', '==', userId),
      limit(1)
    );

    const snapshot = await getDocs(settingsQuery);
    
    if (snapshot['empty']) {
      throw new Error('Payment settings not found');
    }

    const settingsDoc = snapshot['docs'][0];
    await updateDoc(settingsDoc.ref, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return {
      userId,
      ...settingsDoc['data'](),
      ...updates,
      updatedAt: new Date()
    } as PaymentSettings;
  } catch (error) {
    console.error('Error updating payment settings:', error);
    throw new Error('Failed to update payment settings');
  }
};

const createDefaultPaymentSettings = async (userId: string): Promise<PaymentSettings> => {
  try {
    const defaultSettings: Omit<PaymentSettings, 'userId'> = {
      defaultPaymentMethodId: undefined,
      billingAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      },
      taxId: undefined,
      invoiceEmails: [],
      autoRenew: true,
      updatedAt: new Date()
    };

    const settingsData = {
      userId,
      ...defaultSettings,
      updatedAt: serverTimestamp()
    };

    await addDoc(paymentSettingsRef, settingsData);

    return {
      userId,
      ...defaultSettings
    };
  } catch (error) {
    console.error('Error creating default payment settings:', error);
    throw new Error('Failed to create default payment settings');
  }
};

// Webhook handler for Stripe events
export const handleStripeWebhook = async (event: any): Promise<void> => {
  try {
    switch (event['type']) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event['data'].object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event['data'].object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event['data'].object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event['data'].object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event['data'].object);
        break;
      
      default:
        console.log(`Unhandled Stripe event type: ${event['type']}`);
    }
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    throw error;
  }
};

const handleSubscriptionUpdate = async (subscription: any): Promise<void> => {
  // Implementation would update the subscription in Firebase
  console.log('Handling subscription update:', subscription['id']);
};

const handleSubscriptionCancellation = async (subscription: any): Promise<void> => {
  // Implementation would mark subscription as canceled in Firebase
  console.log('Handling subscription cancellation:', subscription['id']);
};

const handleInvoicePaymentSucceeded = async (invoice: any): Promise<void> => {
  // Implementation would create transaction record and update subscription status
  console.log('Handling invoice payment succeeded:', invoice['id']);
};

const handleInvoicePaymentFailed = async (invoice: any): Promise<void> => {
  // Implementation would handle failed payment
  console.log('Handling invoice payment failed:', invoice['id']);
};

const handlePaymentSucceeded = async (paymentIntent: any): Promise<void> => {
  // Implementation would create transaction record
  console.log('Handling payment succeeded:', paymentIntent['id']);
};