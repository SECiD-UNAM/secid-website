import React, { useState } from 'react';
import {
  UserCircleIcon,
  CameraIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import type { FormData } from './profile-edit-types';
import { SUGGESTED_SKILLS } from './profile-edit-types';
import { TagInput } from './shared/TagInput';

const TOTAL_STEPS = 5;

interface OnboardingWizardProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onComplete: () => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingPhoto: boolean;
  profileCompleteness: number;
  lang: 'es' | 'en';
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 ' +
  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const STEP_TITLES: Record<'es' | 'en', string[]> = {
  es: [
    '¡Bienvenido a SECiD!',
    '¿Dónde trabajas?',
    '¿Dónde estudiaste?',
    '¿Cuáles son tus habilidades?',
    '¡Tu perfil está listo!',
  ],
  en: [
    'Welcome to SECiD!',
    'Where do you work?',
    'Where did you study?',
    'What are your skills?',
    'Your profile is ready!',
  ],
};

const STEP_SUBTITLES: Record<'es' | 'en', string[]> = {
  es: [
    'Configuremos tu perfil en unos minutos',
    'Cuéntanos sobre tu trabajo actual',
    'Cuéntanos sobre tu formación académica',
    'Selecciona las habilidades que te definen',
    'Has completado la configuración inicial',
  ],
  en: [
    "Let's set up your profile in a few minutes",
    'Tell us about your current work',
    'Tell us about your academic background',
    'Select the skills that define you',
    'You have completed the initial setup',
  ],
};

function ProgressDots({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div
            key={stepNumber}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-primary-600 dark:bg-primary-400'
                : isCurrent
                  ? 'bg-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                  : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        );
      })}
    </div>
  );
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  formData,
  setFormData,
  onComplete,
  onPhotoUpload,
  uploadingPhoto,
  profileCompleteness,
  lang,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <WelcomeStep
            formData={formData}
            setFormData={setFormData}
            onPhotoUpload={onPhotoUpload}
            uploadingPhoto={uploadingPhoto}
            lang={lang}
          />
        );
      case 2:
        return (
          <CareerStep
            formData={formData}
            setFormData={setFormData}
            lang={lang}
          />
        );
      case 3:
        return (
          <EducationStep
            formData={formData}
            setFormData={setFormData}
            lang={lang}
          />
        );
      case 4:
        return (
          <SkillsStep
            formData={formData}
            setFormData={setFormData}
            lang={lang}
          />
        );
      case 5:
        return (
          <DoneStep profileCompleteness={profileCompleteness} lang={lang} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress */}
      <div className="mb-8">
        <ProgressDots currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          {lang === 'es' ? 'Paso' : 'Step'} {currentStep}{' '}
          {lang === 'es' ? 'de' : 'of'} {TOTAL_STEPS}
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Title */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {STEP_TITLES[lang][currentStep - 1]}
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {STEP_SUBTITLES[lang][currentStep - 1]}
          </p>
        </div>

        {/* Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {lang === 'es' ? 'Anterior' : 'Back'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {lang === 'es' ? 'Ir al editor completo' : 'Skip to full editor'}
            </button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goNext}
                className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {lang === 'es' ? 'Omitir' : 'Skip'}
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                {lang === 'es' ? 'Siguiente' : 'Next'}
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {lang === 'es' ? 'Completar' : 'Complete'}
            </button>
          )}
        </div>
      </div>

      {/* Skip link below card */}
      {currentStep !== TOTAL_STEPS && currentStep > 1 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onComplete}
            className="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {lang === 'es' ? 'Ir al editor completo' : 'Skip to full editor'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ========================================================================= */
/* Step Components                                                           */
/* ========================================================================= */

interface StepProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  lang: 'es' | 'en';
}

/** Step 1: Welcome + Photo + Name */
function WelcomeStep({
  formData,
  setFormData,
  onPhotoUpload,
  uploadingPhoto,
  lang,
}: StepProps & {
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingPhoto: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Photo upload */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {formData.photoURL ? (
            <img
              src={formData.photoURL}
              alt="Profile"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              <UserCircleIcon className="h-16 w-16 text-gray-400" />
            </div>
          )}
          <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary-600 p-1.5 transition-colors hover:bg-primary-700">
            <CameraIcon className="h-5 w-5 text-white" />
            <input
              type="file"
              accept="image/*"
              onChange={onPhotoUpload}
              className="hidden"
              disabled={uploadingPhoto}
            />
          </label>
        </div>
        {uploadingPhoto && (
          <p className="mt-2 text-sm text-primary-600 dark:text-primary-400">
            {lang === 'es' ? 'Subiendo...' : 'Uploading...'}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'JPG, GIF o PNG. Máximo 5MB.'
            : 'JPG, GIF or PNG. Max 5MB.'}
        </p>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Nombre' : 'First name'} *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, firstName: e.target.value }))
            }
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Apellido' : 'Last name'} *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, lastName: e.target.value }))
            }
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Nombre para mostrar' : 'Display name'}
        </label>
        <input
          type="text"
          value={formData.displayName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, displayName: e.target.value }))
          }
          className={INPUT_CLASS}
          placeholder={
            formData.firstName && formData.lastName
              ? `${formData.firstName} ${formData.lastName}`
              : ''
          }
        />
      </div>
    </div>
  );
}

/** Step 2: Career — simplified current position + LinkedIn import */
function CareerStep({ formData, setFormData, lang }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Puesto actual' : 'Current position'}
        </label>
        <input
          type="text"
          value={formData.currentPosition}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              currentPosition: e.target.value,
            }))
          }
          className={INPUT_CLASS}
          placeholder={
            lang === 'es' ? 'Ej. Data Scientist' : 'e.g. Data Scientist'
          }
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Empresa' : 'Company'}
        </label>
        <input
          type="text"
          value={formData.currentCompany}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, currentCompany: e.target.value }))
          }
          className={INPUT_CLASS}
          placeholder={lang === 'es' ? 'Ej. Google' : 'e.g. Google'}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          LinkedIn
        </label>
        <input
          type="url"
          value={formData.linkedinUrl}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))
          }
          className={INPUT_CLASS}
          placeholder="https://linkedin.com/in/your-profile"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'Podrás importar tu historial laboral completo desde el editor'
            : 'You can import your full work history from the editor'}
        </p>
      </div>
    </div>
  );
}

/** Step 3: Education — show auto-populated UNAM entry if available */
function EducationStep({ formData, setFormData, lang }: StepProps) {
  const hasEducation = formData.educationHistory.length > 0;
  const firstEntry = hasEducation ? formData.educationHistory[0] : null;

  return (
    <div className="space-y-4">
      {firstEntry && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
          <p className="mb-1 text-xs font-medium text-primary-700 dark:text-primary-300">
            {lang === 'es'
              ? 'Datos de registro UNAM'
              : 'UNAM registration data'}
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            {firstEntry.institution}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {firstEntry.degree}
            {firstEntry.campus ? ` — ${firstEntry.campus}` : ''}
          </p>
          {firstEntry.generation && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lang === 'es' ? 'Generación' : 'Generation'}:{' '}
              {firstEntry.generation}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Programa / Carrera' : 'Program / Degree'}
        </label>
        <input
          type="text"
          value={formData.program}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, program: e.target.value }))
          }
          className={INPUT_CLASS}
          placeholder={
            lang === 'es' ? 'Ej. Ciencia de Datos' : 'e.g. Data Science'
          }
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Año de graduación' : 'Graduation year'}
        </label>
        <input
          type="text"
          value={formData.graduationYear}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, graduationYear: e.target.value }))
          }
          className={INPUT_CLASS}
          placeholder={lang === 'es' ? 'Ej. 2024' : 'e.g. 2024'}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Número de cuenta UNAM' : 'UNAM student ID'}
        </label>
        <input
          type="text"
          value={formData.studentId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, studentId: e.target.value }))
          }
          className={INPUT_CLASS}
          placeholder={lang === 'es' ? 'Ej. 317123456' : 'e.g. 317123456'}
        />
      </div>
    </div>
  );
}

/** Step 4: Skills — TagInput with suggestions */
function SkillsStep({ formData, setFormData, lang }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {lang === 'es'
          ? 'Agrega al menos 3 habilidades para que otros miembros te encuentren más fácilmente.'
          : 'Add at least 3 skills so other members can find you more easily.'}
      </p>

      <TagInput
        tags={formData.skills}
        onChange={(skills) => setFormData((prev) => ({ ...prev, skills }))}
        suggestions={SUGGESTED_SKILLS}
        placeholder={
          lang === 'es'
            ? 'Escribe una habilidad y presiona Enter'
            : 'Type a skill and press Enter'
        }
      />

      {formData.skills.length > 0 && formData.skills.length < 3 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {lang === 'es'
            ? `Agrega ${3 - formData.skills.length} más para un perfil más visible`
            : `Add ${3 - formData.skills.length} more for a more visible profile`}
        </p>
      )}

      {formData.skills.length >= 3 && (
        <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircleIcon className="h-4 w-4" />
          {lang === 'es'
            ? '¡Excelente! Tu perfil será más fácil de encontrar'
            : 'Great! Your profile will be easier to find'}
        </p>
      )}
    </div>
  );
}

/** Step 5: Done — completeness summary */
function DoneStep({
  profileCompleteness,
  lang,
}: {
  profileCompleteness: number;
  lang: 'es' | 'en';
}) {
  const completenessColor =
    profileCompleteness >= 80
      ? 'text-green-600 dark:text-green-400'
      : profileCompleteness >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-orange-600 dark:text-orange-400';

  const barColor =
    profileCompleteness >= 80
      ? 'bg-green-500'
      : profileCompleteness >= 50
        ? 'bg-yellow-500'
        : 'bg-orange-500';

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircleIcon className="h-16 w-16 text-green-500" />
      </div>

      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {lang === 'es' ? 'Tu perfil está' : 'Your profile is'}
        </p>
        <p className={`text-3xl font-bold ${completenessColor}`}>
          {profileCompleteness}%
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es' ? 'completo' : 'complete'}
        </p>
      </div>

      <div className="mx-auto w-full max-w-xs">
        <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${profileCompleteness}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {lang === 'es'
          ? 'Puedes seguir completando tu perfil en el editor completo.'
          : 'You can continue completing your profile in the full editor.'}
      </p>
    </div>
  );
}

export default OnboardingWizard;
