import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import type {
  UserSubscription,
  SubscriptionTier,
  PaymentMethod,
  User
} from '@/types';
import {
  getUserSubscription,
  getSubscriptionTiers,
  getPaymentMethods,
  cancelSubscription,
  resumeSubscription,
  updateSubscription,
  getUpcomingInvoice
} from '../../lib/payments';

interface SubscriptionManagerProps {
  currentUser: User;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ currentUser }) => {
  const { t } = useTranslations();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [availableTiers, setAvailableTiers] = useState<SubscriptionTier[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [upcomingInvoice, setUpcomingInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, [currentUser.id]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subData, tiersData, methodsData] = await Promise.all([
        getUserSubscription(currentUser.id),
        getSubscriptionTiers(),
        getPaymentMethods(currentUser.id)
      ]);

      setSubscription(subData);
      setAvailableTiers(tiersData);
      setPaymentMethods(methodsData);

      if(subData) {
        const invoiceData = await getUpcomingInvoice(subData.stripeSubscriptionId);
        setUpcomingInvoice(invoiceData);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !window.confirm(t('payments.cancelConfirm'))) return;

    try {
      setActionLoading(true);
      await cancelSubscription(subscription['id']);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;

    try {
      setActionLoading(true);
      await resumeSubscription(subscription['id']);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error resuming subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgradeSubscription = async (newTierId: string) => {
    if (!subscription) return;

    try {
      setActionLoading(true);
      await updateSubscription(subscription['id'], newTierId);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error updating subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCurrentTier = () => {
    return availableTiers.find(tier => tier.id === subscription?.tierId);
  };

  if(loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('payments.noActiveSubscription')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('payments.noActiveSubscriptionDescription')}
          </p>
          <button
            onClick={() => window.location.href = '/payments/subscribe'}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            {t('payments.chooseSubscription')}
          </button>
        </div>
      </div>
    );
  }

  const currentTier = getCurrentTier();

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {t('payments.currentSubscription')}
        </h2>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center mb-2">
              <h3 className="text-lg font-medium text-gray-900 mr-3">
                {currentTier?.name || t('payments.unknownPlan')}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription['status'])}`}>
                {t(`payments['status'].${subscription['status']}`)}
              </span>
            </div>
            
            <p className="text-gray-600 mb-4">
              {currentTier?.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('payments.nextBilling')}</span>
                <div className="font-medium text-gray-900">
                  {formatDate(subscription['currentPeriodEnd'])}
                </div>
              </div>
              <div>
                <span className="text-gray-500">{t('paymentsbillingCycle')}</span>
                <div className="font-medium text-gray-900 capitalize">
                  {currentTier?.interval}
                </div>
              </div>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">
                      {t('payments.subscriptionCanceling')}
                    </h4>
                    <p className="text-sm text-yellow-700">
                      {t('payments.subscriptionCancelingDescription', { 
                        date: formatDate(subscription['currentPeriodEnd']) 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ${currentTier?.price || 0}
            </div>
            <div className="text-sm text-gray-500">
              per {currentTier?.interval}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {subscription['status'] === 'active' && !subscription['cancelAtPeriodEnd'] && (
            <button
              onClick={handleCancelSubscription}
              disabled={actionLoading}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? t('payments.processing') : t('payments.cancelSubscription')}
            </button>
          )}

          {subscription['cancelAtPeriodEnd'] && (
            <button
              onClick={handleResumeSubscription}
              disabled={actionLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? t('payments.processing') : t('payments.resumeSubscription')}
            </button>
          )}

          <button
            onClick={() => window.location.href = '/payments/billing'}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            {t('payments.manageBilling')}
          </button>
        </div>
      </div>

      {/* Upcoming Invoice */}
      {upcomingInvoice && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('payments.upcomingBilling')}
          </h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {t('payments.nextPayment')}
              </div>
              <div className="font-medium text-gray-900">
                {formatDate(new Date(upcomingInvoice.period_end * 1000))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${(upcomingInvoice.amount_due / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                {upcomingInvoice.currency.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Options */}
      {subscription['status'] === 'active' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('payments.upgradeOptions')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTiers
              .filter(tier => tier.id !== subscription.tierId && tier.price > (currentTier?.price || 0))
              .map((tier) => (
                <div key={tier.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{tier['name']}</h4>
                  <p className="text-sm text-gray-600 mb-3">{tier['description']}</p>
                  
                  <div className="mb-3">
                    <span className="text-xl font-bold text-gray-900">
                      ${tier.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      /{tier.interval}
                    </span>
                  </div>

                  <ul className="text-sm text-gray-600 mb-4 space-y-1">
                    {tier.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgradeSubscription(tier.id)}
                    disabled={actionLoading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? t('payments.processing') : t('payments.upgrade')}
                  </button>
                </div>
              ))}
          </div>

          {availableTiers.filter(tier => tier.id !== subscription['tierId'] && tier.price > (currentTier?.price || 0)).length === 0 && (
            <p className="text-gray-500 text-center py-8">
              {t('payments.noUpgradeOptions')}
            </p>
          )}
        </div>
      )}

      {/* Payment Method */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t('payments.paymentMethod')}
          </h3>
          <button
            onClick={() => window.location.href = '/payments/methods'}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('payments.manage')}
          </button>
        </div>

        {paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.filter(method => method.isDefault).map((method) => (
              <div key={method.id} className="flex items-center">
                <span className="text-2xl mr-3">💳</span>
                <div>
                  <div className="font-medium text-gray-900">
                    {method?.brand?.toUpperCase()} •••• {method.last4}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('payments.expires')} {method?.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-3">{t('payments.noPaymentMethods')}</p>
            <button
              onClick={() => window.location.href = '/payments/methods'}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {t('payments.addPaymentMethod')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManager;