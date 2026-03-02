/**
 * Shared types and constants for ProfileEdit sub-components.
 */

export interface FormData {
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

export type TabId = 'personal' | 'professional' | 'education' | 'privacy' | 'security';

export interface ProfileTabProps {
  lang: 'es' | 'en';
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export const INITIAL_FORM_DATA: FormData = {
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
};

export const SUGGESTED_SKILLS = [
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

export const COMPLETENESS_FIELDS = [
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
] as const;
