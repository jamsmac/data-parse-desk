import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Zap,
  Database,
  Cloud,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  getPerformanceMetrics,
  getAggregatedMetrics,
  getPerformanceScore,
  clearPerformanceMetrics,
  exportMetrics,
  DatabaseQueryTracker,
  APIRequestTracker,
  MemoryTracker,
} from '@/lib/monitoring';

export function PerformanceDashboard() {
  const [aggregated, setAggregated] = useState<ReturnType<typeof getAggregatedMetrics>>({});
  const [score, setScore] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState({ usage: 0, limit: 0, percentage: 0 });
  const [timeRange, setTimeRange] = useState<1 | 6 | 24>(24);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  const loadMetrics = () => {
    setRefreshing(true);
    setAggregated(getAggregatedMetrics(timeRange));
    setScore(getPerformanceScore());
    setMemoryUsage(MemoryTracker.trackMemoryUsage());
    setRefreshing(false);
  };

  const handleExport = () => {
    const data = exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all performance metrics?')) {
      clearPerformanceMetrics();
      DatabaseQueryTracker.clear();
      APIRequestTracker.clear();
      loadMetrics();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    if (score >= 70) return <Badge variant="default" className="bg-yellow-500">Good</Badge>;
    if (score >= 50) return <Badge variant="default" className="bg-orange-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  // Prepare chart data for Web Vitals
  const webVitalsData = [
    {
      name: 'LCP',
      value: aggregated.LCP?.p75 || 0,
      threshold: 2500,
      good: aggregated.LCP?.p75 && aggregated.LCP.p75 < 2500,
    },
    {
      name: 'FID',
      value: aggregated.FID?.p75 || 0,
      threshold: 100,
      good: aggregated.FID?.p75 && aggregated.FID.p75 < 100,
    },
    {
      name: 'CLS',
      value: (aggregated.CLS?.p75 || 0) * 1000, // Scale for visibility
      threshold: 100, // 0.1 * 1000
      good: aggregated.CLS?.p75 && aggregated.CLS.p75 < 0.1,
    },
    {
      name: 'FCP',
      value: aggregated.FCP?.p75 || 0,
      threshold: 1800,
      good: aggregated.FCP?.p75 && aggregated.FCP.p75 < 1800,
    },
  ];

  // Prepare chart data for load times
  const loadTimesData = [
    { name: 'DNS', time: aggregated.DNS?.avg || 0 },
    { name: 'TCP', time: aggregated.TCP?.avg || 0 },
    { name: 'Request', time: aggregated.Request?.avg || 0 },
    { name: 'Response', time: aggregated.Response?.avg || 0 },
    { name: 'DOM Parsing', time: aggregated.DOMParsing?.avg || 0 },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor application performance and Web Vitals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMetrics}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear Data
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Score
          </CardTitle>
          <CardDescription>
            Based on Web Vitals and application metrics from the last {timeRange} hour(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
                {score}
              </div>
              <div>
                {getScoreBadge(score)}
                <p className="text-sm text-muted-foreground mt-1">out of 100</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-3 py-1"
                  value={timeRange}
                  onChange={(e) => setTimeRange(Number(e.target.value) as 1 | 6 | 24)}
                >
                  <option value={1}>Last Hour</option>
                  <option value={6}>Last 6 Hours</option>
                  <option value={24}>Last 24 Hours</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Load Time</p>
                <p className="text-2xl font-bold">
                  {aggregated.TotalLoadTime?.avg?.toFixed(0) || 0}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg API Response</p>
                <p className="text-2xl font-bold">
                  {APIRequestTracker.getAverageResponseTime().toFixed(0)}ms
                </p>
              </div>
              <Cloud className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg DB Query</p>
                <p className="text-2xl font-bold">
                  {DatabaseQueryTracker.getAverageQueryTime().toFixed(0)}ms
                </p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Memory Usage</p>
                <p className="text-2xl font-bold">{memoryUsage.usage.toFixed(0)}MB</p>
                <p className="text-xs text-muted-foreground">
                  {memoryUsage.percentage.toFixed(1)}% of {memoryUsage.limit.toFixed(0)}MB
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
            <Progress value={memoryUsage.percentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="webvitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webvitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="loadtimes">Load Times</TabsTrigger>
          <TabsTrigger value="api">API Requests</TabsTrigger>
          <TabsTrigger value="database">Database Queries</TabsTrigger>
        </TabsList>

        {/* Web Vitals Tab */}
        <TabsContent value="webvitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>
                Google's metrics for user experience quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={webVitalsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Current (p75)" />
                  <Bar dataKey="threshold" fill="#82ca9d" name="Threshold" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries({
                  LCP: { name: 'Largest Contentful Paint', threshold: 2500, unit: 'ms' },
                  FID: { name: 'First Input Delay', threshold: 100, unit: 'ms' },
                  CLS: { name: 'Cumulative Layout Shift', threshold: 0.1, unit: '' },
                  FCP: { name: 'First Contentful Paint', threshold: 1800, unit: 'ms' },
                }).map(([key, config]) => {
                  const metric = aggregated[key];
                  if (!metric) return null;

                  const isGood = metric.p75 < config.threshold;

                  return (
                    <Card key={key}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{config.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-2xl font-bold">
                                {metric.p75.toFixed(key === 'CLS' ? 3 : 0)}{config.unit}
                              </span>
                              {isGood ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Threshold: {config.threshold}{config.unit}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Min:</span>
                            <span>{metric.min.toFixed(key === 'CLS' ? 3 : 0)}{config.unit}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Avg:</span>
                            <span>{metric.avg.toFixed(key === 'CLS' ? 3 : 0)}{config.unit}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Max:</span>
                            <span>{metric.max.toFixed(key === 'CLS' ? 3 : 0)}{config.unit}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>P95:</span>
                            <span>{metric.p95.toFixed(key === 'CLS' ? 3 : 0)}{config.unit}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Load Times Tab */}
        <TabsContent value="loadtimes">
          <Card>
            <CardHeader>
              <CardTitle>Page Load Breakdown</CardTitle>
              <CardDescription>
                Time spent in each phase of page loading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={loadTimesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="time"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Time (ms)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Requests Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Request Performance</CardTitle>
              <CardDescription>
                Network request timing and failure rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Slow Requests (&gt; 1s)</p>
                  <div className="space-y-2">
                    {APIRequestTracker.getSlowRequests().slice(0, 5).map((req, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{req.method}</Badge>
                          <span className="font-mono text-xs">{req.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500">{req.duration.toFixed(0)}ms</span>
                          <Badge variant={req.status >= 400 ? 'destructive' : 'default'}>
                            {req.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {APIRequestTracker.getSlowRequests().length === 0 && (
                      <p className="text-sm text-muted-foreground">No slow requests detected</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Failed Requests</p>
                  <div className="space-y-2">
                    {APIRequestTracker.getFailedRequests().slice(0, 5).map((req, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{req.method}</Badge>
                          <span className="font-mono text-xs">{req.endpoint}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{req.duration.toFixed(0)}ms</span>
                          <Badge variant="destructive">{req.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {APIRequestTracker.getFailedRequests().length === 0 && (
                      <p className="text-sm text-muted-foreground">No failed requests</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Query Performance</CardTitle>
              <CardDescription>
                Slow queries and database operation timing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Slow Queries (&gt; 100ms)</p>
                  <div className="space-y-2">
                    {DatabaseQueryTracker.getSlowQueries().slice(0, 5).map((query, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{query.database}</Badge>
                          <span className="font-mono text-xs truncate max-w-md">
                            {query.query}
                          </span>
                        </div>
                        <span className="text-orange-500">{query.duration.toFixed(0)}ms</span>
                      </div>
                    ))}
                    {DatabaseQueryTracker.getSlowQueries().length === 0 && (
                      <p className="text-sm text-muted-foreground">No slow queries detected</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
