/**
 * Rate Limiting Implementation for API Protection
 * Prevents abuse and ensures fair usage of resources
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be rate limited
   */
  shouldLimit(config: RateLimitConfig): boolean {
    const key = config.identifier || 'global';
    const now = Date.now();

    // Get or create rate limit entry
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    const limit = this.store[key];

    // Increment counter
    limit.count++;

    // Check if limit exceeded
    if (limit.count > config.maxRequests) {
      return true; // Request should be limited
    }

    return false; // Request allowed
  }

  /**
   * Get remaining requests for a given identifier
   */
  getRemainingRequests(config: RateLimitConfig): number {
    const key = config.identifier || 'global';
    const limit = this.store[key];

    if (!limit) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - limit.count);
  }

  /**
   * Get time until rate limit resets
   */
  getResetTime(identifier: string = 'global'): number {
    const limit = this.store[identifier];
    if (!limit) {
      return 0;
    }
    return Math.max(0, limit.resetTime - Date.now());
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  /**
   * Destroy rate limiter and clean up
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store = {};
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different endpoints
 */
export const RateLimitConfigs = {
  // Authentication endpoints - strict limits
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  register: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // Database operations - moderate limits
  createDatabase: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  updateDatabase: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  deleteDatabase: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },

  // Data operations - higher limits
  queryData: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  insertData: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  },
  bulkOperations: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },

  // File operations - strict limits
  fileUpload: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  fileDownload: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },

  // General API - default limit
  default: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
};

/**
 * Rate limit decorator for functions
 */
export function rateLimit(config: RateLimitConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (rateLimiter.shouldLimit(config)) {
        const resetTime = rateLimiter.getResetTime(config.identifier);
        const error = new Error(`Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds.`);
        (error as any).status = 429;
        (error as any).resetTime = resetTime;
        throw error;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Express-style middleware for rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: any, res: any, next: any) => {
    const identifier = config.identifier || req.ip || 'global';
    const limitConfig = { ...config, identifier };

    if (rateLimiter.shouldLimit(limitConfig)) {
      const resetTime = rateLimiter.getResetTime(identifier);
      const remaining = rateLimiter.getRemainingRequests(limitConfig);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + resetTime).toISOString());
      res.setHeader('Retry-After', Math.ceil(resetTime / 1000));

      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(resetTime / 1000)} seconds.`,
        retryAfter: Math.ceil(resetTime / 1000),
      });
    }

    // Add rate limit headers for successful requests
    const remaining = rateLimiter.getRemainingRequests(limitConfig);
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    next();
  };
}

/**
 * React hook for client-side rate limiting
 */
export function useRateLimit(operation: keyof typeof RateLimitConfigs) {
  const config = RateLimitConfigs[operation] || RateLimitConfigs.default;

  const checkLimit = (identifier?: string) => {
    const limitConfig = { ...config, identifier: identifier || 'global' };
    return !rateLimiter.shouldLimit(limitConfig);
  };

  const getRemainingRequests = (identifier?: string) => {
    const limitConfig = { ...config, identifier: identifier || 'global' };
    return rateLimiter.getRemainingRequests(limitConfig);
  };

  const getResetTime = (identifier?: string) => {
    return rateLimiter.getResetTime(identifier || 'global');
  };

  return {
    checkLimit,
    getRemainingRequests,
    getResetTime,
  };
}

/**
 * Supabase integration for rate limiting
 */
export async function checkSupabaseRateLimit(
  operation: keyof typeof RateLimitConfigs,
  userId?: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const config = RateLimitConfigs[operation] || RateLimitConfigs.default;
  const identifier = userId || 'anonymous';
  const limitConfig = { ...config, identifier };

  const allowed = !rateLimiter.shouldLimit(limitConfig);
  const remaining = rateLimiter.getRemainingRequests(limitConfig);
  const resetTime = rateLimiter.getResetTime(identifier);

  return {
    allowed,
    remaining,
    resetTime,
  };
}

/**
 * Wrapper for Supabase calls with rate limiting
 */
export async function rateLimitedSupabaseCall<T>(
  operation: keyof typeof RateLimitConfigs,
  userId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const { allowed, remaining, resetTime } = await checkSupabaseRateLimit(operation, userId);

  if (!allowed) {
    const error = new Error(
      `Rate limit exceeded for ${operation}. ${remaining} requests remaining. Resets in ${Math.ceil(
        resetTime / 1000
      )} seconds.`
    );
    (error as any).code = 'RATE_LIMIT_EXCEEDED';
    (error as any).remaining = remaining;
    (error as any).resetTime = resetTime;
    throw error;
  }

  // Execute the function
  // Note: If the request fails, it still counts against the rate limit
  return await fn();
}

/**
 * IP-based rate limiting for anonymous users
 */
export class IPRateLimiter {
  private ipStore: Map<string, { count: number; resetTime: number }> = new Map();

  shouldLimit(ip: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const limit = this.ipStore.get(ip);

    if (!limit || limit.resetTime < now) {
      this.ipStore.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return false;
    }

    limit.count++;

    if (limit.count > maxRequests) {
      return true;
    }

    return false;
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, limit] of this.ipStore.entries()) {
      if (limit.resetTime < now) {
        this.ipStore.delete(ip);
      }
    }
  }
}

// Export the global rate limiter instance for direct access if needed
export { rateLimiter };