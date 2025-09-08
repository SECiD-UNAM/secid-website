import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';

// Test data for dashboard navigation
const dashboardTestData = {
  quickActions: ['Post Job', 'Create Event', 'Send Message', 'Update Profile'],
  notifications: [
    'New connection request from Ana García',
    'Job application received for Data Scientist position',
    'Upcoming event: ML Workshop next week',
  ],
  menuItems: [
    { label: 'Panel de Control', url: '/es/dashboard', icon: 'home' },
    { label: 'Mi Perfil', url: '/es/dashboard/profile', icon: 'user' },
    { label: 'Trabajos', url: '/es/dashboard/jobs', icon: 'briefcase' },
    { label: 'Aplicaciones', url: '/es/dashboard/applications', icon: 'file-text' },
    { label: 'Conexiones', url: '/es/dashboard/connections', icon: 'users' },
    { label: 'Mensajes', url: '/es/dashboard/messages', icon: 'message-circle' },
    { label: 'Eventos', url: '/es/dashboard/events', icon: 'calendar' },
    { label: 'Evaluaciones', url: '/es/dashboard/assessments', icon: 'award' },
    { label: 'Configuración', url: '/es/dashboard/settings', icon: 'settings' },
  ],
};

class DashboardNavigationFlow {
  constructor(private page: Page) {}

  async navigateToDashboard() {
    await this.page.goto('/es/dashboard');
    await expect(this.page).toHaveURL('/es/dashboard');
  }

  async verifyDashboardLayout() {
    // Check main dashboard elements
    await expect(this.page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="dashboard-sidebar"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="dashboard-main-content"]')).toBeVisible();
    
    // Check welcome message
    await expect(this.page.locator('h1')).toContainText('Panel de Control');
    
    // Check user info display
    await expect(this.page.locator('[data-testid="user-welcome"]')).toContainText('Test User');
  }

  async testSidebarNavigation() {
    // Test each menu item
    for (const menuItem of dashboardTestData.menuItems) {
      await this.page.click(`a[href="${menuItem.url}"]`);
      await expect(this.page).toHaveURL(menuItem.url);
      
      // Check that the correct page loaded
      await this.page.waitForSelector('[data-testid="page-content"]');
      
      // Go back to dashboard
      if (menuItem.url !== '/es/dashboard') {
        await this.page.click('a[href="/es/dashboard"]');
        await expect(this.page).toHaveURL('/es/dashboard');
      }
    }
  }

  async testQuickActions() {
    // Verify quick actions are present
    await expect(this.page.locator('[data-testid="quick-actions"]')).toBeVisible();
    
    // Test each quick action
    const quickActionButtons = this.page.locator('[data-testid^="quick-action-"]');
    const count = await quickActionButtons.count();
    
    for (let i = 0; i < count; i++) {
      const button = quickActionButtons.nth(i);
      await expect(button).toBeVisible();
      
      // Click and verify modal or navigation
      await button.click();
      
      // Check if modal opened or navigation occurred
      const modalVisible = await this.page.locator('[data-testid="modal"], [data-testid="drawer"]').isVisible();
      const urlChanged = this.page.url() !== 'http://localhost:4321/es/dashboard';
      
      expect(modalVisible || urlChanged).toBeTruthy();
      
      // Close modal or go back
      if (modalVisible) {
        await this.page.keyboard.press('Escape');
      } else if (urlChanged) {
        await this.page.goBack();
      }
    }
  }

  async testNotificationsCenter() {
    // Open notifications
    await this.page.click('[data-testid="notifications-button"]');
    
    // Check notifications dropdown/modal
    await expect(this.page.locator('[data-testid="notifications-dropdown"]')).toBeVisible();
    
    // Check notification items
    const notifications = this.page.locator('[data-testid="notification-item"]');
    await expect(notifications).toHaveCount(3);
    
    // Test marking notification as read
    await notifications.first().click();
    await expect(notifications.first()).toHaveClass(/read/);
    
    // Test mark all as read
    await this.page.click('[data-testid="mark-all-read"]');
    
    // Close notifications
    await this.page.click('[data-testid="close-notifications"]');
    await expect(this.page.locator('[data-testid="notifications-dropdown"]')).not.toBeVisible();
  }

  async testUserMenu() {
    // Open user menu
    await this.page.click('[data-testid="user-menu-button"]');
    
    // Check user menu items
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(this.page.locator('text=Mi Perfil')).toBeVisible();
    await expect(this.page.locator('text=Configuración')).toBeVisible();
    await expect(this.page.locator('text=Cerrar Sesión')).toBeVisible();
    
    // Test profile navigation
    await this.page.click('a:has-text("Mi Perfil")');
    await expect(this.page).toHaveURL('/es/dashboard/profile');
    
    // Go back to dashboard
    await this.page.click('a[href="/es/dashboard"]');
  }

  async testDashboardStats() {
    await this.navigateToDashboard();
    
    // Check stats cards
    await expect(this.page.locator('[data-testid="stats-connections"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="stats-applications"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="stats-messages"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="stats-events"]')).toBeVisible();
    
    // Verify stats have numeric values
    const connectionsCount = await this.page.locator('[data-testid="connections-count"]').textContent();
    expect(connectionsCount).toMatch(/\d+/);
  }

  async testRecentActivity() {
    // Check recent activity section
    await expect(this.page.locator('[data-testid="recent-activity"]')).toBeVisible();
    await expect(this.page.locator('h3:has-text("Actividad Reciente")')).toBeVisible();
    
    // Check activity items
    const activityItems = this.page.locator('[data-testid="activity-item"]');
    await expect(activityItems).toHaveCountGreaterThan(0);
    
    // Test view all activity
    await this.page.click('[data-testid="view-all-activity"]');
    await expect(this.page).toHaveURL('/es/dashboard/activity');
  }

  async testUpcomingEvents() {
    await this.navigateToDashboard();
    
    // Check upcoming events section
    await expect(this.page.locator('[data-testid="upcoming-events"]')).toBeVisible();
    
    // Test event interaction
    const eventItems = this.page.locator('[data-testid="event-item"]');
    if (await eventItems.count() > 0) {
      await eventItems.first().click();
      await expect(this.page).toHaveURL(/\/es\/events\/[^\/]+$/);
      await this.page.goBack();
    }
  }

  async testJobMatches() {
    await this.navigateToDashboard();
    
    // Check job matches section
    await expect(this.page.locator('[data-testid="job-matches"]')).toBeVisible();
    
    // Test job recommendation interaction
    const jobItems = this.page.locator('[data-testid="job-match-item"]');
    if (await jobItems.count() > 0) {
      await jobItems.first().click();
      await expect(this.page).toHaveURL(/\/es\/jobs\/[^\/]+$/);
      await this.page.goBack();
    }
    
    // Test view all jobs
    await this.page.click('[data-testid="view-all-jobs"]');
    await expect(this.page).toHaveURL('/es/empleos');
  }

  async testBreadcrumbNavigation() {
    // Navigate to a deep page
    await this.page.goto('/es/dashboard/profile/edit');
    
    // Check breadcrumbs
    await expect(this.page.locator('[data-testid="breadcrumbs"]')).toBeVisible();
    await expect(this.page.locator('text=Dashboard')).toBeVisible();
    await expect(this.page.locator('text=Perfil')).toBeVisible();
    await expect(this.page.locator('text=Editar')).toBeVisible();
    
    // Test breadcrumb navigation
    await this.page.click('[data-testid="breadcrumb-dashboard"]');
    await expect(this.page).toHaveURL('/es/dashboard');
  }

  async testMobileNavigation() {
    // Test mobile menu toggle
    await this.page.click('[data-testid="mobile-menu-toggle"]');
    await expect(this.page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test mobile menu items
    for (const menuItem of dashboardTestData.menuItems.slice(0, 3)) {
      await this.page.click(`[data-testid="mobile-menu"] a[href="${menuItem.url}"]`);
      await expect(this.page).toHaveURL(menuItem.url);
      
      // Go back to dashboard
      if (menuItem.url !== '/es/dashboard') {
        await this.page.goto('/es/dashboard');
      }
    }
  }

  async testSearchFunctionality() {
    // Test global search
    await this.page.click('[data-testid="global-search-input"]');
    await this.page.fill('[data-testid="global-search-input"]', 'machine learning');
    
    // Should show search suggestions
    await expect(this.page.locator('[data-testid="search-suggestions"]')).toBeVisible();
    
    // Press enter to search
    await this.page.keyboard.press('Enter');
    
    // Should navigate to search results
    await expect(this.page).toHaveURL(/\/es\/search\?q=machine\+learning/);
  }
}

test.describe('Dashboard Navigation and Functionality', () => {
  let dashboardFlow: DashboardNavigationFlow;

  test.beforeEach(async ({ page }) => {
    dashboardFlow = new DashboardNavigationFlow(page);
    
    // Mock authentication - logged in user
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      }));
    });
    
    // Mock dashboard API responses
    await page.route('**/api/dashboard/stats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connections: 45,
          applications: 12,
          messages: 8,
          events: 3,
        }),
      });
    });
    
    await page.route('**/api/dashboard/activity**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activities: [
            {
              id: 'act-1',
              type: 'connection',
              message: 'Ana García accepted your connection request',
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
              read: false,
            },
            {
              id: 'act-2',
              type: 'application',
              message: 'Your application for Data Scientist was viewed',
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
              read: true,
            },
          ],
        }),
      });
    });
    
    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: dashboardTestData.notifications.map((text, index) => ({
            id: `notif-${index}`,
            text,
            read: index > 0,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * index).toISOString(),
            type: index === 0 ? 'connection' : index === 1 ? 'application' : 'event',
          })),
          unreadCount: 1,
        }),
      });
    });
    
    await page.route('**/api/dashboard/recommendations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: 'job-1',
              title: 'Senior Data Scientist',
              company: 'Tech Corp',
              location: 'Mexico City',
              matchScore: 95,
            },
            {
              id: 'job-2',
              title: 'ML Engineer',
              company: 'AI Startup',
              location: 'Remote',
              matchScore: 88,
            },
          ],
          events: [
            {
              id: 'event-1',
              title: 'ML Workshop',
              date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // Next week
              location: 'Virtual',
            },
          ],
        }),
      });
    });
  });

  test('complete dashboard navigation flow', async ({ page }) => {
    // Step 1: Navigate to dashboard and verify layout
    await dashboardFlow.navigateToDashboard();
    await dashboardFlow.verifyDashboardLayout();
    
    // Step 2: Test sidebar navigation
    await dashboardFlow.testSidebarNavigation();
    
    // Step 3: Test quick actions
    await dashboardFlow.testQuickActions();
    
    // Step 4: Test notifications center
    await dashboardFlow.testNotificationsCenter();
    
    // Step 5: Test user menu
    await dashboardFlow.testUserMenu();
    
    // Step 6: Test dashboard stats
    await dashboardFlow.testDashboardStats();
    
    // Step 7: Test recent activity
    await dashboardFlow.testRecentActivity();
    
    // Step 8: Test upcoming events
    await dashboardFlow.testUpcomingEvents();
    
    // Step 9: Test job matches
    await dashboardFlow.testJobMatches();
  });

  test('dashboard layout and components', async ({ page }) => {
    await dashboardFlow.navigateToDashboard();
    
    // Test dashboard grid layout
    await expect(page.locator('[data-testid="dashboard-grid"]')).toBeVisible();
    
    // Test responsive layout
    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await expect(page.locator('[data-testid="dashboard-sidebar"]')).toBeVisible();
    
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('sidebar navigation and states', async ({ page }) => {
    await dashboardFlow.navigateToDashboard();
    
    // Test sidebar collapse/expand
    await page.click('[data-testid="sidebar-toggle"]');
    await expect(page.locator('[data-testid="dashboard-sidebar"]')).toHaveClass(/collapsed/);
    
    await page.click('[data-testid="sidebar-toggle"]');
    await expect(page.locator('[data-testid="dashboard-sidebar"]')).not.toHaveClass(/collapsed/);
    
    // Test active menu item highlighting
    await page.click('a[href="/es/dashboard/profile"]');
    await expect(page.locator('a[href="/es/dashboard/profile"]')).toHaveClass(/active/);
    
    // Test menu item icons
    for (const menuItem of dashboardTestData.menuItems) {
      const menuLink = page.locator(`a[href="${menuItem.url}"]`);
      await expect(menuLink.locator(`[data-icon="${menuItem.icon}"]`)).toBeVisible();
    }
  });

  test('notifications system', async ({ page }) => {
    await dashboardFlow.navigateToDashboard();
    
    // Check notification badge
    await expect(page.locator('[data-testid="notification-badge"]')).toContainText('1');
    
    // Open notifications
    await page.click('[data-testid="notifications-button"]');
    
    // Test notification types
    await expect(page.locator('[data-type="connection"]')).toBeVisible();
    await expect(page.locator('[data-type="application"]')).toBeVisible();
    await expect(page.locator('[data-type="event"]')).toBeVisible();
    
    // Test notification actions
    await page.click('[data-testid="notification-item"] [data-testid="view-details"]');
    // Should navigate to relevant page or open modal
    
    // Test clear notifications
    await page.click('[data-testid="clear-notifications"]');
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(0);
  });

  test('dashboard stats and metrics', async ({ page }) => {
    await dashboardFlow.navigateToDashboard();
    
    // Test stat cards clickability
    await page.click('[data-testid="stats-connections"]');
    await expect(page).toHaveURL('/es/dashboard/connections');
    await page.goBack();
    
    await page.click('[data-testid="stats-applications"]');
    await expect(page).toHaveURL('/es/dashboard/applications');
    await page.goBack();
    
    // Test stats refresh
    await page.click('[data-testid="refresh-stats"]');
    await expect(page.locator('[data-testid="loading-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-stats"]')).not.toBeVisible();
  });

  test('search functionality', async ({ page }) => {
    await dashboardFlow.navigateToDashboard();
    await dashboardFlow.testSearchFunctionality();
    
    // Test search filters in results page
    await expect(page.locator('[data-testid="search-filters"]')).toBeVisible();
    
    // Test search categories
    await page.click('[data-testid="filter-jobs"]');
    await expect(page.locator('[data-testid="job-result"]')).toBeVisible();
    
    await page.click('[data-testid="filter-members"]');
    await expect(page.locator('[data-testid="member-result"]')).toBeVisible();
    
    await page.click('[data-testid="filter-events"]');
    await expect(page.locator('[data-testid="event-result"]')).toBeVisible();
  });

  test('breadcrumb navigation', async ({ page }) => {
    await dashboardFlow.testBreadcrumbNavigation();
    
    // Test deep navigation breadcrumbs
    await page.goto('/es/dashboard/jobs/applications/123');
    
    // Should show full breadcrumb path
    await expect(page.locator('[data-testid="breadcrumbs"]')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="breadcrumbs"]')).toContainText('Trabajos');
    await expect(page.locator('[data-testid="breadcrumbs"]')).toContainText('Aplicaciones');
    
    // Test breadcrumb links
    await page.click('[data-testid="breadcrumb-jobs"]');
    await expect(page).toHaveURL('/es/dashboard/jobs');
  });

  test('dashboard customization', async ({ page }) => {
    await dashboardFlow.navigateToDashboard();
    
    // Test widget reordering (drag and drop simulation)
    const widget1 = page.locator('[data-testid="widget-stats"]');
    const widget2 = page.locator('[data-testid="widget-activity"]');
    
    // Simulate drag and drop
    await widget1.hover();
    await page.mouse.down();
    await widget2.hover();
    await page.mouse.up();
    
    // Verify layout changed
    await expect(page.locator('[data-testid="dashboard-grid"]')).toHaveClass(/custom-layout/);
    
    // Test hiding/showing widgets
    await page.click('[data-testid="dashboard-settings"]');
    await page.uncheck('[data-testid="toggle-activity-widget"]');
    await expect(page.locator('[data-testid="widget-activity"]')).not.toBeVisible();
    
    // Save layout
    await page.click('[data-testid="save-dashboard-layout"]');
    await expect(page.locator('text=Layout guardado')).toBeVisible();
  });
});

// Mobile dashboard tests
test.describe('Mobile Dashboard Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile dashboard layout', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Mobile layout should be properly responsive
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Stats should be in mobile-friendly cards
    await expect(page.locator('[data-testid="mobile-stats-grid"]')).toBeVisible();
    
    // Quick actions should be horizontally scrollable
    await expect(page.locator('[data-testid="mobile-quick-actions"]')).toBeVisible();
  });

  test('mobile navigation menu', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    await dashboardFlow.testMobileNavigation();
    
    // Test mobile menu close
    await page.click('[data-testid="mobile-menu-close"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
    
    // Test swipe gestures (simulated)
    await page.touchscreen.tap(50, 300);
    await page.touchscreen.tap(300, 300);
    // Should open menu with swipe gesture
  });

  test('mobile notifications', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Mobile notifications should be full-screen
    await page.click('[data-testid="notifications-button"]');
    await expect(page.locator('[data-testid="mobile-notifications-fullscreen"]')).toBeVisible();
    
    // Should have mobile-friendly interaction
    await page.locator('[data-testid="notification-item"]').first().tap();
    await expect(page.locator('[data-testid="notification-details"]')).toBeVisible();
  });
});

// Tablet dashboard tests
test.describe('Tablet Dashboard Navigation', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('tablet dashboard layout', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Tablet should show sidebar but with different behavior
    await expect(page.locator('[data-testid="tablet-sidebar"]')).toBeVisible();
    
    // Stats should be in 2x2 grid
    await expect(page.locator('[data-testid="tablet-stats-grid"]')).toHaveClass(/grid-2x2/);
  });
});

// Visual regression tests
test.describe('Dashboard Visual Tests', () => {
  test('dashboard layout consistency', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Screenshot of full dashboard
    await expect(page).toHaveScreenshot('dashboard-full-layout.png');
    
    // Screenshot with sidebar collapsed
    await page.click('[data-testid="sidebar-toggle"]');
    await expect(page).toHaveScreenshot('dashboard-sidebar-collapsed.png');
    
    // Screenshot with notifications open
    await page.click('[data-testid="notifications-button"]');
    await expect(page).toHaveScreenshot('dashboard-notifications-open.png');
  });

  test('mobile dashboard consistency', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Mobile dashboard screenshot
    await expect(page).toHaveScreenshot('dashboard-mobile-layout.png');
    
    // Mobile menu screenshot
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page).toHaveScreenshot('dashboard-mobile-menu.png');
  });
});

// Performance tests
test.describe('Dashboard Performance', () => {
  test('dashboard load performance', async ({ page }) => {
    const startTime = Date.now();
    
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Dashboard should load within 2 seconds
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
    
    // All main components should be visible
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
  });

  test('navigation performance', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Test navigation speed between dashboard sections
    const navigationTimes: number[] = [];
    
    for (const menuItem of dashboardTestData.menuItems.slice(0, 3)) {
      const startTime = Date.now();
      await page.click(`a[href="${menuItem.url}"]`);
      await page.waitForSelector('[data-testid="page-content"]');
      const endTime = Date.now();
      
      navigationTimes.push(endTime - startTime);
      
      // Go back to dashboard
      if (menuItem.url !== '/es/dashboard') {
        await page.click('a[href="/es/dashboard"]');
      }
    }
    
    // Average navigation time should be under 1 second
    const averageTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
    expect(averageTime).toBeLessThan(1000);
  });
});

// Accessibility tests
test.describe('Dashboard Accessibility', () => {
  test('dashboard keyboard navigation', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Test tab navigation through main elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="skip-link"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="global-search-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="notifications-button"]')).toBeFocused();
    
    // Test sidebar navigation with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Navigate to first sidebar item
    await page.keyboard.press('Enter');
    
    // Should navigate to the selected page
    await expect(page).toHaveURL(/\/es\/dashboard\/profile/);
  });

  test('dashboard screen reader support', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Check ARIA labels and roles
    await expect(page.locator('[data-testid="dashboard-main"]')).toHaveAttribute('role', 'main');
    await expect(page.locator('[data-testid="dashboard-sidebar"]')).toHaveAttribute('role', 'navigation');
    
    // Check heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h2')).toHaveCountGreaterThan(0);
    
    // Check stat cards have proper labels
    await expect(page.locator('[data-testid="stats-connections"]')).toHaveAttribute('aria-label', '45 connections');
    
    // Check notification button has proper state
    const notificationButton = page.locator('[data-testid="notifications-button"]');
    await expect(notificationButton).toHaveAttribute('aria-label', 'Notifications (1 unread)');
  });

  test('dashboard color contrast', async ({ page }) => {
    const dashboardFlow = new DashboardNavigationFlow(page);
    await dashboardFlow.navigateToDashboard();
    
    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Elements should still be visible and readable
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
    
    // Test focus indicators are visible
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveCSS('outline-width', '2px');
  });
});