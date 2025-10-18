import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, User, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CellHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowId: string;
  columnName: string;
  databaseId: string;
}

export const CellHistoryPanel = ({ 
  open, 
  onOpenChange, 
  rowId, 
  columnName,
  databaseId 
}: CellHistoryPanelProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['cell-history', rowId, columnName],
    queryFn: async () => {
      // Получаем метаданные ячейки
      const { data: metadata } = await supabase
        .from('cell_metadata')
        .select('id, source_file_id, imported_at, version')
        .eq('row_id', rowId)
        .eq('column_name', columnName)
        .single();

      if (!metadata) return [];

      // Получаем историю изменений
      const { data: changes } = await supabase
        .from('cell_history')
        .select(`
          *,
          database_files:source_file_id(filename)
        `)
        .eq('cell_metadata_id', metadata.id)
        .order('changed_at', { ascending: false });

      return changes || [];
    },
    enabled: open && !!rowId && !!columnName,
  });

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'created': return 'bg-green-500';
      case 'updated': return 'bg-blue-500';
      case 'imported': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'created': return 'Создано';
      case 'updated': return 'Обновлено';
      case 'imported': return 'Импортировано';
      default: return type;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>История изменений</SheetTitle>
          <SheetDescription>
            Колонка: <span className="font-mono text-foreground">{columnName}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка истории...
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((change, index) => (
                <div
                  key={change.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Badge className={getChangeTypeColor(change.change_type)}>
                      {getChangeTypeLabel(change.change_type)}
                    </Badge>
                    {index < history.length - 1 && (
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Вернуть
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {change.old_value && (
                      <div>
                        <p className="text-xs text-muted-foreground">Старое значение:</p>
                        <p className="text-sm font-mono bg-muted p-2 rounded">
                          {JSON.stringify(change.old_value)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Новое значение:</p>
                      <p className="text-sm font-mono bg-muted p-2 rounded">
                        {JSON.stringify(change.new_value)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(change.changed_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </div>
                    {change.database_files && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {change.database_files.filename}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              История изменений пуста
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
