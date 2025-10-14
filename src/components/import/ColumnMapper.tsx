import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Wand2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnSchema } from '@/types/database';

interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  isNew: boolean;
  dataType?: string;
  confidence?: number; // 0-1 для ML-маппинга
}

interface ColumnMapperProps {
  sourceColumns: string[];
  targetColumns: ColumnSchema[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  onCreateColumn?: (columnName: string, dataType: string) => void;
  autoMap?: boolean;
  showConfidence?: boolean;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  sourceColumns,
  targetColumns,
  onMappingChange,
  onCreateColumn,
  autoMap = true,
  showConfidence = false,
}) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [unmappedSource, setUnmappedSource] = useState<string[]>([]);
  const [unmappedTarget, setUnmappedTarget] = useState<string[]>([]);
  const [showNewColumnForm, setShowNewColumnForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [includeUnmapped, setIncludeUnmapped] = useState(true);

  // Алгоритм автоматического маппинга (упрощенный Levenshtein)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    // Точное совпадение после удаления спецсимволов
    const clean1 = s1.replace(/[^a-z0-9]/g, '');
    const clean2 = s2.replace(/[^a-z0-9]/g, '');
    if (clean1 === clean2) return 0.9;

    // Levenshtein distance
    const matrix: number[][] = [];
    const n = s1.length;
    const m = s2.length;

    for (let i = 0; i <= n; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= m; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[n][m];
    const maxLength = Math.max(n, m);
    return 1 - distance / maxLength;
  };

  const performAutoMapping = () => {
    const newMappings: ColumnMapping[] = [];
    const usedTargets = new Set<string>();
    const usedSources = new Set<string>();

    // Сортируем источники по приоритету (обычно первые колонки важнее)
    const sortedSources = [...sourceColumns];

    sortedSources.forEach((sourceCol) => {
      let bestMatch: { column: string; score: number } | null = null;

      targetColumns.forEach((targetCol) => {
        if (usedTargets.has(targetCol.name)) return;

        const similarity = calculateSimilarity(sourceCol, targetCol.name);
        if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.score)) {
          bestMatch = { column: targetCol.name, score: similarity };
        }
      });

      if (bestMatch && bestMatch.score > 0.6) {
        newMappings.push({
          sourceColumn: sourceCol,
          targetColumn: bestMatch.column,
          isNew: false,
          confidence: bestMatch.score,
        });
        usedTargets.add(bestMatch.column);
        usedSources.add(sourceCol);
      }
    });

    setMappings(newMappings);
    setUnmappedSource(sourceColumns.filter((col) => !usedSources.has(col)));
    setUnmappedTarget(
      targetColumns.map((col) => col.name).filter((col) => !usedTargets.has(col))
    );
  };

  useEffect(() => {
    if (autoMap && sourceColumns.length > 0 && targetColumns.length > 0) {
      performAutoMapping();
    }
  }, [sourceColumns, targetColumns, autoMap]);

  useEffect(() => {
    onMappingChange(mappings);
  }, [mappings, onMappingChange]);

  const handleMappingChange = (sourceCol: string, targetCol: string) => {
    setMappings((prev) => {
      const filtered = prev.filter((m) => m.sourceColumn !== sourceCol);
      if (targetCol && targetCol !== 'none') {
        return [
          ...filtered,
          {
            sourceColumn: sourceCol,
            targetColumn: targetCol,
            isNew: false,
          },
        ];
      }
      return filtered;
    });
  };

  const handleRemoveMapping = (sourceCol: string) => {
    setMappings((prev) => prev.filter((m) => m.sourceColumn !== sourceCol));
  };

  const handleCreateColumn = () => {
    if (!newColumnName.trim() || !onCreateColumn) return;

    onCreateColumn(newColumnName.trim(), newColumnType);
    setNewColumnName('');
    setShowNewColumnForm(false);
  };

  const getMappedCount = () => mappings.length;
  const getTotalCount = () => sourceColumns.length;
  const getProgress = () => (getMappedCount() / getTotalCount()) * 100;

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'gray';
    if (confidence >= 0.9) return 'green';
    if (confidence >= 0.7) return 'yellow';
    return 'orange';
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return 'Ручной';
    if (confidence >= 0.9) return 'Высокая';
    if (confidence >= 0.7) return 'Средняя';
    return 'Низкая';
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Сопоставление колонок</CardTitle>
              <CardDescription>
                Сопоставьте колонки из файла с колонками базы данных
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {getMappedCount()}/{getTotalCount()}
              </div>
              <div className="text-xs text-muted-foreground">колонок сопоставлено</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Прогресс</span>
              <span>{Math.round(getProgress())}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          {/* Auto-map Button */}
          {!autoMap && (
            <Button
              onClick={performAutoMapping}
              className="mt-4 w-full"
              variant="outline"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Автоматическое сопоставление
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Mappings List */}
      <div className="space-y-2">
        {sourceColumns.map((sourceCol, index) => {
          const mapping = mappings.find((m) => m.sourceColumn === sourceCol);
          const isMapped = !!mapping;

          return (
            <Card key={index} className={cn(!isMapped && 'border-orange-300')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Source Column */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1">
                      Колонка в файле
                    </Label>
                    <div className="font-medium">{sourceCol}</div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />

                  {/* Target Column Select */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1">
                      Колонка в БД
                    </Label>
                    <Select
                      value={mapping?.targetColumn || 'none'}
                      onValueChange={(value) => handleMappingChange(sourceCol, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите колонку" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">Не сопоставлять</span>
                        </SelectItem>
                        {targetColumns.map((col) => (
                          <SelectItem key={col.name} value={col.name}>
                            <div className="flex items-center gap-2">
                              <span>{col.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {col.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Confidence Badge */}
                  {showConfidence && mapping?.confidence && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'flex-shrink-0',
                        getConfidenceColor(mapping.confidence) === 'green' &&
                          'border-green-500 text-green-700',
                        getConfidenceColor(mapping.confidence) === 'yellow' &&
                          'border-yellow-500 text-yellow-700',
                        getConfidenceColor(mapping.confidence) === 'orange' &&
                          'border-orange-500 text-orange-700'
                      )}
                    >
                      {getConfidenceText(mapping.confidence)}
                    </Badge>
                  )}

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {isMapped ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    )}
                  </div>

                  {/* Remove Button */}
                  {isMapped && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMapping(sourceCol)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unmapped Columns Warning */}
      {unmappedSource.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                Несопоставленные колонки ({unmappedSource.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {unmappedSource.map((col) => (
                  <Badge key={col} variant="secondary">
                    {col}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={includeUnmapped}
                  onCheckedChange={setIncludeUnmapped}
                />
                <Label className="text-sm">
                  Создать новые колонки для несопоставленных данных
                </Label>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Create New Column */}
      {onCreateColumn && (
        <Card>
          <CardContent className="p-4">
            {!showNewColumnForm ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewColumnForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать новую колонку
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Название колонки</Label>
                    <Input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Название"
                    />
                  </div>
                  <div>
                    <Label>Тип данных</Label>
                    <Select value={newColumnType} onValueChange={setNewColumnType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Текст</SelectItem>
                        <SelectItem value="number">Число</SelectItem>
                        <SelectItem value="date">Дата</SelectItem>
                        <SelectItem value="boolean">Логический</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Телефон</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateColumn} className="flex-1">
                    Создать
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewColumnForm(false);
                      setNewColumnName('');
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
