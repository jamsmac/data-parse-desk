/**
 * Пример использования FormulaEditor компонента
 */

import React, { useState } from 'react';
import { FormulaEditor } from './FormulaEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

/**
 * Демонстрационный компонент для FormulaEditor
 */
export function FormulaEditorExample() {
  const [formula, setFormula] = useState('{price} * {quantity} * (1 + {tax_rate})');

  // Пример колонок из таблицы
  const columns = [
    { name: 'product_name', type: 'string' },
    { name: 'price', type: 'number' },
    { name: 'quantity', type: 'number' },
    { name: 'tax_rate', type: 'number' },
    { name: 'discount', type: 'number' },
    { name: 'order_date', type: 'date' },
    { name: 'customer_name', type: 'string' },
    { name: 'is_active', type: 'boolean' },
    { name: 'status', type: 'string' },
    { name: 'total', type: 'number' }
  ];

  const handleSave = (savedFormula: string) => {
    console.log('Формула сохранена:', savedFormula);
    toast.success('Формула успешно сохранена!', {
      description: savedFormula
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Демонстрация Formula Editor</CardTitle>
          <CardDescription>
            Интерактивный редактор формул с подсветкой синтаксиса, автодополнением и валидацией
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulaEditor
            value={formula}
            onChange={setFormula}
            columns={columns}
            onSave={handleSave}
          />
        </CardContent>
      </Card>

      {/* Примеры формул */}
      <Card>
        <CardHeader>
          <CardTitle>Примеры формул</CardTitle>
          <CardDescription>
            Кликните на пример, чтобы загрузить его в редактор
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ExampleCard
              title="Расчет итоговой суммы"
              formula="{price} * {quantity} * (1 - {discount})"
              description="Цена × Количество с учетом скидки"
              onClick={setFormula}
            />

            <ExampleCard
              title="Условная логика"
              formula='IF({status} = "active", {total} * 1.2, {total})'
              description="Добавить 20% для активных заказов"
              onClick={setFormula}
            />

            <ExampleCard
              title="Работа со строками"
              formula='CONCAT(UPPER({customer_name}), " - ", {product_name})'
              description="Объединить имя клиента и товар"
              onClick={setFormula}
            />

            <ExampleCard
              title="Работа с датами"
              formula="DATEDIFF(TODAY(), {order_date})"
              description="Дней с момента заказа"
              onClick={setFormula}
            />

            <ExampleCard
              title="Математические функции"
              formula="ROUND({price} * {quantity} * {tax_rate}, 2)"
              description="Округление до 2 знаков"
              onClick={setFormula}
            />

            <ExampleCard
              title="Комплексная формула"
              formula='IF(AND({is_active}, {quantity} > 10), SUM({price}, {tax_rate}) * {quantity}, 0)'
              description="Сложная бизнес-логика"
              onClick={setFormula}
            />
          </div>
        </CardContent>
      </Card>

      {/* Текущая формула */}
      <Card>
        <CardHeader>
          <CardTitle>Текущая формула</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg font-mono text-sm">
            {formula || 'Формула не задана'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Карточка с примером формулы
 */
function ExampleCard({
  title,
  formula,
  description,
  onClick
}: {
  title: string;
  formula: string;
  description: string;
  onClick: (formula: string) => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => onClick(formula)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {formula}
        </code>
      </CardContent>
    </Card>
  );
}

/**
 * Использование в реальном приложении:
 *
 * 1. В компоненте создания/редактирования колонки типа Formula:
 *
 * ```tsx
 * import { FormulaEditor } from '@/components/database/FormulaEditor';
 *
 * function FormulaColumnSettings({ column, onSave }) {
 *   const [formula, setFormula] = useState(column.formula || '');
 *   const tableColumns = useTableColumns(); // получить колонки таблицы
 *
 *   const handleSave = (formula) => {
 *     onSave({ ...column, formula });
 *   };
 *
 *   return (
 *     <FormulaEditor
 *       value={formula}
 *       onChange={setFormula}
 *       columns={tableColumns}
 *       onSave={handleSave}
 *     />
 *   );
 * }
 * ```
 *
 * 2. В диалоге настройки формулы:
 *
 * ```tsx
 * import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 * import { FormulaEditor } from '@/components/database/FormulaEditor';
 *
 * function FormulaDialog({ open, onOpenChange, column, onSave }) {
 *   const [formula, setFormula] = useState(column.formula || '');
 *
 *   return (
 *     <Dialog open={open} onOpenChange={onOpenChange}>
 *       <DialogContent className="max-w-7xl">
 *         <DialogHeader>
 *           <DialogTitle>Редактор формулы для колонки {column.name}</DialogTitle>
 *         </DialogHeader>
 *         <FormulaEditor
 *           value={formula}
 *           onChange={setFormula}
 *           columns={getAvailableColumns()}
 *           onSave={(formula) => {
 *             onSave(formula);
 *             onOpenChange(false);
 *           }}
 *         />
 *       </DialogContent>
 *     </Dialog>
 *   );
 * }
 * ```
 *
 * 3. В настройках Rollup/Lookup колонок:
 *
 * ```tsx
 * function RollupSettings({ rollupConfig, onChange }) {
 *   return (
 *     <div>
 *       <Label>Формула агрегации</Label>
 *       <FormulaEditor
 *         value={rollupConfig.formula}
 *         onChange={(formula) => onChange({ ...rollupConfig, formula })}
 *         columns={getRelatedTableColumns()}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */