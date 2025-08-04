import {
  createSubscription,
  createCustomer,
  SUBSCRIPTION_PLANS,
} from '../../lib/stripe/stripe-client';

import type { APIRoute } from 'astro';

interface SubscriptionRequest {
  planId: keyof typeof SUBSCRIPTION_PLANS;
  customerId?: string;
  customerData?: {
    email: string;
    name: string;
    rfc?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  billingCycle?: 'monthly' | 'yearly';
  commissionType?: string;
  metadata?: Record<string, string>;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: SubscriptionRequest = await request.json();

    if (!body.planId) {
      return new Response(JSON.stringify({ error: 'Plan ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const plan = SUBSCRIPTION_PLANS[body['planId']];
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Invalid plan ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (plan.price === 0) {
      return new Response(
        JSON.stringify({ error: 'Cannot create subscription for free plan' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let customerId = body.customerId;

    // Create customer if not provided
    if (!customerId && body.customerData) {
      try {
        const customer = await createCustomer({
          email: body.customerData.email,
          name: body.customerData['name'],
          rfc: body.customerData.rfc,
          address: body.customerData.address,
          metadata: {
            planId: body.planId,
            commissionType: body['commissionType'] || '',
            platform: 'secid',
          },
        });
        customerId = customer.id;
      } catch (error) {
        console.error('Error creating customer:', error);
        return new Response(
          JSON.stringify({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create customer',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Customer ID or customer data is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create subscription
    try {
      const subscription = await createSubscription({
        planId: body['planId'],
        customerId,
        commissionType: body['commissionType'],
        billingCycle: body['billingCycle'] || 'monthly',
        metadata: {
          ...body.metadata,
          platform: 'secid',
          commissionType: body['commissionType'] || '',
        },
      });

      return new Response(
        JSON.stringify({
          subscription: {
            id: subscription.id,
            status: subscription['status'],
            current_period_end: subscription['current_period_end'],
            customer: subscription['customer'],
            items: subscription['items'].data['map']((item) => ({
              id: item.id,
              price: {
                id: item.price.id,
                unit_amount: item.price.unit_amount,
                currency: item.price.currency,
              },
            })),
          },
          customer: customerId,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error creating subscription:', error);

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to create subscription',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Subscription endpoint error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
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
