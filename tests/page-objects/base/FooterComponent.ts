import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class FooterComponent extends BasePage {
  // Footer sections
  private readonly footer: Locator;
  private readonly platformSection: Locator;
  private readonly communitySection: Locator;
  private readonly supportSection: Locator;
  private readonly legalSection: Locator;
  
  // Footer links
  private readonly jobsLink: Locator;
  private readonly membersLink: Locator;
  private readonly eventsLink: Locator;
  private readonly resourcesLink: Locator;
  private readonly slackLink: Locator;
  private readonly discordLink: Locator;
  private readonly newsletterLink: Locator;
  private readonly blogLink: Locator;
  private readonly helpCenterLink: Locator;
  private readonly contactLink: Locator;
  private readonly faqLink: Locator;
  private readonly statusLink: Locator;
  private readonly privacyLink: Locator;
  private readonly termsLink: Locator;
  private readonly cookiesLink: Locator;
  
  // Social media links
  private readonly facebookLink: Locator;
  private readonly twitterLink: Locator;
  private readonly linkedinLink: Locator;
  private readonly githubLink: Locator;
  
  // Newsletter form
  private readonly newsletterForm: Locator;
  private readonly newsletterInput: Locator;
  private readonly newsletterSubmit: Locator;
  
  // Copyright
  private readonly copyrightText: Locator;

  constructor(page: Page) {
    super(page);
    
    // Footer sections
    this.footer = page.locator('footer[data-testid="footer"]');
    this.platformSection = page.locator('[data-testid="footer-platform"]');
    this.communitySection = page.locator('[data-testid="footer-community"]');
    this.supportSection = page.locator('[data-testid="footer-support"]');
    this.legalSection = page.locator('[data-testid="footer-legal"]');
    
    // Platform links
    this.jobsLink = page.locator('[data-testid="footer-jobs"]');
    this.membersLink = page.locator('[data-testid="footer-members"]');
    this.eventsLink = page.locator('[data-testid="footer-events"]');
    this.resourcesLink = page.locator('[data-testid="footer-resources"]');
    
    // Community links
    this.slackLink = page.locator('[data-testid="footer-slack"]');
    this.discordLink = page.locator('[data-testid="footer-discord"]');
    this.newsletterLink = page.locator('[data-testid="footer-newsletter"]');
    this.blogLink = page.locator('[data-testid="footer-blog"]');
    
    // Support links
    this.helpCenterLink = page.locator('[data-testid="footer-help"]');
    this.contactLink = page.locator('[data-testid="footer-contact"]');
    this.faqLink = page.locator('[data-testid="footer-faq"]');
    this.statusLink = page.locator('[data-testid="footer-status"]');
    
    // Legal links
    this.privacyLink = page.locator('[data-testid="footer-privacy"]');
    this.termsLink = page.locator('[data-testid="footer-terms"]');
    this.cookiesLink = page.locator('[data-testid="footer-cookies"]');
    
    // Social media
    this.facebookLink = page.locator('[data-testid="footer-facebook"]');
    this.twitterLink = page.locator('[data-testid="footer-twitter"]');
    this.linkedinLink = page.locator('[data-testid="footer-linkedin"]');
    this.githubLink = page.locator('[data-testid="footer-github"]');
    
    // Newsletter
    this.newsletterForm = page.locator('[data-testid="footer-newsletter-form"]');
    this.newsletterInput = page.locator('[data-testid="footer-newsletter-input"]');
    this.newsletterSubmit = page.locator('[data-testid="footer-newsletter-submit"]');
    
    // Copyright
    this.copyrightText = page.locator('[data-testid="footer-copyright"]');
  }

  /**
   * Check if footer is visible
   */
  async isFooterVisible(): Promise<boolean> {
    return await this.footer.isVisible();
  }

  /**
   * Navigate to jobs from footer
   */
  async goToJobs() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.jobsLink.click();
    await this.waitForNavigation(/\/jobs/);
  }

  /**
   * Navigate to members from footer
   */
  async goToMembers() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.membersLink.click();
    await this.waitForNavigation(/\/members/);
  }

  /**
   * Navigate to events from footer
   */
  async goToEvents() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.eventsLink.click();
    await this.waitForNavigation(/\/events/);
  }

  /**
   * Navigate to resources from footer
   */
  async goToResources() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.resourcesLink.click();
    await this.waitForNavigation(/\/resources/);
  }

  /**
   * Navigate to help center
   */
  async goToHelpCenter() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.helpCenterLink.click();
    await this.waitForNavigation(/\/help/);
  }

  /**
   * Navigate to contact page
   */
  async goToContact() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.contactLink.click();
    await this.waitForNavigation(/\/contact/);
  }

  /**
   * Navigate to FAQ
   */
  async goToFAQ() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.faqLink.click();
    await this.waitForNavigation(/\/faq/);
  }

  /**
   * Navigate to privacy policy
   */
  async goToPrivacyPolicy() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.privacyLink.click();
    await this.waitForNavigation(/\/privacy/);
  }

  /**
   * Navigate to terms of service
   */
  async goToTermsOfService() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.termsLink.click();
    await this.waitForNavigation(/\/terms/);
  }

  /**
   * Navigate to cookie policy
   */
  async goToCookiePolicy() {
    await this.scrollToElement('[data-testid="footer"]');
    await this.cookiesLink.click();
    await this.waitForNavigation(/\/cookies/);
  }

  /**
   * Open external social media link
   */
  async openSocialMedia(platform: 'facebook' | 'twitter' | 'linkedin' | 'github') {
    await this.scrollToElement('[data-testid="footer"]');
    
    // Handle external links in new tab
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.page.locator(`[data-testid="footer-${platform}"]`).click()
    ]);
    
    await newPage.waitForLoadState();
    return newPage;
  }

  /**
   * Subscribe to newsletter
   */
  async subscribeToNewsletter(email: string) {
    await this.scrollToElement('[data-testid="footer"]');
    await this.newsletterInput.fill(email);
    await this.newsletterSubmit.click();
    
    // Wait for success message or API response
    await this.waitForAPIResponse(/newsletter|subscribe/);
  }

  /**
   * Get copyright text
   */
  async getCopyrightText(): Promise<string> {
    await this.scrollToElement('[data-testid="footer"]');
    return await this.copyrightText.textContent() || '';
  }

  /**
   * Check if all footer sections are present
   */
  async validateFooterStructure(): Promise<boolean> {
    await this.scrollToElement('[data-testid="footer"]');
    
    const sections = [
      this.platformSection,
      this.communitySection,
      this.supportSection,
      this.legalSection
    ];
    
    for (const section of sections) {
      if (!await section.isVisible()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get all footer links
   */
  async getAllFooterLinks(): Promise<Array<{ text: string; href: string }>> {
    await this.scrollToElement('[data-testid="footer"]');
    
    const links = await this.footer.locator('a').all();
    const linkData: Array<{ text: string; href: string }> = [];
    
    for (const link of links) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      
      if (text && href) {
        linkData.push({ text: text.trim(), href });
      }
    }
    
    return linkData;
  }

  /**
   * Check if footer is sticky
   */
  async isFooterSticky(): Promise<boolean> {
    const position = await this.footer.evaluate(el => {
      return window.getComputedStyle(el).position;
    });
    
    return position === 'fixed' || position === 'sticky';
  }

  /**
   * Validate footer accessibility
   */
  async validateFooterAccessibility(): Promise<boolean> {
    // Check for proper heading structure
    const headings = await this.footer.locator('h2, h3, h4').count();
    if (headings === 0) return false;
    
    // Check for link accessibility
    const links = await this.footer.locator('a').all();
    for (const link of links) {
      const ariaLabel = await link.getAttribute('aria-label');
      const text = await link.textContent();
      
      if (!ariaLabel && !text?.trim()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check newsletter form validation
   */
  async validateNewsletterForm(invalidEmail: string): Promise<boolean> {
    await this.scrollToElement('[data-testid="footer"]');
    
    // Try submitting with invalid email
    await this.newsletterInput.fill(invalidEmail);
    await this.newsletterSubmit.click();
    
    // Check for validation error
    const errorMessage = await this.page.locator('[data-testid="newsletter-error"]').isVisible();
    
    return errorMessage;
  }

  /**
   * Get footer background color
   */
  async getFooterBackgroundColor(): Promise<string> {
    return await this.footer.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
  }

  /**
   * Check if footer has correct contrast ratio
   */
  async checkFooterContrast(): Promise<boolean> {
    // This would integrate with accessibility testing tools
    // Placeholder for now
    return true;
  }
}