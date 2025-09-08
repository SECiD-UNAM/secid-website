import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class NavigationComponent extends BasePage {
  // Desktop navigation selectors
  private readonly desktopNav: Locator;
  private readonly homeLink: Locator;
  private readonly jobsLink: Locator;
  private readonly membersLink: Locator;
  private readonly aboutLink: Locator;
  private readonly eventsLink: Locator;
  private readonly loginButton: Locator;
  private readonly signupButton: Locator;
  private readonly languageToggle: Locator;
  private readonly userMenu: Locator;
  private readonly userMenuDropdown: Locator;
  
  // Mobile navigation selectors
  private readonly mobileMenuButton: Locator;
  private readonly mobileNav: Locator;
  private readonly mobileMenuClose: Locator;
  
  // User menu items
  private readonly dashboardLink: Locator;
  private readonly profileLink: Locator;
  private readonly settingsLink: Locator;
  private readonly logoutLink: Locator;

  constructor(page: Page) {
    super(page);
    
    // Desktop navigation
    this.desktopNav = page.locator('nav[data-testid="desktop-nav"]');
    this.homeLink = page.locator('[data-testid="nav-home"]');
    this.jobsLink = page.locator('[data-testid="nav-jobs"]');
    this.membersLink = page.locator('[data-testid="nav-members"]');
    this.aboutLink = page.locator('[data-testid="nav-about"]');
    this.eventsLink = page.locator('[data-testid="nav-events"]');
    this.loginButton = page.locator('[data-testid="nav-login"]');
    this.signupButton = page.locator('[data-testid="nav-signup"]');
    this.languageToggle = page.locator('[data-testid="language-toggle"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.userMenuDropdown = page.locator('[data-testid="user-menu-dropdown"]');
    
    // Mobile navigation
    this.mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    this.mobileNav = page.locator('[data-testid="mobile-nav"]');
    this.mobileMenuClose = page.locator('[data-testid="mobile-menu-close"]');
    
    // User menu items
    this.dashboardLink = page.locator('[data-testid="nav-dashboard"]');
    this.profileLink = page.locator('[data-testid="nav-profile"]');
    this.settingsLink = page.locator('[data-testid="nav-settings"]');
    this.logoutLink = page.locator('[data-testid="nav-logout"]');
  }

  /**
   * Check if user is logged in based on navigation state
   */
  async isUserLoggedIn(): Promise<boolean> {
    return await this.userMenu.isVisible();
  }

  /**
   * Navigate to home page
   */
  async goToHome() {
    await this.homeLink.click();
    await this.waitForNavigation();
  }

  /**
   * Navigate to jobs page
   */
  async goToJobs() {
    await this.jobsLink.click();
    await this.waitForNavigation(/\/jobs/);
  }

  /**
   * Navigate to members directory
   */
  async goToMembers() {
    await this.membersLink.click();
    await this.waitForNavigation(/\/members/);
  }

  /**
   * Navigate to about page
   */
  async goToAbout() {
    await this.aboutLink.click();
    await this.waitForNavigation(/\/about/);
  }

  /**
   * Navigate to events page
   */
  async goToEvents() {
    await this.eventsLink.click();
    await this.waitForNavigation(/\/events/);
  }

  /**
   * Click login button
   */
  async clickLogin() {
    await this.loginButton.click();
    await this.waitForNavigation(/\/login/);
  }

  /**
   * Click signup button
   */
  async clickSignup() {
    await this.signupButton.click();
    await this.waitForNavigation(/\/signup/);
  }

  /**
   * Open user menu
   */
  async openUserMenu() {
    await this.userMenu.click();
    await this.userMenuDropdown.waitFor({ state: 'visible' });
  }

  /**
   * Navigate to dashboard
   */
  async goToDashboard() {
    await this.openUserMenu();
    await this.dashboardLink.click();
    await this.waitForNavigation(/\/dashboard/);
  }

  /**
   * Navigate to profile
   */
  async goToProfile() {
    await this.openUserMenu();
    await this.profileLink.click();
    await this.waitForNavigation(/\/profile/);
  }

  /**
   * Navigate to settings
   */
  async goToSettings() {
    await this.openUserMenu();
    await this.settingsLink.click();
    await this.waitForNavigation(/\/settings/);
  }

  /**
   * Logout user
   */
  async logout() {
    await this.openUserMenu();
    await this.logoutLink.click();
    // Wait for redirect to home or login page
    await this.waitForNavigation();
    // Verify user is logged out
    await this.loginButton.waitFor({ state: 'visible' });
  }

  /**
   * Toggle language
   */
  async toggleLanguage() {
    const currentLang = await this.getCurrentLanguage();
    await this.languageToggle.click();
    
    // Wait for language change
    await this.page.waitForFunction(
      (expectedLang) => {
        const htmlLang = document.documentElement.getAttribute('lang');
        return htmlLang !== expectedLang;
      },
      currentLang,
      { timeout: 5000 }
    );
  }

  /**
   * Get current language
   */
  async getCurrentLanguage(): Promise<string> {
    return await this.page.evaluate(() => {
      return document.documentElement.getAttribute('lang') || 'es';
    });
  }

  /**
   * Open mobile menu
   */
  async openMobileMenu() {
    if (await this.mobileMenuButton.isVisible()) {
      await this.mobileMenuButton.click();
      await this.mobileNav.waitFor({ state: 'visible' });
    }
  }

  /**
   * Close mobile menu
   */
  async closeMobileMenu() {
    if (await this.mobileNav.isVisible()) {
      await this.mobileMenuClose.click();
      await this.mobileNav.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Navigate on mobile
   */
  async navigateMobile(destination: 'home' | 'jobs' | 'members' | 'about' | 'events') {
    await this.openMobileMenu();
    
    switch (destination) {
      case 'home':
        await this.homeLink.click();
        break;
      case 'jobs':
        await this.jobsLink.click();
        break;
      case 'members':
        await this.membersLink.click();
        break;
      case 'about':
        await this.aboutLink.click();
        break;
      case 'events':
        await this.eventsLink.click();
        break;
    }
    
    await this.waitForNavigation();
  }

  /**
   * Check if navigation is visible
   */
  async isNavigationVisible(): Promise<boolean> {
    const isMobile = await this.page.evaluate(() => window.innerWidth < 768);
    
    if (isMobile) {
      return await this.mobileMenuButton.isVisible();
    } else {
      return await this.desktopNav.isVisible();
    }
  }

  /**
   * Get all navigation links
   */
  async getNavigationLinks(): Promise<string[]> {
    const links = await this.page.locator('nav a').allTextContents();
    return links.filter(link => link.trim() !== '');
  }

  /**
   * Check if specific nav item is active
   */
  async isNavItemActive(item: string): Promise<boolean> {
    const navItem = this.page.locator(`[data-testid="nav-${item}"]`);
    return await this.hasClass(navItem.locator('..'), 'active') || 
           await this.hasClass(navItem.locator('..'), 'current');
  }

  /**
   * Search from navigation
   */
  async searchFromNav(query: string) {
    const searchButton = this.page.locator('[data-testid="nav-search-button"]');
    if (await searchButton.isVisible()) {
      await searchButton.click();
      const searchInput = this.page.locator('[data-testid="nav-search-input"]');
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(query);
      await searchInput.press('Enter');
      await this.waitForNavigation(/\/search/);
    }
  }

  /**
   * Get user info from navigation
   */
  async getUserInfo(): Promise<{ name: string; email: string } | null> {
    if (await this.isUserLoggedIn()) {
      await this.openUserMenu();
      const userName = await this.page.locator('[data-testid="user-menu-name"]').textContent();
      const userEmail = await this.page.locator('[data-testid="user-menu-email"]').textContent();
      
      // Close menu
      await this.page.keyboard.press('Escape');
      
      return {
        name: userName?.trim() || '',
        email: userEmail?.trim() || ''
      };
    }
    
    return null;
  }

  /**
   * Check for notification badge
   */
  async hasNotifications(): Promise<boolean> {
    const notificationBadge = this.page.locator('[data-testid="notification-badge"]');
    return await notificationBadge.isVisible();
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    if (await this.hasNotifications()) {
      const badge = this.page.locator('[data-testid="notification-badge"]');
      const count = await badge.textContent();
      return parseInt(count || '0', 10);
    }
    return 0;
  }
}