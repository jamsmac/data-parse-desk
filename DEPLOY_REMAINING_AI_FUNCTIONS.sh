#!/bin/bash

# Deployment script for remaining AI functions
# This script deploys process-ocr, process-voice, and generate-insights with centralized prompts

set -e

echo "🚀 Deploying remaining AI functions with centralized prompts..."
echo ""

# Check if logged in
if ! supabase projects list > /dev/null 2>&1; then
    echo "❌ Not logged in to Supabase CLI"
    echo "Run: supabase login"
    exit 1
fi

# Link to project
echo "🔗 Linking to project uzcmaxfhfcsxzfqvaloz..."
supabase link --project-ref uzcmaxfhfcsxzfqvaloz

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting Docker..."
    open -a Docker
    echo "Waiting for Docker to start..."
    sleep 5
fi

# Deploy functions
echo ""
echo "📦 Deploying process-ocr..."
supabase functions deploy process-ocr --project-ref uzcmaxfhfcsxzfqvaloz --no-verify-jwt

echo ""
echo "📦 Deploying process-voice..."
supabase functions deploy process-voice --project-ref uzcmaxfhfcsxzfqvaloz --no-verify-jwt

echo ""
echo "📦 Deploying generate-insights..."
supabase functions deploy generate-insights --project-ref uzcmaxfhfcsxzfqvaloz --no-verify-jwt

echo ""
echo "✅ All functions deployed successfully!"
echo ""
echo "📋 Deployed functions:"
echo "  1. process-ocr       - OCR with centralized prompts"
echo "  2. process-voice     - Voice transcription with improved prompts"
echo "  3. generate-insights - AI-powered insights generation"
echo ""
echo "🔍 Verify deployment:"
echo "  supabase functions list --project-ref uzcmaxfhfcsxzfqvaloz"
echo ""
echo "📊 Check logs:"
echo "  supabase functions logs process-ocr --project-ref uzcmaxfhfcsxzfqvaloz --tail"
echo "  supabase functions logs process-voice --project-ref uzcmaxfhfcsxzfqvaloz --tail"
echo "  supabase functions logs generate-insights --project-ref uzcmaxfhfcsxzfqvaloz --tail"
echo ""
