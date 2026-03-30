import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslations } from '../../hooks/useTranslations';
import type {
  MentorshipSession,
  MentorshipMatch,
  MentorProfile,
  MenteeProfile,
  FormState,
  ValidationError,
} from '../../types';
import {
  getMentorshipSessions,
  createMentorshipSession,
  updateMentorshipSession,
  getUserMatches,
  getMentorProfile,
  getMenteeProfile,
} from '../../lib/mentorship';

interface MentorshipSessionsProps {
  matchId?: string;
  sessionId?: string;
  mode: 'list' | 'create' | 'edit' | 'view';
  onSessionCreated?: (session: MentorshipSession) => void;
  onSessionUpdated?: (session: MentorshipSession) => void;
  onCancel?: () => void;
}

interface SessionFormData {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  type: 'video' | 'voice' | 'in-person' | 'chat';
  meetingUrl: string;
  location: string;
  agenda: string[];
  notes: string;
  resources: {
    title: string;
    url: string;
    type: 'link' | 'document' | 'video' | 'other';
  }[];
  homework: {
    title: string;
    description: string;
    dueDate: string;
    completed: boolean;
  }[];
}

/** Extended session type for fields the form uses but the base type lacks */
type ExtendedSession = MentorshipSession & {
  meetingUrl?: string;
  location?: string;
  resources?: { title: string; url: string; type: 'link' | 'document' | 'video' | 'other' }[];
};

const SESSION_TYPES = [
  { value: 'video', label: 'Video Call' },
  { value: 'voice', label: 'Voice Call' },
  { value: 'chat', label: 'Text Chat' },
  { value: 'in-person', label: 'In Person' },
] as const;

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
] as const;

const RESOURCE_TYPES = [
  { value: 'link', label: 'Website/Link' },
  { value: 'document', label: 'Document' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
] as const;

// -- Inline SVG icon components --------------------------------------------------

function SpinnerIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="14" height="14">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ClockIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="14" height="14">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function PencilIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="14" height="14">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}

function EllipsisIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
  );
}

function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="14" height="14">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
    </svg>
  );
}

function CheckCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function LinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="14" height="14">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.363-3.069a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.82" />
    </svg>
  );
}

function ExclamationIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function SaveIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

// -- Session type icon lookup --

function SessionTypeIcon({ type, className = '' }: { type: string; className?: string }) {
  switch (type) {
    case 'video':
      return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    case 'voice':
      return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      );
    case 'chat':
      return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      );
    case 'in-person':
      return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    default:
      return null;
  }
}

// -- Status badge colors --

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  'no-show': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

// =============================================================================

export default function MentorshipSessions({
  matchId,
  sessionId,
  mode = 'list',
  onSessionCreated,
  onSessionUpdated,
  onCancel,
}: MentorshipSessionsProps) {
  const { user } = useAuthContext();

  // Translation fallback for missing `t.mentorship.sessions.*` keys
  const _t = useTranslations();
  const sessionTranslations = {
    loading: 'Loading sessions...',
    errorLoading: 'Error loading sessions data',
    errorSaving: 'Error saving session',
    createSession: 'Schedule New Session',
    editSession: 'Edit Session',
    basicInfo: 'Basic Information',
    title: 'Session Title',
    titlePlaceholder: 'e.g. Career Planning Discussion',
    description: 'Description',
    descriptionPlaceholder: 'What will you discuss?',
    dateTime: 'Date & Time',
    duration: 'Duration',
    sessionType: 'Session Type',
    meetingType: 'Meeting Type',
    meetingUrl: 'Meeting URL',
    meetingUrlHelp: 'Paste your Zoom, Meet, or Teams link',
    location: 'Location',
    locationPlaceholder: 'e.g. Coffee shop, office, etc.',
    agenda: 'Agenda',
    addAgendaItem: 'Add agenda item...',
    resources: 'Resources',
    resourceTitle: 'Resource title',
    resourceUrl: 'URL',
    notes: 'Notes',
    notesPlaceholder: 'Add any notes for this session...',
    homework: 'Homework',
    validation: {
      titleRequired: 'Session title is required',
      dateRequired: 'Date and time is required',
      dateInFuture: 'Session must be scheduled in the future',
      durationMinimum: 'Duration must be at least 15 minutes',
      urlRequired: 'Meeting URL is required for video sessions',
      locationRequired: 'Location is required for in-person sessions',
    },
    createSuccess: 'Session created successfully!',
    updateSuccess: 'Session updated successfully!',
    allSessions: 'All Sessions',
    upcoming: 'Upcoming',
    completed: 'Completed',
    cancelled: 'Cancelled',
    sortByDate: 'Sort by Date',
    sortByMatch: 'Sort by Match',
    sortByStatus: 'Sort by Status',
    showing: 'Showing',
    sessions: 'sessions',
    noSessions: 'No sessions yet',
    noSessionsDescription: 'Schedule your first mentorship session to get started.',
    scheduleFirst: 'Schedule First Session',
    scheduleNew: 'Schedule Session',
    join: 'Join',
    edit: 'Edit',
    status: {
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
      'no-show': 'No Show',
    } as Record<string, string>,
    unknownUser: 'Unknown User',
    moreItems: 'more items',
    more: 'more',
    ...((_t.mentorship as Record<string, unknown>)?.sessions as Record<string, unknown> | undefined),
  };

  const t = {
    ..._t,
    mentorship: {
      ..._t.mentorship,
      sessions: sessionTranslations,
    },
    common: {
      ...((_t as unknown as Record<string, unknown>).common as Record<string, string> | undefined),
      cancel: 'Cancel',
      saving: 'Saving...',
      create: 'Create',
      save: 'Save',
    },
  };

  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [currentSession, setCurrentSession] =
    useState<MentorshipSession | null>(null);
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [mentorProfiles, setMentorProfiles] = useState<
    Map<string, MentorProfile>
  >(new Map());
  const [menteeProfiles, setMenteeProfiles] = useState<
    Map<string, MenteeProfile>
  >(new Map());

  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    type: 'video',
    meetingUrl: '',
    location: '',
    agenda: [],
    notes: '',
    resources: [],
    homework: [],
  });

  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    errors: [],
    success: false,
  });

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    'all' | 'upcoming' | 'completed' | 'cancelled'
  >('all');
  const [sortBy, setSortBy] = useState<'date' | 'match' | 'status'>('date');
  const [newAgendaItem, setNewAgendaItem] = useState('');
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    type: 'link' as const,
  });
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    dueDate: '',
    completed: false,
  });

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, matchId, sessionId]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const userMatches = await getUserMatches(user.uid);
      setMatches(userMatches.filter((m) => m.status === 'active'));

      let sessionsData: MentorshipSession[] = [];
      if (matchId) {
        sessionsData = await getMentorshipSessions({ matchId });
      } else if (sessionId) {
        sessionsData = await getMentorshipSessions({ sessionId });
        const first = sessionsData[0];
        if (first) {
          setCurrentSession(first);
          populateForm(first);
        }
      } else {
        sessionsData = await getMentorshipSessions({ userId: user.uid });
      }
      setSessions(sessionsData);

      const mentorIds = new Set<string>();
      const menteeIds = new Set<string>();

      [...userMatches, ...sessionsData].forEach((item) => {
        if ('mentorId' in item) {
          mentorIds.add(item.mentorId);
          menteeIds.add(item.menteeId);
        }
      });

      const mentorProfilesMap = new Map<string, MentorProfile>();
      const menteeProfilesMap = new Map<string, MenteeProfile>();

      await Promise.all([
        ...Array.from(mentorIds).map(async (id) => {
          try {
            const profile = await getMentorProfile(id);
            if (profile) mentorProfilesMap.set(id, profile);
          } catch (error) {
            console.error(`Error loading mentor profile ${id}:`, error);
          }
        }),
        ...Array.from(menteeIds).map(async (id) => {
          try {
            const profile = await getMenteeProfile(id);
            if (profile) menteeProfilesMap.set(id, profile);
          } catch (error) {
            console.error(`Error loading mentee profile ${id}:`, error);
          }
        }),
      ]);

      setMentorProfiles(mentorProfilesMap);
      setMenteeProfiles(menteeProfilesMap);
    } catch (error) {
      console.error('Error loading sessions data:', error);
      setFormState((prev) => ({
        ...prev,
        errors: [
          { field: 'general', message: t.mentorship.sessions.errorLoading },
        ],
      }));
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (session: MentorshipSession) => {
    const ext = session as ExtendedSession;
    setFormData({
      title: session.title,
      description: session.description || '',
      scheduledAt: new Date(session.scheduledAt).toISOString().slice(0, 16),
      duration: session.duration,
      type: session.type,
      meetingUrl: ext.meetingUrl || session.meetingLink || '',
      location: ext.location || '',
      agenda: session.agenda || [],
      notes: session.notes || '',
      resources: ext.resources || [],
      homework: (session.homework || []).map((hw) => ({
        title: hw.title,
        description: hw.description || '',
        dueDate: hw.dueDate ? new Date(hw.dueDate).toISOString().slice(0, 10) : '',
        completed: hw.completed || false,
      })),
    });
  };

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!formData.title.trim()) {
      errors.push({
        field: 'title',
        message: t.mentorship.sessions.validation.titleRequired,
      });
    }

    if (!formData.scheduledAt) {
      errors.push({
        field: 'scheduledAt',
        message: t.mentorship.sessions.validation.dateRequired,
      });
    } else {
      const scheduledDate = new Date(formData.scheduledAt);
      if (scheduledDate <= new Date()) {
        errors.push({
          field: 'scheduledAt',
          message: t.mentorship.sessions.validation.dateInFuture,
        });
      }
    }

    if (formData.duration < 15) {
      errors.push({
        field: 'duration',
        message: t.mentorship.sessions.validation.durationMinimum,
      });
    }

    if (formData.type === 'video' && !formData.meetingUrl.trim()) {
      errors.push({
        field: 'meetingUrl',
        message: t.mentorship.sessions.validation.urlRequired,
      });
    }

    if (formData.type === 'in-person' && !formData.location.trim()) {
      errors.push({
        field: 'location',
        message: t.mentorship.sessions.validation.locationRequired,
      });
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !matchId) return;

    setFormState((prev) => ({
      ...prev,
      isSubmitting: true,
      errors: [],
      success: false,
    }));

    const errors = validateForm();
    if (errors.length > 0) {
      setFormState((prev) => ({ ...prev, errors, isSubmitting: false }));
      return;
    }

    try {
      // Build session data mapping form fields to the MentorshipSession type.
      // meetingUrl -> meetingLink; location and resources are extra fields
      // that pass through to Firestore via spread.
      const sessionData = {
        matchId: matchId,
        mentorId: '',
        menteeId: '',
        title: formData.title,
        description: formData.description || undefined,
        scheduledAt: new Date(formData.scheduledAt),
        duration: formData.duration,
        type: formData.type,
        meetingLink: formData.meetingUrl || undefined,
        status: 'scheduled' as const,
        notes: formData.notes || undefined,
        agenda: formData.agenda.length > 0 ? formData.agenda : undefined,
        homework:
          formData.homework.length > 0
            ? formData.homework.map((hw) => ({
                title: hw.title,
                description: hw.description || undefined,
                dueDate: hw.dueDate ? new Date(hw.dueDate) : undefined,
                completed: hw.completed,
              }))
            : undefined,
        updatedAt: new Date(),
        // Extra fields not on MentorshipSession type but stored in Firestore
        ...(formData.location ? { location: formData.location } : {}),
        ...(formData.resources.length > 0 ? { resources: formData.resources } : {}),
      } as Partial<MentorshipSession>;

      let savedSession: MentorshipSession;

      if (mode === 'edit' && currentSession) {
        savedSession = await updateMentorshipSession(
          currentSession.id,
          sessionData,
        );
        onSessionUpdated?.(savedSession);
      } else {
        savedSession = await createMentorshipSession({
          ...sessionData,
          id: '',
          createdAt: new Date(),
        } as MentorshipSession);
        onSessionCreated?.(savedSession);
      }

      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        success: true,
        errors: [],
      }));

      await loadData();
    } catch (error) {
      console.error('Error saving session:', error);
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: [
          { field: 'general', message: t.mentorship.sessions.errorSaving },
        ],
      }));
    }
  };

  const addAgendaItem = () => {
    if (
      newAgendaItem.trim() &&
      !formData.agenda.includes(newAgendaItem.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        agenda: [...prev.agenda, newAgendaItem.trim()],
      }));
      setNewAgendaItem('');
    }
  };

  const removeAgendaItem = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      agenda: prev.agenda.filter((a) => a !== item),
    }));
  };

  const addResource = () => {
    if (newResource.title.trim() && newResource.url.trim()) {
      setFormData((prev) => ({
        ...prev,
        resources: [...prev.resources, { ...newResource }],
      }));
      setNewResource({ title: '', url: '', type: 'link' });
    }
  };

  const removeResource = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index),
    }));
  };

  const addHomework = () => {
    if (newHomework.title.trim() && newHomework.description.trim()) {
      setFormData((prev) => ({
        ...prev,
        homework: [...prev.homework, { ...newHomework }],
      }));
      setNewHomework({
        title: '',
        description: '',
        dueDate: '',
        completed: false,
      });
    }
  };

  const removeHomework = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      homework: prev.homework.filter((_, i) => i !== index),
    }));
  };

  const getFilteredSessions = () => {
    let filtered = [...sessions];

    if (filter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((session) => {
        switch (filter) {
          case 'upcoming':
            return (
              session.status === 'scheduled' &&
              new Date(session.scheduledAt) > now
            );
          case 'completed':
            return session.status === 'completed';
          case 'cancelled':
            return session.status === 'cancelled';
          default:
            return true;
        }
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime()
          );
        case 'match':
          return a.matchId.localeCompare(b.matchId);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getParticipantName = (
    session: MentorshipSession,
    role: 'mentor' | 'mentee',
  ) => {
    const profileId = role === 'mentor' ? session.mentorId : session.menteeId;
    const profile =
      role === 'mentor'
        ? mentorProfiles.get(profileId)
        : menteeProfiles.get(profileId);

    return profile?.displayName || t.mentorship.sessions.unknownUser;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isUpcoming = (date: Date) => new Date(date) > new Date();

  // ---- Tailwind class constants ----
  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300';
  const sectionHeadingClass = 'mb-4 text-lg font-semibold text-gray-900 dark:text-white';
  const primaryBtnClass =
    'inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50';
  const outlineBtnClass =
    'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700';
  const outlineBtnSmClass =
    'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700';
  const primaryBtnSmClass =
    'inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700';
  const ghostBtnSmClass =
    'inline-flex items-center rounded-lg px-2 py-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700';

  // =========================================================================
  // Loading state
  // =========================================================================

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <SpinnerIcon className="mb-3 text-primary-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t.mentorship.sessions.loading}
        </p>
      </div>
    );
  }

  // =========================================================================
  // Create / Edit form
  // =========================================================================

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="space-y-6">
        {/* Form header */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {mode === 'create'
            ? t.mentorship.sessions.createSession
            : t.mentorship.sessions.editSession}
        </h2>

        {/* Error messages */}
        {formState.errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            {formState.errors.map((error, index) => (
              <p key={index} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <ExclamationIcon className="shrink-0" />
                {error.message}
              </p>
            ))}
          </div>
        )}

        {/* Success message */}
        {formState.success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircleIcon className="shrink-0" />
              {mode === 'create'
                ? t.mentorship.sessions.createSuccess
                : t.mentorship.sessions.updateSuccess}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* -- Basic Information -- */}
          <section className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
            <h3 className={sectionHeadingClass}>{t.mentorship.sessions.basicInfo}</h3>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className={labelClass}>
                  {t.mentorship.sessions.title} *
                </label>
                <input
                  type="text"
                  id="title"
                  className={inputClass}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder={t.mentorship.sessions.titlePlaceholder}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className={labelClass}>
                  {t.mentorship.sessions.description}
                </label>
                <textarea
                  id="description"
                  className={inputClass}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t.mentorship.sessions.descriptionPlaceholder}
                  rows={3}
                />
              </div>

              {/* Date & Duration row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="scheduledAt" className={labelClass}>
                    {t.mentorship.sessions.dateTime} *
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduledAt"
                    className={inputClass}
                    value={formData.scheduledAt}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduledAt: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label htmlFor="duration" className={labelClass}>
                    {t.mentorship.sessions.duration} *
                  </label>
                  <select
                    id="duration"
                    className={inputClass}
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        duration: parseInt(e.target.value),
                      }))
                    }
                    required
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* -- Session Type -- */}
          <section className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
            <h3 className={sectionHeadingClass}>{t.mentorship.sessions.sessionType}</h3>

            <div className="space-y-4">
              <label className={labelClass}>{t.mentorship.sessions.meetingType} *</label>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {SESSION_TYPES.map((sType) => (
                  <label
                    key={sType.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
                      formData.type === sType.value
                        ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sessionType"
                      value={sType.value}
                      checked={formData.type === sType.value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value as SessionFormData['type'],
                        }))
                      }
                      className="sr-only"
                    />
                    <SessionTypeIcon
                      type={sType.value}
                      className={
                        formData.type === sType.value
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-400'
                      }
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {sType.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Meeting URL (video) */}
              {formData.type === 'video' && (
                <div>
                  <label htmlFor="meetingUrl" className={labelClass}>
                    {t.mentorship.sessions.meetingUrl} *
                  </label>
                  <input
                    type="url"
                    id="meetingUrl"
                    className={inputClass}
                    value={formData.meetingUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        meetingUrl: e.target.value,
                      }))
                    }
                    placeholder="https://zoom.us/j/123456789"
                    required={formData.type === 'video'}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t.mentorship.sessions.meetingUrlHelp}
                  </p>
                </div>
              )}

              {/* Location (in-person) */}
              {formData.type === 'in-person' && (
                <div>
                  <label htmlFor="location" className={labelClass}>
                    {t.mentorship.sessions.location} *
                  </label>
                  <input
                    type="text"
                    id="location"
                    className={inputClass}
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder={t.mentorship.sessions.locationPlaceholder}
                    required={formData.type === 'in-person'}
                  />
                </div>
              )}
            </div>
          </section>

          {/* -- Agenda -- */}
          <section className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
            <h3 className={sectionHeadingClass}>{t.mentorship.sessions.agenda}</h3>

            {formData.agenda.length > 0 && (
              <ul className="mb-4 space-y-2">
                {formData.agenda.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAgendaItem(item)}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <XIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                className={inputClass}
                placeholder={t.mentorship.sessions.addAgendaItem}
                value={newAgendaItem}
                onChange={(e) => setNewAgendaItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAgendaItem();
                  }
                }}
              />
              <button
                type="button"
                className={outlineBtnSmClass}
                onClick={addAgendaItem}
                disabled={!newAgendaItem.trim()}
              >
                <PlusIcon />
              </button>
            </div>
          </section>

          {/* -- Resources -- */}
          <section className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
            <h3 className={sectionHeadingClass}>{t.mentorship.sessions.resources}</h3>

            {formData.resources.length > 0 && (
              <div className="mb-4 space-y-2">
                {formData.resources.map((resource, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50"
                  >
                    <LinkIcon className="shrink-0 text-gray-400" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {resource.title}
                    </span>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {resource.url}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeResource(index)}
                      className="ml-auto shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
              <input
                type="text"
                className={inputClass}
                placeholder={t.mentorship.sessions.resourceTitle}
                value={newResource.title}
                onChange={(e) =>
                  setNewResource((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />
              <input
                type="url"
                className={inputClass}
                placeholder={t.mentorship.sessions.resourceUrl}
                value={newResource.url}
                onChange={(e) =>
                  setNewResource((prev) => ({
                    ...prev,
                    url: e.target.value,
                  }))
                }
              />
              <select
                className={inputClass}
                value={newResource.type}
                onChange={(e) =>
                  setNewResource((prev) => ({
                    ...prev,
                    type: e.target.value as (typeof newResource)['type'],
                  }))
                }
              >
                {RESOURCE_TYPES.map((rType) => (
                  <option key={rType.value} value={rType.value}>
                    {rType.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={outlineBtnSmClass}
                onClick={addResource}
                disabled={!newResource.title.trim() || !newResource.url.trim()}
              >
                <PlusIcon />
              </button>
            </div>
          </section>

          {/* -- Notes -- */}
          <section className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
            <h3 className={sectionHeadingClass}>{t.mentorship.sessions.notes}</h3>
            <textarea
              className={inputClass}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder={t.mentorship.sessions.notesPlaceholder}
              rows={4}
            />
          </section>

          {/* -- Form Actions -- */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className={outlineBtnClass}
              onClick={onCancel}
              disabled={formState.isSubmitting}
            >
              {t.common.cancel}
            </button>

            <button
              type="submit"
              className={primaryBtnClass}
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting ? (
                <>
                  <SpinnerIcon className="h-4 w-4" />
                  {t.common.saving}
                </>
              ) : (
                <>
                  <SaveIcon />
                  {mode === 'create' ? t.common.create : t.common.save}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // Sessions list view
  // =========================================================================

  const filteredSessions = getFilteredSessions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t.mentorship.sessions.title}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t.mentorship.sessions.description}
          </p>
        </div>

        <button className={primaryBtnClass}>
          <PlusIcon />
          {t.mentorship.sessions.scheduleNew}
        </button>
      </div>

      {/* Filters & controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <select
            className={inputClass + ' w-auto'}
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">{t.mentorship.sessions.allSessions}</option>
            <option value="upcoming">{t.mentorship.sessions.upcoming}</option>
            <option value="completed">{t.mentorship.sessions.completed}</option>
            <option value="cancelled">{t.mentorship.sessions.cancelled}</option>
          </select>

          <select
            className={inputClass + ' w-auto'}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="date">{t.mentorship.sessions.sortByDate}</option>
            <option value="match">{t.mentorship.sessions.sortByMatch}</option>
            <option value="status">{t.mentorship.sessions.sortByStatus}</option>
          </select>
        </div>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t.mentorship.sessions.showing} {filteredSessions.length}{' '}
          {t.mentorship.sessions.sessions}
        </span>
      </div>

      {/* Sessions list */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 shadow-sm dark:border dark:border-gray-700/30 dark:bg-gray-800">
            <CalendarIcon className="mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {t.mentorship.sessions.noSessions}
            </h3>
            <p className="mb-6 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
              {t.mentorship.sessions.noSessionsDescription}
            </p>
            <button className={primaryBtnClass}>
              <PlusIcon />
              {t.mentorship.sessions.scheduleFirst}
            </button>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const ext = session as ExtendedSession;
            return (
              <div
                key={session.id}
                className="rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border dark:border-gray-700/30 dark:bg-gray-800"
              >
                {/* Card header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {session.title}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[session.status] || ''}`}
                    >
                      {t.mentorship.sessions.status[session.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUpcoming(session.scheduledAt) &&
                      session.status === 'scheduled' && (
                        <button className={primaryBtnSmClass}>
                          <PlayIcon />
                          {t.mentorship.sessions.join}
                        </button>
                      )}

                    <button className={outlineBtnSmClass}>
                      <PencilIcon />
                      {t.mentorship.sessions.edit}
                    </button>

                    <button className={ghostBtnSmClass}>
                      <EllipsisIcon />
                    </button>
                  </div>
                </div>

                {/* Card details */}
                <div className="mt-4 space-y-3">
                  {/* Time */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-1.5">
                      <ClockIcon className="text-gray-400" />
                      {new Date(session.scheduledAt).toLocaleString()}
                      <span className="text-gray-400">
                        ({formatDuration(session.duration)})
                      </span>
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <UserIcon className="text-blue-500" />
                      {getParticipantName(session, 'mentor')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <UserIcon className="text-green-500" />
                      {getParticipantName(session, 'mentee')}
                    </span>
                  </div>

                  {/* Session type */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <SessionTypeIcon type={session.type} className="h-4 w-4" />
                    <span>
                      {SESSION_TYPES.find((st) => st.value === session.type)?.label}
                    </span>
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {session.description}
                    </p>
                  )}

                  {/* Agenda */}
                  {session.agenda && session.agenda.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t.mentorship.sessions.agenda}
                      </h4>
                      <ul className="space-y-1">
                        {session.agenda.slice(0, 3).map((item, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                          >
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                            {item}
                          </li>
                        ))}
                        {session.agenda.length > 3 && (
                          <li className="text-xs text-gray-400">
                            +{session.agenda.length - 3}{' '}
                            {t.mentorship.sessions.moreItems}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Resources */}
                  {ext.resources && ext.resources.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t.mentorship.sessions.resources}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {ext.resources.slice(0, 2).map((resource, index) => (
                          <a
                            key={index}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-primary-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-primary-400 dark:hover:bg-gray-600"
                          >
                            <LinkIcon />
                            {resource.title}
                          </a>
                        ))}
                        {ext.resources.length > 2 && (
                          <span className="inline-flex items-center text-xs text-gray-400">
                            +{ext.resources.length - 2}{' '}
                            {t.mentorship.sessions.more}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Homework */}
                  {session.homework && session.homework.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t.mentorship.sessions.homework}
                      </h4>
                      <div className="space-y-1">
                        {session.homework.slice(0, 2).map((hw, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 text-sm ${
                              hw.completed
                                ? 'text-green-600 line-through dark:text-green-400'
                                : 'text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {hw.completed ? (
                              <CheckCircleIcon className="shrink-0 text-green-500" />
                            ) : (
                              <CircleIcon className="shrink-0 text-gray-400" />
                            )}
                            <span>{hw.title}</span>
                          </div>
                        ))}
                        {session.homework.length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{session.homework.length - 2}{' '}
                            {t.mentorship.sessions.more}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
