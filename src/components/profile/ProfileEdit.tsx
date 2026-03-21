// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail } from 'firebase/auth';
import { db, storage } from '@/lib/firebase';
import {
  UserCircleIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  RectangleStackIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { PersonalTab } from './tabs/PersonalTab';
import { CareerTab } from './tabs/CareerTab';
import { EducationTab } from './tabs/EducationTab';
import { PortfolioTab } from './tabs/PortfolioTab';
import { PrivacyTab } from './tabs/PrivacyTab';
import { SecurityTab } from './tabs/SecurityTab';
import type { TabId, ProfileEditProps } from './profile-edit-types';
import { INITIAL_FORM_DATA } from './profile-edit-types';
import type { FormData } from './profile-edit-types';
import { getMemberProfile, updateMemberProfile } from '@/lib/members';

const TAB_DEFINITIONS: {
  id: TabId;
  labelEs: string;
  labelEn: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}[] = [
  {
    id: 'personal',
    labelEs: 'Personal',
    labelEn: 'Personal',
    icon: UserCircleIcon,
  },
  { id: 'career', labelEs: 'Carrera', labelEn: 'Career', icon: BriefcaseIcon },
  {
    id: 'education',
    labelEs: 'Educación',
    labelEn: 'Education',
    icon: AcademicCapIcon,
  },
  {
    id: 'portfolio',
    labelEs: 'Portafolio',
    labelEn: 'Portfolio',
    icon: RectangleStackIcon,
  },
  { id: 'privacy', labelEs: 'Privacidad', labelEn: 'Privacy', icon: EyeIcon },
  {
    id: 'security',
    labelEs: 'Seguridad',
    labelEn: 'Security',
    icon: ShieldCheckIcon,
  },
];

export const ProfileEdit: React.FC<ProfileEditProps> = ({
  lang = 'es',
  targetUid,
  isAdmin = false,
}) => {
  const { user, userProfile } = useAuth();
  const effectiveUid = targetUid || user?.uid;
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [adminRole, setAdminRole] = useState<string>('member');
  const [adminVerificationStatus, setAdminVerificationStatus] =
    useState<string>('none');
  const [adminLifecycleStatus, setAdminLifecycleStatus] =
    useState<string>('active');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const populateFormFromProfile = (profile: any, fallbackEmail?: string) => {
    const workHistory = profile.experience?.previousRoles || [];
    if (
      profile.currentPosition &&
      !workHistory.some((w: { current?: boolean }) => w.current)
    ) {
      workHistory.unshift({
        id: crypto.randomUUID(),
        company: profile.currentCompany || '',
        position: profile.currentPosition || '',
        startDate: new Date(),
        current: true,
      });
    }

    setFormData({
      displayName: profile.displayName || '',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: profile['email'] || fallbackEmail || '',
      phoneNumber: profile.phoneNumber || '',
      location: profile.location || '',
      bio: profile.bio || '',
      photoURL: profile.photoURL || '',
      currentPosition: profile.currentPosition || '',
      currentCompany: profile.currentCompany || '',
      industry: profile.industry || '',
      experience: profile.experience?.level || profile.experience || '',
      skills: profile.skills || [],
      workHistory,
      educationHistory: profile.educationHistory || [],
      certifications: profile.portfolio?.certifications || [],
      languages: profile.languages || [],
      projects: profile.portfolio?.projects || [],
      unamEmail: profile.unamEmail || '',
      graduationYear: profile.graduationYear || '',
      program: profile.program || '',
      studentId: profile.studentId || '',
      linkedinUrl: profile.linkedinUrl || '',
      githubUrl: profile.githubUrl || '',
      portfolioUrl: profile.portfolioUrl || '',
      twitterUrl: profile.twitterUrl || '',
      profileVisible: profile?.privacySettings?.profileVisible ?? true,
      contactVisible: profile?.privacySettings?.contactVisible ?? false,
      jobSearching: profile?.privacySettings?.jobSearching ?? false,
      mentorshipAvailable:
        profile?.privacySettings?.mentorshipAvailable ?? false,
      emailNotifications: profile?.notificationSettings?.email ?? true,
      pushNotifications: profile?.notificationSettings?.push ?? false,
      jobMatchNotifications: profile?.notificationSettings?.jobMatches ?? true,
      eventNotifications: profile?.notificationSettings?.events ?? true,
      forumNotifications: profile?.notificationSettings?.forums ?? false,
    });

    if (isAdmin) {
      setAdminRole(profile.role || 'member');
      setAdminVerificationStatus(profile.verificationStatus || 'none');
      setAdminLifecycleStatus(profile.lifecycle?.status || 'active');
    }
  };

  useEffect(() => {
    if (targetUid) {
      getMemberProfile(targetUid)
        .then((profile) => {
          if (profile) {
            populateFormFromProfile(profile);
          }
        })
        .catch((err) => {
          console.error('Error loading target member profile:', err);
          setError(
            lang === 'es'
              ? 'Error al cargar el perfil del miembro'
              : 'Error loading member profile'
          );
        });
    } else if (userProfile) {
      populateFormFromProfile(userProfile, user?.email);
    }
  }, [targetUid, userProfile, user]);

  useEffect(() => {
    calculateCompleteness();
  }, [formData]);

  const calculateCompleteness = () => {
    let score = 0;
    const checks = [
      { field: !!formData.firstName && !!formData.lastName, weight: 10 },
      { field: !!formData.bio, weight: 10 },
      { field: !!formData.photoURL, weight: 10 },
      { field: (formData.workHistory || []).length > 0, weight: 15 },
      { field: (formData.educationHistory || []).length > 0, weight: 10 },
      { field: (formData.skills || []).length >= 3, weight: 10 },
      { field: !!formData.linkedinUrl, weight: 5 },
      { field: !!formData.currentPosition, weight: 5 },
      { field: !!formData.currentCompany, weight: 5 },
      { field: (formData.projects || []).length > 0, weight: 10 },
      { field: (formData.languages || []).length > 0, weight: 5 },
      { field: (formData.certifications || []).length > 0, weight: 5 },
    ];
    for (const check of checks) {
      if (check.field) score += check.weight;
    }
    setProfileCompleteness(score);
  };

  const getCompletionHints = (): string[] => {
    const hints: string[] = [];

    if (!formData.bio)
      hints.push(lang === 'es' ? 'Agrega una biografía' : 'Add a bio');
    if (!formData.photoURL)
      hints.push(
        lang === 'es' ? 'Sube una foto de perfil' : 'Upload a profile photo'
      );
    if ((formData.workHistory || []).length === 0)
      hints.push(
        lang === 'es'
          ? 'Agrega tu experiencia laboral'
          : 'Add your work experience'
      );
    if ((formData.educationHistory || []).length === 0)
      hints.push(
        lang === 'es'
          ? 'Agrega tu historial educativo'
          : 'Add your education history'
      );
    if ((formData.skills || []).length === 0)
      hints.push(lang === 'es' ? 'Agrega tus habilidades' : 'Add your skills');
    if (!formData.linkedinUrl)
      hints.push(lang === 'es' ? 'Agrega tu LinkedIn' : 'Add your LinkedIn');
    if ((formData.projects || []).length === 0)
      hints.push(
        lang === 'es'
          ? 'Agrega un proyecto a tu portafolio'
          : 'Add a project to your portfolio'
      );
    if ((formData.languages || []).length === 0)
      hints.push(
        lang === 'es' ? 'Agrega los idiomas que hablas' : 'Add your languages'
      );
    if ((formData.certifications || []).length === 0)
      hints.push(
        lang === 'es' ? 'Agrega tus certificaciones' : 'Add your certifications'
      );

    return hints.slice(0, 3);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveUid) return;

    if (!file.type.startsWith('image/')) {
      setError(
        lang === 'es'
          ? 'Por favor selecciona una imagen'
          : 'Please select an image'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        lang === 'es'
          ? 'La imagen no debe exceder 5MB'
          : 'Image must be less than 5MB'
      );
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      const photoRef = ref(
        storage,
        `profiles/${effectiveUid}/${Date.now()}_${file.name}`
      );
      const snapshot = await uploadBytes(photoRef, file);
      const photoURL = await getDownloadURL(snapshot.ref);

      setFormData((prev) => ({ ...prev, photoURL }));

      // Only update Firebase Auth profile when editing own profile
      if (!targetUid && user) {
        await updateProfile(user, { photoURL });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (uploadError) {
      console.error('Error uploading photo:', uploadError);
      setError(
        lang === 'es' ? 'Error al subir la foto' : 'Error uploading photo'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!effectiveUid) return;

    setSaving(true);
    setError(null);

    try {
      const currentWork = formData.workHistory.find((w) => w.current);

      await updateDoc(doc(db, 'users', effectiveUid), {
        displayName: formData.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        location: formData.location,
        bio: formData.bio,
        photoURL: formData.photoURL,
        // Career data — derive top-level fields from work history
        currentPosition:
          currentWork?.position || formData.currentPosition || '',
        currentCompany: currentWork?.company || formData.currentCompany || '',
        'profile.company':
          currentWork?.company || formData.currentCompany || '',
        'profile.companyId': currentWork?.companyId || undefined,
        'profile.position':
          currentWork?.position || formData.currentPosition || '',
        'experience.previousRoles': formData.workHistory,
        'experience.currentRole':
          currentWork?.position || formData.currentPosition || '',
        industry: formData.industry,
        experience: formData.experience,
        skills: formData.skills,
        // Education data
        unamEmail: formData.unamEmail,
        graduationYear: formData.graduationYear,
        program: formData.program,
        educationHistory: formData.educationHistory,
        // Portfolio data
        'portfolio.certifications': formData.certifications,
        'portfolio.projects': formData.projects,
        // Languages
        languages: formData.languages,
        // Social links
        linkedinUrl: formData.linkedinUrl,
        githubUrl: formData.githubUrl,
        portfolioUrl: formData.portfolioUrl,
        twitterUrl: formData.twitterUrl,
        // Privacy
        privacySettings: {
          profileVisible: formData.profileVisible,
          contactVisible: formData.contactVisible,
          jobSearching: formData.jobSearching,
          mentorshipAvailable: formData.mentorshipAvailable,
        },
        // Notifications
        notificationSettings: {
          email: formData.emailNotifications,
          push: formData.pushNotifications,
          jobMatches: formData.jobMatchNotifications,
          events: formData.eventNotifications,
          forums: formData.forumNotifications,
        },
        updatedAt: serverTimestamp(),
        profileCompleteness,
      });

      // Only update Firebase Auth profile when editing own profile
      if (!targetUid && user) {
        await updateProfile(user, {
          displayName: formData.displayName,
          photoURL: formData.photoURL,
        });

        if (formData.email !== user.email) {
          await updateEmail(user, formData.email);
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (saveError: unknown) {
      console.error('Error saving profile:', saveError);
      const message =
        saveError instanceof Error ? saveError.message : undefined;
      setError(
        message ||
          (lang === 'es'
            ? 'Error al guardar el perfil'
            : 'Error saving profile')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdminSave = async () => {
    if (!effectiveUid) return;

    setSavingAdmin(true);
    setError(null);

    try {
      await updateMemberProfile(effectiveUid, {
        role: adminRole,
        verificationStatus: adminVerificationStatus,
        'lifecycle.status': adminLifecycleStatus,
      } as any);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (saveError: unknown) {
      console.error('Error saving admin fields:', saveError);
      const message =
        saveError instanceof Error ? saveError.message : undefined;
      setError(
        message ||
          (lang === 'es'
            ? 'Error al guardar campos administrativos'
            : 'Error saving admin fields')
      );
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <div>
      {/* Back to Members (admin editing another member) */}
      {targetUid && (
        <div className="mb-4">
          <a
            href={`/${lang}/dashboard/admin/members`}
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Volver a Miembros' : 'Back to Members'}
          </a>
        </div>
      )}

      {/* Profile Completeness */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Perfil' : 'Profile'} {profileCompleteness}%{' '}
            {lang === 'es' ? 'completo' : 'complete'}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              profileCompleteness >= 80
                ? 'bg-green-500'
                : profileCompleteness >= 60
                  ? 'bg-yellow-500'
                  : profileCompleteness >= 30
                    ? 'bg-orange-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${profileCompleteness}%` }}
          />
        </div>
        {getCompletionHints().length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {getCompletionHints().map((hint, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
              >
                + {hint}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center">
            <CheckCircleIcon className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-300">
              {lang === 'es'
                ? 'Cambios guardados exitosamente'
                : 'Changes saved successfully'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center">
            <ExclamationCircleIcon className="mr-2 h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 overflow-x-auto">
          {TAB_DEFINITIONS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {lang === 'es' ? tab.labelEs : tab.labelEn}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        {activeTab === 'personal' && (
          <PersonalTab
            formData={formData}
            setFormData={setFormData}
            onPhotoUpload={handlePhotoUpload}
            uploadingPhoto={uploadingPhoto}
            lang={lang}
          />
        )}

        {activeTab === 'career' && (
          <CareerTab
            formData={formData}
            setFormData={setFormData}
            lang={lang}
          />
        )}

        {activeTab === 'education' && (
          <EducationTab
            formData={formData}
            setFormData={setFormData}
            lang={lang}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioTab
            formData={formData}
            setFormData={setFormData}
            lang={lang}
          />
        )}

        {activeTab === 'privacy' && (
          <PrivacyTab
            formData={formData}
            setFormData={setFormData}
            lang={lang}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            user={user}
            lang={lang}
            onSuccess={() => {
              setSuccess(true);
              setTimeout(() => setSuccess(false), 3000);
            }}
            onError={(message) => setError(message)}
          />
        )}

        {/* Save Button */}
        {activeTab !== 'security' && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
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
                  {lang === 'es' ? 'Guardando...' : 'Saving...'}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="mr-2 h-5 w-5" />
                  {lang === 'es' ? 'Guardar cambios' : 'Save changes'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Administraci\u00f3n' : 'Administration'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Role */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Rol' : 'Role'}
              </label>
              <select
                value={adminRole}
                onChange={(e) => setAdminRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="member">
                  {lang === 'es' ? 'Miembro' : 'Member'}
                </option>
                <option value="collaborator">
                  {lang === 'es' ? 'Colaborador' : 'Collaborator'}
                </option>
                <option value="admin">
                  {lang === 'es' ? 'Administrador' : 'Admin'}
                </option>
                <option value="moderator">
                  {lang === 'es' ? 'Moderador' : 'Moderator'}
                </option>
              </select>
            </div>

            {/* Verification Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es'
                  ? 'Estado de verificaci\u00f3n'
                  : 'Verification status'}
              </label>
              <select
                value={adminVerificationStatus}
                onChange={(e) => setAdminVerificationStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="none">
                  {lang === 'es' ? 'Ninguno' : 'None'}
                </option>
                <option value="pending">
                  {lang === 'es' ? 'Pendiente' : 'Pending'}
                </option>
                <option value="approved">
                  {lang === 'es' ? 'Aprobado' : 'Approved'}
                </option>
                <option value="rejected">
                  {lang === 'es' ? 'Rechazado' : 'Rejected'}
                </option>
              </select>
            </div>

            {/* Lifecycle Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es'
                  ? 'Estado del ciclo de vida'
                  : 'Lifecycle status'}
              </label>
              <select
                value={adminLifecycleStatus}
                onChange={(e) => setAdminLifecycleStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">
                  {lang === 'es' ? 'Activo' : 'Active'}
                </option>
                <option value="inactive">
                  {lang === 'es' ? 'Inactivo' : 'Inactive'}
                </option>
                <option value="suspended">
                  {lang === 'es' ? 'Suspendido' : 'Suspended'}
                </option>
                <option value="pending">
                  {lang === 'es' ? 'Pendiente' : 'Pending'}
                </option>
                <option value="alumni">
                  {lang === 'es' ? 'Egresado' : 'Alumni'}
                </option>
                <option value="deactivated">
                  {lang === 'es' ? 'Desactivado' : 'Deactivated'}
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAdminSave}
              disabled={savingAdmin}
              className="inline-flex items-center rounded-lg bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingAdmin
                ? lang === 'es'
                  ? 'Guardando...'
                  : 'Saving...'
                : lang === 'es'
                  ? 'Guardar campos admin'
                  : 'Save admin fields'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileEdit;
