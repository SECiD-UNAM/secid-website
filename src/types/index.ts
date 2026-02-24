// Base types for the SECiD application

export interface User {
  id: string;
  email: string;
  name: string;
  graduationYear?: number;
  specialization?: string;
  currentCompany?: string;
  currentPosition?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  isActive: boolean;
  joinedAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote';
  level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  description: string;
  requirements: string[];
  benefits?: string[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  applicationUrl: string;
  contactEmail?: string;
  postedBy: string; // User ID
  postedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  tags: string[];
  remoteAllowed: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  location?: string;
  isVirtual: boolean;
  maxAttendees?: number;
  currentAttendees: number;
  registrationUrl?: string;
  organizerId: string; // User ID
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tags: string[];
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  authorId: string; // User ID
  publishedAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  featuredImage?: string;
  tags: string[];
  slug: string;
}

export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
  timestamp: Date;
}

export interface JobApplicationForm {
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  resumeUrl?: string;
  coverLetter?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  timestamp: Date;
}

export interface MemberRegistrationForm {
  email: string;
  name: string;
  graduationYear: number;
  specialization: string;
  currentCompany?: string;
  currentPosition?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  agreeToTerms: boolean;
  allowEmailNotifications: boolean;
  timestamp: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isSubmitting: boolean;
  errors: ValidationError[];
  success: boolean;
  message?: string;
}

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  children?: NavItem[];
}

// SEO types
export interface SEOData {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: Date;
}

// Theme types
export type Theme = 'light' | 'dark' | 'auto';

// Language types (re-exported from i18n)
export type Language = 'es' | 'en';

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  external?: boolean;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

// Utility types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export type SortOrder = 'asc' | 'desc';

export interface SortConfig<T = string> {
  key: T;
  direction: SortOrder;
}

export interface FilterConfig {
  [key: string]: any;
}

// Firebase types
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Environment types
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  SITE_URL: string;
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID?: string;
  AMPLITUDE_API_KEY?: string;
}

// Re-export types from other modules
// Note: Explicit re-exports resolve ambiguity when multiple modules
// define types with the same name (Resource, Conversation, Certificate).
export * from './forum';
export * from './member';
export * from './user';
export * from './job';
export * from './assessment';
export * from './resource';
export * from './mentorship';
export * from './notification';
export * from './messaging';
export * from './subscription';
export * from './learning';

// Resolve ambiguous re-exports by explicitly choosing the canonical source
export { type Resource } from './resource';
export { type Conversation } from './messaging';
export { type Certificate } from './learning';
