import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'member' | 'premium' | 'company' | 'admin' | 'moderator' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  registrationDate: string;
  lastLogin: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  subscriptionType?: 'basic' | 'premium' | 'enterprise';
  commissions?: string[];
}

export interface UserSearchFilters {
  email?: string;
  role?: string;
  status?: string;
  registrationDateFrom?: string;
  registrationDateTo?: string;
  commission?: string;
  subscriptionType?: string;
}

export interface BulkAction {
  action: 'activate' | 'suspend' | 'delete' | 'export' | 'send_email' | 'assign_role';
  userIds: string[];
  parameters?: Record<string, any>;
}

export class UserManagementPage extends BasePage {
  // Header and navigation
  private readonly pageTitle: Locator;
  private readonly backToDashboard: Locator;
  private readonly userCountDisplay: Locator;

  // Search and filtering
  private readonly searchInput: Locator;
  private readonly advancedSearchToggle: Locator;
  private readonly advancedSearchPanel: Locator;
  private readonly emailFilter: Locator;
  private readonly roleFilter: Locator;
  private readonly statusFilter: Locator;
  private readonly registrationDateFromFilter: Locator;
  private readonly registrationDateToFilter: Locator;
  private readonly commissionFilter: Locator;
  private readonly subscriptionTypeFilter: Locator;
  private readonly clearFiltersBtn: Locator;
  private readonly applyFiltersBtn: Locator;

  // User table
  private readonly usersTable: Locator;
  private readonly userRows: Locator;
  private readonly tableHeaders: Locator;
  private readonly selectAllCheckbox: Locator;
  private readonly userCheckboxes: Locator;
  private readonly sortByName: Locator;
  private readonly sortByEmail: Locator;
  private readonly sortByRegistration: Locator;
  private readonly sortByLastLogin: Locator;

  // Pagination
  private readonly paginationContainer: Locator;
  private readonly prevPageBtn: Locator;
  private readonly nextPageBtn: Locator;
  private readonly pageNumbers: Locator;
  private readonly pageSizeSelect: Locator;
  private readonly totalPagesInfo: Locator;

  // User actions
  private readonly addUserBtn: Locator;
  private readonly importUsersBtn: Locator;
  private readonly exportUsersBtn: Locator;
  private readonly bulkActionsDropdown: Locator;
  private readonly bulkActionConfirmModal: Locator;

  // User detail modal
  private readonly userDetailModal: Locator;
  private readonly userDetailTabs: Locator;
  private readonly userInfoTab: Locator;
  private readonly userActivityTab: Locator;
  private readonly userSubscriptionsTab: Locator;
  private readonly userAuditLogTab: Locator;
  
  // User info fields
  private readonly userIdField: Locator;
  private readonly userEmailField: Locator;
  private readonly userFirstNameField: Locator;
  private readonly userLastNameField: Locator;
  private readonly userRoleSelect: Locator;
  private readonly userStatusSelect: Locator;
  private readonly userVerificationStatus: Locator;
  private readonly userCommissionsList: Locator;

  // User actions in modal
  private readonly editUserBtn: Locator;
  private readonly suspendUserBtn: Locator;
  private readonly activateUserBtn: Locator;
  private readonly deleteUserBtn: Locator;
  private readonly impersonateUserBtn: Locator;
  private readonly sendEmailBtn: Locator;
  private readonly resetPasswordBtn: Locator;
  private readonly saveUserChangesBtn: Locator;
  private readonly cancelUserChangesBtn: Locator;

  // Add/Edit user form
  private readonly addUserModal: Locator;
  private readonly newUserEmailInput: Locator;
  private readonly newUserFirstNameInput: Locator;
  private readonly newUserLastNameInput: Locator;
  private readonly newUserRoleSelect: Locator;
  private readonly newUserPasswordInput: Locator;
  private readonly newUserSendInviteCheckbox: Locator;
  private readonly createUserBtn: Locator;

  // Import/Export
  private readonly importModal: Locator;
  private readonly importFileInput: Locator;
  private readonly importTemplateLink: Locator;
  private readonly importProgressBar: Locator;
  private readonly importResults: Locator;
  private readonly exportModal: Locator;
  private readonly exportFormatSelect: Locator;
  private readonly exportFieldsSelector: Locator;

  // Notifications and alerts
  private readonly successNotification: Locator;
  private readonly errorNotification: Locator;
  private readonly confirmationDialog: Locator;

  constructor(page: Page) {
    super(page);

    // Header and navigation
    this.pageTitle = page.locator('[data-testid="user-management-title"]');
    this.backToDashboard = page.locator('[data-testid="back-to-dashboard"]');
    this.userCountDisplay = page.locator('[data-testid="user-count-display"]');

    // Search and filtering
    this.searchInput = page.locator('[data-testid="user-search-input"]');
    this.advancedSearchToggle = page.locator('[data-testid="advanced-search-toggle"]');
    this.advancedSearchPanel = page.locator('[data-testid="advanced-search-panel"]');
    this.emailFilter = page.locator('[data-testid="filter-email"]');
    this.roleFilter = page.locator('[data-testid="filter-role"]');
    this.statusFilter = page.locator('[data-testid="filter-status"]');
    this.registrationDateFromFilter = page.locator('[data-testid="filter-registration-from"]');
    this.registrationDateToFilter = page.locator('[data-testid="filter-registration-to"]');
    this.commissionFilter = page.locator('[data-testid="filter-commission"]');
    this.subscriptionTypeFilter = page.locator('[data-testid="filter-subscription-type"]');
    this.clearFiltersBtn = page.locator('[data-testid="clear-filters"]');
    this.applyFiltersBtn = page.locator('[data-testid="apply-filters"]');

    // User table
    this.usersTable = page.locator('[data-testid="users-table"]');
    this.userRows = page.locator('[data-testid="user-row"]');
    this.tableHeaders = page.locator('[data-testid="table-header"]');
    this.selectAllCheckbox = page.locator('[data-testid="select-all-users"]');
    this.userCheckboxes = page.locator('[data-testid="user-checkbox"]');
    this.sortByName = page.locator('[data-testid="sort-by-name"]');
    this.sortByEmail = page.locator('[data-testid="sort-by-email"]');
    this.sortByRegistration = page.locator('[data-testid="sort-by-registration"]');
    this.sortByLastLogin = page.locator('[data-testid="sort-by-last-login"]');

    // Pagination
    this.paginationContainer = page.locator('[data-testid="pagination-container"]');
    this.prevPageBtn = page.locator('[data-testid="prev-page"]');
    this.nextPageBtn = page.locator('[data-testid="next-page"]');
    this.pageNumbers = page.locator('[data-testid="page-number"]');
    this.pageSizeSelect = page.locator('[data-testid="page-size-select"]');
    this.totalPagesInfo = page.locator('[data-testid="total-pages-info"]');

    // User actions
    this.addUserBtn = page.locator('[data-testid="add-user"]');
    this.importUsersBtn = page.locator('[data-testid="import-users"]');
    this.exportUsersBtn = page.locator('[data-testid="export-users"]');
    this.bulkActionsDropdown = page.locator('[data-testid="bulk-actions-dropdown"]');
    this.bulkActionConfirmModal = page.locator('[data-testid="bulk-action-confirm-modal"]');

    // User detail modal
    this.userDetailModal = page.locator('[data-testid="user-detail-modal"]');
    this.userDetailTabs = page.locator('[data-testid="user-detail-tabs"]');
    this.userInfoTab = page.locator('[data-testid="user-info-tab"]');
    this.userActivityTab = page.locator('[data-testid="user-activity-tab"]');
    this.userSubscriptionsTab = page.locator('[data-testid="user-subscriptions-tab"]');
    this.userAuditLogTab = page.locator('[data-testid="user-audit-log-tab"]');

    // User info fields
    this.userIdField = page.locator('[data-testid="user-id-field"]');
    this.userEmailField = page.locator('[data-testid="user-email-field"]');
    this.userFirstNameField = page.locator('[data-testid="user-firstname-field"]');
    this.userLastNameField = page.locator('[data-testid="user-lastname-field"]');
    this.userRoleSelect = page.locator('[data-testid="user-role-select"]');
    this.userStatusSelect = page.locator('[data-testid="user-status-select"]');
    this.userVerificationStatus = page.locator('[data-testid="user-verification-status"]');
    this.userCommissionsList = page.locator('[data-testid="user-commissions-list"]');

    // User actions in modal  
    this.editUserBtn = page.locator('[data-testid="edit-user"]');
    this.suspendUserBtn = page.locator('[data-testid="suspend-user"]');
    this.activateUserBtn = page.locator('[data-testid="activate-user"]');
    this.deleteUserBtn = page.locator('[data-testid="delete-user"]');
    this.impersonateUserBtn = page.locator('[data-testid="impersonate-user"]');
    this.sendEmailBtn = page.locator('[data-testid="send-email-to-user"]');
    this.resetPasswordBtn = page.locator('[data-testid="reset-password"]');
    this.saveUserChangesBtn = page.locator('[data-testid="save-user-changes"]');
    this.cancelUserChangesBtn = page.locator('[data-testid="cancel-user-changes"]');

    // Add/Edit user form
    this.addUserModal = page.locator('[data-testid="add-user-modal"]');
    this.newUserEmailInput = page.locator('[data-testid="new-user-email"]');
    this.newUserFirstNameInput = page.locator('[data-testid="new-user-firstname"]');
    this.newUserLastNameInput = page.locator('[data-testid="new-user-lastname"]');
    this.newUserRoleSelect = page.locator('[data-testid="new-user-role"]');
    this.newUserPasswordInput = page.locator('[data-testid="new-user-password"]');
    this.newUserSendInviteCheckbox = page.locator('[data-testid="new-user-send-invite"]');
    this.createUserBtn = page.locator('[data-testid="create-user"]');

    // Import/Export
    this.importModal = page.locator('[data-testid="import-modal"]');
    this.importFileInput = page.locator('[data-testid="import-file-input"]');
    this.importTemplateLink = page.locator('[data-testid="import-template-link"]');
    this.importProgressBar = page.locator('[data-testid="import-progress-bar"]');
    this.importResults = page.locator('[data-testid="import-results"]');
    this.exportModal = page.locator('[data-testid="export-modal"]');
    this.exportFormatSelect = page.locator('[data-testid="export-format-select"]');
    this.exportFieldsSelector = page.locator('[data-testid="export-fields-selector"]');

    // Notifications
    this.successNotification = page.locator('[data-testid="success-notification"]');
    this.errorNotification = page.locator('[data-testid="error-notification"]');
    this.confirmationDialog = page.locator('[data-testid="confirmation-dialog"]');
  }

  /**
   * Navigate to user management page
   */
  async goto() {
    await this.navigate('/admin/users');
    await this.waitForPageLoad();
    await this.waitForElement('[data-testid="user-management-title"]');
  }

  /**
   * Search for users
   */
  async searchUsers(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForAPIResponse('/api/admin/users/search');
    await this.waitForElement('[data-testid="users-table"]');
  }

  /**
   * Apply advanced filters
   */
  async applyAdvancedFilters(filters: UserSearchFilters) {
    // Open advanced search panel
    await this.advancedSearchToggle.click();
    await this.advancedSearchPanel.waitFor({ state: 'visible' });

    // Apply filters
    if (filters.email) {
      await this.emailFilter.fill(filters.email);
    }
    if (filters.role) {
      await this.roleFilter.selectOption(filters.role);
    }
    if (filters.status) {
      await this.statusFilter.selectOption(filters.status);
    }
    if (filters.registrationDateFrom) {
      await this.registrationDateFromFilter.fill(filters.registrationDateFrom);
    }
    if (filters.registrationDateTo) {
      await this.registrationDateToFilter.fill(filters.registrationDateTo);
    }
    if (filters.commission) {
      await this.commissionFilter.selectOption(filters.commission);
    }
    if (filters.subscriptionType) {
      await this.subscriptionTypeFilter.selectOption(filters.subscriptionType);
    }

    // Apply filters
    await this.applyFiltersBtn.click();
    await this.waitForAPIResponse('/api/admin/users/filter');
  }

  /**
   * Clear all filters
   */
  async clearAllFilters() {
    await this.clearFiltersBtn.click();
    await this.waitForAPIResponse('/api/admin/users');
  }

  /**
   * Get user count from display
   */
  async getUserCount(): Promise<number> {
    const countText = await this.userCountDisplay.textContent() || '0';
    const match = countText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get users from current page
   */
  async getUsers(): Promise<User[]> {
    await this.usersTable.waitFor({ state: 'visible' });
    const rows = await this.userRows.all();
    
    const users: User[] = [];
    for (const row of rows) {
      const user: User = {
        id: await row.getAttribute('data-user-id') || '',
        email: await row.locator('[data-testid="user-email"]').textContent() || '',
        firstName: await row.locator('[data-testid="user-firstname"]').textContent() || '',
        lastName: await row.locator('[data-testid="user-lastname"]').textContent() || '',
        role: await row.locator('[data-testid="user-role"]').textContent() as any || 'member',
        status: await row.locator('[data-testid="user-status"]').textContent() as any || 'active',
        registrationDate: await row.locator('[data-testid="user-registration"]').textContent() || '',
        lastLogin: await row.locator('[data-testid="user-last-login"]').textContent() || '',
        verificationStatus: await row.locator('[data-testid="user-verification"]').textContent() as any || 'verified'
      };
      users.push(user);
    }
    
    return users;
  }

  /**
   * View user details
   */
  async viewUserDetails(userId: string) {
    const userRow = this.page.locator(`[data-user-id="${userId}"]`);
    await userRow.locator('[data-testid="view-user-details"]').click();
    await this.userDetailModal.waitFor({ state: 'visible' });
  }

  /**
   * Edit user information
   */
  async editUser(userId: string, updates: Partial<User>) {
    await this.viewUserDetails(userId);
    await this.editUserBtn.click();

    // Update fields
    if (updates.firstName) {
      await this.userFirstNameField.clear();
      await this.userFirstNameField.fill(updates.firstName);
    }
    if (updates.lastName) {
      await this.userLastNameField.clear();
      await this.userLastNameField.fill(updates.lastName);
    }
    if (updates.role) {
      await this.userRoleSelect.selectOption(updates.role);
    }
    if (updates.status) {
      await this.userStatusSelect.selectOption(updates.status);
    }

    // Save changes
    await this.saveUserChangesBtn.click();
    await this.waitForAPIResponse('/api/admin/users/update');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Suspend user
   */
  async suspendUser(userId: string, reason?: string) {
    await this.viewUserDetails(userId);
    await this.suspendUserBtn.click();
    
    // Handle confirmation dialog
    if (reason) {
      await this.fillField('[data-testid="suspension-reason"]', reason);
    }
    await this.clickElement('[data-testid="confirm-suspension"]');
    
    await this.waitForAPIResponse('/api/admin/users/suspend');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Activate user
   */
  async activateUser(userId: string) {
    await this.viewUserDetails(userId);
    await this.activateUserBtn.click();
    await this.clickElement('[data-testid="confirm-activation"]');
    
    await this.waitForAPIResponse('/api/admin/users/activate');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string) {
    await this.viewUserDetails(userId);
    await this.deleteUserBtn.click();
    
    // Handle confirmation dialog
    await this.fillField('[data-testid="delete-confirmation-input"]', 'DELETE');
    await this.clickElement('[data-testid="confirm-deletion"]');
    
    await this.waitForAPIResponse('/api/admin/users/delete');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Add new user
   */
  async addUser(userData: Omit<User, 'id' | 'registrationDate' | 'lastLogin' | 'verificationStatus'>) {
    await this.addUserBtn.click();
    await this.addUserModal.waitFor({ state: 'visible' });

    // Fill form
    await this.newUserEmailInput.fill(userData.email);
    await this.newUserFirstNameInput.fill(userData.firstName);
    await this.newUserLastNameInput.fill(userData.lastName);
    await this.newUserRoleSelect.selectOption(userData.role);

    // Generate temporary password or send invite
    if (await this.newUserSendInviteCheckbox.isVisible()) {
      await this.newUserSendInviteCheckbox.check();
    } else {
      await this.newUserPasswordInput.fill('TempPassword123!');
    }

    // Create user
    await this.createUserBtn.click();
    await this.waitForAPIResponse('/api/admin/users/create');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Select users for bulk actions
   */
  async selectUsers(userIds: string[]) {
    for (const userId of userIds) {
      const checkbox = this.page.locator(`[data-user-id="${userId}"] [data-testid="user-checkbox"]`);
      await checkbox.check();
    }
  }

  /**
   * Select all users on current page
   */
  async selectAllUsers() {
    await this.selectAllCheckbox.check();
  }

  /**
   * Perform bulk action
   */
  async performBulkAction(action: BulkAction) {
    // Select users first
    await this.selectUsers(action.userIds);

    // Open bulk actions dropdown
    await this.bulkActionsDropdown.click();
    await this.clickElement(`[data-testid="bulk-${action.action}"]`);

    // Handle action-specific parameters
    if (action.parameters) {
      for (const [key, value] of Object.entries(action.parameters)) {
        await this.fillField(`[data-testid="bulk-param-${key}"]`, value);
      }
    }

    // Confirm action
    await this.clickElement('[data-testid="confirm-bulk-action"]');
    await this.waitForAPIResponse('/api/admin/users/bulk');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Sort users by column
   */
  async sortBy(column: 'name' | 'email' | 'registration' | 'lastLogin', direction: 'asc' | 'desc' = 'asc') {
    const sortLocators = {
      name: this.sortByName,
      email: this.sortByEmail,
      registration: this.sortByRegistration,
      lastLogin: this.sortByLastLogin
    };

    const sortButton = sortLocators[column];
    await sortButton.click();

    // Click again for descending order
    if (direction === 'desc') {
      await sortButton.click();
    }

    await this.waitForAPIResponse('/api/admin/users');
  }

  /**
   * Navigate to specific page
   */
  async goToPage(pageNumber: number) {
    const pageBtn = this.page.locator(`[data-testid="page-number"][data-page="${pageNumber}"]`);
    await pageBtn.click();
    await this.waitForAPIResponse('/api/admin/users');
  }

  /**
   * Change page size
   */
  async changePageSize(size: number) {
    await this.pageSizeSelect.selectOption(size.toString());
    await this.waitForAPIResponse('/api/admin/users');
  }

  /**
   * Import users from file
   */
  async importUsers(filePath: string) {
    await this.importUsersBtn.click();
    await this.importModal.waitFor({ state: 'visible' });

    // Upload file
    await this.importFileInput.setInputFiles(filePath);
    await this.clickElement('[data-testid="start-import"]');

    // Wait for import to complete
    await this.waitForElement('[data-testid="import-complete"]', { timeout: 60000 });
    
    // Get import results
    const resultsText = await this.importResults.textContent();
    return resultsText;
  }

  /**
   * Export users
   */
  async exportUsers(format: 'csv' | 'xlsx' | 'json' = 'csv', fields?: string[]) {
    await this.exportUsersBtn.click();
    await this.exportModal.waitFor({ state: 'visible' });

    // Select format
    await this.exportFormatSelect.selectOption(format);

    // Select fields if specified
    if (fields) {
      for (const field of fields) {
        await this.page.locator(`[data-testid="field-${field}"]`).check();
      }
    }

    // Start export
    const downloadPromise = this.page.waitForEvent('download');
    await this.clickElement('[data-testid="start-export"]');
    const download = await downloadPromise;
    
    return download;
  }

  /**
   * Impersonate user
   */
  async impersonateUser(userId: string) {
    await this.viewUserDetails(userId);
    await this.impersonateUserBtn.click();
    await this.clickElement('[data-testid="confirm-impersonation"]');
    
    // Wait for redirect to user view
    await this.waitForNavigation(/\/dashboard/);
  }

  /**
   * Send email to user
   */
  async sendEmailToUser(userId: string, subject: string, message: string) {
    await this.viewUserDetails(userId);
    await this.sendEmailBtn.click();

    // Fill email form
    await this.fillField('[data-testid="email-subject"]', subject);
    await this.fillField('[data-testid="email-message"]', message);
    await this.clickElement('[data-testid="send-email"]');

    await this.waitForAPIResponse('/api/admin/users/send-email');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string) {
    await this.viewUserDetails(userId);
    await this.resetPasswordBtn.click();
    await this.clickElement('[data-testid="confirm-password-reset"]');

    await this.waitForAPIResponse('/api/admin/users/reset-password');
    await this.successNotification.waitFor({ state: 'visible' });
  }

  /**
   * Get user activity log
   */
  async getUserActivityLog(userId: string): Promise<string[]> {
    await this.viewUserDetails(userId);
    await this.userActivityTab.click();
    
    const activityItems = await this.page.locator('[data-testid="activity-item"]').all();
    const activities: string[] = [];
    
    for (const item of activityItems) {
      const text = await item.textContent();
      if (text) activities.push(text.trim());
    }
    
    return activities;
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<any[]> {
    await this.viewUserDetails(userId);
    await this.userSubscriptionsTab.click();
    
    const subscriptionItems = await this.page.locator('[data-testid="subscription-item"]').all();
    const subscriptions: any[] = [];
    
    for (const item of subscriptionItems) {
      const subscription = {
        type: await item.locator('[data-testid="subscription-type"]').textContent(),
        status: await item.locator('[data-testid="subscription-status"]').textContent(),
        startDate: await item.locator('[data-testid="subscription-start"]').textContent(),
        endDate: await item.locator('[data-testid="subscription-end"]').textContent()
      };
      subscriptions.push(subscription);
    }
    
    return subscriptions;
  }

  /**
   * Get user audit log
   */
  async getUserAuditLog(userId: string): Promise<string[]> {
    await this.viewUserDetails(userId);
    await this.userAuditLogTab.click();
    
    const auditItems = await this.page.locator('[data-testid="audit-item"]').all();
    const auditEntries: string[] = [];
    
    for (const item of auditItems) {
      const text = await item.textContent();
      if (text) auditEntries.push(text.trim());
    }
    
    return auditEntries;
  }

  /**
   * Check for success notification
   */
  async waitForSuccessNotification(timeout: number = 10000) {
    await this.successNotification.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check for error notification
   */
  async waitForErrorNotification(timeout: number = 10000) {
    await this.errorNotification.waitFor({ state: 'visible', timeout });
  }

  /**
   * Close user detail modal
   */
  async closeUserDetailModal() {
    await this.clickElement('[data-testid="close-user-detail-modal"]');
    await this.userDetailModal.waitFor({ state: 'hidden' });
  }

  /**
   * Verify user data validation
   */
  async testUserValidation() {
    await this.addUserBtn.click();
    await this.addUserModal.waitFor({ state: 'visible' });

    // Try to create user with invalid data
    await this.createUserBtn.click();

    // Check for validation errors
    const emailError = await this.page.locator('[data-testid="email-error"]').isVisible();
    const nameError = await this.page.locator('[data-testid="name-error"]').isVisible();

    return { emailError, nameError };
  }

  /**
   * Test role assignment permissions
   */
  async testRoleAssignmentPermissions(currentUserRole: string, targetRole: string): Promise<boolean> {
    await this.addUserBtn.click();
    await this.addUserModal.waitFor({ state: 'visible' });

    // Check if target role is available in dropdown
    const roleOptions = await this.newUserRoleSelect.locator('option').all();
    const availableRoles: string[] = [];
    
    for (const option of roleOptions) {
      const value = await option.getAttribute('value');
      if (value) availableRoles.push(value);
    }

    return availableRoles.includes(targetRole);
  }
}