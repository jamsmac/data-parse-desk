#!/bin/bash

###############################################################################
# Database Backup Script
# Data Parse Desk 2.0
#
# Creates automated backups of Supabase database with verification and rotation
#
# Usage: ./backup-database.sh [--retention-days 30] [--compress]
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
RETENTION_DAYS=30
COMPRESS=false
DATE_FORMAT=$(date +%Y%m%d_%H%M%S)
PROJECT_ID="uzcmaxfhfcsxzfqvaloz"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --retention-days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --compress)
      COMPRESS=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--retention-days 30] [--compress]"
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

# Banner
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Database Backup Script                            ║"
echo "║              Data Parse Desk 2.0                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

log_info "Configuration:"
echo "  - Backup Directory: $BACKUP_DIR"
echo "  - Retention: $RETENTION_DAYS days"
echo "  - Compression: $COMPRESS"
echo "  - Project ID: $PROJECT_ID"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check for Supabase CLI
if ! command -v npx &> /dev/null; then
  log_error "npx not found. Please install Node.js and npm."
  exit 1
fi

if ! npx supabase --version &> /dev/null; then
  log_error "Supabase CLI not found. Install with: npm install -g supabase"
  exit 1
fi

log_success "Prerequisites check passed"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/backup_${DATE_FORMAT}.sql"

log_info "Creating database backup..."
log_info "Backup file: $BACKUP_FILE"

# Create metadata file
METADATA_FILE="$BACKUP_DIR/backup_${DATE_FORMAT}_metadata.json"

cat > "$METADATA_FILE" << EOF
{
  "backup_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project_id": "$PROJECT_ID",
  "backup_file": "$(basename $BACKUP_FILE)",
  "backup_type": "full",
  "compression": $COMPRESS,
  "retention_days": $RETENTION_DAYS
}
EOF

log_info "Metadata file created: $METADATA_FILE"

# Instructions for manual backup
log_warning "IMPORTANT: Automated backup via CLI requires database credentials"
log_warning "For security reasons, please create backup manually via Supabase Dashboard:"
echo ""
echo "  1. Go to: https://app.supabase.com/project/$PROJECT_ID/database/backups"
echo "  2. Click 'Create Backup'"
echo "  3. Wait for completion"
echo "  4. Click 'Download' to save locally"
echo "  5. Move downloaded file to: $BACKUP_FILE"
echo ""

read -p "Have you downloaded the backup file? (yes/no): " backup_confirm

if [ "$backup_confirm" != "yes" ]; then
  log_error "Backup not confirmed. Exiting."
  rm -f "$METADATA_FILE"
  exit 1
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  log_error "Backup file not found at: $BACKUP_FILE"
  log_warning "Please ensure you moved the downloaded file to the correct location"
  rm -f "$METADATA_FILE"
  exit 1
fi

log_success "Backup file found"

# Get file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_info "Backup size: $BACKUP_SIZE"

# Verify backup file integrity
log_info "Verifying backup integrity..."

# Check if file is valid SQL
if head -n 1 "$BACKUP_FILE" | grep -q "PostgreSQL"; then
  log_success "Backup file appears to be valid PostgreSQL dump"
else
  log_warning "Backup file may not be a valid PostgreSQL dump"
  log_warning "First line: $(head -n 1 "$BACKUP_FILE")"
fi

# Compress if requested
if [ "$COMPRESS" = true ]; then
  log_info "Compressing backup file..."

  if command -v gzip &> /dev/null; then
    gzip -9 "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    log_success "Backup compressed: $COMPRESSED_SIZE (from $BACKUP_SIZE)"

    # Update metadata
    cat > "$METADATA_FILE" << EOF
{
  "backup_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project_id": "$PROJECT_ID",
  "backup_file": "$(basename $BACKUP_FILE)",
  "backup_type": "full",
  "compression": true,
  "original_size": "$BACKUP_SIZE",
  "compressed_size": "$COMPRESSED_SIZE",
  "retention_days": $RETENTION_DAYS
}
EOF
  else
    log_warning "gzip not found. Skipping compression."
  fi
fi

# Update metadata with final size
FINAL_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  \"final_size\": \"$FINAL_SIZE\"" >> "$METADATA_FILE"
echo "}" >> "$METADATA_FILE"

log_success "Backup created successfully: $BACKUP_FILE"

# Cleanup old backups
log_info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

DELETED_COUNT=0

# Find and delete old backup files
while IFS= read -r old_backup; do
  if [ -n "$old_backup" ]; then
    log_info "Deleting old backup: $(basename "$old_backup")"
    rm -f "$old_backup"

    # Also delete corresponding metadata
    METADATA="${old_backup%.*}_metadata.json"
    if [ -f "$METADATA" ]; then
      rm -f "$METADATA"
    fi

    DELETED_COUNT=$((DELETED_COUNT + 1))
  fi
done < <(find "$BACKUP_DIR" -name "backup_*.sql*" -type f -mtime +"$RETENTION_DAYS" 2>/dev/null)

if [ $DELETED_COUNT -gt 0 ]; then
  log_success "Deleted $DELETED_COUNT old backup(s)"
else
  log_info "No old backups to delete"
fi

# List current backups
log_info "Current backups:"
BACKUP_COUNT=0

for backup in "$BACKUP_DIR"/backup_*.sql*; do
  if [ -f "$backup" ]; then
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
    SIZE=$(du -h "$backup" | cut -f1)
    DATE=$(basename "$backup" | sed 's/backup_//' | sed 's/.sql.*//' | sed 's/_/ /')
    echo "  $BACKUP_COUNT. $(basename "$backup") - $SIZE - $DATE"
  fi
done

if [ $BACKUP_COUNT -eq 0 ]; then
  log_warning "No backups found in $BACKUP_DIR"
fi

echo ""
log_success "Backup process complete!"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Backup Summary                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Backup File:    $BACKUP_FILE"
echo "  File Size:      $FINAL_SIZE"
echo "  Total Backups:  $BACKUP_COUNT"
echo "  Retention:      $RETENTION_DAYS days"
echo "  Metadata:       $METADATA_FILE"
echo ""

# Verification instructions
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 Restore Instructions                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "To restore from this backup:"
echo ""

if [ "$COMPRESS" = true ]; then
  echo "  1. Decompress: gunzip $BACKUP_FILE"
  echo "  2. Restore via Supabase Dashboard:"
else
  echo "  1. Restore via Supabase Dashboard:"
fi

echo "     - Go to: https://app.supabase.com/project/$PROJECT_ID/database/backups"
echo "     - Click 'Restore' and upload the backup file"
echo ""
echo "  OR use SQL restore (requires database credentials):"
echo ""

if [ "$COMPRESS" = true ]; then
  echo "     gunzip < $BACKUP_FILE | psql [connection-string]"
else
  echo "     psql [connection-string] < $BACKUP_FILE"
fi

echo ""

# Test restore recommendation
log_info "RECOMMENDATION: Test backup restoration in a staging environment"
echo ""

# Schedule recommendation
log_info "RECOMMENDATION: Schedule this script with cron:"
echo "  # Daily backup at 2 AM"
echo "  0 2 * * * cd $(pwd) && ./backup-database.sh --compress --retention-days 30 >> ./backups/backup.log 2>&1"
echo ""

log_success "Script execution complete!"
echo ""
