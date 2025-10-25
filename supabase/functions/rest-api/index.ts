import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';


interface ApiKeyData {
  id: string;
  user_id: string;
  permissions: {
    databases: { read: boolean; write: boolean; delete: boolean };
    rows: { read: boolean; write: boolean; delete: boolean };
    projects: { read: boolean; write: boolean; delete: boolean };
  };
  rate_limit: number;
  is_active: boolean;
  expires_at: string | null;
}

// Rate limiting store (in-memory, resets on function restart)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

async function verifyApiKey(apiKey: string, supabase: any): Promise<ApiKeyData | null> {
  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return data;
}

function checkRateLimit(apiKeyId: string, limit: number): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;

  const record = rateLimitStore.get(apiKeyId);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(apiKeyId, { count: 1, resetAt: now + hourInMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

async function logApiUsage(
  supabase: any,
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  req: Request
) {
  const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  await supabase.from('api_usage').insert({
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

function hasPermission(apiKey: ApiKeyData, resource: string, action: string): boolean {
  const permissions = apiKey.permissions as any;
  return permissions[resource]?.[action] === true;
}

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Extract API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required. Provide it in x-api-key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify API key
    const apiKeyData = await verifyApiKey(apiKey, supabase);
    if (!apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    if (!checkRateLimit(apiKeyData.id, apiKeyData.rate_limit)) {
      const responseTime = Date.now() - startTime;
      await logApiUsage(supabase, apiKeyData.id, req.url, req.method, 429, responseTime, req);

      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', limit: apiKeyData.rate_limit }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);

    // Remove 'rest-api' from path if present
    const resource = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
    const id = pathParts[pathParts.length - 1];

    let response: Response;
    let statusCode = 200;

    // Route handling
    if (url.pathname.includes('/databases')) {
      response = await handleDatabases(req, supabase, apiKeyData, id);
    } else if (url.pathname.includes('/rows')) {
      response = await handleRows(req, supabase, apiKeyData, id);
    } else if (url.pathname.includes('/projects')) {
      response = await handleProjects(req, supabase, apiKeyData, id);
    } else {
      response = new Response(
        JSON.stringify({
          error: 'Endpoint not found',
          available_endpoints: ['/databases', '/rows', '/projects']
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    statusCode = response.status;
    const responseTime = Date.now() - startTime;

    // Log usage (async, don't wait)
    logApiUsage(supabase, apiKeyData.id, url.pathname, req.method, statusCode, responseTime, req);

    return response;
  } catch (error) {
    console.error('API error:', error);
    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Database CRUD handlers
async function handleDatabases(req: Request, supabase: any, apiKey: ApiKeyData, id?: string) {
  const method = req.method;
  const url = new URL(req.url);

  if (method === 'GET') {
    if (!hasPermission(apiKey, 'databases', 'read')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: databases.read required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (id) {
      // Get single database
      const { data, error } = await supabase
        .from('databases')
        .select('*')
        .eq('id', id)
        .eq('user_id', apiKey.user_id)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // List databases with pagination
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('databases')
        .select('*', { count: 'exact' })
        .eq('user_id', apiKey.user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          data,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit),
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  if (method === 'POST') {
    if (!hasPermission(apiKey, 'databases', 'write')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: databases.write required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { data, error } = await supabase
      .from('databases')
      .insert({ ...body, user_id: apiKey.user_id })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (method === 'PUT' || method === 'PATCH') {
    if (!hasPermission(apiKey, 'databases', 'write')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: databases.write required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Database ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { data, error } = await supabase
      .from('databases')
      .update(body)
      .eq('id', id)
      .eq('user_id', apiKey.user_id)
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (method === 'DELETE') {
    if (!hasPermission(apiKey, 'databases', 'delete')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: databases.delete required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Database ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('databases')
      .delete()
      .eq('id', id)
      .eq('user_id', apiKey.user_id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Database deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Row CRUD handlers
async function handleRows(req: Request, supabase: any, apiKey: ApiKeyData, id?: string) {
  const method = req.method;
  const url = new URL(req.url);
  const databaseId = url.searchParams.get('database_id');

  if (!databaseId) {
    return new Response(
      JSON.stringify({ error: 'database_id query parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify user owns the database
  const { data: db } = await supabase
    .from('databases')
    .select('id')
    .eq('id', databaseId)
    .eq('user_id', apiKey.user_id)
    .single();

  if (!db) {
    return new Response(
      JSON.stringify({ error: 'Database not found or access denied' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (method === 'GET') {
    if (!hasPermission(apiKey, 'rows', 'read')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: rows.read required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (id) {
      // Get single row
      const { data, error } = await supabase
        .from('data_rows')
        .select('*')
        .eq('id', id)
        .eq('database_id', databaseId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // List rows with pagination
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('data_rows')
        .select('*', { count: 'exact' })
        .eq('database_id', databaseId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          data,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit),
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  if (method === 'POST') {
    if (!hasPermission(apiKey, 'rows', 'write')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: rows.write required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { data, error } = await supabase
      .from('data_rows')
      .insert({ ...body, database_id: databaseId })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (method === 'PUT' || method === 'PATCH') {
    if (!hasPermission(apiKey, 'rows', 'write')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: rows.write required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Row ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { data, error } = await supabase
      .from('data_rows')
      .update(body)
      .eq('id', id)
      .eq('database_id', databaseId)
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (method === 'DELETE') {
    if (!hasPermission(apiKey, 'rows', 'delete')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: rows.delete required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Row ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('data_rows')
      .delete()
      .eq('id', id)
      .eq('database_id', databaseId);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Row deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Project CRUD handlers
async function handleProjects(req: Request, supabase: any, apiKey: ApiKeyData, id?: string) {
  const method = req.method;
  const url = new URL(req.url);

  if (method === 'GET') {
    if (!hasPermission(apiKey, 'projects', 'read')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: projects.read required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (id) {
      // Get single project
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', apiKey.user_id)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // List projects with pagination
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('user_id', apiKey.user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          data,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit),
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  if (method === 'POST') {
    if (!hasPermission(apiKey, 'projects', 'write')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: projects.write required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...body, user_id: apiKey.user_id })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (method === 'PUT' || method === 'PATCH') {
    if (!hasPermission(apiKey, 'projects', 'write')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: projects.write required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Project ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { data, error } = await supabase
      .from('projects')
      .update(body)
      .eq('id', id)
      .eq('user_id', apiKey.user_id)
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (method === 'DELETE') {
    if (!hasPermission(apiKey, 'projects', 'delete')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: projects.delete required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Project ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', apiKey.user_id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Project deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
