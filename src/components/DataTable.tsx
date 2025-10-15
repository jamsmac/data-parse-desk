import { useState, useMemo, memo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NormalizedRow, formatAmount, GroupedData } from '@/utils/parseData';
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
import { exportToCSV, exportToExcel } from '@/utils/exportData';
import { FadeIn, GlassCard, GlassCardContent } from './aurora';

interface DataTableProps {
  data: NormalizedRow[] | GroupedData[];
  headers: string[];
  isGrouped: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export const DataTable = memo<DataTableProps>(function DataTable({ data, headers, isGrouped }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(headers));
  const [selectedRow, setSelectedRow] = useState<NormalizedRow | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const visibleHeaders = headers.filter(h => visibleColumns.has(h));

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

  const handleSort = useCallback((column: string) => {
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
  }, [sortColumn, sortDirection]);

  const toggleColumn = useCallback((column: string) => {
    setVisibleColumns(prev => {
      const newVisible = new Set(prev);
      if (newVisible.has(column)) {
        newVisible.delete(column);
      } else {
        newVisible.add(column);
      }
      return newVisible;
    });
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      return newExpanded;
    });
  }, []);

  const handleExport = useCallback((format: 'csv' | 'xlsx') => {
    const exportData = isGrouped 
      ? (data as GroupedData[]).flatMap(g => g.rows)
      : (sortedData as NormalizedRow[]);

    if (format === 'csv') {
      exportToCSV(exportData, Array.from(visibleColumns), 'export.csv');
    } else {
      exportToExcel(exportData, Array.from(visibleColumns), 'export.xlsx');
    }
  }, [isGrouped, data, sortedData, visibleColumns]);

  const formatCellValue = useCallback((value: unknown, header: string): string => {
    if (value === null || value === undefined || value === '') return '—';
    
    if (header === 'amount_num' && typeof value === 'number') return formatAmount(value);
    if (header === 'date_iso' && typeof value === 'string') {
      return new Date(value).toLocaleString('en-US', { 
        timeZone: 'Asia/Tashkent',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    }
    
    return String(value);
  }, []);

  return (
    <div className="container px-4 py-6">
      {/* Controls */}
      <FadeIn direction="down" delay={100}>
        <GlassCard intensity="light" className="mb-4">
          <GlassCardContent>
            <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select value={String(pageSize)} onValueChange={(val) => {
              setPageSize(Number(val));
              setPage(0);
            }}>
              <SelectTrigger className="w-[140px] glass-input">
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
              <SheetContent className="glass-modal">
                <SheetHeader>
                  <SheetTitle className="text-gradient-primary">Visible Columns</SheetTitle>
                  <SheetDescription>Toggle columns visibility</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {headers.map(header => (
                    <motion.div 
                      key={header} 
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: headers.indexOf(header) * 0.05 }}
                    >
                      <Checkbox
                        checked={visibleColumns.has(header)}
                        onCheckedChange={() => toggleColumn(header)}
                      />
                      <label className="text-sm">{header}</label>
                    </motion.div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('xlsx')}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </FadeIn>

      {/* Table */}
      <FadeIn direction="up" delay={200}>
        <GlassCard intensity="medium" className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-table-header sticky top-0 backdrop-blur-md">
                <TableRow>
                  {visibleHeaders.map(header => (
                    <TableHead
                      key={header}
                      className="cursor-pointer whitespace-nowrap transition-colors hover:bg-accent/50"
                      onClick={() => !isGrouped && handleSort(header)}
                    >
                      <motion.div 
                        className="flex items-center gap-2"
                        animate={sortColumn === header ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        {header}
                        {!isGrouped && sortColumn === header && (
                          <motion.div
                            initial={{ rotate: 0, scale: 0 }}
                            animate={{ rotate: sortDirection === 'desc' ? 180 : 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </motion.div>
                        )}
                      </motion.div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            <TableBody>
              <AnimatePresence mode="wait">
                {isGrouped ? (
                  (paginatedData as GroupedData[]).map((group, groupIdx) => (
                    <motion.tr
                      key={group.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: groupIdx * 0.05 }}
                      className="cursor-pointer bg-muted/50 font-semibold hover:bg-accent/60 hover:shadow-glow transition-all"
                      onClick={() => toggleGroup(group.key)}
                    >
                      <TableCell colSpan={visibleHeaders.length}>
                        <div className="flex items-center justify-between">
                          <span>{group.label}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground glass-badge">{group.count} rows</span>
                            <span className="text-gradient-success font-semibold">{formatAmount(group.sum)}</span>
                            <motion.div
                              animate={{ rotate: expandedGroups.has(group.key) ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </motion.div>
                          </div>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  (paginatedData as NormalizedRow[]).map((row, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.02 }}
                      className="cursor-pointer hover:bg-accent/50 hover:shadow-glow transition-all group"
                      onClick={() => setSelectedRow(row)}
                    >
                      {visibleHeaders.map(header => (
                        <TableCell key={header} className="group-hover:text-foreground transition-colors">
                          {formatCellValue(row[header], header)}
                        </TableCell>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
              
              {/* Expanded group rows */}
              {isGrouped && (paginatedData as GroupedData[]).map(group => 
                expandedGroups.has(group.key) && group.rows.map((row, idx) => (
                  <motion.tr
                    key={`${group.key}-${idx}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                    className="cursor-pointer hover:bg-accent/50 hover:shadow-glow transition-all"
                    onClick={() => setSelectedRow(row)}
                  >
                    {visibleHeaders.map(header => (
                      <TableCell key={header}>
                        {formatCellValue(row[header], header)}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Pagination */}
      <FadeIn direction="up" delay={300}>
        <GlassCard intensity="light" className="mt-4">
          <GlassCardContent>
            <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{page + 1}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="transition-all hover:scale-105"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="transition-all hover:scale-105"
            >
              Next
            </Button>
          </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </FadeIn>

      {/* Row Details Sheet */}
      <Sheet open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <SheetContent className="overflow-y-auto glass-modal">
          <SheetHeader>
            <SheetTitle className="text-gradient-primary">Row Details</SheetTitle>
            <SheetDescription>Raw and normalized data</SheetDescription>
          </SheetHeader>
          <AnimatePresence mode="wait">
            {selectedRow && (
              <motion.div 
                className="mt-6 space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="glass-card p-4">
                  <h3 className="font-semibold mb-2 text-gradient-secondary">Normalized Fields</h3>
                  <div className="space-y-2 text-sm">
                    {selectedRow.date_iso && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <span className="text-muted-foreground">Date (ISO):</span>
                        <p className="font-mono">{selectedRow.date_iso}</p>
                      </motion.div>
                    )}
                    {selectedRow.date_only && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <span className="text-muted-foreground">Date:</span>
                        <p className="font-mono">{selectedRow.date_only}</p>
                      </motion.div>
                    )}
                    {selectedRow.amount_num !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <span className="text-muted-foreground">Amount:</span>
                        <p className="font-mono text-gradient-success font-semibold">{formatAmount(selectedRow.amount_num)}</p>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h3 className="font-semibold mb-2">All Fields</h3>
                  <div className="space-y-2 text-sm">
                    {Object.entries(selectedRow).map(([key, value], idx) => {
                      if (key.startsWith('_')) return null;
                      return (
                        <motion.div 
                          key={key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * idx }}
                        >
                          <span className="text-muted-foreground">{key}:</span>
                          <p className="font-mono break-all">{String(value)}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h3 className="font-semibold mb-2">Source</h3>
                  <p className="text-sm text-muted-foreground glass-badge inline-block">{selectedRow._fileName}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </div>
  );
});
