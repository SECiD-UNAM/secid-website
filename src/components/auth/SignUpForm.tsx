// @ts-nocheck
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import Button from '@/components/ui/Button';
import { useTranslations } from '@/hooks/useTranslations';

// Step 1: Account creation schema
const signUpSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data['confirmPassword'], {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Step 3: UNAM verification schema
const unamVerificationSchema = z.object({
  numeroCuenta: z.string().min(5, 'Número de cuenta is required'),
  academicLevel: z.enum(['licenciatura', 'posgrado', 'curso']),
  campus: z.string().min(1, 'Campus is required'),
  generation: z.string().optional(),
  graduationYear: z.coerce.number().min(2000).max(2030).optional(),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type UnamFormData = z.infer<typeof unamVerificationSchema>;
type RegistrationType = 'member' | 'collaborator';
type Step = 'account' | 'type' | 'unam' | 'done';

interface SignUpFormProps {
  onSuccess?: () => void;
  lang?: 'es' | 'en';
}

const CAMPUS_OPTIONS = [
  'Ciudad Universitaria (CU)',
  'Facultad de Ciencias',
  'IIMAS',
  'Juriquilla',
  'Morelia',
  'Otro',
];

const GENERATION_OPTIONS = [
  '1a Generación (2017)',
  '2a Generación (2018)',
  '3a Generación (2019)',
  '4a Generación (2020)',
  '5a Generación (2021)',
  '6a Generación (2022)',
  '7a Generación (2023)',
  '8a Generación (2024)',
  '9a Generación (2025)',
];

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccess,
  lang = 'es',
}) => {
  const t = useTranslations(lang);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('account');
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const accountForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const unamForm = useForm<UnamFormData>({
    resolver: zodResolver(unamVerificationSchema),
    defaultValues: {
      academicLevel: 'licenciatura',
      campus: '',
    },
  });

  const labels = {
    es: {
      stepAccount: 'Crear cuenta',
      stepType: 'Tipo de registro',
      stepUnam: 'Verificación UNAM',
      stepDone: 'Registro completo',
      memberOption: 'Soy egresado/estudiante de Ciencia de Datos UNAM',
      memberDesc: 'Solicita membresía completa con acceso a todos los beneficios de SECiD. Requiere verificación.',
      collaboratorOption: 'Quiero colaborar con SECiD',
      collaboratorDesc: 'Únete como colaborador externo. Acceso a eventos públicos y bolsa de trabajo.',
      numeroCuenta: 'Número de Cuenta UNAM',
      numeroCuentaHelp: 'Tu número de cuenta de la UNAM (ej. 317123456)',
      academicLevel: 'Nivel Académico',
      licenciatura: 'Licenciatura en Ciencia de Datos',
      posgrado: 'Posgrado',
      curso: 'Curso de Especialización / Actualización',
      campus: 'Sede de Estudios',
      generation: 'Generación',
      graduationYear: 'Año de egreso',
      uploadProof: 'Documento de verificación',
      uploadProofHelp: 'Sube tu credencial de estudiante, título, tira de materias o credencial de egresado (PDF, JPG o PNG, máx. 10MB)',
      chooseFile: 'Seleccionar archivo',
      fileSelected: 'Archivo seleccionado',
      submitVerification: 'Enviar solicitud de membresía',
      continueAsCollaborator: 'Continuar como colaborador',
      welcomeCollaborator: '¡Bienvenido, colaborador!',
      welcomeCollaboratorMsg: 'Tu cuenta ha sido creada. Como colaborador tienes acceso a eventos públicos y la bolsa de trabajo.',
      welcomeMember: '¡Solicitud enviada!',
      welcomeMemberMsg: 'Tu solicitud de membresía ha sido enviada. Un administrador la revisará pronto.',
      goToDashboard: 'Ir al panel',
      back: 'Atrás',
      next: 'Siguiente',
    },
    en: {
      stepAccount: 'Create account',
      stepType: 'Registration type',
      stepUnam: 'UNAM Verification',
      stepDone: 'Registration complete',
      memberOption: "I'm a UNAM Data Science graduate/student",
      memberDesc: 'Apply for full membership with access to all SECiD benefits. Requires verification.',
      collaboratorOption: 'I want to collaborate with SECiD',
      collaboratorDesc: 'Join as an external collaborator. Access to public events and job board.',
      numeroCuenta: 'UNAM Account Number',
      numeroCuentaHelp: 'Your UNAM account number (e.g. 317123456)',
      academicLevel: 'Academic Level',
      licenciatura: 'Data Science B.Sc.',
      posgrado: 'Graduate Program',
      curso: 'Specialization / Continuing Ed.',
      campus: 'Campus',
      generation: 'Cohort / Generation',
      graduationYear: 'Graduation year',
      uploadProof: 'Verification document',
      uploadProofHelp: 'Upload your student ID, degree, transcript, or alumni credential (PDF, JPG or PNG, max 10MB)',
      chooseFile: 'Choose file',
      fileSelected: 'File selected',
      submitVerification: 'Submit membership request',
      continueAsCollaborator: 'Continue as collaborator',
      welcomeCollaborator: 'Welcome, collaborator!',
      welcomeCollaboratorMsg: 'Your account has been created. As a collaborator you have access to public events and the job board.',
      welcomeMember: 'Request submitted!',
      welcomeMemberMsg: 'Your membership request has been submitted. An administrator will review it soon.',
      goToDashboard: 'Go to dashboard',
      back: 'Back',
      next: 'Next',
    },
  };

  const l = labels[lang];

  const getSignUpErrorMessage = (err: any): string => {
    const code = err.code || '';
    const message = err.message || '';

    // Check translations first
    if (code && t.auth?.errors?.[code]) {
      return t.auth.errors[code];
    }

    // Catch configuration errors that may come as auth/internal-error
    if (
      code === 'auth/configuration-not-found' ||
      message.includes('CONFIGURATION_NOT_FOUND')
    ) {
      return lang === 'es'
        ? 'El servicio de autenticación no está configurado. Contacta al administrador.'
        : 'Authentication service is not configured. Contact the administrator.';
    }

    return t.auth?.errors?.['default'] || 'An error occurred';
  };

  // Step 1: Create account
  const onAccountSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data['email'],
        data['password']
      );

      await updateProfile(userCredential.user, {
        displayName: `${data.firstName} ${data['lastName']}`,
      });

      // Update firstName/lastName in Firestore (Cloud Function creates the doc)
      // Small delay to ensure Cloud Function has created the document
      setTimeout(async () => {
        try {
          const userRef = doc(db, 'users', userCredential.user.uid);
          await updateDoc(userRef, {
            firstName: data.firstName,
            lastName: data['lastName'],
          });
        } catch {
          // Document may not be ready yet, will be updated later
        }
      }, 2000);

      setStep('type');
    } catch (err: any) {
      console.error('SignUp error:', err.code, err.message, err);
      setError(getSignUpErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 alt: Google signup
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setStep('type');
    } catch (err: any) {
      console.error('Google SignUp error:', err.code, err.message, err);
      setError(getSignUpErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Choose registration type
  const handleTypeSelection = async (type: RegistrationType) => {
    setRegistrationType(type);

    if (type === 'collaborator') {
      // Update Firestore and go to done
      setIsLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            registrationType: 'collaborator',
            updatedAt: serverTimestamp(),
          });
        }
        setStep('done');
      } catch {
        setStep('done'); // Still proceed even if update fails
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep('unam');
    }
  };

  // Step 3: Submit UNAM verification
  const onUnamSubmit = async (data: UnamFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      let verificationDocumentUrl: string | undefined;

      // Upload verification document if provided
      if (verificationFile) {
        setUploadProgress(true);
        const fileRef = ref(storage, `verification-docs/${user.uid}/${verificationFile.name}`);
        await uploadBytes(fileRef, verificationFile);
        verificationDocumentUrl = await getDownloadURL(fileRef);
        setUploadProgress(false);
      }

      // Update user profile with UNAM data
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        registrationType: 'member',
        verificationStatus: 'pending',
        numeroCuenta: data.numeroCuenta,
        academicLevel: data.academicLevel,
        campus: data.campus,
        generation: data.generation || null,
        ...(data.graduationYear && { 'profile.graduationYear': data.graduationYear }),
        ...(verificationDocumentUrl && { verificationDocumentUrl }),
        'lifecycle.status': 'pending',
        'lifecycle.statusChangedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setStep('done');
    } catch (err: any) {
      console.error('Error submitting UNAM verification:', err);
      setError(
        lang === 'es'
          ? 'Error al enviar la solicitud. Inténtalo de nuevo.'
          : 'Error submitting request. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setUploadProgress(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max) and type
      if (file.size > 10 * 1024 * 1024) {
        setError(lang === 'es' ? 'El archivo es demasiado grande (máx. 10MB)' : 'File is too large (max 10MB)');
        return;
      }
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        setError(lang === 'es' ? 'Formato no válido. Usa PDF, JPG o PNG.' : 'Invalid format. Use PDF, JPG or PNG.');
        return;
      }
      setError(null);
      setVerificationFile(file);
    }
  };

  const goToDashboard = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      window.location.href = `/${lang}/dashboard`;
    }
  };

  // Step indicator
  const steps: { key: Step; label: string }[] = [
    { key: 'account', label: l.stepAccount },
    { key: 'type', label: l.stepType },
    ...(registrationType === 'member' ? [{ key: 'unam' as Step, label: l.stepUnam }] : []),
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const inputClass =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Step indicator */}
      {step !== 'done' && (
        <div className="flex items-center justify-center space-x-2">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && (
                <div
                  className={`h-0.5 w-8 ${
                    i <= currentStepIndex ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                  i <= currentStepIndex
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {i + 1}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Step 1: Account Creation */}
      {step === 'account' && (
        <>
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t.auth?.signUp?.title || l.stepAccount}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {t.auth?.signUp?.subtitle || ''}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={accountForm.handleSubmit(onAccountSubmit)}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className={labelClass}>
                    {t.auth?.signUp?.firstName || 'Nombre'}
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    {...accountForm.register('firstName')}
                    className={inputClass}
                  />
                  {accountForm.formState.errors.firstName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {accountForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>
                    {t.auth?.signUp?.lastName || 'Apellido'}
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    {...accountForm.register('lastName')}
                    className={inputClass}
                  />
                  {accountForm.formState.errors.lastName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {accountForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  {t.auth?.signUp?.email || 'Email'}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...accountForm.register('email')}
                  className={inputClass}
                />
                {accountForm.formState.errors['email'] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {accountForm.formState.errors['email'].message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  {t.auth?.signUp?.password || 'Password'}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...accountForm.register('password')}
                  className={inputClass}
                />
                {accountForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {accountForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  {t.auth?.signUp?.confirmPassword || 'Confirm password'}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...accountForm.register('confirmPassword')}
                  className={inputClass}
                />
                {accountForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {accountForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    {...accountForm.register('acceptTerms')}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="acceptTerms" className="text-gray-700 dark:text-gray-300">
                    {t.auth?.acceptTerms?.prefix || 'Acepto los'}{' '}
                    <a
                      href={`/${lang}/terms`}
                      className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                    >
                      {t.auth?.acceptTerms?.link || 'términos y condiciones'}
                    </a>
                  </label>
                  {accountForm.formState.errors.acceptTerms && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {accountForm.formState.errors.acceptTerms.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={isLoading}>
                {t.auth?.signUp?.button || l.next}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500 dark:bg-gray-900">
                    {t.auth?.or || 'o'}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleGoogleSignUp}
                loading={isLoading}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t.auth?.signUp?.google || 'Registrarse con Google'}
              </Button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                {t.auth?.signUp?.haveAccount || '¿Ya tienes cuenta?'}{' '}
                <a
                  href={`/${lang}/login`}
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  {t.auth?.signUp?.signIn || 'Inicia sesión'}
                </a>
              </p>
            </div>
          </form>
        </>
      )}

      {/* Step 2: Registration Type */}
      {step === 'type' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{l.stepType}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {lang === 'es' ? '¿Cómo te gustaría participar en SECiD?' : 'How would you like to participate in SECiD?'}
            </p>
          </div>

          <div className="space-y-4">
            {/* Member option */}
            <button
              type="button"
              onClick={() => handleTypeSelection('member')}
              disabled={isLoading}
              className="w-full rounded-lg border-2 border-gray-200 p-6 text-left transition-all hover:border-primary-500 hover:shadow-md dark:border-gray-700 dark:hover:border-primary-400"
            >
              <div className="flex items-start space-x-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <svg className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{l.memberOption}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{l.memberDesc}</p>
                </div>
              </div>
            </button>

            {/* Collaborator option */}
            <button
              type="button"
              onClick={() => handleTypeSelection('collaborator')}
              disabled={isLoading}
              className="w-full rounded-lg border-2 border-gray-200 p-6 text-left transition-all hover:border-primary-500 hover:shadow-md dark:border-gray-700 dark:hover:border-primary-400"
            >
              <div className="flex items-start space-x-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{l.collaboratorOption}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{l.collaboratorDesc}</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: UNAM Verification (member path only) */}
      {step === 'unam' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{l.stepUnam}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {lang === 'es'
                ? 'Proporciona tus datos académicos para verificar tu afiliación con la UNAM.'
                : 'Provide your academic data to verify your UNAM affiliation.'}
            </p>
          </div>

          <form className="space-y-5" onSubmit={unamForm.handleSubmit(onUnamSubmit)}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Número de cuenta */}
            <div>
              <label htmlFor="numeroCuenta" className={labelClass}>
                {l.numeroCuenta} *
              </label>
              <input
                id="numeroCuenta"
                type="text"
                placeholder="317123456"
                {...unamForm.register('numeroCuenta')}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{l.numeroCuentaHelp}</p>
              {unamForm.formState.errors.numeroCuenta && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {unamForm.formState.errors.numeroCuenta.message}
                </p>
              )}
            </div>

            {/* Academic level */}
            <div>
              <label htmlFor="academicLevel" className={labelClass}>
                {l.academicLevel} *
              </label>
              <select id="academicLevel" {...unamForm.register('academicLevel')} className={inputClass}>
                <option value="licenciatura">{l.licenciatura}</option>
                <option value="posgrado">{l.posgrado}</option>
                <option value="curso">{l.curso}</option>
              </select>
            </div>

            {/* Campus */}
            <div>
              <label htmlFor="campus" className={labelClass}>
                {l.campus} *
              </label>
              <select id="campus" {...unamForm.register('campus')} className={inputClass}>
                <option value="">
                  {lang === 'es' ? 'Selecciona tu sede' : 'Select your campus'}
                </option>
                {CAMPUS_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {unamForm.formState.errors.campus && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {unamForm.formState.errors.campus.message}
                </p>
              )}
            </div>

            {/* Generation */}
            <div>
              <label htmlFor="generation" className={labelClass}>
                {l.generation}
              </label>
              <select id="generation" {...unamForm.register('generation')} className={inputClass}>
                <option value="">
                  {lang === 'es' ? 'Selecciona tu generación' : 'Select your cohort'}
                </option>
                {GENERATION_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Graduation year */}
            <div>
              <label htmlFor="graduationYear" className={labelClass}>
                {l.graduationYear}
              </label>
              <input
                id="graduationYear"
                type="number"
                min="2000"
                max="2030"
                placeholder="2024"
                {...unamForm.register('graduationYear')}
                className={inputClass}
              />
            </div>

            {/* Verification document upload */}
            <div>
              <label className={labelClass}>{l.uploadProof}</label>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{l.uploadProofHelp}</p>
              <label
                htmlFor="verificationDoc"
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-4 transition-colors hover:border-primary-400 dark:border-gray-600 dark:hover:border-primary-500"
              >
                {verificationFile ? (
                  <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{l.fileSelected}: {verificationFile.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>{l.chooseFile}</span>
                  </div>
                )}
                <input
                  id="verificationDoc"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-1/3"
                onClick={() => setStep('type')}
              >
                {l.back}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-2/3"
                loading={isLoading || uploadProgress}
              >
                {uploadProgress
                  ? (lang === 'es' ? 'Subiendo...' : 'Uploading...')
                  : l.submitVerification}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {registrationType === 'member' ? l.welcomeMember : l.welcomeCollaborator}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {registrationType === 'member' ? l.welcomeMemberMsg : l.welcomeCollaboratorMsg}
          </p>

          <Button variant="primary" size="lg" className="w-full" onClick={goToDashboard}>
            {l.goToDashboard}
          </Button>
        </div>
      )}
    </div>
  );
};
