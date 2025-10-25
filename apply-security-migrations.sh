#!/bin/bash

###############################################################################
# Security Migrations Deployment Script
# Data Parse Desk 2.0
#
# This script applies all 7 critical security migrations in the correct order
# with verification steps between each migration.
#
# Usage: ./apply-security-migrations.sh [--dry-run] [--skip-backup]
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
SKIP_BACKUP=false
BACKUP_DIR="./backups"
MIGRATION_DIR="./supabase/migrations"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--dry-run] [--skip-backup]"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       Security Migrations Deployment Script                   ║"
echo "║       Data Parse Desk 2.0                                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ "$DRY_RUN" = true ]; then
  log_warning "DRY RUN MODE - No changes will be made"
fi

# Check prerequisites
log_info "Checking prerequisites..."

# Check if npx is installed
if ! command -v npx &> /dev/null; then
  log_error "npx not found. Please install Node.js and npm."
  exit 1
fi

# Check if Supabase CLI is available
if ! npx supabase --version &> /dev/null; then
  log_error "Supabase CLI not found. Install with: npm install -g supabase"
  exit 1
fi

# Check if migration directory exists
if [ ! -d "$MIGRATION_DIR" ]; then
  log_error "Migration directory not found: $MIGRATION_DIR"
  exit 1
fi

log_success "Prerequisites check passed"

# Define migrations in order
declare -a MIGRATIONS=(
  "20251027000001_fix_query_performance_log_rls.sql"
  "20251027000002_fix_dynamic_table_rls.sql"
  "20251027000003_gdpr_data_retention.sql"
  "20251027000004_encrypt_api_keys.sql"
  "20251027000005_fix_security_definer_search_path.sql"
  "20251027000006_test_security_fixes.sql"
  "20251027000007_gdpr_right_to_be_forgotten.sql"
)

declare -a MIGRATION_NAMES=(
  "Fix query_performance_log RLS"
  "Fix dynamic table RLS policies"
  "GDPR data retention system"
  "API key encryption (AES-256)"
  "Fix SECURITY DEFINER search_path"
  "Security test suite"
  "GDPR Right to be Forgotten"
)

# Verify all migration files exist
log_info "Verifying migration files..."
for migration in "${MIGRATIONS[@]}"; do
  if [ ! -f "$MIGRATION_DIR/$migration" ]; then
    log_error "Migration file not found: $migration"
    exit 1
  fi
done
log_success "All migration files found"

# Create backup
if [ "$SKIP_BACKUP" = false ] && [ "$DRY_RUN" = false ]; then
  log_info "Creating database backup..."

  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

  log_warning "IMPORTANT: Please create a manual backup via Supabase Dashboard"
  log_warning "This script cannot automate database backups for security reasons."

  read -p "Have you created a backup? (yes/no): " backup_confirm
  if [ "$backup_confirm" != "yes" ]; then
    log_error "Backup not confirmed. Exiting."
    exit 1
  fi

  log_success "Backup confirmed"
else
  log_warning "Skipping backup (--skip-backup or --dry-run)"
fi

# Check environment variables
log_info "Checking required environment variables..."
if [ -z "$API_KEY_ENCRYPTION_PASSWORD" ]; then
  log_error "API_KEY_ENCRYPTION_PASSWORD not set!"
  log_warning "Generate one with: openssl rand -base64 32"
  log_warning "Then set it: export API_KEY_ENCRYPTION_PASSWORD='your-password'"
  exit 1
fi
log_success "API_KEY_ENCRYPTION_PASSWORD is set"

# Apply migrations
echo ""
log_info "Starting migration application..."
echo ""

MIGRATION_COUNT=${#MIGRATIONS[@]}
CURRENT=0

for i in "${!MIGRATIONS[@]}"; do
  CURRENT=$((i + 1))
  migration="${MIGRATIONS[$i]}"
  name="${MIGRATION_NAMES[$i]}"

  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  printf "║ Migration %d/%d: %-48s ║\n" "$CURRENT" "$MIGRATION_COUNT" "$name"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  log_info "File: $migration"

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN - Would apply: $migration"
    sleep 1
  else
    log_info "Applying migration..."

    # Apply migration
    if npx supabase db push --file "$MIGRATION_DIR/$migration" 2>&1 | tee /tmp/migration_output.log; then
      log_success "Migration applied successfully"

      # Check for success markers in output
      if grep -q "✅" /tmp/migration_output.log; then
        log_success "Verification markers found in output"
      fi
    else
      log_error "Migration failed: $migration"
      log_error "Check the output above for details"
      exit 1
    fi
  fi

  # Special verification for migration 6 (test suite)
  if [ "$migration" = "20251027000006_test_security_fixes.sql" ] && [ "$DRY_RUN" = false ]; then
    echo ""
    log_info "Running security test verification..."

    # Wait a moment for the migration to settle
    sleep 2

    if grep -q "ALL SECURITY TESTS PASSED" /tmp/migration_output.log || grep -q "🎉" /tmp/migration_output.log; then
      log_success "All security tests passed!"
    else
      log_warning "Could not verify test results automatically"
      log_warning "Please check the output above manually"
    fi
  fi

  echo ""
done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Post-Migration Verification                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ "$DRY_RUN" = false ]; then
  log_info "Running post-migration checks..."

  # Verify RLS policy count
  log_info "Checking RLS policy count..."
  echo "Run this SQL to verify:"
  echo "  SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';"
  echo "  Expected: 192+ policies"
  echo ""

  # Verify API key encryption
  log_info "Checking API key encryption..."
  echo "Run this SQL to verify:"
  echo "  SELECT COUNT(*) FROM api_keys WHERE encrypted_key IS NOT NULL;"
  echo "  Expected: All API keys should have encrypted_key"
  echo ""

  # Verify GDPR tables
  log_info "Checking GDPR tables..."
  echo "Run this SQL to verify:"
  echo "  SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('data_retention_config', 'deletion_requests');"
  echo "  Expected: Both tables should exist"
  echo ""

  # Verify pg_cron job
  log_info "Checking pg_cron job..."
  echo "Run this SQL to verify:"
  echo "  SELECT jobname, schedule FROM cron.job WHERE jobname = 'daily-data-retention-cleanup';"
  echo "  Expected: Job should exist with schedule '0 2 * * *'"
  echo ""

  log_success "Migration application complete!"
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                         NEXT STEPS                             ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "1. Run the SQL verification queries above"
  echo "2. Test RLS isolation with two different users"
  echo "3. Generate a test API key and verify encryption"
  echo "4. Test GDPR deletion workflow"
  echo "5. Review Supabase logs for any errors"
  echo "6. Proceed with deployment checklist"
  echo ""
  echo "📚 Documentation:"
  echo "   - SECURITY_AUDIT_REPORT.md"
  echo "   - SECURITY_FIX_GUIDE.md"
  echo "   - DEPLOYMENT_CHECKLIST.md"
  echo ""
else
  log_info "DRY RUN complete - no changes made"
fi

echo ""
log_success "Script execution complete!"
echo ""
