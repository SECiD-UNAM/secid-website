import { Page, Locator, expect } from '@playwright/test';
import { PERFORMANCE_BUDGETS } from '../../../playwright.config';

export class BasePage {
  protected readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async navigate(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for any loading indicators to disappear
    const loadingIndicator = this.page.locator('[data-testid="loading"]');
    if (await loadingIndicator.count() > 0) {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  /**
   * Get page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Click element with retry logic
   */
  async clickElement(selector: string) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.click();
  }

  /**
   * Fill form field
   */
  async fillField(selector: string, value: string) {
    const field = this.page.locator(selector);
    await field.waitFor({ state: 'visible' });
    await field.fill(value);
  }

  /**
   * Select dropdown option
   */
  async selectOption(selector: string, value: string) {
    const dropdown = this.page.locator(selector);
    await dropdown.selectOption(value);
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(url?: string | RegExp) {
    await this.page.waitForURL(url || '**/*', { timeout: 30000 });
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Check page accessibility
   */
  async checkAccessibility(options?: any) {
    // This will be implemented with axe-playwright
    // Placeholder for now
    return true;
  }

  /**
   * Measure page performance metrics
   */
  async measurePerformance() {
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        // Navigation timing
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        
        // Paint timing
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        
        // Resource timing
        resourceCount: performance.getEntriesByType('resource').length,
        totalResourceSize: performance.getEntriesByType('resource').reduce((acc, resource: any) => {
          return acc + (resource.transferSize || 0);
        }, 0),
      };
    });

    // Validate against performance budgets
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.FCP);
    
    return performanceMetrics;
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, options?: { timeout?: number }) {
    await this.page.locator(selector).waitFor({ 
      state: 'visible', 
      timeout: options?.timeout || 10000 
    });
  }

  /**
   * Get text content of element
   */
  async getElementText(selector: string): Promise<string> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    return await element.textContent() || '';
  }

  /**
   * Check if element has class
   */
  async hasClass(selector: string, className: string): Promise<boolean> {
    const element = this.page.locator(selector);
    const classes = await element.getAttribute('class') || '';
    return classes.includes(className);
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string) {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Handle dialog/alert
   */
  async handleDialog(accept: boolean = true, promptText?: string) {
    this.page.on('dialog', async dialog => {
      if (promptText && dialog.type() === 'prompt') {
        await dialog.accept(promptText);
      } else if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Upload file
   */
  async uploadFile(selector: string, filePath: string) {
    const fileInput = this.page.locator(selector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Clear browser storage
   */
  async clearStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Set browser cookies
   */
  async setCookie(name: string, value: string) {
    await this.page.context().addCookies([{
      name,
      value,
      domain: new URL(this.page.url()).hostname,
      path: '/',
    }]);
  }

  /**
   * Get browser cookies
   */
  async getCookies() {
    return await this.page.context().cookies();
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(urlPattern: string | RegExp) {
    return await this.page.waitForResponse(response => 
      urlPattern instanceof RegExp 
        ? urlPattern.test(response.url())
        : response.url().includes(urlPattern)
    );
  }

  /**
   * Mock API response
   */
  async mockAPIResponse(url: string | RegExp, response: any) {
    await this.page.route(url, route => {
      route.fulfill({
        status: response.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(response.body || {})
      });
    });
  }

  /**
   * Get network requests
   */
  async getNetworkRequests(urlPattern?: string | RegExp) {
    const requests: any[] = [];
    
    this.page.on('request', request => {
      if (!urlPattern || 
          (urlPattern instanceof RegExp && urlPattern.test(request.url())) ||
          (typeof urlPattern === 'string' && request.url().includes(urlPattern))) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });
    
    return requests;
  }

  /**
   * Check for console errors
   */
  async checkForConsoleErrors() {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    return errors;
  }

  /**
   * Get current URL
   */
  async getCurrentURL(): Promise<string> {
    return this.page.url();
  }

  /**
   * Reload page
   */
  async reload() {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Go back in browser history
   */
  async goBack() {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * Go forward in browser history
   */
  async goForward() {
    await this.page.goForward();
    await this.waitForPageLoad();
  }
}