import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslations } from '../../hooks/useTranslations';
import type {
  MentorProfile,
  MenteeProfile,
  MentorshipRequest,
  FormState,
  ValidationError,
} from '../../types';
import {
  getMentorProfile,
  getMenteeProfile,
  createMentorshipRequest,
  updateMentorshipRequest,
  getMentorshipRequests,
} from '../../lib/mentorship';

interface MentorshipRequestProps {
  mentorId?: string;
  requestId?: string;
  mode: 'create' | 'view' | 'respond';
  onSubmit?: (request: MentorshipRequest) => void;
  onCancel?: () => void;
}

interface RequestFormData {
  message: string;
  goals: string[];
  expectedDuration: string;
  meetingFrequency: 'weekly' | 'biweekly' | 'monthly';
  communicationPreference: 'video' | 'voice' | 'chat' | 'in-person';
  specificAreas: string[];
  timeCommitment: string;
  previousExperience: string;
  expectations: string;
}

const DURATION_OPTIONS = [
  '1-3 months',
  '3-6 months',
  '6-12 months',
  '1+ year',
  'Ongoing',
];

const COMMUNICATION_OPTIONS = [
  { value: 'video', label: 'Video Calls' },
  { value: 'voice', label: 'Voice Calls' },
  { value: 'chat', label: 'Text/Chat' },
  { value: 'in-person', label: 'In Person' },
] as const;

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

/** Inline SVG icons to replace FontAwesome */
function ArrowRightIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function ArrowLeftIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
    </svg>
  );
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PaperPlaneIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function UserIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PlusIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ClockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ChatIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ExclamationCircleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/** Helper to get initials from display name */
function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Status badge color map */
function getStatusClasses(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
    case 'accepted':
      return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300';
    case 'rejected':
      return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    case 'expired':
      return 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
    default:
      return 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
  }
}

/** Tailwind class constants */
const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300';
const sectionHeadingClass = 'mb-4 text-lg font-semibold text-gray-900 dark:text-white';
const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50';
const btnOutline =
  'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50';
const btnDanger =
  'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50';
const btnGhost =
  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50';
const cardClass =
  'rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800';
const errorBoxClass =
  'rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20';
const successBoxClass =
  'rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20';

export default function MentorshipRequestComponent({
  mentorId,
  requestId,
  mode = 'create',
  onSubmit,
  onCancel,
}: MentorshipRequestProps) {
  const { user } = useAuthContext();
  const _t = useTranslations();

  // Local translation override with English fallback strings
  const t = {
    ..._t,
    mentorship: {
      ..._t.mentorship,
      request: {
        // View mode
        viewTitle: 'Mentorship Request',
        mentee: 'Mentee',
        mentor: 'Mentor',
        message: 'Message',
        goals: 'Goals',
        preferences: 'Preferences',
        duration: 'Duration',
        frequency: 'Frequency',
        communication: 'Communication',
        response: 'Response',
        submitted: 'Submitted',
        accepted: 'Accepted',
        rejected: 'Rejected',
        // Respond mode
        respondTitle: 'Respond to Request',
        respondDescription: 'Review this mentorship request and decide whether to accept or decline.',
        responseSubmitted: 'Your response has been submitted successfully.',
        yearsExperience: 'years of experience',
        theirMessage: 'Their Message',
        theirGoals: 'Their Goals',
        yourResponse: 'Your Response',
        acceptRequest: 'Accept Request',
        rejectRequest: 'Decline Request',
        acceptanceMessage: 'Acceptance Message (optional)',
        rejectionMessage: 'Reason for Declining (optional)',
        acceptancePlaceholder: 'Share any initial thoughts or next steps...',
        rejectionPlaceholder: 'Briefly explain why you cannot take this mentee...',
        confirmAccept: 'Confirm Accept',
        confirmReject: 'Confirm Decline',
        // Create mode
        createTitle: 'Request Mentorship',
        introDescription: 'Tell the mentor about yourself and what you hope to achieve.',
        personalMessage: 'Personal Message',
        messagePlaceholder: 'Introduce yourself and explain why you would like to be mentored by this person...',
        characters: 'characters',
        minimumCharacters: 'Minimum 50 characters',
        yourGoals: 'Your Goals',
        addGoalPlaceholder: 'Add a goal...',
        goalsHelp: 'Add specific goals you want to work on with your mentor.',
        preferencesDescription: 'Set your preferences for the mentorship relationship.',
        expectedDuration: 'Expected Duration',
        meetingFrequency: 'Meeting Frequency',
        communicationPreference: 'Communication Preference',
        commitmentDescription: 'Describe your availability and commitment level.',
        timeCommitment: 'Time Commitment',
        timeCommitmentPlaceholder: 'Describe how much time you can dedicate per week...',
        previousExperience: 'Previous Mentorship Experience',
        previousExperiencePlaceholder: 'Describe any previous mentorship experience...',
        expectationsDescription: 'What do you expect from this mentorship?',
        expectations: 'Expectations',
        expectationsPlaceholder: 'Describe what you expect to gain from this mentorship...',
        summary: 'Summary',
        previous: 'Previous',
        next: 'Next',
        submitRequest: 'Submit Request',
        submitSuccess: 'Your mentorship request has been submitted successfully!',
        // Steps
        steps: {
          introduction: 'Introduction',
          preferences: 'Preferences',
          commitment: 'Commitment',
          expectations: 'Expectations',
        },
        // Status
        status: {
          pending: 'Pending',
          accepted: 'Accepted',
          rejected: 'Rejected',
          expired: 'Expired',
        } as Record<string, string>,
        // Validation
        validation: {
          messageMinLength: 'Your message must be at least 50 characters.',
          goalsRequired: 'Please add at least one goal.',
          durationRequired: 'Please select an expected duration.',
          timeCommitmentRequired: 'Please describe your time commitment.',
          expectationsRequired: 'Please describe your expectations.',
        },
        // Errors
        errorLoading: 'Error loading request data. Please try again.',
        errorSubmitting: 'Error submitting request. Please try again.',
        errorResponding: 'Error responding to request. Please try again.',
        // Overrides from existing translations
        ...((_t.mentorship as Record<string, unknown>)?.request as Record<string, string>),
      },
    },
    common: {
      ...((_t as unknown as Record<string, unknown>).common as Record<string, string> | undefined),
      cancel: 'Cancel',
      submitting: 'Submitting...',
    },
  };

  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [mentee, setMentee] = useState<MenteeProfile | null>(null);
  const [existingRequest, setExistingRequest] =
    useState<MentorshipRequest | null>(null);

  const [formData, setFormData] = useState<RequestFormData>({
    message: '',
    goals: [],
    expectedDuration: '',
    meetingFrequency: 'biweekly',
    communicationPreference: 'video',
    specificAreas: [],
    timeCommitment: '',
    previousExperience: '',
    expectations: '',
  });

  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    errors: [],
    success: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [newGoal, setNewGoal] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responseAction, setResponseAction] = useState<
    'accept' | 'reject' | null
  >(null);

  const totalSteps = mode === 'create' ? 4 : 1;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorId, requestId, user]);

  const loadData = async () => {
    if (!user) return;

    try {
      if (mode === 'create') {
        const menteeData = await getMenteeProfile(user.uid);
        setMentee(menteeData);

        if (menteeData) {
          setFormData((prev) => ({
            ...prev,
            goals: [...menteeData.goals],
          }));
        }
      }

      if (mentorId) {
        const mentorData = await getMentorProfile(mentorId);
        setMentor(mentorData);
      }

      if (requestId) {
        const requests = await getMentorshipRequests({ requestId });
        if (requests.length > 0) {
          const request = requests[0];
          setExistingRequest(request);

          const [mentorData, menteeData] = await Promise.all([
            getMentorProfile(request.mentorId),
            getMenteeProfile(request.menteeId),
          ]);

          setMentor(mentorData);
          setMentee(menteeData);

          if (mode === 'view') {
            setFormData({
              message: request.message,
              goals: request.goals,
              expectedDuration: (request as unknown as Record<string, string>).expectedDuration ?? '',
              meetingFrequency: (request.meetingFrequency ?? 'biweekly') as RequestFormData['meetingFrequency'],
              communicationPreference: (request.communicationPreference ?? 'video') as RequestFormData['communicationPreference'],
              specificAreas: [],
              timeCommitment: '',
              previousExperience: '',
              expectations: '',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading request data:', error);
      setFormState((prev) => ({
        ...prev,
        errors: [
          { field: 'general', message: t.mentorship.request.errorLoading },
        ],
      }));
    }
  };

  const validateStep = (step: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    switch (step) {
      case 1:
        if (!formData.message.trim() || formData.message.length < 50) {
          errors.push({
            field: 'message',
            message: t.mentorship.request.validation.messageMinLength,
          });
        }
        if (formData.goals.length === 0) {
          errors.push({
            field: 'goals',
            message: t.mentorship.request.validation.goalsRequired,
          });
        }
        break;

      case 2:
        if (!formData.expectedDuration) {
          errors.push({
            field: 'expectedDuration',
            message: t.mentorship.request.validation.durationRequired,
          });
        }
        break;

      case 3:
        if (!formData.timeCommitment.trim()) {
          errors.push({
            field: 'timeCommitment',
            message: t.mentorship.request.validation.timeCommitmentRequired,
          });
        }
        break;

      case 4:
        if (!formData.expectations.trim()) {
          errors.push({
            field: 'expectations',
            message: t.mentorship.request.validation.expectationsRequired,
          });
        }
        break;
    }

    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setFormState((prev) => ({ ...prev, errors }));
      return;
    }

    setFormState((prev) => ({ ...prev, errors: [] }));
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmitRequest = async () => {
    if (!user || !mentorId || !mentee) return;

    setFormState((prev) => ({
      ...prev,
      isSubmitting: true,
      errors: [],
      success: false,
    }));

    const allErrors: ValidationError[] = [];
    for (let step = 1; step <= totalSteps; step++) {
      allErrors.push(...validateStep(step));
    }

    if (allErrors.length > 0) {
      setFormState((prev) => ({
        ...prev,
        errors: allErrors,
        isSubmitting: false,
      }));
      return;
    }

    try {
      const requestData: Omit<
        MentorshipRequest,
        'id' | 'createdAt' | 'respondedAt'
      > = {
        mentorId,
        menteeId: user.uid,
        message: formData.message,
        goals: formData.goals,
        meetingFrequency: formData.meetingFrequency,
        communicationPreference: formData.communicationPreference,
        status: 'pending',
      };

      const savedRequest = await createMentorshipRequest(requestData);

      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        success: true,
        errors: [],
      }));

      if (onSubmit) {
        onSubmit(savedRequest);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: [
          { field: 'general', message: t.mentorship.request.errorSubmitting },
        ],
      }));
    }
  };

  const handleRespondToRequest = async (action: 'accept' | 'reject') => {
    if (!existingRequest || !user) return;

    setFormState((prev) => ({
      ...prev,
      isSubmitting: true,
      errors: [],
      success: false,
    }));

    try {
      const updatedRequest = await updateMentorshipRequest(existingRequest.id, {
        status: action === 'accept' ? 'accepted' : 'rejected',
        responseMessage: responseMessage.trim() || undefined,
        respondedAt: new Date(),
      });

      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        success: true,
        errors: [],
      }));

      if (onSubmit) {
        onSubmit(updatedRequest);
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: [
          { field: 'general', message: t.mentorship.request.errorResponding },
        ],
      }));
    }
  };

  const addGoal = () => {
    if (newGoal.trim() && !formData.goals.includes(newGoal.trim())) {
      setFormData((prev) => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()],
      }));
      setNewGoal('');
    }
  };

  const removeGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g !== goal),
    }));
  };

  // ── Step indicator ──────────────────────────────────────────
  const stepLabels = [
    t.mentorship.request.steps.introduction,
    t.mentorship.request.steps.preferences,
    t.mentorship.request.steps.commitment,
    t.mentorship.request.steps.expectations,
  ];

  const renderStepIndicator = () => (
    <div className="mb-6 flex items-center justify-center gap-2">
      {stepLabels.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i + 1 < currentStep
                  ? 'bg-primary-600 text-white'
                  : i + 1 === currentStep
                    ? 'border-2 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-2 border-gray-200 text-gray-400 dark:border-gray-600'
              }`}
            >
              {i + 1 < currentStep ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs ${
                i + 1 === currentStep
                  ? 'font-medium text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {label}
            </span>
          </div>
          {i < stepLabels.length - 1 && (
            <div
              className={`mb-4 h-0.5 w-8 ${
                i + 1 < currentStep
                  ? 'bg-primary-500'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // ── Participant avatar ──────────────────────────────────────
  const renderAvatar = (
    profile: { profileImage?: string; displayName?: string } | null,
    gradient: string,
  ) => {
    if (profile?.profileImage) {
      return (
        <img
          src={profile.profileImage}
          alt={profile.displayName ?? ''}
          className="h-14 w-14 rounded-full object-cover"
        />
      );
    }
    return (
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-lg font-semibold text-white`}
      >
        {profile?.displayName ? getInitials(profile.displayName) : <UserIcon className="h-6 w-6" />}
      </div>
    );
  };

  // ── Error/Success boxes ─────────────────────────────────────
  const renderErrors = () => {
    if (formState.errors.length === 0) return null;
    return (
      <div className={`${errorBoxClass} mb-4 space-y-1`}>
        {formState.errors.map((error, index) => (
          <p key={index} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
            {error.message}
          </p>
        ))}
      </div>
    );
  };

  const renderSuccess = (message: string) => {
    if (!formState.success) return null;
    return (
      <div className={`${successBoxClass} mb-4`}>
        <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <CheckCircleIcon className="h-4 w-4 shrink-0" />
          {message}
        </p>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // VIEW MODE
  // ═══════════════════════════════════════════════════════════
  if (mode === 'view' && existingRequest) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t.mentorship.request.viewTitle}
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(existingRequest.status)}`}
          >
            {t.mentorship.request.status[existingRequest.status] ?? existingRequest.status}
          </span>
        </div>

        {/* Participants */}
        <div className={cardClass}>
          <div className="flex items-center justify-center gap-6">
            {/* Mentee */}
            <div className="flex flex-col items-center gap-2">
              {renderAvatar(mentee, 'from-secondary-500 to-blue-400')}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {mentee?.displayName}
              </span>
              <span className="text-xs text-gray-500">{t.mentorship.request.mentee}</span>
            </div>

            {/* Arrow */}
            <ArrowRightIcon className="h-6 w-6 text-gray-300 dark:text-gray-500" />

            {/* Mentor */}
            <div className="flex flex-col items-center gap-2">
              {renderAvatar(mentor, 'from-primary-500 to-amber-400')}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {mentor?.displayName}
              </span>
              <span className="text-xs text-gray-500">{t.mentorship.request.mentor}</span>
            </div>
          </div>
        </div>

        {/* Request details */}
        <div className={`${cardClass} space-y-6`}>
          {/* Message */}
          <section>
            <h3 className={sectionHeadingClass}>{t.mentorship.request.message}</h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {existingRequest.message}
            </p>
          </section>

          {/* Goals */}
          <section>
            <h3 className={sectionHeadingClass}>{t.mentorship.request.goals}</h3>
            <div className="flex flex-wrap gap-2">
              {existingRequest.goals.map((goal, index) => (
                <span
                  key={index}
                  className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                >
                  {goal}
                </span>
              ))}
            </div>
          </section>

          {/* Preferences */}
          <section>
            <h3 className={sectionHeadingClass}>{t.mentorship.request.preferences}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span>
                  <span className="font-medium">{t.mentorship.request.duration}:</span>{' '}
                  {(existingRequest as unknown as Record<string, string>).expectedDuration ?? '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span>
                  <span className="font-medium">{t.mentorship.request.frequency}:</span>{' '}
                  {existingRequest.meetingFrequency
                    ? ((_t.mentorship as Record<string, Record<string, string>>)?.frequency?.[existingRequest.meetingFrequency] ?? existingRequest.meetingFrequency)
                    : '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <ChatIcon className="h-4 w-4 text-gray-400" />
                <span>
                  <span className="font-medium">{t.mentorship.request.communication}:</span>{' '}
                  {existingRequest.communicationPreference
                    ? ((_t.mentorship as Record<string, Record<string, string>>)?.communication?.[existingRequest.communicationPreference] ?? existingRequest.communicationPreference)
                    : '-'}
                </span>
              </div>
            </div>
          </section>

          {/* Mentor response */}
          {existingRequest.responseMessage && (
            <section>
              <h3 className={sectionHeadingClass}>{t.mentorship.request.response}</h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {existingRequest.responseMessage}
              </p>
            </section>
          )}
        </div>

        {/* Timeline */}
        <div className={`${cardClass} space-y-3`}>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <PaperPlaneIcon className="h-4 w-4 text-gray-400" />
            <span>
              {t.mentorship.request.submitted}:{' '}
              {new Date(existingRequest.createdAt).toLocaleDateString()}
            </span>
          </div>
          {existingRequest.respondedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              {existingRequest.status === 'accepted' ? (
                <CheckIcon className="h-4 w-4 text-green-500" />
              ) : (
                <XIcon className="h-4 w-4 text-red-500" />
              )}
              <span>
                {existingRequest.status === 'accepted'
                  ? t.mentorship.request.accepted
                  : t.mentorship.request.rejected}
                : {new Date(existingRequest.respondedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RESPOND MODE
  // ═══════════════════════════════════════════════════════════
  if (mode === 'respond' && existingRequest) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t.mentorship.request.respondTitle}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t.mentorship.request.respondDescription}
          </p>
        </div>

        {renderErrors()}
        {renderSuccess(t.mentorship.request.responseSubmitted)}

        {/* Request summary card */}
        <div className={cardClass}>
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4 dark:border-gray-700">
            {renderAvatar(mentee, 'from-secondary-500 to-blue-400')}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {mentee?.displayName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(_t.mentorship as Record<string, Record<string, string>>)?.level?.[mentee?.currentLevel ?? 'entry'] ?? mentee?.currentLevel}{' '}
                - {mentee?.background.yearsOfExperience} {t.mentorship.request.yearsExperience}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.mentorship.request.theirMessage}
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {existingRequest.message}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.mentorship.request.theirGoals}
              </h4>
              <div className="mt-1 flex flex-wrap gap-2">
                {existingRequest.goals.slice(0, 3).map((goal, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                  >
                    {goal}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Response form */}
        <div className={cardClass}>
          <h3 className={sectionHeadingClass}>{t.mentorship.request.yourResponse}</h3>

          {/* Accept/Reject radio cards */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setResponseAction('accept')}
              className={`flex items-center justify-center gap-2 ${
                responseAction === 'accept'
                  ? 'cursor-pointer rounded-xl border-2 border-green-500 bg-green-50 p-4 dark:border-green-400 dark:bg-green-900/20'
                  : 'cursor-pointer rounded-xl border-2 border-gray-200 p-4 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <CheckIcon
                className={`h-5 w-5 ${
                  responseAction === 'accept'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  responseAction === 'accept'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {t.mentorship.request.acceptRequest}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResponseAction('reject')}
              className={`flex items-center justify-center gap-2 ${
                responseAction === 'reject'
                  ? 'cursor-pointer rounded-xl border-2 border-red-500 bg-red-50 p-4 dark:border-red-400 dark:bg-red-900/20'
                  : 'cursor-pointer rounded-xl border-2 border-gray-200 p-4 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <XIcon
                className={`h-5 w-5 ${
                  responseAction === 'reject'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-400'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  responseAction === 'reject'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {t.mentorship.request.rejectRequest}
              </span>
            </button>
          </div>

          {responseAction && (
            <div className="space-y-4">
              <div>
                <label htmlFor="responseMessage" className={labelClass}>
                  {responseAction === 'accept'
                    ? t.mentorship.request.acceptanceMessage
                    : t.mentorship.request.rejectionMessage}
                </label>
                <textarea
                  id="responseMessage"
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder={
                    responseAction === 'accept'
                      ? t.mentorship.request.acceptancePlaceholder
                      : t.mentorship.request.rejectionPlaceholder
                  }
                  rows={4}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className={btnOutline}
                  onClick={onCancel}
                  disabled={formState.isSubmitting}
                >
                  {t.common.cancel}
                </button>

                <button
                  type="button"
                  className={responseAction === 'accept' ? btnPrimary : btnDanger}
                  onClick={() => handleRespondToRequest(responseAction)}
                  disabled={formState.isSubmitting || !responseAction}
                >
                  {formState.isSubmitting ? (
                    <>
                      <SpinnerIcon className="h-4 w-4" />
                      {t.common.submitting}
                    </>
                  ) : (
                    <>
                      {responseAction === 'accept' ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <XIcon className="h-4 w-4" />
                      )}
                      {responseAction === 'accept'
                        ? t.mentorship.request.confirmAccept
                        : t.mentorship.request.confirmReject}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // CREATE MODE — Multi-step form
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header + mentor preview */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t.mentorship.request.createTitle}
        </h2>
        {mentor && (
          <div className="mt-3 flex items-center gap-3">
            {renderAvatar(mentor, 'from-primary-500 to-amber-400')}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {mentor.displayName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {mentor.experience.currentPosition} at {mentor.experience.currentCompany}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {renderErrors()}
      {renderSuccess(t.mentorship.request.submitSuccess)}

      {/* Form content */}
      <div className={cardClass}>
        {/* ── Step 1: Introduction & Goals ────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className={sectionHeadingClass}>
                {t.mentorship.request.steps.introduction}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.mentorship.request.introDescription}
              </p>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className={labelClass}>
                {t.mentorship.request.personalMessage} *
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                placeholder={t.mentorship.request.messagePlaceholder}
                rows={5}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {formData.message.length}/500 {t.mentorship.request.characters}
                {formData.message.length < 50 && (
                  <span className="ml-1 text-amber-500">
                    - {t.mentorship.request.minimumCharacters}
                  </span>
                )}
              </p>
            </div>

            {/* Goals */}
            <div>
              <label className={labelClass}>{t.mentorship.request.yourGoals} *</label>

              {formData.goals.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {formData.goals.map((goal, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                    >
                      {goal}
                      <button
                        type="button"
                        onClick={() => removeGoal(goal)}
                        className="ml-0.5 text-primary-400 hover:text-primary-600 dark:text-primary-500 dark:hover:text-primary-300"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.mentorship.request.addGoalPlaceholder}
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addGoal();
                    }
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  className={btnOutline}
                  onClick={addGoal}
                  disabled={!newGoal.trim()}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t.mentorship.request.goalsHelp}
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Preferences ────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className={sectionHeadingClass}>
                {t.mentorship.request.steps.preferences}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.mentorship.request.preferencesDescription}
              </p>
            </div>

            {/* Duration */}
            <div>
              <label className={labelClass}>
                {t.mentorship.request.expectedDuration} *
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, expectedDuration: duration }))
                    }
                    className={
                      formData.expectedDuration === duration
                        ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                    }
                  >
                    {duration}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className={labelClass}>{t.mentorship.request.meetingFrequency}</label>
              <div className="flex flex-wrap gap-2">
                {FREQUENCY_OPTIONS.map((freq) => (
                  <button
                    key={freq.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        meetingFrequency: freq.value as RequestFormData['meetingFrequency'],
                      }))
                    }
                    className={
                      formData.meetingFrequency === freq.value
                        ? 'rounded-full border border-primary-500 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                    }
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Communication preference */}
            <div>
              <label className={labelClass}>
                {t.mentorship.request.communicationPreference}
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {COMMUNICATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        communicationPreference: option.value as RequestFormData['communicationPreference'],
                      }))
                    }
                    className={`flex flex-col items-center gap-2 ${
                      formData.communicationPreference === option.value
                        ? 'cursor-pointer rounded-xl border-2 border-primary-500 bg-primary-50 p-4 dark:border-primary-400 dark:bg-primary-900/20'
                        : 'cursor-pointer rounded-xl border-2 border-gray-200 p-4 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                    }`}
                  >
                    {option.value === 'video' && (
                      <svg className={`h-6 w-6 ${formData.communicationPreference === option.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                    {option.value === 'voice' && (
                      <svg className={`h-6 w-6 ${formData.communicationPreference === option.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    )}
                    {option.value === 'chat' && (
                      <ChatIcon className={`h-6 w-6 ${formData.communicationPreference === option.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
                    )}
                    {option.value === 'in-person' && (
                      <svg className={`h-6 w-6 ${formData.communicationPreference === option.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    <span
                      className={`text-xs font-medium ${
                        formData.communicationPreference === option.value
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Commitment ─────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className={sectionHeadingClass}>
                {t.mentorship.request.steps.commitment}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.mentorship.request.commitmentDescription}
              </p>
            </div>

            <div>
              <label htmlFor="timeCommitment" className={labelClass}>
                {t.mentorship.request.timeCommitment} *
              </label>
              <textarea
                id="timeCommitment"
                value={formData.timeCommitment}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, timeCommitment: e.target.value }))
                }
                placeholder={t.mentorship.request.timeCommitmentPlaceholder}
                rows={3}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="previousExperience" className={labelClass}>
                {t.mentorship.request.previousExperience}
              </label>
              <textarea
                id="previousExperience"
                value={formData.previousExperience}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, previousExperience: e.target.value }))
                }
                placeholder={t.mentorship.request.previousExperiencePlaceholder}
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* ── Step 4: Expectations ───────────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className={sectionHeadingClass}>
                {t.mentorship.request.steps.expectations}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.mentorship.request.expectationsDescription}
              </p>
            </div>

            <div>
              <label htmlFor="expectations" className={labelClass}>
                {t.mentorship.request.expectations} *
              </label>
              <textarea
                id="expectations"
                value={formData.expectations}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, expectations: e.target.value }))
                }
                placeholder={t.mentorship.request.expectationsPlaceholder}
                rows={4}
                className={inputClass}
              />
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                {t.mentorship.request.summary}
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-700 dark:text-gray-300">
                    {t.mentorship.request.goals}:
                  </dt>
                  <dd className="text-gray-600 dark:text-gray-400">
                    {formData.goals.join(', ')}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-700 dark:text-gray-300">
                    {t.mentorship.request.duration}:
                  </dt>
                  <dd className="text-gray-600 dark:text-gray-400">
                    {formData.expectedDuration}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-700 dark:text-gray-300">
                    {t.mentorship.request.frequency}:
                  </dt>
                  <dd className="text-gray-600 dark:text-gray-400">
                    {FREQUENCY_OPTIONS.find((f) => f.value === formData.meetingFrequency)?.label}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-700 dark:text-gray-300">
                    {t.mentorship.request.communication}:
                  </dt>
                  <dd className="text-gray-600 dark:text-gray-400">
                    {COMMUNICATION_OPTIONS.find((c) => c.value === formData.communicationPreference)?.label}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Form navigation */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              className={btnOutline}
              onClick={handlePrevious}
              disabled={formState.isSubmitting}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t.mentorship.request.previous}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className={btnGhost}
            onClick={onCancel}
            disabled={formState.isSubmitting}
          >
            {t.common.cancel}
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              className={btnPrimary}
              onClick={handleNext}
              disabled={formState.isSubmitting}
            >
              {t.mentorship.request.next}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              className={btnPrimary}
              onClick={handleSubmitRequest}
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting ? (
                <>
                  <SpinnerIcon className="h-4 w-4" />
                  {t.common.submitting}
                </>
              ) : (
                <>
                  <PaperPlaneIcon className="h-4 w-4" />
                  {t.mentorship.request.submitRequest}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
