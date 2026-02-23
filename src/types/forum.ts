// Forum types for SECiD community forums

import type { Language } from './index';

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  color?: string;
  order: number;
  parentId?: string;
  topicsCount: number;
  postsCount: number;
  lastActivity?: Date;
  isActive: boolean;
  moderators: string[];
  rules?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ForumTopic {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  categoryId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  isAnnouncement: boolean;
  viewCount: number;
  replyCount: number;
  voteScore: number;
  tags: string[];
  lastReplyAt?: Date;
  lastReplyBy?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'closed' | 'archived' | 'moderated';
  attachments?: ForumAttachment[];
}

export interface ForumPost {
  id: string;
  topicId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  parentId?: string;
  isAnswer: boolean;
  voteScore: number;
  editCount: number;
  lastEditedAt?: Date;
  lastEditedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'deleted' | 'moderated';
  attachments?: ForumAttachment[];
  reactions?: ForumReaction[];
}

export interface ForumAttachment {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface ForumVote {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'topic' | 'post';
  value: 1 | -1;
  createdAt: Date;
}

export interface ForumReaction {
  id: string;
  userId: string;
  postId: string;
  emoji: string;
  createdAt: Date;
}

export interface UserReputation {
  userId: string;
  points: number;
  level: number;
  badges: string[];
  topicsCreated: number;
  postsCreated: number;
  solutionsProvided: number;
  upvotesReceived: number;
  downvotesReceived: number;
  lastActivityAt: Date;
}

export interface ForumReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'topic' | 'post' | 'user';
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  action?: string;
  createdAt: Date;
}

export interface ForumNotification {
  id: string;
  userId: string;
  type: 'reply' | 'mention' | 'vote' | 'solution' | 'moderation';
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
}

export interface ForumSearchFilters {
  query: string;
  categoryIds?: string[];
  authorId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  sortBy: 'relevance' | 'date' | 'votes' | 'replies';
  sortOrder: 'asc' | 'desc';
  topicType: 'all' | 'question' | 'discussion' | 'announcement';
  hasAttachments: boolean;
  page?: number;
  limit?: number;
}

export interface ForumSearchResult {
  id: string;
  type: 'topic' | 'post';
  title: string;
  excerpt: string;
  categoryId: string;
  categoryName: string;
  authorId: string;
  authorName: string;
  score: number;
  createdAt: Date;
  highlightedContent?: string;
}

export interface ForumStats {
  totalTopics: number;
  totalPosts: number;
  totalUsers: number;
  activeUsers: number;
  topicsToday: number;
  postsToday: number;
  popularTags: Array<{ tag: string; count: number }>;
  topContributors: Array<{ userId: string; name: string; posts: number }>;
}

export interface ForumModerationAction {
  id: string;
  moderatorId: string;
  targetId: string;
  targetType: 'topic' | 'post' | 'user';
  action: 'delete' | 'lock' | 'pin' | 'unpin' | 'warn' | 'ban' | 'edit';
  reason: string;
  createdAt: Date;
}

export interface ForumUser {
  id: string;
  name: string;
  avatar?: string;
  reputation: number;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
}
