# Developer Onboarding Guide

Welcome to **Data Parse Desk 2.0**! This guide will help you get up and running quickly with the project.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Architecture Overview](#architecture-overview)
6. [Key Technologies](#key-technologies)
7. [Common Tasks](#common-tasks)
8. [Code Style & Best Practices](#code-style--best-practices)
9. [Testing](#testing)
10. [Debugging](#debugging)
11. [Contributing](#contributing)
12. [Resources](#resources)

---

## Prerequisites

### Required Software

- **Node.js**: v18 or higher
- **npm**: v9 or higher (comes with Node.js)
- **Git**: Latest version
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense

### Recommended Tools

- **Supabase CLI**: For local database management
- **Postman/Thunder Client**: For API testing
- **React DevTools**: Browser extension for debugging
- **Redux DevTools**: Browser extension (if using Redux)

### Knowledge Requirements

**Essential**:
- TypeScript/JavaScript (ES6+)
- React (Hooks, Context API)
- CSS/Tailwind CSS

**Good to Have**:
- Supabase/PostgreSQL
- React Router
- TanStack Query (React Query)
- Playwright (E2E testing)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd data-parse-desk-2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API (for AI features)
VITE_GEMINI_API_KEY=your_gemini_api_key

# Sentry (Production only - optional)
VITE_SENTRY_DSN=your_sentry_dsn

# Application Version
VITE_APP_VERSION=2.0.0
```

**Getting Supabase Credentials**:
1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or use existing)
3. Go to Settings > API
4. Copy `URL` and `anon` key

**Getting Gemini API Key**:
1. Go to [ai.google.dev](https://ai.google.dev)
2. Get API Key
3. Copy the key

### 4. Run Database Migrations

```bash
# If using local Supabase
supabase db reset

# Or manually run migrations from supabase/migrations/ folder
# in your Supabase dashboard SQL Editor
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

### 6. Run Tests

```bash
# Type checking
npm run type-check

# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

---

## Project Structure

```
data-parse-desk-2/
├── .cursor/                    # Cursor IDE rules
│   └── rules/                  # Project guidelines and best practices
├── public/                     # Static assets
│   └── manifest.json           # PWA manifest
├── src/
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── database/           # Database-specific components
│   │   ├── monitoring/         # Performance monitoring
│   │   └── ...
│   ├── hooks/                  # Custom React hooks
│   │   ├── usePresence.ts      # User presence tracking
│   │   ├── useComments.ts      # Comments system
│   │   ├── useOffline.ts       # Offline mode
│   │   └── ...
│   ├── integrations/           # External service integrations
│   │   └── supabase/           # Supabase client
│   ├── lib/                    # Utility libraries
│   │   ├── monitoring.ts       # Performance monitoring
│   │   └── utils.ts            # Helper functions
│   ├── pages/                  # Page components
│   │   ├── Index.tsx           # Landing page
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── DatabaseView.tsx    # Database viewer
│   │   └── ...
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── supabase/
│   ├── functions/              # Edge Functions (Deno)
│   │   ├── analyze-csv-schema/ # AI-powered CSV analysis
│   │   ├── calculate-computed-columns/
│   │   ├── import-data/
│   │   └── export-data/
│   └── migrations/             # Database migrations
│       ├── 20251014100000_multiple_databases_system.sql
│       ├── 20251021000005_formula_calculations.sql
│       ├── 20251022000005_filter_presets.sql
│       ├── 20251022000006_data_validation.sql
│       └── ...
├── tests/
│   └── e2e/                    # E2E tests (Playwright)
│       ├── critical-flows.spec.ts
│       ├── collaboration-features.spec.ts
│       ├── computed-columns.spec.ts
│       └── filter-validation.spec.ts
├── .env.local                  # Environment variables (not committed)
├── package.json                # Dependencies and scripts
├── playwright.config.ts        # Playwright configuration
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration
└── tailwind.config.ts          # Tailwind CSS configuration
```

### Key Directories

- **`src/components/`**: Reusable UI components
- **`src/hooks/`**: Custom React hooks for shared logic
- **`src/pages/`**: Top-level page components
- **`src/integrations/supabase/`**: Supabase client and types
- **`supabase/functions/`**: Serverless Edge Functions
- **`supabase/migrations/`**: Database schema versions

---

## Development Workflow

### 1. Create a Branch

```bash
# Feature branch
git checkout -b feature/your-feature-name

# Bug fix branch
git checkout -b fix/bug-description

# Hotfix branch
git checkout -b hotfix/critical-fix
```

### 2. Make Changes

Follow the coding standards (see [Code Style](#code-style--best-practices))

### 3. Run Tests

```bash
# Type check
npm run type-check

# Run tests
npm run test

# E2E tests
npm run test:e2e
```

### 4. Commit Changes

Use conventional commits:

```bash
git add .
git commit -m "feat: add new feature"
```

**Commit Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Create Pull Request on GitHub.

### 6. Code Review

Wait for code review and address feedback.

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Pages     │  │ Components  │  │   Hooks     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└───────────────────────────┬─────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │ Supabase Client│
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼─────┐
│   PostgreSQL   │  │ Edge Functions │  │  Realtime  │
│   + RLS        │  │   (Deno)       │  │   Subscr.  │
└────────────────┘  └────────────────┘  └────────────┘
```

### Data Flow

#### 1. Reading Data

```
User Action
    ↓
React Component
    ↓
Supabase Query (via hooks)
    ↓
PostgreSQL (RLS applied)
    ↓
Return data to component
    ↓
Render UI
```

#### 2. Writing Data

```
User Input
    ↓
React Component
    ↓
Validation (client-side)
    ↓
Supabase Insert/Update
    ↓
PostgreSQL Triggers (validation, computed columns)
    ↓
RLS Check
    ↓
Success/Error response
    ↓
Update UI + Show toast
```

#### 3. Real-time Updates

```
User A makes change
    ↓
PostgreSQL write
    ↓
Supabase Realtime broadcast
    ↓
User B subscribed to channel
    ↓
User B's component updates automatically
```

### State Management

We use a combination of:

1. **React Context**: Global app state (auth, theme)
2. **TanStack Query**: Server state caching
3. **Local State**: Component-specific state (useState)
4. **URL State**: Navigation and filters (React Router)

### Authentication Flow

```
User visits app
    ↓
Check localStorage for session
    ↓
If session exists → Load user data
    ↓
If no session → Redirect to /login
    ↓
User logs in → Store session
    ↓
Redirect to /dashboard
```

---

## Key Technologies

### Frontend Stack

#### React 18
- **Hooks**: useState, useEffect, useCallback, useMemo
- **Context**: For global state
- **Suspense**: For code splitting

**Example**:
```tsx
import { useState, useEffect } from 'react';

function MyComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  return <div>{data.map(item => ...)}</div>;
}
```

#### TypeScript
- **Strict mode enabled**
- **Type-safe API calls**
- **Interface definitions**

**Example**:
```typescript
interface Database {
  id: string;
  name: string;
  schema: DatabaseSchema;
  created_at: string;
}

function processDatabases(dbs: Database[]) {
  // TypeScript ensures type safety
}
```

#### Tailwind CSS
- **Utility-first CSS**
- **Responsive design**
- **Custom theme**

**Example**:
```tsx
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <Button className="bg-blue-500 hover:bg-blue-600">
    Click me
  </Button>
</div>
```

#### shadcn/ui
- **Accessible components**
- **Customizable**
- **Copy-paste components**

**Example**:
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

<Card>
  <CardContent>
    <Button variant="outline">Click</Button>
  </CardContent>
</Card>
```

### Backend Stack

#### Supabase
- **PostgreSQL database**
- **Row Level Security (RLS)**
- **Realtime subscriptions**
- **Edge Functions**

**Example**:
```typescript
const { data, error } = await supabase
  .from('databases')
  .select('*')
  .eq('user_id', userId);
```

#### PostgreSQL
- **JSONB columns** for flexible schema
- **Triggers** for automation
- **Functions** for complex logic
- **Indexes** for performance

**Example**:
```sql
CREATE OR REPLACE FUNCTION calculate_lookup_value(
  p_database_id UUID,
  p_row_id UUID,
  p_column_name TEXT
) RETURNS TEXT AS $$
  -- Function logic
$$ LANGUAGE plpgsql;
```

#### Edge Functions (Deno)
- **Serverless functions**
- **Close to users**
- **TypeScript support**

**Example**:
```typescript
// supabase/functions/analyze-csv-schema/index.ts
Deno.serve(async (req) => {
  const formData = await req.formData();
  const file = formData.get('file');

  // Process file with Gemini AI
  const schema = await analyzeWithAI(file);

  return new Response(JSON.stringify(schema), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## Common Tasks

### Adding a New Component

1. **Create component file**:

```tsx
// src/components/MyComponent.tsx
import { FC } from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className="p-4">
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

2. **Export from index** (if using barrel exports):

```tsx
// src/components/index.ts
export { MyComponent } from './MyComponent';
```

3. **Use in parent component**:

```tsx
import { MyComponent } from '@/components/MyComponent';

<MyComponent title="Hello" onAction={() => console.log('clicked')} />
```

### Adding a New Page

1. **Create page file**:

```tsx
// src/pages/NewPage.tsx
export default function NewPage() {
  return (
    <div className="container mx-auto p-6">
      <h1>New Page</h1>
    </div>
  );
}
```

2. **Add route**:

```tsx
// src/App.tsx
import NewPage from '@/pages/NewPage';

<Route path="/new-page" element={<NewPage />} />
```

3. **Add navigation**:

```tsx
import { Link } from 'react-router-dom';

<Link to="/new-page">Go to New Page</Link>
```

### Creating a Custom Hook

1. **Create hook file**:

```tsx
// src/hooks/useMyHook.ts
import { useState, useEffect } from 'react';

export function useMyHook(param: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(param).then(result => {
      setData(result);
      setLoading(false);
    });
  }, [param]);

  return { data, loading };
}
```

2. **Use in component**:

```tsx
import { useMyHook } from '@/hooks/useMyHook';

function MyComponent() {
  const { data, loading } = useMyHook('param-value');

  if (loading) return <div>Loading...</div>;

  return <div>{data}</div>;
}
```

### Adding a Database Migration

1. **Create migration file**:

```sql
-- supabase/migrations/20250122000001_add_new_table.sql

-- Create table
CREATE TABLE IF NOT EXISTS public.my_new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.my_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own records"
  ON public.my_new_table
  FOR SELECT
  USING (auth.uid() = user_id);
```

2. **Run migration**:

```bash
# Local Supabase
supabase db reset

# Or manually in Supabase dashboard SQL editor
```

3. **Update TypeScript types**:

```typescript
// src/integrations/supabase/types.ts
export interface MyNewTable {
  id: string;
  name: string;
  created_at: string;
}
```

### Creating an Edge Function

1. **Create function**:

```bash
supabase functions new my-function
```

2. **Implement logic**:

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { data } = await req.json();

    // Process data
    const result = processData(data);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

3. **Deploy function**:

```bash
supabase functions deploy my-function
```

4. **Call from frontend**:

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/my-function`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: 'value' })
  }
);

const result = await response.json();
```

### Adding a Test

1. **Create test file**:

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    await page.goto('/my-feature');

    await page.click('[data-testid="action-button"]');

    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

2. **Run test**:

```bash
npm run test:e2e -- my-feature.spec.ts
```

---

## Code Style & Best Practices

### TypeScript

✅ **DO**:
```typescript
// Use explicit types for function parameters
function processData(data: Database[], filter: string): Database[] {
  return data.filter(d => d.name.includes(filter));
}

// Use interfaces for object shapes
interface User {
  id: string;
  email: string;
  name: string;
}

// Use type guards
function isDatabase(obj: any): obj is Database {
  return 'id' in obj && 'name' in obj && 'schema' in obj;
}
```

❌ **DON'T**:
```typescript
// Don't use 'any'
function processData(data: any) { ... }

// Don't omit return types
function getData() { ... }

// Don't use 'as' for type assertions unless necessary
const data = response.data as MyType; // Only if you're sure
```

### React Components

✅ **DO**:
```tsx
// Use functional components with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// Use destructuring for props
// Use meaningful prop names
// Provide default values
```

❌ **DON'T**:
```tsx
// Don't use class components (unless necessary)
class Button extends Component { ... }

// Don't use inline styles (use Tailwind)
<div style={{ color: 'red' }}>...</div>

// Don't create new functions in render
<button onClick={() => handleClick(id)}>  // ❌ Creates new function on every render

// Instead:
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<button onClick={handleButtonClick}>  // ✅
```

### Hooks

✅ **DO**:
```typescript
// Use custom hooks for shared logic
function useDatabaseData(databaseId: string) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(databaseId).then(result => {
      setData(result);
      setLoading(false);
    });
  }, [databaseId]);

  return { data, loading };
}

// Memoize expensive calculations
const filteredData = useMemo(
  () => data.filter(item => item.status === 'active'),
  [data]
);

// Memoize callbacks
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);
```

❌ **DON'T**:
```typescript
// Don't call hooks conditionally
if (condition) {
  useEffect(() => { ... });  // ❌
}

// Don't forget dependencies
useEffect(() => {
  fetchData(id);  // Uses 'id' but not in deps array
}, []);  // ❌ Missing 'id' in dependencies
```

### CSS/Tailwind

✅ **DO**:
```tsx
// Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
  <Button className="bg-blue-500 hover:bg-blue-600 text-white">
    Action
  </Button>
</div>

// Use responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  ...
</div>

// Group related classes
<div className="flex items-center gap-2">  // Layout
  <span className="text-sm font-medium text-gray-700">  // Typography
    Label
  </span>
</div>
```

❌ **DON'T**:
```tsx
// Don't use inline styles
<div style={{ display: 'flex', padding: '16px' }}>  // ❌

// Don't create custom CSS files for simple styles
// Use Tailwind instead

// Don't use arbitrary values unless necessary
<div className="p-[13px]">  // ❌ Use p-3 or p-4
```

### File Organization

✅ **DO**:
```
// Group related files together
src/
  components/
    database/
      DatabaseView.tsx
      DatabaseTable.tsx
      DatabaseFilters.tsx
      index.ts

// Use index.ts for barrel exports
// index.ts
export { DatabaseView } from './DatabaseView';
export { DatabaseTable } from './DatabaseTable';
```

❌ **DON'T**:
```
// Don't create flat structure with many files
src/
  components/
    DatabaseView.tsx
    DatabaseTable.tsx
    UserProfile.tsx
    UserSettings.tsx
    ... (hundreds of files)
```

### Naming Conventions

- **Components**: PascalCase (`DatabaseView`, `UserProfile`)
- **Functions**: camelCase (`fetchData`, `handleClick`)
- **Hooks**: camelCase with `use` prefix (`useDatabase`, `useAuth`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)
- **Files**: Match export name (`DatabaseView.tsx`, `useAuth.ts`)
- **Interfaces/Types**: PascalCase (`Database`, `UserProfile`)

---

## Testing

### Unit Tests (Vitest)

```typescript
// src/lib/validators.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail } from './validators';

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="submit"]');

  await expect(page).toHaveURL('/dashboard');
});
```

### Running Tests

```bash
# All tests
npm run test:all

# Unit tests only
npm run test

# E2E tests only
npm run test:e2e

# Watch mode
npm run test -- --watch

# With coverage
npm run test:coverage

# Specific test file
npm run test:e2e -- login.spec.ts
```

---

## Debugging

### React DevTools

1. Install React DevTools browser extension
2. Open DevTools → React tab
3. Inspect component tree, props, state

### Console Debugging

```typescript
// Quick debug
console.log('Data:', data);

// Debug with label
console.log('🔍 Fetching data for:', databaseId);

// Table view for arrays
console.table(databases);

// Group related logs
console.group('Database Operations');
console.log('Fetching...');
console.log('Processing...');
console.groupEnd();
```

### Performance Profiling

```tsx
// Use React Profiler
import { Profiler } from 'react';

<Profiler id="DatabaseView" onRender={(id, phase, actualDuration) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}}>
  <DatabaseView />
</Profiler>
```

### Network Debugging

```typescript
// Log Supabase queries
const { data, error } = await supabase
  .from('databases')
  .select('*')
  .then(result => {
    console.log('Query result:', result);
    return result;
  });
```

### Playwright Debugging

```bash
# Debug mode
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

---

## Contributing

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push branch**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create PR on GitHub**
   - Add clear title and description
   - Link related issues
   - Add screenshots (if UI changes)

5. **Wait for review**
   - Address review comments
   - Make requested changes
   - Push updates

6. **Merge**
   - Squash and merge (preferred)
   - Delete branch after merge

### Code Review Checklist

**Reviewer should check**:
- [ ] Code follows style guide
- [ ] Tests are included
- [ ] TypeScript types are correct
- [ ] No console.logs in production code
- [ ] Performance considerations addressed
- [ ] Accessibility (a11y) considered
- [ ] Error handling implemented
- [ ] Documentation updated

---

## Resources

### Documentation

- **API Documentation**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Testing Guide**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Performance Monitoring**: [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md)
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### External Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Playwright Docs](https://playwright.dev)
- [Vitest Docs](https://vitest.dev)

### Community

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Discord**: Real-time chat with team (if available)

---

## FAQ

### Q: How do I add a new dependency?

```bash
npm install package-name
```

Then update documentation if it's a significant dependency.

### Q: How do I update Supabase types?

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Q: How do I reset my local database?

```bash
supabase db reset
```

### Q: How do I debug a failing test?

```bash
# For E2E tests
npm run test:e2e:debug

# For unit tests
npm run test -- --reporter=verbose
```

### Q: Where do I put environment variables?

In `.env.local` file (never commit this file!)

### Q: How do I access the performance dashboard?

Navigate to `/performance` after adding the route.

---

## Next Steps

After completing this onboarding:

1. ✅ Set up your development environment
2. ✅ Run the application locally
3. ✅ Explore the codebase
4. ✅ Read the architecture documentation
5. ✅ Pick your first task from GitHub Issues
6. ✅ Make your first contribution!

**Welcome to the team! 🎉**

---

**Last Updated**: 2025-01-22
**Version**: 2.0
