# Supabase Version Policy for Edge Functions

## 📋 Standard Version

**All Edge Functions MUST use:**
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
```

## 🎯 Current Status

✅ **All 32 Edge Functions** now use `@supabase/supabase-js@2.75.0`

Last audit: 2025-10-24

## 📦 Why esm.sh?

We use `esm.sh` instead of JSR (`jsr:`) for the following reasons:

1. **Broader compatibility** - Works with all Deno versions
2. **Explicit versioning** - Always specify exact version (e.g., `@2.75.0`)
3. **Better caching** - esm.sh has robust CDN caching
4. **Industry standard** - More widely adopted in Deno ecosystem

## 🚫 Avoid These Patterns

### ❌ Unversioned imports
```typescript
// BAD - No specific version
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

### ❌ Old versions
```typescript
// BAD - Outdated version
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
```

### ❌ JSR imports
```typescript
// BAD - Use esm.sh instead
import { createClient } from 'jsr:@supabase/supabase-js@2';
```

## ✅ Correct Pattern

```typescript
// GOOD - Specific version on esm.sh
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
```

## 🔄 Version Update Process

When updating to a new Supabase version:

1. **Test locally** with one function first
2. **Check changelog** for breaking changes
3. **Update all functions** at once (use script below)
4. **Deploy and test** in staging
5. **Update this document** with new version

### Update Script

```bash
#!/bin/bash
# Update all Edge Functions to new Supabase version

OLD_VERSION="2.75.0"
NEW_VERSION="2.80.0"  # Replace with target version

echo "Updating @supabase/supabase-js from $OLD_VERSION to $NEW_VERSION..."

find supabase/functions -name "index.ts" -type f -exec sed -i '' \
  "s|@supabase/supabase-js@${OLD_VERSION}|@supabase/supabase-js@${NEW_VERSION}|g" {} \;

echo "✅ Updated all Edge Functions"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Test functions locally"
echo "3. Deploy to staging"
echo "4. Update this policy document"
```

## 📊 Version History

| Date | Version | Functions Updated | Notes |
|------|---------|-------------------|-------|
| 2025-10-24 | 2.75.0 | 32 | Initial unification from mixed versions |

## 🔍 Audit Command

To verify all functions use the correct version:

```bash
cd supabase/functions

echo "✅ Functions using 2.75.0:"
grep -l "supabase-js@2.75.0" */index.ts | wc -l

echo "❌ Functions NOT using 2.75.0:"
grep -L "supabase-js@2.75.0" */index.ts | grep -v "_shared"
```

## 🛠️ Fixed Issues

### Migration Summary (2025-10-24)

**Before:**
- 15 functions on 2.75.0 ✅
- 6 functions on 2.57.2 ❌
- 7 functions on unversioned @2 ❌
- 7 functions using JSR ❌

**After:**
- **32 functions on 2.75.0** ✅
- 0 functions on other versions ✅

### Updated Functions

#### Old 2.57.2 → 2.75.0 (6 files)
- `check-subscription`
- `create-checkout`
- `customer-portal`
- `generate-report`
- `stripe-webhook`
- `sync-storage`

#### Unversioned @2 → 2.75.0 (7 files)
- `ai-import-suggestions`
- `resolve-relations`
- `scheduled-ai-analysis`
- `send-telegram-notification`
- `telegram-natural-language`
- `telegram-webhook`

#### JSR → esm.sh (5 files)
- `compute-columns`
- `item-attachment-delete`
- `item-attachment-upload`
- `schema-version-create`
- `schema-version-restore`

**Note:** `process-ocr` and `process-voice` don't use Supabase client directly.

## 📚 Resources

- [Supabase JS Changelog](https://github.com/supabase/supabase-js/releases)
- [esm.sh Documentation](https://esm.sh/)
- [Deno Edge Functions Guide](https://supabase.com/docs/guides/functions)

## 🔒 Security

- Always use HTTPS URLs for imports
- Pin exact versions (not `@2` or `@latest`)
- Review security advisories before upgrading
- Test authentication flows after upgrades

## ✅ Checklist for New Functions

When creating a new Edge Function:

- [ ] Use `@supabase/supabase-js@2.75.0` (current standard)
- [ ] Use `https://esm.sh/` CDN (not JSR)
- [ ] Pin exact version (not `@2`)
- [ ] Add function to audit list above
- [ ] Test connection to Supabase

## 📞 Maintenance

**Owner:** Development Team
**Review Frequency:** Quarterly or when new major version releases
**Last Review:** 2025-10-24

---

**Status:** ✅ All Edge Functions unified on @supabase/supabase-js@2.75.0
