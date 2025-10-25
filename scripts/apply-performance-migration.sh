#!/bin/bash
# Apply performance monitoring migration
# Usage: ./scripts/apply-performance-migration.sh

set -e

echo "🚀 Applying Performance Monitoring Migration"
echo "============================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set"
  echo ""
  echo "Please use one of these methods:"
  echo ""
  echo "Method 1: Via Supabase Dashboard (RECOMMENDED)"
  echo "  1. Go to: https://app.supabase.com/project/uzcmaxfhfcsxzfqvaloz/sql/new"
  echo "  2. Copy contents of: supabase/migrations/20251027100000_enable_performance_monitoring.sql"
  echo "  3. Click 'Run'"
  echo ""
  echo "Method 2: Via psql (if you have direct database access)"
  echo "  export DATABASE_URL='postgresql://postgres:password@db.xxx.supabase.co:5432/postgres'"
  echo "  psql \$DATABASE_URL -f supabase/migrations/20251027100000_enable_performance_monitoring.sql"
  echo ""
  exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found"
  echo ""
  echo "Please install PostgreSQL client:"
  echo "  macOS: brew install postgresql"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  echo ""
  echo "Or use Supabase Dashboard method (see above)"
  exit 1
fi

# Apply migration
echo "Applying migration to database..."
echo ""

psql "$DATABASE_URL" -f "supabase/migrations/20251027100000_enable_performance_monitoring.sql"

if [ $? -eq 0 ]; then
  echo ""
  echo "============================================="
  echo "✅ Migration applied successfully!"
  echo "============================================="
  echo ""
  echo "Next steps:"
  echo "  1. Test the functions:"
  echo "     SELECT * FROM get_performance_metrics();"
  echo ""
  echo "  2. Run health check:"
  echo "     npm run perf:health"
  echo ""
  echo "  3. Take a snapshot:"
  echo "     SELECT take_performance_snapshot();"
  echo ""
else
  echo ""
  echo "❌ Migration failed!"
  echo ""
  echo "Please check the error above or use Supabase Dashboard method."
  exit 1
fi
