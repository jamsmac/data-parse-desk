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
  ariaLabel?: string;
  caption?: string;
}

export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 50,
  overscan = 5,
  ariaLabel = 'Data table',
  caption,
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
      role="region"
      aria-label={ariaLabel}
      aria-describedby="virtual-table-description"
      tabIndex={0}
    >
      {/* Hidden description for screen readers */}
      <span id="virtual-table-description" className="sr-only">
        Virtual scrolling table with {data.length} rows and {columns.length} columns.
        Use arrow keys to navigate between cells. Press Tab to move to the next interactive element.
        Rows are virtualized for performance - scroll to view more data.
      </span>

      <div
        role="table"
        aria-rowcount={data.length + 1}
        aria-colcount={columns.length}
        aria-label={caption}
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Optional table caption */}
        {caption && (
          <div role="caption" className="sr-only">
            {caption}
          </div>
        )}

        {/* Table Header */}
        <div
          role="rowgroup"
          className="sticky top-0 z-10 bg-background border-b"
        >
          <div role="row" className="flex" aria-rowindex={1}>
            {columns.map((column, colIndex) => (
              <div
                key={column.key}
                role="columnheader"
                aria-colindex={colIndex + 1}
                className="flex-1 px-4 py-3 text-left font-medium text-sm"
              >
                {column.header}
              </div>
            ))}
          </div>
        </div>

        {/* Table Body */}
        <div role="rowgroup">
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            const rowIndex = virtualRow.index + 2; // +1 for header, +1 for 1-based indexing

            return (
              <div
                key={virtualRow.index}
                role="row"
                aria-rowindex={rowIndex}
                className="absolute top-0 left-0 w-full flex hover:bg-muted/50 border-b"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((column, colIndex) => (
                  <div
                    key={column.key}
                    role="cell"
                    aria-colindex={colIndex + 1}
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
    </div>
  );
}