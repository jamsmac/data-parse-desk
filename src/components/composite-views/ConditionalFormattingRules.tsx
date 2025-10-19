import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Palette } from 'lucide-react';
import { ColorPicker } from '@/components/common/ColorPicker';

export interface FormattingRule {
  id: string;
  column: string;
  condition: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: string | number;
  value2?: string | number; // For 'between' condition
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  priority: number;
}

interface ConditionalFormattingRulesProps {
  columns: Array<{ name: string; type: string }>;
  rules: FormattingRule[];
  onChange: (rules: FormattingRule[]) => void;
}

export function ConditionalFormattingRules({
  columns,
  rules,
  onChange,
}: ConditionalFormattingRulesProps) {
  const [editingRule, setEditingRule] = useState<FormattingRule | null>(null);

  const addRule = () => {
    const newRule: FormattingRule = {
      id: Math.random().toString(36).substr(2, 9),
      column: columns[0]?.name || '',
      condition: 'equals',
      value: '',
      backgroundColor: '#fef3c7',
      textColor: '#92400e',
      priority: rules.length,
    };
    setEditingRule(newRule);
  };

  const saveRule = () => {
    if (!editingRule) return;

    const existingIndex = rules.findIndex(r => r.id === editingRule.id);
    if (existingIndex >= 0) {
      const updated = [...rules];
      updated[existingIndex] = editingRule;
      onChange(updated);
    } else {
      onChange([...rules, editingRule]);
    }
    setEditingRule(null);
  };

  const deleteRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id));
  };

  const applyRule = (value: any, columnName: string): React.CSSProperties => {
    const applicableRules = rules
      .filter(r => r.column === columnName)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      let matches = false;

      switch (rule.condition) {
        case 'equals':
          matches = String(value) === String(rule.value);
          break;
        case 'greater_than':
          matches = Number(value) > Number(rule.value);
          break;
        case 'less_than':
          matches = Number(value) < Number(rule.value);
          break;
        case 'contains':
          matches = String(value).toLowerCase().includes(String(rule.value).toLowerCase());
          break;
        case 'between':
          matches = Number(value) >= Number(rule.value) && Number(value) <= Number(rule.value2);
          break;
      }

      if (matches) {
        return {
          backgroundColor: rule.backgroundColor,
          color: rule.textColor,
          fontWeight: rule.bold ? 'bold' : 'normal',
        };
      }
    }

    return {};
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Условное форматирование
              </CardTitle>
              <CardDescription>
                Автоматическая раскраска ячеек по условиям
              </CardDescription>
            </div>
            <Button onClick={addRule} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Добавить правило
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length === 0 && !editingRule && (
            <div className="text-center py-8 text-muted-foreground">
              Нет правил форматирования
            </div>
          )}

          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-4 p-3 border rounded-lg">
              <Badge variant="outline">{rule.column}</Badge>
              <span className="text-sm">
                {rule.condition} {rule.value}
                {rule.condition === 'between' && ` - ${rule.value2}`}
              </span>
              <div className="flex gap-2 ml-auto">
                <div
                  className="h-6 w-16 rounded border"
                  style={{
                    backgroundColor: rule.backgroundColor,
                    color: rule.textColor,
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingRule(rule)}
                >
                  ✏️
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {editingRule && (
            <Card className="border-2 border-primary">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Колонка</Label>
                    <Select
                      value={editingRule.column}
                      onValueChange={(v) => setEditingRule({ ...editingRule, column: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Условие</Label>
                    <Select
                      value={editingRule.condition}
                      onValueChange={(v: any) => setEditingRule({ ...editingRule, condition: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Равно</SelectItem>
                        <SelectItem value="greater_than">Больше чем</SelectItem>
                        <SelectItem value="less_than">Меньше чем</SelectItem>
                        <SelectItem value="contains">Содержит</SelectItem>
                        <SelectItem value="between">Между</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Значение</Label>
                    <Input
                      value={editingRule.value}
                      onChange={(e) => setEditingRule({ ...editingRule, value: e.target.value })}
                    />
                  </div>

                  {editingRule.condition === 'between' && (
                    <div className="space-y-2">
                      <Label>До</Label>
                      <Input
                        value={editingRule.value2 || ''}
                        onChange={(e) => setEditingRule({ ...editingRule, value2: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Цвет фона</Label>
                    <ColorPicker
                      value={editingRule.backgroundColor || '#ffffff'}
                      onChange={(c) => setEditingRule({ ...editingRule, backgroundColor: c })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Цвет текста</Label>
                    <ColorPicker
                      value={editingRule.textColor || '#000000'}
                      onChange={(c) => setEditingRule({ ...editingRule, textColor: c })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingRule(null)}>
                    Отмена
                  </Button>
                  <Button onClick={saveRule}>Сохранить</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export helper function
export { applyRule };

function applyRule(
  value: any,
  columnName: string,
  rules: FormattingRule[]
): React.CSSProperties {
  const applicableRules = rules
    .filter(r => r.column === columnName)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of applicableRules) {
    let matches = false;

    switch (rule.condition) {
      case 'equals':
        matches = String(value) === String(rule.value);
        break;
      case 'greater_than':
        matches = Number(value) > Number(rule.value);
        break;
      case 'less_than':
        matches = Number(value) < Number(rule.value);
        break;
      case 'contains':
        matches = String(value).toLowerCase().includes(String(rule.value).toLowerCase());
        break;
      case 'between':
        matches = Number(value) >= Number(rule.value) && Number(value) <= Number(rule.value2);
        break;
    }

    if (matches) {
      return {
        backgroundColor: rule.backgroundColor,
        color: rule.textColor,
        fontWeight: rule.bold ? 'bold' : 'normal',
      };
    }
  }

  return {};
}
