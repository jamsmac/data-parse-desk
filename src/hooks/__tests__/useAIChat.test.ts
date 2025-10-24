import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAIChat } from '../useAIChat';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock fetch for SSE streaming
global.fetch = vi.fn();

describe('useAIChat', () => {
  const mockConversationId = 'conv-123';
  const mockDatabaseId = 'db-456';
  const mockProjectId = 'proj-789';
  const mockAccessToken = 'mock-token';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth session
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          access_token: mockAccessToken,
          user: { id: 'user-123' },
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useAIChat(mockConversationId));

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.toolResults).toEqual([]);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useAIChat(mockConversationId));

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.cancelRequest).toBe('function');
      expect(typeof result.current.loadMessages).toBe('function');
    });
  });

  describe('loadMessages', () => {
    it('should load messages from database', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          created_at: '2024-01-01T00:01:00Z',
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockMessages,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.loadMessages();
      });

      await waitFor(() => {
        expect(result.current.messages).toEqual(mockMessages);
      });

      expect(supabase.from).toHaveBeenCalledWith('ai_messages');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('conversation_id', mockConversationId);
    });

    it('should handle load errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.loadMessages();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.current.messages).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('sendMessage', () => {
    it('should not send empty messages', async () => {
      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should add user message optimistically', async () => {
      // Mock successful fetch with empty stream
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Hello AI');
      });

      await waitFor(() => {
        const messages = result.current.messages;
        expect(messages.length).toBeGreaterThan(0);
        expect(messages[0].role).toBe('user');
        expect(messages[0].content).toBe('Hello AI');
      });
    });

    it('should create assistant message with streaming', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"content","content":"Hello"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      await waitFor(() => {
        const messages = result.current.messages;
        expect(messages.length).toBe(2); // User + assistant
        expect(messages[1].role).toBe('assistant');
        expect(messages[1].content).toContain('Hello');
      });
    });

    it('should handle tool execution events', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"tools","message":"Executing query"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"tool_result","tool":"execute_sql_query","result":{"count":10}}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId, mockDatabaseId));

      await act(async () => {
        await result.current.sendMessage('Run query');
      });

      await waitFor(() => {
        expect(result.current.toolResults.length).toBeGreaterThan(0);
        expect(result.current.toolResults[0].tool).toBe('execute_sql_query');
      });
    });

    it('should handle tool errors', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"tool_error","error":"Query failed"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
        expect(assistantMessage?.content).toContain('Error: Query failed');
      });
    });

    it('should handle authentication errors', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
        expect(assistantMessage?.content).toContain('Failed to process request');
      });
    });

    it('should include context in request', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() =>
        useAIChat(mockConversationId, mockDatabaseId, mockProjectId)
      );

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining(mockDatabaseId),
          })
        );
      });
    });
  });

  describe('cancelRequest', () => {
    it('should cancel ongoing request', async () => {
      const mockAbort = vi.fn();
      global.AbortController = vi.fn(() => ({
        abort: mockAbort,
        signal: {} as AbortSignal,
      })) as any;

      const mockReader = {
        read: vi.fn().mockImplementation(() =>
          new Promise(() => {}) // Never resolves
        ),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      act(() => {
        result.current.sendMessage('Test');
      });

      act(() => {
        result.current.cancelRequest();
      });

      await waitFor(() => {
        expect(mockAbort).toHaveBeenCalled();
      });
    });

    it('should do nothing when no request is active', () => {
      const { result } = renderHook(() => useAIChat(mockConversationId));

      expect(() => {
        result.current.cancelRequest();
      }).not.toThrow();
    });
  });

  describe('SSE Stream parsing', () => {
    it('should handle malformed JSON gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {invalid json}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should skip comment lines', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(': This is a comment\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"content","content":"Hello"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
        expect(assistantMessage?.content).toBe('Hello');
      });
    });

    it('should handle chart creation tool result', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"tool_result","tool":"create_chart","result":{"name":"Sales Chart"}}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Create chart');
      });

      await waitFor(() => {
        const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
        expect(assistantMessage?.content).toContain('Sales Chart');
      });
    });

    it('should handle aggregate data tool result', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"tool_result","tool":"aggregate_data","result":{"operation":"SUM","result":1000}}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Aggregate');
      });

      await waitFor(() => {
        const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
        expect(assistantMessage?.content).toContain('SUM: 1000');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle missing response body', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: null,
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle buffer overflow in SSE parsing', async () => {
      const longContent = 'x'.repeat(10000);

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(`data: {"type":"content","content":"${longContent}"}\n`),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        const assistantMessage = result.current.messages.find(m => m.role === 'assistant');
        expect(assistantMessage?.content).toContain(longContent);
      });
    });

    it('should set loading state correctly during request', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const { result } = renderHook(() => useAIChat(mockConversationId));

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.sendMessage('Test');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
