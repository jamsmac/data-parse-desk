import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export interface HistoryEntry {
  id: string;
  action: 'update' | 'delete' | 'create';
  tableName: string;
  rowId: string;
  columnName?: string;
  before: any;
  after: any;
  timestamp: number;
}

const MAX_HISTORY_SIZE = 50;

export const useUndoRedo = (databaseId?: string) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const { toast } = useToast();

  // Load history from localStorage on mount
  useEffect(() => {
    if (!databaseId) return;

    const storageKey = `undo_history_${databaseId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHistory(parsed.history || []);
        setCurrentIndex(parsed.currentIndex ?? -1);
      } catch (error) {
        console.error('Failed to parse undo history:', error);
      }
    }
  }, [databaseId]);

  // Save history to localStorage on changes
  useEffect(() => {
    if (!databaseId || history.length === 0) return;

    const storageKey = `undo_history_${databaseId}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        history,
        currentIndex,
      })
    );
  }, [history, currentIndex, databaseId]);

  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // Remove any entries after current index (when adding new action after undo)
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newEntry);

      // Keep only last MAX_HISTORY_SIZE entries
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(-MAX_HISTORY_SIZE);
      }

      return newHistory;
    });

    setCurrentIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex >= MAX_HISTORY_SIZE ? MAX_HISTORY_SIZE - 1 : newIndex;
    });
  }, [currentIndex]);

  const undo = useCallback(async () => {
    if (currentIndex < 0 || !history[currentIndex]) {
      toast({
        title: 'Нечего отменять',
        variant: 'destructive',
      });
      return;
    }

    const entry = history[currentIndex];

    try {
      // Perform undo operation based on action type
      switch (entry.action) {
        case 'update':
          await supabase.rpc('update_table_row', {
            p_id: entry.rowId,
            p_data: entry.before,
          });
          break;

        case 'delete':
          // Restore deleted row
          await supabase.rpc('insert_table_row', {
            p_database_id: entry.tableName,
            p_data: entry.before,
          });
          break;

        case 'create':
          // Delete created row
          await supabase.rpc('delete_table_row', {
            p_id: entry.rowId,
          });
          break;
      }

      setCurrentIndex((prev) => prev - 1);

      // Show toast with redo option
      const actionText = {
        update: 'Изменение отменено',
        delete: 'Удаление отменено',
        create: 'Создание отменено',
      }[entry.action];

      toast({
        title: actionText,
        description: entry.columnName
          ? `${entry.columnName}: ${JSON.stringify(entry.after)} → ${JSON.stringify(entry.before)}`
          : undefined,
        action: (
          <Button variant="outline" size="sm" onClick={redo}>
            Вернуть
          </Button>
        ),
      });
    } catch (error: any) {
      console.error('Undo failed:', error);
      toast({
        title: 'Ошибка отмены',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [currentIndex, history, toast]);

  const redo = useCallback(async () => {
    if (currentIndex >= history.length - 1) {
      toast({
        title: 'Нечего возвращать',
        variant: 'destructive',
      });
      return;
    }

    const entry = history[currentIndex + 1];

    try {
      // Perform redo operation
      switch (entry.action) {
        case 'update':
          await supabase.rpc('update_table_row', {
            p_id: entry.rowId,
            p_data: entry.after,
          });
          break;

        case 'delete':
          // Re-delete row
          await supabase.rpc('delete_table_row', {
            p_id: entry.rowId,
          });
          break;

        case 'create':
          // Re-create row
          await supabase.rpc('insert_table_row', {
            p_database_id: entry.tableName,
            p_data: entry.after,
          });
          break;
      }

      setCurrentIndex((prev) => prev + 1);

      const actionText = {
        update: 'Изменение возвращено',
        delete: 'Удаление возвращено',
        create: 'Создание возвращено',
      }[entry.action];

      toast({
        title: actionText,
        description: entry.columnName
          ? `${entry.columnName}: ${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}`
          : undefined,
      });
    } catch (error: any) {
      console.error('Redo failed:', error);
      toast({
        title: 'Ошибка возврата',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [currentIndex, history, toast]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    if (databaseId) {
      localStorage.removeItem(`undo_history_${databaseId}`);
    }
  }, [databaseId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Check if we're in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.shiftKey && e.key === 'z'))
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [undo, redo]);

  return {
    undo,
    redo,
    addToHistory,
    clearHistory,
    canUndo: currentIndex >= 0,
    canRedo: currentIndex < history.length - 1,
    historyLength: history.length,
    currentIndex,
  };
};
