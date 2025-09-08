import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface ModerationItem {
  id: string;
  type: 'job' | 'post' | 'comment' | 'event' | 'user_report';
  title: string;
  content: string;
  author: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportReason?: string;
  reportCount?: number;
}

export interface ModerationAction {
  action: 'approve' | 'reject' | 'flag' | 'escalate' | 'delete';
  reason?: string;
  notify?: boolean;
  notes?: string;
}

export interface AutoModerationRule {
  id: string;
  name: string;
  type: 'keyword' | 'pattern' | 'ml_confidence' | 'user_reputation';
  condition: string;
  action: 'auto_approve' | 'auto_reject' | 'require_review' | 'flag';
  isActive: boolean;
}

export class ContentModerationPage extends BasePage {
  // Page header and navigation
  private readonly pageTitle: Locator;
  private readonly moderationTabs: Locator;
  private readonly pendingTab: Locator;
  private readonly approvedTab: Locator;
  private readonly rejectedTab: Locator;
  private readonly flaggedTab: Locator;
  private readonly reportsTab: Locator;
  private readonly rulesTab: Locator;

  // Statistics and overview
  private readonly moderationStats: Locator;
  private readonly pendingCount: Locator;
  private readonly dailyApprovals: Locator;
  private readonly dailyRejections: Locator;
  private readonly averageReviewTime: Locator;
  private readonly automationEfficiency: Locator;

  // Filters and search
  private readonly searchInput: Locator;
  private readonly contentTypeFilter: Locator;
  private readonly priorityFilter: Locator;
  private readonly dateRangeFilter: Locator;
  private readonly authorFilter: Locator;
  private readonly statusFilter: Locator;
  private readonly sortBySelect: Locator;
  private readonly bulkSelectMode: Locator;

  // Content list
  private readonly moderationQueue: Locator;
  private readonly moderationItems: Locator;
  private readonly selectAllCheckbox: Locator;
  private readonly itemCheckboxes: Locator;
  private readonly loadMoreBtn: Locator;
  private readonly refreshQueueBtn: Locator;

  // Content detail view
  private readonly contentDetailModal: Locator;
  private readonly contentTitle: Locator;
  private readonly contentBody: Locator;
  private readonly contentAuthor: Locator;
  private readonly contentMetadata: Locator;
  private readonly contentImages: Locator;
  private readonly contentLinks: Locator;
  private readonly reportDetails: Locator;
  private readonly similarContent: Locator;

  // Moderation actions
  private readonly approveBtn: Locator;
  private readonly rejectBtn: Locator;
  private readonly flagBtn: Locator;
  private readonly escalateBtn: Locator;
  private readonly deleteBtn: Locator;
  private readonly editContentBtn: Locator;
  private readonly contactAuthorBtn: Locator;
  private readonly viewAuthorProfileBtn: Locator;

  // Bulk actions
  private readonly bulkActionsPanel: Locator;
  private readonly bulkApproveBtn: Locator;
  private readonly bulkRejectBtn: Locator;
  private readonly bulkDeleteBtn: Locator;
  private readonly bulkAssignBtn: Locator;

  // Action dialogs
  private readonly actionReasonModal: Locator;
  private readonly reasonTextarea: Locator;
  private readonly notifyAuthorCheckbox: Locator;
  private readonly internalNotesTextarea: Locator;
  private readonly confirmActionBtn: Locator;
  private readonly cancelActionBtn: Locator;

  // Auto-moderation rules
  private readonly rulesContainer: Locator;
  private readonly addRuleBtn: Locator;
  private readonly rulesList: Locator;
  private readonly ruleItems: Locator;
  private readonly editRuleBtn: Locator;
  private readonly deleteRuleBtn: Locator;
  private readonly toggleRuleBtn: Locator;

  // Rule creation/editing
  private readonly ruleModal: Locator;
  private readonly ruleNameInput: Locator;
  private readonly ruleTypeSelect: Locator;
  private readonly ruleConditionInput: Locator;
  private readonly ruleActionSelect: Locator;
  private readonly ruleTestInput: Locator;
  private readonly testRuleBtn: Locator;
  private readonly saveRuleBtn: Locator;

  // Reports management
  private readonly reportsContainer: Locator;
  private readonly reportItems: Locator;
  private readonly reportDetails: Locator;
  private readonly reportReason: Locator;
  private readonly reporterInfo: Locator;
  private readonly resolveReportBtn: Locator;
  private readonly escalateReportBtn: Locator;
  private readonly dismissReportBtn: Locator;

  // ML/AI moderation
  private readonly aiModerationPanel: Locator;
  private readonly confidenceScore: Locator;
  private readonly aiRecommendation: Locator;
  private readonly aiExplanation: Locator;
  private readonly overrideAiBtn: Locator;
  private readonly trainModelBtn: Locator;

  // Activity and audit
  private readonly moderatorActivity: Locator;
  private readonly recentActions: Locator;
  private readonly auditTrail: Locator;
  private readonly performanceMetrics: Locator;

  constructor(page: Page) {
    super(page);

    // Page header and navigation
    this.pageTitle = page.locator('[data-testid="content-moderation-title"]');
    this.moderationTabs = page.locator('[data-testid="moderation-tabs"]');
    this.pendingTab = page.locator('[data-testid="pending-tab"]');
    this.approvedTab = page.locator('[data-testid="approved-tab"]');
    this.rejectedTab = page.locator('[data-testid="rejected-tab"]');
    this.flaggedTab = page.locator('[data-testid="flagged-tab"]');
    this.reportsTab = page.locator('[data-testid="reports-tab"]');
    this.rulesTab = page.locator('[data-testid="rules-tab"]');

    // Statistics
    this.moderationStats = page.locator('[data-testid="moderation-stats"]');
    this.pendingCount = page.locator('[data-testid="pending-count"]');
    this.dailyApprovals = page.locator('[data-testid="daily-approvals"]');
    this.dailyRejections = page.locator('[data-testid="daily-rejections"]');
    this.averageReviewTime = page.locator('[data-testid="average-review-time"]');
    this.automationEfficiency = page.locator('[data-testid="automation-efficiency"]');

    // Filters and search
    this.searchInput = page.locator('[data-testid="moderation-search"]');
    this.contentTypeFilter = page.locator('[data-testid="content-type-filter"]');
    this.priorityFilter = page.locator('[data-testid="priority-filter"]');
    this.dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
    this.authorFilter = page.locator('[data-testid="author-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.sortBySelect = page.locator('[data-testid="sort-by-select"]');
    this.bulkSelectMode = page.locator('[data-testid="bulk-select-mode"]');

    // Content list
    this.moderationQueue = page.locator('[data-testid="moderation-queue"]');
    this.moderationItems = page.locator('[data-testid="moderation-item"]');
    this.selectAllCheckbox = page.locator('[data-testid="select-all-items"]');
    this.itemCheckboxes = page.locator('[data-testid="item-checkbox"]');
    this.loadMoreBtn = page.locator('[data-testid="load-more"]');
    this.refreshQueueBtn = page.locator('[data-testid="refresh-queue"]');

    // Content detail view
    this.contentDetailModal = page.locator('[data-testid="content-detail-modal"]');
    this.contentTitle = page.locator('[data-testid="content-title"]');
    this.contentBody = page.locator('[data-testid="content-body"]');
    this.contentAuthor = page.locator('[data-testid="content-author"]');
    this.contentMetadata = page.locator('[data-testid="content-metadata"]');
    this.contentImages = page.locator('[data-testid="content-images"]');
    this.contentLinks = page.locator('[data-testid="content-links"]');
    this.reportDetails = page.locator('[data-testid="report-details"]');
    this.similarContent = page.locator('[data-testid="similar-content"]');

    // Moderation actions
    this.approveBtn = page.locator('[data-testid="approve-content"]');
    this.rejectBtn = page.locator('[data-testid="reject-content"]');
    this.flagBtn = page.locator('[data-testid="flag-content"]');
    this.escalateBtn = page.locator('[data-testid="escalate-content"]');
    this.deleteBtn = page.locator('[data-testid="delete-content"]');
    this.editContentBtn = page.locator('[data-testid="edit-content"]');
    this.contactAuthorBtn = page.locator('[data-testid="contact-author"]');
    this.viewAuthorProfileBtn = page.locator('[data-testid="view-author-profile"]');

    // Bulk actions
    this.bulkActionsPanel = page.locator('[data-testid="bulk-actions-panel"]');
    this.bulkApproveBtn = page.locator('[data-testid="bulk-approve"]');
    this.bulkRejectBtn = page.locator('[data-testid="bulk-reject"]');
    this.bulkDeleteBtn = page.locator('[data-testid="bulk-delete"]');
    this.bulkAssignBtn = page.locator('[data-testid="bulk-assign"]');

    // Action dialogs
    this.actionReasonModal = page.locator('[data-testid="action-reason-modal"]');
    this.reasonTextarea = page.locator('[data-testid="action-reason"]');
    this.notifyAuthorCheckbox = page.locator('[data-testid="notify-author"]');
    this.internalNotesTextarea = page.locator('[data-testid="internal-notes"]');
    this.confirmActionBtn = page.locator('[data-testid="confirm-action"]');
    this.cancelActionBtn = page.locator('[data-testid="cancel-action"]');

    // Auto-moderation rules
    this.rulesContainer = page.locator('[data-testid="rules-container"]');
    this.addRuleBtn = page.locator('[data-testid="add-rule"]');
    this.rulesList = page.locator('[data-testid="rules-list"]');
    this.ruleItems = page.locator('[data-testid="rule-item"]');
    this.editRuleBtn = page.locator('[data-testid="edit-rule"]');
    this.deleteRuleBtn = page.locator('[data-testid="delete-rule"]');
    this.toggleRuleBtn = page.locator('[data-testid="toggle-rule"]');

    // Rule creation/editing
    this.ruleModal = page.locator('[data-testid="rule-modal"]');
    this.ruleNameInput = page.locator('[data-testid="rule-name"]');
    this.ruleTypeSelect = page.locator('[data-testid="rule-type"]');
    this.ruleConditionInput = page.locator('[data-testid="rule-condition"]');
    this.ruleActionSelect = page.locator('[data-testid="rule-action"]');
    this.ruleTestInput = page.locator('[data-testid="rule-test-input"]');
    this.testRuleBtn = page.locator('[data-testid="test-rule"]');
    this.saveRuleBtn = page.locator('[data-testid="save-rule"]');

    // Reports management
    this.reportsContainer = page.locator('[data-testid="reports-container"]');
    this.reportItems = page.locator('[data-testid="report-item"]');
    this.reportReason = page.locator('[data-testid="report-reason"]');
    this.reporterInfo = page.locator('[data-testid="reporter-info"]');
    this.resolveReportBtn = page.locator('[data-testid="resolve-report"]');
    this.escalateReportBtn = page.locator('[data-testid="escalate-report"]');
    this.dismissReportBtn = page.locator('[data-testid="dismiss-report"]');

    // ML/AI moderation
    this.aiModerationPanel = page.locator('[data-testid="ai-moderation-panel"]');
    this.confidenceScore = page.locator('[data-testid="confidence-score"]');
    this.aiRecommendation = page.locator('[data-testid="ai-recommendation"]');
    this.aiExplanation = page.locator('[data-testid="ai-explanation"]');
    this.overrideAiBtn = page.locator('[data-testid="override-ai"]');
    this.trainModelBtn = page.locator('[data-testid="train-model"]');

    // Activity and audit
    this.moderatorActivity = page.locator('[data-testid="moderator-activity"]');
    this.recentActions = page.locator('[data-testid="recent-actions"]');
    this.auditTrail = page.locator('[data-testid="audit-trail"]');
    this.performanceMetrics = page.locator('[data-testid="performance-metrics"]');
  }

  /**
   * Navigate to content moderation page
   */
  async goto() {
    await this.navigate('/admin/moderation');
    await this.waitForPageLoad();
    await this.waitForElement('[data-testid="content-moderation-title"]');
  }

  /**
   * Switch to moderation tab
   */
  async switchToTab(tab: 'pending' | 'approved' | 'rejected' | 'flagged' | 'reports' | 'rules') {
    const tabMap = {
      pending: this.pendingTab,
      approved: this.approvedTab,
      rejected: this.rejectedTab,
      flagged: this.flaggedTab,
      reports: this.reportsTab,
      rules: this.rulesTab
    };

    await tabMap[tab].click();
    await this.waitForAPIResponse('/api/admin/moderation');
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats() {
    await this.moderationStats.waitFor({ state: 'visible' });

    return {
      pending: await this.extractNumberFromElement(this.pendingCount),
      dailyApprovals: await this.extractNumberFromElement(this.dailyApprovals),
      dailyRejections: await this.extractNumberFromElement(this.dailyRejections),
      averageReviewTime: await this.getElementText('[data-testid="average-review-time"] .value'),
      automationEfficiency: await this.getElementText('[data-testid="automation-efficiency"] .value')
    };
  }

  /**
   * Extract number from element
   */
  private async extractNumberFromElement(element: Locator): Promise<number> {
    const text = await element.textContent() || '0';
    return parseInt(text.replace(/[^\d]/g, ''), 10) || 0;
  }

  /**
   * Search content
   */
  async searchContent(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForAPIResponse('/api/admin/moderation/search');
  }

  /**
   * Apply content filters
   */
  async applyFilters(filters: {
    contentType?: string;
    priority?: string;
    dateRange?: string;
    author?: string;
    status?: string;
  }) {
    if (filters.contentType) {
      await this.contentTypeFilter.selectOption(filters.contentType);
    }
    if (filters.priority) {
      await this.priorityFilter.selectOption(filters.priority);
    }
    if (filters.author) {
      await this.authorFilter.fill(filters.author);
    }
    if (filters.status) {
      await this.statusFilter.selectOption(filters.status);
    }

    await this.waitForAPIResponse('/api/admin/moderation/filter');
  }

  /**
   * Get moderation items
   */
  async getModerationItems(): Promise<ModerationItem[]> {
    await this.moderationQueue.waitFor({ state: 'visible' });
    const items = await this.moderationItems.all();
    
    const moderationItems: ModerationItem[] = [];
    for (const item of items) {
      const moderationItem: ModerationItem = {
        id: await item.getAttribute('data-item-id') || '',
        type: await item.getAttribute('data-content-type') as any || 'job',
        title: await item.locator('[data-testid="item-title"]').textContent() || '',
        content: await item.locator('[data-testid="item-content"]').textContent() || '',
        author: await item.locator('[data-testid="item-author"]').textContent() || '',
        createdAt: await item.locator('[data-testid="item-created"]').textContent() || '',
        status: await item.getAttribute('data-status') as any || 'pending',
        priority: await item.getAttribute('data-priority') as any || 'medium'
      };
      moderationItems.push(moderationItem);
    }
    
    return moderationItems;
  }

  /**
   * View content details
   */
  async viewContentDetails(itemId: string) {
    const item = this.page.locator(`[data-item-id="${itemId}"]`);
    await item.locator('[data-testid="view-details"]').click();
    await this.contentDetailModal.waitFor({ state: 'visible' });
  }

  /**
   * Moderate content
   */
  async moderateContent(itemId: string, action: ModerationAction) {
    await this.viewContentDetails(itemId);

    // Perform action
    const actionMap = {
      approve: this.approveBtn,
      reject: this.rejectBtn,
      flag: this.flagBtn,
      escalate: this.escalateBtn,
      delete: this.deleteBtn
    };

    await actionMap[action.action].click();

    // Handle action dialog if needed
    if (action.reason || action.notes) {
      await this.actionReasonModal.waitFor({ state: 'visible' });
      
      if (action.reason) {
        await this.reasonTextarea.fill(action.reason);
      }
      if (action.notes) {
        await this.internalNotesTextarea.fill(action.notes);
      }
      if (action.notify !== undefined) {
        if (action.notify) {
          await this.notifyAuthorCheckbox.check();
        } else {
          await this.notifyAuthorCheckbox.uncheck();
        }
      }
      
      await this.confirmActionBtn.click();
    }

    await this.waitForAPIResponse('/api/admin/moderation/action');
  }

  /**
   * Perform bulk moderation
   */
  async performBulkModeration(itemIds: string[], action: 'approve' | 'reject' | 'delete' | 'assign', parameters?: any) {
    // Enter bulk select mode
    await this.bulkSelectMode.click();

    // Select items
    for (const itemId of itemIds) {
      const checkbox = this.page.locator(`[data-item-id="${itemId}"] [data-testid="item-checkbox"]`);
      await checkbox.check();
    }

    // Perform bulk action
    const actionMap = {
      approve: this.bulkApproveBtn,
      reject: this.bulkRejectBtn,
      delete: this.bulkDeleteBtn,
      assign: this.bulkAssignBtn
    };

    await actionMap[action].click();

    // Handle parameters if needed
    if (parameters) {
      for (const [key, value] of Object.entries(parameters)) {
        await this.fillField(`[data-testid="bulk-param-${key}"]`, value);
      }
    }

    await this.clickElement('[data-testid="confirm-bulk-action"]');
    await this.waitForAPIResponse('/api/admin/moderation/bulk');
  }

  /**
   * Create auto-moderation rule
   */
  async createAutoModerationRule(rule: Omit<AutoModerationRule, 'id' | 'isActive'>) {
    await this.switchToTab('rules');
    await this.addRuleBtn.click();
    await this.ruleModal.waitFor({ state: 'visible' });

    // Fill rule details
    await this.ruleNameInput.fill(rule.name);
    await this.ruleTypeSelect.selectOption(rule.type);
    await this.ruleConditionInput.fill(rule.condition);
    await this.ruleActionSelect.selectOption(rule.action);

    // Test rule if test input is available
    if (await this.ruleTestInput.isVisible()) {
      await this.ruleTestInput.fill('test content');
      await this.testRuleBtn.click();
      await this.waitForAPIResponse('/api/admin/moderation/test-rule');
    }

    // Save rule
    await this.saveRuleBtn.click();
    await this.waitForAPIResponse('/api/admin/moderation/rules');
  }

  /**
   * Get auto-moderation rules
   */
  async getAutoModerationRules(): Promise<AutoModerationRule[]> {
    await this.switchToTab('rules');
    await this.rulesList.waitFor({ state: 'visible' });
    
    const ruleElements = await this.ruleItems.all();
    const rules: AutoModerationRule[] = [];
    
    for (const ruleElement of ruleElements) {
      const rule: AutoModerationRule = {
        id: await ruleElement.getAttribute('data-rule-id') || '',
        name: await ruleElement.locator('[data-testid="rule-name"]').textContent() || '',
        type: await ruleElement.getAttribute('data-rule-type') as any || 'keyword',
        condition: await ruleElement.locator('[data-testid="rule-condition"]').textContent() || '',
        action: await ruleElement.getAttribute('data-rule-action') as any || 'require_review',
        isActive: await ruleElement.locator('[data-testid="rule-status"]').isChecked()
      };
      rules.push(rule);
    }
    
    return rules;
  }

  /**
   * Toggle auto-moderation rule
   */
  async toggleAutoModerationRule(ruleId: string) {
    const rule = this.page.locator(`[data-rule-id="${ruleId}"]`);
    await rule.locator('[data-testid="toggle-rule"]').click();
    await this.waitForAPIResponse('/api/admin/moderation/rules/toggle');
  }

  /**
   * Delete auto-moderation rule
   */
  async deleteAutoModerationRule(ruleId: string) {
    const rule = this.page.locator(`[data-rule-id="${ruleId}"]`);
    await rule.locator('[data-testid="delete-rule"]').click();
    await this.clickElement('[data-testid="confirm-delete-rule"]');
    await this.waitForAPIResponse('/api/admin/moderation/rules/delete');
  }

  /**
   * Handle user reports
   */
  async handleUserReport(reportId: string, action: 'resolve' | 'escalate' | 'dismiss', reason?: string) {
    await this.switchToTab('reports');
    
    const report = this.page.locator(`[data-report-id="${reportId}"]`);
    await report.click();

    // Get report details
    const reportDetails = {
      reason: await this.reportReason.textContent(),
      reporter: await this.reporterInfo.textContent()
    };

    // Perform action
    const actionMap = {
      resolve: this.resolveReportBtn,
      escalate: this.escalateReportBtn,
      dismiss: this.dismissReportBtn
    };

    await actionMap[action].click();

    // Add reason if required
    if (reason) {
      await this.fillField('[data-testid="report-action-reason"]', reason);
      await this.clickElement('[data-testid="confirm-report-action"]');
    }

    await this.waitForAPIResponse('/api/admin/moderation/reports');
    return reportDetails;
  }

  /**
   * Get AI moderation insights
   */
  async getAIModerationInsights(itemId: string) {
    await this.viewContentDetails(itemId);
    
    if (await this.aiModerationPanel.isVisible()) {
      return {
        confidence: await this.confidenceScore.textContent(),
        recommendation: await this.aiRecommendation.textContent(),
        explanation: await this.aiExplanation.textContent()
      };
    }
    
    return null;
  }

  /**
   * Override AI recommendation
   */
  async overrideAIRecommendation(itemId: string, humanDecision: 'approve' | 'reject', reason: string) {
    await this.viewContentDetails(itemId);
    
    if (await this.aiModerationPanel.isVisible()) {
      await this.overrideAiBtn.click();
      await this.fillField('[data-testid="override-reason"]', reason);
      await this.clickElement(`[data-testid="override-${humanDecision}"]`);
      await this.waitForAPIResponse('/api/admin/moderation/override-ai');
    }
  }

  /**
   * Get moderator performance metrics
   */
  async getModeratorMetrics() {
    await this.performanceMetrics.waitFor({ state: 'visible' });
    
    return {
      actionsToday: await this.extractNumberFromElement(this.page.locator('[data-testid="actions-today"]')),
      accuracy: await this.getElementText('[data-testid="moderation-accuracy"]'),
      averageTime: await this.getElementText('[data-testid="average-action-time"]'),
      consistency: await this.getElementText('[data-testid="consistency-score"]')
    };
  }

  /**
   * Get recent moderation activity
   */
  async getRecentActivity(): Promise<string[]> {
    await this.recentActions.waitFor({ state: 'visible' });
    const actions = await this.page.locator('[data-testid="recent-action-item"]').all();
    
    const activities: string[] = [];
    for (const action of actions) {
      const text = await action.textContent();
      if (text) activities.push(text.trim());
    }
    
    return activities;
  }

  /**
   * Contact content author
   */
  async contactAuthor(itemId: string, subject: string, message: string) {
    await this.viewContentDetails(itemId);
    await this.contactAuthorBtn.click();
    
    await this.fillField('[data-testid="contact-subject"]', subject);
    await this.fillField('[data-testid="contact-message"]', message);
    await this.clickElement('[data-testid="send-message"]');
    
    await this.waitForAPIResponse('/api/admin/moderation/contact');
  }

  /**
   * Edit content directly
   */
  async editContent(itemId: string, newTitle?: string, newContent?: string) {
    await this.viewContentDetails(itemId);
    await this.editContentBtn.click();
    
    if (newTitle) {
      await this.fillField('[data-testid="edit-title"]', newTitle);
    }
    if (newContent) {
      await this.fillField('[data-testid="edit-content"]', newContent);
    }
    
    await this.clickElement('[data-testid="save-content-changes"]');
    await this.waitForAPIResponse('/api/admin/moderation/edit');
  }

  /**
   * Check similar content
   */
  async checkSimilarContent(itemId: string): Promise<string[]> {
    await this.viewContentDetails(itemId);
    
    if (await this.similarContent.isVisible()) {
      const similarItems = await this.page.locator('[data-testid="similar-item"]').all();
      const similarities: string[] = [];
      
      for (const item of similarItems) {
        const text = await item.textContent();
        if (text) similarities.push(text.trim());
      }
      
      return similarities;
    }
    
    return [];
  }

  /**
   * Refresh moderation queue
   */
  async refreshQueue() {
    await this.refreshQueueBtn.click();
    await this.waitForAPIResponse('/api/admin/moderation/refresh');
  }

  /**
   * Load more content items
   */
  async loadMoreItems() {
    if (await this.loadMoreBtn.isVisible()) {
      await this.loadMoreBtn.click();
      await this.waitForAPIResponse('/api/admin/moderation/load-more');
    }
  }

  /**
   * Sort content by criteria
   */
  async sortContentBy(criteria: 'newest' | 'oldest' | 'priority' | 'reports') {
    await this.sortBySelect.selectOption(criteria);
    await this.waitForAPIResponse('/api/admin/moderation/sort');
  }

  /**
   * Test content moderation workflow
   */
  async testCompleteWorkflow(contentType: 'job' | 'post' | 'comment') {
    // Start with pending content
    await this.switchToTab('pending');
    
    // Apply content type filter
    await this.applyFilters({ contentType });
    
    // Get first item
    const items = await this.getModerationItems();
    if (items.length === 0) return null;
    
    const firstItem = items[0];
    
    // View details and moderate
    await this.moderateContent(firstItem.id, {
      action: 'approve',
      reason: 'Content meets community guidelines',
      notify: true,
      notes: 'Automated test approval'
    });
    
    // Verify action was recorded
    await this.switchToTab('approved');
    const approvedItems = await this.getModerationItems();
    const wasApproved = approvedItems.some(item => item.id === firstItem.id);
    
    return { item: firstItem, approved: wasApproved };
  }

  /**
   * Close content detail modal
   */
  async closeContentDetailModal() {
    await this.clickElement('[data-testid="close-content-detail"]');
    await this.contentDetailModal.waitFor({ state: 'hidden' });
  }
}