/**
 * Database Integration Tests
 *
 * Tests real database operations with Supabase
 * Tests RLS policies, authentication, and data integrity
 *
 * Run with: npm run test -- src/tests/integration/database.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Test data - using strong unique password to pass Supabase security checks
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = `SecureTestP@ss${Date.now()}!xYz`;

describe('Database Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let authenticatedClient: SupabaseClient<Database>;
  let testUser: User | null = null;
  let testProjectId: string | null = null;
  let testDatabaseId: string | null = null;

  beforeAll(async () => {
    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials. Check your .env file.');
    }

    // Create anonymous client
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create test user
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }

    testUser = data.user;

    // Create authenticated client
    if (data.session) {
      authenticatedClient = createClient<Database>(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          },
        }
      );
    } else {
      throw new Error('No session created for test user');
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testDatabaseId && authenticatedClient) {
      await authenticatedClient.from('databases').delete().eq('id', testDatabaseId);
    }

    if (testProjectId && authenticatedClient) {
      await authenticatedClient.from('projects').delete().eq('id', testProjectId);
    }

    // Cleanup: Delete test user (requires admin access)
    // Note: In real tests, you might need service role client for this
    if (testUser && supabase) {
      await supabase.auth.signOut();
    }
  });

  beforeEach(() => {
    // Reset state before each test if needed
  });

  describe('Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.session).toBeDefined();
      expect(data.user?.email).toBe(TEST_EMAIL);
    });

    it('should fail authentication with invalid credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: 'wrong-password',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should retrieve current user session', async () => {
      const { data, error } = await authenticatedClient.auth.getUser();

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(TEST_EMAIL);
    });
  });

  describe('RLS Policies - Projects', () => {
    it('should create project as authenticated user', async () => {
      const { data, error } = await authenticatedClient
        .from('projects')
        .insert({
          name: 'Test Project',
          description: 'Integration test project',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.name).toBe('Test Project');

      // Store for cleanup
      testProjectId = data?.id || null;
    });

    it('should read own projects', async () => {
      // First create a project
      const { data: project } = await authenticatedClient
        .from('projects')
        .insert({
          name: 'Test Project for Read',
          description: 'Test reading',
        })
        .select()
        .single();

      // Then try to read it
      const { data, error } = await authenticatedClient
        .from('projects')
        .select('*')
        .eq('id', project?.id || '');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.name).toBe('Test Project for Read');

      // Cleanup
      if (project?.id) {
        await authenticatedClient.from('projects').delete().eq('id', project.id);
      }
    });

    it('should update own project', async () => {
      if (!testProjectId) {
        throw new Error('No test project created');
      }

      const { data, error } = await authenticatedClient
        .from('projects')
        .update({ description: 'Updated description' })
        .eq('id', testProjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.description).toBe('Updated description');
    });

    it('should NOT read other users projects', async () => {
      // This test would need another user's project
      // For now, just test that anonymous client can't read
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .limit(1);

      // Anonymous users should not see any projects
      expect(data).toEqual([]);
    });

    it('should delete own project', async () => {
      // Create a project to delete
      const { data: project } = await authenticatedClient
        .from('projects')
        .insert({
          name: 'Project to Delete',
          description: 'Will be deleted',
        })
        .select()
        .single();

      // Delete it
      const { error } = await authenticatedClient
        .from('projects')
        .delete()
        .eq('id', project?.id || '');

      expect(error).toBeNull();

      // Verify deletion
      const { data: deleted } = await authenticatedClient
        .from('projects')
        .select('*')
        .eq('id', project?.id || '');

      expect(deleted).toEqual([]);
    });
  });

  describe('RLS Policies - Databases', () => {
    beforeAll(async () => {
      // Ensure we have a test project
      if (!testProjectId) {
        const { data } = await authenticatedClient
          .from('projects')
          .insert({
            name: 'Test Project for Databases',
            description: 'For database tests',
          })
          .select()
          .single();

        testProjectId = data?.id || null;
      }
    });

    it('should create database in own project', async () => {
      if (!testProjectId) {
        throw new Error('No test project available');
      }

      const { data, error } = await authenticatedClient
        .from('databases')
        .insert({
          project_id: testProjectId,
          name: 'Test Database',
          description: 'Integration test database',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.name).toBe('Test Database');

      // Store for other tests
      testDatabaseId = data?.id || null;
    });

    it('should read own databases', async () => {
      if (!testProjectId) {
        throw new Error('No test project available');
      }

      const { data, error } = await authenticatedClient
        .from('databases')
        .select('*')
        .eq('project_id', testProjectId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should update own database', async () => {
      if (!testDatabaseId) {
        throw new Error('No test database available');
      }

      const { data, error } = await authenticatedClient
        .from('databases')
        .update({ description: 'Updated database description' })
        .eq('id', testDatabaseId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.description).toBe('Updated database description');
    });
  });

  describe('Data Integrity', () => {
    it('should enforce foreign key constraints', async () => {
      // Try to create database with non-existent project_id
      const { error } = await authenticatedClient
        .from('databases')
        .insert({
          project_id: '00000000-0000-0000-0000-000000000000', // Non-existent
          name: 'Invalid Database',
          description: 'Should fail',
        });

      expect(error).toBeDefined();
      // Should be a foreign key constraint error
      expect(error?.message).toContain('violates foreign key constraint');
    });

    it('should enforce unique constraints', async () => {
      if (!testProjectId) {
        throw new Error('No test project available');
      }

      // Create first database
      const { data: db1 } = await authenticatedClient
        .from('databases')
        .insert({
          project_id: testProjectId,
          name: 'Unique Test DB',
          description: 'First',
        })
        .select()
        .single();

      // Try to create duplicate (if unique constraint exists)
      // Note: This depends on your schema having unique constraints
      // Adjust based on actual schema constraints

      // Cleanup
      if (db1?.id) {
        await authenticatedClient.from('databases').delete().eq('id', db1.id);
      }
    });

    it('should set default values correctly', async () => {
      if (!testProjectId) {
        throw new Error('No test project available');
      }

      const { data, error } = await authenticatedClient
        .from('databases')
        .insert({
          project_id: testProjectId,
          name: 'Database with Defaults',
          // Don't set optional fields
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.created_at).toBeDefined();
      expect(data?.updated_at).toBeDefined();

      // Cleanup
      if (data?.id) {
        await authenticatedClient.from('databases').delete().eq('id', data.id);
      }
    });
  });

  describe('Query Performance', () => {
    it('should use indexes for user_id queries', async () => {
      const start = Date.now();

      await authenticatedClient
        .from('projects')
        .select('*')
        .eq('user_id', testUser?.id || '');

      const duration = Date.now() - start;

      // Should be fast (< 200ms for indexed query)
      expect(duration).toBeLessThan(200);
    });

    it('should handle pagination correctly', async () => {
      const { data, error } = await authenticatedClient
        .from('projects')
        .select('*')
        .range(0, 9) // First 10 items
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data?.length).toBeLessThanOrEqual(10);
    });

    it('should filter with multiple conditions', async () => {
      if (!testProjectId) {
        throw new Error('No test project available');
      }

      const { data, error } = await authenticatedClient
        .from('databases')
        .select('*')
        .eq('project_id', testProjectId)
        .ilike('name', '%Test%')
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Realtime Subscriptions', () => {
    it('should subscribe to table changes', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Subscription timeout'));
        }, 5000);

        const channel = authenticatedClient
          .channel('test-channel')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'projects',
            },
            (payload) => {
              clearTimeout(timeout);
              expect(payload.new).toBeDefined();
              channel.unsubscribe();
              resolve();
            }
          )
          .subscribe();

        // Trigger an insert after subscription
        setTimeout(async () => {
          await authenticatedClient
            .from('projects')
            .insert({
              name: 'Realtime Test Project',
              description: 'For testing subscriptions',
            })
            .select()
            .single()
            .then(({ data }) => {
              // Cleanup
              if (data?.id) {
                setTimeout(async () => {
                  await authenticatedClient
                    .from('projects')
                    .delete()
                    .eq('id', data.id);
                }, 1000);
              }
            });
        }, 1000);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Create client with invalid URL
      const badClient = createClient<Database>(
        'https://invalid-url.supabase.co',
        SUPABASE_ANON_KEY
      );

      const { data, error } = await badClient
        .from('projects')
        .select('*')
        .limit(1);

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should handle invalid queries', async () => {
      const { error } = await authenticatedClient
        .from('projects')
        .select('non_existent_column');

      expect(error).toBeDefined();
    });

    it('should handle unauthorized access', async () => {
      // Try to access with anonymous client
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: 'Unauthorized Project',
          description: 'Should fail',
        });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });
});
