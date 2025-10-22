import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ColumnDefinition } from './ImportPreview';
import { cn } from '@/lib/utils';

interface DataPreviewTableProps {
  columns: ColumnDefinition[];
  data: any[];
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
  columns,
  data,
}) => {
  const formatCellValue = (value: any, columnType: string) => {
    if (value == null || value === '') {
      return <span className="text-gray-400 italic">null</span>;
    }

    switch (columnType) {
      case 'number':
        return (
          <span className="font-mono text-blue-700">
            {Number(value).toLocaleString()}
          </span>
        );

      case 'date':
        try {
          const date = new Date(value);
          return (
            <span className="text-purple-700">
              {date.toLocaleDateString()}
            </span>
          );
        } catch {
          return String(value);
        }

      case 'boolean':
        return (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'True' : 'False'}
          </Badge>
        );

      case 'email':
        return (
          <a
            href={`mailto:${value}`}
            className="text-blue-600 hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            {value}
          </a>
        );

      case 'phone':
        return (
          <span className="font-mono text-green-700">
            {value}
          </span>
        );

      case 'url':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate block max-w-xs"
            onClick={(e) => e.preventDefault()}
          >
            {value}
          </a>
        );

      case 'select':
        return (
          <Badge variant="outline">
            {value}
          </Badge>
        );

      default:
        return (
          <span className="truncate block max-w-xs">
            {String(value)}
          </span>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: '📝',
      number: '🔢',
      date: '📅',
      boolean: '✓',
      email: '📧',
      phone: '📱',
      url: '🔗',
      select: '🏷️',
      relation: '🔀',
    };
    return icons[type] || '📝';
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No data to preview</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 bg-gray-50">#</TableHead>
            {columns.map((column) => (
              <TableHead
                key={column.name}
                className={cn(
                  "bg-gray-50 min-w-[150px]",
                  column.aiSuggested && "bg-green-50"
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span>{getTypeIcon(column.type)}</span>
                    <span className="font-semibold">
                      {column.displayName || column.name}
                    </span>
                  </div>
                  <Badge variant="outline" className="w-fit text-xs">
                    {column.type}
                  </Badge>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              <TableCell className="font-medium text-gray-500 bg-gray-50">
                {rowIndex + 1}
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.name}>
                  {formatCellValue(row[column.name], column.type)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
