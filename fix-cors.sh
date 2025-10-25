#!/bin/bash
# Automated CORS Fix Script
# Replaces wildcard CORS with secure implementation

set -e

FUNCTIONS_DIR="supabase/functions"

# List of functions to fix
FUNCTIONS=(
  "ai-analyze-schema"
  "ai-create-schema"
  "ai-import-suggestions"
  "check-subscription"
  "composite-views-create"
  "composite-views-query"
  "composite-views-update-custom-data"
  "create-checkout"
  "create-payment-intent"
  "customer-portal"
  "evaluate-formula"
  "generate-insights"
  "generate-report"
  "generate-scheduled-report"
  "item-attachment-delete"
  "item-attachment-upload"
  "process-ocr"
  "process-voice"
  "resolve-relations"
  "rest-api"
  "scheduled-ai-analysis"
  "schema-version-create"
  "schema-version-restore"
  "send-notification"
  "stripe-webhook"
  "sync-storage"
  "telegram-generate-link-code"
  "telegram-natural-language"
  "telegram-notify"
  "trigger-webhook"
)

echo "🔧 Starting CORS fix for ${#FUNCTIONS[@]} functions..."
echo ""

FIXED_COUNT=0
SKIPPED_COUNT=0

for func in "${FUNCTIONS[@]}"; do
  FILE="$FUNCTIONS_DIR/$func/index.ts"

  if [ ! -f "$FILE" ]; then
    echo "⚠️  Skipping $func - file not found"
    ((SKIPPED_COUNT++))
    continue
  fi

  echo "📝 Fixing $func..."

  # Create backup
  cp "$FILE" "$FILE.bak"

  # Check if already has security import
  if grep -q "from '../_shared/security.ts'" "$FILE"; then
    echo "   ✓ Already has security import"
  else
    # Add import after other imports
    if grep -q "import { serve }" "$FILE"; then
      # Add after serve import
      sed -i '' "/import { serve }/a\\
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';
" "$FILE"
    else
      # Add at the beginning
      sed -i '' "1i\\
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';
" "$FILE"
    fi
    echo "   ✓ Added security import"
  fi

  # Remove hardcoded CORS headers definition
  # Pattern 1: const corsHeaders = { 'Access-Control-Allow-Origin': '*', ... };
  sed -i '' "/^const corsHeaders = {$/,/^};$/d" "$FILE"

  # Pattern 2: Inline corsHeaders
  sed -i '' "s/const corsHeaders = { 'Access-Control-Allow-Origin': '\*'[^}]*};//g" "$FILE"
  sed -i '' 's/const corsHeaders = { "Access-Control-Allow-Origin": "\*"[^}]*};//g' "$FILE"

  echo "   ✓ Removed hardcoded CORS"

  # Fix serve function to use dynamic CORS
  # This is complex, will do manually for special cases

  ((FIXED_COUNT++))
done

echo ""
echo "✅ Fixed: $FIXED_COUNT functions"
echo "⚠️  Skipped: $SKIPPED_COUNT functions"
echo ""
echo "⚠️  IMPORTANT: Manual review needed for serve() function implementation"
echo "   Each function needs: const corsHeaders = getCorsHeaders(req);"
echo ""
echo "📋 Backup files created with .bak extension"
echo "   To restore: find $FUNCTIONS_DIR -name '*.bak' -exec bash -c 'mv \"\$0\" \"\${0%.bak}\"' {} \;"
