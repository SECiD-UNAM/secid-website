import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';

// Test data for payment flows
const paymentTestData = {
  subscription: {
    planId: 'premium-monthly',
    planName: 'SECiD Premium',
    price: 299, // Mexican Pesos
    currency: 'MXN',
    billingPeriod: 'monthly',
  },
  eventPayment: {
    eventId: 'data-science-conference-2024',
    ticketType: 'student',
    price: 750, // Mexican Pesos
    currency: 'MXN',
  },
  jobPosting: {
    packageId: 'job-premium',
    packageName: 'Premium Job Posting',
    price: 1999, // Mexican Pesos
    currency: 'MXN',
    duration: 30, // days
  },
  creditCard: {
    number: '4242424242424242', // Stripe test card
    expiry: '12/25',
    cvc: '123',
    zip: '12345',
  },
  billingInfo: {
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana.garcia@example.com',
    company: 'Tech Solutions México',
    taxId: 'RFC123456789',
    address: {
      line1: 'Av. Insurgentes Sur 123',
      line2: 'Col. Roma Norte',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06700',
      country: 'MX',
    },
  },
};

class PaymentFlow {
  constructor(private page: Page) {}

  async navigateToPricing() {
    await this.page.goto('/');
    await this.page.click('a[href="/es/pricing"]');
    await expect(this.page).toHaveURL('/es/pricing');
  }

  async selectSubscriptionPlan() {
    // Should show pricing plans
    await expect(this.page.locator('[data-testid="pricing-plans"]')).toBeVisible();
    
    // Select premium plan
    await this.page.click('[data-testid="select-premium-plan"]');
    
    // Should show plan details modal
    await expect(this.page.locator('[data-testid="plan-details-modal"]')).toBeVisible();
    await expect(this.page.locator('text=SECiD Premium')).toBeVisible();
    await expect(this.page.locator('text=$299 MXN/mes')).toBeVisible();
    
    // Confirm plan selection
    await this.page.click('button[data-testid="confirm-plan-selection"]');
    
    // Should navigate to checkout
    await expect(this.page).toHaveURL(/\/es\/checkout\/subscription/);
  }

  async fillBillingInformation() {
    // Fill billing details
    await this.page.fill('input[name="firstName"]', paymentTestData.billingInfo.firstName);
    await this.page.fill('input[name="lastName"]', paymentTestData.billingInfo.lastName);
    await this.page.fill('input[name="email"]', paymentTestData.billingInfo.email);
    await this.page.fill('input[name="company"]', paymentTestData.billingInfo.company);
    await this.page.fill('input[name="taxId"]', paymentTestData.billingInfo.taxId);
    
    // Fill address
    await this.page.fill('input[name="addressLine1"]', paymentTestData.billingInfo.address.line1);
    await this.page.fill('input[name="addressLine2"]', paymentTestData.billingInfo.address.line2);
    await this.page.fill('input[name="city"]', paymentTestData.billingInfo.address.city);
    await this.page.selectOption('select[name="state"]', paymentTestData.billingInfo.address.state);
    await this.page.fill('input[name="postalCode"]', paymentTestData.billingInfo.address.postalCode);
    await this.page.selectOption('select[name="country"]', paymentTestData.billingInfo.address.country);
  }

  async fillPaymentDetails() {
    // Switch to payment method section
    await this.page.click('[data-testid="payment-method-tab"]');
    
    // Wait for Stripe Elements to load
    await this.page.waitForSelector('[data-testid="stripe-card-element"]');
    
    // Fill Stripe card element (simulated)
    const cardElement = this.page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await cardElement.locator('input[name="cardnumber"]').fill(paymentTestData.creditCard.number);
    await cardElement.locator('input[name="exp-date"]').fill(paymentTestData.creditCard.expiry);
    await cardElement.locator('input[name="cvc"]').fill(paymentTestData.creditCard.cvc);
    await cardElement.locator('input[name="postal"]').fill(paymentTestData.creditCard.zip);
  }

  async reviewOrderSummary() {
    // Check order summary
    await expect(this.page.locator('[data-testid="order-summary"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="plan-name"]')).toContainText('SECiD Premium');
    await expect(this.page.locator('[data-testid="plan-price"]')).toContainText('$299.00 MXN');
    
    // Check tax calculation (if applicable)
    const taxAmount = this.page.locator('[data-testid="tax-amount"]');
    if (await taxAmount.isVisible()) {
      await expect(taxAmount).toContainText('$47.84 MXN'); // 16% IVA
    }
    
    // Check total
    await expect(this.page.locator('[data-testid="total-amount"]')).toContainText('$346.84 MXN');
    
    // Check billing cycle
    await expect(this.page.locator('[data-testid="billing-cycle"]')).toContainText('Facturación mensual');
  }

  async completePayment() {
    // Accept terms
    await this.page.check('input[name="acceptTerms"]');
    await this.page.check('input[name="acceptPrivacy"]');
    
    // Submit payment
    await this.page.click('button[data-testid="submit-payment"]');
    
    // Should show processing state
    await expect(this.page.locator('[data-testid="payment-processing"]')).toBeVisible();
    
    // Wait for payment completion
    await this.page.waitForSelector('[data-testid="payment-success"]', { timeout: 10000 });
    
    // Should show success message
    await expect(this.page.locator('text=¡Pago procesado exitosamente!')).toBeVisible();
    await expect(this.page.locator('text=Tu suscripción está activa')).toBeVisible();
  }

  async verifySubscriptionActivation() {
    // Should redirect to dashboard or success page
    await expect(this.page).toHaveURL(/\/es\/dashboard|\/es\/payment\/success/);
    
    // Navigate to subscription management
    await this.page.goto('/es/dashboard/subscription');
    
    // Should show active subscription
    await expect(this.page.locator('[data-testid="subscription-status"]')).toContainText('Activa');
    await expect(this.page.locator('[data-testid="subscription-plan"]')).toContainText('SECiD Premium');
    await expect(this.page.locator('[data-testid="next-billing-date"]')).toBeVisible();
  }

  async purchaseEventTicket() {
    // Navigate to paid event
    await this.page.goto('/es/events/data-science-conference-2024');
    
    // Click register button
    await this.page.click('button[data-testid="register-event"]');
    
    // Select ticket type
    await this.page.click('[data-testid="select-student-ticket"]');
    
    // Should show ticket details
    await expect(this.page.locator('[data-testid="ticket-price"]')).toContainText('$750.00 MXN');
    
    // Fill registration form
    await this.page.fill('input[name="firstName"]', 'Carlos');
    await this.page.fill('input[name="lastName"]', 'López');
    await this.page.fill('input[name="email"]', 'carlos@student.unam.mx');
    await this.page.fill('input[name="studentId"]', '12345678');
    
    // Upload student ID verification
    const fileInput = this.page.locator('input[type="file"][name="studentVerification"]');
    await fileInput.setInputFiles({
      name: 'student-id.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock student ID document'),
    });
    
    // Proceed to payment
    await this.page.click('button[data-testid="proceed-to-payment"]');
    
    // Should navigate to checkout
    await expect(this.page).toHaveURL(/\/es\/checkout\/event/);
  }

  async purchaseJobPostingPackage() {
    // Navigate to job posting
    await this.page.goto('/es/post-job');
    
    // Fill job details first
    await this.page.fill('input[name="jobTitle"]', 'Senior Data Scientist');
    await this.page.fill('input[name="company"]', 'Tech Corp México');
    await this.page.fill('textarea[name="jobDescription"]', 'We are looking for an experienced data scientist...');
    
    // Select premium package
    await this.page.click('[data-testid="select-premium-package"]');
    
    // Should show package details
    await expect(this.page.locator('[data-testid="package-features"]')).toBeVisible();
    await expect(this.page.locator('text=Destacado por 30 días')).toBeVisible();
    await expect(this.page.locator('text=$1,999.00 MXN')).toBeVisible();
    
    // Continue to payment
    await this.page.click('button[data-testid="continue-to-payment"]');
    
    // Should navigate to checkout
    await expect(this.page).toHaveURL(/\/es\/checkout\/job-posting/);
  }

  async handlePaymentFailure() {
    // Use card that will be declined
    const cardElement = this.page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await cardElement.locator('input[name="cardnumber"]').fill('4000000000000002'); // Declined card
    await cardElement.locator('input[name="exp-date"]').fill('12/25');
    await cardElement.locator('input[name="cvc"]').fill('123');
    
    // Submit payment
    await this.page.click('button[data-testid="submit-payment"]');
    
    // Should show error message
    await expect(this.page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(this.page.locator('text=Tu tarjeta fue rechazada')).toBeVisible();
    
    // Should allow retry
    await expect(this.page.locator('button[data-testid="retry-payment"]')).toBeVisible();
  }

  async testPaymentSecurity() {
    // Check SSL certificate
    const url = this.page.url();
    expect(url).toMatch(/^https:/);
    
    // Check CSP headers
    const cspHeader = await this.page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.getAttribute('content') : null;
    });
    
    expect(cspHeader).toBeTruthy();
    
    // Check that sensitive data is not in localStorage
    const localStorage = await this.page.evaluate(() => JSON.stringify(localStorage));
    expect(localStorage).not.toMatch(/4242424242424242/); // Credit card number
  }

  async manageSubscription() {
    await this.page.goto('/es/dashboard/subscription');
    
    // Test plan changes
    await this.page.click('[data-testid="change-plan"]');
    
    // Should show available plans
    await expect(this.page.locator('[data-testid="plan-options"]')).toBeVisible();
    
    // Select different plan
    await this.page.click('[data-testid="select-annual-plan"]');
    
    // Should show proration details
    await expect(this.page.locator('[data-testid="proration-details"]')).toBeVisible();
    
    // Confirm change
    await this.page.click('button[data-testid="confirm-plan-change"]');
    
    // Should update subscription
    await expect(this.page.locator('text=Plan actualizado exitosamente')).toBeVisible();
  }

  async cancelSubscription() {
    await this.page.goto('/es/dashboard/subscription');
    
    // Click cancel subscription
    await this.page.click('[data-testid="cancel-subscription"]');
    
    // Should show cancellation modal
    await expect(this.page.locator('[data-testid="cancellation-modal"]')).toBeVisible();
    
    // Show cancellation survey
    await this.page.selectOption('select[name="cancellationReason"]', 'too-expensive');
    await this.page.fill('textarea[name="feedback"]', 'The service is great but too expensive for me right now.');
    
    // Offer retention discount
    await expect(this.page.locator('[data-testid="retention-offer"]')).toBeVisible();
    await expect(this.page.locator('text=50% de descuento por 3 meses')).toBeVisible();
    
    // Decline offer and proceed with cancellation
    await this.page.click('button[data-testid="decline-offer"]');
    
    // Confirm cancellation
    await this.page.click('button[data-testid="confirm-cancellation"]');
    
    // Should show cancellation confirmation
    await expect(this.page.locator('text=Suscripción cancelada')).toBeVisible();
    await expect(this.page.locator('text=Tienes acceso hasta')).toBeVisible();
  }

  async viewBillingHistory() {
    await this.page.goto('/es/dashboard/billing');
    
    // Should show billing history
    await expect(this.page.locator('[data-testid="billing-history"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="invoice-item"]')).toHaveCountGreaterThan(0);
    
    // Test downloading invoice
    await this.page.click('[data-testid="download-invoice"]');
    
    // Should trigger PDF download
    await expect(this.page.locator('text=Descargando factura')).toBeVisible();
    
    // Test invoice details
    await this.page.click('[data-testid="view-invoice-details"]');
    
    // Should show invoice modal
    await expect(this.page.locator('[data-testid="invoice-modal"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="invoice-total"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="tax-breakdown"]')).toBeVisible();
  }

  async updatePaymentMethod() {
    await this.page.goto('/es/dashboard/billing');
    
    // Click update payment method
    await this.page.click('[data-testid="update-payment-method"]');
    
    // Should show payment method form
    await expect(this.page.locator('[data-testid="payment-method-form"]')).toBeVisible();
    
    // Add new card
    const newCardElement = this.page.frameLocator('[data-testid="new-card-element"] iframe');
    await newCardElement.locator('input[name="cardnumber"]').fill('4000000000000077'); // New test card
    await newCardElement.locator('input[name="exp-date"]').fill('06/26');
    await newCardElement.locator('input[name="cvc"]').fill('456');
    
    // Save new payment method
    await this.page.click('button[data-testid="save-payment-method"]');
    
    // Should show success message
    await expect(this.page.locator('text=Método de pago actualizado')).toBeVisible();
    
    // Should show new card as default
    await expect(this.page.locator('[data-testid="default-payment-method"]')).toContainText('****0077');
  }
}

test.describe('Payment and Subscription Flow', () => {
  let paymentFlow: PaymentFlow;

  test.beforeEach(async ({ page }) => {
    paymentFlow = new PaymentFlow(page);
    
    // Mock authentication - logged in user
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      }));
    });
    
    // Mock Stripe
    await page.addInitScript(() => {
      window.Stripe = () => ({
        elements: () => ({
          create: () => ({
            mount: () => {},
            on: () => {},
            update: () => {},
          }),
        }),
        confirmPayment: async () => ({
          error: null,
          paymentIntent: {
            status: 'succeeded',
            id: 'pi_test_123',
          },
        }),
        confirmSetup: async () => ({
          error: null,
          setupIntent: {
            status: 'succeeded',
            id: 'seti_test_123',
          },
        }),
      });
    });
    
    // Mock payment APIs
    await page.route('**/api/create-payment-intent**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clientSecret: 'pi_test_123_secret_456',
          amount: 34684, // Including tax
          currency: 'mxn',
        }),
      });
    });
    
    await page.route('**/api/create-subscription**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscriptionId: 'sub_test_123',
          clientSecret: 'pi_test_123_secret_456',
          status: 'active',
        }),
      });
    });
    
    await page.route('**/api/subscriptions/**', async (route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'sub_test_123',
            status: 'active',
            plan: {
              id: 'premium-monthly',
              name: 'SECiD Premium',
              amount: 29900,
              currency: 'mxn',
              interval: 'month',
            },
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      } else if (method === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'cancelled' }),
        });
      }
    });
    
    await page.route('**/api/invoices**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invoices: [
            {
              id: 'inv_test_123',
              number: 'SECID-001',
              date: new Date().toISOString(),
              amount: 34684,
              currency: 'mxn',
              status: 'paid',
              downloadUrl: '/api/invoices/inv_test_123/pdf',
            },
          ],
        }),
      });
    });
  });

  test('complete subscription purchase flow', async ({ page }) => {
    // Step 1: Navigate to pricing and select plan
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    
    // Step 2: Fill billing information
    await paymentFlow.fillBillingInformation();
    
    // Step 3: Fill payment details
    await paymentFlow.fillPaymentDetails();
    
    // Step 4: Review order summary
    await paymentFlow.reviewOrderSummary();
    
    // Step 5: Complete payment
    await paymentFlow.completePayment();
    
    // Step 6: Verify subscription activation
    await paymentFlow.verifySubscriptionActivation();
  });

  test('event ticket purchase flow', async ({ page }) => {
    await paymentFlow.purchaseEventTicket();
    
    // Complete payment for event
    await paymentFlow.fillBillingInformation();
    await paymentFlow.fillPaymentDetails();
    
    // Review event order
    await expect(page.locator('[data-testid="event-title"]')).toContainText('Data Science Conference 2024');
    await expect(page.locator('[data-testid="ticket-type"]')).toContainText('Estudiante');
    await expect(page.locator('[data-testid="ticket-price"]')).toContainText('$750.00 MXN');
    
    // Complete payment
    await page.check('input[name="acceptTerms"]');
    await page.click('button[data-testid="submit-payment"]');
    
    // Should show success and ticket information
    await expect(page.locator('text=¡Ticket comprado exitosamente!')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-number"]')).toBeVisible();
  });

  test('job posting package purchase', async ({ page }) => {
    await paymentFlow.purchaseJobPostingPackage();
    
    // Complete payment for job posting
    await paymentFlow.fillBillingInformation();
    await paymentFlow.fillPaymentDetails();
    
    // Review job posting order
    await expect(page.locator('[data-testid="job-title"]')).toContainText('Senior Data Scientist');
    await expect(page.locator('[data-testid="package-name"]')).toContainText('Premium Job Posting');
    await expect(page.locator('[data-testid="package-price"]')).toContainText('$1,999.00 MXN');
    
    // Complete payment
    await page.check('input[name="acceptTerms"]');
    await page.click('button[data-testid="submit-payment"]');
    
    // Should show success and job posting information
    await expect(page.locator('text=¡Trabajo publicado exitosamente!')).toBeVisible();
    await expect(page.locator('text=Tu trabajo estará destacado por 30 días')).toBeVisible();
  });

  test('payment form validation and error handling', async ({ page }) => {
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    
    // Try to submit without filling required fields
    await page.click('button[data-testid="submit-payment"]');
    
    // Should show validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Payment method is required')).toBeVisible();
    
    // Test invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[data-testid="submit-payment"]');
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
    
    // Test tax ID validation for Mexico
    await page.fill('input[name="taxId"]', 'invalid-rfc');
    await page.click('button[data-testid="submit-payment"]');
    await expect(page.locator('text=Please enter a valid RFC')).toBeVisible();
  });

  test('payment failure handling and retry', async ({ page }) => {
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    await paymentFlow.fillBillingInformation();
    
    // Handle payment failure
    await paymentFlow.handlePaymentFailure();
    
    // Retry with valid card
    await page.click('button[data-testid="retry-payment"]');
    
    // Use valid card this time
    const cardElement = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await cardElement.locator('input[name="cardnumber"]').fill('4242424242424242');
    
    // Submit payment
    await page.click('button[data-testid="submit-payment"]');
    
    // Should succeed
    await expect(page.locator('text=¡Pago procesado exitosamente!')).toBeVisible();
  });

  test('subscription management features', async ({ page }) => {
    // First create an active subscription
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    await paymentFlow.fillBillingInformation();
    await paymentFlow.fillPaymentDetails();
    await paymentFlow.completePayment();
    
    // Test subscription management
    await paymentFlow.manageSubscription();
    
    // Test viewing billing history
    await paymentFlow.viewBillingHistory();
    
    // Test updating payment method
    await paymentFlow.updatePaymentMethod();
  });

  test('subscription cancellation flow', async ({ page }) => {
    // Assume active subscription exists
    await page.goto('/es/dashboard/subscription');
    
    // Mock active subscription
    await page.route('**/api/subscriptions/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sub_test_123',
          status: 'active',
          plan: {
            name: 'SECiD Premium',
            amount: 29900,
            currency: 'mxn',
          },
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });
    
    await paymentFlow.cancelSubscription();
    
    // Verify cancellation
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Cancelada');
    await expect(page.locator('text=Acceso hasta')).toBeVisible();
  });

  test('Mexican tax calculation and invoicing', async ({ page }) => {
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    
    // Fill Mexican address
    await page.fill('input[name="country"]', 'MX');
    await page.fill('input[name="taxId"]', 'GACA850101ABC'); // Valid RFC format
    
    // Should calculate IVA (16%)
    const taxAmount = page.locator('[data-testid="tax-amount"]');
    await expect(taxAmount).toContainText('$47.84 MXN'); // 16% of 299
    
    // Total should include tax
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$346.84 MXN');
    
    // Should show tax information
    await expect(page.locator('[data-testid="tax-info"]')).toContainText('IVA (16%)');
  });

  test('payment security measures', async ({ page }) => {
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    
    // Test payment security
    await paymentFlow.testPaymentSecurity();
    
    // Verify PCI compliance indicators
    await expect(page.locator('[data-testid="pci-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="ssl-badge"]')).toBeVisible();
    
    // Check that Stripe Elements are properly isolated
    const stripeFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await expect(stripeFrame.locator('input[name="cardnumber"]')).toBeVisible();
  });

  test('multiple currency support', async ({ page }) => {
    // Test USD pricing for international users
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        writable: false
      });
    });
    
    await paymentFlow.navigateToPricing();
    
    // Should show USD pricing
    await expect(page.locator('[data-testid="premium-price"]')).toContainText('$15.99 USD');
    
    // Select plan
    await page.click('[data-testid="select-premium-plan"]');
    
    // Checkout should show USD
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('USD');
  });

  test('promotional codes and discounts', async ({ page }) => {
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    
    // Apply promotional code
    await page.click('[data-testid="add-promo-code"]');
    await page.fill('input[name="promoCode"]', 'STUDENT50');
    await page.click('button[data-testid="apply-promo-code"]');
    
    // Should show discount
    await expect(page.locator('[data-testid="discount-amount"]')).toContainText('-$149.50 MXN');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$197.34 MXN');
    
    // Test invalid promo code
    await page.fill('input[name="promoCode"]', 'INVALID');
    await page.click('button[data-testid="apply-promo-code"]');
    
    // Should show error
    await expect(page.locator('text=Código promocional inválido')).toBeVisible();
  });
});

// Mobile payment tests
test.describe('Mobile Payment Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile checkout experience', async ({ page }) => {
    const paymentFlow = new PaymentFlow(page);
    
    await paymentFlow.navigateToPricing();
    
    // Mobile pricing cards should be properly sized
    const pricingCard = page.locator('[data-testid="pricing-card"]').first();
    const cardBox = await pricingCard.boundingBox();
    
    if (cardBox) {
      const viewportWidth = page.viewportSize()?.width || 0;
      expect(cardBox.width).toBeGreaterThan(viewportWidth * 0.9);
    }
    
    // Select plan on mobile
    await page.click('[data-testid="select-premium-plan"]');
    
    // Mobile checkout should be optimized
    await expect(page.locator('[data-testid="mobile-checkout"]')).toBeVisible();
    
    // Form fields should prevent zoom on iOS
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveCSS('font-size', '16px');
    
    // Payment form should be mobile-friendly
    await expect(page.locator('[data-testid="mobile-payment-form"]')).toBeVisible();
  });

  test('mobile payment method entry', async ({ page }) => {
    const paymentFlow = new PaymentFlow(page);
    
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    
    // Mobile payment method should be optimized
    const paymentSection = page.locator('[data-testid="payment-method-section"]');
    await expect(paymentSection).toBeVisible();
    
    // Stripe Elements should work on mobile
    await expect(page.locator('[data-testid="stripe-card-element"]')).toBeVisible();
    
    // Test mobile keyboard optimization
    const cardFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    const cardInput = cardFrame.locator('input[name="cardnumber"]');
    
    // Should have numeric keyboard on mobile
    await expect(cardInput).toHaveAttribute('inputmode', 'numeric');
  });
});

// Visual regression tests
test.describe('Payment Visual Tests', () => {
  test('pricing page layout consistency', async ({ page }) => {
    const paymentFlow = new PaymentFlow(page);
    await paymentFlow.navigateToPricing();
    
    // Screenshot of pricing page
    await expect(page).toHaveScreenshot('pricing-page.png');
  });

  test('checkout page layout consistency', async ({ page }) => {
    const paymentFlow = new PaymentFlow(page);
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    
    // Screenshot of checkout page
    await expect(page).toHaveScreenshot('checkout-page.png');
  });

  test('mobile payment visual consistency', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const paymentFlow = new PaymentFlow(page);
    await paymentFlow.navigateToPricing();
    
    // Mobile pricing screenshot
    await expect(page).toHaveScreenshot('mobile-pricing.png');
    
    await paymentFlow.selectSubscriptionPlan();
    
    // Mobile checkout screenshot
    await expect(page).toHaveScreenshot('mobile-checkout.png');
  });
});

// Performance tests
test.describe('Payment Performance Tests', () => {
  test('pricing page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    const paymentFlow = new PaymentFlow(page);
    await paymentFlow.navigateToPricing();
    
    const loadTime = Date.now() - startTime;
    
    // Pricing page should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Pricing cards should be visible
    await expect(page.locator('[data-testid="pricing-card"]')).toBeVisible();
  });

  test('checkout page performance', async ({ page }) => {
    const paymentFlow = new PaymentFlow(page);
    await paymentFlow.navigateToPricing();
    
    const startTime = Date.now();
    await paymentFlow.selectSubscriptionPlan();
    
    const checkoutLoadTime = Date.now() - startTime;
    
    // Checkout should load within 3 seconds
    expect(checkoutLoadTime).toBeLessThan(3000);
    
    // Stripe Elements should load
    await expect(page.locator('[data-testid="stripe-card-element"]')).toBeVisible();
  });
});

// Accessibility tests
test.describe('Payment Accessibility', () => {
  test('pricing page accessibility', async ({ page }) => {
    const paymentFlow = new PaymentFlow(page);
    await paymentFlow.navigateToPricing();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test ARIA labels
    await expect(page.locator('button[data-testid="select-premium-plan"]')).toHaveAttribute('aria-label', 'Select SECiD Premium plan');
    
    // Test screen reader support
    await expect(page.locator('[data-testid="pricing-card"]')).toHaveAttribute('role', 'article');
  });

  test('checkout form accessibility', async ({ page }) => {
    const paymentFlow = new PaymentFlow(page);
    await paymentFlow.navigateToPricing();
    await paymentFlow.selectSubscriptionPlan();
    
    // Test form labels
    await expect(page.locator('label[for="firstName"]')).toBeVisible();
    await expect(page.locator('label[for="email"]')).toBeVisible();
    
    // Test required field indicators
    await expect(page.locator('input[name="firstName"]')).toHaveAttribute('required');
    
    // Test error message association
    await page.click('button[data-testid="submit-payment"]');
    
    const emailError = page.locator('[data-testid="email-error"]');
    await expect(emailError).toHaveAttribute('role', 'alert');
  });
});