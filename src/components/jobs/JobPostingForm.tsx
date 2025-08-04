import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import {
  BriefcaseIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface JobPostingFormProps {
  lang?: 'es' | 'en';
}

interface JobFormData {
  title: string;
  company: string;
  companyDescription: string;
  location: string;
  locationType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  tags: string[];
  applicationMethod: 'platform' | 'external' | 'email';
  applicationUrl: string;
  applicationEmail: string;
  applicationDeadline: string;
  featured: boolean;
}

export const JobPostingForm: React.FC<JobPostingFormProps> = ({
  lang = 'es',
}) => {
  const { user, userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    company: userProfile?.company || '',
    companyDescription: '',
    location: '',
    locationType: 'onsite',
    employmentType: 'full-time',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'MXN',
    salaryPeriod: 'monthly',
    description: '',
    requirements: [''],
    responsibilities: [''],
    benefits: [''],
    tags: [],
    applicationMethod: 'platform',
    applicationUrl: '',
    applicationEmail: '',
    applicationDeadline: '',
    featured: false,
  });

  const [currentTag, setCurrentTag] = useState('');
  const totalSteps = 5;

  const suggestedTags = [
    'python',
    'r',
    'sql',
    'machine-learning',
    'deep-learning',
    'tensorflow',
    'pytorch',
    'scikit-learn',
    'pandas',
    'numpy',
    'data-visualization',
    'tableau',
    'power-bi',
    'aws',
    'azure',
    'gcp',
    'docker',
    'kubernetes',
    'spark',
    'hadoop',
    'etl',
    'data-engineering',
    'statistics',
    'nlp',
    'computer-vision',
    'junior',
    'senior',
    'lead',
    'manager',
  ];

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.title || !formData.company || !formData.location) {
          setError(
            lang === 'es'
              ? 'Por favor completa todos los campos requeridos'
              : 'Please complete all required fields'
          );
          return false;
        }
        break;
      case 2:
        if (!formData['description'] || formData['description'].length < 100) {
          setError(
            lang === 'es'
              ? 'La descripción debe tener al menos 100 caracteres'
              : 'Description must be at least 100 characters'
          );
          return false;
        }
        break;
      case 3:
        const validRequirements = formData.requirements.filter(
          (r) => r.trim() !== ''
        );
        if (validRequirements.length < 3) {
          setError(
            lang === 'es'
              ? 'Por favor agrega al menos 3 requisitos'
              : 'Please add at least 3 requirements'
          );
          return false;
        }
        break;
      case 4:
        if (
          formData.applicationMethod === 'external' &&
          !formData.applicationUrl
        ) {
          setError(
            lang === 'es'
              ? 'Por favor proporciona la URL de aplicación'
              : 'Please provide the application URL'
          );
          return false;
        }
        if (
          formData.applicationMethod === 'email' &&
          !formData.applicationEmail
        ) {
          setError(
            lang === 'es'
              ? 'Por favor proporciona el email de aplicación'
              : 'Please provide the application email'
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

  const handleArrayFieldAdd = (
    field: 'requirements' | 'responsibilities' | 'benefits'
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const handleArrayFieldRemove = (
    field: 'requirements' | 'responsibilities' | 'benefits',
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleArrayFieldChange = (
    field: 'requirements' | 'responsibilities' | 'benefits',
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleAddTag = () => {
    if (
      currentTag.trim() &&
      !formData.tags.includes(currentTag.trim().toLowerCase())
    ) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim().toLowerCase()],
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async () => {
    if (!user) {
      setError(
        lang === 'es'
          ? 'Debes iniciar sesión para publicar un empleo'
          : 'You must be logged in to post a job'
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Clean up array fields
      const cleanedData = {
        ...formData,
        requirements: formData.requirements.filter((r) => r.trim() !== ''),
        responsibilities: formData.responsibilities.filter(
          (r) => r.trim() !== ''
        ),
        benefits: formData.benefits.filter((b) => b.trim() !== ''),
      };

      // Create job document
      const jobData = {
        title: cleanedData.title,
        company: cleanedData.company,
        companyDescription: cleanedData.companyDescription,
        location: cleanedData.location,
        locationType: cleanedData.locationType,
        employmentType: cleanedData.employmentType,
        salaryRange:
          cleanedData.salaryMin && cleanedData.salaryMax
            ? {
                min: parseFloat(cleanedData.salaryMin),
                max: parseFloat(cleanedData.salaryMax),
                currency: cleanedData.salaryCurrency,
                period: cleanedData.salaryPeriod,
              }
            : null,
        description: cleanedData.description,
        requirements: cleanedData.requirements,
        responsibilities: cleanedData.responsibilities,
        benefits: cleanedData.benefits,
        tags: cleanedData.tags,
        applicationMethod: cleanedData.applicationMethod,
        applicationUrl: cleanedData.applicationUrl || null,
        applicationEmail: cleanedData.applicationEmail || null,
        applicationDeadline: cleanedData.applicationDeadline
          ? new Date(cleanedData.applicationDeadline)
          : null,
        featured: cleanedData.featured,
        postedBy: user.uid,
        postedByName: userProfile?.displayName || user['email'],
        postedAt: serverTimestamp(),
        status: 'pending', // Needs admin approval
        isApproved: false,
        applicationCount: 0,
        viewCount: 0,
      };

      const docRef = await addDoc(collection(db, 'jobs'), jobData);
      setJobId(docRef['id']);
      setSuccess(true);
    } catch (error) {
      console.error('Error posting job:', error);
      setError(
        lang === 'es'
          ? 'Error al publicar el empleo. Por favor intenta de nuevo.'
          : 'Error posting job. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <CheckCircleIcon className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          {lang === 'es'
            ? '¡Empleo publicado exitosamente!'
            : 'Job posted successfully!'}
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Tu empleo será revisado por nuestro equipo y publicado pronto.'
            : 'Your job will be reviewed by our team and published soon.'}
        </p>
        <div className="space-y-2">
          <a
            href={`/${lang}/dashboard/jobs`}
            className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
          >
            {lang === 'es' ? 'Ver bolsa de trabajo' : 'View job board'}
          </a>
          <br />
          <button
            onClick={() => {
              setSuccess(false);
              setCurrentStep(1);
              setFormData({
                title: '',
                company: userProfile?.company || '',
                companyDescription: '',
                location: '',
                locationType: 'onsite',
                employmentType: 'full-time',
                salaryMin: '',
                salaryMax: '',
                salaryCurrency: 'MXN',
                salaryPeriod: 'monthly',
                description: '',
                requirements: [''],
                responsibilities: [''],
                benefits: [''],
                tags: [],
                applicationMethod: 'platform',
                applicationUrl: '',
                applicationEmail: '',
                applicationDeadline: '',
                featured: false,
              });
            }}
            className="text-primary-600 hover:underline dark:text-primary-400"
          >
            {lang === 'es' ? 'Publicar otro empleo' : 'Post another job'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Publicar un empleo' : 'Post a job'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Encuentra el mejor talento en ciencia de datos para tu empresa'
            : 'Find the best data science talent for your company'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            {
              num: 1,
              label: lang === 'es' ? 'Información básica' : 'Basic info',
            },
            { num: 2, label: lang === 'es' ? 'Descripción' : 'Description' },
            { num: 3, label: lang === 'es' ? 'Requisitos' : 'Requirements' },
            { num: 4, label: lang === 'es' ? 'Aplicación' : 'Application' },
            { num: 5, label: lang === 'es' ? 'Revisar' : 'Review' },
          ].map((step, index) => (
            <div key={step.num} className="flex items-center">
              <div
                className={`
                flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium
                ${
                  currentStep >= step.num
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }
              `}
              >
                {step.num}
              </div>
              <div className="ml-2 mr-4 hidden md:block">
                <p
                  className={`text-xs ${currentStep >= step.num ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {step.label}
                </p>
              </div>
              {index < 4 && (
                <div
                  className={`
                  h-1 w-12 md:w-20
                  ${
                    currentStep > step.num
                      ? 'bg-primary-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }
                `}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center">
              <ExclamationCircleIcon className="mr-2 h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Título del puesto' : 'Job title'} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={
                  lang === 'es'
                    ? 'Ej: Data Scientist Senior'
                    : 'Ex: Senior Data Scientist'
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Empresa' : 'Company'} *
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Ubicación' : 'Location'} *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={
                    lang === 'es'
                      ? 'Ciudad de México, CDMX'
                      : 'Mexico City, CDMX'
                  }
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es'
                  ? 'Descripción de la empresa'
                  : 'Company description'}
              </label>
              <textarea
                value={formData.companyDescription}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    companyDescription: e.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={
                  lang === 'es'
                    ? 'Breve descripción de tu empresa...'
                    : 'Brief description of your company...'
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Tipo de ubicación' : 'Location type'} *
                </label>
                <select
                  value={formData.locationType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      locationType: e.target.value as any,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="onsite">
                    {lang === 'es' ? 'Presencial' : 'On-site'}
                  </option>
                  <option value="hybrid">
                    {lang === 'es' ? 'Híbrido' : 'Hybrid'}
                  </option>
                  <option value="remote">
                    {lang === 'es' ? 'Remoto' : 'Remote'}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Tipo de empleo' : 'Employment type'} *
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      employmentType: e.target.value as any,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="full-time">
                    {lang === 'es' ? 'Tiempo completo' : 'Full-time'}
                  </option>
                  <option value="part-time">
                    {lang === 'es' ? 'Medio tiempo' : 'Part-time'}
                  </option>
                  <option value="contract">
                    {lang === 'es' ? 'Por proyecto' : 'Contract'}
                  </option>
                  <option value="internship">
                    {lang === 'es' ? 'Práctica/Pasantía' : 'Internship'}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Rango salarial' : 'Salary range'}
              </label>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      salaryMin: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={lang === 'es' ? 'Mínimo' : 'Minimum'}
                />
                <input
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      salaryMax: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={lang === 'es' ? 'Máximo' : 'Maximum'}
                />
                <select
                  value={formData.salaryCurrency}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      salaryCurrency: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <select
                  value={formData.salaryPeriod}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      salaryPeriod: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="monthly">
                    {lang === 'es' ? 'Mensual' : 'Monthly'}
                  </option>
                  <option value="yearly">
                    {lang === 'es' ? 'Anual' : 'Yearly'}
                  </option>
                  <option value="hourly">
                    {lang === 'es' ? 'Por hora' : 'Hourly'}
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Job Description */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Descripción del puesto' : 'Job description'} *
              </label>
              <textarea
                value={formData['description']}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={10}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={
                  lang === 'es'
                    ? 'Describe las responsabilidades principales, el equipo, y lo que hace especial a esta oportunidad...'
                    : 'Describe the main responsibilities, the team, and what makes this opportunity special...'
                }
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {formData['description'].length}/5000{' '}
                {lang === 'es' ? 'caracteres' : 'characters'}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Etiquetas/Habilidades' : 'Tags/Skills'}
              </label>
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), handleAddTag())
                  }
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={
                    lang === 'es' ? 'Agregar etiqueta...' : 'Add tag...'
                  }
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              {formData.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-primary-600 hover:text-primary-800 dark:text-primary-500 dark:hover:text-primary-300"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                  {lang === 'es' ? 'Sugerencias:' : 'Suggestions:'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags
                    .filter((tag) => !formData.tags.includes(tag))
                    .slice(0, 10)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            tags: [...prev.tags, tag],
                          }))
                        }
                        className="rounded bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                      >
                        +{tag}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Requirements & Benefits */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Requirements */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Requisitos' : 'Requirements'} *
              </label>
              <div className="space-y-2">
                {formData.requirements.map((req, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={req}
                      onChange={(e) =>
                        handleArrayFieldChange(
                          'requirements',
                          index,
                          e.target.value
                        )
                      }
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder={
                        lang === 'es'
                          ? `Requisito ${index + 1}`
                          : `Requirement ${index + 1}`
                      }
                    />
                    {formData.requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleArrayFieldRemove('requirements', index)
                        }
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleArrayFieldAdd('requirements')}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {lang === 'es' ? 'Agregar requisito' : 'Add requirement'}
                </button>
              </div>
            </div>

            {/* Responsibilities */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Responsabilidades' : 'Responsibilities'}
              </label>
              <div className="space-y-2">
                {formData.responsibilities.map((resp, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={resp}
                      onChange={(e) =>
                        handleArrayFieldChange(
                          'responsibilities',
                          index,
                          e.target.value
                        )
                      }
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder={
                        lang === 'es'
                          ? `Responsabilidad ${index + 1}`
                          : `Responsibility ${index + 1}`
                      }
                    />
                    {formData.responsibilities.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleArrayFieldRemove('responsibilities', index)
                        }
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleArrayFieldAdd('responsibilities')}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {lang === 'es'
                    ? 'Agregar responsabilidad'
                    : 'Add responsibility'}
                </button>
              </div>
            </div>

            {/* Benefits */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Beneficios' : 'Benefits'}
              </label>
              <div className="space-y-2">
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) =>
                        handleArrayFieldChange(
                          'benefits',
                          index,
                          e.target.value
                        )
                      }
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder={
                        lang === 'es'
                          ? `Beneficio ${index + 1}`
                          : `Benefit ${index + 1}`
                      }
                    />
                    {formData.benefits.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleArrayFieldRemove('benefits', index)
                        }
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleArrayFieldAdd('benefits')}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {lang === 'es' ? 'Agregar beneficio' : 'Add benefit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Application Settings */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Método de aplicación' : 'Application method'}{' '}
                *
              </label>
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="radio"
                    value="platform"
                    checked={formData.applicationMethod === 'platform'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        applicationMethod: e.target.value as any,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es'
                        ? 'Recibir aplicaciones en la plataforma'
                        : 'Receive applications on the platform'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Los candidatos aplicarán directamente en SECiD'
                        : 'Candidates will apply directly on SECiD'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="radio"
                    value="external"
                    checked={formData.applicationMethod === 'external'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        applicationMethod: e.target.value as any,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es'
                        ? 'Redirigir a sitio externo'
                        : 'Redirect to external site'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Los candidatos serán redirigidos a tu sitio'
                        : 'Candidates will be redirected to your site'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="radio"
                    value="email"
                    checked={formData.applicationMethod === 'email'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        applicationMethod: e.target.value as any,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es'
                        ? 'Recibir por correo electrónico'
                        : 'Receive by email'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Los candidatos enviarán su aplicación por email'
                        : 'Candidates will send their application by email'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {formData.applicationMethod === 'external' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  URL de aplicación *
                </label>
                <input
                  type="url"
                  value={formData.applicationUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      applicationUrl: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="https://careers.company.com/apply"
                />
              </div>
            )}

            {formData.applicationMethod === 'email' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email de aplicación *
                </label>
                <input
                  type="email"
                  value={formData.applicationEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      applicationEmail: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="careers@company.com"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es'
                  ? 'Fecha límite de aplicación'
                  : 'Application deadline'}
              </label>
              <input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    applicationDeadline: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      featured: e.target.checked,
                    }))
                  }
                  className="mr-3 mt-1"
                />
                <div>
                  <div className="flex items-center">
                    <SparklesIcon className="mr-2 h-5 w-5 text-primary-600 dark:text-primary-400" />
                    <span className="font-medium text-primary-900 dark:text-primary-100">
                      {lang === 'es'
                        ? 'Destacar este empleo'
                        : 'Feature this job'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-primary-700 dark:text-primary-300">
                    {lang === 'es'
                      ? 'Los empleos destacados aparecen primero en los resultados de búsqueda y tienen mayor visibilidad (+$500 MXN)'
                      : 'Featured jobs appear first in search results and have higher visibility (+$500 MXN)'}
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-700">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Resumen del empleo' : 'Job summary'}
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'Título:' : 'Title:'}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.title}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'Empresa:' : 'Company:'}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.company}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'Ubicación:' : 'Location:'}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.location} ({formData.locationType})
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'Tipo:' : 'Type:'}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.employmentType}
                  </span>
                </div>

                {formData.salaryMin && formData.salaryMax && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {lang === 'es' ? 'Salario:' : 'Salary:'}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.salaryCurrency} {formData.salaryMin}-
                      {formData.salaryMax}/{formData.salaryPeriod}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'Requisitos:' : 'Requirements:'}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {
                      formData.requirements.filter((r) => r.trim() !== '')
                        .length
                    }{' '}
                    {lang === 'es' ? 'items' : 'items'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'Aplicación:' : 'Application:'}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.applicationMethod}
                  </span>
                </div>

                {formData.featured && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {lang === 'es' ? 'Destacado:' : 'Featured:'}
                    </span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      <CheckCircleIcon className="inline h-4 w-4" />{' '}
                      {lang === 'es' ? 'Sí' : 'Yes'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex">
                <InformationCircleIcon className="mr-2 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div className="text-sm">
                  <p className="mb-1 font-medium text-yellow-900 dark:text-yellow-100">
                    {lang === 'es' ? 'Proceso de revisión' : 'Review process'}
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    {lang === 'es'
                      ? 'Tu empleo será revisado por nuestro equipo en las próximas 24-48 horas. Te notificaremos cuando sea aprobado y publicado.'
                      : "Your job will be reviewed by our team within the next 24-48 hours. We'll notify you when it's approved and published."}
                  </p>
                </div>
              </div>
            </div>

            {formData.featured && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
                <div className="flex">
                  <SparklesIcon className="mr-2 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
                  <div className="text-sm">
                    <p className="mb-1 font-medium text-primary-900 dark:text-primary-100">
                      {lang === 'es' ? 'Empleo destacado' : 'Featured job'}
                    </p>
                    <p className="text-primary-700 dark:text-primary-300">
                      {lang === 'es'
                        ? 'Este empleo será destacado por 30 días. Costo adicional: $500 MXN'
                        : 'This job will be featured for 30 days. Additional cost: $500 MXN'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1 || submitting}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {lang === 'es' ? 'Anterior' : 'Previous'}
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700"
            >
              {lang === 'es' ? 'Siguiente' : 'Next'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg
                    className="-ml-1 mr-2 h-5 w-5 animate-spin"
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
                  {lang === 'es' ? 'Publicando...' : 'Publishing...'}
                </>
              ) : (
                <>{lang === 'es' ? 'Publicar empleo' : 'Publish job'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPostingForm;
