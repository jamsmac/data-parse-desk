import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['↑', '↓', '←', '→'], description: 'Навигация по ячейкам', category: 'Навигация' },
  { keys: ['Tab'], description: 'Следующая ячейка', category: 'Навигация' },
  { keys: ['Shift', 'Tab'], description: 'Предыдущая ячейка', category: 'Навигация' },
  { keys: ['Home'], description: 'Первая ячейка в строке', category: 'Навигация' },
  { keys: ['End'], description: 'Последняя ячейка в строке', category: 'Навигация' },
  { keys: ['Ctrl', 'Home'], description: 'Первая ячейка таблицы', category: 'Навигация' },
  { keys: ['Ctrl', 'End'], description: 'Последняя ячейка таблицы', category: 'Навигация' },

  // Editing
  { keys: ['Enter'], description: 'Редактировать ячейку', category: 'Редактирование' },
  { keys: ['Escape'], description: 'Отменить редактирование', category: 'Редактирование' },
  { keys: ['Double Click'], description: 'Быстрое редактирование', category: 'Редактирование' },

  // Selection
  { keys: ['Shift', '↑↓←→'], description: 'Выделение ячеек', category: 'Выделение' },
  { keys: ['Ctrl', 'A'], description: 'Выделить всё', category: 'Выделение' },
  { keys: ['Escape'], description: 'Снять выделение', category: 'Выделение' },

  // Clipboard
  { keys: ['Ctrl', 'C'], description: 'Копировать ячейку', category: 'Буфер обмена' },
  { keys: ['Ctrl', 'V'], description: 'Вставить в ячейку', category: 'Буфер обмена' },

  // Undo/Redo
  { keys: ['Ctrl', 'Z'], description: 'Отменить изменение', category: 'История' },
  { keys: ['Ctrl', 'Y'], description: 'Вернуть изменение', category: 'История' },

  // Row Actions
  { keys: ['Right Click'], description: 'Контекстное меню строки', category: 'Действия' },
  { keys: ['Ctrl', 'D'], description: 'Дублировать строку', category: 'Действия' },
  { keys: ['Del'], description: 'Удалить строку', category: 'Действия' },
];

const categories = Array.from(new Set(shortcuts.map(s => s.category)));

export function KeyboardShortcutsHelp() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Keyboard className="mr-2 h-4 w-4" />
          Горячие клавиши
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Клавиатурные сокращения</SheetTitle>
          <SheetDescription>
            Используйте эти сочетания клавиш для быстрой работы с таблицей
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, i) => (
                          <React.Fragment key={i}>
                            <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs self-center">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Совет:</strong> На Mac используйте <kbd className="px-1 py-0.5 text-xs bg-muted border rounded">⌘ Cmd</kbd> вместо <kbd className="px-1 py-0.5 text-xs bg-muted border rounded">Ctrl</kbd>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
