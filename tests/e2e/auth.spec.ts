import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/');
  });

  test('user can navigate to login page', async ({ page }) => {
    // Click login button in navigation
    await page.click('a[href="/es/login"]');
    
    // Should be on login page
    await expect(page).toHaveURL('/es/login');
    
    // Should see login form
    await expect(page.locator('h2')).toContainText('Iniciar sesión');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('shows validation errors for empty form submission', async ({ page }) => {
    await page.goto('/es/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Invalid email address')).toBeVisible();
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/es/login');
    
    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=No existe una cuenta con este correo')).toBeVisible();
  });

  test('can switch between login and signup', async ({ page }) => {
    await page.goto('/es/login');
    
    // Should be on login page
    await expect(page.locator('h2')).toContainText('Iniciar sesión');
    
    // Click signup link
    await page.click('a[href="/es/signup"]');
    
    // Should be on signup page
    await expect(page).toHaveURL('/es/signup');
    await expect(page.locator('h2')).toContainText('Crear cuenta');
    
    // Should have additional fields
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test('language switcher works correctly', async ({ page }) => {
    await page.goto('/es/login');
    
    // Should be in Spanish
    await expect(page.locator('h2')).toContainText('Iniciar sesión');
    
    // Switch to English
    await page.click('a[href="/en/"]');
    await page.click('a[href="/en/login"]');
    
    // Should be in English
    await expect(page).toHaveURL('/en/login');
    await expect(page.locator('h2')).toContainText('Sign In');
  });

  test('signup form validation works', async ({ page }) => {
    await page.goto('/es/signup');
    
    // Fill partial form
    await page.fill('input[name="firstName"]', 'J');
    await page.fill('input[name="lastName"]', 'D');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'different');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should show multiple validation errors
    await expect(page.locator('text=First name must be at least 2 characters')).toBeVisible();
    await expect(page.locator('text=Last name must be at least 2 characters')).toBeVisible();
    await expect(page.locator('text=Invalid email address')).toBeVisible();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('password requirements are enforced', async ({ page }) => {
    await page.goto('/es/signup');
    
    // Try weak password
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Should show password requirements
    await expect(page.locator('text=Password must contain at least one uppercase letter')).toBeVisible();
    
    // Try password without number
    await page.fill('input[name="password"]', 'Password');
    await page.click('button[type="submit"]');
    
    // Should show number requirement
    await expect(page.locator('text=Password must contain at least one number')).toBeVisible();
  });

  test('Google OAuth button is present', async ({ page }) => {
    await page.goto('/es/login');
    
    // Should have Google sign-in button
    const googleButton = page.locator('button:has-text("Continuar con Google")');
    await expect(googleButton).toBeVisible();
    
    // Should have Google icon
    await expect(googleButton.locator('svg')).toBeVisible();
  });

  test('remember me checkbox works', async ({ page }) => {
    await page.goto('/es/login');
    
    // Check remember me
    const checkbox = page.locator('input[name="remember-me"]');
    await expect(checkbox).not.toBeChecked();
    
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  test('forgot password link is present', async ({ page }) => {
    await page.goto('/es/login');
    
    // Should have forgot password link
    const forgotLink = page.locator('a:has-text("¿Olvidaste tu contraseña?")');
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute('href', '/es/forgot-password');
  });

  test('terms acceptance is required for signup', async ({ page }) => {
    await page.goto('/es/signup');
    
    // Fill valid form data
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Password123');
    
    // Try to submit without accepting terms
    await page.click('button[type="submit"]');
    
    // Should show terms error
    await expect(page.locator('text=You must accept the terms and conditions')).toBeVisible();
    
    // Accept terms
    await page.check('input[name="acceptTerms"]');
    
    // Now form should be submittable (would succeed with real Firebase)
  });
});