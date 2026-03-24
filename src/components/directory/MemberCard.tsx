import React, { useState, useEffect } from 'react';

import type { MemberProfile, ViewMode } from '@/types/member';
import type { UserBasicInfo } from '@/types/user';
import {
  sendConnectionRequest,
  followMember,
  unfollowMember,
  hasPendingConnectionRequest,
  getVisibleFields,
} from '@/lib/members';
import { MessageModal } from './MessageModal';
import {
  MapPinIcon,
  BuildingOfficeIcon,
  ClockIcon,
  UserPlusIcon,
  ChatBubbleLeftEllipsisIcon,
  ShareIcon,
  HeartIcon,
  EyeIcon,
  StarIcon,
  CheckBadgeIcon,
  LinkIcon,
  ArrowDownTrayIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface MemberCardProps {
  member: MemberProfile;
  viewMode: ViewMode;
  lang?: 'es' | 'en';
  currentUser?: UserBasicInfo | null;
  showMatchScore?: boolean;
  matchScore?: number;
  onViewProfile?: (memberId: string) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  viewMode,
  lang = 'es',
  currentUser,
  showMatchScore = false,
  matchScore,
  onViewProfile,
}) => {
  const [showFullBio, setShowFullBio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'none' | 'pending' | 'connected'
  >('none');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.uid === member.uid;
  const visibility = getVisibleFields(
    member,
    currentUser?.uid,
    currentUser?.role
  );

  useEffect(() => {
    if (!currentUser || isOwnProfile) return;

    // Check follow status
    if (member.networking?.followers?.includes(currentUser.uid)) {
      setIsFollowing(true);
    }

    // Check connection status
    if (member.networking?.connections?.includes(currentUser.uid)) {
      setConnectionStatus('connected');
    } else {
      hasPendingConnectionRequest(currentUser.uid, member.uid)
        .then((pending: boolean) => {
          if (pending) setConnectionStatus('pending');
        })
        .catch(() => {});
    }
  }, [currentUser?.uid, member.uid]);

  const handleConnect = async () => {
    if (!currentUser || connectionStatus !== 'none') return;
    try {
      setConnectLoading(true);
      await sendConnectionRequest(currentUser.uid, member.uid);
      setConnectionStatus('pending');
    } catch (err) {
      console.error('Error sending connection request:', err);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) return;
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await unfollowMember(currentUser.uid, member.uid);
      } else {
        await followMember(currentUser.uid, member.uid);
      }
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const getExperienceLevelLabel = (level: string): string => {
    const labels: Record<string, Record<string, string>> = {
      junior: { es: 'Junior', en: 'Junior' },
      mid: { es: 'Semi-Senior', en: 'Mid-level' },
      senior: { es: 'Senior', en: 'Senior' },
      lead: { es: 'Lead', en: 'Lead' },
      executive: { es: 'Ejecutivo', en: 'Executive' },
    };
    return labels[level]?.[lang] || level;
  };

  const getMatchScoreColor = (score?: number): string => {
    if (!score) return '';
    if (score >= 80)
      return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
    if (score >= 60)
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
    return 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400';
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(member.uid);
    } else {
      // Default navigation
      window.location.href = `/${lang}/members/${member.slug || member.uid}`;
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/${lang}/members/${member.slug || member.uid}`;
    if (navigator.share) {
      await navigator.share({
        title: `${member.displayName} - SECiD`,
        text: `${lang === 'es' ? 'Conoce a' : 'Meet'} ${member.displayName}, ${member.profile.position} ${lang === 'es' ? 'en' : 'at'} ${member.profile.company}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadVCard = () => {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${member.displayName}`];
    if (member.email) lines.push(`EMAIL:${member.email}`);
    if (member.profile.company) lines.push(`ORG:${member.profile.company}`);
    if (member.profile.position) lines.push(`TITLE:${member.profile.position}`);
    if (member.social?.linkedin) lines.push(`URL:${member.social.linkedin}`);
    lines.push('END:VCARD');

    const blob = new Blob([lines.join('\n')], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${member.displayName.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document['body'].removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Compact view for mobile or compact mode
  if (viewMode === 'compact') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-center space-y-2 text-center">
          {/* Avatar with status */}
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-sm font-semibold text-white">
              {member.initials}
            </div>
            {member.isPremium && (
              <div className="absolute -right-1 -top-1">
                <StarIcon className="h-4 w-4 fill-current text-yellow-500" />
              </div>
            )}
          </div>

          {/* Name and title */}
          <div>
            <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              <a
                href={`/${lang}/members/${member.slug || member.uid}`}
                className="transition-colors hover:text-primary-600 dark:hover:text-primary-400"
              >
                {member.displayName}
              </a>
            </h4>
            <p className="truncate text-xs text-gray-600 dark:text-gray-400">
              {member.profile.position}
            </p>
          </div>

          {/* Quick action */}
          <a
            href={`/${lang}/members/${member.slug || member.uid}`}
            className="w-full rounded bg-primary-100 px-2 py-1 text-center text-xs text-primary-700 transition-colors hover:bg-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40"
          >
            {lang === 'es' ? 'Ver perfil' : 'View profile'}
          </a>
        </div>
      </div>
    );
  }

  // List view
  if (viewMode === 'list') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {/* Avatar + info row */}
          <div className="flex min-w-0 flex-1 items-start space-x-3 sm:space-x-4">
            {/* Avatar with status */}
            <div className="relative flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-base font-semibold text-white sm:h-16 sm:w-16 sm:text-lg">
                {member.initials}
              </div>
            </div>

            {/* Member info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                      <a
                        href={`/${lang}/members/${member.slug || member.uid}`}
                        className="transition-colors hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {member.displayName}
                      </a>
                    </h3>
                    {member.isPremium && (
                      <StarIcon className="h-4 w-4 flex-shrink-0 fill-current text-yellow-500" />
                    )}
                    {member?.portfolio?.certifications.some(
                      (c) => c.verified
                    ) && (
                      <CheckBadgeIcon className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    )}
                  </div>
                  <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                    {member.profile.position}{' '}
                    {visibility.showCompany
                      ? `${lang === 'es' ? ' en ' : ' at '}${member.profile.company}`
                      : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {visibility.showLocation && (
                      <div className="flex items-center">
                        <MapPinIcon className="mr-1 h-3 w-3" />
                        {member.profile.location}
                      </div>
                    )}
                    <div className="flex items-center">
                      <ClockIcon className="mr-1 h-3 w-3" />
                      {getExperienceLevelLabel(member.experience.level)}
                    </div>
                    {member.profile.graduationYear && (
                      <div className="flex items-center">
                        <AcademicCapIcon className="mr-1 h-3 w-3" />
                        Gen. {member.profile.graduationYear}
                      </div>
                    )}
                  </div>
                </div>

                {/* Match score */}
                {showMatchScore && matchScore && (
                  <span
                    className={`self-start whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${getMatchScoreColor(matchScore)}`}
                  >
                    {matchScore}% {lang === 'es' ? 'compatible' : 'match'}
                  </span>
                )}
              </div>

              {/* Bio — hidden on very small screens */}
              {member.profile.bio && (
                <p className="mt-2 line-clamp-2 hidden text-sm text-gray-700 dark:text-gray-300 sm:block">
                  {member.profile.bio}
                </p>
              )}

              {/* Skills */}
              <div className="mt-2 flex flex-wrap gap-1">
                {member.featuredSkills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {skill}
                  </span>
                ))}
                {member.featuredSkills.length > 3 && (
                  <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                    +{member.featuredSkills.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions — full-width row on mobile, side column on larger screens */}
          <div className="flex items-center space-x-2 sm:ml-auto sm:flex-shrink-0">
            {!isOwnProfile && currentUser && (
              <>
                {visibility.allowConnectionRequests &&
                  connectionStatus !== 'connected' && (
                    <button
                      onClick={handleConnect}
                      disabled={
                        connectLoading || connectionStatus === 'pending'
                      }
                      className={`rounded-lg p-2 transition-colors ${
                        connectionStatus === 'pending'
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-400'
                      }`}
                      title={
                        connectionStatus === 'pending'
                          ? lang === 'es'
                            ? 'Solicitud enviada'
                            : 'Request sent'
                          : lang === 'es'
                            ? 'Conectar'
                            : 'Connect'
                      }
                    >
                      <UserPlusIcon className="h-4 w-4" />
                    </button>
                  )}

                {visibility.allowMessages && (
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                    title={lang === 'es' ? 'Mensaje' : 'Message'}
                  >
                    <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                  </button>
                )}
              </>
            )}

            <a
              href={`/${lang}/members/${member.slug || member.uid}`}
              className="flex-1 whitespace-nowrap rounded-lg bg-primary-600 px-3 py-2 text-center text-sm text-white transition-colors hover:bg-primary-700 sm:flex-initial"
            >
              {lang === 'es' ? 'Ver perfil' : 'View profile'}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      {/* Header with match score and premium badge */}
      <div className="mb-4 flex items-start justify-between">
        {showMatchScore && matchScore && (
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${getMatchScoreColor(matchScore)}`}
          >
            {matchScore}% {lang === 'es' ? 'compatible' : 'match'}
          </span>
        )}

        <div className="ml-auto flex items-center space-x-1">
          {member.isPremium && (
            <StarIcon
              className="h-4 w-4 fill-current text-yellow-500"
              title="Premium member"
            />
          )}
          {member?.portfolio?.certifications.some((c) => c.verified) && (
            <CheckBadgeIcon
              className="h-4 w-4 text-blue-500"
              title="Verified certifications"
            />
          )}

          {/* Share button */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title={
                copied
                  ? lang === 'es'
                    ? 'Copiado!'
                    : 'Copied!'
                  : lang === 'es'
                    ? 'Compartir perfil'
                    : 'Share profile'
              }
            >
              {copied ? (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  {lang === 'es' ? 'Copiado!' : 'Copied!'}
                </span>
              ) : (
                <ShareIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Avatar and basic info */}
      <div className="mb-4 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-lg font-semibold text-white sm:h-20 sm:w-20 sm:text-xl">
            {member.initials}
          </div>
        </div>

        <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
          <a
            href={`/${lang}/members/${member.slug || member.uid}`}
            className="transition-colors hover:text-primary-600 dark:hover:text-primary-400"
          >
            {member.displayName}
          </a>
        </h3>
        {member.role === 'collaborator' && (
          <span className="mb-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            {lang === 'es' ? 'Colaborador' : 'Collaborator'}
          </span>
        )}
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          {member.profile.position}
        </p>
        {visibility.showCompany && (
          <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
            {member.profile.company}
          </p>
        )}

        {/* Location and experience */}
        <div className="mb-3 flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          {visibility.showLocation && (
            <div className="flex items-center">
              <MapPinIcon className="mr-1 h-3 w-3" />
              {member.profile.location}
            </div>
          )}
          <div className="flex items-center">
            <BuildingOfficeIcon className="mr-1 h-3 w-3" />
            {getExperienceLevelLabel(member.experience.level)}
          </div>
          {member.profile.graduationYear && (
            <div className="flex items-center">
              <AcademicCapIcon className="mr-1 h-3 w-3" />
              Gen. {member.profile.graduationYear}
            </div>
          )}
        </div>

      </div>

      {/* Bio */}
      {member.profile.bio && (
        <div className="mb-4">
          <p
            className={`text-sm text-gray-700 dark:text-gray-300 ${!showFullBio ? 'line-clamp-3' : ''}`}
          >
            {member.profile.bio}
          </p>
          {member.profile.bio.length > 150 && (
            <button
              onClick={() => setShowFullBio(!showFullBio)}
              className="mt-1 text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
            >
              {showFullBio
                ? lang === 'es'
                  ? 'Ver menos'
                  : 'Show less'
                : lang === 'es'
                  ? 'Ver más'
                  : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Skills */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {member.featuredSkills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="rounded bg-primary-100 px-2 py-1 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
            >
              {skill}
            </span>
          ))}
          {member.featuredSkills.length > 5 && (
            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              +{member.featuredSkills.length - 5}
            </span>
          )}
        </div>
      </div>

      {/* Stats — only show if any are non-zero */}
      {(member.activity.totalConnections > 0 ||
        member.activity.profileViews > 0 ||
        member.activity.reputation > 0) && (
        <div className="mb-3 flex justify-around border-t border-gray-200 py-2 text-center dark:border-gray-700 sm:mb-4 sm:py-3">
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              {member.activity.totalConnections}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">
              {lang === 'es' ? 'Conexiones' : 'Connections'}
            </div>
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              {member.activity.profileViews}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">
              {lang === 'es' ? 'Vistas' : 'Views'}
            </div>
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              {member.activity.reputation}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">
              {lang === 'es' ? 'Reputacion' : 'Reputation'}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {!isOwnProfile && currentUser && (
          <div className="flex space-x-2">
            {visibility.allowConnectionRequests &&
              connectionStatus !== 'connected' && (
                <button
                  onClick={handleConnect}
                  disabled={connectLoading || connectionStatus === 'pending'}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    connectionStatus === 'pending'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  <UserPlusIcon className="mr-1 inline h-4 w-4" />
                  {connectionStatus === 'pending'
                    ? lang === 'es'
                      ? 'Solicitud enviada'
                      : 'Request sent'
                    : lang === 'es'
                      ? 'Conectar'
                      : 'Connect'}
                </button>
              )}

            {connectionStatus === 'connected' && (
              <span className="flex-1 rounded-lg bg-green-100 px-3 py-2 text-center text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {lang === 'es' ? 'Conectado' : 'Connected'}
              </span>
            )}

            {visibility.allowMessages && (
              <button
                onClick={() => setShowMessageModal(true)}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                title={lang === 'es' ? 'Mensaje' : 'Message'}
              >
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex space-x-2">
          <a
            href={`/${lang}/members/${member.slug || member.uid}`}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <EyeIcon className="mr-1 inline h-4 w-4" />
            {lang === 'es' ? 'Ver perfil' : 'View profile'}
          </a>

          <button
            onClick={downloadVCard}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title={lang === 'es' ? 'Descargar contacto' : 'Download contact'}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
        </div>

        {!isOwnProfile && currentUser && (
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isFollowing
                ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:hover:bg-pink-900/30'
                : 'bg-gray-100 text-gray-700 hover:bg-pink-50 hover:text-pink-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-pink-900/10 dark:hover:text-pink-400'
            }`}
          >
            {isFollowing ? (
              <HeartSolidIcon className="mr-1 inline h-4 w-4 text-pink-500" />
            ) : (
              <HeartIcon className="mr-1 inline h-4 w-4" />
            )}
            {isFollowing
              ? lang === 'es'
                ? 'Dejar de seguir'
                : 'Unfollow'
              : lang === 'es'
                ? 'Seguir'
                : 'Follow'}
          </button>
        )}
      </div>

      {/* Social links */}
      {(member.social.linkedin ||
        member.social.github ||
        member.social.portfolio) && (
        <div className="mt-4 flex justify-center space-x-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          {member.social.linkedin && (
            <a
              href={member.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              title="LinkedIn"
            >
              <LinkIcon className="h-4 w-4" />
            </a>
          )}
          {member.social.github && (
            <a
              href={member.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="GitHub"
            >
              <LinkIcon className="h-4 w-4" />
            </a>
          )}
          {member.social.portfolio && (
            <a
              href={member.social.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              title="Portfolio"
            >
              <LinkIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && currentUser && (
        <MessageModal
          fromUid={currentUser.uid}
          toUid={member.uid}
          toName={member.displayName}
          lang={lang}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  );
};

export default MemberCard;
