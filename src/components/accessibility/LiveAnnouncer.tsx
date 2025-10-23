/**
 * LiveAnnouncer - ARIA live region for screen reader announcements
 * Announces dynamic content changes to screen reader users
 */

import { useEffect, useRef } from 'react';

export type AnnouncementPriority = 'polite' | 'assertive';

interface LiveAnnouncerProps {
  message: string;
  priority?: AnnouncementPriority;
  clearAfter?: number; // Clear message after X milliseconds
}

/**
 * LiveAnnouncer component
 * Renders an ARIA live region that announces messages to screen readers
 */
export function LiveAnnouncer({
  message,
  priority = 'polite',
  clearAfter = 0
}: LiveAnnouncerProps) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (clearAfter > 0 && message) {
      timeoutRef.current = setTimeout(() => {
        // Message will be cleared by parent component
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Global LiveAnnouncer that can be controlled via context
 * Place this once at the root of your app
 */
export function GlobalLiveAnnouncer() {
  const { message, priority } = useAnnouncements();

  return <LiveAnnouncer message={message} priority={priority} />;
}

// Hook for announcements
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AnnouncementContextType {
  message: string;
  priority: AnnouncementPriority;
  announce: (message: string, priority?: AnnouncementPriority) => void;
  clear: () => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('polite');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((newMessage: string, newPriority: AnnouncementPriority = 'polite') => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new message
    setMessage(newMessage);
    setPriority(newPriority);

    // Auto-clear after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setMessage('');
    }, 5000);
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMessage('');
  }, []);

  return (
    <AnnouncementContext.Provider value={{ message, priority, announce, clear }}>
      {children}
      <GlobalLiveAnnouncer />
    </AnnouncementContext.Provider>
  );
}

export function useAnnounce() {
  const context = useContext(AnnouncementContext);
  if (context === undefined) {
    throw new Error('useAnnounce must be used within AnnouncementProvider');
  }
  return context.announce;
}

export function useAnnouncements() {
  const context = useContext(AnnouncementContext);
  if (context === undefined) {
    throw new Error('useAnnouncements must be used within AnnouncementProvider');
  }
  return context;
}
