/**
 * API Key Authentication Middleware
 *
 * Secure API key verification using encryption and hashing.
 * Integrates with migration 20251027000004_encrypt_api_keys.sql
 *
 * Usage:
 * ```typescript
 * import { verifyApiKey, checkApiKeyPermissions } from '../_shared/apiKeyAuth.ts';
 *
 * const apiKey = req.headers.get('x-api-key');
 * const keyData = await verifyApiKey(supabase, apiKey);
 *
 * if (!checkApiKeyPermissions(keyData, 'databases', 'write')) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

export interface ApiKeyData {
  key_id: string;
  user_id: string;
  key_name: string;
  permissions: {
    databases?: { read?: boolean; write?: boolean; delete?: boolean };
    rows?: { read?: boolean; write?: boolean; delete?: boolean };
    projects?: { read?: boolean; write?: boolean; delete?: boolean };
    [key: string]: any;
  };
  rate_limit: number;
  is_active: boolean;
  is_expired: boolean;
  last_used: string | null;
}

export interface ApiKeyPermissions {
  read?: boolean;
  write?: boolean;
  delete?: boolean;
}

/**
 * Verify API key and return metadata
 *
 * @param supabase - Supabase client (service_role)
 * @param apiKey - API key from request header
 * @returns API key metadata or throws error
 */
export async function verifyApiKey(
  supabase: SupabaseClient,
  apiKey: string | null
): Promise<ApiKeyData> {
  // Validate input
  if (!apiKey) {
    throw new Error('API key is required. Provide via x-api-key header.');
  }

  if (apiKey.length < 10 || !apiKey.startsWith('dpd_')) {
    throw new Error('Invalid API key format. Expected format: dpd_...');
  }

  try {
    // Call verify_api_key function from database
    const { data, error } = await supabase.rpc('verify_api_key', {
      p_api_key: apiKey,
    });

    if (error) {
      console.error('API key verification error:', error);
      throw new Error(`API key verification failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Invalid or expired API key');
    }

    const keyData = data[0] as ApiKeyData;

    // Additional checks
    if (!keyData.is_active) {
      throw new Error('API key is inactive');
    }

    if (keyData.is_expired) {
      throw new Error('API key has expired');
    }

    return keyData;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('API key verification failed');
  }
}

/**
 * Check if API key has specific permission
 *
 * @param keyData - API key metadata from verifyApiKey
 * @param resource - Resource type (e.g., 'databases', 'rows')
 * @param action - Action type ('read', 'write', 'delete')
 * @returns true if permission granted
 */
export function checkApiKeyPermissions(
  keyData: ApiKeyData,
  resource: string,
  action: 'read' | 'write' | 'delete'
): boolean {
  const resourcePermissions = keyData.permissions[resource] as ApiKeyPermissions | undefined;

  if (!resourcePermissions) {
    return false;
  }

  return resourcePermissions[action] === true;
}

/**
 * Rate limit check for API key
 *
 * Uses in-memory Map for simple rate limiting.
 * For production, consider Redis or Upstash.
 *
 * @param keyId - API key ID
 * @param rateLimit - Requests per hour limit
 * @returns { allowed: boolean, remaining: number, resetAt: Date }
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  keyId: string,
  rateLimit: number
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const record = rateLimitMap.get(keyId);

  // No record or window expired
  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    rateLimitMap.set(keyId, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: rateLimit - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Check if limit exceeded
  if (record.count >= rateLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt),
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: rateLimit - record.count,
    resetAt: new Date(record.resetAt),
  };
}

/**
 * Clean up expired rate limit records
 * Call periodically to prevent memory leaks
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
 * Create API key authentication middleware
 *
 * @example
 * ```typescript
 * import { createApiKeyMiddleware } from '../_shared/apiKeyAuth.ts';
 *
 * const { user, keyData } = await createApiKeyMiddleware(req, supabase, {
 *   resource: 'databases',
 *   action: 'write',
 * });
 * ```
 */
export async function createApiKeyMiddleware(
  req: Request,
  supabase: SupabaseClient,
  options?: {
    resource?: string;
    action?: 'read' | 'write' | 'delete';
    checkRateLimit?: boolean;
  }
): Promise<{ user_id: string; keyData: ApiKeyData }> {
  const apiKey = req.headers.get('x-api-key');

  // Verify API key
  const keyData = await verifyApiKey(supabase, apiKey);

  // Check permissions if specified
  if (options?.resource && options?.action) {
    const hasPermission = checkApiKeyPermissions(
      keyData,
      options.resource,
      options.action
    );

    if (!hasPermission) {
      throw new Error(
        `API key does not have ${options.action} permission for ${options.resource}`
      );
    }
  }

  // Check rate limit if enabled
  if (options?.checkRateLimit !== false) {
    const rateLimit = checkRateLimit(keyData.key_id, keyData.rate_limit);

    if (!rateLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Resets at ${rateLimit.resetAt.toISOString()}`
      );
    }
  }

  return {
    user_id: keyData.user_id,
    keyData,
  };
}

/**
 * Generate new API key
 *
 * Call this from an Edge Function to create new API keys.
 * The plaintext key is returned ONLY ONCE and must be shown to user.
 *
 * @example
 * ```typescript
 * const { apiKey, keyId } = await generateApiKey(supabase, userId, {
 *   name: 'Production API Key',
 *   permissions: {
 *     databases: { read: true, write: true, delete: false },
 *   },
 *   rateLimit: 1000,
 *   expiresInDays: 365,
 * });
 *
 * // Show apiKey to user ONCE
 * console.log('Your API key:', apiKey);
 * ```
 */
export async function generateApiKey(
  supabase: SupabaseClient,
  userId: string,
  options: {
    name: string;
    permissions?: Record<string, any>;
    rateLimit?: number;
    expiresInDays?: number;
  }
): Promise<{ apiKey: string; keyId: string; keyPrefix: string }> {
  // Generate random API key
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const apiKey = `dpd_${randomHex}`;
  const keyPrefix = apiKey.substring(0, 12); // First 12 chars for display

  // Hash for lookup (SHA-256)
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Get encryption password from environment
  const encryptionPassword = Deno.env.get('API_KEY_ENCRYPTION_PASSWORD');
  if (!encryptionPassword) {
    throw new Error('API_KEY_ENCRYPTION_PASSWORD not set in environment');
  }

  // Encrypt API key for storage
  const { data: encryptedKey, error: encryptError } = await supabase.rpc('encrypt_api_key', {
    p_plaintext_key: apiKey,
    p_encryption_password: encryptionPassword,
  });

  if (encryptError) {
    throw new Error(`Failed to encrypt API key: ${encryptError.message}`);
  }

  // Calculate expiration
  const expiresAt = options.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Insert into database
  const { data: insertData, error: insertError } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name: options.name,
      key_hash: keyHash,
      encrypted_key: encryptedKey,
      key_prefix: keyPrefix,
      permissions: options.permissions || {
        databases: { read: true, write: false, delete: false },
        rows: { read: true, write: false, delete: false },
      },
      rate_limit: options.rateLimit || 1000,
      expires_at: expiresAt,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Failed to create API key: ${insertError.message}`);
  }

  return {
    apiKey, // RETURN THIS TO USER ONCE!
    keyId: insertData.id,
    keyPrefix,
  };
}

/**
 * Example usage in Edge Function:
 *
 * ```typescript
 * import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
 * import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
 * import { createApiKeyMiddleware } from '../_shared/apiKeyAuth.ts';
 * import { getSecurityHeaders } from '../_shared/security.ts';
 *
 * serve(async (req) => {
 *   try {
 *     // Create Supabase client
 *     const supabase = createClient(
 *       Deno.env.get('SUPABASE_URL')!,
 *       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 *     );
 *
 *     // Verify API key and check permissions
 *     const { user_id, keyData } = await createApiKeyMiddleware(req, supabase, {
 *       resource: 'databases',
 *       action: 'write',
 *       checkRateLimit: true,
 *     });
 *
 *     // Your business logic here
 *     const result = await doSomething(user_id);
 *
 *     return new Response(JSON.stringify(result), {
 *       headers: getSecurityHeaders(req),
 *     });
 *   } catch (error) {
 *     return new Response(
 *       JSON.stringify({ error: error.message }),
 *       { status: error.message.includes('Rate limit') ? 429 : 401 }
 *     );
 *   }
 * });
 * ```
 */
