import { createContext, useContext, ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';

/**
 * Options for displaying notifications
 */
export interface NotificationOptions {
  /** Additional description text shown below the main message */
  description?: string;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Duration in milliseconds before the notification auto-dismisses */
  duration?: number;
  /** Whether the notification is important (stays visible longer) */
  important?: boolean;
}

/**
 * Context type for the notification system
 */
export interface NotificationContextType {
  /** Display a success notification */
  success: (message: string, options?: NotificationOptions) => void;
  /** Display an error notification */
  error: (message: string, options?: NotificationOptions) => void;
  /** Display an info notification */
  info: (message: string, options?: NotificationOptions) => void;
  /** Display a warning notification */
  warning: (message: string, options?: NotificationOptions) => void;
  /** Display a loading notification and return its ID for later updates */
  loading: (message: string, options?: NotificationOptions) => string | number;
  /** Dismiss a specific notification by ID, or all notifications if no ID provided */
  dismiss: (toastId?: string | number) => void;
  /** Display notifications based on promise state (loading -> success/error) */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => Promise<T>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Converts NotificationOptions to sonner-compatible options
 */
function convertOptions(options?: NotificationOptions) {
  if (!options) return undefined;

  return {
    description: options.description,
    action: options.action,
    duration: options.important ? Infinity : options.duration,
  };
}

/**
 * Provider component that wraps the notification system
 * Uses sonner library under the hood for toast notifications
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const success = (message: string, options?: NotificationOptions) => {
    sonnerToast.success(message, convertOptions(options));
  };

  const error = (message: string, options?: NotificationOptions) => {
    sonnerToast.error(message, convertOptions(options));
  };

  const info = (message: string, options?: NotificationOptions) => {
    sonnerToast.info(message, convertOptions(options));
  };

  const warning = (message: string, options?: NotificationOptions) => {
    sonnerToast.warning(message, convertOptions(options));
  };

  const loading = (message: string, options?: NotificationOptions): string | number => {
    return sonnerToast.loading(message, convertOptions(options));
  };

  const dismiss = (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  };

  const promise = <T,>(
    promiseToResolve: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> => {
    return sonnerToast.promise(promiseToResolve, messages);
  };

  const value: NotificationContextType = {
    success,
    error,
    info,
    warning,
    loading,
    dismiss,
    promise,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access the notification system
 * @throws Error if used outside of NotificationProvider
 * @example
 * const notifications = useNotification();
 * notifications.success('Operation completed successfully');
 * notifications.error('Something went wrong', { description: 'Please try again' });
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
