import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';

// Test data for registration
const testUser = {
  firstName: 'Ana',
  lastName: 'Rodriguez',
  email: 'ana.rodriguez@test.com',
  password: 'SecurePass123!',
  university: 'UNAM',
  graduationYear: '2022',
  major: 'Data Science',
  currentJob: 'Data Analyst',
  company: 'TechCorp Mexico',
  location: 'Mexico City',
  skills: ['Python', 'Machine Learning', 'SQL', 'Tableau'],
  bio: 'Passionate data scientist with experience in machine learning and analytics.',
  interests: ['AI Research', 'Data Visualization', 'Statistical Analysis'],
  goals: ['Career Growth', 'Networking', 'Skill Development'],
};

class RegistrationFlow {
  constructor(private page: Page) {}

  async navigateToSignup() {
    await this.page.goto('/');
    await this.page.click('a[href="/es/signup"]');
    await expect(this.page).toHaveURL('/es/signup');
  }

  async fillBasicInfo() {
    await this.page.fill('input[name="firstName"]', testUser.firstName);
    await this.page.fill('input[name="lastName"]', testUser.lastName);
    await this.page.fill('input[name="email"]', testUser.email);
    await this.page.fill('input[name="password"]', testUser.password);
    await this.page.fill('input[name="confirmPassword"]', testUser.password);
    await this.page.check('input[name="acceptTerms"]');
  }

  async submitRegistration() {
    await this.page.click('button[type="submit"]');
  }

  async completeEmailVerification() {
    // Mock email verification process
    await expect(this.page.locator('text=Verificación de email enviada')).toBeVisible();
    
    // Simulate clicking verification link (in real test, would need email service mock)
    await this.page.goto('/es/verify-email?token=mock-verification-token');
    await expect(this.page.locator('text=Email verificado exitosamente')).toBeVisible();
  }

  async completeProfileSetup() {
    // Should redirect to profile setup after verification
    await expect(this.page).toHaveURL(/\/es\/dashboard\/profile\/setup/);
    
    // Fill professional information
    await this.page.fill('input[name="university"]', testUser.university);
    await this.page.selectOption('select[name="graduationYear"]', testUser.graduationYear);
    await this.page.fill('input[name="major"]', testUser.major);
    await this.page.fill('input[name="currentJob"]', testUser.currentJob);
    await this.page.fill('input[name="company"]', testUser.company);
    await this.page.fill('input[name="location"]', testUser.location);
    
    // Add skills
    for (const skill of testUser.skills) {
      await this.page.fill('input[data-testid="skill-input"]', skill);
      await this.page.click('button[data-testid="add-skill"]');
    }
    
    // Fill bio
    await this.page.fill('textarea[name="bio"]', testUser.bio);
    
    await this.page.click('button[data-testid="continue-profile"]');
  }

  async selectInterests() {
    await expect(this.page).toHaveURL(/\/es\/onboarding\/interests/);
    
    // Select interests
    for (const interest of testUser.interests) {
      await this.page.click(`button[data-value="${interest}"]`);
    }
    
    await this.page.click('button[data-testid="continue-interests"]');
  }

  async defineGoals() {
    await expect(this.page).toHaveURL(/\/es\/onboarding\/goals/);
    
    // Select goals
    for (const goal of testUser.goals) {
      await this.page.click(`input[value="${goal}"]`);
    }
    
    await this.page.click('button[data-testid="continue-goals"]');
  }

  async viewConnectionSuggestions() {
    await expect(this.page).toHaveURL(/\/es\/onboarding\/connections/);
    
    // Should show connection suggestions
    await expect(this.page.locator('h2')).toContainText('Conecta con otros miembros');
    
    // Connect with some suggested members
    const connectionButtons = this.page.locator('button[data-testid^="connect-"]');
    const count = await connectionButtons.count();
    
    if (count > 0) {
      await connectionButtons.nth(0).click();
      await expect(this.page.locator('text=Solicitud enviada')).toBeVisible();
    }
    
    await this.page.click('button[data-testid="skip-connections"]');
  }

  async completeOnboarding() {
    await expect(this.page).toHaveURL(/\/es\/onboarding\/complete/);
    
    // Should show completion message
    await expect(this.page.locator('h2')).toContainText('¡Bienvenido a SECiD!');
    
    // Start using platform
    await this.page.click('button[data-testid="enter-dashboard"]');
    
    // Should redirect to dashboard
    await expect(this.page).toHaveURL('/es/dashboard');
  }
}

test.describe('User Registration and Onboarding Flow', () => {
  let registrationFlow: RegistrationFlow;

  test.beforeEach(async ({ page }) => {
    registrationFlow = new RegistrationFlow(page);
    
    // Mock Firebase auth for successful registration
    await page.route('**/identitytoolkit.googleapis.com/**', async (route) => {
      const url = route.request().url();
      if (url.includes('signUp')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            localId: 'mock-user-id',
            email: testUser.email,
            idToken: 'mock-id-token',
            refreshToken: 'mock-refresh-token',
          }),
        });
      }
    });
  });

  test('complete user registration journey', async ({ page }) => {
    // Step 1: Navigate to signup
    await registrationFlow.navigateToSignup();
    
    // Step 2: Fill and submit registration form
    await registrationFlow.fillBasicInfo();
    await registrationFlow.submitRegistration();
    
    // Step 3: Verify email
    await registrationFlow.completeEmailVerification();
    
    // Step 4: Complete profile setup
    await registrationFlow.completeProfileSetup();
    
    // Step 5: Select interests
    await registrationFlow.selectInterests();
    
    // Step 6: Define goals
    await registrationFlow.defineGoals();
    
    // Step 7: View connection suggestions
    await registrationFlow.viewConnectionSuggestions();
    
    // Step 8: Complete onboarding
    await registrationFlow.completeOnboarding();
    
    // Verify user is properly logged in and dashboard is accessible
    await expect(page.locator('h1')).toContainText('Panel de Control');
    await expect(page.locator(`text=${testUser.firstName} ${testUser.lastName}`)).toBeVisible();
  });

  test('registration form validation', async ({ page }) => {
    await registrationFlow.navigateToSignup();
    
    // Try submitting empty form
    await page.click('button[type="submit"]');
    
    // Verify validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    
    // Test invalid email format
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email format')).toBeVisible();
    
    // Test password strength requirements
    await page.fill('input[name="password"]', 'weak');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    
    // Test password confirmation mismatch
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
    
    // Test terms acceptance requirement
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=You must accept the terms and conditions')).toBeVisible();
  });

  test('duplicate email registration', async ({ page }) => {
    // Mock Firebase error for existing email
    await page.route('**/identitytoolkit.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 400,
            message: 'EMAIL_EXISTS',
          },
        }),
      });
    });

    await registrationFlow.navigateToSignup();
    await registrationFlow.fillBasicInfo();
    await registrationFlow.submitRegistration();
    
    // Should show error message
    await expect(page.locator('text=An account with this email already exists')).toBeVisible();
    
    // Should suggest login instead
    await expect(page.locator('a[href="/es/login"]')).toBeVisible();
  });

  test('social registration with Google', async ({ page }) => {
    await registrationFlow.navigateToSignup();
    
    // Mock Google OAuth flow
    await page.route('**/accounts.google.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>Google OAuth Mock</body></html>',
      });
    });
    
    // Click Google signup button
    await page.click('button:has-text("Continuar con Google")');
    
    // Should handle OAuth flow (simplified for testing)
    // In real implementation, would need to mock the full OAuth flow
    await expect(page.locator('text=Google OAuth Mock')).toBeVisible();
  });

  test('email verification resend', async ({ page }) => {
    await registrationFlow.navigateToSignup();
    await registrationFlow.fillBasicInfo();
    await registrationFlow.submitRegistration();
    
    // Should be on verification page
    await expect(page.locator('text=Verificación de email enviada')).toBeVisible();
    
    // Click resend verification
    await page.click('button[data-testid="resend-verification"]');
    
    // Should show success message
    await expect(page.locator('text=Email de verificación reenviado')).toBeVisible();
    
    // Should disable button temporarily
    await expect(page.locator('button[data-testid="resend-verification"]')).toBeDisabled();
  });

  test('profile setup form validation', async ({ page }) => {
    // Skip to profile setup (simulate verified user)
    await page.goto('/es/dashboard/profile/setup');
    
    // Try submitting empty form
    await page.click('button[data-testid="continue-profile"]');
    
    // Should show validation errors
    await expect(page.locator('text=University is required')).toBeVisible();
    await expect(page.locator('text=Graduation year is required')).toBeVisible();
    await expect(page.locator('text=Major is required')).toBeVisible();
  });

  test('onboarding skip options', async ({ page }) => {
    // Start at interests selection
    await page.goto('/es/onboarding/interests');
    
    // Skip interests
    await page.click('button[data-testid="skip-interests"]');
    await expect(page).toHaveURL(/\/es\/onboarding\/goals/);
    
    // Skip goals
    await page.click('button[data-testid="skip-goals"]');
    await expect(page).toHaveURL(/\/es\/onboarding\/connections/);
    
    // Skip connections
    await page.click('button[data-testid="skip-connections"]');
    await expect(page).toHaveURL(/\/es\/onboarding\/complete/);
  });

  test('onboarding progress tracking', async ({ page }) => {
    await page.goto('/es/onboarding/interests');
    
    // Should show progress indicator
    const progressBar = page.locator('[data-testid="onboarding-progress"]');
    await expect(progressBar).toBeVisible();
    
    // Should show current step
    await expect(page.locator('text=Paso 1 de 3')).toBeVisible();
    
    // Move to next step
    await page.click('button[data-testid="continue-interests"]');
    
    // Progress should update
    await expect(page.locator('text=Paso 2 de 3')).toBeVisible();
  });

  test('accessibility in registration flow', async ({ page }) => {
    await registrationFlow.navigateToSignup();
    
    // Check form labels and accessibility
    await expect(page.locator('label[for="firstName"]')).toBeVisible();
    await expect(page.locator('label[for="lastName"]')).toBeVisible();
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    
    // Check ARIA attributes
    const form = page.locator('form[data-testid="signup-form"]');
    await expect(form).toHaveAttribute('novalidate');
    
    // Check password visibility toggle
    const passwordToggle = page.locator('button[aria-label="Toggle password visibility"]');
    await expect(passwordToggle).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="firstName"]')).toBeFocused();
  });
});

// Test for different browsers and viewports
test.describe('Cross-browser Registration Tests', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`registration works in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Test is for ${browserName} only`);
      
      const registrationFlow = new RegistrationFlow(page);
      
      await registrationFlow.navigateToSignup();
      await registrationFlow.fillBasicInfo();
      
      // Verify form submission works
      await page.click('button[type="submit"]');
      
      // Should show loading state or proceed to next step
      await expect(page.locator('[data-testid="loading-spinner"], text=Verificación de email enviada')).toBeVisible();
    });
  });
});

// Mobile-specific registration tests
test.describe('Mobile Registration Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('mobile registration flow', async ({ page }) => {
    const registrationFlow = new RegistrationFlow(page);
    
    await registrationFlow.navigateToSignup();
    
    // Check mobile-specific UI elements
    await expect(page.locator('button[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Form should be properly sized for mobile
    const form = page.locator('form[data-testid="signup-form"]');
    await expect(form).toBeVisible();
    
    // Input fields should be appropriately sized
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveCSS('font-size', '16px'); // Prevents zoom on iOS
    
    await registrationFlow.fillBasicInfo();
    await registrationFlow.submitRegistration();
  });

  test('mobile onboarding navigation', async ({ page }) => {
    await page.goto('/es/onboarding/interests');
    
    // Mobile navigation should work with swipe gestures
    const interestsContainer = page.locator('[data-testid="interests-container"]');
    await expect(interestsContainer).toBeVisible();
    
    // Test touch interactions
    await page.locator('button[data-value="AI Research"]').tap();
    await expect(page.locator('button[data-value="AI Research"]')).toHaveClass(/selected/);
  });
});

// Visual regression tests
test.describe('Visual Regression Tests', () => {
  test('registration form visual consistency', async ({ page }) => {
    await page.goto('/es/signup');
    
    // Take screenshot of initial form
    await expect(page).toHaveScreenshot('signup-form-initial.png');
    
    // Fill form and check validation state
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    // Take screenshot with validation errors
    await expect(page).toHaveScreenshot('signup-form-validation-errors.png');
  });

  test('onboarding steps visual consistency', async ({ page }) => {
    await page.goto('/es/onboarding/interests');
    await expect(page).toHaveScreenshot('onboarding-interests.png');
    
    await page.goto('/es/onboarding/goals');
    await expect(page).toHaveScreenshot('onboarding-goals.png');
    
    await page.goto('/es/onboarding/connections');
    await expect(page).toHaveScreenshot('onboarding-connections.png');
  });
});