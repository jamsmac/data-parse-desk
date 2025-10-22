import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ColumnTypeEditor } from './ColumnTypeEditor';
import { DataPreviewTable } from './DataPreviewTable';
import { ImportSummary } from './ImportSummary';
import { ParseResult } from '@/utils/fileParser';
import { supabase } from '@/integrations/supabase/client';

export interface ColumnDefinition {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'url' | 'select' | 'relation';
  displayName?: string;
  aiSuggested?: boolean;
  aiConfidence?: number;
  selectOptions?: string[];
  relationConfig?: {
    targetTable: string;
    displayField: string;
  };
  validation?: {
    required?: boolean;
    unique?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface AISuggestion {
  column: string;
  suggestedType: string;
  confidence: number;
  reasoning: string;
  selectOptions?: string[];
  relationSuggestion?: {
    targetTable: string;
    reason: string;
  };
}

interface ImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parseResult: ParseResult;
  databaseId: string;
  onConfirm: (columns: ColumnDefinition[], data: any[]) => Promise<void>;
  onCancel: () => void;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  open,
  onOpenChange,
  parseResult,
  databaseId,
  onConfirm,
  onCancel,
}) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('columns');
  const [importing, setImporting] = useState(false);

  // Sample data (first 50 rows)
  const sampleData = useMemo(() => {
    return parseResult.data.slice(0, 50);
  }, [parseResult.data]);

  // Initialize columns from parse result
  useEffect(() => {
    if (parseResult.headers && parseResult.headers.length > 0) {
      const initialColumns: ColumnDefinition[] = parseResult.headers.map((header, index) => {
        // Detect type from parseResult metadata
        let type: ColumnDefinition['type'] = 'text';

        if (parseResult.dateColumns?.includes(header)) {
          type = 'date';
        } else if (parseResult.amountColumns?.includes(header)) {
          type = 'number';
        } else {
          // Try to infer from data
          type = inferTypeFromSample(header, sampleData);
        }

        return {
          name: header,
          type,
          displayName: formatDisplayName(header),
        };
      });

      setColumns(initialColumns);
    }
  }, [parseResult.headers, parseResult.dateColumns, parseResult.amountColumns, sampleData]);

  // Fetch AI suggestions
  useEffect(() => {
    if (columns.length > 0 && sampleData.length > 0) {
      fetchAISuggestions();
    }
  }, []); // Only run once when component mounts

  const inferTypeFromSample = (columnName: string, data: any[]): ColumnDefinition['type'] => {
    const samples = data.slice(0, 10).map(row => row[columnName]).filter(val => val != null);

    if (samples.length === 0) return 'text';

    // Check if all values are numbers
    const allNumbers = samples.every(val => !isNaN(Number(val)));
    if (allNumbers) return 'number';

    // Check if all values are booleans
    const boolValues = ['true', 'false', 'yes', 'no', '1', '0', 'да', 'нет'];
    const allBooleans = samples.every(val =>
      boolValues.includes(String(val).toLowerCase())
    );
    if (allBooleans) return 'boolean';

    // Check for email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allEmails = samples.every(val => emailPattern.test(String(val)));
    if (allEmails) return 'email';

    // Check for phone pattern
    const phonePattern = /^[\d\s\-\+\(\)]{7,20}$/;
    const allPhones = samples.every(val => phonePattern.test(String(val)));
    if (allPhones) return 'phone';

    // Check for URL pattern
    const urlPattern = /^https?:\/\/.+/;
    const allUrls = samples.every(val => urlPattern.test(String(val)));
    if (allUrls) return 'url';

    // Check if it's a select (limited unique values)
    const uniqueValues = new Set(samples);
    if (uniqueValues.size <= 10 && uniqueValues.size >= 2) {
      return 'select';
    }

    return 'text';
  };

  const formatDisplayName = (columnName: string): string => {
    return columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fetchAISuggestions = async () => {
    setLoadingAI(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-import-suggestions', {
        body: {
          columns: columns.map(col => ({ name: col.name, type: col.type })),
          sampleData: sampleData.slice(0, 5),
          databaseId,
        },
      });

      if (error) {
        console.error('AI suggestions error:', error);
        return;
      }

      if (data && data.suggestions) {
        setAiSuggestions(data.suggestions);

        // Auto-apply high-confidence suggestions
        const updatedColumns = columns.map(col => {
          const suggestion = data.suggestions.find((s: AISuggestion) => s.column === col.name);

          if (suggestion && suggestion.confidence >= 0.8) {
            return {
              ...col,
              type: suggestion.suggestedType as ColumnDefinition['type'],
              aiSuggested: true,
              aiConfidence: suggestion.confidence,
              selectOptions: suggestion.selectOptions,
              relationConfig: suggestion.relationSuggestion ? {
                targetTable: suggestion.relationSuggestion.targetTable,
                displayField: 'name',
              } : undefined,
            };
          }

          return col;
        });

        setColumns(updatedColumns);
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleColumnChange = (index: number, updates: Partial<ColumnDefinition>) => {
    setColumns(prev => {
      const newColumns = [...prev];
      newColumns[index] = { ...newColumns[index], ...updates };
      return newColumns;
    });
  };

  const applySuggestion = (columnName: string) => {
    const suggestion = aiSuggestions.find(s => s.column === columnName);
    if (!suggestion) return;

    const columnIndex = columns.findIndex(c => c.name === columnName);
    if (columnIndex === -1) return;

    handleColumnChange(columnIndex, {
      type: suggestion.suggestedType as ColumnDefinition['type'],
      aiSuggested: true,
      aiConfidence: suggestion.confidence,
      selectOptions: suggestion.selectOptions,
      relationConfig: suggestion.relationSuggestion ? {
        targetTable: suggestion.relationSuggestion.targetTable,
        displayField: 'name',
      } : undefined,
    });
  };

  const handleConfirm = async () => {
    setImporting(true);
    try {
      await onConfirm(columns, parseResult.data);
    } finally {
      setImporting(false);
    }
  };

  const stats = useMemo(() => {
    return {
      totalRows: parseResult.data.length,
      totalColumns: columns.length,
      sampleRows: sampleData.length,
      aiSuggestionsCount: aiSuggestions.length,
      appliedSuggestions: columns.filter(c => c.aiSuggested).length,
    };
  }, [parseResult.data.length, columns, sampleData.length, aiSuggestions.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Import Preview: {parseResult.fileName}
            {loadingAI && (
              <Badge variant="outline" className="animate-pulse">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Analyzing...
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Review and adjust column types before importing {stats.totalRows} rows
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="columns">
                Column Mapping ({stats.totalColumns})
              </TabsTrigger>
              <TabsTrigger value="preview">
                Data Preview ({stats.sampleRows} rows)
              </TabsTrigger>
              <TabsTrigger value="summary">
                Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="columns" className="flex-1 overflow-y-auto mt-4 space-y-4">
              {aiSuggestions.length > 0 && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    AI found {aiSuggestions.length} suggestions.
                    {stats.appliedSuggestions > 0 && (
                      <span className="ml-1 text-green-600">
                        {stats.appliedSuggestions} already applied.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {columns.map((column, index) => {
                  const suggestion = aiSuggestions.find(s => s.column === column.name);

                  return (
                    <ColumnTypeEditor
                      key={column.name}
                      column={column}
                      suggestion={suggestion}
                      sampleValues={sampleData.slice(0, 5).map(row => row[column.name])}
                      onChange={(updates) => handleColumnChange(index, updates)}
                      onApplySuggestion={() => applySuggestion(column.name)}
                    />
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
              <DataPreviewTable
                columns={columns}
                data={sampleData}
              />
            </TabsContent>

            <TabsContent value="summary" className="flex-1 overflow-y-auto mt-4">
              <ImportSummary
                columns={columns}
                stats={stats}
                fileName={parseResult.fileName}
                fileSize={parseResult.fileSize || 0}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>
              {stats.totalRows} rows will be imported
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={importing}
            >
              {importing ? 'Importing...' : `Import ${stats.totalRows} rows`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
