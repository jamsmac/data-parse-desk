import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { ChecklistColumn } from './ChecklistColumn';
import { StatusColumn } from './StatusColumn';
import { StatusCombobox } from './StatusCombobox';
import { ProgressBarColumn } from './ProgressBarColumn';
import { FormulaColumn } from './FormulaColumn';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface CompositeViewDataTableProps {
  compositeViewId: string;
}

export function CompositeViewDataTable({ compositeViewId }: CompositeViewDataTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');

  // Load composite view configuration
  const { data: viewConfig } = useQuery({
    queryKey: ['composite-view-config', compositeViewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('composite_views')
        .select('*')
        .eq('id', compositeViewId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Load data
  const { data: queryResult, isLoading, refetch } = useQuery({
    queryKey: ['composite-view-data', compositeViewId, page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('composite-views-query', {
        body: {
          composite_view_id: compositeViewId,
          page,
          page_size: pageSize,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!compositeViewId,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!compositeViewId) return;

    const channel = supabase
      .channel(`composite-view-${compositeViewId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'composite_view_custom_data',
          filter: `composite_view_id=eq.${compositeViewId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [compositeViewId, refetch]);

  const handleCustomDataUpdate = async (
    rowIdentifier: string,
    columnName: string,
    columnType: string,
    newData: any
  ) => {
    try {
      const { error } = await supabase.functions.invoke('composite-views-update-custom-data', {
        body: {
          composite_view_id: compositeViewId,
          row_identifier: rowIdentifier,
          column_name: columnName,
          column_type: columnType,
          data: newData,
        },
      });

      if (error) throw error;

      toast.success('Обновлено');
      refetch();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error('Ошибка обновления: ' + error.message);
    }
  };

  const handleExport = () => {
    if (!queryResult?.rows) return;

    const csv = [
      // Headers
      Object.keys(queryResult.rows[0]).join(','),
      // Data rows
      ...queryResult.rows.map((row: any) =>
        Object.values(row)
          .map((val) => (typeof val === 'object' ? JSON.stringify(val) : val))
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewConfig?.name || 'composite-view'}-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Экспортировано в CSV');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const config = viewConfig?.config as any;
  const customColumns = config?.custom_columns || [];
  const regularColumns = config?.columns?.filter((c: any) => c.visible) || [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center gap-4">
        <Input
          placeholder="Поиск..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {regularColumns.map((col: any) => (
                <TableHead key={col.alias}>{col.alias}</TableHead>
              ))}
              {customColumns.map((col: any) => (
                <TableHead key={col.name}>{col.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {queryResult?.rows
              ?.filter((row: any) =>
                searchTerm
                  ? Object.values(row).some((val) =>
                      String(val).toLowerCase().includes(searchTerm.toLowerCase())
                    )
                  : true
              )
              .map((row: any, idx: number) => (
                <TableRow key={idx}>
                  {regularColumns.map((col: any) => (
                    <TableCell key={col.alias}>{row[col.alias]}</TableCell>
                  ))}
                  {customColumns.map((col: any) => (
                    <TableCell key={col.name}>
                      {col.type === 'checklist' && (
                        <ChecklistColumn
                          data={{
                            items: row[col.name]?.items || [],
                            completed: row[col.name]?.completed,
                            total: row[col.name]?.total,
                          }}
                          onToggle={async (itemIndex) => {
                            const updatedItems = [...(row[col.name]?.items || [])];
                            updatedItems[itemIndex] = {
                              ...updatedItems[itemIndex],
                              checked: !updatedItems[itemIndex].checked,
                            };
                            await handleCustomDataUpdate(row.row_num.toString(), col.name, 'checklist', {
                              items: updatedItems,
                            });
                          }}
                          onCompleteAll={async () => {
                            const updatedItems = (row[col.name]?.items || []).map((item: any) => ({
                              ...item,
                              checked: true,
                            }));
                            await handleCustomDataUpdate(row.row_num.toString(), col.name, 'checklist', {
                              items: updatedItems,
                            });
                          }}
                          onReset={async () => {
                            const updatedItems = (row[col.name]?.items || []).map((item: any) => ({
                              ...item,
                              checked: false,
                            }));
                            await handleCustomDataUpdate(row.row_num.toString(), col.name, 'checklist', {
                              items: updatedItems,
                            });
                          }}
                        />
                      )}
                      {col.type === 'status' && (
                        <StatusCombobox
                          value={row[col.name]?.value || 'pending'}
                          options={col.config?.options || []}
                          columnId={col.id || col.name}
                          onChange={async (newStatus) => {
                            await handleCustomDataUpdate(row.row_num.toString(), col.name, 'status', {
                              value: newStatus,
                            });
                          }}
                          onCreateNew={async (newLabel, newColor) => {
                            // Add new status to column config
                            const newOption = {
                              value: newLabel.toLowerCase().replace(/\s+/g, '_'),
                              label: newLabel,
                              color: newColor
                            };

                            const updatedOptions = [...(col.config?.options || []), newOption];

                            // Update composite view config
                            const updatedCustomColumns = customColumns.map((c: any) =>
                              c.name === col.name
                                ? { ...c, config: { ...c.config, options: updatedOptions } }
                                : c
                            );

                            const { error } = await supabase
                              .from('composite_views')
                              .update({
                                config: {
                                  ...config,
                                  custom_columns: updatedCustomColumns
                                }
                              })
                              .eq('id', compositeViewId);

                            if (error) throw error;

                            // Apply new status to current row
                            await handleCustomDataUpdate(row.row_num.toString(), col.name, 'status', {
                              value: newOption.value,
                            });

                            // Refetch to update UI
                            refetch();
                          }}
                        />
                      )}
                      {col.type === 'progress' && (
                        <ProgressBarColumn
                          data={{
                            value: row[col.name]?.value || 0,
                            auto_calculate: row[col.name]?.auto_calculate,
                            source_checklist: row[col.name]?.source_checklist,
                          }}
                          onChange={async (newValue) => {
                            await handleCustomDataUpdate(row.row_num.toString(), col.name, 'progress', {
                              value: newValue,
                            });
                          }}
                        />
                      )}
                      {col.type === 'formula' && (
                        <FormulaColumn
                          data={{
                            expression: col.config?.expression || row[col.name]?.expression || '',
                            result: row[col.name]?.result,
                            return_type: col.config?.return_type || row[col.name]?.return_type || 'text',
                            dependencies: col.config?.dependencies || row[col.name]?.dependencies || [],
                            calculated_at: row[col.name]?.calculated_at,
                          }}
                          compositeViewId={compositeViewId}
                          rowIdentifier={row.row_num.toString()}
                          columnName={col.name}
                          onRecalculate={async () => {
                            await handleCustomDataUpdate(row.row_num.toString(), col.name, 'formula', {
                              expression: col.config?.expression,
                              return_type: col.config?.return_type,
                              dependencies: col.config?.dependencies,
                            });
                          }}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {(!queryResult?.rows || queryResult.rows.length === 0) && (
              <TableRow>
                <TableCell colSpan={regularColumns.length + customColumns.length} className="text-center py-8 text-muted-foreground">
                  Нет данных для отображения
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Показано {queryResult?.rows?.length || 0} из {queryResult?.total_count || 0} записей
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </Button>
          <div className="flex items-center gap-2 px-4">
            <span className="text-sm">
              Страница {page} из {queryResult?.total_pages || 1}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (queryResult?.total_pages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
