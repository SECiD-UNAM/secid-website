import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TestUserData } from '../../utils/test-data-generator';

export interface OnboardingStepData {
  stepNumber: number;
  stepName: string;
  isComplete: boolean;
  isActive: boolean;
}

export class OnboardingPage extends BasePage {
  // Progress indicators
  private readonly progressBar: Locator;
  private readonly progressSteps: Locator;
  private readonly currentStepIndicator: Locator;
  private readonly stepTitle: Locator;
  private readonly stepDescription: Locator;
  
  // Navigation controls
  private readonly nextButton: Locator;
  private readonly previousButton: Locator;
  private readonly skipButton: Locator;
  private readonly finishButton: Locator;
  
  // Step 1: Welcome & Profile Photo
  private readonly welcomeStep: Locator;
  private readonly profilePhotoUpload: Locator;
  private readonly photoPreview: Locator;
  private readonly removePhotoButton: Locator;
  private readonly skipPhotoButton: Locator;
  
  // Step 2: Professional Information
  private readonly professionalStep: Locator;
  private readonly currentCompanyInput: Locator;
  private readonly currentPositionInput: Locator;
  private readonly experienceYearsSelect: Locator;
  private readonly industrySelect: Locator;
  private readonly salaryRangeSelect: Locator;
  private readonly remotePreferenceSelect: Locator;
  
  // Step 3: Skills & Expertise
  private readonly skillsStep: Locator;
  private readonly skillsSearchInput: Locator;
  private readonly skillsSuggestions: Locator;
  private readonly selectedSkills: Locator;
  private readonly addSkillButton: Locator;
  private readonly removeSkillButtons: Locator;
  private readonly skillCategories: Locator;
  
  // Step 4: Career Goals
  private readonly careerGoalsStep: Locator;
  private readonly careerGoalsTextarea: Locator;
  private readonly lookingForJobCheckbox: Locator;
  private readonly openToOpportunitiesCheckbox: Locator;
  private readonly interestedInMentorshipCheckbox: Locator;
  private readonly wantToMentorCheckbox: Locator;
  private readonly jobTypesSelect: Locator;
  private readonly preferredLocationsInput: Locator;
  
  // Step 5: Networking Preferences
  private readonly networkingStep: Locator;
  private readonly linkedinProfileInput: Locator;
  private readonly githubProfileInput: Locator;
  private readonly personalWebsiteInput: Locator;
  private readonly bioTextarea: Locator;
  private readonly visibilitySettings: Locator;
  private readonly profileVisibilitySelect: Locator;
  private readonly showContactInfoCheckbox: Locator;
  private readonly showCareerInfoCheckbox: Locator;
  
  // Step 6: Notification Preferences
  private readonly notificationsStep: Locator;
  private readonly emailNotificationsCheckbox: Locator;
  private readonly smsNotificationsCheckbox: Locator;
  private readonly jobAlertsCheckbox: Locator;
  private readonly eventNotificationsCheckbox: Locator;
  private readonly mentorshipNotificationsCheckbox: Locator;
  private readonly marketingEmailsCheckbox: Locator;
  private readonly notificationFrequencySelect: Locator;
  
  // Completion step
  private readonly completionStep: Locator;
  private readonly completionMessage: Locator;
  private readonly profileCompleteness: Locator;
  private readonly goToDashboardButton: Locator;
  private readonly exploreJobsButton: Locator;
  private readonly joinNetworkingButton: Locator;
  
  // Messages and feedback
  private readonly errorMessage: Locator;
  private readonly successMessage: Locator;
  private readonly loadingSpinner: Locator;
  private readonly validationMessages: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Progress indicators
    this.progressBar = page.locator('[data-testid="onboarding-progress-bar"]');
    this.progressSteps = page.locator('[data-testid="progress-steps"]');
    this.currentStepIndicator = page.locator('[data-testid="current-step"]');
    this.stepTitle = page.locator('[data-testid="step-title"]');
    this.stepDescription = page.locator('[data-testid="step-description"]');
    
    // Navigation
    this.nextButton = page.locator('[data-testid="onboarding-next"]');
    this.previousButton = page.locator('[data-testid="onboarding-previous"]');
    this.skipButton = page.locator('[data-testid="onboarding-skip"]');
    this.finishButton = page.locator('[data-testid="onboarding-finish"]');
    
    // Step 1: Welcome
    this.welcomeStep = page.locator('[data-testid="welcome-step"]');
    this.profilePhotoUpload = page.locator('[data-testid="profile-photo-upload"]');
    this.photoPreview = page.locator('[data-testid="photo-preview"]');
    this.removePhotoButton = page.locator('[data-testid="remove-photo"]');
    this.skipPhotoButton = page.locator('[data-testid="skip-photo"]');
    
    // Step 2: Professional Info
    this.professionalStep = page.locator('[data-testid="professional-step"]');
    this.currentCompanyInput = page.locator('[data-testid="current-company"]');
    this.currentPositionInput = page.locator('[data-testid="current-position"]');
    this.experienceYearsSelect = page.locator('[data-testid="experience-years"]');
    this.industrySelect = page.locator('[data-testid="industry"]');
    this.salaryRangeSelect = page.locator('[data-testid="salary-range"]');
    this.remotePreferenceSelect = page.locator('[data-testid="remote-preference"]');
    
    // Step 3: Skills
    this.skillsStep = page.locator('[data-testid="skills-step"]');
    this.skillsSearchInput = page.locator('[data-testid="skills-search"]');
    this.skillsSuggestions = page.locator('[data-testid="skills-suggestions"]');
    this.selectedSkills = page.locator('[data-testid="selected-skills"]');
    this.addSkillButton = page.locator('[data-testid="add-skill"]');
    this.removeSkillButtons = page.locator('[data-testid="remove-skill"]');
    this.skillCategories = page.locator('[data-testid="skill-categories"]');
    
    // Step 4: Career Goals
    this.careerGoalsStep = page.locator('[data-testid="career-goals-step"]');
    this.careerGoalsTextarea = page.locator('[data-testid="career-goals"]');
    this.lookingForJobCheckbox = page.locator('[data-testid="looking-for-job"]');
    this.openToOpportunitiesCheckbox = page.locator('[data-testid="open-to-opportunities"]');
    this.interestedInMentorshipCheckbox = page.locator('[data-testid="interested-in-mentorship"]');
    this.wantToMentorCheckbox = page.locator('[data-testid="want-to-mentor"]');
    this.jobTypesSelect = page.locator('[data-testid="job-types"]');
    this.preferredLocationsInput = page.locator('[data-testid="preferred-locations"]');
    
    // Step 5: Networking
    this.networkingStep = page.locator('[data-testid="networking-step"]');
    this.linkedinProfileInput = page.locator('[data-testid="linkedin-profile"]');
    this.githubProfileInput = page.locator('[data-testid="github-profile"]');
    this.personalWebsiteInput = page.locator('[data-testid="personal-website"]');
    this.bioTextarea = page.locator('[data-testid="bio"]');
    this.visibilitySettings = page.locator('[data-testid="visibility-settings"]');
    this.profileVisibilitySelect = page.locator('[data-testid="profile-visibility"]');
    this.showContactInfoCheckbox = page.locator('[data-testid="show-contact-info"]');
    this.showCareerInfoCheckbox = page.locator('[data-testid="show-career-info"]');
    
    // Step 6: Notifications
    this.notificationsStep = page.locator('[data-testid="notifications-step"]');
    this.emailNotificationsCheckbox = page.locator('[data-testid="email-notifications"]');
    this.smsNotificationsCheckbox = page.locator('[data-testid="sms-notifications"]');
    this.jobAlertsCheckbox = page.locator('[data-testid="job-alerts"]');
    this.eventNotificationsCheckbox = page.locator('[data-testid="event-notifications"]');
    this.mentorshipNotificationsCheckbox = page.locator('[data-testid="mentorship-notifications"]');
    this.marketingEmailsCheckbox = page.locator('[data-testid="marketing-emails"]');
    this.notificationFrequencySelect = page.locator('[data-testid="notification-frequency"]');
    
    // Completion
    this.completionStep = page.locator('[data-testid="completion-step"]');
    this.completionMessage = page.locator('[data-testid="completion-message"]');
    this.profileCompleteness = page.locator('[data-testid="profile-completeness"]');
    this.goToDashboardButton = page.locator('[data-testid="go-to-dashboard"]');
    this.exploreJobsButton = page.locator('[data-testid="explore-jobs"]');
    this.joinNetworkingButton = page.locator('[data-testid="join-networking"]');
    
    // Messages
    this.errorMessage = page.locator('[data-testid="onboarding-error"]');
    this.successMessage = page.locator('[data-testid="onboarding-success"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.validationMessages = page.locator('[data-testid="validation-message"]');
  }

  /**
   * Navigate to onboarding page
   */
  async goto() {
    await this.navigate('/onboarding');
    await this.waitForPageLoad();
  }

  /**
   * Get current step information
   */
  async getCurrentStep(): Promise<OnboardingStepData> {
    const stepNumber = await this.currentStepIndicator.textContent();
    const stepName = await this.stepTitle.textContent();
    
    return {
      stepNumber: parseInt(stepNumber || '1', 10),
      stepName: stepName || '',
      isComplete: false,
      isActive: true
    };
  }

  /**
   * Get progress percentage
   */
  async getProgressPercentage(): Promise<number> {
    const progressValue = await this.progressBar.getAttribute('value');
    return parseInt(progressValue || '0', 10);
  }

  /**
   * Complete welcome step with profile photo
   */
  async completeWelcomeStep(photoPath?: string) {
    await this.waitForElement('[data-testid="welcome-step"]');
    
    if (photoPath) {
      await this.uploadProfilePhoto(photoPath);
    }
    
    await this.nextButton.click();
    await this.waitForElement('[data-testid="professional-step"]');
  }

  /**
   * Skip welcome step
   */
  async skipWelcomeStep() {
    await this.skipButton.click();
    await this.waitForElement('[data-testid="professional-step"]');
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(photoPath: string) {
    await this.profilePhotoUpload.setInputFiles(photoPath);
    await this.photoPreview.waitFor({ state: 'visible' });
  }

  /**
   * Remove profile photo
   */
  async removeProfilePhoto() {
    await this.removePhotoButton.click();
    await this.photoPreview.waitFor({ state: 'hidden' });
  }

  /**
   * Complete professional information step
   */
  async completeProfessionalStep(professionalInfo: {
    company?: string;
    position?: string;
    experienceYears?: string;
    industry?: string;
    salaryRange?: string;
    remotePreference?: string;
  }) {
    await this.waitForElement('[data-testid="professional-step"]');
    
    if (professionalInfo.company) {
      await this.currentCompanyInput.fill(professionalInfo.company);
    }
    
    if (professionalInfo.position) {
      await this.currentPositionInput.fill(professionalInfo.position);
    }
    
    if (professionalInfo.experienceYears) {
      await this.experienceYearsSelect.selectOption(professionalInfo.experienceYears);
    }
    
    if (professionalInfo.industry) {
      await this.industrySelect.selectOption(professionalInfo.industry);
    }
    
    if (professionalInfo.salaryRange) {
      await this.salaryRangeSelect.selectOption(professionalInfo.salaryRange);
    }
    
    if (professionalInfo.remotePreference) {
      await this.remotePreferenceSelect.selectOption(professionalInfo.remotePreference);
    }
    
    await this.nextButton.click();
    await this.waitForElement('[data-testid="skills-step"]');
  }

  /**
   * Complete skills step
   */
  async completeSkillsStep(skills: string[]) {
    await this.waitForElement('[data-testid="skills-step"]');
    
    for (const skill of skills) {
      await this.addSkill(skill);
    }
    
    await this.nextButton.click();
    await this.waitForElement('[data-testid="career-goals-step"]');
  }

  /**
   * Add a skill
   */
  async addSkill(skillName: string) {
    await this.skillsSearchInput.fill(skillName);
    
    // Wait for suggestions and click the first one
    await this.skillsSuggestions.waitFor({ state: 'visible' });
    const firstSuggestion = this.skillsSuggestions.locator('.suggestion-item').first();
    
    if (await firstSuggestion.isVisible()) {
      await firstSuggestion.click();
    } else {
      // If no suggestion, add as custom skill
      await this.addSkillButton.click();
    }
    
    await this.skillsSearchInput.clear();
  }

  /**
   * Remove a skill
   */
  async removeSkill(skillName: string) {
    const skillElement = this.selectedSkills.locator(`[data-skill="${skillName}"]`);
    const removeButton = skillElement.locator('[data-testid="remove-skill"]');
    await removeButton.click();
  }

  /**
   * Get selected skills
   */
  async getSelectedSkills(): Promise<string[]> {
    const skillElements = await this.selectedSkills.locator('.skill-tag').all();
    const skills: string[] = [];
    
    for (const element of skillElements) {
      const skillText = await element.textContent();
      if (skillText) {
        skills.push(skillText.trim());
      }
    }
    
    return skills;
  }

  /**
   * Complete career goals step
   */
  async completeCareerGoalsStep(careerData: {
    goals?: string;
    lookingForJob?: boolean;
    openToOpportunities?: boolean;
    interestedInMentorship?: boolean;
    wantToMentor?: boolean;
    jobTypes?: string[];
    preferredLocations?: string[];
  }) {
    await this.waitForElement('[data-testid="career-goals-step"]');
    
    if (careerData.goals) {
      await this.careerGoalsTextarea.fill(careerData.goals);
    }
    
    if (careerData.lookingForJob) {
      await this.lookingForJobCheckbox.check();
    }
    
    if (careerData.openToOpportunities) {
      await this.openToOpportunitiesCheckbox.check();
    }
    
    if (careerData.interestedInMentorship) {
      await this.interestedInMentorshipCheckbox.check();
    }
    
    if (careerData.wantToMentor) {
      await this.wantToMentorCheckbox.check();
    }
    
    if (careerData.jobTypes) {
      for (const jobType of careerData.jobTypes) {
        await this.jobTypesSelect.selectOption(jobType);
      }
    }
    
    if (careerData.preferredLocations) {
      await this.preferredLocationsInput.fill(careerData.preferredLocations.join(', '));
    }
    
    await this.nextButton.click();
    await this.waitForElement('[data-testid="networking-step"]');
  }

  /**
   * Complete networking step
   */
  async completeNetworkingStep(networkingData: {
    linkedinProfile?: string;
    githubProfile?: string;
    personalWebsite?: string;
    bio?: string;
    profileVisibility?: string;
    showContactInfo?: boolean;
    showCareerInfo?: boolean;
  }) {
    await this.waitForElement('[data-testid="networking-step"]');
    
    if (networkingData.linkedinProfile) {
      await this.linkedinProfileInput.fill(networkingData.linkedinProfile);
    }
    
    if (networkingData.githubProfile) {
      await this.githubProfileInput.fill(networkingData.githubProfile);
    }
    
    if (networkingData.personalWebsite) {
      await this.personalWebsiteInput.fill(networkingData.personalWebsite);
    }
    
    if (networkingData.bio) {
      await this.bioTextarea.fill(networkingData.bio);
    }
    
    if (networkingData.profileVisibility) {
      await this.profileVisibilitySelect.selectOption(networkingData.profileVisibility);
    }
    
    if (networkingData.showContactInfo) {
      await this.showContactInfoCheckbox.check();
    }
    
    if (networkingData.showCareerInfo) {
      await this.showCareerInfoCheckbox.check();
    }
    
    await this.nextButton.click();
    await this.waitForElement('[data-testid="notifications-step"]');
  }

  /**
   * Complete notifications step
   */
  async completeNotificationsStep(notificationData: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    jobAlerts?: boolean;
    eventNotifications?: boolean;
    mentorshipNotifications?: boolean;
    marketingEmails?: boolean;
    frequency?: string;
  }) {
    await this.waitForElement('[data-testid="notifications-step"]');
    
    if (notificationData.emailNotifications) {
      await this.emailNotificationsCheckbox.check();
    }
    
    if (notificationData.smsNotifications) {
      await this.smsNotificationsCheckbox.check();
    }
    
    if (notificationData.jobAlerts) {
      await this.jobAlertsCheckbox.check();
    }
    
    if (notificationData.eventNotifications) {
      await this.eventNotificationsCheckbox.check();
    }
    
    if (notificationData.mentorshipNotifications) {
      await this.mentorshipNotificationsCheckbox.check();
    }
    
    if (notificationData.marketingEmails !== undefined) {
      if (notificationData.marketingEmails) {
        await this.marketingEmailsCheckbox.check();
      } else {
        await this.marketingEmailsCheckbox.uncheck();
      }
    }
    
    if (notificationData.frequency) {
      await this.notificationFrequencySelect.selectOption(notificationData.frequency);
    }
    
    await this.finishButton.click();
    await this.waitForElement('[data-testid="completion-step"]');
  }

  /**
   * Complete full onboarding flow
   */
  async completeOnboarding(userData: {
    photoPath?: string;
    professionalInfo?: any;
    skills?: string[];
    careerData?: any;
    networkingData?: any;
    notificationData?: any;
  }) {
    // Step 1: Welcome
    if (userData.photoPath) {
      await this.completeWelcomeStep(userData.photoPath);
    } else {
      await this.skipWelcomeStep();
    }
    
    // Step 2: Professional Info
    await this.completeProfessionalStep(userData.professionalInfo || {});
    
    // Step 3: Skills
    await this.completeSkillsStep(userData.skills || ['Python', 'Machine Learning', 'SQL']);
    
    // Step 4: Career Goals
    await this.completeCareerGoalsStep(userData.careerData || {
      goals: 'Looking to advance my career in data science',
      lookingForJob: true,
      openToOpportunities: true
    });
    
    // Step 5: Networking
    await this.completeNetworkingStep(userData.networkingData || {});
    
    // Step 6: Notifications
    await this.completeNotificationsStep(userData.notificationData || {
      emailNotifications: true,
      jobAlerts: true,
      eventNotifications: true
    });
  }

  /**
   * Skip entire onboarding
   */
  async skipOnboarding() {
    // Look for skip all button or navigate through quickly
    const skipAllButton = this.page.locator('[data-testid="skip-onboarding"]');
    
    if (await skipAllButton.isVisible()) {
      await skipAllButton.click();
    } else {
      // Skip through each step
      for (let i = 0; i < 6; i++) {
        if (await this.skipButton.isVisible()) {
          await this.skipButton.click();
        } else if (await this.nextButton.isVisible()) {
          await this.nextButton.click();
        }
        await this.page.waitForTimeout(500);
      }
    }
    
    await this.waitForElement('[data-testid="completion-step"]');
  }

  /**
   * Get profile completeness percentage
   */
  async getProfileCompleteness(): Promise<number> {
    if (await this.profileCompleteness.isVisible()) {
      const completenessText = await this.profileCompleteness.textContent();
      const match = completenessText?.match(/(\d+)%/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  /**
   * Go to dashboard from completion step
   */
  async goToDashboard() {
    await this.goToDashboardButton.click();
    await this.waitForNavigation(/\/dashboard/);
  }

  /**
   * Explore jobs from completion step
   */
  async exploreJobs() {
    await this.exploreJobsButton.click();
    await this.waitForNavigation(/\/jobs/);
  }

  /**
   * Join networking from completion step
   */
  async joinNetworking() {
    await this.joinNetworkingButton.click();
    await this.waitForNavigation(/\/networking/);
  }

  /**
   * Go back to previous step
   */
  async goToPreviousStep() {
    if (await this.previousButton.isVisible()) {
      await this.previousButton.click();
    }
  }

  /**
   * Check if onboarding is complete
   */
  async isOnboardingComplete(): Promise<boolean> {
    return await this.completionStep.isVisible();
  }

  /**
   * Get all validation errors
   */
  async getValidationErrors(): Promise<string[]> {
    const errorElements = await this.validationMessages.all();
    const errors: string[] = [];
    
    for (const element of errorElements) {
      const errorText = await element.textContent();
      if (errorText) {
        errors.push(errorText.trim());
      }
    }
    
    return errors;
  }

  /**
   * Test mobile responsiveness
   */
  async testMobileOnboarding() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    
    // Check if progress bar adapts
    const progressBarBox = await this.progressBar.boundingBox();
    expect(progressBarBox?.width).toBeLessThanOrEqual(375);
    
    // Check if navigation buttons are accessible
    await expect(this.nextButton).toBeVisible();
    
    return true;
  }

  /**
   * Save progress and exit
   */
  async saveAndExit() {
    const saveButton = this.page.locator('[data-testid="save-and-exit"]');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await this.waitForNavigation(/\/dashboard/);
    }
  }
}