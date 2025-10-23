/**
 * Application-wide constants
 * Centralized configuration to avoid magic values
 */

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;

// View Types
export const VIEW_TYPES = {
  TABLE: 'table',
  CALENDAR: 'calendar',
  KANBAN: 'kanban',
  GALLERY: 'gallery',
  GRID: 'grid',
} as const;

export type ViewType = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

// Column Types
export const COLUMN_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'boolean',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  EMAIL: 'email',
  PHONE: 'phone',
  URL: 'url',
  FILE: 'file',
  RELATION: 'relation',
  LOOKUP: 'lookup',
  ROLLUP: 'rollup',
  FORMULA: 'formula',
  RATING: 'rating',
  PROGRESS: 'progress',
  STATUS: 'status',
  CHECKLIST: 'checklist',
} as const;

export type ColumnType = typeof COLUMN_TYPES[keyof typeof COLUMN_TYPES];

// Import Modes
export const IMPORT_MODES = {
  CREATE: 'create',
  REPLACE: 'replace',
  APPEND: 'append',
  UPDATE: 'update',
} as const;

export type ImportMode = typeof IMPORT_MODES[keyof typeof IMPORT_MODES];

// Duplicate Strategies
export const DUPLICATE_STRATEGIES = {
  SKIP: 'skip',
  REPLACE: 'replace',
  KEEP_BOTH: 'keep_both',
} as const;

export type DuplicateStrategy = typeof DUPLICATE_STRATEGIES[keyof typeof DUPLICATE_STRATEGIES];

// File Size Limits (in bytes)
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB
} as const;

// React Query Settings
export const QUERY_CONFIG = {
  STALE_TIME: 60000, // 1 minute
  CACHE_TIME: 300000, // 5 minutes
  RETRY_COUNT: 1,
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'dd.MM.yyyy',
  DISPLAY_WITH_TIME: 'dd.MM.yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  GUEST: 'guest',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Permission Levels
export const PERMISSION_LEVELS = {
  NONE: 'none',
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
} as const;

export type PermissionLevel = typeof PERMISSION_LEVELS[keyof typeof PERMISSION_LEVELS];

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  VIEW_PREFERENCES: 'view_preferences',
} as const;

// API Endpoints (relative to Supabase URL)
export const API_ENDPOINTS = {
  EVALUATE_FORMULA: '/functions/v1/evaluate-formula',
  AI_ORCHESTRATOR: '/functions/v1/ai-orchestrator',
  COMPUTE_COLUMNS: '/functions/v1/compute-columns',
  RESOLVE_RELATIONS: '/functions/v1/resolve-relations',
  GENERATE_REPORT: '/functions/v1/generate-report',
  TELEGRAM_NOTIFY: '/functions/v1/telegram-notify',
  SEND_NOTIFICATION: '/functions/v1/send-notification',
} as const;

// Validation Limits
export const VALIDATION_LIMITS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_TEXT_LENGTH: 1000,
  MAX_EMAIL_LENGTH: 255,
  MAX_USERNAME_LENGTH: 50,
  MIN_USERNAME_LENGTH: 3,
} as const;

// Chart Colors
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
] as const;

// Status Options (can be customized per database)
export const DEFAULT_STATUS_OPTIONS = [
  { label: 'Not Started', color: '#9ca3af' },
  { label: 'In Progress', color: '#3b82f6' },
  { label: 'Completed', color: '#10b981' },
  { label: 'Blocked', color: '#ef4444' },
] as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];

// AI Model Options
export const AI_MODELS = {
  GPT4: 'gpt-4',
  GPT35: 'gpt-3.5-turbo',
  CLAUDE: 'claude-3-opus',
  CLAUDE_SONNET: 'claude-3-sonnet',
} as const;

export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS];

// Feature Flags (for gradual rollout)
export const FEATURE_FLAGS = {
  ENABLE_AI_ASSISTANT: true,
  ENABLE_VOICE_RECORDING: true,
  ENABLE_TELEGRAM_BOT: true,
  ENABLE_MOBILE_CAMERA: true,
  ENABLE_COLLABORATIVE_EDITING: true,
  ENABLE_ADVANCED_ANALYTICS: true,
} as const;
