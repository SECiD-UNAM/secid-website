/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Firebase Configuration
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_FIREBASE_MEASUREMENT_ID?: string;

  // Application Settings
  readonly PUBLIC_APP_URL: string;
  readonly PUBLIC_APP_NAME: string;
  readonly PUBLIC_DEFAULT_LOCALE: string;
  readonly PUBLIC_SUPPORTED_LOCALES: string;

  // Feature Flags
  readonly PUBLIC_FEATURE_MENTORSHIP: string;
  readonly PUBLIC_FEATURE_JOB_BOARD: string;
  readonly PUBLIC_FEATURE_EVENTS: string;
  readonly PUBLIC_FEATURE_FORUMS: string;
  readonly PUBLIC_FEATURE_BLOG: string;

  // Development Settings
  readonly PUBLIC_DEBUG_MODE: string;
  readonly PUBLIC_USE_EMULATORS: string;

  // Analytics (Optional)
  readonly PUBLIC_GA_TRACKING_ID?: string;
  readonly PUBLIC_HOTJAR_ID?: string;

  // Email Service (Optional)
  readonly PUBLIC_EMAILJS_SERVICE_ID?: string;
  readonly PUBLIC_EMAILJS_TEMPLATE_ID?: string;
  readonly PUBLIC_EMAILJS_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Astro Image types
declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.avif' {
  const src: string;
  export default src;
}

// Global type augmentations
declare global {
  interface Window {
    // For Firebase Analytics
    gtag?: (...args: any[]) => void;
    // For any other global scripts
    __SECID__?: {
      version: string;
      environment: 'development' | 'production';
    };
  }
}

// Ensure this file is treated as a module
export {};
