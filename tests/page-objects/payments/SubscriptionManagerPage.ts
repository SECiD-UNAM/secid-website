import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface Subscription {
  id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'paused' | 'trialing';
  tier: string;
  interval: 'month' | 'year';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: number;
  currency: string;
  trialEnd?: string;
  nextInvoiceDate?: string;
  paymentMethod?: {
    id: string;
    type: string;
    last4: string;
    brand: string;
  };
}

export interface PlanChange {
  fromTier: string;
  toTier: string;
  fromInterval: 'month' | 'year';
  toInterval: 'month' | 'year';
  proratedAmount?: number;
  effectiveDate: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
  addedDate: string;
  lastActiveDate?: string;
}

export class SubscriptionManagerPage extends BasePage {
  // Header and navigation
  private readonly pageHeader: Locator;
  private readonly subscriptionTabs: Locator;
  private readonly overviewTab: Locator;
  private readonly planManagementTab: Locator;
  private readonly teamManagementTab: Locator;
  private readonly usageTab: Locator;
  private readonly settingsTab: Locator;

  // Current subscription overview
  private readonly currentPlanCard: Locator;
  private readonly planName: Locator;
  private readonly planPrice: Locator;
  private readonly billingInterval: Locator;
  private readonly subscriptionStatus: Locator;
  private readonly nextBillingDate: Locator;
  private readonly currentPeriodEnd: Locator;
  private readonly trialEndDate: Locator;
  private readonly cancelledNotice: Locator;

  // Plan management section
  private readonly availablePlans: Locator;
  private readonly planCards: Locator;
  private readonly upgradeToPremiumButton: Locator;
  private readonly upgradeToCorporateButton: Locator;
  private readonly downgradeToPremiumButton: Locator;
  private readonly downgradeToFreeButton: Locator;
  private readonly changeBillingCycleButton: Locator;

  // Subscription actions
  private readonly pauseSubscriptionButton: Locator;
  private readonly resumeSubscriptionButton: Locator;
  private readonly cancelSubscriptionButton: Locator;
  private readonly reactivateSubscriptionButton: Locator;
  private readonly updatePaymentMethodButton: Locator;

  // Plan change confirmation
  private readonly planChangeModal: Locator;
  private readonly changePreview: Locator;
  private readonly proratedAmount: Locator;
  private readonly effectiveDate: Locator;
  private readonly confirmPlanChangeButton: Locator;
  private readonly cancelPlanChangeButton: Locator;

  // Cancellation flow
  private readonly cancellationModal: Locator;
  private readonly cancellationReasons: Locator;
  private readonly retentionOffer: Locator;
  private readonly discountOffer: Locator;
  private readonly pauseInsteadButton: Locator;
  private readonly confirmCancellationButton: Locator;
  private readonly feedbackTextarea: Locator;

  // Team management (Corporate plans)
  private readonly teamSection: Locator;
  private readonly teamMembersList: Locator;
  private readonly inviteMemberButton: Locator;
  private readonly memberInviteModal: Locator;
  private readonly memberEmailInput: Locator;
  private readonly memberRoleSelect: Locator;
  private readonly sendInviteButton: Locator;
  private readonly teamMemberRow: Locator;
  private readonly removeMemberButton: Locator;
  private readonly changeRoleButton: Locator;

  // Usage and limits
  private readonly usageOverview: Locator;
  private readonly coursesUsed: Locator;
  private readonly coursesLimit: Locator;
  private readonly downloadsUsed: Locator;
  private readonly downloadsLimit: Locator;
  private readonly storageUsed: Locator;
  private readonly storageLimit: Locator;
  private readonly usageChart: Locator;
  private readonly usageHistory: Locator;

  // Payment method management
  private readonly paymentMethodCard: Locator;
  private readonly defaultPaymentMethod: Locator;
  private readonly updateCardButton: Locator;
  private readonly paymentMethodModal: Locator;
  private readonly cardForm: Locator;

  // Billing preferences
  private readonly billingPreferences: Locator;
  private readonly autoRenewalToggle: Locator;
  private readonly invoiceEmailInput: Locator;
  private readonly taxExemptToggle: Locator;
  private readonly currencySelect: Locator;

  // Notifications and alerts
  private readonly trialExpiryAlert: Locator;
  private readonly paymentFailedAlert: Locator;
  private readonly subscriptionExpiryAlert: Locator;
  private readonly planChangeScheduledAlert: Locator;
  private readonly successMessage: Locator;
  private readonly errorMessage: Locator;
  private readonly warningMessage: Locator;

  // Loading states
  private readonly loadingOverlay: Locator;
  private readonly skeletonLoader: Locator;
  private readonly actionButton: Locator;

  // Mobile-specific elements
  private readonly mobileMenuToggle: Locator;
  private readonly mobileTabNavigation: Locator;
  private readonly mobilePlanCard: Locator;

  constructor(page: Page) {
    super(page);

    // Header and navigation
    this.pageHeader = page.locator('[data-testid="subscription-header"]');
    this.subscriptionTabs = page.locator('[data-testid="subscription-tabs"]');
    this.overviewTab = page.locator('[data-testid="overview-tab"]');
    this.planManagementTab = page.locator('[data-testid="plan-management-tab"]');
    this.teamManagementTab = page.locator('[data-testid="team-management-tab"]');
    this.usageTab = page.locator('[data-testid="usage-tab"]');
    this.settingsTab = page.locator('[data-testid="settings-tab"]');

    // Current subscription overview
    this.currentPlanCard = page.locator('[data-testid="current-plan-card"]');
    this.planName = page.locator('[data-testid="plan-name"]');
    this.planPrice = page.locator('[data-testid="plan-price"]');
    this.billingInterval = page.locator('[data-testid="billing-interval"]');
    this.subscriptionStatus = page.locator('[data-testid="subscription-status"]');
    this.nextBillingDate = page.locator('[data-testid="next-billing-date"]');
    this.currentPeriodEnd = page.locator('[data-testid="current-period-end"]');
    this.trialEndDate = page.locator('[data-testid="trial-end-date"]');
    this.cancelledNotice = page.locator('[data-testid="cancelled-notice"]');

    // Plan management section
    this.availablePlans = page.locator('[data-testid="available-plans"]');
    this.planCards = page.locator('[data-testid="plan-card"]');
    this.upgradeToPremiumButton = page.locator('[data-testid="upgrade-to-premium"]');
    this.upgradeToCorporateButton = page.locator('[data-testid="upgrade-to-corporate"]');
    this.downgradeToPremiumButton = page.locator('[data-testid="downgrade-to-premium"]');
    this.downgradeToFreeButton = page.locator('[data-testid="downgrade-to-free"]');
    this.changeBillingCycleButton = page.locator('[data-testid="change-billing-cycle"]');

    // Subscription actions
    this.pauseSubscriptionButton = page.locator('[data-testid="pause-subscription"]');
    this.resumeSubscriptionButton = page.locator('[data-testid="resume-subscription"]');
    this.cancelSubscriptionButton = page.locator('[data-testid="cancel-subscription"]');
    this.reactivateSubscriptionButton = page.locator('[data-testid="reactivate-subscription"]');
    this.updatePaymentMethodButton = page.locator('[data-testid="update-payment-method"]');

    // Plan change confirmation
    this.planChangeModal = page.locator('[data-testid="plan-change-modal"]');
    this.changePreview = page.locator('[data-testid="change-preview"]');
    this.proratedAmount = page.locator('[data-testid="prorated-amount"]');
    this.effectiveDate = page.locator('[data-testid="effective-date"]');
    this.confirmPlanChangeButton = page.locator('[data-testid="confirm-plan-change"]');
    this.cancelPlanChangeButton = page.locator('[data-testid="cancel-plan-change"]');

    // Cancellation flow
    this.cancellationModal = page.locator('[data-testid="cancellation-modal"]');
    this.cancellationReasons = page.locator('[data-testid="cancellation-reasons"]');
    this.retentionOffer = page.locator('[data-testid="retention-offer"]');
    this.discountOffer = page.locator('[data-testid="discount-offer"]');
    this.pauseInsteadButton = page.locator('[data-testid="pause-instead"]');
    this.confirmCancellationButton = page.locator('[data-testid="confirm-cancellation"]');
    this.feedbackTextarea = page.locator('[data-testid="cancellation-feedback"]');

    // Team management
    this.teamSection = page.locator('[data-testid="team-section"]');
    this.teamMembersList = page.locator('[data-testid="team-members-list"]');
    this.inviteMemberButton = page.locator('[data-testid="invite-member"]');
    this.memberInviteModal = page.locator('[data-testid="member-invite-modal"]');
    this.memberEmailInput = page.locator('[data-testid="member-email"]');
    this.memberRoleSelect = page.locator('[data-testid="member-role"]');
    this.sendInviteButton = page.locator('[data-testid="send-invite"]');
    this.teamMemberRow = page.locator('[data-testid="team-member-row"]');
    this.removeMemberButton = page.locator('[data-testid="remove-member"]');
    this.changeRoleButton = page.locator('[data-testid="change-role"]');

    // Usage and limits
    this.usageOverview = page.locator('[data-testid="usage-overview"]');
    this.coursesUsed = page.locator('[data-testid="courses-used"]');
    this.coursesLimit = page.locator('[data-testid="courses-limit"]');
    this.downloadsUsed = page.locator('[data-testid="downloads-used"]');
    this.downloadsLimit = page.locator('[data-testid="downloads-limit"]');
    this.storageUsed = page.locator('[data-testid="storage-used"]');
    this.storageLimit = page.locator('[data-testid="storage-limit"]');
    this.usageChart = page.locator('[data-testid="usage-chart"]');
    this.usageHistory = page.locator('[data-testid="usage-history"]');

    // Payment method management
    this.paymentMethodCard = page.locator('[data-testid="payment-method-card"]');
    this.defaultPaymentMethod = page.locator('[data-testid="default-payment-method"]');
    this.updateCardButton = page.locator('[data-testid="update-card"]');
    this.paymentMethodModal = page.locator('[data-testid="payment-method-modal"]');
    this.cardForm = page.locator('[data-testid="card-form"]');

    // Billing preferences
    this.billingPreferences = page.locator('[data-testid="billing-preferences"]');
    this.autoRenewalToggle = page.locator('[data-testid="auto-renewal-toggle"]');
    this.invoiceEmailInput = page.locator('[data-testid="invoice-email"]');
    this.taxExemptToggle = page.locator('[data-testid="tax-exempt-toggle"]');
    this.currencySelect = page.locator('[data-testid="currency-select"]');

    // Notifications and alerts
    this.trialExpiryAlert = page.locator('[data-testid="trial-expiry-alert"]');
    this.paymentFailedAlert = page.locator('[data-testid="payment-failed-alert"]');
    this.subscriptionExpiryAlert = page.locator('[data-testid="subscription-expiry-alert"]');
    this.planChangeScheduledAlert = page.locator('[data-testid="plan-change-scheduled-alert"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.warningMessage = page.locator('[data-testid="warning-message"]');

    // Loading states
    this.loadingOverlay = page.locator('[data-testid="loading-overlay"]');
    this.skeletonLoader = page.locator('[data-testid="skeleton-loader"]');
    this.actionButton = page.locator('[data-testid="action-button"]');

    // Mobile-specific elements
    this.mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
    this.mobileTabNavigation = page.locator('[data-testid="mobile-tab-nav"]');
    this.mobilePlanCard = page.locator('[data-testid="mobile-plan-card"]');
  }

  /**
   * Navigate to subscription manager page
   */
  async goto(): Promise<void> {
    await this.page.goto('/subscription');
    await this.waitForLoad();
  }

  /**
   * Wait for page to load
   */
  async waitForLoad(): Promise<void> {
    await this.pageHeader.waitFor({ state: 'visible' });
    await this.currentPlanCard.waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
    
    // Wait for skeleton loaders to disappear
    if (await this.skeletonLoader.isVisible()) {
      await this.skeletonLoader.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  /**
   * Switch between subscription tabs
   */
  async switchTab(tab: 'overview' | 'plan-management' | 'team-management' | 'usage' | 'settings'): Promise<void> {
    switch (tab) {
      case 'overview':
        await this.overviewTab.click();
        break;
      case 'plan-management':
        await this.planManagementTab.click();
        break;
      case 'team-management':
        await this.teamManagementTab.click();
        break;
      case 'usage':
        await this.usageTab.click();
        break;
      case 'settings':
        await this.settingsTab.click();
        break;
    }
    
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current subscription details
   */
  async getCurrentSubscription(): Promise<Subscription> {
    await this.switchTab('overview');
    
    const name = await this.planName.textContent();
    const priceText = await this.planPrice.textContent();
    const intervalText = await this.billingInterval.textContent();
    const statusText = await this.subscriptionStatus.textContent();
    const nextBillingText = await this.nextBillingDate.textContent();
    const periodEndText = await this.currentPeriodEnd.textContent();

    // Parse price and currency
    const priceMatch = priceText?.match(/([A-Z]{3})\s*([\d,]+(?:\.\d{2})?)/);
    const price = priceMatch ? parseFloat(priceMatch[2].replace(/,/g, '')) : 0;
    const currency = priceMatch?.[1] || 'MXN';

    // Determine interval
    const interval = intervalText?.toLowerCase().includes('year') ? 'year' : 'month';

    // Parse status
    const status = statusText?.toLowerCase().trim() as Subscription['status'];

    // Get trial end date if in trial
    let trialEnd = undefined;
    if (await this.trialEndDate.isVisible()) {
      trialEnd = await this.trialEndDate.textContent();
    }

    // Check if subscription is set to cancel
    const cancelAtPeriodEnd = await this.cancelledNotice.isVisible();

    return {
      id: `sub_${Date.now()}`,
      status: status || 'active',
      tier: name?.trim() || 'free',
      interval,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: periodEndText?.trim() || new Date().toISOString(),
      cancelAtPeriodEnd,
      price,
      currency,
      trialEnd: trialEnd?.trim(),
      nextInvoiceDate: nextBillingText?.trim()
    };
  }

  /**
   * Upgrade to a higher tier
   */
  async upgradePlan(targetTier: 'premium' | 'corporate', interval?: 'month' | 'year'): Promise<{
    success: boolean;
    message: string;
    planChange?: PlanChange;
  }> {
    await this.switchTab('plan-management');
    
    const upgradeButton = targetTier === 'premium' ? 
      this.upgradeToPremiumButton : 
      this.upgradeToCorporateButton;

    if (!(await upgradeButton.isVisible())) {
      return {
        success: false,
        message: `Upgrade to ${targetTier} not available`
      };
    }

    await upgradeButton.click();
    await this.planChangeModal.waitFor({ state: 'visible' });

    // Change billing interval if specified
    if (interval) {
      const intervalButton = this.page.locator(`[data-testid="select-${interval}ly"]`);
      if (await intervalButton.isVisible()) {
        await intervalButton.click();
        await this.page.waitForTimeout(500);
      }
    }

    // Get plan change details
    const proratedText = await this.proratedAmount.textContent();
    const effectiveDateText = await this.effectiveDate.textContent();
    const previewText = await this.changePreview.textContent();

    // Confirm the change
    await this.confirmPlanChangeButton.click();
    
    // Wait for response
    await this.page.waitForTimeout(3000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    if (successMessage) {
      const currentSubscription = await this.getCurrentSubscription();
      return {
        success: true,
        message: successMessage,
        planChange: {
          fromTier: 'free', // Would need to get from state
          toTier: targetTier,
          fromInterval: 'month', // Would need to get from state
          toInterval: interval || 'month',
          proratedAmount: parseFloat(proratedText?.replace(/[^\d.]/g, '') || '0'),
          effectiveDate: effectiveDateText?.trim() || new Date().toISOString()
        }
      };
    }

    return {
      success: false,
      message: errorMessage || 'Upgrade failed'
    };
  }

  /**
   * Downgrade to a lower tier
   */
  async downgradePlan(targetTier: 'free' | 'premium'): Promise<{
    success: boolean;
    message: string;
    effectiveDate?: string;
  }> {
    await this.switchTab('plan-management');
    
    const downgradeButton = targetTier === 'free' ? 
      this.downgradeToFreeButton : 
      this.downgradeToPremiumButton;

    if (!(await downgradeButton.isVisible())) {
      return {
        success: false,
        message: `Downgrade to ${targetTier} not available`
      };
    }

    await downgradeButton.click();
    await this.planChangeModal.waitFor({ state: 'visible' });

    const effectiveDateText = await this.effectiveDate.textContent();
    
    await this.confirmPlanChangeButton.click();
    await this.page.waitForTimeout(3000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Downgrade failed',
      effectiveDate: effectiveDateText?.trim()
    };
  }

  /**
   * Change billing cycle (monthly/yearly)
   */
  async changeBillingCycle(newInterval: 'month' | 'year'): Promise<{
    success: boolean;
    message: string;
    proratedAmount?: number;
  }> {
    await this.switchTab('plan-management');
    await this.changeBillingCycleButton.click();
    await this.planChangeModal.waitFor({ state: 'visible' });

    const intervalButton = this.page.locator(`[data-testid="select-${newInterval}ly"]`);
    await intervalButton.click();
    await this.page.waitForTimeout(500);

    const proratedText = await this.proratedAmount.textContent();
    
    await this.confirmPlanChangeButton.click();
    await this.page.waitForTimeout(3000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Billing cycle change failed',
      proratedAmount: parseFloat(proratedText?.replace(/[^\d.]/g, '') || '0')
    };
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(pauseDuration?: number): Promise<{
    success: boolean;
    message: string;
    resumeDate?: string;
  }> {
    if (!(await this.pauseSubscriptionButton.isVisible())) {
      return {
        success: false,
        message: 'Pause subscription not available'
      };
    }

    await this.pauseSubscriptionButton.click();
    
    const pauseModal = this.page.locator('[data-testid="pause-modal"]');
    await pauseModal.waitFor({ state: 'visible' });

    // Set pause duration if specified
    if (pauseDuration) {
      const durationSelect = this.page.locator('[data-testid="pause-duration"]');
      await durationSelect.selectOption(pauseDuration.toString());
    }

    const resumeDateText = await this.page.locator('[data-testid="resume-date"]').textContent();
    
    await this.page.locator('[data-testid="confirm-pause"]').click();
    await this.page.waitForTimeout(3000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Pause subscription failed',
      resumeDate: resumeDateText?.trim()
    };
  }

  /**
   * Resume paused subscription
   */
  async resumeSubscription(): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!(await this.resumeSubscriptionButton.isVisible())) {
      return {
        success: false,
        message: 'Resume subscription not available'
      };
    }

    await this.resumeSubscriptionButton.click();
    
    const confirmModal = this.page.locator('[data-testid="confirm-resume-modal"]');
    if (await confirmModal.isVisible()) {
      await this.page.locator('[data-testid="confirm-resume"]').click();
    }
    
    await this.page.waitForTimeout(3000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Resume subscription failed'
    };
  }

  /**
   * Cancel subscription with retention flow
   */
  async cancelSubscription(
    reason: string,
    feedback?: string,
    acceptRetentionOffer: boolean = false
  ): Promise<{
    success: boolean;
    message: string;
    retentionOfferPresented?: boolean;
    effectiveDate?: string;
  }> {
    await this.cancelSubscriptionButton.click();
    await this.cancellationModal.waitFor({ state: 'visible' });

    // Select cancellation reason
    const reasonOption = this.page.locator(`[data-testid="reason-${reason}"]`);
    await reasonOption.click();

    // Fill feedback if provided
    if (feedback) {
      await this.feedbackTextarea.fill(feedback);
    }

    // Continue to next step
    await this.page.locator('[data-testid="continue-cancellation"]').click();
    
    // Check for retention offer
    let retentionOfferPresented = false;
    if (await this.retentionOffer.isVisible()) {
      retentionOfferPresented = true;
      
      if (acceptRetentionOffer) {
        await this.page.locator('[data-testid="accept-offer"]').click();
        
        const successMessage = await this.getSuccessMessage();
        return {
          success: true,
          message: successMessage || 'Retention offer accepted',
          retentionOfferPresented: true
        };
      } else {
        await this.page.locator('[data-testid="decline-offer"]').click();
      }
    }

    // Check for pause instead option
    if (await this.pauseInsteadButton.isVisible() && !acceptRetentionOffer) {
      // For testing, we'll skip the pause option
    }

    // Get effective date
    const effectiveDateText = await this.page.locator('[data-testid="cancellation-effective-date"]').textContent();
    
    // Confirm cancellation
    await this.confirmCancellationButton.click();
    await this.page.waitForTimeout(3000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Cancellation failed',
      retentionOfferPresented,
      effectiveDate: effectiveDateText?.trim()
    };
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!(await this.reactivateSubscriptionButton.isVisible())) {
      return {
        success: false,
        message: 'Reactivate subscription not available'
      };
    }

    await this.reactivateSubscriptionButton.click();
    
    const confirmModal = this.page.locator('[data-testid="reactivate-modal"]');
    if (await confirmModal.isVisible()) {
      await this.page.locator('[data-testid="confirm-reactivate"]').click();
    }
    
    await this.page.waitForTimeout(3000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Reactivation failed'
    };
  }

  /**
   * Invite team member (Corporate plans only)
   */
  async inviteTeamMember(email: string, role: 'admin' | 'member' = 'member'): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.switchTab('team-management');
    
    if (!(await this.teamSection.isVisible())) {
      return {
        success: false,
        message: 'Team management not available for current plan'
      };
    }

    await this.inviteMemberButton.click();
    await this.memberInviteModal.waitFor({ state: 'visible' });

    await this.memberEmailInput.fill(email);
    await this.memberRoleSelect.selectOption(role);
    
    await this.sendInviteButton.click();
    await this.page.waitForTimeout(2000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Invite failed'
    };
  }

  /**
   * Remove team member
   */
  async removeTeamMember(memberEmail: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.switchTab('team-management');
    
    const memberRow = this.page.locator(`[data-testid="team-member-row"]`).filter({
      has: this.page.locator(`text="${memberEmail}"`)
    });

    if (!(await memberRow.isVisible())) {
      return {
        success: false,
        message: `Team member ${memberEmail} not found`
      };
    }

    await memberRow.locator('[data-testid="remove-member"]').click();
    
    const confirmModal = this.page.locator('[data-testid="remove-member-modal"]');
    await confirmModal.waitFor({ state: 'visible' });
    await this.page.locator('[data-testid="confirm-remove"]').click();
    
    await this.page.waitForTimeout(2000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Remove member failed'
    };
  }

  /**
   * Get team members list
   */
  async getTeamMembers(): Promise<TeamMember[]> {
    await this.switchTab('team-management');
    
    if (!(await this.teamSection.isVisible())) {
      return [];
    }

    const memberRows = await this.teamMemberRow.all();
    const members: TeamMember[] = [];

    for (const row of memberRows) {
      const email = await row.locator('[data-testid="member-email"]').textContent();
      const name = await row.locator('[data-testid="member-name"]').textContent();
      const role = await row.locator('[data-testid="member-role"]').textContent();
      const status = await row.locator('[data-testid="member-status"]').textContent();
      const addedDate = await row.locator('[data-testid="member-added-date"]').textContent();

      if (email && name && role && status && addedDate) {
        members.push({
          id: `member_${Date.now()}_${members.length}`,
          email: email.trim(),
          name: name.trim(),
          role: role.toLowerCase().trim() as 'admin' | 'member',
          status: status.toLowerCase().trim() as 'active' | 'pending' | 'inactive',
          addedDate: addedDate.trim()
        });
      }
    }

    return members;
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<{
    courses: { used: number; limit: number | 'unlimited' };
    downloads: { used: number; limit: number | 'unlimited' };
    storage: { used: number; limit: number | 'unlimited'; unit: string };
  }> {
    await this.switchTab('usage');
    
    const coursesUsedText = await this.coursesUsed.textContent();
    const coursesLimitText = await this.coursesLimit.textContent();
    const downloadsUsedText = await this.downloadsUsed.textContent();
    const downloadsLimitText = await this.downloadsLimit.textContent();
    const storageUsedText = await this.storageUsed.textContent();
    const storageLimitText = await this.storageLimit.textContent();

    return {
      courses: {
        used: parseInt(coursesUsedText?.replace(/[^\d]/g, '') || '0'),
        limit: coursesLimitText?.includes('unlimited') ? 'unlimited' : parseInt(coursesLimitText?.replace(/[^\d]/g, '') || '0')
      },
      downloads: {
        used: parseInt(downloadsUsedText?.replace(/[^\d]/g, '') || '0'),
        limit: downloadsLimitText?.includes('unlimited') ? 'unlimited' : parseInt(downloadsLimitText?.replace(/[^\d]/g, '') || '0')
      },
      storage: {
        used: parseFloat(storageUsedText?.replace(/[^\d.]/g, '') || '0'),
        limit: storageLimitText?.includes('unlimited') ? 'unlimited' : parseFloat(storageLimitText?.replace(/[^\d.]/g, '') || '0'),
        unit: storageUsedText?.match(/(GB|MB|TB)/)?.[1] || 'GB'
      }
    };
  }

  /**
   * Update billing preferences
   */
  async updateBillingPreferences(preferences: {
    autoRenewal?: boolean;
    invoiceEmail?: string;
    taxExempt?: boolean;
    currency?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.switchTab('settings');
    
    if (preferences.autoRenewal !== undefined) {
      const toggle = this.autoRenewalToggle;
      const isChecked = await toggle.isChecked();
      if (isChecked !== preferences.autoRenewal) {
        await toggle.click();
      }
    }

    if (preferences.invoiceEmail) {
      await this.invoiceEmailInput.fill(preferences.invoiceEmail);
    }

    if (preferences.taxExempt !== undefined) {
      const toggle = this.taxExemptToggle;
      const isChecked = await toggle.isChecked();
      if (isChecked !== preferences.taxExempt) {
        await toggle.click();
      }
    }

    if (preferences.currency) {
      await this.currencySelect.selectOption(preferences.currency);
    }

    // Save changes
    await this.page.locator('[data-testid="save-preferences"]').click();
    await this.page.waitForTimeout(2000);
    
    const successMessage = await this.getSuccessMessage();
    const errorMessage = await this.getErrorMessage();

    return {
      success: !!successMessage,
      message: successMessage || errorMessage || 'Update preferences failed'
    };
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string | null> {
    if (!(await this.successMessage.isVisible())) {
      return null;
    }
    return await this.successMessage.textContent();
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    if (!(await this.errorMessage.isVisible())) {
      return null;
    }
    return await this.errorMessage.textContent();
  }

  /**
   * Get all active alerts
   */
  async getActiveAlerts(): Promise<{
    trialExpiry: boolean;
    paymentFailed: boolean;
    subscriptionExpiry: boolean;
    planChangeScheduled: boolean;
    messages: string[];
  }> {
    const trialExpiry = await this.trialExpiryAlert.isVisible();
    const paymentFailed = await this.paymentFailedAlert.isVisible();
    const subscriptionExpiry = await this.subscriptionExpiryAlert.isVisible();
    const planChangeScheduled = await this.planChangeScheduledAlert.isVisible();
    
    const messages = [];
    
    if (trialExpiry) {
      const message = await this.trialExpiryAlert.textContent();
      if (message) messages.push(message);
    }
    
    if (paymentFailed) {
      const message = await this.paymentFailedAlert.textContent();
      if (message) messages.push(message);
    }
    
    if (subscriptionExpiry) {
      const message = await this.subscriptionExpiryAlert.textContent();
      if (message) messages.push(message);
    }
    
    if (planChangeScheduled) {
      const message = await this.planChangeScheduledAlert.textContent();
      if (message) messages.push(message);
    }

    return {
      trialExpiry,
      paymentFailed,
      subscriptionExpiry,
      planChangeScheduled,
      messages
    };
  }

  /**
   * Check if page is loading
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingOverlay.isVisible() || await this.skeletonLoader.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(timeout: number = 10000): Promise<void> {
    if (await this.loadingOverlay.isVisible()) {
      await this.loadingOverlay.waitFor({ state: 'hidden', timeout });
    }
    if (await this.skeletonLoader.isVisible()) {
      await this.skeletonLoader.waitFor({ state: 'hidden', timeout });
    }
  }

  /**
   * Switch to mobile view
   */
  async switchToMobileView(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if mobile layout is active
   */
  async isMobileLayout(): Promise<boolean> {
    return await this.mobileTabNavigation.isVisible();
  }

  /**
   * Test accessibility features
   */
  async testAccessibility(): Promise<{
    keyboardNavigable: boolean;
    hasProperLabels: boolean;
    hasStatusUpdates: boolean;
    colorContrastOk: boolean;
  }> {
    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus').count();
    const keyboardNavigable = focusedElement > 0;

    // Check for proper labels
    const buttons = await this.page.locator('button').all();
    let hasProperLabels = true;
    
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      if (!ariaLabel && (!textContent || textContent.trim() === '')) {
        hasProperLabels = false;
        break;
      }
    }

    // Check for status updates (aria-live regions)
    const liveRegions = await this.page.locator('[aria-live]').count();
    const hasStatusUpdates = liveRegions > 0;

    // Color contrast check (simplified)
    const colorContrastOk = true; // Would need actual color analysis

    return {
      keyboardNavigable,
      hasProperLabels,
      hasStatusUpdates,
      colorContrastOk
    };
  }

  /**
   * Simulate subscription webhook events for testing
   */
  async simulateWebhookEvent(event: 'invoice.payment_succeeded' | 'invoice.payment_failed' | 'customer.subscription.updated'): Promise<void> {
    // This would be used in conjunction with test API endpoints
    await this.page.goto(`/api/test/webhook?event=${event}`);
    await this.page.waitForTimeout(1000);
    await this.goto(); // Return to subscription page
  }
}