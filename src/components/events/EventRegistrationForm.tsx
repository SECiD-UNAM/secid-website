import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  doc,
  collection,
  addDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CreditCardIcon,
  DocumentCheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface EventDetails {
  id: string;
  title: string;
  description: string;
  type:
    | 'workshop'
    | 'networking'
    | 'career-fair'
    | 'webinar'
    | 'social'
    | 'conference';
  startDate: Date;
  endDate: Date;
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    venue?: string;
    address?: string;
    virtualLink?: string;
    virtualPlatform?: string;
  };
  registrationRequired: boolean;
  registrationFee: number;
  maxAttendees: number;
  currentAttendees: number;
  customQuestions?: Array<{
    id: string;
    question: string;
    type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';
    required: boolean;
    options?: string[];
  }>;
  requiresDietaryInfo: boolean;
  requiresAccessibilityInfo: boolean;
}

interface EventRegistrationData {
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  company?: string;
  position?: string;

  // Event-specific requirements
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;

  // Custom questions responses
  customResponses: Record<string, any>;

  // Terms and conditions
  acceptTerms: boolean;
  acceptPrivacyPolicy: boolean;
  allowMarketing: boolean;

  // Emergency contact (for physical events)
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

interface EventRegistrationFormProps {
  eventId: string;
  lang?: 'es' | 'en';
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const EventRegistrationForm: React.FC<EventRegistrationFormProps> = ({
  eventId,
  lang = 'es',
  isOpen = false,
  onClose,
  onSuccess,
}) => {
  const { user, userProfile } = useAuth();
  const [showModal, setShowModal] = useState(isOpen);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);

  const [registrationData, setRegistrationData] =
    useState<EventRegistrationData>({
      firstName: userProfile?.firstName || '',
      lastName: userProfile?.lastName || '',
      email: user?.email || '',
      phoneNumber: userProfile?.phoneNumber || '',
      company: userProfile?.currentCompany || '',
      position: userProfile?.currentPosition || '',
      dietaryRestrictions: '',
      accessibilityNeeds: '',
      customResponses: {},
      acceptTerms: false,
      acceptPrivacyPolicy: false,
      allowMarketing: false,
      emergencyContactName: '',
      emergencyContactPhone: '',
    });

  const totalSteps = 4; // Personal Info, Event Requirements, Custom Questions, Review & Payment

  useEffect(() => {
    setShowModal(isOpen);
    if (isOpen) {
      fetchEventDetails();
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    // Pre-fill user data when userProfile is available
    if (userProfile && user) {
      setRegistrationData((prev) => ({
        ...prev,
        firstName: userProfile.firstName || prev.firstName,
        lastName: userProfile.lastName || prev.lastName,
        email: user['email'] || prev['email'],
        phoneNumber: userProfile.phoneNumber || prev.phoneNumber,
        company: userProfile.currentCompany || prev.company,
        position: userProfile.currentPosition || prev.position,
      }));
    }
  }, [userProfile, user]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        setEventDetails({
          id: eventDoc['id'],
          ...data,
          startDate: data['startDate']?.toDate() || new Date(),
          endDate: data?.endDate?.toDate() || new Date(),
        } as EventDetails);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError(
        lang === 'es'
          ? 'Error al cargar los detalles del evento'
          : 'Error loading event details'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setShowModal(false);
      setCurrentStep(1);
      setError(null);
      setSuccess(false);
      if (onClose) onClose();
    }
  };

  const validateCurrentStep = (): boolean => {
    setError(null);

    switch (currentStep) {
      case 1: // Personal Information
        if (!registrationData.firstName.trim()) {
          setError(
            lang === 'es' ? 'El nombre es requerido' : 'First name is required'
          );
          return false;
        }
        if (!registrationData.lastName.trim()) {
          setError(
            lang === 'es' ? 'El apellido es requerido' : 'Last name is required'
          );
          return false;
        }
        if (!registrationData['email'].trim()) {
          setError(
            lang === 'es' ? 'El email es requerido' : 'Email is required'
          );
          return false;
        }
        if (!registrationData.phoneNumber.trim()) {
          setError(
            lang === 'es'
              ? 'El teléfono es requerido'
              : 'Phone number is required'
          );
          return false;
        }
        // Validate emergency contact for physical events
        if (eventDetails?.location['type'] === 'physical') {
          if (!registrationData?.emergencyContactName?.trim()) {
            setError(
              lang === 'es'
                ? 'El contacto de emergencia es requerido para eventos presenciales'
                : 'Emergency contact is required for physical events'
            );
            return false;
          }
          if (!registrationData?.emergencyContactPhone?.trim()) {
            setError(
              lang === 'es'
                ? 'El teléfono de contacto de emergencia es requerido'
                : 'Emergency contact phone is required'
            );
            return false;
          }
        }
        break;

      case 2: // Event Requirements
        // No mandatory fields in this step, but we could add validation if needed
        break;

      case 3: // Custom Questions
        if (eventDetails?.customQuestions) {
          for (const question of eventDetails.customQuestions) {
            if (question.required) {
              const response = registrationData.customResponses[question['id']];
              if (
                !response ||
                (typeof response === 'string' && !response.trim())
              ) {
                setError(
                  lang === 'es'
                    ? `Por favor responde: ${question.question}`
                    : `Please answer: ${question.question}`
                );
                return false;
              }
            }
          }
        }
        break;

      case 4: // Review & Terms
        if (!registrationData.acceptTerms) {
          setError(
            lang === 'es'
              ? 'Debes aceptar los términos y condiciones'
              : 'You must accept the terms and conditions'
          );
          return false;
        }
        if (!registrationData.acceptPrivacyPolicy) {
          setError(
            lang === 'es'
              ? 'Debes aceptar la política de privacidad'
              : 'You must accept the privacy policy'
          );
          return false;
        }
        break;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!user || !eventDetails) {
      setError(
        lang === 'es'
          ? 'Debes iniciar sesión para registrarte'
          : 'You must be logged in to register'
      );
      return;
    }

    if (!validateCurrentStep()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create registration document
      const registrationRef = await addDoc(
        collection(db, 'eventRegistrations'),
        {
          eventId,
          userId: user.uid,
          eventTitle: eventDetails.title,
          eventDate: eventDetails.startDate,

          // Personal information
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          email: registrationData['email'],
          phoneNumber: registrationData.phoneNumber,
          company: registrationData.company,
          position: registrationData.position,

          // Event-specific information
          dietaryRestrictions: registrationData.dietaryRestrictions,
          accessibilityNeeds: registrationData.accessibilityNeeds,
          emergencyContactName: registrationData.emergencyContactName,
          emergencyContactPhone: registrationData.emergencyContactPhone,

          // Custom questions responses
          customResponses: registrationData.customResponses,

          // Consent and preferences
          acceptTerms: registrationData.acceptTerms,
          acceptPrivacyPolicy: registrationData.acceptPrivacyPolicy,
          allowMarketing: registrationData.allowMarketing,

          // System fields
          registeredAt: serverTimestamp(),
          status: 'registered',
          attendanceStatus: 'registered',
          paymentStatus:
            eventDetails.registrationFee > 0 ? 'pending' : 'not_required',
          paymentAmount: eventDetails.registrationFee,

          // User profile snapshot
          userProfile: {
            displayName:
              userProfile?.displayName ||
              `${registrationData.firstName} ${registrationData.lastName}`,
            membershipTier: userProfile?.membershipTier || 'free',
            graduationYear: userProfile?.graduationYear,
            program: userProfile?.program,
          },
        }
      );

      // Add to event's registrations subcollection for easier queries
      await addDoc(collection(db, 'events', eventId, 'registrations'), {
        userId: user.uid,
        registrationId: registrationRef['id'],
        userName: `${registrationData.firstName} ${registrationData.lastName}`,
        userEmail: registrationData['email'],
        registeredAt: serverTimestamp(),
        attendanceStatus: 'registered',
      });

      // Update event's current attendees count
      await updateDoc(doc(db, 'events', eventId), {
        currentAttendees: increment(1),
      });

      // Add to user's registered events
      if (userProfile) {
        await addDoc(collection(db, 'users', user.uid, 'registeredEvents'), {
          eventId,
          eventTitle: eventDetails.title,
          eventDate: eventDetails.startDate,
          registrationId: registrationRef['id'],
          registeredAt: serverTimestamp(),
          status: 'registered',
        });
      }

      setSuccess(true);

      // Call success callback after a delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
        // Reload to update the event details
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error submitting registration:', error);
      setError(
        lang === 'es'
          ? 'Error al enviar el registro. Por favor intenta de nuevo.'
          : 'Error submitting registration. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderCustomQuestion = (question: any) => {
    const value = registrationData.customResponses[question['id']] || '';

    const updateCustomResponse = (value: any) => {
      setRegistrationData((prev) => ({
        ...prev,
        customResponses: {
          ...prev.customResponses,
          [question['id']]: value,
        },
      }));
    };

    switch (question['type']) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateCustomResponse(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required={question.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => updateCustomResponse(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required={question.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateCustomResponse(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required={question.required}
          >
            <option value="">
              {lang === 'es' ? 'Selecciona una opción' : 'Select an option'}
            </option>
            {question?.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {question?.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={question['id']}
                  value={option}
                  checked={value === option}
                  onChange={(e) => updateCustomResponse(e.target.value)}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                  required={question.required}
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        const checkboxValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {question?.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={checkboxValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...checkboxValues, option]
                      : checkboxValues.filter((v: string) => v !== option);
                    updateCustomResponse(newValues);
                  }}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (!showModal) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"></div>
          <div className="my-8 inline-block w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all dark:bg-gray-800">
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
              <p className="text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Cargando...' : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="my-8 inline-block w-full max-w-3xl transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all dark:bg-gray-800">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Registro al evento' : 'Event Registration'}
                </h3>
                {eventDetails && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {eventDetails.title}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                disabled={submitting}
                className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Progress indicator */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`
                      flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
                      ${
                        currentStep >= step
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }
                    `}
                    >
                      {step}
                    </div>
                    {step < 4 && (
                      <div
                        className={`
                        mx-2 h-1 w-full
                        ${
                          currentStep > step
                            ? 'bg-primary-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }
                      `}
                        style={{ width: '80px' }}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{lang === 'es' ? 'Personal' : 'Personal'}</span>
                <span>{lang === 'es' ? 'Evento' : 'Event'}</span>
                <span>{lang === 'es' ? 'Preguntas' : 'Questions'}</span>
                <span>{lang === 'es' ? 'Revisar' : 'Review'}</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto px-6 py-4">
            {success ? (
              <div className="py-8 text-center">
                <CheckCircleIcon className="mx-auto mb-4 h-16 w-16 text-green-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  {lang === 'es'
                    ? '¡Registro completado exitosamente!'
                    : 'Registration completed successfully!'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es'
                    ? 'Te enviaremos más detalles del evento por email.'
                    : 'We will send you more event details via email.'}
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center">
                      <ExclamationCircleIcon className="mr-2 h-5 w-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          <UserIcon className="mr-1 inline h-4 w-4" />
                          {lang === 'es' ? 'Nombre' : 'First Name'} *
                        </label>
                        <input
                          type="text"
                          value={registrationData.firstName}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          <UserIcon className="mr-1 inline h-4 w-4" />
                          {lang === 'es' ? 'Apellido' : 'Last Name'} *
                        </label>
                        <input
                          type="text"
                          value={registrationData.lastName}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <EnvelopeIcon className="mr-1 inline h-4 w-4" />
                        {lang === 'es' ? 'Correo electrónico' : 'Email'} *
                      </label>
                      <input
                        type="email"
                        value={registrationData['email']}
                        onChange={(e) =>
                          setRegistrationData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <PhoneIcon className="mr-1 inline h-4 w-4" />
                        {lang === 'es' ? 'Teléfono' : 'Phone Number'} *
                      </label>
                      <input
                        type="tel"
                        value={registrationData.phoneNumber}
                        onChange={(e) =>
                          setRegistrationData((prev) => ({
                            ...prev,
                            phoneNumber: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="+52 55 1234 5678"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {lang === 'es'
                            ? 'Empresa (opcional)'
                            : 'Company (optional)'}
                        </label>
                        <input
                          type="text"
                          value={registrationData.company}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              company: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {lang === 'es'
                            ? 'Posición (opcional)'
                            : 'Position (optional)'}
                        </label>
                        <input
                          type="text"
                          value={registrationData.position}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              position: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Emergency contact for physical events */}
                    {eventDetails?.location['type'] === 'physical' && (
                      <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                        <h4 className="mb-3 font-medium text-yellow-900 dark:text-yellow-100">
                          {lang === 'es'
                            ? 'Contacto de emergencia'
                            : 'Emergency Contact'}
                        </h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-yellow-700 dark:text-yellow-300">
                              {lang === 'es' ? 'Nombre completo' : 'Full Name'}{' '}
                              *
                            </label>
                            <input
                              type="text"
                              value={registrationData.emergencyContactName}
                              onChange={(e) =>
                                setRegistrationData((prev) => ({
                                  ...prev,
                                  emergencyContactName: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-yellow-500 dark:border-yellow-600 dark:bg-gray-700 dark:text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-yellow-700 dark:text-yellow-300">
                              {lang === 'es' ? 'Teléfono' : 'Phone Number'} *
                            </label>
                            <input
                              type="tel"
                              value={registrationData.emergencyContactPhone}
                              onChange={(e) =>
                                setRegistrationData((prev) => ({
                                  ...prev,
                                  emergencyContactPhone: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-yellow-500 dark:border-yellow-600 dark:bg-gray-700 dark:text-white"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Event Requirements */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {eventDetails?.requiresDietaryInfo && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {lang === 'es'
                            ? 'Restricciones dietéticas o alergias'
                            : 'Dietary restrictions or allergies'}
                        </label>
                        <textarea
                          value={registrationData.dietaryRestrictions}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              dietaryRestrictions: e.target.value,
                            }))
                          }
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder={
                            lang === 'es'
                              ? 'Describe cualquier restricción dietética, alergia o preferencia alimentaria...'
                              : 'Describe any dietary restrictions, allergies, or food preferences...'
                          }
                        />
                      </div>
                    )}

                    {eventDetails?.requiresAccessibilityInfo && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {lang === 'es'
                            ? 'Necesidades de accesibilidad'
                            : 'Accessibility needs'}
                        </label>
                        <textarea
                          value={registrationData.accessibilityNeeds}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              accessibilityNeeds: e.target.value,
                            }))
                          }
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder={
                            lang === 'es'
                              ? 'Describe cualquier necesidad de accesibilidad que tengas...'
                              : 'Describe any accessibility needs you have...'
                          }
                        />
                      </div>
                    )}

                    {!eventDetails?.requiresDietaryInfo &&
                      !eventDetails?.requiresAccessibilityInfo && (
                        <div className="py-8 text-center">
                          <CheckCircleIcon className="mx-auto mb-4 h-12 w-12 text-green-500" />
                          <p className="text-gray-600 dark:text-gray-400">
                            {lang === 'es'
                              ? 'No se requiere información adicional para este evento.'
                              : 'No additional information required for this event.'}
                          </p>
                        </div>
                      )}

                    {/* Event information summary */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                      <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
                        {lang === 'es'
                          ? 'Detalles del evento'
                          : 'Event Details'}
                      </h4>
                      <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                        <div className="flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {eventDetails?.startDate.toLocaleDateString(
                            lang === 'es' ? 'es-MX' : 'en-US',
                            {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="mr-2 h-4 w-4" />
                          {eventDetails?.startDate.toLocaleTimeString(
                            lang === 'es' ? 'es-MX' : 'en-US',
                            {
                              hour: 'numeric',
                              minute: '2-digit',
                            }
                          )}
                        </div>
                        <div className="flex items-center">
                          <MapPinIcon className="mr-2 h-4 w-4" />
                          {eventDetails?.location['type'] === 'virtual'
                            ? lang === 'es'
                              ? 'Evento Virtual'
                              : 'Virtual Event'
                            : eventDetails?.location.venue}
                        </div>
                        {eventDetails?.registrationFee &&
                          eventDetails.registrationFee > 0 && (
                            <div className="flex items-center">
                              <CurrencyDollarIcon className="mr-2 h-4 w-4" />$
                              {eventDetails.registrationFee} MXN
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Custom Questions */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    {eventDetails?.customQuestions &&
                    eventDetails.customQuestions.length > 0 ? (
                      <>
                        <div className="mb-4">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {lang === 'es'
                              ? 'Preguntas adicionales'
                              : 'Additional Questions'}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {lang === 'es'
                              ? 'Por favor responde las siguientes preguntas del organizador'
                              : 'Please answer the following questions from the organizer'}
                          </p>
                        </div>

                        {eventDetails.customQuestions.map((question) => (
                          <div key={question['id']}>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              {question.question}
                              {question.required && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </label>
                            {renderCustomQuestion(question)}
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <DocumentCheckIcon className="mx-auto mb-4 h-12 w-12 text-green-500" />
                        <p className="text-gray-600 dark:text-gray-400">
                          {lang === 'es'
                            ? 'No hay preguntas adicionales para este evento.'
                            : 'No additional questions for this event.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Review & Terms */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    {/* Registration Summary */}
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
                        {lang === 'es'
                          ? 'Resumen del registro'
                          : 'Registration Summary'}
                      </h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {lang === 'es' ? 'Nombre' : 'Name'}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {registrationData.firstName}{' '}
                            {registrationData.lastName}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Email
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {registrationData['email']}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {lang === 'es' ? 'Teléfono' : 'Phone'}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {registrationData.phoneNumber}
                          </span>
                        </div>

                        {eventDetails?.registrationFee &&
                          eventDetails.registrationFee > 0 && (
                            <div className="flex justify-between border-t border-gray-200 pt-2 font-medium dark:border-gray-600">
                              <span className="text-gray-600 dark:text-gray-400">
                                {lang === 'es'
                                  ? 'Costo del evento'
                                  : 'Event Fee'}
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                ${eventDetails.registrationFee} MXN
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Payment Information */}
                    {eventDetails?.registrationFee &&
                      eventDetails.registrationFee > 0 && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                          <div className="flex">
                            <CreditCardIcon className="mr-2 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                            <div className="text-sm">
                              <p className="mb-1 font-medium text-yellow-900 dark:text-yellow-100">
                                {lang === 'es'
                                  ? 'Información de pago'
                                  : 'Payment Information'}
                              </p>
                              <p className="text-yellow-700 dark:text-yellow-300">
                                {lang === 'es'
                                  ? 'Después del registro, recibirás instrucciones de pago por email.'
                                  : 'After registration, you will receive payment instructions via email.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Terms and Conditions */}
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="acceptTerms"
                          checked={registrationData.acceptTerms}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              acceptTerms: e.target.checked,
                            }))
                          }
                          className="mr-3 mt-1 text-primary-600 focus:ring-primary-500"
                          required
                        />
                        <label
                          htmlFor="acceptTerms"
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          {lang === 'es'
                            ? 'Acepto los términos y condiciones del evento'
                            : 'I accept the event terms and conditions'}{' '}
                          *
                        </label>
                      </div>

                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="acceptPrivacy"
                          checked={registrationData.acceptPrivacyPolicy}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              acceptPrivacyPolicy: e.target.checked,
                            }))
                          }
                          className="mr-3 mt-1 text-primary-600 focus:ring-primary-500"
                          required
                        />
                        <label
                          htmlFor="acceptPrivacy"
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          {lang === 'es'
                            ? 'Acepto la política de privacidad'
                            : 'I accept the privacy policy'}{' '}
                          *
                        </label>
                      </div>

                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="allowMarketing"
                          checked={registrationData.allowMarketing}
                          onChange={(e) =>
                            setRegistrationData((prev) => ({
                              ...prev,
                              allowMarketing: e.target.checked,
                            }))
                          }
                          className="mr-3 mt-1 text-primary-600 focus:ring-primary-500"
                        />
                        <label
                          htmlFor="allowMarketing"
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          {lang === 'es'
                            ? 'Acepto recibir información sobre futuros eventos y oportunidades'
                            : 'I agree to receive information about future events and opportunities'}
                        </label>
                      </div>
                    </div>

                    <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
                      <div className="flex">
                        <SparklesIcon className="mr-2 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
                        <div className="text-sm">
                          <p className="mb-1 font-medium text-primary-900 dark:text-primary-100">
                            {lang === 'es' ? '¡Casi listo!' : 'Almost there!'}
                          </p>
                          <p className="text-primary-700 dark:text-primary-300">
                            {lang === 'es'
                              ? 'Revisa tu información y confirma tu registro para el evento.'
                              : 'Review your information and confirm your registration for the event.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <div className="flex justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || submitting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {lang === 'es' ? 'Anterior' : 'Previous'}
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={handleClose}
                    disabled={submitting}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>

                  {currentStep < totalSteps ? (
                    <button
                      onClick={handleNext}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    >
                      {lang === 'es' ? 'Siguiente' : 'Next'}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <svg
                            className="-ml-1 mr-2 h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            ></path>
                          </svg>
                          {lang === 'es' ? 'Registrando...' : 'Registering...'}
                        </>
                      ) : (
                        <>
                          <UserGroupIcon className="mr-2 h-4 w-4" />
                          {lang === 'es'
                            ? 'Confirmar registro'
                            : 'Confirm registration'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventRegistrationForm;
