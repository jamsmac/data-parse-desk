/**
 * Shared Supabase Client for Edge Functions
 *
 * Creates authenticated Supabase clients with proper error handling
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

/**
 * Create an authenticated Supabase client from request
 */
export function createAuthenticatedClient(authHeader: string | null): SupabaseClient {
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      persistSession: false, // Edge functions don't need to persist sessions
    },
  });
}

/**
 * Create a service role client (admin access)
 * Use with caution - only for server-side operations
 */
export function createServiceRoleClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Verify user authentication and return user
 */
export async function verifyAuthentication(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user;
}

/**
 * Check if user has access to a project
 */
export async function verifyProjectAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ isOwner: boolean; role?: string }> {
  // Check if user is owner
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw new Error(`Project not found: ${projectError.message}`);
  }

  const isOwner = project.user_id === userId;

  if (isOwner) {
    return { isOwner: true };
  }

  // Check if user is a member
  const { data: member, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (memberError || !member) {
    throw new Error('Access denied: You do not have access to this project');
  }

  return { isOwner: false, role: member.role };
}

/**
 * Check if user has access to a database
 */
export async function verifyDatabaseAccess(
  supabase: SupabaseClient,
  userId: string,
  databaseId: string
): Promise<{ isOwner: boolean; role?: string; projectId: string }> {
  // Get database with project info
  const { data: database, error: dbError } = await supabase
    .from('databases')
    .select('project_id, projects!inner(user_id)')
    .eq('id', databaseId)
    .single();

  if (dbError || !database) {
    throw new Error(`Database not found: ${dbError?.message || 'Not found'}`);
  }

  const projectId = database.project_id;
  const isOwner = (database.projects as any).user_id === userId;

  if (isOwner) {
    return { isOwner: true, projectId };
  }

  // Check if user is a project member
  const { data: member, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (memberError || !member) {
    throw new Error('Access denied: You do not have access to this database');
  }

  return { isOwner: false, role: member.role, projectId };
}
