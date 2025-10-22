# Contributing to Data Parse Desk 2.0

First off, thank you for considering contributing to Data Parse Desk 2.0! It's people like you that make this project great. 🎉

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How Can I Contribute?](#how-can-i-contribute)
4. [Development Setup](#development-setup)
5. [Pull Request Process](#pull-request-process)
6. [Coding Standards](#coding-standards)
7. [Commit Messages](#commit-messages)
8. [Testing Guidelines](#testing-guidelines)
9. [Documentation](#documentation)
10. [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [support@dateparsedesk.com](mailto:support@dateparsedesk.com).

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed
- **npm** 9+ installed
- **Git** for version control
- **Supabase Account** (free tier is fine)
- **Google Gemini API Key** (optional, for AI features)

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/data-parse-desk-2.git
   cd data-parse-desk-2
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-repo/data-parse-desk-2.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your credentials.

6. **Run database migrations**:
   ```bash
   supabase db reset
   ```

7. **Start dev server**:
   ```bash
   npm run dev
   ```

---

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When submitting a bug report, include:**

- **Clear title** and description
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment details** (OS, browser, version)
- **Error messages** or logs

**Example Bug Report:**

```markdown
**Title:** Database creation fails with special characters in name

**Description:**
When creating a database with special characters (e.g., #, @, %), the creation fails silently.

**Steps to Reproduce:**
1. Go to Dashboard
2. Click "New Database"
3. Enter name: "Test#Database"
4. Click "Create"
5. No database appears

**Expected:** Database should be created or show validation error
**Actual:** Silent failure, no error message

**Environment:**
- OS: macOS 14.0
- Browser: Chrome 120
- Version: 2.0.0

**Error in console:**
```
Uncaught TypeError: Cannot read property 'id' of undefined
```
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues.

**When suggesting an enhancement, include:**

- **Clear title** and description
- **Use case** - why is this enhancement needed?
- **Proposed solution** - how should it work?
- **Alternatives considered**
- **Mockups or diagrams** (if applicable)

**Example Enhancement:**

```markdown
**Title:** Add export to Google Sheets

**Use Case:**
Users want to export data directly to Google Sheets without downloading CSV first.

**Proposed Solution:**
Add "Export to Google Sheets" button in export menu. Use Google Sheets API to create new sheet with data.

**Implementation:**
1. Add OAuth consent for Google Sheets API
2. Create Edge Function for export
3. Add UI button and modal for sheet name
4. Show success message with link to sheet

**Alternatives:**
- Export to CSV then manual import (current)
- Integration with Zapier (requires subscription)
```

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - simple issues for beginners
- `help wanted` - issues where we need assistance
- `documentation` - improvements to documentation

---

## Development Setup

### Project Structure

```
src/
├── components/      # React components
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── lib/            # Utility functions
└── integrations/   # External service integrations

supabase/
├── functions/      # Edge Functions (Deno)
└── migrations/     # Database migrations

tests/
└── e2e/           # E2E tests (Playwright)
```

### Development Workflow

1. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

3. **Test your changes**:
   ```bash
   npm run type-check
   npm run test
   npm run test:e2e
   ```

4. **Commit your changes** (see [Commit Messages](#commit-messages))

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**

### Running Tests

```bash
# Type checking
npm run type-check

# Unit tests
npm run test

# Unit tests in watch mode
npm run test -- --watch

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# All tests
npm run test:all
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests pass locally (`npm run test:all`)
- [ ] New tests added for new functionality
- [ ] Documentation updated (if applicable)
- [ ] No merge conflicts with `main`
- [ ] Commit messages follow conventions

### PR Template

When you create a PR, use this template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that breaks existing functionality)
- [ ] Documentation update

## How Has This Been Tested?
Describe tests you ran to verify changes

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks** run (CI/CD)
2. **Code review** by maintainers
3. **Feedback addressed** (if any)
4. **Approval** from at least one maintainer
5. **Merge** to main branch

### After Merge

- Branch is automatically deleted
- Changes deployed to staging
- Included in next release

---

## Coding Standards

### TypeScript

**✅ DO:**
```typescript
// Use explicit types
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Use interfaces for objects
interface User {
  id: string;
  email: string;
  name: string;
}

// Use type guards
function isError(obj: unknown): obj is Error {
  return obj instanceof Error;
}
```

**❌ DON'T:**
```typescript
// Don't use 'any'
function process(data: any) { }

// Don't omit types
function getData() { }

// Don't use 'as' unnecessarily
const user = data as User;
```

### React Components

**✅ DO:**
```tsx
// Use functional components
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={variant} onClick={onClick}>
      {label}
    </button>
  );
}

// Use custom hooks
function useFetchData(url: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url).then(res => res.json()).then(setData);
  }, [url]);

  return { data, loading };
}
```

**❌ DON'T:**
```tsx
// Don't use class components
class Button extends React.Component { }

// Don't use inline styles
<div style={{ color: 'red' }}>Bad</div>

// Don't create functions in render
<button onClick={() => handleClick(id)}>
```

### File Naming

- **Components**: PascalCase (`Button.tsx`, `DataTable.tsx`)
- **Hooks**: camelCase with `use` (`useAuth.ts`, `useDatabase.ts`)
- **Utilities**: camelCase (`formatDate.ts`, `validateEmail.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_URL.ts`, `MAX_ITEMS.ts`)

### Code Organization

```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

// 2. Types/Interfaces
interface Props {
  title: string;
}

// 3. Component
export function MyComponent({ title }: Props) {
  // 4. Hooks
  const [count, setCount] = useState(0);

  // 5. Functions
  const handleClick = () => {
    setCount(count + 1);
  };

  // 6. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Count: {count}</Button>
    </div>
  );
}
```

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

**Simple:**
```
feat: add export to PDF functionality
```

**With scope:**
```
fix(database): resolve relation loading issue
```

**With body:**
```
feat: implement collaborative cursors

Add real-time cursor tracking for team members.
Shows cursor position and user name label.

Closes #123
```

**Breaking change:**
```
feat!: change filter API endpoint

BREAKING CHANGE: Filter endpoint moved from /api/filter to /api/filter-presets
Clients must update to new endpoint format.
```

---

## Testing Guidelines

### Writing Tests

**E2E Tests (Playwright):**

```typescript
import { test, expect } from '@playwright/test';

test('should create new database', async ({ page }) => {
  // Arrange
  await page.goto('/dashboard');

  // Act
  await page.click('[data-testid="new-database"]');
  await page.fill('[data-testid="name"]', 'Test DB');
  await page.click('[data-testid="submit"]');

  // Assert
  await expect(page.locator('text=Test DB')).toBeVisible();
});
```

**Unit Tests (Vitest):**

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-01-22');
    expect(formatDate(date)).toBe('22/01/2025');
  });
});
```

### Test Coverage

Aim for:
- **Unit tests**: 80% coverage
- **E2E tests**: All critical user flows
- **Integration tests**: Key API endpoints

---

## Documentation

### Code Comments

```typescript
/**
 * Calculates the total price of items in cart
 *
 * @param items - Array of cart items
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @returns Total price including tax
 *
 * @example
 * ```ts
 * const items = [{ price: 10 }, { price: 20 }];
 * const total = calculateTotal(items, 0.1);
 * // Returns: 33 (30 + 10% tax)
 * ```
 */
function calculateTotal(items: CartItem[], taxRate: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + taxRate);
}
```

### Documentation Files

When adding features, update:

- [ ] `API_DOCUMENTATION.md` - for new API endpoints
- [ ] `TESTING_GUIDE.md` - for new test patterns
- [ ] `DEVELOPER_ONBOARDING.md` - for setup changes
- [ ] `CHANGELOG.md` - for all changes
- [ ] `README.md` - for major features

---

## Community

### Getting Help

- **Discord**: [Join our server](https://discord.gg/dateparsedesk)
- **GitHub Discussions**: [Ask questions](https://github.com/org/repo/discussions)
- **Email**: support@dateparsedesk.com

### Stay Updated

- **Follow on Twitter**: [@dateparsedesk](https://twitter.com/dateparsedesk)
- **Subscribe to newsletter**: [dateparsedesk.com/newsletter](https://dateparsedesk.com/newsletter)
- **Watch repository** for updates

---

## Recognition

Contributors are recognized in:

- [AUTHORS.md](./AUTHORS.md) - All contributors
- GitHub contributors graph
- Release notes

### Hall of Fame

Top contributors each quarter receive:
- Special badge on Discord
- Mention in blog post
- Swag package (for significant contributions)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

Don't hesitate to ask! We're here to help:

- Open a [Discussion](https://github.com/org/repo/discussions)
- Join our [Discord](https://discord.gg/dateparsedesk)
- Email us at support@dateparsedesk.com

**Thank you for contributing! 🙏**

---

**Last Updated**: January 22, 2025
