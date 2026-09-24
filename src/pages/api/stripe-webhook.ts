import Stripe from 'stripe';
import {
  verifyWebhookSignature,
  processWebhookEvent,
  validateWebhookEvent,
} from '../../lib/stripe/stripe-webhooks';

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the raw body as text
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Verify the webhook signature and construct the event
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Validate event structure
    if (!validateWebhookEvent(event)) {
      console.error('Invalid webhook event structure');
      return new Response(
        JSON.stringify({ error: 'Invalid event structure' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Log the received event
    console.log(`Received webhook event: ${event.type} (${event.id})`);

    // Process the webhook event
    try {
      await processWebhookEvent(event);
      console.log(`Successfully processed webhook event: ${event['type']}`);
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error);

      // Return 500 to trigger Stripe's retry mechanism
      return new Response(
        JSON.stringify({
          error: 'Webhook processing failed',
          eventId: event.id,
          eventType: event.type,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        received: true,
        eventId: event.id,
        eventType: event.type,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Webhook endpoint error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error['message'] : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

// Health check endpoint for webhook URL validation
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'Stripe webhook endpoint is active',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};

// Method not allowed for other HTTP methods
export const PUT: APIRoute = () => {
  return new Response(null, { status: 405 });
};

export const PATCH: APIRoute = () => {
  return new Response(null, { status: 405 });
};

export const DELETE: APIRoute = () => {
  return new Response(null, { status: 405 });
};
