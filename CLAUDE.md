# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VHData is a universal data management platform (like Notion for databases) built with React + TypeScript + Vite + Supabase. It allows users to create multiple databases, upload Excel/CSV files with intelligent column mapping, filter and analyze data, and build relationships between databases.

**Current Status**: 95% ready, all core features implemented.

## Essential Commands

### Development
```bash
npm run dev              # Start dev server at http://localhost:5173
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build
npm run type-check       # TypeScript type checking (without emit)
```

### Testing
```bash
npm test                              # Run all unit tests with Vitest
npm run test:ui                       # Run tests with UI interface
npm run test:run                      # Run tests once (CI mode)
npm run test:coverage                 # Generate coverage report
npm run test:regression               # Run Aurora regression tests
npm run test:regression:watch         # Watch Aurora regression tests
npm run test:e2e                      # Run Playwright E2E tests
npm run test:e2e:ui                   # Run E2E tests with UI
npm run test:e2e:headed               # Run E2E tests in headed mode
npm run test:e2e:debug                # Debug E2E tests
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
```

### Aurora Design System
```bash
npm run aurora:rollback  # Rollback Aurora changes (interactive script)
npm run aurora:check     # Run type-check + lint + regression tests
```

### Single Test Execution
```bash
# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --grep "pattern"

# Run single test in watch mode
npm test -- path/to/test.test.ts --watch
```

## Architecture

### Core Data Model

VHData implements a **Notion-like database system** with these key concepts:

1. **Multiple Databases**: Users create unlimited databases, each with custom schemas
2. **Dynamic Tables**: Each database gets its own PostgreSQL table (`user_*`) created dynamically
3. **Advanced Column Types**:
   - Basic: text, number, date, datetime, boolean
   - Advanced: relation (links to other databases), rollup (aggregations), formula (computed), lookup (pull related data)
4. **Relationships**: Databases can be connected with one-to-many, many-to-one, many-to-many relations
5. **File Import**: Excel/CSV upload with ML-powered column mapping using Levenshtein distance

### Database Schema (Supabase)

Key tables in `supabase/migrations/20251014100000_multiple_databases_system.sql`:

- **databases**: Registry of user-created databases
  - `system_name`: internal identifier (lowercase_underscore)
  - `display_name`: user-facing name
  - `table_name`: actual PostgreSQL table name (prefixed with `user_`)
  - `icon_name`, `color_hex`: UI customization

- **table_schemas**: Column definitions for each database
  - Stores column name, type, validation rules, default values
  - Supports `relation_config`, `rollup_config`, `formula_config` for advanced types

- **files**: Upload history and processing status
  - Tracks imported/rejected rows, column mappings, errors

- **database_relations**: Relationships between databases (Phase 1.5)
  - Defines source/target columns and relation types

- **audit_log**: Complete audit trail of all operations

### API Layer Architecture

**Location**: `src/api/`

All API calls use **Supabase RPC functions** (stored procedures), not direct table queries. This provides:
- Complex operations server-side
- Better security (RLS policies)
- Transaction support
- Performance optimization

**Key APIs**:
- `databaseAPI.ts`: CRUD for databases, table schemas, dynamic table data
- `fileAPI.ts`: File upload, import, column mapping
- `relationAPI.ts`: Database relationships

**Pattern**: All functions are static methods on API classes (e.g., `DatabaseAPI.createDatabase()`)

### React Query Hooks

**Location**: `src/hooks/`

Data fetching uses TanStack Query (React Query) for caching, optimistic updates, and state management:

- `useDatabases.ts`: Database CRUD operations
- `useTableData.ts`: Dynamic table data queries
- `useFiles.ts`: File uploads and processing
- `useRelations.ts`: Relationship management

### Frontend Structure

**Pages** (`src/pages/`):
- `Dashboard.tsx`: Main view showing all database cards
- `DatabaseView.tsx`: Individual database with data table, filters, import/export
- `Analytics.tsx`: Charts and analytics (Phase 3)
- `Reports.tsx`: Report builder (Phase 3)
- `LoginPage.tsx`, `RegisterPage.tsx`, `ProfilePage.tsx`: Auth pages (Phase 4)

**Key Components** (`src/components/`):
- `DatabaseCard.tsx`: Database card with stats
- `DatabaseFormDialog.tsx`: Create/edit database with icon/color picker
- `UploadFileDialog.tsx`: Drag-and-drop file upload
- `ColumnMapper.tsx`: Visual column mapping interface with confidence scores
- `ui/`: shadcn/ui components (Radix UI primitives)

### Utilities

**Location**: `src/utils/`

- `fileParser.ts`: Parse Excel/CSV files using SheetJS and PapaParse
- `columnMapper.ts`: **Intelligent column mapping** using Levenshtein distance algorithm
  - Auto-matches file columns to schema columns
  - Provides confidence scores (0-1)
  - Handles variations in naming (e.g., "Order #" → "order_number")
- `exportData.ts`: Export to CSV/Excel formats
- `mlMapper.ts`: ML-enhanced mapping (Phase 2)
- `mappingMemory.ts`: Remember user's mapping patterns (Phase 2)
- `advancedValidation.ts`: Data validation before import
- `relationResolver.ts`: Resolve related data across databases
- `rollupCalculator.ts`: Calculate rollup aggregations
- `formulaEngine.ts`: Formula parser and evaluator
- `sqlBuilder.ts`: Dynamic SQL query builder

## Aurora Design System

VHData uses the **Fluid Aurora Design System** - a glass-morphism design system with gradient effects.

**Key Features**:
- Glass-morphism UI with blur effects
- 7 Aurora gradients (primary, secondary, ocean, nebula, etc.)
- 12+ animations (glow, wave, float, slide effects)
- Dark mode support
- Responsive and accessible

**Components** (`src/components/aurora/`):
- `GlassCard`, `GlassContainer`: Glass-morphism containers
- `AuroraBackground`: Animated gradient background
- `FadeIn`, `StaggerChildren`: Animation wrappers

**Usage**:
```tsx
import { GlassContainer } from '@/components/aurora';

<GlassContainer
  intensity="strong"
  blur="xl"
  hover
  gradient="nebula"
  animation="scale-in"
>
  Content here
</GlassContainer>
```

**Configuration**: `.aurorarc` tracks Aurora status and performance

**Rollback**: Use `npm run aurora:rollback` if Aurora changes cause issues (interactive script with 5 options)

## Important Patterns & Conventions

### 1. Database Naming
- **system_name**: lowercase_underscore format (e.g., `sales_2024`)
- **table_name**: prefixed with `user_` (e.g., `user_sales_2024`)
- Enforced by SQL constraints in migration

### 2. Type Safety
- All API responses have TypeScript types in `src/types/`
- Use `Database`, `TableSchema`, `ColumnType` types from `src/types/database.ts`
- RPC functions have typed interfaces (see `DatabaseRPCFunctions` in `databaseAPI.ts`)

### 3. Error Handling
- API errors throw exceptions (caught by React Query)
- Validation errors stored in `ValidationError[]` and `ValidationWarning[]`
- All operations logged to `audit_log` table via triggers

### 4. Import Path Alias
- Use `@/` for `src/` (configured in vite.config.ts and tsconfig.json)
- Example: `import { supabase } from '@/integrations/supabase/client'`

### 5. Column Mapping Workflow
1. User uploads file → parse headers
2. Run `autoMapColumns()` with Levenshtein distance
3. Show `ColumnMapper` UI with confidence scores
4. User confirms/adjusts mappings
5. Validate data against schema
6. Bulk insert to dynamic table

### 6. Dynamic Table Operations
- Never directly query `user_*` tables
- Always use RPC functions: `get_table_data`, `insert_table_row`, etc.
- This ensures proper validation, triggers, and audit logging

### 7. Testing Approach
- **Unit tests**: Vitest for utilities (`utils/__tests__/`)
- **Component tests**: React Testing Library
- **E2E tests**: Playwright (`e2e/`)
- **Regression tests**: Aurora-specific tests (`tests/regression/`)

## Environment Setup

### Required Environment Variables
Create `.env.local` (see `.env.example`):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup
1. Create Supabase project
2. Run migration: `supabase/migrations/20251014100000_multiple_databases_system.sql`
3. Verify tables: databases, table_schemas, files, audit_log, database_relations

## Development Workflow

### Adding a New Column Type

1. **Update TypeScript types** (`src/types/database.ts`):
   ```ts
   export type ColumnType = 'text' | 'number' | ... | 'your_new_type';
   ```

2. **Update column mapper** (`src/utils/columnMapper.ts`):
   - Add detection logic in `detectDataType()`

3. **Update database API** (`src/api/databaseAPI.ts`):
   - Handle new type in schema creation

4. **Update migration**:
   - Add to `valid_data_type` constraint in `table_schemas`

5. **Update UI**:
   - Add rendering in `ColumnMapper.tsx`
   - Add form field in `DatabaseFormDialog.tsx`

### Working with Relations (Phase 1.5)

Relations are stored in `database_relations` table:
- `source_database_id` → `target_database_id`
- `relation_type`: 'one_to_one', 'one_to_many', 'many_to_many'
- Use `RelationAPI` for CRUD operations
- Resolve related data with `relationResolver.ts`

### Debugging Tips

1. **Check Supabase RPC logs**: Supabase Dashboard → Database → Functions
2. **Inspect audit_log**: All operations are logged with old/new values
3. **Use React Query DevTools**: Enabled in dev mode
4. **Check file processing**: `files` table has detailed error messages

## CI/CD

GitHub Actions runs on every push/PR (`.github/workflows/ci.yml`):
- ✅ Tests on Node.js 18.x and 20.x
- ✅ Security audit (npm audit)
- ✅ Test coverage reporting
- ✅ Production build check
- ✅ Lint and type checking

## Phase Roadmap

- ✅ **Phase 1**: Multiple databases with file import (complete)
- 🔄 **Phase 1.5**: Relations, rollups, lookups (in progress)
- ⏳ **Phase 2**: ML-powered mapping, validation
- ⏳ **Phase 3**: Analytics, charts, pivot tables
- ⏳ **Phase 4**: Collaboration, auth, permissions
- ⏳ **Phase 5**: Automation, workflows, webhooks

See `FULL_IMPLEMENTATION_PLAN.md` for detailed breakdown.

## Common Issues

### Build Errors After Aurora Changes
Run `npm run aurora:rollback` and select option 3 (creates backup before rollback).

### Type Errors in RPC Calls
Ensure RPC function signatures in `databaseAPI.ts` match Supabase function definitions.

### Column Mapping Low Confidence
- Check column name variations in `columnMapper.ts`
- Levenshtein threshold is 0.7 by default
- Consider adding synonyms for better matching

### Dynamic Table Not Created
- Verify database entry exists in `databases` table
- Check `table_name` follows `user_*` convention
- Ensure migration created RLS policies

## Documentation Files

- `README.md`: Project overview and quick start
- `FULL_IMPLEMENTATION_PLAN.md`: Detailed phase planning
- `SETUP.md`: Detailed setup instructions for new developers
- `TESTING_AND_CICD_GUIDE.md`: Testing strategy and CI/CD
- `COLLABORATION_FEATURES_GUIDE.md`: Collaboration features (Phase 4)
- `docs/NOTION_ARCHITECTURE.md`: Notion-like architecture details
- `.aurorarc`: Aurora Design System status
