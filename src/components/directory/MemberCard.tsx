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
  AcademicCapIcon
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
  onViewProfile
}) => {
  const [showFullBio, setShowFullBio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.uid === member.uid;
  const visibility = getVisibleFields(member, currentUser?.uid);

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
        .then((pending: boolean) => { if (pending) setConnectionStatus('pending'); })
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

  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (member.isOnline) {
      return lang === 'es' ? 'En línea' : 'Online';
    } else if (minutes < 60) {
      return lang === 'es' ? `Hace ${minutes} min` : `${minutes} min ago`;
    } else if (hours < 24) {
      return lang === 'es' ? `Hace ${hours}h` : `${hours}h ago`;
    } else if (days < 7) {
      return lang === 'es' ? `Hace ${days}d` : `${days}d ago`;
    } else {
      return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US');
    }
  };

  const getExperienceLevelLabel = (level: string): string => {
    const labels: Record<string, Record<string, string>> = {
      junior: { es: 'Junior', en: 'Junior' },
      mid: { es: 'Semi-Senior', en: 'Mid-level' },
      senior: { es: 'Senior', en: 'Senior' },
      lead: { es: 'Lead', en: 'Lead' },
      executive: { es: 'Ejecutivo', en: 'Executive' }
    };
    return labels[level]?.[lang] || level;
  };

  const getMatchScoreColor = (score?: number): string => {
    if (!score) return '';
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
    return 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400';
  };

  const handleViewProfile = () => {
    if(onViewProfile) {
      onViewProfile(member.uid);
    } else {
      // Default navigation
      window.location.href = `/${lang}/members/${member.uid}`;
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/${lang}/members/${member.uid}`;
    if (navigator.share) {
      await navigator.share({
        title: `${member.displayName} - SECiD`,
        text: `${lang === 'es' ? 'Conoce a' : 'Meet'} ${member.displayName}, ${member.profile.position} ${lang === 'es' ? 'en' : 'at'} ${member.profile.company}`,
        url
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-all">
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Avatar with status */}
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-sm">
              {member.initials}
            </div>
            {visibility.showOnlineStatus && (
              <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${
                member.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            )}
            {member.isPremium && (
              <div className="absolute -top-1 -right-1">
                <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
              </div>
            )}
          </div>
          
          {/* Name and title */}
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              <a href={`/${lang}/members/${member.uid}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {member.displayName}
              </a>
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {member.profile.position}
            </p>
          </div>

          {/* Quick action */}
          <a
            href={`/${lang}/members/${member.uid}`}
            className="w-full px-2 py-1 text-xs text-center bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded hover:bg-primary-200 dark:hover:bg-primary-900/40 transition-colors"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* Avatar + info row */}
          <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
            {/* Avatar with status */}
            <div className="relative flex-shrink-0">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-base sm:text-lg">
                {member.initials}
              </div>
              {visibility.showOnlineStatus && (
                <div className={`absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-white dark:border-gray-800 ${
                  member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              )}
            </div>

            {/* Member info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      <a href={`/${lang}/members/${member.uid}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        {member.displayName}
                      </a>
                    </h3>
                    {member.isPremium && (
                      <StarIcon className="h-4 w-4 flex-shrink-0 text-yellow-500 fill-current" />
                    )}
                    {member?.portfolio?.certifications.some(c => c.verified) && (
                      <CheckBadgeIcon className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {member.profile.position} {visibility.showCompany ? `${lang === 'es' ? ' en ' : ' at '}${member.profile.company}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {visibility.showLocation && (
                      <div className="flex items-center">
                        <MapPinIcon className="h-3 w-3 mr-1" />
                        {member.profile.location}
                      </div>
                    )}
                    <div className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {getExperienceLevelLabel(member.experience.level)}
                    </div>
                    {member.profile.graduationYear && (
                      <div className="flex items-center">
                        <AcademicCapIcon className="h-3 w-3 mr-1" />
                        Gen. {member.profile.graduationYear}
                      </div>
                    )}
                    {visibility.showLastSeen && (
                      <span>{formatLastSeen(member.lastSeen)}</span>
                    )}
                  </div>
                </div>

                {/* Match score */}
                {showMatchScore && matchScore && (
                  <span className={`self-start px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getMatchScoreColor(matchScore)}`}>
                    {matchScore}% {lang === 'es' ? 'compatible' : 'match'}
                  </span>
                )}
              </div>

              {/* Bio — hidden on very small screens */}
              {member.profile.bio && (
                <p className="hidden sm:block mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {member.profile.bio}
                </p>
              )}

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mt-2">
                {member.featuredSkills.slice(0, 3).map(skill => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
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
                {visibility.allowConnectionRequests && connectionStatus !== 'connected' && (
                  <button
                    onClick={handleConnect}
                    disabled={connectLoading || connectionStatus === 'pending'}
                    className={`p-2 rounded-lg transition-colors ${
                      connectionStatus === 'pending'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400'
                    }`}
                    title={connectionStatus === 'pending' ? (lang === 'es' ? 'Solicitud enviada' : 'Request sent') : (lang === 'es' ? 'Conectar' : 'Connect')}
                  >
                    <UserPlusIcon className="h-4 w-4" />
                  </button>
                )}

                {visibility.allowMessages && (
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                    title={lang === 'es' ? 'Mensaje' : 'Message'}
                  >
                    <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                  </button>
                )}
              </>
            )}

            <a
              href={`/${lang}/members/${member.uid}`}
              className="flex-1 sm:flex-initial px-3 py-2 text-sm text-center bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-lg transition-all">
      {/* Header with match score and premium badge */}
      <div className="flex justify-between items-start mb-4">
        {showMatchScore && matchScore && (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMatchScoreColor(matchScore)}`}>
            {matchScore}% {lang === 'es' ? 'compatible' : 'match'}
          </span>
        )}
        
        <div className="flex items-center space-x-1 ml-auto">
          {member.isPremium && (
            <StarIcon className="h-4 w-4 text-yellow-500 fill-current" title="Premium member" />
          )}
          {member?.portfolio?.certifications.some(c => c.verified) && (
            <CheckBadgeIcon className="h-4 w-4 text-blue-500" title="Verified certifications" />
          )}
          
          {/* Share button */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title={copied ? (lang === 'es' ? 'Copiado!' : 'Copied!') : (lang === 'es' ? 'Compartir perfil' : 'Share profile')}
            >
              {copied ? (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">{lang === 'es' ? 'Copiado!' : 'Copied!'}</span>
              ) : (
                <ShareIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Avatar and basic info */}
      <div className="flex flex-col items-center text-center mb-4">
        <div className="relative mb-3">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-lg sm:text-xl">
            {member.initials}
          </div>
          {visibility.showOnlineStatus && (
            <div className={`absolute -bottom-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 sm:border-3 border-white dark:border-gray-800 ${
              member.isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
          )}
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
          <a href={`/${lang}/members/${member.uid}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            {member.displayName}
          </a>
        </h3>
        {member.role === 'collaborator' && (
          <span className="inline-block bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full mb-1">
            {lang === 'es' ? 'Colaborador' : 'Collaborator'}
          </span>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {member.profile.position}
        </p>
        {visibility.showCompany && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-1">
            {member.profile.company}
          </p>
        )}

        {/* Location and experience */}
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
          {visibility.showLocation && (
            <div className="flex items-center">
              <MapPinIcon className="h-3 w-3 mr-1" />
              {member.profile.location}
            </div>
          )}
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
            {getExperienceLevelLabel(member.experience.level)}
          </div>
          {member.profile.graduationYear && (
            <div className="flex items-center">
              <AcademicCapIcon className="h-3 w-3 mr-1" />
              Gen. {member.profile.graduationYear}
            </div>
          )}
        </div>

        {/* Last seen */}
        {visibility.showLastSeen && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {formatLastSeen(member.lastSeen)}
          </p>
        )}
      </div>

      {/* Bio */}
      {member.profile.bio && (
        <div className="mb-4">
          <p className={`text-sm text-gray-700 dark:text-gray-300 ${!showFullBio ? 'line-clamp-3' : ''}`}>
            {member.profile.bio}
          </p>
          {member.profile.bio.length > 150 && (
            <button
              onClick={() => setShowFullBio(!showFullBio)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 mt-1"
            >
              {showFullBio ? (lang === 'es' ? 'Ver menos' : 'Show less') : (lang === 'es' ? 'Ver más' : 'Show more')}
            </button>
          )}
        </div>
      )}

      {/* Skills */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {member.featuredSkills.slice(0, 5).map(skill => (
            <span
              key={skill}
              className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded"
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
      {(member.activity.totalConnections > 0 || member.activity.profileViews > 0 || member.activity.reputation > 0) && (
        <div className="flex justify-around text-center py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 mb-3 sm:mb-4">
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {member.activity.totalConnections}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {lang === 'es' ? 'Conexiones' : 'Connections'}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {member.activity.profileViews}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {lang === 'es' ? 'Vistas' : 'Views'}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {member.activity.reputation}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {lang === 'es' ? 'Reputacion' : 'Reputation'}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {!isOwnProfile && currentUser && (
          <div className="flex space-x-2">
            {visibility.allowConnectionRequests && connectionStatus !== 'connected' && (
              <button
                onClick={handleConnect}
                disabled={connectLoading || connectionStatus === 'pending'}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  connectionStatus === 'pending'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                <UserPlusIcon className="h-4 w-4 mr-1 inline" />
                {connectionStatus === 'pending'
                  ? (lang === 'es' ? 'Solicitud enviada' : 'Request sent')
                  : (lang === 'es' ? 'Conectar' : 'Connect')}
              </button>
            )}

            {connectionStatus === 'connected' && (
              <span className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-center">
                {lang === 'es' ? 'Conectado' : 'Connected'}
              </span>
            )}

            {visibility.allowMessages && (
              <button
                onClick={() => setShowMessageModal(true)}
                className="px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                title={lang === 'es' ? 'Mensaje' : 'Message'}
              >
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex space-x-2">
          <a
            href={`/${lang}/members/${member.uid}`}
            className="flex-1 px-3 py-2 text-sm font-medium text-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <EyeIcon className="h-4 w-4 mr-1 inline" />
            {lang === 'es' ? 'Ver perfil' : 'View profile'}
          </a>

          <button
            onClick={downloadVCard}
            className="px-3 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={lang === 'es' ? 'Descargar contacto' : 'Download contact'}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
        </div>

        {!isOwnProfile && currentUser && (
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isFollowing
                ? 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/30'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/10 hover:text-pink-600 dark:hover:text-pink-400'
            }`}
          >
            {isFollowing ? (
              <HeartSolidIcon className="h-4 w-4 mr-1 inline text-pink-500" />
            ) : (
              <HeartIcon className="h-4 w-4 mr-1 inline" />
            )}
            {isFollowing
              ? (lang === 'es' ? 'Dejar de seguir' : 'Unfollow')
              : (lang === 'es' ? 'Seguir' : 'Follow')}
          </button>
        )}
      </div>

      {/* Social links */}
      {(member.social.linkedin || member.social.github || member.social.portfolio) && (
        <div className="flex justify-center space-x-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
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