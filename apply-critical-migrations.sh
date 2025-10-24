#!/bin/bash
set -e

echo "🚀 Applying critical migrations only..."
echo ""

# Get database URL from Supabase
PROJECT_REF="uzcmaxfhfcsxzfqvaloz"

echo "1️⃣ Applying sync migration (fixes structure mismatches)..."
npx supabase migration up --include "20251023130001_sync_database_structure_fixed.sql"

echo ""
echo "2️⃣ Applying RLS security fix (CRITICAL)..."
npx supabase migration up --include "20251022000007_fix_insecure_rls_policies.sql"

echo ""
echo "3️⃣ Applying performance indexes..."
npx supabase migration up --include "20251025000001_performance_indexes_critical.sql"

echo ""
echo "✅ Critical migrations applied successfully!"
echo "📊 Summary:"
echo "  - Structure synchronized"
echo "  - RLS policies secured"
echo "  - Performance indexes created"
