/**
 * API Module - Central export for all API operations
 *
 * Usage:
 * import { api } from '@/api';
 *
 * const result = await api.databases.getDatabase('123');
 * if (result.success) {
 *   console.log(result.data);
 * }
 */

export { apiClient, unwrap, mapResult, chain } from './client';
export type { RequestConfig } from './client';

export { dbApi as databases } from './databases';
export { projectApi as projects } from './projects';

export type { RowData } from './databases';
export type { Project } from './projects';

/**
 * Combined API export
 */
export const api = {
  databases: dbApi,
  projects: projectApi,
};

// Re-export for convenience
import { dbApi } from './databases';
import { projectApi } from './projects';
