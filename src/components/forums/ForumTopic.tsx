import React, { useState, useEffect } from 'react';
import { 
import { useTranslations} from '../../hooks/useTranslations';
import { forumTopics, forumPosts, forumVoting, forumCategories} from '../../lib/forum';

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
  ChevronUp
} from 'lucide-react';
import type { ForumTopic, ForumPost, ForumCategory, Language } from '../../types';

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

const ForumTopic: React.FC<ForumTopicProps> = ({ topicSlug, language, currentUser }) => {
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
  const [userVotes, setUserVotes] = useState<Record<string, 'upvote' | 'downvote'>>({});

  useEffect(() => {
    loadTopic();
  }, [topicSlug]);

  useEffect(() => {
    if(topic) {
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
      if(reset) {
        setPosts([]);
        setLastDoc(null);
      } else {
        setLoadingMore(true);
      }

      const { posts: newPosts, lastDoc: newLastDoc } = await forumPosts.getByTopic(
        topic.id,
        reset ? undefined : lastDoc,
        20
      );

      if(reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setLastDoc(newLastDoc);
      setHasMore(newPosts.length === 20 && !!newLastDoc);

      // Load user votes if logged in
      if(currentUser) {
        const votes: Record<string, 'upvote' | 'downvote'> = {};
        
        // Check vote for topic
        const topicVote = await forumVoting.getUserVote(currentUser.id, 'topic', topic.id);
        if(topicVote) {
          votes[`topic_${topic.id}`] = topicVote.voteType;
        }

        // Check votes for posts
        for (const post of newPosts) {
          const postVote = await forumVoting.getUserVote(currentUser.id, 'post', post.id);
          if(postVote) {
            votes[`post_${post.id}`] = postVote.voteType;
          }
        }

        setUserVotes(prev => ({ ...prev, ...votes }));
      }

    } catch (err) {
      console.error('Error loading posts:', err);
      setError(t.forum.errors.loadingFailed);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVote = async (targetType: 'topic' | 'post', targetId: string, voteType: 'upvote' | 'downvote') => {
    if (!currentUser) return;

    try {
      await forumVoting.vote(currentUser.id, targetType, targetId, voteType);
      
      const voteKey = `${targetType}_${targetId}`;
      const currentVote = userVotes[voteKey];
      
      if (currentVote === voteType) {
        // Remove vote
        setUserVotes(prev => {
          const newVotes = { ...prev };
          delete newVotes[voteKey];
          return newVotes;
        });
      } else {
        // Add or change vote
        setUserVotes(prev => ({ ...prev, [voteKey]: voteType }));
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
        childrenCount: 0
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
    setExpandedPosts(prev => {
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
      minute: '2-digit'
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
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-lg mb-4"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 dark:bg-gray-700 rounded-lg mb-4"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if(error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">{error}</div>
            <button 
              onClick={loadTopic}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <a 
              href={`/${language}/forum`}
              className="hover:text-blue-500 transition-colors"
            >
              {t.forum.title}
            </a>
            <span>/</span>
            {category && (
              <>
                <a 
                  href={`/${language}/forum/category/${category.slug}`}
                  className="hover:text-blue-500 transition-colors"
                >
                  {category['name']}
                </a>
                <span>/</span>
              </>
            )}
            <span className="text-gray-900 dark:text-white line-clamp-1">{topic.title}</span>
          </div>

          {/* Topic Header */}
          <div className="flex items-start gap-4">
            {/* Author Avatar */}
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              {topic.authorAvatar ? (
                <img src={topic.authorAvatar} alt={topic.authorName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              )}
            </div>

            <div className="flex-1">
              {/* Status Icons and Title */}
              <div className="flex items-center gap-2 mb-2">
                {topic.isPinned && <Pin className="w-5 h-5 text-yellow-500" />}
                {topic.isLocked && <Lock className="w-5 h-5 text-red-500" />}
                {topic.isSolved && <CheckCircle className="w-5 h-5 text-green-500" />}
                
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {topic.title}
                </h1>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <span className="font-medium">{topic.authorName}</span>
                <span>•</span>
                <span>{formatDate(topic.createdAt)}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {topic.views} views
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {topic.postCount} replies
                </div>
              </div>

              {/* Tags */}
              {topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {topic.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
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
                    className={`p-2 rounded-lg transition-colors ${
                      userVotes[`topic_${topic.id}`] === 'upvote'
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {topic.upvotes - topic.downvotes}
                  </span>
                  <button
                    onClick={() => handleVote('topic', topic.id, 'downvote')}
                    disabled={!currentUser}
                    className={`p-2 rounded-lg transition-colors ${
                      userVotes[`topic_${topic.id}`] === 'downvote'
                        ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <ThumbsDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Other Actions */}
                <button className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Share className="w-4 h-4" />
                  {t.forum.topic.share}
                </button>

                {currentUser && (
                  <button 
                    onClick={() => setShowReplyEditor(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Reply className="w-4 h-4" />
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
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="prose dark:prose-invert max-w-none">
            {topic.content}
          </div>
        </div>

        {/* Reply Editor */}
        {showReplyEditor && currentUser && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {replyingTo ? 'Reply to post' : t.forum.post.writeReply}
            </h3>
            
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t.forum.post.replyPlaceholder}
              rows={6}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-vertical"
            />
            
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleReply}
                disabled={!replyContent.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.forum.post.postReply}
              </button>
              <button
                onClick={() => {
                  setShowReplyEditor(false);
                  setReplyContent('');
                  setReplyingTo(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${
                post.isSolution ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Author Avatar */}
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    {post.authorAvatar ? (
                      <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1">
                    {/* Author Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">{post.authorName}</span>
                      {post.isSolution && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
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
                    <div className={`prose dark:prose-invert max-w-none ${
                      !expandedPosts.has(post.id) && post.content.length > 500 ? 'line-clamp-6' : ''
                    }`}>
                      {post.htmlContent || post.content}
                    </div>

                    {/* Expand/Collapse for long posts */}
                    {post.content.length > 500 && (
                      <button
                        onClick={() => togglePostExpansion(post.id)}
                        className="flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {expandedPosts.has(post.id) ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            {t.forum.post.showLess}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            {t.forum.post.showMore}
                          </>
                        )}
                      </button>
                    )}

                    {/* Attachments */}
                    {post.attachments.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {t.forum.post.attachments}
                        </h4>
                        <div className="space-y-2">
                          {post.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <FileText className="w-4 h-4" />
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
                    <div className="flex items-center gap-4 mt-4">
                      {/* Voting */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleVote('post', post.id, 'upvote')}
                          disabled={!currentUser}
                          className={`p-1 rounded transition-colors ${
                            userVotes[`post_${post.id}`] === 'upvote'
                              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {post.upvotes - post.downvotes}
                        </span>
                        <button
                          onClick={() => handleVote('post', post.id, 'downvote')}
                          disabled={!currentUser}
                          className={`p-1 rounded transition-colors ${
                            userVotes[`post_${post.id}`] === 'downvote'
                              ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <ThumbsDown className="w-4 h-4" />
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
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {t.forum.post.reply}
                          </button>
                          
                          <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {t.forum.post.quote}
                          </button>

                          {!post.isSolution && currentUser.id === topic.authorId && (
                            <button 
                              onClick={() => forumPosts.markAsSolution(post.id, topic.id)}
                              className="text-sm text-green-600 dark:text-green-400 hover:underline"
                            >
                              {t.forum.post.markSolution}
                            </button>
                          )}
                        </>
                      )}

                      <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        {t.forum.post.report}
                      </button>
                    </div>

                    {/* Reactions */}
                    {Object.keys(post.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {Object.entries(post.reactions).map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <span>{emoji}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{userIds.length}</span>
                          </button>
                        ))}
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
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loadingMore ? t.common.loading : t.forum.post.loadMore}
              </button>
            </div>
          )}

          {/* No posts message */}
          {posts.length === 0 && !loading && (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t.forum.post.noReplies}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Be the first to reply to this topic!
              </p>
              {currentUser && (
                <button
                  onClick={() => setShowReplyEditor(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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