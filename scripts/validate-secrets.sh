#!/bin/bash

# =============================================================================
# Secrets Validation Script
# Validates that all required environment variables are configured
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
SUCCESS=0

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}   DataParseDesk 2.0 - Secrets Validation${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# Function to check if variable is set and not empty
check_required() {
    local var_name=$1
    local var_value="${!var_name}"
    local description=$2

    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} $var_name - ${RED}MISSING${NC}"
        echo -e "  Description: $description"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name - ${GREEN}SET${NC}"
        ((SUCCESS++))
        return 0
    fi
}

# Function to check optional variable
check_optional() {
    local var_name=$1
    local var_value="${!var_name}"
    local description=$2

    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠${NC} $var_name - ${YELLOW}NOT SET${NC} (optional)"
        echo -e "  Description: $description"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} $var_name - ${GREEN}SET${NC}"
        ((SUCCESS++))
    fi
}

# Function to validate URL format
validate_url() {
    local url=$1
    if [[ $url =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

# Function to validate password strength
validate_password_strength() {
    local password=$1
    local min_length=32

    if [ ${#password} -lt $min_length ]; then
        return 1
    fi
    return 0
}

# Load environment file if it exists
ENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${BLUE}Loading environment from:${NC} $ENV_FILE"
    echo ""
    export $(grep -v '^#' "$ENV_FILE" | xargs -0)
else
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and configure it.${NC}"
    exit 1
fi

# =============================================================================
# CRITICAL VARIABLES (Production Required)
# =============================================================================

echo -e "${BLUE}Checking CRITICAL variables...${NC}"
echo ""

check_required "VITE_SUPABASE_URL" "Supabase project URL"
if [ $? -eq 0 ]; then
    if ! validate_url "$VITE_SUPABASE_URL"; then
        echo -e "  ${RED}Invalid URL format${NC}"
        ((ERRORS++))
    fi
fi

check_required "VITE_SUPABASE_ANON_KEY" "Supabase anonymous key (public)"
check_required "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key (NEVER expose to client)"

echo ""
echo -e "${BLUE}Checking SECURITY variables...${NC}"
echo ""

check_required "API_KEY_ENCRYPTION_PASSWORD" "Encryption password for API keys (min 32 chars)"
if [ $? -eq 0 ]; then
    if ! validate_password_strength "$API_KEY_ENCRYPTION_PASSWORD"; then
        echo -e "  ${RED}Password is too weak (min 32 characters required)${NC}"
        echo -e "  ${YELLOW}Generate with: openssl rand -base64 32${NC}"
        ((ERRORS++))
    fi
fi

# =============================================================================
# IMPORTANT VARIABLES (Highly Recommended)
# =============================================================================

echo ""
echo -e "${BLUE}Checking IMPORTANT variables...${NC}"
echo ""

check_optional "ANTHROPIC_API_KEY" "Claude AI API key (recommended for AI features)"
check_optional "VITE_SENTRY_DSN" "Sentry DSN for error tracking"
check_optional "REDIS_URL" "Redis URL for caching (production recommended)"
check_optional "REDIS_TOKEN" "Upstash Redis token"

# =============================================================================
# OPTIONAL VARIABLES (Feature-specific)
# =============================================================================

echo ""
echo -e "${BLUE}Checking OPTIONAL variables...${NC}"
echo ""

check_optional "OPENAI_API_KEY" "OpenAI API key"
check_optional "GOOGLE_API_KEY" "Google Gemini API key"
check_optional "MISTRAL_API_KEY" "Mistral AI API key"
check_optional "PERPLEXITY_API_KEY" "Perplexity API key"
check_optional "VITE_DROPBOX_CLIENT_ID" "Dropbox integration"
check_optional "VITE_ONEDRIVE_CLIENT_ID" "OneDrive integration"
check_optional "VITE_TELEGRAM_BOT_TOKEN" "Telegram bot integration"

# =============================================================================
# CONFIGURATION VARIABLES
# =============================================================================

echo ""
echo -e "${BLUE}Checking CONFIGURATION variables...${NC}"
echo ""

# Environment
if [ -z "$VITE_ENVIRONMENT" ]; then
    echo -e "${YELLOW}⚠${NC} VITE_ENVIRONMENT not set, defaulting to 'development'"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} VITE_ENVIRONMENT - $VITE_ENVIRONMENT"
    ((SUCCESS++))

    # Production-specific checks
    if [ "$VITE_ENVIRONMENT" = "production" ]; then
        echo ""
        echo -e "${BLUE}Running PRODUCTION-specific checks...${NC}"
        echo ""

        if [ "$VITE_DEBUG_MODE" = "true" ]; then
            echo -e "${RED}✗${NC} Debug mode is enabled in production!"
            ((ERRORS++))
        else
            echo -e "${GREEN}✓${NC} Debug mode is disabled"
            ((SUCCESS++))
        fi

        if [ -z "$VITE_SENTRY_DSN" ]; then
            echo -e "${RED}✗${NC} Sentry DSN is required in production"
            ((ERRORS++))
        fi

        if [ "$ENABLE_STRICT_CSP" != "true" ]; then
            echo -e "${YELLOW}⚠${NC} Strict CSP is not enabled (recommended for production)"
            ((WARNINGS++))
        fi
    fi
fi

# =============================================================================
# SECURITY CHECKS
# =============================================================================

echo ""
echo -e "${BLUE}Running SECURITY checks...${NC}"
echo ""

# Check if .env is in .gitignore
if grep -q "^\.env$" "${PROJECT_ROOT}/.gitignore" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} .env is in .gitignore"
    ((SUCCESS++))
else
    echo -e "${RED}✗${NC} .env is NOT in .gitignore - SECURITY RISK!"
    ((ERRORS++))
fi

# Check for common patterns of exposed secrets
if grep -r "VITE_SUPABASE_ANON_KEY" "${PROJECT_ROOT}/src" 2>/dev/null | grep -v "import.meta.env" | grep -v "process.env" | grep -q .; then
    echo -e "${RED}✗${NC} Found hardcoded Supabase key in source code!"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} No hardcoded secrets found in source"
    ((SUCCESS++))
fi

# Check file permissions on .env
if [ -f "$ENV_FILE" ]; then
    PERMS=$(stat -f "%A" "$ENV_FILE" 2>/dev/null || stat -c "%a" "$ENV_FILE" 2>/dev/null)
    if [ "$PERMS" != "600" ] && [ "$PERMS" != "400" ]; then
        echo -e "${YELLOW}⚠${NC} .env file permissions are $PERMS (should be 600 or 400)"
        echo -e "  ${YELLOW}Fix with: chmod 600 .env${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} .env file has secure permissions ($PERMS)"
        ((SUCCESS++))
    fi
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}   VALIDATION SUMMARY${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

echo -e "${GREEN}✓ Success:${NC} $SUCCESS checks passed"
echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS issues found"
echo -e "${RED}✗ Errors:${NC} $ERRORS critical issues found"

echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Your secrets are properly configured.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuration is valid but has warnings. Review optional settings.${NC}"
    exit 0
else
    echo -e "${RED}❌ Critical errors found! Please fix before deploying to production.${NC}"
    echo ""
    echo -e "${YELLOW}Quick fixes:${NC}"
    echo -e "  1. Copy .env.example: ${BLUE}cp .env.example .env${NC}"
    echo -e "  2. Generate encryption password: ${BLUE}openssl rand -base64 32${NC}"
    echo -e "  3. Get Supabase keys: ${BLUE}https://app.supabase.com/project/uzcmaxfhfcsxzfqvaloz/settings/api${NC}"
    echo -e "  4. Set secure permissions: ${BLUE}chmod 600 .env${NC}"
    echo ""
    exit 1
fi
