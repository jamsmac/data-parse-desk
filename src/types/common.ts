// Common types to replace 'any' usage across the application

export type AnyObject = Record<string, unknown>;

export type ApiResponse<T = unknown> = {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

export type SupabaseResponse<T = unknown> = {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
};

export type TableRow = Record<string, unknown>;

export type QueryParams = {
  [key: string]: string | number | boolean | null | undefined;
};

export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

export type AsyncFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
  ...args: TArgs
) => Promise<TReturn>;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type ValueOf<T> = T[keyof T];

// Form types
export type FormValues = Record<string, unknown>;
export type FormErrors = Record<string, string | string[]>;

// Chart types
export type ChartDataPoint = {
  [key: string]: string | number | Date | null;
};

// File types
export type FileData = {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
};

// Database operation types
export type DatabaseOperation = 'insert' | 'update' | 'delete' | 'select';

export type DatabaseError = {
  code: string;
  message: string;
  details?: unknown;
  hint?: string;
};

// Validation types
export type ValidationResult = {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
};

// Generic CRUD types
export interface CrudOperations<T> {
  create: (data: Partial<T>) => Promise<T>;
  read: (id: string | number) => Promise<T | null>;
  update: (id: string | number, data: Partial<T>) => Promise<T>;
  delete: (id: string | number) => Promise<boolean>;
  list: (params?: QueryParams) => Promise<T[]>;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface FilterOperator {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'is' | 'between';
  value: unknown;
}

// Auth types
export type UserProfile = {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: Record<string, unknown>;
};

// Component prop types
export type ComponentProps<T = AnyObject> = T & {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

// Event types
export type ChangeEvent<T = HTMLInputElement> = React.ChangeEvent<T>;
export type FormEvent<T = HTMLFormElement> = React.FormEvent<T>;
export type MouseEvent<T = HTMLElement> = React.MouseEvent<T>;
export type KeyboardEvent<T = HTMLElement> = React.KeyboardEvent<T>;

// Utility types for strict typing
export type ExcludeNull<T> = Exclude<T, null>;
export type ExcludeUndefined<T> = Exclude<T, undefined>;
export type ExcludeFalsy<T> = Exclude<T, null | undefined | false | '' | 0>;

// Type guards
export const isObject = (value: unknown): value is AnyObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isArray = <T = unknown>(value: unknown): value is T[] => {
  return Array.isArray(value);
};

export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

// Using a more specific function type instead of generic Function
export const isFunction = (value: unknown): value is (...args: unknown[]) => unknown => {
  return typeof value === 'function';
};

export const isDefined = <T>(value: T | undefined): value is T => {
  return value !== undefined;
};

export const isNotNull = <T>(value: T | null): value is T => {
  return value !== null;
};

export const isNotEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};
