import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useKeyboardNavigation } from '../useKeyboardNavigation';

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue('test'),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

describe('useKeyboardNavigation', () => {
  const defaultOptions = {
    rowCount: 10,
    columnCount: 5,
    enabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with null focusedCell', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      expect(result.current.focusedCell).toBeNull();
      expect(result.current.selectedCells).toEqual([]);
    });

    it('should provide containerRef', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBeNull(); // No DOM yet
    });

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      expect(typeof result.current.focusCell).toBe('function');
      expect(typeof result.current.handleCellClick).toBe('function');
      expect(typeof result.current.isCellFocused).toBe('function');
      expect(typeof result.current.isCellSelected).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
    });
  });

  describe('Focus management', () => {
    it('should focus a valid cell', () => {
      const onCellSelect = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCellSelect })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 3 });
      expect(onCellSelect).toHaveBeenCalledWith({ rowIndex: 2, columnIndex: 3 });
    });

    it('should not focus a cell outside row bounds', () => {
      const onCellSelect = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCellSelect })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 15, columnIndex: 2 }); // rowCount is 10
      });

      expect(result.current.focusedCell).toBeNull();
      expect(onCellSelect).not.toHaveBeenCalled();
    });

    it('should not focus a cell outside column bounds', () => {
      const onCellSelect = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCellSelect })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 10 }); // columnCount is 5
      });

      expect(result.current.focusedCell).toBeNull();
      expect(onCellSelect).not.toHaveBeenCalled();
    });

    it('should not focus negative row index', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: -1, columnIndex: 2 });
      });

      expect(result.current.focusedCell).toBeNull();
    });

    it('should not focus negative column index', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: -1 });
      });

      expect(result.current.focusedCell).toBeNull();
    });
  });

  describe('Cell click handler', () => {
    it('should focus cell on click', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.handleCellClick({ rowIndex: 3, columnIndex: 1 });
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 3, columnIndex: 1 });
    });
  });

  describe('Cell state checkers', () => {
    it('should correctly identify focused cell', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      expect(result.current.isCellFocused({ rowIndex: 2, columnIndex: 3 })).toBe(true);
      expect(result.current.isCellFocused({ rowIndex: 2, columnIndex: 2 })).toBe(false);
      expect(result.current.isCellFocused({ rowIndex: 1, columnIndex: 3 })).toBe(false);
    });

    it('should correctly identify selected cells', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      // Focus first cell
      act(() => {
        result.current.focusCell({ rowIndex: 0, columnIndex: 0 });
      });

      // Simulate Shift+ArrowRight to select
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isCellSelected({ rowIndex: 0, columnIndex: 1 })).toBe(true);
      expect(result.current.isCellSelected({ rowIndex: 0, columnIndex: 2 })).toBe(false);
    });
  });

  describe('Clear selection', () => {
    it('should clear focused cell and selection', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      expect(result.current.focusedCell).not.toBeNull();

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.focusedCell).toBeNull();
      expect(result.current.selectedCells).toEqual([]);
    });
  });

  describe('Arrow key navigation', () => {
    it('should move down with ArrowDown', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 3, columnIndex: 3 });
    });

    it('should move up with ArrowUp', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, columnIndex: 3 });
    });

    it('should move right with ArrowRight', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 1 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 2 });
    });

    it('should move left with ArrowLeft', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 2 });
    });

    it('should not move up from first row', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 0, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 0, columnIndex: 3 });
    });

    it('should not move down from last row', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 9, columnIndex: 3 }); // rowCount is 10
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 9, columnIndex: 3 });
    });

    it('should not move left from first column', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 0 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 0 });
    });

    it('should not move right from last column', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 4 }); // columnCount is 5
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 4 });
    });

    it('should start from top-left if no cell is focused', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 0, columnIndex: 0 });
    });
  });

  describe('Arrow keys with Shift (selection)', () => {
    it('should select cell when moving with Shift+ArrowRight', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 0, columnIndex: 0 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 0, columnIndex: 1 });
      expect(result.current.selectedCells).toContainEqual({ rowIndex: 0, columnIndex: 1 });
    });

    it('should extend selection with multiple Shift+Arrow presses', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 0, columnIndex: 0 });
      });

      // Shift+Right
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      // Shift+Right again
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.selectedCells).toHaveLength(2);
      expect(result.current.selectedCells).toContainEqual({ rowIndex: 0, columnIndex: 1 });
      expect(result.current.selectedCells).toContainEqual({ rowIndex: 0, columnIndex: 2 });
    });

    it('should clear selection when moving without Shift', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 0, columnIndex: 0 });
      });

      // Shift+Right to select
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.selectedCells).toHaveLength(1);

      // Right without Shift (should clear selection)
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.selectedCells).toHaveLength(0);
    });
  });

  describe('Tab navigation', () => {
    it('should move to next column with Tab', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 1 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 2 });
    });

    it('should move to previous column with Shift+Tab', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 2 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 1 });
    });

    it('should wrap to next row when Tab at last column', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 4 }); // Last column
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 3, columnIndex: 0 });
    });

    it('should wrap to previous row when Shift+Tab at first column', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 0 }); // First column
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 1, columnIndex: 4 });
    });

    it('should not wrap beyond last row with Tab', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 9, columnIndex: 4 }); // Last cell
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 9, columnIndex: 4 });
    });

    it('should not wrap beyond first row with Shift+Tab', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 0, columnIndex: 0 }); // First cell
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 0, columnIndex: 0 });
    });
  });

  describe('Enter and Escape keys', () => {
    it('should call onCellEdit when Enter is pressed', () => {
      const onCellEdit = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCellEdit })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(onCellEdit).toHaveBeenCalledWith({ rowIndex: 2, columnIndex: 3 });
    });

    it('should not call onCellEdit when Enter is pressed while editing', () => {
      const onCellEdit = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCellEdit, isEditing: true })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(onCellEdit).not.toHaveBeenCalled();
    });

    it('should call onCancelEdit when Escape is pressed while editing', () => {
      const onCancelEdit = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCancelEdit, isEditing: true })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(onCancelEdit).toHaveBeenCalled();
    });

    it('should clear selection when Escape is pressed while not editing', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, isEditing: false })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      expect(result.current.focusedCell).not.toBeNull();

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toBeNull();
      expect(result.current.selectedCells).toEqual([]);
    });
  });

  describe('Home and End keys', () => {
    it('should move to first column with Home', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 0 });
    });

    it('should move to last column with End', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 1 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 4 });
    });

    it('should move to first cell with Ctrl+Home', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 5, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Home',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 0, columnIndex: 0 });
    });

    it('should move to last cell with Ctrl+End', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 1 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'End',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 9, columnIndex: 4 });
    });

    it('should move to first cell with Cmd+Home (Mac)', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 5, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Home',
          metaKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 0, columnIndex: 0 });
    });

    it('should move to last cell with Cmd+End (Mac)', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 1 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'End',
          metaKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toEqual({ rowIndex: 9, columnIndex: 4 });
    });
  });

  describe('Copy and Paste (Ctrl+C, Ctrl+V)', () => {
    it('should call onCopy when Ctrl+C is pressed', () => {
      const onCopy = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCopy })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(onCopy).toHaveBeenCalledWith({ rowIndex: 2, columnIndex: 3 });
    });

    it('should call onCopy when Cmd+C is pressed (Mac)', () => {
      const onCopy = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCopy })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'c',
          metaKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(onCopy).toHaveBeenCalledWith({ rowIndex: 2, columnIndex: 3 });
    });

    it('should not call onCopy when copying while editing', () => {
      const onCopy = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCopy, isEditing: true })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(onCopy).not.toHaveBeenCalled();
    });

    it('should call onPaste when Ctrl+V is pressed', async () => {
      const onPaste = vi.fn();
      mockClipboard.readText.mockResolvedValue('pasted text');

      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onPaste })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'v',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(onPaste).toHaveBeenCalledWith({ rowIndex: 2, columnIndex: 3 }, 'pasted text');
      });
    });

    it('should not call onPaste when pasting while editing', () => {
      const onPaste = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onPaste, isEditing: true })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'v',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(onPaste).not.toHaveBeenCalled();
    });
  });

  describe('Select All (Ctrl+A)', () => {
    it('should select all cells when Ctrl+A is pressed', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({ rowCount: 3, columnCount: 2, enabled: true })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.selectedCells).toHaveLength(6); // 3 rows * 2 columns
      expect(result.current.selectedCells).toContainEqual({ rowIndex: 0, columnIndex: 0 });
      expect(result.current.selectedCells).toContainEqual({ rowIndex: 2, columnIndex: 1 });
    });

    it('should select all cells when Cmd+A is pressed (Mac)', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({ rowCount: 2, columnCount: 2, enabled: true })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'a',
          metaKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.selectedCells).toHaveLength(4);
    });

    it('should not select all when Ctrl+A is pressed while editing', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({ rowCount: 2, columnCount: 2, enabled: true, isEditing: true })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.selectedCells).toHaveLength(0);
    });
  });

  describe('Disabled state', () => {
    it('should not respond to keyboard events when disabled', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, enabled: false })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toBeNull();
    });
  });

  describe('Event filtering', () => {
    it('should not handle events from input elements', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      const input = document.createElement('input');
      document.body.appendChild(input);

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: input, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toBeNull();

      document.body.removeChild(input);
    });

    it('should not handle events from textarea elements', () => {
      const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: textarea, enumerable: true });
        window.dispatchEvent(event);
      });

      expect(result.current.focusedCell).toBeNull();

      document.body.removeChild(textarea);
    });

    it('should ignore most keys while editing (except Escape)', () => {
      const onCellEdit = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ ...defaultOptions, onCellEdit, isEditing: true })
      );

      act(() => {
        result.current.focusCell({ rowIndex: 2, columnIndex: 3 });
      });

      // Try arrow key while editing - should be ignored
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
        window.dispatchEvent(event);
      });

      // Position should not change
      expect(result.current.focusedCell).toEqual({ rowIndex: 2, columnIndex: 3 });

      // Enter while editing - should be ignored
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        window.dispatchEvent(event);
      });

      expect(onCellEdit).not.toHaveBeenCalled();
    });
  });
});
