import { db, auth } from '@/lib/firebase';

/**
 * Search Analytics and History Tracking System
 * Features: Firebase integration, user behavior tracking, search insights
 */

import {
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import type {
  SearchAnalyticsEvent,
  SearchHistoryItem,
  PopularSearch,
  SearchFilters
} from '@/types/search';

// Local storage keys
const STORAGE_KEYS = {
  SESSION_ID: 'secid_search_session',
  RECENT_SEARCHES: 'secid_recent_searches',
  SEARCH_PREFERENCES: 'secid_search_preferences'
} as const;

// Session management
class SearchSession {
  private sessionId: string;
  private startTime: Date;
  private searchCount: number = 0;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startTime = new Date();
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    }
    return sessionId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  incrementSearchCount(): void {
    this.searchCount++;
  }

  getSessionData() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      searchCount: this.searchCount,
      duration: Date.now() - this.startTime.getTime()
    };
  }

  endSession(): void {
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
  }
}

// Search Analytics class
export class SearchAnalytics {
  private static instance: SearchAnalytics;
  private session: SearchSession;
  private isInitialized = false;

  constructor() {
    this.session = new SearchSession();
    this.initialize();
  }

  static getInstance(): SearchAnalytics {
    if (!SearchAnalytics.instance) {
      SearchAnalytics.instance = new SearchAnalytics();
    }
    return SearchAnalytics.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize analytics tracking
      this.isInitialized = true;
      console.log('Search Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize search analytics:', error);
    }
  }

  // Track search event
  async trackSearch(
    query: string, 
    filters: SearchFilters, 
    resultCount: number,
    searchTime: number
  ): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const event: SearchAnalyticsEvent = {
        type: 'search',
        query,
        filters,
        timestamp: new Date(),
        userId: auth?.currentUser?.uid,
        sessionId: this.session.getSessionId(),
        userAgent: navigator.userAgent,
        language: filters.language || 'es'
      };

      // Track in Firebase
      await this.saveAnalyticsEvent(event, {
        resultCount,
        searchTime,
        hasFilters: Object.keys(filters).some(key => 
          key !== 'contentTypes' && key !== 'language' && filters[key as keyof SearchFilters]
        )
      });

      // Update search count
      this.session.incrementSearchCount();

      // Update popular searches
      await this.updatePopularSearch(query);

      console.log('Search tracked:', { query, resultCount, searchTime });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  // Track result click
  async trackResultClick(
    query: string,
    resultId: string,
    resultTitle: string,
    position: number,
    resultType: string
  ): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const event: SearchAnalyticsEvent = {
        type: 'result_click',
        query,
        resultId,
        position,
        timestamp: new Date(),
        userId: auth?.currentUser?.uid,
        sessionId: this.session.getSessionId(),
        userAgent: navigator.userAgent,
        language: 'es'
      };

      await this.saveAnalyticsEvent(event, {
        resultTitle,
        resultType,
        clickThrough: true
      });

      console.log('Result click tracked:', { resultId, position });
    } catch (error) {
      console.error('Error tracking result click:', error);
    }
  }

  // Track filter application
  async trackFilterApply(
    query: string,
    appliedFilters: Partial<SearchFilters>,
    resultCountBefore: number,
    resultCountAfter: number
  ): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const event: SearchAnalyticsEvent = {
        type: 'filter_apply',
        query,
        filters: appliedFilters as SearchFilters,
        timestamp: new Date(),
        userId: auth?.currentUser?.uid,
        sessionId: this.session.getSessionId(),
        userAgent: navigator.userAgent,
        language: 'es'
      };

      await this.saveAnalyticsEvent(event, {
        resultCountBefore,
        resultCountAfter,
        filterEffectiveness: resultCountAfter / resultCountBefore
      });

      console.log('Filter application tracked:', appliedFilters);
    } catch (error) {
      console.error('Error tracking filter application:', error);
    }
  }

  // Track suggestion click
  async trackSuggestionClick(
    query: string,
    suggestion: string,
    suggestionType: string
  ): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const event: SearchAnalyticsEvent = {
        type: 'suggestion_click',
        query,
        timestamp: new Date(),
        userId: auth?.currentUser?.uid,
        sessionId: this.session.getSessionId(),
        userAgent: navigator.userAgent,
        language: 'es'
      };

      await this.saveAnalyticsEvent(event, {
        suggestion,
        suggestionType
      });

      console.log('Suggestion click tracked:', { suggestion, suggestionType });
    } catch (error) {
      console.error('Error tracking suggestion click:', error);
    }
  }

  // Track voice search
  async trackVoiceSearch(
    originalQuery: string,
    recognizedQuery: string,
    confidence: number
  ): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const event: SearchAnalyticsEvent = {
        type: 'voice_search',
        query: recognizedQuery,
        timestamp: new Date(),
        userId: auth?.currentUser?.uid,
        sessionId: this.session.getSessionId(),
        userAgent: navigator.userAgent,
        language: 'es'
      };

      await this.saveAnalyticsEvent(event, {
        originalQuery,
        confidence,
        voiceEnabled: true
      });

      console.log('Voice search tracked:', { originalQuery, recognizedQuery, confidence });
    } catch (error) {
      console.error('Error tracking voice search:', error);
    }
  }

  // Save analytics event to Firebase
  private async saveAnalyticsEvent(
    event: SearchAnalyticsEvent, 
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    try {
      const analyticsRef = collection(db, 'search_analytics');
      await addDoc(analyticsRef, {
        ...event,
        ...additionalData,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving analytics event:', error);
      // Fallback to local storage for offline support
      this.saveEventLocally(event, additionalData);
    }
  }

  // Fallback local storage for offline analytics
  private saveEventLocally(
    event: SearchAnalyticsEvent, 
    additionalData: Record<string, any>
  ): void {
    try {
      const localEvents = JSON.parse(
        localStorage.getItem('secid_search_analytics_offline') || '[]'
      );
      localEvents.push({ ...event, ...additionalData });
      
      // Keep only last 100 events locally
      if (localEvents.length > 100) {
        localEvents.splice(0, localEvents.length - 100);
      }
      
      localStorage.setItem('secid_search_analytics_offline', JSON.stringify(localEvents));
    } catch (error) {
      console.error('Error saving event locally:', error);
    }
  }

  // Update popular searches
  private async updatePopularSearch(query: string): Promise<void> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      if (normalizedQuery.length < 2) return;

      const popularRef = doc(db, 'search_popular', normalizedQuery);
      const popularDoc = await getDoc(popularRef);

      if (popularDoc.exists()) {
        await updateDoc(popularRef, {
          count: increment(1),
          lastSearched: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(popularRef, {
          query: normalizedQuery,
          count: 1,
          firstSearched: serverTimestamp(),
          lastSearched: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating popular search:', error);
    }
  }

  // Get session analytics
  getSessionAnalytics() {
    return this.session.getSessionData();
  }

  // End current session
  endSession(): void {
    this.session.endSession();
    this.session = new SearchSession();
  }
}

// Search History Manager
export class SearchHistoryManager {
  private static instance: SearchHistoryManager;
  private maxHistoryItems = 50;

  static getInstance(): SearchHistoryManager {
    if (!SearchHistoryManager.instance) {
      SearchHistoryManager.instance = new SearchHistoryManager();
    }
    return SearchHistoryManager.instance;
  }

  // Add search to history
  async addToHistory(
    query: string,
    filters: SearchFilters,
    resultCount: number,
    clickedResults: string[] = []
  ): Promise<void> {
    try {
      const historyItem: SearchHistoryItem = {
        id: crypto.randomUUID(),
        userId: auth?.currentUser?.uid,
        query: query.trim(),
        filters,
        timestamp: new Date(),
        resultCount,
        clickedResults,
        sessionId: SearchAnalytics.getInstance().getSessionAnalytics().sessionId
      };

      // Save to Firebase if user is authenticated
      if (auth.currentUser) {
        await this.saveToFirebase(historyItem);
      }

      // Always save to local storage
      this.saveToLocalStorage(historyItem);

    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  }

  // Get search history
  async getHistory(limit: number = 20): Promise<SearchHistoryItem[]> {
    try {
      // Try to get from Firebase first if user is authenticated
      if (auth.currentUser) {
        const firebaseHistory = await this.getFromFirebase(limit);
        if (firebaseHistory.length > 0) {
          return firebaseHistory;
        }
      }

      // Fallback to local storage
      return this.getFromLocalStorage(limit);
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  // Clear search history
  async clearHistory(): Promise<void> {
    try {
      // Clear from local storage
      localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);

      // Clear from Firebase if user is authenticated
      if (auth.currentUser) {
        const historyRef = collection(db, 'search_history');
        const userHistoryQuery = query(
          historyRef,
          where('userId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(userHistoryQuery);
        
        const deletePromises = snapshot.docs.map(doc => 
          updateDoc(doc['ref'], { deletedAt: serverTimestamp() })
        );
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  // Save to Firebase
  private async saveToFirebase(historyItem: SearchHistoryItem): Promise<void> {
    try {
      const historyRef = collection(db, 'search_history');
      await addDoc(historyRef, {
        ...historyItem,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving to Firebase:', error);
    }
  }

  // Get from Firebase
  private async getFromFirebase(limit: number): Promise<SearchHistoryItem[]> {
    try {
      if (!auth.currentUser) return [];

      const historyRef = collection(db, 'search_history');
      const userHistoryQuery = query(
        historyRef,
        where('userId', '==', auth.currentUser.uid),
        where('deletedAt', '==', null),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(userHistoryQuery);
      return snapshot['docs'].map(doc => {
        const data = doc['data']();
        return {
          ...data,
          id: doc['id'],
          timestamp: data['timestamp']?.toDate() || new Date()
        } as SearchHistoryItem;
      });
    } catch (error) {
      console.error('Error getting from Firebase:', error);
      return [];
    }
  }

  // Save to local storage
  private saveToLocalStorage(historyItem: SearchHistoryItem): void {
    try {
      const history = this.getFromLocalStorage(this.maxHistoryItems - 1);
      
      // Remove duplicate queries
      const filteredHistory = history.filter(item => 
        item.query !== historyItem.query
      );

      const newHistory = [historyItem, ...filteredHistory].slice(0, this.maxHistoryItems);
      
      localStorage.setItem(
        STORAGE_KEYS.RECENT_SEARCHES, 
        JSON.stringify(newHistory.map(item => ({
          ...item,
          timestamp: item.timestamp.toISOString()
        })))
      );
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  // Get from local storage
  private getFromLocalStorage(limit: number): SearchHistoryItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (!stored) return [];

      const history = JSON.parse(stored);
      return history
        .map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting from local storage:', error);
      return [];
    }
  }
}

// Popular Search Manager
export class PopularSearchManager {
  private static instance: PopularSearchManager;

  static getInstance(): PopularSearchManager {
    if (!PopularSearchManager.instance) {
      PopularSearchManager.instance = new PopularSearchManager();
    }
    return PopularSearchManager.instance;
  }

  // Get popular searches
  async getPopularSearches(
    period: 'day' | 'week' | 'month' | 'all' = 'week',
    limit: number = 10
  ): Promise<PopularSearch[]> {
    try {
      const popularRef = collection(db, 'search_popular');
      
      // Calculate date filter based on period
      let dateFilter: Date | null = null;
      if (period !== 'all') {
        const now = new Date();
        switch(period) {
          case 'day':
            dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      let popularQuery = query(
        popularRef,
        orderBy('count', 'desc'),
        limit(limit)
      );

      if(dateFilter) {
        popularQuery = query(
          popularRef,
          where('lastSearched', '>=', Timestamp.fromDate(dateFilter)),
          orderBy('count', 'desc'),
          limit(limit)
        );
      }

      const snapshot = await getDocs(popularQuery);
      
      return snapshot['docs'].map(doc => {
        const data = doc['data']();
        return {
          query: data['query'],
          count: data['count'],
          period,
          trending: this.isTrending(data)
        };
      });
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }

  // Check if a search is trending
  private isTrending(data: any): boolean {
    const now = new Date();
    const lastSearched = data['lastSearched']?.toDate();
    const firstSearched = data['firstSearched']?.toDate();
    
    if (!lastSearched || !firstSearched) return false;
    
    // Consider trending if searched recently and growing in popularity
    const recentlySearched = (now.getTime() - lastSearched.getTime()) < (24 * 60 * 60 * 1000);
    const hasGrowth = data.count > 5; // Minimum threshold
    
    return recentlySearched && hasGrowth;
  }
}

// Search Preferences Manager
export class SearchPreferencesManager {
  private static instance: SearchPreferencesManager;

  static getInstance(): SearchPreferencesManager {
    if (!SearchPreferencesManager.instance) {
      SearchPreferencesManager.instance = new SearchPreferencesManager();
    }
    return SearchPreferencesManager.instance;
  }

  // Save search preferences
  savePreferences(preferences: {
    defaultFilters?: Partial<SearchFilters>;
    defaultSort?: string;
    resultsPerPage?: number;
    viewMode?: string;
    language?: string;
  }): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SEARCH_PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error saving search preferences:', error);
    }
  }

  // Get search preferences
  getPreferences(): any {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_PREFERENCES);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting search preferences:', error);
      return {};
    }
  }

  // Clear preferences
  clearPreferences(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SEARCH_PREFERENCES);
    } catch (error) {
      console.error('Error clearing search preferences:', error);
    }
  }
}

// Export singleton instances
export const searchAnalytics = SearchAnalytics.getInstance();
export const searchHistory = SearchHistoryManager.getInstance();
export const popularSearches = PopularSearchManager.getInstance();
export const searchPreferences = SearchPreferencesManager.getInstance();

// Initialize analytics when module loads
if (typeof window !== 'undefined') {
  searchAnalytics;
}