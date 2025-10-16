# Deployment Plan - VHData

## Prerequisites
- Supabase project configured with secure RLS policies
- Supabase anon key rotated
- Env vars stored in CI/CD secrets
- CDN/hosting (Vercel/Netlify/Cloudflare Pages) prepared with headers

## Steps
1. Update `.env.example`; remove `.env` from repo; rotate anon key.
2. Apply secure RLS migrations to Supabase (review `supabase/migrations/*`).
3. Build
   ```bash
   npm ci
   npm run aurora:check
   npm run build
   ```
4. Upload `dist/` to hosting or push to platform integrating build step.
5. Configure headers (at edge):
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy: interest-cohort=()
   - CSP (example minimal): default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'
6. Smoke tests:
   ```bash
   npm run test:regression
   npm run test:e2e
   ```
7. Health checks enabled; rollback plan ready.

## Rollback
- Revert to previous build artifact
- Revert Supabase policy changes (keep backups)
- Invalidate CDN cache
