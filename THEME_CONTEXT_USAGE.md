# ThemeContext Usage Guide

This document provides comprehensive examples of how to use the centralized ThemeContext in the DataParseDesk application.

## Overview

The ThemeContext wraps the `next-themes` library and provides an enhanced, type-safe API for managing themes across the application.

## Features

- **Type-safe theme management** - Full TypeScript support
- **Theme persistence** - Automatically saves theme preference to localStorage
- **System theme detection** - Respects user's OS theme preference
- **SSR support** - Works with server-side rendering
- **Enhanced utilities** - Boolean helpers and toggle functions
- **Seamless integration** - Works with existing next-themes setup

## API Reference

### ThemeContextType

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';           // Current theme setting
  setTheme: (theme: Theme) => void;              // Set theme
  resolvedTheme: 'light' | 'dark';               // Actual theme after system resolution
  toggleTheme: () => void;                        // Toggle between light/dark
  isDark: boolean;                                // Is dark mode active
  isLight: boolean;                               // Is light mode active
  isSystem: boolean;                              // Is system theme preference active
  systemTheme: 'light' | 'dark' | undefined;     // System's preferred theme
}
```

## Basic Usage

### 1. Import the Hook

```typescript
import { useTheme } from '@/contexts/ThemeContext';
```

### 2. Use in Components

```typescript
function MyComponent() {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('system')}>System</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

## Advanced Examples

### Theme Toggle Button

```typescript
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
```

### Theme Selector with Radio Group

```typescript
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Theme Preference</h3>
      <RadioGroup value={theme} onValueChange={setTheme}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="light" id="light" />
          <Label htmlFor="light">Light</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="dark" id="dark" />
          <Label htmlFor="dark">Dark</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="system" id="system" />
          <Label htmlFor="system">System</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
```

### Conditional Rendering Based on Theme

```typescript
import { useTheme } from '@/contexts/ThemeContext';

export function ThemedContent() {
  const { isDark, isLight, resolvedTheme } = useTheme();

  return (
    <div>
      {isDark && <DarkModeSpecificComponent />}
      {isLight && <LightModeSpecificComponent />}
      
      {/* Or use resolvedTheme directly */}
      {resolvedTheme === 'dark' ? (
        <DarkLogo />
      ) : (
        <LightLogo />
      )}
    </div>
  );
}
```

### Theme with Dropdown Menu

```typescript
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeDropdown() {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Using System Theme Information

```typescript
import { useTheme } from '@/contexts/ThemeContext';

export function SystemThemeInfo() {
  const { isSystem, systemTheme, resolvedTheme } = useTheme();

  if (!isSystem) {
    return <p>Manual theme: {resolvedTheme}</p>;
  }

  return (
    <div>
      <p>Following system preference</p>
      <p>System theme: {systemTheme || 'detecting...'}</p>
      <p>Resolved to: {resolvedTheme}</p>
    </div>
  );
}
```

### Settings Page Integration

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme, isSystem } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how the application looks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="theme-light" />
              <Label htmlFor="theme-light" className="font-normal">
                Light
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark" className="font-normal">
                Dark
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="theme-system" />
              <Label htmlFor="theme-system" className="font-normal">
                System
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {isSystem && (
          <p className="text-sm text-muted-foreground">
            Currently using {resolvedTheme} mode based on your system preferences
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

## Migration from next-themes

If you were previously using `next-themes` directly:

### Before
```typescript
import { useTheme } from 'next-themes';

function Component() {
  const { theme, setTheme } = useTheme();
  // ...
}
```

### After
```typescript
import { useTheme } from '@/contexts/ThemeContext';

function Component() {
  const { theme, setTheme, isDark, toggleTheme } = useTheme();
  // Now with additional utilities!
}
```

## Technical Details

### Provider Hierarchy

The ThemeProvider is placed high in the component tree:

```
App
├── ErrorBoundary
│   ├── QueryClientProvider
│   │   ├── ThemeProvider ← Here
│   │   │   ├── TooltipProvider
│   │   │   │   ├── ...other providers
```

### Storage

Theme preference is persisted to localStorage with the key: `data-parse-desk-theme`

### Configuration

The ThemeProvider is configured with:
- `attribute="class"` - Applies theme via CSS class
- `defaultTheme="system"` - Default to system preference
- `enableSystem={true}` - Allow system theme detection
- `disableTransitionOnChange={false}` - Enable smooth transitions
- `storageKey="data-parse-desk-theme"` - Custom storage key

## Best Practices

1. **Use boolean helpers** for conditional rendering instead of string comparison:
   ```typescript
   // Good
   if (isDark) { ... }
   
   // Less ideal
   if (theme === 'dark') { ... }
   ```

2. **Use toggleTheme()** for simple light/dark switches:
   ```typescript
   <button onClick={toggleTheme}>Toggle Theme</button>
   ```

3. **Check isSystem** when showing current theme status:
   ```typescript
   {isSystem ? `System (${resolvedTheme})` : theme}
   ```

4. **Use resolvedTheme** for actual theme state:
   ```typescript
   // Good - always 'light' or 'dark'
   const actualTheme = resolvedTheme;
   
   // Less reliable - could be 'system'
   const settingTheme = theme;
   ```

## Troubleshooting

### Theme not persisting
- Check that localStorage is available
- Verify storage key in browser DevTools

### Flash of wrong theme
- This is handled by next-themes' SSR support
- The script tag prevents FOUC (Flash of Unstyled Content)

### TypeScript errors
- Ensure you're importing from `@/contexts/ThemeContext`
- Not from `next-themes` directly

## Related Files

- `/src/contexts/ThemeContext.tsx` - Main implementation
- `/src/App.tsx` - Provider integration
- `/src/components/ui/sonner.tsx` - Example usage in toasts

## Support

For issues or questions about the ThemeContext, check:
1. This documentation
2. TypeScript types in ThemeContext.tsx
3. next-themes documentation: https://github.com/pacocoursey/next-themes
