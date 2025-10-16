# Rollback Plan - VHData

## Triggers
- Critical errors in prod
- Security incident
- Performance regressions (LCP/CLS) beyond SLO

## Rollback Steps
1. Redeploy previous stable artifact (keep last 2 builds).
2. Revert Supabase RLS/policy changes via migration rollback.
3. Rotate leaked credentials (if any).
4. Invalidate CDN caches.
5. Enable maintenance page if needed.

## Post-Rollback
- Open incident, attach logs and Sentry issues
- Root cause analysis within 24h
- Patch branch with targeted fixes
