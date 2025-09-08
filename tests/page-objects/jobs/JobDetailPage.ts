import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface JobApplicationData {
  coverLetter?: string;
  resumeFile?: string;
  portfolioUrl?: string;
  linkedinProfile?: string;
  expectedSalary?: string;
  availabilityDate?: string;
  additionalInfo?: string;
  agreeToTerms?: boolean;
}

export interface JobDetailData {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
  remote: string;
  datePosted: string;
  applicationDeadline?: string;
  description: string;
  requirements: string[];
  benefits: string[];
  tags: string[];
  companyInfo: {
    name: string;
    size?: string;
    industry?: string;
    website?: string;
    description?: string;
  };
  applicationCount?: number;
  viewCount?: number;
  isBookmarked: boolean;
  hasApplied: boolean;
  canQuickApply: boolean;
}

export class JobDetailPage extends BasePage {
  // Job header information
  private readonly jobTitle: Locator;
  private readonly companyName: Locator;
  private readonly companyLogo: Locator;
  private readonly jobLocation: Locator;
  private readonly jobSalary: Locator;
  private readonly jobType: Locator;
  private readonly remoteType: Locator;
  private readonly datePosted: Locator;
  private readonly applicationDeadline: Locator;
  private readonly jobTags: Locator;
  
  // Job action buttons
  private readonly applyButton: Locator;
  private readonly quickApplyButton: Locator;
  private readonly bookmarkButton: Locator;
  private readonly shareButton: Locator;
  private readonly reportJobButton: Locator;
  private readonly backToSearchButton: Locator;
  
  // Job description and details
  private readonly jobDescription: Locator;
  private readonly jobRequirements: Locator;
  private readonly jobBenefits: Locator;
  private readonly skillsRequired: Locator;
  private readonly experienceLevel: Locator;
  private readonly educationRequired: Locator;
  
  // Company information
  private readonly companySection: Locator;
  private readonly companyDescription: Locator;
  private readonly companySize: Locator;
  private readonly companyIndustry: Locator;
  private readonly companyWebsite: Locator;
  private readonly companyJobs: Locator;
  private readonly followCompanyButton: Locator;
  
  // Application form elements
  private readonly applicationModal: Locator;
  private readonly applicationForm: Locator;
  private readonly coverLetterTextarea: Locator;
  private readonly resumeUpload: Locator;
  private readonly portfolioUrlInput: Locator;
  private readonly linkedinProfileInput: Locator;
  private readonly expectedSalaryInput: Locator;
  private readonly availabilityDateInput: Locator;
  private readonly additionalInfoTextarea: Locator;
  private readonly agreeToTermsCheckbox: Locator;
  private readonly submitApplicationButton: Locator;
  private readonly saveAsDraftButton: Locator;
  private readonly cancelApplicationButton: Locator;
  
  // Quick apply elements
  private readonly quickApplyModal: Locator;
  private readonly quickApplyResumeSelect: Locator;
  private readonly quickApplyCoverLetterSelect: Locator;
  private readonly quickApplySubmitButton: Locator;
  
  // Application status and tracking
  private readonly applicationStatusBadge: Locator;
  private readonly applicationTrackingSection: Locator;
  private readonly applicationSteps: Locator;
  private readonly currentApplicationStep: Locator;
  private readonly withdrawApplicationButton: Locator;
  
  // Related jobs and recommendations
  private readonly similarJobsSection: Locator;
  private readonly similarJobCards: Locator;
  private readonly recommendedJobsSection: Locator;
  private readonly recommendedJobCards: Locator;
  
  // Statistics and social proof
  private readonly applicationCount: Locator;
  private readonly viewCount: Locator;
  private readonly jobStats: Locator;
  private readonly averageResponseTime: Locator;
  private readonly hiringManagerInfo: Locator;
  
  // Share and social features
  private readonly shareModal: Locator;
  private readonly shareLinkedinButton: Locator;
  private readonly shareTwitterButton: Locator;
  private readonly shareFacebookButton: Locator;
  private readonly copyLinkButton: Locator;
  private readonly shareViaEmailButton: Locator;
  
  // Messages and feedback
  private readonly successMessage: Locator;
  private readonly errorMessage: Locator;
  private readonly loadingSpinner: Locator;
  private readonly validationMessages: Locator;
  
  // Mobile-specific elements
  private readonly mobileApplyButton: Locator;
  private readonly mobileJobActions: Locator;
  private readonly mobileCompanyInfo: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Job header
    this.jobTitle = page.locator('[data-testid="job-title"]');
    this.companyName = page.locator('[data-testid="company-name"]');
    this.companyLogo = page.locator('[data-testid="company-logo"]');
    this.jobLocation = page.locator('[data-testid="job-location"]');
    this.jobSalary = page.locator('[data-testid="job-salary"]');
    this.jobType = page.locator('[data-testid="job-type"]');
    this.remoteType = page.locator('[data-testid="remote-type"]');
    this.datePosted = page.locator('[data-testid="date-posted"]');
    this.applicationDeadline = page.locator('[data-testid="application-deadline"]');
    this.jobTags = page.locator('[data-testid="job-tags"]');
    
    // Action buttons
    this.applyButton = page.locator('[data-testid="apply-button"]');
    this.quickApplyButton = page.locator('[data-testid="quick-apply-button"]');
    this.bookmarkButton = page.locator('[data-testid="bookmark-button"]');
    this.shareButton = page.locator('[data-testid="share-button"]');
    this.reportJobButton = page.locator('[data-testid="report-job"]');
    this.backToSearchButton = page.locator('[data-testid="back-to-search"]');
    
    // Job details
    this.jobDescription = page.locator('[data-testid="job-description"]');
    this.jobRequirements = page.locator('[data-testid="job-requirements"]');
    this.jobBenefits = page.locator('[data-testid="job-benefits"]');
    this.skillsRequired = page.locator('[data-testid="skills-required"]');
    this.experienceLevel = page.locator('[data-testid="experience-level"]');
    this.educationRequired = page.locator('[data-testid="education-required"]');
    
    // Company information
    this.companySection = page.locator('[data-testid="company-section"]');
    this.companyDescription = page.locator('[data-testid="company-description"]');
    this.companySize = page.locator('[data-testid="company-size"]');
    this.companyIndustry = page.locator('[data-testid="company-industry"]');
    this.companyWebsite = page.locator('[data-testid="company-website"]');
    this.companyJobs = page.locator('[data-testid="company-jobs"]');
    this.followCompanyButton = page.locator('[data-testid="follow-company"]');
    
    // Application form
    this.applicationModal = page.locator('[data-testid="application-modal"]');
    this.applicationForm = page.locator('[data-testid="application-form"]');
    this.coverLetterTextarea = page.locator('[data-testid="cover-letter"]');
    this.resumeUpload = page.locator('[data-testid="resume-upload"]');
    this.portfolioUrlInput = page.locator('[data-testid="portfolio-url"]');
    this.linkedinProfileInput = page.locator('[data-testid="linkedin-profile"]');
    this.expectedSalaryInput = page.locator('[data-testid="expected-salary"]');
    this.availabilityDateInput = page.locator('[data-testid="availability-date"]');
    this.additionalInfoTextarea = page.locator('[data-testid="additional-info"]');
    this.agreeToTermsCheckbox = page.locator('[data-testid="agree-to-terms"]');
    this.submitApplicationButton = page.locator('[data-testid="submit-application"]');
    this.saveAsDraftButton = page.locator('[data-testid="save-as-draft"]');
    this.cancelApplicationButton = page.locator('[data-testid="cancel-application"]');
    
    // Quick apply
    this.quickApplyModal = page.locator('[data-testid="quick-apply-modal"]');
    this.quickApplyResumeSelect = page.locator('[data-testid="quick-apply-resume"]');
    this.quickApplyCoverLetterSelect = page.locator('[data-testid="quick-apply-cover-letter"]');
    this.quickApplySubmitButton = page.locator('[data-testid="quick-apply-submit"]');
    
    // Application tracking
    this.applicationStatusBadge = page.locator('[data-testid="application-status"]');
    this.applicationTrackingSection = page.locator('[data-testid="application-tracking"]');
    this.applicationSteps = page.locator('[data-testid="application-steps"]');
    this.currentApplicationStep = page.locator('[data-testid="current-step"]');
    this.withdrawApplicationButton = page.locator('[data-testid="withdraw-application"]');
    
    // Related jobs
    this.similarJobsSection = page.locator('[data-testid="similar-jobs"]');
    this.similarJobCards = page.locator('[data-testid="similar-job-card"]');
    this.recommendedJobsSection = page.locator('[data-testid="recommended-jobs"]');
    this.recommendedJobCards = page.locator('[data-testid="recommended-job-card"]');
    
    // Statistics
    this.applicationCount = page.locator('[data-testid="application-count"]');
    this.viewCount = page.locator('[data-testid="view-count"]');
    this.jobStats = page.locator('[data-testid="job-stats"]');
    this.averageResponseTime = page.locator('[data-testid="avg-response-time"]');
    this.hiringManagerInfo = page.locator('[data-testid="hiring-manager"]');
    
    // Share functionality
    this.shareModal = page.locator('[data-testid="share-modal"]');
    this.shareLinkedinButton = page.locator('[data-testid="share-linkedin"]');
    this.shareTwitterButton = page.locator('[data-testid="share-twitter"]');
    this.shareFacebookButton = page.locator('[data-testid="share-facebook"]');
    this.copyLinkButton = page.locator('[data-testid="copy-link"]');
    this.shareViaEmailButton = page.locator('[data-testid="share-email"]');
    
    // Messages
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.validationMessages = page.locator('[data-testid="validation-message"]');
    
    // Mobile elements
    this.mobileApplyButton = page.locator('[data-testid="mobile-apply-button"]');
    this.mobileJobActions = page.locator('[data-testid="mobile-job-actions"]');
    this.mobileCompanyInfo = page.locator('[data-testid="mobile-company-info"]');
  }

  /**
   * Navigate to job detail page
   */
  async goto(jobId: string) {
    await this.navigate(`/jobs/${jobId}`);
    await this.waitForPageLoad();
  }

  /**
   * Get complete job details
   */
  async getJobDetails(): Promise<JobDetailData> {
    await this.waitForPageLoad();
    
    const jobData: JobDetailData = {
      id: await this.getCurrentJobId(),
      title: await this.jobTitle.textContent() || '',
      company: await this.companyName.textContent() || '',
      location: await this.jobLocation.textContent() || '',
      salary: await this.getJobSalary(),
      type: await this.jobType.textContent() || '',
      remote: await this.remoteType.textContent() || '',
      datePosted: await this.datePosted.textContent() || '',
      applicationDeadline: await this.getApplicationDeadline(),
      description: await this.jobDescription.textContent() || '',
      requirements: await this.getJobRequirements(),
      benefits: await this.getJobBenefits(),
      tags: await this.getJobTags(),
      companyInfo: await this.getCompanyInfo(),
      applicationCount: await this.getApplicationCount(),
      viewCount: await this.getViewCount(),
      isBookmarked: await this.isJobBookmarked(),
      hasApplied: await this.hasUserApplied(),
      canQuickApply: await this.canUseQuickApply()
    };
    
    return jobData;
  }

  /**
   * Apply to job with full application form
   */
  async applyToJob(applicationData: JobApplicationData) {
    await this.applyButton.click();
    await this.applicationModal.waitFor({ state: 'visible' });
    
    if (applicationData.coverLetter) {
      await this.coverLetterTextarea.fill(applicationData.coverLetter);
    }
    
    if (applicationData.resumeFile) {
      await this.resumeUpload.setInputFiles(applicationData.resumeFile);
    }
    
    if (applicationData.portfolioUrl) {
      await this.portfolioUrlInput.fill(applicationData.portfolioUrl);
    }
    
    if (applicationData.linkedinProfile) {
      await this.linkedinProfileInput.fill(applicationData.linkedinProfile);
    }
    
    if (applicationData.expectedSalary) {
      await this.expectedSalaryInput.fill(applicationData.expectedSalary);
    }
    
    if (applicationData.availabilityDate) {
      await this.availabilityDateInput.fill(applicationData.availabilityDate);
    }
    
    if (applicationData.additionalInfo) {
      await this.additionalInfoTextarea.fill(applicationData.additionalInfo);
    }
    
    if (applicationData.agreeToTerms !== false) {
      await this.agreeToTermsCheckbox.check();
    }
    
    await this.submitApplicationButton.click();
    
    // Wait for success or error message
    await Promise.race([
      this.successMessage.waitFor({ state: 'visible', timeout: 30000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 })
    ]);
  }

  /**
   * Quick apply to job
   */
  async quickApplyToJob(resumeOption?: string, coverLetterOption?: string) {
    await this.quickApplyButton.click();
    await this.quickApplyModal.waitFor({ state: 'visible' });
    
    if (resumeOption) {
      await this.quickApplyResumeSelect.selectOption(resumeOption);
    }
    
    if (coverLetterOption) {
      await this.quickApplyCoverLetterSelect.selectOption(coverLetterOption);
    }
    
    await this.quickApplySubmitButton.click();
    
    // Wait for application to be submitted
    await Promise.race([
      this.successMessage.waitFor({ state: 'visible', timeout: 30000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 })
    ]);
  }

  /**
   * Bookmark/unbookmark job
   */
  async toggleBookmark() {
    const isCurrentlyBookmarked = await this.isJobBookmarked();
    await this.bookmarkButton.click();
    
    // Wait for bookmark state to change
    await this.page.waitForFunction(
      (wasBookmarked) => {
        const bookmarkBtn = document.querySelector('[data-testid="bookmark-button"]');
        const isNowBookmarked = bookmarkBtn?.classList.contains('bookmarked') || 
                               bookmarkBtn?.getAttribute('aria-pressed') === 'true';
        return isNowBookmarked !== wasBookmarked;
      },
      isCurrentlyBookmarked,
      { timeout: 5000 }
    );
  }

  /**
   * Share job
   */
  async shareJob(platform: 'linkedin' | 'twitter' | 'facebook' | 'email' | 'copy-link') {
    await this.shareButton.click();
    await this.shareModal.waitFor({ state: 'visible' });
    
    switch (platform) {
      case 'linkedin':
        await this.shareLinkedinButton.click();
        break;
      case 'twitter':
        await this.shareTwitterButton.click();
        break;
      case 'facebook':
        await this.shareFacebookButton.click();
        break;
      case 'email':
        await this.shareViaEmailButton.click();
        break;
      case 'copy-link':
        await this.copyLinkButton.click();
        break;
    }
    
    // Wait for share action to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Follow/unfollow company
   */
  async toggleFollowCompany() {
    if (await this.followCompanyButton.isVisible()) {
      await this.followCompanyButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * View similar jobs
   */
  async viewSimilarJobs(): Promise<number> {
    if (await this.similarJobsSection.isVisible()) {
      return await this.similarJobCards.count();
    }
    return 0;
  }

  /**
   * Click on a similar job
   */
  async clickSimilarJob(index: number) {
    const similarJob = this.similarJobCards.nth(index);
    await similarJob.click();
    await this.waitForNavigation(/\/jobs\/[^\/]+/);
  }

  /**
   * View recommended jobs
   */
  async viewRecommendedJobs(): Promise<number> {
    if (await this.recommendedJobsSection.isVisible()) {
      return await this.recommendedJobCards.count();
    }
    return 0;
  }

  /**
   * Withdraw application
   */
  async withdrawApplication() {
    if (await this.withdrawApplicationButton.isVisible()) {
      await this.withdrawApplicationButton.click();
      
      // Handle confirmation dialog if present
      const confirmButton = this.page.locator('[data-testid="confirm-withdraw"]');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await this.successMessage.waitFor({ state: 'visible', timeout: 10000 });
    }
  }

  /**
   * Get application status
   */
  async getApplicationStatus(): Promise<string | null> {
    if (await this.applicationStatusBadge.isVisible()) {
      return await this.applicationStatusBadge.textContent();
    }
    return null;
  }

  /**
   * Track application progress
   */
  async getApplicationProgress(): Promise<Array<{ step: string; status: string; date?: string }>> {
    if (!await this.applicationTrackingSection.isVisible()) {
      return [];
    }
    
    const stepElements = await this.applicationSteps.locator('.step').all();
    const progress = [];
    
    for (const stepElement of stepElements) {
      const stepName = await stepElement.locator('.step-name').textContent();
      const stepStatus = await stepElement.locator('.step-status').textContent();
      const stepDate = await stepElement.locator('.step-date').textContent();
      
      progress.push({
        step: stepName || '',
        status: stepStatus || '',
        date: stepDate || undefined
      });
    }
    
    return progress;
  }

  /**
   * Save application as draft
   */
  async saveApplicationAsDraft(applicationData: Partial<JobApplicationData>) {
    await this.applyButton.click();
    await this.applicationModal.waitFor({ state: 'visible' });
    
    // Fill partial data
    if (applicationData.coverLetter) {
      await this.coverLetterTextarea.fill(applicationData.coverLetter);
    }
    
    if (applicationData.resumeFile) {
      await this.resumeUpload.setInputFiles(applicationData.resumeFile);
    }
    
    await this.saveAsDraftButton.click();
    await this.successMessage.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Report job
   */
  async reportJob(reason: string) {
    await this.reportJobButton.click();
    
    const reportModal = this.page.locator('[data-testid="report-job-modal"]');
    await reportModal.waitFor({ state: 'visible' });
    
    const reasonSelect = this.page.locator('[data-testid="report-reason"]');
    await reasonSelect.selectOption(reason);
    
    const submitReportButton = this.page.locator('[data-testid="submit-report"]');
    await submitReportButton.click();
    
    await this.successMessage.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Go back to job search
   */
  async goBackToSearch() {
    await this.backToSearchButton.click();
    await this.waitForNavigation(/\/jobs/);
  }

  // Helper methods

  private async getCurrentJobId(): Promise<string> {
    const currentUrl = await this.getCurrentURL();
    const match = currentUrl.match(/\/jobs\/([^\/]+)/);
    return match ? match[1] : '';
  }

  private async getJobSalary(): Promise<string | undefined> {
    if (await this.jobSalary.isVisible()) {
      return await this.jobSalary.textContent() || undefined;
    }
    return undefined;
  }

  private async getApplicationDeadline(): Promise<string | undefined> {
    if (await this.applicationDeadline.isVisible()) {
      return await this.applicationDeadline.textContent() || undefined;
    }
    return undefined;
  }

  private async getJobRequirements(): Promise<string[]> {
    const requirementElements = await this.jobRequirements.locator('li').all();
    const requirements: string[] = [];
    
    for (const element of requirementElements) {
      const requirement = await element.textContent();
      if (requirement) {
        requirements.push(requirement.trim());
      }
    }
    
    return requirements;
  }

  private async getJobBenefits(): Promise<string[]> {
    const benefitElements = await this.jobBenefits.locator('li').all();
    const benefits: string[] = [];
    
    for (const element of benefitElements) {
      const benefit = await element.textContent();
      if (benefit) {
        benefits.push(benefit.trim());
      }
    }
    
    return benefits;
  }

  private async getJobTags(): Promise<string[]> {
    const tagElements = await this.jobTags.locator('.tag').all();
    const tags: string[] = [];
    
    for (const element of tagElements) {
      const tag = await element.textContent();
      if (tag) {
        tags.push(tag.trim());
      }
    }
    
    return tags;
  }

  private async getCompanyInfo(): Promise<JobDetailData['companyInfo']> {
    return {
      name: await this.companyName.textContent() || '',
      size: await this.companySize.textContent() || undefined,
      industry: await this.companyIndustry.textContent() || undefined,
      website: await this.companyWebsite.getAttribute('href') || undefined,
      description: await this.companyDescription.textContent() || undefined
    };
  }

  private async getApplicationCount(): Promise<number | undefined> {
    if (await this.applicationCount.isVisible()) {
      const countText = await this.applicationCount.textContent();
      const match = countText?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : undefined;
    }
    return undefined;
  }

  private async getViewCount(): Promise<number | undefined> {
    if (await this.viewCount.isVisible()) {
      const countText = await this.viewCount.textContent();
      const match = countText?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : undefined;
    }
    return undefined;
  }

  private async isJobBookmarked(): Promise<boolean> {
    return await this.bookmarkButton.getAttribute('aria-pressed') === 'true' ||
           await this.hasClass('[data-testid="bookmark-button"]', 'bookmarked');
  }

  private async hasUserApplied(): Promise<boolean> {
    return await this.applicationStatusBadge.isVisible();
  }

  private async canUseQuickApply(): Promise<boolean> {
    return await this.quickApplyButton.isVisible();
  }

  /**
   * Test mobile job detail experience
   */
  async testMobileJobDetail() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile apply button is visible
    await expect(this.mobileApplyButton).toBeVisible();
    
    // Check if job actions are accessible on mobile
    await expect(this.mobileJobActions).toBeVisible();
    
    // Test scrolling to different sections
    await this.scrollToElement('[data-testid="job-description"]');
    await this.scrollToElement('[data-testid="company-section"]');
    
    return true;
  }

  /**
   * Validate job detail accessibility
   */
  async validateJobDetailAccessibility() {
    // Check heading hierarchy
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check apply button accessibility
    const applyButtonAriaLabel = await this.applyButton.getAttribute('aria-label');
    expect(applyButtonAriaLabel).toBeTruthy();
    
    // Check bookmark button accessibility
    const bookmarkAriaLabel = await this.bookmarkButton.getAttribute('aria-label');
    expect(bookmarkAriaLabel).toBeTruthy();
    
    return true;
  }
}