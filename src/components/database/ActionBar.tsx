import { Upload, Plus, Sparkles, Lightbulb, MoreHorizontal, History, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/database/ExportButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ActionBarProps {
  databaseName?: string;
  tableData: any[];
  commentsCount: number;
  onUploadFile: () => void;
  onAddRecord: () => void;
  onAIAssistant: () => void;
  onInsights: () => void;
  onImportHistory: () => void;
  onComments: () => void;
  onClearData: () => void;
  onDeleteDatabase: () => void;
  className?: string;
}

export const ActionBar = ({
  databaseName,
  tableData,
  commentsCount,
  onUploadFile,
  onAddRecord,
  onAIAssistant,
  onInsights,
  onImportHistory,
  onComments,
  onClearData,
  onDeleteDatabase,
  className,
}: ActionBarProps) => {
  return (
    <div className={`flex items-center justify-between gap-4 ${className || ''}`}>
      {/* PRIMARY ACTIONS */}
      <div className="flex gap-2">
        <Button onClick={onUploadFile}>
          <Upload className="mr-2 h-4 w-4" />
          Загрузить файл
        </Button>
        <Button variant="outline" onClick={onAddRecord}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить запись
        </Button>
      </div>

      {/* SECONDARY ACTIONS */}
      <div className="flex gap-2">
        {/* AI & Insights */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              AI & Insights
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAIAssistant}>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Помощник
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsights}>
              <Lightbulb className="mr-2 h-4 w-4" />
              Рекомендации
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onImportHistory}>
              <History className="mr-2 h-4 w-4" />
              История импортов
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onComments}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Комментарии {commentsCount > 0 && `(${commentsCount})`}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ExportButton data={tableData} fileName={databaseName || 'export'} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearData}>
              <Trash2 className="mr-2 h-4 w-4" />
              Очистить данные
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteDatabase} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить базу данных
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
