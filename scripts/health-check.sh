#!/bin/bash
# scripts/health-check.sh
# Automated database health monitoring
# Documentation: PERFORMANCE_AUTOMATION.md Section 6.2

set -e

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${VITE_SUPABASE_ANON_KEY}}"
DATABASE_URL="${DATABASE_URL}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🏥 DataParseDesk Performance Health Check${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# 1. Check database connectivity
echo -e "${BLUE}1. Database Connectivity${NC}"
if [ -z "$SUPABASE_URL" ]; then
  echo -e "   ${RED}❌ VITE_SUPABASE_URL not set${NC}"
  exit 1
fi

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_KEY}" 2>/dev/null || echo "000")

if [ "$RESPONSE" = "200" ]; then
  echo -e "   ${GREEN}✅ Database is accessible (HTTP $RESPONSE)${NC}"
else
  echo -e "   ${RED}❌ Database connectivity failed (HTTP $RESPONSE)${NC}"
  exit 1
fi

# 2. Check if we can connect to database directly
if [ -n "$DATABASE_URL" ]; then
  echo ""
  echo -e "${BLUE}2. Direct Database Connection${NC}"

  # Check if psql is available
  if command -v psql &> /dev/null; then
    # Check cache hit ratio
    echo -e "${BLUE}3. Cache Hit Ratio${NC}"
    CACHE_RATIO=$(psql "${DATABASE_URL}" -t -A -c "
      SELECT round(100.0 * sum(heap_blks_hit) /
        NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
      FROM pg_statio_user_tables;
    " 2>/dev/null | xargs)

    if [ -n "$CACHE_RATIO" ]; then
      echo "   Cache Hit Ratio: ${CACHE_RATIO}%"
      if (( $(echo "$CACHE_RATIO > 95" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "   ${GREEN}✅ Cache performance is good${NC}"
      else
        echo -e "   ${YELLOW}⚠️  Low cache hit ratio (target: >95%)${NC}"
      fi
    else
      echo -e "   ${YELLOW}⚠️  Could not query cache statistics${NC}"
    fi

    # Check for slow queries
    echo ""
    echo -e "${BLUE}4. Slow Query Check${NC}"
    SLOW_QUERIES=$(psql "${DATABASE_URL}" -t -A -c "
      SELECT count(*)
      FROM pg_stat_statements
      WHERE mean_exec_time > 1000
        AND calls > 10;
    " 2>/dev/null | xargs)

    if [ -n "$SLOW_QUERIES" ]; then
      echo "   Slow Queries (>1s): ${SLOW_QUERIES}"
      if [ "$SLOW_QUERIES" -eq 0 ]; then
        echo -e "   ${GREEN}✅ No slow queries detected${NC}"
      else
        echo -e "   ${YELLOW}⚠️  ${SLOW_QUERIES} queries need optimization${NC}"
      fi
    else
      echo -e "   ${YELLOW}⚠️  pg_stat_statements not available (run migration 20251027100000)${NC}"
    fi

    # Check active connections
    echo ""
    echo -e "${BLUE}5. Connection Pool Status${NC}"
    ACTIVE_CONNS=$(psql "${DATABASE_URL}" -t -A -c "
      SELECT count(*)
      FROM pg_stat_activity
      WHERE state = 'active'
        AND datname = current_database();
    " 2>/dev/null | xargs)

    if [ -n "$ACTIVE_CONNS" ]; then
      echo "   Active Connections: ${ACTIVE_CONNS}"
      if [ "$ACTIVE_CONNS" -lt 50 ]; then
        echo -e "   ${GREEN}✅ Connection pool healthy${NC}"
      else
        echo -e "   ${YELLOW}⚠️  High connection count (${ACTIVE_CONNS}/60)${NC}"
      fi
    fi

    # Check table bloat
    echo ""
    echo -e "${BLUE}6. Table Bloat Check${NC}"
    BLOATED_TABLES=$(psql "${DATABASE_URL}" -t -A -c "
      SELECT count(*)
      FROM pg_stat_user_tables
      WHERE n_dead_tup > n_live_tup * 0.2
        AND n_live_tup > 100;
    " 2>/dev/null | xargs)

    if [ -n "$BLOATED_TABLES" ]; then
      echo "   Bloated Tables: ${BLOATED_TABLES}"
      if [ "$BLOATED_TABLES" -eq 0 ]; then
        echo -e "   ${GREEN}✅ No table bloat detected${NC}"
      else
        echo -e "   ${YELLOW}⚠️  ${BLOATED_TABLES} tables need VACUUM${NC}"
      fi
    fi

    # Check database size
    echo ""
    echo -e "${BLUE}7. Database Size${NC}"
    DB_SIZE=$(psql "${DATABASE_URL}" -t -A -c "
      SELECT pg_size_pretty(pg_database_size(current_database()));
    " 2>/dev/null | xargs)

    if [ -n "$DB_SIZE" ]; then
      echo "   Database Size: ${DB_SIZE}"
      echo -e "   ${GREEN}✅ Size monitoring active${NC}"
    fi

    # Get performance metrics
    echo ""
    echo -e "${BLUE}8. Performance Metrics${NC}"
    psql "${DATABASE_URL}" -c "
      SELECT * FROM get_performance_metrics();
    " 2>/dev/null || echo -e "   ${YELLOW}⚠️  Performance metrics not available${NC}"

  else
    echo -e "   ${YELLOW}⚠️  psql not available - skipping detailed checks${NC}"
    echo -e "   ${YELLOW}   Install PostgreSQL client for detailed health checks${NC}"
  fi
else
  echo ""
  echo -e "${YELLOW}⚠️  DATABASE_URL not set - skipping detailed checks${NC}"
  echo -e "${YELLOW}   Set DATABASE_URL for complete health monitoring${NC}"
fi

# Summary
echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Health Check Complete${NC}"
echo -e "${CYAN}==========================================${NC}"

# Return appropriate exit code
if [ -n "$SLOW_QUERIES" ] && [ "$SLOW_QUERIES" -gt 5 ]; then
  echo -e "${YELLOW}⚠️  Some performance issues detected - review recommended${NC}"
  exit 1
elif [ -n "$ACTIVE_CONNS" ] && [ "$ACTIVE_CONNS" -gt 50 ]; then
  echo -e "${YELLOW}⚠️  High connection count - review recommended${NC}"
  exit 1
elif [ -n "$BLOATED_TABLES" ] && [ "$BLOATED_TABLES" -gt 5 ]; then
  echo -e "${YELLOW}⚠️  Table bloat detected - VACUUM recommended${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All systems operational${NC}"
  exit 0
fi
