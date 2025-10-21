import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  Line,
  Bar,
  Area,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartRendererProps {
  chartName: string;
  chartType: string;
  databaseId: string;
  xColumn: string;
  yColumn: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export const ChartRenderer = ({ chartName, chartType, databaseId, xColumn, yColumn }: ChartRendererProps) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['chart-data', databaseId, xColumn, yColumn],
    queryFn: async () => {
      const { data } = await supabase
        .from('table_data')
        .select('data')
        .eq('database_id', databaseId)
        .limit(50);

      return data?.map(row => ({
        [xColumn]: row.data[xColumn],
        [yColumn]: row.data[yColumn],
      })) || [];
    },
    enabled: !!databaseId,
  });

  if (isLoading || !chartData || chartData.length === 0) {
    return (
      <Card className="mt-2">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading chart data...' : 'No data available for chart'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = {
    line: LineChart,
    bar: BarChart,
    area: AreaChart,
    pie: PieChart,
  }[chartType] || BarChart;

  const DataComponent = {
    line: Line,
    bar: Bar,
    area: Area,
    pie: Pie,
  }[chartType] || Bar;

  return (
    <Card className="mt-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{chartName}</span>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <ChartComponent data={chartData}>
            {chartType !== 'pie' && (
              <>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xColumn} />
                <YAxis />
                <Tooltip />
                <Legend />
                <DataComponent
                  dataKey={yColumn}
                  fill="#8884d8"
                  stroke="#8884d8"
                />
              </>
            )}
            {chartType === 'pie' && (
              <>
                <Tooltip />
                <Pie
                  data={chartData}
                  dataKey={yColumn}
                  nameKey={xColumn}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
