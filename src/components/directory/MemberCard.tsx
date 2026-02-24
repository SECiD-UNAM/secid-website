import React, { useState } from 'react';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import type { MemberProfile, ViewMode } from '@/types/member';
import type { UserBasicInfo } from '@/types/user';
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
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface MemberCardProps {
  member: MemberProfile;
  viewMode: ViewMode;
  lang?: 'es' | 'en';
  currentUser?: UserBasicInfo | null;
  showMatchScore?: boolean;
  matchScore?: number;
  onConnect?: (memberId: string) => void;
  onMessage?: (memberId: string) => void;
  onViewProfile?: (memberId: string) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  viewMode,
  lang = 'es',
  currentUser,
  showMatchScore = false,
  matchScore,
  onConnect,
  onMessage,
  onViewProfile
}) => {
  const [isFollowing, setIsFollowing] = useState(
    member.networking.followers.includes(currentUser?.uid || '')
  );
  const [showFullBio, setShowFullBio] = useState(false);

  const isOwnProfile = currentUser?.uid === member.uid;
  const isConnected = member.networking.connections.includes(currentUser?.uid || '');
  const hasPendingRequest = member.networking.pendingConnections.includes(currentUser?.uid || '');

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

  const handleConnect = () => {
    if(onConnect) {
      onConnect(member.uid);
    }
  };

  const handleMessage = () => {
    if(onMessage) {
      onMessage(member.uid);
    }
  };

  const handleViewProfile = () => {
    if(onViewProfile) {
      onViewProfile(member.uid);
    } else {
      // Default navigation
      window.location.href = `/${lang}/members/${member.uid}`;
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // In production, this would update Firestore
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${member.displayName} - SECiD`,
        text: `${lang === 'es' ? 'Conoce a' : 'Meet'} ${member.displayName}, ${member.profile.position} ${lang === 'es' ? 'en' : 'at'} ${member.profile.company}`,
        url: `${window.location.origin}/${lang}/members/${member.uid}`
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/${lang}/members/${member.uid}`);
    }
  };

  const downloadVCard = () => {
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${member.displayName}
EMAIL:${member.email}
ORG:${member.profile.company}
TITLE:${member.profile.position}
${member.social.linkedin ? `URL:${member.social.linkedin}` : ''}
END:VCARD`;

    const blob = new Blob([vCard], { type: 'text/vcard' });
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
            {member.privacy.showOnlineStatus && (
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            {/* Avatar with status */}
            <div className="relative flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-lg">
                {member.initials}
              </div>
              {member.privacy.showOnlineStatus && (
                <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white dark:border-gray-800 ${
                  member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              )}
            </div>
            
            {/* Member info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      <a href={`/${lang}/members/${member.uid}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        {member.displayName}
                      </a>
                    </h3>
                    {member.isPremium && (
                      <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    {member?.portfolio?.certifications.some(c => c.verified) && (
                      <CheckBadgeIcon className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {member.profile.position} {lang === 'es' ? 'en' : 'at'} {member.profile.company}
                  </p>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <MapPinIcon className="h-3 w-3 mr-1" />
                      {member.profile.location}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {getExperienceLevelLabel(member.experience.level)}
                    </div>
                    {member.privacy.showLastSeen && (
                      <span>{formatLastSeen(member.lastSeen)}</span>
                    )}
                  </div>
                </div>
                
                {/* Match score */}
                {showMatchScore && matchScore && (
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getMatchScoreColor(matchScore)}`}>
                    {matchScore}% {lang === 'es' ? 'compatible' : 'match'}
                  </span>
                )}
              </div>
              
              {/* Bio */}
              {member.profile.bio && (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {member.profile.bio}
                </p>
              )}
              
              {/* Skills */}
              <div className="flex flex-wrap gap-1 mt-2">
                {member.featuredSkills.slice(0, 4).map(skill => (
                  <span
                    key={skill}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {skill}
                  </span>
                ))}
                {member.featuredSkills.length > 4 && (
                  <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    +{member.featuredSkills.length - 4}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            {!isOwnProfile && (
              <>
                <button
                  onClick={handleConnect}
                  disabled={isConnected || hasPendingRequest}
                  className={`p-2 rounded-lg transition-colors ${
                    isConnected
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : hasPendingRequest
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                      : 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/40'
                  }`}
                  title={
                    isConnected
                      ? (lang === 'es' ? 'Conectado' : 'Connected')
                      : hasPendingRequest
                      ? (lang === 'es' ? 'Solicitud enviada' : 'Request sent')
                      : (lang === 'es' ? 'Conectar' : 'Connect')
                  }
                >
                  <UserPlusIcon className="h-4 w-4" />
                </button>
                
                <button
                  onClick={handleMessage}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={lang === 'es' ? 'Enviar mensaje' : 'Send message'}
                >
                  <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                </button>
              </>
            )}
            
            <a
              href={`/${lang}/members/${member.uid}`}
              className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
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
          
          {/* Actions dropdown */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title={lang === 'es' ? 'Compartir perfil' : 'Share profile'}
            >
              <ShareIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Avatar and basic info */}
      <div className="flex flex-col items-center text-center mb-4">
        <div className="relative mb-3">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-xl">
            {member.initials}
          </div>
          {member.privacy.showOnlineStatus && (
            <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-3 border-white dark:border-gray-800 ${
              member.isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          <a href={`/${lang}/members/${member.uid}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            {member.displayName}
          </a>
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {member.profile.position}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-1">
          {member.profile.company}
        </p>
        
        {/* Location and experience */}
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center">
            <MapPinIcon className="h-3 w-3 mr-1" />
            {member.profile.location}
          </div>
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
            {getExperienceLevelLabel(member.experience.level)}
          </div>
        </div>
        
        {/* Last seen */}
        {member.privacy.showLastSeen && (
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

      {/* Stats */}
      <div className="flex justify-around text-center py-3 border-t border-gray-200 dark:border-gray-700 mb-4">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {member.activity.totalConnections}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Conexiones' : 'Connections'}
          </div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {member.activity.profileViews}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Vistas' : 'Views'}
          </div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {member.activity.reputation}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Reputación' : 'Reputation'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {!isOwnProfile && (
          <div className="flex space-x-2">
            <button
              onClick={handleConnect}
              disabled={isConnected || hasPendingRequest}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isConnected
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-not-allowed'
                  : hasPendingRequest
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              <UserPlusIcon className="h-4 w-4 mr-1 inline" />
              {isConnected
                ? (lang === 'es' ? 'Conectado' : 'Connected')
                : hasPendingRequest
                ? (lang === 'es' ? 'Solicitud enviada' : 'Request sent')
                : (lang === 'es' ? 'Conectar' : 'Connect')
              }
            </button>
            
            <button
              onClick={handleMessage}
              className="px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={lang === 'es' ? 'Enviar mensaje' : 'Send message'}
            >
              <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
            </button>
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
        
        {!isOwnProfile && (
          <button
            onClick={handleFollow}
            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isFollowing
                ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {isFollowing ? (
              <HeartSolidIcon className="h-4 w-4 mr-1 inline" />
            ) : (
              <HeartIcon className="h-4 w-4 mr-1 inline" />
            )}
            {isFollowing
              ? (lang === 'es' ? 'Dejar de seguir' : 'Unfollow')
              : (lang === 'es' ? 'Seguir' : 'Follow')
            }
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
    </div>
  );
};

export default MemberCard;