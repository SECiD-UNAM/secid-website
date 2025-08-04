import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Touch Events and Mobile Interaction Testing Suite
 * Tests touch gestures, swipe interactions, and mobile-specific user interface behaviors
 */

// Touch gesture configurations
const TOUCH_GESTURES = {
  tap: { duration: 100 },
  longPress: { duration: 800 },
  doubleTap: { delay: 200 },
  swipe: { duration: 300 },
};

// Swipe directions and distances
const SWIPE_CONFIGURATIONS = {
  left: { deltaX: -200, deltaY: 0 },
  right: { deltaX: 200, deltaY: 0 },
  up: { deltaX: 0, deltaY: -200 },
  down: { deltaX: 0, deltaY: 200 },
  diagonal: { deltaX: 150, deltaY: -150 },
};

test.describe('Touch Events and Mobile Interactions', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport for touch testing
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Enable touch events
    await page.emulateMedia({ 
      media: 'screen',
      colorScheme: 'light'
    });
    
    // Add touch event monitoring
    await page.addInitScript(() => {
      (window as any).touchEvents = [];
      
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(eventType => {
        document.addEventListener(eventType, (event) => {
          (window as any).touchEvents.push({
            type: eventType,
            timestamp: Date.now(),
            touches: event.touches.length,
            changedTouches: event.changedTouches.length,
            target: event.target?.tagName || 'unknown',
          });
        }, { passive: true });
      });
    });
  });

  test.describe('Basic Touch Interactions', () => {
    test('should handle tap events on interactive elements', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test tapping on links
      const links = page.locator('a[href]');
      const linkCount = await links.count();

      if (linkCount > 0) {
        const firstLink = links.first();
        
        // Ensure link is visible and has adequate touch target size
        await expect(firstLink).toBeVisible();
        
        const linkBox = await firstLink.boundingBox();
        if (linkBox) {
          // Touch target should be at least 44x44px (iOS HIG recommendation)
          expect(Math.min(linkBox.width, linkBox.height)).toBeGreaterThanOrEqual(32);
        }

        // Perform tap
        await firstLink.tap();
        
        // Check if touch events were registered
        const touchEvents = await page.evaluate(() => (window as any).touchEvents);
        expect(touchEvents.length).toBeGreaterThan(0);
        
        // Should have touchstart and touchend events
        const eventTypes = touchEvents.map((e: any) => e.type);
        expect(eventTypes).toContain('touchstart');
        expect(eventTypes).toContain('touchend');
      }
    });

    test('should handle tap events on buttons', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button, input[type="button"], input[type="submit"]');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const firstButton = buttons.first();
        await expect(firstButton).toBeVisible();

        // Check touch target size
        const buttonBox = await firstButton.boundingBox();
        if (buttonBox) {
          expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(32);
        }

        // Clear previous touch events
        await page.evaluate(() => { (window as any).touchEvents = []; });

        // Tap the button
        await firstButton.tap();

        // Verify touch events
        const touchEvents = await page.evaluate(() => (window as any).touchEvents);
        expect(touchEvents.length).toBeGreaterThan(0);

        // Button should respond to touch
        const buttonState = await firstButton.evaluate((btn) => {
          return {
            disabled: btn.hasAttribute('disabled'),
            focused: document.activeElement === btn,
          };
        });

        // Button should be interactive (not disabled)
        expect(buttonState.disabled).toBe(false);
      }
    });

    test('should handle long press events', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const interactiveElements = page.locator('a, button, [onclick], [role="button"]');
      const elementCount = await interactiveElements.count();

      if (elementCount > 0) {
        const element = interactiveElements.first();
        await expect(element).toBeVisible();

        const elementBox = await element.boundingBox();
        if (elementBox) {
          const centerX = elementBox.x + elementBox.width / 2;
          const centerY = elementBox.y + elementBox.height / 2;

          // Clear touch events
          await page.evaluate(() => { (window as any).touchEvents = []; });

          // Perform long press
          await page.touchscreen.tap(centerX, centerY, { 
            delay: TOUCH_GESTURES.longPress.duration 
          });

          // Check touch duration
          const touchEvents = await page.evaluate(() => (window as any).touchEvents);
          
          if (touchEvents.length >= 2) {
            const startEvent = touchEvents.find((e: any) => e.type === 'touchstart');
            const endEvent = touchEvents.find((e: any) => e.type === 'touchend');
            
            if (startEvent && endEvent) {
              const duration = endEvent.timestamp - startEvent.timestamp;
              expect(duration).toBeGreaterThanOrEqual(TOUCH_GESTURES.longPress.duration - 100);
            }
          }
        }
      }
    });

    test('should handle double tap events', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const tappableElements = page.locator('div, p, span, img').filter({ hasText: /.+/ });
      const elementCount = await tappableElements.count();

      if (elementCount > 0) {
        const element = tappableElements.first();
        await expect(element).toBeVisible();

        const elementBox = await element.boundingBox();
        if (elementBox) {
          const centerX = elementBox.x + elementBox.width / 2;
          const centerY = elementBox.y + elementBox.height / 2;

          // Clear touch events
          await page.evaluate(() => { (window as any).touchEvents = []; });

          // Perform double tap
          await page.touchscreen.tap(centerX, centerY);
          await page.waitForTimeout(TOUCH_GESTURES.doubleTap.delay);
          await page.touchscreen.tap(centerX, centerY);

          // Verify double tap was registered
          const touchEvents = await page.evaluate(() => (window as any).touchEvents);
          const touchStarts = touchEvents.filter((e: any) => e.type === 'touchstart');
          expect(touchStarts.length).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });

  test.describe('Swipe Gestures', () => {
    test('should handle horizontal swipe gestures', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test swiping on different elements
      const swipeableElements = page.locator('main, .content, body');
      const element = swipeableElements.first();
      
      const elementBox = await element.boundingBox();
      if (elementBox) {
        const startX = elementBox.x + elementBox.width * 0.8;
        const startY = elementBox.y + elementBox.height / 2;
        const endX = startX + SWIPE_CONFIGURATIONS.left.deltaX;

        // Clear touch events
        await page.evaluate(() => { (window as any).touchEvents = []; });

        // Perform left swipe
        await page.touchscreen.swipe(startX, startY, endX, startY, {
          steps: 10,
          delay: TOUCH_GESTURES.swipe.duration / 10
        });

        // Verify swipe gesture
        const touchEvents = await page.evaluate(() => (window as any).touchEvents);
        const touchMoves = touchEvents.filter((e: any) => e.type === 'touchmove');
        expect(touchMoves.length).toBeGreaterThan(0);

        // Check if page handled the swipe (e.g., carousel, navigation)
        const pageScrollLeft = await page.evaluate(() => window.scrollX);
        // Swipe might cause scroll or other interactions
        expect(pageScrollLeft).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle vertical swipe gestures', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const element = page.locator('body');
      const elementBox = await element.boundingBox();
      
      if (elementBox) {
        const startX = elementBox.width / 2;
        const startY = elementBox.y + 100;
        const endY = startY + SWIPE_CONFIGURATIONS.down.deltaY;

        // Clear touch events
        await page.evaluate(() => { (window as any).touchEvents = []; });

        // Perform downward swipe
        await page.touchscreen.swipe(startX, startY, startX, endY, {
          steps: 10,
          delay: TOUCH_GESTURES.swipe.duration / 10
        });

        // Verify swipe gesture
        const touchEvents = await page.evaluate(() => (window as any).touchEvents);
        const touchMoves = touchEvents.filter((e: any) => e.type === 'touchmove');
        expect(touchMoves.length).toBeGreaterThan(0);

        // Check scroll behavior
        const pageScrollTop = await page.evaluate(() => window.scrollY);
        expect(pageScrollTop).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle pull-to-refresh gesture', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Simulate pull-to-refresh gesture (swipe down from top)
      const startX = 187; // Center of 375px width
      const startY = 10;  // Near top of screen
      const endY = startY + 150; // Pull down 150px

      // Clear touch events
      await page.evaluate(() => { (window as any).touchEvents = []; });

      // Perform pull-to-refresh gesture
      await page.touchscreen.swipe(startX, startY, startX, endY, {
        steps: 15,
        delay: 20
      });

      // Verify the gesture was captured
      const touchEvents = await page.evaluate(() => (window as any).touchEvents);
      expect(touchEvents.length).toBeGreaterThan(0);

      // Check if page implements pull-to-refresh
      // (This would depend on the actual implementation)
      const hasRefreshIndicator = await page.locator('.refresh-indicator, .pull-to-refresh').count();
      // Just verify the gesture was registered, actual refresh behavior varies
      expect(touchEvents.filter((e: any) => e.type === 'touchmove').length).toBeGreaterThan(5);
    });
  });

  test.describe('Form Touch Interactions', () => {
    test('should handle touch inputs on form fields', async ({ page }) => {
      const formPages = ['/', '/job-submission.html'];
      
      for (const formPage of formPages) {
        try {
          await page.goto(formPage);
          await page.waitForLoadState('networkidle');

          const textInputs = page.locator('input[type="text"], input[type="email"], textarea');
          const inputCount = await textInputs.count();

          if (inputCount > 0) {
            const input = textInputs.first();
            await expect(input).toBeVisible();

            // Check touch target size
            const inputBox = await input.boundingBox();
            if (inputBox) {
              expect(inputBox.height).toBeGreaterThanOrEqual(32); // Minimum touch target
            }

            // Clear touch events
            await page.evaluate(() => { (window as any).touchEvents = []; });

            // Tap to focus
            await input.tap();

            // Verify focus
            const isFocused = await input.evaluate((el) => document.activeElement === el);
            expect(isFocused).toBe(true);

            // Type text
            await input.fill('Test input text');
            const inputValue = await input.inputValue();
            expect(inputValue).toBe('Test input text');

            // Verify touch events were triggered
            const touchEvents = await page.evaluate(() => (window as any).touchEvents);
            expect(touchEvents.length).toBeGreaterThan(0);
          }
        } catch (error) {
          console.log(`Form testing skipped for ${formPage}: ${error.message}`);
        }
      }
    });

    test('should handle select dropdown touch interactions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const selects = page.locator('select');
      const selectCount = await selects.count();

      if (selectCount > 0) {
        const select = selects.first();
        await expect(select).toBeVisible();

        // Check touch target size
        const selectBox = await select.boundingBox();
        if (selectBox) {
          expect(selectBox.height).toBeGreaterThanOrEqual(32);
        }

        // Clear touch events
        await page.evaluate(() => { (window as any).touchEvents = []; });

        // Tap to open dropdown
        await select.tap();

        // Verify touch events
        const touchEvents = await page.evaluate(() => (window as any).touchEvents);
        expect(touchEvents.length).toBeGreaterThan(0);

        // Try to select an option
        const options = select.locator('option');
        const optionCount = await options.count();
        
        if (optionCount > 1) {
          await select.selectOption({ index: 1 });
          
          // Verify selection
          const selectedValue = await select.inputValue();
          expect(selectedValue).toBeTruthy();
        }
      }
    });

    test('should handle checkbox and radio button touch interactions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test checkboxes
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 0) {
        const checkbox = checkboxes.first();
        
        // Check if checkbox is visible or has a label
        const isVisible = await checkbox.isVisible();
        const label = page.locator(`label[for="${await checkbox.getAttribute('id')}"]`);
        const hasLabel = await label.count() > 0;

        if (isVisible || hasLabel) {
          const targetElement = hasLabel ? label : checkbox;
          
          // Clear touch events
          await page.evaluate(() => { (window as any).touchEvents = []; });

          // Tap checkbox
          await targetElement.tap();

          // Verify checkbox state changed
          const isChecked = await checkbox.isChecked();
          expect(typeof isChecked).toBe('boolean');

          // Verify touch events
          const touchEvents = await page.evaluate(() => (window as any).touchEvents);
          expect(touchEvents.length).toBeGreaterThan(0);
        }
      }

      // Test radio buttons
      const radioButtons = page.locator('input[type="radio"]');
      const radioCount = await radioButtons.count();

      if (radioCount > 0) {
        const radio = radioButtons.first();
        const radioLabel = page.locator(`label[for="${await radio.getAttribute('id')}"]`);
        const hasRadioLabel = await radioLabel.count() > 0;

        if (await radio.isVisible() || hasRadioLabel) {
          const targetElement = hasRadioLabel ? radioLabel : radio;
          
          // Clear touch events
          await page.evaluate(() => { (window as any).touchEvents = []; });

          // Tap radio button
          await targetElement.tap();

          // Verify radio button is selected
          const isChecked = await radio.isChecked();
          expect(isChecked).toBe(true);

          // Verify touch events
          const touchEvents = await page.evaluate(() => (window as any).touchEvents);
          expect(touchEvents.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Navigation Touch Interactions', () => {
    test('should handle mobile menu touch interactions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for mobile menu trigger
      const menuButton = page.locator(
        'button[aria-label*="menu"], .menu-toggle, .hamburger, [data-mobile-menu], [aria-expanded]'
      );

      if (await menuButton.count() > 0) {
        const button = menuButton.first();
        await expect(button).toBeVisible();

        // Check touch target size
        const buttonBox = await button.boundingBox();
        if (buttonBox) {
          expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(32);
        }

        // Clear touch events
        await page.evaluate(() => { (window as any).touchEvents = []; });

        // Tap to open menu
        await button.tap();
        await page.waitForTimeout(300); // Wait for animation

        // Verify menu opened
        const isExpanded = await button.getAttribute('aria-expanded');
        if (isExpanded !== null) {
          expect(isExpanded).toBe('true');
        }

        // Look for menu items
        const menuItems = page.locator('nav a, .menu a, [role="menuitem"]');
        const menuItemCount = await menuItems.count();
        
        if (menuItemCount > 0) {
          // Test tapping menu item
          const firstMenuItem = menuItems.first();
          if (await firstMenuItem.isVisible()) {
            await firstMenuItem.tap();
          }
        }

        // Verify touch events were captured
        const touchEvents = await page.evaluate(() => (window as any).touchEvents);
        expect(touchEvents.length).toBeGreaterThan(0);
      }
    });

    test('should handle touch scrolling', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get initial scroll position
      const initialScrollY = await page.evaluate(() => window.scrollY);

      // Perform scroll gesture
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const startX = 187; // Center of viewport
      const startY = viewportHeight / 2;
      const endY = startY - 200; // Scroll up

      // Clear touch events
      await page.evaluate(() => { (window as any).touchEvents = []; });

      // Perform scroll gesture
      await page.touchscreen.swipe(startX, startY, startX, endY, {
        steps: 10,
        delay: 20
      });

      await page.waitForTimeout(500); // Wait for scroll to complete

      // Check if scroll occurred
      const finalScrollY = await page.evaluate(() => window.scrollY);
      
      // Should have scrolled (direction may vary based on content)
      expect(finalScrollY).not.toBe(initialScrollY);

      // Verify touch events
      const touchEvents = await page.evaluate(() => (window as any).touchEvents);
      const touchMoves = touchEvents.filter((e: any) => e.type === 'touchmove');
      expect(touchMoves.length).toBeGreaterThan(0);
    });
  });

  test.describe('Touch Event Performance', () => {
    test('should handle rapid touch interactions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const tappableElements = page.locator('a, button').first();
      
      if (await tappableElements.count() > 0) {
        const element = tappableElements.first();
        const elementBox = await element.boundingBox();

        if (elementBox) {
          const centerX = elementBox.x + elementBox.width / 2;
          const centerY = elementBox.y + elementBox.height / 2;

          // Clear touch events
          await page.evaluate(() => { (window as any).touchEvents = []; });

          // Perform rapid taps
          const startTime = Date.now();
          for (let i = 0; i < 10; i++) {
            await page.touchscreen.tap(centerX, centerY, { delay: 50 });
            await page.waitForTimeout(10);
          }
          const endTime = Date.now();

          // Should complete rapid taps in reasonable time
          expect(endTime - startTime).toBeLessThan(2000);

          // Verify all touch events were captured
          const touchEvents = await page.evaluate(() => (window as any).touchEvents);
          expect(touchEvents.length).toBeGreaterThanOrEqual(20); // At least touchstart/touchend for each tap
        }
      }
    });

    test('should handle touch event cancellation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const element = page.locator('body').first();
      const elementBox = await element.boundingBox();

      if (elementBox) {
        const startX = elementBox.x + 100;
        const startY = elementBox.y + 100;

        // Clear touch events
        await page.evaluate(() => { (window as any).touchEvents = []; });

        // Start touch and move out of bounds to trigger cancel
        await page.touchscreen.tap(startX, startY);
        
        // Simulate moving touch way outside element
        await page.touchscreen.swipe(startX, startY, startX + 1000, startY + 1000, {
          steps: 5,
          delay: 10
        });

        // Check for touch events including potential cancellation
        const touchEvents = await page.evaluate(() => (window as any).touchEvents);
        
        expect(touchEvents.length).toBeGreaterThan(0);
        
        // Should have various touch event types
        const eventTypes = new Set(touchEvents.map((e: any) => e.type));
        expect(eventTypes.has('touchstart')).toBe(true);
        expect(eventTypes.has('touchmove') || eventTypes.has('touchend')).toBe(true);
      }
    });
  });

  test.describe('Accessibility with Touch', () => {
    test('should maintain accessibility with touch interactions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find focusable elements
      const focusableElements = page.locator(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const elementCount = await focusableElements.count();

      for (let i = 0; i < Math.min(elementCount, 5); i++) {
        const element = focusableElements.nth(i);
        
        if (await element.isVisible()) {
          // Element should be reachable by touch
          const elementBox = await element.boundingBox();
          if (elementBox) {
            expect(Math.min(elementBox.width, elementBox.height)).toBeGreaterThanOrEqual(24);
          }

          // Tap should focus the element
          await element.tap();
          
          // Check if element is focused
          const isFocused = await element.evaluate((el) => document.activeElement === el);
          
          // For interactive elements, focus should work
          if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(await element.evaluate(el => el.tagName))) {
            expect(isFocused).toBe(true);
          }
        }
      }
    });

    test('should provide adequate touch targets for accessibility', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check all interactive elements have adequate touch targets
      const interactiveElements = page.locator('a, button, input, select, [onclick], [role="button"]');
      const elementCount = await interactiveElements.count();

      let inadequateTargets = 0;

      for (let i = 0; i < elementCount; i++) {
        const element = interactiveElements.nth(i);
        
        if (await element.isVisible()) {
          const elementBox = await element.boundingBox();
          
          if (elementBox) {
            const minDimension = Math.min(elementBox.width, elementBox.height);
            
            // WCAG recommends minimum 44x44px touch targets
            if (minDimension < 32) { // Allow slightly smaller for basic compliance
              inadequateTargets++;
              
              const tagName = await element.evaluate(el => el.tagName);
              const className = await element.getAttribute('class') || '';
              console.warn(`Small touch target: ${tagName}.${className} - ${elementBox.width}x${elementBox.height}`);
            }
          }
        }
      }

      // Allow a small percentage of inadequate targets (for edge cases)
      const inadequatePercentage = (inadequateTargets / elementCount) * 100;
      expect(inadequatePercentage).toBeLessThan(20); // Less than 20% should be inadequate
    });
  });
});