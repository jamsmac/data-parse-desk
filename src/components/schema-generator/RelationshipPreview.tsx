import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Database, Link2, AlertTriangle, Info } from 'lucide-react';
import { GeneratedSchema } from './types';
import { cn } from '@/lib/utils';

interface RelationshipPreviewProps {
  schema: GeneratedSchema;
}

export function RelationshipPreview({ schema }: RelationshipPreviewProps) {
  const { entities, relationships } = schema;

  // Calculate relationship statistics
  const stats = {
    totalTables: entities.length,
    totalRelationships: relationships.length,
    tablesWithRelations: new Set(
      relationships.flatMap(rel => [rel.from, rel.to])
    ).size,
    tablesWithoutRelations: entities.filter(
      entity => !relationships.some(rel => rel.from === entity.name || rel.to === entity.name)
    ).length,
  };

  // Group relationships by type
  const relationshipsByType = relationships.reduce((acc, rel) => {
    if (!acc[rel.type]) {
      acc[rel.type] = [];
    }
    acc[rel.type].push(rel);
    return acc;
  }, {} as Record<string, typeof relationships>);

  const getRelationshipColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'one-to-many':
      case 'one_to_many':
        return 'bg-blue-500';
      case 'many-to-many':
      case 'many_to_many':
        return 'bg-purple-500';
      case 'one-to-one':
      case 'one_to_one':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) {
      return <Badge variant="default" className="text-xs">Высокая {confidence}%</Badge>;
    } else if (confidence >= 70) {
      return <Badge variant="secondary" className="text-xs">Средняя {confidence}%</Badge>;
    } else {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Низкая {confidence}%
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Всего таблиц</p>
              <p className="text-2xl font-bold">{stats.totalTables}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Связей</p>
              <p className="text-2xl font-bold">{stats.totalRelationships}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Со связями</p>
              <p className="text-2xl font-bold">{stats.tablesWithRelations}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Без связей</p>
              <p className="text-2xl font-bold text-muted-foreground">{stats.tablesWithoutRelations}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning for tables without relationships */}
      {stats.tablesWithoutRelations > 0 && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            {stats.tablesWithoutRelations} {stats.tablesWithoutRelations === 1 ? 'таблица не имеет' : 'таблицы не имеют'} связей с другими таблицами
          </AlertDescription>
        </Alert>
      )}

      {/* Relationships by type */}
      {Object.keys(relationshipsByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Связи между таблицами
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(relationshipsByType).map(([type, rels]) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', getRelationshipColor(type))} />
                  <span className="text-sm font-medium capitalize">
                    {type.replace(/_/g, '-')} ({rels.length})
                  </span>
                </div>
                <div className="space-y-2 pl-5">
                  {rels.map((rel, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {/* From table */}
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium">{rel.from}</span>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center gap-1">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        {rel.on && (
                          <span className="text-xs text-muted-foreground font-mono">{rel.on}</span>
                        )}
                      </div>

                      {/* To table */}
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium">{rel.to}</span>
                      </div>

                      {/* Confidence badge */}
                      <div className="ml-auto">
                        {getConfidenceBadge(rel.confidence)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No relationships message */}
      {relationships.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Связи между таблицами не были обнаружены. Вы можете добавить их вручную после создания таблиц.
          </AlertDescription>
        </Alert>
      )}

      {/* Visual diagram placeholder */}
      {relationships.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
              <Database className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Визуальная ER-диаграмма будет доступна после создания таблиц
              </p>
              <p className="text-xs text-muted-foreground">
                Вы сможете просмотреть интерактивную схему в разделе "Схема" проекта
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
