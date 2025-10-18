import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const startRecord = currentPage * pageSize + 1;
  const endRecord = Math.min((currentPage + 1) * pageSize, totalRecords);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Показано {startRecord}-{endRecord} из {totalRecords}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">На странице:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(0);
            }}
          >
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          className="h-9 w-9"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Страница</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage + 1}
            onChange={(e) => {
              const page = parseInt(e.target.value) - 1;
              if (page >= 0 && page < totalPages) {
                onPageChange(page);
              }
            }}
            className="w-16 h-9 text-center"
          />
          <span className="text-sm text-muted-foreground">из {totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="h-9 w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          className="h-9 w-9"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
