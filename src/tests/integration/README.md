# Integration Tests

Comprehensive integration tests for Supabase database operations, RLS policies, and authentication.

## Overview

These tests verify:
- ✅ Real database operations
- ✅ Row Level Security (RLS) policies
- ✅ Authentication and authorization
- ✅ Data integrity and constraints
- ✅ Query performance
- ✅ Realtime subscriptions
- ✅ Cross-user data isolation

## Setup

### Prerequisites

1. **Supabase Project:** Active Supabase project
2. **Environment Variables:** Properly configured `.env` file
3. **Test User Creation:** Tests create temporary users

### Environment Configuration

Ensure these variables are set in your `.env`:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

## Running Tests

### Run All Integration Tests

```bash
npm run test -- src/tests/integration
```

### Run Specific Test Files

```bash
# Database operations
npm run test -- src/tests/integration/database.test.ts

# RLS policies
npm run test -- src/tests/integration/rls-policies.test.ts
```

### Run with Coverage

```bash
npm run test:coverage -- src/tests/integration
```

### Run in Watch Mode

```bash
npm run test -- src/tests/integration --watch
```

## Test Files

### `database.test.ts`

Tests core database operations:
- Authentication (login, signup, session)
- CRUD operations (projects, databases)
- RLS policy enforcement
- Data integrity (foreign keys, constraints)
- Query performance
- Realtime subscriptions
- Error handling

**Test Coverage:**
- ✅ Authentication flows
- ✅ RLS SELECT policies
- ✅ RLS INSERT policies
- ✅ RLS UPDATE policies
- ✅ RLS DELETE policies
- ✅ Foreign key constraints
- ✅ Default values
- ✅ Pagination
- ✅ Filtering
- ✅ Realtime updates

### `rls-policies.test.ts`

Tests security and data isolation:
- User data isolation
- Cross-user access prevention
- SQL injection prevention
- All RLS policies for all tables

**Test Coverage:**
- ✅ Projects table RLS
- ✅ Databases table RLS
- ✅ Transactions table RLS
- ✅ API Keys table RLS
- ✅ Performance tables RLS
- ✅ Cross-user isolation
- ✅ SQL injection prevention

## Test Data Cleanup

Tests automatically clean up:
- ✅ Created projects
- ✅ Created databases
- ✅ Created test records
- ⚠️ Test users (requires manual cleanup or service role)

**Note:** Test users are NOT automatically deleted. To clean up test users:

```sql
-- Run in Supabase SQL Editor
DELETE FROM auth.users
WHERE email LIKE 'test-%@example.com'
  OR email LIKE 'user1-%@example.com'
  OR email LIKE 'user2-%@example.com';
```

## Best Practices

### 1. Isolation

Each test should be independent:
- Create its own test data
- Clean up after itself
- Not depend on other tests

### 2. Assertions

Use specific assertions:
```typescript
// ✅ Good
expect(data?.name).toBe('Test Project');

// ❌ Bad
expect(data).toBeTruthy();
```

### 3. Error Handling

Always test both success and failure:
```typescript
// Test success
const { data, error } = await client.from('projects').insert(...);
expect(error).toBeNull();
expect(data).toBeDefined();

// Test failure
const { error: unauthorizedError } = await unauthorizedClient.from('projects').insert(...);
expect(unauthorizedError).toBeDefined();
```

### 4. Performance

Monitor test execution time:
```typescript
const start = Date.now();
await query();
const duration = Date.now() - start;
expect(duration).toBeLessThan(200); // Should be fast
```

## Common Issues

### Issue: "Missing Supabase credentials"

**Solution:** Check your `.env` file exists and contains:
```bash
VITE_SUPABASE_URL="..."
VITE_SUPABASE_ANON_KEY="..."
```

### Issue: "Failed to create test user"

**Solutions:**
1. Check Supabase email auth is enabled
2. Verify email rate limits not exceeded
3. Check Supabase project is active

### Issue: "RLS policy prevents operation"

**Solution:** This is expected for security tests! Verify the test is checking for the error correctly.

### Issue: "Test timeout"

**Solutions:**
1. Increase timeout in vitest.config.ts
2. Check network connection
3. Verify Supabase project is responding

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npm run test -- src/tests/integration
```

## Extending Tests

### Adding New Test File

1. Create file in `src/tests/integration/`
2. Import necessary dependencies
3. Follow existing pattern
4. Add cleanup in `afterAll`

Example:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('My New Feature', () => {
  let client;
  let testData;

  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should test something', async () => {
    // Test
  });
});
```

### Adding New Table Tests

For each new table, test:
1. ✅ CREATE (INSERT)
2. ✅ READ (SELECT)
3. ✅ UPDATE
4. ✅ DELETE
5. ✅ RLS policies (own data vs others)
6. ✅ Foreign key constraints
7. ✅ Unique constraints
8. ✅ Default values

## Debugging Tests

### Enable Verbose Logging

```bash
DEBUG=* npm run test -- src/tests/integration
```

### Run Single Test

```bash
npm run test -- src/tests/integration/database.test.ts -t "should create project"
```

### Inspect Supabase Logs

1. Open Supabase Dashboard
2. Go to Logs → API Logs
3. Filter by time range
4. Look for test operations

## Performance Benchmarks

Target performance for integration tests:

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Authentication | < 500ms | < 1000ms |
| Simple query | < 100ms | < 200ms |
| Complex query | < 500ms | < 1000ms |
| Insert | < 200ms | < 500ms |
| Update | < 200ms | < 500ms |
| Delete | < 200ms | < 500ms |

## Security Test Checklist

- [ ] Users cannot read other users' data
- [ ] Users cannot update other users' data
- [ ] Users cannot delete other users' data
- [ ] Anonymous users cannot access protected data
- [ ] SQL injection attempts are blocked
- [ ] Foreign key constraints are enforced
- [ ] Unique constraints are enforced
- [ ] Cascade deletes work correctly

## Related Documentation

- [Database Schema](../../supabase/migrations/README.md)
- [RLS Policies](../../SECURITY_README.md)
- [Supabase Client Setup](../../src/integrations/supabase/client.ts)
- [Environment Configuration](../../.env.example)

---

**Last Updated:** 2025-10-25
**Maintainer:** Development Team
**Status:** Active
