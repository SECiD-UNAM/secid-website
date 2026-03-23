import React, { useState, useEffect, useRef } from 'react';

interface TourStep {
  id: string;
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'scroll' | 'highlight' | 'input';
    element?: string;
    value?: string;
  };
  condition?: () => boolean; // Optional condition to show this step
  optional?: boolean; // Whether this step can be skipped
}

interface TourConfig {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  autoStart?: boolean;
  persistent?: boolean; // Whether to remember completion state
}

interface OnboardingTourProps {
  tours: TourConfig[];
  onComplete?: (tourId: string) => void;
  onSkip?: (tourId: string, stepId: string) => void;
  className?: string;
}

interface TourState {
  activeTour: string | null;
  currentStep: number;
  isVisible: boolean;
  targetElement: Element | null;
  overlayPosition: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  tours,
  onComplete,
  onSkip,
  className = '',
}) => {
  const [tourState, setTourState] = useState<TourState>({
    activeTour: null,
    currentStep: 0,
    isVisible: false,
    targetElement: null,
    overlayPosition: null,
  });

  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load completed tours from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('secid-completed-tours');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompletedTours(new Set(parsed));
      } catch (error) {
        console.error('Failed to parse completed tours:', error);
      }
    }
  }, []);

  // Auto-start tours
  useEffect(() => {
    const autoStartTour = tours.find(
      (tour) => tour.autoStart && !completedTours.has(tour.id)
    );

    if (autoStartTour) {
      // Delay to ensure page is fully loaded
      setTimeout(() => startTour(autoStartTour.id), 1000);
    }
  }, [tours, completedTours]);

  // Update overlay position when target element changes
  useEffect(() => {
    if (tourState.targetElement) {
      updateOverlayPosition();

      const handleResize = () => updateOverlayPosition();
      const handleScroll = () => updateOverlayPosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [tourState.targetElement]);

  const updateOverlayPosition = () => {
    if (!tourState.targetElement) return;

    const rect = tourState.targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document['documentElement'].scrollLeft;

    setTourState((prev) => ({
      ...prev,
      overlayPosition: {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
      },
    }));
  };

  const startTour = (tourId: string) => {
    const tour = tours.find((t) => t.id === tourId);
    if (!tour) return;

    const firstStep = tour.steps.find(
      (step) => !step.condition || step.condition()
    );
    if (!firstStep) return;

    const targetElement = document.querySelector(firstStep.target);
    if (!targetElement) {
      console.warn(`Tour step target not found: ${firstStep.target}`);
      return;
    }

    setTourState({
      activeTour: tourId,
      currentStep: 0,
      isVisible: true,
      targetElement,
      overlayPosition: null,
    });

    // Scroll to target element
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const nextStep = () => {
    const currentTour = tours.find((t) => t.id === tourState.activeTour);
    if (!currentTour) return;

    const nextStepIndex = tourState.currentStep + 1;

    if (nextStepIndex >= currentTour.steps.length) {
      completeTour();
      return;
    }

    const nextStep = currentTour.steps[nextStepIndex];
    if (nextStep.condition && !nextStep.condition()) {
      // Skip this step if condition is not met
      setTourState((prev) => ({ ...prev, currentStep: nextStepIndex }));
      setTimeout(this.nextStep, 100);
      return;
    }

    const targetElement = document.querySelector(nextStep.target);
    if (!targetElement) {
      console.warn(`Tour step target not found: ${nextStep.target}`);
      completeTour();
      return;
    }

    setTourState((prev) => ({
      ...prev,
      currentStep: nextStepIndex,
      targetElement,
    }));

    // Scroll to new target
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const previousStep = () => {
    if (tourState.currentStep <= 0) return;

    const currentTour = tours.find((t) => t.id === tourState.activeTour);
    if (!currentTour) return;

    const prevStepIndex = tourState.currentStep - 1;
    const prevStep = currentTour.steps[prevStepIndex];

    const targetElement = document.querySelector(prevStep.target);
    if (!targetElement) return;

    setTourState((prev) => ({
      ...prev,
      currentStep: prevStepIndex,
      targetElement,
    }));

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const skipStep = () => {
    const currentTour = tours.find((t) => t.id === tourState.activeTour);
    if (!currentTour) return;

    const currentStep = currentTour.steps[tourState.currentStep];
    if (onSkip) {
      onSkip(tourState.activeTour!, currentStep.id);
    }

    nextStep();
  };

  const completeTour = () => {
    if (!tourState.activeTour) return;

    const newCompleted = new Set(completedTours);
    newCompleted.add(tourState.activeTour);
    setCompletedTours(newCompleted);

    // Save to localStorage
    localStorage.setItem(
      'secid-completed-tours',
      JSON.stringify([...newCompleted])
    );

    if (onComplete) {
      onComplete(tourState.activeTour);
    }

    closeTour();
  };

  const closeTour = () => {
    setTourState({
      activeTour: null,
      currentStep: 0,
      isVisible: false,
      targetElement: null,
      overlayPosition: null,
    });
  };

  const executeStepAction = () => {
    const currentTour = tours.find((t) => t.id === tourState.activeTour);
    if (!currentTour) return;

    const currentStep = currentTour.steps[tourState.currentStep];
    if (!currentStep.action) return;

    const { type, element, value } = currentStep.action;

    switch (type) {
      case 'click':
        if (element) {
          const target = document['querySelector'](element);
          if (target) {
            (target as HTMLElement).click();
          }
        }
        break;

      case 'scroll':
        if (element) {
          const target = document['querySelector'](element);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
        break;

      case 'highlight':
        if (element) {
          const target = document['querySelector'](element);
          if (target) {
            target.classList.add('tour-highlight');
            setTimeout(() => target.classList.remove('tour-highlight'), 2000);
          }
        }
        break;

      case 'input':
        if (element && value) {
          const target = document['querySelector'](element) as HTMLInputElement;
          if (target) {
            target.value = value;
            target.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        break;
    }
  };

  const getTooltipPosition = (): React.CSSProperties => {
    if (!tourState.overlayPosition || !tooltipRef.current) {
      return {};
    }

    const currentTour = tours.find((t) => t.id === tourState.activeTour);
    if (!currentTour) return {};

    const currentStep = currentTour.steps[tourState.currentStep];
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const { top, left, width, height } = tourState.overlayPosition;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let tooltipTop = top;
    let tooltipLeft = left;

    switch (currentStep.position) {
      case 'top':
        tooltipTop = top - tooltipRect.height - 10;
        tooltipLeft = left + width / 2 - tooltipRect.width / 2;
        break;

      case 'bottom':
        tooltipTop = top + height + 10;
        tooltipLeft = left + width / 2 - tooltipRect.width / 2;
        break;

      case 'left':
        tooltipTop = top + height / 2 - tooltipRect.height / 2;
        tooltipLeft = left - tooltipRect.width - 10;
        break;

      case 'right':
        tooltipTop = top + height / 2 - tooltipRect.height / 2;
        tooltipLeft = left + width + 10;
        break;

      case 'center':
        tooltipTop = windowHeight / 2 - tooltipRect.height / 2;
        tooltipLeft = windowWidth / 2 - tooltipRect.width / 2;
        break;
    }

    // Ensure tooltip stays within viewport
    tooltipTop = Math.max(
      10,
      Math.min(tooltipTop, windowHeight - tooltipRect.height - 10)
    );
    tooltipLeft = Math.max(
      10,
      Math.min(tooltipLeft, windowWidth - tooltipRect.width - 10)
    );

    return {
      position: 'absolute',
      top: `${tooltipTop}px`,
      left: `${tooltipLeft}px`,
      zIndex: 10001,
    };
  };

  if (!tourState.isVisible || !tourState.activeTour) {
    return null;
  }

  const currentTour = tours.find((t) => t.id === tourState.activeTour);
  if (!currentTour) return null;

  const currentStep = currentTour.steps[tourState.currentStep];
  const isLastStep = tourState.currentStep === currentTour.steps.length - 1;
  const isFirstStep = tourState.currentStep === 0;

  return (
    <div className={className}>
      {/* Overlay */}
      <div
        className="z-10000 fixed inset-0 bg-black bg-opacity-50"
        style={{ zIndex: 10000 }}
      >
        {/* Highlighted area */}
        {tourState.overlayPosition && (
          <div
            className="absolute rounded-lg border-4 border-blue-500 shadow-lg"
            style={{
              top: `${tourState.overlayPosition.top - 4}px`,
              left: `${tourState.overlayPosition.left - 4}px`,
              width: `${tourState.overlayPosition.width + 8}px`,
              height: `${tourState.overlayPosition.height + 8}px`,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              zIndex: 10000,
            }}
          />
        )}

        {/* Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute max-w-sm rounded-lg bg-white p-6 shadow-xl"
          style={getTooltipPosition()}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                {tourState.currentStep + 1} of {currentTour.steps.length}
              </span>
              <h3 className="font-semibold text-gray-900">
                {currentStep.title}
              </h3>
            </div>
            <button
              onClick={closeTour}
              className="text-gray-400 transition-colors hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <p className="mb-6 text-gray-600">{currentStep.content}</p>

          {/* Actions */}
          {currentStep.action && (
            <div className="mb-4">
              <button
                onClick={executeStepAction}
                className="rounded-md bg-green-100 px-3 py-1 text-sm text-green-800 transition-colors hover:bg-green-200"
              >
                Try it now
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {!isFirstStep && (
                <button
                  onClick={previousStep}
                  className="px-3 py-2 text-sm text-gray-600 transition-colors hover:text-gray-800"
                >
                  ← Previous
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              {currentStep.optional && (
                <button
                  onClick={skipStep}
                  className="px-3 py-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
                >
                  Skip
                </button>
              )}

              <button
                onClick={isLastStep ? completeTour : nextStep}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
              >
                {isLastStep ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${((tourState.currentStep + 1) / currentTour.steps.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tour launcher (floating button) */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="relative">
          <button
            onClick={() => {
              const availableTour = tours.find(
                (tour) => !completedTours.has(tour.id)
              );
              if (availableTour) {
                startTour(availableTour.id);
              }
            }}
            className="rounded-full bg-blue-600 p-3 text-white shadow-lg transition-colors hover:bg-blue-700"
            title="Start guided tour"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Available tours indicator */}
          {tours.some((tour) => !completedTours.has(tour.id)) && (
            <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-red-500" />
          )}
        </div>
      </div>
    </div>
  );
};

// Predefined tour configurations
export const SECID_TOURS: TourConfig[] = [
  {
    id: 'welcome-tour',
    name: 'Welcome Tour',
    description: 'Learn the basics of the SECiD platform',
    autoStart: true,
    persistent: true,
    steps: [
      {
        id: 'welcome',
        target: 'body',
        title: 'Welcome to SECiD!',
        content:
          "Welcome to the Sociedad de Egresados en Ciencia de Datos platform. Let's take a quick tour to show you around.",
        position: 'center',
      },
      {
        id: 'navigation',
        target: 'nav, header nav, .navigation',
        title: 'Navigation Menu',
        content:
          'Use the navigation menu to access different sections like Jobs, Events, Members, and Forums.',
        position: 'bottom',
      },
      {
        id: 'search',
        target: '[data-tour="search"], .search-bar, input[type="search"]',
        title: 'Global Search',
        content:
          'Use the search bar to quickly find jobs, members, events, or forum discussions.',
        position: 'bottom',
        optional: true,
      },
      {
        id: 'profile',
        target: '[data-tour="profile"], .user-menu, .profile-dropdown',
        title: 'Your Profile',
        content:
          'Access your profile, settings, and account information from here.',
        position: 'bottom',
      },
      {
        id: 'dashboard',
        target: '[data-tour="dashboard"], .dashboard-link',
        title: 'Dashboard',
        content:
          'Your dashboard shows personalized content, job matches, and activity updates.',
        position: 'bottom',
        optional: true,
      },
    ],
  },
  {
    id: 'job-search-tour',
    name: 'Job Search Tour',
    description: 'Learn how to effectively search and apply for jobs',
    steps: [
      {
        id: 'job-board',
        target: '[data-tour="jobs"], .job-board',
        title: 'Job Board',
        content:
          'Browse through job opportunities specifically curated for data science professionals.',
        position: 'bottom',
      },
      {
        id: 'job-filters',
        target: '.job-filters, [data-tour="job-filters"]',
        title: 'Filter Jobs',
        content:
          'Use filters to narrow down jobs by location, experience level, skills, and more.',
        position: 'right',
        optional: true,
      },
      {
        id: 'job-alerts',
        target: '[data-tour="job-alerts"], .alert-button',
        title: 'Job Alerts',
        content:
          'Set up job alerts to get notified when new positions matching your criteria are posted.',
        position: 'left',
        optional: true,
      },
      {
        id: 'application-tracker',
        target: '[data-tour="applications"], .applications-link',
        title: 'Track Applications',
        content:
          'Keep track of all your job applications and their status in one place.',
        position: 'bottom',
      },
    ],
  },
  {
    id: 'networking-tour',
    name: 'Networking Tour',
    description: 'Discover how to connect with other professionals',
    steps: [
      {
        id: 'member-directory',
        target: '[data-tour="members"], .members-link',
        title: 'Member Directory',
        content:
          'Explore our community of data science professionals and alumni.',
        position: 'bottom',
      },
      {
        id: 'connect-members',
        target: '.connect-button, [data-tour="connect"]',
        title: 'Connect with Members',
        content: 'Send connection requests to build your professional network.',
        position: 'top',
        optional: true,
      },
      {
        id: 'forums',
        target: '[data-tour="forums"], .forum-link',
        title: 'Community Forums',
        content:
          'Join discussions, ask questions, and share knowledge with the community.',
        position: 'bottom',
      },
      {
        id: 'events',
        target: '[data-tour="events"], .events-link',
        title: 'Events',
        content:
          'Attend workshops, webinars, and networking events to expand your knowledge and connections.',
        position: 'bottom',
      },
    ],
  },
];

// Hook for managing tours
export function useTour() {
  const [activeTour, setActiveTour] = useState<string | null>(null);
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('secid-completed-tours');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompletedTours(new Set(parsed));
      } catch (error) {
        console.error('Failed to parse completed tours:', error);
      }
    }
  }, []);

  const startTour = (tourId: string) => {
    setActiveTour(tourId);
  };

  const completeTour = (tourId: string) => {
    const newCompleted = new Set(completedTours);
    newCompleted.add(tourId);
    setCompletedTours(newCompleted);
    localStorage.setItem(
      'secid-completed-tours',
      JSON.stringify([...newCompleted])
    );
    setActiveTour(null);
  };

  const resetTours = () => {
    setCompletedTours(new Set());
    localStorage.removeItem('secid-completed-tours');
  };

  return {
    activeTour,
    completedTours,
    startTour,
    completeTour,
    resetTours,
    hasAvailableTours: SECID_TOURS.some((tour) => !completedTours.has(tour.id)),
  };
}

export default OnboardingTour;
