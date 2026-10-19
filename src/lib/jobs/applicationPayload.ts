import { serverTimestamp, type DocumentData } from 'firebase/firestore';

/**
 * Builds the Firestore documents JobApplicationModal writes when a member
 * applies to a job. Kept out of the component so tests/rules can assert
 * that exactly what the client sends is what firestore.rules accept.
 *
 * firestore.rules (`jobs/{jobId}/applications`) require on create:
 *   applicantId == request.auth.uid, jobId == {jobId},
 *   createdAt == request.time, status == 'submitted'.
 * The mirror under `users/{uid}/applications` (what /dashboard/applications
 * lists) is owner-only and carries the same status.
 */
export const APPLICATION_STATUS = {
  SUBMITTED: 'submitted',
  WITHDRAWN: 'withdrawn',
} as const;

export interface JobApplicationInput {
  jobId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantProfile: {
    skills: unknown[];
    experience: unknown[];
    education: unknown[];
  };
  coverLetter: string;
  resumeUrl?: string;
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

export interface ApplicationMirrorInput {
  jobId: string;
  applicationId: string;
  jobTitle?: string;
  company?: string;
  location?: string;
}

/** Firestore rejects `undefined` values; drop them instead of failing. */
function withoutUndefined(data: DocumentData): DocumentData {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

/** Document for `jobs/{jobId}/applications/{applicationId}`. */
export function buildJobApplicationDoc(
  input: JobApplicationInput
): DocumentData {
  return withoutUndefined({
    ...input,
    createdAt: serverTimestamp(),
    appliedAt: serverTimestamp(),
    status: APPLICATION_STATUS.SUBMITTED,
    viewed: false,
    shortlisted: false,
    rejected: false,
  });
}

/** Mirror document for `users/{uid}/applications/{id}` (the dashboard list). */
export function buildApplicationMirrorDoc(
  input: ApplicationMirrorInput
): DocumentData {
  return withoutUndefined({
    ...input,
    createdAt: serverTimestamp(),
    appliedAt: serverTimestamp(),
    status: APPLICATION_STATUS.SUBMITTED,
  });
}
