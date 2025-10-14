import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { UploadZone } from '@/components/UploadZone';
import { FiltersBar } from '@/components/FiltersBar';
import { SummaryPanel } from '@/components/SummaryPanel';
import { DataTable } from '@/components/DataTable';
import { parseFile, ParseResult } from '@/utils/fileParser';
import { NormalizedRow, GroupBy, groupRows } from '@/utils/parseData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleFileSelect = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50MB.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await parseFile(file);
      
      // Check for duplicates and save to database
      const existingHashes = new Set<string>();
      const { data: existingData } = await supabase
        .from('transactions')
        .select('row_hash');
      
      if (existingData) {
        existingData.forEach(row => existingHashes.add(row.row_hash));
      }

      const newRows: NormalizedRow[] = [];
      let duplicateCount = 0;

      for (const row of result.data) {
        if (row.row_hash && existingHashes.has(row.row_hash)) {
          duplicateCount++;
        } else {
          newRows.push(row);
          if (row.row_hash) {
            existingHashes.add(row.row_hash);
          }
        }
      }

      // Save new rows to database
      if (newRows.length > 0) {
        const rowsToInsert = newRows.map(row => ({
          file_name: result.fileName,
          row_hash: row.row_hash || '',
          row_data: row,
          date_iso: row.date_iso,
          date_only: row.date_only,
          amount_num: row.amount_num
        }));

        const { error } = await supabase
          .from('transactions')
          .insert(rowsToInsert);

        if (error) {
          console.error('Error saving to database:', error);
          toast.error('Failed to save data to database');
        }
      }

      // Update result with only new rows
      const updatedResult = {
        ...result,
        data: newRows,
        rowCount: newRows.length
      };

      setParseResult(updatedResult);

      if (duplicateCount > 0) {
        toast.success(
          `Loaded ${newRows.length} new rows. Skipped ${duplicateCount} duplicates.`
        );
      } else {
        toast.success(`Loaded ${newRows.length} rows from ${result.fileName}`);
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!parseResult) return [];

    let filtered = parseResult.data;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(query)
        )
      );
    }

    // Date filter
    if (dateFrom) {
      filtered = filtered.filter(row =>
        row.date_only && row.date_only >= dateFrom
      );
    }
    if (dateTo) {
      filtered = filtered.filter(row =>
        row.date_only && row.date_only <= dateTo
      );
    }

    // Amount filter
    if (amountMin) {
      const min = parseFloat(amountMin);
      filtered = filtered.filter(row =>
        row.amount_num !== undefined && row.amount_num >= min
      );
    }
    if (amountMax) {
      const max = parseFloat(amountMax);
      filtered = filtered.filter(row =>
        row.amount_num !== undefined && row.amount_num <= max
      );
    }

    return filtered;
  }, [parseResult, searchQuery, dateFrom, dateTo, amountMin, amountMax]);

  const groupedData = useMemo(() => {
    if (groupBy === 'none') return filteredData;
    return groupRows(filteredData, groupBy);
  }, [filteredData, groupBy]);

  const totalAmount = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + (row.amount_num || 0), 0);
  }, [filteredData]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setGroupBy('none');
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <Header isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      {!parseResult ? (
        <UploadZone onFileSelect={handleFileSelect} isLoading={isLoading} />
      ) : (
        <>
          <FiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            amountMin={amountMin}
            onAmountMinChange={setAmountMin}
            amountMax={amountMax}
            onAmountMaxChange={setAmountMax}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            onReset={handleResetFilters}
          />

          <SummaryPanel
            totalRows={parseResult.rowCount}
            filteredRows={filteredData.length}
            totalAmount={totalAmount}
            groupCount={groupBy !== 'none' ? groupedData.length : undefined}
            fileName={parseResult.fileName}
          />

          <DataTable
            data={groupBy === 'none' ? filteredData : groupedData}
            headers={parseResult.headers}
            isGrouped={groupBy !== 'none'}
          />
        </>
      )}
    </div>
  );
};

export default Index;
