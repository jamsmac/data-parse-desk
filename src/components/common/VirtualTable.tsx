import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
  }>;
  rowHeight?: number;
  overscan?: number;
}

export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 50,
  overscan = 5,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto border rounded-lg"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex">
            {columns.map((column) => (
              <div
                key={column.key}
                className="flex-1 px-4 py-3 text-left font-medium text-sm"
              >
                {column.header}
              </div>
            ))}
          </div>
        </div>

        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = data[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 w-full flex hover:bg-muted/50 border-b"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="flex-1 px-4 py-3 text-sm truncate"
                >
                  {column.render ? column.render(item) : item[column.key]}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}