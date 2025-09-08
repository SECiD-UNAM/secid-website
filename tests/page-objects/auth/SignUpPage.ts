import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TestUserData } from '../../utils/test-data-generator';

export class SignUpPage extends BasePage {
  // Form field locators
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly phoneInput: Locator;
  private readonly graduationYearSelect: Locator;
  private readonly degreeSelect: Locator;
  private readonly specializationSelect: Locator;
  
  // Checkbox and consent elements
  private readonly termsCheckbox: Locator;
  private readonly privacyCheckbox: Locator;
  private readonly marketingCheckbox: Locator;
  
  // Form interaction elements
  private readonly submitButton: Locator;
  private readonly loginLink: Locator;
  private readonly showPasswordToggle: Locator;
  private readonly showConfirmPasswordToggle: Locator;
  
  // Social registration buttons
  private readonly googleSignupButton: Locator;
  private readonly githubSignupButton: Locator;
  private readonly linkedinSignupButton: Locator;
  
  // Messages and feedback
  private readonly errorMessage: Locator;
  private readonly successMessage: Locator;
  private readonly loadingSpinner: Locator;
  
  // Validation messages
  private readonly emailValidationMessage: Locator;
  private readonly passwordValidationMessage: Locator;
  private readonly passwordStrengthIndicator: Locator;
  private readonly passwordMismatchMessage: Locator;
  
  // Progress indicator
  private readonly progressIndicator: Locator;
  private readonly progressStep: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Form fields
    this.firstNameInput = page.locator('[data-testid="signup-firstname"]');
    this.lastNameInput = page.locator('[data-testid="signup-lastname"]');
    this.emailInput = page.locator('[data-testid="signup-email"]');
    this.passwordInput = page.locator('[data-testid="signup-password"]');
    this.confirmPasswordInput = page.locator('[data-testid="signup-password-confirm"]');
    this.phoneInput = page.locator('[data-testid="signup-phone"]');
    this.graduationYearSelect = page.locator('[data-testid="signup-graduation-year"]');
    this.degreeSelect = page.locator('[data-testid="signup-degree"]');
    this.specializationSelect = page.locator('[data-testid="signup-specialization"]');
    
    // Consent checkboxes
    this.termsCheckbox = page.locator('[data-testid="signup-terms"]');
    this.privacyCheckbox = page.locator('[data-testid="signup-privacy"]');
    this.marketingCheckbox = page.locator('[data-testid="signup-marketing"]');
    
    // Form controls
    this.submitButton = page.locator('[data-testid="signup-submit"]');
    this.loginLink = page.locator('[data-testid="login-link"]');
    this.showPasswordToggle = page.locator('[data-testid="show-password-toggle"]');
    this.showConfirmPasswordToggle = page.locator('[data-testid="show-confirm-password-toggle"]');
    
    // Social registration
    this.googleSignupButton = page.locator('[data-testid="signup-google"]');
    this.githubSignupButton = page.locator('[data-testid="signup-github"]');
    this.linkedinSignupButton = page.locator('[data-testid="signup-linkedin"]');
    
    // Messages
    this.errorMessage = page.locator('[data-testid="signup-error"]');
    this.successMessage = page.locator('[data-testid="signup-success"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    
    // Validation messages
    this.emailValidationMessage = page.locator('[data-testid="email-validation"]');
    this.passwordValidationMessage = page.locator('[data-testid="password-validation"]');
    this.passwordStrengthIndicator = page.locator('[data-testid="password-strength"]');
    this.passwordMismatchMessage = page.locator('[data-testid="password-mismatch"]');
    
    // Progress
    this.progressIndicator = page.locator('[data-testid="signup-progress"]');
    this.progressStep = page.locator('[data-testid="progress-step"]');
  }

  /**
   * Navigate to signup page
   */
  async goto() {
    await this.navigate('/signup');
    await this.waitForPageLoad();
  }

  /**
   * Fill personal information section
   */
  async fillPersonalInfo(userData: TestUserData) {
    await this.firstNameInput.fill(userData.firstName);
    await this.lastNameInput.fill(userData.lastName);
    await this.emailInput.fill(userData.email);
    
    if (userData.phone) {
      await this.phoneInput.fill(userData.phone);
    }
  }

  /**
   * Fill password fields
   */
  async fillPasswordFields(password: string) {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
  }

  /**
   * Fill academic information
   */
  async fillAcademicInfo(userData: TestUserData) {
    if (userData.graduationYear) {
      await this.graduationYearSelect.selectOption(userData.graduationYear.toString());
    }
    
    if (userData.degree) {
      await this.degreeSelect.selectOption(userData.degree);
    }
    
    if (userData.specialization) {
      await this.specializationSelect.selectOption(userData.specialization);
    }
  }

  /**
   * Accept terms and conditions
   */
  async acceptTerms(includePrivacy: boolean = true, includeMarketing: boolean = false) {
    await this.termsCheckbox.check();
    
    if (includePrivacy) {
      await this.privacyCheckbox.check();
    }
    
    if (includeMarketing) {
      await this.marketingCheckbox.check();
    }
  }

  /**
   * Submit registration form
   */
  async submitForm() {
    await this.submitButton.click();
    
    // Wait for either success navigation or error message
    await Promise.race([
      this.page.waitForURL(/\/(onboarding|verify-email|dashboard)/, { timeout: 30000 }).catch(() => {}),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    ]);
  }

  /**
   * Complete full registration flow
   */
  async registerUser(userData: TestUserData, options?: {
    includeAcademicInfo?: boolean;
    includeMarketing?: boolean;
    submitForm?: boolean;
  }) {
    const {
      includeAcademicInfo = true,
      includeMarketing = false,
      submitForm = true
    } = options || {};

    // Fill personal information
    await this.fillPersonalInfo(userData);
    
    // Fill password
    await this.fillPasswordFields(userData.password);
    
    // Fill academic info if requested
    if (includeAcademicInfo) {
      await this.fillAcademicInfo(userData);
    }
    
    // Accept terms
    await this.acceptTerms(true, includeMarketing);
    
    // Submit if requested
    if (submitForm) {
      await this.submitForm();
    }
  }

  /**
   * Register with Google OAuth
   */
  async registerWithGoogle() {
    // Store current page context
    const pagePromise = this.page.context().waitForEvent('page');
    
    await this.googleSignupButton.click();
    
    // Wait for Google OAuth page
    const googlePage = await pagePromise;
    await googlePage.waitForLoadState();
    
    // Mock Google OAuth success
    await googlePage.close();
    
    // Wait for redirect to onboarding or dashboard
    await this.page.waitForURL(/\/(onboarding|dashboard|oauth-callback)/);
  }

  /**
   * Register with GitHub OAuth
   */
  async registerWithGitHub() {
    const pagePromise = this.page.context().waitForEvent('page');
    
    await this.githubSignupButton.click();
    
    const githubPage = await pagePromise;
    await githubPage.waitForLoadState();
    
    // Mock GitHub OAuth success
    await githubPage.close();
    
    await this.page.waitForURL(/\/(onboarding|dashboard|oauth-callback)/);
  }

  /**
   * Register with LinkedIn OAuth
   */
  async registerWithLinkedIn() {
    const pagePromise = this.page.context().waitForEvent('page');
    
    await this.linkedinSignupButton.click();
    
    const linkedinPage = await pagePromise;
    await linkedinPage.waitForLoadState();
    
    // Mock LinkedIn OAuth success
    await linkedinPage.close();
    
    await this.page.waitForURL(/\/(onboarding|dashboard|oauth-callback)/);
  }

  /**
   * Get current registration progress
   */
  async getRegistrationProgress(): Promise<number> {
    if (await this.progressIndicator.isVisible()) {
      const progressText = await this.progressIndicator.textContent();
      const match = progressText?.match(/(\d+)%/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  /**
   * Check password strength
   */
  async getPasswordStrength(): Promise<'weak' | 'medium' | 'strong' | null> {
    if (await this.passwordStrengthIndicator.isVisible()) {
      const strengthClass = await this.passwordStrengthIndicator.getAttribute('class');
      
      if (strengthClass?.includes('strong')) return 'strong';
      if (strengthClass?.includes('medium')) return 'medium';
      if (strengthClass?.includes('weak')) return 'weak';
    }
    return null;
  }

  /**
   * Validate form fields
   */
  async validateFormFields() {
    // Submit empty form to trigger validation
    await this.submitButton.click();
    
    const validationErrors = await this.page.evaluate(() => {
      const inputs = document.querySelectorAll('input[required]');
      const errors: Record<string, string> = {};
      
      inputs.forEach((input) => {
        const element = input as HTMLInputElement;
        if (!element.validity.valid) {
          const testId = element.getAttribute('data-testid');
          if (testId) {
            errors[testId] = element.validationMessage;
          }
        }
      });
      
      return errors;
    });
    
    return validationErrors;
  }

  /**
   * Check if email is already registered
   */
  async checkEmailAvailability(email: string): Promise<boolean> {
    await this.emailInput.fill(email);
    await this.emailInput.blur();
    
    // Wait for validation to complete
    await this.page.waitForTimeout(1000);
    
    // Check if email validation message appears
    if (await this.emailValidationMessage.isVisible()) {
      const message = await this.emailValidationMessage.textContent();
      return !message?.toLowerCase().includes('already registered');
    }
    
    return true;
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent() || '';
    }
    return '';
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string> {
    if (await this.successMessage.isVisible()) {
      return await this.successMessage.textContent() || '';
    }
    return '';
  }

  /**
   * Check if form is loading
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.showPasswordToggle.click();
  }

  /**
   * Toggle confirm password visibility
   */
  async toggleConfirmPasswordVisibility() {
    await this.showConfirmPasswordToggle.click();
  }

  /**
   * Get password field type
   */
  async getPasswordFieldType(): Promise<string> {
    return await this.passwordInput.getAttribute('type') || 'password';
  }

  /**
   * Check if passwords match
   */
  async checkPasswordsMatch(): Promise<boolean> {
    const password = await this.passwordInput.inputValue();
    const confirmPassword = await this.confirmPasswordInput.inputValue();
    
    return password === confirmPassword && password.length > 0;
  }

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.loginLink.click();
    await this.waitForNavigation(/\/login/);
  }

  /**
   * Clear all form fields
   */
  async clearForm() {
    await this.firstNameInput.clear();
    await this.lastNameInput.clear();
    await this.emailInput.clear();
    await this.passwordInput.clear();
    await this.confirmPasswordInput.clear();
    await this.phoneInput.clear();
    
    // Uncheck all checkboxes
    if (await this.termsCheckbox.isChecked()) {
      await this.termsCheckbox.uncheck();
    }
    if (await this.privacyCheckbox.isChecked()) {
      await this.privacyCheckbox.uncheck();
    }
    if (await this.marketingCheckbox.isChecked()) {
      await this.marketingCheckbox.uncheck();
    }
  }

  /**
   * Get form data
   */
  async getFormData() {
    return {
      firstName: await this.firstNameInput.inputValue(),
      lastName: await this.lastNameInput.inputValue(),
      email: await this.emailInput.inputValue(),
      password: await this.passwordInput.inputValue(),
      confirmPassword: await this.confirmPasswordInput.inputValue(),
      phone: await this.phoneInput.inputValue(),
      graduationYear: await this.graduationYearSelect.inputValue(),
      degree: await this.degreeSelect.inputValue(),
      specialization: await this.specializationSelect.inputValue(),
      termsAccepted: await this.termsCheckbox.isChecked(),
      privacyAccepted: await this.privacyCheckbox.isChecked(),
      marketingAccepted: await this.marketingCheckbox.isChecked()
    };
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Wait for email verification redirect
   */
  async waitForEmailVerification() {
    await this.page.waitForURL(/\/verify-email/, { timeout: 30000 });
  }

  /**
   * Wait for onboarding redirect
   */
  async waitForOnboarding() {
    await this.page.waitForURL(/\/onboarding/, { timeout: 30000 });
  }

  /**
   * Validate accessibility of the form
   */
  async validateAccessibility() {
    // Check for required ARIA labels
    const requiredFields = [
      this.firstNameInput,
      this.lastNameInput,
      this.emailInput,
      this.passwordInput,
      this.confirmPasswordInput
    ];

    for (const field of requiredFields) {
      const ariaLabel = await field.getAttribute('aria-label');
      const ariaLabelledBy = await field.getAttribute('aria-labelledby');
      const hasLabel = ariaLabel || ariaLabelledBy;
      
      expect(hasLabel).toBeTruthy();
    }

    // Check submit button accessibility
    const submitButtonText = await this.submitButton.textContent();
    expect(submitButtonText?.trim()).toBeTruthy();

    return true;
  }

  /**
   * Test mobile responsiveness
   */
  async testMobileLayout() {
    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Check if form adapts to mobile
    const formWidth = await this.page.locator('form').boundingBox();
    expect(formWidth?.width).toBeLessThanOrEqual(375);
    
    // Check if submit button is visible
    await expect(this.submitButton).toBeVisible();
    
    return true;
  }
}