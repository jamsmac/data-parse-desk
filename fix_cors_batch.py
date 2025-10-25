#!/usr/bin/env python3
"""
Batch CORS Fix Script
Automatically fixes wildcard CORS in all Edge Functions
"""

import os
import re
from pathlib import Path

FUNCTIONS_DIR = Path("supabase/functions")

FUNCTIONS_TO_FIX = [
    "ai-analyze-schema",
    "ai-create-schema",
    "ai-import-suggestions",
    "check-subscription",
    "composite-views-create",
    "composite-views-query",
    "composite-views-update-custom-data",
    "create-checkout",
    "create-payment-intent",
    "customer-portal",
    "evaluate-formula",
    "generate-insights",
    "generate-report",
    "generate-scheduled-report",
    "item-attachment-delete",
    "item-attachment-upload",
    "process-ocr",
    "process-voice",
    "resolve-relations",
    "rest-api",
    "scheduled-ai-analysis",
    "schema-version-create",
    "schema-version-restore",
    "send-notification",
    "stripe-webhook",
    "sync-storage",
    "telegram-generate-link-code",
    "telegram-natural-language",
    "telegram-notify",
    "trigger-webhook",
]

def fix_function(func_name: str) -> bool:
    """Fix CORS in a single function"""
    file_path = FUNCTIONS_DIR / func_name / "index.ts"

    if not file_path.exists():
        print(f"⚠️  {func_name}: File not found")
        return False

    print(f"📝 Fixing {func_name}...")

    # Read file
    content = file_path.read_text()
    original_content = content

    # Step 1: Add security import if not present
    if "from '../_shared/security.ts'" not in content:
        # Find the last import statement
        import_pattern = r'(import.*?;)\n'
        imports = list(re.finditer(import_pattern, content))

        if imports:
            last_import = imports[-1]
            insert_pos = last_import.end()
            security_import = "import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';\n"
            content = content[:insert_pos] + security_import + content[insert_pos:]
            print(f"   ✓ Added security import")
        else:
            print(f"   ⚠️  Could not find import section")

    # Step 2: Remove hardcoded corsHeaders definition
    # Pattern: const corsHeaders = { ... };
    cors_def_pattern = r'const corsHeaders = \{[^}]*[\'"]Access-Control-Allow-Origin[\'"]:\s*[\'"]?\*[\'"]?[^}]*\};?\n?'
    if re.search(cors_def_pattern, content):
        content = re.sub(cors_def_pattern, '', content)
        print(f"   ✓ Removed hardcoded CORS definition")

    # Step 3: Fix serve function
    # Pattern: serve(async (req) => {
    #   if (req.method === 'OPTIONS') {
    #     return new Response(null, { headers: corsHeaders });
    #   }

    serve_pattern = r'(serve\(async \(req\) => \{)\s*\n\s*(if \(req\.method === [\'"]OPTIONS[\'"])'

    def replace_serve(match):
        return f'''{match.group(1)}
  // Get secure CORS headers based on origin
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  {match.group(2)}'''

    if re.search(serve_pattern, content):
        content = re.sub(serve_pattern, replace_serve, content)
        print(f"   ✓ Added dynamic CORS in serve function")

    # Step 4: Replace OPTIONS handler with handleCorsPrelight
    options_pattern = r'if \(req\.method === [\'"]OPTIONS[\'"]\) \{\s*\n\s*return new Response\(null, \{ headers: corsHeaders \}\);?\s*\n\s*\}'
    options_replacement = 'if (req.method === "OPTIONS") {\n    return handleCorsPrelight(req);\n  }'

    if re.search(options_pattern, content):
        content = re.sub(options_pattern, options_replacement, content)
        print(f"   ✓ Updated OPTIONS handler")

    # Write back if changed
    if content != original_content:
        # Create backup
        backup_path = file_path.with_suffix('.ts.bak')
        backup_path.write_text(original_content)

        file_path.write_text(content)
        print(f"   ✅ Fixed! (backup: {backup_path.name})")
        return True
    else:
        print(f"   ⏭️  No changes needed")
        return False

def main():
    print("🔧 Starting batch CORS fix...")
    print(f"📁 Functions directory: {FUNCTIONS_DIR}")
    print(f"📋 Functions to fix: {len(FUNCTIONS_TO_FIX)}")
    print("")

    fixed_count = 0
    skipped_count = 0
    error_count = 0

    for func in FUNCTIONS_TO_FIX:
        try:
            if fix_function(func):
                fixed_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")
            error_count += 1

        print("")

    print("=" * 60)
    print(f"✅ Fixed: {fixed_count}")
    print(f"⏭️  Skipped: {skipped_count}")
    print(f"❌ Errors: {error_count}")
    print(f"📊 Total: {fixed_count + skipped_count + error_count}/{len(FUNCTIONS_TO_FIX)}")
    print("")
    print("⚠️  IMPORTANT: Please review changes before deploying!")
    print("   Run: git diff supabase/functions")
    print("")
    print("📋 To restore from backups:")
    print("   find supabase/functions -name '*.bak' -exec bash -c 'mv \"$0\" \"${0%.bak}\"' {} \\;")

if __name__ == "__main__":
    main()
