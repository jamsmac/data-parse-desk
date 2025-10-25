/**
 * Projects API - Type-safe project operations
 */

import { apiClient } from './client';
import type { AsyncResult } from '@/types/api';

/**
 * Project type
 */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  database_count?: number;
}

/**
 * Project operations
 */
export const projectApi = {
  /**
   * Get all projects for user
   */
  getProjects(userId: string): AsyncResult<Project[]> {
    return apiClient.query<Project[]>(
      apiClient.getClient()
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );
  },

  /**
   * Get project by ID
   */
  getProject(projectId: string): AsyncResult<Project> {
    return apiClient.query<Project>(
      apiClient.getClient()
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
    );
  },

  /**
   * Create new project
   */
  createProject(data: {
    user_id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }): AsyncResult<Project> {
    return apiClient.mutate<Project>(
      apiClient.getClient()
        .from('projects')
        .insert(data)
        .select()
        .single()
    );
  },

  /**
   * Update project
   */
  updateProject(
    projectId: string,
    updates: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'color'>>
  ): AsyncResult<Project> {
    return apiClient.mutate<Project>(
      apiClient.getClient()
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single()
    );
  },

  /**
   * Delete project
   */
  deleteProject(projectId: string): AsyncResult<void> {
    return apiClient.mutate<void>(
      apiClient.getClient()
        .from('projects')
        .delete()
        .eq('id', projectId)
    );
  },

  /**
   * Get project statistics
   */
  getProjectStats(projectId: string): AsyncResult<{
    databaseCount: number;
    totalRows: number;
    lastActivity: string;
  }> {
    return apiClient.rpc('get_project_stats', {
      p_project_id: projectId,
    });
  },
};
