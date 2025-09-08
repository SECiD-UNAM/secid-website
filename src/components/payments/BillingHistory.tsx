import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import type { Transaction, Invoice, User, PaymentSettings } from '@/types';
import {
  getUserTransactions,
  getUserInvoices,
  getPaymentSettings,
  updatePaymentSettings,
  downloadInvoice,
  requestRefund
} from '../../lib/payments';

interface BillingHistoryProps {
  currentUser: User;
}

const BillingHistory: React.FC<BillingHistoryProps> = ({ currentUser }) => {
  const { t } = useTranslations();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices' | 'settings'>('transactions');
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | '6months' | '1year'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all');

  useEffect(() => {
    loadBillingData();
  }, [currentUser.id]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [transactionsData, invoicesData, settingsData] = await Promise.all([
        getUserTransactions(currentUser.id),
        getUserInvoices(currentUser.id),
        getPaymentSettings(currentUser.id)
      ]);

      setTransactions(transactionsData);
      setInvoices(invoicesData);
      setPaymentSettings(settingsData);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const downloadUrl = await downloadInvoice(invoiceId);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  const handleRequestRefund = async (transactionId: string) => {
    if (!window.confirm(t('payments.refundConfirm'))) return;

    try {
      await requestRefund(transactionId, currentUser.id);
      await loadBillingData();
    } catch (error) {
      console.error('Error requesting refund:', error);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<PaymentSettings>) => {
    try {
      const updatedSettings = await updatePaymentSettings(currentUser.id, newSettings);
      setPaymentSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating payment settings:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'succeeded':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'uncollectible':
        return 'bg-red-100 text-red-800';
      case 'canceled':
      case 'void':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'subscription':
        return '🔄';
      case 'course':
        return '📚';
      case 'refund':
        return '↩️';
      case 'credit':
        return '💳';
      default:
        return '💰';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const getDateFilterFunction = () => {
    const now = new Date();
    switch(dateFilter) {
      case '30days':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return (date: Date) => date >= thirtyDaysAgo;
      case '6months':
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        return (date: Date) => date >= sixMonthsAgo;
      case '1year':
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return (date: Date) => date >= oneYearAgo;
      default:
        return () => true;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const dateMatches = getDateFilterFunction()(transaction.createdAt);
    const statusMatches = statusFilter === 'all' || transaction['status'] === statusFilter;
    return dateMatches && statusMatches;
  });

  const filteredInvoices = invoices.filter(invoice => {
    const dateMatches = getDateFilterFunction()(invoice['createdAt']);
    return dateMatches;
  });

  if(loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('payments.billingHistory')}
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'transactions', label: t('payments.transactions'), count: transactions.length },
              { key: 'invoices', label: t('payments.invoices'), count: invoices.length },
              { key: 'settings', label: t('payments.billingSettings') }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Filters */}
          {(activeTab === 'transactions' || activeTab === 'invoices') && (
            <div className="mb-6 flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('payments.dateRange')}
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">{t('payments.allTime')}</option>
                  <option value="30days">{t('payments.last30Days')}</option>
                  <option value="6months">{t('payments.last6Months')}</option>
                  <option value="1year">{t('payments.lastYear')}</option>
                </select>
              </div>

              {activeTab === 'transactions' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('paymentsstatus')}
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">{t('payments.allStatuses')}</option>
                    <option value="succeeded">{t('payments.succeeded')}</option>
                    <option value="pending">{t('payments.pending')}</option>
                    <option value="failed">{t('payments.failed')}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              {filteredTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('payments.transaction')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('payments.amount')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('paymentsstatus')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('payments.date')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('payments.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">
                                {getTypeIcon(transaction['type'])}
                              </span>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {transaction['description']}
                                </div>
                                <div className="text-sm text-gray-500 capitalize">
                                  {transaction['type']}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction['status'])}`}>
                              {t(`payments.${transaction['status']}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction['createdAt'])}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {transaction['status'] === 'succeeded' && transaction['type'] !== 'refund' && (
                              <button
                                onClick={() => handleRequestRefund(transaction.id)}
                                className="text-red-600 hover:text-red-900 mr-3"
                              >
                                {t('payments.requestRefund')}
                              </button>
                            )}
                            <button className="text-blue-600 hover:text-blue-900">
                              {t('payments.viewDetails')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('payments.noTransactions')}
                  </h3>
                  <p className="text-gray-600">
                    {t('payments.noTransactionsDescription')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div>
              {filteredInvoices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInvoices.map((invoice) => (
                    <div key={invoice.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {t('payments.invoice')} #{invoice['number']}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(invoice['createdAt'])}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice['status'])}`}>
                          {t(`payments.${invoice['status']}`)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {invoice['items'].map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item['description']}</span>
                            <span className="font-medium">
                              {formatCurrency(item.amount, invoice.currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-2 mb-4">
                        <div className="flex justify-between font-medium">
                          <span>{t('paymentstotal')}</span>
                          <span>{formatCurrency(invoice['total'], invoice['currency'])}</span>
                        </div>
                        {invoice['tax'] > 0 && (
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{t('payments.tax')}</span>
                            <span>{formatCurrency(invoice['tax'], invoice['currency'])}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadInvoice(invoice['id'])}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
                        >
                          {t('payments.download')}
                        </button>
                        <button className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm">
                          {t('payments.viewDetails')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('payments.noInvoices')}
                  </h3>
                  <p className="text-gray-600">
                    {t('payments.noInvoicesDescription')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && paymentSettings && (
            <div className="max-w-2xl">
              <div className="space-y-6">
                {/* Billing Address */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {t('payments.billingAddress')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('payments.addressLine1')}
                      </label>
                      <input
                        type="text"
                        value={paymentSettings.billingAddress.line1}
                        onChange={(e) => handleUpdateSettings({
                          billingAddress: { ...paymentSettings.billingAddress, line1: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('payments.addressLine2')}
                      </label>
                      <input
                        type="text"
                        value={paymentSettings.billingAddress.line2 || ''}
                        onChange={(e) => handleUpdateSettings({
                          billingAddress: { ...paymentSettings.billingAddress, line2: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('payments.city')}
                      </label>
                      <input
                        type="text"
                        value={paymentSettings.billingAddress.city}
                        onChange={(e) => handleUpdateSettings({
                          billingAddress: { ...paymentSettings.billingAddress, city: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('payments.state')}
                      </label>
                      <input
                        type="text"
                        value={paymentSettings.billingAddress.state}
                        onChange={(e) => handleUpdateSettings({
                          billingAddress: { ...paymentSettings.billingAddress, state: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('payments.postalCode')}
                      </label>
                      <input
                        type="text"
                        value={paymentSettings.billingAddress.postalCode}
                        onChange={(e) => handleUpdateSettings({
                          billingAddress: { ...paymentSettings.billingAddress, postalCode: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('payments.country')}
                      </label>
                      <input
                        type="text"
                        value={paymentSettings.billingAddress.country}
                        onChange={(e) => handleUpdateSettings({
                          billingAddress: { ...paymentSettings.billingAddress, country: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-renewal */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {t('payments.subscriptionSettings')}
                  </h3>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={paymentSettings.autoRenew}
                      onChange={(e) => handleUpdateSettings({ autoRenew: e.target.checked })}
                      className="mr-3"
                    />
                    <label className="text-sm text-gray-700">
                      {t('payments.autoRenewSubscriptions')}
                    </label>
                  </div>
                </div>

                {/* Invoice Emails */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {t('payments.invoiceEmails')}
                  </h3>
                  <div className="space-y-2">
                    {paymentSettings.invoiceEmails.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...paymentSettings.invoiceEmails];
                            newEmails[index] = e.target.value;
                            handleUpdateSettings({ invoiceEmails: newEmails });
                          }}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                        />
                        <button
                          onClick={() => {
                            const newEmails = paymentSettings.invoiceEmails.filter((_, i) => i !== index);
                            handleUpdateSettings({ invoiceEmails: newEmails });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newEmails = [...paymentSettings.invoiceEmails, ''];
                        handleUpdateSettings({ invoiceEmails: newEmails });
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {t('payments.addEmail')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingHistory;