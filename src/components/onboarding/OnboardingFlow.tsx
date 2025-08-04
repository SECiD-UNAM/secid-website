import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import {
  saveOnboardingProgress,
  trackOnboardingEvent,
} from '../../lib/onboarding';
import { useTranslations } from '../../hooks/useTranslations';
import WelcomeStep from './WelcomeStep';
import ProfileSetup from './ProfileSetup';
import InterestsSelection from './InterestsSelection';
import GoalsDefinition from './GoalsDefinition';
import ConnectionSuggestions from './ConnectionSuggestions';
import OnboardingComplete from './OnboardingComplete';

import type {
  OnboardingStep,
  OnboardingState,
  OnboardingData,
  OnboardingProgress,
  OnboardingFlowProps,
  OnboardingAnalytics,
  OnboardingEvent,
  OnboardingABVariant,
} from '../../types/onboarding';
import type { OnboardingAchievement } from '../../types/onboarding';

// Import step components

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'profile-setup',
  'interests-selection',
  'goals-definition',
  'connection-suggestions',
  'complete',
];

const SKIPPABLE_STEPS: OnboardingStep[] = [
  'interests-selection',
  'goals-definition',
  'connection-suggestions',
];

// Email verification steps (optional sub-flow)
const EMAIL_VERIFICATION_REQUIRED_AFTER = 'profile-setup';

interface OnboardingFlowState extends OnboardingState {
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;
  achievements: OnboardingAchievement[];
  showAchievementModal: boolean;
  currentAchievement: OnboardingAchievement | null;
  showTooltip: boolean;
  tooltipTarget: string | null;
  emailVerificationSent: boolean;
  emailVerified: boolean;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialStep = 'welcome',
  onComplete,
  onStepChange,
  onAbandonment,
  className = '',
  abTestVariant,
}) => {
  const t = useTranslations();

  // Initialize state
  const [state, setState] = useState<OnboardingFlowState>({
    progress: {
      currentStep: initialStep,
      completedSteps: [],
      totalSteps: STEP_ORDER.length,
      completionPercentage: 0,
      startedAt: new Date(),
      lastUpdated: new Date(),
      estimatedTimeRemaining: 15, // Default 15 minutes
      canSkipStep: SKIPPABLE_STEPS.includes(initialStep),
      isOptionalStep: SKIPPABLE_STEPS.includes(initialStep),
    },
    data: {
      welcome: { agreedToTerms: false },
      profileSetup: { basicInfo: {}, contact: {}, professional: {} },
      interestsSelection: {
        primarySkills: [],
        secondarySkills: [],
        learningGoals: [],
        industries: [],
        technologies: [],
        certifications: [],
        languagesSpoken: [],
        hobbies: [],
      },
      goalsDefinition: {
        careerGoals: {
          shortTerm: [],
          longTerm: [],
          targetSalaryRange: { currency: 'MXN' },
        },
        learningGoals: {
          skillsToLearn: [],
          certificationGoals: [],
          timeCommitment: 'regular',
          preferredLearningStyle: 'self-paced',
        },
        networkingGoals: {
          connectionTargets: 10,
          mentorshipInterest: 'none',
          eventParticipation: 'occasional',
          contributionLevel: 'discussion-participant',
        },
      },
      connectionSuggestions: {
        selectedConnections: [],
        connectionCriteria: {
          sameCompany: true,
          sameLocation: true,
          similarSkills: true,
          similarGoals: true,
          mentorshipMatch: false,
        },
        privacySettings: {
          allowDiscovery: true,
          showInDirectory: true,
          allowDirectMessages: true,
        },
      },
      completion: {
        tourPreferences: { takePlatformTour: true, focusAreas: [] },
        notificationPreferences: {
          email: true,
          push: false,
          frequency: 'weekly',
          types: [],
        },
        quickStartActions: [],
      },
    },
    preferences: {
      language: 'es',
      skipOptionalSteps: false,
      saveProgress: true,
      receiveReminders: true,
      shareAnalytics: true,
      participateInResearch: false,
    },
    analytics: {
      sessionId: `onboarding_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId: '', // Will be set from auth context
      startTime: new Date(),
      stepTimings: {} as Record<OnboardingStep, any>,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        isMobile: window.innerWidth < 768,
        platform:
          typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      },
      abTestVariant: abTestVariant,
    },
    isLoading: false,
    hasUnsavedChanges: false,
    error: null,
    achievements: [],
    showAchievementModal: false,
    currentAchievement: null,
    showTooltip: false,
    tooltipTarget: null,
    emailVerificationSent: false,
    emailVerified: false,
  });

  // Calculate completion percentage
  const updateProgress = useCallback(
    (
      newStep: OnboardingStep,
      completedSteps: OnboardingStep[],
      startedAt: Date
    ) => {
      const completionPercentage = Math.round(
        (completedSteps.length / STEP_ORDER.length) * 100
      );
      const estimatedTimeRemaining = Math.max(
        0,
        (STEP_ORDER.length - completedSteps.length) * 2.5
      );

      return {
        currentStep: newStep,
        completedSteps,
        totalSteps: STEP_ORDER.length,
        completionPercentage,
        startedAt,
        lastUpdated: new Date(),
        estimatedTimeRemaining,
        canSkipStep: SKIPPABLE_STEPS.includes(newStep),
        isOptionalStep: SKIPPABLE_STEPS.includes(newStep),
      };
    },
    []
  );

  // Track analytics events
  const trackEvent = useCallback(
    (event: OnboardingEvent) => {
      trackOnboardingEvent(state.analytics.sessionId, event);
    },
    [state.analytics.sessionId]
  );

  // Handle step navigation
  const goToStep = useCallback(
    (step: OnboardingStep, markCurrentAsComplete = false) => {
      const currentStep = state.progress.currentStep;

      setState((prev) => {
        let newCompletedSteps = [...prev.progress.completedSteps];

        if (markCurrentAsComplete && !newCompletedSteps.includes(currentStep)) {
          newCompletedSteps.push(currentStep);

          // Track step completion
          const stepStartTime =
            prev.analytics.stepTimings[currentStep]?.startTime;
          const duration = stepStartTime
            ? Date.now() - stepStartTime.getTime()
            : 0;

          trackEvent({
            type: 'step_completed',
            step: currentStep,
            duration,
            timestamp: new Date(),
          });
        }

        const newProgress = updateProgress(
          step,
          newCompletedSteps,
          prev.progress.startedAt
        );

        // Track step start
        trackEvent({
          type: 'step_started',
          step,
          timestamp: new Date(),
        });

        // Update step timing
        const newStepTimings = {
          ...prev.analytics.stepTimings,
          [step]: {
            ...prev.analytics.stepTimings[step],
            startTime: new Date(),
          },
        };

        const newState = {
          ...prev,
          progress: newProgress,
          analytics: {
            ...prev.analytics,
            stepTimings: newStepTimings,
          },
          hasUnsavedChanges: true,
        };

        // Callback for step change
        onStepChange?.(step, newProgress);

        return newState;
      });
    },
    [state.progress.currentStep, updateProgress, trackEvent, onStepChange]
  );

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.progress.currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStepValue = STEP_ORDER[currentIndex + 1];
      if (nextStepValue) {
        goToStep(nextStepValue, true);
      }
    } else {
      // Complete onboarding
      handleComplete();
    }
  }, [state.progress.currentStep, goToStep]);

  const previousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.progress.currentStep);
    if (currentIndex > 0) {
      const prevStepValue = STEP_ORDER[currentIndex - 1];
      if (prevStepValue) {
        goToStep(prevStepValue, false);
      }
    }
  }, [state.progress.currentStep, goToStep]);

  const skipStep = useCallback(() => {
    if (state.progress.canSkipStep) {
      trackEvent({
        type: 'step_skipped',
        step: state.progress.currentStep,
        reason: 'user_choice',
        timestamp: new Date(),
      });
      nextStep();
    }
  }, [
    state.progress.canSkipStep,
    state.progress.currentStep,
    trackEvent,
    nextStep,
  ]);

  // Handle step data updates
  const updateStepData = useCallback(
    (stepKey: keyof OnboardingData, stepData: any) => {
      setState((prev) => ({
        ...prev,
        data: {
          ...prev.data,
          [stepKey]: {
            ...prev['data'][stepKey],
            ...stepData,
          },
        },
        hasUnsavedChanges: true,
      }));
    },
    []
  );

  // Save progress to Firebase
  const saveProgress = useCallback(async () => {
    if (!state.hasUnsavedChanges) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await saveOnboardingProgress(state.analytics.userId, {
        progress: state.progress,
        data: state['data'],
        preferences: state['preferences'],
        analytics: state.analytics,
      });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasUnsavedChanges: false,
      }));

      toast.success(t.onboarding.progressSaved);
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: t.onboarding.errors.saveFailed,
      }));
      toast.error(t.onboarding.errors.saveFailed);
    }
  }, [state, t]);

  // Auto-save progress
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (state.hasUnsavedChanges && state['preferences'].saveProgress) {
        saveProgress();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [state.hasUnsavedChanges, state.preferences.saveProgress, saveProgress]);

  // Handle completion
  const handleComplete = useCallback(async () => {
    trackEvent({
      type: 'onboarding_completed',
      totalDuration: Date.now() - state.analytics.startTime.getTime(),
      timestamp: new Date(),
    });

    setState((prev) => {
      const completedSteps = [...prev.progress.completedSteps];
      if (!completedSteps.includes('complete')) {
        completedSteps.push('complete');
      }

      return {
        ...prev,
        progress: {
          ...prev.progress,
          completedSteps,
          completionPercentage: 100,
        },
        analytics: {
          ...prev.analytics,
          completionTime: new Date(),
          totalDuration: Date.now() - prev.analytics.startTime.getTime(),
        },
      };
    });

    // Save final progress
    await saveProgress();

    // Call completion callback
    onComplete(state.data);
  }, [
    state.analytics.startTime,
    state['data'],
    trackEvent,
    saveProgress,
    onComplete,
  ]);

  // Handle abandonment
  const handleAbandonment = useCallback(
    (reason: string) => {
      trackEvent({
        type: 'onboarding_abandoned',
        step: state.progress.currentStep,
        reason,
        timestamp: new Date(),
      });

      onAbandonment?.(state.progress.currentStep, reason);
    },
    [state.progress.currentStep, trackEvent, onAbandonment]
  );

  // Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = t.onboarding.unsavedChangesWarning;
        return t.onboarding.unsavedChangesWarning;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges, t]);

  // Render step component
  const renderStepComponent = () => {
    const stepProps = {
      data: state.data,
      onNext: (stepData: any) => {
        const stepKey =
          state.progress.currentStep === 'welcome'
            ? 'welcome'
            : state.progress.currentStep === 'profile-setup'
              ? 'profileSetup'
              : state.progress.currentStep === 'interests-selection'
                ? 'interestsSelection'
                : state.progress.currentStep === 'goals-definition'
                  ? 'goalsDefinition'
                  : state.progress.currentStep === 'connection-suggestions'
                    ? 'connectionSuggestions'
                    : 'completion';

        updateStepData(stepKey as keyof OnboardingData, stepData);
        nextStep();
      },
      onBack: previousStep,
      onSkip: state.progress.canSkipStep ? skipStep : undefined,
      progress: state.progress,
      isActive: true,
      className: 'w-full',
    };

    switch (state.progress.currentStep) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />;
      case 'profile-setup':
        return <ProfileSetup {...stepProps} />;
      case 'interests-selection':
        return <InterestsSelection {...stepProps} />;
      case 'goals-definition':
        return <GoalsDefinition {...stepProps} />;
      case 'connection-suggestions':
        return <ConnectionSuggestions {...stepProps} />;
      case 'complete':
        return <OnboardingComplete {...stepProps} />;
      default:
        return <div>Unknown step</div>;
    }
  };

  const currentStepIndex = STEP_ORDER.indexOf(state.progress.currentStep);

  return (
    <div className={`onboarding-flow ${className}`}>
      {/* Progress Header */}
      <div className="onboarding-header sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Progress Bar */}
            <div className="mr-8 flex-1">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {t.onboarding.progress.step} {currentStepIndex + 1}{' '}
                      {t.onboarding.progress.of} {STEP_ORDER.length}
                    </span>
                    <span>
                      {state.progress.completionPercentage}%{' '}
                      {t.onboarding.progress.complete}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all duration-300 ease-out"
                      style={{
                        width: `${state.progress.completionPercentage}%`,
                      }}
                    />
                  </div>
                </div>
                {state.progress.estimatedTimeRemaining &&
                  state.progress.estimatedTimeRemaining > 0 && (
                    <div className="flex items-center text-sm text-gray-500">
                      <ClockIcon className="mr-1 h-4 w-4" />
                      {Math.ceil(state.progress.estimatedTimeRemaining)}{' '}
                      {t.onboarding.progress.minutesLeft}
                    </div>
                  )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {state.isLoading && (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  {t.onboarding.saving}
                </div>
              )}

              <button
                onClick={() => handleAbandonment('user_exit')}
                className="p-2 text-gray-400 transition-colors hover:text-gray-600"
                title={t.onboarding.exit}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-4">
            {STEP_ORDER.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    state.progress.completedSteps.includes(step)
                      ? 'bg-green-100 text-green-800'
                      : state.progress.currentStep === step
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {state.progress.completedSteps.includes(step) ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`ml-2 hidden text-sm font-medium sm:block ${
                    state.progress.currentStep === step
                      ? 'text-blue-900'
                      : state.progress.completedSteps.includes(step)
                        ? 'text-green-900'
                        : 'text-gray-500'
                  }`}
                >
                  {t.onboarding.steps[step].title}
                </span>
                {index < STEP_ORDER.length - 1 && (
                  <ChevronRightIcon className="mx-2 h-4 w-4 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {state['error'] && (
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <div className="text-red-800">{state['error']}</div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="onboarding-content flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {renderStepComponent()}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="onboarding-footer sticky bottom-0 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              {currentStepIndex > 0 && (
                <button
                  onClick={previousStep}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  {t.onboarding.navigation.back}
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {state.progress.canSkipStep && (
                <button
                  onClick={skipStep}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-700"
                >
                  {t.onboarding.navigation.skip}
                </button>
              )}

              {state.hasUnsavedChanges && (
                <button
                  onClick={saveProgress}
                  disabled={state.isLoading}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.onboarding.navigation.save}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
