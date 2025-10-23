import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp, Eye, Download, Edit2, History, Palette } from 'lucide-react';
import { NormalizedRow, formatAmount, GroupedData } from '@/utils/parseData';
import { applyFormattingRules, formatToStyles, type FormattingRule } from '@/utils/conditionalFormatting';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu';
import { EditableCell } from '@/components/database/EditableCell';
import { CellHistoryPanel } from '@/components/history/CellHistoryPanel';
import { FormattingRulesPanel } from '@/components/formatting/FormattingRulesPanel';
import { RowContextMenu } from '@/components/database/RowContextMenu';
import { KeyboardShortcutsHelp } from '@/components/database/KeyboardShortcutsHelp';
import { BulkActionsToolbar } from '@/components/database/BulkActionsToolbar';
import { BulkEditDialog } from '@/components/database/BulkEditDialog';
import { useKeyboardNavigation, CellPosition } from '@/hooks/useKeyboardNavigation';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseContext } from '@/contexts/DatabaseContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DataTableProps {
  data?: NormalizedRow[] | GroupedData[];
  headers?: string[];
  isGrouped?: boolean;
  onCellUpdate?: (rowId: string, column: string, value: any) => Promise<void>;
  columnTypes?: Record<string, string>;
  databaseId?: string;
  onRowEdit?: (rowId: string) => void;
  onRowView?: (rowId: string) => void;
  onRowDuplicate?: (rowId: string) => void;
  onRowDelete?: (rowId: string) => void;
  onRowHistory?: (rowId: string) => void;
  onInsertRowAbove?: (rowId: string) => void;
  onInsertRowBelow?: (rowId: string) => void;
  onBulkDelete?: (rowIds: string[]) => Promise<void>;
  onBulkDuplicate?: (rowIds: string[]) => Promise<void>;
  onBulkEdit?: (rowIds: string[], column: string, value: any) => Promise<void>;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable({
  data: dataProp,
  headers: headersProp,
  isGrouped: isGroupedProp = false,
  onCellUpdate: onCellUpdateProp,
  columnTypes: columnTypesProp = {},
  databaseId: databaseIdProp,
  onRowEdit: onRowEditProp,
  onRowView: onRowViewProp,
  onRowDuplicate: onRowDuplicateProp,
  onRowDelete: onRowDeleteProp,
  onRowHistory: onRowHistoryProp,
  onInsertRowAbove: onInsertRowAboveProp,
  onInsertRowBelow: onInsertRowBelowProp,
  onBulkDelete: onBulkDeleteProp,
  onBulkDuplicate: onBulkDuplicateProp,
  onBulkEdit: onBulkEditProp,
}: DataTableProps) {
  const { toast } = useToast();

  // Try to get context, but don't fail if not available
  let ctx;
  try {
    ctx = useDatabaseContext();
  } catch {
    // Context not available - will use props only
    ctx = null;
  }

  // Use context values if available, otherwise use props
  const data = dataProp ?? (ctx?.tableData.map((row: any) => ({
    id: row.id,
    ...row.data,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) || []);

  const headers = headersProp ?? (ctx?.schemas.map(s => s.column_name) || []);
  const isGrouped = isGroupedProp;
  const databaseId = databaseIdProp ?? ctx?.databaseId ?? undefined;

  const columnTypes = columnTypesProp ?? (ctx?.schemas.reduce((acc, s) => {
    acc[s.column_name] = s.column_type;
    return acc;
  }, {} as Record<string, string>) || {});

  // Handlers - use context if available, otherwise use props
  const handleCellUpdate = onCellUpdateProp ?? (async (rowId: string, column: string, value: any) => {
    if (!ctx) return;
    const row = ctx.tableData.find((r: any) => r.id === rowId);
    if (!row) return;
    const updatedData = { ...row.data, [column]: value };
    await ctx.handleUpdateRow(rowId, updatedData);
  });

  const handleRowView = onRowViewProp ?? ctx?.handleRowView;
  const handleRowEdit = onRowEditProp;
  const handleRowDuplicate = onRowDuplicateProp ?? ctx?.handleDuplicateRow;
  const handleRowDelete = onRowDeleteProp ?? ctx?.handleDeleteRow;
  const handleRowHistory = onRowHistoryProp ?? ctx?.handleRowHistory;
  const handleInsertRowAbove = onInsertRowAboveProp ?? ctx?.handleInsertRowAbove;
  const handleInsertRowBelow = onInsertRowBelowProp ?? ctx?.handleInsertRowBelow;
  const handleBulkDelete = onBulkDeleteProp ?? ctx?.handleBulkDelete;
  const handleBulkDuplicate = onBulkDuplicateProp ?? ctx?.handleBulkDuplicate;
  const handleBulkEdit = onBulkEditProp ?? ctx?.handleBulkEdit;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(headers));
  const [selectedRow, setSelectedRow] = useState<NormalizedRow | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [historyCell, setHistoryCell] = useState<{ rowId: string; column: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);

  // Bulk selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Toggle row selection
  const toggleRowSelection = (rowId: string) => {
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedRowIds.size === paginatedData.length) {
      setSelectedRowIds(new Set());
    } else {
      const allIds = (paginatedData as NormalizedRow[]).map(row => row.id);
      setSelectedRowIds(new Set(allIds));
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedRowIds.size === 0) return;

    try {
      await onBulkDelete(Array.from(selectedRowIds));
      setSelectedRowIds(new Set());
      setShowBulkDeleteConfirm(false);
      toast({
        title: 'Удалено',
        description: `Удалено ${selectedRowIds.size} записей`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить записи',
        variant: 'destructive',
      });
    }
  };

  // Bulk duplicate handler
  const handleBulkDuplicate = async () => {
    if (!onBulkDuplicate || selectedRowIds.size === 0) return;

    try {
      await onBulkDuplicate(Array.from(selectedRowIds));
      setSelectedRowIds(new Set());
      toast({
        title: 'Дублировано',
        description: `Создано ${selectedRowIds.size} копий`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось дублировать записи',
        variant: 'destructive',
      });
    }
  };

  // Bulk edit handler
  const handleBulkEditSave = async (column: string, value: any) => {
    if (!onBulkEdit || selectedRowIds.size === 0) return;

    try {
      await onBulkEdit(Array.from(selectedRowIds), column, value);
      setSelectedRowIds(new Set());
      toast({
        title: 'Обновлено',
        description: `Обновлено ${selectedRowIds.size} записей`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить записи',
        variant: 'destructive',
      });
    }
  };

  const visibleHeaders = headers.filter(h => visibleColumns.has(h));

  // Load formatting rules
  const { data: formattingRules } = useQuery({
    queryKey: ['formatting-rules', databaseId],
    queryFn: async () => {
      if (!databaseId) return [];

      const { data, error } = await supabase
        .from('conditional_formatting_rules')
        .select('*')
        .eq('database_id', databaseId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as FormattingRule[];
    },
    enabled: !!databaseId,
  });

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection || isGrouped) return data;

    const sorted = [...(data as NormalizedRow[])].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [data, sortColumn, sortDirection, isGrouped]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Keyboard navigation
  const {
    containerRef,
    focusedCell,
    handleCellClick,
    isCellFocused,
    isCellSelected,
  } = useKeyboardNavigation({
    rowCount: paginatedData.length,
    columnCount: visibleHeaders.length,
    isEditing: !!editingCell,
    onCellEdit: (position) => {
      const row = paginatedData[position.rowIndex] as NormalizedRow;
      const column = visibleHeaders[position.columnIndex];
      if (row && column) {
        handleCellDoubleClick(row.id, column);
      }
    },
    onCancelEdit: () => {
      setEditingCell(null);
    },
    onCopy: (position) => {
      const row = paginatedData[position.rowIndex] as NormalizedRow;
      const column = visibleHeaders[position.columnIndex];
      if (row && column) {
        const value = row[column];
        toast({
          title: 'Скопировано',
          description: `Значение: ${formatCellValue(value, column)}`,
        });
      }
    },
    onPaste: async (position, data) => {
      const row = paginatedData[position.rowIndex] as NormalizedRow;
      const column = visibleHeaders[position.columnIndex];
      if (row && column && handleCellUpdate) {
        try {
          await handleCellUpdate(row.id, column, data);
          toast({
            title: 'Вставлено',
            description: `Значение вставлено в ${column}`,
          });
        } catch (error) {
          toast({
            title: 'Ошибка',
            description: 'Не удалось вставить значение',
            variant: 'destructive',
          });
        }
      }
    },
    enabled: !isGrouped,
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleColumn = (column: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(column)) {
      newVisible.delete(column);
    } else {
      newVisible.add(column);
    }
    setVisibleColumns(newVisible);
  };

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCellDoubleClick = (rowId: string, column: string) => {
    if (handleCellUpdate) {
      setEditingCell({ rowId, column });
    }
  };

  const handleCellSave = async (value: any) => {
    if (!editingCell || !handleCellUpdate) return;

    await handleCellUpdate(editingCell.rowId, editingCell.column, value);
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const formatCellValue = (value: any, header: string) => {
    if (value === null || value === undefined || value === '') return '—';
    
    if (header === 'amount_num') return formatAmount(value);
    if (header === 'date_iso' && typeof value === 'string') {
      return new Date(value).toLocaleString('en-US', { 
        timeZone: 'Asia/Tashkent',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    }
    
    return String(value);
  };

  return (
    <div className="container px-4 py-6" ref={containerRef}>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <KeyboardShortcutsHelp />
          <Select value={String(pageSize)} onValueChange={(val) => {
            setPageSize(Number(val));
            setPage(0);
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
              <SelectItem value="200">200 per page</SelectItem>
            </SelectContent>
          </Select>

          <Sheet>
            <Button variant="outline" onClick={() => {}}>
              <Eye className="mr-2 h-4 w-4" />
              Columns
            </Button>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Visible Columns</SheetTitle>
                <SheetDescription>Toggle columns visibility</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {headers.map(header => (
                  <div key={header} className="flex items-center gap-2">
                    <Checkbox
                      checked={visibleColumns.has(header)}
                      onCheckedChange={() => toggleColumn(header)}
                    />
                    <label className="text-sm">{header}</label>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {databaseId && (
            <Button variant="outline" onClick={() => setShowFormatting(true)}>
              <Palette className="mr-2 h-4 w-4" />
              Formatting
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-table-header sticky top-0">
              <TableRow>
                {!isGrouped && (onBulkDelete || onBulkDuplicate || onBulkEdit) && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRowIds.size === paginatedData.length && paginatedData.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Выбрать все"
                    />
                  </TableHead>
                )}
                {visibleHeaders.map(header => (
                  <TableHead
                    key={header}
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => !isGrouped && handleSort(header)}
                  >
                    <div className="flex items-center gap-2">
                      {header}
                      {!isGrouped && sortColumn === header && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isGrouped ? (
                (paginatedData as GroupedData[]).map(group => (
                  <>
                    <TableRow 
                      key={group.key}
                      className="cursor-pointer bg-muted/50 font-semibold hover:bg-table-row-hover"
                      onClick={() => toggleGroup(group.key)}
                    >
                      <TableCell colSpan={visibleHeaders.length}>
                        <div className="flex items-center justify-between">
                          <span>{group.label}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">{group.count} rows</span>
                            <span className="text-success">{formatAmount(group.sum)}</span>
                            {expandedGroups.has(group.key) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedGroups.has(group.key) && group.rows.map((row, idx) => (
                      <TableRow 
                        key={`${group.key}-${idx}`}
                        className="cursor-pointer hover:bg-table-row-hover"
                        onClick={() => setSelectedRow(row)}
                      >
                        {visibleHeaders.map(header => {
                          const isEditing = editingCell?.rowId === row.id && editingCell?.column === header;
                          const value = row[header];
                          
                          return (
                            <TableCell 
                              key={header}
                              onDoubleClick={() => handleCellDoubleClick(row.id, header)}
                              className="cursor-pointer hover:bg-accent/50 transition-colors"
                            >
                              {isEditing ? (
                                <EditableCell
                                  value={value}
                                  columnType={columnTypes[header] || 'text'}
                                  onSave={handleCellSave}
                                  onCancel={handleCellCancel}
                                />
                              ) : (
                                <div className="flex items-center justify-between group">
                                  <span>{formatCellValue(value, header)}</span>
                                  {handleCellUpdate && (
                                    <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                  )}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </>
                ))
              ) : (
                (paginatedData as NormalizedRow[]).map((row, idx) => {
                  // Apply formatting rules to this row
                  const { cellFormats, rowFormat } = formattingRules
                    ? applyFormattingRules(row, formattingRules)
                    : { cellFormats: {}, rowFormat: null };

                  return (
                    <RowContextMenu
                      key={idx}
                      onEdit={() => handleRowEdit?.(row.id)}
                      onView={() => handleRowView?.(row.id)}
                      onDuplicate={() => handleRowDuplicate?.(row.id)}
                      onDelete={() => handleRowDelete?.(row.id)}
                      onHistory={() => handleRowHistory?.(row.id)}
                      onInsertAbove={() => handleInsertRowAbove?.(row.id)}
                      onInsertBelow={() => handleInsertRowBelow?.(row.id)}
                    >
                      <TableRow
                        className="cursor-pointer hover:bg-table-row-hover"
                        style={rowFormat ? formatToStyles(rowFormat) : undefined}
                        onClick={() => setSelectedRow(row)}
                      >
                      {(onBulkDelete || onBulkDuplicate || onBulkEdit) && (
                        <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRowIds.has(row.id)}
                            onCheckedChange={() => toggleRowSelection(row.id)}
                            aria-label={`Выбрать строку ${idx + 1}`}
                          />
                        </TableCell>
                      )}
                      {visibleHeaders.map((header, colIdx) => {
                        const isEditing = editingCell?.rowId === row.id && editingCell?.column === header;
                        const value = row[header];
                        const cellFormat = cellFormats[header];
                        const cellPosition = { rowIndex: idx, columnIndex: colIdx };
                        const isFocused = isCellFocused(cellPosition);
                        const isSelected = isCellSelected(cellPosition);

                        return (
                          <TableCell
                            key={header}
                            data-row={idx}
                            data-col={colIdx}
                            data-table-cell="true"
                            tabIndex={isFocused ? 0 : -1}
                            onDoubleClick={() => handleCellDoubleClick(row.id, header)}
                            onClick={() => handleCellClick(cellPosition)}
                            className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                              isFocused ? 'ring-2 ring-primary ring-inset' : ''
                            } ${isSelected ? 'bg-primary/10' : ''}`}
                            style={cellFormat ? formatToStyles(cellFormat) : undefined}
                          >
                          {isEditing ? (
                            <EditableCell
                              value={value}
                              columnType={columnTypes[header] || 'text'}
                              onSave={handleCellSave}
                              onCancel={handleCellCancel}
                            />
                          ) : (
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div className="flex items-center justify-between group w-full">
                                  <span>{formatCellValue(value, header)}</span>
                                  {handleCellUpdate && (
                                    <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                  )}
                                </div>
                              </ContextMenuTrigger>
                              {databaseId && (
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    onSelect={() => {
                                      setHistoryCell({ rowId: row.id, column: header });
                                      setShowHistory(true);
                                    }}
                                  >
                                    <History className="mr-2 h-4 w-4" />
                                    Показать историю
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              )}
                            </ContextMenu>
                          )}
                        </TableCell>
                      );
                    })}
                      </TableRow>
                    </RowContextMenu>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Row Details Sheet */}
      <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Row Details</SheetTitle>
            <SheetDescription>Raw and normalized data</SheetDescription>
          </SheetHeader>
          {selectedRow && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Normalized Fields</h3>
                <div className="space-y-2 text-sm">
                  {selectedRow.date_iso && (
                    <div>
                      <span className="text-muted-foreground">Date (ISO):</span>
                      <p className="font-mono">{selectedRow.date_iso}</p>
                    </div>
                  )}
                  {selectedRow.date_only && (
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-mono">{selectedRow.date_only}</p>
                    </div>
                  )}
                  {selectedRow.amount_num !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-mono">{formatAmount(selectedRow.amount_num)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">All Fields</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(selectedRow).map(([key, value]) => {
                    if (key.startsWith('_')) return null;
                    return (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}:</span>
                        <p className="font-mono break-all">{String(value)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Source</h3>
                <p className="text-sm text-muted-foreground">{selectedRow._fileName}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Cell History Panel */}
      {historyCell && databaseId && (
        <CellHistoryPanel
          open={showHistory}
          onOpenChange={setShowHistory}
          rowId={historyCell.rowId}
          columnName={historyCell.column}
          databaseId={databaseId}
        />
      )}

      {/* Formatting Rules Panel */}
      {databaseId && (
        <FormattingRulesPanel
          open={showFormatting}
          onOpenChange={setShowFormatting}
          databaseId={databaseId}
          columns={headers}
        />
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedRowIds.size}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        onDuplicate={handleBulkDuplicate}
        onEdit={() => setShowBulkEdit(true)}
        onClear={() => setSelectedRowIds(new Set())}
      />

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        columns={headers.map(h => ({ name: h, type: columnTypes[h] || 'text' }))}
        selectedCount={selectedRowIds.size}
        onSave={handleBulkEditSave}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить {selectedRowIds.size} записей?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все выбранные записи будут удалены навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}