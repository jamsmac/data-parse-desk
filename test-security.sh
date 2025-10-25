#!/bin/bash

###############################################################################
# Security Testing Utility
# Data Parse Desk 2.0
#
# Tests all security features after migration deployment:
# - RLS policy isolation
# - API key encryption
# - GDPR compliance
# - SECURITY DEFINER protection
# - Data retention
#
# Usage: ./test-security.sh [--verbose]
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Logging
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

run_sql() {
  local query=$1
  local description=$2

  if [ "$VERBOSE" = true ]; then
    log_info "Running: $description"
    echo "$query"
  fi

  # This would connect to your database - adjust connection method as needed
  # For now, we'll output the SQL that should be run
  echo "$query"
}

# Banner
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Security Testing Utility                          ║"
echo "║              Data Parse Desk 2.0                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name=$1
  local sql_query=$2
  local expected=$3

  TESTS_RUN=$((TESTS_RUN + 1))

  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "Test $TESTS_RUN: $test_name"
  echo "══════════════════════════════════════════════════════════════"
  echo ""
  echo "SQL Query:"
  echo "$sql_query"
  echo ""
  echo "Expected: $expected"
  echo ""
  log_warning "Please run this query in Supabase SQL Editor and verify the result"
  echo ""
}

# Test 1: RLS Policy Count
run_test "RLS Policy Count" \
  "SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';" \
  "Should be 192 or more policies"

# Test 2: RLS on query_performance_log
run_test "query_performance_log RLS Enabled" \
  "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'query_performance_log';" \
  "rowsecurity should be TRUE"

# Test 3: API Keys Encryption
run_test "API Keys Encrypted" \
  "SELECT
    COUNT(*) as total_keys,
    COUNT(encrypted_key) as encrypted_keys,
    COUNT(encrypted_key) * 100.0 / COUNT(*) as encryption_percentage
  FROM api_keys;" \
  "encryption_percentage should be 100%"

# Test 4: Data Retention Config Exists
run_test "Data Retention Config Table" \
  "SELECT COUNT(*) as config_count FROM data_retention_config;" \
  "Should have at least 1 retention policy configured"

# Test 5: Deletion Requests Table Exists
run_test "Deletion Requests Table" \
  "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deletion_requests';" \
  "Should return 1 (table exists)"

# Test 6: pg_cron Job Scheduled
run_test "Data Retention Cleanup Job" \
  "SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'daily-data-retention-cleanup';" \
  "Job should exist with schedule '0 2 * * *' and active = TRUE"

# Test 7: SECURITY DEFINER Functions Protected
run_test "SECURITY DEFINER search_path Protection" \
  "SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE
      WHEN prosecdef THEN
        CASE
          WHEN array_to_string(proconfig, ', ') LIKE '%search_path%' THEN 'PROTECTED'
          ELSE 'VULNERABLE'
        END
      ELSE 'NOT SECURITY DEFINER'
    END as security_status
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
  ORDER BY
    CASE
      WHEN array_to_string(proconfig, ', ') LIKE '%search_path%' THEN 0
      ELSE 1
    END,
    p.proname;" \
  "All SECURITY DEFINER functions should have status 'PROTECTED'"

# Test 8: Encryption Functions Exist
run_test "API Key Encryption Functions" \
  "SELECT proname FROM pg_proc
  WHERE proname IN ('encrypt_api_key', 'decrypt_api_key', 'hash_api_key')
  ORDER BY proname;" \
  "Should return all 3 functions"

# Test 9: GDPR Functions Exist
run_test "GDPR Deletion Functions" \
  "SELECT proname FROM pg_proc
  WHERE proname IN ('request_user_deletion', 'execute_user_deletion', 'cleanup_old_data')
  ORDER BY proname;" \
  "Should return all 3 functions"

# Test 10: Dynamic Table RLS (if any dynamic tables exist)
run_test "Dynamic Tables Have RLS" \
  "SELECT
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
    AND t.tablename LIKE 'data_%'
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;" \
  "All data_* tables should have rls_enabled = TRUE and policy_count >= 4"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Interactive RLS Test                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_info "To test RLS isolation, follow these steps:"
echo ""
echo "1. Create two test users (User A and User B) via your application"
echo ""
echo "2. As User A, create a database/table and insert some data"
echo ""
echo "3. As User B, try to query User A's data with this SQL:"
echo "   SELECT * FROM data_[database_id] WHERE created_by = '[user_a_id]';"
echo ""
echo "4. Expected: No rows returned (RLS blocks access)"
echo ""
echo "5. Add User B to User A's project as a viewer:"
echo "   INSERT INTO project_members (project_id, user_id, role)"
echo "   VALUES ('[project_id]', '[user_b_id]', 'viewer');"
echo ""
echo "6. As User B, try the same query again"
echo "   Expected: Now you should see User A's data"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 API Key Encryption Test                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_info "To test API key encryption:"
echo ""
echo "1. Generate a test API key via your application"
echo ""
echo "2. Check the database with this SQL:"
echo "   SELECT "
echo "     key_prefix,"
echo "     key_hash,"
echo "     encrypted_key IS NOT NULL as is_encrypted,"
echo "     length(encrypted_key) as encrypted_length"
echo "   FROM api_keys"
echo "   ORDER BY created_at DESC"
echo "   LIMIT 1;"
echo ""
echo "3. Expected:"
echo "   - is_encrypted: TRUE"
echo "   - encrypted_length: > 0"
echo "   - key_hash: 64 characters (SHA-256)"
echo "   - key_prefix: First 8 chars of the API key"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    GDPR Compliance Test                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_info "To test GDPR Right to be Forgotten:"
echo ""
echo "1. Create a test user account with some data"
echo ""
echo "2. Request deletion:"
echo "   SELECT request_user_deletion('[test_user_id]');"
echo ""
echo "3. Check deletion request was created:"
echo "   SELECT * FROM deletion_requests WHERE user_id = '[test_user_id]';"
echo ""
echo "4. Execute deletion (DRY RUN first):"
echo "   SELECT * FROM execute_user_deletion('[test_user_id]', true);"
echo ""
echo "5. Review what will be deleted/anonymized"
echo ""
echo "6. Execute actual deletion:"
echo "   SELECT * FROM execute_user_deletion('[test_user_id]', false);"
echo ""
echo "7. Verify user data is anonymized/deleted"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 Data Retention Test                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_info "To test data retention cleanup:"
echo ""
echo "1. Configure retention policy:"
echo "   INSERT INTO data_retention_config (table_name, retention_days, cleanup_enabled)"
echo "   VALUES ('query_performance_log', 90, true);"
echo ""
echo "2. Run cleanup (DRY RUN):"
echo "   SELECT * FROM cleanup_old_data();"
echo ""
echo "3. Check what would be deleted (should only show old data)"
echo ""
echo "4. Verify pg_cron job is scheduled:"
echo "   SELECT * FROM cron.job WHERE jobname = 'daily-data-retention-cleanup';"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Summary                                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_info "Total Tests: $TESTS_RUN"
echo ""
log_warning "Please run each SQL query above in Supabase SQL Editor"
log_warning "Verify that results match the expected outcomes"
echo ""
log_info "For automated testing, consider using:"
echo "  - Supabase CLI: npx supabase test db"
echo "  - Jest with Supabase client"
echo "  - Postman/Newman for API testing"
echo ""

echo ""
log_success "Security testing guide complete!"
echo ""
echo "📚 See also:"
echo "   - SECURITY_AUDIT_REPORT.md - Full security analysis"
echo "   - SECURITY_FIX_GUIDE.md - Implementation guide"
echo "   - Migration 006 - Automated test suite"
echo ""
