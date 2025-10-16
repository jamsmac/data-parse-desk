# TODO (Post-Audit)

## Critical (blockers)
- [ ] Replace public RLS policies with user/role-based (auth.uid())
- [ ] Fix regression tests:
  - [ ] `AnimatedList.tsx`: add IntersectionObserver + cleanup; viewport animations
  - [ ] `FadeIn.tsx`: import/use `useReducedMotion`; conditional animations
  - [ ] Add `.displayName` to all Aurora components lacking it
- [ ] Align DatabaseAPI with tests & RPC:
  - [ ] Implement/export missing methods (`getAllDatabases`, `getTableSchema`)
  - [ ] Verify RPC names/params match migrations
- [ ] Remove `.env` from Git, rotate Supabase anon key

## Major (this week)
- [ ] Remove duplicate date libs (keep only `date-fns` or `dayjs`)
- [ ] Reduce complexity in `ChartBuilder`, `DashboardBuilder`, `DatabaseView`, `CellEditor`
- [ ] Add Zod schemas and RHF resolvers for forms
- [ ] Remove console.log statements; route to telemetry
- [ ] Optimize icons imports (`lucide-react`), consider dynamic imports

## Minor (later)
- [ ] Prune unused files (see report)
- [ ] Virtualize large lists/tables
- [ ] Centralize Supabase RPC client with retry/backoff
- [ ] Raise unit/E2E coverage > 70%
- [ ] Configure security headers/CSP at edge
