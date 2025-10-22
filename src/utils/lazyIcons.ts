/**
 * Lazy Icon Loading Utilities
 * Reduces initial bundle size by lazy loading Lucide icons
 * Only loads icons that are actually used
 */

import { lazy, ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

type IconComponent = ComponentType<LucideProps>;

/**
 * Lazy load a Lucide icon by name
 * Usage: const PlusIcon = lazyIcon('Plus');
 */
export function lazyIcon(iconName: string): IconComponent {
  return lazy(() =>
    import('lucide-react').then((mod) => ({
      default: mod[iconName as keyof typeof mod] as IconComponent,
    }))
  );
}

/**
 * Preload commonly used icons to avoid loading delays
 * Call this in App.tsx or main layout component
 */
export async function preloadCommonIcons(): Promise<void> {
  // Preload most frequently used icons
  const commonIcons = [
    'Plus',
    'Trash2',
    'Edit',
    'Save',
    'X',
    'Check',
    'ChevronDown',
    'ChevronUp',
    'ChevronLeft',
    'ChevronRight',
    'Search',
    'Settings',
    'User',
    'LogOut',
    'Home',
    'Database',
    'FileText',
    'BarChart',
    'Download',
    'Upload',
  ];

  try {
    console.log('[LazyIcons] Preloading common icons...');
    await Promise.all(
      commonIcons.map((iconName) =>
        import('lucide-react').then((mod) => mod[iconName as keyof typeof mod])
      )
    );
    console.log('[LazyIcons] Common icons preloaded successfully');
  } catch (error) {
    console.error('[LazyIcons] Error preloading icons:', error);
  }
}

/**
 * Icon mapping for commonly used icons
 * Pre-imported to avoid lazy loading delay for critical UI
 */
export {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  User,
  LogOut,
  Home,
  Database,
  FileText,
  BarChart,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
