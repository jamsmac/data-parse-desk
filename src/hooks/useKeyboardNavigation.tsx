import { useState, useEffect, useCallback, useRef } from 'react';

export interface CellPosition {
  rowIndex: number;
  columnIndex: number;
}

export interface KeyboardNavigationOptions {
  rowCount: number;
  columnCount: number;
  onCellEdit?: (position: CellPosition) => void;
  onCellSelect?: (position: CellPosition) => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  onCopy?: (position: CellPosition) => void;
  onPaste?: (position: CellPosition, data: string) => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  rowCount,
  columnCount,
  onCellEdit,
  onCellSelect,
  isEditing = false,
  onCancelEdit,
  onCopy,
  onPaste,
  enabled = true,
}: KeyboardNavigationOptions) {
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const clipboardRef = useRef<string>('');

  // Focus a specific cell
  const focusCell = useCallback((position: CellPosition) => {
    if (position.rowIndex < 0 || position.rowIndex >= rowCount) return;
    if (position.columnIndex < 0 || position.columnIndex >= columnCount) return;

    setFocusedCell(position);
    onCellSelect?.(position);

    // Scroll to cell if needed
    if (containerRef.current) {
      const cell = containerRef.current.querySelector(
        `[data-row="${position.rowIndex}"][data-col="${position.columnIndex}"]`
      ) as HTMLElement;

      if (cell) {
        cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        cell.focus();
      }
    }
  }, [rowCount, columnCount, onCellSelect]);

  // Navigate with arrow keys
  const handleArrowKey = useCallback((direction: 'up' | 'down' | 'left' | 'right', shiftKey: boolean) => {
    if (!focusedCell) {
      // Start from top-left if no cell is focused
      focusCell({ rowIndex: 0, columnIndex: 0 });
      return;
    }

    const { rowIndex, columnIndex } = focusedCell;
    const newPosition = { ...focusedCell };

    switch (direction) {
      case 'up':
        newPosition.rowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'down':
        newPosition.rowIndex = Math.min(rowCount - 1, rowIndex + 1);
        break;
      case 'left':
        newPosition.columnIndex = Math.max(0, columnIndex - 1);
        break;
      case 'right':
        newPosition.columnIndex = Math.min(columnCount - 1, columnIndex + 1);
        break;
    }

    focusCell(newPosition);

    // Handle selection with Shift
    if (shiftKey) {
      setSelectedCells(prev => {
        const exists = prev.some(
          p => p.rowIndex === newPosition.rowIndex && p.columnIndex === newPosition.columnIndex
        );
        if (!exists) {
          return [...prev, newPosition];
        }
        return prev;
      });
    } else {
      setSelectedCells([]);
    }
  }, [focusedCell, focusCell, rowCount, columnCount]);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if editing (except Escape)
      if (isEditing && e.key !== 'Escape') return;

      // Don't handle if target is an input/textarea (except our table cells)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (!target.hasAttribute('data-table-cell')) return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleArrowKey('up', e.shiftKey);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleArrowKey('down', e.shiftKey);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleArrowKey('left', e.shiftKey);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleArrowKey('right', e.shiftKey);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedCell && !isEditing) {
            onCellEdit?.(focusedCell);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isEditing) {
            onCancelEdit?.();
          } else {
            setFocusedCell(null);
            setSelectedCells([]);
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (focusedCell) {
            const newColumnIndex = e.shiftKey
              ? focusedCell.columnIndex - 1
              : focusedCell.columnIndex + 1;

            if (newColumnIndex >= 0 && newColumnIndex < columnCount) {
              focusCell({ ...focusedCell, columnIndex: newColumnIndex });
            } else if (!e.shiftKey && newColumnIndex >= columnCount) {
              // Move to next row, first column
              const newRowIndex = focusedCell.rowIndex + 1;
              if (newRowIndex < rowCount) {
                focusCell({ rowIndex: newRowIndex, columnIndex: 0 });
              }
            } else if (e.shiftKey && newColumnIndex < 0) {
              // Move to previous row, last column
              const newRowIndex = focusedCell.rowIndex - 1;
              if (newRowIndex >= 0) {
                focusCell({ rowIndex: newRowIndex, columnIndex: columnCount - 1 });
              }
            }
          }
          break;
        case 'Home':
          e.preventDefault();
          if (focusedCell) {
            if (e.ctrlKey || e.metaKey) {
              // Ctrl+Home: Go to first cell
              focusCell({ rowIndex: 0, columnIndex: 0 });
            } else {
              // Home: Go to first column in current row
              focusCell({ ...focusedCell, columnIndex: 0 });
            }
          }
          break;
        case 'End':
          e.preventDefault();
          if (focusedCell) {
            if (e.ctrlKey || e.metaKey) {
              // Ctrl+End: Go to last cell
              focusCell({ rowIndex: rowCount - 1, columnIndex: columnCount - 1 });
            } else {
              // End: Go to last column in current row
              focusCell({ ...focusedCell, columnIndex: columnCount - 1 });
            }
          }
          break;
        case 'c':
          if ((e.ctrlKey || e.metaKey) && focusedCell && !isEditing) {
            e.preventDefault();
            onCopy?.(focusedCell);

            // Try to copy to system clipboard
            const cell = containerRef.current?.querySelector(
              `[data-row="${focusedCell.rowIndex}"][data-col="${focusedCell.columnIndex}"]`
            ) as HTMLElement;

            if (cell) {
              const text = cell.textContent || '';
              clipboardRef.current = text;
              navigator.clipboard.writeText(text).catch(() => {
                console.warn('Failed to copy to clipboard');
              });
            }
          }
          break;
        case 'v':
          if ((e.ctrlKey || e.metaKey) && focusedCell && !isEditing) {
            e.preventDefault();

            // Try to paste from system clipboard
            navigator.clipboard.readText().then(text => {
              onPaste?.(focusedCell, text);
            }).catch(() => {
              // Fallback to internal clipboard
              if (clipboardRef.current) {
                onPaste?.(focusedCell, clipboardRef.current);
              }
            });
          }
          break;
        case 'a':
          if ((e.ctrlKey || e.metaKey) && !isEditing) {
            e.preventDefault();
            // Select all cells
            const allCells: CellPosition[] = [];
            for (let r = 0; r < rowCount; r++) {
              for (let c = 0; c < columnCount; c++) {
                allCells.push({ rowIndex: r, columnIndex: c });
              }
            }
            setSelectedCells(allCells);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    isEditing,
    focusedCell,
    rowCount,
    columnCount,
    handleArrowKey,
    focusCell,
    onCellEdit,
    onCancelEdit,
    onCopy,
    onPaste,
  ]);

  // Click handler to focus cells
  const handleCellClick = useCallback((position: CellPosition) => {
    focusCell(position);
  }, [focusCell]);

  // Check if a cell is focused
  const isCellFocused = useCallback((position: CellPosition) => {
    return focusedCell?.rowIndex === position.rowIndex &&
           focusedCell?.columnIndex === position.columnIndex;
  }, [focusedCell]);

  // Check if a cell is selected
  const isCellSelected = useCallback((position: CellPosition) => {
    return selectedCells.some(
      p => p.rowIndex === position.rowIndex && p.columnIndex === position.columnIndex
    );
  }, [selectedCells]);

  return {
    focusedCell,
    selectedCells,
    containerRef,
    focusCell,
    handleCellClick,
    isCellFocused,
    isCellSelected,
    clearSelection: () => {
      setFocusedCell(null);
      setSelectedCells([]);
    },
  };
}
