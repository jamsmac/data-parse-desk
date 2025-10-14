export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  user_id: string;
  database_id: string;
  role: UserRole;
  granted_by: string;
  granted_at: string;
}

export interface Comment {
  id: string;
  database_id: string;
  row_id: string;
  user_id: string;
  user: User;
  content: string;
  parent_id?: string;
  replies?: Comment[];
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  user: User;
  database_id: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'export' | 'share';
  entity_type: 'database' | 'row' | 'column' | 'chart' | 'report';
  entity_id: string;
  entity_name?: string;
  changes?: Record<string, any>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'comment' | 'mention' | 'share' | 'update' | 'system' | 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationSettings {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  comment_notifications: boolean;
  mention_notifications: boolean;
  share_notifications: boolean;
  update_notifications: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}
