import React, { useState, useEffect } from 'react';
import {
import { stripePromise, SUBSCRIPTION_PLANS, validateRFC, calculateMexicanTaxes} from '../../lib/stripe/stripe-client';
import { useTranslations} from '../../hooks/useTranslations';
import { Button} from '../ui/Button';
import { toast} from 'react-hot-toast';
import { CreditCardIcon, LockClosedIcon} from '@heroicons/react/24/outline';

  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';

interface CheckoutFormProps {
  planId: keyof typeof SUBSCRIPTION_PLANS;
  customerId?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
  billingCycle?: 'monthly' | 'yearly';
  commissionType?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  rfc: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

const CheckoutFormContent: React.FC<CheckoutFormProps> = ({
  planId,
  customerId,
  onSuccess,
  onError,
  billingCycle = 'monthly',
  commissionType,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslations();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    rfc: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'MX',
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useExistingCard, setUseExistingCard] = useState(false);

  const plan = SUBSCRIPTION_PLANS[planId];
  const taxCalculation = calculateMexicanTaxes(plan.price);

  // Initialize payment intent
  useEffect(() => {
    if (!plan.price) return;

    const initializePayment = async () => {
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: taxCalculation.total,
            currency: plan.currency,
            planId,
            billingCycle,
            commissionType,
            customerId,
          }),
        });

        const data = await response.json();
        
        if (data['clientSecret']) {
          setClientSecret(data['clientSecret']);
        } else {
          throw new Error(data['error'] || 'Failed to initialize payment');
        }
      } catch (error) {
        console.error('Error initializing payment:', error);
        onError?.(error instanceof Error ? error.message : 'Payment initialization failed');
      }
    };

    initializePayment();
  }, [planId, billingCycle, commissionType, customerId, taxCalculation['total']]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerInfo['name'].trim()) {
      newErrors.name = t('validation.nameRequired');
    }

    if (!customerInfo['email'].trim()) {
      newErrors['email'] = t('validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      newErrors['email'] = t('validation.emailInvalid');
    }

    if (customerInfo.rfc && !validateRFC(customerInfo.rfc)) {
      newErrors.rfc = t('validation.rfcInvalid');
    }

    if (!customerInfo.address.line1.trim()) {
      newErrors.address = t('validation.addressRequired');
    }

    if (!customerInfo.address.city.trim()) {
      newErrors.city = t('validation.cityRequired');
    }

    if (!customerInfo.address.state.trim()) {
      newErrors.state = t('validation.stateRequired');
    }

    if (!customerInfo.address.postal_code.trim()) {
      newErrors.postalCode = t('validation.postalCodeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      onError?.(t('paymentstripeNotLoaded'));
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      let result;

      if(useExistingCard) {
        // Use Payment Element for new payment method
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/dashboard/billing/success`,
            payment_method_data: {
              billing_details: {
                name: customerInfo.name,
                email: customerInfo['email'],
                address: {
                  line1: customerInfo.address.line1,
                  line2: customerInfo.address.line2,
                  city: customerInfo.address.city,
                  state: customerInfo.address.state,
                  postal_code: customerInfo.address.postal_code,
                  country: customerInfo.address.country,
                },
              },
            },
          },
          redirect: 'if_required',
        });
      } else {
        // Use Card Element for card payment
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customerInfo.name,
              email: customerInfo['email'],
              address: {
                line1: customerInfo.address.line1,
                line2: customerInfo.address.line2,
                city: customerInfo.address.city,
                state: customerInfo.address.state,
                postal_code: customerInfo.address.postal_code,
                country: customerInfo.address.country,
              },
            },
          },
        });
      }

      if (result.error) {
        throw new Error(result['error'].message);
      }

      if (result?.paymentIntent?.status === 'succeeded') {
        toast.success(t('paymentsuccess'));
        onSuccess?.(result.paymentIntent);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('paymentgenericError');
      toast['error'](errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('');
      setCustomerInfo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof CustomerInfo],
          [child]: value,
        },
      }));
    } else {
      setCustomerInfo(prev => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('paymentplanSummary')}
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{plan['name']} - {billingCycle === 'yearly' ? t('paymentyearly') : t('paymentmonthly')}</span>
            <span>${plan.price.toFixed(2)} {plan.currency.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${taxCalculation['subtotal'].toFixed(2)} {plan.currency.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (16%)</span>
            <span>${taxCalculation['iva'].toFixed(2)} {plan.currency.toUpperCase()}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>{t('paymenttotal')}</span>
            <span>${taxCalculation['total'].toFixed(2)} {plan.currency.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('paymentbillingInformation')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('paymentfullName')} *
            </label>
            <input
              type="text"
              value={customerInfo['name']}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('paymentfullNamePlaceholder')}
            />
            {errors['name'] && <p className="text-red-500 text-xs mt-1">{errors['name']}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('paymentemail')} *
            </label>
            <input
              type="email"
              value={customerInfo['email']}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('paymentemailPlaceholder')}
            />
            {errors['email'] && <p className="text-red-500 text-xs mt-1">{errors['email']}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RFC ({t('paymentoptional')})
            </label>
            <input
              type="text"
              value={customerInfo.rfc}
              onChange={(e) => handleInputChange('rfc', e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.rfc ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="XAXX010101000"
              maxLength={13}
            />
            {errors.rfc && <p className="text-red-500 text-xs mt-1">{errors.rfc}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('paymentaddress')} *
            </label>
            <input
              type="text"
              value={customerInfo.address.line1}
              onChange={(e) => handleInputChange('address.line1', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('paymentaddressPlaceholder')}
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('paymentcity')} *
            </label>
            <input
              type="text"
              value={customerInfo.address.city}
              onChange={(e) => handleInputChange('address.city', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('paymentcityPlaceholder')}
            />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('paymentstate')} *
            </label>
            <input
              type="text"
              value={customerInfo.address.state}
              onChange={(e) => handleInputChange('address.state', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.state ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('paymentstatePlaceholder')}
            />
            {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('paymentpostalCode')} *
            </label>
            <input
              type="text"
              value={customerInfo.address.postal_code}
              onChange={(e) => handleInputChange('address.postal_code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.postalCode ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="12345"
            />
            {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>}
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('paymentpaymentMethod')}
        </h3>
        
        {clientSecret && (
          <div className="space-y-4">
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!useExistingCard}
                  onChange={() => setUseExistingCard(false)}
                  className="mr-2"
                />
                <CreditCardIcon className="w-5 h-5 mr-2" />
                {t('paymentnewCard')}
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={useExistingCard}
                  onChange={() => setUseExistingCard(true)}
                  className="mr-2"
                />
                {t('paymentotherMethods')}
              </label>
            </div>

            {useExistingCard ? (
              <div className="border rounded-md p-4">
                <PaymentElement />
              </div>
            ) : (
              <div className="border rounded-md p-4">
                <CardElement options={cardElementOptions} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <LockClosedIcon className="w-4 h-4" />
        <span>{t('paymentsecurityNotice')}</span>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing || !clientSecret}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            {t('paymentprocessing')}
          </div>
        ) : (
          `${t('paymentpayNow')} $${taxCalculation['total'].toFixed(2)} ${plan.currency.toUpperCase()}`
        )}
      </Button>
    </form>
  );
};

export const CheckoutForm: React.FC<CheckoutFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutFormContent {...props} />
    </Elements>
  );
};

export default CheckoutForm;