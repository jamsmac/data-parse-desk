import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Columns,
  Database,
  Sparkles,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ColumnDefinition } from './ImportPreview';

interface ImportSummaryProps {
  columns: ColumnDefinition[];
  stats: {
    totalRows: number;
    totalColumns: number;
    sampleRows: number;
    aiSuggestionsCount: number;
    appliedSuggestions: number;
  };
  fileName: string;
  fileSize: number;
}

export const ImportSummary: React.FC<ImportSummaryProps> = ({
  columns,
  stats,
  fileName,
  fileSize,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const typeDistribution = columns.reduce((acc, col) => {
    acc[col.type] = (acc[col.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const aiAcceptanceRate = stats.aiSuggestionsCount > 0
    ? Math.round((stats.appliedSuggestions / stats.aiSuggestionsCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* File Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            File Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">File name:</span>
            <span className="text-sm font-medium">{fileName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">File size:</span>
            <span className="text-sm font-medium">{formatFileSize(fileSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total rows:</span>
            <Badge variant="default">{stats.totalRows.toLocaleString()}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total columns:</span>
            <Badge variant="secondary">{stats.totalColumns}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Column Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Columns className="w-5 h-5" />
            Column Type Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(typeDistribution).map(([type, count]) => {
              const percentage = Math.round((count / stats.totalColumns) * 100);
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{type}</span>
                    <span className="text-gray-600">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions Stats */}
      {stats.aiSuggestionsCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total suggestions:</span>
              <Badge variant="outline">{stats.aiSuggestionsCount}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Applied suggestions:</span>
              <Badge variant="default" className="bg-green-600">
                {stats.appliedSuggestions}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Acceptance rate:</span>
                <span className="font-medium">{aiAcceptanceRate}%</span>
              </div>
              <Progress value={aiAcceptanceRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5" />
            Column Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Column Name</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column, index) => (
                <TableRow key={column.name}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{column.name}</TableCell>
                  <TableCell>{column.displayName || column.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {column.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {column.aiSuggested ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">AI Applied</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">Manual</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Import Readiness */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Ready to Import</h3>
              <p className="text-sm text-green-700">
                All columns are configured and {stats.totalRows.toLocaleString()} rows are ready to be imported.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
