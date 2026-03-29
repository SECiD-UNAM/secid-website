import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import type { MentorProfile, MenteeProfile, MentorshipRequest } from '@/types';
import {
  getMentorProfiles,
  getMenteeProfile,
  calculateMatchScore,
  getMentorshipRequests,
} from '@/lib/mentorship';
import { UniversalListing } from '@components/listing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import type { FilterDefinition, ViewMode } from '@lib/listing/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchResult {
  /** Flattened from MentorProfile.id — used by the adapter as the record key */
  id: string;
  mentor: MentorProfile;
  score: number;
  reasons: string[];
  compatibility: {
    skills: number;
    availability: number;
    style: number;
    language: number;
    experience: number;
  };
  // Flat fields for ClientSideAdapter filtering and sorting
  rating: number;
  yearsInField: number;
  hoursPerWeek: number;
  experienceLevel: 'junior' | 'mid' | 'senior';
  expertiseAreas: string[];
  mentorshipStyles: string[];
  languages: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExperienceLevel(years: number): 'junior' | 'mid' | 'senior' {
  if (years < 3) return 'junior';
  if (years < 7) return 'mid';
  return 'senior';
}

function getCompatibilityColor(score: number): string {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-blue-600';
  if (score >= 0.4) return 'text-yellow-600';
  return 'text-red-500';
}

function buildMatchResults(
  mentors: MentorProfile[],
  scores: Map<
    string,
    {
      score: number;
      reasons: string[];
      compatibility: MatchResult['compatibility'];
    }
  >
): MatchResult[] {
  return mentors
    .filter((m) => m.isActive && m.currentMentees < m.maxMentees)
    .map((mentor) => {
      const data = scores.get(mentor.id) ?? {
        score: 0,
        reasons: [],
        compatibility: {
          skills: 0,
          availability: 0,
          style: 0,
          language: 0,
          experience: 0,
        },
      };
      return {
        id: mentor.id,
        mentor,
        score: data.score,
        reasons: data.reasons,
        compatibility: data.compatibility,
        // Flat projection for adapter
        rating: mentor.rating,
        yearsInField: mentor.experience.yearsInField,
        hoursPerWeek: mentor.availability.hoursPerWeek,
        experienceLevel: getExperienceLevel(mentor.experience.yearsInField),
        expertiseAreas: mentor.expertiseAreas,
        mentorshipStyles: mentor.mentorshipStyle,
        languages: mentor.languages,
      };
    });
}

function buildFilterDefinitions(
  t: ReturnType<typeof useTranslations>
): FilterDefinition[] {
  return [
    {
      key: 'experienceLevel',
      label: t?.mentorship?.matcher?.experienceLevel ?? 'Experience Level',
      type: 'select',
      placeholder: t?.mentorship?.matcher?.anyExperience ?? 'Any',
      options: [
        {
          value: 'junior',
          label: t?.mentorship?.matcher?.juniorLevel ?? 'Junior (1–3 yrs)',
        },
        {
          value: 'mid',
          label: t?.mentorship?.matcher?.midLevel ?? 'Mid (3–7 yrs)',
        },
        {
          value: 'senior',
          label: t?.mentorship?.matcher?.seniorLevel ?? 'Senior (7+ yrs)',
        },
      ],
    },
    {
      key: 'mentorshipStyles',
      label: t?.mentorship?.matcher?.style ?? 'Mentorship Style',
      type: 'multiselect',
      options: [
        { value: 'hands-on', label: 'Hands-on' },
        { value: 'structured', label: 'Structured' },
        { value: 'exploratory', label: 'Exploratory' },
        { value: 'coaching', label: 'Coaching' },
      ],
    },
    {
      key: 'languages',
      label: t?.mentorship?.matcher?.language ?? 'Languages',
      type: 'multiselect',
      options: [
        { value: 'es', label: 'Español' },
        { value: 'en', label: 'English' },
        { value: 'pt', label: 'Português' },
        { value: 'fr', label: 'Français' },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Match card subcomponent
// ---------------------------------------------------------------------------

interface MatchCardProps {
  result: MatchResult;
  rank: number;
  hasPendingRequest: boolean;
  onRequestMentorship: (mentor: MentorProfile) => void;
  t: ReturnType<typeof useTranslations>;
}

function MatchCard({
  result,
  rank,
  hasPendingRequest,
  onRequestMentorship,
  t,
}: MatchCardProps) {
  const scorePercent = Math.round(result.score * 100);
  const scoreColor = getCompatibilityColor(result.score);

  return (
    <div className="match-card rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      {/* Ranking & Score */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">#{rank}</span>
        <span className={`text-2xl font-bold ${scoreColor}`}>
          {scorePercent}%
        </span>
      </div>

      {/* Mentor Info */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          {result.mentor.profileImage ? (
            <img
              src={result.mentor.profileImage}
              alt={result.mentor.displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <i className="fas fa-user text-gray-400" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {result.mentor.displayName}
          </h3>
          <p className="text-sm text-gray-500">
            {result.mentor.experience.currentPosition} &mdash;{' '}
            {result.mentor.experience.currentCompany}
          </p>
          <p className="text-xs text-gray-400">
            {result.mentor.experience.yearsInField}{' '}
            {t?.mentorship?.matcher?.yearsExperience ?? 'years'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex gap-4 text-sm">
        <span>
          <span className="font-semibold">
            {result.mentor.rating.toFixed(1)}
          </span>{' '}
          <span className="text-yellow-400">&#9733;</span>
        </span>
        <span>
          <span className="font-semibold">{result.mentor.totalSessions}</span>{' '}
          {t?.mentorship?.matcher?.sessions ?? 'sessions'}
        </span>
        <span>
          <span className="font-semibold">
            {result.mentor.currentMentees}/{result.mentor.maxMentees}
          </span>{' '}
          {t?.mentorship?.matcher?.mentees ?? 'mentees'}
        </span>
      </div>

      {/* Compatibility Breakdown */}
      <div className="mb-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t?.mentorship?.matcher?.compatibilityBreakdown ?? 'Compatibility'}
        </h4>
        {(
          [
            ['skills', result.compatibility.skills],
            ['availability', result.compatibility.availability],
            ['style', result.compatibility.style],
            ['language', result.compatibility.language],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="mb-1 flex items-center gap-2 text-xs">
            <span className="w-20 capitalize text-gray-500">
              {t?.mentorship?.matcher?.[key] ?? key}
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-1.5 rounded-full bg-blue-500"
                style={{ width: `${Math.round(value * 100)}%` }}
              />
            </div>
            <span className="w-8 text-right text-gray-500">
              {Math.round(value * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Match Reasons */}
      {result.reasons.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t?.mentorship?.matcher?.whyThisMatch ?? 'Why this match'}
          </h4>
          <ul className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
            {result.reasons.slice(0, 3).map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expertise Tags */}
      <div className="mb-4 flex flex-wrap gap-1">
        {result.mentor.expertiseAreas.slice(0, 4).map((area, idx) => (
          <span
            key={idx}
            className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          >
            {area}
          </span>
        ))}
        {result.mentor.expertiseAreas.length > 4 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            +{result.mentor.expertiseAreas.length - 4}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
        >
          {t?.mentorship?.matcher?.viewProfile ?? 'View Profile'}
        </button>

        {hasPendingRequest ? (
          <button
            type="button"
            disabled
            className="flex-1 cursor-not-allowed rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-400 dark:bg-gray-700"
          >
            {t?.mentorship?.matcher?.requestPending ?? 'Request Pending'}
          </button>
        ) : (
          <button
            type="button"
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            onClick={() => onRequestMentorship(result.mentor)}
          >
            {t?.mentorship?.matcher?.requestMentorship ?? 'Request Mentorship'}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Request modal subcomponent
// ---------------------------------------------------------------------------

interface RequestModalProps {
  mentor: MentorProfile;
  menteeGoals: string[];
  onClose: () => void;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations>;
}

function RequestModal({
  mentor,
  menteeGoals,
  onClose,
  onConfirm,
  t,
}: RequestModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t?.mentorship?.matcher?.requestMentorship ?? 'Request Mentorship'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            {mentor.profileImage ? (
              <img
                src={mentor.profileImage}
                alt={mentor.displayName}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <i className="fas fa-user text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {mentor.displayName}
            </p>
            <p className="text-sm text-gray-500">
              {mentor.experience.currentPosition} at{' '}
              {mentor.experience.currentCompany}
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {t?.mentorship?.matcher?.requestModalDescription ??
            'Send a request to this mentor'}
        </p>

        {menteeGoals.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t?.mentorship?.matcher?.yourGoals ?? 'Your Goals'}
            </h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {menteeGoals.slice(0, 3).map((goal, idx) => (
                <li key={idx}>{goal}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
          >
            {t?.common?.cancel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t?.mentorship?.matcher?.continueRequest ?? 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MentorshipMatcher({
  onCreateProfile,
}: { onCreateProfile?: () => void } = {}) {
  const { user } = useAuthContext();
  const t = useTranslations();

  const [menteeProfile, setMenteeProfile] = useState<MenteeProfile | null>(
    null
  );
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [existingRequests, setExistingRequests] = useState<MentorshipRequest[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(
    null
  );
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Load mentors, mentee profile, and requests
  useEffect(() => {
    if (!user) return;

    const userId = user.uid;
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [menteeData, mentorsData, requestsData] = await Promise.all([
          getMenteeProfile(userId),
          getMentorProfiles(),
          getMentorshipRequests({ menteeId: userId }),
        ]);

        if (cancelled) return;

        if (!menteeData) {
          setLoading(false);
          return;
        }

        setMenteeProfile(menteeData);
        setExistingRequests(requestsData);

        const activeMentors = mentorsData.filter(
          (m) => m.isActive && m.currentMentees < m.maxMentees
        );

        const scoreMap = new Map<
          string,
          {
            score: number;
            reasons: string[];
            compatibility: MatchResult['compatibility'];
          }
        >();

        await Promise.all(
          activeMentors.map(async (mentor) => {
            const result = await calculateMatchScore(menteeData, mentor);
            scoreMap.set(mentor.id, result);
          })
        );

        if (cancelled) return;

        const results = buildMatchResults(activeMentors, scoreMap);
        results.sort((a, b) => b.score - a.score);
        setMatchResults(results);
      } catch (err) {
        console.error('Error loading mentorship matcher data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Build adapter when results change (small collection — client-side is appropriate)
  const adapter = useMemo(
    () =>
      new ClientSideAdapter<MatchResult>({
        initialData: matchResults,
        searchFields: ['id'],
        getId: (r) => r.id,
        toSearchable: (r) =>
          [
            r.mentor.displayName,
            r.mentor.experience.currentPosition,
            r.mentor.experience.currentCompany,
            r.mentor.bio,
            r.mentor.expertiseAreas.join(' '),
            r.mentor.languages.join(' '),
          ]
            .filter(Boolean)
            .join(' '),
      }),
    [matchResults]
  );

  const filterDefinitions = useMemo(() => buildFilterDefinitions(t), [t]);

  const sortOptions = useMemo(
    () => [
      {
        value: 'score-desc',
        label: t?.mentorship?.matcher?.compatibility ?? 'Compatibility',
        field: 'score',
        direction: 'desc' as const,
      },
      {
        value: 'rating-desc',
        label: t?.mentorship?.matcher?.rating ?? 'Rating',
        field: 'rating',
        direction: 'desc' as const,
      },
      {
        value: 'yearsInField-desc',
        label: t?.mentorship?.matcher?.experience ?? 'Experience',
        field: 'yearsInField',
        direction: 'desc' as const,
      },
    ],
    [t]
  );

  const pendingMentorIds = useMemo(
    () =>
      new Set(
        existingRequests
          .filter((r) => r.status === 'pending')
          .map((r) => r.mentorId)
      ),
    [existingRequests]
  );

  const handleRequestMentorship = (mentor: MentorProfile) => {
    setSelectedMentor(mentor);
    setShowRequestModal(true);
  };

  const handleModalClose = () => {
    setShowRequestModal(false);
    setSelectedMentor(null);
  };

  const handleModalConfirm = () => {
    setShowRequestModal(false);
    setSelectedMentor(null);
  };

  // Guard: loading
  if (loading) {
    return (
      <div className="mentorship-matcher loading flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">
            {t?.mentorship?.matcher?.loading ?? 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Guard: no mentee profile
  if (!menteeProfile) {
    return (
      <div className="mentorship-matcher no-profile flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <i className="fas fa-user-plus text-4xl text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t?.mentorship?.matcher?.createProfile ?? 'Create Your Profile'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t?.mentorship?.matcher?.createProfileDescription ?? ''}
          </p>
          <button
            type="button"
            onClick={onCreateProfile}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t?.mentorship?.matcher?.createMenteeProfile ??
              'Create Mentee Profile'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mentorship-matcher">
      <UniversalListing<MatchResult>
        adapter={adapter}
        defaultViewMode="grid"
        availableViewModes={['grid', 'list']}
        paginationMode="offset"
        defaultPageSize={12}
        defaultSort={{ field: 'score', direction: 'desc' }}
        filterDefinitions={filterDefinitions}
        filterMode="collapsible"
        sortOptions={sortOptions}
        lang="es"
        renderItem={(result: MatchResult, _viewMode: ViewMode) => {
          // Rank from the current page is not directly available here.
          // We compute it from the results array (pre-sort by score desc).
          const rank = matchResults.findIndex((r) => r.id === result.id) + 1;
          return (
            <MatchCard
              result={result}
              rank={rank}
              hasPendingRequest={pendingMentorIds.has(result.mentor.id)}
              onRequestMentorship={handleRequestMentorship}
              t={t}
            />
          );
        }}
        keyExtractor={(result: MatchResult) => result.id}
        emptyTitle={t?.mentorship?.matcher?.noMatches ?? 'No Matches'}
        emptyDescription={t?.mentorship?.matcher?.noMatchesDescription ?? ''}
        className="mentorship-listing"
      />

      {showRequestModal && selectedMentor && menteeProfile && (
        <RequestModal
          mentor={selectedMentor}
          menteeGoals={menteeProfile.goals}
          onClose={handleModalClose}
          onConfirm={handleModalConfirm}
          t={t}
        />
      )}
    </div>
  );
}
