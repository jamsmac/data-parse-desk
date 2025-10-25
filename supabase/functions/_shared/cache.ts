/**
 * Redis Caching Utility for Supabase Edge Functions
 *
 * Provides caching layer using Upstash Redis for performance optimization
 * Documentation: PERFORMANCE_CODE_EXAMPLES.md Section 1
 *
 * Performance Impact:
 * - Cache hit: ~20ms (87% faster than DB query)
 * - Cache miss: ~150ms (DB query + cache write)
 * - Expected hit rate: 70-80%
 */

import { Redis } from 'https://esm.sh/@upstash/redis@1.31.6';

// Initialize Redis client (singleton)
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const redisUrl = Deno.env.get('REDIS_REST_URL');
  const redisToken = Deno.env.get('REDIS_TOKEN');
  const enableCache = Deno.env.get('ENABLE_REDIS_CACHE') === 'true';

  if (!enableCache || !redisUrl || !redisToken) {
    console.warn('Redis caching is disabled or not configured');
    return null;
  }

  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log('✅ Redis client initialized successfully');
    return redisClient;
  } catch (error) {
    console.error('❌ Failed to initialize Redis client:', error);
    return null;
  }
}

/**
 * Cache TTL configuration (seconds)
 */
export const CacheTTL = {
  STATIC: parseInt(Deno.env.get('CACHE_TTL_STATIC') || '3600'), // 1 hour
  DEFAULT: parseInt(Deno.env.get('CACHE_TTL_DEFAULT') || '300'), // 5 minutes
  DYNAMIC: parseInt(Deno.env.get('CACHE_TTL_DYNAMIC') || '60'),  // 1 minute
  SHORT: 30,      // 30 seconds
  LONG: 86400,    // 24 hours
};

/**
 * Cached function wrapper with automatic cache management
 *
 * @example
 * const databases = await cached(
 *   'databases:user:123',
 *   CacheTTL.DEFAULT,
 *   async () => {
 *     const { data } = await supabase.from('databases').select('*');
 *     return data;
 *   }
 * );
 */
export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();

  // If Redis is not available, bypass cache
  if (!redis) {
    return await fetcher();
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key);

    if (cached !== null) {
      console.log(`✅ Cache HIT: ${key}`);
      return cached;
    }

    console.log(`⚠️ Cache MISS: ${key}`);

    // Fetch data
    const data = await fetcher();

    // Store in cache (fire and forget - don't wait)
    redis.setex(key, ttl, JSON.stringify(data)).catch((err) => {
      console.error(`Failed to cache ${key}:`, err);
    });

    return data;
  } catch (error) {
    console.error(`Cache error for ${key}:`, error);
    // Fallback to direct fetch on cache error
    return await fetcher();
  }
}

/**
 * Invalidate cache by key or pattern
 *
 * @example
 * await invalidateCache('databases:user:123');
 * await invalidateCache('databases:*'); // Invalidate all database caches
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    if (keyOrPattern.includes('*')) {
      // Pattern matching - need to use SCAN
      const keys: string[] = [];
      let cursor = 0;

      do {
        const result = await redis.scan(cursor, { match: keyOrPattern, count: 100 });
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== 0);

      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`✅ Invalidated ${keys.length} cache keys matching: ${keyOrPattern}`);
      }
    } else {
      // Single key deletion
      await redis.del(keyOrPattern);
      console.log(`✅ Invalidated cache: ${keyOrPattern}`);
    }
  } catch (error) {
    console.error(`Failed to invalidate cache ${keyOrPattern}:`, error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keys: number;
  memoryUsed: string;
}> {
  const redis = getRedisClient();

  if (!redis) {
    return { connected: false, keys: 0, memoryUsed: '0' };
  }

  try {
    const info = await redis.info('stats');
    const dbsize = await redis.dbsize();

    return {
      connected: true,
      keys: dbsize,
      memoryUsed: info.match(/used_memory_human:(\S+)/)?.[1] || '0',
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { connected: false, keys: 0, memoryUsed: '0' };
  }
}

/**
 * Cache key builders for consistent naming
 */
export const CacheKeys = {
  database: (userId: string, dbId: string) => `db:${userId}:${dbId}`,
  databases: (userId: string) => `dbs:${userId}`,
  tableData: (dbId: string, page: number) => `table:${dbId}:p${page}`,
  tableSchema: (dbId: string) => `schema:${dbId}`,
  analytics: (userId: string, period: string) => `analytics:${userId}:${period}`,
  compositeView: (viewId: string) => `view:${viewId}`,
  compositeViewQuery: (viewId: string, filters: string) => `view:${viewId}:q:${filters}`,
};

/**
 * Batch cache operations
 */
export async function batchInvalidate(keys: string[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
    console.log(`✅ Batch invalidated ${keys.length} cache keys`);
  } catch (error) {
    console.error('Batch invalidation failed:', error);
  }
}

/**
 * Cache warming - preload frequently accessed data
 */
export async function warmCache<T>(
  key: string,
  ttl: number,
  data: T
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    console.log(`✅ Cache warmed: ${key}`);
  } catch (error) {
    console.error(`Failed to warm cache ${key}:`, error);
  }
}
