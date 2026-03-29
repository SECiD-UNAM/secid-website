import { getRedisClient, RedisClient } from './redis-client';

/**
 * Cache Manager
 * High-level caching interface with common patterns and strategies
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  usePrefix?: boolean;
  tags?: string[];
  serialize?: boolean;
  compress?: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage?: string;
}

class CacheManager {
  private client: RedisClient;
  private prefix: string;
  private defaultTTL: number;
  private stats: CacheStats;

  constructor(
    options: {
      prefix?: string;
      defaultTTL?: number;
      redisConfig?: any;
    } = {}
  ) {
    this.client = getRedisClient(options.redisConfig);
    this.prefix = options.prefix || 'secid:cache:';
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour default
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  private getKey(key: string, usePrefix = true): string {
    return usePrefix ? `${this.prefix}${key}` : key;
  }

  private updateStats(operation: 'hit' | 'miss' | 'set' | 'delete'): void {
    this.stats[
      operation === 'hit'
        ? 'hits'
        : operation === 'miss'
          ? 'misses'
          : operation + 's'
    ]++;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const cacheKey = this.getKey(key, options.usePrefix !== false);
      const ttl = options.ttl || this.defaultTTL;

      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        tags: options.tags,
      };

      const serializedValue =
        options.serialize !== false ? JSON.stringify(entry) : String(value);

      const result = await this.client.set(cacheKey, serializedValue, {
        EX: ttl,
      });

      // Store tags for cache invalidation
      if (options.tags) {
        await this.addToTags(options.tags, cacheKey);
      }

      this.updateStats('set');
      return result === 'OK';
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const cacheKey = this.getKey(key, options.usePrefix !== false);
      const value = await this.client.get(cacheKey);

      if (value === null) {
        this.updateStats('miss');
        return null;
      }

      this.updateStats('hit');

      if (options.serialize !== false) {
        try {
          const entry: CacheEntry<T> = JSON.parse(value);
          return entry.data;
        } catch (parseError) {
          console.error('Cache parse error:', parseError);
          await this.delete(key, options);
          return null;
        }
      }

      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      this.updateStats('miss');
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const cacheKey = this.getKey(key, options.usePrefix !== false);
      const result = await this.client.del(cacheKey);
      this.updateStats('delete');
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const cacheKey = this.getKey(key, options.usePrefix !== false);
      const result = await this.client.exists(cacheKey);
      return result > 0;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Generate new value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Set multiple values
   */
  async setMany<T>(
    items: Array<{ key: string; value: T; options?: CacheOptions }>,
    globalOptions: CacheOptions = {}
  ): Promise<boolean[]> {
    const promises = items.map((item) =>
      this.set(item.key, item.value, { ...globalOptions, ...item.options })
    );
    return Promise.all(promises);
  }

  /**
   * Get multiple values
   */
  async getMany<T>(
    keys: string[],
    options: CacheOptions = {}
  ): Promise<Record<string, T | null>> {
    const promises = keys.map(async (key) => ({
      key,
      value: await this.get<T>(key, options),
    }));

    const results = await Promise.all(promises);
    return results.reduce(
      (acc, { key, value }) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, T | null>
    );
  }

  /**
   * Delete by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(this.getKey(pattern));
      if (keys.length === 0) return 0;

      return await this.client.del(keys);
    } catch (error) {
      console.error('Cache delete by pattern error:', error);
      return 0;
    }
  }

  /**
   * Tag-based cache invalidation
   */
  private async addToTags(tags: string[], cacheKey: string): Promise<void> {
    const tagPromises = tags.map((tag) =>
      this.client.sadd(`${this.prefix}tag:${tag}`, cacheKey)
    );
    await Promise.all(tagPromises);
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const tagKey = `${this.prefix}tag:${tag}`;
        const cacheKeys = await this.client.smembers(tagKey);

        if (cacheKeys.length > 0) {
          totalDeleted += await this.client.del(cacheKeys);
          await this.client.del(tagKey);
        }
      }

      return totalDeleted;
    } catch (error) {
      console.error('Cache invalidate by tags error:', error);
      return 0;
    }
  }

  /**
   * Cache warming - preload data
   */
  async warm<T>(
    items: Array<{
      key: string;
      factory: () => Promise<T> | T;
      options?: CacheOptions;
    }>
  ): Promise<void> {
    const promises = items.map(async (item) => {
      const exists = await this.exists(item.key, item.options);
      if (!exists) {
        const value = await item.factory();
        await this.set(item.key, value, item.options);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * Get detailed cache info
   */
  async getInfo(): Promise<{
    stats: CacheStats;
    memory: string;
    keyCount: number;
    isHealthy: boolean;
  }> {
    const stats = this.getStats();
    const memory = await this.client.getMemoryUsage();
    const keys = await this.client.keys(`${this.prefix}*`);
    const isHealthy = await this.client.isHealthy();

    return {
      stats,
      memory,
      keyCount: keys.length,
      isHealthy,
    };
  }

  /**
   * Clear all cache with prefix
   */
  async clear(): Promise<number> {
    return this.deleteByPattern('*');
  }

  /**
   * Set TTL for existing key
   */
  async expire(
    key: string,
    ttl: number,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const cacheKey = this.getKey(key, options.usePrefix !== false);
      return await this.client.expire(cacheKey, ttl);
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async getTTL(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const cacheKey = this.getKey(key, options.usePrefix !== false);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }
}

// Predefined cache instances for different use cases
export class JobsCacheManager extends CacheManager {
  constructor() {
    super({
      prefix: 'secid:jobs:',
      defaultTTL: 1800, // 30 minutes
    });
  }

  async cacheJobList(filters: any, jobs: any[]): Promise<boolean> {
    const key = `list:${JSON.stringify(filters)}`;
    return this.set(key, jobs, { ttl: 900, tags: ['jobs', 'job-list'] }); // 15 minutes
  }

  async getCachedJobList(filters: any): Promise<any[] | null> {
    const key = `list:${JSON.stringify(filters)}`;
    return this.get(key);
  }

  async invalidateJobCache(jobId?: string): Promise<void> {
    if (jobId) {
      await this.delete(`job:${jobId}`);
    }
    await this.invalidateByTags(['jobs', 'job-list']);
  }
}

export class UsersCacheManager extends CacheManager {
  constructor() {
    super({
      prefix: 'secid:users:',
      defaultTTL: 3600, // 1 hour
    });
  }

  async cacheUserProfile(userId: string, profile: any): Promise<boolean> {
    return this.set(`profile:${userId}`, profile, {
      ttl: 1800,
      tags: ['users', `user:${userId}`],
    });
  }

  async getCachedUserProfile(userId: string): Promise<any | null> {
    return this.get(`profile:${userId}`);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidateByTags([`user:${userId}`]);
  }
}

export class EventsCacheManager extends CacheManager {
  constructor() {
    super({
      prefix: 'secid:events:',
      defaultTTL: 2700, // 45 minutes
    });
  }

  async cacheEventsList(filters: any, events: any[]): Promise<boolean> {
    const key = `list:${JSON.stringify(filters)}`;
    return this.set(key, events, { ttl: 900, tags: ['events', 'events-list'] });
  }

  async invalidateEventsCache(): Promise<void> {
    await this.invalidateByTags(['events', 'events-list']);
  }
}

export class SearchCacheManager extends CacheManager {
  constructor() {
    super({
      prefix: 'secid:search:',
      defaultTTL: 1200, // 20 minutes
    });
  }

  async cacheSearchResults(
    query: string,
    type: string,
    results: any
  ): Promise<boolean> {
    const key = `${type}:${Buffer.from(query).toString('base64')}`;
    return this.set(key, results, {
      ttl: 600,
      tags: ['search', `search:${type}`],
    }); // 10 minutes
  }

  async getCachedSearchResults(
    query: string,
    type: string
  ): Promise<any | null> {
    const key = `${type}:${Buffer.from(query).toString('base64')}`;
    return this.get(key);
  }
}

// Factory function to create cache managers
export function createCacheManager(
  type: 'jobs' | 'users' | 'events' | 'search' | 'general',
  options?: any
): CacheManager {
  switch (type) {
    case 'jobs':
      return new JobsCacheManager();
    case 'users':
      return new UsersCacheManager();
    case 'events':
      return new EventsCacheManager();
    case 'search':
      return new SearchCacheManager();
    default:
      return new CacheManager(options);
  }
}

// Singleton instances
const cacheManagers = {
  general: new CacheManager(),
  jobs: new JobsCacheManager(),
  users: new UsersCacheManager(),
  events: new EventsCacheManager(),
  search: new SearchCacheManager(),
};

export function getCacheManager(
  type: keyof typeof cacheManagers = 'general'
): CacheManager {
  return cacheManagers[type];
}

export { CacheManager };
export default CacheManager;
