import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
  limits: {
    courses: number | 'unlimited';
    downloads: number | 'unlimited';
    support: 'basic' | 'priority' | 'dedicated';
  };
}

export class PricingPage extends BasePage {
  // Main pricing elements
  private readonly pricingHeader: Locator;
  private readonly billingToggle: Locator;
  private readonly monthlyButton: Locator;
  private readonly yearlyButton: Locator;
  private readonly tiersContainer: Locator;
  
  // Subscription tier elements
  private readonly freeTierCard: Locator;
  private readonly premiumTierCard: Locator;
  private readonly corporateTierCard: Locator;
  private readonly popularBadge: Locator;
  
  // Pricing display elements
  private readonly priceDisplay: Locator;
  private readonly savingsDisplay: Locator;
  private readonly currencySymbol: Locator;
  
  // Feature lists
  private readonly featureList: Locator;
  private readonly featureItem: Locator;
  private readonly limitsDisplay: Locator;
  
  // Action buttons
  private readonly selectTierButtons: Locator;
  private readonly getCurrentPlanButton: Locator;
  private readonly upgradeButton: Locator;
  private readonly downgradeButton: Locator;
  
  // Modal and overlay elements
  private readonly pricingModal: Locator;
  private readonly confirmUpgradeModal: Locator;
  private readonly loadingOverlay: Locator;
  
  // FAQ and additional info
  private readonly faqSection: Locator;
  private readonly comparisonTable: Locator;
  private readonly promoCodeInput: Locator;
  private readonly promoCodeButton: Locator;
  
  // Mexican tax elements
  private readonly taxNotice: Locator;
  private readonly ivaDisplay: Locator;
  private readonly totalWithTaxDisplay: Locator;

  constructor(page: Page) {
    super(page);
    
    // Main pricing elements
    this.pricingHeader = page.locator('[data-testid="pricing-header"]');
    this.billingToggle = page.locator('[data-testid="billing-toggle"]');
    this.monthlyButton = page.locator('[data-testid="monthly-button"]');
    this.yearlyButton = page.locator('[data-testid="yearly-button"]');
    this.tiersContainer = page.locator('[data-testid="tiers-container"]');
    
    // Subscription tier elements
    this.freeTierCard = page.locator('[data-testid="tier-free"]');
    this.premiumTierCard = page.locator('[data-testid="tier-premium"]');
    this.corporateTierCard = page.locator('[data-testid="tier-corporate"]');
    this.popularBadge = page.locator('[data-testid="popular-badge"]');
    
    // Pricing display elements
    this.priceDisplay = page.locator('[data-testid="price-display"]');
    this.savingsDisplay = page.locator('[data-testid="savings-display"]');
    this.currencySymbol = page.locator('[data-testid="currency-symbol"]');
    
    // Feature lists
    this.featureList = page.locator('[data-testid="feature-list"]');
    this.featureItem = page.locator('[data-testid="feature-item"]');
    this.limitsDisplay = page.locator('[data-testid="limits-display"]');
    
    // Action buttons
    this.selectTierButtons = page.locator('[data-testid^="select-tier-"]');
    this.getCurrentPlanButton = page.locator('[data-testid="current-plan-button"]');
    this.upgradeButton = page.locator('[data-testid="upgrade-button"]');
    this.downgradeButton = page.locator('[data-testid="downgrade-button"]');
    
    // Modal and overlay elements
    this.pricingModal = page.locator('[data-testid="pricing-modal"]');
    this.confirmUpgradeModal = page.locator('[data-testid="confirm-upgrade-modal"]');
    this.loadingOverlay = page.locator('[data-testid="loading-overlay"]');
    
    // FAQ and additional info
    this.faqSection = page.locator('[data-testid="faq-section"]');
    this.comparisonTable = page.locator('[data-testid="comparison-table"]');
    this.promoCodeInput = page.locator('[data-testid="promo-code-input"]');
    this.promoCodeButton = page.locator('[data-testid="promo-code-button"]');
    
    // Mexican tax elements
    this.taxNotice = page.locator('[data-testid="tax-notice"]');
    this.ivaDisplay = page.locator('[data-testid="iva-display"]');
    this.totalWithTaxDisplay = page.locator('[data-testid="total-with-tax"]');
  }

  /**
   * Navigate to the pricing page
   */
  async goto(): Promise<void> {
    await this.page.goto('/pricing');
    await this.waitForLoad();
  }

  /**
   * Wait for the pricing page to load completely
   */
  async waitForLoad(): Promise<void> {
    await this.pricingHeader.waitFor({ state: 'visible' });
    await this.tiersContainer.waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Switch between monthly and yearly billing
   */
  async switchBillingInterval(interval: 'monthly' | 'yearly'): Promise<void> {
    if (interval === 'monthly') {
      await this.monthlyButton.click();
    } else {
      await this.yearlyButton.click();
    }
    
    // Wait for pricing to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current billing interval
   */
  async getCurrentBillingInterval(): Promise<'monthly' | 'yearly'> {
    const monthlyActive = await this.monthlyButton.getAttribute('class');
    return monthlyActive?.includes('active') || monthlyActive?.includes('selected') ? 'monthly' : 'yearly';
  }

  /**
   * Select a subscription tier
   */
  async selectTier(tierName: 'free' | 'premium' | 'corporate'): Promise<void> {
    const button = this.page.locator(`[data-testid="select-tier-${tierName}"]`);
    await button.click();
  }

  /**
   * Get tier information
   */
  async getTierInfo(tierName: 'free' | 'premium' | 'corporate'): Promise<SubscriptionTier | null> {
    const tierCard = this.page.locator(`[data-testid="tier-${tierName}"]`);
    
    if (!(await tierCard.isVisible())) {
      return null;
    }

    const name = await tierCard.locator('[data-testid="tier-name"]').textContent();
    const priceText = await tierCard.locator('[data-testid="tier-price"]').textContent();
    const currency = await tierCard.locator('[data-testid="tier-currency"]').textContent();
    const interval = await this.getCurrentBillingInterval();
    
    // Extract features
    const featureElements = await tierCard.locator('[data-testid="feature-item"]').all();
    const features = await Promise.all(
      featureElements.map(el => el.textContent())
    );

    // Extract limits
    const coursesLimit = await tierCard.locator('[data-testid="courses-limit"]').textContent();
    const downloadsLimit = await tierCard.locator('[data-testid="downloads-limit"]').textContent();
    const supportLevel = await tierCard.locator('[data-testid="support-level"]').textContent();

    // Parse price
    const price = priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : 0;
    
    const isPopular = await tierCard.locator('[data-testid="popular-badge"]').isVisible();
    
    return {
      id: `${tierName}-${interval}`,
      name: name || tierName,
      price,
      currency: currency || 'MXN',
      interval: interval === 'monthly' ? 'month' : 'year',
      features: features.filter(f => f !== null) as string[],
      isPopular,
      isActive: true,
      limits: {
        courses: coursesLimit === 'unlimited' ? 'unlimited' : parseInt(coursesLimit || '0'),
        downloads: downloadsLimit === 'unlimited' ? 'unlimited' : parseInt(downloadsLimit || '0'),
        support: (supportLevel?.toLowerCase() as 'basic' | 'priority' | 'dedicated') || 'basic'
      }
    };
  }

  /**
   * Get all visible tiers
   */
  async getAllTiers(): Promise<SubscriptionTier[]> {
    const tiers: SubscriptionTier[] = [];
    
    for (const tierName of ['free', 'premium', 'corporate'] as const) {
      const tierInfo = await this.getTierInfo(tierName);
      if (tierInfo) {
        tiers.push(tierInfo);
      }
    }
    
    return tiers;
  }

  /**
   * Get price with tax calculation for Mexican users
   */
  async getPriceWithTax(tierName: 'free' | 'premium' | 'corporate'): Promise<{
    basePrice: number;
    iva: number;
    total: number;
    currency: string;
  } | null> {
    const tierCard = this.page.locator(`[data-testid="tier-${tierName}"]`);
    
    if (!(await tierCard.isVisible())) {
      return null;
    }

    const basePriceText = await tierCard.locator('[data-testid="base-price"]').textContent();
    const ivaText = await tierCard.locator('[data-testid="iva-amount"]').textContent();
    const totalText = await tierCard.locator('[data-testid="total-price"]').textContent();
    const currency = await tierCard.locator('[data-testid="currency"]').textContent();

    return {
      basePrice: parseFloat(basePriceText?.replace(/[^\d.]/g, '') || '0'),
      iva: parseFloat(ivaText?.replace(/[^\d.]/g, '') || '0'),
      total: parseFloat(totalText?.replace(/[^\d.]/g, '') || '0'),
      currency: currency || 'MXN'
    };
  }

  /**
   * Check if a tier is currently selected
   */
  async isTierSelected(tierName: 'free' | 'premium' | 'corporate'): Promise<boolean> {
    const tierCard = this.page.locator(`[data-testid="tier-${tierName}"]`);
    const classList = await tierCard.getAttribute('class');
    return classList?.includes('selected') || classList?.includes('active') || false;
  }

  /**
   * Get the current user's subscription status
   */
  async getCurrentSubscription(): Promise<{
    tier: string;
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    expiresAt?: string;
  } | null> {
    const currentPlanElement = this.page.locator('[data-testid="current-plan-info"]');
    
    if (!(await currentPlanElement.isVisible())) {
      return null;
    }

    const tier = await currentPlanElement.locator('[data-testid="current-tier"]').textContent();
    const status = await currentPlanElement.locator('[data-testid="subscription-status"]').textContent();
    const expiresAt = await currentPlanElement.locator('[data-testid="expires-at"]').textContent();

    return {
      tier: tier || 'free',
      status: (status?.toLowerCase() as any) || 'active',
      expiresAt: expiresAt || undefined
    };
  }

  /**
   * Apply a promotional code
   */
  async applyPromoCode(code: string): Promise<{
    success: boolean;
    message: string;
    discount?: {
      type: 'percentage' | 'fixed';
      value: number;
      currency?: string;
    };
  }> {
    await this.promoCodeInput.fill(code);
    await this.promoCodeButton.click();
    
    // Wait for response
    await this.page.waitForTimeout(2000);
    
    const successMessage = this.page.locator('[data-testid="promo-success-message"]');
    const errorMessage = this.page.locator('[data-testid="promo-error-message"]');
    
    if (await successMessage.isVisible()) {
      const message = await successMessage.textContent();
      const discountInfo = await this.getDiscountInfo();
      return {
        success: true,
        message: message || 'Promotional code applied successfully',
        discount: discountInfo
      };
    } else if (await errorMessage.isVisible()) {
      const message = await errorMessage.textContent();
      return {
        success: false,
        message: message || 'Invalid promotional code'
      };
    }
    
    return {
      success: false,
      message: 'Unknown error applying promotional code'
    };
  }

  /**
   * Get current discount information
   */
  async getDiscountInfo(): Promise<{
    type: 'percentage' | 'fixed';
    value: number;
    currency?: string;
  } | null> {
    const discountElement = this.page.locator('[data-testid="discount-info"]');
    
    if (!(await discountElement.isVisible())) {
      return null;
    }

    const discountText = await discountElement.textContent();
    
    if (discountText?.includes('%')) {
      return {
        type: 'percentage',
        value: parseFloat(discountText.replace(/[^\d.]/g, ''))
      };
    } else if (discountText?.includes('$') || discountText?.includes('MXN')) {
      return {
        type: 'fixed',
        value: parseFloat(discountText.replace(/[^\d.]/g, '')),
        currency: discountText.includes('MXN') ? 'MXN' : 'USD'
      };
    }
    
    return null;
  }

  /**
   * Check if yearly savings are displayed
   */
  async getYearlySavings(tierName: 'free' | 'premium' | 'corporate'): Promise<{
    amount: number;
    percentage: number;
    currency: string;
  } | null> {
    const tierCard = this.page.locator(`[data-testid="tier-${tierName}"]`);
    const savingsElement = tierCard.locator('[data-testid="yearly-savings"]');
    
    if (!(await savingsElement.isVisible())) {
      return null;
    }

    const savingsText = await savingsElement.textContent();
    const amountMatch = savingsText?.match(/(\d+(?:\.\d+)?)/);
    const percentageMatch = savingsText?.match(/(\d+)%/);
    const currency = savingsText?.includes('MXN') ? 'MXN' : 'USD';

    return {
      amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
      percentage: percentageMatch ? parseInt(percentageMatch[1]) : 0,
      currency
    };
  }

  /**
   * Check if the page is loading
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingOverlay.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(timeout: number = 10000): Promise<void> {
    await this.loadingOverlay.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Get FAQ section information
   */
  async getFAQItems(): Promise<Array<{ question: string; answer: string }>> {
    const faqItems = await this.faqSection.locator('[data-testid="faq-item"]').all();
    const faqs = [];
    
    for (const item of faqItems) {
      const question = await item.locator('[data-testid="faq-question"]').textContent();
      const answer = await item.locator('[data-testid="faq-answer"]').textContent();
      
      if (question && answer) {
        faqs.push({ question, answer });
      }
    }
    
    return faqs;
  }

  /**
   * Expand FAQ item
   */
  async expandFAQItem(index: number): Promise<void> {
    const faqItem = this.faqSection.locator('[data-testid="faq-item"]').nth(index);
    const question = faqItem.locator('[data-testid="faq-question"]');
    await question.click();
  }

  /**
   * Check if corporate tier has team features
   */
  async getCorporateTeamFeatures(): Promise<{
    teamSize: number;
    adminDashboard: boolean;
    userManagement: boolean;
    reporting: boolean;
  } | null> {
    const corporateCard = this.corporateTierCard;
    
    if (!(await corporateCard.isVisible())) {
      return null;
    }

    const teamSizeText = await corporateCard.locator('[data-testid="team-size"]').textContent();
    const teamSize = teamSizeText ? parseInt(teamSizeText.replace(/[^\d]/g, '')) : 0;
    
    const adminDashboard = await corporateCard.locator('[data-testid="admin-dashboard-feature"]').isVisible();
    const userManagement = await corporateCard.locator('[data-testid="user-management-feature"]').isVisible();
    const reporting = await corporateCard.locator('[data-testid="reporting-feature"]').isVisible();

    return {
      teamSize,
      adminDashboard,
      userManagement,
      reporting
    };
  }

  /**
   * Get comparison table data
   */
  async getComparisonTableData(): Promise<Array<{
    feature: string;
    free: boolean | string;
    premium: boolean | string;
    corporate: boolean | string;
  }>> {
    const table = this.comparisonTable;
    
    if (!(await table.isVisible())) {
      return [];
    }

    const rows = await table.locator('tbody tr').all();
    const comparison = [];
    
    for (const row of rows) {
      const feature = await row.locator('td').nth(0).textContent();
      const freeValue = await row.locator('td').nth(1).textContent();
      const premiumValue = await row.locator('td').nth(2).textContent();
      const corporateValue = await row.locator('td').nth(3).textContent();
      
      if (feature) {
        comparison.push({
          feature,
          free: this.parseTableValue(freeValue),
          premium: this.parseTableValue(premiumValue),
          corporate: this.parseTableValue(corporateValue)
        });
      }
    }
    
    return comparison;
  }

  /**
   * Parse table cell values (✓, ✗, numbers, text)
   */
  private parseTableValue(value: string | null): boolean | string {
    if (!value) return false;
    
    const trimmed = value.trim();
    if (trimmed === '✓' || trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'included') {
      return true;
    }
    if (trimmed === '✗' || trimmed.toLowerCase() === 'no' || trimmed.toLowerCase() === 'not included') {
      return false;
    }
    
    return trimmed;
  }

  /**
   * Check if Mexican tax notice is displayed
   */
  async isMexicanTaxNoticeVisible(): Promise<boolean> {
    return await this.taxNotice.isVisible();
  }

  /**
   * Get tax notice content
   */
  async getTaxNoticeContent(): Promise<string | null> {
    if (!(await this.taxNotice.isVisible())) {
      return null;
    }
    
    return await this.taxNotice.textContent();
  }

  /**
   * Simulate mobile view
   */
  async switchToMobileView(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Simulate desktop view
   */
  async switchToDesktopView(): Promise<void> {
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if tiers are displayed in mobile stacked layout
   */
  async isMobileLayout(): Promise<boolean> {
    const containerClass = await this.tiersContainer.getAttribute('class');
    return containerClass?.includes('mobile') || containerClass?.includes('stacked') || false;
  }

  /**
   * Get accessibility score for the pricing page
   */
  async getAccessibilityInfo(): Promise<{
    hasProperHeadings: boolean;
    hasAltText: boolean;
    hasAriaLabels: boolean;
    keyboardNavigable: boolean;
  }> {
    // Check for proper heading structure
    const h1Count = await this.page.locator('h1').count();
    const h2Count = await this.page.locator('h2').count();
    const hasProperHeadings = h1Count === 1 && h2Count >= 1;

    // Check for alt text on images
    const images = await this.page.locator('img').all();
    let hasAltText = true;
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (!alt || alt.trim() === '') {
        hasAltText = false;
        break;
      }
    }

    // Check for aria-labels on buttons
    const buttons = await this.page.locator('button').all();
    let hasAriaLabels = true;
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      if (!ariaLabel && (!textContent || textContent.trim() === '')) {
        hasAriaLabels = false;
        break;
      }
    }

    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus').count();
    const keyboardNavigable = focusedElement > 0;

    return {
      hasProperHeadings,
      hasAltText,
      hasAriaLabels,
      keyboardNavigable
    };
  }
}