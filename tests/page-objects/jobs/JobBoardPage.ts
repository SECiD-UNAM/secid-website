import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TestJobData } from '../../utils/test-data-generator';

export interface JobFilterOptions {
  location?: string;
  jobType?: string;
  experience?: string;
  salary?: string;
  remote?: string;
  company?: string;
  tags?: string[];
  datePosted?: string;
}

export interface JobCardData {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
  remote: string;
  datePosted: string;
  tags: string[];
  isFeatured: boolean;
  isBookmarked: boolean;
}

export class JobBoardPage extends BasePage {
  // Search and filters
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly clearSearchButton: Locator;
  private readonly filtersToggle: Locator;
  private readonly filtersPanel: Locator;
  private readonly applyFiltersButton: Locator;
  private readonly clearFiltersButton: Locator;
  
  // Filter controls
  private readonly locationFilter: Locator;
  private readonly jobTypeFilter: Locator;
  private readonly experienceFilter: Locator;
  private readonly salaryFilter: Locator;
  private readonly remoteFilter: Locator;
  private readonly companyFilter: Locator;
  private readonly tagsFilter: Locator;
  private readonly datePostedFilter: Locator;
  
  // Advanced filters
  private readonly advancedFiltersToggle: Locator;
  private readonly advancedFiltersPanel: Locator;
  private readonly companySizeFilter: Locator;
  private readonly industryFilter: Locator;
  private readonly benefitsFilter: Locator;
  private readonly keywordExcludeInput: Locator;
  
  // Sorting and view options
  private readonly sortDropdown: Locator;
  private readonly viewToggle: Locator;
  private readonly resultsPerPageSelect: Locator;
  
  // Job listings
  private readonly jobListings: Locator;
  private readonly jobCards: Locator;
  private readonly jobListView: Locator;
  private readonly jobGridView: Locator;
  private readonly noResultsMessage: Locator;
  private readonly loadingJobsSpinner: Locator;
  
  // Job card elements
  private readonly jobTitle: Locator;
  private readonly jobCompany: Locator;
  private readonly jobLocation: Locator;
  private readonly jobSalary: Locator;
  private readonly jobType: Locator;
  private readonly jobTags: Locator;
  private readonly jobDatePosted: Locator;
  private readonly bookmarkButton: Locator;
  private readonly shareButton: Locator;
  private readonly quickApplyButton: Locator;
  private readonly viewDetailsButton: Locator;
  
  // Pagination
  private readonly pagination: Locator;
  private readonly previousPageButton: Locator;
  private readonly nextPageButton: Locator;
  private readonly pageNumbers: Locator;
  private readonly currentPageIndicator: Locator;
  private readonly totalResultsCount: Locator;
  
  // Quick actions
  private readonly bulkActionsPanel: Locator;
  private readonly selectAllCheckbox: Locator;
  private readonly selectedJobsCount: Locator;
  private readonly bulkBookmarkButton: Locator;
  private readonly bulkApplyButton: Locator;
  private readonly bulkShareButton: Locator;
  
  // Job alerts
  private readonly createJobAlertButton: Locator;
  private readonly jobAlertModal: Locator;
  private readonly alertNameInput: Locator;
  private readonly alertFrequencySelect: Locator;
  private readonly saveAlertButton: Locator;
  
  // Featured jobs
  private readonly featuredJobsSection: Locator;
  private readonly featuredJobsCarousel: Locator;
  private readonly featuredJobCard: Locator;
  private readonly nextFeaturedButton: Locator;
  private readonly previousFeaturedButton: Locator;
  
  // Recommended jobs
  private readonly recommendedJobsSection: Locator;
  private readonly recommendedJobCards: Locator;
  private readonly showMoreRecommendedButton: Locator;
  
  // Company logos and branding
  private readonly companyLogos: Locator;
  private readonly verifiedCompanyBadge: Locator;
  private readonly premiumJobBadge: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Search and filters
    this.searchInput = page.locator('[data-testid="job-search-input"]');
    this.searchButton = page.locator('[data-testid="job-search-button"]');
    this.clearSearchButton = page.locator('[data-testid="clear-search"]');
    this.filtersToggle = page.locator('[data-testid="filters-toggle"]');
    this.filtersPanel = page.locator('[data-testid="filters-panel"]');
    this.applyFiltersButton = page.locator('[data-testid="apply-filters"]');
    this.clearFiltersButton = page.locator('[data-testid="clear-filters"]');
    
    // Filter controls
    this.locationFilter = page.locator('[data-testid="filter-location"]');
    this.jobTypeFilter = page.locator('[data-testid="filter-job-type"]');
    this.experienceFilter = page.locator('[data-testid="filter-experience"]');
    this.salaryFilter = page.locator('[data-testid="filter-salary"]');
    this.remoteFilter = page.locator('[data-testid="filter-remote"]');
    this.companyFilter = page.locator('[data-testid="filter-company"]');
    this.tagsFilter = page.locator('[data-testid="filter-tags"]');
    this.datePostedFilter = page.locator('[data-testid="filter-date-posted"]');
    
    // Advanced filters
    this.advancedFiltersToggle = page.locator('[data-testid="advanced-filters-toggle"]');
    this.advancedFiltersPanel = page.locator('[data-testid="advanced-filters-panel"]');
    this.companySizeFilter = page.locator('[data-testid="filter-company-size"]');
    this.industryFilter = page.locator('[data-testid="filter-industry"]');
    this.benefitsFilter = page.locator('[data-testid="filter-benefits"]');
    this.keywordExcludeInput = page.locator('[data-testid="exclude-keywords"]');
    
    // Sorting and view
    this.sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    this.viewToggle = page.locator('[data-testid="view-toggle"]');
    this.resultsPerPageSelect = page.locator('[data-testid="results-per-page"]');
    
    // Job listings
    this.jobListings = page.locator('[data-testid="job-listings"]');
    this.jobCards = page.locator('[data-testid="job-card"]');
    this.jobListView = page.locator('[data-testid="job-list-view"]');
    this.jobGridView = page.locator('[data-testid="job-grid-view"]');
    this.noResultsMessage = page.locator('[data-testid="no-results"]');
    this.loadingJobsSpinner = page.locator('[data-testid="loading-jobs"]');
    
    // Job card elements
    this.jobTitle = page.locator('[data-testid="job-title"]');
    this.jobCompany = page.locator('[data-testid="job-company"]');
    this.jobLocation = page.locator('[data-testid="job-location"]');
    this.jobSalary = page.locator('[data-testid="job-salary"]');
    this.jobType = page.locator('[data-testid="job-type"]');
    this.jobTags = page.locator('[data-testid="job-tags"]');
    this.jobDatePosted = page.locator('[data-testid="job-date-posted"]');
    this.bookmarkButton = page.locator('[data-testid="bookmark-job"]');
    this.shareButton = page.locator('[data-testid="share-job"]');
    this.quickApplyButton = page.locator('[data-testid="quick-apply"]');
    this.viewDetailsButton = page.locator('[data-testid="view-job-details"]');
    
    // Pagination
    this.pagination = page.locator('[data-testid="pagination"]');
    this.previousPageButton = page.locator('[data-testid="previous-page"]');
    this.nextPageButton = page.locator('[data-testid="next-page"]');
    this.pageNumbers = page.locator('[data-testid="page-number"]');
    this.currentPageIndicator = page.locator('[data-testid="current-page"]');
    this.totalResultsCount = page.locator('[data-testid="total-results"]');
    
    // Quick actions
    this.bulkActionsPanel = page.locator('[data-testid="bulk-actions"]');
    this.selectAllCheckbox = page.locator('[data-testid="select-all-jobs"]');
    this.selectedJobsCount = page.locator('[data-testid="selected-jobs-count"]');
    this.bulkBookmarkButton = page.locator('[data-testid="bulk-bookmark"]');
    this.bulkApplyButton = page.locator('[data-testid="bulk-apply"]');
    this.bulkShareButton = page.locator('[data-testid="bulk-share"]');
    
    // Job alerts
    this.createJobAlertButton = page.locator('[data-testid="create-job-alert"]');
    this.jobAlertModal = page.locator('[data-testid="job-alert-modal"]');
    this.alertNameInput = page.locator('[data-testid="alert-name"]');
    this.alertFrequencySelect = page.locator('[data-testid="alert-frequency"]');
    this.saveAlertButton = page.locator('[data-testid="save-alert"]');
    
    // Featured jobs
    this.featuredJobsSection = page.locator('[data-testid="featured-jobs"]');
    this.featuredJobsCarousel = page.locator('[data-testid="featured-carousel"]');
    this.featuredJobCard = page.locator('[data-testid="featured-job-card"]');
    this.nextFeaturedButton = page.locator('[data-testid="next-featured"]');
    this.previousFeaturedButton = page.locator('[data-testid="previous-featured"]');
    
    // Recommended jobs
    this.recommendedJobsSection = page.locator('[data-testid="recommended-jobs"]');
    this.recommendedJobCards = page.locator('[data-testid="recommended-job-card"]');
    this.showMoreRecommendedButton = page.locator('[data-testid="show-more-recommended"]');
    
    // Company branding
    this.companyLogos = page.locator('[data-testid="company-logo"]');
    this.verifiedCompanyBadge = page.locator('[data-testid="verified-company"]');
    this.premiumJobBadge = page.locator('[data-testid="premium-job"]');
  }

  /**
   * Navigate to job board
   */
  async goto() {
    await this.navigate('/jobs');
    await this.waitForPageLoad();
  }

  /**
   * Search for jobs
   */
  async searchJobs(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.waitForJobsToLoad();
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.clearSearchButton.click();
    await this.waitForJobsToLoad();
  }

  /**
   * Apply job filters
   */
  async applyFilters(filters: JobFilterOptions) {
    // Open filters panel if not already open
    if (!await this.filtersPanel.isVisible()) {
      await this.filtersToggle.click();
    }
    
    if (filters.location) {
      await this.locationFilter.selectOption(filters.location);
    }
    
    if (filters.jobType) {
      await this.jobTypeFilter.selectOption(filters.jobType);
    }
    
    if (filters.experience) {
      await this.experienceFilter.selectOption(filters.experience);
    }
    
    if (filters.salary) {
      await this.salaryFilter.selectOption(filters.salary);
    }
    
    if (filters.remote) {
      await this.remoteFilter.selectOption(filters.remote);
    }
    
    if (filters.company) {
      await this.companyFilter.selectOption(filters.company);
    }
    
    if (filters.datePosted) {
      await this.datePostedFilter.selectOption(filters.datePosted);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        const tagCheckbox = this.tagsFilter.locator(`[value="${tag}"]`);
        await tagCheckbox.check();
      }
    }
    
    await this.applyFiltersButton.click();
    await this.waitForJobsToLoad();
  }

  /**
   * Clear all filters
   */
  async clearAllFilters() {
    await this.clearFiltersButton.click();
    await this.waitForJobsToLoad();
  }

  /**
   * Sort jobs
   */
  async sortJobs(sortBy: 'relevance' | 'date' | 'salary' | 'company') {
    await this.sortDropdown.selectOption(sortBy);
    await this.waitForJobsToLoad();
  }

  /**
   * Switch view mode
   */
  async switchViewMode(mode: 'list' | 'grid') {
    const viewButton = this.viewToggle.locator(`[data-view="${mode}"]`);
    await viewButton.click();
    
    if (mode === 'list') {
      await this.jobListView.waitFor({ state: 'visible' });
    } else {
      await this.jobGridView.waitFor({ state: 'visible' });
    }
  }

  /**
   * Get all job cards data
   */
  async getAllJobCards(): Promise<JobCardData[]> {
    await this.waitForJobsToLoad();
    
    const jobCards = await this.jobCards.all();
    const jobsData: JobCardData[] = [];
    
    for (let i = 0; i < jobCards.length; i++) {
      const card = jobCards[i];
      
      const jobData: JobCardData = {
        id: await card.getAttribute('data-job-id') || `job-${i}`,
        title: await card.locator('[data-testid="job-title"]').textContent() || '',
        company: await card.locator('[data-testid="job-company"]').textContent() || '',
        location: await card.locator('[data-testid="job-location"]').textContent() || '',
        salary: await card.locator('[data-testid="job-salary"]').textContent() || undefined,
        type: await card.locator('[data-testid="job-type"]').textContent() || '',
        remote: await card.locator('[data-testid="job-remote"]').textContent() || '',
        datePosted: await card.locator('[data-testid="job-date-posted"]').textContent() || '',
        tags: [],
        isFeatured: await card.locator('[data-testid="featured-badge"]').isVisible(),
        isBookmarked: await card.locator('[data-testid="bookmark-job"]').isChecked()
      };
      
      // Get job tags
      const tagElements = await card.locator('[data-testid="job-tag"]').all();
      for (const tagElement of tagElements) {
        const tagText = await tagElement.textContent();
        if (tagText) {
          jobData.tags.push(tagText.trim());
        }
      }
      
      jobsData.push(jobData);
    }
    
    return jobsData;
  }

  /**
   * Get job count
   */
  async getJobCount(): Promise<number> {
    await this.waitForJobsToLoad();
    return await this.jobCards.count();
  }

  /**
   * Get total results count
   */
  async getTotalResultsCount(): Promise<number> {
    if (await this.totalResultsCount.isVisible()) {
      const countText = await this.totalResultsCount.textContent();
      const match = countText?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  /**
   * Click on a specific job card
   */
  async clickJobCard(jobId: string) {
    const jobCard = this.jobCards.filter({ has: this.page.locator(`[data-job-id="${jobId}"]`) });
    await jobCard.click();
    await this.waitForNavigation(/\/jobs\/[^\/]+/);
  }

  /**
   * Bookmark a job
   */
  async bookmarkJob(jobId: string) {
    const jobCard = this.jobCards.filter({ has: this.page.locator(`[data-job-id="${jobId}"]`) });
    const bookmarkBtn = jobCard.locator('[data-testid="bookmark-job"]');
    await bookmarkBtn.click();
    
    // Wait for bookmark state to change
    await this.page.waitForTimeout(500);
  }

  /**
   * Quick apply to a job
   */
  async quickApplyToJob(jobId: string) {
    const jobCard = this.jobCards.filter({ has: this.page.locator(`[data-job-id="${jobId}"]`) });
    const quickApplyBtn = jobCard.locator('[data-testid="quick-apply"]');
    
    if (await quickApplyBtn.isVisible()) {
      await quickApplyBtn.click();
      
      // Wait for quick apply modal or redirect
      await Promise.race([
        this.page.waitForSelector('[data-testid="quick-apply-modal"]'),
        this.page.waitForURL(/\/jobs\/[^\/]+\/apply/)
      ]);
    }
  }

  /**
   * View job details
   */
  async viewJobDetails(jobId: string) {
    const jobCard = this.jobCards.filter({ has: this.page.locator(`[data-job-id="${jobId}"]`) });
    const viewDetailsBtn = jobCard.locator('[data-testid="view-job-details"]');
    await viewDetailsBtn.click();
    await this.waitForNavigation(/\/jobs\/[^\/]+/);
  }

  /**
   * Navigate to next page
   */
  async goToNextPage() {
    if (await this.nextPageButton.isEnabled()) {
      await this.nextPageButton.click();
      await this.waitForJobsToLoad();
    }
  }

  /**
   * Navigate to previous page
   */
  async goToPreviousPage() {
    if (await this.previousPageButton.isEnabled()) {
      await this.previousPageButton.click();
      await this.waitForJobsToLoad();
    }
  }

  /**
   * Navigate to specific page
   */
  async goToPage(pageNumber: number) {
    const pageButton = this.pageNumbers.filter({ hasText: pageNumber.toString() });
    await pageButton.click();
    await this.waitForJobsToLoad();
  }

  /**
   * Get current page number
   */
  async getCurrentPage(): Promise<number> {
    const currentPageText = await this.currentPageIndicator.textContent();
    return parseInt(currentPageText || '1', 10);
  }

  /**
   * Create job alert
   */
  async createJobAlert(alertName: string, frequency: 'daily' | 'weekly' | 'monthly' = 'weekly') {
    await this.createJobAlertButton.click();
    await this.jobAlertModal.waitFor({ state: 'visible' });
    
    await this.alertNameInput.fill(alertName);
    await this.alertFrequencySelect.selectOption(frequency);
    await this.saveAlertButton.click();
    
    await this.jobAlertModal.waitFor({ state: 'hidden' });
  }

  /**
   * Select multiple jobs for bulk actions
   */
  async selectJobsForBulkAction(jobIds: string[]) {
    for (const jobId of jobIds) {
      const jobCard = this.jobCards.filter({ has: this.page.locator(`[data-job-id="${jobId}"]`) });
      const checkbox = jobCard.locator('[data-testid="select-job"]');
      await checkbox.check();
    }
    
    // Wait for bulk actions panel to appear
    await this.bulkActionsPanel.waitFor({ state: 'visible' });
  }

  /**
   * Select all jobs on current page
   */
  async selectAllJobs() {
    await this.selectAllCheckbox.check();
    await this.bulkActionsPanel.waitFor({ state: 'visible' });
  }

  /**
   * Bulk bookmark selected jobs
   */
  async bulkBookmarkJobs() {
    await this.bulkBookmarkButton.click();
    await this.page.waitForTimeout(1000); // Wait for action to complete
  }

  /**
   * Browse featured jobs
   */
  async browseFeaturedJobs() {
    if (await this.featuredJobsSection.isVisible()) {
      const featuredCards = await this.featuredJobCard.all();
      return featuredCards.length;
    }
    return 0;
  }

  /**
   * Navigate featured jobs carousel
   */
  async navigateFeaturedJobsCarousel(direction: 'next' | 'previous') {
    if (direction === 'next' && await this.nextFeaturedButton.isVisible()) {
      await this.nextFeaturedButton.click();
    } else if (direction === 'previous' && await this.previousFeaturedButton.isVisible()) {
      await this.previousFeaturedButton.click();
    }
    
    await this.page.waitForTimeout(500); // Wait for carousel animation
  }

  /**
   * Get recommended jobs
   */
  async getRecommendedJobs(): Promise<number> {
    if (await this.recommendedJobsSection.isVisible()) {
      return await this.recommendedJobCards.count();
    }
    return 0;
  }

  /**
   * Load more recommended jobs
   */
  async loadMoreRecommendedJobs() {
    if (await this.showMoreRecommendedButton.isVisible()) {
      await this.showMoreRecommendedButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Filter by company
   */
  async filterByCompany(companyName: string) {
    await this.companyFilter.fill(companyName);
    await this.applyFiltersButton.click();
    await this.waitForJobsToLoad();
  }

  /**
   * Check if no results message is shown
   */
  async hasNoResults(): Promise<boolean> {
    return await this.noResultsMessage.isVisible();
  }

  /**
   * Wait for jobs to load
   */
  async waitForJobsToLoad() {
    // Wait for loading spinner to disappear
    if (await this.loadingJobsSpinner.isVisible()) {
      await this.loadingJobsSpinner.waitFor({ state: 'hidden', timeout: 30000 });
    }
    
    // Wait for either job cards or no results message
    await Promise.race([
      this.jobCards.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      this.noResultsMessage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
    ]);
  }

  /**
   * Test mobile job board experience
   */
  async testMobileExperience() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Check if filters toggle is available on mobile
    await expect(this.filtersToggle).toBeVisible();
    
    // Check if job cards adapt to mobile layout
    const firstJobCard = this.jobCards.first();
    const cardBox = await firstJobCard.boundingBox();
    expect(cardBox?.width).toBeLessThanOrEqual(375);
    
    return true;
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(searchQuery: string, filters: JobFilterOptions) {
    // Perform search
    await this.searchJobs(searchQuery);
    
    // Apply filters
    await this.applyFilters(filters);
    
    // Return results
    return await this.getAllJobCards();
  }
}