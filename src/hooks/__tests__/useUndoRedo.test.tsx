import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-123';
Object.defineProperty(global.crypto, 'randomUUID', {
  value: () => mockUUID,
  writable: true,
});

describe('useUndoRedo', () => {
  const mockDatabaseId = 'test-db-123';
  const storageKey = `undo_history_${mockDatabaseId}`;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with empty history', () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      expect(result.current.historyLength).toBe(0);
      expect(result.current.currentIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('should load history from localStorage', () => {
      const storedHistory = {
        history: [
          {
            id: 'test-1',
            action: 'update' as const,
            tableName: 'test_table',
            rowId: 'row-1',
            columnName: 'name',
            before: 'old',
            after: 'new',
            timestamp: Date.now(),
          },
        ],
        currentIndex: 0,
      };

      localStorage.setItem(storageKey, JSON.stringify(storedHistory));

      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      expect(result.current.historyLength).toBe(1);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.canUndo).toBe(true);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem(storageKey, 'invalid-json');

      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      // Should fallback to empty history
      expect(result.current.historyLength).toBe(0);
      expect(result.current.currentIndex).toBe(-1);
    });
  });

  describe('addToHistory', () => {
    it('should add entry to history', () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          columnName: 'name',
          before: 'old',
          after: 'new',
        });
      });

      expect(result.current.historyLength).toBe(1);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should remove future history when adding after undo', async () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      // Add three entries
      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'a',
          after: 'b',
        });
      });

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-2',
          before: 'c',
          after: 'd',
        });
      });

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-3',
          before: 'e',
          after: 'f',
        });
      });

      expect(result.current.historyLength).toBe(3);
      expect(result.current.currentIndex).toBe(2);

      // Undo twice
      await act(async () => {
        await result.current.undo();
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.currentIndex).toBe(0);

      // Add new entry - should remove the undone entries
      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-4',
          before: 'g',
          after: 'h',
        });
      });

      expect(result.current.historyLength).toBe(2);
      expect(result.current.currentIndex).toBe(1);
    });

    it('should limit history size to MAX_HISTORY_SIZE', () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      // Add 51 entries (MAX is 50) one by one
      for (let i = 0; i < 51; i++) {
        act(() => {
          result.current.addToHistory({
            action: 'update',
            tableName: 'test_table',
            rowId: `row-${i}`,
            before: i,
            after: i + 1,
          });
        });
      }

      // Should keep only last 50
      expect(result.current.historyLength).toBe(50);
      expect(result.current.currentIndex).toBe(49);
    });

    it('should generate unique ID and timestamp', () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));
      const beforeTime = Date.now();

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      const afterTime = Date.now();

      // Verify stored data (via localStorage)
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      expect(stored.history[0].id).toBe(mockUUID);
      expect(stored.history[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(stored.history[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('undo', () => {
    it('should undo update action', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          columnName: 'name',
          before: 'old',
          after: 'new',
        });
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(supabase.rpc).toHaveBeenCalledWith('update_table_row', {
        p_id: 'row-1',
        p_data: 'old',
      });

      expect(result.current.currentIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('should undo delete action', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'delete',
          tableName: 'test_table',
          rowId: 'row-1',
          before: { name: 'test' },
          after: null,
        });
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(supabase.rpc).toHaveBeenCalledWith('insert_table_row', {
        p_database_id: 'test_table',
        p_data: { name: 'test' },
      });
    });

    it('should undo create action', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'create',
          tableName: 'test_table',
          rowId: 'row-1',
          before: null,
          after: { name: 'test' },
        });
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(supabase.rpc).toHaveBeenCalledWith('delete_table_row', {
        p_id: 'row-1',
      });
    });

    it('should not undo when history is empty', async () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      await act(async () => {
        await result.current.undo();
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result.current.currentIndex).toBe(-1);
    });
  });

  describe('redo', () => {
    it('should redo update action', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      // Undo first
      await act(async () => {
        await result.current.undo();
      });

      vi.clearAllMocks();

      // Then redo
      await act(async () => {
        await result.current.redo();
      });

      expect(supabase.rpc).toHaveBeenCalledWith('update_table_row', {
        p_id: 'row-1',
        p_data: 'new',
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should not redo when at end of history', async () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      await act(async () => {
        await result.current.redo();
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('clearHistory', () => {
    it('should clear history and localStorage', () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      expect(result.current.historyLength).toBe(1);
      expect(localStorage.getItem(storageKey)).toBeTruthy();

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.historyLength).toBe(0);
      expect(result.current.currentIndex).toBe(-1);
      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });

  describe('Keyboard shortcuts', () => {
    it('should trigger undo on Ctrl+Z', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });

      await act(async () => {
        window.dispatchEvent(event);
        await waitFor(() => {
          expect(supabase.rpc).toHaveBeenCalled();
        });
      });
    });

    it('should trigger redo on Ctrl+Y', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      await act(async () => {
        await result.current.undo();
      });

      vi.clearAllMocks();

      const event = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true,
      });

      await act(async () => {
        window.dispatchEvent(event);
        await waitFor(() => {
          expect(supabase.rpc).toHaveBeenCalled();
        });
      });
    });

    it('should not trigger shortcuts in input fields', () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });

      Object.defineProperty(event, 'target', {
        value: input,
        writable: false,
      });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(supabase.rpc).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe('LocalStorage persistence', () => {
    it('should save history to localStorage on changes', () => {
      const { result } = renderHook(() => useUndoRedo(mockDatabaseId));

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.history).toHaveLength(1);
      expect(parsed.currentIndex).toBe(0);
      expect(parsed.history[0].action).toBe('update');
    });

    it('should not save when databaseId is not provided', () => {
      const { result } = renderHook(() => useUndoRedo());

      act(() => {
        result.current.addToHistory({
          action: 'update',
          tableName: 'test_table',
          rowId: 'row-1',
          before: 'old',
          after: 'new',
        });
      });

      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });
});
