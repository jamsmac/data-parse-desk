import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  rateLimiter,
  RateLimitConfigs,
  checkSupabaseRateLimit,
  rateLimitedSupabaseCall,
  IPRateLimiter,
  createRateLimitMiddleware,
  useRateLimit,
} from '../rateLimit';

describe('RateLimiter', () => {
  beforeEach(() => {
    // Clear the store before each test
    rateLimiter.destroy();
  });

  describe('shouldLimit', () => {
    it('should allow requests within limit', () => {
      const config = { maxRequests: 5, windowMs: 60000 };

      expect(rateLimiter.shouldLimit(config)).toBe(false); // 1st request
      expect(rateLimiter.shouldLimit(config)).toBe(false); // 2nd request
      expect(rateLimiter.shouldLimit(config)).toBe(false); // 3rd request
    });

    it('should block requests exceeding limit', () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      expect(rateLimiter.shouldLimit(config)).toBe(false); // 1st - allowed
      expect(rateLimiter.shouldLimit(config)).toBe(false); // 2nd - allowed
      expect(rateLimiter.shouldLimit(config)).toBe(true);  // 3rd - blocked
      expect(rateLimiter.shouldLimit(config)).toBe(true);  // 4th - blocked
    });

    it('should use identifier to separate limits', () => {
      const config1 = { maxRequests: 2, windowMs: 60000, identifier: 'user-1' };
      const config2 = { maxRequests: 2, windowMs: 60000, identifier: 'user-2' };

      // User 1
      expect(rateLimiter.shouldLimit(config1)).toBe(false); // 1st
      expect(rateLimiter.shouldLimit(config1)).toBe(false); // 2nd
      expect(rateLimiter.shouldLimit(config1)).toBe(true);  // 3rd - blocked

      // User 2 should have separate limit
      expect(rateLimiter.shouldLimit(config2)).toBe(false); // 1st
      expect(rateLimiter.shouldLimit(config2)).toBe(false); // 2nd
      expect(rateLimiter.shouldLimit(config2)).toBe(true);  // 3rd - blocked
    });

    it('should reset limit after time window expires', async () => {
      const config = { maxRequests: 2, windowMs: 100 }; // 100ms window

      expect(rateLimiter.shouldLimit(config)).toBe(false);
      expect(rateLimiter.shouldLimit(config)).toBe(false);
      expect(rateLimiter.shouldLimit(config)).toBe(true); // Exceeded

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow again
      expect(rateLimiter.shouldLimit(config)).toBe(false);
    });

    it('should use global identifier by default', () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      expect(rateLimiter.shouldLimit(config)).toBe(false);
      expect(rateLimiter.shouldLimit(config)).toBe(false);
      expect(rateLimiter.shouldLimit(config)).toBe(true);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return max requests when no requests made', () => {
      const config = { maxRequests: 10, windowMs: 60000 };

      expect(rateLimiter.getRemainingRequests(config)).toBe(10);
    });

    it('should decrease remaining requests', () => {
      const config = { maxRequests: 5, windowMs: 60000 };

      expect(rateLimiter.getRemainingRequests(config)).toBe(5);
      rateLimiter.shouldLimit(config); // 1st request
      expect(rateLimiter.getRemainingRequests(config)).toBe(4);
      rateLimiter.shouldLimit(config); // 2nd request
      expect(rateLimiter.getRemainingRequests(config)).toBe(3);
    });

    it('should return 0 when limit exceeded', () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      rateLimiter.shouldLimit(config); // 1st
      rateLimiter.shouldLimit(config); // 2nd
      rateLimiter.shouldLimit(config); // 3rd - exceeded

      expect(rateLimiter.getRemainingRequests(config)).toBe(0);
    });

    it('should handle different identifiers', () => {
      const config1 = { maxRequests: 5, windowMs: 60000, identifier: 'user-1' };
      const config2 = { maxRequests: 5, windowMs: 60000, identifier: 'user-2' };

      rateLimiter.shouldLimit(config1);
      rateLimiter.shouldLimit(config1);

      expect(rateLimiter.getRemainingRequests(config1)).toBe(3);
      expect(rateLimiter.getRemainingRequests(config2)).toBe(5); // Separate limit
    });
  });

  describe('getResetTime', () => {
    it('should return 0 for non-existent identifier', () => {
      expect(rateLimiter.getResetTime('unknown')).toBe(0);
    });

    it('should return positive reset time for active limit', () => {
      const config = { maxRequests: 5, windowMs: 60000, identifier: 'user-1' };

      rateLimiter.shouldLimit(config);

      const resetTime = rateLimiter.getResetTime('user-1');
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60000);
    });

    it('should use global identifier by default', () => {
      const config = { maxRequests: 5, windowMs: 60000 };

      rateLimiter.shouldLimit(config);

      const resetTime = rateLimiter.getResetTime();
      expect(resetTime).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const config = { maxRequests: 2, windowMs: 100, identifier: 'user-1' };

      rateLimiter.shouldLimit(config);
      expect(rateLimiter.getResetTime('user-1')).toBeGreaterThan(0);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger cleanup by calling shouldLimit with expired config
      rateLimiter.shouldLimit(config);

      // Reset time should be positive again (new window)
      expect(rateLimiter.getResetTime('user-1')).toBeGreaterThan(0);
    });
  });
});

describe('RateLimitConfigs', () => {
  it('should have login config', () => {
    expect(RateLimitConfigs.login).toBeDefined();
    expect(RateLimitConfigs.login.maxRequests).toBe(5);
    expect(RateLimitConfigs.login.windowMs).toBe(15 * 60 * 1000);
  });

  it('should have register config', () => {
    expect(RateLimitConfigs.register).toBeDefined();
    expect(RateLimitConfigs.register.maxRequests).toBe(3);
  });

  it('should have database operation configs', () => {
    expect(RateLimitConfigs.createDatabase).toBeDefined();
    expect(RateLimitConfigs.updateDatabase).toBeDefined();
    expect(RateLimitConfigs.deleteDatabase).toBeDefined();
  });

  it('should have data operation configs', () => {
    expect(RateLimitConfigs.insertData).toBeDefined();
    expect(RateLimitConfigs.bulkOperations).toBeDefined();
  });

  it('should have file operation configs', () => {
    expect(RateLimitConfigs.fileUpload).toBeDefined();
    expect(RateLimitConfigs.fileDownload).toBeDefined();
  });

  it('should have default config', () => {
    expect(RateLimitConfigs.default).toBeDefined();
    expect(RateLimitConfigs.default.maxRequests).toBe(60);
  });
});

describe('checkSupabaseRateLimit', () => {
  beforeEach(() => {
    rateLimiter.destroy();
  });

  it('should return allowed true when within limit', async () => {
    const result = await checkSupabaseRateLimit('createDatabase', 'user-123');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // createDatabase max is 10, after 1 request = 9
    expect(result.resetTime).toBeGreaterThan(0);
  });

  it('should return allowed false when exceeding limit', async () => {
    const config = RateLimitConfigs.createDatabase; // max 10 requests

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await checkSupabaseRateLimit('createDatabase', 'user-123');
    }

    // 11th request should be blocked
    const result = await checkSupabaseRateLimit('createDatabase', 'user-123');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should use anonymous identifier when userId is undefined', async () => {
    const result1 = await checkSupabaseRateLimit('login');
    const result2 = await checkSupabaseRateLimit('login');

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3); // 5 max - 2 used = 3
  });

  it('should use default config for unknown operations', async () => {
    const result = await checkSupabaseRateLimit('unknownOp' as any);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59); // default max is 60, after 1 request = 59
  });
});

describe('rateLimitedSupabaseCall', () => {
  beforeEach(() => {
    rateLimiter.destroy();
  });

  it('should execute function when within limit', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await rateLimitedSupabaseCall('createDatabase', 'user-123', mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should throw error when limit exceeded', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    // Exhaust the limit (10 for createDatabase)
    for (let i = 0; i < 10; i++) {
      await rateLimitedSupabaseCall('createDatabase', 'user-123', mockFn);
    }

    // 11th call should throw
    await expect(
      rateLimitedSupabaseCall('createDatabase', 'user-123', mockFn)
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('should throw error with RATE_LIMIT_EXCEEDED code', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    // Exhaust limit
    for (let i = 0; i < 10; i++) {
      await rateLimitedSupabaseCall('createDatabase', 'user-123', mockFn);
    }

    try {
      await rateLimitedSupabaseCall('createDatabase', 'user-123', mockFn);
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.remaining).toBeDefined();
      expect(error.resetTime).toBeDefined();
    }
  });

  it('should count failed requests against limit', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('DB error'));

    // Make request that fails
    await expect(
      rateLimitedSupabaseCall('createDatabase', 'user-123', mockFn)
    ).rejects.toThrow('DB error');

    // Check that it counted against limit (1 from failed call + 1 from checkSupabaseRateLimit = 2 total)
    const result = await checkSupabaseRateLimit('createDatabase', 'user-123');
    expect(result.remaining).toBe(8); // 10 max - 2 used = 8
  });

  it('should work with async functions', async () => {
    const mockFn = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'async-result';
    });

    const result = await rateLimitedSupabaseCall('createDatabase', 'user-123', mockFn);

    expect(result).toBe('async-result');
  });
});

describe('IPRateLimiter', () => {
  let ipLimiter: IPRateLimiter;

  beforeEach(() => {
    ipLimiter = new IPRateLimiter();
  });

  it('should allow requests within limit', () => {
    expect(ipLimiter.shouldLimit('192.168.1.1', 3, 60000)).toBe(false);
    expect(ipLimiter.shouldLimit('192.168.1.1', 3, 60000)).toBe(false);
    expect(ipLimiter.shouldLimit('192.168.1.1', 3, 60000)).toBe(false);
  });

  it('should block requests exceeding limit', () => {
    ipLimiter.shouldLimit('192.168.1.1', 2, 60000);
    ipLimiter.shouldLimit('192.168.1.1', 2, 60000);

    expect(ipLimiter.shouldLimit('192.168.1.1', 2, 60000)).toBe(true);
  });

  it('should separate limits by IP', () => {
    ipLimiter.shouldLimit('192.168.1.1', 2, 60000);
    ipLimiter.shouldLimit('192.168.1.1', 2, 60000);

    expect(ipLimiter.shouldLimit('192.168.1.1', 2, 60000)).toBe(true);
    expect(ipLimiter.shouldLimit('192.168.1.2', 2, 60000)).toBe(false); // Different IP
  });

  it('should use default values', () => {
    for (let i = 0; i < 100; i++) {
      ipLimiter.shouldLimit('192.168.1.1');
    }

    expect(ipLimiter.shouldLimit('192.168.1.1')).toBe(true); // Exceeds default 100
  });

  it('should cleanup expired entries', async () => {
    ipLimiter.shouldLimit('192.168.1.1', 2, 100);
    ipLimiter.shouldLimit('192.168.1.1', 2, 100);

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 150));

    ipLimiter.cleanup();

    // Should allow again
    expect(ipLimiter.shouldLimit('192.168.1.1', 2, 100)).toBe(false);
  });
});

describe('createRateLimitMiddleware', () => {
  beforeEach(() => {
    rateLimiter.destroy();
  });

  it('should call next() when within limit', async () => {
    const config = { maxRequests: 5, windowMs: 60000 };
    const middleware = createRateLimitMiddleware(config);

    const req = { ip: '192.168.1.1' };
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4); // 5 - 1 = 4
  });

  it('should return 429 when limit exceeded', async () => {
    const config = { maxRequests: 2, windowMs: 60000 };
    const middleware = createRateLimitMiddleware(config);

    const req = { ip: '192.168.1.1' };
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    // Make 2 requests
    await middleware(req, res, next);
    await middleware(req, res, next);

    // 3rd request should be blocked
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Too many requests',
      })
    );
    expect(next).toHaveBeenCalledTimes(2); // Only first 2 requests
  });

  it('should set rate limit headers on 429 response', async () => {
    const config = { maxRequests: 1, windowMs: 60000 };
    const middleware = createRateLimitMiddleware(config);

    const req = { ip: '192.168.1.1' };
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await middleware(req, res, next);
    await middleware(req, res, next); // Exceeds limit

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 1);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('should use custom identifier if provided', async () => {
    const config = { maxRequests: 2, windowMs: 60000, identifier: 'custom-id' };
    const middleware = createRateLimitMiddleware(config);

    const req1 = { ip: '192.168.1.1' };
    const req2 = { ip: '192.168.1.2' }; // Different IP
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await middleware(req1, res, next);
    await middleware(req1, res, next);

    // Both requests use same custom identifier, so limit is shared
    await middleware(req2, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
  });
});

describe('useRateLimit', () => {
  beforeEach(() => {
    rateLimiter.destroy();
  });

  it('should return checkLimit function', () => {
    const { checkLimit } = useRateLimit('createDatabase');

    expect(typeof checkLimit).toBe('function');
    expect(checkLimit()).toBe(true); // First request allowed
  });

  it('should return getRemainingRequests function', () => {
    const { getRemainingRequests } = useRateLimit('createDatabase');

    expect(getRemainingRequests()).toBe(10); // createDatabase max
  });

  it('should return getResetTime function', () => {
    const { getResetTime, checkLimit } = useRateLimit('createDatabase');

    checkLimit(); // Make a request

    expect(getResetTime()).toBeGreaterThan(0);
  });

  it('should use default config for unknown operation', () => {
    const { getRemainingRequests } = useRateLimit('unknownOp' as any);

    expect(getRemainingRequests()).toBe(60); // default max
  });

  it('should respect identifiers', () => {
    const { checkLimit } = useRateLimit('createDatabase');

    for (let i = 0; i < 10; i++) {
      checkLimit('user-1');
    }

    expect(checkLimit('user-1')).toBe(false); // Exceeded for user-1
    expect(checkLimit('user-2')).toBe(true);  // Still allowed for user-2
  });
});
