import { test, expect } from '@playwright/test';
import { waitForIsland } from '../utils/session';

/**
 * Login / signup forms as rendered by src/components/auth/LoginForm.tsx and
 * src/components/auth/SignUpForm.tsx (react-hook-form + zod; the validation
 * messages are the English zod messages). The "invalid credentials" test
 * needs the Auth emulator (PUBLIC_USE_EMULATORS=true build); everything
 * else is client-side validation.
 */
test.describe('Authentication Flow', () => {
  test('user can navigate to login page', async ({ page }) => {
    await page.goto('/es/');

    await page.locator('.secid-navbar__actions a[href="/es/login"]').click();

    await expect(page).toHaveURL(/\/es\/login/);
    await expect(page.locator('h2').first()).toContainText(/Iniciar sesión/i);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('shows validation errors for empty form submission', async ({
    page,
  }) => {
    await page.goto('/es/login');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email address')).toBeVisible();
    await expect(
      page.locator('text=Password must be at least 6 characters')
    ).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/es/login');

    await page.fill('#email', `nadie-${Date.now()}@example.com`);
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Firebase returns user-not-found or invalid-credential depending on
    // enumeration protection; LoginForm maps both to a Spanish message.
    await expect(
      page.locator(
        'text=/No existe una cuenta con este correo|Correo o contraseña incorrectos/'
      )
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/es\/login/);
  });

  test('can switch between login and signup', async ({ page }) => {
    await page.goto('/es/login');

    await expect(page.locator('h2').first()).toContainText(/Iniciar sesión/i);

    await page.locator('.secid-navbar__actions a[href="/es/signup"]').click();

    await expect(page).toHaveURL(/\/es\/signup/);
    await expect(page.locator('h2').first()).toContainText(/Crear cuenta/i);

    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
  });

  test('language switcher works correctly', async ({ page }) => {
    await page.goto('/es/login');
    await expect(page.locator('h2').first()).toContainText(/Iniciar sesión/i);

    await page.locator('.secid-navbar__lang-btn').click();
    await page.locator('.secid-navbar__lang-dropdown a[hreflang="en"]').click();

    await expect(page).toHaveURL(/\/en\/login/);
    await expect(page.locator('h2').first()).toContainText(/Sign in/i);
  });

  test('signup form validation works', async ({ page }) => {
    await page.goto('/es/signup');

    await page.fill('#firstName', 'J');
    await page.fill('#lastName', 'D');
    await page.fill('#email', 'invalid@email'); // passes native type=email, fails zod
    await page.fill('#password', 'weak');
    await page.fill('#confirmPassword', 'different');

    await page.click('button[type="submit"]');

    await expect(
      page.locator('text=First name must be at least 2 characters')
    ).toBeVisible();
    await expect(
      page.locator('text=Last name must be at least 2 characters')
    ).toBeVisible();
    await expect(page.locator('text=Invalid email address')).toBeVisible();
    await expect(
      page.locator('text=Password must be at least 8 characters')
    ).toBeVisible();
  });

  test('password requirements are enforced', async ({ page }) => {
    await page.goto('/es/signup');

    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=Password must contain at least one uppercase letter')
    ).toBeVisible();

    await page.fill('#password', 'Password');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=Password must contain at least one number')
    ).toBeVisible();
  });

  test('Google OAuth button is present', async ({ page }) => {
    await page.goto('/es/login');

    const googleButton = page.locator('button', { hasText: 'Google' });
    await expect(googleButton).toBeVisible();
    await expect(googleButton.locator('svg')).toBeVisible();
  });

  test('remember me checkbox works', async ({ page }) => {
    await page.goto('/es/login');
    await waitForIsland(page, 'LoginForm');

    const checkbox = page.locator('#remember-me');
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  test('forgot password opens the recovery dialog', async ({ page }) => {
    await page.goto('/es/login');
    // The button is a React handler: clicking the SSR markup before
    // hydration does nothing (flaked under 4 parallel workers).
    await waitForIsland(page, 'LoginForm');

    const forgotButton = page.locator('button', {
      hasText: '¿Olvidaste tu contraseña?',
    });
    await expect(forgotButton).toBeVisible();
    await forgotButton.click();

    await expect(
      page.locator('h3', { hasText: 'Recuperar contraseña' })
    ).toBeVisible();
  });

  test('terms acceptance is required for signup', async ({ page }) => {
    await page.goto('/es/signup');

    await page.fill('#firstName', 'John');
    await page.fill('#lastName', 'Doe');
    await page.fill('#email', 'john@example.com');
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'Password123');

    await page.click('button[type="submit"]');

    await expect(
      page.locator('text=You must accept the terms and conditions')
    ).toBeVisible();

    await page.check('#acceptTerms');
    await expect(page.locator('#acceptTerms')).toBeChecked();
  });
});
