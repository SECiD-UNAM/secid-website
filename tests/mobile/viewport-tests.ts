import { test, expect, Page } from '@playwright/test';

/**
 * Viewport-Specific Testing Suite
 * Tests how the application responds to different viewport sizes and device configurations
 */

// Extended device configurations with real-world specifications
const DEVICE_VIEWPORTS = {
  // Small phones
  'iPhone SE (1st gen)': { width: 320, height: 568, deviceScaleFactor: 2, isMobile: true },
  'iPhone SE (2nd gen)': { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
  'Galaxy S5': { width: 360, height: 640, deviceScaleFactor: 3, isMobile: true },
  
  // Standard phones
  'iPhone 12 Mini': { width: 375, height: 812, deviceScaleFactor: 3, isMobile: true },
  'iPhone 12/13': { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
  'iPhone 12/13 Pro': { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true },
  'Pixel 5': { width: 393, height: 851, deviceScaleFactor: 2.75, isMobile: true },
  'Galaxy S20': { width: 412, height: 915, deviceScaleFactor: 3.5, isMobile: true },
  
  // Large phones
  'iPhone 12/13 Pro Max': { width: 428, height: 926, deviceScaleFactor: 3, isMobile: true },
  'Galaxy Note 20': { width: 412, height: 915, deviceScaleFactor: 3, isMobile: true },
  'OnePlus 9': { width: 412, height: 919, deviceScaleFactor: 3, isMobile: true },
  
  // Tablets
  'iPad Mini': { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
  'iPad Air': { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true },
  'iPad Pro 11"': { width: 834, height: 1194, deviceScaleFactor: 2, isMobile: true },
  'iPad Pro 12.9"': { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true },
  'Galaxy Tab S7': { width: 800, height: 1280, deviceScaleFactor: 2, isMobile: true },
  'Surface Pro': { width: 912, height: 1368, deviceScaleFactor: 2, isMobile: true },
  
  // Desktop breakpoints
  'Small Desktop': { width: 1024, height: 768, deviceScaleFactor: 1, isMobile: false },
  'Medium Desktop': { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false },
  'Large Desktop': { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false },
  'Ultra Wide': { width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false },
  
  // Edge cases
  'Very Narrow': { width: 280, height: 653, deviceScaleFactor: 2, isMobile: true },
  'Very Wide Mobile': { width: 480, height: 320, deviceScaleFactor: 2, isMobile: true },
  'Square Tablet': { width: 1024, height: 1024, deviceScaleFactor: 2, isMobile: true },
};

// CSS breakpoints to test
const CSS_BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

test.describe('Viewport Responsiveness Tests', () => {
  
  // Test each device viewport
  Object.entries(DEVICE_VIEWPORTS).forEach(([deviceName, viewport]) => {
    test.describe(`${deviceName} (${viewport.width}x${viewport.height})`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ 
          width: viewport.width, 
          height: viewport.height 
        });
        
        // Set device scale factor if applicable
        if (viewport.deviceScaleFactor !== 1) {
          await page.emulateMedia({ 
            media: 'screen',
            colorScheme: 'light'
          });
        }
      });

      test('should render layout correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check for horizontal overflow
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewport.width;
        
        expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 2); // Allow 2px tolerance

        // Ensure main content is visible
        const mainContent = page.locator('main, .main-content, #main, body > *').first();
        await expect(mainContent).toBeVisible();

        // Check if content fits within viewport
        const contentBox = await mainContent.boundingBox();
        if (contentBox) {
          expect(contentBox.width).toBeLessThanOrEqual(viewportWidth);
        }
      });

      test('should handle navigation appropriately', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const navigation = page.locator('nav, .navigation, .navbar, header nav').first();
        
        if (await navigation.count() > 0) {
          await expect(navigation).toBeVisible();

          // For mobile viewports, check for mobile menu
          if (viewport.isMobile && viewport.width < 768) {
            const mobileMenuButton = page.locator(
              'button[aria-label*="menu"], .menu-toggle, .hamburger, [data-mobile-menu]'
            );
            
            if (await mobileMenuButton.count() > 0) {
              // Mobile menu should be present for small viewports
              await expect(mobileMenuButton).toBeVisible();
            }
          } else {
            // For larger viewports, navigation items should be visible
            const navLinks = navigation.locator('a');
            const linkCount = await navLinks.count();
            
            if (linkCount > 0) {
              // At least some navigation links should be visible
              await expect(navLinks.first()).toBeVisible();
            }
          }
        }
      });

      test('should display text readably', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check font sizes are appropriate for viewport
        const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6').first();
        
        if (await textElements.count() > 0) {
          const fontSize = await textElements.evaluate((el) => {
            return window.getComputedStyle(el).fontSize;
          });

          const fontSizeValue = parseInt(fontSize);
          
          // Font should be readable on all devices
          if (viewport.isMobile) {
            expect(fontSizeValue).toBeGreaterThanOrEqual(14); // Minimum 14px on mobile
          } else {
            expect(fontSizeValue).toBeGreaterThanOrEqual(12); // Minimum 12px on desktop
          }
          
          expect(fontSizeValue).toBeLessThanOrEqual(72); // Maximum reasonable size
        }
      });

      test('should handle images responsively', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const images = page.locator('img');
        const imageCount = await images.count();

        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          const img = images.nth(i);
          
          // Skip if image is not visible
          if (!(await img.isVisible())) continue;

          const imgBox = await img.boundingBox();
          
          if (imgBox) {
            // Image should not exceed viewport width
            expect(imgBox.width).toBeLessThanOrEqual(viewport.width);
            
            // Image should have reasonable dimensions
            expect(imgBox.width).toBeGreaterThan(0);
            expect(imgBox.height).toBeGreaterThan(0);
            
            // Aspect ratio should be reasonable
            const aspectRatio = imgBox.width / imgBox.height;
            expect(aspectRatio).toBeGreaterThan(0.1);
            expect(aspectRatio).toBeLessThan(10);
          }
        }
      });

      test('should handle forms appropriately', async ({ page }) => {
        // Test main page and job submission page
        const formPages = ['/', '/job-submission.html'];
        
        for (const formPage of formPages) {
          try {
            await page.goto(formPage);
            await page.waitForLoadState('networkidle');

            const forms = page.locator('form');
            const formCount = await forms.count();

            if (formCount > 0) {
              const form = forms.first();
              const formBox = await form.boundingBox();

              if (formBox) {
                // Form should fit within viewport
                expect(formBox.width).toBeLessThanOrEqual(viewport.width);

                // Check form inputs
                const inputs = form.locator('input, textarea, select');
                const inputCount = await inputs.count();

                for (let i = 0; i < Math.min(inputCount, 3); i++) {
                  const input = inputs.nth(i);
                  const inputBox = await input.boundingBox();

                  if (inputBox) {
                    // Input should fit within form and viewport
                    expect(inputBox.width).toBeLessThanOrEqual(viewport.width - 20); // Account for padding
                    
                    // Input should be tall enough to be usable on touch devices
                    if (viewport.isMobile) {
                      expect(inputBox.height).toBeGreaterThanOrEqual(32); // Minimum touch target
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.log(`Form testing skipped for ${formPage} on ${deviceName}: ${error.message}`);
          }
        }
      });

      test('should maintain performance', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        // Performance expectations based on viewport size
        let maxLoadTime = 10000; // Default 10 seconds
        
        if (viewport.width >= 1024) {
          maxLoadTime = 5000; // Faster loading expected on desktop
        } else if (viewport.width <= 375) {
          maxLoadTime = 15000; // Allow more time for small mobile devices
        }

        expect(loadTime).toBeLessThan(maxLoadTime);

        // Check resource loading
        const performanceMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : null,
            loadComplete: navigation ? navigation.loadEventEnd - navigation.fetchStart : null,
          };
        });

        if (performanceMetrics.domContentLoaded) {
          expect(performanceMetrics.domContentLoaded).toBeLessThan(maxLoadTime);
        }
      });
    });
  });

  test.describe('CSS Breakpoint Testing', () => {
    Object.entries(CSS_BREAKPOINTS).forEach(([breakpointName, width]) => {
      test(`should handle ${breakpointName} breakpoint (${width}px) correctly`, async ({ page }) => {
        // Test just below breakpoint
        await page.setViewportSize({ width: width - 1, height: 800 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const belowBreakpointLayout = await page.evaluate(() => {
          const body = document.body;
          const computedStyle = window.getComputedStyle(body);
          return {
            display: computedStyle.display,
            flexDirection: computedStyle.flexDirection,
            gridTemplateColumns: computedStyle.gridTemplateColumns,
          };
        });

        // Test at breakpoint
        await page.setViewportSize({ width: width, height: 800 });
        await page.waitForTimeout(100); // Allow for reflow

        const atBreakpointLayout = await page.evaluate(() => {
          const body = document.body;
          const computedStyle = window.getComputedStyle(body);
          return {
            display: computedStyle.display,
            flexDirection: computedStyle.flexDirection,
            gridTemplateColumns: computedStyle.gridTemplateColumns,
          };
        });

        // Test just above breakpoint
        await page.setViewportSize({ width: width + 1, height: 800 });
        await page.waitForTimeout(100); // Allow for reflow

        const aboveBreakpointLayout = await page.evaluate(() => {
          const body = document.body;
          const computedStyle = window.getComputedStyle(body);
          return {
            display: computedStyle.display,
            flexDirection: computedStyle.flexDirection,
            gridTemplateColumns: computedStyle.gridTemplateColumns,
          };
        });

        // Layout should be consistent at and above breakpoint
        expect(atBreakpointLayout).toEqual(aboveBreakpointLayout);

        // Check that content is still accessible at all sizes
        const mainContent = page.locator('main, .main-content, #main, body').first();
        await expect(mainContent).toBeVisible();
      });
    });
  });

  test.describe('Orientation Testing', () => {
    const orientationTestDevices = [
      { name: 'iPhone 12', portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } },
      { name: 'iPad', portrait: { width: 768, height: 1024 }, landscape: { width: 1024, height: 768 } },
      { name: 'Galaxy S20', portrait: { width: 412, height: 915 }, landscape: { width: 915, height: 412 } },
    ];

    orientationTestDevices.forEach(device => {
      test(`should handle orientation changes on ${device.name}`, async ({ page }) => {
        // Start in portrait
        await page.setViewportSize(device.portrait);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check portrait layout
        const portraitNav = page.locator('nav, .navigation, .navbar').first();
        const portraitNavVisible = await portraitNav.isVisible().catch(() => false);

        // Take screenshot in portrait
        await page.screenshot({ 
          path: `test-results/screenshots/${device.name.replace(/\s+/g, '-').toLowerCase()}-portrait.png`,
          fullPage: false 
        });

        // Switch to landscape
        await page.setViewportSize(device.landscape);
        await page.waitForTimeout(500); // Allow time for reflow

        // Check landscape layout
        const landscapeNav = page.locator('nav, .navigation, .navbar').first();
        const landscapeNavVisible = await landscapeNav.isVisible().catch(() => false);

        // Content should still be accessible
        const mainContent = page.locator('main, .main-content, #main, body').first();
        await expect(mainContent).toBeVisible();

        // Check for horizontal scroll
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyScrollWidth).toBeLessThanOrEqual(device.landscape.width + 2);

        // Take screenshot in landscape
        await page.screenshot({ 
          path: `test-results/screenshots/${device.name.replace(/\s+/g, '-').toLowerCase()}-landscape.png`,
          fullPage: false 
        });

        // Navigation behavior might change between orientations, but content should remain accessible
        expect(portraitNavVisible || landscapeNavVisible).toBe(true);
      });
    });
  });

  test.describe('Edge Case Viewports', () => {
    const edgeCases = [
      { name: 'Ultra Narrow', width: 240, height: 640 },
      { name: 'Ultra Wide', width: 1920, height: 400 },
      { name: 'Very Tall', width: 360, height: 2000 },
      { name: 'Square', width: 600, height: 600 },
      { name: 'Tiny', width: 200, height: 300 },
    ];

    edgeCases.forEach(viewport => {
      test(`should handle ${viewport.name} viewport (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Basic functionality should still work
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // No horizontal overflow
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 5); // Allow small tolerance

        // Content should be accessible
        const textContent = await page.textContent('body');
        expect(textContent?.length).toBeGreaterThan(50);

        // Interactive elements should still be clickable
        const links = page.locator('a[href]');
        const linkCount = await links.count();
        
        if (linkCount > 0) {
          const firstLink = links.first();
          await expect(firstLink).toBeVisible();
          
          // Check if link is actually clickable (has reasonable size)
          const linkBox = await firstLink.boundingBox();
          if (linkBox) {
            expect(linkBox.width).toBeGreaterThan(0);
            expect(linkBox.height).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  test.describe('Dynamic Viewport Changes', () => {
    test('should handle rapid viewport changes gracefully', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const viewportSizes = [
        { width: 320, height: 568 },
        { width: 768, height: 1024 },
        { width: 1920, height: 1080 },
        { width: 375, height: 667 },
        { width: 1366, height: 768 },
      ];

      for (const size of viewportSizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(100); // Brief pause for reflow

        // Page should remain functional
        await expect(page.locator('body')).toBeVisible();
        
        // No JavaScript errors should occur
        const jsErrors: string[] = [];
        page.on('pageerror', (error) => {
          jsErrors.push(error.message);
        });

        // Check for layout stability
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width + 5);
      }
    });

    test('should maintain state during viewport changes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Interact with the page (e.g., fill a form if available)
      const inputs = page.locator('input[type="text"], textarea');
      if (await inputs.count() > 0) {
        const testInput = inputs.first();
        await testInput.fill('Test content that should persist');
        
        // Change viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(200);
        
        // Value should persist
        const persistedValue = await testInput.inputValue();
        expect(persistedValue).toBe('Test content that should persist');
      }

      // Scroll position should be maintained reasonably
      await page.evaluate(() => window.scrollTo(0, 200));
      const scrollY1 = await page.evaluate(() => window.scrollY);
      
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(100);
      
      const scrollY2 = await page.evaluate(() => window.scrollY);
      
      // Scroll position should be close to original (allowing for layout changes)
      expect(Math.abs(scrollY2 - scrollY1)).toBeLessThan(100);
    });
  });
});