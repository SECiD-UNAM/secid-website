import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';
import { mockEvents } from '../fixtures/events';

// Test data for event registration
const eventTestData = {
  eventDetails: {
    title: 'Machine Learning Workshop 2024',
    description: 'Comprehensive workshop on modern ML techniques and applications',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(), // 2 weeks from now
    time: '09:00',
    duration: '8 hours',
    location: 'Virtual',
    capacity: 100,
    price: 0, // Free event
    tags: ['Machine Learning', 'Workshop', 'Beginner Friendly'],
  },
  registrationInfo: {
    dietaryRestrictions: 'Vegetarian',
    accessibilityNeeds: 'None',
    emergencyContact: 'Jane Doe - 555-0123',
    additionalInfo: 'Very excited to attend this workshop!',
    tshirtSize: 'M',
    networkingInterest: true,
  },
  paidEventDetails: {
    title: 'Data Science Conference 2024',
    price: 150,
    earlyBirdPrice: 120,
    studentPrice: 75,
  },
};

class EventRegistrationFlow {
  constructor(private page: Page) {}

  async navigateToEvents() {
    await this.page.goto('/');
    await this.page.click('a[href="/es/events"]');
    await expect(this.page).toHaveURL('/es/events');
  }

  async browseEvents() {
    // Should show events list
    await expect(this.page.locator('h1:has-text("Próximos Eventos")')).toBeVisible();
    await expect(this.page.locator('[data-testid="event-card"]')).toHaveCountGreaterThan(0);
    
    // Test event filters
    await this.page.selectOption('select[data-testid="event-type-filter"]', 'workshop');
    await this.page.selectOption('select[data-testid="event-location-filter"]', 'virtual');
    
    // Apply filters
    await this.page.click('button[data-testid="apply-event-filters"]');
    
    // Should show filtered results
    await this.page.waitForResponse(response => 
      response.url().includes('/api/events') && response.status() === 200
    );
  }

  async viewEventDetails(eventIndex = 0) {
    const eventCards = this.page.locator('[data-testid="event-card"]');
    await eventCards.nth(eventIndex).click();
    
    // Should navigate to event details
    await expect(this.page).toHaveURL(/\/es\/events\/[^\/]+$/);
    
    // Verify event details are loaded
    await expect(this.page.locator('[data-testid="event-title"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="event-description"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="event-date"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="event-location"]')).toBeVisible();
  }

  async registerForFreeEvent() {
    // Click register button
    await this.page.click('button[data-testid="register-event"]');
    
    // Should open registration modal or navigate to registration page
    await expect(this.page.locator('h2:has-text("Registro para el Evento")')).toBeVisible();
    
    // Fill registration form
    await this.page.fill('input[name="firstName"]', 'Ana');
    await this.page.fill('input[name="lastName"]', 'García');
    await this.page.fill('input[name="email"]', 'ana@example.com');
    await this.page.fill('input[name="phone"]', '+52 55 1234 5678');
    
    // Additional information
    await this.page.fill('textarea[name="dietaryRestrictions"]', eventTestData.registrationInfo.dietaryRestrictions);
    await this.page.fill('textarea[name="accessibilityNeeds"]', eventTestData.registrationInfo.accessibilityNeeds);
    await this.page.fill('input[name="emergencyContact"]', eventTestData.registrationInfo.emergencyContact);
    await this.page.fill('textarea[name="additionalInfo"]', eventTestData.registrationInfo.additionalInfo);
    
    // Event-specific fields
    await this.page.selectOption('select[name="tshirtSize"]', eventTestData.registrationInfo.tshirtSize);
    await this.page.check('input[name="networkingInterest"]');
    
    // Submit registration
    await this.page.click('button[data-testid="submit-registration"]');
    
    // Should show success message
    await expect(this.page.locator('text=¡Registro exitoso!')).toBeVisible();
    await expect(this.page.locator('text=Te hemos enviado un email de confirmación')).toBeVisible();
  }

  async registerForPaidEvent() {
    // Navigate to paid event
    await this.page.goto('/es/events/paid-event-id');
    
    await this.page.click('button[data-testid="register-event"]');
    
    // Should show pricing options
    await expect(this.page.locator('[data-testid="pricing-options"]')).toBeVisible();
    
    // Select student pricing
    await this.page.click('button[data-testid="select-student-price"]');
    
    // Fill registration form
    await this.page.fill('input[name="firstName"]', 'Carlos');
    await this.page.fill('input[name="lastName"]', 'López');
    await this.page.fill('input[name="email"]', 'carlos@student.unam.mx');
    
    // Student verification
    await this.page.fill('input[name="studentId"]', '123456789');
    await this.page.fill('input[name="university"]', 'UNAM');
    
    const fileInput = this.page.locator('input[type="file"][name="studentIdDocument"]');
    await fileInput.setInputFiles({
      name: 'student-id.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock student ID document'),
    });
    
    // Proceed to payment
    await this.page.click('button[data-testid="proceed-to-payment"]');
    
    // Should navigate to payment page
    await expect(this.page).toHaveURL(/\/es\/events\/[^\/]+\/payment$/);
  }

  async manageEventRegistration() {
    // View registered events in dashboard
    await this.page.goto('/es/dashboard/events');
    
    // Should show registered events
    await expect(this.page.locator('[data-testid="registered-event"]')).toBeVisible();
    
    const registeredEvent = this.page.locator('[data-testid="registered-event"]').first();
    
    // Test viewing registration details
    await registeredEvent.locator('[data-testid="view-registration"]').click();
    
    // Should show registration modal with details
    await expect(this.page.locator('[data-testid="registration-details-modal"]')).toBeVisible();
    await expect(this.page.locator('text=Ana García')).toBeVisible();
    
    // Close modal
    await this.page.click('[data-testid="close-modal"]');
    
    // Test downloading ticket/confirmation
    await registeredEvent.locator('[data-testid="download-ticket"]').click();
    
    // Should trigger download (mock)
    await expect(this.page.locator('text=Descargando boleto')).toBeVisible();
  }

  async cancelEventRegistration() {
    await this.page.goto('/es/dashboard/events');
    
    const registeredEvent = this.page.locator('[data-testid="registered-event"]').first();
    
    // Click cancel registration
    await registeredEvent.locator('[data-testid="cancel-registration"]').click();
    
    // Should show confirmation dialog
    await expect(this.page.locator('[data-testid="cancel-confirmation-dialog"]')).toBeVisible();
    await expect(this.page.locator('text=¿Estás seguro de que quieres cancelar tu registro?')).toBeVisible();
    
    // Confirm cancellation
    await this.page.click('button[data-testid="confirm-cancellation"]');
    
    // Should show cancellation success
    await expect(this.page.locator('text=Registro cancelado exitosamente')).toBeVisible();
    
    // Event should be removed from registered events or marked as cancelled
    await expect(registeredEvent).toHaveClass(/cancelled/);
  }

  async addEventToCalendar() {
    await this.page.goto('/es/events/test-event-id');
    
    // Click add to calendar
    await this.page.click('button[data-testid="add-to-calendar"]');
    
    // Should show calendar options
    await expect(this.page.locator('[data-testid="calendar-options"]')).toBeVisible();
    
    // Test Google Calendar
    await this.page.click('[data-testid="add-to-google-calendar"]');
    
    // Should open new tab with Google Calendar (mock)
    await expect(this.page.locator('text=Agregando a Google Calendar')).toBeVisible();
    
    // Test ICS download
    await this.page.click('[data-testid="download-ics"]');
    
    // Should trigger ICS file download
    await expect(this.page.locator('text=Descargando archivo de calendario')).toBeVisible();
  }

  async shareEvent() {
    await this.page.goto('/es/events/test-event-id');
    
    // Click share button
    await this.page.click('button[data-testid="share-event"]');
    
    // Should show share options
    await expect(this.page.locator('[data-testid="share-modal"]')).toBeVisible();
    
    // Test copy link
    await this.page.click('[data-testid="copy-event-link"]');
    await expect(this.page.locator('text=Enlace copiado al portapapeles')).toBeVisible();
    
    // Test social media sharing
    await this.page.click('[data-testid="share-twitter"]');
    // Would open Twitter sharing dialog in real implementation
    
    await this.page.click('[data-testid="share-linkedin"]');
    // Would open LinkedIn sharing dialog in real implementation
  }

  async checkInToEvent() {
    // Simulate being at the event (would use QR code in real scenario)
    await this.page.goto('/es/events/check-in?eventId=test-event-id&code=abc123');
    
    // Should show check-in interface
    await expect(this.page.locator('h2:has-text("Check-in para el Evento")')).toBeVisible();
    
    // Verify registration
    await expect(this.page.locator('text=Ana García')).toBeVisible();
    await expect(this.page.locator('text=Machine Learning Workshop 2024')).toBeVisible();
    
    // Complete check-in
    await this.page.click('button[data-testid="complete-checkin"]');
    
    // Should show check-in success
    await expect(this.page.locator('text=¡Check-in exitoso!')).toBeVisible();
    await expect(this.page.locator('text=Disfruta el evento')).toBeVisible();
  }

  async viewEventAttendees() {
    await this.page.goto('/es/events/test-event-id');
    
    // Click view attendees (if user has permission)
    await this.page.click('[data-testid="view-attendees"]');
    
    // Should show attendees list
    await expect(this.page.locator('[data-testid="attendees-modal"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="attendee-item"]')).toHaveCountGreaterThan(0);
    
    // Test networking features
    const firstAttendee = this.page.locator('[data-testid="attendee-item"]').first();
    
    // Connect with attendee
    await firstAttendee.locator('[data-testid="connect-attendee"]').click();
    await expect(this.page.locator('text=Solicitud de conexión enviada')).toBeVisible();
    
    // Message attendee (if connected)
    await firstAttendee.locator('[data-testid="message-attendee"]').click();
    await expect(this.page.locator('[data-testid="message-modal"]')).toBeVisible();
  }

  async provideEventFeedback() {
    // After event ends, should be able to provide feedback
    await this.page.goto('/es/dashboard/events');
    
    const pastEvent = this.page.locator('[data-testid="past-event"]').first();
    
    // Click provide feedback
    await pastEvent.locator('[data-testid="provide-feedback"]').click();
    
    // Should show feedback form
    await expect(this.page.locator('[data-testid="feedback-modal"]')).toBeVisible();
    
    // Rate the event
    await this.page.click('[data-testid="rating-5"]'); // 5 stars
    
    // Provide written feedback
    await this.page.fill('textarea[name="feedback"]', 'Excellent workshop! Learned a lot about ML techniques.');
    
    // Rate specific aspects
    await this.page.click('[data-testid="content-rating-5"]');
    await this.page.click('[data-testid="speaker-rating-5"]');
    await this.page.click('[data-testid="organization-rating-4"]');
    
    // Would recommend to others
    await this.page.check('input[name="wouldRecommend"]');
    
    // Submit feedback
    await this.page.click('button[data-testid="submit-feedback"]');
    
    // Should show thank you message
    await expect(this.page.locator('text=¡Gracias por tu feedback!')).toBeVisible();
  }
}

test.describe('Event Registration and Management Flow', () => {
  let eventFlow: EventRegistrationFlow;

  test.beforeEach(async ({ page }) => {
    eventFlow = new EventRegistrationFlow(page);
    
    // Mock authentication - logged in user
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      }));
    });
    
    // Mock events API
    await page.route('**/api/events**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/register')) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            registrationId: 'reg-123',
            status: 'confirmed',
            ticketNumber: 'TICKET-001',
          }),
        });
      } else if (url.includes('/cancel')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockEvents.eventsList),
        });
      }
    });
    
    // Mock user registrations API
    await page.route('**/api/user/registrations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          upcoming: [
            {
              eventId: 'event-1',
              title: 'Machine Learning Workshop 2024',
              date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
              status: 'confirmed',
              ticketNumber: 'TICKET-001',
            },
          ],
          past: [
            {
              eventId: 'event-2',
              title: 'Data Visualization Seminar',
              date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
              status: 'attended',
              rating: null,
            },
          ],
        }),
      });
    });
    
    // Mock calendar integration
    await page.route('**/api/calendar/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    
    // Mock check-in API
    await page.route('**/api/events/check-in**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          attendee: {
            name: 'Ana García',
            ticketNumber: 'TICKET-001',
            eventTitle: 'Machine Learning Workshop 2024',
          },
        }),
      });
    });
  });

  test('complete event registration flow', async ({ page }) => {
    // Step 1: Browse events
    await eventFlow.navigateToEvents();
    await eventFlow.browseEvents();
    
    // Step 2: View event details
    await eventFlow.viewEventDetails(0);
    
    // Verify event information is displayed
    await expect(page.locator('[data-testid="event-title"]')).toContainText('Machine Learning Workshop');
    await expect(page.locator('[data-testid="event-capacity"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-schedule"]')).toBeVisible();
    
    // Step 3: Register for free event
    await eventFlow.registerForFreeEvent();
    
    // Step 4: Manage registration
    await eventFlow.manageEventRegistration();
    
    // Step 5: Add to calendar
    await eventFlow.addEventToCalendar();
    
    // Step 6: Share event
    await eventFlow.shareEvent();
  });

  test('event browsing and filtering', async ({ page }) => {
    await eventFlow.navigateToEvents();
    
    // Test different event filters
    const filters = [
      { type: 'category', value: 'workshop' },
      { type: 'location', value: 'virtual' },
      { type: 'price', value: 'free' },
      { type: 'date', value: 'this-month' },
    ];
    
    for (const filter of filters) {
      await page.selectOption(`select[data-testid="event-${filter.type}-filter"]`, filter.value);
      await page.click('button[data-testid="apply-event-filters"]');
      
      // Should update results
      await page.waitForResponse(response => 
        response.url().includes('/api/events') && response.status() === 200
      );
      
      // Verify filter is applied
      await expect(page.locator(`[data-testid="active-filter-${filter.type}"]`)).toContainText(filter.value);
    }
    
    // Test clearing filters
    await page.click('button[data-testid="clear-all-filters"]');
    await expect(page.locator('[data-testid^="active-filter-"]')).toHaveCount(0);
  });

  test('event registration validation', async ({ page }) => {
    await eventFlow.navigateToEvents();
    await eventFlow.viewEventDetails(0);
    
    // Try to register with invalid data
    await page.click('button[data-testid="register-event"]');
    
    // Submit empty form
    await page.click('button[data-testid="submit-registration"]');
    
    // Should show validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    
    // Test invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[data-testid="submit-registration"]');
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
    
    // Test phone number validation
    await page.fill('input[name="phone"]', '123');
    await page.click('button[data-testid="submit-registration"]');
    await expect(page.locator('text=Please enter a valid phone number')).toBeVisible();
  });

  test('paid event registration flow', async ({ page }) => {
    await eventFlow.registerForPaidEvent();
    
    // Should be on payment page
    await expect(page.locator('h2:has-text("Pago del Evento")')).toBeVisible();
    
    // Should show pricing summary
    await expect(page.locator('[data-testid="price-summary"]')).toBeVisible();
    await expect(page.locator('text=$75.00')).toBeVisible(); // Student price
    
    // Should show student verification status
    await expect(page.locator('text=Documentación estudiantil en revisión')).toBeVisible();
    
    // Payment would be handled by Stripe component
    await expect(page.locator('[data-testid="stripe-payment-element"]')).toBeVisible();
  });

  test('event capacity and waiting list', async ({ page }) => {
    // Mock full event
    await page.route('**/api/events/full-event-id', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'full-event-id',
          title: 'Popular Workshop',
          capacity: 50,
          registeredCount: 50,
          status: 'full',
          waitingListEnabled: true,
        }),
      });
    });
    
    await page.goto('/es/events/full-event-id');
    
    // Should show full event status
    await expect(page.locator('text=Evento lleno')).toBeVisible();
    await expect(page.locator('[data-testid="capacity-indicator"]')).toContainText('50/50');
    
    // Should offer waiting list option
    await expect(page.locator('button[data-testid="join-waiting-list"]')).toBeVisible();
    
    // Join waiting list
    await page.click('button[data-testid="join-waiting-list"]');
    
    // Fill waiting list form
    await page.fill('input[name="email"]', 'waiting@example.com');
    await page.fill('input[name="name"]', 'Waiting User');
    await page.click('button[data-testid="submit-waiting-list"]');
    
    // Should show waiting list confirmation
    await expect(page.locator('text=Te hemos agregado a la lista de espera')).toBeVisible();
  });

  test('event check-in process', async ({ page }) => {
    await eventFlow.checkInToEvent();
    
    // Test multiple check-in attempt
    await page.goto('/es/events/check-in?eventId=test-event-id&code=abc123');
    
    // Mock already checked in
    await page.route('**/api/events/check-in**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Already checked in',
          checkedInAt: new Date().toISOString(),
        }),
      });
    });
    
    await page.click('button[data-testid="complete-checkin"]');
    
    // Should show already checked in message
    await expect(page.locator('text=Ya has hecho check-in para este evento')).toBeVisible();
  });

  test('event networking features', async ({ page }) => {
    await eventFlow.viewEventAttendees();
    
    // Test attendee search
    await page.fill('input[data-testid="search-attendees"]', 'Data Scientist');
    
    // Should filter attendees
    await expect(page.locator('[data-testid="attendee-item"]')).toHaveCountGreaterThan(0);
    
    // Test filtering by interests
    await page.click('[data-testid="filter-by-interests"]');
    await page.check('input[value="Machine Learning"]');
    await page.click('button[data-testid="apply-attendee-filters"]');
    
    // Should show filtered results
    await expect(page.locator('[data-testid="filtered-attendees"]')).toBeVisible();
  });

  test('event feedback and rating', async ({ page }) => {
    await eventFlow.provideEventFeedback();
    
    // Verify feedback was submitted
    await page.goto('/es/dashboard/events');
    
    const pastEvent = page.locator('[data-testid="past-event"]').first();
    
    // Should show that feedback was provided
    await expect(pastEvent.locator('[data-testid="feedback-provided"]')).toBeVisible();
    await expect(pastEvent.locator('[data-testid="event-rating"]')).toContainText('5');
  });

  test('event cancellation scenarios', async ({ page }) => {
    await eventFlow.cancelEventRegistration();
    
    // Test cancellation policy
    await page.goto('/es/events/test-event-id');
    await page.click('button[data-testid="register-event"]');
    
    // Should show cancellation policy
    await expect(page.locator('[data-testid="cancellation-policy"]')).toBeVisible();
    await expect(page.locator('text=Cancelación gratuita hasta 24 horas antes')).toBeVisible();
    
    // Test organizer event cancellation
    await page.route('**/api/events/test-event-id', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-event-id',
          title: 'Cancelled Event',
          status: 'cancelled',
          cancellationReason: 'Unforeseen circumstances',
        }),
      });
    });
    
    await page.goto('/es/events/test-event-id');
    
    // Should show cancellation notice
    await expect(page.locator('[data-testid="event-cancelled-notice"]')).toBeVisible();
    await expect(page.locator('text=Este evento ha sido cancelado')).toBeVisible();
  });

  test('event reminders and notifications', async ({ page }) => {
    await page.goto('/es/dashboard/events');
    
    // Should show upcoming event reminders
    await expect(page.locator('[data-testid="event-reminder"]')).toBeVisible();
    await expect(page.locator('text=Tu evento es mañana')).toBeVisible();
    
    // Test notification preferences
    await page.click('[data-testid="notification-settings"]');
    
    // Should show notification options
    await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
    
    // Configure notifications
    await page.check('input[name="emailReminder24h"]');
    await page.check('input[name="emailReminder1h"]');
    await page.check('input[name="pushNotifications"]');
    
    await page.click('button[data-testid="save-notification-preferences"]');
    
    // Should show success message
    await expect(page.locator('text=Preferencias guardadas')).toBeVisible();
  });
});

// Mobile event registration tests
test.describe('Mobile Event Registration', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile event browsing and registration', async ({ page }) => {
    const eventFlow = new EventRegistrationFlow(page);
    
    await eventFlow.navigateToEvents();
    
    // Mobile event cards should be properly sized
    const eventCard = page.locator('[data-testid="event-card"]').first();
    const cardBox = await eventCard.boundingBox();
    
    if (cardBox) {
      const viewportWidth = page.viewportSize()?.width || 0;
      expect(cardBox.width).toBeGreaterThan(viewportWidth * 0.9);
    }
    
    // Mobile event details view
    await eventCard.tap();
    
    // Should show mobile-optimized event details
    await expect(page.locator('[data-testid="mobile-event-details"]')).toBeVisible();
    
    // Mobile registration form
    await page.click('button[data-testid="register-event"]');
    
    // Form should be mobile-optimized
    const form = page.locator('[data-testid="registration-form"]');
    await expect(form).toBeVisible();
    
    // Input fields should prevent zoom on iOS
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveCSS('font-size', '16px');
  });

  test('mobile event check-in', async ({ page }) => {
    // Simulate QR code scan on mobile
    await page.goto('/es/events/check-in?eventId=test-event-id&code=abc123');
    
    // Should show mobile-friendly check-in interface
    await expect(page.locator('[data-testid="mobile-checkin"]')).toBeVisible();
    
    // Should have large, touch-friendly buttons
    const checkinButton = page.locator('button[data-testid="complete-checkin"]');
    const buttonBox = await checkinButton.boundingBox();
    
    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(44); // iOS touch target
    }
  });
});

// Visual regression tests
test.describe('Event Visual Tests', () => {
  test('event listing page consistency', async ({ page }) => {
    const eventFlow = new EventRegistrationFlow(page);
    await eventFlow.navigateToEvents();
    
    // Screenshot of events listing
    await expect(page).toHaveScreenshot('events-listing.png');
    
    // Screenshot with filters applied
    await page.selectOption('select[data-testid="event-type-filter"]', 'workshop');
    await page.click('button[data-testid="apply-event-filters"]');
    await expect(page).toHaveScreenshot('events-filtered.png');
  });

  test('event registration modal consistency', async ({ page }) => {
    const eventFlow = new EventRegistrationFlow(page);
    await eventFlow.navigateToEvents();
    await eventFlow.viewEventDetails(0);
    
    await page.click('button[data-testid="register-event"]');
    
    // Screenshot of registration modal
    await expect(page).toHaveScreenshot('event-registration-modal.png');
  });

  test('mobile events visual consistency', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const eventFlow = new EventRegistrationFlow(page);
    await eventFlow.navigateToEvents();
    
    // Mobile events listing
    await expect(page).toHaveScreenshot('mobile-events-listing.png');
    
    // Mobile event details
    await page.locator('[data-testid="event-card"]').first().tap();
    await expect(page).toHaveScreenshot('mobile-event-details.png');
  });
});

// Performance tests
test.describe('Event Performance Tests', () => {
  test('events page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    const eventFlow = new EventRegistrationFlow(page);
    await eventFlow.navigateToEvents();
    
    const loadTime = Date.now() - startTime;
    
    // Events page should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Events should be visible
    await expect(page.locator('[data-testid="event-card"]')).toBeVisible();
  });

  test('event registration performance', async ({ page }) => {
    const eventFlow = new EventRegistrationFlow(page);
    await eventFlow.navigateToEvents();
    await eventFlow.viewEventDetails(0);
    
    const startTime = Date.now();
    
    await page.click('button[data-testid="register-event"]');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[data-testid="submit-registration"]');
    
    // Wait for success message
    await expect(page.locator('text=¡Registro exitoso!')).toBeVisible();
    
    const registrationTime = Date.now() - startTime;
    
    // Registration should complete within 3 seconds
    expect(registrationTime).toBeLessThan(3000);
  });
});

// Accessibility tests
test.describe('Event Registration Accessibility', () => {
  test('events page accessibility', async ({ page }) => {
    const eventFlow = new EventRegistrationFlow(page);
    await eventFlow.navigateToEvents();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[data-testid="event-search"]')).toBeFocused();
    
    // Test ARIA labels
    await expect(page.locator('button[data-testid="apply-event-filters"]')).toHaveAttribute('aria-label', 'Apply event filters');
    
    // Test heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h2')).toHaveCountGreaterThan(0);
    
    // Test screen reader support for event cards
    const eventCard = page.locator('[data-testid="event-card"]').first();
    await expect(eventCard).toHaveAttribute('role', 'article');
  });

  test('registration form accessibility', async ({ page }) => {
    const eventFlow = new EventRegistrationFlow(page);
    await eventFlow.navigateToEvents();
    await eventFlow.viewEventDetails(0);
    
    await page.click('button[data-testid="register-event"]');
    
    // Test form labels
    await expect(page.locator('label[for="firstName"]')).toBeVisible();
    await expect(page.locator('label[for="lastName"]')).toBeVisible();
    await expect(page.locator('label[for="email"]')).toBeVisible();
    
    // Test required field indicators
    await expect(page.locator('input[name="firstName"]')).toHaveAttribute('required');
    await expect(page.locator('input[name="email"]')).toHaveAttribute('required');
    
    // Test error message association
    await page.click('button[data-testid="submit-registration"]');
    
    const emailError = page.locator('[data-testid="email-error"]');
    await expect(emailError).toHaveAttribute('role', 'alert');
  });
});