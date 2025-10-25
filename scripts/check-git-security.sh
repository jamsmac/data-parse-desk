#!/bin/bash

################################################################################
# Git Security Audit Script
#
# Purpose: Check git history for leaked credentials and sensitive data
# Created: 2025-10-25
#
# This script scans the entire git history for:
# - .env files that were committed
# - Supabase keys
# - API keys
# - Passwords
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Git Security Audit - Credential Leak Check          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Git repository detected${NC}"
echo ""

# Create report file
REPORT_FILE="git-security-audit-$(date +%Y%m%d-%H%M%S).txt"
echo "Git Security Audit Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

ISSUES_FOUND=0

# Function to check and report
check_history() {
    local pattern="$1"
    local description="$2"

    echo -e "${BLUE}Checking: ${description}${NC}"

    local results=$(git log --all --full-history -- "$pattern" 2>/dev/null | head -20)

    if [ -n "$results" ]; then
        echo -e "${RED}  ⚠️  FOUND: ${description}${NC}"
        echo "" >> "$REPORT_FILE"
        echo "FOUND: ${description}" >> "$REPORT_FILE"
        echo "Pattern: ${pattern}" >> "$REPORT_FILE"
        echo "-----" >> "$REPORT_FILE"
        echo "$results" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}  ✓ Clean${NC}"
    fi
}

# Function to search for strings in history
search_string() {
    local search_term="$1"
    local description="$2"

    echo -e "${BLUE}Searching: ${description}${NC}"

    local results=$(git log -p --all -S "$search_term" 2>/dev/null | head -50)

    if [ -n "$results" ]; then
        echo -e "${RED}  ⚠️  FOUND: ${description}${NC}"
        echo "" >> "$REPORT_FILE"
        echo "FOUND IN COMMITS: ${description}" >> "$REPORT_FILE"
        echo "Search term: ${search_term}" >> "$REPORT_FILE"
        echo "-----" >> "$REPORT_FILE"
        echo "$results" | head -30 >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}  ✓ Clean${NC}"
    fi
}

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Checking for committed .env files${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

check_history ".env" ".env file"
check_history ".env.local" ".env.local file"
check_history ".env.production" ".env.production file"
check_history ".env.development" ".env.development file"
check_history ".env.staging" ".env.staging file"
check_history ".env.test" ".env.test file"

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Searching for Supabase credentials${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

search_string "VITE_SUPABASE_ANON_KEY" "Supabase Anon Key"
search_string "SUPABASE_SERVICE_ROLE_KEY" "Supabase Service Role Key"
search_string "supabase.co" "Supabase URLs"

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Searching for API keys${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

search_string "ANTHROPIC_API_KEY" "Anthropic API Key"
search_string "OPENAI_API_KEY" "OpenAI API Key"
search_string "API_KEY_ENCRYPTION_PASSWORD" "Encryption Password"

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Searching for common sensitive patterns${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

search_string "password=" "Passwords in URLs"
search_string "sk-" "Secret keys (sk- prefix)"
search_string "Bearer " "Bearer tokens"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     Audit Summary                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ CLEAN: No credentials found in git history${NC}"
    echo "" >> "$REPORT_FILE"
    echo "RESULT: CLEAN - No credentials found" >> "$REPORT_FILE"
    echo ""
    echo -e "${GREEN}Your repository appears secure.${NC}"
else
    echo -e "${RED}⚠️  ISSUES FOUND: ${ISSUES_FOUND} potential credential leaks detected${NC}"
    echo "" >> "$REPORT_FILE"
    echo "RESULT: ${ISSUES_FOUND} ISSUES FOUND" >> "$REPORT_FILE"
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}⚠️  CRITICAL: Credentials were found in git history!${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}IMMEDIATE ACTIONS REQUIRED:${NC}"
    echo ""
    echo -e "${YELLOW}1. Rotate ALL compromised credentials:${NC}"
    echo -e "   - Reset Supabase API keys"
    echo -e "   - Reset all API keys found"
    echo -e "   - Generate new encryption passwords"
    echo ""
    echo -e "${YELLOW}2. Clean git history:${NC}"
    echo -e "   Option A: Use BFG Repo Cleaner (recommended)"
    echo -e "   ${BLUE}brew install bfg${NC}"
    echo -e "   ${BLUE}bfg --delete-files .env${NC}"
    echo ""
    echo -e "   Option B: Use git filter-branch"
    echo -e "   ${BLUE}git filter-branch --force --index-filter \\${NC}"
    echo -e "   ${BLUE}  'git rm --cached --ignore-unmatch .env .env.*' \\${NC}"
    echo -e "   ${BLUE}  --prune-empty --tag-name-filter cat -- --all${NC}"
    echo ""
    echo -e "${YELLOW}3. Force push cleaned history:${NC}"
    echo -e "   ${RED}⚠️  Coordinate with team first!${NC}"
    echo -e "   ${BLUE}git push --force --all${NC}"
    echo ""
    echo -e "${YELLOW}4. Notify team to re-clone repository${NC}"
    echo ""
    echo -e "See ${BLUE}SECURITY_SETUP_INSTRUCTIONS.md${NC} for detailed steps"
    echo ""
fi

echo -e "${BLUE}Full report saved to: ${REPORT_FILE}${NC}"
echo ""

# Check current .gitignore
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Checking current .gitignore${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✓ .env is in .gitignore${NC}"
else
    echo -e "${RED}⚠️  .env is NOT in .gitignore${NC}"
    echo -e "${YELLOW}Add it now: echo '.env' >> .gitignore${NC}"
fi

# Check if .env files are currently tracked
echo ""
echo -e "${YELLOW}Checking currently tracked files${NC}"

TRACKED_ENV=$(git ls-files | grep "\.env" | grep -v "\.env\.example" || true)

if [ -n "$TRACKED_ENV" ]; then
    echo -e "${RED}⚠️  Currently tracked .env files:${NC}"
    echo "$TRACKED_ENV" | while read file; do
        echo -e "${RED}  - $file${NC}"
    done
    echo ""
    echo -e "${YELLOW}Remove from tracking:${NC}"
    echo -e "${BLUE}git rm --cached $TRACKED_ENV${NC}"
else
    echo -e "${GREEN}✓ No .env files are currently tracked${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Audit Complete                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $ISSUES_FOUND -gt 0 ]; then
    exit 1
else
    exit 0
fi
