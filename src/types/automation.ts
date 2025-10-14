// =====================================================
// AUTOMATION TYPES
// =====================================================

export interface ScheduledTask {
  id: string;
  database_id: string;
  name: string;
  description?: string;
  type: 'import' | 'export' | 'backup' | 'workflow' | 'report';
  schedule: CronSchedule;
  enabled: boolean;
  config: TaskConfig;
  last_run?: string;
  next_run?: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  error_message?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CronSchedule {
  expression: string; // Cron expression (e.g., "0 0 * * *")
  timezone?: string;
  description?: string;
}

export type TaskConfig =
  | ImportTaskConfig
  | ExportTaskConfig
  | BackupTaskConfig
  | WorkflowTaskConfig
  | ReportTaskConfig;

export interface ImportTaskConfig {
  type: 'import';
  source: ImportSource;
  table_id: string;
  mapping: Record<string, string>;
  on_duplicate: 'skip' | 'update' | 'replace';
  notify_on_complete: boolean;
  notify_on_error: boolean;
}

export interface ExportTaskConfig {
  type: 'export';
  table_id: string;
  format: 'csv' | 'xlsx' | 'json';
  filters?: any[];
  destination: ExportDestination;
  notify_on_complete: boolean;
}

export interface BackupTaskConfig {
  type: 'backup';
  include_tables?: string[];
  exclude_tables?: string[];
  destination: BackupDestination;
  retention_days?: number;
}

export interface WorkflowTaskConfig {
  type: 'workflow';
  workflow_id: string;
  input_data?: Record<string, any>;
}

export interface ReportTaskConfig {
  type: 'report';
  report_id: string;
  format: 'pdf' | 'xlsx' | 'html';
  recipients: string[];
}

export interface ImportSource {
  type: 'url' | 'ftp' | 'google_drive' | 'dropbox' | 's3';
  url?: string;
  credentials?: Record<string, string>;
  file_path?: string;
}

export interface ExportDestination {
  type: 'email' | 'ftp' | 'google_drive' | 'dropbox' | 's3' | 'webhook';
  email?: string[];
  url?: string;
  credentials?: Record<string, string>;
  path?: string;
}

export interface BackupDestination {
  type: 'local' | 's3' | 'google_drive' | 'dropbox';
  path?: string;
  bucket?: string;
  credentials?: Record<string, string>;
}

// =====================================================
// WORKFLOW TYPES
// =====================================================

export interface Workflow {
  id: string;
  database_id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  error_handling: ErrorHandling;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_executed?: string;
  execution_count: number;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'record_created' | 'record_updated' | 'record_deleted' | 'field_changed';
  config: TriggerConfig;
}

export type TriggerConfig =
  | ScheduleTriggerConfig
  | WebhookTriggerConfig
  | RecordTriggerConfig
  | FieldChangedTriggerConfig;

export interface ScheduleTriggerConfig {
  type: 'schedule';
  schedule: CronSchedule;
}

export interface WebhookTriggerConfig {
  type: 'webhook';
  secret?: string;
  headers?: Record<string, string>;
}

export interface RecordTriggerConfig {
  type: 'record_created' | 'record_updated' | 'record_deleted';
  table_id: string;
  filters?: any[];
}

export interface FieldChangedTriggerConfig {
  type: 'field_changed';
  table_id: string;
  column_name: string;
  from_value?: any;
  to_value?: any;
}

export interface WorkflowCondition {
  id: string;
  type: 'field_equals' | 'field_contains' | 'field_greater_than' | 'field_less_than' | 'custom_logic';
  field?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value?: any;
  logic?: string; // JavaScript expression
  conjunction: 'and' | 'or';
}

export interface WorkflowAction {
  id: string;
  type: 'create_record' | 'update_record' | 'delete_record' | 'send_email' | 'send_notification' | 'call_webhook' | 'run_script' | 'wait';
  config: ActionConfig;
  on_error: 'stop' | 'continue' | 'retry';
  retry_count?: number;
  retry_delay?: number; // seconds
}

export type ActionConfig =
  | CreateRecordActionConfig
  | UpdateRecordActionConfig
  | DeleteRecordActionConfig
  | SendEmailActionConfig
  | SendNotificationActionConfig
  | CallWebhookActionConfig
  | RunScriptActionConfig
  | WaitActionConfig;

export interface CreateRecordActionConfig {
  type: 'create_record';
  table_id: string;
  data: Record<string, any>;
}

export interface UpdateRecordActionConfig {
  type: 'update_record';
  table_id: string;
  record_id: string;
  data: Record<string, any>;
}

export interface DeleteRecordActionConfig {
  type: 'delete_record';
  table_id: string;
  record_id: string;
}

export interface SendEmailActionConfig {
  type: 'send_email';
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: string[];
}

export interface SendNotificationActionConfig {
  type: 'send_notification';
  user_ids: string[];
  title: string;
  message: string;
  link?: string;
}

export interface CallWebhookActionConfig {
  type: 'call_webhook';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number; // seconds
}

export interface RunScriptActionConfig {
  type: 'run_script';
  language: 'javascript' | 'python';
  code: string;
  timeout?: number; // seconds
}

export interface WaitActionConfig {
  type: 'wait';
  duration: number; // seconds
  until?: string; // timestamp or condition
}

export interface ErrorHandling {
  on_error: 'stop' | 'continue' | 'rollback';
  notify_on_error: boolean;
  notify_emails?: string[];
  max_retries?: number;
  retry_delay?: number; // seconds
}

// =====================================================
// WEBHOOK TYPES
// =====================================================

export interface Webhook {
  id: string;
  database_id: string;
  name: string;
  description?: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  trigger_count: number;
}

export type WebhookEvent =
  | 'record.created'
  | 'record.updated'
  | 'record.deleted'
  | 'table.created'
  | 'table.updated'
  | 'table.deleted'
  | 'database.updated';

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event: WebhookEvent;
  payload: any;
  response_status?: number;
  response_body?: any;
  error_message?: string;
  created_at: string;
}

// =====================================================
// API KEY TYPES
// =====================================================

export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  key: string; // Hashed
  prefix: string; // First 8 chars for display
  permissions: APIPermission[];
  expires_at?: string;
  last_used?: string;
  created_at: string;
  revoked: boolean;
  revoked_at?: string;
}

export interface APIPermission {
  resource: 'databases' | 'tables' | 'rows' | 'files' | 'workflows' | 'webhooks';
  actions: ('read' | 'create' | 'update' | 'delete')[];
  scope?: string; // Optional scope (e.g., specific database_id)
}

// =====================================================
// INTEGRATION TYPES
// =====================================================

export interface Integration {
  id: string;
  type: 'google_sheets' | 'airtable' | 'notion' | 'slack' | 'zapier' | 'make' | 'custom';
  name: string;
  description?: string;
  config: IntegrationConfig;
  credentials?: Record<string, string>;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type IntegrationConfig =
  | GoogleSheetsConfig
  | AirtableConfig
  | NotionConfig
  | SlackConfig
  | CustomConfig;

export interface GoogleSheetsConfig {
  type: 'google_sheets';
  spreadsheet_id: string;
  sheet_name: string;
  sync_direction: 'import' | 'export' | 'bidirectional';
  sync_frequency: CronSchedule;
}

export interface AirtableConfig {
  type: 'airtable';
  base_id: string;
  table_id: string;
  sync_direction: 'import' | 'export' | 'bidirectional';
  sync_frequency: CronSchedule;
}

export interface NotionConfig {
  type: 'notion';
  database_id: string;
  sync_direction: 'import' | 'export' | 'bidirectional';
  sync_frequency: CronSchedule;
}

export interface SlackConfig {
  type: 'slack';
  channel: string;
  events: string[];
  message_template: string;
}

export interface CustomConfig {
  type: 'custom';
  api_url: string;
  auth_type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
  credentials?: Record<string, string>;
}

// =====================================================
// EXECUTION TYPES
// =====================================================

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_type: string;
  trigger_data?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  steps: ExecutionStep[];
  error_message?: string;
}

export interface ExecutionStep {
  id: string;
  action_id: string;
  action_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  input?: any;
  output?: any;
  error_message?: string;
  retry_count?: number;
}

export interface TaskExecution {
  id: string;
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  records_processed?: number;
  records_failed?: number;
  error_message?: string;
  log: string[];
}
