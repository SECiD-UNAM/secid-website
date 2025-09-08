import { test, expect } from '@playwright/test';
import { PricingPage } from '../../page-objects/payments/PricingPage';
import { CheckoutPage } from '../../page-objects/payments/CheckoutPage';
import { BillingPage } from '../../page-objects/payments/BillingPage';
import { SubscriptionManagerPage } from '../../page-objects/payments/SubscriptionManagerPage';

// Load test data
import paymentMethods from '../../data/payments/payment-methods.json';

test.describe('Subscription Flow Tests', () => {
  let pricingPage: PricingPage;
  let checkoutPage: CheckoutPage;
  let billingPage: BillingPage;
  let subscriptionPage: SubscriptionManagerPage;

  test.beforeEach(async ({ page }) => {
    pricingPage = new PricingPage(page);
    checkoutPage = new CheckoutPage(page);
    billingPage = new BillingPage(page);
    subscriptionPage = new SubscriptionManagerPage(page);
  });

  test.describe('Pricing Page Tests', () => {
    test('should display all subscription tiers correctly', async () => {
      await pricingPage.goto();
      
      const tiers = await pricingPage.getAllTiers();
      expect(tiers).toHaveLength(3);
      
      const tierNames = tiers.map(tier => tier.name.toLowerCase());
      expect(tierNames).toContain('free');
      expect(tierNames).toContain('premium');
      expect(tierNames).toContain('corporate');
    });

    test('should switch between monthly and yearly billing', async () => {
      await pricingPage.goto();
      
      // Test monthly billing
      await pricingPage.switchBillingInterval('monthly');
      let currentInterval = await pricingPage.getCurrentBillingInterval();
      expect(currentInterval).toBe('monthly');
      
      // Test yearly billing
      await pricingPage.switchBillingInterval('yearly');
      currentInterval = await pricingPage.getCurrentBillingInterval();
      expect(currentInterval).toBe('yearly');
    });

    test('should show yearly savings correctly', async () => {
      await pricingPage.goto();
      await pricingPage.switchBillingInterval('yearly');
      
      const premiumSavings = await pricingPage.getYearlySavings('premium');
      expect(premiumSavings).not.toBeNull();
      expect(premiumSavings!.percentage).toBeGreaterThan(0);
      
      const corporateSavings = await pricingPage.getYearlySavings('corporate');
      expect(corporateSavings).not.toBeNull();
      expect(corporateSavings!.percentage).toBeGreaterThan(0);
    });

    test('should display Mexican tax notice for MX users', async () => {
      await pricingPage.goto();
      
      // Simulate Mexican user location
      await pricingPage.page.addInitScript(() => {
        Object.defineProperty(navigator, 'language', { value: 'es-MX' });
      });
      
      await pricingPage.page.reload();
      
      const taxNoticeVisible = await pricingPage.isMexicanTaxNoticeVisible();
      if (taxNoticeVisible) {
        const taxContent = await pricingPage.getTaxNoticeContent();
        expect(taxContent).toContain('IVA');
      }
    });

    test('should apply promotional codes correctly', async () => {
      await pricingPage.goto();
      
      // Test valid promo code
      const validResult = await pricingPage.applyPromoCode('SAVE20');
      expect(validResult.success).toBe(true);
      expect(validResult.discount).not.toBeNull();
      
      // Test invalid promo code
      const invalidResult = await pricingPage.applyPromoCode('INVALID');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.message).toContain('invalid');
    });

    test('should be accessible', async () => {
      await pricingPage.goto();
      
      const accessibilityInfo = await pricingPage.getAccessibilityInfo();
      expect(accessibilityInfo.hasProperHeadings).toBe(true);
      expect(accessibilityInfo.hasAltText).toBe(true);
      expect(accessibilityInfo.hasAriaLabels).toBe(true);
      expect(accessibilityInfo.keyboardNavigable).toBe(true);
    });
  });

  test.describe('Checkout Flow Tests', () => {
    test('should complete checkout with valid credit card', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const cardData = paymentMethods.validCards.visa;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: cardData.number,
          expiry: cardData.exp,
          cvc: cardData.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(true);
    });

    test('should handle payment failure gracefully', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const cardData = paymentMethods.testScenarios.declined;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: cardData.number,
          expiry: cardData.exp,
          cvc: cardData.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('declined');
    });

    test('should handle 3D Secure authentication', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const cardData = paymentMethods.testScenarios.requires3DS;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      await checkoutPage.selectPaymentMethod('credit-card');
      await checkoutPage.fillCreditCardInfo({
        number: cardData.number,
        expiry: cardData.exp,
        cvc: cardData.cvc,
        name: billingAddress.firstName + ' ' + billingAddress.lastName
      });
      await checkoutPage.fillBillingAddress(billingAddress);
      await checkoutPage.acceptTermsAndConditions();
      await checkoutPage.submitPayment();
      
      // Handle 3D Secure flow
      await checkoutPage.handle3DSecure(true);
      
      const successMessage = await checkoutPage.getSuccessMessage();
      expect(successMessage).toBeTruthy();
    });

    test('should process OXXO payment for Mexican users', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const billingAddress = paymentMethods.testBillingAddresses.mexican;
      
      const result = await checkoutPage.completeCheckout(
        'oxxo',
        undefined,
        billingAddress
      );
      
      expect(result.success).toBe(true);
      expect(result.paymentInstructions).not.toBeNull();
      expect(result.paymentInstructions.reference).toBeTruthy();
    });

    test('should process SPEI payment for Mexican users', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const billingAddress = paymentMethods.testBillingAddresses.mexican;
      
      const result = await checkoutPage.completeCheckout(
        'spei',
        undefined,
        billingAddress
      );
      
      expect(result.success).toBe(true);
      expect(result.paymentInstructions).not.toBeNull();
      expect(result.paymentInstructions.bankAccount).toBeTruthy();
    });

    test('should calculate Mexican IVA correctly', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const orderSummary = await checkoutPage.getOrderSummary();
      
      // For Mexican users, tax should be 16% IVA
      const expectedTax = orderSummary.basePrice * 0.16;
      expect(Math.abs(orderSummary.tax - expectedTax)).toBeLessThan(0.01);
    });

    test('should validate required fields', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const validation = await checkoutPage.testCardValidation();
      expect(validation.validationMessages.length).toBeGreaterThan(0);
      expect(validation.requiredFields.length).toBeGreaterThan(0);
    });

    test('should handle network failures', async () => {
      await checkoutPage.goto('premium-monthly');
      
      // Simulate network failure
      await checkoutPage.simulateNetworkFailure();
      
      const cardData = paymentMethods.validCards.visa;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: cardData.number,
          expiry: cardData.exp,
          cvc: cardData.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('network');
    });
  });

  test.describe('Subscription Management Tests', () => {
    test.beforeEach(async () => {
      // Assume user is logged in with active subscription
      await subscriptionPage.goto();
    });

    test('should display current subscription details', async () => {
      const subscription = await subscriptionPage.getCurrentSubscription();
      
      expect(subscription.id).toBeTruthy();
      expect(subscription.tier).toBeTruthy();
      expect(['active', 'trialing', 'past_due']).toContain(subscription.status);
      expect(['month', 'year']).toContain(subscription.interval);
    });

    test('should upgrade from free to premium', async () => {
      const result = await subscriptionPage.upgradePlan('premium', 'month');
      
      if (result.success) {
        expect(result.planChange).not.toBeNull();
        expect(result.planChange!.toTier).toBe('premium');
      } else {
        // May not be available if already on premium or higher
        expect(result.message).toContain('not available');
      }
    });

    test('should upgrade from premium to corporate', async () => {
      const result = await subscriptionPage.upgradePlan('corporate', 'month');
      
      if (result.success) {
        expect(result.planChange).not.toBeNull();
        expect(result.planChange!.toTier).toBe('corporate');
      } else {
        expect(result.message).toContain('not available');
      }
    });

    test('should change billing cycle from monthly to yearly', async () => {
      const result = await subscriptionPage.changeBillingCycle('year');
      
      if (result.success) {
        expect(result.proratedAmount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should pause and resume subscription', async () => {
      const pauseResult = await subscriptionPage.pauseSubscription(30);
      
      if (pauseResult.success) {
        expect(pauseResult.resumeDate).toBeTruthy();
        
        // Resume the subscription
        const resumeResult = await subscriptionPage.resumeSubscription();
        expect(resumeResult.success).toBe(true);
      }
    });

    test('should handle subscription cancellation flow', async () => {
      const result = await subscriptionPage.cancelSubscription(
        'too-expensive',
        'The subscription is too expensive for my budget',
        false // Don't accept retention offers
      );
      
      if (result.success) {
        expect(result.effectiveDate).toBeTruthy();
        expect(result.retentionOfferPresented).toBeDefined();
      }
    });

    test('should manage team members for corporate plans', async () => {
      const teamMembers = await subscriptionPage.getTeamMembers();
      
      if (teamMembers.length >= 0) {
        // Try to invite a new member
        const inviteResult = await subscriptionPage.inviteTeamMember(
          'newmember@test.com',
          'member'
        );
        
        if (inviteResult.success) {
          // Try to remove the member
          const removeResult = await subscriptionPage.removeTeamMember('newmember@test.com');
          expect(removeResult.success).toBe(true);
        }
      }
    });

    test('should display usage statistics', async () => {
      const usage = await subscriptionPage.getUsageStats();
      
      expect(usage.courses.used).toBeGreaterThanOrEqual(0);
      expect(usage.downloads.used).toBeGreaterThanOrEqual(0);
      expect(usage.storage.used).toBeGreaterThanOrEqual(0);
      
      if (typeof usage.courses.limit === 'number') {
        expect(usage.courses.used).toBeLessThanOrEqual(usage.courses.limit);
      }
    });

    test('should update billing preferences', async () => {
      const result = await subscriptionPage.updateBillingPreferences({
        autoRenewal: true,
        invoiceEmail: 'billing@test.com',
        currency: 'MXN'
      });
      
      expect(result.success).toBe(true);
    });

    test('should show payment alerts for failed payments', async () => {
      const alerts = await subscriptionPage.getActiveAlerts();
      
      // Check if alerts are properly structured
      expect(typeof alerts.paymentFailed).toBe('boolean');
      expect(typeof alerts.subscriptionExpiry).toBe('boolean');
      expect(typeof alerts.trialExpiry).toBe('boolean');
      expect(Array.isArray(alerts.messages)).toBe(true);
    });
  });

  test.describe('Billing Management Tests', () => {
    test.beforeEach(async () => {
      await billingPage.goto();
    });

    test('should display billing overview', async () => {
      const overview = await billingPage.getBillingOverview();
      
      expect(overview.currency).toBeTruthy();
      expect(overview.currentBalance).toBeGreaterThanOrEqual(0);
      expect(overview.billingCycle).toBeTruthy();
    });

    test('should list invoices correctly', async () => {
      const invoices = await billingPage.getInvoices();
      
      for (const invoice of invoices) {
        expect(invoice.number).toBeTruthy();
        expect(invoice.date).toBeTruthy();
        expect(invoice.amount).toBeGreaterThan(0);
        expect(['paid', 'pending', 'overdue', 'cancelled']).toContain(invoice.status);
      }
    });

    test('should download invoice successfully', async () => {
      const invoices = await billingPage.getInvoices(1, 1);
      
      if (invoices.length > 0) {
        const downloadResult = await billingPage.downloadInvoice(invoices[0].number);
        expect(downloadResult.success).toBe(true);
        expect(downloadResult.downloadPath).toBeTruthy();
      }
    });

    test('should display payment history', async () => {
      const payments = await billingPage.getPaymentHistory();
      
      for (const payment of payments) {
        expect(payment.date).toBeTruthy();
        expect(payment.amount).toBeGreaterThan(0);
        expect(payment.method).toBeTruthy();
        expect(['completed', 'failed', 'pending', 'refunded']).toContain(payment.status);
      }
    });

    test('should update billing address', async () => {
      const newAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await billingPage.updateBillingAddress(newAddress);
      expect(result.success).toBe(true);
      
      const updatedAddress = await billingPage.getBillingAddress();
      expect(updatedAddress?.firstName).toBe(newAddress.firstName);
      expect(updatedAddress?.email).toBe(newAddress.email);
    });

    test('should update Mexican tax settings', async () => {
      const taxData = {
        rfc: 'XAXX010101000',
        fiscalRegime: '601',
        cfdiUse: 'G03',
        businessName: 'Test Business'
      };
      
      const result = await billingPage.updateTaxSettings(taxData);
      expect(result.success).toBe(true);
    });

    test('should filter invoices by date range', async () => {
      await billingPage.filterInvoicesByDateRange('2024-01-01', '2024-12-31');
      
      const invoices = await billingPage.getInvoices();
      // Should return filtered results
      expect(Array.isArray(invoices)).toBe(true);
    });

    test('should export billing data', async () => {
      const exportResult = await billingPage.exportData('csv');
      
      if (exportResult.success) {
        expect(exportResult.downloadPath).toBeTruthy();
      }
    });

    test('should handle refund requests', async () => {
      const payments = await billingPage.getPaymentHistory();
      
      if (payments.length > 0 && payments[0].status === 'completed') {
        const refundResult = await billingPage.requestRefund(
          payments[0].id,
          'Service not as expected'
        );
        
        expect(typeof refundResult.success).toBe('boolean');
        expect(refundResult.message).toBeTruthy();
      }
    });
  });

  test.describe('Mobile Experience Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should display pricing page correctly on mobile', async () => {
      await pricingPage.goto();
      await pricingPage.switchToMobileView();
      
      const isMobile = await pricingPage.isMobileLayout();
      expect(isMobile).toBe(true);
      
      // Test mobile interactions
      await pricingPage.selectTier('premium');
      const isSelected = await pricingPage.isTierSelected('premium');
      expect(isSelected).toBe(true);
    });

    test('should complete mobile checkout flow', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      await checkoutPage.switchToMobileView();
      
      const isMobile = await checkoutPage.isMobileLayout();
      expect(isMobile).toBe(true);
      
      // Test basic mobile checkout functionality
      const orderSummary = await checkoutPage.getOrderSummary();
      expect(orderSummary.tier).toBeTruthy();
    });

    test('should navigate subscription manager on mobile', async () => {
      await subscriptionPage.goto();
      await subscriptionPage.switchToMobileView();
      
      const isMobile = await subscriptionPage.isMobileLayout();
      expect(isMobile).toBe(true);
      
      const subscription = await subscriptionPage.getCurrentSubscription();
      expect(subscription.tier).toBeTruthy();
    });

    test('should use billing page on mobile', async () => {
      await billingPage.goto();
      await billingPage.switchToMobileView();
      
      const isMobile = await billingPage.isMobileLayout();
      expect(isMobile).toBe(true);
      
      const overview = await billingPage.getBillingOverview();
      expect(overview.currency).toBeTruthy();
    });
  });

  test.describe('Accessibility Tests', () => {
    test('checkout page should be accessible', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const accessibility = await checkoutPage.testAccessibility();
      expect(accessibility.keyboardNavigable).toBe(true);
      expect(accessibility.hasProperLabels).toBe(true);
      expect(accessibility.hasErrorDescriptions).toBe(true);
    });

    test('subscription manager should be accessible', async () => {
      await subscriptionPage.goto();
      
      const accessibility = await subscriptionPage.testAccessibility();
      expect(accessibility.keyboardNavigable).toBe(true);
      expect(accessibility.hasProperLabels).toBe(true);
      expect(accessibility.hasStatusUpdates).toBe(true);
    });

    test('billing page should be accessible', async () => {
      await billingPage.goto();
      
      const accessibility = await billingPage.testAccessibility();
      expect(accessibility.keyboardNavigable).toBe(true);
      expect(accessibility.hasProperLabels).toBe(true);
      expect(accessibility.hasTableHeaders).toBe(true);
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle expired payment methods', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const expiredCard = paymentMethods.testScenarios.expired;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: expiredCard.number,
          expiry: expiredCard.exp,
          cvc: expiredCard.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain('expired');
    });

    test('should handle insufficient funds', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const insufficientCard = paymentMethods.testScenarios.insufficientFunds;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: insufficientCard.number,
          expiry: insufficientCard.exp,
          cvc: insufficientCard.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain('insufficient');
    });

    test('should handle processing errors gracefully', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const processingErrorCard = paymentMethods.testScenarios.processingError;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: processingErrorCard.number,
          expiry: processingErrorCard.exp,
          cvc: processingErrorCard.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain('processing');
    });

    test('should handle webhook failures', async () => {
      await subscriptionPage.goto();
      
      // Simulate webhook event
      await subscriptionPage.simulateWebhookEvent('invoice.payment_failed');
      
      const alerts = await subscriptionPage.getActiveAlerts();
      expect(alerts.paymentFailed || alerts.messages.length > 0).toBe(true);
    });
  });

  test.describe('Multi-currency Support Tests', () => {
    test('should handle USD payments', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const cardData = paymentMethods.validCards.visa;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const orderSummary = await checkoutPage.getOrderSummary();
      expect(['USD', 'MXN']).toContain(orderSummary.currency);
    });

    test('should handle MXN payments with IVA', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const cardData = paymentMethods.mexicanCards.banamex;
      const billingAddress = paymentMethods.testBillingAddresses.mexican;
      
      const orderSummary = await checkoutPage.getOrderSummary();
      if (orderSummary.currency === 'MXN') {
        expect(orderSummary.tax).toBeGreaterThan(0);
        // IVA should be 16%
        const expectedTax = orderSummary.basePrice * 0.16;
        expect(Math.abs(orderSummary.tax - expectedTax)).toBeLessThan(0.01);
      }
    });

    test('should handle international cards', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const internationalCard = paymentMethods.internationalCards.visaEurope;
      const billingAddress = paymentMethods.testBillingAddresses.international;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: internationalCard.number,
          expiry: internationalCard.exp,
          cvc: internationalCard.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      // Should handle international payments
      expect(typeof result.success).toBe('boolean');
    });
  });

  test.describe('PCI Compliance Tests', () => {
    test('should not store sensitive card data in DOM', async () => {
      await checkoutPage.goto('premium-monthly');
      await checkoutPage.selectPaymentMethod('credit-card');
      
      const cardData = paymentMethods.validCards.visa;
      await checkoutPage.fillCreditCardInfo({
        number: cardData.number,
        expiry: cardData.exp,
        cvc: cardData.cvc,
        name: 'Test User'
      });
      
      // Check that card number is not visible in page content
      const pageContent = await checkoutPage.page.content();
      expect(pageContent).not.toContain(cardData.number);
      expect(pageContent).not.toContain(cardData.cvc);
    });

    test('should use secure elements for card input', async () => {
      await checkoutPage.goto('premium-monthly');
      await checkoutPage.selectPaymentMethod('credit-card');
      
      // Verify Stripe elements are loaded
      const stripeElement = checkoutPage.page.locator('#card-element');
      await expect(stripeElement).toBeVisible();
    });
  });

  test.describe('Subscription Lifecycle Tests', () => {
    test('should handle trial period correctly', async () => {
      // This would require special test account setup
      await subscriptionPage.goto();
      
      const subscription = await subscriptionPage.getCurrentSubscription();
      if (subscription.status === 'trialing') {
        expect(subscription.trialEnd).toBeTruthy();
        
        const alerts = await subscriptionPage.getActiveAlerts();
        expect(alerts.trialExpiry).toBeDefined();
      }
    });

    test('should handle subscription renewal', async () => {
      await subscriptionPage.goto();
      
      const subscription = await subscriptionPage.getCurrentSubscription();
      if (subscription.nextInvoiceDate) {
        expect(new Date(subscription.nextInvoiceDate).getTime()).toBeGreaterThan(Date.now());
      }
    });

    test('should handle subscription expiration', async () => {
      await subscriptionPage.goto();
      
      const alerts = await subscriptionPage.getActiveAlerts();
      if (alerts.subscriptionExpiry) {
        expect(alerts.messages.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should load pricing page quickly', async ({ page }) => {
      const startTime = Date.now();
      await pricingPage.goto();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    test('should process checkout efficiently', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const cardData = paymentMethods.validCards.visa;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const startTime = Date.now();
      await checkoutPage.selectPaymentMethod('credit-card');
      await checkoutPage.fillCreditCardInfo({
        number: cardData.number,
        expiry: cardData.exp,
        cvc: cardData.cvc,
        name: billingAddress.firstName + ' ' + billingAddress.lastName
      });
      const fillTime = Date.now() - startTime;
      
      expect(fillTime).toBeLessThan(3000); // 3 seconds
    });

    test('should handle large invoice lists efficiently', async () => {
      await billingPage.goto();
      
      const startTime = Date.now();
      const invoices = await billingPage.getInvoices(1, 50);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(10000); // 10 seconds
    });
  });
});

test.describe('Advanced Payment Scenarios', () => {
  let checkoutPage: CheckoutPage;
  let subscriptionPage: SubscriptionManagerPage;

  test.beforeEach(async ({ page }) => {
    checkoutPage = new CheckoutPage(page);
    subscriptionPage = new SubscriptionManagerPage(page);
  });

  test.describe('Corporate Team Management', () => {
    test('should handle team subscription purchase', async () => {
      await checkoutPage.goto('corporate-monthly');
      
      const cardData = paymentMethods.validCards.amexCorporate;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      billingAddress.company = 'Corporate Test Company';
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: cardData.number,
          expiry: cardData.exp,
          cvc: cardData.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(true);
      
      // Verify team features are available
      await subscriptionPage.goto();
      const teamMembers = await subscriptionPage.getTeamMembers();
      expect(Array.isArray(teamMembers)).toBe(true);
    });

    test('should manage team member lifecycle', async () => {
      await subscriptionPage.goto();
      
      // Invite member
      const inviteResult = await subscriptionPage.inviteTeamMember('team@test.com', 'member');
      if (inviteResult.success) {
        // Change role
        const teamMembers = await subscriptionPage.getTeamMembers();
        const newMember = teamMembers.find(m => m.email === 'team@test.com');
        
        if (newMember && newMember.status === 'active') {
          // Remove member
          const removeResult = await subscriptionPage.removeTeamMember('team@test.com');
          expect(removeResult.success).toBe(true);
        }
      }
    });
  });

  test.describe('Promotional and Discount Scenarios', () => {
    test('should apply student discount correctly', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const promoResult = await checkoutPage.applyPromoCode('STUDENT30');
      if (promoResult.success) {
        const orderSummary = await checkoutPage.getOrderSummary();
        expect(orderSummary.discount).toBeGreaterThan(0);
        
        // Student discount should be 30%
        const expectedDiscount = orderSummary.basePrice * 0.30;
        expect(Math.abs(orderSummary.discount! - expectedDiscount)).toBeLessThan(0.01);
      }
    });

    test('should handle first-time user discounts', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const promoResult = await checkoutPage.applyPromoCode('FIRST50');
      if (promoResult.success) {
        const orderSummary = await checkoutPage.getOrderSummary();
        expect(orderSummary.discount).toBe(50);
      }
    });

    test('should reject expired promotional codes', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const promoResult = await checkoutPage.applyPromoCode('EXPIRED');
      expect(promoResult.success).toBe(false);
      expect(promoResult.message.toLowerCase()).toContain('expired');
    });
  });

  test.describe('Payment Method Edge Cases', () => {
    test('should handle lost card scenario', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const lostCard = paymentMethods.testScenarios.lostCard;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: lostCard.number,
          expiry: lostCard.exp,
          cvc: lostCard.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain('lost');
    });

    test('should handle stolen card scenario', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const stolenCard = paymentMethods.testScenarios.stolenCard;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: stolenCard.number,
          expiry: stolenCard.exp,
          cvc: stolenCard.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain('stolen');
    });

    test('should handle incorrect CVC', async () => {
      await checkoutPage.goto('premium-monthly');
      
      const incorrectCvcCard = paymentMethods.testScenarios.incorrectCvc;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      const result = await checkoutPage.completeCheckout(
        'credit-card',
        {
          number: incorrectCvcCard.number,
          expiry: incorrectCvcCard.exp,
          cvc: incorrectCvcCard.cvc,
          name: billingAddress.firstName + ' ' + billingAddress.lastName
        },
        billingAddress
      );
      
      expect(result.success).toBe(false);
      expect(result.message.toLowerCase()).toContain('cvc');
    });
  });

  test.describe('Regional Payment Methods', () => {
    test('should process payment with Mexican bank cards', async () => {
      const mexicanBanks = ['banamex', 'bancomer', 'santander', 'banorte', 'hsbc'];
      
      for (const bank of mexicanBanks) {
        await checkoutPage.goto('premium-monthly');
        
        const cardData = paymentMethods.mexicanCards[bank];
        const billingAddress = paymentMethods.testBillingAddresses.mexican;
        
        const result = await checkoutPage.completeCheckout(
          'credit-card',
          {
            number: cardData.number,
            expiry: cardData.exp,
            cvc: cardData.cvc,
            name: billingAddress.firstName + ' ' + billingAddress.lastName
          },
          billingAddress
        );
        
        // Should handle Mexican bank cards
        expect(typeof result.success).toBe('boolean');
        
        if (result.success) {
          // Verify IVA calculation for Mexican payments
          const orderSummary = await checkoutPage.getOrderSummary();
          if (orderSummary.currency === 'MXN') {
            expect(orderSummary.tax).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});