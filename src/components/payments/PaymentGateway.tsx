import React, { useState, useEffect } from 'react';
import { useTranslations} from '../../hooks/useTranslations';
import type { import type { 
  SubscriptionTier, 
  PaymentMethod, 
  User,
  UserSubscription 
 } from '@/types/114114;
  getSubscriptionTiers,
  createStripeCheckoutSession,
  createPaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod
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
  onPaymentError
}) => {
  const { t } = useTranslations();
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string>(selectedTier?.id || '');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  // Stripe Elements
  const [cardElement, setCardElement] = useState<any>(null);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadStripe();
  }, []);

  useEffect(() => {
    if(selectedTier) {
      setSelectedTierId(selectedTier.id);
      setBillingInterval(selectedTier.interval);
    }
  }, [selectedTier]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tiersData, methodsData] = await Promise.all([
        getSubscriptionTiers(),
        getPaymentMethods(currentUser.id)
      ]);

      setSubscriptionTiers(tiersData);
      setPaymentMethods(methodsData);

      // Set default payment method
      const defaultMethod = methodsData.find(method => method.isDefault);
      if(defaultMethod) {
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
        const stripeInstance = (window as any).Stripe(process.env.STRIPE_PUBLISHABLE_KEY as string);
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

      if(error) {
        onPaymentError?.(error.message);
        return;
      }

      // Save payment method to Firebase
      const savedPaymentMethod = await createPaymentMethod(currentUser.id, paymentMethod);
      setPaymentMethods(prev => [...prev, savedPaymentMethod]);
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

      const selectedTier = subscriptionTiers.find(tier => 
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
        cancelUrl: `${window.location.origin}/payments/cancel`
      });

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if(error) {
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
      setPaymentMethods(prev => prev.filter(method => method.id !== paymentMethodId));
      
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
      setPaymentMethods(prev => prev.map(method => ({
        ...method,
        isDefault: method.id === paymentMethodId
      })));
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
      unknown: '💳'
    };
    return brandIcons[brand] || brandIcons.unknown;
  };

  const getPriceDisplay = (tier: SubscriptionTier, interval: 'month' | 'year') => {
    const tierForInterval = subscriptionTiers.find(t => 
      t.name === tier['name'] && t.interval === interval
    );
    
    if (!tierForInterval) return null;

    const price = tierForInterval.price;
    const currency = tierForInterval.currency.toUpperCase();
    
    if (interval === 'year') {
      const monthlyEquivalent = price / 12;
      return {
        price: `${currency} ${price}`,
        period: t('payments.yearly'),
        savings: `${currency} ${(tier.price * 12 - price).toFixed(2)} ${t('payments.saved')}`
      };
    }
    
    return {
      price: `${currency} ${price}`,
      period: t('payments.monthly'),
      savings: null
    };
  };

  if(loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t('payments.chooseSubscription')}
        </h2>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('payments.monthly')}
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'year'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('payments.yearly')}
              <span className="ml-1 text-xs text-green-600 font-bold">
                {t('payments.save20')}
              </span>
            </button>
          </div>
        </div>

        {/* Subscription Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {subscriptionTiers
            .filter(tier => tier.interval === billingInterval && tier.isActive)
            .map((tier) => {
              const priceDisplay = getPriceDisplay(tier, billingInterval);
              const isSelected = selectedTierId === tier.id;
              
              return (
                <div
                  key={tier.id}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${tier.isPopular ? 'ring-2 ring-blue-200' : ''}`}
                  onClick={() => handleTierSelection(tier.id, billingInterval)}
                >
                  {tier.isPopular && (
                    <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">
                      {t('payments.mostPopular')}
                    </div>
                  )}
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {tier['name']}
                  </h3>
                  
                  <p className="text-gray-600 mb-4">
                    {tier['description']}
                  </p>
                  
                  {priceDisplay && (
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-gray-900">
                        {priceDisplay.price}
                      </div>
                      <div className="text-sm text-gray-500">
                        {priceDisplay.period}
                      </div>
                      {priceDisplay.savings && (
                        <div className="text-sm text-green-600 font-medium">
                          {priceDisplay.savings}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="text-sm text-gray-500">
                    <div className="flex justify-between mb-1">
                      <span>{t('payments.courses')}</span>
                      <span>{tier.limits.courses === 'unlimited' ? t('payments.unlimited') : tier.limits.courses}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>{t('payments.downloads')}</span>
                      <span>{tier.limits.downloads === 'unlimited' ? t('payments.unlimited') : tier.limits.downloads}</span>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('payments.paymentMethod')}
            </h3>

            {/* Existing Payment Methods */}
            {paymentMethods.length > 0 && (
              <div className="space-y-3 mb-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
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
                        <span className="text-2xl mr-3">
                          {getCardBrandIcon(method.brand || 'unknown')}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {method?.brand?.toUpperCase()} •••• {method.last4}
                          </div>
                          {method.expiryMonth && method.expiryYear && (
                            <div className="text-sm text-gray-500">
                              {t('payments.expires')} {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                            </div>
                          )}
                          {method.isDefault && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">
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
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('payments.addPaymentMethod')}
              </button>

              {showAddPaymentMethod && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {t('payments.addNewCard')}
                  </h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('payments.cardDetails')}
                    </label>
                    <div id="card-element" className="p-3 border border-gray-300 rounded-md">
                      {/* Stripe card element will be mounted here */}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handlePaymentMethodAdd}
                      disabled={processing || !cardElement}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('payments.adding')}
                        </div>
                      ) : (
                        t('payments.addCard')
                      )}
                    </button>
                    <button
                      onClick={() => setShowAddPaymentMethod(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
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
        {selectedTierId && (selectedPaymentMethodId || showAddPaymentMethod) && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">
                  {t('payments.subscriptionSummary')}
                </div>
                <div className="font-medium text-gray-900">
                  {subscriptionTiers.find(t => t.id === selectedTierId)?.name} - {
                    getPriceDisplay(
                      subscriptionTiers.find(t => t.id === selectedTierId)!,
                      billingInterval
                    )?.price
                  } {getPriceDisplay(
                    subscriptionTiers.find(t => t.id === selectedTierId)!,
                    billingInterval
                  )?.period}
                </div>
              </div>
              
              <button
                onClick={handleSubscription}
                disabled={processing}
                className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {processing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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