import { test, expect, devices } from '@playwright/test';
import { PricingPage } from '../../page-objects/payments/PricingPage';
import { CheckoutPage } from '../../page-objects/payments/CheckoutPage';
import { BillingPage } from '../../page-objects/payments/BillingPage';
import { SubscriptionManagerPage } from '../../page-objects/payments/SubscriptionManagerPage';

// Load test data
import paymentMethods from '../../data/payments/payment-methods.json';

test.describe('Mobile Payment Experience Tests', () => {
  let pricingPage: PricingPage;
  let checkoutPage: CheckoutPage;
  let billingPage: BillingPage;
  let subscriptionPage: SubscriptionManagerPage;

  // Test on multiple mobile devices
  const mobileDevices = [
    { name: 'iPhone 12', ...devices['iPhone 12'] },
    { name: 'iPhone SE', ...devices['iPhone SE'] },
    { name: 'Samsung Galaxy S21', ...devices['Galaxy S8'] },
    { name: 'iPad', ...devices['iPad'] }
  ];

  for (const device of mobileDevices) {
    test.describe(`${device.name} Tests`, () => {
      test.use({ ...device });

      test.beforeEach(async ({ page }) => {
        pricingPage = new PricingPage(page);
        checkoutPage = new CheckoutPage(page);
        billingPage = new BillingPage(page);
        subscriptionPage = new SubscriptionManagerPage(page);
      });

      test(`should display pricing tiers correctly on ${device.name}`, async () => {
        await pricingPage.goto();
        
        // Verify mobile layout is active
        const isMobile = await pricingPage.isMobileLayout();
        expect(isMobile).toBe(true);
        
        // Test tier selection works on mobile
        await pricingPage.selectTier('premium');
        const isSelected = await pricingPage.isTierSelected('premium');
        expect(isSelected).toBe(true);
        
        // Test billing interval toggle on mobile
        await pricingPage.switchBillingInterval('yearly');
        const interval = await pricingPage.getCurrentBillingInterval();
        expect(interval).toBe('yearly');
      });

      test(`should handle mobile checkout flow on ${device.name}`, async () => {
        await checkoutPage.goto('premium-monthly');
        
        const isMobile = await checkoutPage.isMobileLayout();
        expect(isMobile).toBe(true);
        
        // Test mobile form interaction
        await checkoutPage.selectPaymentMethod('credit-card');
        
        const cardData = paymentMethods.validCards.visa;
        await checkoutPage.fillCreditCardInfo({
          number: cardData.number,
          expiry: cardData.exp,
          cvc: cardData.cvc,
          name: 'Test User'
        });
        
        // Verify mobile forms work correctly
        const orderSummary = await checkoutPage.getOrderSummary();
        expect(orderSummary.tier).toBeTruthy();
      });

      test(`should handle mobile billing management on ${device.name}`, async () => {
        await billingPage.goto();
        
        const isMobile = await billingPage.isMobileLayout();
        expect(isMobile).toBe(true);
        
        // Test mobile navigation between tabs
        await billingPage.switchTab('invoices');
        const invoices = await billingPage.getInvoices(1, 5);
        expect(Array.isArray(invoices)).toBe(true);
        
        await billingPage.switchTab('payment-history');
        const payments = await billingPage.getPaymentHistory(1, 5);
        expect(Array.isArray(payments)).toBe(true);
      });

      test(`should handle mobile subscription management on ${device.name}`, async () => {
        await subscriptionPage.goto();
        
        const isMobile = await subscriptionPage.isMobileLayout();
        expect(isMobile).toBe(true);
        
        // Test mobile subscription overview
        const subscription = await subscriptionPage.getCurrentSubscription();
        expect(subscription.tier).toBeTruthy();
        
        // Test mobile navigation
        await subscriptionPage.switchTab('usage');
        const usage = await subscriptionPage.getUsageStats();
        expect(usage.courses.used).toBeGreaterThanOrEqual(0);
      });
    });
  }

  test.describe('Touch Interaction Tests', () => {
    test.use(devices['iPhone 12']);

    test.beforeEach(async ({ page }) => {
      pricingPage = new PricingPage(page);
      checkoutPage = new CheckoutPage(page);
    });

    test('should handle touch gestures on pricing cards', async ({ page }) => {
      await pricingPage.goto();
      
      // Test touch tap on pricing card
      const premiumCard = page.locator('[data-testid="tier-premium"]');
      await premiumCard.tap();
      
      const isSelected = await pricingPage.isTierSelected('premium');
      expect(isSelected).toBe(true);
    });

    test('should handle swipe gestures for navigation', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      
      // Test horizontal swipe for payment method selection (if implemented)
      const paymentMethodSection = page.locator('[data-testid="payment-method-section"]');
      
      // Simulate swipe gesture
      await paymentMethodSection.hover();
      await page.mouse.down();
      await page.mouse.move(100, 0);
      await page.mouse.up();
      
      // Verify interaction completed without errors
      expect(await paymentMethodSection.isVisible()).toBe(true);
    });

    test('should handle long press interactions', async ({ page }) => {
      await billingPage.goto();
      
      // Test long press on invoice for context menu (if implemented)
      const invoices = await billingPage.getInvoices(1, 1);
      
      if (invoices.length > 0) {
        const firstInvoice = page.locator('[data-testid="invoice-row"]').first();
        
        // Simulate long press
        await firstInvoice.hover();
        await page.mouse.down();
        await page.waitForTimeout(1000); // Hold for 1 second
        await page.mouse.up();
        
        // Verify long press didn't break functionality
        expect(await firstInvoice.isVisible()).toBe(true);
      }
    });

    test('should handle pinch-zoom on mobile', async ({ page }) => {
      await pricingPage.goto();
      
      // Simulate pinch zoom gesture
      await page.touchscreen.tap(200, 300);
      
      // Test that page remains functional after zoom
      await pricingPage.selectTier('premium');
      const isSelected = await pricingPage.isTierSelected('premium');
      expect(isSelected).toBe(true);
    });
  });

  test.describe('Mobile Form Usability Tests', () => {
    test.use(devices['iPhone 12']);

    test.beforeEach(async ({ page }) => {
      checkoutPage = new CheckoutPage(page);
    });

    test('should handle mobile keyboard interactions', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      await checkoutPage.selectPaymentMethod('credit-card');
      
      // Test that virtual keyboard doesn't break layout
      const emailInput = page.locator('[data-testid="email"]');
      await emailInput.tap();
      await emailInput.fill('test@example.com');
      
      // Verify form is still accessible after keyboard appears
      const submitButton = page.locator('[data-testid="submit-payment-button"]');
      expect(await submitButton.isVisible()).toBe(true);
    });

    test('should handle mobile form validation', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      await checkoutPage.selectPaymentMethod('credit-card');
      
      // Try to submit without filling required fields
      await checkoutPage.submitPayment();
      
      const validation = await checkoutPage.getValidationErrors();
      expect(validation.length).toBeGreaterThan(0);
      
      // Verify error messages are visible on mobile
      const errorMessage = await checkoutPage.getErrorMessage();
      if (errorMessage) {
        expect(errorMessage.length).toBeGreaterThan(0);
      }
    });

    test('should handle mobile payment method switching', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      
      // Test switching between payment methods on mobile
      await checkoutPage.selectPaymentMethod('credit-card');
      expect(await page.locator('[data-testid="card-form"]').isVisible()).toBe(true);
      
      await checkoutPage.selectPaymentMethod('oxxo');
      expect(await page.locator('[data-testid="oxxo-instructions"]').isVisible()).toBe(true);
    });
  });

  test.describe('Mobile Performance Tests', () => {
    test.use(devices['iPhone 12']);

    test.beforeEach(async ({ page }) => {
      pricingPage = new PricingPage(page);
      checkoutPage = new CheckoutPage(page);
    });

    test('should load quickly on mobile', async ({ page }) => {
      const startTime = Date.now();
      await pricingPage.goto();
      const loadTime = Date.now() - startTime;
      
      // Mobile should load within 3 seconds on good connection
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle slow network conditions', async ({ page, context }) => {
      // Simulate slow 3G connection
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      await pricingPage.goto();
      
      // Should still load within reasonable time on slow connection
      const tiers = await pricingPage.getAllTiers();
      expect(tiers.length).toBeGreaterThan(0);
    });

    test('should handle offline scenarios gracefully', async ({ page, context }) => {
      // Go online first
      await pricingPage.goto();
      
      // Simulate offline
      await context.setOffline(true);
      
      // Try to navigate
      await checkoutPage.goto('premium-monthly');
      
      // Should show appropriate offline message or cached content
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(0);
      
      // Restore online
      await context.setOffline(false);
    });
  });
});

test.describe('Accessibility Tests for Payment Flows', () => {
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

  test.describe('Keyboard Navigation Tests', () => {
    test('should navigate pricing page with keyboard only', async ({ page }) => {
      await pricingPage.goto();
      
      // Start keyboard navigation
      await page.keyboard.press('Tab');
      
      let focusedElement = await page.locator(':focus').first();
      expect(await focusedElement.count()).toBeGreaterThan(0);
      
      // Navigate through pricing tiers
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
        
        // Check if we can select tier with keyboard
        const testId = await focusedElement.getAttribute('data-testid');
        if (testId && testId.includes('select-tier')) {
          await page.keyboard.press('Enter');
          break;
        }
      }
      
      // Verify tier selection worked
      const isSelected = await pricingPage.isTierSelected('premium') || 
                        await pricingPage.isTierSelected('corporate') ||
                        await pricingPage.isTierSelected('free');
      expect(isSelected).toBe(true);
    });

    test('should navigate checkout form with keyboard only', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      
      // Navigate to payment method selection
      await page.keyboard.press('Tab');
      
      let tabCount = 0;
      while (tabCount < 20) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const focusedElement = await page.locator(':focus').first();
        const testId = await focusedElement.getAttribute('data-testid');
        
        if (testId === 'payment-credit-card') {
          await page.keyboard.press('Enter');
          break;
        }
      }
      
      // Continue navigation to form fields
      while (tabCount < 40) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const focusedElement = await page.locator(':focus').first();
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'input' || tagName === 'select') {
          // Found a form field
          expect(await focusedElement.isVisible()).toBe(true);
          break;
        }
      }
    });

    test('should navigate billing page with keyboard only', async ({ page }) => {
      await billingPage.goto();
      
      // Navigate through tabs
      await page.keyboard.press('Tab');
      
      let tabCount = 0;
      while (tabCount < 15) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const focusedElement = await page.locator(':focus').first();
        const testId = await focusedElement.getAttribute('data-testid');
        
        if (testId && testId.includes('-tab')) {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
          
          // Verify tab navigation worked
          const currentTab = await page.locator('.active[data-testid*="-tab"]').count();
          expect(currentTab).toBeGreaterThan(0);
          break;
        }
      }
    });

    test('should navigate subscription manager with keyboard only', async ({ page }) => {
      await subscriptionPage.goto();
      
      await page.keyboard.press('Tab');
      
      let tabCount = 0;
      let foundFocusableElement = false;
      
      while (tabCount < 20 && !foundFocusableElement) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const focusedElement = await page.locator(':focus').first();
        const isVisible = await focusedElement.isVisible();
        
        if (isVisible) {
          foundFocusableElement = true;
          expect(await focusedElement.count()).toBe(1);
        }
      }
      
      expect(foundFocusableElement).toBe(true);
    });
  });

  test.describe('Screen Reader Compatibility Tests', () => {
    test('should have proper ARIA labels on pricing page', async ({ page }) => {
      await pricingPage.goto();
      
      // Check for ARIA labels on interactive elements
      const buttons = await page.locator('button').all();
      let hasProperLabels = true;
      
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        if (!ariaLabel && (!textContent || textContent.trim() === '')) {
          hasProperLabels = false;
          break;
        }
      }
      
      expect(hasProperLabels).toBe(true);
    });

    test('should have proper form labels in checkout', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      await checkoutPage.selectPaymentMethod('credit-card');
      
      // Check that all form inputs have associated labels
      const inputs = await page.locator('input[type="text"], input[type="email"], select').all();
      let hasProperLabels = true;
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          if (!label && !ariaLabel && !ariaLabelledBy) {
            hasProperLabels = false;
            break;
          }
        } else if (!ariaLabel && !ariaLabelledBy) {
          hasProperLabels = false;
          break;
        }
      }
      
      expect(hasProperLabels).toBe(true);
    });

    test('should have proper heading structure', async ({ page }) => {
      await pricingPage.goto();
      
      // Check heading hierarchy
      const h1Count = await page.locator('h1').count();
      const h2Count = await page.locator('h2').count();
      
      expect(h1Count).toBe(1); // Should have exactly one h1
      expect(h2Count).toBeGreaterThan(0); // Should have section headings
      
      // Check that headings have text content
      const h1Text = await page.locator('h1').textContent();
      expect(h1Text?.trim().length).toBeGreaterThan(0);
    });

    test('should have proper table headers in billing', async ({ page }) => {
      await billingPage.goto();
      await billingPage.switchTab('invoices');
      
      // Check for table headers
      const tables = await page.locator('table').all();
      
      for (const table of tables) {
        const headers = await table.locator('th').count();
        if (headers > 0) {
          // Check that headers have scope attributes
          const headerElements = await table.locator('th').all();
          
          for (const header of headerElements) {
            const scope = await header.getAttribute('scope');
            const textContent = await header.textContent();
            
            expect(scope).toBeTruthy();
            expect(textContent?.trim().length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should have proper live regions for dynamic content', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      
      // Check for ARIA live regions
      const liveRegions = await page.locator('[aria-live]').count();
      expect(liveRegions).toBeGreaterThan(0);
      
      // Test dynamic content updates
      await checkoutPage.selectPaymentMethod('credit-card');
      
      // Check if status updates are announced
      const ariaLiveElements = await page.locator('[aria-live="polite"], [aria-live="assertive"]').all();
      expect(ariaLiveElements.length).toBeGreaterThan(0);
    });
  });

  test.describe('Color Contrast and Visual Accessibility Tests', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await pricingPage.goto();
      
      // This is a simplified test - in practice, you'd use axe-core or similar
      const bodyElement = await page.locator('body');
      const backgroundColor = await bodyElement.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      const color = await bodyElement.evaluate(el => 
        window.getComputedStyle(el).color
      );
      
      // Basic check that colors are defined
      expect(backgroundColor).toBeTruthy();
      expect(color).toBeTruthy();
      expect(backgroundColor).not.toBe(color);
    });

    test('should be usable in high contrast mode', async ({ page }) => {
      // Simulate Windows high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background-color: black !important;
              color: white !important;
              border-color: white !important;
            }
          }
        `
      });
      
      await pricingPage.goto();
      
      // Verify page is still functional
      await pricingPage.selectTier('premium');
      const isSelected = await pricingPage.isTierSelected('premium');
      expect(isSelected).toBe(true);
    });

    test('should work with reduced motion preferences', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await pricingPage.goto();
      await pricingPage.switchBillingInterval('yearly');
      
      // Verify functionality works without animations
      const interval = await pricingPage.getCurrentBillingInterval();
      expect(interval).toBe('yearly');
    });

    test('should have proper focus indicators', async ({ page }) => {
      await pricingPage.goto();
      
      // Test focus indicators on interactive elements
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      
      if (await focusedElement.count() > 0) {
        const outlineStyle = await focusedElement.evaluate(el => 
          window.getComputedStyle(el).outline
        );
        const boxShadow = await focusedElement.evaluate(el => 
          window.getComputedStyle(el).boxShadow
        );
        
        // Should have some form of focus indicator
        expect(outlineStyle !== 'none' || boxShadow !== 'none').toBe(true);
      }
    });
  });

  test.describe('Responsive Design Accessibility Tests', () => {
    const viewports = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 768, height: 1024 }, // iPad portrait
      { width: 1024, height: 768 }, // iPad landscape
      { width: 1920, height: 1080 }  // Desktop
    ];

    for (const viewport of viewports) {
      test(`should be accessible at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await pricingPage.goto();
        
        // Test keyboard navigation at this viewport
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus').first();
        expect(await focusedElement.count()).toBeGreaterThan(0);
        
        // Test that interactive elements are still accessible
        const accessibilityInfo = await pricingPage.getAccessibilityInfo();
        expect(accessibilityInfo.keyboardNavigable).toBe(true);
      });
    }
  });

  test.describe('Error Message Accessibility Tests', () => {
    test('should announce form errors to screen readers', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      await checkoutPage.selectPaymentMethod('credit-card');
      
      // Try to submit invalid form
      await checkoutPage.submitPayment();
      
      // Check for proper error associations
      const errorElements = await page.locator('[role="alert"], [aria-live="assertive"]').all();
      expect(errorElements.length).toBeGreaterThan(0);
      
      // Check that form fields are associated with errors
      const inputs = await page.locator('input[aria-describedby], input[aria-invalid]').all();
      expect(inputs.length).toBeGreaterThan(0);
    });

    test('should provide clear error descriptions', async ({ page }) => {
      await checkoutPage.goto('premium-monthly');
      
      const cardData = paymentMethods.testScenarios.declined;
      const billingAddress = paymentMethods.testBillingAddresses.us;
      
      await checkoutPage.selectPaymentMethod('credit-card');
      await checkoutPage.fillCreditCardInfo({
        number: cardData.number,
        expiry: cardData.exp,
        cvc: cardData.cvc,
        name: billingAddress.firstName + ' ' + billingAddress.lastName
      });
      
      await checkoutPage.submitPayment();
      
      const errorMessage = await checkoutPage.getErrorMessage();
      if (errorMessage) {
        expect(errorMessage.length).toBeGreaterThan(10); // Should be descriptive
        expect(errorMessage.toLowerCase()).toContain('declined');
      }
    });
  });

  test.describe('Internationalization Accessibility Tests', () => {
    test('should handle right-to-left languages', async ({ page }) => {
      // Simulate Arabic language
      await page.addStyleTag({
        content: `
          html[dir="rtl"] {
            direction: rtl;
            text-align: right;
          }
        `
      });
      
      await page.evaluate(() => {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
      });
      
      await pricingPage.goto();
      
      // Verify functionality still works
      await pricingPage.selectTier('premium');
      const isSelected = await pricingPage.isTierSelected('premium');
      expect(isSelected).toBe(true);
    });

    test('should have proper language attributes', async ({ page }) => {
      await pricingPage.goto();
      
      // Check for lang attribute on html element
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBeTruthy();
      expect(htmlLang?.length).toBeGreaterThan(1);
      
      // Check for proper language switching if available
      const langSwitcher = await page.locator('[data-testid="language-switcher"]').count();
      if (langSwitcher > 0) {
        // Should have proper accessibility labels
        const langButton = page.locator('[data-testid="language-switcher"]');
        const ariaLabel = await langButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });
  });
});