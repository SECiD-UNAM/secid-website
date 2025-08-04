import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';
import { mockJobs } from '../fixtures/jobs';

// Test data for job applications
const testJobApplication = {
  coverLetter: 'I am very interested in this Data Scientist position. My experience with machine learning and Python aligns perfectly with your requirements...',
  resume: 'resume.pdf',
  portfolio: 'https://github.com/testuser/portfolio',
  availableStartDate: '2024-03-01',
  salaryExpectation: '80000',
  additionalInfo: 'I am available for immediate interviews and can relocate if needed.',
};

const advancedFilters = {
  location: 'Mexico City',
  salaryMin: '60000',
  salaryMax: '100000',
  experienceLevel: 'Mid-level',
  jobType: 'Full-time',
  workModel: 'Remote',
  skills: ['Python', 'Machine Learning'],
  industry: 'Technology',
  companySize: '51-200 employees',
};

class JobApplicationFlow {
  constructor(private page: Page) {}

  async navigateToJobBoard() {
    await this.page.goto('/');
    await this.page.click('a[href="/es/jobs"]');
    await expect(this.page).toHaveURL('/es/jobs');
  }

  async searchJobs(searchTerm: string) {
    const searchInput = this.page.locator('input[data-testid="job-search-input"]');
    await searchInput.fill(searchTerm);
    await this.page.click('button[data-testid="search-jobs"]');
    
    // Wait for search results to load
    await this.page.waitForSelector('[data-testid="job-card"]', { timeout: 5000 });
  }

  async applyAdvancedFilters() {
    // Open filters panel
    await this.page.click('button[data-testid="open-filters"]');
    
    // Apply location filter
    await this.page.fill('input[data-testid="location-filter"]', advancedFilters.location);
    
    // Apply salary range
    await this.page.fill('input[data-testid="salary-min"]', advancedFilters.salaryMin);
    await this.page.fill('input[data-testid="salary-max"]', advancedFilters.salaryMax);
    
    // Select experience level
    await this.page.selectOption('select[data-testid="experience-level"]', advancedFilters.experienceLevel);
    
    // Select job type
    await this.page.check(`input[value="${advancedFilters.jobType}"]`);
    
    // Select work model
    await this.page.check(`input[value="${advancedFilters.workModel}"]`);
    
    // Add skills
    for (const skill of advancedFilters.skills) {
      await this.page.fill('input[data-testid="skill-filter-input"]', skill);
      await this.page.click('button[data-testid="add-skill-filter"]');
    }
    
    // Apply filters
    await this.page.click('button[data-testid="apply-filters"]');
    
    // Wait for filtered results
    await this.page.waitForResponse(response => 
      response.url().includes('/api/jobs') && response.status() === 200
    );
  }

  async viewJobDetails(jobIndex = 0) {
    const jobCards = this.page.locator('[data-testid="job-card"]');
    await jobCards.nth(jobIndex).click();
    
    // Should navigate to job detail page
    await expect(this.page).toHaveURL(/\/es\/jobs\/[^\/]+$/);
    
    // Wait for job details to load
    await this.page.waitForSelector('[data-testid="job-title"]');
  }

  async startJobApplication() {
    // Click apply button
    await this.page.click('button[data-testid="apply-job"]');
    
    // Should open application modal or navigate to application page
    await expect(this.page.locator('h2:has-text("Aplicar para este trabajo")')).toBeVisible();
  }

  async fillApplicationForm() {
    // Fill cover letter
    await this.page.fill('textarea[name="coverLetter"]', testJobApplication.coverLetter);
    
    // Upload resume (mock file upload)
    const fileInput = this.page.locator('input[type="file"][name="resume"]');
    await fileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content'),
    });
    
    // Add portfolio URL
    await this.page.fill('input[name="portfolio"]', testJobApplication.portfolio);
    
    // Set availability date
    await this.page.fill('input[name="availableStartDate"]', testJobApplication.availableStartDate);
    
    // Set salary expectation
    await this.page.fill('input[name="salaryExpectation"]', testJobApplication.salaryExpectation);
    
    // Add additional information
    await this.page.fill('textarea[name="additionalInfo"]', testJobApplication.additionalInfo);
  }

  async submitApplication() {
    await this.page.click('button[data-testid="submit-application"]');
    
    // Should show success message
    await expect(this.page.locator('text=¡Aplicación enviada exitosamente!')).toBeVisible();
    
    // Should close modal or redirect
    await this.page.waitForTimeout(2000);
  }

  async viewApplicationStatus() {
    // Navigate to applications dashboard
    await this.page.goto('/es/dashboard/applications');
    
    // Should see the submitted application
    await expect(this.page.locator('[data-testid="application-item"]')).toBeVisible();
    
    // Check application status
    await expect(this.page.locator('text=Enviada')).toBeVisible();
  }

  async saveJobForLater(jobIndex = 0) {
    const jobCards = this.page.locator('[data-testid="job-card"]');
    const saveButton = jobCards.nth(jobIndex).locator('button[data-testid="save-job"]');
    
    await saveButton.click();
    
    // Should show saved confirmation
    await expect(this.page.locator('text=Trabajo guardado')).toBeVisible();
    
    // Button should change state
    await expect(saveButton).toHaveClass(/saved/);
  }

  async viewSavedJobs() {
    await this.page.goto('/es/dashboard/jobs');
    
    // Switch to saved jobs tab
    await this.page.click('button[data-testid="saved-jobs-tab"]');
    
    // Should see saved jobs
    await expect(this.page.locator('[data-testid="saved-job-item"]')).toBeVisible();
  }
}

test.describe('Job Application and Search Flow', () => {
  let jobFlow: JobApplicationFlow;

  test.beforeEach(async ({ page }) => {
    jobFlow = new JobApplicationFlow(page);
    
    // Mock authentication - logged in user
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      }));
    });
    
    // Mock API responses
    await page.route('**/api/jobs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockJobs.jobSearchResults),
      });
    });
    
    await page.route('**/api/applications**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ 
            id: 'app-123',
            status: 'submitted',
            submittedAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockJobs.userApplications),
        });
      }
    });
  });

  test('complete job search and application flow', async ({ page }) => {
    // Step 1: Navigate to job board
    await jobFlow.navigateToJobBoard();
    
    // Step 2: Search for jobs
    await jobFlow.searchJobs('Data Scientist');
    
    // Verify search results are displayed
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    
    // Step 3: Apply advanced filters
    await jobFlow.applyAdvancedFilters();
    
    // Step 4: View job details
    await jobFlow.viewJobDetails(0);
    
    // Verify job details are loaded
    await expect(page.locator('[data-testid="job-title"]')).toContainText('Senior Data Scientist');
    await expect(page.locator('[data-testid="company-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-description"]')).toBeVisible();
    
    // Step 5: Start application
    await jobFlow.startJobApplication();
    
    // Step 6: Fill application form
    await jobFlow.fillApplicationForm();
    
    // Step 7: Submit application
    await jobFlow.submitApplication();
    
    // Step 8: Verify application status
    await jobFlow.viewApplicationStatus();
  });

  test('job search functionality', async ({ page }) => {
    await jobFlow.navigateToJobBoard();
    
    // Test empty search
    await jobFlow.searchJobs('');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    
    // Test specific search term
    await jobFlow.searchJobs('Python Developer');
    await expect(page.locator('[data-testid="search-results-count"]')).toContainText('3 trabajos encontrados');
    
    // Test no results scenario
    await jobFlow.searchJobs('Nonexistent Job Title');
    await expect(page.locator('text=No se encontraron trabajos')).toBeVisible();
    
    // Test search suggestions
    await page.fill('input[data-testid="job-search-input"]', 'Data');
    await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
    await expect(page.locator('text=Data Scientist')).toBeVisible();
    await expect(page.locator('text=Data Analyst')).toBeVisible();
  });

  test('advanced job filters', async ({ page }) => {
    await jobFlow.navigateToJobBoard();
    await jobFlow.applyAdvancedFilters();
    
    // Verify filters are applied correctly
    const appliedFilters = page.locator('[data-testid="applied-filter"]');
    await expect(appliedFilters).toHaveCount(7); // Location, salary, experience, type, model, skills
    
    // Test clearing individual filters
    await page.click('[data-testid="clear-location-filter"]');
    await expect(page.locator('text=Mexico City')).not.toBeVisible();
    
    // Test clearing all filters
    await page.click('button[data-testid="clear-all-filters"]');
    await expect(appliedFilters).toHaveCount(0);
  });

  test('job application form validation', async ({ page }) => {
    await jobFlow.navigateToJobBoard();
    await jobFlow.searchJobs('Data Scientist');
    await jobFlow.viewJobDetails();
    await jobFlow.startJobApplication();
    
    // Try submitting empty form
    await page.click('button[data-testid="submit-application"]');
    
    // Should show validation errors
    await expect(page.locator('text=Cover letter is required')).toBeVisible();
    await expect(page.locator('text=Resume is required')).toBeVisible();
    
    // Test file upload validation
    const fileInput = page.locator('input[type="file"][name="resume"]');
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Invalid file'),
    });
    
    await expect(page.locator('text=Please upload a PDF or DOC file')).toBeVisible();
    
    // Test cover letter length validation
    await page.fill('textarea[name="coverLetter"]', 'Too short');
    await page.click('button[data-testid="submit-application"]');
    await expect(page.locator('text=Cover letter must be at least 50 characters')).toBeVisible();
  });

  test('save jobs for later', async ({ page }) => {
    await jobFlow.navigateToJobBoard();
    await jobFlow.searchJobs('Data Scientist');
    
    // Save first job
    await jobFlow.saveJobForLater(0);
    
    // Save second job
    await jobFlow.saveJobForLater(1);
    
    // View saved jobs
    await jobFlow.viewSavedJobs();
    
    // Should see 2 saved jobs
    await expect(page.locator('[data-testid="saved-job-item"]')).toHaveCount(2);
    
    // Test removing saved job
    await page.click('[data-testid="remove-saved-job"]');
    await expect(page.locator('[data-testid="saved-job-item"]')).toHaveCount(1);
  });

  test('job alerts and notifications', async ({ page }) => {
    await page.goto('/es/dashboard/jobs');
    
    // Create job alert
    await page.click('button[data-testid="create-job-alert"]');
    
    // Fill alert criteria
    await page.fill('input[name="alertTitle"]', 'Data Science Jobs');
    await page.fill('input[name="keywords"]', 'Data Scientist, Machine Learning');
    await page.selectOption('select[name="frequency"]', 'daily');
    
    await page.click('button[data-testid="save-job-alert"]');
    
    // Should show success message
    await expect(page.locator('text=Alerta de trabajo creada')).toBeVisible();
    
    // Should appear in alerts list
    await expect(page.locator('[data-testid="job-alert-item"]')).toContainText('Data Science Jobs');
  });

  test('application tracking and status updates', async ({ page }) => {
    await page.goto('/es/dashboard/applications');
    
    // Should show applications with different statuses
    await expect(page.locator('[data-status="submitted"]')).toBeVisible();
    await expect(page.locator('[data-status="reviewing"]')).toBeVisible();
    await expect(page.locator('[data-status="interview"]')).toBeVisible();
    
    // Test filtering by status
    await page.selectOption('select[data-testid="status-filter"]', 'interview');
    await expect(page.locator('[data-testid="application-item"]')).toHaveCount(1);
    
    // Test application details modal
    await page.click('[data-testid="view-application-details"]');
    await expect(page.locator('h3:has-text("Detalles de la aplicación")')).toBeVisible();
    
    // Should show application timeline
    await expect(page.locator('[data-testid="application-timeline"]')).toBeVisible();
    await expect(page.locator('text=Aplicación enviada')).toBeVisible();
    await expect(page.locator('text=En revisión')).toBeVisible();
  });

  test('company profile and jobs', async ({ page }) => {
    await jobFlow.navigateToJobBoard();
    await jobFlow.searchJobs('Data Scientist');
    await jobFlow.viewJobDetails();
    
    // Click on company name to view company profile
    await page.click('[data-testid="company-name"]');
    
    // Should navigate to company profile
    await expect(page).toHaveURL(/\/es\/companies\/[^\/]+$/);
    
    // Should show company information
    await expect(page.locator('[data-testid="company-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="company-size"]')).toBeVisible();
    await expect(page.locator('[data-testid="company-location"]')).toBeVisible();
    
    // Should show other jobs from this company
    await expect(page.locator('h3:has-text("Otros trabajos en esta empresa")')).toBeVisible();
    await expect(page.locator('[data-testid="company-job-item"]')).toBeVisible();
    
    // Test following company
    await page.click('button[data-testid="follow-company"]');
    await expect(page.locator('text=Siguiendo empresa')).toBeVisible();
  });

  test('job recommendations', async ({ page }) => {
    await page.goto('/es/dashboard');
    
    // Should show job recommendations based on user profile
    await expect(page.locator('h3:has-text("Trabajos recomendados")')).toBeVisible();
    await expect(page.locator('[data-testid="recommended-job"]')).toBeVisible();
    
    // Click on recommended job
    await page.click('[data-testid="recommended-job"]');
    
    // Should navigate to job details
    await expect(page).toHaveURL(/\/es\/jobs\/[^\/]+$/);
    
    // Test dismissing recommendations
    await page.goBack();
    await page.click('[data-testid="dismiss-recommendation"]');
    await expect(page.locator('text=Recomendación descartada')).toBeVisible();
  });
});

// Mobile-specific job application tests
test.describe('Mobile Job Application', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile job search and application', async ({ page }) => {
    const jobFlow = new JobApplicationFlow(page);
    
    await jobFlow.navigateToJobBoard();
    
    // Mobile job search should work
    await page.fill('input[data-testid="job-search-input"]', 'Developer');
    await page.click('button[data-testid="search-jobs"]');
    
    // Jobs should be displayed in mobile-friendly cards
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await expect(jobCard).toBeVisible();
    
    // Mobile job details view
    await jobCard.click();
    await expect(page.locator('[data-testid="job-title"]')).toBeVisible();
    
    // Mobile application form
    await page.click('button[data-testid="apply-job"]');
    
    // Form should be mobile-optimized
    const form = page.locator('form[data-testid="application-form"]');
    await expect(form).toBeVisible();
    
    // File upload should work on mobile
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('accept', '.pdf,.doc,.docx');
  });

  test('mobile job filters', async ({ page }) => {
    const jobFlow = new JobApplicationFlow(page);
    await jobFlow.navigateToJobBoard();
    
    // Mobile filters should be in a drawer/modal
    await page.click('button[data-testid="open-filters"]');
    
    // Filters modal should be visible
    await expect(page.locator('[data-testid="filters-modal"]')).toBeVisible();
    
    // Should be able to apply and close filters
    await page.check('input[value="Remote"]');
    await page.click('button[data-testid="apply-filters"]');
    
    // Modal should close and filters should be applied
    await expect(page.locator('[data-testid="filters-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="applied-filter"]')).toBeVisible();
  });
});

// Visual regression tests
test.describe('Job Board Visual Tests', () => {
  test('job board layout consistency', async ({ page }) => {
    const jobFlow = new JobApplicationFlow(page);
    await jobFlow.navigateToJobBoard();
    
    // Screenshot of job board
    await expect(page).toHaveScreenshot('job-board-initial.png');
    
    // Screenshot with search results
    await jobFlow.searchJobs('Data Scientist');
    await expect(page).toHaveScreenshot('job-board-search-results.png');
    
    // Screenshot with filters applied
    await page.click('button[data-testid="open-filters"]');
    await expect(page).toHaveScreenshot('job-board-filters-open.png');
  });

  test('job application modal consistency', async ({ page }) => {
    const jobFlow = new JobApplicationFlow(page);
    await jobFlow.navigateToJobBoard();
    await jobFlow.searchJobs('Data Scientist');
    await jobFlow.viewJobDetails();
    await jobFlow.startJobApplication();
    
    // Screenshot of application modal
    await expect(page).toHaveScreenshot('job-application-modal.png');
  });
});

// Performance tests
test.describe('Job Board Performance', () => {
  test('job search performance', async ({ page }) => {
    const jobFlow = new JobApplicationFlow(page);
    await jobFlow.navigateToJobBoard();
    
    // Measure search performance
    const startTime = Date.now();
    await jobFlow.searchJobs('Developer');
    const endTime = Date.now();
    
    // Search should complete within 3 seconds
    expect(endTime - startTime).toBeLessThan(3000);
    
    // Check if results are loaded
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
  });

  test('pagination performance', async ({ page }) => {
    const jobFlow = new JobApplicationFlow(page);
    await jobFlow.navigateToJobBoard();
    await jobFlow.searchJobs('Developer');
    
    // Test pagination
    await page.click('button[data-testid="next-page"]');
    
    // Should load next page quickly
    await expect(page.locator('[data-testid="page-indicator"]')).toContainText('Página 2');
    await expect(page.locator('[data-testid="job-card"]')).toBeVisible();
  });
});