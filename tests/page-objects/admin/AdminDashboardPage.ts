import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingJobs: number;
  moderationQueue: number;
  systemHealth: string;
  dailyRevenue?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  firstName: string;
  lastName: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'suspended';
}

export class AdminDashboardPage extends BasePage {
  // Navigation elements
  private readonly adminNavBar: Locator;
  private readonly userManagementTab: Locator;
  private readonly contentModerationTab: Locator;
  private readonly analyticsTab: Locator;
  private readonly systemSettingsTab: Locator;
  private readonly commissionsTab: Locator;
  private readonly eventsTab: Locator;
  private readonly paymentsTab: Locator;
  private readonly supportTab: Locator;
  private readonly auditLogsTab: Locator;

  // Dashboard overview elements
  private readonly dashboardTitle: Locator;
  private readonly statsContainer: Locator;
  private readonly totalUsersCard: Locator;
  private readonly activeUsersCard: Locator;
  private readonly pendingJobsCard: Locator;
  private readonly moderationQueueCard: Locator;
  private readonly systemHealthCard: Locator;
  private readonly revenueCard: Locator;

  // Quick actions
  private readonly quickActionsPanel: Locator;
  private readonly broadcastAnnouncementBtn: Locator;
  private readonly systemMaintenanceBtn: Locator;
  private readonly exportDataBtn: Locator;
  private readonly emergencyLockdownBtn: Locator;

  // Recent activity feed
  private readonly activityFeed: Locator;
  private readonly activityItems: Locator;
  private readonly viewAllActivityBtn: Locator;

  // User role indicators
  private readonly currentUserRole: Locator;
  private readonly rolePermissionsBadge: Locator;
  private readonly impersonationMode: Locator;

  // Real-time notifications
  private readonly notificationBell: Locator;
  private readonly notificationCount: Locator;
  private readonly notificationDropdown: Locator;
  private readonly emergencyAlerts: Locator;

  // Search and filters
  private readonly globalAdminSearch: Locator;
  private readonly dateRangeFilter: Locator;
  private readonly roleFilter: Locator;

  // System status indicators
  private readonly systemStatusPanel: Locator;
  private readonly databaseStatus: Locator;
  private readonly apiStatus: Locator;
  private readonly paymentGatewayStatus: Locator;
  private readonly emailServiceStatus: Locator;

  constructor(page: Page) {
    super(page);
    
    // Navigation
    this.adminNavBar = page.locator('[data-testid="admin-nav-bar"]');
    this.userManagementTab = page.locator('[data-testid="nav-user-management"]');
    this.contentModerationTab = page.locator('[data-testid="nav-content-moderation"]');
    this.analyticsTab = page.locator('[data-testid="nav-analytics"]');
    this.systemSettingsTab = page.locator('[data-testid="nav-system-settings"]');
    this.commissionsTab = page.locator('[data-testid="nav-commissions"]');
    this.eventsTab = page.locator('[data-testid="nav-events"]');
    this.paymentsTab = page.locator('[data-testid="nav-payments"]');
    this.supportTab = page.locator('[data-testid="nav-support"]');
    this.auditLogsTab = page.locator('[data-testid="nav-audit-logs"]');

    // Dashboard overview
    this.dashboardTitle = page.locator('[data-testid="admin-dashboard-title"]');
    this.statsContainer = page.locator('[data-testid="admin-stats-container"]');
    this.totalUsersCard = page.locator('[data-testid="stat-total-users"]');
    this.activeUsersCard = page.locator('[data-testid="stat-active-users"]');
    this.pendingJobsCard = page.locator('[data-testid="stat-pending-jobs"]');
    this.moderationQueueCard = page.locator('[data-testid="stat-moderation-queue"]');
    this.systemHealthCard = page.locator('[data-testid="stat-system-health"]');
    this.revenueCard = page.locator('[data-testid="stat-revenue"]');

    // Quick actions
    this.quickActionsPanel = page.locator('[data-testid="quick-actions-panel"]');
    this.broadcastAnnouncementBtn = page.locator('[data-testid="broadcast-announcement"]');
    this.systemMaintenanceBtn = page.locator('[data-testid="system-maintenance"]');
    this.exportDataBtn = page.locator('[data-testid="export-data"]');
    this.emergencyLockdownBtn = page.locator('[data-testid="emergency-lockdown"]');

    // Activity feed
    this.activityFeed = page.locator('[data-testid="activity-feed"]');
    this.activityItems = page.locator('[data-testid="activity-item"]');
    this.viewAllActivityBtn = page.locator('[data-testid="view-all-activity"]');

    // User role
    this.currentUserRole = page.locator('[data-testid="current-user-role"]');
    this.rolePermissionsBadge = page.locator('[data-testid="role-permissions-badge"]');
    this.impersonationMode = page.locator('[data-testid="impersonation-mode"]');

    // Notifications
    this.notificationBell = page.locator('[data-testid="notification-bell"]');
    this.notificationCount = page.locator('[data-testid="notification-count"]');
    this.notificationDropdown = page.locator('[data-testid="notification-dropdown"]');
    this.emergencyAlerts = page.locator('[data-testid="emergency-alerts"]');

    // Search and filters
    this.globalAdminSearch = page.locator('[data-testid="global-admin-search"]');
    this.dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
    this.roleFilter = page.locator('[data-testid="role-filter"]');

    // System status
    this.systemStatusPanel = page.locator('[data-testid="system-status-panel"]');
    this.databaseStatus = page.locator('[data-testid="database-status"]');
    this.apiStatus = page.locator('[data-testid="api-status"]');
    this.paymentGatewayStatus = page.locator('[data-testid="payment-gateway-status"]');
    this.emailServiceStatus = page.locator('[data-testid="email-service-status"]');
  }

  /**
   * Navigate to admin dashboard
   */
  async goto() {
    await this.navigate('/admin/dashboard');
    await this.waitForPageLoad();
    await this.waitForElement('[data-testid="admin-dashboard-title"]');
  }

  /**
   * Login as admin user with specific role
   */
  async loginAsAdmin(role: 'super_admin' | 'admin' | 'moderator' | 'support' = 'admin') {
    const credentials = {
      super_admin: { email: 'superadmin@secid.mx', password: 'SuperAdmin123!' },
      admin: { email: 'admin@secid.mx', password: 'Admin123!' },
      moderator: { email: 'moderator@secid.mx', password: 'Moderator123!' },
      support: { email: 'support@secid.mx', password: 'Support123!' }
    };

    const { email, password } = credentials[role];
    
    // Navigate to login if not already there
    if (!this.page.url().includes('/login')) {
      await this.navigate('/login');
    }

    // Fill and submit login form
    await this.fillField('[data-testid="login-email"]', email);
    await this.fillField('[data-testid="login-password"]', password);
    await this.clickElement('[data-testid="login-submit"]');

    // Wait for dashboard redirect
    await this.waitForNavigation(/\/admin\/dashboard/);
    await this.waitForPageLoad();
  }

  /**
   * Verify admin access and role
   */
  async verifyAdminAccess(expectedRole?: string) {
    // Check if admin dashboard is loaded
    await expect(this.dashboardTitle).toBeVisible();
    await expect(this.adminNavBar).toBeVisible();

    // Verify role if specified
    if (expectedRole) {
      const actualRole = await this.getCurrentUserRole();
      expect(actualRole.toLowerCase()).toContain(expectedRole.toLowerCase());
    }

    // Check for admin-specific elements
    await expect(this.statsContainer).toBeVisible();
    await expect(this.quickActionsPanel).toBeVisible();
  }

  /**
   * Get current user role
   */
  async getCurrentUserRole(): Promise<string> {
    await this.currentUserRole.waitFor({ state: 'visible' });
    return await this.currentUserRole.textContent() || '';
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<AdminStats> {
    await this.statsContainer.waitFor({ state: 'visible' });

    const totalUsers = await this.extractNumberFromCard(this.totalUsersCard);
    const activeUsers = await this.extractNumberFromCard(this.activeUsersCard);  
    const pendingJobs = await this.extractNumberFromCard(this.pendingJobsCard);
    const moderationQueue = await this.extractNumberFromCard(this.moderationQueueCard);
    const systemHealth = await this.getElementText('[data-testid="stat-system-health"] .value');
    
    let dailyRevenue: number | undefined;
    if (await this.revenueCard.isVisible()) {
      dailyRevenue = await this.extractNumberFromCard(this.revenueCard);
    }

    return {
      totalUsers,
      activeUsers,
      pendingJobs,
      moderationQueue,
      systemHealth,
      dailyRevenue
    };
  }

  /**
   * Extract number from stat card
   */
  private async extractNumberFromCard(card: Locator): Promise<number> {
    const text = await card.locator('.value').textContent() || '0';
    return parseInt(text.replace(/[^\d]/g, ''), 10) || 0;
  }

  /**
   * Navigate to specific admin section
   */
  async navigateToSection(section: 'users' | 'moderation' | 'analytics' | 'settings' | 'commissions' | 'events' | 'payments' | 'support' | 'audit') {
    const tabMap = {
      users: this.userManagementTab,
      moderation: this.contentModerationTab,
      analytics: this.analyticsTab,
      settings: this.systemSettingsTab,
      commissions: this.commissionsTab,
      events: this.eventsTab,
      payments: this.paymentsTab,
      support: this.supportTab,
      audit: this.auditLogsTab
    };

    const tab = tabMap[section];
    await tab.click();
    await this.waitForNavigation(new RegExp(`/admin/${section}`));
    await this.waitForPageLoad();
  }

  /**
   * Perform quick action
   */
  async performQuickAction(action: 'broadcast' | 'maintenance' | 'export' | 'lockdown') {
    const actionMap = {
      broadcast: this.broadcastAnnouncementBtn,
      maintenance: this.systemMaintenanceBtn,
      export: this.exportDataBtn,
      lockdown: this.emergencyLockdownBtn
    };

    const button = actionMap[action];
    await button.click();

    // Handle confirmation dialog for dangerous actions
    if (action === 'lockdown' || action === 'maintenance') {
      await this.handleDialog(true);
    }
  }

  /**
   * Get recent activity items
   */
  async getRecentActivity(): Promise<string[]> {
    await this.activityFeed.waitFor({ state: 'visible' });
    const items = await this.activityItems.all();
    
    const activities: string[] = [];
    for (const item of items) {
      const text = await item.textContent();
      if (text) activities.push(text.trim());
    }
    
    return activities;
  }

  /**
   * Check notification count
   */
  async getNotificationCount(): Promise<number> {
    if (await this.notificationCount.isVisible()) {
      const countText = await this.notificationCount.textContent() || '0';
      return parseInt(countText, 10) || 0;
    }
    return 0;
  }

  /**
   * Open notifications dropdown
   */
  async openNotifications() {
    await this.notificationBell.click();
    await this.notificationDropdown.waitFor({ state: 'visible' });
  }

  /**
   * Check for emergency alerts
   */
  async hasEmergencyAlerts(): Promise<boolean> {
    return await this.emergencyAlerts.isVisible();
  }

  /**
   * Perform global admin search
   */
  async performGlobalSearch(query: string) {
    await this.globalAdminSearch.fill(query);
    await this.globalAdminSearch.press('Enter');
    await this.waitForAPIResponse('/api/admin/search');
  }

  /**
   * Set date range filter
   */
  async setDateRangeFilter(startDate: string, endDate: string) {
    await this.dateRangeFilter.click();
    
    // Interact with date picker (implementation depends on date picker component)
    await this.fillField('[data-testid="start-date"]', startDate);
    await this.fillField('[data-testid="end-date"]', endDate);
    await this.clickElement('[data-testid="apply-date-filter"]');
  }

  /**
   * Filter by role
   */
  async filterByRole(role: string) {
    await this.roleFilter.selectOption(role);
    await this.waitForAPIResponse('/api/admin/filter');
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<Record<string, string>> {
    await this.systemStatusPanel.waitFor({ state: 'visible' });

    return {
      database: await this.getStatusIndicator(this.databaseStatus),
      api: await this.getStatusIndicator(this.apiStatus),
      paymentGateway: await this.getStatusIndicator(this.paymentGatewayStatus),
      emailService: await this.getStatusIndicator(this.emailServiceStatus)
    };
  }

  /**
   * Get status indicator value
   */
  private async getStatusIndicator(locator: Locator): Promise<string> {
    const classes = await locator.getAttribute('class') || '';
    if (classes.includes('status-healthy')) return 'healthy';
    if (classes.includes('status-warning')) return 'warning';
    if (classes.includes('status-error')) return 'error';
    return 'unknown';
  }

  /**
   * Enable impersonation mode
   */
  async enableImpersonation(userId: string) {
    await this.clickElement('[data-testid="enable-impersonation"]');
    await this.fillField('[data-testid="impersonation-user-id"]', userId);
    await this.clickElement('[data-testid="start-impersonation"]');
    
    // Wait for impersonation mode to activate
    await this.impersonationMode.waitFor({ state: 'visible' });
  }

  /**
   * Disable impersonation mode
   */
  async disableImpersonation() {
    if (await this.impersonationMode.isVisible()) {
      await this.clickElement('[data-testid="stop-impersonation"]');
      await this.impersonationMode.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    const permissions = await this.page.evaluate(() => {
      return (window as any).adminPermissions || [];
    });
    
    return permissions.includes(permission);
  }

  /**
   * Verify role-based access to features
   */
  async verifyRoleAccess(role: 'super_admin' | 'admin' | 'moderator' | 'support') {
    const expectedFeatures = {
      super_admin: ['user_management', 'system_settings', 'payments', 'audit_logs', 'emergency_controls'],
      admin: ['user_management', 'content_moderation', 'analytics', 'events'],
      moderator: ['content_moderation', 'user_reports', 'basic_analytics'],
      support: ['user_support', 'ticket_management', 'basic_user_info']
    };

    const features = expectedFeatures[role];
    
    for (const feature of features) {
      const hasAccess = await this.hasPermission(feature);
      expect(hasAccess, `Role ${role} should have access to ${feature}`).toBe(true);
    }
  }

  /**
   * Test unauthorized access
   */
  async testUnauthorizedAccess(restrictedUrl: string) {
    await this.navigate(restrictedUrl);
    
    // Should redirect to access denied or login
    const currentUrl = await this.getCurrentURL();
    expect(currentUrl).toMatch(/(access-denied|login|unauthorized)/);
  }

  /**
   * Export admin data
   */
  async exportData(format: 'csv' | 'xlsx' | 'json' = 'csv') {
    await this.exportDataBtn.click();
    
    // Select format
    await this.selectOption('[data-testid="export-format"]', format);
    await this.clickElement('[data-testid="confirm-export"]');
    
    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download');
    await this.clickElement('[data-testid="download-export"]');
    const download = await downloadPromise;
    
    return download;
  }

  /**
   * Check mobile admin experience
   */
  async checkMobileLayout() {
    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.reload();
    await this.waitForPageLoad();

    // Check if mobile navigation is properly displayed
    const mobileNav = this.page.locator('[data-testid="mobile-admin-nav"]');
    await expect(mobileNav).toBeVisible();

    // Check if stats cards stack properly on mobile
    const statsGrid = this.page.locator('[data-testid="admin-stats-container"]');
    const gridStyle = await statsGrid.evaluate(el => getComputedStyle(el).gridTemplateColumns);
    expect(gridStyle).toBe('1fr'); // Should be single column on mobile
  }

  /**
   * Test keyboard shortcuts
   */
  async testKeyboardShortcuts() {
    // Test common admin shortcuts
    const shortcuts = [
      { keys: 'ctrl+k', expectedAction: 'global-search-focus' },
      { keys: 'ctrl+u', expectedAction: 'user-management-nav' },
      { keys: 'ctrl+m', expectedAction: 'moderation-nav' },
      { keys: 'ctrl+a', expectedAction: 'analytics-nav' }
    ];

    for (const shortcut of shortcuts) {
      await this.page.keyboard.press(shortcut.keys);
      // Verify the expected action occurred
      // Implementation depends on specific shortcut behavior
    }
  }

  /**
   * Check multi-language admin interface
   */
  async switchLanguage(language: 'en' | 'es') {
    const langSwitcher = this.page.locator('[data-testid="admin-language-switcher"]');
    await langSwitcher.selectOption(language);
    
    // Wait for UI to update
    await this.waitForPageLoad();
    
    // Verify language change
    const dashboardTitleText = await this.dashboardTitle.textContent();
    const expectedText = language === 'es' ? 'Panel de Administración' : 'Admin Dashboard';
    expect(dashboardTitleText).toContain(expectedText);
  }

  /**
   * Wait for real-time updates
   */
  async waitForRealTimeUpdate(elementSelector: string, timeout: number = 30000) {
    const element = this.page.locator(elementSelector);
    const initialValue = await element.textContent();
    
    // Wait for element to change
    await this.page.waitForFunction(
      (selector, initial) => {
        const el = document.querySelector(selector);
        return el && el.textContent !== initial;
      },
      { timeout },
      elementSelector,
      initialValue
    );
  }

  /**
   * Check audit log entry creation
   */
  async verifyAuditLogEntry(action: string, details?: string) {
    // This would typically check if an audit log entry was created
    // Implementation depends on how audit logs are tracked
    await this.waitForAPIResponse('/api/admin/audit-logs');
    
    // Navigate to audit logs to verify
    await this.navigateToSection('audit');
    
    // Check for recent entry
    const recentEntry = this.page.locator('[data-testid="audit-entry"]').first();
    const entryText = await recentEntry.textContent();
    expect(entryText).toContain(action);
    
    if (details) {
      expect(entryText).toContain(details);
    }
  }
}