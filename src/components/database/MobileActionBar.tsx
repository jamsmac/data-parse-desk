import { useState } from 'react';
import { Plus, Upload, Sparkles, Lightbulb, History, MessageSquare, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MobileActionBarProps {
  databaseName?: string;
  commentsCount: number;
  onUploadFile: () => void;
  onAddRecord: () => void;
  onAIAssistant: () => void;
  onInsights: () => void;
  onImportHistory: () => void;
  onComments: () => void;
  onExport: () => void;
  onClearData: () => void;
  onDeleteDatabase: () => void;
  className?: string;
}

export const MobileActionBar = ({
  databaseName,
  commentsCount,
  onUploadFile,
  onAddRecord,
  onAIAssistant,
  onInsights,
  onImportHistory,
  onComments,
  onExport,
  onClearData,
  onDeleteDatabase,
  className,
}: MobileActionBarProps) => {
  const [showActions, setShowActions] = useState(false);

  const handleAction = (action: () => void) => {
    setShowActions(false);
    action();
  };

  return (
    <>
      {/* FAB - Fixed Action Button */}
      <Button
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg ${className || ''}`}
        size="icon"
        onClick={() => setShowActions(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Bottom Sheet with Actions */}
      <Sheet open={showActions} onOpenChange={setShowActions}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Действия: {databaseName}</SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {/* Primary Actions */}
            <Button onClick={() => handleAction(onUploadFile)} className="h-20 flex-col gap-2">
              <Upload className="h-6 w-6" />
              <span className="text-xs">Загрузить файл</span>
            </Button>
            <Button variant="outline" onClick={() => handleAction(onAddRecord)} className="h-20 flex-col gap-2">
              <Plus className="h-6 w-6" />
              <span className="text-xs">Добавить запись</span>
            </Button>

            {/* AI & Insights */}
            <Button variant="outline" onClick={() => handleAction(onAIAssistant)} className="h-20 flex-col gap-2">
              <Sparkles className="h-6 w-6" />
              <span className="text-xs">AI Помощник</span>
            </Button>
            <Button variant="outline" onClick={() => handleAction(onInsights)} className="h-20 flex-col gap-2">
              <Lightbulb className="h-6 w-6" />
              <span className="text-xs">Рекомендации</span>
            </Button>

            {/* History & Comments */}
            <Button variant="outline" onClick={() => handleAction(onImportHistory)} className="h-20 flex-col gap-2">
              <History className="h-6 w-6" />
              <span className="text-xs">История</span>
            </Button>
            <Button variant="outline" onClick={() => handleAction(onComments)} className="h-20 flex-col gap-2">
              <MessageSquare className="h-6 w-6" />
              <span className="text-xs">Комментарии {commentsCount > 0 && `(${commentsCount})`}</span>
            </Button>

            {/* Export & Destructive */}
            <Button variant="outline" onClick={() => handleAction(onExport)} className="h-20 flex-col gap-2">
              <Download className="h-6 w-6" />
              <span className="text-xs">Экспорт</span>
            </Button>
            <Button variant="outline" onClick={() => handleAction(onClearData)} className="h-20 flex-col gap-2">
              <Trash2 className="h-6 w-6" />
              <span className="text-xs">Очистить данные</span>
            </Button>
            <Button variant="destructive" onClick={() => handleAction(onDeleteDatabase)} className="h-20 flex-col gap-2 col-span-2">
              <Trash2 className="h-6 w-6" />
              <span className="text-xs">Удалить базу данных</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
