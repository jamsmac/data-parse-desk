#!/bin/bash

# VHData Email Integration Verification Script
# This script checks if all email integration files are in place

set -e

echo "🔍 Verifying VHData Email Integration Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track status
all_good=true

# Function to check file exists
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1 (missing)"
    all_good=false
  fi
}

# Function to check directory exists
check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1/"
  else
    echo -e "${RED}✗${NC} $1/ (missing)"
    all_good=false
  fi
}

echo "📂 Checking Edge Functions..."
check_dir "supabase/functions/send-email"
check_file "supabase/functions/send-email/index.ts"
check_dir "supabase/functions/send-scheduled-report"
check_file "supabase/functions/send-scheduled-report/index.ts"
check_file "supabase/functions/.env.example"
echo ""

echo "📂 Checking API Client..."
check_file "src/api/emailAPI.ts"
echo ""

echo "📂 Checking Updated Components..."
check_file "src/components/collaboration/EmailSettings.tsx"
check_file "src/components/reports/ScheduledReports.tsx"
echo ""

echo "📂 Checking Documentation..."
check_file "SMTP_SETUP.md"
check_file "EMAIL_INTEGRATION_SUMMARY.md"
echo ""

# Check if Supabase CLI is installed
echo "🔧 Checking Tools..."
if command -v supabase &> /dev/null; then
  echo -e "${GREEN}✓${NC} Supabase CLI installed"
else
  echo -e "${YELLOW}⚠${NC} Supabase CLI not found (optional for local dev)"
  echo "  Install: npm install -g supabase"
fi
echo ""

# Check for Resend API key in secrets (if Supabase CLI is available)
if command -v supabase &> /dev/null; then
  echo "🔑 Checking Supabase Secrets..."
  if supabase secrets list &> /dev/null; then
    if supabase secrets list | grep -q "RESEND_API_KEY"; then
      echo -e "${GREEN}✓${NC} RESEND_API_KEY is set"
    else
      echo -e "${YELLOW}⚠${NC} RESEND_API_KEY not set"
      echo "  Run: supabase secrets set RESEND_API_KEY=re_your_api_key"
    fi
  else
    echo -e "${YELLOW}⚠${NC} Not connected to Supabase project"
    echo "  Run: supabase link"
  fi
  echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$all_good" = true ]; then
  echo -e "${GREEN}✓ All email integration files are in place!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Get Resend API key from https://resend.com"
  echo "2. Set secret: supabase secrets set RESEND_API_KEY=re_your_key"
  echo "3. Deploy functions:"
  echo "   supabase functions deploy send-email"
  echo "   supabase functions deploy send-scheduled-report"
  echo "4. Test from UI: Profile > Email Settings > Test button"
  echo ""
  echo "For detailed instructions, see: SMTP_SETUP.md"
else
  echo -e "${RED}✗ Some files are missing. Please review the errors above.${NC}"
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
