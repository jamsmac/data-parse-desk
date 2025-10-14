import { Search, Calendar, DollarSign, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { GroupBy } from '@/utils/parseData';

interface FiltersBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  amountMin: string;
  onAmountMinChange: (value: string) => void;
  amountMax: string;
  onAmountMaxChange: (value: string) => void;
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
  onReset: () => void;
}

export function FiltersBar({
  searchQuery,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  amountMin,
  onAmountMinChange,
  amountMax,
  onAmountMaxChange,
  groupBy,
  onGroupByChange,
  onReset,
}: FiltersBarProps) {
  return (
    <div className="sticky top-16 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container px-4 py-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search across all columns..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Date & Amount Filters */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date From
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date To
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Min Amount
              </label>
              <Input
                type="number"
                placeholder="0"
                value={amountMin}
                onChange={(e) => onAmountMinChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Max Amount
              </label>
              <Input
                type="number"
                placeholder="∞"
                value={amountMax}
                onChange={(e) => onAmountMaxChange(e.target.value)}
              />
            </div>
          </div>

          {/* Group By & Reset */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Group By</label>
              <Select value={groupBy} onValueChange={(value) => onGroupByChange(value as GroupBy)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="day">By Day</SelectItem>
                  <SelectItem value="month">By Month</SelectItem>
                  <SelectItem value="year">By Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={onReset} className="mt-auto">
              <X className="mr-2 h-4 w-4" />
              Reset Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
