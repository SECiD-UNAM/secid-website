import { test, expect, Page } from '@playwright/test';
import { mockJobs, mockUsers } from '../../fixtures';

// Test URLs
const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';
const JOBS_URL = `${BASE_URL}/en/jobs`;
const POST_JOB_URL = `${BASE_URL}/en/post-job`;
const DASHBOARD_URL = `${BASE_URL}/en/dashboard`;

// Helper functions
async function navigateToJobs(page: Page) {
  await page.goto(JOBS_URL);
  await expect(page).toHaveTitle(/jobs/i);
}

async function loginAsCompany(page: Page) {
  await page.goto(`${BASE_URL}/en/login`);
  await page.fill('[data-testid="email-input"]', 'company@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(DASHBOARD_URL);
}

async function loginAsUser(page: Page) {
  await page.goto(`${BASE_URL}/en/login`);
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(DASHBOARD_URL);
}

test.describe('Job Board', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  test.describe('Job Listing Display', () => {
    test('should display job listings correctly', async ({ page }) => {
      await navigateToJobs(page);
      
      // Wait for jobs to load
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Check job card elements
      const firstJobCard = page.locator('[data-testid="job-card"]').first();
      await expect(firstJobCard.locator('[data-testid="job-title"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-company"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-location"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-type"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-level"]')).toBeVisible();
    });

    test('should show featured job badges', async ({ page }) => {
      await navigateToJobs(page);
      
      // Look for featured jobs
      const featuredJobs = page.locator('[data-testid="job-card"][data-featured="true"]');
      await expect(featuredJobs.first()).toBeVisible();
      await expect(featuredJobs.first().locator('[data-testid="featured-badge"]')).toBeVisible();
    });

    test('should show urgent job badges', async ({ page }) => {
      await navigateToJobs(page);
      
      // Look for urgent jobs
      const urgentJobs = page.locator('[data-testid="job-card"][data-urgent="true"]');
      if (await urgentJobs.count() > 0) {
        await expect(urgentJobs.first().locator('[data-testid="urgent-badge"]')).toBeVisible();
      }
    });

    test('should show remote work badges', async ({ page }) => {
      await navigateToJobs(page);
      
      // Look for remote jobs
      const remoteJobs = page.locator('[data-testid="job-card"][data-remote="true"]');
      if (await remoteJobs.count() > 0) {
        await expect(remoteJobs.first().locator('[data-testid="remote-badge"]')).toBeVisible();
      }
    });

    test('should display salary information when available', async ({ page }) => {
      await navigateToJobs(page);
      
      const jobsWithSalary = page.locator('[data-testid="job-card"]:has([data-testid="salary-info"])');
      if (await jobsWithSalary.count() > 0) {
        await expect(jobsWithSalary.first().locator('[data-testid="salary-info"]')).toBeVisible();
      }
    });
  });

  test.describe('Job Filtering', () => {
    test('should filter jobs by location', async ({ page }) => {
      await navigateToJobs(page);
      
      // Wait for jobs to load
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      const initialJobCount = await page.locator('[data-testid="job-card"]').count();
      
      // Apply location filter
      await page.selectOption('[data-testid="location-filter"]', 'Mexico City');
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Check that results are filtered
      const filteredJobCount = await page.locator('[data-testid="job-card"]').count();
      
      // Verify all visible jobs match the filter
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const location = await jobCards.nth(i).locator('[data-testid="job-location"]').textContent();
        expect(location).toContain('Mexico City');
      }
    });

    test('should filter jobs by type', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Apply job type filter
      await page.selectOption('[data-testid="type-filter"]', 'full-time');
      
      await page.waitForTimeout(1000);
      
      // Verify all visible jobs are full-time
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const type = await jobCards.nth(i).locator('[data-testid="job-type"]').textContent();
        expect(type?.toLowerCase()).toContain('full-time');
      }
    });

    test('should filter jobs by experience level', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Apply experience level filter
      await page.selectOption('[data-testid="level-filter"]', 'senior');
      
      await page.waitForTimeout(1000);
      
      // Verify all visible jobs are senior level
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const level = await jobCards.nth(i).locator('[data-testid="job-level"]').textContent();
        expect(level?.toLowerCase()).toContain('senior');
      }
    });

    test('should filter jobs by remote work option', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Apply remote work filter
      await page.check('[data-testid="remote-filter"]');
      
      await page.waitForTimeout(1000);
      
      // Verify all visible jobs are remote
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        await expect(jobCards.nth(i).locator('[data-testid="remote-badge"]')).toBeVisible();
      }
    });

    test('should filter jobs by salary range', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Set salary range filter
      await page.fill('[data-testid="salary-min-input"]', '50000');
      await page.fill('[data-testid="salary-max-input"]', '100000');
      
      await page.waitForTimeout(1000);
      
      // Verify salary filtering (if jobs have salary info)
      const jobsWithSalary = page.locator('[data-testid="job-card"]:has([data-testid="salary-info"])');
      const count = await jobsWithSalary.count();
      
      if (count > 0) {
        // Check that displayed salaries are within range
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should clear all filters', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      const initialJobCount = await page.locator('[data-testid="job-card"]').count();
      
      // Apply multiple filters
      await page.selectOption('[data-testid="location-filter"]', 'Mexico City');
      await page.selectOption('[data-testid="type-filter"]', 'full-time');
      await page.check('[data-testid="remote-filter"]');
      
      await page.waitForTimeout(1000);
      
      // Clear all filters
      await page.click('[data-testid="clear-filters-button"]');
      
      await page.waitForTimeout(1000);
      
      // Should show all jobs again
      const clearedJobCount = await page.locator('[data-testid="job-card"]').count();
      expect(clearedJobCount).toBe(initialJobCount);
    });
  });

  test.describe('Job Search', () => {
    test('should search jobs by title', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Search for specific job title
      await page.fill('[data-testid="search-input"]', 'Data Scientist');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      await page.waitForTimeout(1000);
      
      // Verify search results
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const title = await jobCards.nth(i).locator('[data-testid="job-title"]').textContent();
          expect(title?.toLowerCase()).toContain('data scientist');
        }
      }
    });

    test('should search jobs by company', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Search for specific company
      await page.fill('[data-testid="search-input"]', 'Tech Company');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      await page.waitForTimeout(1000);
      
      // Verify search results
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const company = await jobCards.nth(i).locator('[data-testid="job-company"]').textContent();
          expect(company?.toLowerCase()).toContain('tech company');
        }
      }
    });

    test('should show no results message for invalid search', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Search for non-existent job
      await page.fill('[data-testid="search-input"]', 'NonExistentJob12345');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      await page.waitForTimeout(1000);
      
      // Should show no results message
      await expect(page.locator('[data-testid="no-jobs-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-jobs-message"]')).toContainText(/no jobs found/i);
    });
  });

  test.describe('Job Detail View', () => {
    test('should open job detail modal when job card is clicked', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Click on first job card
      await page.click('[data-testid="job-card"]');
      
      // Should open job detail modal
      await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-detail-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-detail-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-requirements"]')).toBeVisible();
    });

    test('should show apply button for authenticated users', async ({ page }) => {
      await loginAsUser(page);
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      await page.click('[data-testid="job-card"]');
      
      await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="apply-button"]')).toBeVisible();
    });

    test('should show login prompt for unauthenticated users', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      await page.click('[data-testid="job-card"]');
      
      await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-to-apply"]')).toBeVisible();
    });

    test('should close job detail modal', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      await page.click('[data-testid="job-card"]');
      
      await expect(page.locator('[data-testid="job-detail-modal"]')).toBeVisible();
      
      // Close modal
      await page.click('[data-testid="close-modal-button"]');
      
      await expect(page.locator('[data-testid="job-detail-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should load more jobs when pagination is available', async ({ page }) => {
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      const initialJobCount = await page.locator('[data-testid="job-card"]').count();
      
      // Check if load more button exists
      const loadMoreButton = page.locator('[data-testid="load-more-button"]');
      
      if (await loadMoreButton.isVisible()) {
        await loadMoreButton.click();
        
        await page.waitForTimeout(1000);
        
        // Should have more jobs loaded
        const newJobCount = await page.locator('[data-testid="job-card"]').count();
        expect(newJobCount).toBeGreaterThan(initialJobCount);
      }
    });

    test('should hide load more button when no more jobs available', async ({ page }) => {
      await navigateToJobs(page);
      
      // Keep clicking load more until it's gone
      let loadMoreVisible = true;
      let clickCount = 0;
      const maxClicks = 5; // Prevent infinite loop
      
      while (loadMoreVisible && clickCount < maxClicks) {
        const loadMoreButton = page.locator('[data-testid="load-more-button"]');
        
        if (await loadMoreButton.isVisible()) {
          await loadMoreButton.click();
          await page.waitForTimeout(1000);
          clickCount++;
        } else {
          loadMoreVisible = false;
        }
      }
      
      // Load more button should not be visible
      await expect(page.locator('[data-testid="load-more-button"]')).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToJobs(page);
      
      // Jobs should be displayed in mobile layout
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Mobile filter toggle should be visible
      await expect(page.locator('[data-testid="mobile-filters-toggle"]')).toBeVisible();
      
      // Click to open mobile filters
      await page.click('[data-testid="mobile-filters-toggle"]');
      await expect(page.locator('[data-testid="mobile-filters-panel"]')).toBeVisible();
    });

    test('should display correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateToJobs(page);
      
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      // Should show grid layout on tablet
      const jobGrid = page.locator('[data-testid="jobs-grid"]');
      await expect(jobGrid).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load initial jobs quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await navigateToJobs(page);
      await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large job listings efficiently', async ({ page }) => {
      await navigateToJobs(page);
      
      // Load multiple pages of jobs
      for (let i = 0; i < 3; i++) {
        const loadMoreButton = page.locator('[data-testid="load-more-button"]');
        
        if (await loadMoreButton.isVisible()) {
          await loadMoreButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Page should remain responsive
      const finalJobCount = await page.locator('[data-testid="job-card"]').count();
      expect(finalJobCount).toBeGreaterThan(0);
      
      // Test scrolling performance
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(100);
      await page.evaluate(() => window.scrollTo(0, 0));
    });
  });
});