import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
  or,
  and,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject} from 'firebase/storage';
import { db, storage} from './firebase-config';
import type {
  ForumCategory,
  ForumTopic,
  ForumPost,
  ForumVote,
  ForumReaction,
  UserReputation,
  ForumReport,
  ForumNotification,
  ForumSearchFilters,
  ForumSearchResult,
  ForumStats,
  ForumModerationAction,
  User,
} from '../types';

// Collection references
const categoriesRef = collection(db, 'forum_categories');
const topicsRef = collection(db, 'forum_topics');
const postsRef = collection(db, 'forum_posts');
const votesRef = collection(db, 'forum_votes');
const reactionsRef = collection(db, 'forum_reactions');
const reputationRef = collection(db, 'user_reputation');
const reportsRef = collection(db, 'forum_reports');
const notificationsRef = collection(db, 'forum_notifications');
const moderationRef = collection(db, 'forum_moderation');

// Utility function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
};

// Utility function to convert document data
const convertDoc = <T>(doc: DocumentSnapshot | QueryDocumentSnapshot): T | null => {
  if (!doc.exists()) return null;
  
  const data = doc['data']();
  const converted = { ...data, id: doc['id'] } as any;
  
  // Convert all timestamp fields to Date objects
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object') {
      if (converted[key].toDate) {
        converted[key] = converted[key].toDate();
      } else if (Array.isArray(converted[key])) {
        // Handle arrays with timestamps
        converted[key] = converted[key].map((item: any) => {
          if (item && typeof item === 'object' && item.toDate) {
            return item.toDate();
          }
          return item;
        });
      } else if (typeof converted[key] === 'object') {
        // Handle nested objects with timestamps
        Object.keys(converted[key]).forEach(nestedKey => {
          if (converted[key][nestedKey] && converted[key][nestedKey].toDate) {
            converted[key][nestedKey] = converted[key][nestedKey].toDate();
          }
        });
      }
    }
  });
  
  return converted as T;
};

// Forum Categories
export const forumCategories = {
  // Get all active categories
  async getAll(): Promise<ForumCategory[]> {
    const q = query(categoriesRef, where('isActive', '==', true), orderBy('displayOrder'));
    const snapshot = await getDocs(q);
    return snapshot['docs'].map(doc => convertDoc<ForumCategory>(doc)!);
  },

  // Get category by ID
  async getById(id: string): Promise<ForumCategory | null> {
    const docSnap = await getDoc(doc(categoriesRef, id));
    return convertDoc<ForumCategory>(docSnap);
  },

  // Get category by slug
  async getBySlug(slug: string): Promise<ForumCategory | null> {
    const q = query(categoriesRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);
    return snapshot['empty'] ? null : convertDoc<ForumCategory>(snapshot['docs'][0])!;
  },

  // Create new category
  async create(data: Omit<ForumCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(categoriesRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef['id'];
  },

  // Update category
  async update(id: string, data: Partial<ForumCategory>): Promise<void> {
    await updateDoc(doc(categoriesRef, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Update category stats
  async updateStats(categoryId: string, topicDelta: number = 0, postDelta: number = 0): Promise<void> {
    const updates: any = {
      updatedAt: serverTimestamp(),
    };
    
    if (topicDelta !== 0) {
      updates.topicCount = increment(topicDelta);
    }
    if (postDelta !== 0) {
      updates.postCount = increment(postDelta);
    }
    
    await updateDoc(doc(categoriesRef, categoryId), updates);
  },
};

// Forum Topics
export const forumTopics = {
  // Get topics by category
  async getByCategory(
    categoryId: string,
    lastDoc?: QueryDocumentSnapshot,
    limitCount: number = 20
  ): Promise<{ topics: ForumTopic[]; lastDoc: QueryDocumentSnapshot | null }> {
    let q = query(
      topicsRef,
      where('categoryId', '==', categoryId),
      orderBy('isPinned', 'desc'),
      orderBy('lastActivity.timestamp', 'desc'),
      limit(limitCount)
    );

    if(lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const topics = snapshot['docs'].map(doc => convertDoc<ForumTopic>(doc)!);
    const newLastDoc = snapshot['docs'].length > 0 ? snapshot.docs[snapshot['docs'].length - 1] : null;

    return { topics, lastDoc: newLastDoc };
  },

  // Get topic by ID
  async getById(id: string): Promise<ForumTopic | null> {
    const docSnap = await getDoc(doc(topicsRef, id));
    if (!docSnap.exists()) return null;
    
    // Increment view count
    await updateDoc(doc(topicsRef, id), {
      views: increment(1),
    });
    
    return convertDoc<ForumTopic>(docSnap);
  },

  // Get topic by slug
  async getBySlug(slug: string): Promise<ForumTopic | null> {
    const q = query(topicsRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot['empty']) return null;
    
    const topic = convertDoc<ForumTopic>(snapshot['docs'][0])!;
    
    // Increment view count
    await updateDoc(doc(topicsRef, topic['id']), {
      views: increment(1),
    });
    
    return topic;
  },

  // Create new topic
  async create(data: Omit<ForumTopic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const batch = writeBatch(db);
    
    // Create topic
    const topicRef = doc(topicsRef);
    batch.set(topicRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActivity: {
        userId: data.authorId,
        userName: data['authorName'],
        timestamp: serverTimestamp(),
      },
    });
    
    // Update category stats
    const categoryRef = doc(categoriesRef, data['categoryId']);
    batch.update(categoryRef, {
      topicCount: increment(1),
      lastActivity: {
        topicId: topicRef['id'],
        topicTitle: data['title'],
        userId: data['authorId'],
        userName: data['authorName'],
        timestamp: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
    
    await batch.commit();
    return topicRef['id'];
  },

  // Update topic
  async update(id: string, data: Partial<ForumTopic>): Promise<void> {
    await updateDoc(doc(topicsRef, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Update topic stats
  async updateStats(topicId: string, postDelta: number = 0, lastActivity?: any): Promise<void> {
    const updates: any = {
      updatedAt: serverTimestamp(),
    };
    
    if (postDelta !== 0) {
      updates.postCount = increment(postDelta);
    }
    
    if(lastActivity) {
      updates.lastActivity = lastActivity;
    }
    
    await updateDoc(doc(topicsRef, topicId), updates);
  },

  // Toggle pin status
  async togglePin(id: string): Promise<void> {
    const docSnap = await getDoc(doc(topicsRef, id));
    if (docSnap.exists()) {
      const currentPinned = docSnap.data().isPinned || false;
      await updateDoc(doc(topicsRef, id), {
        isPinned: !currentPinned,
        updatedAt: serverTimestamp(),
      });
    }
  },

  // Toggle lock status
  async toggleLock(id: string): Promise<void> {
    const docSnap = await getDoc(doc(topicsRef, id));
    if (docSnap.exists()) {
      const currentLocked = docSnap['data']().isLocked || false;
      await updateDoc(doc(topicsRef, id), {
        isLocked: !currentLocked,
        updatedAt: serverTimestamp(),
      });
    }
  },

  // Mark as solved
  async markSolved(id: string, solved: boolean = true): Promise<void> {
    await updateDoc(doc(topicsRef, id), {
      isSolved: solved,
      updatedAt: serverTimestamp(),
    });
  },

  // Get trending topics
  async getTrending(limitCount: number = 10): Promise<ForumTopic[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      topicsRef,
      where('lastActivity.timestamp', '>=', oneDayAgo),
      orderBy('lastActivity.timestamp', 'desc'),
      orderBy('upvotes', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot['docs'].map(doc => convertDoc<ForumTopic>(doc)!);
  },
};

// Forum Posts
export const forumPosts = {
  // Get posts by topic
  async getByTopic(
    topicId: string,
    lastDoc?: QueryDocumentSnapshot,
    limitCount: number = 20
  ): Promise<{ posts: ForumPost[]; lastDoc: QueryDocumentSnapshot | null }> {
    let q = query(
      postsRef,
      where('topicId', '==', topicId),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );

    if(lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const posts = snapshot['docs'].map(doc => convertDoc<ForumPost>(doc)!);
    const newLastDoc = snapshot['docs'].length > 0 ? snapshot.docs[snapshot['docs'].length - 1] : null;

    return { posts, lastDoc: newLastDoc };
  },

  // Get post by ID
  async getById(id: string): Promise<ForumPost | null> {
    const docSnap = await getDoc(doc(postsRef, id));
    return convertDoc<ForumPost>(docSnap);
  },

  // Create new post
  async create(data: Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const batch = writeBatch(db);
    
    // Create post
    const postRef = doc(postsRef);
    batch.set(postRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Update topic stats
    const topicRef = doc(topicsRef, data.topicId);
    batch.update(topicRef, {
      postCount: increment(1),
      lastActivity: {
        userId: data['authorId'],
        userName: data['authorName'],
        timestamp: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
    
    // Update category stats
    const topicSnap = await getDoc(topicRef);
    if (topicSnap.exists()) {
      const topic = topicSnap['data']() as ForumTopic;
      const categoryRef = doc(categoriesRef, topic.categoryId);
      batch.update(categoryRef, {
        postCount: increment(1),
        lastActivity: {
          topicId: data.topicId,
          topicTitle: topic.title,
          userId: data['authorId'],
          userName: data['authorName'],
          timestamp: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });
    }
    
    await batch.commit();
    return postRef['id'];
  },

  // Update post
  async update(id: string, data: Partial<ForumPost>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
      isEdited: true,
    };

    // Add to edit history if content changed
    if (data['content']) {
      const docSnap = await getDoc(doc(postsRef, id));
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        updateData.editHistory = arrayUnion({
          content: currentData.content,
          editedAt: serverTimestamp(),
          editedBy: data['authorId'] || currentData.authorId,
        });
      }
    }

    await updateDoc(doc(postsRef, id), updateData);
  },

  // Delete post
  async delete(id: string): Promise<void> {
    const docSnap = await getDoc(doc(postsRef, id));
    if (!docSnap.exists()) return;

    const post = docSnap.data() as ForumPost;
    const batch = writeBatch(db);

    // Delete post
    batch.delete(doc(postsRef, id));

    // Update topic stats
    const topicRef = doc(topicsRef, post.topicId);
    batch.update(topicRef, {
      postCount: increment(-1),
      updatedAt: serverTimestamp(),
    });

    // Update category stats  
    const topicSnap = await getDoc(topicRef);
    if (topicSnap.exists()) {
      const topic = topicSnap['data']() as ForumTopic;
      const categoryRef = doc(categoriesRef, topic.categoryId);
      batch.update(categoryRef, {
        postCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },

  // Mark post as solution
  async markAsSolution(postId: string, topicId: string): Promise<void> {
    const batch = writeBatch(db);

    // Mark this post as solution
    batch.update(doc(postsRef, postId), {
      isSolution: true,
      updatedAt: serverTimestamp(),
    });

    // Mark topic as solved
    batch.update(doc(topicsRef, topicId), {
      isSolved: true,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  },

  // Get threaded replies
  async getReplies(parentPostId: string): Promise<ForumPost[]> {
    const q = query(
      postsRef,
      where('parentPostId', '==', parentPostId),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot['docs'].map(doc => convertDoc<ForumPost>(doc)!);
  },
};

// Voting System
export const forumVoting = {
  // Cast vote
  async vote(userId: string, targetType: 'topic' | 'post', targetId: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    const voteId = `${userId}_${targetType}_${targetId}`;
    const batch = writeBatch(db);

    // Check if user already voted
    const existingVoteSnap = await getDoc(doc(votesRef, voteId));
    const targetRef = targetType === 'topic' ? doc(topicsRef, targetId) : doc(postsRef, targetId);

    if (existingVoteSnap.exists()) {
      const existingVote = existingVoteSnap.data() as ForumVote;
      
      if (existingVote.voteType === voteType) {
        // Remove vote
        batch.delete(doc(votesRef, voteId));
        
        // Update target vote count
        const decrementField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
        batch.update(targetRef, {
          [decrementField]: increment(-1),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Change vote
        batch.update(doc(votesRef, voteId), {
          voteType,
          createdAt: serverTimestamp(),
        });
        
        // Update target vote counts
        const decrementField = existingVote.voteType === 'upvote' ? 'upvotes' : 'downvotes';
        const incrementField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
        
        batch.update(targetRef, {
          [decrementField]: increment(-1),
          [incrementField]: increment(1),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      // New vote
      batch.set(doc(votesRef, voteId), {
        id: voteId,
        userId,
        targetType,
        targetId,
        voteType,
        createdAt: serverTimestamp(),
      });
      
      // Update target vote count
      const incrementField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
      batch.update(targetRef, {
        [incrementField]: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },

  // Get user's vote for target
  async getUserVote(userId: string, targetType: 'topic' | 'post', targetId: string): Promise<ForumVote | null> {
    const voteId = `${userId}_${targetType}_${targetId}`;
    const docSnap = await getDoc(doc(votesRef, voteId));
    return convertDoc<ForumVote>(docSnap);
  },
};

// Reactions System
export const forumReactions = {
  // Add/remove reaction
  async toggleReaction(userId: string, postId: string, emoji: string): Promise<void> {
    const reactionId = `${userId}_${postId}_${emoji}`;
    const batch = writeBatch(db);

    const reactionDocSnap = await getDoc(doc(reactionsRef, reactionId));
    const postRef = doc(postsRef, postId);

    if (reactionDocSnap.exists()) {
      // Remove reaction
      batch.delete(doc(reactionsRef, reactionId));
      batch.update(postRef, {
        [`reactions.${emoji}`]: arrayRemove(userId),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Add reaction
      batch.set(doc(reactionsRef, reactionId), {
        id: reactionId,
        userId,
        postId,
        emoji,
        createdAt: serverTimestamp(),
      });
      batch.update(postRef, {
        [`reactions.${emoji}`]: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },

  // Get reactions for post
  async getByPost(postId: string): Promise<ForumReaction[]> {
    const q = query(reactionsRef, where('postId', '==', postId));
    const snapshot = await getDocs(q);
    return snapshot['docs'].map(doc => convertDoc<ForumReaction>(doc)!);
  },
};

// Search functionality
export const forumSearch = {
  // Search topics and posts
  async search(filters: ForumSearchFilters): Promise<{ topics: ForumSearchResult[]; posts: ForumSearchResult[] }> {
    const results: { topics: ForumSearchResult[]; posts: ForumSearchResult[] } = {
      topics: [],
      posts: []
    };

    // Basic search implementation (in production, use Algolia or similar)
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase();

      // Search topics
      let topicsQuery = query(topicsRef);
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        topicsQuery = query(topicsQuery, where('categoryId', 'in', filters.categoryIds));
      }

      const topicsSnapshot = await getDocs(topicsQuery);
      const topicResults = topicsSnapshot.docs
        .map(doc => convertDoc<ForumTopic>(doc)!)
        .filter(topic => 
          topic.title.toLowerCase().includes(searchTerm) ||
          topic.content.toLowerCase().includes(searchTerm) ||
          topic.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        )
        .slice(0, 50);

      // Convert to search results
      results.topics = topicResults.map(topic => ({
        type: 'topic' as const,
        id: topic['id'],
        title: topic.title,
        content: topic.content,
        excerpt: topic.content.substring(0, 200) + '...',
        categoryId: topic.categoryId,
        categoryName: '', // Would need to fetch category name
        authorId: topic.authorId,
        authorName: topic.authorName,
        score: calculateRelevanceScore(topic.title + ' ' + topic.content, searchTerm),
        highlights: extractHighlights(topic.content, searchTerm),
        createdAt: topic['createdAt'],
      }));

      // Search posts
      let postsQuery = query(postsRef);
      const postsSnapshot = await getDocs(postsQuery);
      const postResults = postsSnapshot.docs
        .map(doc => convertDoc<ForumPost>(doc)!)
        .filter(post => 
          post.content.toLowerCase().includes(searchTerm)
        )
        .slice(0, 50);

      results.posts = postResults.map(post => ({
        type: 'post' as const,
        id: post['id'],
        title: '',
        content: post.content,
        excerpt: post.content.substring(0, 200) + '...',
        categoryId: '',
        categoryName: '',
        authorId: post.authorId,
        authorName: post.authorName,
        score: calculateRelevanceScore(post.content, searchTerm),
        highlights: extractHighlights(post.content, searchTerm),
        createdAt: post['createdAt'],
        topicId: post.topicId,
      }));
    }

    // Sort by relevance score
    results.topics.sort((a, b) => b.score - a.score);
    results.posts.sort((a, b) => b.score - a.score);

    return results;
  },
};

// Utility functions for search
function calculateRelevanceScore(content: string, searchTerm: string): number {
  const contentLower = content.toLowerCase();
  const termLower = searchTerm.toLowerCase();
  
  let score = 0;
  const words = termLower.split(' ');
  
  words.forEach(word => {
    const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
    score += matches;
  });
  
  return score;
}

function extractHighlights(content: string, searchTerm: string): string[] {
  const highlights: string[] = [];
  const words = searchTerm.toLowerCase().split(' ');
  
  words.forEach(word => {
    const regex = new RegExp(`.{0,50}${word}.{0,50}`, 'gi');
    const matches = content.match(regex);
    if(matches) {
      highlights.push(...matches.slice(0, 3));
    }
  });
  
  return highlights;
}

// File upload for attachments
export const forumFiles = {
  // Upload file
  async uploadFile(file: File, userId: string, topicId: string): Promise<{ id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number }> {
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${fileId}_${file['name']}`;
    const filePath = `forum/attachments/${userId}/${topicId}/${fileName}`;
    
    const fileRef = ref(storage, filePath);
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot['ref']);
    
    return {
      id: fileId,
      fileName: file['name'],
      fileUrl: downloadURL,
      fileType: file['type'],
      fileSize: file.size,
    };
  },

  // Delete file
  async deleteFile(fileUrl: string): Promise<void> {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  },
};

// Real-time subscriptions
export const forumSubscriptions = {
  // Subscribe to category topics
  subscribeToTopics(categoryId: string, callback: (topics: ForumTopic[]) => void) {
    const q = query(
      topicsRef,
      where('categoryId', '==', categoryId),
      orderBy('isPinned', 'desc'),
      orderBy('lastActivity.timestamp', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const topics = snapshot['docs'].map(doc => convertDoc<ForumTopic>(doc)!);
      callback(topics);
    });
  },

  // Subscribe to topic posts
  subscribeToPosts(topicId: string, callback: (posts: ForumPost[]) => void) {
    const q = query(
      postsRef,
      where('topicId', '==', topicId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const posts = snapshot['docs'].map(doc => convertDoc<ForumPost>(doc)!);
      callback(posts);
    });
  },

  // Subscribe to user notifications
  subscribeToNotifications(userId: string, callback: (notifications: ForumNotification[]) => void) {
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot['docs'].map(doc => convertDoc<ForumNotification>(doc)!);
      callback(notifications);
    });
  },
};

export {
  categoriesRef,
  topicsRef,
  postsRef,
  votesRef,
  reactionsRef,
  reputationRef,
  reportsRef,
  notificationsRef,
  moderationRef,
};