import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  doc,
  collection,
  addDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import {
  XMarkIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperClipIcon,
  LinkIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface JobApplicationModalProps {
  jobId: string;
  lang?: 'es' | 'en';
  isOpen?: boolean;
  onClose?: () => void;
}

interface ApplicationData {
  coverLetter: string;
  resumeUrl?: string;
  resumeFile?: File;
  phoneNumber: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  expectedSalary?: string;
  availabilityDate?: string;
  yearsOfExperience: string;
  educationLevel: string;
  additionalInfo?: string;
  questionsForEmployer?: string;
}

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  jobId,
  lang = 'es',
  isOpen = false,
  onClose,
}) => {
  const { user, userProfile } = useAuth();
  const [showModal, setShowModal] = useState(isOpen);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);

  const [applicationData, setApplicationData] = useState<ApplicationData>({
    coverLetter: '',
    phoneNumber: userProfile?.phoneNumber || '',
    linkedinUrl: userProfile?.linkedinUrl || '',
    githubUrl: userProfile?.githubUrl || '',
    portfolioUrl: userProfile?.portfolioUrl || '',
    expectedSalary: '',
    availabilityDate: '',
    yearsOfExperience: '',
    educationLevel: '',
    additionalInfo: '',
    questionsForEmployer: '',
  });

  const totalSteps = 4;

  useEffect(() => {
    setShowModal(isOpen);
    if (isOpen) {
      fetchJobDetails();
    }
  }, [isOpen, jobId]);

  const fetchJobDetails = async () => {
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      if (jobDoc.exists()) {
        setJobDetails({ id: jobDoc['id'], ...jobDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
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

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file['type'])) {
      setError(
        lang === 'es'
          ? 'Por favor sube un archivo PDF o Word'
          : 'Please upload a PDF or Word document'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      setError(
        lang === 'es'
          ? 'El archivo no debe exceder 5MB'
          : 'File size should not exceed 5MB'
      );
      return;
    }

    setApplicationData((prev) => ({ ...prev, resumeFile: file }));
    setError(null);
  };

  const uploadResumeToStorage = async (): Promise<string | undefined> => {
    if (!applicationData.resumeFile || !user) return undefined;

    setUploadingResume(true);
    try {
      const timestamp = Date.now();
      const fileName = `resumes/${user.uid}/${timestamp}-${applicationData.resumeFile['name']}`;
      const storageRef = ref(storage, fileName);

      const snapshot = await uploadBytes(
        storageRef,
        applicationData.resumeFile
      );
      const downloadUrl = await getDownloadURL(snapshot['ref']);

      return downloadUrl;
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw error;
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !userProfile) {
      setError(
        lang === 'es'
          ? 'Debes iniciar sesión para aplicar'
          : 'You must be logged in to apply'
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload resume if provided
      let resumeUrl = applicationData.resumeUrl;
      if (applicationData.resumeFile) {
        resumeUrl = await uploadResumeToStorage();
      }

      // Create application document
      const applicationRef = await addDoc(
        collection(db, 'jobs', jobId, 'applications'),
        {
          applicantId: user.uid,
          applicantName: userProfile.displayName || user['email'],
          applicantEmail: user['email'],
          applicantProfile: {
            skills: userProfile.skills || [],
            experience: userProfile.experience || [],
            education: userProfile.education || [],
          },
          coverLetter: applicationData.coverLetter,
          resumeUrl,
          phoneNumber: applicationData.phoneNumber,
          linkedinUrl: applicationData.linkedinUrl,
          githubUrl: applicationData.githubUrl,
          portfolioUrl: applicationData.portfolioUrl,
          expectedSalary: applicationData.expectedSalary,
          availabilityDate: applicationData.availabilityDate,
          yearsOfExperience: applicationData.yearsOfExperience,
          educationLevel: applicationData.educationLevel,
          additionalInfo: applicationData.additionalInfo,
          questionsForEmployer: applicationData.questionsForEmployer,
          appliedAt: serverTimestamp(),
          status: 'pending',
          viewed: false,
          shortlisted: false,
          rejected: false,
        }
      );

      // Also add to user's applications collection
      await addDoc(collection(db, 'users', user.uid, 'applications'), {
        jobId,
        jobTitle: jobDetails?.title,
        company: jobDetails?.company,
        applicationId: applicationRef['id'],
        appliedAt: serverTimestamp(),
        status: 'pending',
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        // Reload page to update application status
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error submitting application:', error);
      setError(
        lang === 'es'
          ? 'Error al enviar la aplicación. Por favor intenta de nuevo.'
          : 'Error submitting application. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!applicationData.coverLetter.trim()) {
          setError(
            lang === 'es'
              ? 'Por favor escribe una carta de presentación'
              : 'Please write a cover letter'
          );
          return false;
        }
        if (applicationData.coverLetter.length < 100) {
          setError(
            lang === 'es'
              ? 'La carta de presentación debe tener al menos 100 caracteres'
              : 'Cover letter must be at least 100 characters'
          );
          return false;
        }
        break;
      case 2:
        if (!applicationData.phoneNumber) {
          setError(
            lang === 'es'
              ? 'Por favor proporciona tu número de teléfono'
              : 'Please provide your phone number'
          );
          return false;
        }
        break;
      case 3:
        if (
          !applicationData.yearsOfExperience ||
          !applicationData.educationLevel
        ) {
          setError(
            lang === 'es'
              ? 'Por favor completa todos los campos requeridos'
              : 'Please complete all required fields'
          );
          return false;
        }
        break;
    }
    setError(null);
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

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="my-8 inline-block w-full max-w-2xl transform overflow-hidden rounded-xl bg-white text-left align-middle shadow-xl transition-all dark:bg-gray-800">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Aplicar al empleo' : 'Apply for job'}
                </h3>
                {jobDetails && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {jobDetails.title} - {jobDetails.company}
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
                        style={{ width: '100px' }}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{lang === 'es' ? 'Carta' : 'Letter'}</span>
                <span>{lang === 'es' ? 'Contacto' : 'Contact'}</span>
                <span>{lang === 'es' ? 'Experiencia' : 'Experience'}</span>
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
                    ? '¡Aplicación enviada exitosamente!'
                    : 'Application submitted successfully!'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es'
                    ? 'Te notificaremos cuando el empleador revise tu aplicación.'
                    : "We'll notify you when the employer reviews your application."}
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

                {/* Step 1: Cover Letter */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {lang === 'es'
                          ? 'Carta de presentación'
                          : 'Cover Letter'}{' '}
                        *
                      </label>
                      <textarea
                        value={applicationData.coverLetter}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            coverLetter: e.target.value,
                          }))
                        }
                        rows={8}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder={
                          lang === 'es'
                            ? 'Explica por qué eres el candidato ideal para este puesto...'
                            : "Explain why you're the ideal candidate for this position..."
                        }
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {applicationData.coverLetter.length}/2000{' '}
                        {lang === 'es' ? 'caracteres' : 'characters'}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {lang === 'es' ? 'CV/Resume' : 'Resume/CV'}
                      </label>
                      <div className="flex w-full items-center justify-center">
                        <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
                          <div className="flex flex-col items-center justify-center pb-6 pt-5">
                            {applicationData.resumeFile ? (
                              <>
                                <DocumentIcon className="mb-2 h-10 w-10 text-primary-600 dark:text-primary-400" />
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {applicationData.resumeFile['name']}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(
                                    applicationData.resumeFile.size / 1024
                                  ).toFixed(1)}{' '}
                                  KB
                                </p>
                              </>
                            ) : (
                              <>
                                <CloudArrowUpIcon className="mb-2 h-10 w-10 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold">
                                    {lang === 'es'
                                      ? 'Click para subir'
                                      : 'Click to upload'}
                                  </span>{' '}
                                  {lang === 'es'
                                    ? 'o arrastra y suelta'
                                    : 'or drag and drop'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  PDF, DOC, DOCX (MAX. 5MB)
                                </p>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            onChange={handleResumeUpload}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Contact Information */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <PhoneIcon className="mr-1 inline h-4 w-4" />
                        {lang === 'es' ? 'Teléfono' : 'Phone'} *
                      </label>
                      <input
                        type="tel"
                        value={applicationData.phoneNumber}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            phoneNumber: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="+52 55 1234 5678"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <LinkIcon className="mr-1 inline h-4 w-4" />
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        value={applicationData.linkedinUrl}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            linkedinUrl: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <LinkIcon className="mr-1 inline h-4 w-4" />
                        GitHub
                      </label>
                      <input
                        type="url"
                        value={applicationData.githubUrl}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            githubUrl: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="https://github.com/username"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <LinkIcon className="mr-1 inline h-4 w-4" />
                        {lang === 'es' ? 'Portafolio' : 'Portfolio'}
                      </label>
                      <input
                        type="url"
                        value={applicationData.portfolioUrl}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            portfolioUrl: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="https://portfolio.com"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Experience & Education */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <BriefcaseIcon className="mr-1 inline h-4 w-4" />
                        {lang === 'es'
                          ? 'Años de experiencia'
                          : 'Years of experience'}{' '}
                        *
                      </label>
                      <select
                        value={applicationData.yearsOfExperience}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            yearsOfExperience: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">
                          {lang === 'es' ? 'Selecciona...' : 'Select...'}
                        </option>
                        <option value="0-1">
                          {lang === 'es'
                            ? 'Menos de 1 año'
                            : 'Less than 1 year'}
                        </option>
                        <option value="1-3">
                          1-3 {lang === 'es' ? 'años' : 'years'}
                        </option>
                        <option value="3-5">
                          3-5 {lang === 'es' ? 'años' : 'years'}
                        </option>
                        <option value="5-10">
                          5-10 {lang === 'es' ? 'años' : 'years'}
                        </option>
                        <option value="10+">
                          {lang === 'es'
                            ? 'Más de 10 años'
                            : 'More than 10 years'}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <AcademicCapIcon className="mr-1 inline h-4 w-4" />
                        {lang === 'es'
                          ? 'Nivel de estudios'
                          : 'Education level'}{' '}
                        *
                      </label>
                      <select
                        value={applicationData.educationLevel}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            educationLevel: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">
                          {lang === 'es' ? 'Selecciona...' : 'Select...'}
                        </option>
                        <option value="high-school">
                          {lang === 'es' ? 'Preparatoria' : 'High School'}
                        </option>
                        <option value="bachelor">
                          {lang === 'es' ? 'Licenciatura' : "Bachelor's Degree"}
                        </option>
                        <option value="master">
                          {lang === 'es' ? 'Maestría' : "Master's Degree"}
                        </option>
                        <option value="phd">
                          {lang === 'es' ? 'Doctorado' : 'PhD'}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {lang === 'es'
                          ? 'Expectativa salarial (mensual)'
                          : 'Expected salary (monthly)'}
                      </label>
                      <input
                        type="text"
                        value={applicationData.expectedSalary}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            expectedSalary: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder={
                          lang === 'es'
                            ? 'Ej: $30,000 - $40,000 MXN'
                            : 'Ex: $30,000 - $40,000 MXN'
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {lang === 'es'
                          ? 'Disponibilidad para iniciar'
                          : 'Availability to start'}
                      </label>
                      <input
                        type="date"
                        value={applicationData.availabilityDate}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            availabilityDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {lang === 'es'
                          ? 'Información adicional'
                          : 'Additional information'}
                      </label>
                      <textarea
                        value={applicationData.additionalInfo}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            additionalInfo: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder={
                          lang === 'es'
                            ? 'Certificaciones, logros, proyectos relevantes...'
                            : 'Certifications, achievements, relevant projects...'
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
                        {lang === 'es'
                          ? 'Resumen de tu aplicación'
                          : 'Application summary'}
                      </h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {lang === 'es'
                              ? 'Carta de presentación'
                              : 'Cover letter'}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            <CheckCircleIcon className="inline h-4 w-4 text-green-500" />
                          </span>
                        </div>

                        {applicationData.resumeFile && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              CV/Resume
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {applicationData.resumeFile['name']}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {lang === 'es' ? 'Teléfono' : 'Phone'}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {applicationData.phoneNumber}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {lang === 'es' ? 'Experiencia' : 'Experience'}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {applicationData.yearsOfExperience}{' '}
                            {lang === 'es' ? 'años' : 'years'}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {lang === 'es' ? 'Educación' : 'Education'}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {applicationData.educationLevel}
                          </span>
                        </div>

                        {applicationData.expectedSalary && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              {lang === 'es'
                                ? 'Expectativa salarial'
                                : 'Expected salary'}
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {applicationData.expectedSalary}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {lang === 'es'
                          ? 'Preguntas para el empleador (opcional)'
                          : 'Questions for the employer (optional)'}
                      </label>
                      <textarea
                        value={applicationData.questionsForEmployer}
                        onChange={(e) =>
                          setApplicationData((prev) => ({
                            ...prev,
                            questionsForEmployer: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder={
                          lang === 'es'
                            ? '¿Tienes alguna pregunta sobre el puesto o la empresa?'
                            : 'Do you have any questions about the position or company?'
                        }
                      />
                    </div>

                    <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
                      <div className="flex">
                        <SparklesIcon className="mr-2 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
                        <div className="text-sm">
                          <p className="mb-1 font-medium text-primary-900 dark:text-primary-100">
                            {lang === 'es'
                              ? 'Tip de aplicación'
                              : 'Application tip'}
                          </p>
                          <p className="text-primary-700 dark:text-primary-300">
                            {lang === 'es'
                              ? 'Las aplicaciones con cartas de presentación personalizadas tienen 3x más probabilidades de recibir respuesta.'
                              : 'Applications with personalized cover letters are 3x more likely to receive a response.'}
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
                      disabled={submitting || uploadingResume}
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
                          {lang === 'es' ? 'Enviando...' : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          {lang === 'es'
                            ? 'Enviar aplicación'
                            : 'Submit application'}
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

export default JobApplicationModal;
