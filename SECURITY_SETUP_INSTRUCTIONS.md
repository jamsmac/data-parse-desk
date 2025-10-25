# 🔐 CRITICAL SECURITY SETUP INSTRUCTIONS

**Date:** 2025-10-25
**Priority:** 🚨 IMMEDIATE ACTION REQUIRED

---

## ⚠️ SECURITY ISSUE DETECTED

Your `.env` files were NOT properly protected in git and may have been committed to the repository.

## 🚨 IMMEDIATE ACTIONS (DO NOW)

### Step 1: Check Git History for Leaked Credentials

```bash
# Check if .env was ever committed
git log --all --full-history -- .env
git log --all --full-history -- .env.production
git log --all --full-history -- .env.development
git log --all --full-history -- .env.staging

# Search for Supabase keys in entire history
git log -p --all -S "VITE_SUPABASE_ANON_KEY" | head -100
git log -p --all -S "SUPABASE_SERVICE_ROLE_KEY" | head -100
```

**If ANY results found:** Your credentials were leaked! Proceed to Step 2 immediately.
**If NO results:** Skip to Step 3.

---

### Step 2: CREDENTIALS LEAKED - Emergency Response

**🔴 CRITICAL: Rotate ALL Supabase Keys Immediately**

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com/project/uzcmaxfhfcsxzfqvaloz/settings/api

2. **Reset API Keys:**
   - Click "Reset anon key" → Copy new key
   - Click "Reset service_role key" → Copy new key
   - **WARNING:** This will break ALL existing deployments until updated

3. **Update ALL environment files with NEW keys:**
   - Update `.env`
   - Update `.env.production`
   - Update `.env.development`
   - Update `.env.staging`
   - Update deployment platforms (Vercel, Netlify, etc.)

4. **Clean Git History (Choose ONE):**

   **Option A: BFG Repo Cleaner (Recommended)**
   ```bash
   # Install BFG
   brew install bfg  # macOS
   # or download from: https://rtyley.github.io/bfg-repo-cleaner/

   # Create backup first!
   cd ..
   git clone --mirror "path/to/data-parse-desk-2" backup-repo.git

   # Clean sensitive files
   cd data-parse-desk-2
   bfg --delete-files .env
   bfg --delete-files .env.production
   bfg --delete-files .env.development
   bfg --delete-files .env.staging

   # Clean up
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   # Force push (WARNING: Coordinate with team!)
   git push --force --all
   git push --force --tags
   ```

   **Option B: Filter-branch (If BFG not available)**
   ```bash
   # Create backup first!
   git clone . ../backup-data-parse-desk-2

   # Remove files from history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env .env.production .env.development .env.staging" \
     --prune-empty --tag-name-filter cat -- --all

   # Clean up
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   # Force push (WARNING: Coordinate with team!)
   git push --force --all
   git push --force --tags
   ```

5. **Notify team members to re-clone:**
   ```bash
   # All team members must run:
   rm -rf data-parse-desk-2
   git clone <repository-url>
   ```

---

### Step 3: Secure Current Repository

The `.gitignore` has been updated. Now remove tracked files:

```bash
# Remove files from git tracking (but keep local copies)
git rm --cached .env
git rm --cached .env.production
git rm --cached .env.development
git rm --cached .env.staging
git rm --cached .env.test

# Commit the removal
git add .gitignore
git commit -m "security: Remove sensitive .env files from git tracking

- Updated .gitignore to properly protect all environment files
- Removed tracked .env files (keeping local copies)
- Added comprehensive .env.* patterns
- See SECURITY_SETUP_INSTRUCTIONS.md for setup"

# Push the fix
git push origin main
```

---

### Step 4: Set API Key Encryption Password

**Generated secure passwords (choose one):**

**Option 1 (Primary):**
```
6TP+T9ZTHt0Y710UnZYpkAJMysZ8tYjr2o73OKNqw+o=
```

**Option 2 (Backup):**
```
ijqfnjmJKUj5oQaNOl9kt/7NMkG0JUNPgYyc24IrvgE=
```

**Add to your .env files:**

```bash
# Add to .env (development)
echo 'API_KEY_ENCRYPTION_PASSWORD="6TP+T9ZTHt0Y710UnZYpkAJMysZ8tYjr2o73OKNqw+o="' >> .env

# Add to .env.production (production)
echo 'API_KEY_ENCRYPTION_PASSWORD="6TP+T9ZTHt0Y710UnZYpkAJMysZ8tYjr2o73OKNqw+o="' >> .env.production
```

**Store securely:**
- Add to 1Password, LastPass, or your secrets manager
- Document the password location in your team wiki
- Set calendar reminder for rotation in 90 days

---

### Step 5: Verify Security

```bash
# Verify .env files are ignored
git status

# Should show:
# - .gitignore modified (if you committed the fix)
# - NO .env files listed

# Verify the files are not tracked
git ls-files | grep "\.env"

# Should return NOTHING except .env.example

# Verify local files still exist
ls -la .env*

# Should show all your .env files locally
```

---

## ✅ SETUP CHECKLIST

- [ ] Check git history for leaked credentials
- [ ] IF LEAKED: Reset Supabase API keys
- [ ] IF LEAKED: Clean git history with BFG/filter-branch
- [ ] IF LEAKED: Force push cleaned history
- [ ] IF LEAKED: Notify team to re-clone
- [ ] Remove .env files from git tracking
- [ ] Commit and push .gitignore fix
- [ ] Generate and set API_KEY_ENCRYPTION_PASSWORD
- [ ] Store encryption password in secrets manager
- [ ] Verify .env files are no longer tracked
- [ ] Verify local .env files still exist
- [ ] Update deployment platforms with new keys (if rotated)
- [ ] Test application with new configuration

---

## 📋 NEXT STEPS AFTER SECURITY FIX

1. **Run migration repair** (see MIGRATION_REPAIR.sh)
2. **Set up Sentry monitoring** (see MONITORING_SETUP.md)
3. **Configure automated backups**
4. **Run integration tests**

---

## 🆘 NEED HELP?

**If you're unsure about any step:**
1. Create a backup: `git clone . ../backup-data-parse-desk-2`
2. Stop and ask for help from DevOps/Security team
3. Don't force push without team coordination

**Emergency contacts:**
- DevOps: [your-team-contact]
- Security: [security-contact]

---

## 📚 RELATED DOCUMENTATION

- [SECURITY_README.md](./SECURITY_README.md) - Complete security guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Production deployment
- [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Monitoring configuration

---

**Last updated:** 2025-10-25
**Next security audit:** 2025-11-25
