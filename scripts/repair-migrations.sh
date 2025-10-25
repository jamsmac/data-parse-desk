#!/bin/bash

################################################################################
# Supabase Migration Repair Script
#
# Purpose: Synchronize local migration files with remote database
# Created: 2025-10-25
#
# This script repairs the migration history table to match local files
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Supabase Migration Repair Script                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo -e "${YELLOW}Install with: npm install -g supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"

# Check if we're in project root
if [ ! -f "$PROJECT_ROOT/supabase/config.toml" ]; then
    echo -e "${RED}❌ Not in a Supabase project directory${NC}"
    echo -e "${YELLOW}Please run this script from the project root${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase project detected${NC}"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}⚠️  WARNING: This will mark migrations as applied in the remote database${NC}"
echo -e "${YELLOW}   Make sure your local migration files match what should be in production${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo -e "${RED}Aborted by user${NC}"
    exit 0
fi

echo -e "${BLUE}Starting migration repair...${NC}"
echo ""

# Array of migrations to repair (from audit output)
migrations=(
    "20251014100000"
    "20251014110000"
    "20251018084200"
    "20251018090043"
    "20251018110752"
    "20251018113859"
    "20251018122037"
    "20251018124557"
    "20251018130031"
    "20251018130120"
    "20251018135055"
    "20251018141929"
    "20251018144316"
    "20251018152741"
    "20251018153646"
    "20251018153707"
    "20251018162152"
    "20251019140913"
    "20251019141024"
    "20251019141958"
    "20251019152551"
    "20251020071951"
    "20251021000001"
    "20251021000002"
    "20251021000003"
    "20251021000004"
    "20251021000005"
    "20251021000007"
    "20251021000008"
    "20251021000010"
    "20251021000011"
    "20251021000012"
    "20251021000013"
    "20251021004116"
    "20251022000002"
    "20251022000003"
    "20251022000004"
    "20251022000005"
    "20251022000006"
    "20251022000007"
    "20251022000008"
    "20251022000009"
    "20251022000010"
    "20251022000011"
    "20251023000001"
    "20251023120000"
    "20251023130000"
    "20251023130001"
    "20251025000001"
    "20251026000001"
    "20251027000001"
    "20251027000002"
    "20251027000003"
    "20251027000004"
    "20251027000005"
    "20251027000006"
    "20251027000007"
    "20251027100000"
)

total_migrations=${#migrations[@]}
current=0
failed=0

echo -e "${BLUE}Found ${total_migrations} migrations to repair${NC}"
echo ""

# Create log file
LOG_FILE="$PROJECT_ROOT/migration-repair-$(date +%Y%m%d-%H%M%S).log"
echo "Migration Repair Log - $(date)" > "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Repair each migration
for migration in "${migrations[@]}"; do
    current=$((current + 1))
    echo -e "${BLUE}[$current/$total_migrations] Repairing migration: ${migration}${NC}"

    # Run repair command
    if supabase migration repair --status applied "$migration" >> "$LOG_FILE" 2>&1; then
        echo -e "${GREEN}  ✓ Successfully repaired${NC}"
        echo "✓ $migration - SUCCESS" >> "$LOG_FILE"
    else
        echo -e "${RED}  ✗ Failed to repair${NC}"
        echo "✗ $migration - FAILED" >> "$LOG_FILE"
        failed=$((failed + 1))
    fi

    # Small delay to avoid rate limiting
    sleep 0.5
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Repair Summary                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Total migrations: ${total_migrations}${NC}"
echo -e "${GREEN}Successful: $((total_migrations - failed))${NC}"

if [ $failed -gt 0 ]; then
    echo -e "${RED}Failed: ${failed}${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Some migrations failed to repair${NC}"
    echo -e "${YELLOW}Check the log file for details: ${LOG_FILE}${NC}"
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "${YELLOW}  - Migration already applied${NC}"
    echo -e "${YELLOW}  - Migration file not found${NC}"
    echo -e "${YELLOW}  - Database connection issues${NC}"
    echo ""
    exit 1
else
    echo ""
    echo -e "${GREEN}✓ All migrations repaired successfully!${NC}"
    echo ""
fi

# Verify repair
echo -e "${BLUE}Verifying migration status...${NC}"
echo ""

if supabase db remote commit >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✓ Migration history is now synchronized${NC}"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "${GREEN}  1. Review the log file: ${LOG_FILE}${NC}"
    echo -e "${GREEN}  2. Test database connection${NC}"
    echo -e "${GREEN}  3. Run: npm run test${NC}"
    echo -e "${GREEN}  4. Deploy to production if all tests pass${NC}"
else
    echo -e "${YELLOW}⚠️  Verification produced warnings${NC}"
    echo -e "${YELLOW}Check the log file: ${LOG_FILE}${NC}"
    echo ""
    echo -e "${YELLOW}This may be normal if there are local-only migrations${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Repair Complete                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Log file saved to: ${LOG_FILE}${NC}"
echo ""

exit 0
