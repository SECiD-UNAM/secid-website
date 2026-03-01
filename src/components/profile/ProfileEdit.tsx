// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase';
import {
  UserCircleIcon,
  CameraIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  LinkIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ProfileEditProps {
  lang?: 'es' | 'en';
}

interface FormData {
  // Personal Information
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
  bio: string;
  photoURL: string;

  // Professional Information
  currentPosition: string;
  currentCompany: string;
  industry: string;
  experience: string;
  skills: string[];

  // Education
  unamEmail: string;
  graduationYear: string;
  program: string;
  studentId: string;

  // Social Links
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  twitterUrl: string;

  // Privacy Settings
  profileVisible: boolean;
  contactVisible: boolean;
  jobSearching: boolean;
  mentorshipAvailable: boolean;

  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  jobMatchNotifications: boolean;
  eventNotifications: boolean;
  forumNotifications: boolean;
}

export const ProfileEdit: React.FC<ProfileEditProps> = ({ lang = 'es' }) => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'personal' | 'professional' | 'education' | 'privacy' | 'security'
  >('personal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentSkill, setCurrentSkill] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    location: '',
    bio: '',
    photoURL: '',
    currentPosition: '',
    currentCompany: '',
    industry: '',
    experience: '',
    skills: [],
    unamEmail: '',
    graduationYear: '',
    program: '',
    studentId: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    twitterUrl: '',
    profileVisible: true,
    contactVisible: false,
    jobSearching: false,
    mentorshipAvailable: false,
    emailNotifications: true,
    pushNotifications: false,
    jobMatchNotifications: true,
    eventNotifications: true,
    forumNotifications: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (userProfile) {
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
        experience: userProfile.experience || '',
        skills: userProfile.skills || [],
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
      calculateCompleteness();
    }
  }, [userProfile, user]);

  const calculateCompleteness = () => {
    let completed = 0;
    const fields = [
      'displayName',
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'location',
      'bio',
      'currentPosition',
      'currentCompany',
      'industry',
      'experience',
      'unamEmail',
      'graduationYear',
      'program',
    ];

    fields['forEach']((field) => {
      if (formData[field as keyof FormData]) completed++;
    });

    if (formData.skills.length > 0) completed++;
    if (formData.photoURL) completed++;

    const percentage = Math.round((completed / (fields['length'] + 2)) * 100);
    setProfileCompleteness(percentage);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file['type'].startsWith('image/')) {
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
        `profiles/${user.uid}/${Date.now()}_${file['name']}`
      );
      const snapshot = await uploadBytes(photoRef, file);
      const photoURL = await getDownloadURL(snapshot['ref']);

      setFormData((prev) => ({ ...prev, photoURL }));

      // Update auth profile
      await updateProfile(user, { photoURL });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError(
        lang === 'es' ? 'Error al subir la foto' : 'Error uploading photo'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()],
      }));
      setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      // Update Firestore profile
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        location: formData.location,
        bio: formData.bio,
        photoURL: formData.photoURL,
        currentPosition: formData.currentPosition,
        currentCompany: formData.currentCompany,
        industry: formData.industry,
        experience: formData.experience,
        skills: formData.skills,
        unamEmail: formData.unamEmail,
        graduationYear: formData.graduationYear,
        program: formData.program,
        linkedinUrl: formData.linkedinUrl,
        githubUrl: formData.githubUrl,
        portfolioUrl: formData.portfolioUrl,
        twitterUrl: formData.twitterUrl,
        privacySettings: {
          profileVisible: formData.profileVisible,
          contactVisible: formData.contactVisible,
          jobSearching: formData.jobSearching,
          mentorshipAvailable: formData.mentorshipAvailable,
        },
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

      // Update auth profile
      await updateProfile(user, {
        displayName: formData.displayName,
        photoURL: formData.photoURL,
      });

      // Update email if changed
      if (formData['email'] !== user['email']) {
        await updateEmail(user, formData['email']);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError(
        error['message'] ||
          (lang === 'es'
            ? 'Error al guardar el perfil'
            : 'Error saving profile')
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(
        lang === 'es'
          ? 'Las contraseñas no coinciden'
          : 'Passwords do not match'
      );
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError(
        lang === 'es'
          ? 'La contraseña debe tener al menos 6 caracteres'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updatePassword(user, passwordData.newPassword);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      setError(
        error['message'] ||
          (lang === 'es'
            ? 'Error al actualizar la contraseña'
            : 'Error updating password')
      );
    } finally {
      setSaving(false);
    }
  };

  const suggestedSkills = [
    'Python',
    'R',
    'SQL',
    'Machine Learning',
    'Deep Learning',
    'TensorFlow',
    'PyTorch',
    'Pandas',
    'NumPy',
    'Scikit-learn',
    'Data Visualization',
    'Tableau',
    'Power BI',
    'Statistics',
    'NLP',
    'Computer Vision',
    'AWS',
    'Azure',
    'GCP',
    'Docker',
    'Kubernetes',
    'Git',
  ];

  return (
    <div>
      {/* Header removed - rendered by Astro page wrapper */}

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
          {[
            {
              id: 'personal',
              label: lang === 'es' ? 'Personal' : 'Personal',
              icon: UserCircleIcon,
            },
            {
              id: 'professional',
              label: lang === 'es' ? 'Profesional' : 'Professional',
              icon: BriefcaseIcon,
            },
            {
              id: 'education',
              label: lang === 'es' ? 'Educación' : 'Education',
              icon: AcademicCapIcon,
            },
            {
              id: 'privacy',
              label: lang === 'es' ? 'Privacidad' : 'Privacy',
              icon: EyeIcon,
            },
            {
              id: 'security',
              label: lang === 'es' ? 'Seguridad' : 'Security',
              icon: ShieldCheckIcon,
            },
          ].map((tab) => (
            <button
              key={tab['id']}
              onClick={() => setActiveTab(tab['id'] as any)}
              className={`flex items-center whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab['id']
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        {activeTab === 'personal' && (
          <div className="space-y-6">
            {/* Profile Photo */}
            <div>
              <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Foto de perfil' : 'Profile photo'}
              </label>
              <div className="flex items-center space-x-6">
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
                  <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary-600 p-1 hover:bg-primary-700">
                    <CameraIcon className="h-5 w-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    {lang === 'es'
                      ? 'JPG, GIF o PNG. Máximo 5MB.'
                      : 'JPG, GIF or PNG. Max 5MB.'}
                  </p>
                  {uploadingPhoto && (
                    <p className="text-primary-600 dark:text-primary-400">
                      {lang === 'es' ? 'Subiendo...' : 'Uploading...'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Nombre' : 'First name'} *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Apellido' : 'Last name'} *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Nombre para mostrar' : 'Display name'} *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <EnvelopeIcon className="mr-1 inline h-4 w-4" />
                  {lang === 'es' ? 'Correo electrónico' : 'Email'} *
                </label>
                <input
                  type="email"
                  value={formData['email']}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <PhoneIcon className="mr-1 inline h-4 w-4" />
                  {lang === 'es' ? 'Teléfono' : 'Phone'}
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="+52 55 1234 5678"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                <MapPinIcon className="mr-1 inline h-4 w-4" />
                {lang === 'es' ? 'Ubicación' : 'Location'}
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={
                  lang === 'es' ? 'Ciudad de México, CDMX' : 'Mexico City, CDMX'
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Biografía' : 'Bio'}
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={
                  lang === 'es'
                    ? 'Cuéntanos sobre ti...'
                    : 'Tell us about yourself...'
                }
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.bio.length}/500{' '}
                {lang === 'es' ? 'caracteres' : 'characters'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'professional' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={
                    lang === 'es'
                      ? 'Ej: Data Scientist Senior'
                      : 'Ex: Senior Data Scientist'
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Empresa actual' : 'Current company'}
                </label>
                <input
                  type="text"
                  value={formData.currentCompany}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentCompany: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Industria' : 'Industry'}
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      industry: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {lang === 'es' ? 'Selecciona...' : 'Select...'}
                  </option>
                  <option value="technology">
                    {lang === 'es' ? 'Tecnología' : 'Technology'}
                  </option>
                  <option value="finance">
                    {lang === 'es' ? 'Finanzas' : 'Finance'}
                  </option>
                  <option value="healthcare">
                    {lang === 'es' ? 'Salud' : 'Healthcare'}
                  </option>
                  <option value="retail">
                    {lang === 'es' ? 'Retail' : 'Retail'}
                  </option>
                  <option value="education">
                    {lang === 'es' ? 'Educación' : 'Education'}
                  </option>
                  <option value="consulting">
                    {lang === 'es' ? 'Consultoría' : 'Consulting'}
                  </option>
                  <option value="manufacturing">
                    {lang === 'es' ? 'Manufactura' : 'Manufacturing'}
                  </option>
                  <option value="government">
                    {lang === 'es' ? 'Gobierno' : 'Government'}
                  </option>
                  <option value="other">
                    {lang === 'es' ? 'Otro' : 'Other'}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Experiencia' : 'Experience'}
                </label>
                <select
                  value={formData.experience}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      experience: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {lang === 'es' ? 'Selecciona...' : 'Select...'}
                  </option>
                  <option value="0-1">
                    {lang === 'es' ? 'Menos de 1 año' : 'Less than 1 year'}
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
                    {lang === 'es' ? 'Más de 10 años' : 'More than 10 years'}
                  </option>
                </select>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Habilidades' : 'Skills'}
              </label>
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), handleAddSkill())
                  }
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={
                    lang === 'es' ? 'Agregar habilidad...' : 'Add skill...'
                  }
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              {formData.skills.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
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
                  {suggestedSkills
                    .filter((skill) => !formData.skills.includes(skill))
                    .slice(0, 10)
                    .map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            skills: [...prev.skills, skill],
                          }))
                        }
                        className="rounded bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                      >
                        +{skill}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Enlaces sociales' : 'Social links'}
              </h3>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <LinkIcon className="mr-1 inline h-4 w-4" />
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      linkedinUrl: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                  value={formData.githubUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      githubUrl: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="https://github.com/username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <GlobeAltIcon className="mr-1 inline h-4 w-4" />
                  {lang === 'es' ? 'Portafolio' : 'Portfolio'}
                </label>
                <input
                  type="url"
                  value={formData.portfolioUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      portfolioUrl: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="https://portfolio.com"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'education' && (
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Correo UNAM' : 'UNAM Email'} *
              </label>
              <input
                type="email"
                value={formData.unamEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    unamEmail: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="usuario@alumno.unam.mx"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Año de graduación' : 'Graduation year'} *
                </label>
                <input
                  type="number"
                  value={formData.graduationYear}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      graduationYear: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="2024"
                  min="2000"
                  max={new Date().getFullYear() + 5}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'es' ? 'Número de cuenta' : 'Student ID'}
                </label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      studentId: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="123456789"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'es' ? 'Programa académico' : 'Academic program'} *
              </label>
              <select
                value={formData.program}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, program: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">
                  {lang === 'es' ? 'Selecciona...' : 'Select...'}
                </option>
                <option value="licenciatura-ciencia-datos">
                  {lang === 'es'
                    ? 'Licenciatura en Ciencia de Datos'
                    : 'Bachelor in Data Science'}
                </option>
                <option value="maestria-ciencia-datos">
                  {lang === 'es'
                    ? 'Maestría en Ciencia de Datos'
                    : 'Master in Data Science'}
                </option>
                <option value="doctorado-ciencia-datos">
                  {lang === 'es'
                    ? 'Doctorado en Ciencia de Datos'
                    : 'PhD in Data Science'}
                </option>
                <option value="especializacion">
                  {lang === 'es' ? 'Especialización' : 'Specialization'}
                </option>
                <option value="diplomado">
                  {lang === 'es' ? 'Diplomado' : 'Certificate Program'}
                </option>
              </select>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <AcademicCapIcon className="mr-1 inline h-4 w-4" />
                {lang === 'es'
                  ? 'La verificación UNAM te da acceso a beneficios exclusivos para egresados'
                  : 'UNAM verification gives you access to exclusive alumni benefits'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                {lang === 'es'
                  ? 'Configuración de privacidad'
                  : 'Privacy settings'}
              </h3>

              <div className="space-y-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.profileVisible}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        profileVisible: e.target.checked,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es' ? 'Perfil público' : 'Public profile'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Tu perfil será visible para otros miembros'
                        : 'Your profile will be visible to other members'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.contactVisible}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactVisible: e.target.checked,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es'
                        ? 'Mostrar información de contacto'
                        : 'Show contact information'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Permite que otros miembros vean tu email y teléfono'
                        : 'Allow other members to see your email and phone'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.jobSearching}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        jobSearching: e.target.checked,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es' ? 'Buscando empleo' : 'Job seeking'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Indica que estás abierto a nuevas oportunidades'
                        : "Indicate that you're open to new opportunities"}
                    </p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.mentorshipAvailable}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        mentorshipAvailable: e.target.checked,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es'
                        ? 'Disponible como mentor'
                        : 'Available as mentor'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Otros miembros pueden contactarte para mentoría'
                        : 'Other members can contact you for mentorship'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Notificaciones' : 'Notifications'}
              </h3>

              <div className="space-y-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        emailNotifications: e.target.checked,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es'
                        ? 'Notificaciones por email'
                        : 'Email notifications'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Recibe actualizaciones importantes por correo'
                        : 'Receive important updates via email'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.jobMatchNotifications}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        jobMatchNotifications: e.target.checked,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es' ? 'Alertas de empleos' : 'Job alerts'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Notificaciones sobre empleos que coincidan con tu perfil'
                        : 'Notifications about jobs matching your profile'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.eventNotifications}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        eventNotifications: e.target.checked,
                      }))
                    }
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {lang === 'es'
                        ? 'Recordatorios de eventos'
                        : 'Event reminders'}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {lang === 'es'
                        ? 'Recordatorios sobre eventos próximos'
                        : 'Reminders about upcoming events'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Cambiar contraseña' : 'Change password'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {lang === 'es' ? 'Nueva contraseña' : 'New password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-500 dark:text-gray-400"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {lang === 'es'
                      ? 'Confirmar contraseña'
                      : 'Confirm password'}
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <button
                  onClick={handlePasswordChange}
                  disabled={
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword ||
                    saving
                  }
                  className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {lang === 'es' ? 'Actualizar contraseña' : 'Update password'}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <ShieldCheckIcon className="mr-1 inline h-4 w-4" />
                {lang === 'es'
                  ? 'Mantén tu cuenta segura usando una contraseña fuerte y única'
                  : 'Keep your account secure by using a strong, unique password'}
              </p>
            </div>
          </div>
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
