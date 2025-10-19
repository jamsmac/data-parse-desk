import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link2, Trash2, AlertCircle } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface Dependency {
  id: string;
  from: string; // ID задачи-источника
  to: string;   // ID задачи-цели
  type: 'blocks' | 'requires'; // blocks - блокирует, requires - требует
}

interface ChecklistDependenciesProps {
  items: ChecklistItem[];
  dependencies?: Dependency[];
  onDependenciesChange?: (deps: Dependency[]) => void;
}

export function ChecklistDependencies({
  items,
  dependencies = [],
  onDependenciesChange,
}: ChecklistDependenciesProps) {
  const [newDep, setNewDep] = useState<Partial<Dependency>>({
    type: 'blocks',
  });

  const addDependency = () => {
    if (!newDep.from || !newDep.to) return;
    
    if (newDep.from === newDep.to) {
      alert('Задача не может зависеть от самой себя');
      return;
    }

    // Проверка циклических зависимостей
    if (hasCyclicDependency(newDep.from, newDep.to, dependencies)) {
      alert('Обнаружена циклическая зависимость. Невозможно добавить.');
      return;
    }

    const dependency: Dependency = {
      id: crypto.randomUUID(),
      from: newDep.from!,
      to: newDep.to!,
      type: newDep.type || 'blocks',
    };

    onDependenciesChange?.([...dependencies, dependency]);
    setNewDep({ type: 'blocks' });
  };

  const removeDependency = (id: string) => {
    onDependenciesChange?.(dependencies.filter(d => d.id !== id));
  };

  const getItemLabel = (itemId: string) => {
    return items.find(i => i.id === itemId)?.label || itemId;
  };

  const getBlockedItems = (itemId: string): string[] => {
    return dependencies
      .filter(d => d.from === itemId && d.type === 'blocks')
      .map(d => d.to);
  };

  const canCheck = (itemId: string): boolean => {
    // Проверяем, что все зависимости выполнены
    const requiredDeps = dependencies.filter(
      d => d.to === itemId && d.type === 'requires'
    );
    
    return requiredDeps.every(dep => {
      const requiredItem = items.find(i => i.id === dep.from);
      return requiredItem?.checked;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Зависимости задач
        </CardTitle>
        <CardDescription>
          Настройте связи между задачами чеклиста
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Добавление зависимости */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Новая зависимость</h4>
          <div className="grid grid-cols-3 gap-3">
            <Select
              value={newDep.from}
              onValueChange={(value) => setNewDep({ ...newDep, from: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="От задачи..." />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={newDep.type}
              onValueChange={(value: 'blocks' | 'requires') => 
                setNewDep({ ...newDep, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocks">блокирует</SelectItem>
                <SelectItem value="requires">требует</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={newDep.to}
              onValueChange={(value) => setNewDep({ ...newDep, to: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="К задаче..." />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={addDependency}
            disabled={!newDep.from || !newDep.to}
            className="w-full"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Добавить зависимость
          </Button>
        </div>

        {/* Список зависимостей */}
        {dependencies.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Существующие зависимости</h4>
            <div className="space-y-2">
              {dependencies.map(dep => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium">
                      {getItemLabel(dep.from)}
                    </span>
                    <Badge variant={dep.type === 'blocks' ? 'destructive' : 'default'}>
                      {dep.type === 'blocks' ? 'блокирует' : 'требует'}
                    </Badge>
                    <span className="text-sm font-medium">
                      {getItemLabel(dep.to)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDependency(dep.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Предупреждения о заблокированных задачах */}
        {items.some(item => !canCheck(item.id) && !item.checked) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Некоторые задачи заблокированы до выполнения зависимостей:
              <ul className="mt-2 space-y-1">
                {items
                  .filter(item => !canCheck(item.id) && !item.checked)
                  .map(item => {
                    const requiredDeps = dependencies.filter(
                      d => d.to === item.id && d.type === 'requires'
                    );
                    return (
                      <li key={item.id} className="text-sm">
                        • <strong>{item.label}</strong> требует:{' '}
                        {requiredDeps.map(d => getItemLabel(d.from)).join(', ')}
                      </li>
                    );
                  })}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Утилита для проверки циклических зависимостей
function hasCyclicDependency(
  from: string,
  to: string,
  existingDeps: Dependency[]
): boolean {
  const visited = new Set<string>();
  
  function dfs(current: string): boolean {
    if (current === from) return true;
    if (visited.has(current)) return false;
    
    visited.add(current);
    
    const nextDeps = existingDeps.filter(d => d.from === current);
    for (const dep of nextDeps) {
      if (dfs(dep.to)) return true;
    }
    
    return false;
  }
  
  return dfs(to);
}
