import { useEffect, useRef } from 'react';
import { GeneratedSchema, StepId } from './types';
import { toast } from 'sonner';

interface SchemaAutoSaveData {
  step: StepId;
  inputType: 'text' | 'json' | 'csv';
  textInput: string;
  generatedSchema: GeneratedSchema | null;
  savedAt: string;
}

interface UseSchemaAutoSaveProps {
  projectId: string;
  step: StepId;
  inputType: 'text' | 'json' | 'csv';
  textInput: string;
  generatedSchema: GeneratedSchema | null;
  enabled?: boolean;
}

/**
 * Auto-save schema generator state to localStorage
 */
export function useSchemaAutoSave({
  projectId,
  step,
  inputType,
  textInput,
  generatedSchema,
  enabled = true,
}: UseSchemaAutoSaveProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Generate storage key
  const storageKey = `schema-generator-${projectId}`;

  // Save data to localStorage
  const saveData = () => {
    if (!enabled) return;

    const dataToSave: SchemaAutoSaveData = {
      step,
      inputType,
      textInput,
      generatedSchema,
      savedAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(dataToSave);

    // Only save if data has changed
    if (serialized === lastSavedRef.current) {
      return;
    }

    try {
      localStorage.setItem(storageKey, serialized);
      lastSavedRef.current = serialized;
      console.log('[AutoSave] Schema generator state saved');
    } catch (error) {
      console.error('[AutoSave] Failed to save:', error);
      toast.error('Не удалось сохранить прогресс');
    }
  };

  // Load data from localStorage
  const loadData = (): SchemaAutoSaveData | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const data: SchemaAutoSaveData = JSON.parse(saved);

      // Check if data is not too old (24 hours)
      const savedAt = new Date(data.savedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        console.log('[AutoSave] Saved data is too old, clearing');
        clearData();
        return null;
      }

      console.log('[AutoSave] Loaded saved state from', savedAt.toLocaleString());
      return data;
    } catch (error) {
      console.error('[AutoSave] Failed to load:', error);
      return null;
    }
  };

  // Clear saved data
  const clearData = () => {
    try {
      localStorage.removeItem(storageKey);
      lastSavedRef.current = '';
      console.log('[AutoSave] Cleared saved state');
    } catch (error) {
      console.error('[AutoSave] Failed to clear:', error);
    }
  };

  // Auto-save effect with debounce
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save (save after 2 seconds of inactivity)
    saveTimeoutRef.current = setTimeout(() => {
      saveData();
    }, 2000);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [step, inputType, textInput, generatedSchema, enabled]);

  // Save before unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      saveData();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step, inputType, textInput, generatedSchema, enabled]);

  return {
    loadData,
    clearData,
    saveData,
  };
}
