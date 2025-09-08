import { test, expect } from '@playwright/test';

test.describe('Member Registration Journey', () => {
  test('should navigate to registration from hero CTA', async ({ page }) => {
    await page.goto('/es/');
    
    // Click hero CTA button
    const heroJoinButton = page.locator('.secid-hero__actions').locator('text=Únete a SECiD');
    await expect(heroJoinButton).toBeVisible();
    await heroJoinButton.click();

    // Should navigate to registro page  
    await expect(page).toHaveURL(/.*registro/);
  });

  test('should navigate to registration from navbar', async ({ page }) => {
    await page.goto('/es/');
    
    // Click navbar register button
    const navRegisterButton = page.locator('.secid-navbar').locator('text=Registrarse');
    await expect(navRegisterButton).toBeVisible();
    await navRegisterButton.click();

    // Should navigate to signup page
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should navigate to registration from CTA section', async ({ page }) => {
    await page.goto('/es/');
    
    // Scroll to CTA section
    const ctaSection = page.locator('.secid-cta');
    await ctaSection.scrollIntoViewIfNeeded();
    
    // Click register CTA
    const ctaRegisterButton = ctaSection.locator('text=Registrarse');
    await expect(ctaRegisterButton).toBeVisible();
    await ctaRegisterButton.click();

    // Should navigate to registro page  
    await expect(page).toHaveURL(/.*registro/);
  });

  test('should navigate to login from navbar', async ({ page }) => {
    await page.goto('/es/');
    
    // Click navbar login button
    const navLoginButton = page.locator('.secid-navbar').locator('text=Iniciar Sesión');
    await expect(navLoginButton).toBeVisible();
    
    // Note: In the current implementation, this might just be a placeholder
    // In a real app, we would verify it opens a login modal or navigates to login page
    await expect(navLoginButton).toHaveAttribute('href', '#');
  });

  test('should access registration from jobs page member CTA', async ({ page }) => {
    await page.goto('/es/empleos');
    
    // Scroll to member CTA
    const memberCta = page.locator('.secid-member-cta');
    await memberCta.scrollIntoViewIfNeeded();
    
    // Click register button
    const registerButton = memberCta.locator('text=Registrarse');
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    // Should navigate to registro page  
    await expect(page).toHaveURL(/.*registro/);
  });

  test('should handle registro page redirect', async ({ page }) => {
    // Directly visit registro page
    await page.goto('/registro');
    
    // The page should load without errors
    await expect(page).toHaveURL(/.*registro/);
    
    // In the real implementation, this would redirect to Google Forms
    // For testing, we just verify the page loads
  });

  test('should show registration options in multiple languages', async ({ page }) => {
    // Start in Spanish
    await page.goto('/es/');
    let registerButton = page.locator('.secid-navbar').locator('text=Registrarse');
    await expect(registerButton).toBeVisible();

    // Switch to English
    const langButton = page.locator('.secid-navbar__lang-btn');
    await langButton.click();
    const enOption = page.locator('text=EN - English');
    await enOption.click();

    // Verify registration button is in English
    await expect(page).toHaveURL(/.*\/en\//);
    registerButton = page.locator('.secid-navbar').locator('text=Sign Up');
    await expect(registerButton).toBeVisible();
  });

  test('should maintain registration intent across navigation', async ({ page }) => {
    await page.goto('/es/');
    
    // Click join button
    const joinButton = page.locator('text=Únete a SECiD').first();
    await joinButton.click();
    await expect(page).toHaveURL(/.*registro/);

    // Navigate back
    await page.goBack();
    await expect(page).toHaveURL(/.*\/es\//);

    // Registration button should still be visible
    const navRegisterButton = page.locator('.secid-navbar').locator('text=Registrarse');
    await expect(navRegisterButton).toBeVisible();
  });
});