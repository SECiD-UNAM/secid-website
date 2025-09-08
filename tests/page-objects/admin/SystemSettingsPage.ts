import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface SystemSetting {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;
  description: string;
  isEditable: boolean;
  requiresRestart?: boolean;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetGroups: string[];
  environment: 'development' | 'staging' | 'production' | 'all';
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  category: 'auth' | 'notifications' | 'marketing' | 'system';
  variables: string[];
  isActive: boolean;
}

export interface SecuritySetting {
  setting: string;
  value: boolean | number | string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export class SystemSettingsPage extends BasePage {
  // Page navigation and structure
  private readonly pageTitle: Locator;
  private readonly settingsTabs: Locator;
  private readonly generalTab: Locator;
  private readonly securityTab: Locator;
  private readonly emailTab: Locator;
  private readonly featureFlagsTab: Locator;
  private readonly integrationsTab: Locator;
  private readonly maintenanceTab: Locator;
  private readonly auditTab: Locator;

  // General settings
  private readonly generalSettingsContainer: Locator;
  private readonly siteNameInput: Locator;
  private readonly siteDescriptionInput: Locator;
  private readonly maintenanceModeToggle: Locator;
  private readonly registrationEnabledToggle: Locator;
  private readonly maxUsersInput: Locator;
  private readonly timeZoneSelect: Locator;
  private readonly languageSelect: Locator;
  private readonly logoUpload: Locator;
  private readonly faviconUpload: Locator;

  // Security settings
  private readonly securitySettingsContainer: Locator;
  private readonly twoFactorRequiredToggle: Locator;
  private readonly sessionTimeoutInput: Locator;
  private readonly maxLoginAttemptsInput: Locator;
  private readonly passwordPolicySettings: Locator;
  private readonly ipWhitelistInput: Locator;
  private readonly sslEnforcedToggle: Locator;
  private readonly apiRateLimitInput: Locator;
  private readonly corsOriginsInput: Locator;
  private readonly securityHeadersToggle: Locator;

  // Email settings
  private readonly emailSettingsContainer: Locator;
  private readonly smtpServerInput: Locator;
  private readonly smtpPortInput: Locator;
  private readonly smtpUsernameInput: Locator;
  private readonly smtpPasswordInput: Locator;
  private readonly smtpEncryptionSelect: Locator;
  private readonly fromEmailInput: Locator;
  private readonly fromNameInput: Locator;
  private readonly testEmailBtn: Locator;
  private readonly emailTemplatesContainer: Locator;

  // Email templates
  private readonly templatesTable: Locator;
  private readonly addTemplateBtn: Locator;
  private readonly templateModal: Locator;
  private readonly templateNameInput: Locator;
  private readonly templateSubjectInput: Locator;
  private readonly templateHtmlEditor: Locator;
  private readonly templateTextEditor: Locator;
  private readonly templateVariables: Locator;
  private readonly templatePreviewBtn: Locator;
  private readonly saveTemplateBtn: Locator;

  // Feature flags
  private readonly featureFlagsContainer: Locator;
  private readonly addFeatureFlagBtn: Locator;
  private readonly featureFlagsList: Locator;
  private readonly featureFlagModal: Locator;
  private readonly flagNameInput: Locator;
  private readonly flagDescriptionInput: Locator;
  private readonly flagEnabledToggle: Locator;
  private readonly rolloutPercentageSlider: Locator;
  private readonly targetGroupsSelect: Locator;
  private readonly environmentSelect: Locator;

  // Integrations
  private readonly integrationsContainer: Locator;
  private readonly googleAnalyticsInput: Locator;
  private readonly amplitudeApiKeyInput: Locator;
  private readonly stripePublishableKeyInput: Locator;
  private readonly stripeSecretKeyInput: Locator;
  private readonly firebaseConfigTextarea: Locator;
  private readonly slackWebhookInput: Locator;
  private readonly discordWebhookInput: Locator;
  private readonly linkedinApiKeyInput: Locator;

  // Maintenance
  private readonly maintenanceContainer: Locator;
  private readonly backupSettingsPanel: Locator;
  private readonly automaticBackupsToggle: Locator;
  private readonly backupFrequencySelect: Locator;
  private readonly backupRetentionInput: Locator;
  private readonly manualBackupBtn: Locator;
  private readonly restoreBackupBtn: Locator;
  private readonly systemHealthPanel: Locator;
  private readonly databaseHealthCheck: Locator;
  private readonly storageHealthCheck: Locator;
  private readonly externalServicesCheck: Locator;

  // Action buttons and controls
  private readonly saveSettingsBtn: Locator;
  private readonly resetSettingsBtn: Locator;
  private readonly exportSettingsBtn: Locator;
  private readonly importSettingsBtn: Locator;
  private readonly restartSystemBtn: Locator;
  private readonly clearCacheBtn: Locator;

  // Modals and dialogs
  private readonly confirmationModal: Locator;
  private readonly successNotification: Locator;
  private readonly errorNotification: Locator;
  private readonly warningNotification: Locator;

  // Search and filtering
  private readonly settingsSearchInput: Locator;
  private readonly categoryFilter: Locator;
  private readonly onlyEditableFilter: Locator;

  constructor(page: Page) {
    super(page);

    // Page navigation
    this.pageTitle = page.locator('[data-testid="system-settings-title"]');
    this.settingsTabs = page.locator('[data-testid="settings-tabs"]');
    this.generalTab = page.locator('[data-testid="general-tab"]');
    this.securityTab = page.locator('[data-testid="security-tab"]');
    this.emailTab = page.locator('[data-testid="email-tab"]');
    this.featureFlagsTab = page.locator('[data-testid="feature-flags-tab"]');
    this.integrationsTab = page.locator('[data-testid="integrations-tab"]');
    this.maintenanceTab = page.locator('[data-testid="maintenance-tab"]');
    this.auditTab = page.locator('[data-testid="audit-tab"]');

    // General settings
    this.generalSettingsContainer = page.locator('[data-testid="general-settings"]');
    this.siteNameInput = page.locator('[data-testid="site-name"]');
    this.siteDescriptionInput = page.locator('[data-testid="site-description"]');
    this.maintenanceModeToggle = page.locator('[data-testid="maintenance-mode"]');
    this.registrationEnabledToggle = page.locator('[data-testid="registration-enabled"]');
    this.maxUsersInput = page.locator('[data-testid="max-users"]');
    this.timeZoneSelect = page.locator('[data-testid="time-zone"]');
    this.languageSelect = page.locator('[data-testid="default-language"]');
    this.logoUpload = page.locator('[data-testid="logo-upload"]');
    this.faviconUpload = page.locator('[data-testid="favicon-upload"]');

    // Security settings
    this.securitySettingsContainer = page.locator('[data-testid="security-settings"]');
    this.twoFactorRequiredToggle = page.locator('[data-testid="require-2fa"]');
    this.sessionTimeoutInput = page.locator('[data-testid="session-timeout"]');
    this.maxLoginAttemptsInput = page.locator('[data-testid="max-login-attempts"]');
    this.passwordPolicySettings = page.locator('[data-testid="password-policy"]');
    this.ipWhitelistInput = page.locator('[data-testid="ip-whitelist"]');
    this.sslEnforcedToggle = page.locator('[data-testid="enforce-ssl"]');
    this.apiRateLimitInput = page.locator('[data-testid="api-rate-limit"]');
    this.corsOriginsInput = page.locator('[data-testid="cors-origins"]');
    this.securityHeadersToggle = page.locator('[data-testid="security-headers"]');

    // Email settings
    this.emailSettingsContainer = page.locator('[data-testid="email-settings"]');
    this.smtpServerInput = page.locator('[data-testid="smtp-server"]');
    this.smtpPortInput = page.locator('[data-testid="smtp-port"]');
    this.smtpUsernameInput = page.locator('[data-testid="smtp-username"]');
    this.smtpPasswordInput = page.locator('[data-testid="smtp-password"]');
    this.smtpEncryptionSelect = page.locator('[data-testid="smtp-encryption"]');
    this.fromEmailInput = page.locator('[data-testid="from-email"]');
    this.fromNameInput = page.locator('[data-testid="from-name"]');
    this.testEmailBtn = page.locator('[data-testid="test-email"]');
    this.emailTemplatesContainer = page.locator('[data-testid="email-templates"]');

    // Email templates
    this.templatesTable = page.locator('[data-testid="templates-table"]');
    this.addTemplateBtn = page.locator('[data-testid="add-template"]');
    this.templateModal = page.locator('[data-testid="template-modal"]');
    this.templateNameInput = page.locator('[data-testid="template-name"]');
    this.templateSubjectInput = page.locator('[data-testid="template-subject"]');
    this.templateHtmlEditor = page.locator('[data-testid="template-html-editor"]');
    this.templateTextEditor = page.locator('[data-testid="template-text-editor"]');
    this.templateVariables = page.locator('[data-testid="template-variables"]');
    this.templatePreviewBtn = page.locator('[data-testid="template-preview"]');
    this.saveTemplateBtn = page.locator('[data-testid="save-template"]');

    // Feature flags
    this.featureFlagsContainer = page.locator('[data-testid="feature-flags"]');
    this.addFeatureFlagBtn = page.locator('[data-testid="add-feature-flag"]');
    this.featureFlagsList = page.locator('[data-testid="feature-flags-list"]');
    this.featureFlagModal = page.locator('[data-testid="feature-flag-modal"]');
    this.flagNameInput = page.locator('[data-testid="flag-name"]');
    this.flagDescriptionInput = page.locator('[data-testid="flag-description"]');
    this.flagEnabledToggle = page.locator('[data-testid="flag-enabled"]');
    this.rolloutPercentageSlider = page.locator('[data-testid="rollout-percentage"]');
    this.targetGroupsSelect = page.locator('[data-testid="target-groups"]');
    this.environmentSelect = page.locator('[data-testid="environment"]');

    // Integrations
    this.integrationsContainer = page.locator('[data-testid="integrations"]');
    this.googleAnalyticsInput = page.locator('[data-testid="google-analytics-id"]');
    this.amplitudeApiKeyInput = page.locator('[data-testid="amplitude-api-key"]');
    this.stripePublishableKeyInput = page.locator('[data-testid="stripe-publishable-key"]');
    this.stripeSecretKeyInput = page.locator('[data-testid="stripe-secret-key"]');
    this.firebaseConfigTextarea = page.locator('[data-testid="firebase-config"]');
    this.slackWebhookInput = page.locator('[data-testid="slack-webhook"]');
    this.discordWebhookInput = page.locator('[data-testid="discord-webhook"]');
    this.linkedinApiKeyInput = page.locator('[data-testid="linkedin-api-key"]');

    // Maintenance
    this.maintenanceContainer = page.locator('[data-testid="maintenance"]');
    this.backupSettingsPanel = page.locator('[data-testid="backup-settings"]');
    this.automaticBackupsToggle = page.locator('[data-testid="automatic-backups"]');
    this.backupFrequencySelect = page.locator('[data-testid="backup-frequency"]');
    this.backupRetentionInput = page.locator('[data-testid="backup-retention"]');
    this.manualBackupBtn = page.locator('[data-testid="manual-backup"]');
    this.restoreBackupBtn = page.locator('[data-testid="restore-backup"]');
    this.systemHealthPanel = page.locator('[data-testid="system-health"]');
    this.databaseHealthCheck = page.locator('[data-testid="database-health"]');
    this.storageHealthCheck = page.locator('[data-testid="storage-health"]');
    this.externalServicesCheck = page.locator('[data-testid="external-services-health"]');

    // Action buttons
    this.saveSettingsBtn = page.locator('[data-testid="save-settings"]');
    this.resetSettingsBtn = page.locator('[data-testid="reset-settings"]');
    this.exportSettingsBtn = page.locator('[data-testid="export-settings"]');
    this.importSettingsBtn = page.locator('[data-testid="import-settings"]');
    this.restartSystemBtn = page.locator('[data-testid="restart-system"]');
    this.clearCacheBtn = page.locator('[data-testid="clear-cache"]');

    // Modals and notifications
    this.confirmationModal = page.locator('[data-testid="confirmation-modal"]');
    this.successNotification = page.locator('[data-testid="success-notification"]');
    this.errorNotification = page.locator('[data-testid="error-notification"]');
    this.warningNotification = page.locator('[data-testid="warning-notification"]');

    // Search and filtering
    this.settingsSearchInput = page.locator('[data-testid="settings-search"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.onlyEditableFilter = page.locator('[data-testid="only-editable-filter"]');
  }

  /**
   * Navigate to system settings page
   */
  async goto() {
    await this.navigate('/admin/settings');
    await this.waitForPageLoad();
    await this.waitForElement('[data-testid="system-settings-title"]');
  }

  /**
   * Switch to settings tab
   */
  async switchToTab(tab: 'general' | 'security' | 'email' | 'feature-flags' | 'integrations' | 'maintenance' | 'audit') {
    const tabMap = {
      general: this.generalTab,
      security: this.securityTab,
      email: this.emailTab,
      'feature-flags': this.featureFlagsTab,
      integrations: this.integrationsTab,
      maintenance: this.maintenanceTab,
      audit: this.auditTab
    };

    await tabMap[tab].click();
    await this.waitForAPIResponse('/api/admin/settings');
  }

  /**
   * Update general settings
   */
  async updateGeneralSettings(settings: {
    siteName?: string;
    siteDescription?: string;
    maintenanceMode?: boolean;
    registrationEnabled?: boolean;
    maxUsers?: number;
    timeZone?: string;
    language?: string;
  }) {
    await this.switchToTab('general');

    if (settings.siteName !== undefined) {
      await this.siteNameInput.clear();
      await this.siteNameInput.fill(settings.siteName);
    }
    if (settings.siteDescription !== undefined) {
      await this.siteDescriptionInput.clear();
      await this.siteDescriptionInput.fill(settings.siteDescription);
    }
    if (settings.maintenanceMode !== undefined) {
      if (settings.maintenanceMode) {
        await this.maintenanceModeToggle.check();
      } else {
        await this.maintenanceModeToggle.uncheck();
      }
    }
    if (settings.registrationEnabled !== undefined) {
      if (settings.registrationEnabled) {
        await this.registrationEnabledToggle.check();
      } else {
        await this.registrationEnabledToggle.uncheck();
      }
    }
    if (settings.maxUsers !== undefined) {
      await this.maxUsersInput.clear();
      await this.maxUsersInput.fill(settings.maxUsers.toString());
    }
    if (settings.timeZone !== undefined) {
      await this.timeZoneSelect.selectOption(settings.timeZone);
    }
    if (settings.language !== undefined) {
      await this.languageSelect.selectOption(settings.language);
    }

    await this.saveSettings();
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(settings: {
    requireTwoFactor?: boolean;
    sessionTimeout?: number;
    maxLoginAttempts?: number;
    ipWhitelist?: string[];
    enforceSSL?: boolean;
    apiRateLimit?: number;
    corsOrigins?: string[];
    securityHeaders?: boolean;
  }) {
    await this.switchToTab('security');

    if (settings.requireTwoFactor !== undefined) {
      if (settings.requireTwoFactor) {
        await this.twoFactorRequiredToggle.check();
      } else {
        await this.twoFactorRequiredToggle.uncheck();
      }
    }
    if (settings.sessionTimeout !== undefined) {
      await this.sessionTimeoutInput.clear();
      await this.sessionTimeoutInput.fill(settings.sessionTimeout.toString());
    }
    if (settings.maxLoginAttempts !== undefined) {
      await this.maxLoginAttempentsInput.clear();
      await this.maxLoginAttemptsInput.fill(settings.maxLoginAttempts.toString());
    }
    if (settings.ipWhitelist !== undefined) {
      await this.ipWhitelistInput.clear();
      await this.ipWhitelistInput.fill(settings.ipWhitelist.join('\n'));
    }
    if (settings.enforceSSL !== undefined) {
      if (settings.enforceSSL) {
        await this.sslEnforcedToggle.check();
      } else {
        await this.sslEnforcedToggle.uncheck();
      }
    }
    if (settings.apiRateLimit !== undefined) {
      await this.apiRateLimitInput.clear();
      await this.apiRateLimitInput.fill(settings.apiRateLimit.toString());
    }
    if (settings.corsOrigins !== undefined) {
      await this.corsOriginsInput.clear();
      await this.corsOriginsInput.fill(settings.corsOrigins.join('\n'));
    }
    if (settings.securityHeaders !== undefined) {
      if (settings.securityHeaders) {
        await this.securityHeadersToggle.check();
      } else {
        await this.securityHeadersToggle.uncheck();
      }
    }

    await this.saveSettings();
  }

  /**
   * Update email settings
   */
  async updateEmailSettings(settings: {
    smtpServer?: string;
    smtpPort?: number;
    smtpUsername?: string;
    smtpPassword?: string;
    smtpEncryption?: 'none' | 'tls' | 'ssl';
    fromEmail?: string;
    fromName?: string;
  }) {
    await this.switchToTab('email');

    if (settings.smtpServer !== undefined) {
      await this.smtpServerInput.clear();
      await this.smtpServerInput.fill(settings.smtpServer);
    }
    if (settings.smtpPort !== undefined) {
      await this.smtpPortInput.clear();
      await this.smtpPortInput.fill(settings.smtpPort.toString());
    }
    if (settings.smtpUsername !== undefined) {
      await this.smtpUsernameInput.clear();
      await this.smtpUsernameInput.fill(settings.smtpUsername);
    }
    if (settings.smtpPassword !== undefined) {
      await this.smtpPasswordInput.clear();
      await this.smtpPasswordInput.fill(settings.smtpPassword);
    }
    if (settings.smtpEncryption !== undefined) {
      await this.smtpEncryptionSelect.selectOption(settings.smtpEncryption);
    }
    if (settings.fromEmail !== undefined) {
      await this.fromEmailInput.clear();
      await this.fromEmailInput.fill(settings.fromEmail);
    }
    if (settings.fromName !== undefined) {
      await this.fromNameInput.clear();
      await this.fromNameInput.fill(settings.fromName);
    }

    await this.saveSettings();
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(testEmail: string): Promise<boolean> {
    await this.switchToTab('email');
    await this.fillField('[data-testid="test-email-address"]', testEmail);
    await this.testEmailBtn.click();
    
    // Wait for test result
    await this.waitForAPIResponse('/api/admin/settings/test-email');
    
    // Check for success notification
    try {
      await this.successNotification.waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create email template
   */
  async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'isActive'>) {
    await this.switchToTab('email');
    await this.addTemplateBtn.click();
    await this.templateModal.waitFor({ state: 'visible' });

    // Fill template details
    await this.templateNameInput.fill(template.name);
    await this.templateSubjectInput.fill(template.subject);
    await this.templateHtmlEditor.fill(template.htmlContent);
    await this.templateTextEditor.fill(template.textContent);

    // Select category
    await this.selectOption('[data-testid="template-category"]', template.category);

    // Save template
    await this.saveTemplateBtn.click();
    await this.waitForAPIResponse('/api/admin/settings/email-templates');
  }

  /**
   * Get email templates
   */
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    await this.switchToTab('email');
    await this.templatesTable.waitFor({ state: 'visible' });
    
    const templateRows = await this.page.locator('[data-testid="template-row"]').all();
    const templates: EmailTemplate[] = [];
    
    for (const row of templateRows) {
      const template: EmailTemplate = {
        id: await row.getAttribute('data-template-id') || '',
        name: await row.locator('[data-testid="template-name"]').textContent() || '',
        subject: await row.locator('[data-testid="template-subject"]').textContent() || '',
        htmlContent: '', // Would need to expand to get full content
        textContent: '',
        category: await row.getAttribute('data-category') as any || 'system',
        variables: [], // Would need to fetch from template details
        isActive: await row.locator('[data-testid="template-active"]').isChecked()
      };
      templates.push(template);
    }
    
    return templates;
  }

  /**
   * Create feature flag
   */
  async createFeatureFlag(flag: Omit<FeatureFlag, 'id'>) {
    await this.switchToTab('feature-flags');
    await this.addFeatureFlagBtn.click();
    await this.featureFlagModal.waitFor({ state: 'visible' });

    // Fill flag details
    await this.flagNameInput.fill(flag.name);
    await this.flagDescriptionInput.fill(flag.description);
    
    if (flag.isEnabled) {
      await this.flagEnabledToggle.check();
    }

    // Set rollout percentage
    await this.rolloutPercentageSlider.fill(flag.rolloutPercentage.toString());

    // Select target groups
    for (const group of flag.targetGroups) {
      await this.targetGroupsSelect.selectOption(group, { multiple: true });
    }

    // Select environment
    await this.environmentSelect.selectOption(flag.environment);

    // Save flag
    await this.clickElement('[data-testid="save-feature-flag"]');
    await this.waitForAPIResponse('/api/admin/settings/feature-flags');
  }

  /**
   * Get feature flags
   */
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    await this.switchToTab('feature-flags');
    await this.featureFlagsList.waitFor({ state: 'visible' });
    
    const flagElements = await this.page.locator('[data-testid="feature-flag-item"]').all();
    const flags: FeatureFlag[] = [];
    
    for (const element of flagElements) {
      const flag: FeatureFlag = {
        id: await element.getAttribute('data-flag-id') || '',
        name: await element.locator('[data-testid="flag-name"]').textContent() || '',
        description: await element.locator('[data-testid="flag-description"]').textContent() || '',
        isEnabled: await element.locator('[data-testid="flag-enabled"]').isChecked(),
        rolloutPercentage: parseInt(await element.locator('[data-testid="rollout-percentage"]').textContent() || '0'),
        targetGroups: [], // Would need to expand to get full details
        environment: await element.getAttribute('data-environment') as any || 'production'
      };
      flags.push(flag);
    }
    
    return flags;
  }

  /**
   * Toggle feature flag
   */
  async toggleFeatureFlag(flagId: string): Promise<boolean> {
    const flag = this.page.locator(`[data-flag-id="${flagId}"]`);
    const toggle = flag.locator('[data-testid="flag-enabled"]');
    
    const wasEnabled = await toggle.isChecked();
    await toggle.click();
    await this.waitForAPIResponse('/api/admin/settings/feature-flags/toggle');
    
    return !wasEnabled;
  }

  /**
   * Update integration settings
   */
  async updateIntegrationSettings(integrations: {
    googleAnalyticsId?: string;
    amplitudeApiKey?: string;
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    firebaseConfig?: string;
    slackWebhook?: string;
    discordWebhook?: string;
    linkedinApiKey?: string;
  }) {
    await this.switchToTab('integrations');

    const inputMap = {
      googleAnalyticsId: this.googleAnalyticsInput,
      amplitudeApiKey: this.amplitudeApiKeyInput,
      stripePublishableKey: this.stripePublishableKeyInput,
      stripeSecretKey: this.stripeSecretKeyInput,
      firebaseConfig: this.firebaseConfigTextarea,
      slackWebhook: this.slackWebhookInput,
      discordWebhook: this.discordWebhookInput,
      linkedinApiKey: this.linkedinApiKeyInput
    };

    for (const [key, value] of Object.entries(integrations)) {
      if (value !== undefined) {
        const input = inputMap[key as keyof typeof inputMap];
        if (input) {
          await input.clear();
          await input.fill(value);
        }
      }
    }

    await this.saveSettings();
  }

  /**
   * Configure backup settings
   */
  async configureBackupSettings(settings: {
    automaticBackups?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    retention?: number;
  }) {
    await this.switchToTab('maintenance');

    if (settings.automaticBackups !== undefined) {
      if (settings.automaticBackups) {
        await this.automaticBackupsToggle.check();
      } else {
        await this.automaticBackupsToggle.uncheck();
      }
    }
    if (settings.frequency !== undefined) {
      await this.backupFrequencySelect.selectOption(settings.frequency);
    }
    if (settings.retention !== undefined) {
      await this.backupRetentionInput.clear();
      await this.backupRetentionInput.fill(settings.retention.toString());
    }

    await this.saveSettings();
  }

  /**
   * Perform manual backup
   */
  async performManualBackup(): Promise<boolean> {
    await this.switchToTab('maintenance');
    await this.manualBackupBtn.click();
    
    // Wait for backup to complete
    await this.waitForAPIResponse('/api/admin/settings/backup', 60000);
    
    try {
      await this.successNotification.waitFor({ state: 'visible', timeout: 30000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check system health
   */
  async getSystemHealth(): Promise<Record<string, string>> {
    await this.switchToTab('maintenance');
    await this.systemHealthPanel.waitFor({ state: 'visible' });

    return {
      database: await this.getHealthStatus(this.databaseHealthCheck),
      storage: await this.getHealthStatus(this.storageHealthCheck),
      externalServices: await this.getHealthStatus(this.externalServicesCheck)
    };
  }

  /**
   * Get health status from indicator
   */
  private async getHealthStatus(indicator: Locator): Promise<string> {
    const classes = await indicator.getAttribute('class') || '';
    if (classes.includes('healthy')) return 'healthy';
    if (classes.includes('warning')) return 'warning';
    if (classes.includes('error')) return 'error';
    return 'unknown';
  }

  /**
   * Save settings
   */
  async saveSettings() {
    await this.saveSettingsBtn.click();
    await this.waitForAPIResponse('/api/admin/settings/save');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings() {
    await this.resetSettingsBtn.click();
    await this.confirmationModal.waitFor({ state: 'visible' });
    await this.clickElement('[data-testid="confirm-reset"]');
    await this.waitForAPIResponse('/api/admin/settings/reset');
  }

  /**
   * Export settings
   */
  async exportSettings(): Promise<any> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportSettingsBtn.click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * Import settings
   */
  async importSettings(filePath: string) {
    await this.importSettingsBtn.click();
    
    const fileInput = this.page.locator('[data-testid="import-file-input"]');
    await fileInput.setInputFiles(filePath);
    await this.clickElement('[data-testid="confirm-import"]');
    
    await this.waitForAPIResponse('/api/admin/settings/import');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Restart system
   */
  async restartSystem() {
    await this.restartSystemBtn.click();
    await this.confirmationModal.waitFor({ state: 'visible' });
    await this.clickElement('[data-testid="confirm-restart"]');
    
    // Wait for system to restart (this would typically redirect or show a loading state)
    await this.waitForAPIResponse('/api/admin/settings/restart', 120000);
  }

  /**
   * Clear system cache
   */
  async clearCache() {
    await this.clearCacheBtn.click();
    await this.waitForAPIResponse('/api/admin/settings/clear-cache');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Search settings
   */
  async searchSettings(query: string) {
    await this.settingsSearchInput.fill(query);
    await this.settingsSearchInput.press('Enter');
    
    // Wait for search results to filter
    await this.page.waitForTimeout(1000);
  }

  /**
   * Filter settings by category
   */
  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Show only editable settings
   */
  async showOnlyEditableSettings(enabled: boolean = true) {
    if (enabled) {
      await this.onlyEditableFilter.check();
    } else {
      await this.onlyEditableFilter.uncheck();
    }
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get current setting value
   */
  async getSettingValue(settingKey: string): Promise<string | null> {
    const settingElement = this.page.locator(`[data-setting-key="${settingKey}"]`);
    if (await settingElement.isVisible()) {
      return await settingElement.inputValue();
    }
    return null;
  }

  /**
   * Update specific setting
   */
  async updateSetting(settingKey: string, value: string | number | boolean) {
    const settingElement = this.page.locator(`[data-setting-key="${settingKey}"]`);
    
    if (typeof value === 'boolean') {
      if (value) {
        await settingElement.check();
      } else {
        await settingElement.uncheck();
      }
    } else {
      await settingElement.clear();
      await settingElement.fill(value.toString());
    }
  }

  /**
   * Validate settings form
   */
  async validateSettingsForm(): Promise<string[]> {
    const errors: string[] = [];
    
    // Check for validation error messages
    const errorElements = await this.page.locator('[data-testid*="error"]').all();
    for (const element of errorElements) {
      if (await element.isVisible()) {
        const errorText = await element.textContent();
        if (errorText) errors.push(errorText);
      }
    }
    
    return errors;
  }

  /**
   * Check if setting requires restart
   */
  async requiresRestart(settingKey: string): Promise<boolean> {
    const settingElement = this.page.locator(`[data-setting-key="${settingKey}"]`);
    const restartRequired = await settingElement.getAttribute('data-requires-restart');
    return restartRequired === 'true';
  }

  /**
   * Get settings requiring restart
   */
  async getSettingsRequiringRestart(): Promise<string[]> {
    const restartElements = await this.page.locator('[data-requires-restart="true"]').all();
    const settings: string[] = [];
    
    for (const element of restartElements) {
      const settingKey = await element.getAttribute('data-setting-key');
      if (settingKey) settings.push(settingKey);
    }
    
    return settings;
  }
}