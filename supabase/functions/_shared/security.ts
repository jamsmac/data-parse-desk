/**
 * Security Headers and Utilities for Supabase Edge Functions
 *
 * Provides:
 * - Secure CORS headers
 * - Content Security Policy (CSP)
 * - Security headers (X-Frame-Options, HSTS, etc.)
 * - Input sanitization helpers
 *
 * Usage:
 * ```typescript
 * import { getSecurityHeaders, validateInput } from '../_shared/security.ts';
 *
 * const headers = getSecurityHeaders(req);
 * return new Response(data, { headers });
 * ```
 */

/**
 * Configuration for allowed origins
 * In production, restrict to your actual domains
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000', // Alternative dev server
  'https://app.dataparsedesk.com', // Production domain
  'https://dataparsedesk.com', // Production domain
  'https://staging.dataparsedesk.com', // Staging domain
];

/**
 * Get allowed origin for CORS based on request
 */
function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get('origin');

  // In development, allow any localhost
  if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    return origin;
  }

  // Check if origin is in allowed list
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  // Default to first allowed origin
  return ALLOWED_ORIGINS[ALLOWED_ORIGINS.length - 1];
}

/**
 * Base CORS headers (for OPTIONS requests)
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(req);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, x-api-key, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Content Security Policy
 * Restricts resource loading to prevent XSS attacks
 */
function getContentSecurityPolicy(): string {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.telegram.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return csp.join('; ');
}

/**
 * Complete security headers for production
 */
export function getSecurityHeaders(req: Request): Record<string, string> {
  const corsHeaders = getCorsHeaders(req);

  return {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': getContentSecurityPolicy(),
  };
}

/**
 * Security headers for streaming responses (SSE)
 */
export function getStreamingHeaders(req: Request): Record<string, string> {
  const corsHeaders = getCorsHeaders(req);

  return {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
}

/**
 * Sanitize input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/['"]/g, '') // Remove quotes
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

/**
 * Rate limiting helper (basic in-memory)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // No record or window expired
  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  // Increment count
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Validate request method
 */
export function validateMethod(req: Request, allowedMethods: string[]): boolean {
  return allowedMethods.includes(req.method);
}

/**
 * Create error response with security headers
 */
export function createErrorResponse(
  req: Request,
  message: string,
  status: number = 500
): Response {
  return new Response(
    JSON.stringify({ error: message, success: false }),
    {
      status,
      headers: getSecurityHeaders(req),
    }
  );
}

/**
 * Create success response with security headers
 */
export function createSuccessResponse(
  req: Request,
  data: any,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({ ...data, success: true }),
    {
      status,
      headers: getSecurityHeaders(req),
    }
  );
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPrelight(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

/**
 * Verify webhook signature (generic HMAC verification)
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSignature === signature;
  } catch {
    return false;
  }
}

/**
 * Example usage in an edge function:
 *
 * ```typescript
 * import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 * import {
 *   handleCorsPrelight,
 *   getSecurityHeaders,
 *   createErrorResponse,
 *   createSuccessResponse,
 *   checkRateLimit,
 * } from '../_shared/security.ts';
 *
 * serve(async (req) => {
 *   // Handle CORS preflight
 *   if (req.method === 'OPTIONS') {
 *     return handleCorsPrelight(req);
 *   }
 *
 *   // Rate limiting
 *   const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
 *   const rateLimit = checkRateLimit(clientIp, 100, 60000);
 *   if (!rateLimit.allowed) {
 *     return createErrorResponse(req, 'Rate limit exceeded', 429);
 *   }
 *
 *   try {
 *     // Your logic here
 *     const data = { message: 'Hello, world!' };
 *     return createSuccessResponse(req, data);
 *   } catch (error) {
 *     return createErrorResponse(req, error.message, 500);
 *   }
 * });
 * ```
 */
