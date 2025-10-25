# 📊 Monitoring & Alerting Setup Guide

**Data Parse Desk 2.0 - Security-First Monitoring**

This guide helps you set up comprehensive monitoring and alerting for your production deployment.

---

## Table of Contents

1. [Database Monitoring](#database-monitoring)
2. [Application Performance](#application-performance)
3. [Security Monitoring](#security-monitoring)
4. [Error Tracking](#error-tracking)
5. [Uptime Monitoring](#uptime-monitoring)
6. [Alert Configuration](#alert-configuration)
7. [Dashboard Setup](#dashboard-setup)

---

## 1. Database Monitoring

### Supabase Built-in Monitoring

**Access:** Supabase Dashboard > Project > Reports

#### Key Metrics to Monitor

```sql
-- 1. Active Connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Alert when: > 80% of max_connections
-- Action: Investigate connection leaks, enable connection pooling
```

```sql
-- 2. Slow Queries (>1 second)
SELECT
  user_id,
  query_type,
  execution_time_ms,
  created_at
FROM query_performance_log
WHERE execution_time_ms > 1000
ORDER BY execution_time_ms DESC
LIMIT 50;

-- Alert when: > 10 slow queries in 5 minutes
-- Action: Add indexes, optimize queries
```

```sql
-- 3. Database Size Growth
SELECT
  pg_size_pretty(pg_database_size(current_database())) as total_size,
  pg_size_pretty(pg_total_relation_size('pg_toast.pg_toast_oid')) as toast_size;

-- Alert when: > 80% of plan limit
-- Action: Review data retention policies, archive old data
```

```sql
-- 4. RLS Policy Performance
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
HAVING COUNT(*) > 10
ORDER BY policy_count DESC;

-- Alert when: Table has > 20 policies (may impact performance)
-- Action: Review and consolidate policies if possible
```

```sql
-- 5. Failed Deletion Requests
SELECT
  dr.user_id,
  dr.status,
  dr.scheduled_for,
  dr.created_at
FROM deletion_requests dr
WHERE dr.status = 'failed'
  AND dr.created_at > NOW() - INTERVAL '24 hours';

-- Alert when: Any failed deletions
-- Action: Investigate failure reason, retry manually
```

### pg_cron Job Monitoring

```sql
-- Check if data retention cleanup is running
SELECT
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  active
FROM cron.job
WHERE jobname = 'daily-data-retention-cleanup';

-- Verify last run
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-data-retention-cleanup')
ORDER BY start_time DESC
LIMIT 10;

-- Alert when:
-- - active = FALSE (job disabled)
-- - Last run status != 'succeeded'
-- - No run in last 25 hours
```

### Automated Monitoring Queries

Create a scheduled function to log key metrics:

```sql
-- Create monitoring_metrics table
CREATE TABLE IF NOT EXISTS monitoring_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE monitoring_metrics ENABLE ROW LEVEL SECURITY;

-- Only service role can insert
CREATE POLICY "Service role can insert metrics"
  ON monitoring_metrics FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Create monitoring function
CREATE OR REPLACE FUNCTION collect_monitoring_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Active connections
  INSERT INTO monitoring_metrics (metric_name, metric_value, metric_unit)
  SELECT 'active_connections', COUNT(*), 'connections'
  FROM pg_stat_activity
  WHERE state = 'active';

  -- Database size
  INSERT INTO monitoring_metrics (metric_name, metric_value, metric_unit)
  SELECT 'database_size', pg_database_size(current_database()), 'bytes';

  -- RLS policy count
  INSERT INTO monitoring_metrics (metric_name, metric_value, metric_unit)
  SELECT 'rls_policy_count', COUNT(*), 'policies'
  FROM pg_policies
  WHERE schemaname = 'public';

  -- API keys count
  INSERT INTO monitoring_metrics (metric_name, metric_value, metric_unit)
  SELECT 'api_keys_total', COUNT(*), 'keys'
  FROM api_keys;

  -- Pending deletion requests
  INSERT INTO monitoring_metrics (metric_name, metric_value, metric_unit)
  SELECT 'deletion_requests_pending', COUNT(*), 'requests'
  FROM deletion_requests
  WHERE status = 'pending';

  -- Slow queries in last hour
  INSERT INTO monitoring_metrics (metric_name, metric_value, metric_unit)
  SELECT 'slow_queries_1h', COUNT(*), 'queries'
  FROM query_performance_log
  WHERE execution_time_ms > 1000
    AND created_at > NOW() - INTERVAL '1 hour';
END;
$$;

-- Schedule metrics collection every 5 minutes
SELECT cron.schedule(
  'collect-monitoring-metrics',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT collect_monitoring_metrics();'
);
```

---

## 2. Application Performance

### Web Vitals Monitoring

Add to your application:

```typescript
// src/utils/webVitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

export function reportWebVitals(onPerfEntry?: (metric: WebVitalMetric) => void) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onFCP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
}

// Send to your analytics
export async function sendToAnalytics(metric: WebVitalMetric) {
  // Send to your analytics service
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    timestamp: Date.now(),
  });

  // Example: Send to custom endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', body);
  } else {
    fetch('/api/analytics', {
      body,
      method: 'POST',
      keepalive: true,
    });
  }
}
```

Update `src/main.tsx`:

```typescript
import { reportWebVitals, sendToAnalytics } from './utils/webVitals';

// ... existing code ...

// Report web vitals
reportWebVitals(sendToAnalytics);
```

### Performance Thresholds

```typescript
// src/config/performanceThresholds.ts
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  FID: { good: 100, poor: 300 },        // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte

  // Custom metrics
  API_RESPONSE: { good: 500, poor: 2000 },  // API response time (ms)
  QUERY_EXECUTION: { good: 100, poor: 1000 }, // DB query time (ms)
};

export function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = PERFORMANCE_THRESHOLDS[metric as keyof typeof PERFORMANCE_THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}
```

---

## 3. Security Monitoring

### Failed Authentication Attempts

```sql
-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role can manage security events"
  ON security_events
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Add index
CREATE INDEX idx_security_events_type_created
  ON security_events(event_type, created_at DESC);

-- Monitor failed login attempts
CREATE OR REPLACE FUNCTION check_failed_logins()
RETURNS TABLE (
  ip_address INET,
  failed_attempts BIGINT,
  last_attempt TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    ip_address,
    COUNT(*) as failed_attempts,
    MAX(created_at) as last_attempt
  FROM security_events
  WHERE event_type = 'failed_login'
    AND created_at > NOW() - INTERVAL '1 hour'
  GROUP BY ip_address
  HAVING COUNT(*) >= 5
  ORDER BY failed_attempts DESC;
$$;

-- Alert when: > 5 failed attempts from same IP in 1 hour
```

### Suspicious API Key Usage

```sql
-- Monitor API key usage
CREATE TABLE IF NOT EXISTS api_key_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api_key_usage_log ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_api_key_usage_key_created
  ON api_key_usage_log(api_key_id, created_at DESC);

CREATE INDEX idx_api_key_usage_ip_created
  ON api_key_usage_log(ip_address, created_at DESC);

-- Detect suspicious patterns
CREATE OR REPLACE FUNCTION detect_suspicious_api_usage()
RETURNS TABLE (
  api_key_id UUID,
  key_name TEXT,
  issue_type TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- High request rate (> 100 req/min)
  RETURN QUERY
  SELECT
    aul.api_key_id,
    ak.name as key_name,
    'high_request_rate' as issue_type,
    jsonb_build_object(
      'requests_per_minute', COUNT(*) / 60.0,
      'last_hour', NOW() - INTERVAL '1 hour'
    ) as details
  FROM api_key_usage_log aul
  JOIN api_keys ak ON aul.api_key_id = ak.id
  WHERE aul.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY aul.api_key_id, ak.name
  HAVING COUNT(*) > 6000;

  -- Multiple IPs using same key
  RETURN QUERY
  SELECT
    aul.api_key_id,
    ak.name as key_name,
    'multiple_ips' as issue_type,
    jsonb_build_object(
      'unique_ips', COUNT(DISTINCT aul.ip_address),
      'ips', array_agg(DISTINCT aul.ip_address)
    ) as details
  FROM api_key_usage_log aul
  JOIN api_keys ak ON aul.api_key_id = ak.id
  WHERE aul.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY aul.api_key_id, ak.name
  HAVING COUNT(DISTINCT aul.ip_address) > 5;
END;
$$;
```

### RLS Bypass Attempts

```sql
-- Log RLS policy violations
CREATE OR REPLACE FUNCTION log_rls_violation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO security_events (
    event_type,
    user_id,
    metadata
  ) VALUES (
    'rls_violation_attempt',
    auth.uid(),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'attempted_at', NOW()
    )
  );

  RETURN NULL;
END;
$$;

-- Note: This would need to be added to tables where you want to detect bypass attempts
-- It's complex to implement fully, but the concept is to log when policies block access
```

---

## 4. Error Tracking

### Sentry Integration

**Setup:**

```bash
npm install @sentry/react @sentry/tracing
```

**Configuration:** `src/utils/sentry.ts`

```typescript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

export function initSentry() {
  if (import.meta.env.VITE_ENVIRONMENT !== 'production') {
    return; // Don't init in development
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENVIRONMENT,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.Authorization;
      }

      // Don't send API keys
      if (event.extra) {
        Object.keys(event.extra).forEach(key => {
          if (key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('token') ||
              key.toLowerCase().includes('password')) {
            delete event.extra![key];
          }
        });
      }

      return event;
    },
  });
}

// Helper to capture errors with context
export function captureError(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Helper to set user context
export function setUserContext(user: { id: string; email?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}
```

**Update** `src/main.tsx`:

```typescript
import { initSentry } from './utils/sentry';

initSentry();

// ... rest of your app
```

### Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>We've been notified and are working on a fix.</p>
          <button onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 5. Uptime Monitoring

### UptimeRobot Setup

1. **Sign up:** https://uptimerobot.com/
2. **Create HTTP(S) monitor:**
   - Monitor Type: HTTP(s)
   - Friendly Name: Data Parse Desk - Main App
   - URL: https://yourdomain.com
   - Monitoring Interval: 5 minutes

3. **Create additional monitors:**
   - Health Check Endpoint: `/api/health`
   - Critical Edge Functions (sample a few)

4. **Configure alerts:**
   - Email notifications
   - Slack/Discord webhook
   - SMS for critical alerts (optional)

### Health Check Endpoint

Create a health check edge function:

```typescript
// supabase/functions/health-check/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const startTime = Date.now();

  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {} as Record<string, any>,
  };

  try {
    // 1. Database connectivity
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabase
      .from('databases')
      .select('count')
      .limit(1);

    checks.checks.database = {
      status: dbError ? 'unhealthy' : 'healthy',
      error: dbError?.message,
    };

    // 2. RLS policy count
    const { data: policyCount, error: policyError } = await supabase
      .rpc('count_rls_policies');

    checks.checks.rls_policies = {
      status: policyError ? 'unhealthy' : 'healthy',
      count: policyCount,
      expected_minimum: 192,
    };

    // 3. pg_cron jobs
    const { data: cronJobs, error: cronError } = await supabase
      .from('cron.job')
      .select('*')
      .eq('active', true);

    checks.checks.cron_jobs = {
      status: cronError ? 'unhealthy' : 'healthy',
      active_jobs: cronJobs?.length || 0,
    };

    // Overall status
    const hasUnhealthy = Object.values(checks.checks).some(
      (check: any) => check.status === 'unhealthy'
    );

    checks.status = hasUnhealthy ? 'unhealthy' : 'healthy';
    checks.response_time_ms = Date.now() - startTime;

    return new Response(
      JSON.stringify(checks, null, 2),
      {
        status: hasUnhealthy ? 503 : 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## 6. Alert Configuration

### Alert Thresholds

Create an alert configuration table:

```sql
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  check_interval_minutes INTEGER DEFAULT 5,
  alert_channels TEXT[] DEFAULT ARRAY['email'],
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default thresholds
INSERT INTO alert_thresholds (metric_name, warning_threshold, critical_threshold, check_interval_minutes) VALUES
  ('active_connections', 50, 80, 5),
  ('database_size_gb', 8, 10, 60),
  ('slow_queries_per_hour', 10, 50, 5),
  ('failed_logins_per_hour', 10, 50, 5),
  ('api_errors_per_hour', 20, 100, 5),
  ('pending_deletion_requests', 10, 50, 60),
  ('failed_cron_jobs', 1, 3, 60);
```

### Alert Notification Function

```typescript
// supabase/functions/send-alert/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface Alert {
  metric: string;
  level: 'warning' | 'critical';
  currentValue: number;
  threshold: number;
  message: string;
}

async function sendEmailAlert(alert: Alert) {
  // Use your email service (SendGrid, Resend, etc.)
  const subject = `[${alert.level.toUpperCase()}] ${alert.metric} Alert`;
  const body = `
    Alert: ${alert.message}

    Metric: ${alert.metric}
    Current Value: ${alert.currentValue}
    Threshold: ${alert.threshold}
    Level: ${alert.level}

    Time: ${new Date().toISOString()}
  `;

  // Send email (implement based on your email service)
  console.log('Email alert:', subject, body);
}

async function sendSlackAlert(alert: Alert) {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!webhookUrl) return;

  const emoji = alert.level === 'critical' ? ':rotating_light:' : ':warning:';

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${emoji} *${alert.level.toUpperCase()}* Alert`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.metric}*\n${alert.message}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Current:*\n${alert.currentValue}` },
            { type: 'mrkdwn', text: `*Threshold:*\n${alert.threshold}` },
          ],
        },
      ],
    }),
  });
}

serve(async (req) => {
  try {
    const alert: Alert = await req.json();

    // Send to configured channels
    await Promise.all([
      sendEmailAlert(alert),
      sendSlackAlert(alert),
    ]);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 7. Dashboard Setup

### Supabase Dashboard

**Recommended Views:**

1. **Security Dashboard**
   - RLS policy count
   - Failed login attempts (last 24h)
   - Active API keys
   - Pending deletion requests
   - Recent security events

2. **Performance Dashboard**
   - Slow queries (>1s)
   - Active connections
   - Database size
   - pg_cron job status
   - API response times

3. **Compliance Dashboard**
   - Data retention status
   - Deletion request queue
   - Encryption status
   - GDPR compliance metrics

### Create Custom Dashboard View

```sql
-- Create dashboard view
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  -- Security metrics
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as rls_policy_count,
  (SELECT COUNT(*) FROM api_keys WHERE encrypted_key IS NOT NULL) as encrypted_api_keys,
  (SELECT COUNT(*) FROM deletion_requests WHERE status = 'pending') as pending_deletions,

  -- Performance metrics
  (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
  (SELECT pg_database_size(current_database())) as database_size_bytes,

  -- Compliance metrics
  (SELECT COUNT(*) FROM data_retention_config WHERE cleanup_enabled = true) as retention_policies_active,
  (SELECT COUNT(*) FROM cron.job WHERE active = true) as active_cron_jobs,

  -- Error metrics
  (SELECT COUNT(*) FROM security_events WHERE event_type = 'failed_login' AND created_at > NOW() - INTERVAL '1 hour') as failed_logins_1h,

  NOW() as snapshot_time;

-- Grant access
GRANT SELECT ON dashboard_metrics TO authenticated;
```

---

## Quick Start Checklist

- [ ] Set up Supabase monitoring queries
- [ ] Create `monitoring_metrics` table
- [ ] Schedule `collect_monitoring_metrics()` function
- [ ] Install and configure Sentry
- [ ] Add error boundaries to critical components
- [ ] Set up UptimeRobot monitors
- [ ] Deploy health-check edge function
- [ ] Configure alert thresholds
- [ ] Set up Slack/email notifications
- [ ] Create monitoring dashboard views
- [ ] Test all alerts (trigger manually)
- [ ] Document escalation procedures

---

## Additional Resources

- [Supabase Monitoring Docs](https://supabase.com/docs/guides/platform/performance)
- [Sentry React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Web Vitals](https://web.dev/vitals/)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html)

---

*Last Updated: October 27, 2025*
