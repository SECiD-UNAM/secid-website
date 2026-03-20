import React, { useState, useEffect } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import type {
  SubscriptionTier,
  PaymentMethod,
  User,
  UserSubscription,
} from '@/types';
import {
  getSubscriptionTiers,
  createStripeCheckoutSession,
  createPaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} from '../../lib/payments';

interface PaymentGatewayProps {
  currentUser: User;
  selectedTier?: SubscriptionTier;
  onPaymentSuccess?: (subscription: UserSubscription) => void;
  onPaymentError?: (error: string) => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  currentUser,
  selectedTier,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const { t } = useTranslations();
  const [subscriptionTiers, setSubscriptionTiers] = useState<
    SubscriptionTier[]
  >([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string>(
    selectedTier?.id || ''
  );
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>(
    'month'
  );

  // Stripe Elements
  const [cardElement, setCardElement] = useState<any>(null);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadStripe();
  }, []);

  useEffect(() => {
    if (selectedTier) {
      setSelectedTierId(selectedTier.id);
      setBillingInterval(selectedTier.interval);
    }
  }, [selectedTier]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tiersData, methodsData] = await Promise.all([
        getSubscriptionTiers(),
        getPaymentMethods(currentUser.id),
      ]);

      setSubscriptionTiers(tiersData);
      setPaymentMethods(methodsData);

      // Set default payment method
      const defaultMethod = methodsData.find((method) => method.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      onPaymentError?.(t('payments.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadStripe = async () => {
    try {
      // Load Stripe.js
      const stripeScript = document.createElement('script');
      stripeScript.src = 'https://js.stripe.com/v3/';
      stripeScript.onload = () => {
        const stripeInstance = (window as any).Stripe(
          process.env.STRIPE_PUBLISHABLE_KEY as string
        );
        const elementsInstance = stripeInstance.elements();

        setStripe(stripeInstance);
        setElements(elementsInstance);

        // Create card element
        const cardElementInstance = elementsInstance.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
          },
        });

        setCardElement(cardElementInstance);

        // Mount card element
        setTimeout(() => {
          const cardContainer = document['getElementById']('card-element');
          if (cardContainer && cardElementInstance) {
            cardElementInstance.mount('#card-element');
          }
        }, 100);
      };
      document['head'].appendChild(stripeScript);
    } catch (error) {
      console.error('Error loading Stripe:', error);
    }
  };

  const handleTierSelection = (tierId: string, interval: 'month' | 'year') => {
    setSelectedTierId(tierId);
    setBillingInterval(interval);
  };

  const handlePaymentMethodAdd = async () => {
    if (!stripe || !cardElement) {
      onPaymentError?.(t('payments.stripeNotLoaded'));
      return;
    }

    try {
      setProcessing(true);

      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: currentUser['email'],
          name: currentUser['name'],
        },
      });

      if (error) {
        onPaymentError?.(error.message);
        return;
      }

      // Save payment method to Firebase
      const savedPaymentMethod = await createPaymentMethod(
        currentUser.id,
        paymentMethod
      );
      setPaymentMethods((prev) => [...prev, savedPaymentMethod]);
      setSelectedPaymentMethodId(savedPaymentMethod.id);
      setShowAddPaymentMethod(false);

      // Clear card element
      cardElement.clear();
    } catch (error) {
      console.error('Error adding payment method:', error);
      onPaymentError?.(t('payments.addPaymentMethodError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscription = async () => {
    if (!selectedTierId) {
      onPaymentError?.(t('payments.selectTier'));
      return;
    }

    if (!selectedPaymentMethodId && !showAddPaymentMethod) {
      onPaymentError?.(t('payments.selectPaymentMethod'));
      return;
    }

    try {
      setProcessing(true);

      const selectedTier = subscriptionTiers.find(
        (tier) =>
          tier.id === selectedTierId && tier.interval === billingInterval
      );

      if (!selectedTier) {
        throw new Error('Selected tier not found');
      }

      // Create Stripe checkout session
      const { sessionId, subscriptionId } = await createStripeCheckoutSession({
        userId: currentUser.id,
        tierId: selectedTier.id,
        paymentMethodId: selectedPaymentMethodId,
        successUrl: `${window.location.origin}/payments/success`,
        cancelUrl: `${window.location.origin}/payments/cancel`,
      });

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        onPaymentError?.(error.message);
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      onPaymentError?.(t('payments.subscriptionError'));
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentMethodDelete = async (paymentMethodId: string) => {
    if (!window.confirm(t('payments.deletePaymentMethodConfirm'))) return;

    try {
      await deletePaymentMethod(paymentMethodId);
      setPaymentMethods((prev) =>
        prev.filter((method) => method.id !== paymentMethodId)
      );

      if (selectedPaymentMethodId === paymentMethodId) {
        setSelectedPaymentMethodId('');
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      onPaymentError?.(t('payments.deletePaymentMethodError'));
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      await setDefaultPaymentMethod(currentUser.id, paymentMethodId);
      setPaymentMethods((prev) =>
        prev.map((method) => ({
          ...method,
          isDefault: method.id === paymentMethodId,
        }))
      );
    } catch (error) {
      console.error('Error setting default payment method:', error);
      onPaymentError?.(t('payments.setDefaultError'));
    }
  };

  const getCardBrandIcon = (brand: string) => {
    const brandIcons: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      unknown: '💳',
    };
    return brandIcons[brand] || brandIcons.unknown;
  };

  const getPriceDisplay = (
    tier: SubscriptionTier,
    interval: 'month' | 'year'
  ) => {
    const tierForInterval = subscriptionTiers.find(
      (t) => t.name === tier['name'] && t.interval === interval
    );

    if (!tierForInterval) return null;

    const price = tierForInterval.price;
    const currency = tierForInterval.currency.toUpperCase();

    if (interval === 'year') {
      const monthlyEquivalent = price / 12;
      return {
        price: `${currency} ${price}`,
        period: t('payments.yearly'),
        savings: `${currency} ${(tier.price * 12 - price).toFixed(2)} ${t('payments.saved')}`,
      };
    }

    return {
      price: `${currency} ${price}`,
      period: t('payments.monthly'),
      savings: null,
    };
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          {t('payments.chooseSubscription')}
        </h2>

        {/* Billing Toggle */}
        <div className="mb-8 flex justify-center">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                billingInterval === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('payments.monthly')}
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                billingInterval === 'year'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('payments.yearly')}
              <span className="ml-1 text-xs font-bold text-green-600">
                {t('payments.save20')}
              </span>
            </button>
          </div>
        </div>

        {/* Subscription Tiers */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {subscriptionTiers
            .filter(
              (tier) => tier.interval === billingInterval && tier.isActive
            )
            .map((tier) => {
              const priceDisplay = getPriceDisplay(tier, billingInterval);
              const isSelected = selectedTierId === tier.id;

              return (
                <div
                  key={tier.id}
                  className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${tier.isPopular ? 'ring-2 ring-blue-200' : ''}`}
                  onClick={() => handleTierSelection(tier.id, billingInterval)}
                >
                  {tier.isPopular && (
                    <div className="mb-4 inline-block rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                      {t('payments.mostPopular')}
                    </div>
                  )}

                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    {tier['name']}
                  </h3>

                  <p className="mb-4 text-gray-600">{tier['description']}</p>

                  {priceDisplay && (
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-gray-900">
                        {priceDisplay.price}
                      </div>
                      <div className="text-sm text-gray-500">
                        {priceDisplay.period}
                      </div>
                      {priceDisplay.savings && (
                        <div className="text-sm font-medium text-green-600">
                          {priceDisplay.savings}
                        </div>
                      )}
                    </div>
                  )}

                  <ul className="mb-6 space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="text-sm text-gray-500">
                    <div className="mb-1 flex justify-between">
                      <span>{t('payments.courses')}</span>
                      <span>
                        {tier.limits.courses === 'unlimited'
                          ? t('payments.unlimited')
                          : tier.limits.courses}
                      </span>
                    </div>
                    <div className="mb-1 flex justify-between">
                      <span>{t('payments.downloads')}</span>
                      <span>
                        {tier.limits.downloads === 'unlimited'
                          ? t('payments.unlimited')
                          : tier.limits.downloads}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('payments.support')}</span>
                      <span className="capitalize">{tier.limits.support}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Payment Methods */}
        {selectedTierId && (
          <div className="border-t pt-6">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              {t('payments.paymentMethod')}
            </h3>

            {/* Existing Payment Methods */}
            {paymentMethods.length > 0 && (
              <div className="mb-4 space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      selectedPaymentMethodId === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPaymentMethodId(method.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          checked={selectedPaymentMethodId === method.id}
                          onChange={() => setSelectedPaymentMethodId(method.id)}
                          className="mr-3"
                        />
                        <span className="mr-3 text-2xl">
                          {getCardBrandIcon(method.brand || 'unknown')}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {method?.brand?.toUpperCase()} •••• {method.last4}
                          </div>
                          {method.expiryMonth && method.expiryYear && (
                            <div className="text-sm text-gray-500">
                              {t('payments.expires')}{' '}
                              {method.expiryMonth.toString().padStart(2, '0')}/
                              {method.expiryYear}
                            </div>
                          )}
                          {method.isDefault && (
                            <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                              {t('payments.default')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!method.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefaultPaymentMethod(method.id);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {t('payments.setDefault')}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentMethodDelete(method.id);
                          }}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          {t('payments.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Payment Method */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowAddPaymentMethod(!showAddPaymentMethod)}
                className="flex items-center font-medium text-blue-600 hover:text-blue-800"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t('payments.addPaymentMethod')}
              </button>

              {showAddPaymentMethod && (
                <div className="mt-4 rounded-lg border border-gray-200 p-4">
                  <h4 className="mb-3 font-medium text-gray-900">
                    {t('payments.addNewCard')}
                  </h4>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {t('payments.cardDetails')}
                    </label>
                    <div
                      id="card-element"
                      className="rounded-md border border-gray-300 p-3"
                    >
                      {/* Stripe card element will be mounted here */}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handlePaymentMethodAdd}
                      disabled={processing || !cardElement}
                      className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processing ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          {t('payments.adding')}
                        </div>
                      ) : (
                        t('payments.addCard')
                      )}
                    </button>
                    <button
                      onClick={() => setShowAddPaymentMethod(false)}
                      className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subscribe Button */}
        {selectedTierId &&
          (selectedPaymentMethodId || showAddPaymentMethod) && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">
                    {t('payments.subscriptionSummary')}
                  </div>
                  <div className="font-medium text-gray-900">
                    {
                      subscriptionTiers.find((t) => t.id === selectedTierId)
                        ?.name
                    }{' '}
                    -{' '}
                    {
                      getPriceDisplay(
                        subscriptionTiers.find((t) => t.id === selectedTierId)!,
                        billingInterval
                      )?.price
                    }{' '}
                    {
                      getPriceDisplay(
                        subscriptionTiers.find((t) => t.id === selectedTierId)!,
                        billingInterval
                      )?.period
                    }
                  </div>
                </div>

                <button
                  onClick={handleSubscription}
                  disabled={processing}
                  className="rounded-md bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <div className="flex items-center">
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                      {t('payments.processing')}
                    </div>
                  ) : (
                    t('payments.subscribe')
                  )}
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                {t('payments.subscriptionTerms')}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default PaymentGateway;
