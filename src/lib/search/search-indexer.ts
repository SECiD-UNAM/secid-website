// @ts-nocheck
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { searchEngine } from './search-engine';

/**
 * Search Content Indexer for SECiD Platform
 * Processes and indexes content from various sources for search functionality
 */

import type {
  IndexedContent,
  SearchContentType,
  SearchAnalyticsEvent,
} from '@/types/search';
import type {
  Job,
  Event,
  User,
  ForumTopic,
  ForumPost,
  NewsArticle,
  MentorProfile,
} from '@/types';

// Content processing utilities
function extractTextContent(html: string): string {
  // Basic HTML to text conversion
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateKeywords(
  content: string,
  title: string,
  tags: string[]
): string[] {
  const words = [...title.split(' '), ...content.split(' '), ...tags];
  const filtered = words
    .map((word) => word.toLowerCase().replace(/[^\w]/g, ''))
    .filter((word) => word.length > 2)
    .filter((word, index, arr) => arr.indexOf(word) === index);

  return filtered.slice(0, 50); // Limit keywords
}

function calculateContentBoost(
  type: SearchContentType,
  metadata: Record<string, any>
): number {
  let boost = 1.0;

  // Base boost by content type
  const typeBoosts: Record<SearchContentType, number> = {
    jobs: 1.2,
    events: 1.1,
    forums: 1.0,
    members: 0.9,
    resources: 1.1,
    mentors: 1.0,
    news: 1.0,
    all: 1.0,
  };

  boost *= typeBoosts[type];

  // Additional boosts based on metadata
  if (metadata['isPinned']) boost *= 1.3;
  if (metadata['isFeatured']) boost *= 1.2;
  if (metadata['isPopular']) boost *= 1.1;
  if (metadata['recentlyUpdated']) boost *= 1.05;

  // Penalty for inactive/expired content
  if (metadata['isExpired']) boost *= 0.5;
  if (!metadata['isActive']) boost *= 0.3;

  return Math.max(0.1, Math.min(3.0, boost));
}

// Content indexers for different types
class JobIndexer {
  static async indexJobs(): Promise<IndexedContent[]> {
    try {
      const jobsRef = collection(db, 'jobs');
      const activeJobsQuery = query(
        jobsRef,
        where('isActive', '==', true),
        orderBy('postedAt', 'desc'),
        limit(1000)
      );

      const snapshot = await getDocs(activeJobsQuery);
      const indexed: IndexedContent[] = [];

      for (const jobDoc of snapshot['docs']) {
        const job = { id: jobDoc['id'], ...jobDoc['data']() } as Job;

        const searchableText = [
          job.title,
          job.company,
          job.location,
          job.description,
          job.requirements.join(' '),
          job?.benefits?.join(' ') || '',
          job.tags.join(' '),
        ].join(' ');

        const keywords = generateKeywords(
          job['description'],
          `${job.title} ${job.company}`,
          job.tags
        );

        indexed.push({
          id: job['id'],
          type: 'jobs',
          title: `${job.title} - ${job.company}`,
          content: job.description,
          description: `${job.level} position at ${job.company} in ${job.location}`,
          url: `/jobs/${job['id']}`,
          tags: job.tags,
          metadata: {
            category: job.level,
            location: job.location,
            company: job.company,
            level: job.level,
            type: job['type'],
            salary: job.salaryRange,
            postedBy: job.postedBy,
            isActive: job.isActive,
            remoteAllowed: job.remoteAllowed,
          },
          searchableText,
          keywords,
          language: 'es', // Default, could be detected
          boost: calculateContentBoost('jobs', {
            isActive: job.isActive,
            isFeatured: job.tags.includes('featured'),
            recentlyUpdated:
              Date.now() - job.postedAt.getTime() < 7 * 24 * 60 * 60 * 1000,
          }),
          createdAt: job.postedAt,
          updatedAt: job.postedAt,
          isActive: job.isActive,
        });
      }

      return indexed;
    } catch (error) {
      console.error('Error indexing jobs:', error);
      return [];
    }
  }
}

class EventIndexer {
  static async indexEvents(): Promise<IndexedContent[]> {
    try {
      const eventsRef = collection(db, 'events');
      const activeEventsQuery = query(
        eventsRef,
        where('isActive', '==', true),
        orderBy('date', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(activeEventsQuery);
      const indexed: IndexedContent[] = [];

      for (const eventDoc of snapshot['docs']) {
        const event = { id: eventDoc['id'], ...eventDoc['data']() } as Event;

        const searchableText = [
          event.title,
          event.description,
          event.location || '',
          event.tags.join(' '),
        ].join(' ');

        const keywords = generateKeywords(
          event['description'],
          event.title,
          event.tags
        );

        indexed.push({
          id: event['id'],
          type: 'events',
          title: event.title,
          content: event.description,
          description: `Event on ${event.date.toLocaleDateString()} ${event.location ? `at ${event.location}` : '(Virtual)'}`,
          url: `/events/${event['id']}`,
          tags: event.tags,
          metadata: {
            category: 'event',
            location: event.location,
            date: event.date,
            isVirtual: event.isVirtual,
            maxAttendees: event.maxAttendees,
            currentAttendees: event.currentAttendees,
            organizerId: event.organizerId,
            isActive: event.isActive,
          },
          searchableText,
          keywords,
          language: 'es',
          boost: calculateContentBoost('events', {
            isActive: event.isActive,
            isUpcoming: event.date > new Date(),
            hasAvailableSpots:
              !event.maxAttendees ||
              event.currentAttendees < event.maxAttendees,
          }),
          createdAt: event['createdAt'],
          updatedAt: event['updatedAt'],
          isActive: event.isActive,
        });
      }

      return indexed;
    } catch (error) {
      console.error('Error indexing events:', error);
      return [];
    }
  }
}

class ForumIndexer {
  static async indexForumContent(): Promise<IndexedContent[]> {
    try {
      const indexed: IndexedContent[] = [];

      // Index forum topics
      const topicsRef = collection(db, 'forum_topics');
      const activeTopicsQuery = query(
        topicsRef,
        orderBy('createdAt', 'desc'),
        limit(1000)
      );

      const topicsSnapshot = await getDocs(activeTopicsQuery);

      for (const topicDoc of topicsSnapshot.docs) {
        const topic = { id: topicDoc['id'], ...topicDoc.data() } as ForumTopic;

        const searchableText = [
          topic.title,
          extractTextContent(topic.content),
          topic.tags.join(' '),
        ].join(' ');

        const keywords = generateKeywords(
          extractTextContent(topic.content),
          topic.title,
          topic.tags
        );

        indexed.push({
          id: topic['id'],
          type: 'forums',
          title: topic.title,
          content: extractTextContent(topic.content),
          description: `Forum topic by ${topic.authorName}`,
          url: `/forum/topic/${topic.slug}`,
          tags: topic.tags,
          metadata: {
            category: 'topic',
            author: {
              id: topic.authorId,
              name: topic.authorName,
              avatar: topic.authorAvatar,
            },
            categoryId: topic.categoryId,
            isPinned: topic.isPinned,
            isLocked: topic.isLocked,
            isSolved: topic.isSolved,
            views: topic.views,
            postCount: topic.postCount,
            upvotes: topic.upvotes,
          },
          searchableText,
          keywords,
          language: 'es',
          boost: calculateContentBoost('forums', {
            isPinned: topic.isPinned,
            isSolved: topic.isSolved,
            isPopular: topic.views > 100 || topic.upvotes > 10,
            recentlyUpdated:
              Date.now() - topic.lastActivity.timestamp.getTime() <
              7 * 24 * 60 * 60 * 1000,
          }),
          createdAt: topic['createdAt'],
          updatedAt: topic['updatedAt'],
          isActive: true,
        });
      }

      // Index forum posts (sample of recent posts)
      const postsRef = collection(db, 'forum_posts');
      const recentPostsQuery = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const postsSnapshot = await getDocs(recentPostsQuery);

      for (const postDoc of postsSnapshot.docs) {
        const post = { id: postDoc['id'], ...postDoc.data() } as ForumPost;

        const searchableText = extractTextContent(post.content);
        const keywords = generateKeywords(searchableText, '', []);

        indexed.push({
          id: post['id'],
          type: 'forums',
          title: `Reply in topic`,
          content: extractTextContent(post.content),
          description: `Forum post by ${post.authorName}`,
          url: `/forum/topic/${post.topicId}#post-${post['id']}`,
          tags: [],
          metadata: {
            category: 'post',
            author: {
              id: post.authorId,
              name: post.authorName,
              avatar: post.authorAvatar,
            },
            topicId: post.topicId,
            upvotes: post.upvotes,
            isSolution: post.isSolution,
          },
          searchableText,
          keywords,
          language: 'es',
          boost: calculateContentBoost('forums', {
            isSolution: post.isSolution,
            isPopular: post.upvotes > 5,
            recentlyUpdated:
              Date.now() - post['createdAt'].getTime() <
              7 * 24 * 60 * 60 * 1000,
          }),
          createdAt: post['createdAt'],
          updatedAt: post['updatedAt'],
          isActive: true,
        });
      }

      return indexed;
    } catch (error) {
      console.error('Error indexing forum content:', error);
      return [];
    }
  }
}

class MemberIndexer {
  static async indexMembers(): Promise<IndexedContent[]> {
    try {
      const membersRef = collection(db, 'users');
      const activeMembersQuery = query(
        membersRef,
        where('isActive', '==', true),
        orderBy('joinedAt', 'desc'),
        limit(1000)
      );

      const snapshot = await getDocs(activeMembersQuery);
      const indexed: IndexedContent[] = [];

      for (const memberDoc of snapshot['docs']) {
        const member = { id: memberDoc['id'], ...memberDoc['data']() } as User;

        const searchableText = [
          member['name'],
          member.specialization || '',
          member.currentCompany || '',
          member.currentPosition || '',
        ].join(' ');

        const tags = [
          member.specialization,
          member.currentCompany,
          member?.graduationYear?.toString(),
        ].filter(Boolean) as string[];

        const keywords = generateKeywords(searchableText, member['name'], tags);

        indexed.push({
          id: member['id'],
          type: 'members',
          title: member['name'],
          content: `${member.specialization || ''} ${member.currentPosition || ''} at ${member.currentCompany || ''}`,
          description: `Alumni from ${member.graduationYear || 'Unknown'} working ${member.currentPosition ? `as ${member.currentPosition}` : ''} ${member.currentCompany ? `at ${member.currentCompany}` : ''}`,
          url: `/members/${member['id']}`,
          tags,
          metadata: {
            category: 'member',
            graduationYear: member.graduationYear,
            specialization: member.specialization,
            currentCompany: member.currentCompany,
            currentPosition: member.currentPosition,
            isActive: member.isActive,
          },
          searchableText,
          keywords,
          language: 'es',
          boost: calculateContentBoost('members', {
            isActive: member.isActive,
            hasComplete: !!(member.specialization && member.currentCompany),
            recentlyUpdated:
              Date.now() - member['updatedAt'].getTime() <
              30 * 24 * 60 * 60 * 1000,
          }),
          createdAt: member.joinedAt,
          updatedAt: member['updatedAt'],
          isActive: member.isActive,
        });
      }

      return indexed;
    } catch (error) {
      console.error('Error indexing members:', error);
      return [];
    }
  }
}

class MentorIndexer {
  static async indexMentors(): Promise<IndexedContent[]> {
    try {
      const mentorsRef = collection(db, 'mentors');
      const activeMentorsQuery = query(
        mentorsRef,
        where('isActive', '==', true),
        orderBy('joinedAt', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(activeMentorsQuery);
      const indexed: IndexedContent[] = [];

      for (const mentorDoc of snapshot['docs']) {
        const mentor = {
          id: mentorDoc['id'],
          ...mentorDoc['data'](),
        } as MentorProfile;

        const searchableText = [
          mentor.displayName,
          mentor.bio,
          mentor.expertiseAreas.join(' '),
          mentor.skills.join(' '),
          mentor.experience.currentPosition,
          mentor.experience.currentCompany,
        ].join(' ');

        const tags = [
          ...mentor.expertiseAreas,
          ...mentor.skills,
          mentor.experience.currentCompany,
        ];

        const keywords = generateKeywords(
          searchableText,
          mentor.displayName,
          tags
        );

        indexed.push({
          id: mentor['id'],
          type: 'mentors',
          title: mentor.displayName,
          content: mentor.bio,
          description: `${mentor.experience.currentPosition} at ${mentor.experience.currentCompany}`,
          url: `/mentors/${mentor['id']}`,
          tags,
          metadata: {
            category: 'mentor',
            expertiseAreas: mentor.expertiseAreas,
            skills: mentor.skills,
            yearsInField: mentor.experience.yearsInField,
            currentPosition: mentor.experience.currentPosition,
            currentCompany: mentor.experience.currentCompany,
            rating: mentor.rating,
            totalSessions: mentor.totalSessions,
            availableSpots: mentor.maxMentees - mentor.currentMentees,
            isActive: mentor.isActive,
          },
          searchableText,
          keywords,
          language: 'es',
          boost: calculateContentBoost('mentors', {
            isActive: mentor.isActive,
            hasHighRating: mentor.rating >= 4.5,
            hasAvailableSpots: mentor.currentMentees < mentor.maxMentees,
            isExperienced: mentor.experience.yearsInField >= 5,
          }),
          createdAt: mentor.joinedAt,
          updatedAt: mentor['updatedAt'],
          isActive: mentor.isActive,
        });
      }

      return indexed;
    } catch (error) {
      console.error('Error indexing mentors:', error);
      return [];
    }
  }
}

class NewsIndexer {
  static async indexNews(): Promise<IndexedContent[]> {
    try {
      const newsRef = collection(db, 'news');
      const publishedNewsQuery = query(
        newsRef,
        where('isPublished', '==', true),
        orderBy('publishedAt', 'desc'),
        limit(200)
      );

      const snapshot = await getDocs(publishedNewsQuery);
      const indexed: IndexedContent[] = [];

      for (const newsDoc of snapshot['docs']) {
        const article = {
          id: newsDoc['id'],
          ...newsDoc['data'](),
        } as NewsArticle;

        const searchableText = [
          article.title,
          article.excerpt,
          extractTextContent(article.content),
          article.tags.join(' '),
        ].join(' ');

        const keywords = generateKeywords(
          extractTextContent(article.content),
          article.title,
          article.tags
        );

        indexed.push({
          id: article['id'],
          type: 'news',
          title: article.title,
          content: extractTextContent(article.content),
          description: article.excerpt,
          url: `/news/${article.slug}`,
          tags: article.tags,
          metadata: {
            category: 'news',
            author: {
              id: article.authorId,
              name: 'Author', // Would need to fetch author details
            },
            slug: article.slug,
            featuredImage: article.featuredImage,
            isPublished: article.isPublished,
          },
          searchableText,
          keywords,
          language: 'es',
          boost: calculateContentBoost('news', {
            isPublished: article.isPublished,
            isFeatured: !!article.featuredImage,
            recentlyPublished:
              Date.now() - article.publishedAt.getTime() <
              30 * 24 * 60 * 60 * 1000,
          }),
          createdAt: article.publishedAt,
          updatedAt: article['updatedAt'],
          isActive: article.isPublished,
        });
      }

      return indexed;
    } catch (error) {
      console.error('Error indexing news:', error);
      return [];
    }
  }
}

// Main Search Indexer class
export class SearchIndexer {
  private static instance: SearchIndexer;
  private indexingInProgress = false;
  private lastIndexUpdate: Date | null = null;

  static getInstance(): SearchIndexer {
    if (!SearchIndexer.instance) {
      SearchIndexer.instance = new SearchIndexer();
    }
    return SearchIndexer.instance;
  }

  async indexAllContent(): Promise<void> {
    if (this.indexingInProgress) {
      console.log('Indexing already in progress...');
      return;
    }

    this.indexingInProgress = true;
    console.log('Starting content indexing...');

    try {
      const startTime = Date.now();
      const allContent: IndexedContent[] = [];

      // Index different content types in parallel
      const [jobs, events, forumContent, members, mentors, news] =
        await Promise.all([
          JobIndexer.indexJobs(),
          EventIndexer.indexEvents(),
          ForumIndexer.indexForumContent(),
          MemberIndexer.indexMembers(),
          MentorIndexer.indexMentors(),
          NewsIndexer.indexNews(),
        ]);

      allContent.push(
        ...jobs,
        ...events,
        ...forumContent,
        ...members,
        ...mentors,
        ...news
      );

      // Update search engine index
      searchEngine.updateIndex(allContent);

      this.lastIndexUpdate = new Date();
      const indexTime = Date.now() - startTime;

      console.log(`Content indexing completed in ${indexTime}ms:`);
      console.log(`- Jobs: ${jobs.length}`);
      console.log(`- Events: ${events.length}`);
      console.log(`- Forum content: ${forumContent.length}`);
      console.log(`- Members: ${members.length}`);
      console.log(`- Mentors: ${mentors.length}`);
      console.log(`- News: ${news.length}`);
      console.log(`- Total: ${allContent.length} items`);

      // Track indexing analytics
      this.trackIndexingAnalytics({
        duration: indexTime,
        totalItems: allContent.length,
        contentTypes: {
          jobs: jobs.length,
          events: events.length,
          forums: forumContent.length,
          members: members.length,
          mentors: mentors.length,
          news: news.length,
        },
      });
    } catch (error) {
      console.error('Error during content indexing:', error);
      throw error;
    } finally {
      this.indexingInProgress = false;
    }
  }

  async indexContentType(type: SearchContentType): Promise<void> {
    console.log(`Indexing ${type} content...`);

    try {
      let content: IndexedContent[] = [];

      switch (type) {
        case 'jobs':
          content = await JobIndexer.indexJobs();
          break;
        case 'events':
          content = await EventIndexer.indexEvents();
          break;
        case 'forums':
          content = await ForumIndexer.indexForumContent();
          break;
        case 'members':
          content = await MemberIndexer.indexMembers();
          break;
        case 'mentors':
          content = await MentorIndexer.indexMentors();
          break;
        case 'news':
          content = await NewsIndexer.indexNews();
          break;
        default:
          throw new Error(`Unknown content type: ${type}`);
      }

      // Get existing index and update only the specific content type
      const existingIndex = searchEngine.getIndexStatus();
      // This would require a method to update partial index
      // For now, we'll just log
      console.log(`Updated ${content.length} ${type} items`);
    } catch (error) {
      console.error(`Error indexing ${type} content:`, error);
      throw error;
    }
  }

  getIndexingStatus() {
    return {
      isIndexing: this.indexingInProgress,
      lastUpdate: this.lastIndexUpdate,
      engineStatus: searchEngine.getIndexStatus(),
    };
  }

  private async trackIndexingAnalytics(data: {
    duration: number;
    totalItems: number;
    contentTypes: Record<string, number>;
  }): Promise<void> {
    try {
      // Track indexing performance
      const event: SearchAnalyticsEvent = {
        type: 'search', // Would need a new type for indexing
        timestamp: new Date(),
        sessionId: crypto.randomUUID(),
        userAgent: 'Search Indexer',
        language: 'es',
      };

      // Store indexing metrics (would implement Firebase Analytics tracking)
      console.log('Indexing analytics:', data);
    } catch (error) {
      console.error('Error tracking indexing analytics:', error);
    }
  }

  // Schedule periodic re-indexing
  startPeriodicIndexing(intervalHours: number = 6): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        console.log('Starting scheduled content re-indexing...');
        await this.indexAllContent();
      } catch (error) {
        console.error('Error during scheduled indexing:', error);
      }
    }, intervalMs);

    console.log(`Scheduled periodic indexing every ${intervalHours} hours`);
  }

  // Force immediate re-indexing (for admin use)
  async forceReindex(): Promise<void> {
    this.indexingInProgress = false; // Reset flag
    await this.indexAllContent();
  }
}

// Export singleton instance
export const searchIndexer = SearchIndexer.getInstance();

// Auto-start indexing on module load (in browser environment)
if (typeof window !== 'undefined') {
  // Initial indexing after a delay to allow app to initialize
  setTimeout(() => {
    searchIndexer.indexAllContent().catch(console.error);
  }, 5000);

  // Start periodic indexing
  searchIndexer.startPeriodicIndexing(6);
}
