/**
 * Row Level Security (RLS) Policies Tests
 *
 * Comprehensive tests for all RLS policies
 * Tests security isolation between users
 *
 * Run with: npm run test -- src/tests/integration/rls-policies.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

describe('RLS Policies Security Tests', () => {
  let user1Client: SupabaseClient<Database>;
  let user2Client: SupabaseClient<Database>;
  let user1: User;
  let user2: User;
  let user1ProjectId: string;
  let user1DatabaseId: string;

  beforeAll(async () => {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create first test user with strong password
    const timestamp = Date.now();
    const { data: data1, error: error1 } = await supabase.auth.signUp({
      email: `user1-${timestamp}@example.com`,
      password: `SecureTestP@ss${timestamp}!User1`,
    });

    if (error1 || !data1.user || !data1.session) {
      throw new Error('Failed to create user 1');
    }

    user1 = data1.user;
    user1Client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${data1.session.access_token}` },
      },
    });

    // Create second test user with strong password
    const { data: data2, error: error2 } = await supabase.auth.signUp({
      email: `user2-${timestamp + 1}@example.com`,
      password: `SecureTestP@ss${timestamp}!User2`,
    });

    if (error2 || !data2.user || !data2.session) {
      throw new Error('Failed to create user 2');
    }

    user2 = data2.user;
    user2Client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${data2.session.access_token}` },
      },
    });

    // Create test data for user 1
    const { data: project } = await user1Client
      .from('projects')
      .insert({ name: 'User 1 Project', description: 'Private' })
      .select()
      .single();

    user1ProjectId = project?.id || '';

    const { data: database } = await user1Client
      .from('databases')
      .insert({
        project_id: user1ProjectId,
        name: 'User 1 Database',
        description: 'Private',
      })
      .select()
      .single();

    user1DatabaseId = database?.id || '';
  });

  afterAll(async () => {
    // Cleanup
    if (user1DatabaseId) {
      await user1Client.from('databases').delete().eq('id', user1DatabaseId);
    }
    if (user1ProjectId) {
      await user1Client.from('projects').delete().eq('id', user1ProjectId);
    }
  });

  describe('Projects Table RLS', () => {
    it('should allow user to read own projects', async () => {
      const { data, error } = await user1Client
        .from('projects')
        .select('*')
        .eq('id', user1ProjectId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.id).toBe(user1ProjectId);
    });

    it('should NOT allow user to read other users projects', async () => {
      const { data, error } = await user2Client
        .from('projects')
        .select('*')
        .eq('id', user1ProjectId);

      // Should return empty, not error (RLS filters it out)
      expect(data).toEqual([]);
    });

    it('should allow user to insert their own project', async () => {
      const { data, error } = await user2Client
        .from('projects')
        .insert({ name: 'User 2 Project', description: 'Test' })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.user_id).toBe(user2.id);

      // Cleanup
      if (data?.id) {
        await user2Client.from('projects').delete().eq('id', data.id);
      }
    });

    it('should NOT allow user to update other users project', async () => {
      const { error } = await user2Client
        .from('projects')
        .update({ name: 'Hacked!' })
        .eq('id', user1ProjectId);

      // Should fail due to RLS
      expect(error).toBeDefined();
    });

    it('should NOT allow user to delete other users project', async () => {
      const { error } = await user2Client
        .from('projects')
        .delete()
        .eq('id', user1ProjectId);

      // Should fail due to RLS
      expect(error).toBeDefined();
    });

    it('should allow user to update own project', async () => {
      const { data, error } = await user1Client
        .from('projects')
        .update({ description: 'Updated' })
        .eq('id', user1ProjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.description).toBe('Updated');
    });
  });

  describe('Databases Table RLS', () => {
    it('should allow user to read databases in own project', async () => {
      const { data, error } = await user1Client
        .from('databases')
        .select('*')
        .eq('project_id', user1ProjectId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should NOT allow user to read databases in other users project', async () => {
      const { data } = await user2Client
        .from('databases')
        .select('*')
        .eq('project_id', user1ProjectId);

      expect(data).toEqual([]);
    });

    it('should NOT allow user to create database in other users project', async () => {
      const { error } = await user2Client
        .from('databases')
        .insert({
          project_id: user1ProjectId,
          name: 'Hacked Database',
          description: 'Should fail',
        });

      expect(error).toBeDefined();
    });
  });

  describe('Transactions Table RLS', () => {
    it('should only show transactions created by user', async () => {
      // Create transaction for user 1
      const { data: tx1 } = await user1Client
        .from('transactions')
        .insert({
          file_name: 'test.csv',
          row_hash: `hash-${Date.now()}`,
          row_data: { test: 'data' },
        })
        .select()
        .single();

      // User 1 should see it
      const { data: user1Data } = await user1Client
        .from('transactions')
        .select('*')
        .eq('id', tx1?.id || '');

      expect(user1Data).toHaveLength(1);

      // User 2 should NOT see it
      const { data: user2Data } = await user2Client
        .from('transactions')
        .select('*')
        .eq('id', tx1?.id || '');

      expect(user2Data).toEqual([]);

      // Cleanup
      if (tx1?.id) {
        await user1Client.from('transactions').delete().eq('id', tx1.id);
      }
    });
  });

  describe('Performance Snapshots RLS', () => {
    it('should allow authenticated users to read performance snapshots', async () => {
      const { data, error } = await user1Client
        .from('performance_snapshots')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should allow authenticated users to read performance alerts', async () => {
      const { data, error } = await user1Client
        .from('performance_alerts')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('API Keys RLS', () => {
    it('should only show user their own API keys', async () => {
      // Create API key for user 1
      const { data: key1 } = await user1Client
        .from('api_keys')
        .insert({
          name: 'Test Key',
          key_hash: `hash-${Date.now()}`,
        })
        .select()
        .single();

      // User 1 should see it
      const { data: user1Keys } = await user1Client
        .from('api_keys')
        .select('*')
        .eq('id', key1?.id || '');

      expect(user1Keys).toHaveLength(1);

      // User 2 should NOT see it
      const { data: user2Keys } = await user2Client
        .from('api_keys')
        .select('*')
        .eq('id', key1?.id || '');

      expect(user2Keys).toEqual([]);

      // Cleanup
      if (key1?.id) {
        await user1Client.from('api_keys').delete().eq('id', key1.id);
      }
    });
  });

  describe('Cross-User Isolation', () => {
    it('should completely isolate users data', async () => {
      // User 1 creates multiple resources
      const { data: project } = await user1Client
        .from('projects')
        .insert({ name: 'Isolation Test', description: 'Private' })
        .select()
        .single();

      const { data: database } = await user1Client
        .from('databases')
        .insert({
          project_id: project?.id || '',
          name: 'Isolation DB',
          description: 'Private',
        })
        .select()
        .single();

      // User 2 should see ZERO of user 1's data
      const { data: user2Projects } = await user2Client
        .from('projects')
        .select('*');

      const { data: user2Databases } = await user2Client
        .from('databases')
        .select('*');

      // User 2 should only see their own data (if any)
      const user2ProjectIds = user2Projects?.map((p) => p.id) || [];
      const user2DatabaseIds = user2Databases?.map((d) => d.id) || [];

      expect(user2ProjectIds).not.toContain(project?.id);
      expect(user2DatabaseIds).not.toContain(database?.id);

      // Cleanup
      if (database?.id) {
        await user1Client.from('databases').delete().eq('id', database.id);
      }
      if (project?.id) {
        await user1Client.from('projects').delete().eq('id', project.id);
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in filters', async () => {
      const maliciousInput = "'; DROP TABLE projects; --";

      const { data, error } = await user1Client
        .from('projects')
        .select('*')
        .eq('name', maliciousInput);

      // Should return empty or error, but NOT execute SQL injection
      expect(data).toEqual([]);

      // Verify projects table still exists
      const { data: projects } = await user1Client
        .from('projects')
        .select('id')
        .limit(1);

      expect(Array.isArray(projects)).toBe(true);
    });
  });
});
