import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly rememberMeCheckbox: Locator;
  private readonly submitButton: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly signUpLink: Locator;
  private readonly googleLoginButton: Locator;
  private readonly githubLoginButton: Locator;
  private readonly linkedinLoginButton: Locator;
  private readonly errorMessage: Locator;
  private readonly successMessage: Locator;
  private readonly loadingSpinner: Locator;

  constructor(page: Page) {
    super(page);
    
    // Form elements
    this.emailInput = page.locator('[data-testid="login-email"]');
    this.passwordInput = page.locator('[data-testid="login-password"]');
    this.rememberMeCheckbox = page.locator('[data-testid="login-remember-me"]');
    this.submitButton = page.locator('[data-testid="login-submit"]');
    
    // Links
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    this.signUpLink = page.locator('[data-testid="signup-link"]');
    
    // Social login buttons
    this.googleLoginButton = page.locator('[data-testid="login-google"]');
    this.githubLoginButton = page.locator('[data-testid="login-github"]');
    this.linkedinLoginButton = page.locator('[data-testid="login-linkedin"]');
    
    // Messages
    this.errorMessage = page.locator('[data-testid="login-error"]');
    this.successMessage = page.locator('[data-testid="login-success"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.navigate('/login');
    await this.waitForPageLoad();
  }

  /**
   * Fill login form
   */
  async fillLoginForm(email: string, password: string, rememberMe: boolean = false) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
  }

  /**
   * Submit login form
   */
  async submitLogin() {
    await this.submitButton.click();
    
    // Wait for either success (navigation) or error message
    await Promise.race([
      this.page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 }).catch(() => {}),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    ]);
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string, rememberMe: boolean = false) {
    await this.fillLoginForm(email, password, rememberMe);
    await this.submitLogin();
  }

  /**
   * Quick login helper
   */
  async quickLogin(userType: 'user' | 'admin' | 'premium' | 'company' = 'user') {
    const credentials = {
      user: { email: 'test@secid.mx', password: 'TestPassword123!' },
      admin: { email: 'admin@secid.mx', password: 'AdminPassword123!' },
      premium: { email: 'premium@secid.mx', password: 'PremiumPassword123!' },
      company: { email: 'company@techcorp.mx', password: 'CompanyPassword123!' }
    };
    
    const { email, password } = credentials[userType];
    await this.login(email, password);
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.waitForNavigation(/\/forgot-password/);
  }

  /**
   * Click sign up link
   */
  async clickSignUp() {
    await this.signUpLink.click();
    await this.waitForNavigation(/\/signup/);
  }

  /**
   * Login with Google
   */
  async loginWithGoogle() {
    // Store the current page context
    const pagePromise = this.page.context().waitForEvent('page');
    
    await this.googleLoginButton.click();
    
    // Wait for Google OAuth page
    const googlePage = await pagePromise;
    await googlePage.waitForLoadState();
    
    // Handle Google OAuth flow (mock for testing)
    // In real tests, you would interact with Google's login page
    // For now, we'll close it and assume success
    await googlePage.close();
    
    // Wait for redirect back to app
    await this.page.waitForURL(/\/(dashboard|home|oauth-callback)/);
  }

  /**
   * Login with GitHub
   */
  async loginWithGitHub() {
    const pagePromise = this.page.context().waitForEvent('page');
    
    await this.githubLoginButton.click();
    
    const githubPage = await pagePromise;
    await githubPage.waitForLoadState();
    
    // Handle GitHub OAuth flow (mock)
    await githubPage.close();
    
    await this.page.waitForURL(/\/(dashboard|home|oauth-callback)/);
  }

  /**
   * Login with LinkedIn
   */
  async loginWithLinkedIn() {
    const pagePromise = this.page.context().waitForEvent('page');
    
    await this.linkedinLoginButton.click();
    
    const linkedinPage = await pagePromise;
    await linkedinPage.waitForLoadState();
    
    // Handle LinkedIn OAuth flow (mock)
    await linkedinPage.close();
    
    await this.page.waitForURL(/\/(dashboard|home|oauth-callback)/);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible' });
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if error is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    await this.successMessage.waitFor({ state: 'visible' });
    return await this.successMessage.textContent() || '';
  }

  /**
   * Check if loading
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    if (await this.isLoading()) {
      await this.loadingSpinner.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Validate form validation
   */
  async validateFormErrors() {
    // Submit empty form
    await this.submitButton.click();
    
    // Check for validation errors
    const emailError = await this.emailInput.evaluate((el) => {
      return (el as HTMLInputElement).validationMessage;
    });
    
    const passwordError = await this.passwordInput.evaluate((el) => {
      return (el as HTMLInputElement).validationMessage;
    });
    
    return {
      email: emailError,
      password: passwordError
    };
  }

  /**
   * Check if user is already logged in
   */
  async isAlreadyLoggedIn(): Promise<boolean> {
    const currentUrl = await this.getCurrentURL();
    return currentUrl.includes('/dashboard') || currentUrl.includes('/home');
  }

  /**
   * Clear form
   */
  async clearForm() {
    await this.emailInput.clear();
    await this.passwordInput.clear();
    await this.rememberMeCheckbox.uncheck();
  }

  /**
   * Check if remember me is checked
   */
  async isRememberMeChecked(): Promise<boolean> {
    return await this.rememberMeCheckbox.isChecked();
  }

  /**
   * Get form field values
   */
  async getFormValues() {
    return {
      email: await this.emailInput.inputValue(),
      password: await this.passwordInput.inputValue(),
      rememberMe: await this.isRememberMeChecked()
    };
  }

  /**
   * Check if login button is enabled
   */
  async isLoginButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Press Enter to submit form
   */
  async submitWithEnter() {
    await this.passwordInput.press('Enter');
    
    // Wait for navigation or error
    await Promise.race([
      this.page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 }).catch(() => {}),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    ]);
  }

  /**
   * Check password visibility toggle
   */
  async togglePasswordVisibility() {
    const toggleButton = this.page.locator('[data-testid="toggle-password-visibility"]');
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
    }
  }

  /**
   * Get password field type
   */
  async getPasswordFieldType(): Promise<string> {
    return await this.passwordInput.getAttribute('type') || 'password';
  }
}