import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Database, Link2, CheckCircle, AlertTriangle } from 'lucide-react';
import { GeneratedSchema } from './types';
import { RelationshipPreview } from './RelationshipPreview';

interface SchemaPreviewStepProps {
  generatedSchema: GeneratedSchema;
}

export function SchemaPreviewStep({ generatedSchema }: SchemaPreviewStepProps) {
  const averageConfidence = generatedSchema.entities.length > 0
    ? generatedSchema.entities.reduce((sum, e) => sum + e.confidence, 0) / generatedSchema.entities.length
    : 0;

  return (
    <div className="space-y-4">
      {/* View Tabs */}
      <Tabs defaultValue="entities" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entities">
            <Database className="h-4 w-4 mr-2" />
            Таблицы ({generatedSchema.entities.length})
          </TabsTrigger>
          <TabsTrigger value="relationships">
            <Link2 className="h-4 w-4 mr-2" />
            Связи ({generatedSchema.relationships.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="space-y-4 mt-4">
          {/* Overall Confidence Score */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Общая уверенность AI</span>
                <span className="text-sm font-bold">
                  {Math.round(averageConfidence)}%
                </span>
              </div>
              <Progress
                value={averageConfidence}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {generatedSchema.entities.length} таблиц, {generatedSchema.relationships.length} связей
              </p>
            </CardContent>
          </Card>

          {/* Warnings - Show at top if present */}
          {generatedSchema.warnings && generatedSchema.warnings.length > 0 && (
            <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-700 dark:text-yellow-500">
                Предупреждения ({generatedSchema.warnings.length})
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {generatedSchema.warnings.map((warning, idx) => (
                    <li key={idx} className="text-yellow-700 dark:text-yellow-400">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            <div className="space-y-4">
              {/* Entities */}
              {generatedSchema.entities.map((entity, idx) => (
                <Card key={idx} className={entity.confidence < 70 ? 'border-yellow-500/30' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <CardTitle className="text-base">{entity.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {entity.confidence < 70 ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {entity.confidence}% низкая уверенность
                          </Badge>
                        ) : entity.confidence < 85 ? (
                          <Badge variant="secondary" className="text-xs">
                            {entity.confidence}% средняя уверенность
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {entity.confidence}% высокая уверенность
                          </Badge>
                        )}
                      </div>
                    </div>
                    {entity.reasoning && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {entity.reasoning}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {entity.columns.map((col, colIdx) => (
                        <div key={colIdx} className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs">{col.name}</span>
                          <Badge variant="outline" className="text-xs">{col.type}</Badge>
                          {col.primary_key && <Badge className="text-xs">PK</Badge>}
                          {col.unique && <Badge variant="secondary" className="text-xs">UNIQUE</Badge>}
                          {!col.nullable && <Badge variant="secondary" className="text-xs">NOT NULL</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4 mt-4">
          <RelationshipPreview schema={generatedSchema} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
