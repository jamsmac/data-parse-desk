import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';

/**
 * Supported theme values
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Context type for the theme system
 */
export interface ThemeContextType {
  /** Current theme setting ('light', 'dark', or 'system') */
  theme: Theme;
  /** Set the theme */
  setTheme: (theme: Theme) => void;
  /** Actual resolved theme ('light' or 'dark') after system preference resolution */
  resolvedTheme: 'light' | 'dark';
  /** Toggle between light and dark themes (ignores system) */
  toggleTheme: () => void;
  /** Whether the current resolved theme is dark */
  isDark: boolean;
  /** Whether the current resolved theme is light */
  isLight: boolean;
  /** Whether the theme is set to 'system' */
  isSystem: boolean;
  /** The system's preferred theme (undefined until mounted) */
  systemTheme: 'light' | 'dark' | undefined;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Internal component that wraps next-themes and provides enhanced theme API
 */
function ThemeContextProvider({ children }: { children: ReactNode }) {
  const {
    theme: nextTheme,
    setTheme: nextSetTheme,
    resolvedTheme: nextResolvedTheme,
    systemTheme: nextSystemTheme,
  } = useNextTheme();

  // Track mounted state to avoid hydration mismatches
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Type-safe theme value with fallback
  const theme: Theme = (nextTheme as Theme) || 'system';

  // Type-safe resolved theme with fallback
  const resolvedTheme: 'light' | 'dark' =
    (nextResolvedTheme as 'light' | 'dark') ||
    (mounted ? 'light' : 'light');

  // Type-safe system theme
  const systemTheme: 'light' | 'dark' | undefined =
    nextSystemTheme as 'light' | 'dark' | undefined;

  // Type-safe setTheme wrapper
  const setTheme = (newTheme: Theme) => {
    nextSetTheme(newTheme);
  };

  /**
   * Toggle between light and dark themes
   * If currently on system, switches to the opposite of the resolved theme
   */
  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  // Computed boolean helpers
  const isDark = resolvedTheme === 'dark';
  const isLight = resolvedTheme === 'light';
  const isSystem = theme === 'system';

  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    toggleTheme,
    isDark,
    isLight,
    isSystem,
    systemTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Theme Provider component that wraps next-themes
 * Provides theme persistence, SSR support, and enhanced theme API
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="data-parse-desk-theme"
    >
      <ThemeContextProvider>{children}</ThemeContextProvider>
    </NextThemesProvider>
  );
}

/**
 * Hook to access the theme system
 *
 * @throws Error if used outside of ThemeProvider
 *
 * @example
 * ```tsx
 * const { theme, setTheme, toggleTheme, isDark } = useTheme();
 *
 * // Get current theme
 * console.log(theme); // 'light' | 'dark' | 'system'
 *
 * // Set specific theme
 * setTheme('dark');
 *
 * // Toggle between light and dark
 * toggleTheme();
 *
 * // Check theme state
 * if (isDark) {
 *   // Dark mode specific logic
 * }
 * ```
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
