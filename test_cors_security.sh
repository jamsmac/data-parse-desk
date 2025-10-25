#!/bin/bash
# CORS Security Test Script
# Tests all Edge Functions to verify CORS is properly configured

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://uzcmaxfhfcsxzfqvaloz.supabase.co"
FUNCTIONS_DIR="supabase/functions"

# Test counters
TOTAL_FUNCTIONS=0
SECURE_FUNCTIONS=0
WILDCARD_FUNCTIONS=0
NO_CORS_FUNCTIONS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   CORS Security Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Check for getCorsHeaders usage
echo -e "${YELLOW}Test 1: Checking for secure CORS implementation...${NC}"
cd "$FUNCTIONS_DIR"

for dir in */; do
    if [ "$dir" != "_shared/" ]; then
        func="${dir%/}"
        TOTAL_FUNCTIONS=$((TOTAL_FUNCTIONS + 1))

        if [ -f "$func/index.ts" ]; then
            if grep -q "getCorsHeaders" "$func/index.ts"; then
                echo -e "${GREEN}✓${NC} $func - Uses secure CORS"
                SECURE_FUNCTIONS=$((SECURE_FUNCTIONS + 1))
            elif grep -q "Access-Control-Allow-Origin" "$func/index.ts"; then
                if grep -q "Access-Control-Allow-Origin.*\*" "$func/index.ts"; then
                    echo -e "${RED}✗${NC} $func - Uses wildcard CORS!"
                    WILDCARD_FUNCTIONS=$((WILDCARD_FUNCTIONS + 1))
                else
                    echo -e "${YELLOW}⚠${NC} $func - Custom CORS implementation"
                fi
            else
                echo -e "${BLUE}○${NC} $func - No CORS (webhook handler)"
                NO_CORS_FUNCTIONS=$((NO_CORS_FUNCTIONS + 1))
            fi
        fi
    fi
done

echo ""

# Test 2: Check for wildcard CORS
echo -e "${YELLOW}Test 2: Scanning for wildcard CORS...${NC}"
WILDCARD_FILES=$(grep -r "Access-Control-Allow-Origin.*\*" --include="index.ts" . | grep -v "_shared" || true)

if [ -z "$WILDCARD_FILES" ]; then
    echo -e "${GREEN}✓${NC} No wildcard CORS found - All secure!"
else
    echo -e "${RED}✗${NC} Found wildcard CORS in:"
    echo "$WILDCARD_FILES"
fi

echo ""

# Test 3: Check for broken imports
echo -e "${YELLOW}Test 3: Checking for broken imports...${NC}"
BROKEN_IMPORTS=$(grep -r "from '../_shared/cors.ts'" --include="index.ts" . || true)

if [ -z "$BROKEN_IMPORTS" ]; then
    echo -e "${GREEN}✓${NC} No broken cors.ts imports"
else
    echo -e "${RED}✗${NC} Found broken imports:"
    echo "$BROKEN_IMPORTS"
fi

echo ""

# Test 4: Verify security.ts exists and is correct
echo -e "${YELLOW}Test 4: Verifying security.ts...${NC}"
if [ -f "_shared/security.ts" ]; then
    if grep -q "ALLOWED_ORIGINS" "_shared/security.ts"; then
        echo -e "${GREEN}✓${NC} security.ts exists with ALLOWED_ORIGINS"

        # Show allowed origins
        echo ""
        echo -e "${BLUE}Allowed Origins:${NC}"
        grep -A 5 "ALLOWED_ORIGINS = \[" "_shared/security.ts" | grep -E "http|https" | sed 's/^/  /'
    else
        echo -e "${RED}✗${NC} security.ts missing ALLOWED_ORIGINS"
    fi
else
    echo -e "${RED}✗${NC} security.ts not found!"
fi

echo ""

# Test 5: Check Supabase version consistency
echo -e "${YELLOW}Test 5: Checking Supabase version consistency...${NC}"
VERSIONS=$(grep -r "@supabase/supabase-js@" --include="index.ts" . | grep -o "@supabase/supabase-js@[^'\"]*" | sort -u)
VERSION_COUNT=$(echo "$VERSIONS" | wc -l | tr -d ' ')

if [ "$VERSION_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✓${NC} All functions use the same Supabase version:"
    echo "$VERSIONS" | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠${NC} Multiple Supabase versions found:"
    echo "$VERSIONS" | sed 's/^/  /'
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Test Results Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Total Functions:          $TOTAL_FUNCTIONS"
echo -e "${GREEN}Secure (getCorsHeaders):  $SECURE_FUNCTIONS${NC}"
echo -e "${BLUE}No CORS (webhooks):       $NO_CORS_FUNCTIONS${NC}"
echo -e "${RED}Wildcard CORS:            $WILDCARD_FUNCTIONS${NC}"
echo ""

# Calculate score
EXPECTED_SECURE=32
if [ "$SECURE_FUNCTIONS" -eq "$EXPECTED_SECURE" ] && [ "$WILDCARD_FUNCTIONS" -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   ✓ ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}   Security Score: 10/10 🔒${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}   ✗ TESTS FAILED${NC}"
    echo -e "${RED}   Expected: $EXPECTED_SECURE secure functions${NC}"
    echo -e "${RED}   Found: $SECURE_FUNCTIONS secure, $WILDCARD_FUNCTIONS wildcard${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
