import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAIChat } from './useAIChat';

// Mock fetch
global.fetch = vi.fn();

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        data: { id: 'test-id' },
        error: null,
      })),
    })),
    auth: {
      getSession: vi.fn(() => ({
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      })),
    },
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useAIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() =>
      useAIChat('conversation-id', 'database-id', 'project-id')
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should add user message when sending', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: () =>
              Promise.resolve({
                done: true,
                value: new Uint8Array(),
              }),
          }),
        },
      } as any)
    );

    global.fetch = mockFetch;

    const { result } = renderHook(() =>
      useAIChat('conversation-id', 'database-id', 'project-id')
    );

    await waitFor(() => {
      result.current.sendMessage('Hello AI');
    });

    expect(result.current.messages.some((m) => m.content === 'Hello AI')).toBe(
      true
    );
  });

  it('should not send empty messages', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const { result } = renderHook(() =>
      useAIChat('conversation-id', 'database-id', 'project-id')
    );

    await result.current.sendMessage('   ');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle cancel request', () => {
    const { result } = renderHook(() =>
      useAIChat('conversation-id', 'database-id', 'project-id')
    );

    // Should not throw error even if no request is running
    expect(() => result.current.cancelRequest()).not.toThrow();
  });
});
