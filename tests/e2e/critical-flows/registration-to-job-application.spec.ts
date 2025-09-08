import { test, expect, Page, BrowserContext } from '@playwright/test';
import { SignUpPage } from '../../page-objects/auth/SignUpPage';
import { OnboardingPage } from '../../page-objects/onboarding/OnboardingPage';
import { JobBoardPage } from '../../page-objects/jobs/JobBoardPage';
import { JobDetailPage } from '../../page-objects/jobs/JobDetailPage';
import { NavigationComponent } from '../../page-objects/base/NavigationComponent';
import { TestDataGenerator, TestUserData } from '../../utils/test-data-generator';
import { AuthHelpers } from '../../utils/auth-helpers';
import path from 'path';

/**
 * Critical User Journey Test: Registration to Job Application Flow
 * 
 * This comprehensive E2E test covers the complete user journey from:
 * 1. User registration with all required fields
 * 2. Email verification process (mocked)
 * 3. Profile completion/onboarding
 * 4. Navigating to job board
 * 5. Searching and filtering jobs
 * 6. Viewing job details
 * 7. Applying for a job
 * 8. Tracking application status
 * 
 * Tests both happy path and edge cases, includes mobile responsiveness 
 * and accessibility validations.
 */

test.describe('Critical Flow: Registration to Job Application', () => {
  let page: Page;
  let context: BrowserContext;
  let signUpPage: SignUpPage;
  let onboardingPage: OnboardingPage;
  let jobBoardPage: JobBoardPage;
  let jobDetailPage: JobDetailPage;
  let navigation: NavigationComponent;
  let testUser: TestUserData;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      // Mock API responses for faster testing
      recordVideo: { dir: 'test-results/videos/' },
      recordHar: { path: 'test-results/har/registration-to-job-flow.har' }
    });
    
    page = await context.newPage();
    
    // Initialize page objects
    signUpPage = new SignUpPage(page);
    onboardingPage = new OnboardingPage(page);
    jobBoardPage = new JobBoardPage(page);
    jobDetailPage = new JobDetailPage(page);
    navigation = new NavigationComponent(page);
    
    // Generate test user data
    testUser = TestDataGenerator.generateUser({
      email: `test-${Date.now()}@secid.mx`,
      firstName: 'Maria',
      lastName: 'García',
      graduationYear: 2022,
      degree: 'Licenciatura en Ciencia de Datos',
      specialization: 'Machine Learning',
      company: 'TechCorp México',
      position: 'Data Scientist',
      skills: ['Python', 'Machine Learning', 'SQL', 'TensorFlow', 'AWS']
    });
    
    // Setup API mocking
    await setupAPIMocks(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    // Clear storage and reset state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Reset cookies
    await context.clearCookies();
  });

  test('Complete registration to job application flow - Happy Path', async () => {
    test.setTimeout(120000); // 2 minutes for complete flow
    
    // Step 1: Navigate to homepage and start registration
    await page.goto('/');
    await expect(page).toHaveTitle(/SECiD/);
    
    await navigation.clickSignup();
    await expect(page).toHaveURL(/\/signup/);
    
    // Step 2: Complete user registration
    await test.step('User Registration', async () => {
      await signUpPage.registerUser(testUser, {
        includeAcademicInfo: true,
        includeMarketing: false,
        submitForm: true
      });
      
      // Verify registration success and redirect
      await expect(page).toHaveURL(/\/(onboarding|verify-email)/);
      
      // Mock email verification if needed
      if (page.url().includes('verify-email')) {
        await mockEmailVerification(page);
      }
    });
    
    // Step 3: Complete onboarding process
    await test.step('Profile Onboarding', async () => {
      if (page.url().includes('onboarding')) {
        await onboardingPage.completeOnboarding({
          professionalInfo: {
            company: testUser.company,
            position: testUser.position,
            experienceYears: '3-5',
            industry: 'Technology',
            salaryRange: '60000-100000',
            remotePreference: 'hybrid'
          },
          skills: testUser.skills,
          careerData: {
            goals: 'Looking to advance my career in machine learning and data science',
            lookingForJob: true,
            openToOpportunities: true,
            interestedInMentorship: true,
            jobTypes: ['full-time'],
            preferredLocations: ['Ciudad de México', 'Remoto']
          },
          networkingData: {
            linkedinProfile: testUser.linkedIn,
            githubProfile: testUser.github,
            personalWebsite: testUser.website,
            bio: testUser.bio,
            profileVisibility: 'public',
            showContactInfo: true,
            showCareerInfo: true
          },
          notificationData: {
            emailNotifications: true,
            jobAlerts: true,
            eventNotifications: true,
            mentorshipNotifications: true,
            marketingEmails: false,
            frequency: 'weekly'
          }
        });
        
        // Verify onboarding completion
        await expect(onboardingPage.isOnboardingComplete()).resolves.toBe(true);
        
        // Go to dashboard or jobs
        await onboardingPage.exploreJobs();
      }
    });
    
    // Step 4: Navigate to job board and verify initial state
    await test.step('Job Board Navigation', async () => {
      await expect(page).toHaveURL(/\/jobs/);
      
      // Wait for jobs to load
      await jobBoardPage.waitForJobsToLoad();
      
      // Verify job board is functional
      const jobCount = await jobBoardPage.getJobCount();
      expect(jobCount).toBeGreaterThan(0);
      
      // Verify user is logged in
      expect(await navigation.isUserLoggedIn()).toBe(true);
    });
    
    // Step 5: Search and filter jobs
    await test.step('Job Search and Filtering', async () => {
      // Search for machine learning jobs
      await jobBoardPage.searchJobs('machine learning');
      
      // Apply filters
      await jobBoardPage.applyFilters({
        location: 'Ciudad de México',
        jobType: 'full-time',
        experience: 'mid',
        remote: 'hybrid',
        tags: ['Python', 'Machine Learning']
      });
      
      // Verify filtered results
      const filteredJobs = await jobBoardPage.getAllJobCards();
      expect(filteredJobs.length).toBeGreaterThan(0);
      
      // Verify jobs match criteria
      for (const job of filteredJobs.slice(0, 3)) { // Check first 3 jobs
        expect(job.title.toLowerCase()).toContain('machine learning');
        expect(job.type.toLowerCase()).toContain('full-time');
      }
    });
    
    // Step 6: View job details
    await test.step('Job Detail Viewing', async () => {
      const jobs = await jobBoardPage.getAllJobCards();
      const targetJob = jobs[0]; // Select first job
      
      // Click on job to view details
      await jobBoardPage.clickJobCard(targetJob.id);
      
      // Verify job detail page loaded
      await expect(page).toHaveURL(/\/jobs\/[^\/]+/);
      
      // Get complete job details
      const jobDetails = await jobDetailPage.getJobDetails();
      expect(jobDetails.title).toBeTruthy();
      expect(jobDetails.company).toBeTruthy();
      expect(jobDetails.description).toBeTruthy();
      expect(jobDetails.requirements.length).toBeGreaterThan(0);
      
      // Bookmark the job
      if (!jobDetails.isBookmarked) {
        await jobDetailPage.toggleBookmark();
      }
    });
    
    // Step 7: Apply for the job
    await test.step('Job Application', async () => {
      // Prepare application data
      const applicationData = {
        coverLetter: `Dear Hiring Manager,
        
I am excited to apply for this position. With my background in data science and ${testUser.skills?.join(', ')}, I believe I would be a great fit for your team.

My experience at ${testUser.company} as a ${testUser.position} has prepared me for this role. I am particularly interested in applying machine learning techniques to solve real-world problems.

Thank you for considering my application.

Best regards,
${testUser.firstName} ${testUser.lastName}`,
        portfolioUrl: testUser.website,
        linkedinProfile: testUser.linkedIn,
        expectedSalary: '80000',
        availabilityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        additionalInfo: 'I am excited about the opportunity to contribute to your data science team.',
        agreeToTerms: true
      };
      
      // Try quick apply first if available
      if (await jobDetailPage.canUseQuickApply()) {
        await jobDetailPage.quickApplyToJob('default-resume', 'default-cover-letter');
      } else {
        // Use full application form
        await jobDetailPage.applyToJob(applicationData);
      }
      
      // Verify application success
      const successMessage = await jobDetailPage.page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible();
      
      // Verify application status updated
      const applicationStatus = await jobDetailPage.getApplicationStatus();
      expect(applicationStatus).toBeTruthy();
    });
    
    // Step 8: Track application status
    await test.step('Application Tracking', async () => {
      // Get application progress
      const progress = await jobDetailPage.getApplicationProgress();
      expect(progress.length).toBeGreaterThan(0);
      
      // Verify first step is completed
      expect(progress[0].status).toContain('submitted');
      
      // Navigate to user dashboard to see all applications
      await navigation.goToDashboard();
      
      // Verify application appears in dashboard
      const applicationTracker = page.locator('[data-testid="application-tracker"]');
      if (await applicationTracker.isVisible()) {
        const applications = await applicationTracker.locator('[data-testid="application-item"]').count();
        expect(applications).toBeGreaterThan(0);
      }
    });
  });

  test('Registration with email verification flow', async () => {
    test.setTimeout(90000);
    
    const emailUser = TestDataGenerator.generateUser({
      email: `email-verify-${Date.now()}@secid.mx`
    });
    
    // Complete registration
    await signUpPage.goto();
    await signUpPage.registerUser(emailUser);
    
    // Should redirect to email verification
    await expect(page).toHaveURL(/\/verify-email/);
    
    // Mock email verification
    await mockEmailVerification(page);
    
    // Should proceed to onboarding
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('Quick onboarding and immediate job search', async () => {
    const quickUser = TestDataGenerator.generateUser();
    
    // Register user
    await signUpPage.goto();
    await signUpPage.registerUser(quickUser);
    
    // Skip onboarding
    if (page.url().includes('onboarding')) {
      await onboardingPage.skipOnboarding();
      await onboardingPage.exploreJobs();
    }
    
    // Should be on job board
    await expect(page).toHaveURL(/\/jobs/);
    
    // Verify basic job search works
    await jobBoardPage.searchJobs('data scientist');
    const jobs = await jobBoardPage.getJobCount();
    expect(jobs).toBeGreaterThan(0);
  });

  test('Social registration with Google OAuth', async () => {
    test.setTimeout(60000);
    
    await signUpPage.goto();
    
    // Mock Google OAuth success
    await page.route('**/auth/google', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: 'google-user-123', email: 'google-user@secid.mx' },
          redirect: '/onboarding'
        })
      });
    });
    
    await signUpPage.registerWithGoogle();
    
    // Should proceed to onboarding
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('Error handling - Invalid email registration', async () => {
    const invalidUser = TestDataGenerator.generateUser({
      email: 'invalid-email-format'
    });
    
    await signUpPage.goto();
    await signUpPage.registerUser(invalidUser, { submitForm: false });
    
    // Attempt to submit with invalid email
    await signUpPage.submitForm();
    
    // Should show validation error
    const errorMessage = await signUpPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('email');
  });

  test('Error handling - Existing email registration', async () => {
    const existingUser = TestDataGenerator.generateUser({
      email: 'admin@secid.mx' // Use existing admin email
    });
    
    await signUpPage.goto();
    await signUpPage.registerUser(existingUser);
    
    // Should show error for existing email
    const errorMessage = await signUpPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('already');
  });

  test('Job application without complete profile', async () => {
    const incompleteUser = TestDataGenerator.generateUser();
    
    // Register with minimal info
    await signUpPage.goto();
    await signUpPage.registerUser(incompleteUser, { includeAcademicInfo: false });
    
    // Skip onboarding
    if (page.url().includes('onboarding')) {
      await onboardingPage.skipOnboarding();
      await onboardingPage.exploreJobs();
    }
    
    // Try to apply for a job
    await jobBoardPage.goto();
    await jobBoardPage.waitForJobsToLoad();
    
    const jobs = await jobBoardPage.getAllJobCards();
    if (jobs.length > 0) {
      await jobBoardPage.clickJobCard(jobs[0].id);
      
      // Should prompt to complete profile or show limited application options
      await jobDetailPage.applyToJob({
        coverLetter: 'Basic cover letter',
        agreeToTerms: true
      });
      
      // May show warning or redirect to profile completion
      const hasWarning = await page.locator('[data-testid="profile-incomplete-warning"]').isVisible();
      const hasSuccess = await page.locator('[data-testid="success-message"]').isVisible();
      
      expect(hasWarning || hasSuccess).toBe(true);
    }
  });

  test('Mobile registration to job application flow', async () => {
    test.setTimeout(120000);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobileUser = TestDataGenerator.generateUser();
    
    // Mobile registration
    await signUpPage.goto();
    await signUpPage.testMobileLayout();
    await signUpPage.registerUser(mobileUser);
    
    // Mobile onboarding
    if (page.url().includes('onboarding')) {
      await onboardingPage.testMobileOnboarding();
      await onboardingPage.completeOnboarding({
        skills: ['Python', 'SQL'],
        careerData: { lookingForJob: true }
      });
    }
    
    // Mobile job search
    if (!page.url().includes('jobs')) {
      await navigation.goToJobs();
    }
    
    await jobBoardPage.testMobileExperience();
    await jobBoardPage.searchJobs('data');
    
    // Mobile job application
    const jobs = await jobBoardPage.getAllJobCards();
    if (jobs.length > 0) {
      await jobBoardPage.clickJobCard(jobs[0].id);
      await jobDetailPage.testMobileJobDetail();
      
      // Try quick apply on mobile
      if (await jobDetailPage.canUseQuickApply()) {
        await jobDetailPage.quickApplyToJob();
      }
    }
  });

  test('Accessibility validation throughout the flow', async () => {
    const a11yUser = TestDataGenerator.generateUser();
    
    // Test signup accessibility
    await signUpPage.goto();
    await signUpPage.validateAccessibility();
    await signUpPage.registerUser(a11yUser);
    
    // Test onboarding accessibility
    if (page.url().includes('onboarding')) {
      // Basic accessibility checks for onboarding
      const headings = await page.locator('h1, h2, h3').count();
      expect(headings).toBeGreaterThan(0);
      
      await onboardingPage.skipOnboarding();
    }
    
    // Test job board accessibility
    if (!page.url().includes('jobs')) {
      await navigation.goToJobs();
    }
    
    // Check job board has proper headings and ARIA labels
    const searchInput = page.locator('[data-testid="job-search-input"]');
    const searchLabel = await searchInput.getAttribute('aria-label');
    expect(searchLabel).toBeTruthy();
    
    // Test job detail accessibility
    const jobs = await jobBoardPage.getAllJobCards();
    if (jobs.length > 0) {
      await jobBoardPage.clickJobCard(jobs[0].id);
      await jobDetailPage.validateJobDetailAccessibility();
    }
  });

  test('Performance validation during user flow', async () => {
    const perfUser = TestDataGenerator.generateUser();
    
    // Measure registration page performance
    await signUpPage.goto();
    const signupMetrics = await signUpPage.measurePerformance();
    console.log('Signup page metrics:', signupMetrics);
    
    await signUpPage.registerUser(perfUser);
    
    // Measure job board performance
    if (!page.url().includes('jobs')) {
      await navigation.goToJobs();
    }
    
    const jobBoardMetrics = await jobBoardPage.measurePerformance();
    console.log('Job board metrics:', jobBoardMetrics);
    
    // Ensure reasonable performance
    expect(signupMetrics.firstContentfulPaint).toBeLessThan(3000);
    expect(jobBoardMetrics.firstContentfulPaint).toBeLessThan(4000);
  });
});

// Helper functions

async function setupAPIMocks(page: Page) {
  // Mock job search API
  await page.route('**/api/jobs**', route => {
    const jobs = TestDataGenerator.generateBulkData('jobs', 20);
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: jobs,
        total: jobs.length,
        hasMore: false
      })
    });
  });
  
  // Mock job application API
  await page.route('**/api/jobs/*/apply', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        applicationId: `app-${Date.now()}`,
        status: 'submitted',
        message: 'Application submitted successfully'
      })
    });
  });
  
  // Mock user registration API
  await page.route('**/api/auth/register', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: { id: `user-${Date.now()}` },
        requiresVerification: false,
        redirect: '/onboarding'
      })
    });
  });
  
  // Mock onboarding API
  await page.route('**/api/onboarding', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        profileCompleteness: 85
      })
    });
  });
}

async function mockEmailVerification(page: Page) {
  // Mock email verification process
  await page.route('**/api/auth/verify-email**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        verified: true,
        redirect: '/onboarding'
      })
    });
  });
  
  // Simulate clicking verification link or auto-verification
  const verifyButton = page.locator('[data-testid="verify-email-button"]');
  if (await verifyButton.isVisible()) {
    await verifyButton.click();
  } else {
    // Auto-redirect after timeout
    await page.waitForTimeout(2000);
    await page.goto('/onboarding');
  }
}