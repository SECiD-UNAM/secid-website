import {
  createPaymentIntent,
  SUBSCRIPTION_PLANS,
  calculateMexicanTaxes,
} from '../../lib/stripe/stripe-client';

import type { APIRoute } from 'astro';

interface PaymentIntentRequest {
  amount?: number;
  currency?: string;
  planId?: keyof typeof SUBSCRIPTION_PLANS;
  billingCycle?: 'monthly' | 'yearly';
  commissionType?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: PaymentIntentRequest = await request.json();

    let amount = body.amount;
    const currency = body.currency || 'mxn';
    const customerId = body.customerId;

    // Calculate amount from plan if planId is provided
    if (body.planId && !amount) {
      const plan = SUBSCRIPTION_PLANS[body['planId']];
      if (!plan) {
        return new Response(JSON.stringify({ error: 'Invalid plan ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      let planPrice = plan.price;

      // Apply yearly discount if applicable
      if (body.billingCycle === 'yearly') {
        planPrice = planPrice * 12 * 0.83; // 17% discount
      }

      // Calculate Mexican taxes
      const taxCalculation = calculateMexicanTaxes(planPrice);
      amount = taxCalculation.total;
    }

    if (!amount) {
      return new Response(JSON.stringify({ error: 'Amount is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare metadata
    const metadata: Record<string, string> = {
      ...body.metadata,
      platform: 'secid',
    };

    if (body['planId']) {
      metadata['planId'] = body['planId'];
    }

    if (body['billingCycle']) {
      metadata['billingCycle'] = body['billingCycle'];
    }

    if (body['commissionType']) {
      metadata['commissionType'] = body['commissionType'];
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      amount,
      currency,
      customerId,
      metadata
    );

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        id: paymentIntent.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating payment intent:', error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create payment intent',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
};
