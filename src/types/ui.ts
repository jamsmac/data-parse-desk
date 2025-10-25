/**
 * UI Component Type Definitions
 * Type-safe definitions for React components, props, and UI patterns
 */

import { ReactNode, CSSProperties, HTMLAttributes, MouseEvent, ChangeEvent } from 'react';
import { ColumnType, ColumnValue } from './database';

// ============================================================================
// Common Component Props
// ============================================================================

/**
 * Base component props that most components should accept
 */
export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  id?: string;
  'data-testid'?: string;
}

/**
 * Props for components that can be disabled
 */
export interface DisableableProps {
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * Props for components with loading states
 */
export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Props for components with error states
 */
export interface ErrorProps {
  error?: string | null;
  errorClassName?: string;
}

/**
 * Props for components with children
 */
export interface ChildrenProps {
  children?: ReactNode;
}

/**
 * Combined common props
 */
export interface CommonComponentProps extends BaseComponentProps, ChildrenProps {}

// ============================================================================
// Button Component Types
// ============================================================================

/**
 * Button variants
 */
export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link';

/**
 * Button sizes
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button props
 */
export interface ButtonProps extends BaseComponentProps, DisableableProps, LoadingProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
}

/**
 * Icon button props (no text, only icon)
 */
export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconPosition'> {
  icon: ReactNode;
  'aria-label': string;
  tooltip?: string;
}

// ============================================================================
// Form Component Types
// ============================================================================

/**
 * Form field base props
 */
export interface FormFieldProps extends BaseComponentProps, DisableableProps, ErrorProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  showRequiredIndicator?: boolean;
}

/**
 * Input component props
 */
export interface InputProps extends FormFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/**
 * Textarea component props
 */
export interface TextareaProps extends FormFieldProps {
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  maxLength?: number;
  autoResize?: boolean;
}

/**
 * Select option
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  description?: string;
}

/**
 * Select component props
 */
export interface SelectProps<T = string> extends FormFieldProps {
  options: SelectOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  emptyMessage?: string;
  maxHeight?: number;
}

/**
 * Checkbox component props
 */
export interface CheckboxProps extends FormFieldProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
}

/**
 * Radio button props
 */
export interface RadioProps extends FormFieldProps {
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (value: string) => void;
}

/**
 * Radio group props
 */
export interface RadioGroupProps extends FormFieldProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Switch/Toggle props
 */
export interface SwitchProps extends FormFieldProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * File upload props
 */
export interface FileUploadProps extends FormFieldProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onChange?: (files: File[]) => void;
  value?: File[];
  preview?: boolean;
  dropzone?: boolean;
}

// ============================================================================
// Table Component Types
// ============================================================================

/**
 * Table column alignment
 */
export type ColumnAlignment = 'left' | 'center' | 'right';

/**
 * Table column definition
 */
export interface TableColumn<T = unknown> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => ColumnValue;
  cell?: (value: ColumnValue, row: T) => ReactNode;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: ColumnAlignment;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  frozen?: boolean;
  hidden?: boolean;
  columnType?: ColumnType;
}

/**
 * Table sort configuration
 */
export interface TableSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

/**
 * Table filter configuration
 */
export interface TableFilter {
  columnId: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: ColumnValue;
}

/**
 * Table row selection
 */
export interface TableSelection {
  selectedRows: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

/**
 * Table props
 */
export interface TableProps<T = unknown> extends BaseComponentProps, LoadingProps {
  columns: TableColumn<T>[];
  data: T[];
  rowKey?: keyof T | ((row: T) => string);

  // Selection
  selectable?: boolean;
  selection?: TableSelection;
  onSelectionChange?: (selection: TableSelection) => void;

  // Sorting
  sortable?: boolean;
  sort?: TableSort;
  onSortChange?: (sort: TableSort | null) => void;

  // Filtering
  filterable?: boolean;
  filters?: TableFilter[];
  onFiltersChange?: (filters: TableFilter[]) => void;

  // Pagination
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPaginationChange?: (page: number, pageSize: number) => void;

  // Row actions
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;

  // Appearance
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  compact?: boolean;

  // Empty state
  emptyMessage?: string;
  emptyIcon?: ReactNode;

  // Virtualization
  virtualized?: boolean;
  rowHeight?: number;
  overscan?: number;
}

/**
 * Data grid props (enhanced table)
 */
export interface DataGridProps<T = unknown> extends TableProps<T> {
  editable?: boolean;
  onCellEdit?: (rowId: string, columnId: string, value: ColumnValue) => void;
  onRowAdd?: (row: Partial<T>) => void;
  onRowDelete?: (rowId: string) => void;
  exportable?: boolean;
  onExport?: (format: 'csv' | 'excel' | 'json') => void;
}

// ============================================================================
// Modal/Dialog Component Types
// ============================================================================

/**
 * Modal sizes
 */
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Modal props
 */
export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Confirmation dialog props
 */
export interface ConfirmDialogProps extends Omit<ModalProps, 'footer'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

/**
 * Drawer props (side panel)
 */
export interface DrawerProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: number | string;
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}

// ============================================================================
// Notification/Toast Component Types
// ============================================================================

/**
 * Toast variant
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast position
 */
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Toast props
 */
export interface ToastProps extends BaseComponentProps {
  id: string;
  variant: ToastVariant;
  message: string;
  title?: string;
  duration?: number;
  closable?: boolean;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

/**
 * Toast options for showing toasts
 */
export interface ShowToastOptions {
  variant?: ToastVariant;
  title?: string;
  duration?: number;
  closable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// Card Component Types
// ============================================================================

/**
 * Card props
 */
export interface CardProps extends BaseComponentProps {
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * Stats card props
 */
export interface StatsCardProps extends BaseComponentProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

// ============================================================================
// Navigation Component Types
// ============================================================================

/**
 * Navigation item
 */
export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
  children?: NavItem[];
}

/**
 * Tabs props
 */
export interface TabsProps extends BaseComponentProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
    content: ReactNode;
  }>;
  activeTab?: string;
  defaultActiveTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

/**
 * Breadcrumbs props
 */
export interface BreadcrumbsProps extends BaseComponentProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  maxItems?: number;
}

/**
 * Pagination props
 */
export interface PaginationProps extends BaseComponentProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  maxVisiblePages?: number;
}

// ============================================================================
// Feedback Component Types
// ============================================================================

/**
 * Alert variant
 */
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

/**
 * Alert props
 */
export interface AlertProps extends BaseComponentProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  icon?: ReactNode;
  closable?: boolean;
  onClose?: () => void;
  action?: ReactNode;
}

/**
 * Progress bar props
 */
export interface ProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  striped?: boolean;
  animated?: boolean;
}

/**
 * Skeleton loader props
 */
export interface SkeletonProps extends BaseComponentProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Spinner props
 */
export interface SpinnerProps extends BaseComponentProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary';
  label?: string;
}

// ============================================================================
// Overlay Component Types
// ============================================================================

/**
 * Tooltip props
 */
export interface TooltipProps extends BaseComponentProps {
  content: ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: 'hover' | 'click' | 'focus';
  delay?: number;
  children: ReactNode;
}

/**
 * Popover props
 */
export interface PopoverProps extends BaseComponentProps {
  content: ReactNode;
  title?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: 'hover' | 'click' | 'focus';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Dropdown menu item
 */
export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
  children?: DropdownMenuItem[];
  onClick?: () => void;
}

/**
 * Dropdown menu props
 */
export interface DropdownMenuProps extends BaseComponentProps {
  items: DropdownMenuItem[];
  trigger: ReactNode;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  onItemClick?: (itemId: string) => void;
}

// ============================================================================
// Layout Component Types
// ============================================================================

/**
 * Container props
 */
export interface ContainerProps extends BaseComponentProps {
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
  children: ReactNode;
}

/**
 * Grid props
 */
export interface GridProps extends BaseComponentProps {
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number | string;
  children: ReactNode;
}

/**
 * Stack props (flexbox)
 */
export interface StackProps extends BaseComponentProps {
  direction?: 'row' | 'column';
  spacing?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  children: ReactNode;
}

/**
 * Divider props
 */
export interface DividerProps extends BaseComponentProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  labelPosition?: 'left' | 'center' | 'right';
}

// ============================================================================
// Data Display Component Types
// ============================================================================

/**
 * Badge props
 */
export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  children: ReactNode;
}

/**
 * Tag props (similar to badge but closable)
 */
export interface TagProps extends BadgeProps {
  closable?: boolean;
  onClose?: () => void;
  icon?: ReactNode;
}

/**
 * Avatar props
 */
export interface AvatarProps extends BaseComponentProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  shape?: 'circle' | 'square';
}

/**
 * Empty state props
 */
export interface EmptyStateProps extends BaseComponentProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

// ============================================================================
// Database-Specific Component Types
// ============================================================================

/**
 * Column editor props
 */
export interface ColumnEditorProps extends FormFieldProps {
  columnType: ColumnType;
  value: ColumnValue;
  onChange: (value: ColumnValue) => void;
  config?: Record<string, unknown>;
}

/**
 * Database selector props
 */
export interface DatabaseSelectorProps extends BaseComponentProps {
  value?: string;
  onChange: (databaseId: string) => void;
  placeholder?: string;
  filter?: (database: { id: string; name: string }) => boolean;
}

/**
 * Import wizard step
 */
export interface ImportWizardStep {
  id: string;
  title: string;
  description?: string;
  component: ReactNode;
  validate?: () => boolean | Promise<boolean>;
}

/**
 * Import wizard props
 */
export interface ImportWizardProps extends BaseComponentProps {
  steps: ImportWizardStep[];
  currentStep?: number;
  onComplete: () => void;
  onCancel: () => void;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if component has loading state
 */
export function hasLoadingState(props: unknown): props is LoadingProps {
  return typeof props === 'object' && props !== null && 'loading' in props;
}

/**
 * Check if component has error state
 */
export function hasErrorState(props: unknown): props is ErrorProps {
  return typeof props === 'object' && props !== null && 'error' in props;
}

/**
 * Check if component is disabled
 */
export function isDisabled(props: unknown): props is DisableableProps {
  return typeof props === 'object' && props !== null && 'disabled' in props && (props as DisableableProps).disabled === true;
}
