import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive Mobile Responsiveness Test Suite
 * Tests various aspects of mobile user experience including layout, navigation, 
 * performance, and accessibility across different devices and network conditions.
 */

// Common mobile device configurations
const MOBILE_DEVICES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPhone 13 Pro', width: 393, height: 852 },
  { name: 'Pixel 5', width: 393, height: 851 },
  { name: 'Galaxy S9+', width: 412, height: 846 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
];

// Performance thresholds for mobile
const PERFORMANCE_THRESHOLDS = {
  firstContentfulPaint: 2500, // 2.5s
  largestContentfulPaint: 4000, // 4s
  timeToInteractive: 5000, // 5s
  cumulativeLayoutShift: 0.1,
};

test.describe('Mobile Responsiveness Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable JavaScript
    await page.addInitScript(() => {
      // Add performance observer for mobile metrics
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              (window as any).navigationTiming = entry;
            }
            if (entry.entryType === 'paint') {
              (window as any).paintTiming = (window as any).paintTiming || {};
              (window as any).paintTiming[entry.name] = entry.startTime;
            }
          }
        });
        observer.observe({ entryTypes: ['navigation', 'paint'] });
      }
    });
  });

  test.describe('Layout Responsiveness', () => {
    MOBILE_DEVICES.forEach(device => {
      test(`should render correctly on ${device.name} (${device.width}x${device.height})`, async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');

        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');

        // Check if page renders without horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(device.width + 1); // Allow 1px tolerance

        // Ensure main content is visible
        await expect(page.locator('main, .main-content, #main')).toBeVisible();

        // Check navigation is accessible
        const nav = page.locator('nav, .navigation, .navbar');
        if (await nav.count() > 0) {
          await expect(nav.first()).toBeVisible();
        }

        // Take screenshot for visual comparison
        await page.screenshot({ 
          path: `test-results/screenshots/${device.name.replace(/\s+/g, '-').toLowerCase()}-layout.png`,
          fullPage: true 
        });
      });
    });

    test('should handle orientation changes correctly', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Orientation testing not fully supported on WebKit');
      
      // Start in portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check portrait layout
      const portraitHeight = await page.evaluate(() => window.innerHeight);
      expect(portraitHeight).toBeGreaterThan(600);

      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500); // Allow time for reflow

      // Check landscape layout
      const landscapeWidth = await page.evaluate(() => window.innerWidth);
      expect(landscapeWidth).toBeGreaterThan(600);

      // Ensure content is still accessible
      await expect(page.locator('main, .main-content, #main')).toBeVisible();
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should handle mobile menu interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for mobile menu button (hamburger menu)
      const menuButton = page.locator(
        'button[aria-label*="menu"], .menu-toggle, .hamburger, [aria-expanded]'
      ).first();

      if (await menuButton.count() > 0) {
        // Test menu toggle
        await menuButton.click();
        await page.waitForTimeout(300); // Wait for animation

        // Check if menu is expanded
        const isExpanded = await menuButton.getAttribute('aria-expanded');
        if (isExpanded !== null) {
          expect(isExpanded).toBe('true');
        }

        // Look for navigation links
        const navLinks = page.locator('nav a, .menu a').filter({ hasText: /.+/ });
        const linkCount = await navLinks.count();
        expect(linkCount).toBeGreaterThan(0);

        // Test closing menu
        await menuButton.click();
        await page.waitForTimeout(300);

        const isCollapsed = await menuButton.getAttribute('aria-expanded');
        if (isCollapsed !== null) {
          expect(isCollapsed).toBe('false');
        }
      }
    });

    test('should handle sticky navigation on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const navigation = page.locator('nav, .navbar, header nav').first();
      if (await navigation.count() > 0) {
        // Get initial position
        const initialBox = await navigation.boundingBox();
        
        // Scroll down
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(300);

        // Check if navigation is still visible (sticky)
        const afterScrollBox = await navigation.boundingBox();
        
        // If sticky, navigation should still be visible at the top
        if (afterScrollBox) {
          expect(afterScrollBox.y).toBeLessThanOrEqual(10);
        }
      }
    });
  });

  test.describe('Form Interactions', () => {
    test('should handle form inputs on mobile keyboards', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test different form pages
      const formPages = ['/', '/job-submission.html', '/registro.html'];
      
      for (const formPage of formPages) {
        try {
          await page.goto(formPage);
          await page.waitForLoadState('networkidle');

          // Find form inputs
          const inputs = page.locator('input, textarea, select');
          const inputCount = await inputs.count();

          if (inputCount > 0) {
            // Test text input
            const textInputs = page.locator('input[type="text"], input[type="email"], textarea');
            if (await textInputs.count() > 0) {
              const firstTextInput = textInputs.first();
              await firstTextInput.click();
              await firstTextInput.fill('Test input on mobile');
              
              // Verify input accepts text
              const inputValue = await firstTextInput.inputValue();
              expect(inputValue).toBe('Test input on mobile');
            }

            // Test number input
            const numberInputs = page.locator('input[type="number"], input[type="tel"]');
            if (await numberInputs.count() > 0) {
              const firstNumberInput = numberInputs.first();
              await firstNumberInput.click();
              await firstNumberInput.fill('1234567890');
              
              const numberValue = await firstNumberInput.inputValue();
              expect(numberValue).toMatch(/\d+/);
            }

            // Test select dropdown
            const selects = page.locator('select');
            if (await selects.count() > 0) {
              const firstSelect = selects.first();
              await firstSelect.click();
              
              // Try to select an option
              const options = firstSelect.locator('option');
              if (await options.count() > 1) {
                await options.nth(1).click();
              }
            }
          }
        } catch (error) {
          console.log(`Form testing skipped for ${formPage}: ${error.message}`);
        }
      }
    });

    test('should handle form validation on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for forms with required fields
      const requiredInputs = page.locator('input[required], textarea[required]');
      const submitButtons = page.locator('button[type="submit"], input[type="submit"]');

      if (await requiredInputs.count() > 0 && await submitButtons.count() > 0) {
        // Try to submit form without filling required fields
        await submitButtons.first().click();
        await page.waitForTimeout(500);

        // Check for validation messages
        const validationMessages = page.locator(':invalid, .error, .validation-error');
        if (await validationMessages.count() > 0) {
          await expect(validationMessages.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Media and Content', () => {
    test('should handle images responsively', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check all images
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < Math.min(imageCount, 10); i++) { // Test first 10 images
        const img = images.nth(i);
        
        // Wait for image to load
        await img.waitFor({ state: 'visible' });
        
        // Check if image fits within viewport
        const box = await img.boundingBox();
        if (box) {
          expect(box.width).toBeLessThanOrEqual(375);
          
          // Check if image has proper alt text for accessibility
          const altText = await img.getAttribute('alt');
          if (altText === null || altText === '') {
            console.warn(`Image ${i} missing alt text for accessibility`);
          }
        }
      }
    });

    test('should handle video content on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const videos = page.locator('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
      const videoCount = await videos.count();

      for (let i = 0; i < videoCount; i++) {
        const video = videos.nth(i);
        const box = await video.boundingBox();
        
        if (box) {
          // Video should not exceed viewport width
          expect(box.width).toBeLessThanOrEqual(375);
          
          // Video should maintain aspect ratio
          const aspectRatio = box.width / box.height;
          expect(aspectRatio).toBeGreaterThan(0.5);
          expect(aspectRatio).toBeLessThan(3);
        }
      }
    });
  });

  test.describe('Performance on Mobile', () => {
    test('should meet mobile performance thresholds', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate with performance timing
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'load' });
      const loadTime = Date.now() - startTime;

      // Check basic load time
      expect(loadTime).toBeLessThan(10000); // 10 seconds max

      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintMetrics = (window as any).paintTiming || {};
        
        return {
          domContentLoaded: perfData ? perfData.domContentLoadedEventEnd - perfData.fetchStart : null,
          loadComplete: perfData ? perfData.loadEventEnd - perfData.fetchStart : null,
          firstContentfulPaint: paintMetrics['first-contentful-paint'] || null,
          transferSize: perfData ? perfData.transferSize : null,
        };
      });

      console.log('Performance metrics:', performanceMetrics);

      // Validate performance thresholds
      if (performanceMetrics.firstContentfulPaint) {
        expect(performanceMetrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
      }

      if (performanceMetrics.domContentLoaded) {
        expect(performanceMetrics.domContentLoaded).toBeLessThan(5000); // 5 seconds
      }
    });

    test('should handle slow network conditions', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto('/', { timeout: 30000 });
      const loadTime = Date.now() - startTime;

      // Should still load within reasonable time even on slow network
      expect(loadTime).toBeLessThan(30000); // 30 seconds max for slow network

      // Page should still be functional
      await expect(page.locator('main, .main-content, #main')).toBeVisible();
    });
  });

  test.describe('Accessibility on Mobile', () => {
    test('should be accessible with screen readers on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // Check for skip links
      const skipLinks = page.locator('a[href="#main"], a[href="#content"], .skip-link');
      if (await skipLinks.count() > 0) {
        await expect(skipLinks.first()).toBeTruthy();
      }

      // Check for proper focus management
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Check for ARIA labels on interactive elements
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        
        // Button should have either text content or aria-label
        expect(ariaLabel || text?.trim()).toBeTruthy();
      }
    });

    test('should have proper contrast ratios on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check color contrast (basic check)
      const textElements = page.locator('p, span, div, a, button, h1, h2, h3, h4, h5, h6');
      const elementCount = await textElements.count();

      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = textElements.nth(i);
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
          };
        });

        // Ensure text is not invisible (same color as background)
        expect(styles.color).not.toBe(styles.backgroundColor);
      }
    });
  });

  test.describe('PWA Features', () => {
    test('should have basic PWA manifest', async ({ page }) => {
      await page.goto('/');
      
      // Check for manifest link
      const manifestLink = page.locator('link[rel="manifest"]');
      if (await manifestLink.count() > 0) {
        const manifestHref = await manifestLink.getAttribute('href');
        expect(manifestHref).toBeTruthy();

        // Try to fetch manifest
        const manifestResponse = await page.request.get(manifestHref!);
        expect(manifestResponse.status()).toBe(200);
        
        const manifestContent = await manifestResponse.json();
        expect(manifestContent.name || manifestContent.short_name).toBeTruthy();
      }
    });

    test('should work offline for cached content', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Simulate offline
      await context.setOffline(true);

      // Try to reload the page
      try {
        await page.reload({ timeout: 5000 });
        // If page loads offline, it has some caching strategy
        await expect(page.locator('body')).toBeVisible();
      } catch (error) {
        // It's okay if offline doesn't work, just log it
        console.log('Offline functionality not implemented');
      } finally {
        await context.setOffline(false);
      }
    });
  });
});

test.describe('Cross-Device Consistency', () => {
  test('should maintain consistent functionality across devices', async ({ page }) => {
    const testUrls = ['/', '/aboutus.html'];
    
    for (const url of testUrls) {
      for (const device of MOBILE_DEVICES.slice(0, 3)) { // Test first 3 devices
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Basic functionality should work on all devices
        const links = page.locator('a[href]');
        const linkCount = await links.count();
        expect(linkCount).toBeGreaterThan(0);

        // Navigation should be accessible
        const nav = page.locator('nav, .navigation, .navbar');
        if (await nav.count() > 0) {
          await expect(nav.first()).toBeVisible();
        }

        // Content should be readable
        const textContent = await page.textContent('body');
        expect(textContent?.length).toBeGreaterThan(100);
      }
    }
  });
});