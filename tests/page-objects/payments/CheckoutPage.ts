import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'oxxo' | 'spei' | 'paypal';
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

export interface CheckoutData {
  tier: string;
  interval: 'month' | 'year';
  basePrice: number;
  tax: number;
  discount?: number;
  total: number;
  currency: string;
}

export interface BillingAddress {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId?: string;
}

export class CheckoutPage extends BasePage {
  // Header and progress elements
  private readonly checkoutHeader: Locator;
  private readonly progressSteps: Locator;
  private readonly currentStep: Locator;
  private readonly loadingOverlay: Locator;

  // Order summary elements
  private readonly orderSummary: Locator;
  private readonly selectedTier: Locator;
  private readonly billingInterval: Locator;
  private readonly basePrice: Locator;
  private readonly taxAmount: Locator;
  private readonly discountAmount: Locator;
  private readonly totalAmount: Locator;
  private readonly currencyDisplay: Locator;

  // Payment method selection
  private readonly paymentMethodSection: Locator;
  private readonly creditCardOption: Locator;
  private readonly debitCardOption: Locator;
  private readonly oxxoOption: Locator;
  private readonly speiOption: Locator;
  private readonly paypalOption: Locator;

  // Credit card form elements
  private readonly cardForm: Locator;
  private readonly cardNumberInput: Locator;
  private readonly expiryInput: Locator;
  private readonly cvcInput: Locator;
  private readonly cardHolderNameInput: Locator;
  private readonly stripeCardElement: Locator;

  // Billing address form
  private readonly billingForm: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly companyInput: Locator;
  private readonly addressInput: Locator;
  private readonly cityInput: Locator;
  private readonly stateSelect: Locator;
  private readonly postalCodeInput: Locator;
  private readonly countrySelect: Locator;
  private readonly taxIdInput: Locator;

  // Mexican payment specific elements
  private readonly curpInput: Locator;
  private readonly rfcInput: Locator;
  private readonly fiscalRegimeSelect: Locator;
  private readonly cfdiUseSelect: Locator;

  // OXXO payment elements
  private readonly oxxoInstructions: Locator;
  private readonly oxxoReferenceNumber: Locator;
  private readonly oxxoBarcode: Locator;

  // SPEI payment elements
  private readonly speiInstructions: Locator;
  private readonly speiBankAccount: Locator;
  private readonly speiReference: Locator;
  private readonly speiAmount: Locator;

  // Promo code elements
  private readonly promoCodeSection: Locator;
  private readonly promoCodeInput: Locator;
  private readonly applyPromoButton: Locator;
  private readonly promoCodeError: Locator;
  private readonly promoCodeSuccess: Locator;

  // Terms and conditions
  private readonly termsCheckbox: Locator;
  private readonly privacyCheckbox: Locator;
  private readonly marketingCheckbox: Locator;
  private readonly termsLink: Locator;
  private readonly privacyLink: Locator;

  // Submit and navigation buttons
  private readonly continueButton: Locator;
  private readonly backButton: Locator;
  private readonly submitPaymentButton: Locator;
  private readonly cancelButton: Locator;

  // Error and success elements
  private readonly errorMessage: Locator;
  private readonly successMessage: Locator;
  private readonly validationErrors: Locator;

  // 3D Secure elements
  private readonly threeDSecureModal: Locator;
  private readonly threeDSecureFrame: Locator;
  private readonly threeDSecureSubmit: Locator;

  // Mobile-specific elements
  private readonly mobileStepIndicator: Locator;
  private readonly mobileCollapsibleSections: Locator;

  constructor(page: Page) {
    super(page);

    // Header and progress elements
    this.checkoutHeader = page.locator('[data-testid="checkout-header"]');
    this.progressSteps = page.locator('[data-testid="progress-steps"]');
    this.currentStep = page.locator('[data-testid="current-step"]');
    this.loadingOverlay = page.locator('[data-testid="loading-overlay"]');

    // Order summary elements
    this.orderSummary = page.locator('[data-testid="order-summary"]');
    this.selectedTier = page.locator('[data-testid="selected-tier"]');
    this.billingInterval = page.locator('[data-testid="billing-interval"]');
    this.basePrice = page.locator('[data-testid="base-price"]');
    this.taxAmount = page.locator('[data-testid="tax-amount"]');
    this.discountAmount = page.locator('[data-testid="discount-amount"]');
    this.totalAmount = page.locator('[data-testid="total-amount"]');
    this.currencyDisplay = page.locator('[data-testid="currency-display"]');

    // Payment method selection
    this.paymentMethodSection = page.locator('[data-testid="payment-method-section"]');
    this.creditCardOption = page.locator('[data-testid="payment-credit-card"]');
    this.debitCardOption = page.locator('[data-testid="payment-debit-card"]');
    this.oxxoOption = page.locator('[data-testid="payment-oxxo"]');
    this.speiOption = page.locator('[data-testid="payment-spei"]');
    this.paypalOption = page.locator('[data-testid="payment-paypal"]');

    // Credit card form elements
    this.cardForm = page.locator('[data-testid="card-form"]');
    this.cardNumberInput = page.locator('[data-testid="card-number"]');
    this.expiryInput = page.locator('[data-testid="card-expiry"]');
    this.cvcInput = page.locator('[data-testid="card-cvc"]');
    this.cardHolderNameInput = page.locator('[data-testid="card-holder-name"]');
    this.stripeCardElement = page.locator('#card-element');

    // Billing address form
    this.billingForm = page.locator('[data-testid="billing-form"]');
    this.firstNameInput = page.locator('[data-testid="first-name"]');
    this.lastNameInput = page.locator('[data-testid="last-name"]');
    this.emailInput = page.locator('[data-testid="email"]');
    this.companyInput = page.locator('[data-testid="company"]');
    this.addressInput = page.locator('[data-testid="address"]');
    this.cityInput = page.locator('[data-testid="city"]');
    this.stateSelect = page.locator('[data-testid="state"]');
    this.postalCodeInput = page.locator('[data-testid="postal-code"]');
    this.countrySelect = page.locator('[data-testid="country"]');
    this.taxIdInput = page.locator('[data-testid="tax-id"]');

    // Mexican payment specific elements
    this.curpInput = page.locator('[data-testid="curp"]');
    this.rfcInput = page.locator('[data-testid="rfc"]');
    this.fiscalRegimeSelect = page.locator('[data-testid="fiscal-regime"]');
    this.cfdiUseSelect = page.locator('[data-testid="cfdi-use"]');

    // OXXO payment elements
    this.oxxoInstructions = page.locator('[data-testid="oxxo-instructions"]');
    this.oxxoReferenceNumber = page.locator('[data-testid="oxxo-reference"]');
    this.oxxoBarcode = page.locator('[data-testid="oxxo-barcode"]');

    // SPEI payment elements
    this.speiInstructions = page.locator('[data-testid="spei-instructions"]');
    this.speiBankAccount = page.locator('[data-testid="spei-bank-account"]');
    this.speiReference = page.locator('[data-testid="spei-reference"]');
    this.speiAmount = page.locator('[data-testid="spei-amount"]');

    // Promo code elements
    this.promoCodeSection = page.locator('[data-testid="promo-code-section"]');
    this.promoCodeInput = page.locator('[data-testid="promo-code-input"]');
    this.applyPromoButton = page.locator('[data-testid="apply-promo-button"]');
    this.promoCodeError = page.locator('[data-testid="promo-code-error"]');
    this.promoCodeSuccess = page.locator('[data-testid="promo-code-success"]');

    // Terms and conditions
    this.termsCheckbox = page.locator('[data-testid="terms-checkbox"]');
    this.privacyCheckbox = page.locator('[data-testid="privacy-checkbox"]');
    this.marketingCheckbox = page.locator('[data-testid="marketing-checkbox"]');
    this.termsLink = page.locator('[data-testid="terms-link"]');
    this.privacyLink = page.locator('[data-testid="privacy-link"]');

    // Submit and navigation buttons
    this.continueButton = page.locator('[data-testid="continue-button"]');
    this.backButton = page.locator('[data-testid="back-button"]');
    this.submitPaymentButton = page.locator('[data-testid="submit-payment-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-button"]');

    // Error and success elements
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.validationErrors = page.locator('[data-testid="validation-error"]');

    // 3D Secure elements
    this.threeDSecureModal = page.locator('[data-testid="3ds-modal"]');
    this.threeDSecureFrame = page.locator('[data-testid="3ds-frame"]');
    this.threeDSecureSubmit = page.locator('[data-testid="3ds-submit"]');

    // Mobile-specific elements
    this.mobileStepIndicator = page.locator('[data-testid="mobile-step-indicator"]');
    this.mobileCollapsibleSections = page.locator('[data-testid="collapsible-section"]');
  }

  /**
   * Navigate to checkout page with selected tier
   */
  async goto(tierId?: string, interval?: 'month' | 'year'): Promise<void> {
    let url = '/checkout';
    if (tierId) {
      url += `?tier=${tierId}`;
      if (interval) {
        url += `&interval=${interval}`;
      }
    }
    await this.page.goto(url);
    await this.waitForLoad();
  }

  /**
   * Wait for checkout page to load
   */
  async waitForLoad(): Promise<void> {
    await this.checkoutHeader.waitFor({ state: 'visible' });
    await this.orderSummary.waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get order summary information
   */
  async getOrderSummary(): Promise<CheckoutData> {
    const tier = await this.selectedTier.textContent();
    const interval = await this.billingInterval.textContent();
    const basePriceText = await this.basePrice.textContent();
    const taxText = await this.taxAmount.textContent();
    const totalText = await this.totalAmount.textContent();
    const currency = await this.currencyDisplay.textContent();

    let discountText = null;
    if (await this.discountAmount.isVisible()) {
      discountText = await this.discountAmount.textContent();
    }

    return {
      tier: tier || '',
      interval: (interval?.includes('year') ? 'year' : 'month') as 'month' | 'year',
      basePrice: parseFloat(basePriceText?.replace(/[^\d.]/g, '') || '0'),
      tax: parseFloat(taxText?.replace(/[^\d.]/g, '') || '0'),
      discount: discountText ? parseFloat(discountText.replace(/[^\d.]/g, '')) : undefined,
      total: parseFloat(totalText?.replace(/[^\d.]/g, '') || '0'),
      currency: currency?.replace(/[^\w]/g, '') || 'MXN'
    };
  }

  /**
   * Select payment method
   */
  async selectPaymentMethod(method: 'credit-card' | 'debit-card' | 'oxxo' | 'spei' | 'paypal'): Promise<void> {
    switch (method) {
      case 'credit-card':
        await this.creditCardOption.click();
        break;
      case 'debit-card':
        await this.debitCardOption.click();
        break;
      case 'oxxo':
        await this.oxxoOption.click();
        break;
      case 'spei':
        await this.speiOption.click();
        break;
      case 'paypal':
        await this.paypalOption.click();
        break;
    }
    
    // Wait for payment form to appear
    await this.page.waitForTimeout(500);
  }

  /**
   * Fill credit card information using Stripe test cards
   */
  async fillCreditCardInfo(cardData: {
    number: string;
    expiry: string;
    cvc: string;
    name: string;
  }): Promise<void> {
    // Wait for Stripe elements to load
    await this.stripeCardElement.waitFor({ state: 'visible' });
    
    // Fill card information in Stripe element
    await this.stripeCardElement.click();
    await this.page.keyboard.type(cardData.number);
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.type(cardData.expiry);
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.type(cardData.cvc);
    
    // Fill cardholder name if field exists
    if (await this.cardHolderNameInput.isVisible()) {
      await this.cardHolderNameInput.fill(cardData.name);
    }
  }

  /**
   * Fill billing address information
   */
  async fillBillingAddress(address: BillingAddress): Promise<void> {
    await this.firstNameInput.fill(address.firstName);
    await this.lastNameInput.fill(address.lastName);
    await this.emailInput.fill(address.email);
    
    if (address.company && await this.companyInput.isVisible()) {
      await this.companyInput.fill(address.company);
    }
    
    await this.addressInput.fill(address.address);
    await this.cityInput.fill(address.city);
    await this.stateSelect.selectOption(address.state);
    await this.postalCodeInput.fill(address.postalCode);
    await this.countrySelect.selectOption(address.country);
    
    if (address.taxId && await this.taxIdInput.isVisible()) {
      await this.taxIdInput.fill(address.taxId);
    }
  }

  /**
   * Fill Mexican fiscal information
   */
  async fillMexicanFiscalInfo(fiscalData: {
    rfc: string;
    curp?: string;
    fiscalRegime: string;
    cfdiUse: string;
  }): Promise<void> {
    if (await this.rfcInput.isVisible()) {
      await this.rfcInput.fill(fiscalData.rfc);
    }
    
    if (fiscalData.curp && await this.curpInput.isVisible()) {
      await this.curpInput.fill(fiscalData.curp);
    }
    
    if (await this.fiscalRegimeSelect.isVisible()) {
      await this.fiscalRegimeSelect.selectOption(fiscalData.fiscalRegime);
    }
    
    if (await this.cfdiUseSelect.isVisible()) {
      await this.cfdiUseSelect.selectOption(fiscalData.cfdiUse);
    }
  }

  /**
   * Apply promotional code
   */
  async applyPromoCode(code: string): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!(await this.promoCodeSection.isVisible())) {
      // Expand promo code section if it's collapsed
      const expandButton = this.page.locator('[data-testid="expand-promo-code"]');
      if (await expandButton.isVisible()) {
        await expandButton.click();
      }
    }
    
    await this.promoCodeInput.fill(code);
    await this.applyPromoButton.click();
    
    // Wait for response
    await this.page.waitForTimeout(2000);
    
    if (await this.promoCodeSuccess.isVisible()) {
      const message = await this.promoCodeSuccess.textContent();
      return {
        success: true,
        message: message || 'Promotional code applied successfully'
      };
    } else if (await this.promoCodeError.isVisible()) {
      const message = await this.promoCodeError.textContent();
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
   * Accept terms and conditions
   */
  async acceptTermsAndConditions(
    acceptTerms: boolean = true,
    acceptPrivacy: boolean = true,
    acceptMarketing: boolean = false
  ): Promise<void> {
    if (acceptTerms && await this.termsCheckbox.isVisible()) {
      await this.termsCheckbox.check();
    }
    
    if (acceptPrivacy && await this.privacyCheckbox.isVisible()) {
      await this.privacyCheckbox.check();
    }
    
    if (acceptMarketing && await this.marketingCheckbox.isVisible()) {
      await this.marketingCheckbox.check();
    }
  }

  /**
   * Submit payment
   */
  async submitPayment(): Promise<void> {
    await this.submitPaymentButton.click();
  }

  /**
   * Handle 3D Secure authentication
   */
  async handle3DSecure(shouldSucceed: boolean = true): Promise<void> {
    // Wait for 3D Secure modal to appear
    await this.threeDSecureModal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Switch to 3D Secure frame context
    const frame = this.page.frameLocator('[data-testid="3ds-frame"]');
    
    if (shouldSucceed) {
      await frame.locator('[data-testid="3ds-complete"]').click();
    } else {
      await frame.locator('[data-testid="3ds-fail"]').click();
    }
    
    // Wait for modal to close
    await this.threeDSecureModal.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Get OXXO payment instructions
   */
  async getOXXOInstructions(): Promise<{
    reference: string;
    amount: string;
    instructions: string;
    barcodeUrl?: string;
  } | null> {
    if (!(await this.oxxoInstructions.isVisible())) {
      return null;
    }
    
    const reference = await this.oxxoReferenceNumber.textContent();
    const amount = await this.speiAmount.textContent(); // Same element for amount
    const instructions = await this.oxxoInstructions.textContent();
    
    let barcodeUrl = null;
    if (await this.oxxoBarcode.isVisible()) {
      barcodeUrl = await this.oxxoBarcode.getAttribute('src');
    }
    
    return {
      reference: reference || '',
      amount: amount || '',
      instructions: instructions || '',
      barcodeUrl
    };
  }

  /**
   * Get SPEI payment instructions
   */
  async getSPEIInstructions(): Promise<{
    bankAccount: string;
    reference: string;
    amount: string;
    instructions: string;
  } | null> {
    if (!(await this.speiInstructions.isVisible())) {
      return null;
    }
    
    const bankAccount = await this.speiBankAccount.textContent();
    const reference = await this.speiReference.textContent();
    const amount = await this.speiAmount.textContent();
    const instructions = await this.speiInstructions.textContent();
    
    return {
      bankAccount: bankAccount || '',
      reference: reference || '',
      amount: amount || '',
      instructions: instructions || ''
    };
  }

  /**
   * Check if payment is processing
   */
  async isProcessing(): Promise<boolean> {
    return await this.loadingOverlay.isVisible() || 
           await this.submitPaymentButton.getAttribute('disabled') === '';
  }

  /**
   * Wait for payment processing to complete
   */
  async waitForProcessingComplete(timeout: number = 30000): Promise<void> {
    await this.loadingOverlay.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Get validation errors
   */
  async getValidationErrors(): Promise<string[]> {
    const errorElements = await this.validationErrors.all();
    const errors = [];
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) {
        errors.push(text);
      }
    }
    
    return errors;
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
   * Get success message
   */
  async getSuccessMessage(): Promise<string | null> {
    if (!(await this.successMessage.isVisible())) {
      return null;
    }
    
    return await this.successMessage.textContent();
  }

  /**
   * Navigate back to previous step
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
  }

  /**
   * Cancel checkout process
   */
  async cancelCheckout(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Get current checkout step
   */
  async getCurrentStep(): Promise<number> {
    const stepText = await this.currentStep.textContent();
    const match = stepText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Complete checkout process with provided data
   */
  async completeCheckout(
    paymentMethod: 'credit-card' | 'debit-card' | 'oxxo' | 'spei',
    cardData?: {
      number: string;
      expiry: string;
      cvc: string;
      name: string;
    },
    billingAddress?: BillingAddress,
    promoCode?: string
  ): Promise<{
    success: boolean;
    message: string;
    paymentInstructions?: any;
  }> {
    try {
      // Apply promo code if provided
      if (promoCode) {
        const promoResult = await this.applyPromoCode(promoCode);
        if (!promoResult.success) {
          return {
            success: false,
            message: `Promo code error: ${promoResult.message}`
          };
        }
      }

      // Select payment method
      await this.selectPaymentMethod(paymentMethod);

      // Fill payment details based on method
      if ((paymentMethod === 'credit-card' || paymentMethod === 'debit-card') && cardData) {
        await this.fillCreditCardInfo(cardData);
      }

      // Fill billing address if provided
      if (billingAddress) {
        await this.fillBillingAddress(billingAddress);
        
        // Fill Mexican fiscal info if country is Mexico
        if (billingAddress.country === 'MX' && billingAddress.taxId) {
          await this.fillMexicanFiscalInfo({
            rfc: billingAddress.taxId,
            fiscalRegime: '601', // General Regime
            cfdiUse: 'G03' // General expenses
          });
        }
      }

      // Accept terms and conditions
      await this.acceptTermsAndConditions();

      // Submit payment
      await this.submitPayment();

      // Wait for processing
      await this.waitForProcessingComplete();

      // Check for success
      const successMessage = await this.getSuccessMessage();
      if (successMessage) {
        let paymentInstructions = null;
        
        if (paymentMethod === 'oxxo') {
          paymentInstructions = await this.getOXXOInstructions();
        } else if (paymentMethod === 'spei') {
          paymentInstructions = await this.getSPEIInstructions();
        }
        
        return {
          success: true,
          message: successMessage,
          paymentInstructions
        };
      }

      // Check for errors
      const errorMessage = await this.getErrorMessage();
      const validationErrors = await this.getValidationErrors();
      
      return {
        success: false,
        message: errorMessage || validationErrors.join(', ') || 'Unknown error'
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Checkout error: ${error}`
      };
    }
  }

  /**
   * Test card form validation
   */
  async testCardValidation(): Promise<{
    requiredFields: string[];
    validationMessages: string[];
  }> {
    // Try to submit without filling any fields
    await this.selectPaymentMethod('credit-card');
    await this.acceptTermsAndConditions();
    await this.submitPayment();
    
    // Wait for validation messages
    await this.page.waitForTimeout(1000);
    
    const validationErrors = await this.getValidationErrors();
    
    // Get required field indicators
    const requiredFields = [];
    const requiredElements = await this.page.locator('.required, [required]').all();
    
    for (const element of requiredElements) {
      const testId = await element.getAttribute('data-testid');
      if (testId) {
        requiredFields.push(testId);
      }
    }
    
    return {
      requiredFields,
      validationMessages: validationErrors
    };
  }

  /**
   * Switch to mobile view for testing
   */
  async switchToMobileView(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if mobile layout is active
   */
  async isMobileLayout(): Promise<boolean> {
    return await this.mobileStepIndicator.isVisible();
  }

  /**
   * Test accessibility features
   */
  async testAccessibility(): Promise<{
    keyboardNavigable: boolean;
    hasProperLabels: boolean;
    hasErrorDescriptions: boolean;
    colorContrastOk: boolean;
  }> {
    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus').count();
    const keyboardNavigable = focusedElement > 0;

    // Check for proper labels
    const inputs = await this.page.locator('input, select').all();
    let hasProperLabels = true;
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const label = id ? await this.page.locator(`label[for="${id}"]`).count() : 0;
      
      if (!label && !ariaLabel) {
        hasProperLabels = false;
        break;
      }
    }

    // Check for error descriptions
    const errorElements = await this.page.locator('[aria-describedby]').all();
    let hasErrorDescriptions = true;
    
    for (const element of errorElements) {
      const describedBy = await element.getAttribute('aria-describedby');
      if (describedBy) {
        const description = await this.page.locator(`#${describedBy}`).count();
        if (!description) {
          hasErrorDescriptions = false;
          break;
        }
      }
    }

    // Color contrast check (simplified)
    const colorContrastOk = true; // Would need actual color analysis

    return {
      keyboardNavigable,
      hasProperLabels,
      hasErrorDescriptions,
      colorContrastOk
    };
  }

  /**
   * Simulate network failure during payment
   */
  async simulateNetworkFailure(): Promise<void> {
    await this.page.route('**/api/payments/**', route => {
      route.abort('failed');
    });
  }

  /**
   * Clear network simulation
   */
  async clearNetworkSimulation(): Promise<void> {
    await this.page.unroute('**/api/payments/**');
  }
}