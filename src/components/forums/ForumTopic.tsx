import React, { useState, useEffect } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share,
  Eye,
  Pin,
  Lock,
  CheckCircle,
  MoreHorizontal,
  ArrowLeft,
  Clock,
  User,
  Star,
  Award,
  Reply,
  Quote,
  Flag,
  Edit,
  Trash2,
  Link,
  Heart,
  Smile,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import {
  forumTopics,
  forumPosts,
  forumVoting,
  forumCategories,
} from '../../lib/forum';
import type {
  ForumTopic,
  ForumPost,
  ForumCategory,
  Language,
} from '../../types';

interface ForumTopicProps {
  topicSlug: string;
  language: Language;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    isAdmin?: boolean;
    isModerator?: boolean;
  };
}

const ForumTopic: React.FC<ForumTopicProps> = ({
  topicSlug,
  language,
  currentUser,
}) => {
  const t = useTranslations(language);
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [userVotes, setUserVotes] = useState<
    Record<string, 'upvote' | 'downvote'>
  >({});

  useEffect(() => {
    loadTopic();
  }, [topicSlug]);

  useEffect(() => {
    if (topic) {
      loadCategory();
      loadPosts(true);
    }
  }, [topic]);

  const loadTopic = async () => {
    try {
      setLoading(true);
      const topicData = await forumTopics.getBySlug(topicSlug);
      if (!topicData) {
        setError(t.forum.errors.notFound);
        return;
      }
      setTopic(topicData);
    } catch (err) {
      console.error('Error loading topic:', err);
      setError(t.forum.errors.loadingFailed);
    } finally {
      setLoading(false);
    }
  };

  const loadCategory = async () => {
    if (!topic) return;
    try {
      const categoryData = await forumCategories.getById(topic.categoryId);
      setCategory(categoryData);
    } catch (err) {
      console.error('Error loading category:', err);
    }
  };

  const loadPosts = async (reset: boolean = false) => {
    if (!topic) return;

    try {
      if (reset) {
        setPosts([]);
        setLastDoc(null);
      } else {
        setLoadingMore(true);
      }

      const { posts: newPosts, lastDoc: newLastDoc } =
        await forumPosts.getByTopic(topic.id, reset ? undefined : lastDoc, 20);

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setLastDoc(newLastDoc);
      setHasMore(newPosts.length === 20 && !!newLastDoc);

      // Load user votes if logged in
      if (currentUser) {
        const votes: Record<string, 'upvote' | 'downvote'> = {};

        // Check vote for topic
        const topicVote = await forumVoting.getUserVote(
          currentUser.id,
          'topic',
          topic.id
        );
        if (topicVote) {
          votes[`topic_${topic.id}`] = topicVote.voteType;
        }

        // Check votes for posts
        for (const post of newPosts) {
          const postVote = await forumVoting.getUserVote(
            currentUser.id,
            'post',
            post.id
          );
          if (postVote) {
            votes[`post_${post.id}`] = postVote.voteType;
          }
        }

        setUserVotes((prev) => ({ ...prev, ...votes }));
      }
    } catch (err) {
      console.error('Error loading posts:', err);
      setError(t.forum.errors.loadingFailed);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVote = async (
    targetType: 'topic' | 'post',
    targetId: string,
    voteType: 'upvote' | 'downvote'
  ) => {
    if (!currentUser) return;

    try {
      await forumVoting.vote(currentUser.id, targetType, targetId, voteType);

      const voteKey = `${targetType}_${targetId}`;
      const currentVote = userVotes[voteKey];

      if (currentVote === voteType) {
        // Remove vote
        setUserVotes((prev) => {
          const newVotes = { ...prev };
          delete newVotes[voteKey];
          return newVotes;
        });
      } else {
        // Add or change vote
        setUserVotes((prev) => ({ ...prev, [voteKey]: voteType }));
      }

      // Refresh data to get updated vote counts
      if (targetType === 'topic') {
        loadTopic();
      } else {
        loadPosts(true);
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleReply = async () => {
    if (!currentUser || !topic || !replyContent.trim()) return;

    try {
      await forumPosts.create({
        topicId: topic.id,
        parentPostId: replyingTo || undefined,
        content: replyContent,
        htmlContent: replyContent, // In production, process with markdown/HTML
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: undefined,
        upvotes: 0,
        downvotes: 0,
        reactions: {},
        isEdited: false,
        editHistory: [],
        attachments: [],
        mentions: [],
        reportCount: 0,
        isReported: false,
        isSolution: false,
        depth: replyingTo ? 1 : 0,
        childrenCount: 0,
      });

      setReplyContent('');
      setShowReplyEditor(false);
      setReplyingTo(null);
      loadPosts(true);
    } catch (err) {
      console.error('Error posting reply:', err);
    }
  };

  const togglePostExpansion = (postId: string) => {
    setExpandedPosts((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(postId)) {
        newExpanded.delete(postId);
      } else {
        newExpanded.add(postId);
      }
      return newExpanded;
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}m`;
      }
      return `${hours}h`;
    } else if (days < 7) {
      return `${days}d`;
    } else {
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US');
    }
  };

  if (loading && !topic) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="mb-4 h-8 w-1/4 rounded bg-gray-300 dark:bg-gray-700"></div>
            <div className="mb-4 h-32 rounded-lg bg-gray-300 dark:bg-gray-700"></div>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="mb-4 h-24 rounded-lg bg-gray-300 dark:bg-gray-700"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-4 text-xl text-red-500">{error}</div>
            <button
              onClick={loadTopic}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              {t.common.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <a
              href={`/${language}/forum`}
              className="transition-colors hover:text-blue-500"
            >
              {t.forum.title}
            </a>
            <span>/</span>
            {category && (
              <>
                <a
                  href={`/${language}/forum/category/${category.slug}`}
                  className="transition-colors hover:text-blue-500"
                >
                  {category['name']}
                </a>
                <span>/</span>
              </>
            )}
            <span className="line-clamp-1 text-gray-900 dark:text-white">
              {topic.title}
            </span>
          </div>

          {/* Topic Header */}
          <div className="flex items-start gap-4">
            {/* Author Avatar */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
              {topic.authorAvatar ? (
                <img
                  src={topic.authorAvatar}
                  alt={topic.authorName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              )}
            </div>

            <div className="flex-1">
              {/* Status Icons and Title */}
              <div className="mb-2 flex items-center gap-2">
                {topic.isPinned && <Pin className="h-5 w-5 text-yellow-500" />}
                {topic.isLocked && <Lock className="h-5 w-5 text-red-500" />}
                {topic.isSolved && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white lg:text-3xl">
                  {topic.title}
                </h1>
              </div>

              {/* Meta Info */}
              <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{topic.authorName}</span>
                <span>•</span>
                <span>{formatDate(topic.createdAt)}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {topic.views} views
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {topic.postCount} replies
                </div>
              </div>

              {/* Tags */}
              {topic.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {topic.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4">
                {/* Voting */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleVote('topic', topic.id, 'upvote')}
                    disabled={!currentUser}
                    className={`rounded-lg p-2 transition-colors ${
                      userVotes[`topic_${topic.id}`] === 'upvote'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <ThumbsUp className="h-5 w-5" />
                  </button>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {topic.upvotes - topic.downvotes}
                  </span>
                  <button
                    onClick={() => handleVote('topic', topic.id, 'downvote')}
                    disabled={!currentUser}
                    className={`rounded-lg p-2 transition-colors ${
                      userVotes[`topic_${topic.id}`] === 'downvote'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <ThumbsDown className="h-5 w-5" />
                  </button>
                </div>

                {/* Other Actions */}
                <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                  <Share className="h-4 w-4" />
                  {t.forum.topic.share}
                </button>

                {currentUser && (
                  <button
                    onClick={() => setShowReplyEditor(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                  >
                    <Reply className="h-4 w-4" />
                    {t.forum.reply}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Topic Content */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="prose max-w-none dark:prose-invert">
            {topic.content}
          </div>
        </div>

        {/* Reply Editor */}
        {showReplyEditor && currentUser && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {replyingTo ? 'Reply to post' : t.forum.post.writeReply}
            </h3>

            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t.forum.post.replyPlaceholder}
              rows={6}
              className="resize-vertical w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleReply}
                disabled={!replyContent.trim()}
                className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.forum.post.postReply}
              </button>
              <button
                onClick={() => {
                  setShowReplyEditor(false);
                  setReplyContent('');
                  setReplyingTo(null);
                }}
                className="rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className={`rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${
                post.isSolution ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Author Avatar */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                    {post.authorAvatar ? (
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1">
                    {/* Author Info */}
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {post.authorName}
                      </span>
                      {post.isSolution && (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle className="h-3 w-3" />
                          Solution
                        </span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatRelativeDate(post['createdAt'])}
                      </span>
                      {post.isEdited && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          ({t.forum.post.lastEdited})
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={`prose max-w-none dark:prose-invert ${
                        !expandedPosts.has(post.id) && post.content.length > 500
                          ? 'line-clamp-6'
                          : ''
                      }`}
                    >
                      {post.htmlContent || post.content}
                    </div>

                    {/* Expand/Collapse for long posts */}
                    {post.content.length > 500 && (
                      <button
                        onClick={() => togglePostExpansion(post.id)}
                        className="mt-2 flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {expandedPosts.has(post.id) ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            {t.forum.post.showLess}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            {t.forum.post.showMore}
                          </>
                        )}
                      </button>
                    )}

                    {/* Attachments */}
                    {post.attachments.length > 0 && (
                      <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                        <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          {t.forum.post.attachments}
                        </h4>
                        <div className="space-y-2">
                          {post.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <FileText className="h-4 w-4" />
                              {attachment.fileName}
                              <span className="text-xs text-gray-500">
                                ({Math.round(attachment.fileSize / 1024)}KB)
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-4">
                      {/* Voting */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleVote('post', post.id, 'upvote')}
                          disabled={!currentUser}
                          className={`rounded p-1 transition-colors ${
                            userVotes[`post_${post.id}`] === 'upvote'
                              ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {post.upvotes - post.downvotes}
                        </span>
                        <button
                          onClick={() =>
                            handleVote('post', post.id, 'downvote')
                          }
                          disabled={!currentUser}
                          className={`rounded p-1 transition-colors ${
                            userVotes[`post_${post.id}`] === 'downvote'
                              ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Other Actions */}
                      {currentUser && (
                        <>
                          <button
                            onClick={() => {
                              setReplyingTo(post.id);
                              setShowReplyEditor(true);
                            }}
                            className="text-sm text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                          >
                            {t.forum.post.reply}
                          </button>

                          <button className="text-sm text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                            {t.forum.post.quote}
                          </button>

                          {!post.isSolution &&
                            currentUser.id === topic.authorId && (
                              <button
                                onClick={() =>
                                  forumPosts.markAsSolution(post.id, topic.id)
                                }
                                className="text-sm text-green-600 hover:underline dark:text-green-400"
                              >
                                {t.forum.post.markSolution}
                              </button>
                            )}
                        </>
                      )}

                      <button className="text-sm text-gray-600 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                        {t.forum.post.report}
                      </button>
                    </div>

                    {/* Reactions */}
                    {Object.keys(post.reactions).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {Object.entries(post.reactions).map(
                          ([emoji, userIds]) => (
                            <button
                              key={emoji}
                              className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                            >
                              <span>{emoji}</span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {userIds.length}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Load More Posts */}
          {hasMore && !loading && (
            <div className="text-center">
              <button
                onClick={() => loadPosts(false)}
                disabled={loadingMore}
                className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {loadingMore ? t.common.loading : t.forum.post.loadMore}
              </button>
            </div>
          )}

          {/* No posts message */}
          {posts.length === 0 && !loading && (
            <div className="py-8 text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                {t.forum.post.noReplies}
              </h3>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Be the first to reply to this topic!
              </p>
              {currentUser && (
                <button
                  onClick={() => setShowReplyEditor(true)}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                >
                  {t.forum.post.writeReply}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumTopic;
