import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { UploadZone } from '@/components/UploadZone';
import { FiltersBar } from '@/components/FiltersBar';
import { SummaryPanel } from '@/components/SummaryPanel';
import { DataTable } from '@/components/DataTable';
import { parseFile, ParseResult } from '@/utils/fileParser';
import { NormalizedRow, GroupBy, groupRows } from '@/utils/parseData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Require authentication
  if (authLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
      
      // Check for duplicates using order_number
      const orderNumbers = result.data
        .map(row => row["Order number"])
        .filter(Boolean);
      
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('order_number')
        .eq('user_id', user.id)
        .in('order_number', orderNumbers);
      
      const existingOrderSet = new Set(
        existingOrders?.map(row => row.order_number) || []
      );

      const newRows: NormalizedRow[] = [];
      let duplicateCount = 0;

      for (const row of result.data) {
        if (row["Order number"] && existingOrderSet.has(row["Order number"])) {
          duplicateCount++;
        } else {
          newRows.push(row);
        }
      }

      const startTime = Date.now();

      // Save new rows to database
      if (newRows.length > 0) {
        const ordersToInsert = newRows.map(row => ({
          user_id: user.id,
          order_number: row["Order number"] || '',
          operator_code: row["Operator Code"] || null,
          goods_name: row["Goods name"] || null,
          flavour_name: row["Flavour name"] || null,
          order_resource: row["Order resource"] || null,
          order_type: row["Order type"] || null,
          order_status: row["Order status"] || null,
          cup_type: row["Cup type"] ? parseInt(row["Cup type"]) : null,
          machine_code: row["Machine Code"] || null,
          address: row["Address"] || null,
          order_price: row["Order price"] ? parseFloat(row["Order price"]) : null,
          brew_status: row["Brew status"] || null,
          creation_time: row["Creation time"] || null,
          paying_time: row["Paying time"] || null,
          brewing_time: row["Brewing time"] || null,
          delivery_time: row["Delivery time"] || null,
          refund_time: row["Refund time"] || null,
          pay_card: row["Pay Card"] || null,
          reason: row["Reason"] || null,
          remark: row["Remark"] || null,
        }));

        const { error } = await supabase
          .from('orders')
          .insert(ordersToInsert);

        if (error) {
          console.error('Error saving to database:', error);
          toast.error('Failed to save data to database');
        } else {
          const processingTime = (Date.now() - startTime) / 1000;

          // Log upload to upload_log table
          await supabase.from('upload_log').insert({
            user_id: user.id,
            filename: result.fileName,
            total_rows: result.data.length,
            new_records: newRows.length,
            duplicate_records: duplicateCount,
            error_records: 0,
            processing_time_seconds: processingTime,
            status: 'success',
            file_size_bytes: file.size,
          });

          // Update total_orders in metadata
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          await supabase
            .from('database_metadata')
            .upsert({
              key: 'total_orders',
              user_id: user.id,
              value: String(count || 0),
              description: 'Total number of orders in database',
            }, { onConflict: 'key,user_id' });
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
      <Header />

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
