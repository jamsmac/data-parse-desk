import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { ColumnDefinition, AISuggestion } from './ImportPreview';
import { cn } from '@/lib/utils';

interface ColumnTypeEditorProps {
  column: ColumnDefinition;
  suggestion?: AISuggestion;
  sampleValues: any[];
  onChange: (updates: Partial<ColumnDefinition>) => void;
  onApplySuggestion: () => void;
}

const COLUMN_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'boolean', label: 'Boolean', icon: '✓' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📱' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'select', label: 'Select', icon: '🏷️' },
  { value: 'relation', label: 'Relation', icon: '🔀' },
];

export const ColumnTypeEditor: React.FC<ColumnTypeEditorProps> = ({
  column,
  suggestion,
  sampleValues,
  onChange,
  onApplySuggestion,
}) => {
  const [showSamples, setShowSamples] = useState(false);

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'gray';
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'yellow';
    return 'orange';
  };

  const getConfidenceLabel = (confidence?: number) => {
    if (!confidence) return 'No suggestion';
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

  const hasSuggestion = suggestion && !column.aiSuggested;
  const isApplied = column.aiSuggested;

  return (
    <Card className={cn(
      "transition-all",
      hasSuggestion && "border-blue-200 bg-blue-50/30",
      isApplied && "border-green-200 bg-green-50/30"
    )}>
      <CardContent className="pt-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-start gap-3">
          {/* Column Name */}
          <div className="flex-1 min-w-0">
            <Label className="text-sm font-medium truncate block">
              {column.name}
            </Label>
            <Input
              value={column.displayName || column.name}
              onChange={(e) => onChange({ displayName: e.target.value })}
              placeholder="Display name"
              className="mt-1"
            />
          </div>

          {/* Type Selector */}
          <div className="w-48">
            <Label className="text-sm">Type</Label>
            <Select
              value={column.type}
              onValueChange={(value) => onChange({ type: value as ColumnDefinition['type'] })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sample Toggle */}
          <div className="pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSamples(!showSamples)}
            >
              {showSamples ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* AI Suggestion Alert */}
        {suggestion && !isApplied && (
          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  AI suggests: <strong>{COLUMN_TYPES.find(t => t.value === suggestion.suggestedType)?.label}</strong>
                </p>
                <p className="text-xs text-blue-700 mt-1">{suggestion.reasoning}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1",
                    getConfidenceColor(suggestion.confidence) === 'green' && "bg-green-100 text-green-800 border-green-300",
                    getConfidenceColor(suggestion.confidence) === 'yellow' && "bg-yellow-100 text-yellow-800 border-yellow-300",
                    getConfidenceColor(suggestion.confidence) === 'orange' && "bg-orange-100 text-orange-800 border-orange-300"
                  )}
                >
                  {getConfidenceLabel(suggestion.confidence)} ({Math.round((suggestion.confidence || 0) * 100)}%)
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={onApplySuggestion}
                className="ml-4"
              >
                Apply
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Applied AI Badge */}
        {isApplied && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-md">
            <CheckCircle className="w-4 h-4" />
            <span>AI suggestion applied ({Math.round((column.aiConfidence || 0) * 100)}% confidence)</span>
          </div>
        )}

        {/* Sample Values */}
        {showSamples && (
          <div className="bg-gray-50 p-3 rounded-md border">
            <p className="text-xs font-medium text-gray-700 mb-2">Sample values:</p>
            <div className="space-y-1">
              {sampleValues.filter(v => v != null).slice(0, 5).map((value, idx) => (
                <div key={idx} className="text-xs font-mono text-gray-600 truncate">
                  {String(value)}
                </div>
              ))}
              {sampleValues.filter(v => v != null).length === 0 && (
                <p className="text-xs text-gray-400 italic">No data available</p>
              )}
            </div>
          </div>
        )}

        {/* Select Options (if type is select) */}
        {column.type === 'select' && (
          <div className="space-y-2">
            <Label className="text-sm">Select Options</Label>
            <div className="flex flex-wrap gap-2">
              {column.selectOptions && column.selectOptions.length > 0 ? (
                column.selectOptions.map((option, idx) => (
                  <Badge key={idx} variant="secondary">
                    {option}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Options will be detected from data
                </p>
              )}
            </div>
          </div>
        )}

        {/* Relation Config (if type is relation) */}
        {column.type === 'relation' && column.relationConfig && (
          <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
            <p className="text-xs font-medium text-purple-900 mb-1">
              🔀 Relation Configuration
            </p>
            <p className="text-xs text-purple-700">
              Links to: <strong>{column.relationConfig.targetTable}</strong>
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Display field: {column.relationConfig.displayField}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
