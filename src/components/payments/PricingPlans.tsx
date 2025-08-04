import React, { useState, useEffect } from 'react';
import {
  SUBSCRIPTION_PLANS,
  COMMISSION_TYPES,
  calculateMexicanTaxes,
} from '../../lib/stripe/stripe-client';
import { useTranslations } from '../../hooks/useTranslations';
import { Button } from '../ui/Button';
import { CheckIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import CheckoutForm from './CheckoutForm';

interface PricingPlansProps {
  currentPlan?: string;
  onPlanSelect?: (planId: string) => void;
  showCommissionOptions?: boolean;
  userId?: string;
  customerId?: string;
}

interface Commission {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

const commissions: Commission[] = [
  {
    id: COMMISSION_TYPES.ANALYTICS,
    name: 'Analytics',
    description: 'Data visualization and statistical analysis tools',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 13h2v8H3v-8zM7 9h2v12H7V9zm4-6h2v18h-2V3zm4 8h2v10h-2V11zm4-4h2v14h-2V7z" />
      </svg>
    ),
    color: 'text-blue-600',
    features: [
      'Interactive dashboards',
      'Statistical analysis tools',
      'Custom chart builder',
      'Data exploration interface',
    ],
  },
  {
    id: COMMISSION_TYPES.NLP,
    name: 'Natural Language Processing',
    description: 'Text processing and language analysis tools',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 6h-2l-9-4-9 4v11c0 5.55 3.84 9.83 9 11 5.16-1.17 9-5.45 9-11V6z" />
      </svg>
    ),
    color: 'text-green-600',
    features: [
      'Text sentiment analysis',
      'Language detection',
      'Named entity recognition',
      'Text summarization tools',
    ],
  },
  {
    id: COMMISSION_TYPES.ML,
    name: 'Machine Learning',
    description: 'Model training and performance tracking',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    color: 'text-purple-600',
    features: [
      'Experiment tracking',
      'Model performance metrics',
      'Hyperparameter optimization',
      'Feature importance analysis',
    ],
  },
  {
    id: COMMISSION_TYPES.DATA_ENG,
    name: 'Data Engineering',
    description: 'Pipeline monitoring and data quality tools',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    color: 'text-orange-600',
    features: [
      'Pipeline monitoring',
      'Data quality metrics',
      'ETL job tracking',
      'Schema evolution tools',
    ],
  },
  {
    id: COMMISSION_TYPES.DEEP_LEARNING,
    name: 'Deep Learning',
    description: 'GPU usage tracking and training metrics',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 9.83 9 11 5.16-1.17 9-5.45 9-11V5l-9-4z" />
      </svg>
    ),
    color: 'text-red-600',
    features: [
      'GPU utilization tracking',
      'Training progress monitoring',
      'Neural architecture search',
      'Distributed training metrics',
    ],
  },
  {
    id: COMMISSION_TYPES.BIOINFORMATICS,
    name: 'Bioinformatics',
    description: 'Sequence analysis and research tools',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9c.83 0 1.5-.67 1.5-1.5S7.83 8 7 8s-1.5.67-1.5 1.5S6.17 11 7 11zm3 3c.83 0 1.5-.67 1.5-1.5S10.83 11 10 11s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm7-3c.83 0 1.5-.67 1.5-1.5S17.83 8 17 8s-1.5.67-1.5 1.5.67 1.5 1.5 1.5z" />
      </svg>
    ),
    color: 'text-teal-600',
    features: [
      'Sequence alignment tools',
      'Phylogenetic analysis',
      'Protein structure prediction',
      'Genomics data visualization',
    ],
  },
  {
    id: COMMISSION_TYPES.DATA_VIZ,
    name: 'Data Visualization',
    description: 'Chart templates and visualization gallery',
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
      </svg>
    ),
    color: 'text-indigo-600',
    features: [
      'Interactive chart gallery',
      'Custom visualization templates',
      'D3.js integration tools',
      'Export and sharing options',
    ],
  },
];

export const PricingPlans: React.FC<PricingPlansProps> = ({
  currentPlan,
  onPlanSelect,
  showCommissionOptions = false,
  userId,
  customerId,
}) => {
  const { t } = useTranslations();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly'
  );
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedCommission, setSelectedCommission] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);

  const handlePlanSelect = (planId: string) => {
    if (planId === 'free') {
      onPlanSelect?.(planId);
      return;
    }

    setSelectedPlan(planId);
    if (planId === 'premium' || planId === 'enterprise') {
      setShowCheckout(true);
    } else {
      setShowCheckout(true);
    }
  };

  const getDiscountedPrice = (price: number, cycle: 'monthly' | 'yearly') => {
    if (cycle === 'yearly') {
      return price * 12 * 0.83; // 17% discount for yearly billing
    }
    return price;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <CheckIcon className="h-6 w-6" />;
      case 'basic':
        return <StarIcon className="h-6 w-6" />;
      case 'premium':
        return <SparklesIcon className="h-6 w-6" />;
      case 'enterprise':
        return <BuildingOfficeIcon className="h-6 w-6" />;
      default:
        return <CheckIcon className="h-6 w-6" />;
    }
  };

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case 'basic':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {t('pricing.popular')}
          </span>
        );
      case 'premium':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
            {t('pricing.recommended')}
          </span>
        );
      case 'enterprise':
        return (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
            {t('pricing.advanced')}
          </span>
        );
      default:
        return null;
    }
  };

  if (showCheckout && selectedPlan) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Button
            onClick={() => setShowCheckout(false)}
            variant="outline"
            className="mb-4"
          >
            ← {t('common.back')}
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('pricing.checkout')} -{' '}
            {
              SUBSCRIPTION_PLANS[
                selectedPlan as keyof typeof SUBSCRIPTION_PLANS
              ].name
            }
          </h2>
        </div>
        <CheckoutForm
          planId={selectedPlan as keyof typeof SUBSCRIPTION_PLANS}
          billingCycle={billingCycle}
          commissionType={selectedCommission}
          customerId={customerId}
          onSuccess={() => {
            setShowCheckout(false);
            onPlanSelect?.(selectedPlan);
          }}
          onError={(error) => {
            console.error('Checkout error:', error);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold text-gray-900">
          {t('pricing.title')}
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="mb-8 flex justify-center">
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('pricing.monthly')}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('pricing.yearly')}
            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              {t('pricing.save17')}
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Plans Grid */}
      <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-4">
        {Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => {
          const price = getDiscountedPrice(plan.price, billingCycle);
          const taxCalc = calculateMexicanTaxes(price);
          const isCurrentPlan = currentPlan === planId;
          const isPremiumPlan = planId === 'premium';

          return (
            <div
              key={planId}
              className={`relative rounded-2xl border-2 bg-white shadow-lg transition-all duration-200 hover:shadow-xl ${
                isPremiumPlan
                  ? 'scale-105 transform border-purple-500'
                  : isCurrentPlan
                    ? 'border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {isPremiumPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                  <span className="rounded-full bg-purple-500 px-4 py-1 text-sm font-medium text-white">
                    {t('pricing.mostPopular')}
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="mb-6 text-center">
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${
                      isPremiumPlan
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {getPlanIcon(planId)}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    {plan['name']}
                  </h3>
                  {getPlanBadge(planId)}
                </div>

                {/* Pricing */}
                <div className="mb-6 text-center">
                  {plan.price === 0 ? (
                    <div className="text-3xl font-bold text-gray-900">
                      {t('pricing.free')}
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-gray-900">
                        ${price.toFixed(0)}
                        <span className="text-lg font-normal text-gray-500">
                          /
                          {billingCycle === 'yearly'
                            ? t('pricing.year')
                            : t('pricing.month')}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <div className="mt-1 text-sm text-gray-500">
                          ${(price / 12).toFixed(0)} {t('pricing.perMonth')}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-400">
                        + ${taxCalc['iva'].toFixed(0)} IVA
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handlePlanSelect(planId)}
                  disabled={isCurrentPlan}
                  className={`w-full ${
                    isPremiumPlan
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : isCurrentPlan
                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isCurrentPlan
                    ? t('pricing.currentPlan')
                    : plan.price === 0
                      ? t('pricing.getStarted')
                      : t('pricing.upgrade')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Commission Selection */}
      {showCommissionOptions && (
        <div className="mb-16">
          <div className="mb-8 text-center">
            <h3 className="mb-4 text-2xl font-bold text-gray-900">
              {t('pricing.chooseCommission')}
            </h3>
            <p className="text-gray-600">
              {t('pricing.commissionDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {commissions.map((commission) => (
              <div
                key={commission.id}
                className={`relative cursor-pointer rounded-lg border-2 bg-white p-6 transition-all duration-200 hover:shadow-md ${
                  selectedCommission === commission.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedCommission(commission.id)}
              >
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${commission.color} bg-opacity-10`}
                >
                  <div className={commission.color}>{commission.icon}</div>
                </div>
                <h4 className="mb-2 text-lg font-semibold text-gray-900">
                  {commission['name']}
                </h4>
                <p className="mb-4 text-sm text-gray-600">
                  {commission['description']}
                </p>
                <ul className="space-y-1">
                  {commission.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center text-xs text-gray-500"
                    >
                      <div className="mr-2 h-1 w-1 rounded-full bg-gray-400"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                {selectedCommission === commission.id && (
                  <div className="absolute right-2 top-2">
                    <CheckIcon className="h-6 w-6 text-blue-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="border-t border-gray-200 pt-16">
        <div className="mb-12 text-center">
          <h3 className="mb-4 text-2xl font-bold text-gray-900">
            {t('pricing.faq')}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-lg font-semibold text-gray-900">
              {t('pricing.faq1Question')}
            </h4>
            <p className="text-gray-600">{t('pricing.faq1Answer')}</p>
          </div>
          <div>
            <h4 className="mb-2 text-lg font-semibold text-gray-900">
              {t('pricing.faq2Question')}
            </h4>
            <p className="text-gray-600">{t('pricing.faq2Answer')}</p>
          </div>
          <div>
            <h4 className="mb-2 text-lg font-semibold text-gray-900">
              {t('pricing.faq3Question')}
            </h4>
            <p className="text-gray-600">{t('pricing.faq3Answer')}</p>
          </div>
          <div>
            <h4 className="mb-2 text-lg font-semibold text-gray-900">
              {t('pricing.faq4Question')}
            </h4>
            <p className="text-gray-600">{t('pricing.faq4Answer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
