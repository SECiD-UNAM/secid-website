import { createClient } from 'redis';

import type { RedisClientType } from 'redis';

/**
 * Redis Client Configuration and Setup
 * Handles Redis connection, configuration, and basic operations
 */

interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  retryStrategy?: (times: number) => number | null;
  connectTimeout?: number;
  lazyConnect?: boolean;
}

class RedisClient {
  private client: RedisClientType | null = null;
  private config: RedisConfig;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;

  constructor(config: RedisConfig = {}) {
    this.config = {
      url: process.env.REDIS_URL as string,
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt((process.env.REDIS_PORT as string) || '6379'),
      password: process.env.REDIS_PASSWORD as string,
      db: parseInt(process.env['REDIS_DB'] || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
      ...config,
    };

    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const clientConfig: any = {};

      if (this.config.url) {
        clientConfig.url = this.config.url;
      } else {
        clientConfig.socket = {
          host: this.config.host,
          port: this.config.port,
          connectTimeout: this.config.connectTimeout,
          reconnectStrategy: (retries: number) => {
            if (retries >= this.maxConnectionAttempts) {
              console.error(
                `Redis connection failed after ${retries} attempts`
              );
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        };
      }

      if (this.config.password) {
        clientConfig.password = this.config.password;
      }

      if (this.config.db) {
        clientConfig.database = this.config.db;
      }

      this.client = createClient(clientConfig);

      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    this.client.on('ready', () => {
      console.log('Redis client ready');
    });

    this.client.on('error', (error) => {
      console.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.connectionAttempts++;
      console.log(
        `Redis client reconnecting (attempt ${this.connectionAttempts})`
      );
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected || !this.client) {
      return;
    }

    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.disconnect();
      this.isConnected = false;
    } catch (error) {
      console.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }

  async ping(): Promise<string> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.ping();
  }

  async set(
    key: string,
    value: string | number | Buffer,
    options?: {
      EX?: number; // Expire time in seconds
      PX?: number; // Expire time in milliseconds
      NX?: boolean; // Only set if key doesn't exist
      XX?: boolean; // Only set if key exists
    }
  ): Promise<string | null> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');

    const setOptions: any = {};
    if (options?.EX) setOptions.EX = options.EX;
    if (options?.PX) setOptions.PX = options.PX;
    if (options?.NX) setOptions.NX = true;
    if (options?.XX) setOptions.XX = true;

    return await this.client.set(key, value.toString(), setOptions);
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.get(key);
  }

  async del(key: string | string[]): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.exists(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return (await this.client.expire(key, seconds)) === 1;
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.keys(pattern);
  }

  async flushdb(): Promise<string> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.flushDb();
  }

  // Hash operations
  async hset(
    key: string,
    field: string,
    value: string | number
  ): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.hSet(key, field, value.toString());
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.hGet(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.hGetAll(key);
  }

  async hdel(key: string, field: string | string[]): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.hDel(key, field);
  }

  // Set operations
  async sadd(key: string, member: string | string[]): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.sAdd(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.sMembers(key);
  }

  async srem(key: string, member: string | string[]): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.sRem(key, member);
  }

  // List operations
  async lpush(key: string, element: string | string[]): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.lPush(key, element);
  }

  async rpush(key: string, element: string | string[]): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.rPush(key, element);
  }

  async lpop(key: string): Promise<string | null> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.lPop(key);
  }

  async rpop(key: string): Promise<string | null> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.rPop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.lRange(key, start, stop);
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.zAdd(key, { score, value: member });
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: {
      withScores?: boolean;
      reverse?: boolean;
    }
  ): Promise<string[] | Array<{ value: string; score: number }>> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');

    if (options?.withScores) {
      return await this.client.zRangeWithScores(key, start, stop, {
        REV: options.reverse,
      });
    }

    return await this.client.zRange(key, start, stop, {
      REV: options?.reverse,
    });
  }

  async zrem(key: string, member: string | string[]): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.zRem(key, member);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');

    const subscriber = this.client.duplicate();
    await subscriber.connect();

    await subscriber.subscribe(channel, (message, channel) => {
      callback(message, channel);
    });
  }

  // Utility methods
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async getInfo(): Promise<string> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.info();
  }

  async getMemoryUsage(): Promise<string> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.info('memory');
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected && this.client) {
      await this.connect();
    }
  }

  // Transaction support
  async multi(): Promise<any> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return this.client.multi();
  }

  // Script execution
  async eval(script: string, keys: string[], args: string[]): Promise<any> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Redis client not initialized');
    return await this.client.eval(script, {
      keys,
      arguments: args,
    });
  }
}

// Singleton instance
let redisClient: RedisClient | null = null;

export function getRedisClient(config?: RedisConfig): RedisClient {
  if (!redisClient) {
    redisClient = new RedisClient(config);
  }
  return redisClient;
}

export async function initializeRedis(
  config?: RedisConfig
): Promise<RedisClient> {
  const client = getRedisClient(config);
  await client.connect();
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
  }
}

export { RedisClient };
export default getRedisClient;
