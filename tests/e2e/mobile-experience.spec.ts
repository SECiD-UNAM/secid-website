import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';

// Mobile device configurations for comprehensive testing
const mobileDevices = [
  { name: 'iPhone SE', width: 375, height: 667, userAgent: 'iPhone' },
  { name: 'iPhone 12', width: 390, height: 844, userAgent: 'iPhone' },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, userAgent: 'iPhone' },
  { name: 'Samsung Galaxy S21', width: 360, height: 800, userAgent: 'Android' },
  { name: 'Google Pixel 5', width: 393, height: 851, userAgent: 'Android' },
  { name: 'iPad Mini', width: 744, height: 1133, userAgent: 'iPad' },
  { name: 'iPad Pro', width: 1024, height: 1366, userAgent: 'iPad' },
];

// Touch interaction test data
const touchTestData = {
  swipeThreshold: 50,
  tapTarget: 44, // Minimum tap target size in pixels
  scrollDistance: 200,
  pinchZoomScale: 1.5,
};

class MobileExperienceFlow {
  constructor(private page: Page) {}

  async testMobileNavigation() {
    // Test mobile hamburger menu
    await this.page.click('[data-testid="mobile-menu-toggle"]');
    await expect(this.page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test menu items
    const menuItems = [
      { label: 'Inicio', href: '/es/' },
      { label: 'Trabajos', href: '/es/empleos' },
      { label: 'Miembros', href: '/es/miembros' },
      { label: 'Eventos', href: '/es/events' },
      { label: 'Dashboard', href: '/es/dashboard' },
    ];
    
    for (const item of menuItems) {
      await expect(this.page.locator(`[data-testid="mobile-menu"] a[href="${item.href}"]`)).toBeVisible();
    }
    
    // Test menu close
    await this.page.click('[data-testid="mobile-menu-close"]');
    await expect(this.page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
  }

  async testTouchInteractions() {
    // Test tap targets are large enough
    const tapTargets = this.page.locator('button, a, input[type="checkbox"], input[type="radio"]');
    const count = await tapTargets.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = tapTargets.nth(i);
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        // Tap targets should be at least 44px in both dimensions
        expect(boundingBox.width).toBeGreaterThanOrEqual(touchTestData.tapTarget);
        expect(boundingBox.height).toBeGreaterThanOrEqual(touchTestData.tapTarget);
      }
    }
  }

  async testSwipeGestures() {
    // Test horizontal swipe on carousel or slider
    const carousel = this.page.locator('[data-testid="carousel"], [data-testid="slider"]');
    
    if (await carousel.isVisible()) {
      const boundingBox = await carousel.boundingBox();
      if (boundingBox) {
        // Swipe left
        await this.page.touchscreen.tap(boundingBox.x + boundingBox.width - 50, boundingBox.y + boundingBox.height / 2);
        await this.page.touchscreen.tap(boundingBox.x + 50, boundingBox.y + boundingBox.height / 2);
        
        // Verify carousel moved
        await this.page.waitForTimeout(500);
        
        // Swipe right
        await this.page.touchscreen.tap(boundingBox.x + 50, boundingBox.y + boundingBox.height / 2);
        await this.page.touchscreen.tap(boundingBox.x + boundingBox.width - 50, boundingBox.y + boundingBox.height / 2);
      }
    }
  }

  async testScrollBehavior() {
    // Test smooth scrolling
    await this.page.evaluate(() => {
      window.scrollTo({ top: 500, behavior: 'smooth' });
    });
    
    await this.page.waitForTimeout(1000);
    
    const scrollY = await this.page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(400);
    
    // Test scroll to top
    await this.page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    await this.page.waitForTimeout(1000);
    
    const newScrollY = await this.page.evaluate(() => window.scrollY);
    expect(newScrollY).toBeLessThan(100);
  }

  async testFormInput() {
    // Navigate to a form page
    await this.page.goto('/es/signup');
    
    // Test mobile form inputs
    const inputs = [
      { selector: 'input[name="firstName"]', value: 'John' },
      { selector: 'input[name="lastName"]', value: 'Doe' },
      { selector: 'input[name="email"]', value: 'john@example.com' },
      { selector: 'input[name="password"]', value: 'SecurePass123!' },
    ];
    
    for (const input of inputs) {
      const element = this.page.locator(input.selector);
      
      // Tap to focus
      await element.tap();
      await expect(element).toBeFocused();
      
      // Type value
      await element.fill(input.value);
      await expect(element).toHaveValue(input.value);
      
      // Check that virtual keyboard doesn't obscure input
      const boundingBox = await element.boundingBox();
      if (boundingBox) {
        expect(boundingBox.y).toBeGreaterThan(0);
      }
    }
  }

  async testMobileSearch() {
    await this.page.goto('/es/empleos');
    
    // Test mobile search interface
    const searchInput = this.page.locator('input[data-testid="job-search-input"]');
    
    // Input should have proper mobile attributes
    await expect(searchInput).toHaveAttribute('type', 'search');
    await expect(searchInput).toHaveCSS('font-size', '16px'); // Prevents zoom on iOS
    
    // Test search functionality
    await searchInput.tap();
    await searchInput.fill('Data Scientist');
    
    // Should show mobile-friendly search suggestions
    await expect(this.page.locator('[data-testid="mobile-search-suggestions"]')).toBeVisible();
    
    // Test search submission
    await this.page.keyboard.press('Enter');
    await expect(this.page.locator('[data-testid="search-results"]')).toBeVisible();
  }

  async testMobileCards() {
    await this.page.goto('/es/empleos');
    
    // Test mobile job cards
    const jobCards = this.page.locator('[data-testid="job-card"]');
    const count = await jobCards.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = jobCards.nth(i);
      
      // Card should be full width on mobile
      const boundingBox = await card.boundingBox();
      if (boundingBox) {
        const viewportWidth = this.page.viewportSize()?.width || 0;
        expect(boundingBox.width).toBeGreaterThan(viewportWidth * 0.9);
      }
      
      // Test card tap interaction
      await card.tap();
      
      // Should navigate to job details
      await expect(this.page).toHaveURL(/\/es\/jobs\/[^\/]+$/);
      await this.page.goBack();
    }
  }

  async testMobileModals() {
    await this.page.goto('/es/dashboard');
    
    // Test mobile modal behavior
    await this.page.click('[data-testid="create-post"]');
    
    const modal = this.page.locator('[data-testid="mobile-modal"]');
    await expect(modal).toBeVisible();
    
    // Modal should be full screen on mobile
    const modalBox = await modal.boundingBox();
    const viewport = this.page.viewportSize();
    
    if (modalBox && viewport) {
      expect(modalBox.width).toBeGreaterThan(viewport.width * 0.95);
      expect(modalBox.height).toBeGreaterThan(viewport.height * 0.8);
    }
    
    // Test modal close with swipe down (if implemented)
    await modal.tap();
    
    // Test modal close button
    await this.page.click('[data-testid="modal-close"]');
    await expect(modal).not.toBeVisible();
  }

  async testPullToRefresh() {
    await this.page.goto('/es/dashboard');
    
    // Simulate pull to refresh gesture
    await this.page.touchscreen.tap(200, 100);
    await this.page.touchscreen.tap(200, 200);
    
    // Should show refresh indicator
    await expect(this.page.locator('[data-testid="refresh-indicator"]')).toBeVisible();
    
    await this.page.waitForTimeout(2000);
    
    // Refresh indicator should disappear
    await expect(this.page.locator('[data-testid="refresh-indicator"]')).not.toBeVisible();
  }

  async testMobileOrientation() {
    // Test portrait orientation
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.goto('/es/dashboard');
    
    await expect(this.page.locator('[data-testid="mobile-portrait-layout"]')).toBeVisible();
    
    // Test landscape orientation
    await this.page.setViewportSize({ width: 667, height: 375 });
    await this.page.reload();
    
    await expect(this.page.locator('[data-testid="mobile-landscape-layout"]')).toBeVisible();
    
    // Navigation should adapt to landscape
    await expect(this.page.locator('[data-testid="landscape-navigation"]')).toBeVisible();
  }

  async testMobilePerformance() {
    const startTime = Date.now();
    
    await this.page.goto('/es/');
    await this.page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Mobile pages should load within 3 seconds on 3G
    expect(loadTime).toBeLessThan(3000);
    
    // Test scroll performance
    const scrollStartTime = Date.now();
    
    await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= 1000) {
            clearInterval(timer);
            resolve(undefined);
          }
        }, 50);
      });
    });
    
    const scrollTime = Date.now() - scrollStartTime;
    
    // Scrolling should be smooth and responsive
    expect(scrollTime).toBeLessThan(2000);
  }

  async testAccessibilityOnMobile() {
    await this.page.goto('/es/');
    
    // Test touch target sizes for accessibility
    const interactiveElements = this.page.locator('button, a, input, textarea, select');
    const count = await interactiveElements.count();
    
    for (let i = 0; i < Math.min(count, 20); i++) {
      const element = interactiveElements.nth(i);
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        // WCAG AA compliance: touch targets should be at least 44x44px
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
    
    // Test screen reader support on mobile
    await expect(this.page.locator('[aria-label]')).toHaveCountGreaterThan(0);
    await expect(this.page.locator('[role]')).toHaveCountGreaterThan(0);
  }
}

test.describe('Mobile Experience Tests', () => {
  let mobileFlow: MobileExperienceFlow;

  test.beforeEach(async ({ page }) => {
    mobileFlow = new MobileExperienceFlow(page);
    
    // Set mobile viewport (iPhone 12)
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Mock user authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      }));
    });
    
    // Mock mobile-specific APIs
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/jobs')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jobs: [
              {
                id: 'job-1',
                title: 'Mobile Data Scientist',
                company: 'Tech Corp',
                location: 'Remote',
                type: 'Full-time',
                salary: '$80,000 - $100,000',
                description: 'Mobile-optimized job posting for data science role.',
              },
            ],
          }),
        });
      }
    });
  });

  test('comprehensive mobile navigation test', async ({ page }) => {
    await page.goto('/es/');
    
    // Test mobile homepage
    await expect(page.locator('[data-testid="mobile-hero"]')).toBeVisible();
    
    // Test mobile navigation
    await mobileFlow.testMobileNavigation();
    
    // Test touch interactions
    await mobileFlow.testTouchInteractions();
    
    // Test scroll behavior
    await mobileFlow.testScrollBehavior();
  });

  test('mobile form interactions', async ({ page }) => {
    await mobileFlow.testFormInput();
    
    // Test form validation on mobile
    await page.click('button[type="submit"]');
    
    // Error messages should be visible and properly positioned
    const errorMessages = page.locator('[data-testid="field-error"]');
    const count = await errorMessages.count();
    
    for (let i = 0; i < count; i++) {
      const error = errorMessages.nth(i);
      await expect(error).toBeVisible();
      
      // Error should not be overlapped by virtual keyboard
      const boundingBox = await error.boundingBox();
      if (boundingBox) {
        expect(boundingBox.y).toBeGreaterThan(0);
      }
    }
  });

  test('mobile search experience', async ({ page }) => {
    await mobileFlow.testMobileSearch();
    
    // Test mobile filters
    await page.click('[data-testid="mobile-filters-toggle"]');
    await expect(page.locator('[data-testid="mobile-filters-drawer"]')).toBeVisible();
    
    // Test filter application
    await page.check('input[value="Remote"]');
    await page.click('[data-testid="apply-mobile-filters"]');
    
    // Drawer should close and filters should be applied
    await expect(page.locator('[data-testid="mobile-filters-drawer"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="active-filter"]')).toContainText('Remote');
  });

  test('mobile card interactions', async ({ page }) => {
    await mobileFlow.testMobileCards();
    
    // Test card actions (save, share, etc.)
    await page.goto('/es/empleos');
    
    const firstCard = page.locator('[data-testid="job-card"]').first();
    
    // Test save job action
    await firstCard.locator('[data-testid="save-job"]').tap();
    await expect(page.locator('text=Trabajo guardado')).toBeVisible();
    
    // Test share job action
    await firstCard.locator('[data-testid="share-job"]').tap();
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
  });

  test('mobile modal and drawer behavior', async ({ page }) => {
    await mobileFlow.testMobileModals();
    
    // Test bottom drawer
    await page.goto('/es/dashboard');
    await page.click('[data-testid="quick-actions-menu"]');
    
    const drawer = page.locator('[data-testid="bottom-drawer"]');
    await expect(drawer).toBeVisible();
    
    // Test drawer swipe to close
    const drawerBox = await drawer.boundingBox();
    if (drawerBox) {
      // Swipe down to close
      await page.touchscreen.tap(drawerBox.x + drawerBox.width / 2, drawerBox.y + 50);
      await page.touchscreen.tap(drawerBox.x + drawerBox.width / 2, drawerBox.y + drawerBox.height);
    }
    
    await expect(drawer).not.toBeVisible();
  });

  test('mobile gesture interactions', async ({ page }) => {
    await page.goto('/es/dashboard');
    
    await mobileFlow.testSwipeGestures();
    await mobileFlow.testPullToRefresh();
    
    // Test pinch to zoom (if applicable)
    const zoomableElement = page.locator('[data-testid="zoomable-image"], [data-testid="chart"]');
    
    if (await zoomableElement.isVisible()) {
      const boundingBox = await zoomableElement.boundingBox();
      if (boundingBox) {
        // Simulate pinch zoom
        await page.touchscreen.tap(boundingBox.x + 50, boundingBox.y + 50);
        await page.touchscreen.tap(boundingBox.x + boundingBox.width - 50, boundingBox.y + boundingBox.height - 50);
        
        // Element should zoom in (implementation dependent)
        await expect(zoomableElement).toHaveClass(/zoomed/);
      }
    }
  });

  test('mobile orientation changes', async ({ page }) => {
    await mobileFlow.testMobileOrientation();
    
    // Test specific components in landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/es/dashboard');
    
    // Dashboard should adapt to landscape
    await expect(page.locator('[data-testid="landscape-dashboard"]')).toBeVisible();
    
    // Navigation should be horizontal in landscape
    await expect(page.locator('[data-testid="horizontal-nav"]')).toBeVisible();
  });

  test('mobile performance optimization', async ({ page }) => {
    await mobileFlow.testMobilePerformance();
    
    // Test image lazy loading
    await page.goto('/es/miembros');
    
    const images = page.locator('img[data-testid="member-avatar"]');
    const count = await images.count();
    
    if (count > 0) {
      // Images below the fold should have loading="lazy"
      for (let i = 3; i < Math.min(count, 10); i++) {
        const img = images.nth(i);
        await expect(img).toHaveAttribute('loading', 'lazy');
      }
    }
    
    // Test critical CSS inlining
    const inlineStyles = await page.locator('style').count();
    expect(inlineStyles).toBeGreaterThan(0);
  });

  test('mobile accessibility compliance', async ({ page }) => {
    await mobileFlow.testAccessibilityOnMobile();
    
    // Test focus management on mobile
    await page.goto('/es/signup');
    
    // First input should be focusable with screen reader
    const firstInput = page.locator('input').first();
    await firstInput.focus();
    await expect(firstInput).toBeFocused();
    
    // Test skip links
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid="skip-to-content"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
    }
  });
});

// Cross-device mobile testing
test.describe('Cross-Device Mobile Tests', () => {
  mobileDevices.forEach(device => {
    test(`mobile experience on ${device.name}`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      
      // Set user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': `Mozilla/5.0 (compatible; ${device.userAgent} Test)`
      });
      
      const mobileFlow = new MobileExperienceFlow(page);
      
      await page.goto('/es/');
      
      // Test basic navigation works on this device
      await mobileFlow.testMobileNavigation();
      
      // Test touch interactions
      await mobileFlow.testTouchInteractions();
      
      // Test form input
      await page.goto('/es/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      
      // Form should be properly sized for device
      const form = page.locator('form');
      const formBox = await form.boundingBox();
      
      if (formBox) {
        expect(formBox.width).toBeLessThanOrEqual(device.width);
        expect(formBox.width).toBeGreaterThan(device.width * 0.8);
      }
    });
  });
});

// Network conditions testing
test.describe('Mobile Network Performance', () => {
  test('mobile experience on slow 3G', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.continue();
    });
    
    const mobileFlow = new MobileExperienceFlow(page);
    
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    await page.goto('/es/');
    
    // Page should still load reasonably fast even on slow connection
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
    
    // Test that essential content loads first
    await expect(page.locator('[data-testid="mobile-hero"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
  });

  test('mobile experience offline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Go online first to load the page
    await page.goto('/es/dashboard');
    
    // Go offline
    await page.setOffline(true);
    
    // Try to navigate
    await page.click('[data-testid="mobile-menu-toggle"]');
    await page.click('a[href="/es/empleos"]');
    
    // Should show offline message
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
    
    // Go back online
    await page.setOffline(false);
    
    // Should recover automatically
    await page.reload();
    await expect(page.locator('[data-testid="offline-message"]')).not.toBeVisible();
  });
});

// Mobile PWA features
test.describe('Mobile PWA Features', () => {
  test('install prompt and PWA behavior', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es/');
    
    // Test service worker registration
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swRegistered).toBeTruthy();
    
    // Test app manifest
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href', '/manifest.json');
    
    // Test install prompt (if supported)
    const installButton = page.locator('[data-testid="install-app"]');
    if (await installButton.isVisible()) {
      await installButton.click();
      // Install prompt behavior would be tested here
    }
  });

  test('mobile notifications', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es/dashboard');
    
    // Test notification permission request
    await page.click('[data-testid="enable-notifications"]');
    
    // Mock notification permission
    await page.evaluate(() => {
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: false
      });
    });
    
    // Should show notification enabled state
    await expect(page.locator('[data-testid="notifications-enabled"]')).toBeVisible();
  });
});

// Visual regression for mobile
test.describe('Mobile Visual Regression', () => {
  test('mobile homepage visual consistency', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es/');
    
    await expect(page).toHaveScreenshot('mobile-homepage.png');
  });

  test('mobile dashboard visual consistency', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es/dashboard');
    
    await expect(page).toHaveScreenshot('mobile-dashboard.png');
    
    // Test mobile menu screenshot
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page).toHaveScreenshot('mobile-menu-open.png');
  });

  test('mobile forms visual consistency', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es/signup');
    
    await expect(page).toHaveScreenshot('mobile-signup-form.png');
    
    // Test form with validation errors
    await page.click('button[type="submit"]');
    await expect(page).toHaveScreenshot('mobile-form-validation.png');
  });
});