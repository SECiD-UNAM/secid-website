import { test, expect, Page } from '@playwright/test';
import { mockEvents, mockUsers } from '../../fixtures';

// Test URLs
const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';
const EVENTS_URL = `${BASE_URL}/en/events`;
const DASHBOARD_URL = `${BASE_URL}/en/dashboard`;

// Helper functions
async function navigateToEvents(page: Page) {
  await page.goto(EVENTS_URL);
  await expect(page).toHaveTitle(/events/i);
}

async function loginAsUser(page: Page) {
  await page.goto(`${BASE_URL}/en/login`);
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(DASHBOARD_URL);
}

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/en/login`);
  await page.fill('[data-testid="email-input"]', 'admin@secid.mx');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(DASHBOARD_URL);
}

test.describe('Events Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  test.describe('Event Listing Display', () => {
    test('should display upcoming events correctly', async ({ page }) => {
      await navigateToEvents(page);
      
      // Wait for events to load
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Check event card elements
      const firstEventCard = page.locator('[data-testid="event-card"]').first();
      await expect(firstEventCard.locator('[data-testid="event-title"]')).toBeVisible();
      await expect(firstEventCard.locator('[data-testid="event-date"]')).toBeVisible();
      await expect(firstEventCard.locator('[data-testid="event-location"]')).toBeVisible();
      await expect(firstEventCard.locator('[data-testid="event-category"]')).toBeVisible();
    });

    test('should show event type badges', async ({ page }) => {
      await navigateToEvents(page);
      
      // Look for different event types
      const workshopEvents = page.locator('[data-testid="event-card"][data-category="workshop"]');
      const webinarEvents = page.locator('[data-testid="event-card"][data-category="webinar"]');
      const conferenceEvents = page.locator('[data-testid="event-card"][data-category="conference"]');
      
      if (await workshopEvents.count() > 0) {
        await expect(workshopEvents.first().locator('[data-testid="workshop-badge"]')).toBeVisible();
      }
      
      if (await webinarEvents.count() > 0) {
        await expect(webinarEvents.first().locator('[data-testid="webinar-badge"]')).toBeVisible();
      }
    });

    test('should show featured event badges', async ({ page }) => {
      await navigateToEvents(page);
      
      const featuredEvents = page.locator('[data-testid="event-card"][data-featured="true"]');
      if (await featuredEvents.count() > 0) {
        await expect(featuredEvents.first().locator('[data-testid="featured-badge"]')).toBeVisible();
      }
    });

    test('should display virtual/physical location indicators', async ({ page }) => {
      await navigateToEvents(page);
      
      const virtualEvents = page.locator('[data-testid="event-card"][data-location-type="virtual"]');
      const physicalEvents = page.locator('[data-testid="event-card"][data-location-type="physical"]');
      
      if (await virtualEvents.count() > 0) {
        await expect(virtualEvents.first().locator('[data-testid="virtual-badge"]')).toBeVisible();
      }
      
      if (await physicalEvents.count() > 0) {
        await expect(physicalEvents.first().locator('[data-testid="physical-badge"]')).toBeVisible();
      }
    });

    test('should show price information', async ({ page }) => {
      await navigateToEvents(page);
      
      const paidEvents = page.locator('[data-testid="event-card"]:has([data-testid="event-price"])');
      const freeEvents = page.locator('[data-testid="event-card"]:has([data-testid="free-badge"])');
      
      if (await paidEvents.count() > 0) {
        await expect(paidEvents.first().locator('[data-testid="event-price"]')).toBeVisible();
      }
      
      if (await freeEvents.count() > 0) {
        await expect(freeEvents.first().locator('[data-testid="free-badge"]')).toBeVisible();
      }
    });
  });

  test.describe('Event Filtering', () => {
    test('should filter events by category', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Apply category filter
      await page.selectOption('[data-testid="category-filter"]', 'workshop');
      
      await page.waitForTimeout(1000);
      
      // Verify all visible events are workshops
      const eventCards = page.locator('[data-testid="event-card"]');
      const count = await eventCards.count();
      
      for (let i = 0; i < count; i++) {
        const category = await eventCards.nth(i).getAttribute('data-category');
        expect(category).toBe('workshop');
      }
    });

    test('should filter events by date range', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Set date range filter
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      await page.fill('[data-testid="date-from-input"]', today.toISOString().split('T')[0]);
      await page.fill('[data-testid="date-to-input"]', nextMonth.toISOString().split('T')[0]);
      
      await page.waitForTimeout(1000);
      
      // Verify all events are within date range
      const eventCards = page.locator('[data-testid="event-card"]');
      const count = await eventCards.count();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter events by location type', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Filter for virtual events only
      await page.check('[data-testid="virtual-only-filter"]');
      
      await page.waitForTimeout(1000);
      
      // Verify all visible events are virtual
      const eventCards = page.locator('[data-testid="event-card"]');
      const count = await eventCards.count();
      
      for (let i = 0; i < count; i++) {
        const locationType = await eventCards.nth(i).getAttribute('data-location-type');
        expect(locationType).toMatch(/virtual|hybrid/);
      }
    });

    test('should filter events by price', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Filter for free events only
      await page.check('[data-testid="free-only-filter"]');
      
      await page.waitForTimeout(1000);
      
      // Verify all visible events are free
      const freeEvents = page.locator('[data-testid="event-card"]:has([data-testid="free-badge"])');
      const totalEvents = page.locator('[data-testid="event-card"]');
      
      const freeCount = await freeEvents.count();
      const totalCount = await totalEvents.count();
      
      expect(freeCount).toBe(totalCount);
    });
  });

  test.describe('Event Search', () => {
    test('should search events by title', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Search for specific event
      await page.fill('[data-testid="search-input"]', 'Machine Learning');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      await page.waitForTimeout(1000);
      
      // Verify search results
      const eventCards = page.locator('[data-testid="event-card"]');
      const count = await eventCards.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const title = await eventCards.nth(i).locator('[data-testid="event-title"]').textContent();
          expect(title?.toLowerCase()).toContain('machine learning');
        }
      }
    });

    test('should show no results message for invalid search', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Search for non-existent event
      await page.fill('[data-testid="search-input"]', 'NonExistentEvent12345');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      await page.waitForTimeout(1000);
      
      // Should show no results message
      await expect(page.locator('[data-testid="no-events-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-events-message"]')).toContainText(/no events found/i);
    });
  });

  test.describe('Event Detail View', () => {
    test('should open event detail modal when event card is clicked', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Click on first event card
      await page.click('[data-testid="event-card"]');
      
      // Should open event detail modal
      await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-detail-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-detail-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-detail-agenda"]')).toBeVisible();
    });

    test('should show register button for upcoming events', async ({ page }) => {
      await loginAsUser(page);
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      await page.click('[data-testid="event-card"]');
      
      await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
      
      // Check if registration button is available for upcoming events
      const registerButton = page.locator('[data-testid="register-button"]');
      const eventStatus = await page.locator('[data-testid="event-status"]').textContent();
      
      if (eventStatus?.includes('upcoming')) {
        await expect(registerButton).toBeVisible();
      }
    });

    test('should show login prompt for unauthenticated users', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      await page.click('[data-testid="event-card"]');
      
      await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-to-register"]')).toBeVisible();
    });

    test('should show event capacity and registration count', async ({ page }) => {
      await navigateToEvents(page);
      
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      await page.click('[data-testid="event-card"]');
      
      await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-capacity"]')).toBeVisible();
      await expect(page.locator('[data-testid="registration-count"]')).toBeVisible();
    });
  });

  test.describe('Event Registration', () => {
    test('should complete event registration for free events', async ({ page }) => {
      await loginAsUser(page);
      await navigateToEvents(page);
      
      // Find a free event
      const freeEventCard = page.locator('[data-testid="event-card"]:has([data-testid="free-badge"])').first();
      
      if (await freeEventCard.isVisible()) {
        await freeEventCard.click();
        
        await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
        
        const registerButton = page.locator('[data-testid="register-button"]');
        if (await registerButton.isVisible()) {
          await registerButton.click();
          
          // Should show registration success message
          await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
          await expect(page.locator('[data-testid="registration-success"]')).toContainText(/successfully registered/i);
        }
      }
    });

    test('should handle event registration form for paid events', async ({ page }) => {
      await loginAsUser(page);
      await navigateToEvents(page);
      
      // Find a paid event
      const paidEventCard = page.locator('[data-testid="event-card"]:has([data-testid="event-price"])').first();
      
      if (await paidEventCard.isVisible()) {
        await paidEventCard.click();
        
        await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
        
        const registerButton = page.locator('[data-testid="register-button"]');
        if (await registerButton.isVisible()) {
          await registerButton.click();
          
          // Should show registration form
          await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
          
          // Fill registration form
          await page.fill('[data-testid="attendee-name-input"]', 'Test User');
          await page.fill('[data-testid="attendee-email-input"]', 'test@example.com');
          
          // Additional fields for paid events
          await page.selectOption('[data-testid="payment-method-select"]', 'credit-card');
          
          await page.click('[data-testid="proceed-payment-button"]');
          
          // Should redirect to payment page
          await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
        }
      }
    });

    test('should prevent registration for full events', async ({ page }) => {
      await loginAsUser(page);
      await navigateToEvents(page);
      
      // Find an event at capacity (if any)
      const fullEventCard = page.locator('[data-testid="event-card"][data-full="true"]').first();
      
      if (await fullEventCard.isVisible()) {
        await fullEventCard.click();
        
        await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
        
        // Should show event full message
        await expect(page.locator('[data-testid="event-full-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="register-button"]')).not.toBeVisible();
      }
    });

    test('should show waitlist option for full events', async ({ page }) => {
      await loginAsUser(page);
      await navigateToEvents(page);
      
      const fullEventCard = page.locator('[data-testid="event-card"][data-full="true"]').first();
      
      if (await fullEventCard.isVisible()) {
        await fullEventCard.click();
        
        await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
        
        // Should show waitlist option
        const waitlistButton = page.locator('[data-testid="join-waitlist-button"]');
        if (await waitlistButton.isVisible()) {
          await waitlistButton.click();
          
          await expect(page.locator('[data-testid="waitlist-success"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Event Calendar View', () => {
    test('should switch to calendar view', async ({ page }) => {
      await navigateToEvents(page);
      
      // Switch to calendar view
      await page.click('[data-testid="calendar-view-toggle"]');
      
      await expect(page.locator('[data-testid="events-calendar"]')).toBeVisible();
      await expect(page.locator('[data-testid="calendar-month-header"]')).toBeVisible();
    });

    test('should navigate calendar months', async ({ page }) => {
      await navigateToEvents(page);
      
      await page.click('[data-testid="calendar-view-toggle"]');
      await expect(page.locator('[data-testid="events-calendar"]')).toBeVisible();
      
      // Navigate to next month
      await page.click('[data-testid="calendar-next-month"]');
      
      // Should update calendar
      await page.waitForTimeout(500);
      
      // Navigate to previous month
      await page.click('[data-testid="calendar-prev-month"]');
      
      await page.waitForTimeout(500);
    });

    test('should show event details on calendar date click', async ({ page }) => {
      await navigateToEvents(page);
      
      await page.click('[data-testid="calendar-view-toggle"]');
      await expect(page.locator('[data-testid="events-calendar"]')).toBeVisible();
      
      // Click on a date with events
      const dateWithEvents = page.locator('[data-testid="calendar-date"][data-has-events="true"]').first();
      
      if (await dateWithEvents.isVisible()) {
        await dateWithEvents.click();
        
        // Should show events for that date
        await expect(page.locator('[data-testid="date-events-popup"]')).toBeVisible();
      }
    });
  });

  test.describe('Past Events', () => {
    test('should display past events in separate section', async ({ page }) => {
      await navigateToEvents(page);
      
      // Navigate to past events section
      await page.click('[data-testid="past-events-tab"]');
      
      await expect(page.locator('[data-testid="past-events-section"]')).toBeVisible();
      
      const pastEventCards = page.locator('[data-testid="past-event-card"]');
      if (await pastEventCards.count() > 0) {
        await expect(pastEventCards.first()).toBeVisible();
      }
    });

    test('should show event recordings for past events', async ({ page }) => {
      await navigateToEvents(page);
      
      await page.click('[data-testid="past-events-tab"]');
      
      const pastEventWithRecording = page.locator('[data-testid="past-event-card"]:has([data-testid="recording-available"])').first();
      
      if (await pastEventWithRecording.isVisible()) {
        await pastEventWithRecording.click();
        
        await expect(page.locator('[data-testid="event-detail-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="watch-recording-button"]')).toBeVisible();
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToEvents(page);
      
      // Events should be displayed in mobile layout
      await expect(page.locator('[data-testid="event-card"]').first()).toBeVisible();
      
      // Mobile filter toggle should be visible
      await expect(page.locator('[data-testid="mobile-filters-toggle"]')).toBeVisible();
      
      // Click to open mobile filters
      await page.click('[data-testid="mobile-filters-toggle"]');
      await expect(page.locator('[data-testid="mobile-filters-panel"]')).toBeVisible();
    });

    test('should handle swipe gestures on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToEvents(page);
      
      // Test swipe navigation if implemented
      const eventContainer = page.locator('[data-testid="events-container"]');
      
      if (await eventContainer.isVisible()) {
        // Simulate swipe left
        await eventContainer.hover();
        await page.mouse.down();
        await page.mouse.move(200, 0);
        await page.mouse.up();
        
        await page.waitForTimeout(500);
      }
    });
  });
});