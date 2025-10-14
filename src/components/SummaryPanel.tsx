import { FileText, Hash, Coins, Grid } from 'lucide-react';
import { formatAmount } from '@/utils/parseData';

interface SummaryPanelProps {
  totalRows: number;
  filteredRows: number;
  totalAmount: number;
  groupCount?: number;
  fileName: string;
}

export function SummaryPanel({
  totalRows,
  filteredRows,
  totalAmount,
  groupCount,
  fileName,
}: SummaryPanelProps) {
  return (
    <div className="border-b bg-muted/50">
      <div className="container px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm">
            <div className="rounded-full bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">File</p>
              <p className="font-semibold truncate" title={fileName}>{fileName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm">
            <div className="rounded-full bg-primary/10 p-2">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rows</p>
              <p className="font-semibold">
                {filteredRows.toLocaleString()} {filteredRows !== totalRows && (
                  <span className="text-sm text-muted-foreground">/ {totalRows.toLocaleString()}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm">
            <div className="rounded-full bg-success/10 p-2">
              <Coins className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-semibold">{formatAmount(totalAmount)}</p>
            </div>
          </div>

          {groupCount !== undefined && (
            <div className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm">
              <div className="rounded-full bg-accent/10 p-2">
                <Grid className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Groups</p>
                <p className="font-semibold">{groupCount}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
