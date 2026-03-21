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
} from '@heroicons/react/24/outline';
import { PersonalTab } from './tabs/PersonalTab';
import { CareerTab } from './tabs/CareerTab';
import { EducationTab } from './tabs/EducationTab';
import { PortfolioTab } from './tabs/PortfolioTab';
import { PrivacyTab } from './tabs/PrivacyTab';
import { SecurityTab } from './tabs/SecurityTab';
import type { TabId } from './profile-edit-types';
import { INITIAL_FORM_DATA, COMPLETENESS_FIELDS } from './profile-edit-types';
import type { FormData } from './profile-edit-types';

interface ProfileEditProps {
  lang?: 'es' | 'en';
}

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

export const ProfileEdit: React.FC<ProfileEditProps> = ({ lang = 'es' }) => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    if (userProfile) {
      // Build work history from existing profile data
      const workHistory = userProfile.experience?.previousRoles || [];
      if (
        userProfile.currentPosition &&
        !workHistory.some((w: { current?: boolean }) => w.current)
      ) {
        workHistory.unshift({
          id: crypto.randomUUID(),
          company: userProfile.currentCompany || '',
          position: userProfile.currentPosition || '',
          startDate: new Date(),
          current: true,
        });
      }

      setFormData({
        displayName: userProfile.displayName || '',
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile['email'] || user?.email || '',
        phoneNumber: userProfile.phoneNumber || '',
        location: userProfile.location || '',
        bio: userProfile.bio || '',
        photoURL: userProfile.photoURL || '',
        currentPosition: userProfile.currentPosition || '',
        currentCompany: userProfile.currentCompany || '',
        industry: userProfile.industry || '',
        experience:
          userProfile.experience?.level || userProfile.experience || '',
        skills: userProfile.skills || [],
        workHistory,
        educationHistory: userProfile.educationHistory || [],
        certifications: userProfile.portfolio?.certifications || [],
        languages: userProfile.languages || [],
        projects: userProfile.portfolio?.projects || [],
        unamEmail: userProfile.unamEmail || '',
        graduationYear: userProfile.graduationYear || '',
        program: userProfile.program || '',
        studentId: userProfile.studentId || '',
        linkedinUrl: userProfile.linkedinUrl || '',
        githubUrl: userProfile.githubUrl || '',
        portfolioUrl: userProfile.portfolioUrl || '',
        twitterUrl: userProfile.twitterUrl || '',
        profileVisible: userProfile?.privacySettings?.profileVisible ?? true,
        contactVisible: userProfile?.privacySettings?.contactVisible ?? false,
        jobSearching: userProfile?.privacySettings?.jobSearching ?? false,
        mentorshipAvailable:
          userProfile?.privacySettings?.mentorshipAvailable ?? false,
        emailNotifications: userProfile?.notificationSettings?.email ?? true,
        pushNotifications: userProfile?.notificationSettings?.push ?? false,
        jobMatchNotifications:
          userProfile?.notificationSettings?.jobMatches ?? true,
        eventNotifications: userProfile?.notificationSettings?.events ?? true,
        forumNotifications: userProfile?.notificationSettings?.forums ?? false,
      });
    }
  }, [userProfile, user]);

  useEffect(() => {
    calculateCompleteness();
  }, [formData]);

  const calculateCompleteness = () => {
    let completed = 0;

    COMPLETENESS_FIELDS.forEach((field) => {
      if (formData[field as keyof FormData]) completed++;
    });

    if (formData.skills.length > 0) completed++;
    if (formData.photoURL) completed++;

    const percentage = Math.round(
      (completed / (COMPLETENESS_FIELDS.length + 2)) * 100
    );
    setProfileCompleteness(percentage);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
        `profiles/${user.uid}/${Date.now()}_${file.name}`
      );
      const snapshot = await uploadBytes(photoRef, file);
      const photoURL = await getDownloadURL(snapshot.ref);

      setFormData((prev) => ({ ...prev, photoURL }));

      await updateProfile(user, { photoURL });

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
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const currentWork = formData.workHistory.find((w) => w.current);

      await updateDoc(doc(db, 'users', user.uid), {
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

      await updateProfile(user, {
        displayName: formData.displayName,
        photoURL: formData.photoURL,
      });

      if (formData.email !== user.email) {
        await updateEmail(user, formData.email);
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

  return (
    <div>
      {/* Profile Completeness */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {lang === 'es' ? 'Perfil completado' : 'Profile completeness'}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {profileCompleteness}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-2 rounded-full bg-primary-600 transition-all duration-300"
            style={{ width: `${profileCompleteness}%` }}
          ></div>
        </div>
        {profileCompleteness < 100 && (
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {lang === 'es'
              ? 'Completa tu perfil para mejores oportunidades'
              : 'Complete your profile for better opportunities'}
          </p>
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
    </div>
  );
};

export default ProfileEdit;
