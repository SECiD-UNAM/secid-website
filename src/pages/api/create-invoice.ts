import {
  createInvoice,
  calculateMexicanTaxes,
  validateRFC,
} from '../../lib/stripe/stripe-client';

import type { APIRoute } from 'astro';

interface InvoiceRequest {
  customerId: string;
  amount: number;
  currency?: string;
  description: string;
  dueDate?: string;
  customerRFC?: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items?: Array<{
    description: string;
    quantity: number;
    unit_amount: number;
  }>;
  metadata?: Record<string, string>;
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_amount: number;
  total_amount: number;
}

interface MexicanInvoiceData {
  subtotal: number;
  iva: number;
  total: number;
  items: InvoiceLineItem[];
  customer_rfc?: string;
  fiscal_regime?: string;
  use_cfdi?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: InvoiceRequest = await request.json();

    // Validate required fields
    if (!body.customerId) {
      return new Response(
        JSON.stringify({ error: 'Customer ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.amount && !body.items) {
      return new Response(
        JSON.stringify({ error: 'Amount or items are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body['description']) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate RFC if provided
    if (body.customerRFC && !validateRFC(body.customerRFC)) {
      return new Response(JSON.stringify({ error: 'Invalid RFC format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate total amount from items if provided
    let totalAmount = body.amount || 0;
    const invoiceItems: InvoiceLineItem[] = [];

    if (body.items && body['items'].length > 0) {
      totalAmount = 0;
      for (const item of body.items) {
        const itemTotal = item.quantity * item.unit_amount;
        totalAmount += itemTotal;
        invoiceItems.push({
          description: item['description'],
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          total_amount: itemTotal,
        });
      }
    } else {
      // Create a single line item from the total amount
      invoiceItems.push({
        description: body.description,
        quantity: 1,
        unit_amount: totalAmount,
        total_amount: totalAmount,
      });
    }

    // Calculate Mexican taxes
    const taxCalculation = calculateMexicanTaxes(totalAmount);

    // Prepare Mexican invoice data
    const mexicanInvoiceData: MexicanInvoiceData = {
      subtotal: taxCalculation['subtotal'],
      iva: taxCalculation['iva'],
      total: taxCalculation['total'],
      items: invoiceItems,
      customer_rfc: body.customerRFC,
      fiscal_regime: '612', // Default for personal services
      use_cfdi: 'G01', // Default for general expenses
    };

    // Parse due date
    let dueDate: Date | undefined;
    if (body.dueDate) {
      dueDate = new Date(body.dueDate);
      if (isNaN(dueDate.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid due date format' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Create invoice metadata
    const metadata: Record<string, string> = {
      ...body.metadata,
      platform: 'secid',
      subtotal: taxCalculation['subtotal'].toString(),
      iva: taxCalculation['iva'].toString(),
      total: taxCalculation.total.toString(),
      currency: body.currency || 'mxn',
      mexican_invoice: 'true',
    };

    if (body.customerRFC) {
      metadata['customer_rfc'] = body.customerRFC;
    }

    if (body.billingAddress) {
      metadata['billing_address'] = JSON.stringify(body.billingAddress);
    }

    // Add item details to metadata
    metadata['items'] = JSON.stringify(invoiceItems);

    // Create the invoice using Stripe
    try {
      const invoice = await createInvoice({
        customerId: body.customerId,
        amount: totalAmount,
        currency: body.currency || 'mxn',
        description: body['description'],
        dueDate,
        metadata,
      });

      // Return invoice data with Mexican tax breakdown
      return new Response(
        JSON.stringify({
          invoice: {
            id: invoice['id'],
            number: invoice['number'],
            status: invoice['status'],
            amount_due: invoice['amount_due'],
            amount_paid: invoice['amount_paid'],
            currency: invoice['currency'],
            created: invoice['created'],
            due_date: invoice['due_date'],
            hosted_invoice_url: invoice['hosted_invoice_url'],
            invoice_pdf: invoice['invoice_pdf'],
            customer: invoice['customer'],
          },
          mexican_tax_breakdown: mexicanInvoiceData,
          tax_rates: {
            iva_rate: 0.16,
            subtotal: taxCalculation.subtotal,
            iva_amount: taxCalculation['iva'],
            total: taxCalculation['total'],
          },
          fiscal_data: {
            rfc: body.customerRFC,
            regime: '612',
            use_cfdi: 'G01',
            payment_method: 'PUE', // Payment in a single exhibition
            payment_form: '04', // Credit card
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error creating invoice:', error);

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : 'Failed to create invoice',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Invoice endpoint error:', error);

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

// Get invoice by ID
export const GET: APIRoute = async ({ url }) => {
  try {
    const invoiceId = url.searchParams.get('id');

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'Invoice ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Import stripe here to avoid module loading issues
    const { stripe } = await import('/./lib/stripe/stripe-client');

    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Parse Mexican tax data from metadata
    const mexicanTaxData = {
      subtotal: parseFloat(invoice.metadata.subtotal || '0'),
      iva: parseFloat(invoice['metadata'].iva || '0'),
      total: parseFloat(invoice['metadata'].total || '0'),
      items: invoice['metadata'].items
        ? JSON.parse(invoice['metadata'].items)
        : [],
      customer_rfc: invoice.metadata.customer_rfc,
    };

    return new Response(
      JSON.stringify({
        invoice: {
          id: invoice['id'],
          number: invoice['number'],
          status: invoice['status'],
          amount_due: invoice['amount_due'],
          amount_paid: invoice['amount_paid'],
          currency: invoice['currency'],
          created: invoice['created'],
          due_date: invoice['due_date'],
          hosted_invoice_url: invoice['hosted_invoice_url'],
          invoice_pdf: invoice['invoice_pdf'],
          customer: invoice['customer'],
        },
        mexican_tax_breakdown: mexicanTaxData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error retrieving invoice:', error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : 'Failed to retrieve invoice',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
