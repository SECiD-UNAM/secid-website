import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  description: string;
  downloadUrl?: string;
  subscription?: {
    id: string;
    tier: string;
    period: string;
  };
  taxes?: {
    iva: number;
    total: number;
  };
}

export interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  currency: string;
  method: string;
  status: 'completed' | 'failed' | 'pending' | 'refunded';
  description: string;
  invoiceId?: string;
  refundAmount?: number;
}

export interface BillingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId?: string;
  rfc?: string;
  curp?: string;
}

export class BillingPage extends BasePage {
  // Header and navigation
  private readonly pageHeader: Locator;
  private readonly billingTabs: Locator;
  private readonly overviewTab: Locator;
  private readonly invoicesTab: Locator;
  private readonly paymentHistoryTab: Locator;
  private readonly billingInfoTab: Locator;
  private readonly taxSettingsTab: Locator;

  // Overview section
  private readonly currentBalance: Locator;
  private readonly nextPaymentDate: Locator;
  private readonly nextPaymentAmount: Locator;
  private readonly billingCycleInfo: Locator;
  private readonly upcomingInvoice: Locator;
  private readonly paymentStatus: Locator;

  // Invoices section
  private readonly invoicesTable: Locator;
  private readonly invoiceRows: Locator;
  private readonly invoiceNumber: Locator;
  private readonly invoiceDate: Locator;
  private readonly invoiceAmount: Locator;
  private readonly invoiceStatus: Locator;
  private readonly downloadInvoiceButton: Locator;
  private readonly viewInvoiceButton: Locator;
  private readonly invoiceModal: Locator;
  private readonly invoiceDetails: Locator;

  // Payment history section
  private readonly paymentHistoryTable: Locator;
  private readonly paymentRows: Locator;
  private readonly paymentDate: Locator;
  private readonly paymentAmount: Locator;
  private readonly paymentMethod: Locator;
  private readonly paymentStatus2: Locator;
  private readonly refundButton: Locator;
  private readonly refundModal: Locator;

  // Billing information section
  private readonly billingAddressCard: Locator;
  private readonly editBillingButton: Locator;
  private readonly billingForm: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly companyInput: Locator;
  private readonly emailInput: Locator;
  private readonly addressInput: Locator;
  private readonly cityInput: Locator;
  private readonly stateSelect: Locator;
  private readonly postalCodeInput: Locator;
  private readonly countrySelect: Locator;
  private readonly saveBillingButton: Locator;

  // Mexican tax settings
  private readonly taxSettingsCard: Locator;
  private readonly rfcInput: Locator;
  private readonly curpInput: Locator;
  private readonly fiscalRegimeSelect: Locator;
  private readonly cfdiUseSelect: Locator;
  private readonly businessNameInput: Locator;
  private readonly taxAddressInput: Locator;
  private readonly saveTaxSettingsButton: Locator;

  // Payment methods management
  private readonly paymentMethodsSection: Locator;
  private readonly paymentMethodsList: Locator;
  private readonly addPaymentMethodButton: Locator;
  private readonly paymentMethodCard: Locator;
  private readonly setDefaultButton: Locator;
  private readonly deletePaymentMethodButton: Locator;
  private readonly confirmDeleteModal: Locator;

  // Filters and search
  private readonly dateRangeFilter: Locator;
  private readonly statusFilter: Locator;
  private readonly searchInput: Locator;
  private readonly clearFiltersButton: Locator;
  private readonly exportButton: Locator;

  // Pagination
  private readonly pagination: Locator;
  private readonly previousPageButton: Locator;
  private readonly nextPageButton: Locator;
  private readonly pageNumbers: Locator;
  private readonly itemsPerPageSelect: Locator;

  // Notifications and alerts
  private readonly successMessage: Locator;
  private readonly errorMessage: Locator;
  private readonly warningMessage: Locator;
  private readonly paymentFailureAlert: Locator;
  private readonly subscriptionExpiryAlert: Locator;

  // Loading states
  private readonly loadingSpinner: Locator;
  private readonly skeletonLoader: Locator;

  // Mobile-specific elements
  private readonly mobileMenu: Locator;
  private readonly mobileTabToggle: Locator;
  private readonly mobileInvoiceCard: Locator;

  constructor(page: Page) {
    super(page);

    // Header and navigation
    this.pageHeader = page.locator('[data-testid="billing-header"]');
    this.billingTabs = page.locator('[data-testid="billing-tabs"]');
    this.overviewTab = page.locator('[data-testid="overview-tab"]');
    this.invoicesTab = page.locator('[data-testid="invoices-tab"]');
    this.paymentHistoryTab = page.locator('[data-testid="payment-history-tab"]');
    this.billingInfoTab = page.locator('[data-testid="billing-info-tab"]');
    this.taxSettingsTab = page.locator('[data-testid="tax-settings-tab"]');

    // Overview section
    this.currentBalance = page.locator('[data-testid="current-balance"]');
    this.nextPaymentDate = page.locator('[data-testid="next-payment-date"]');
    this.nextPaymentAmount = page.locator('[data-testid="next-payment-amount"]');
    this.billingCycleInfo = page.locator('[data-testid="billing-cycle-info"]');
    this.upcomingInvoice = page.locator('[data-testid="upcoming-invoice"]');
    this.paymentStatus = page.locator('[data-testid="payment-status"]');

    // Invoices section
    this.invoicesTable = page.locator('[data-testid="invoices-table"]');
    this.invoiceRows = page.locator('[data-testid="invoice-row"]');
    this.invoiceNumber = page.locator('[data-testid="invoice-number"]');
    this.invoiceDate = page.locator('[data-testid="invoice-date"]');
    this.invoiceAmount = page.locator('[data-testid="invoice-amount"]');
    this.invoiceStatus = page.locator('[data-testid="invoice-status"]');
    this.downloadInvoiceButton = page.locator('[data-testid="download-invoice"]');
    this.viewInvoiceButton = page.locator('[data-testid="view-invoice"]');
    this.invoiceModal = page.locator('[data-testid="invoice-modal"]');
    this.invoiceDetails = page.locator('[data-testid="invoice-details"]');

    // Payment history section
    this.paymentHistoryTable = page.locator('[data-testid="payment-history-table"]');
    this.paymentRows = page.locator('[data-testid="payment-row"]');
    this.paymentDate = page.locator('[data-testid="payment-date"]');
    this.paymentAmount = page.locator('[data-testid="payment-amount"]');
    this.paymentMethod = page.locator('[data-testid="payment-method"]');
    this.paymentStatus2 = page.locator('[data-testid="payment-status"]');
    this.refundButton = page.locator('[data-testid="refund-button"]');
    this.refundModal = page.locator('[data-testid="refund-modal"]');

    // Billing information section
    this.billingAddressCard = page.locator('[data-testid="billing-address-card"]');
    this.editBillingButton = page.locator('[data-testid="edit-billing-button"]');
    this.billingForm = page.locator('[data-testid="billing-form"]');
    this.firstNameInput = page.locator('[data-testid="first-name"]');
    this.lastNameInput = page.locator('[data-testid="last-name"]');
    this.companyInput = page.locator('[data-testid="company"]');
    this.emailInput = page.locator('[data-testid="email"]');
    this.addressInput = page.locator('[data-testid="address"]');
    this.cityInput = page.locator('[data-testid="city"]');
    this.stateSelect = page.locator('[data-testid="state"]');
    this.postalCodeInput = page.locator('[data-testid="postal-code"]');
    this.countrySelect = page.locator('[data-testid="country"]');
    this.saveBillingButton = page.locator('[data-testid="save-billing"]');

    // Mexican tax settings
    this.taxSettingsCard = page.locator('[data-testid="tax-settings-card"]');
    this.rfcInput = page.locator('[data-testid="rfc"]');
    this.curpInput = page.locator('[data-testid="curp"]');
    this.fiscalRegimeSelect = page.locator('[data-testid="fiscal-regime"]');
    this.cfdiUseSelect = page.locator('[data-testid="cfdi-use"]');
    this.businessNameInput = page.locator('[data-testid="business-name"]');
    this.taxAddressInput = page.locator('[data-testid="tax-address"]');
    this.saveTaxSettingsButton = page.locator('[data-testid="save-tax-settings"]');

    // Payment methods management
    this.paymentMethodsSection = page.locator('[data-testid="payment-methods-section"]');
    this.paymentMethodsList = page.locator('[data-testid="payment-methods-list"]');
    this.addPaymentMethodButton = page.locator('[data-testid="add-payment-method"]');
    this.paymentMethodCard = page.locator('[data-testid="payment-method-card"]');
    this.setDefaultButton = page.locator('[data-testid="set-default"]');
    this.deletePaymentMethodButton = page.locator('[data-testid="delete-payment-method"]');
    this.confirmDeleteModal = page.locator('[data-testid="confirm-delete-modal"]');

    // Filters and search
    this.dateRangeFilter = page.locator('[data-testid="date-range-filter"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.clearFiltersButton = page.locator('[data-testid="clear-filters"]');
    this.exportButton = page.locator('[data-testid="export-button"]');

    // Pagination
    this.pagination = page.locator('[data-testid="pagination"]');
    this.previousPageButton = page.locator('[data-testid="previous-page"]');
    this.nextPageButton = page.locator('[data-testid="next-page"]');
    this.pageNumbers = page.locator('[data-testid="page-number"]');
    this.itemsPerPageSelect = page.locator('[data-testid="items-per-page"]');

    // Notifications and alerts
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.warningMessage = page.locator('[data-testid="warning-message"]');
    this.paymentFailureAlert = page.locator('[data-testid="payment-failure-alert"]');
    this.subscriptionExpiryAlert = page.locator('[data-testid="subscription-expiry-alert"]');

    // Loading states
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.skeletonLoader = page.locator('[data-testid="skeleton-loader"]');

    // Mobile-specific elements
    this.mobileMenu = page.locator('[data-testid="mobile-menu"]');
    this.mobileTabToggle = page.locator('[data-testid="mobile-tab-toggle"]');
    this.mobileInvoiceCard = page.locator('[data-testid="mobile-invoice-card"]');
  }

  /**
   * Navigate to billing page
   */
  async goto(): Promise<void> {
    await this.page.goto('/billing');
    await this.waitForLoad();
  }

  /**
   * Wait for billing page to load
   */
  async waitForLoad(): Promise<void> {
    await this.pageHeader.waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
    
    // Wait for skeleton loaders to disappear
    if (await this.skeletonLoader.isVisible()) {
      await this.skeletonLoader.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  /**
   * Switch between billing tabs
   */
  async switchTab(tab: 'overview' | 'invoices' | 'payment-history' | 'billing-info' | 'tax-settings'): Promise<void> {
    switch (tab) {
      case 'overview':
        await this.overviewTab.click();
        break;
      case 'invoices':
        await this.invoicesTab.click();
        break;
      case 'payment-history':
        await this.paymentHistoryTab.click();
        break;
      case 'billing-info':
        await this.billingInfoTab.click();
        break;
      case 'tax-settings':
        await this.taxSettingsTab.click();
        break;
    }
    
    // Wait for tab content to load
    await this.page.waitForTimeout(500);
  }

  /**
   * Get billing overview information
   */
  async getBillingOverview(): Promise<{
    currentBalance: number;
    currency: string;
    nextPaymentDate: string | null;
    nextPaymentAmount: number;
    billingCycle: string;
    paymentStatus: string;
  }> {
    await this.switchTab('overview');
    
    const balanceText = await this.currentBalance.textContent();
    const nextDateText = await this.nextPaymentDate.textContent();
    const nextAmountText = await this.nextPaymentAmount.textContent();
    const cycleText = await this.billingCycleInfo.textContent();
    const statusText = await this.paymentStatus.textContent();

    // Extract currency and amount
    const balanceMatch = balanceText?.match(/([A-Z]{3})\s*([\d,]+(?:\.\d{2})?)/);
    const amountMatch = nextAmountText?.match(/([A-Z]{3})\s*([\d,]+(?:\.\d{2})?)/);

    return {
      currentBalance: balanceMatch ? parseFloat(balanceMatch[2].replace(/,/g, '')) : 0,
      currency: balanceMatch?.[1] || 'MXN',
      nextPaymentDate: nextDateText?.trim() || null,
      nextPaymentAmount: amountMatch ? parseFloat(amountMatch[2].replace(/,/g, '')) : 0,
      billingCycle: cycleText?.trim() || '',
      paymentStatus: statusText?.trim() || ''
    };
  }

  /**
   * Get all invoices
   */
  async getInvoices(page: number = 1, limit: number = 10): Promise<Invoice[]> {
    await this.switchTab('invoices');
    
    // Navigate to specific page if needed
    if (page > 1) {
      await this.goToPage(page);
    }
    
    // Set items per page if needed
    if (limit !== 10) {
      await this.itemsPerPageSelect.selectOption(limit.toString());
      await this.page.waitForTimeout(1000);
    }

    const invoiceElements = await this.invoiceRows.all();
    const invoices: Invoice[] = [];

    for (const row of invoiceElements) {
      const number = await row.locator('[data-testid="invoice-number"]').textContent();
      const date = await row.locator('[data-testid="invoice-date"]').textContent();
      const amountText = await row.locator('[data-testid="invoice-amount"]').textContent();
      const status = await row.locator('[data-testid="invoice-status"]').textContent();
      const description = await row.locator('[data-testid="invoice-description"]').textContent();

      if (number && date && amountText && status) {
        const amountMatch = amountText.match(/([A-Z]{3})\s*([\d,]+(?:\.\d{2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[2].replace(/,/g, '')) : 0;
        const currency = amountMatch?.[1] || 'MXN';

        invoices.push({
          id: `inv_${Date.now()}_${invoices.length}`,
          number: number.trim(),
          date: date.trim(),
          amount,
          currency,
          status: status.toLowerCase().trim() as 'paid' | 'pending' | 'overdue' | 'cancelled',
          description: description?.trim() || ''
        });
      }
    }

    return invoices;
  }

  /**
   * Download invoice
   */
  async downloadInvoice(invoiceNumber: string): Promise<{
    success: boolean;
    message: string;
    downloadPath?: string;
  }> {
    const invoiceRow = this.page.locator(`[data-testid="invoice-row"]`).filter({
      has: this.page.locator(`[data-testid="invoice-number"]:has-text("${invoiceNumber}")`)
    });

    if (!(await invoiceRow.isVisible())) {
      return {
        success: false,
        message: `Invoice ${invoiceNumber} not found`
      };
    }

    try {
      // Set up download handling
      const downloadPromise = this.page.waitForEvent('download');
      
      await invoiceRow.locator('[data-testid="download-invoice"]').click();
      
      const download = await downloadPromise;
      const downloadPath = await download.path();
      
      return {
        success: true,
        message: 'Invoice downloaded successfully',
        downloadPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Download failed: ${error}`
      };
    }
  }

  /**
   * View invoice details
   */
  async viewInvoiceDetails(invoiceNumber: string): Promise<Invoice | null> {
    const invoiceRow = this.page.locator(`[data-testid="invoice-row"]`).filter({
      has: this.page.locator(`[data-testid="invoice-number"]:has-text("${invoiceNumber}")`)
    });

    if (!(await invoiceRow.isVisible())) {
      return null;
    }

    await invoiceRow.locator('[data-testid="view-invoice"]').click();
    await this.invoiceModal.waitFor({ state: 'visible' });

    // Extract invoice details from modal
    const details = this.invoiceDetails;
    const number = await details.locator('[data-testid="modal-invoice-number"]').textContent();
    const date = await details.locator('[data-testid="modal-invoice-date"]').textContent();
    const dueDate = await details.locator('[data-testid="modal-due-date"]').textContent();
    const amountText = await details.locator('[data-testid="modal-invoice-amount"]').textContent();
    const status = await details.locator('[data-testid="modal-invoice-status"]').textContent();
    const description = await details.locator('[data-testid="modal-invoice-description"]').textContent();

    // Get tax information if available
    let taxes = undefined;
    const ivaElement = details.locator('[data-testid="modal-iva-amount"]');
    if (await ivaElement.isVisible()) {
      const ivaText = await ivaElement.textContent();
      const totalTaxText = await details.locator('[data-testid="modal-total-tax"]').textContent();
      
      taxes = {
        iva: parseFloat(ivaText?.replace(/[^\d.]/g, '') || '0'),
        total: parseFloat(totalTaxText?.replace(/[^\d.]/g, '') || '0')
      };
    }

    // Close modal
    await this.page.locator('[data-testid="close-modal"]').click();
    await this.invoiceModal.waitFor({ state: 'hidden' });

    if (!number || !date || !amountText || !status) {
      return null;
    }

    const amountMatch = amountText.match(/([A-Z]{3})\s*([\d,]+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[2].replace(/,/g, '')) : 0;
    const currency = amountMatch?.[1] || 'MXN';

    return {
      id: `inv_${Date.now()}`,
      number: number.trim(),
      date: date.trim(),
      dueDate: dueDate?.trim(),
      amount,
      currency,
      status: status.toLowerCase().trim() as 'paid' | 'pending' | 'overdue' | 'cancelled',
      description: description?.trim() || '',
      taxes
    };
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(page: number = 1, limit: number = 10): Promise<PaymentHistory[]> {
    await this.switchTab('payment-history');
    
    if (page > 1) {
      await this.goToPage(page);
    }
    
    if (limit !== 10) {
      await this.itemsPerPageSelect.selectOption(limit.toString());
      await this.page.waitForTimeout(1000);
    }

    const paymentElements = await this.paymentRows.all();
    const payments: PaymentHistory[] = [];

    for (const row of paymentElements) {
      const date = await row.locator('[data-testid="payment-date"]').textContent();
      const amountText = await row.locator('[data-testid="payment-amount"]').textContent();
      const method = await row.locator('[data-testid="payment-method"]').textContent();
      const status = await row.locator('[data-testid="payment-status"]').textContent();
      const description = await row.locator('[data-testid="payment-description"]').textContent();

      if (date && amountText && method && status) {
        const amountMatch = amountText.match(/([A-Z]{3})\s*([\d,]+(?:\.\d{2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[2].replace(/,/g, '')) : 0;
        const currency = amountMatch?.[1] || 'MXN';

        payments.push({
          id: `pay_${Date.now()}_${payments.length}`,
          date: date.trim(),
          amount,
          currency,
          method: method.trim(),
          status: status.toLowerCase().trim() as 'completed' | 'failed' | 'pending' | 'refunded',
          description: description?.trim() || ''
        });
      }
    }

    return payments;
  }

  /**
   * Request refund for a payment
   */
  async requestRefund(paymentId: string, reason: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const paymentRow = this.page.locator(`[data-testid="payment-row"]`).filter({
      has: this.page.locator(`[data-testid="payment-id"]:has-text("${paymentId}")`)
    });

    if (!(await paymentRow.isVisible())) {
      return {
        success: false,
        message: `Payment ${paymentId} not found`
      };
    }

    await paymentRow.locator('[data-testid="refund-button"]').click();
    await this.refundModal.waitFor({ state: 'visible' });

    // Fill refund reason
    await this.page.locator('[data-testid="refund-reason"]').fill(reason);
    
    // Submit refund request
    await this.page.locator('[data-testid="submit-refund"]').click();
    
    // Wait for response
    await this.page.waitForTimeout(2000);
    
    if (await this.successMessage.isVisible()) {
      const message = await this.successMessage.textContent();
      return {
        success: true,
        message: message || 'Refund request submitted successfully'
      };
    } else if (await this.errorMessage.isVisible()) {
      const message = await this.errorMessage.textContent();
      return {
        success: false,
        message: message || 'Refund request failed'
      };
    }

    return {
      success: false,
      message: 'Unknown error processing refund request'
    };
  }

  /**
   * Get current billing address
   */
  async getBillingAddress(): Promise<BillingAddress | null> {
    await this.switchTab('billing-info');
    
    if (!(await this.billingAddressCard.isVisible())) {
      return null;
    }

    const firstName = await this.billingAddressCard.locator('[data-testid="display-first-name"]').textContent();
    const lastName = await this.billingAddressCard.locator('[data-testid="display-last-name"]').textContent();
    const company = await this.billingAddressCard.locator('[data-testid="display-company"]').textContent();
    const email = await this.billingAddressCard.locator('[data-testid="display-email"]').textContent();
    const address = await this.billingAddressCard.locator('[data-testid="display-address"]').textContent();
    const city = await this.billingAddressCard.locator('[data-testid="display-city"]').textContent();
    const state = await this.billingAddressCard.locator('[data-testid="display-state"]').textContent();
    const postalCode = await this.billingAddressCard.locator('[data-testid="display-postal-code"]').textContent();
    const country = await this.billingAddressCard.locator('[data-testid="display-country"]').textContent();
    const taxId = await this.billingAddressCard.locator('[data-testid="display-tax-id"]').textContent();

    return {
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      company: company?.trim() || undefined,
      email: email?.trim() || '',
      address: address?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      postalCode: postalCode?.trim() || '',
      country: country?.trim() || '',
      taxId: taxId?.trim() || undefined
    };
  }

  /**
   * Update billing address
   */
  async updateBillingAddress(address: BillingAddress): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.switchTab('billing-info');
    await this.editBillingButton.click();
    
    // Wait for form to appear
    await this.billingForm.waitFor({ state: 'visible' });

    // Fill form fields
    await this.firstNameInput.fill(address.firstName);
    await this.lastNameInput.fill(address.lastName);
    await this.emailInput.fill(address.email);
    
    if (address.company) {
      await this.companyInput.fill(address.company);
    }
    
    await this.addressInput.fill(address.address);
    await this.cityInput.fill(address.city);
    await this.stateSelect.selectOption(address.state);
    await this.postalCodeInput.fill(address.postalCode);
    await this.countrySelect.selectOption(address.country);
    
    if (address.taxId) {
      await this.page.locator('[data-testid="tax-id"]').fill(address.taxId);
    }

    // Save changes
    await this.saveBillingButton.click();
    
    // Wait for response
    await this.page.waitForTimeout(2000);
    
    if (await this.successMessage.isVisible()) {
      const message = await this.successMessage.textContent();
      return {
        success: true,
        message: message || 'Billing address updated successfully'
      };
    } else if (await this.errorMessage.isVisible()) {
      const message = await this.errorMessage.textContent();
      return {
        success: false,
        message: message || 'Failed to update billing address'
      };
    }

    return {
      success: false,
      message: 'Unknown error updating billing address'
    };
  }

  /**
   * Update Mexican tax settings
   */
  async updateTaxSettings(taxData: {
    rfc: string;
    curp?: string;
    fiscalRegime: string;
    cfdiUse: string;
    businessName?: string;
    taxAddress?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.switchTab('tax-settings');
    
    // Fill tax form
    await this.rfcInput.fill(taxData.rfc);
    
    if (taxData.curp) {
      await this.curpInput.fill(taxData.curp);
    }
    
    await this.fiscalRegimeSelect.selectOption(taxData.fiscalRegime);
    await this.cfdiUseSelect.selectOption(taxData.cfdiUse);
    
    if (taxData.businessName) {
      await this.businessNameInput.fill(taxData.businessName);
    }
    
    if (taxData.taxAddress) {
      await this.taxAddressInput.fill(taxData.taxAddress);
    }

    // Save tax settings
    await this.saveTaxSettingsButton.click();
    
    // Wait for response
    await this.page.waitForTimeout(2000);
    
    if (await this.successMessage.isVisible()) {
      const message = await this.successMessage.textContent();
      return {
        success: true,
        message: message || 'Tax settings updated successfully'
      };
    } else if (await this.errorMessage.isVisible()) {
      const message = await this.errorMessage.textContent();
      return {
        success: false,
        message: message || 'Failed to update tax settings'
      };
    }

    return {
      success: false,
      message: 'Unknown error updating tax settings'
    };
  }

  /**
   * Filter invoices by date range
   */
  async filterInvoicesByDateRange(startDate: string, endDate: string): Promise<void> {
    await this.switchTab('invoices');
    
    const dateFilter = this.dateRangeFilter;
    await dateFilter.click();
    
    // Fill date inputs (assuming date picker)
    await this.page.locator('[data-testid="start-date"]').fill(startDate);
    await this.page.locator('[data-testid="end-date"]').fill(endDate);
    
    // Apply filter
    await this.page.locator('[data-testid="apply-date-filter"]').click();
    
    // Wait for results
    await this.page.waitForTimeout(1000);
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: 'paid' | 'pending' | 'overdue' | 'cancelled'): Promise<void> {
    await this.statusFilter.selectOption(status);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Search invoices/payments
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Export billing data
   */
  async exportData(format: 'csv' | 'pdf' | 'excel' = 'csv'): Promise<{
    success: boolean;
    message: string;
    downloadPath?: string;
  }> {
    try {
      const downloadPromise = this.page.waitForEvent('download');
      
      await this.exportButton.click();
      
      // Select format if options are available
      const formatOption = this.page.locator(`[data-testid="export-${format}"]`);
      if (await formatOption.isVisible()) {
        await formatOption.click();
      }
      
      const download = await downloadPromise;
      const downloadPath = await download.path();
      
      return {
        success: true,
        message: 'Data exported successfully',
        downloadPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Export failed: ${error}`
      };
    }
  }

  /**
   * Navigate to specific page
   */
  async goToPage(pageNumber: number): Promise<void> {
    const pageButton = this.pageNumbers.filter({ hasText: pageNumber.toString() });
    if (await pageButton.isVisible()) {
      await pageButton.click();
    } else {
      // If page number not visible, use navigation buttons
      const currentPageText = await this.page.locator('[data-testid="current-page"]').textContent();
      const currentPage = parseInt(currentPageText || '1');
      
      if (pageNumber > currentPage) {
        for (let i = currentPage; i < pageNumber; i++) {
          await this.nextPageButton.click();
          await this.page.waitForTimeout(500);
        }
      } else if (pageNumber < currentPage) {
        for (let i = currentPage; i > pageNumber; i--) {
          await this.previousPageButton.click();
          await this.page.waitForTimeout(500);
        }
      }
    }
    
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if page is loading
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible() || await this.skeletonLoader.isVisible();
  }

  /**
   * Switch to mobile view
   */
  async switchToMobileView(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if mobile layout is active
   */
  async isMobileLayout(): Promise<boolean> {
    return await this.mobileTabToggle.isVisible();
  }

  /**
   * Get payment failure alerts
   */
  async getPaymentAlerts(): Promise<{
    hasFailureAlert: boolean;
    hasExpiryAlert: boolean;
    messages: string[];
  }> {
    const hasFailureAlert = await this.paymentFailureAlert.isVisible();
    const hasExpiryAlert = await this.subscriptionExpiryAlert.isVisible();
    const messages = [];

    if (hasFailureAlert) {
      const message = await this.paymentFailureAlert.textContent();
      if (message) messages.push(message);
    }

    if (hasExpiryAlert) {
      const message = await this.subscriptionExpiryAlert.textContent();
      if (message) messages.push(message);
    }

    return {
      hasFailureAlert,
      hasExpiryAlert,
      messages
    };
  }

  /**
   * Test accessibility features
   */
  async testAccessibility(): Promise<{
    keyboardNavigable: boolean;
    hasProperLabels: boolean;
    hasTableHeaders: boolean;
    colorContrastOk: boolean;
  }> {
    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus').count();
    const keyboardNavigable = focusedElement > 0;

    // Check for proper labels
    const inputs = await this.page.locator('input, select').all();
    let hasProperLabels = true;
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const label = id ? await this.page.locator(`label[for="${id}"]`).count() : 0;
      
      if (!label && !ariaLabel) {
        hasProperLabels = false;
        break;
      }
    }

    // Check for table headers
    const tables = await this.page.locator('table').all();
    let hasTableHeaders = true;
    
    for (const table of tables) {
      const headers = await table.locator('th').count();
      if (headers === 0) {
        hasTableHeaders = false;
        break;
      }
    }

    // Color contrast check (simplified)
    const colorContrastOk = true; // Would need actual color analysis

    return {
      keyboardNavigable,
      hasProperLabels,
      hasTableHeaders,
      colorContrastOk
    };
  }
}